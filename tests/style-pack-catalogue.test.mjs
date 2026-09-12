import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_PACK_LIST,STYLE_DOMAINS,validateStylePackCatalogue} from '../style-packs.js';

const domainsOf=id=>STYLE_PACK_LIST.flatMap(pack=>Object.entries(pack.atoms).filter(([,atoms])=>atoms.some(atom=>atom.id===id)).map(([domain])=>domain));
test('catalogue keeps representative concepts in semantic domains',()=>{
  assert.equal(domainsOf('oversized-hoodie').every(domain=>domain==='wardrobe'),true);
  assert.equal(domainsOf('annotated-paperback').every(domain=>domain==='props'),true);
  assert.equal(domainsOf('layered-silver').every(domain=>['accessories','jewellery','motifs'].includes(domain)),true);
  assert.ok(domainsOf('street-documentary').every(domain=>domain==='visual'));
  assert.ok(domainsOf('library-interior').every(domain=>domain==='locations'));
  assert.ok(domainsOf('walking-city').every(domain=>domain==='activities'));
});
test('catalogue coverage is serializable and reports sparse domains',()=>{
  const report=validateStylePackCatalogue();
  assert.equal(report.packCount,15); assert.deepEqual(Object.keys(report.domainCounts),Object.keys(STYLE_DOMAINS));
  assert.ok(report.entryCount>0); assert.ok(report.sharedConceptCount>0); assert.doesNotThrow(()=>JSON.stringify(report));
  assert.ok(Object.values(report.domainCounts).some(count=>count<15));
});
