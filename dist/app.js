import {blankState,stageMode,createCharacter,editCharacter,addReference,restoreState,resolveStudioState,compilePrompt,createTake,promoteTake,MockCompiler} from './studio-core.js';
import {STYLE_PACK_LIST} from './style-packs.js';

const KEY='promptforge-studio-v2';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let state=loadState();
function loadState(){try{const saved=localStorage.getItem(KEY);return saved?restoreState(saved):blankState()}catch{return blankState()}}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const toast=message=>{const target=$('toast');target.textContent=message;target.classList.add('show');setTimeout(()=>target.classList.remove('show'),1800)};
const mutate=change=>{state={...change(state),dirty:true,selectedTake:null};render()};

function renderStyleMix(){
  const influenceMap=new Map((state.styleMix?.influences||[]).map(item=>[item.packId,item.weight]));
  $('stylePanel').innerHTML=`<h2>♧　Style Mix</h2><div class="pack-list">${STYLE_PACK_LIST.map(pack=>{const weight=influenceMap.get(pack.id)??50;const active=influenceMap.has(pack.id);return `<article class="pack-row ${active?'active':''}"><label class="pack-choice"><input type="checkbox" data-pack-toggle="${pack.id}" ${active?'checked':''}><span><b>${pack.name}</b><small>${pack.description}</small></span></label><label class="pack-weight">Weight <output>${weight}</output><input type="range" min="1" max="100" value="${weight}" data-pack-weight="${pack.id}" ${active?'':'disabled'}></label></article>`}).join('')}</div><label class="strength">Overall influence <output>${Math.round((state.styleMix?.strength??.8)*100)}%</output><input id="styleStrength" type="range" min="0" max="100" value="${Math.round((state.styleMix?.strength??.8)*100)}"></label>`;
  document.querySelectorAll('[data-pack-toggle]').forEach(input=>input.onchange=()=>mutate(current=>{const existing=current.styleMix.influences.filter(item=>item.packId!==input.dataset.packToggle);if(input.checked)existing.push({packId:input.dataset.packToggle,weight:Number(document.querySelector(`[data-pack-weight="${input.dataset.packToggle}"]`).value)});return {...current,styleMix:{...current.styleMix,influences:existing}}}));
  document.querySelectorAll('[data-pack-weight]').forEach(input=>input.oninput=()=>{input.closest('label').querySelector('output').value=input.value});
  document.querySelectorAll('[data-pack-weight]').forEach(input=>input.onchange=()=>mutate(current=>({...current,styleMix:{...current.styleMix,influences:current.styleMix.influences.map(item=>item.packId===input.dataset.packWeight?{...item,weight:Number(input.value)}:item)}})));
  $('styleStrength').oninput=event=>event.target.closest('label').querySelector('output').value=`${event.target.value}%`;
  $('styleStrength').onchange=event=>mutate(current=>({...current,styleMix:{...current.styleMix,strength:Number(event.target.value)/100}}));
}

function render(){
  const has=!!state.character;
  $('studioTitle').textContent=has?`Create with ${state.character.name}`:'Create Something Extraordinary';
  $('studioSubtitle').textContent=has?`Build · Style · Scene · Generate${state.dirty?' · Unsaved changes':''}`:'Build characters. Style their world. Generate infinite possibilities.';
  $('generateBtn').disabled=!has;$('takeCount').textContent=state.takes.length;$('takesEmpty').style.display=state.takes.length?'none':'flex';
  $('takesList').innerHTML=state.takes.map((take,index)=>`<button class="take ${take.id===state.selectedTake?'selected':''}" data-take="${escape(take.id)}"><b>Take ${String(index+1).padStart(2,'0')}</b><small>${escape(take.variationReason)} · rev ${take.characterRevision}</small></button>`).join('');
  renderStyleMix();
  const art=$('stage').querySelector('.stage-art');
  if(!has){art.innerHTML='<span>NO CHARACTER YET</span><strong>Let’s create<br/>someone new.</strong><p>Start from scratch, use a quick generator,<br/>or jump in and build manually.</p><button class="primary" id="createBtn">✦　Create New Character</button><button id="surpriseBtn">◈　Surprise Me</button><button id="importBtn">□　Import Character (JSON)</button>'}
  else{art.innerHTML=`<span>${stageMode(state).toUpperCase()}</span><strong>${escape(state.character.name)}</strong><p>${state.character.identity.age} · ${escape(state.character.identity.location)}<br/>${escape(state.character.identity.occupation)}</p><button class="primary" id="referenceBtn">✦　${state.character.references?.length?'Change Reference':'Add Mock Reference'}</button><button id="stageCompile">✦　Compile Prompt</button><button id="newTakeBtn">＋　New Take</button><small>Stable ID ${escape(state.character.id)} · Revision ${state.character.revision}</small>`;
    $('referenceBtn').onclick=()=>{state=addReference(state);render();toast('Reference state ready; no Take was created')};$('stageCompile').onclick=compile;$('newTakeBtn').onclick=take;
  }
  hydrate();bind();save();
}

