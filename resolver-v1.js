import {STYLE_PACKS} from './style-packs.js';

export const RESOLVER_CATEGORIES = Object.freeze(['wardrobe','styling','props','environment','activities','mood','photography']);
const clone = value => structuredClone(value);
const round = value => Math.round(value * 100000) / 100000;
const words = value => String(value ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function normalizeStyleMix(influences = [], registry = STYLE_PACKS) {
  const merged = new Map();
  for (const item of influences || []) {
    const weight = Number(item.weight);
    if (registry[item.packId] && Number.isFinite(weight) && weight > 0) merged.set(item.packId,(merged.get(item.packId) || 0) + weight);
  }
  const valid = [...merged].map(([packId,weight]) => ({packId,weight}));
  const total = valid.reduce((sum,item) => sum + item.weight, 0);
  return total > 0 && Number.isFinite(total) ? valid.map(item => ({...item,normalizedWeight:item.weight / total})) : [];
}

export function seedHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash,16777619); }
  return hash >>> 0;
}

function seededUnit(seed, category, atomId) {
  let value = seedHash(`${seed}|${category}|${atomId}`) + 0x6D2B79F5;
  value = Math.imul(value ^ value >>> 15,value | 1);
  value ^= value + Math.imul(value ^ value >>> 7,value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function contextTokens(state) {
  const scene = state.scene || {};
  return new Set([...words(scene.id),...words(scene.name),...words(scene.location),...words(scene.activity),...(scene.tags || []).flatMap(words),...(state.interestState?.activeContext || []).flatMap(words),...words(state.visualSettings?.lighting?.behaviour),...words(state.visualSettings?.lighting?.colourTreatment)]);
}

function adjustmentFor(atom,tokens) {
  const adjustments=[]; let multiplier=1;
  for (const rule of atom.compatibility || []) { const matched=(rule.tokens || []).filter(token=>tokens.has(token)); if(matched.length){multiplier*=rule.multiplier;adjustments.push({reason:rule.reason,matchedTokens:matched,multiplier:rule.multiplier});} }
  const uncappedMultiplier=multiplier;
  multiplier=Math.min(1.25,Math.max(.8,multiplier));
  if (multiplier !== uncappedMultiplier) adjustments.push({reason:'bounded contextual adjustment',matchedTokens:[],multiplier:round(multiplier),uncappedMultiplier:round(uncappedMultiplier)});
  return {multiplier:round(multiplier),adjustments};
}

function manualValue(state,category) {
  if(category==='wardrobe'&&state.wardrobe?.locked&&state.wardrobe.items?.length)return {value:clone(state.wardrobe.items),source:'wardrobe-lock'};
  const value=state.manualOverrides?.[category];
  if(value!==undefined&&value!==null&&value!=='')return {value:clone(value),source:'manual-override'};
  if(state.resolverLocks?.[category]){const previous=state.resolvedDirectorState?.resolved?.[category];if(previous!==undefined)return {value:clone(previous),source:'resolver-lock'};}
  if(category==='photography'&&state.visualSettings?.photography?.locked)return {value:clone(state.visualSettings.photography),source:'visual-settings-lock'};
  return null;
}

function candidatesFor(category,mix,state,registry,seed) {
  const tokens=contextTokens(state); const byId=new Map();
  for(const influence of mix){const pack=registry[influence.packId];for(const atom of pack.atoms[category]||[]){const adjustment=adjustmentFor(atom,tokens);const raw=influence.normalizedWeight*atom.weight;const adjusted=raw*adjustment.multiplier;const entry=byId.get(atom.id)||{id:atom.id,value:clone(atom.value),conflicts:[...(atom.conflicts||[])],support:0,adjustedSupport:0,contributions:[],adjustments:[]};entry.support+=raw;entry.adjustedSupport+=adjusted;entry.contributions.push({packId:pack.id,packName:pack.name,normalizedPackWeight:influence.normalizedWeight,atomWeight:atom.weight,rawSupport:round(raw),compatibilityMultiplier:adjustment.multiplier,adjustedSupport:round(adjusted)});entry.adjustments.push(...adjustment.adjustments.map(item=>({packId:pack.id,...item})));entry.conflicts=[...new Set([...entry.conflicts,...(atom.conflicts||[])])];byId.set(atom.id,entry);}}
  return [...byId.values()].map(candidate=>{const seedFactor=.95+seededUnit(seed,category,candidate.id)*.1;const score=candidate.adjustedSupport*seedFactor;return {...candidate,support:round(candidate.support),adjustedSupport:round(candidate.adjustedSupport),seedFactor:round(seedFactor),score:round(score)};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

export function resolveStyleState(state,seed='promptforge-default',registry=STYLE_PACKS) {
  if(!state.character)throw new Error('Character Core required before resolution');
  const characterBefore=JSON.stringify(state.character);const normalizedMix=normalizeStyleMix(state.styleMix?.influences,registry);const resolved={};const categories={};const selectedIds=new Set();
  const styleStrength=Math.min(1,Math.max(0,Number.isFinite(Number(state.styleMix?.strength))?Number(state.styleMix?.strength):1));
  for(const category of RESOLVER_CATEGORIES){const override=manualValue(state,category);const candidates=candidatesFor(category,normalizedMix,state,registry,seed);const topScore=candidates[0]?.score||0;const styleAuthority=round(styleStrength*Math.min(1,topScore));if(override){resolved[category]=override.value;categories[category]={styleAuthority:1,selection:{id:null,value:clone(override.value),score:null,authority:1,source:override.source},candidates};continue;}const selected=styleAuthority>0?candidates.find(candidate=>candidate.score>0&&!candidate.conflicts.some(id=>selectedIds.has(id)))||null:null;resolved[category]=selected?clone(selected.value):null;if(selected)selectedIds.add(selected.id);categories[category]={styleAuthority,selection:selected?{id:selected.id,value:clone(selected.value),score:selected.score,authority:styleAuthority,source:'style-mix'}:null,candidates};}
  if(JSON.stringify(state.character)!==characterBefore)throw new Error('Resolver attempted to mutate Character Core');
  return {resolver:{name:'PromptForge Resolver',version:'1.1',seed:String(seed),strategy:'bounded-context-independent-ranking-strength-authority'},character:clone(state.character),styleMix:{strength:styleStrength,normalizedInfluences:normalizedMix},context:{scene:clone(state.scene||null),activeContext:clone(state.interestState?.activeContext||[]),wardrobe:clone(state.wardrobe||null),visualSettings:clone(state.visualSettings||null)},resolved,provenance:{categories}};
}
