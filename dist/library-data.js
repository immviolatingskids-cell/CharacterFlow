import {STYLE_PACK_LIST} from './style-packs.js';

export const LIBRARY_SCHEMA_VERSION=1;
export const LIBRARY_SOURCES=Object.freeze(['core','user','imported','generated']);

const item=(id,label,source='core',extra={})=>Object.freeze({id,label,source,...extra});
const starterFamily=(id,label,description,entries=[],subcategories=[],tags=[])=>Object.freeze({id,label,description,entries:entries.map(([entryId,entryLabel])=>item(entryId,entryLabel)),subcategories:subcategories.map(([subId,subLabel])=>({id:subId,label:subLabel,entryCount:entries.filter(entry=>entry[0].startsWith(`${subId}-`)).length})),tags,fixture:true});
const countFamily=family=>family.entries?.length||family.entryCount||0;
export const coverageFor=count=>count===0?'poor':count<4?'low':count<12?'good':'healthy';

const STARTER=Object.freeze({
  interests:[
    starterFamily('creative-arts','Creative Arts','Making, collecting and experiencing creative work.',[['photography','Photography'],['illustration','Illustration'],['ceramics','Ceramics']],[['visual','Visual arts'],['making','Making']],['creative','expression']),
    starterFamily('technology','Technology','Tools, systems and emerging digital culture.',[['programming','Programming'],['ai-tools','AI tools'],['hardware','Hardware']],[['software','Software'],['devices','Devices']],['technology','making']),
    starterFamily('gaming','Gaming','Interactive entertainment, play cultures and game-making.',[['video-cozy-games','Cozy games'],['video-speedrunning','Speedrunning'],['development-indie-games','Indie games']],[['video','Video games'],['retro','Retro gaming'],['tabletop','Tabletop & board games'],['esports','Esports'],['development','Game development'],['modding','Game modding'],['simulation','Simulation games']],['entertainment','social','creative']),
    starterFamily('sport-fitness','Sport & Fitness','Training, movement and competitive activity.',[['strength-training','Strength training'],['running','Running']],[['training','Training'],['competition','Competition']],['movement']),
    starterFamily('outdoors','Outdoors','Nature, trails and open-air exploration.',[['hiking','Hiking'],['camping','Camping']],[['trails','Trails'],['water','Water']],['nature']),
    starterFamily('music','Music','Listening, performance and music culture.',[['live-music','Live music'],['songwriting','Songwriting']],[['listening','Listening'],['making','Making']],['culture']),
    starterFamily('reading-literature','Reading & Literature','Books, genres and literary culture.',[['fiction','Fiction'],['poetry','Poetry']],[['genres','Genres'],['practice','Reading practice']],['culture']),
    starterFamily('film-tv','Film & TV','Screen stories, genres and production.',[['documentary','Documentary'],['animation','Animation']],[['genres','Genres'],['production','Production']],['media']),
    starterFamily('food-drink','Food & Drink','Cooking, cuisine and food culture.',[['baking','Baking'],['coffee','Coffee']],[['making','Making'],['culture','Culture']],['lifestyle']),
    starterFamily('travel','Travel','Places, cultures and ways of exploring.',[['city-breaks','City breaks'],['rail-travel','Rail travel']],[['pace','Travel style'],['places','Places']],['world'])
  ],
  hobbies:[starterFamily('hands-on','Hands-on','Practical and expressive activities.',[['gardening','Gardening'],['woodworking','Woodworking'],['journaling','Journaling']],[['making','Making'],['reflective','Reflective']])],
  education:[starterFamily('learning-paths','Learning Paths','Reusable education and training concepts.',[['university','University'],['apprenticeship','Apprenticeship'],['self-taught','Self-taught']],[['formal','Formal'],['independent','Independent']])],
  skills:[starterFamily('creative-technical','Creative & Technical','Capabilities that can shape a character role.',[['writing','Writing'],['coding','Coding'],['photography-skill','Photography']],[['creative','Creative'],['technical','Technical']])],
  lifestyle:[starterFamily('daily-rhythm','Daily Rhythm','Habits and patterns that shape everyday life.',[['early-riser','Early riser'],['night-owl','Night owl'],['remote-work','Remote work']],[['routine','Routine'],['work','Work']])],
  social:[starterFamily('social-patterns','Social Patterns','Ways characters connect and participate.',[['close-circle','Close circle'],['community-led','Community-led'],['independent','Independent']],[['circle','Circle'],['community','Community']])],
  media:[starterFamily('media-tastes','Media Tastes','Reusable taste signals across media.',[['podcasts','Podcasts'],['independent-cinema','Independent cinema'],['magazines','Magazines']],[['audio','Audio'],['screen','Screen'],['print','Print']])]
});

function styleFamilies(stylePacks){return stylePacks.map(pack=>{const entries=Object.values(pack.atoms).flat().map(atom=>item(atom.id,atom.value,'core',{tags:atom.tags||[]}));const subcategories=Object.entries(pack.atoms).filter(([,atoms])=>atoms.length).map(([id,atoms])=>({id,label:id.replace(/(^|\s|-)(\w)/g,(_,space,char)=>`${space?' ':''}${char.toUpperCase()}`).trim(),entryCount:atoms.length}));return {id:pack.id,label:pack.name,description:pack.description,entries,subcategories,tags:Object.entries(pack.influence).filter(([,level])=>level==='strong').map(([domain])=>domain),fixture:false};});}
function sceneFamilies(scenes){return [{id:'scene-settings',label:'Scene Settings',description:'The real settings currently available in PromptForge.',entries:scenes.map(scene=>item(scene.id,scene.name,'core',{description:scene.location,tags:[scene.activity,scene.ambience]})),subcategories:[...new Set(scenes.map(scene=>scene.ambience))].map(ambience=>({id:ambience,label:`${ambience[0].toUpperCase()}${ambience.slice(1)} ambience`,entryCount:scenes.filter(scene=>scene.ambience===ambience).length})),tags:['world','scene'],fixture:false}];}
function category(id,label,description,icon,families,layer='starter'){const entryCount=families.reduce((sum,family)=>sum+countFamily(family),0);return {id,label,description,icon,families,entryCount,familyCount:families.length,coverage:coverageFor(entryCount),layer};}

