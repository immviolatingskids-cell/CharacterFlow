import {blankState,stageMode,createCharacter,editCharacter,addReference,restoreState,resolveStudioState,compilePrompt,createTake,promoteTake,MockCompiler} from './studio-core.js';
import {STYLE_PACK_LIST} from './style-packs.js';

const KEY='promptforge-studio-v2';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let state=loadState();
let activeWorkspace=localStorage.getItem('promptforge-workspace')||'create';
if(activeWorkspace==='style-packs')activeWorkspace='create';
function loadState(){try{const saved=localStorage.getItem(KEY);return saved?restoreState(saved):blankState()}catch{return blankState()}}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const toast=message=>{const target=$('toast');target.textContent=message;target.classList.add('show');setTimeout(()=>target.classList.remove('show'),1800)};
const mutate=change=>{state={...change(state),dirty:true,selectedTake:null};render()};
let activeDrawer=null;
function ensurePhotoDrawer(){if($('photoDrawer'))return;document.body.insertAdjacentHTML('beforeend','<aside id="photoDrawer" class="drawer" aria-hidden="true" aria-labelledby="photoDrawerTitle"><button class="drawer-close" data-close-drawer aria-label="Close Photography editor">×</button><div class="eyebrow">PHOTOGRAPHY</div><h2 id="photoDrawerTitle">Direct the frame</h2><p class="drawer-intro">Tune the camera language that carries through to every generated direction.</p><form id="photoForm" class="drawer-form"><label>Shot type<select name="shotType"><option>Candid</option><option>Editorial portrait</option><option>Full body</option><option>Close-up</option></select></label><label>Lens<select name="lens"><option>35mm</option><option>50mm</option><option>85mm</option><option>105mm</option></select></label><label>Angle<select name="angle"><option>Eye level</option><option>Three-quarter</option><option>Low angle</option><option>High angle</option></select></label><label>Lighting<select name="behaviour"><option>Natural</option><option>Soft studio</option><option>Hard flash</option><option>Neon</option></select></label><label>Colour treatment<select name="colourTreatment"><option>Warm</option><option>Neutral</option><option>Cool</option><option>Monochrome</option></select></label><div class="drawer-actions"><button type="button" data-close-drawer>Cancel</button><button class="primary" type="submit">Save Photography</button></div></form></aside>')}
function openPhotoDrawer(){ensurePhotoDrawer();const form=$('photoForm'),photo=state.visualSettings.photography,lighting=state.visualSettings.lighting;form.shotType.value=photo.shotType;form.lens.value=photo.lens;form.angle.value=photo.angle;form.behaviour.value=lighting.behaviour;form.colourTreatment.value=lighting.colourTreatment;setDrawer('photo',true)}
function renderReferenceList(){const status=$('coreReferenceStatus');let list=$('coreReferenceList');if(!list){list=document.createElement('div');list.id='coreReferenceList';list.className='reference-list';status.after(list)}list.innerHTML=(state.character?.references||[]).map((reference,index)=>`<span>Reference ${index+1} · ${escape(reference.source||'local')}</span>`).join('')||'<span>No references attached</span>'}
const SCENE_OPTIONS=[{id:'cafe',name:'Café',location:'warm indoor coffee shop',activity:'conversation'},{id:'street',name:'City Street',location:'downtown city street',activity:'walking'},{id:'library',name:'Library',location:'quiet library interior',activity:'reading'}];
function ensureSceneDrawer(){if($('sceneDrawer'))return;document.body.insertAdjacentHTML('beforeend','<aside id="sceneDrawer" class="drawer" aria-hidden="true" aria-labelledby="sceneDrawerTitle"><button class="drawer-close" data-close-drawer aria-label="Close Scenes">×</button><div class="eyebrow">SCENE LIBRARY</div><h2 id="sceneDrawerTitle">Place the character</h2><p class="drawer-intro">Choose a setting and activity without leaving the Studio canvas.</p><div id="sceneDrawerBody" class="scene-options"></div></aside>')}
function renderSceneDrawer(){ensureSceneDrawer();$('sceneDrawerBody').innerHTML=SCENE_OPTIONS.map(scene=>`<button class="scene-option ${state.scene?.id===scene.id?'selected':''}" data-scene-id="${scene.id}"><b>${scene.name}</b><span>${scene.location}</span><small>${scene.activity}</small></button>`).join('')+'<button class="scene-option clear-scene" data-scene-id="clear"><b>No scene</b><span>Return to an unplaced character</span></button>';document.querySelectorAll('[data-scene-id]').forEach(button=>button.onclick=()=>{const id=button.dataset.sceneId;mutate(current=>({...current,scene:id==='clear'?null:SCENE_OPTIONS.find(scene=>scene.id===id)}));closeDrawer();toast(id==='clear'?'Scene cleared':'Scene selected')})}
function setDrawer(name,open){const drawer=$(name+'Drawer');const overlay=$('overlay');activeDrawer=open?name:null;drawer.classList.toggle('open',open);drawer.setAttribute('aria-hidden',String(!open));drawer.toggleAttribute('aria-modal',open);overlay.hidden=!open;overlay.classList.toggle('open',open);document.body.classList.toggle('drawer-open',open);if(open)drawer.querySelector('input,button,textarea')?.focus();}
function closeDrawer(){if(activeDrawer)setDrawer(activeDrawer,false)}
function renderStyleDrawer(){
  const influenceMap=new Map((state.styleMix?.influences||[]).map(item=>[item.packId,item.weight]));
  const rows=STYLE_PACK_LIST.map(pack=>{const weight=influenceMap.get(pack.id)??50;const active=influenceMap.has(pack.id);return `<article class="pack-row ${active?'active':''}" data-drawer-pack-row="${pack.id}"><label class="pack-choice"><input type="checkbox" data-drawer-pack-toggle="${pack.id}" ${active?'checked':''}><span><b>${pack.name}</b><small>${pack.description}</small></span></label><label class="pack-weight">Weight <output>${weight}</output><input type="range" min="1" max="100" value="${weight}" data-drawer-pack-weight="${pack.id}" ${active?'':'disabled'}></label></article>`}).join('');
  $('styleDrawerBody').innerHTML=`<label class="pack-search"><span>Find a Style Pack</span><input id="drawerPackSearch" type="search" placeholder="Search 15 packs" autocomplete="off"></label><div class="pack-list drawer-pack-list">${rows}</div>`;
  $('drawerPackSearch').oninput=e=>{const query=e.target.value.toLowerCase();document.querySelectorAll('[data-drawer-pack-row]').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(query))};
  document.querySelectorAll('[data-drawer-pack-toggle]').forEach(input=>input.onchange=()=>{const id=input.dataset.drawerPackToggle;mutate(current=>{const existing=current.styleMix.influences.filter(item=>item.packId!==id);if(input.checked)existing.push({packId:id,weight:Number(document.querySelector(`[data-drawer-pack-weight="${id}"]`).value)});return {...current,styleMix:{...current.styleMix,influences:existing}}});setDrawer('style',true)});
  document.querySelectorAll('[data-drawer-pack-weight]').forEach(input=>input.oninput=()=>input.closest('label').querySelector('output').value=input.value);
  document.querySelectorAll('[data-drawer-pack-weight]').forEach(input=>input.onchange=()=>{const id=input.dataset.drawerPackWeight;mutate(current=>({...current,styleMix:{...current.styleMix,influences:current.styleMix.influences.map(item=>item.packId===id?{...item,weight:Number(input.value)}:item)}}));setDrawer('style',true)});
}

