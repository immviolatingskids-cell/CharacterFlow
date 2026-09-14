export const OCCUPATION_SCHEMA_VERSION = 1;
export const OCCUPATION_RELATIONSHIP_TYPES = Object.freeze(['likely', 'adjacent', 'wildcard']);
export const OCCUPATION_SOURCES = Object.freeze(['core', 'generated', 'user', 'imported']);

const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const occupation = (id, label, description, domains, aliases = []) => Object.freeze({ id, label, description, aliases, domains, provenance: 'core', reviewStatus: 'approved' });
const labels = [
  ['software-engineer','Software Engineer','Builds and maintains software products and systems.',['technology','product','creative-technical'],['developer','programmer','software developer']],
  ['product-designer','Product Designer','Shapes useful digital products through research and visual systems.',['design','technology','product'],['ux designer','ui designer']],
  ['creative-technologist','Creative Technologist','Combines code, design and emerging tools to make expressive work.',['technology','creative','product'],['creative coder']],
  ['data-scientist','Data Scientist','Uses data, models and experimentation to understand complex questions.',['technology','science','analytical'],[]],
  ['cybersecurity-analyst','Cybersecurity Analyst','Protects systems, people and information from digital threats.',['technology','security','analytical'],[]],
  ['editorial-stylist','Editorial Stylist','Develops clothing and visual direction for editorial stories.',['fashion','creative','media'],['fashion stylist']],
  ['fashion-designer','Fashion Designer','Creates clothing concepts, collections and material language.',['fashion','creative','design'],[]],
  ['documentary-photographer','Documentary Photographer','Makes photographs that observe people, places and lived experience.',['photography','media','culture'],[]],
  ['film-director','Film Director','Leads the creative vision and production of screen stories.',['film','media','creative'],[]],
  ['graphic-designer','Graphic Designer','Communicates ideas through typography, image and visual systems.',['design','creative','media'],[]],
  ['architect','Architect','Designs buildings and spatial experiences for people and place.',['architecture','design','culture'],[]],
  ['urban-planner','Urban Planner','Helps shape equitable, functional and resilient cities.',['architecture','civic','analytical'],[]],
  ['museum-archivist','Museum Archivist','Preserves, organizes and interprets cultural records and objects.',['culture','history','curatorial'],['archivist']],
  ['librarian','Librarian','Connects people with knowledge, stories and welcoming public resources.',['literature','culture','community'],[]],
  ['writer','Writer','Develops ideas, stories and language for readers or audiences.',['literature','creative','media'],['author']],
  ['journalist','Journalist','Researches and communicates verified stories about the world.',['media','culture','civic'],['reporter']],
  ['teacher','Teacher','Supports learning, curiosity and growth through guided practice.',['education','community','culture'],['educator']],
  ['research-scientist','Research Scientist','Investigates questions using evidence, experiments and careful analysis.',['science','analytical','education'],[]],
  ['marine-biologist','Marine Biologist','Studies life and ecosystems in oceans and coastal environments.',['science','nature','fieldwork'],[]],
  ['ecologist','Ecologist','Studies relationships among living systems and their environments.',['science','nature','fieldwork'],[]],
  ['botanist','Botanist','Studies plants, their environments and their varied forms.',['science','nature','fieldwork'],[]],
  ['florist','Florist','Designs arrangements and experiences with flowers and living materials.',['nature','creative','retail'],[]],
  ['landscape-designer','Landscape Designer','Designs planted outdoor spaces that connect people and ecology.',['nature','design','architecture'],[]],
  ['chef','Chef','Creates and leads food experiences through craft and hospitality.',['food','creative','hospitality'],[]],
  ['coffee-roaster','Coffee Roaster','Develops flavour and craft through sourcing and roasting coffee.',['food','craft','hospitality'],[]],
  ['interior-designer','Interior Designer','Shapes the atmosphere, function and material language of interiors.',['design','architecture','creative'],[]],
  ['ceramic-artist','Ceramic Artist','Makes functional or sculptural work from clay and fired materials.',['craft','creative','art'],[]],
  ['musician','Musician','Performs, composes or produces music for audiences and collaborators.',['music','creative','media'],[]],
  ['sound-designer','Sound Designer','Creates sonic environments for film, games, spaces or experiences.',['music','technology','media'],[]],
  ['performer','Performer','Uses presence, movement or voice to create a live experience.',['performance','creative','community'],[]],
  ['fitness-coach','Fitness Coach','Guides people through movement, training and sustainable wellbeing.',['fitness','community','health'],[]],
  ['journalist-researcher','Investigative Researcher','Builds rigorous public-interest stories from complex evidence.',['media','civic','analytical'],[]],
  ['social-worker','Social Worker','Supports people and communities through practical, relational care.',['community','health','civic'],[]],
  ['teacher-librarian','Teacher Librarian','Combines teaching with stewardship of shared knowledge resources.',['education','literature','community'],[]],
  ['game-designer','Game Designer','Designs systems, play and narrative experiences for interactive media.',['gaming','technology','creative'],[]],
  ['animator','Animator','Brings characters, objects and ideas to life through motion.',['film','creative','technology'],[]],
  ['book-editor','Book Editor','Helps authors refine manuscripts, structure and voice for publication.',['literature','media','creative'],[]],
  ['translator','Translator','Carries meaning, tone and culture between languages.',['literature','culture','communication'],[]],
  ['archaeologist','Archaeologist','Studies past societies through material evidence and fieldwork.',['history','culture','fieldwork'],[]],
  ['curator','Curator','Builds meaningful collections, exhibitions and interpretive experiences.',['culture','art','curatorial'],[]],
  ['event-producer','Event Producer','Coordinates creative, cultural or community experiences.',['community','media','hospitality'],[]],
  ['travel-writer','Travel Writer','Observes and communicates the character of places and journeys.',['literature','travel','culture'],[]],
  ['night-auditor','Night Auditor','Maintains the overnight operations and records of a hospitality setting.',['hospitality','operations','service'],[]],
  ['paramedic','Paramedic','Provides urgent medical care in dynamic real-world settings.',['health','service','fieldwork'],[]],
  ['electrician','Electrician','Installs, maintains and troubleshoots electrical systems.',['craft','technology','service'],[]],
  ['mechanic','Mechanic','Diagnoses and repairs machines and vehicles through practical expertise.',['craft','technology','service'],[]],
  ['marine-conservationist','Marine Conservationist','Protects ocean habitats through research, policy and field action.',['nature','science','civic'],[]],
  ['bookshop-owner','Bookshop Owner','Builds a welcoming local culture around books and conversation.',['literature','retail','community'],[]],
  ['sound-engineer','Sound Engineer','Records, mixes and maintains the technical side of audio work.',['music','technology','media'],[]],
  ['research-librarian','Research Librarian','Helps people navigate specialist information and source material.',['literature','analytical','culture'],[]]
];
export const OCCUPATIONS = Object.freeze(Object.fromEntries(labels.map(row => [row[0], occupation(...row)])));
export const OCCUPATION_LIST = Object.freeze(Object.values(OCCUPATIONS));

