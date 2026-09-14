import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INSPIRATION_WEIGHTS,
  addInspirationToProject,
  appendInspirationConcept,
  applyInspirationToStudio,
  buildInspirationDirection,
  createDefaultInspirationState,
  directionPreviewData,
  normalizeInspirationState,
  normalizeInspirationWeights,
  parseInspirationConcepts,
  rebalanceInspirationWeights,
  removeInspirationConcept,
  resetInspirationWeights,
  setInspirationIdea
} from '../inspiration.js';
import { blankState, createCharacter, createTake, restoreState, serializeState } from '../studio-core.js';
import { createProject } from '../project-library.js';
import { createCloudStore } from '../cloud-store.js';

const total = weights => Object.values(weights).reduce((sum, value) => sum + value, 0);
const exampleIdea = 'rainy\nLondon\nquiet\nbookshop\nwarm lighting\ncinematic';

test('legacy state migrates to a focused Inspiration default', () => {
  const restored = restoreState(JSON.stringify({ character: null, characters: [], takes: [] }));
  assert.deepEqual(restored.inspirationState, createDefaultInspirationState());
  assert.equal(total(restored.inspirationState.weights), 100);
});

test('concept parsing is deterministic across commas, newlines, whitespace and duplicates', () => {
  assert.deepEqual(parseInspirationConcepts(' rainy London, quiet\n bookshop  , quiet '), ['rainy London', 'quiet', 'bookshop']);
  assert.deepEqual(parseInspirationConcepts(null), []);
});

test('concepts append and remove without replacing the current idea', () => {
  let inspiration = setInspirationIdea(createDefaultInspirationState(), 'rainy, quiet');
  inspiration = appendInspirationConcept(inspiration, 'Cinematic');
  assert.deepEqual(inspiration.concepts, ['rainy', 'quiet', 'Cinematic']);
  inspiration = removeInspirationConcept(inspiration, 'quiet');
  assert.deepEqual(inspiration.concepts, ['rainy', 'Cinematic']);
  assert.equal(inspiration.rawIdea, 'rainy, Cinematic');
});

test('weight rebalance is proportional, deterministic and always totals 100', () => {
  const first = rebalanceInspirationWeights(DEFAULT_INSPIRATION_WEIGHTS, 'mood', 35);
  const repeat = rebalanceInspirationWeights(DEFAULT_INSPIRATION_WEIGHTS, 'mood', 35);
  assert.deepEqual(first, repeat);
  assert.equal(first.mood, 35);
  assert.equal(total(first), 100);
  assert.ok(first.setting < DEFAULT_INSPIRATION_WEIGHTS.setting);
  assert.ok(first.activity < DEFAULT_INSPIRATION_WEIGHTS.activity);
});

test('invalid weights normalize safely without negatives or NaN', () => {
  const malformed = normalizeInspirationWeights({ mood: NaN, setting: -2, activity: Infinity, wardrobe: 0, camera: '15', style: null });
  assert.equal(total(malformed), 100);
  assert.ok(Object.values(malformed).every(value => Number.isInteger(value) && value >= 0 && value <= 100));
  assert.deepEqual(rebalanceInspirationWeights(DEFAULT_INSPIRATION_WEIGHTS, 'mood', 'bad'), DEFAULT_INSPIRATION_WEIGHTS);
  assert.equal(rebalanceInspirationWeights(DEFAULT_INSPIRATION_WEIGHTS, 'mood', 140).mood, 100);
});

test('Reset restores weighting defaults while preserving idea and current Direction', () => {
  const direction = { selected: {} };
  const inspiration = { ...createDefaultInspirationState(), rawIdea: 'quiet', concepts: ['quiet'], weights: { mood: 100 }, direction };
  const reset = resetInspirationWeights(inspiration);
  assert.deepEqual(reset.weights, DEFAULT_INSPIRATION_WEIGHTS);
  assert.equal(reset.rawIdea, 'quiet');
  assert.deepEqual(reset.direction, direction);
});

