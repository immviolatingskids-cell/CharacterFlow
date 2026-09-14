import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STYLE_PACKS} from '../style-packs.js';
import {createSupabaseContentStore, transformContentRows, validateContentImport, previewApprovedManifest, normalizedImportRows, importApprovedManifest, CONTENT_DOMAINS} from '../supabase-content-store.js';

test('normalized content schema and seeds exist', () => {
  for (const file of ['backend/supabase-content-schema.sql','backend/seed/archetypes.sql','backend/seed/content-items.sql','backend/seed/archetype-influences.sql']) assert.equal(fs.existsSync(file), true, file);
  const seeds = fs.readFileSync('backend/seed/archetypes.sql', 'utf8');
  for (const id of Object.keys(STYLE_PACKS)) assert.match(seeds, new RegExp(`'${id}'`));
  for (const domain of ['wardrobe','occupations','props','locations','mood','visual']) assert.match(fs.readFileSync('backend/seed/content-items.sql','utf8'), new RegExp(`'${domain}'`));
});

test('content rows transform into resolver-compatible packs', () => {
  const catalogue = transformContentRows({
    archetypes: [{id:'a',slug:'tech-girlie',name:'Tech Girlie',description:'x'}],
    domains: [{id:'d',slug:'wardrobe'}], items: [{id:'i',domain_id:'d',slug:'blazer',label:'Blazer',metadata:{}}],
    influences: [{archetype_id:'a',content_item_id:'i',weight:.9,review_status:'approved'}]
  });
  assert.equal(catalogue['tech-girlie'].atoms.wardrobe[0].value, 'Blazer');
  assert.equal(catalogue['tech-girlie'].atoms.wardrobe[0].weight, .9);
});

test('all domains transform and review-gated rows stay excluded', () => {
  const domains=CONTENT_DOMAINS.map((slug,index)=>({id:`d${index}`,slug}));
  const items=domains.map((domain,index)=>({id:`i${index}`,domain_id:domain.id,slug:`item-${index}`,label:`Item ${index}`,metadata:{}}));
  items[0].review_status='pending';
  const catalogue=transformContentRows({archetypes:[{id:'a',slug:'a',name:'A'}],domains,items,influences:items.map((item,index)=>({archetype_id:'a',content_item_id:item.id,weight:.5,review_status:index===0?'pending':'approved'}))});
  assert.equal(Object.keys(catalogue.a.atoms).length, CONTENT_DOMAINS.length);
  assert.equal(catalogue.a.atoms.wardrobe.length,0);
  assert.equal(catalogue.a.atoms.accessories.length,1);
});

test('content import validates domains, weights, and duplicate items', () => {
  const result = validateContentImport({archetype:{slug:'tech girlie',name:'Tech Girlie'}, influences:[
    {domain:'wardrobe',item:'Blazer',weight:.9}, {domain:'wardrobe',item:'Blazer',weight:.9}, {domain:'nope',item:'x',weight:2}
  ]});
  assert.equal(result.valid, false); assert.ok(result.errors.some(error => error.includes('duplicate'))); assert.ok(result.errors.some(error => error.includes('unsupported')));
  const valid = validateContentImport({archetype:{slug:'tech girlie',name:'Tech Girlie'}, influences:[{domain:'props',item:'Laptop',weight:.9,reviewStatus:'approved'}]});
  assert.equal(valid.payload.archetype.slug, 'tech-girlie'); assert.equal(valid.payload.influences[0].reviewStatus, 'approved');
});

test('adapter falls back for signed-out, unavailable, and empty Supabase content', async () => {
  const local = {'local-pack': {id:'local-pack'}};
  assert.deepEqual(await createSupabaseContentStore({localCatalogue:local,signedIn:false}).loadCatalogue(), local);
  assert.deepEqual(await createSupabaseContentStore({localCatalogue:local,client:{from(){throw new Error('offline')}}}).loadCatalogue(), local);
  const empty = {data:[],error:null};
  assert.deepEqual(await createSupabaseContentStore({localCatalogue:local,client:{from(){return {select:async()=>empty}}}}).loadCatalogue(), local);
});

test('approved review manifest preview remains review-gated', () => {
  const rows = previewApprovedManifest({candidates:[{reviewStatus:'pending',label:'Nope'},{reviewStatus:'approved',stylePackId:'tech-girlie',label:'Software Engineer',weight:.95}]});
  assert.equal(rows.length, 1); assert.equal(rows[0].influences[0].reviewStatus, 'approved');
});

test('approved import preserves human name and provenance', () => {
  const rows=normalizedImportRows({candidates:[{reviewStatus:'approved',stylePackId:'tech-girlie',stylePackName:'Tech Girlie',label:'AI',source:'generated',weight:.8}]});
  assert.equal(rows[0].archetype.name,'Tech Girlie');
  assert.equal(rows[0].influences[0].provenance,'generated');
});

test('approved manifest imports normalized rows through Supabase upserts', async () => {
  const calls=[]; let sequence=0;
  const client={from(table){return {select(){return Promise.resolve({data:table==='content_domains'?[{id:'d',slug:'occupations'}]:[],error:null})},upsert(row){calls.push([table,row]);return {select(){return {single(){return Promise.resolve({data:{id:`${table}-${++sequence}`},error:null})}}},then(resolve){return resolve({data:null,error:null})}}}}}};
  const result=await importApprovedManifest(client,{candidates:[{reviewStatus:'approved',stylePackId:'tech-girlie',stylePackName:'Tech Girlie',label:'AI',domain:'occupations',source:'generated',weight:.8}]});
  assert.equal(result.influences.length,1); assert.equal(calls.length,3); assert.equal(calls[1][1].provenance,'generated');
});