function renderStyleMix(){
  const influenceMap=new Map((state.styleMix?.influences||[]).map(item=>[item.packId,item.weight]));
  const order=new Map((state.styleMix?.influences||[]).map((item,index)=>[item.packId,index]));
  const rows=[...STYLE_PACK_LIST].sort((a,b)=>(order.has(a.id)?order.get(a.id):999)-(order.has(b.id)?order.get(b.id):999)).map(pack=>{const weight=influenceMap.get(pack.id)??50;const active=influenceMap.has(pack.id);return `<article class="pack-row ${active?'active':''}" data-pack-row="${pack.id}"><label class="pack-choice"><input type="checkbox" data-pack-toggle="${pack.id}" ${active?'checked':''}><span><b>${pack.name}</b><small>${pack.description}</small></span></label><label class="pack-weight">Weight <output>${weight}</output><input type="range" min="1" max="100" value="${weight}" data-pack-weight="${pack.id}" ${active?'':'disabled'}></label></article>`}).join('');
  const selected=(state.styleMix?.influences||[]).map(item=>STYLE_PACK_LIST.find(pack=>pack.id===item.packId)?.name).filter(Boolean);
  const chips=selected.map(name=>'<span class="mix-chip">'+escape(name)+'</span>').join('');
  $('stylePanel').innerHTML=`<h2>♧　Style Mix <button class="plus" id="browseStyleBtn" aria-label="Browse Style Packs">＋</button></h2><div class="mix-summary">${selected.length?chips:'<div class="empty-copy">▱<b>No style packs selected</b><span>Choose influences to define your character\'s look.</span></div>'}</div><button class="wide" id="browseStyleBtnBottom">${selected.length?'Edit Style Mix':'Browse Style Packs'}　→</button>`;
  $('browseStyleBtn').onclick=()=>{renderStyleDrawer();setDrawer('style',true)};$('browseStyleBtnBottom').onclick=()=>{renderStyleDrawer();setDrawer('style',true)};
}