test('Build Direction invokes the relationship engine with concepts weights and seed', () => {
  const calls = [];
  const resolver = input => { calls.push(input); return { engine: { seed: input.seed }, concepts: [], selected: {} }; };
  const inspiration = setInspirationIdea(createDefaultInspirationState(), exampleIdea);
  const built = buildInspirationDirection(inspiration, resolver);
  assert.deepEqual(calls, [{ concepts: inspiration.concepts, weights: inspiration.weights, seed: inspiration.seed }]);
  assert.equal(built.direction.engine.seed, inspiration.seed);
});

test('same Inspiration inputs and seed produce the same structured Direction', () => {
  const inspiration = setInspirationIdea(createDefaultInspirationState(), exampleIdea);
  assert.deepEqual(buildInspirationDirection(inspiration).direction, buildInspirationDirection(inspiration).direction);
});

test('unknown concepts stay visible and safe in working state and preview', () => {
  const built = buildInspirationDirection(setInspirationIdea(createDefaultInspirationState(), 'London, moon archive, quiet'));
  assert.ok(built.direction.concepts.some(concept => concept.input === 'moon archive' && !concept.known));
  assert.ok(directionPreviewData(built.direction).unknownConcepts.includes('Moon Archive'));
});

test('Direction preview maps selected domains and real contribution metadata', () => {
  const built = buildInspirationDirection(setInspirationIdea(createDefaultInspirationState(), 'quiet, bookshop, warm lighting'));
  const preview = directionPreviewData(built.direction);
  assert.ok(preview.rows.some(row => row.domain === 'lighting' && /Warm interior/.test(row.value)));
  assert.ok(preview.rows.some(row => row.reason.includes('Bookshop')));
});

test('building a Direction does not mutate Character Core or its revision', () => {
  const state = createCharacter(blankState(), { id: 'maya', name: 'Maya' });
  const core = structuredClone(state.character);
  const inspirationState = buildInspirationDirection(setInspirationIdea(state.inspirationState, 'quiet, bookshop'));
  assert.deepEqual(state.character, core);
  assert.equal(inspirationState.direction.engine.name, 'PromptForge Creative Relationship Engine');
});

test('Send to Studio changes only intended working domains and never creates a Take or prompt', () => {
  let state = createCharacter(blankState(), { id: 'maya', name: 'Maya' });
  state = createTake(state, 'existing');
  const core = structuredClone(state.character);
  const takes = structuredClone(state.takes);
  const prompts = structuredClone(state.compiledPrompts);
  const built = buildInspirationDirection(setInspirationIdea(state.inspirationState, 'quiet, bookshop, warm lighting, streetwear'));
  const applied = applyInspirationToStudio({ ...state, inspirationState: built }, built.direction);
  assert.deepEqual(applied.character, core);
  assert.deepEqual(applied.takes, takes);
  assert.deepEqual(applied.compiledPrompts, prompts);
  assert.equal(applied.selectedTake, null);
  assert.equal(applied.scene.source, 'inspiration');
  assert.match(applied.visualSettings.lighting.behaviour, /Warm interior/i);
  assert.deepEqual(applied.styleMix, state.styleMix);
  assert.equal(applied.workingDirection.source, 'inspiration');
});

test('Send to Studio respects locked wardrobe and photography controls', () => {
  const direction = { selected: { wardrobe: { id: 'look', label: 'New look' }, camera: { id: 'camera', label: 'Candid 35mm' } }, concepts: [], engine: {} };
  const state = {
    ...blankState(),
    wardrobe: { source: 'manual', items: ['Keep me'], slots: {}, locked: true },
    visualSettings: { ...blankState().visualSettings, photography: { shotType: 'Locked', lens: '85mm', angle: 'Eye level', locked: true } }
  };
  const applied = applyInspirationToStudio(state, direction);
  assert.deepEqual(applied.wardrobe, state.wardrobe);
  assert.deepEqual(applied.visualSettings.photography, state.visualSettings.photography);
});