const relation = (stylePackId, occupationId, relationshipType, weight, rationale) => Object.freeze({ stylePackId, occupationId, relationshipType, weight, rationale, provenance: 'curated', reviewStatus: 'approved' });
const R = (pack, likely, adjacent, wildcard) => [...likely.map(([id,w,r]) => relation(pack,id,'likely',w,r)), ...adjacent.map(([id,w,r]) => relation(pack,id,'adjacent',w,r)), ...wildcard.map(([id,w,r]) => relation(pack,id,'wildcard',w,r))];
const why = type => `${type[0].toUpperCase()+type.slice(1)} relationship curated from the Style Pack's visual, cultural and contextual direction.`;
const packSeeds = { 'tech-girlie':[['software-engineer','.9'],['product-designer','.86'],['creative-technologist','.82']], 'gym-girlie':[['fitness-coach','.9'],['paramedic','.62'],['event-producer','.58']], 'booktok':[['writer','.9'],['book-editor','.84'],['librarian','.78']], 'y2k':[['graphic-designer','.82'],['animator','.76'],['game-designer','.7']], 'streetwear':[['graphic-designer','.82'],['documentary-photographer','.76'],['event-producer','.7']], 'clean-girl':[['interior-designer','.82'],['landscape-designer','.76'],['coffee-roaster','.7']], 'coquette':[['florist','.88'],['fashion-designer','.8'],['bookshop-owner','.68']], 'dark-academia':[['research-scientist','.86'],['museum-archivist','.84'],['archaeologist','.78']], 'goth':[['musician','.84'],['graphic-designer','.76'],['sound-designer','.7']], 'emo':[['musician','.86'],['writer','.78'],['documentary-photographer','.72']], 'grunge':[['documentary-photographer','.82'],['ceramic-artist','.76'],['mechanic','.64']], 'preppy':[['teacher','.82'],['architect','.74'],['event-producer','.68']], 'old-money':[['architect','.82'],['curator','.78'],['landscape-designer','.72']], 'boho':[['ceramic-artist','.84'],['florist','.8'],['travel-writer','.72']], 'gorpcore':[['ecologist','.88'],['marine-biologist','.8'],['landscape-designer','.72']] };
export const OCCUPATION_RELATIONSHIPS = Object.freeze(Object.fromEntries(Object.entries(packSeeds).map(([pack, ids]) => [pack, R(pack, ids.map(([id,w])=>[id,Number(w),why('likely')]), [['curator','.62',why('adjacent')],['product-designer','.58',why('adjacent')]], [['florist','.54',why('wildcard')],['night-auditor','.5',why('wildcard')]])])));
export const OCCUPATION_RELATIONSHIP_LIST = Object.freeze(Object.values(OCCUPATION_RELATIONSHIPS).flat());
export function normalizeOccupation(value, registry=OCCUPATIONS) { const term=slug(value); return Object.values(registry).find(item=>item.id===term||item.label.toLowerCase()===String(value||'').trim().toLowerCase()||item.aliases.some(alias=>alias.toLowerCase()===String(value||'').trim().toLowerCase()))||null; }
export function relationshipsForStylePack(stylePackId, registry=OCCUPATION_RELATIONSHIPS) { return (registry[stylePackId]||[]).filter(item=>item.reviewStatus==='approved'); }
export function suggestOccupations({stylePackId, existing=[], seed='promptforge-default', limit=6, relationships=OCCUPATION_RELATIONSHIPS, occupations=OCCUPATIONS}={}) { const excluded=new Set((existing||[]).map(value=>String(value).trim().toLowerCase())); const rank={likely:3,adjacent:2,wildcard:1}; const hash=value=>{let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}; return relationshipsForStylePack(stylePackId,relationships).filter(item=>occupations[item.occupationId]&&!excluded.has(occupations[item.occupationId].label.toLowerCase())).map(item=>({...occupations[item.occupationId],relationshipType:item.relationshipType,weight:item.weight,rationale:item.rationale,score:item.weight*rank[item.relationshipType]+(hash(`${seed}|${item.occupationId}`)%100)/10000})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit); }
export function occupationCoverageDiagnostics(occupations=OCCUPATION_LIST, relationships=OCCUPATION_RELATIONSHIP_LIST) { const byPack=new Map(), related=new Set(); for(const item of relationships){related.add(item.occupationId);const row=byPack.get(item.stylePackId)||new Set();row.add(item.relationshipType);byPack.set(item.stylePackId,row)} return {occupationCount:occupations.length,relationshipCount:relationships.length,occupationsWithoutRelationships:occupations.filter(item=>!related.has(item.id)).map(item=>item.id),stylePacksMissingCategories:[...byPack].filter(([,types])=>OCCUPATION_RELATIONSHIP_TYPES.some(type=>!types.has(type))).map(([id])=>id),pendingCandidates:occupations.filter(item=>item.reviewStatus==='pending').length}; }
export function validateOccupationRegistry(occupations=OCCUPATION_LIST, relationships=OCCUPATION_RELATIONSHIP_LIST) { const ids=new Set(),labelsSet=new Set(); for(const item of occupations){if(ids.has(item.id)||labelsSet.has(item.label.toLowerCase())||!OCCUPATION_SOURCES.includes(item.provenance)||item.reviewStatus!=='approved')throw new Error(`Invalid occupation: ${item.id}`);ids.add(item.id);labelsSet.add(item.label.toLowerCase())} for(const item of relationships)if(!ids.has(item.occupationId)||!OCCUPATION_RELATIONSHIP_TYPES.includes(item.relationshipType)||item.weight<0||item.weight>1||!item.rationale||item.provenance!=='curated')throw new Error(`Invalid occupation relationship: ${item.occupationId}`); return occupationCoverageDiagnostics(occupations,relationships); }
validateOccupationRegistry();

