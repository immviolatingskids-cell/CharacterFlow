import test from 'node:test';
import assert from 'node:assert/strict';
import {OCCUPATION_LIST, OCCUPATION_RELATIONSHIP_TYPES, suggestOccupations, occupationCoverageDiagnostics, validateOccupationRegistry, normalizeOccupation} from '../occupations.js';

test('occupation registry is normalized, curated, and covered', () => {
  const diagnostics = validateOccupationRegistry();
  assert.ok(OCCUPATION_LIST.length >= 40);
  assert.equal(diagnostics.stylePacksMissingCategories.length, 0);
  assert.deepEqual(OCCUPATION_RELATIONSHIP_TYPES, ['likely', 'adjacent', 'wildcard']);
});

test('occupation suggestions are deterministic, diverse, and exclude explicit core values', () => {
  const first = suggestOccupations({stylePackId: 'tech-girlie', existing: ['software engineer'], seed: 'same'});
  assert.deepEqual(first, suggestOccupations({stylePackId: 'tech-girlie', existing: ['software engineer'], seed: 'same'}));
  assert.ok(first.every(item => item.label !== 'Software Engineer'));
  assert.deepEqual(new Set(first.map(item => item.relationshipType)), new Set(['likely', 'adjacent', 'wildcard']));
});

test('occupation normalization supports aliases without changing input', () => {
  const value = 'developer';
  assert.equal(normalizeOccupation(value).id, 'software-engineer');
  assert.equal(value, 'developer');
});

test('coverage reports pending candidates separately', () => {
  const pending = [...OCCUPATION_LIST, {...OCCUPATION_LIST[0], id: 'candidate', provenance: 'generated', reviewStatus: 'pending'}];
  assert.equal(occupationCoverageDiagnostics(pending).pendingCandidates, 1);
});