test('Send to Studio respects locked scene and lighting controls while preserving Style Mix', () => {
  const direction = {
    selected: {
      setting: { id: 'bookshop', label: 'New setting' },
      lighting: { id: 'warm', label: 'New lighting' },
      style: { id: 'streetwear', label: 'Streetwear' }
    },
    concepts: [],
    engine: {}
  };
  const state = {
    ...blankState(),
    scene: { id: 'existing-scene', name: 'Keep scene', location: 'Existing place', activity: 'Existing activity', locked: true },
    generationOptions: { ...blankState().generationOptions, keepScene: true },
    resolverLocks: { lighting: true },
    styleMix: { influences: [{ packId: 'tech-girlie', weight: 70 }, { packId: 'dark-academia', weight: 30 }], strength: .6, locks: {} }
  };
  const applied = applyInspirationToStudio(state, direction);
  assert.deepEqual(applied.scene, state.scene);
  assert.deepEqual(applied.visualSettings.lighting, state.visualSettings.lighting);
  assert.deepEqual(applied.styleMix, state.styleMix);
  assert.equal(applied.workingDirection.selected.style.label, 'Streetwear');
});

test('Add to Project stores a compact Inspiration reference without changing ownership', () => {
  let state = createCharacter(blankState(), { id: 'maya', name: 'Maya' });
  state = createTake(state, 'existing');
  state = createProject(state, { name: 'Editorial', characterIds: ['maya'], takeIds: [state.takes[0].id] }, { id: 'project-one', now: '2026-09-14T00:00:00.000Z' });
  const characters = structuredClone(state.characters);
  const takes = structuredClone(state.takes);
  const built = buildInspirationDirection(setInspirationIdea(state.inspirationState, 'quiet, bookshop'));
  const updated = addInspirationToProject({ ...state, inspirationState: built }, 'project-one', built.direction, { id: 'direction-one', now: '2026-09-14T01:00:00.000Z' });
  assert.deepEqual(updated.characters, characters);
  assert.deepEqual(updated.takes, takes);
  assert.deepEqual(updated.projects[0].characterIds, ['maya']);
  assert.deepEqual(updated.projects[0].takeIds, [takes[0].id]);
  assert.equal(updated.projects[0].inspirationRefs[0].id, 'direction-one');
  assert.ok(updated.projects[0].inspirationRefs[0].selected.setting);
});

test('Inspiration working state and Project references survive save and reload', () => {
  let state = createProject(blankState(), { name: 'Editorial' }, { id: 'project-one', now: '2026-09-14T00:00:00.000Z' });
  state = { ...state, inspirationState: buildInspirationDirection(setInspirationIdea(state.inspirationState, 'quiet, bookshop')) };
  state = addInspirationToProject(state, 'project-one', state.inspirationState.direction, { id: 'direction-one', now: '2026-09-14T01:00:00.000Z' });
  const restored = restoreState(serializeState(state));
  assert.deepEqual(restored.inspirationState, state.inspirationState);
  assert.deepEqual(restored.projects[0].inspirationRefs, state.projects[0].inspirationRefs);
});

test('local-first adapter persists Inspiration working state', async () => {
  const storage = new Map();
  const local = createCloudStore({ local: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } });
  const state = { ...blankState(), inspirationState: buildInspirationDirection(setInspirationIdea(createDefaultInspirationState(), 'quiet, bookshop')) };
  await local.saveCharacter(state, 'local-user');
  const restored = restoreState(storage.get('promptforge-studio-v2'));
  assert.deepEqual(restored.inspirationState, state.inspirationState);
});

test('normalization preserves a prepared future source without activating analysis', () => {
  const normalized = normalizeInspirationState({ source: { type: 'image', reference: { name: 'reference.jpg' } } });
  assert.equal(normalized.source.type, 'image');
  assert.deepEqual(normalized.source.reference, { name: 'reference.jpg' });
  assert.equal(normalized.direction, null);
});