function render(){
  renderWorkspaceShell();
  if(activeWorkspace!=='create'){renderWorkspaceView();bind();return}
  const has=!!state.character;
  $('studioTitle').textContent=has?`Create with ${state.character.name}`:'Create Something Extraordinary';
  $('studioSubtitle').textContent=has?`Build · Style · Scene · Generate${state.dirty?' · Unsaved changes':''}`:'Build characters. Style their world. Generate infinite possibilities.';
  $('generateBtn').disabled=!has;$('takeCount').textContent=state.takes.length;$('takesEmpty').style.display=state.takes.length?'none':'flex';
  $('takesList').innerHTML=state.takes.map((take,index)=>`<button class="take ${take.id===state.selectedTake?'selected':''}" data-take="${escape(take.id)}"><b>Take ${String(index+1).padStart(2,'0')}</b><small>${escape(take.variationReason)} · rev ${take.characterRevision}</small></button>`).join('');
  renderStyleMix();
  const art=$('stage').querySelector('.stage-art');
  $('stage').classList.remove('stage-refresh');void $('stage').offsetWidth;$('stage').classList.add('stage-refresh');
  if(!has){art.innerHTML='<span>NO CHARACTER YET</span><strong>Let’s create<br/>someone new.</strong><p>Start from scratch, use a quick generator,<br/>or jump in and build manually.</p><button class="primary" id="createBtn">✦　Create New Character</button><button id="surpriseBtn">◈　Surprise Me</button><button id="importBtn">□　Import Character (JSON)</button>'}
  else{art.innerHTML=`<span>${stageMode(state).toUpperCase()}</span><strong>${escape(state.character.name)}</strong><p>${state.character.identity.age} · ${escape(state.character.identity.location)}<br/>${escape(state.character.identity.occupation)}</p><button class="primary" id="referenceBtn">✦　${state.character.references?.length?'Change Reference':'Add Mock Reference'}</button><button id="stageCompile">✦　Compile Prompt</button><button id="newTakeBtn">＋　New Take</button><small>Stable ID ${escape(state.character.id)} · Revision ${state.character.revision}</small>`;
    $('referenceBtn').onclick=()=>{state=addReference(state);render();toast('Reference state ready; no Take was created')};$('stageCompile').onclick=compile;$('newTakeBtn').onclick=take;
  }
  hydrate();bind();save();
}

