import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLICIT_CREATIVE_RELATIONSHIPS,
  buildCreativeRelationshipCatalogue,
  deriveStylePackRelationships,
  normalizeCategoryWeights,
  normalizeCreativeConcept,
  resolveCreativeDirection
} from '../creative-relationships.js';
import { STYLE_PACKS } from '../style-packs.js';
import { blankState } from '../studio-core.js';

const weights = { mood: 25, setting: 20, activity: 10, wardrobe: 15, camera: 15, style: 15 };
const resolve = (concepts, overrides = {}) => resolveCreativeDirection({ concepts, weights, seed: 'relationship-test', ...overrides });

test('semantic normalization resolves common formatting and wording variants', () => {
  assert.equal(normalizeCreativeConcept('Warm Lights'), 'warm-lighting');
  assert.equal(normalizeCreativeConcept('warm lighting'), 'warm-lighting');
  assert.equal(normalizeCreativeConcept('warm-lighting'), 'warm-lighting');
});

test('explicit relationships resolve broad concepts with scoring provenance', () => {
  const result = resolve(['cozy']);
  const lighting = result.recommendations.lighting.find(item => item.id === 'warm-interior-lighting');
  assert.ok(lighting.score > 0);
  assert.equal(lighting.contributions[0].origin, 'explicit');
  assert.equal(lighting.contributions[0].source, 'cozy');
});

test('curated aliases resolve example phrasing to a catalogue concept', () => {
  const result = resolve(['warm lights', 'warm lighting']);
  assert.equal(result.concepts.length, 1);
  assert.equal(result.concepts[0].id, 'warm-interior-lighting');
  assert.equal(result.concepts[0].known, true);
  assert.equal(result.selected.lighting.id, 'warm-interior-lighting');
});

test('Style Pack relationships are derived from catalogue atoms in both directions', () => {
  const result = resolve(['booktok']);
  assert.ok(result.recommendations.setting.some(item => item.id === 'shelved-interior'));
  assert.ok(result.recommendations.activity.some(item => item.id === 'reading-pause'));
  assert.ok(result.recommendations.props.some(item => item.id === 'ceramic-mug'));
  const reverse = resolve(['annotated paperback']);
  assert.ok(reverse.recommendations.style.some(item => item.id === 'booktok'));
});

test('derived Style Pack mappings follow a supplied registry without hard-coded pack semantics', () => {
  const registry = {
    'future-pack': {
      id: 'future-pack',
      name: 'Future Pack',
      atoms: { mood: [{ id: 'new-feeling', value: 'new feeling', weight: 0.8, tags: [] }] }
    }
  };
  const derived = deriveStylePackRelationships(registry);
  assert.ok(derived.some(item => item.source === 'future-pack' && item.target === 'new-feeling'));
  assert.equal(derived.some(item => item.source === 'booktok'), false);
});

test('category weights normalize to a deterministic 100 percent influence budget', () => {
  const normalized = normalizeCategoryWeights({ mood: 25, locations: 20, activities: 10, wardrobe: 15, lighting: 15, style: 15, bad: -2 });
  assert.equal(Math.round(Object.values(normalized).reduce((sum, value) => sum + value, 0) * 100000) / 100000, 1);
  assert.equal(normalized.setting, 0.2);
  assert.equal(normalized.activity, 0.1);
  assert.equal(normalized.camera, 0.15);
  assert.deepEqual(normalizeCategoryWeights(null), normalizeCategoryWeights({}));
  assert.equal(Object.values(normalizeCategoryWeights({})).reduce((sum, value) => sum + value, 0), 1);
  assert.deepEqual(normalizeCategoryWeights({ unknown: 10 }), normalizeCategoryWeights({}));
});

test('changing source-domain weights meaningfully changes recommendation rankings', () => {
  const moodHeavy = resolveCreativeDirection({ concepts: ['cozy', 'bookshop'], weights: { mood: 90, setting: 10 }, seed: 'weights' });
  const settingHeavy = resolveCreativeDirection({ concepts: ['cozy', 'bookshop'], weights: { mood: 10, setting: 90 }, seed: 'weights' });
  assert.equal(moodHeavy.selected.setting.id, 'indoor-setting');
  assert.equal(settingHeavy.selected.setting.id, 'bookshop');
});

