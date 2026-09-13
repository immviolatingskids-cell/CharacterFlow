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
  if (state.character) await store.saveCharacter(state, user.id);
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
      const { data, error } = await client.from('characters').select('state').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data?.state ? JSON.stringify(data.state) : null;
    },
    async saveCharacter(state, userId) {
      if (!client) { local?.setItem(localKey, JSON.stringify(state)); return { mode: 'local' }; }
      const character = state.character;
      if (!character || !userId) throw new Error('Character and authenticated user are required');
      const { error } = await client.from('characters').upsert({ user_id: userId, id: character.id, revision: character.revision, name: character.name, state });
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
      if (state.character) await this.saveCharacter(state, userId);
      for (const take of state.takes || []) await this.saveTake(take, userId);
      for (const prompt of state.compiledPrompts || []) await this.savePrompt(prompt, userId);
      return { mode: 'cloud', migrated: true };
    },
    async getSummary(userId) {
      requireUser(userId);
      if (!client) {
        const state = JSON.parse(localRead() || '{}');
        return { characters: state.character ? 1 : 0, takes: state.takes?.length || 0, prompts: state.compiledPrompts?.length || 0, projects: 0, recentTakes: state.takes || [] };
      }
      const [characters, takes, prompts] = await Promise.all([
        client.from('characters').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        client.from('takes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('compiled_prompts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      ]);
      for (const result of [characters, takes, prompts]) if (result.error) throw result.error;
      return { characters: characters.count || 0, takes: takes.data?.length || 0, prompts: prompts.count || 0, projects: 0, recentTakes: takes.data || [] };
    }
  });
}
