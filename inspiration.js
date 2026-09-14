import { INFLUENCE_DOMAINS, resolveCreativeDirection } from './creative-relationships.js';
import { normalizeWardrobe } from './assisted-creation.js';
import { STYLE_PACKS } from './style-packs.js';
import { addProjectInspiration } from './project-library.js';

export const INSPIRATION_SCHEMA_VERSION = 1;
export const DEFAULT_INSPIRATION_WEIGHTS = Object.freeze({
  mood: 25,
  setting: 20,
  activity: 10,
  wardrobe: 15,
  camera: 15,
  style: 15
});
export const INSPIRATION_STARTERS = Object.freeze([
  'Cinematic',
  'City night',
  'Cozy indoors',
  'Streetwear',
  'Portrait',
  'Make it different'
]);

const clone = value => structuredClone(value);
const clamp = value => Math.min(100, Math.max(0, value));
const titleCase = value => String(value || '').replace(/\b\w/g, character => character.toUpperCase());
const unique = values => {
  const seen = new Set();
  return (values || []).filter(value => {
    const key = String(value).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function allocateBudget(values, total = 100) {
  const safe = values.map(value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);
  const sum = safe.reduce((amount, value) => amount + value, 0);
  const basis = sum > 0 ? safe : safe.map(() => 1);
  const basisTotal = basis.reduce((amount, value) => amount + value, 0);
  const exact = basis.map(value => value / basisTotal * total);
  const allocated = exact.map(Math.floor);
  let remainder = total - allocated.reduce((amount, value) => amount + value, 0);
  exact
    .map((value, index) => ({ index, fraction: value - allocated[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
    .forEach(item => {
      if (remainder > 0) {
        allocated[item.index] += 1;
        remainder -= 1;
      }
    });
  return allocated;
}

export function normalizeInspirationWeights(weights = DEFAULT_INSPIRATION_WEIGHTS) {
  const values = INFLUENCE_DOMAINS.map(domain => {
    const value = Number(weights?.[domain]);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_INSPIRATION_WEIGHTS[domain];
  });
  const allocated = allocateBudget(values);
  return Object.fromEntries(INFLUENCE_DOMAINS.map((domain, index) => [domain, allocated[index]]));
}

export function rebalanceInspirationWeights(weights, changedDomain, requestedValue) {
  const current = normalizeInspirationWeights(weights);
  if (!INFLUENCE_DOMAINS.includes(changedDomain) || !Number.isFinite(Number(requestedValue))) return current;
  const nextValue = clamp(Math.round(Number(requestedValue)));
  const otherDomains = INFLUENCE_DOMAINS.filter(domain => domain !== changedDomain);
  const remaining = 100 - nextValue;
  const allocated = allocateBudget(otherDomains.map(domain => current[domain]), remaining);
  return Object.fromEntries(INFLUENCE_DOMAINS.map(domain => [
    domain,
    domain === changedDomain ? nextValue : allocated[otherDomains.indexOf(domain)]
  ]));
}

export function parseInspirationConcepts(rawIdea = '') {
  return unique(String(rawIdea ?? '')
    .split(/[,\n]+/)
    .map(value => value.replace(/\s+/g, ' ').trim()));
}

export function createDefaultInspirationState() {
  return {
    schemaVersion: INSPIRATION_SCHEMA_VERSION,
    mode: 'create',
    rawIdea: '',
    concepts: [],
    weights: { ...DEFAULT_INSPIRATION_WEIGHTS },
    seed: 'inspiration-1',
    direction: null,
    source: { type: 'typed', reference: null }
  };
}

export function normalizeInspirationState(inspirationState = {}) {
  const defaults = createDefaultInspirationState();
  const hasConcepts = Array.isArray(inspirationState?.concepts);
  const concepts = unique((hasConcepts ? inspirationState.concepts : parseInspirationConcepts(inspirationState?.rawIdea))
    .map(value => String(value).replace(/\s+/g, ' ').trim()));
  return {
    ...defaults,
    ...inspirationState,
    schemaVersion: INSPIRATION_SCHEMA_VERSION,
    mode: 'create',
    rawIdea: String(inspirationState?.rawIdea || ''),
    concepts,
    weights: normalizeInspirationWeights(inspirationState?.weights),
    seed: String(inspirationState?.seed || defaults.seed),
    direction: inspirationState?.direction && typeof inspirationState.direction === 'object' ? clone(inspirationState.direction) : null,
    source: {
      ...defaults.source,
      ...(inspirationState?.source || {}),
      type: inspirationState?.source?.type || 'typed'
    }
  };
}

export function setInspirationIdea(inspirationState, rawIdea) {
  const current = normalizeInspirationState(inspirationState);
  return { ...current, rawIdea: String(rawIdea || ''), concepts: parseInspirationConcepts(rawIdea) };
}

export function appendInspirationConcept(inspirationState, concept) {
  const current = normalizeInspirationState(inspirationState);
  const added = parseInspirationConcepts(concept);
  const concepts = unique([...current.concepts, ...added]);
  return { ...current, concepts, rawIdea: concepts.join(', ') };
}

export function removeInspirationConcept(inspirationState, conceptOrIndex) {
  const current = normalizeInspirationState(inspirationState);
  const concepts = typeof conceptOrIndex === 'number'
    ? current.concepts.filter((_, index) => index !== conceptOrIndex)
    : current.concepts.filter(value => value.toLowerCase() !== String(conceptOrIndex).toLowerCase());
  return { ...current, concepts, rawIdea: concepts.join(', ') };
}

export function resetInspirationWeights(inspirationState) {
  return { ...normalizeInspirationState(inspirationState), weights: { ...DEFAULT_INSPIRATION_WEIGHTS } };
}

export function buildInspirationDirection(inspirationState, resolver = resolveCreativeDirection) {
  const current = normalizeInspirationState(inspirationState);
  const direction = resolver({ concepts: current.concepts, weights: current.weights, seed: current.seed });
  return { ...current, direction };
}

function previewReason(candidate) {
  if (!candidate) return '';
  const sources = unique((candidate.contributions || []).map(contribution => contribution.sourceLabel || contribution.source));
  const strongest = (candidate.contributions || [])[0];
  const weighted = strongest
    ? `${titleCase(strongest.sourceDomain)} ${Math.round(Number(strongest.domainWeight || 0) * 100)}%`
    : '';
  return [...sources, weighted].filter(Boolean).join(' · ');
}

export function directionPreviewData(direction) {
  if (!direction?.selected) return { title: 'Your direction will appear here', rows: [], unknownConcepts: [] };
  const concepts = direction.concepts || [];
  const titleConcepts = concepts.filter(concept => concept.domain === 'setting' || !concept.known).slice(0, 2);
  const fallbackConcepts = concepts.filter(concept => !['activity', 'lighting', 'camera'].includes(concept.domain)).slice(0, 3);
  const title = (titleConcepts.length ? titleConcepts : fallbackConcepts)
    .map(concept => titleCase(concept.label || concept.input))
    .join(' · ') || 'Creative Direction';
  const labels = {
    setting: 'Scene / Setting',
    activity: 'Activity',
    wardrobe: 'Wardrobe',
    camera: 'Camera',
    lighting: 'Lighting',
    mood: 'Mood',
    style: 'Style'
  };
  const rows = Object.entries(labels)
    .map(([domain, label]) => ({ domain, label, candidate: direction.selected[domain] }))
    .filter(row => row.candidate)
    .map(row => ({
      domain: row.domain,
      label: row.label,
      value: row.candidate.label,
      reason: previewReason(row.candidate),
      score: row.candidate.score
    }));
  return {
    title,
    rows,
    unknownConcepts: concepts.filter(concept => !concept.known).map(concept => concept.label || concept.input)
  };
}

function selectedSummary(direction) {
  return Object.fromEntries(Object.entries(direction?.selected || {})
    .filter(([, candidate]) => candidate)
    .map(([domain, candidate]) => [domain, { id: candidate.id, label: candidate.label }]));
}

export function applyInspirationToStudio(state, direction = state?.inspirationState?.direction) {
  if (!direction?.selected) return state;
  const characterBefore = JSON.stringify(state.character);
  const selected = direction.selected;
  const setting = selected.setting?.label;
  const activity = selected.activity?.label;
  const mood = selected.mood?.label;
  const camera = selected.camera?.label;
  const lighting = selected.lighting?.label;
  const wardrobe = selected.wardrobe?.label;
  const lens = camera?.match(/\b\d{2,3}mm\b/i)?.[0];
  const stylePack = selected.style && STYLE_PACKS[selected.style.id];
  const next = {
    ...state,
    scene: setting ? {
      id: `inspiration-${selected.setting.id}`,
      name: setting,
      location: setting,
      activity: activity || state.scene?.activity || 'Creative direction',
      ambience: 'neutral',
      mood: mood || null,
      source: 'inspiration'
    } : state.scene,
    wardrobe: wardrobe && !state.wardrobe?.locked
      ? normalizeWardrobe({ ...state.wardrobe, source: 'inspiration', items: [wardrobe] })
      : state.wardrobe,
    visualSettings: {
      ...state.visualSettings,
      expression: mood ? { ...state.visualSettings.expression, expression: mood } : state.visualSettings.expression,
      photography: camera && !state.visualSettings.photography?.locked ? {
        ...state.visualSettings.photography,
        shotType: camera.replace(/\s*\b\d{2,3}mm\b/i, '').trim() || camera,
        ...(lens ? { lens } : {})
      } : state.visualSettings.photography,
      lighting: lighting ? { ...state.visualSettings.lighting, behaviour: lighting } : state.visualSettings.lighting
    },
    styleMix: stylePack ? {
      ...state.styleMix,
      influences: [{ packId: stylePack.id, weight: 100 }]
    } : state.styleMix,
    workingDirection: {
      source: 'inspiration',
      seed: direction.engine?.seed || null,
      selected: selectedSummary(direction),
      concepts: (direction.concepts || []).map(concept => concept.input || concept.label)
    },
    selectedTake: null,
    dirty: true
  };
  if (JSON.stringify(next.character) !== characterBefore) throw new Error('Inspiration attempted to mutate Character Core');
  return next;
}

export function addInspirationToProject(state, projectId, direction = state?.inspirationState?.direction, options = {}) {
  if (!direction?.selected) return state;
  const preview = directionPreviewData(direction);
  return addProjectInspiration(state, projectId, {
    id: options.id,
    createdAt: options.now,
    title: preview.title,
    concepts: (direction.concepts || []).map(concept => concept.input || concept.label),
    weights: clone(direction.weights || {}),
    selected: selectedSummary(direction),
    seed: direction.engine?.seed || null
  }, options);
}