test('same seed is deterministic and different seeds vary tied choices without overturning dominant direction', () => {
  const explicit = [
    { source: 'seed-source', target: 'option-a', sourceDomain: 'mood', targetDomain: 'camera', strength: 0.8, origin: 'explicit' },
    { source: 'seed-source', target: 'option-b', sourceDomain: 'mood', targetDomain: 'camera', strength: 0.8, origin: 'explicit' },
    { source: 'seed-source', target: 'dominant', sourceDomain: 'mood', targetDomain: 'lighting', strength: 1, origin: 'explicit' },
    { source: 'seed-source', target: 'minor', sourceDomain: 'mood', targetDomain: 'lighting', strength: 0.25, origin: 'explicit' }
  ];
  const options = { explicitRelationships: explicit, stylePacks: {} };
  const first = resolveCreativeDirection({ concepts: ['seed-source'], weights: { mood: 1 }, seed: 'a' }, options);
  const repeat = resolveCreativeDirection({ concepts: ['seed-source'], weights: { mood: 1 }, seed: 'a' }, options);
  assert.deepEqual(first, repeat);
  const selections = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(seed => resolveCreativeDirection({ concepts: ['seed-source'], weights: { mood: 1 }, seed }, options).selected.camera.id));
  assert.ok(selections.size > 1);
  assert.equal(first.selected.lighting.id, 'dominant');
});

test('compatibility changes soft ranking while retaining contrasting alternatives', () => {
  const result = resolve(['quiet', 'bookshop', 'cinematic']);
  const candid = result.recommendations.camera.find(item => item.id === 'candid-35mm');
  const contrast = result.recommendations.lighting.find(item => item.id === 'contrasting-dramatic-lighting');
  const warm = result.recommendations.lighting.find(item => item.id === 'warm-interior-lighting');
  assert.ok(candid.compatibilityScore > 0);
  assert.ok(warm.score > contrast.score);
  assert.ok(contrast.score > 0);
});

test('resolver returns structured Creative Direction and explainability metadata, not prompt prose', () => {
  const result = resolve(['rainy', 'London', 'quiet', 'bookshop', 'warm lighting', 'cinematic']);
  assert.equal(result.engine.version, '1.0');
  assert.ok(Array.isArray(result.recommendations.camera));
  assert.ok(Object.hasOwn(result.selected, 'lighting'));
  assert.ok(result.explanation.every(item => Array.isArray(item.suggestedBy)));
  assert.equal(Object.hasOwn(result, 'prompt'), false);
  const warm = result.explanation.find(item => item.recommendationId === 'warm-interior-lighting');
  assert.ok(warm.suggestedBy.some(item => item.concept === 'bookshop'));
});

test('malformed and unknown concepts fail safely and empty input returns an empty direction', () => {
  const malformed = resolveCreativeDirection({ concepts: [null, {}, 42, 'not-in-catalogue'], weights: { mood: 'bad' } });
  assert.deepEqual(Object.values(malformed.recommendations).flat(), []);
  assert.equal(malformed.concepts.some(item => item.id === 'not-in-catalogue' && !item.known), true);
  const empty = resolveCreativeDirection();
  assert.deepEqual(Object.values(empty.selected), Object.values(empty.selected).map(() => null));
});

test('relationship resolution leaves CharacterFlow state, input, and catalogue untouched', () => {
  const state = blankState();
  const beforeState = structuredClone(state);
  const input = { concepts: [{ value: 'booktok', relevance: 0.8 }], weights: structuredClone(weights), seed: 'immutable' };
  const beforeInput = structuredClone(input);
  const catalogueBefore = JSON.stringify(STYLE_PACKS);
  resolveCreativeDirection(input);
  assert.deepEqual(input, beforeInput);
  assert.deepEqual(state, beforeState);
  assert.equal(JSON.stringify(STYLE_PACKS), catalogueBefore);
});

test('catalogue reserves observed origin without implementing observed learning', () => {
  const catalogue = buildCreativeRelationshipCatalogue();
  assert.ok(catalogue.some(item => item.origin === 'explicit'));
  assert.ok(catalogue.some(item => item.origin === 'derived'));
  assert.equal(catalogue.some(item => item.origin === 'observed'), false);
  assert.ok(EXPLICIT_CREATIVE_RELATIONSHIPS.length < 20);
});
