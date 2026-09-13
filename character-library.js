export const CHARACTER_LIBRARY_SCHEMA_VERSION=1;

const clone=value=>structuredClone(value);
const makeId=()=>`character_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export function normalizeCharacter(character){
  if(!character)return null;
  return {...clone(character),id:character.id||makeId(),revision:Number(character.revision)||1,references:Array.isArray(character.references)?clone(character.references):[],interests:Array.isArray(character.interests)?[...character.interests]:[]};
}

export function normalizeCharacterCollection(state={}){
  const entries=Array.isArray(state.characters)?state.characters:[];
  const byId=new Map();
  for(const entry of entries){const character=normalizeCharacter(entry);if(character&&!byId.has(character.id))byId.set(character.id,character)}
  const legacy=normalizeCharacter(state.character);
  if(legacy)byId.set(legacy.id,legacy);
  const characters=[...byId.values()];
  const activeCharacterId=characters.some(item=>item.id===state.activeCharacterId)?state.activeCharacterId:legacy?.id||characters[0]?.id||null;
  return {characters,activeCharacterId};
}

export function commitCharacter(state,character){
  const next=normalizeCharacter(character),collection=normalizeCharacterCollection(state),index=collection.characters.findIndex(item=>item.id===next.id),characters=[...collection.characters];
  if(index<0)characters.push(next);else characters[index]=next;
  return {...state,characters,activeCharacterId:next.id,character:clone(next)};
}

export function switchCharacter(state,characterId){
  const collection=normalizeCharacterCollection({...state,character:state.character});
  const target=collection.characters.find(item=>item.id===characterId);
  if(!target)return state;
  const characters=state.character?collection.characters.map(item=>item.id===state.character.id?normalizeCharacter(state.character):item):collection.characters;
  const ownedTake=state.selectedTake&&state.takes?.some(take=>take.id===state.selectedTake&&take.characterId===target.id)?state.selectedTake:null;
  return {...state,characters,activeCharacterId:target.id,character:clone(target),selectedTake:ownedTake,lastPrompt:null,resolvedDirectorState:null,dirty:false};
}

export function archiveCharacter(state,characterId,archived=true){
  const collection=normalizeCharacterCollection({...state,character:state.character}),characters=collection.characters.map(item=>item.id===characterId?{...item,archived,updatedAt:new Date().toISOString()}:item);
  let next={...state,characters};
  if(archived&&state.activeCharacterId===characterId){const target=characters.find(item=>!item.archived)||characters.find(item=>item.id!==characterId);next=switchCharacter({...next,character:null},target?.id)}
  return next;
}

export function deleteCharacter(state,characterId,{force=false}={}){
  const collection=normalizeCharacterCollection({...state,character:state.character}),ownedTakes=(state.takes||[]).filter(take=>take.characterId===characterId);
  if(ownedTakes.length&&!force)throw new Error('This character owns Takes. Archive it or confirm permanent deletion first.');
  const characters=collection.characters.filter(item=>item.id!==characterId),activeWas=state.activeCharacterId===characterId;
  const takes=force?(state.takes||[]).filter(take=>take.characterId!==characterId):(state.takes||[]),compiledPrompts=force?(state.compiledPrompts||[]).filter(prompt=>prompt.characterId!==characterId):(state.compiledPrompts||[]);
  const target=activeWas?characters.find(item=>!item.archived)||characters[0]:collection.characters.find(item=>item.id===state.activeCharacterId);
  let next={...state,characters,takes,compiledPrompts,activeCharacterId:target?.id||null,character:target?clone(target):null,selectedTake:null,lastPrompt:null,resolvedDirectorState:null,dirty:true};
  if(target&&activeWas)next=switchCharacter(next,target.id);
  return next;
}

export function migrateCharacterState(state){
  const collection=normalizeCharacterCollection(state),active=collection.characters.find(item=>item.id===collection.activeCharacterId)||null;
  const takes=(state.takes||[]).map(take=>({...take,characterId:take.characterId||active?.id||null}));
  const compiledPrompts=(state.compiledPrompts||[]).map(prompt=>({...prompt,characterId:prompt.characterId||active?.id||null}));
  return {...state,...collection,character:active?clone(active):null,takes,compiledPrompts,selectedTake:state.selectedTake&&takes.some(take=>take.id===state.selectedTake&&take.characterId===active?.id)?state.selectedTake:null};
}