function hydrate(){
  if(!state.character)return;
  $('interestText').textContent=state.interestState.characterInterests.join(' · ')||'No interests selected';
  $('sceneText').textContent=state.scene?.name||'No scene selected';
  document.querySelectorAll('.dependent').forEach(panel=>panel.classList.remove('disabled'));
  const appearance=state.character.appearance;
  document.querySelector('.expression .dependent:nth-child(1)').innerHTML=`<h2>♙　Appearance <button class="edit-link" id="characterEdit">Edit Core</button></h2><div class="field-grid"><span>Hair<br/><b>${escape(appearance.hair.colour)}, ${escape(appearance.hair.style)}</b></span><span>Skin<br/><b>${escape(appearance.skinDetails.join(', '))}</b></span></div>`;
  document.querySelector('.expression .dependent:nth-child(2)').innerHTML=`<h2>♧　Wardrobe <button class="edit-link" id="wardrobeEdit">Manual</button></h2><div class="control-summary">${escape(state.wardrobe.items.join(' · ')||'Resolved from Style Mix')}</div><label class="lock-control"><input id="wardrobeLock" type="checkbox" ${state.wardrobe.locked?'checked':''}> Lock manual wardrobe</label>`;
  document.querySelector('.expression .dependent:nth-child(3)').innerHTML=`<h2>▣　Photography</h2><div>${escape(state.visualSettings.photography.shotType)} · ${escape(state.visualSettings.photography.lens)}</div>`;
  $('characterEdit').onclick=()=>{const name=prompt('Character name',state.character.name);if(name)state=editCharacter(state,{name});render()};
  $('wardrobeEdit').onclick=()=>{const value=prompt('Manual wardrobe items, separated by commas',state.wardrobe.items.join(', '));if(value!==null)mutate(current=>({...current,wardrobe:{...current.wardrobe,source:'manual',items:value.split(',').map(item=>item.trim()).filter(Boolean)}}))};
  $('wardrobeLock').onchange=event=>mutate(current=>({...current,wardrobe:{...current.wardrobe,locked:event.target.checked}}));
}

function bind(){
  $('createBtn')?.addEventListener('click',()=>{const name=prompt('Character name','Maya');if(name)state=createCharacter(state,{name});render()});
  $('surpriseBtn')?.addEventListener('click',()=>{state=createCharacter(state,{name:'Nova'});render()});
  $('compileBtn').onclick=compile;$('generateBtn').onclick=compile;$('inspectBtn').onclick=inspect;
  $('seedInput').value=state.generationOptions?.seed||'promptforge-1';
  $('seedInput').onchange=event=>mutate(current=>({...current,generationOptions:{...current.generationOptions,seed:event.target.value||'promptforge-1'}}));
  $('interestBtn').onclick=()=>mutate(current=>({...current,interestState:{...current.interestState,characterInterests:current.interestState.characterInterests.length?[]:['programming','photography']}}));
  $('sceneBtn').onclick=()=>mutate(current=>{const scenes=[{id:'cafe',name:'Café',location:'warm indoor coffee shop',activity:'conversation',tags:['cafe','indoor']},{id:'street',name:'City Street',location:'downtown city street',activity:'walking',tags:['street','city','outdoor']},{id:'library',name:'Library',location:'quiet library interior',activity:'reading',tags:['library','indoor','reading']},null];const index=scenes.findIndex(scene=>scene?.id===current.scene?.id);return {...current,scene:scenes[(index+1)%scenes.length]};});
  document.querySelectorAll('[data-take]').forEach(button=>button.onclick=()=>{state=promoteTake(state,button.dataset.take);render()});
}

function inspectorPayload(resolved){
  return {resolver:resolved.resolver,normalizedMix:resolved.styleMix.normalizedInfluences,resolved:resolved.resolved,provenance:Object.fromEntries(Object.entries(resolved.provenance.categories).map(([category,data])=>[category,{selection:data.selection,candidates:data.candidates.map(candidate=>({id:candidate.id,score:candidate.score,support:candidate.support,seedFactor:candidate.seedFactor,contributors:candidate.contributions.map(item=>item.packName),adjustments:candidate.adjustments}))}]))};
}
function inspect(){if(!state.character){toast('Create a Character Core before resolving');return}try{const resolved=resolveStudioState(state);$('inspector').classList.remove('hidden');$('inspectorOutput').textContent=JSON.stringify(inspectorPayload(resolved),null,2)}catch(error){toast(error.message)}}
function compile(){if(!state.character){toast('Create a Character Core before compiling');return}try{state=compilePrompt(state,MockCompiler);const consolePanel=$('console');consolePanel.classList.remove('hidden');consolePanel.innerHTML='✓ Character Core preserved<br/>✓ Style Mix normalized and resolved<br/>✓ Context compatibility scored<br/>✓ Locks and overrides applied<br/><br/>✨ Resolver output forwarded to MockCompiler<br/>✓ Master Director Prompt ready';render();inspect()}catch(error){toast(error.message)}}
function take(){try{state=createTake(state);render();toast('Immutable Take created')}catch(error){toast(error.message)}}
render();
