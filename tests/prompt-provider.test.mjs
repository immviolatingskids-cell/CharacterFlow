import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createCharacter} from '../studio-core.js';
import {compilePromptPreview} from '../prompt-provider.js';

const state=()=>createCharacter(blankState(),{name:'Mina',location:'Tokyo',occupation:'Designer'});

test('local prompt preview retains compiler metadata and text for copy or export',async()=>{
  const result=await compilePromptPreview(state());
  assert.equal(result.provider,'local');
  assert.equal(result.state.lastPrompt.compiler.provider,'mock');
  assert.match(result.state.lastPrompt.text,/Mina/);
  assert.ok(result.state.lastPrompt.sourceState);
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
