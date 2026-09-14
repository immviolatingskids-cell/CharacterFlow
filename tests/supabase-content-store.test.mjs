import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STYLE_PACKS} from '../style-packs.js';
import {createSupabaseContentStore, transformContentRows, validateContentImport, previewApprovedManifest} from '../supabase-content-store.js';

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