export function createLibraryRegistry({stylePacks=STYLE_PACK_LIST,scenes=[],state=null}={}){
  const character=state?.character;
  const nameEntries=['Nova','Maya','Ari','Sora'].map(value=>item(value.toLowerCase(),value,'core',{note:'Current Surprise Me seed'}));
  if(character?.name&&!nameEntries.some(entry=>entry.label.toLowerCase()===character.name.toLowerCase()))nameEntries.push(item(`user-${character.id}`,character.name,'user',{note:'Active Character Core'}));
  const occupationLabels=['Creative technologist','Editorial photographer','Architect','Indie designer'];
  if(character?.identity?.occupation&&!occupationLabels.includes(character.identity.occupation))occupationLabels.push(character.identity.occupation);
  const userInterests=(state?.interestState?.characterInterests||[]).map((value,index)=>item(`user-interest-${index}`,value,'user'));
  const categories=[
    category('overview','Overview','Library layers, coverage and content provenance.','◫',[{id:'core-layer',label:'Core Library',description:'Bundled content that application updates can improve safely.',entries:[],subcategories:[],tags:['core'],fixture:false},{id:'user-layer',label:'User Library',description:'Character-created and user-authored content stays distinct.',entries:userInterests,subcategories:[],tags:['user'],fixture:false},{id:'expansion-layer',label:'Expansion Layer',description:'Imported and generated candidates will enter a review-first layer.',entries:[],subcategories:[],tags:['imported','generated'],fixture:false}],'mixed'),
    category('names','Names','Reusable identity seeds for Character Core.','Aa',[{id:'generator-seeds',label:'Generator Seeds',description:'Names currently used by Surprise Me.',entries:nameEntries,subcategories:[],tags:['identity'],fixture:false}],'core'),
    category('geography','Geography','World and scene-location foundations.','⌖',sceneFamilies(scenes),'core'),
    category('occupations','Occupations','Roles and professional identities.','▣',[{id:'generator-roles',label:'Generator Roles',description:'Occupations currently used by Surprise Me.',entries:occupationLabels.map((value,index)=>item(`role-${index}`,value,character?.identity?.occupation===value&&!['Creative technologist','Editorial photographer','Architect','Indie designer'].includes(value)?'user':'core')),subcategories:[],tags:['identity'],fixture:false}],'core'),
    category('education','Education','Learning, qualifications and formative paths.','◇',STARTER.education),
    category('interests','Interests','Topics and pursuits that shape personality and context.','♡',[...(userInterests.length?[{id:'active-character',label:'Active Character',description:'Interests saved on the current Character Core.',entries:userInterests,subcategories:[],tags:['user'],fixture:false}]:[]),...STARTER.interests],'mixed'),
    category('hobbies','Hobbies','Repeat activities and personal practices.','♧',STARTER.hobbies),
    category('skills','Skills','Capabilities, craft and expertise.','✦',STARTER.skills),
    category('lifestyle','Lifestyle','Daily rhythms, preferences and patterns.','◯',STARTER.lifestyle),
    category('social-life','Social Life','Relationships, communities and social patterns.','♙',STARTER.social),
    category('media-tastes','Media & Tastes','Media habits and taste signals.','▤',STARTER.media),
    category('style-aesthetics','Style & Aesthetics','The live Style Pack catalogue and its resolver concepts.','✧',styleFamilies(stylePacks),'core')
  ];
  return Object.freeze(categories.map(entry=>Object.freeze(entry)));
}

const searchable=value=>String(value||'').toLowerCase();
export function searchLibrary(registry,query='',filter='all'){
  const term=searchable(query.trim());
  return registry.filter(category=>filter==='all'||category.id===filter).map(category=>{const categoryHit=!term||searchable([category.label,category.description].join(' ')).includes(term);const families=category.families.filter(family=>categoryHit||searchable([family.label,family.description,...(family.tags||[]),...(family.subcategories||[]).map(row=>row.label),...(family.entries||[]).flatMap(entry=>[entry.label,entry.description,...(entry.tags||[])])].join(' ')).includes(term));return {...category,families};}).filter(category=>category.families.length||(!term&&category.familyCount===0));
}

export function validateLibraryRegistry(registry){const ids=new Set();for(const category of registry){if(ids.has(category.id))throw new Error(`Duplicate library category: ${category.id}`);ids.add(category.id);if(!category.label||!Array.isArray(category.families))throw new Error(`Invalid library category: ${category.id}`);for(const family of category.families){if(!family.id||!family.label||!Array.isArray(family.entries))throw new Error(`Invalid library family in ${category.id}`);for(const entry of family.entries)if(!LIBRARY_SOURCES.includes(entry.source))throw new Error(`Invalid library source: ${entry.source}`)}}return {categoryCount:registry.length,entryCount:registry.reduce((sum,category)=>sum+category.entryCount,0)};}