const workspaceMeta={characters:['Characters','Saved Character Cores','Manage identity foundations without changing the active Studio.'], 'style-packs':['Style Packs','Catalogue','Browse registered expression influences and inspect their domains.'],scenes:['Scenes','Scene library','Reusable settings for future directing sessions.'],library:['Library','Archive','Takes, references, compiled prompts, and reusable assets.'],projects:['Projects','Workspace shell','Group Characters, Scenes, Takes, and references.'],inspiration:['Inspiration','Coming soon','A deliberate home for reference boards and visual direction.'],tools:['Tools','Power tools','Diagnostics and developer utilities for the current session.'],settings:['Settings','Preferences','Storage and compiler preferences will live here.']};
function renderWorkspaceShell(){
  const root=$('workspaceRoot'); root.querySelector('.workspace-view')?.remove();
  root.querySelector('.studio-head').classList.toggle('hidden',activeWorkspace!=='create');
  document.querySelectorAll('[data-workspace]').forEach(button=>{const active=button.dataset.workspace===activeWorkspace;button.classList.toggle('nav-active',active);button.toggleAttribute('aria-current',active);button.setAttribute('tabindex',active?'0':'0')});
  if(activeWorkspace!=='create') root.querySelectorAll(':scope > *:not(.workspace-view):not(.studio-head)').forEach(node=>node.classList.add('hidden'));
  else root.querySelectorAll(':scope > *').forEach(node=>node.classList.remove('hidden'));
}
function renderWorkspaceView(){
  const root=$('workspaceRoot'), view=document.createElement('div'); view.className='workspace-view';
  const meta=workspaceMeta[activeWorkspace]; let body='';
  if(activeWorkspace==='style-packs') body=`<div class="workspace-grid">${STYLE_PACK_LIST.map(pack=>`<article class="panel catalogue-card"><h2>${escape(pack.name)}</h2><p>${escape(pack.description)}</p><small>${Object.keys(pack.domains||pack.atoms||{}).length||9} domains · ${Object.values(pack.domains||pack.atoms||{}).flat?.().length||'—'} entries</small><details><summary>Inspect pack</summary><pre>${escape(JSON.stringify(pack,null,2))}</pre></details></article>`).join('')}</div>`;
  else if(activeWorkspace==='characters') body=state.character?`<article class="panel"><h2>${escape(state.character.name)}</h2><p>${escape(state.character.identity.occupation)} · ${escape(state.character.identity.location)}</p><small>Stable ID ${escape(state.character.id)} · Revision ${state.character.revision}</small></article>`:'<div class="empty-copy"><b>No saved Characters yet</b><span>Create a Character Core in Create to see it here.</span></div>';
  else if(activeWorkspace==='scenes') body=state.scene?`<article class="panel"><h2>${escape(state.scene.name)}</h2><p>${escape(state.scene.location)} · ${escape(state.scene.activity)}</p></article>`:'<div class="empty-copy"><b>No reusable Scenes yet</b><span>Choose a scene in Create to begin building the library.</span></div>';
  else if(activeWorkspace==='library') body=`<div class="workspace-grid"><article class="panel"><h2>Takes · ${state.takes.length}</h2><p>${state.takes.length?'Immutable generations are available in Create.':'No Takes yet.'}</p></article><article class="panel"><h2>References · ${state.character?.references?.length||0}</h2><p>Mock/local references remain attached to the active Character.</p></article><article class="panel"><h2>Compiled Prompts</h2><p>${state.compiledPrompt?'Latest prompt ready.':'No compiled prompt yet.'}</p></article></div>`;
  else if(activeWorkspace==='tools') body=`<div class="panel"><h2>Resolver Inspector</h2><p>Inspect deterministic Style resolution in Create.</p><button class="primary" id="toolsInspect">Open Inspector</button></div>`;
  else body=`<div class="panel"><h2>${meta[0]}</h2><p>${meta[2]}</p><div class="empty-copy"><b>${meta[1]} is ready for the next milestone</b><span>This workspace keeps your Studio state intact.</span></div></div>`;
  view.innerHTML=`<div class="studio-head"><div class="eyebrow">PROMPTFORGE WORKSPACE</div><h1>${meta[0]}</h1><p>${meta[2]}</p></div>${body}`;root.append(view);$('toolsInspect')?.addEventListener('click',()=>{activeWorkspace='create';localStorage.setItem('promptforge-workspace','create');render();setTimeout(inspect,0)});
}

