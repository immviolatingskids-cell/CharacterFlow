import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createCharacter} from '../studio-core.js';
import {compilePromptPreview} from '../prompt-provider.js';

const state=()=>createCharacter(blankState(),{name:'Mina',location:'Tokyo',occupation:'Designer'});

test('local prompt preview retains compiler metadata and text for copy or export',async()=>{
  const source={...state(),scene:{name:'Hotel Lobby',location:'quiet design hotel lobby',activity:'waiting'},wardrobe:{source:'manual',items:['structured cap','tailored blazer'],locked:false},visualSettings:{...state().visualSettings,photography:{shotType:'Candid',lens:'50mm',angle:'Eye level'},lighting:{behaviour:'Natural',colourTreatment:'Warm'}}};
  const result=await compilePromptPreview(source);
  assert.equal(result.provider,'local');
  assert.equal(result.state.lastPrompt.compiler.provider,'mock');
  assert.match(result.state.lastPrompt.text,/Mina/);
  assert.match(result.state.lastPrompt.text,/Hotel Lobby/);
  assert.match(result.state.lastPrompt.text,/structured cap, tailored blazer/);
  assert.match(result.state.lastPrompt.text,/Photography: Candid, 50mm lens, Eye level angle/);
  assert.match(result.state.lastPrompt.text,/Lighting: Natural light with Warm colour treatment/);
  assert.match(result.state.lastPrompt.text,/Preserve canonical identity/);
  assert.match(result.state.lastPrompt.text,/\n/);
  assert.ok(result.state.lastPrompt.sourceState);
});

test('explicit wardrobe and scene remain authoritative over generated resolver suggestions',async()=>{
  const source={...state(),scene:{name:'Hotel Lobby',location:'quiet design hotel lobby'},wardrobe:{source:'manual',items:['tailored blazer'],locked:false},styleMix:{influences:[{packId:'gym-girlie',weight:100}],strength:1,locks:{}}};
  const result=await compilePromptPreview(source);
  assert.match(result.state.lastPrompt.text,/Wardrobe: tailored blazer/);
  assert.match(result.state.lastPrompt.text,/Scene: Hotel Lobby/);
  assert.doesNotMatch(result.state.lastPrompt.text,/bright studio gym/);
});

test('configured Gemini adapter is traceable and a failure safely falls back locally',async()=>{
  const success=await compilePromptPreview(state(),{gemini:{model:'gemini-test',compile:async()=> 'Gemini prompt'}});
  assert.equal(success.provider,'Gemini');
  assert.equal(success.state.lastPrompt.compiler.provider,'gemini');
  assert.equal(success.state.lastPrompt.text,'Gemini prompt');
  const failed=await compilePromptPreview(state(),{gemini:{compile:async()=>{throw new Error('offline')}}});
  assert.equal(failed.provider,'local');
  assert.match(failed.fallbackError.message,/offline/);
  assert.equal(failed.state.lastPrompt.compiler.provider,'mock');
});
