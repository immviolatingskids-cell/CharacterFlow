import { STYLE_PACKS } from './style-packs.js';
import { normalizeStyleMix } from './resolver-v1.js';
import { normalizeCreativeConcept } from './creative-relationships.js';

export const TAKE_SEMANTIC_SCHEMA_VERSION = 1;
export const TAKE_SEMANTIC_DOMAINS = Object.freeze(['style','setting','activity','wardrobe','camera','lighting','mood']);

const labelFor=value=>String(value ?? '').trim();
const entry=(value, extra={})=>{const label=labelFor(value);const id=normalizeCreativeConcept(label);return id ? {id,label,...extra} : null;};
const unique=values=>{const seen=new Set();return values.filter(value=>value?.id&&!seen.has(value.id)&&(seen.add(value.id),true));};
const values=value=>Array.isArray(value)?value:[value];
const add=(target,value,extra)=>{for(const item of values(value)){const next=entry(item,extra);if(next)target.push(next);}};

function snapshotFor(takeOrSnapshot){return takeOrSnapshot?.stateSnapshot||takeOrSnapshot?.snapshot||takeOrSnapshot||{};}
function tagsFor(semantic){return unique(TAKE_SEMANTIC_DOMAINS.flatMap(domain=>semantic[domain]).map(item=>({id:item.id,label:item.id}))).slice(0,16).map(item=>item.id);}

export function projectTakeSemantics(takeOrSnapshot){
  const snapshot=snapshotFor(takeOrSnapshot), semantic={schemaVersion:TAKE_SEMANTIC_SCHEMA_VERSION,style:[],setting:[],activity:[],wardrobe:[],camera:[],lighting:[],mood:[],tags:[]};
  for(const influence of normalizeStyleMix(snapshot.styleMix?.influences,STYLE_PACKS)){
    const pack=STYLE_PACKS[influence.packId];
    if(pack)semantic.style.push({id:pack.id,label:pack.name,weight:influence.weight,normalizedWeight:influence.normalizedWeight});
  }
  const scene=snapshot.scene||{};
  add(semantic.setting,scene.id?scene.name||scene.id:null,scene.id?{sceneId:scene.id}:{});
  add(semantic.setting,scene.location);
  add(semantic.activity,scene.activity);
  const wardrobe=snapshot.wardrobe||{};
  add(semantic.wardrobe,wardrobe.items);
  for(const [slot,value] of Object.entries(wardrobe.slots||{}))add(semantic.wardrobe,value,{slot});
  const photo=snapshot.visualSettings?.photography||{};
  add(semantic.camera,photo.shotType,{kind:'shotType'});add(semantic.camera,photo.lens,{kind:'lens'});add(semantic.camera,photo.angle,{kind:'angle'});
  const lighting=snapshot.visualSettings?.lighting||{};
  add(semantic.lighting,lighting.behaviour,{kind:'behaviour'});add(semantic.lighting,lighting.colourTreatment,{kind:'colourTreatment'});
  const expression=snapshot.visualSettings?.expression||{};
  add(semantic.mood,expression.expression,{kind:'expression'});add(semantic.mood,scene.mood,{kind:'sceneMood'});
  for(const domain of TAKE_SEMANTIC_DOMAINS)semantic[domain]=unique(semantic[domain]);
  semantic.tags=tagsFor(semantic);
  return semantic;
}

export function withTakeSemantics(take){if(take?.semantic?.schemaVersion===TAKE_SEMANTIC_SCHEMA_VERSION)return take;return {...take,semantic:projectTakeSemantics(take)};}
export function migrateTakeSemantics(takes=[]){return takes.map(withTakeSemantics);}
const queryIds=value=>new Set(values(value).map(normalizeCreativeConcept).filter(Boolean));
export function scoreTakeSemanticMatch(take,query={}){const semantic=take?.semantic?.schemaVersion===TAKE_SEMANTIC_SCHEMA_VERSION?take.semantic:projectTakeSemantics(take);let matched=0,requested=0;for(const domain of TAKE_SEMANTIC_DOMAINS){if(query[domain]===undefined)continue;const wanted=queryIds(query[domain]);requested+=wanted.size;const present=new Set((semantic[domain]||[]).map(item=>item.id));for(const id of wanted)if(present.has(id))matched++;}return {matched,requested,score:requested?matched/requested:0};}
export function findTakesBySemantic(takes=[],query={}){return takes.filter(take=>{const result=scoreTakeSemanticMatch(take,query);return result.requested>0&&result.matched===result.requested;});}
export function compareTakeSemantics(a,b){const left=a?.semantic?.schemaVersion===TAKE_SEMANTIC_SCHEMA_VERSION?a.semantic:projectTakeSemantics(a),right=b?.semantic?.schemaVersion===TAKE_SEMANTIC_SCHEMA_VERSION?b.semantic:projectTakeSemantics(b);const leftTags=new Set(left.tags),rightTags=new Set(right.tags),overlap=[...leftTags].filter(tag=>rightTags.has(tag)).length,total=new Set([...leftTags,...rightTags]).size;return {overlap,total,score:total?overlap/total:0};}
export function takeSemanticsToConcepts(take){const semantic=take?.semantic?.schemaVersion===TAKE_SEMANTIC_SCHEMA_VERSION?take.semantic:projectTakeSemantics(take);return TAKE_SEMANTIC_DOMAINS.flatMap(domain=>(semantic[domain]||[]).map(item=>({domain,id:item.id,label:item.label,source:'take-semantic-v1'})));}
