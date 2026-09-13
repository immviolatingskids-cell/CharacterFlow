const configured = typeof window !== 'undefined' && window.PROMPTFORGE_CLOUD;

export const cloudMode = Object.freeze({
  configured: Boolean(configured?.url && configured?.anonKey),
  provider: configured?.provider || 'none'
});

export function createSupabaseClient({ url = configured?.url, anonKey = configured?.anonKey, sdk = globalThis.supabase } = {}) {
  if (!url || !anonKey || !sdk?.createClient) return null;
  return sdk.createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
}

export async function currentUser(client) {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  return data?.user || null;
}

export async function syncState(store, state, client) {
  if (!store || store.mode === 'local' || !client) return { mode: 'local', synced: false };
  const user = await currentUser(client);
  if (!user) return { mode: 'cloud', synced: false, reason: 'authentication-required' };
  const characters=Array.isArray(state.characters)&&state.characters.length?state.characters:(state.character?[state.character]:[]);
  const existingCharacters=await client.from('characters').select('id').eq('user_id', user.id);
  if (existingCharacters.error) throw existingCharacters.error;
  const wanted=new Set(characters.map(character=>character.id));
  for (const row of existingCharacters.data||[]) if(!wanted.has(row.id)) await store.deleteCharacter(row.id,user.id);
  for (const character of characters) await store.saveCharacter({...state,character,activeCharacterId:character.id,characters}, user.id);
  const [promptRows, takeRows] = await Promise.all([
    client.from('compiled_prompts').select('id').eq('user_id', user.id),
    client.from('takes').select('id').eq('user_id', user.id)
  ]);
  if (promptRows.error) throw promptRows.error;
  if (takeRows.error) throw takeRows.error;
  const promptIds = new Set((promptRows.data || []).map(row => row.id));
  const takeIds = new Set((takeRows.data || []).map(row => row.id));
  for (const prompt of state.compiledPrompts || []) if (!promptIds.has(prompt.id)) await store.savePrompt(prompt, user.id);
  for (const take of state.takes || []) if (!takeIds.has(take.id)) await store.saveTake(take, user.id);
  return { mode: 'cloud', synced: true, userId: user.id };
}

// Provider-specific operations belong behind this boundary. The first adapter
// can use the Supabase REST endpoints or SDK without changing UI components.
export function createCloudStore({ client = null, local = globalThis.localStorage } = {}) {
  const localKey = 'promptforge-studio-v2';
  const localRead = () => local?.getItem(localKey) || null;
  const localWrite = state => local?.setItem(localKey, JSON.stringify(state));
  const requireUser = userId => { if (!userId) throw new Error('Authenticated user is required'); };
  return Object.freeze({
    mode: client ? 'cloud' : 'local',
    async load() {
      if (!client) return localRead();
      const { data, error } = await client.from('characters').select('id,revision,name,state,updated_at').order('updated_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) return null;
      const latest=data[0].state||{};
      const characters=data.map(row=>row.state?.character||{id:row.id,revision:row.revision,name:row.name});
      const [takeRows,promptRows]=await Promise.all([client.from('takes').select('*'),client.from('compiled_prompts').select('*')]);
      if (takeRows.error) throw takeRows.error;
      if (promptRows.error) throw promptRows.error;
      return JSON.stringify({...latest,characters,character:characters.find(item=>item.id===latest.activeCharacterId)||characters[0],activeCharacterId:latest.activeCharacterId||characters[0]?.id,takes:takeRows.data||latest.takes||[],compiledPrompts:promptRows.data||latest.compiledPrompts||[]});
    },
    async saveCharacter(state, userId) {
      if (!client) { local?.setItem(localKey, JSON.stringify(state)); return { mode: 'local' }; }
      const character = state.character;
      if (!character || !userId) throw new Error('Character and authenticated user are required');
      const { error } = await client.from('characters').upsert({ user_id: userId, id: character.id, revision: character.revision, name: character.name, state });
      if (error) throw error;
      return { mode: 'cloud' };
    },
    async deleteCharacter(characterId,userId) {
      requireUser(userId);
      if (!client) return { mode: 'local' };
      const { error } = await client.from('characters').delete().eq('user_id',userId).eq('id',characterId);
      if (error) throw error;
      return { mode: 'cloud' };
    },
    async saveTake(take, userId) {
      requireUser(userId);
      if (!client) return { mode: 'local' };
      const { error } = await client.from('takes').insert({ user_id: userId, id: take.id, character_id: take.characterId, created_at: take.createdAt, image_path: take.imagePath || null, state_snapshot: take.stateSnapshot, variation_reason: take.variationReason || null, parent_take_id: take.parentTakeId || null });
      if (error) throw error;
      return { mode: 'cloud' };
    },
    async savePrompt(prompt, userId) {
      requireUser(userId);
      if (!client) return { mode: 'local' };
      const { error } = await client.from('compiled_prompts').insert({ user_id: userId, id: prompt.id, character_id: prompt.characterId, created_at: prompt.createdAt, compiler: prompt.compiler, source_state: prompt.sourceState, text: prompt.text, edited: Boolean(prompt.edited) });
      if (error) throw error;
      return { mode: 'cloud' };
    },
    async uploadReference(file, userId, path = `references/${globalThis.crypto.randomUUID()}`) {
      requireUser(userId);
      if (!client) return { mode: 'local', path, file };
      const objectPath = `${userId}/${path}`;
      const { error } = await client.storage.from('promptforge-media').upload(objectPath, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      return { mode: 'cloud', path: objectPath };
    },
    async migrate(serializedState, userId) {
      requireUser(userId);
      const state = typeof serializedState === 'string' ? JSON.parse(serializedState) : serializedState;
      if (!client) { localWrite(state); return { mode: 'local', migrated: false }; }
      const result = await syncState(this, state, client);
      return { ...result, migrated: result.synced === true };
    },
    async getSummary(userId) {
      requireUser(userId);
      if (!client) {
        const state = JSON.parse(localRead() || '{}');
        return { profile: null, characters: state.characters?.length || (state.character ? 1 : 0), takes: state.takes?.length || 0, prompts: state.compiledPrompts?.length || 0, projects: 0, favorites: 0, recentTakes: state.takes || [] };
      }
      const [profile, characters, takes, prompts] = await Promise.all([
        client.from('profiles').select('display_name,avatar_path,created_at').eq('id', userId).maybeSingle(),
        client.from('characters').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        client.from('takes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('compiled_prompts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      ]);
      for (const result of [profile, characters, takes, prompts]) if (result.error) throw result.error;
      const mediaUrl=async path=>{if(!path)return null;const {data,error}=await client.storage.from('promptforge-media').createSignedUrl(path,3600);return error?null:data?.signedUrl||null};
      const resolvedProfile=profile.data?{...profile.data,avatar_url:await mediaUrl(profile.data.avatar_path)}:null;
      const recentTakes=await Promise.all((takes.data||[]).map(async take=>({...take,image_url:await mediaUrl(take.image_path)})));
      return { profile: resolvedProfile, characters: characters.count || 0, takes: recentTakes.length, prompts: prompts.count || 0, projects: 0, favorites: 0, recentTakes };
    }
  });
}
