import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryRegistry,searchLibrary,validateLibraryRegistry,coverageFor,LIBRARY_SCHEMA_VERSION} from '../library-data.js';

const scenes=[{id:'cafe',name:'Café',location:'warm indoor coffee shop',activity:'conversation',ambience:'warm'}];
const registry=createLibraryRegistry({scenes,state:{character:{id:'char-1',name:'Rin',identity:{occupation:'Sound designer'}},interestState:{characterInterests:['field recording']}}});

test('library registry is versioned, unique and provenance-safe',()=>{assert.equal(LIBRARY_SCHEMA_VERSION,1);assert.equal(validateLibraryRegistry(registry).categoryCount,12);assert.equal(new Set(registry.map(category=>category.id)).size,12);assert.ok(registry.flatMap(category=>category.families).flatMap(family=>family.entries).every(entry=>['core','user','imported','generated'].includes(entry.source)))});
test('real Character Core and scene data map without contaminating starter data',()=>{assert.ok(searchLibrary(registry,'Rin').some(category=>category.id==='names'));assert.ok(searchLibrary(registry,'Sound designer').some(category=>category.id==='occupations'));assert.ok(searchLibrary(registry,'Café').some(category=>category.id==='geography'));const gaming=registry.find(category=>category.id==='interests').families.find(family=>family.id==='gaming');assert.equal(gaming.fixture,true);assert.equal(gaming.entries.length,3)});
test('search spans categories, families, subcategories and entries with category filtering',()=>{assert.ok(searchLibrary(registry,'Game development').some(category=>category.id==='interests'));assert.ok(searchLibrary(registry,'field recording').some(category=>category.id==='interests'));assert.deepEqual(searchLibrary(registry,'editorial','style-aesthetics').map(category=>category.id),['style-aesthetics']);assert.equal(searchLibrary(registry,'no-such-content').length,0)});
test('coverage has stable thin-to-healthy thresholds',()=>{assert.deepEqual([coverageFor(0),coverageFor(2),coverageFor(8),coverageFor(20)],['poor','low','good','healthy'])});