function hydrate(){
  if(!state.character)return;
  $('interestText').textContent=state.interestState.characterInterests.join(' · ')||'No interests selected';
  $('sceneText').textContent=state.scene?.name||'No scene selected';
  document.querySelectorAll('.dependent').forEach(panel=>panel.classList.remove('disabled'));
  const appearance=state.character.appearance;
  document.querySelector('.expression .dependent:nth-child(1)').innerHTML=`<h2>♙　Appearance <button class="edit-link" id="characterEdit">Edit Core</button></h2><div class="field-grid"><span>Hair<br/><b>${escape(appearance.hair.colour)}, ${escape(appearance.hair.style)}</b></span><span>Skin<br/><b>${escape(appearance.skinDetails.join(', '))}</b></span></div>`;
  document.querySelector('.expression .dependent:nth-child(2)').innerHTML=`<h2>♧　Wardrobe <button class="edit-link" id="wardrobeEdit">Manual</button></h2><div class="control-summary">${escape(state.wardrobe.items.join(' · ')||'Resolved from Style Mix')}</div><label class="lock-control"><input id="wardrobeLock" type="checkbox" ${state.wardrobe.locked?'checked':''}> Lock manual wardrobe</label>`;
  document.querySelector('.expression .dependent:nth-child(3)').innerHTML=`<h2>▣　Photography <button class="edit-link" id="photoEdit">Edit</button></h2><div>${escape(state.visualSettings.photography.shotType)} · ${escape(state.visualSettings.photography.lens)} · ${escape(state.visualSettings.photography.angle)}</div><small>${escape(state.visualSettings.lighting.behaviour)} · ${escape(state.visualSettings.lighting.colourTreatment)}</small>`;
  $('characterEdit').onclick=()=>{const character=state.character;const form=$('coreForm');form.name.value=character.name;form.age.value=character.identity.age;form.location.value=character.identity.location;form.occupation.value=character.identity.occupation;form.traits.value=(character.personality?.traits||[]).join(', ');form.interests.value=(character.interests||[]).join(', ');$('coreReferenceStatus').textContent=character.references?.length?`${character.references.length} reference${character.references.length===1?'':'s'} attached`:'No references attached';renderReferenceList();setDrawer('core',true)};
  $('wardrobeEdit').onclick=()=>{const form=$('wardrobeForm');form.items.value=state.wardrobe.items.join(', ');form.locked.checked=state.wardrobe.locked;setDrawer('wardrobe',true)};
  $('photoEdit').onclick=openPhotoDrawer;
  $('wardrobeLock').onchange=event=>mutate(current=>({...current,wardrobe:{...current.wardrobe,locked:event.target.checked}}));
}

