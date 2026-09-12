import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createCharacter,resolveStudioState,compilePrompt,MockCompiler} from '../studio-core.js';

const withMix=(mix=[['tech-girlie',50],['streetwear',50]],scene=null)=>{let state=createCharacter(blankState(),{name:'Maya'});state={...state,styleMix:{...state.styleMix,influences:mix.map(([packId,weight])=>({packId,weight}))},scene};return state};
const candidate=(resolution,category,id)=>resolution.provenance.categories[category].candidates.find(item=>item.id===id);

test('same seed and same state resolve identically',()=>{const state=withMix();assert.deepEqual(resolveStudioState(state,{seed:'same'}),resolveStudioState(state,{seed:'same'}))});

test('different seeds may produce different valid resolutions',()=>{const state=withMix([['tech-girlie',50],['streetwear',50],['booktok',50]]);const variants=new Set(Array.from({length:40},(_,index)=>JSON.stringify(resolveStudioState(state,{seed:`seed-${index}`}).resolved)));assert.ok(variants.size>1);for(const value of variants)assert.doesNotThrow(()=>JSON.parse(value))});

test('mix weights affect candidate scoring',()=>{const techHeavy=resolveStudioState(withMix([['tech-girlie',90],['streetwear',10]]),{seed:'weight'});const streetHeavy=resolveStudioState(withMix([['tech-girlie',10],['streetwear',90]]),{seed:'weight'});assert.ok(candidate(streetHeavy,'wardrobe','utility-cargo').score>candidate(techHeavy,'wardrobe','utility-cargo').score)});

test('shared atoms accumulate support from multiple packs',()=>{const resolved=resolveStudioState(withMix(),{seed:'shared'});const shared=candidate(resolved,'styling','layered-silver');assert.deepEqual(shared.contributions.map(item=>item.packId).sort(),['streetwear','tech-girlie']);assert.ok(shared.support>candidate(resolveStudioState(withMix([['tech-girlie',50]]),{seed:'shared'}),'styling','layered-silver').support)});

test('context changes compatibility softly without removing candidates',()=>{const neutral=resolveStudioState(withMix([['tech-girlie',100]]),{seed:'context'});const cafe=resolveStudioState(withMix([['tech-girlie',100]],{id:'cafe',name:'Café',tags:['cafe','indoor']}),{seed:'context'});const before=candidate(neutral,'props','slim-laptop');const after=candidate(cafe,'props','slim-laptop');assert.equal(before.contributions[0].compatibilityMultiplier,1);assert.ok(after.contributions[0].compatibilityMultiplier>1);assert.equal(neutral.provenance.categories.props.candidates.length,cafe.provenance.categories.props.candidates.length)});

test('Style resolution never mutates Character Core',()=>{const state=withMix([['booktok',100]]);const before=structuredClone(state.character);resolveStudioState(state,{seed:'identity'});assert.deepEqual(state.character,before)});

test('Booktok does not add Reading as a Character interest',()=>{const state=withMix([['booktok',100]]);const before=[...state.character.interests];const resolved=resolveStudioState(state,{seed:'booktok'});assert.deepEqual(state.character.interests,before);assert.deepEqual(resolved.character.interests,before);assert.equal(state.character.interests.includes('Reading'),false)});

test('manual and locked wardrobe overrides are respected',()=>{let state=withMix();state={...state,wardrobe:{source:'manual',items:['red archive jacket','black boots'],locked:true}};const resolved=resolveStudioState(state,{seed:'locked'});assert.deepEqual(resolved.resolved.wardrobe,state.wardrobe.items);assert.equal(resolved.provenance.categories.wardrobe.selection.source,'wardrobe-lock')});

test('provenance identifies contributing packs and contextual adjustments',()=>{const state=withMix([['tech-girlie',50],['booktok',50]],{id:'cafe',tags:['cafe','indoor']});const resolved=resolveStudioState(state,{seed:'provenance'});const laptop=candidate(resolved,'props','slim-laptop');const mug=candidate(resolved,'props','ceramic-mug');assert.equal(laptop.contributions[0].packName,'Tech Girlie');assert.equal(mug.contributions[0].packName,'Booktok');assert.ok(laptop.adjustments.length);assert.ok(mug.adjustments.length)});

test('resolver output is serializable, persistent, and compiler-ready',()=>{const state=withMix([['tech-girlie',40],['streetwear',35],['booktok',25]]);const resolved=resolveStudioState(state,{seed:'persist'});assert.deepEqual(JSON.parse(JSON.stringify(resolved)),resolved);const compiled=compilePrompt({...state,generationOptions:{seed:'persist'}},MockCompiler);assert.deepEqual(compiled.lastPrompt.sourceState,resolved);assert.match(compiled.lastPrompt.text,/Preserve canonical identity/)});
