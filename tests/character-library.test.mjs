import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createCharacter,createTake,restoreState,serializeState} from '../studio-core.js';
import {switchCharacter,archiveCharacter,deleteCharacter,migrateCharacterState} from '../character-library.js';
import {createCloudStore} from '../cloud-store.js';

const make=(name)=>createCharacter(blankState(),{name,location:`${name} City`,occupation:`${name} Maker`});

test('legacy single-character state migrates to one active collection entry',()=>{
  const legacy=make('Legacy');
  const restored=restoreState(JSON.stringify({...legacy,characters:undefined,activeCharacterId:undefined}));
  assert.equal(restored.characters.length,1);
  assert.equal(restored.activeCharacterId,restored.character.id);
  assert.equal(restored.characters[0].name,'Legacy');
});

test('character switching preserves stable identity and isolates active core',()=>{
  let first=make('First');
  const second=make('Second');
  first={...first,characters:[first.character,second.character],activeCharacterId:first.character.id};
  const switched=switchCharacter(first,second.character.id);
  assert.equal(switched.character.name,'Second');
  assert.equal(switched.activeCharacterId,second.character.id);
  assert.equal(switched.characters.find(item=>item.id===first.character.id).name,'First');
  assert.equal(switched.character.id,second.character.id);
});

test('editing the active core updates only its collection record',()=>{
  const first=make('First'),second=make('Second');
  const state={...first,characters:[first.character,second.character],activeCharacterId:first.character.id};
  const migrated=migrateCharacterState({...state,character:{...first.character,name:'First Updated'}});
  assert.equal(migrated.characters.find(item=>item.id===first.character.id).name,'First Updated');
  assert.equal(migrated.characters.find(item=>item.id===second.character.id).name,'Second');
});

test('Takes retain ownership and selected Take cannot cross characters',()=>{
  let state=make('First');
  state=createTake(state,'first-take');
  const firstTake=state.takes[0];
  const second=make('Second').character;
  state={...state,characters:[state.character,second],activeCharacterId:state.character.id};
  const switched=switchCharacter(state,second.id);
  assert.equal(firstTake.characterId,state.character.id);
  assert.equal(switched.selectedTake,null);
});

test('delete safety blocks characters that own Takes until forced',()=>{
  let state=createTake(make('Owned'),'owned-take');
  assert.throws(()=>deleteCharacter(state,state.character.id),/owns Takes/);
  const deleted=deleteCharacter(state,state.character.id,{force:true});
  assert.equal(deleted.character,null);
  assert.equal(deleted.takes.length,0);
});

test('archive keeps identity and selects another active character',()=>{
  const first=make('First'),second=make('Second');
  const state={...first,characters:[first.character,second.character],activeCharacterId:first.character.id};
  const archived=archiveCharacter(state,first.character.id,true);
  assert.equal(archived.characters.find(item=>item.id===first.character.id).archived,true);
  assert.equal(archived.activeCharacterId,second.character.id);
});

test('collection and Take associations survive save and reload',()=>{
  let state=make('First');
  const second=make('Second').character;
  state={...state,characters:[state.character,second],activeCharacterId:state.character.id};
  state=createTake(state,'first-take');
  const restored=restoreState(serializeState(state));
  assert.equal(restored.characters.length,2);
  assert.equal(restored.takes[0].characterId,state.character.id);
  assert.equal(restored.activeCharacterId,state.character.id);
});

test('local collection summary counts all characters',async()=>{
  const localData=new Map();
  const local=createCloudStore({local:{getItem:key=>localData.get(key)||null,setItem:(key,value)=>localData.set(key,value)}});
  const first=make('First'),second=make('Second');
  await local.saveCharacter({...first,characters:[first.character,second.character]},'local-user');
  const summary=await local.getSummary('local-user');
  assert.equal(summary.characters,2);
});

test('cloud sync saves each collection character and preserves ownership fields',async()=>{
  const rows=[];
  const query=()=>({select:()=>({eq:()=>({})})});
  const client={
    from(table){
      if(table==='characters')return {select:()=>({eq:()=>({data:[],error:null}),data:[],error:null}),upsert:async value=>{rows.push(value);return {error:null}}};
      if(table==='compiled_prompts'||table==='takes')return {select:()=>({eq:async()=>({data:[],error:null})})};
      return {};
    },
    auth:{getUser:async()=>({data:{user:{id:'cloud-user'}},error:null})}
  };
  const first=make('First'),second=make('Second');
  const store=createCloudStore({client});
  const {syncState}=await import('../cloud-store.js');
  const result=await syncState(store,{...first,characters:[first.character,second.character]},client);
  assert.equal(result.synced,true);
  assert.deepEqual(rows.map(row=>row.id),[first.character.id,second.character.id]);
  assert.ok(rows.every(row=>row.state.characterId===undefined&&row.state.character.id===row.id));
});