function bind(){
  ensureSceneDrawer();
  document.querySelectorAll('[data-close-drawer]').forEach(button=>button.onclick=closeDrawer);$('overlay').onclick=closeDrawer;
  $('coreReferenceBtn').onclick=()=>{state=addReference(state,{source:`mock-local-${state.character.references.length+1}`});$('coreReferenceStatus').textContent=`${state.character.references.length} reference${state.character.references.length===1?'':'s'} attached`;renderReferenceList();toast('Reference attached')};
  $('wardrobeForm').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const items=String(data.get('items')||'').split(',').map(item=>item.trim()).filter(Boolean);mutate(current=>({...current,wardrobe:{...current.wardrobe,source:'manual',items,locked:data.get('locked')==='on'}}));closeDrawer();toast('Wardrobe saved')};
  ensurePhotoDrawer();$('photoForm').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);mutate(current=>({...current,visualSettings:{...current.visualSettings,photography:{...current.visualSettings.photography,shotType:String(data.get('shotType')),lens:String(data.get('lens')),angle:String(data.get('angle'))},lighting:{...current.visualSettings.lighting,behaviour:String(data.get('behaviour')),colourTreatment:String(data.get('colourTreatment'))}}}));closeDrawer();toast('Photography saved')};
  $('coreForm').onsubmit=event=>{event.preventDefault();const data=new FormData(event.currentTarget);const list=name=>String(data.get(name)||'').split(',').map(item=>item.trim()).filter(Boolean);const next=editCharacter(state,{name:String(data.get('name')).trim(),age:Number(data.get('age')),location:String(data.get('location')).trim(),occupation:String(data.get('occupation')).trim()});state={...next,character:{...next.character,personality:{...next.character.personality,traits:list('traits')},interests:list('interests')},interestState:{...next.interestState,characterInterests:list('interests')}};closeDrawer();render();toast('Character Core saved')};
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer()},{once:true});
  document.querySelectorAll('[data-workspace]').forEach(button=>button.onclick=()=>{if(button.dataset.workspace==='style-packs'){activeWorkspace='create';localStorage.setItem('promptforge-workspace','create');render();renderStyleDrawer();setDrawer('style',true);return}activeWorkspace=button.dataset.workspace;localStorage.setItem('promptforge-workspace',activeWorkspace);render()});
  $('createBtn')?.addEventListener('click',()=>{const name=prompt('Character name','Maya');if(name)state=createCharacter(state,{name});render()});
  $('surpriseBtn')?.addEventListener('click',()=>{state=createCharacter(state,{name:'Nova'});render()});
  $('compileBtn').onclick=compile;$('generateBtn').onclick=compile;$('inspectBtn').onclick=inspect;
  $('seedInput').value=state.generationOptions?.seed||'promptforge-1';
  $('seedInput').onchange=event=>mutate(current=>({...current,generationOptions:{...current.generationOptions,seed:event.target.value||'promptforge-1'}}));
  $('interestBtn').onclick=()=>mutate(current=>({...current,interestState:{...current.interestState,characterInterests:current.interestState.characterInterests.length?[]:['programming','photography']}}));
  $('sceneBtn').onclick=()=>{renderSceneDrawer();setDrawer('scene',true)};
  document.querySelectorAll('[data-take]').forEach(button=>button.onclick=()=>{state=promoteTake(state,button.dataset.take);render()});
}

function inspectorPayload(resolved){
  return {resolver:resolved.resolver,normalizedMix:resolved.styleMix.normalizedInfluences,resolved:resolved.resolved,provenance:Object.fromEntries(Object.entries(resolved.provenance.categories).map(([category,data])=>[category,{selection:data.selection,candidates:data.candidates.map(candidate=>({id:candidate.id,score:candidate.score,support:candidate.support,seedFactor:candidate.seedFactor,contributors:candidate.contributions.map(item=>item.packName),adjustments:candidate.adjustments}))}]))};
}
function inspect(){if(!state.character){toast('Create a Character Core before resolving');return}try{const resolved=resolveStudioState(state);const output=JSON.stringify(inspectorPayload(resolved),null,2);$('inspectorOutput').textContent=output;$('drawerInspectorOutput').textContent=output;setDrawer('inspector',true)}catch(error){toast(error.message)}}
function compile(){if(!state.character){toast('Create a Character Core before compiling');return}try{toast('Compiling direction…');state=compilePrompt(state,MockCompiler);const consolePanel=$('console');consolePanel.classList.remove('hidden');consolePanel.innerHTML='✓ Character Core preserved<br/>✓ Style Mix normalized and resolved<br/>✓ Context compatibility scored<br/>✓ Locks and overrides applied<br/><br/>✨ Resolver output forwarded to MockCompiler<br/>✓ Master Director Prompt ready';render();inspect();toast('Master Director Prompt ready')}catch(error){toast(error.message)}}
function take(){try{state=createTake(state);render();toast('Immutable Take created')}catch(error){toast(error.message)}}
render();

