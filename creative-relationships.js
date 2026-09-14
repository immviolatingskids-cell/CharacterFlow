import { STYLE_PACKS } from './style-packs.js';

export const RELATIONSHIP_ORIGINS = Object.freeze(['explicit', 'derived', 'observed']);
export const CREATIVE_DIRECTION_DOMAINS = Object.freeze([
  'mood',
  'setting',
  'activity',
  'wardrobe',
  'accessories',
  'grooming',
  'motifs',
  'props',
  'camera',
  'lighting',
  'style'
]);
export const INFLUENCE_DOMAINS = Object.freeze(['mood', 'setting', 'activity', 'wardrobe', 'camera', 'style']);

const DEFAULT_WEIGHT = 1 / INFLUENCE_DOMAINS.length;
const DERIVED_PACK_STRENGTH = 0.72;
const DERIVED_STYLE_STRENGTH = 0.62;
const round = value => Math.round(value * 1000000) / 1000000;
const clone = value => structuredClone(value);

const tokenAliases = Object.freeze({
  lights: 'lighting',
  light: 'lighting',
  lit: 'lighting',
  photographic: 'photography',
  photos: 'photography',
  photo: 'photography',
  activities: 'activity',
  locations: 'location',
  styles: 'style'
});

function words(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(token => tokenAliases[token] || token);
}

export function normalizeCreativeConcept(value) {
  const raw = typeof value === 'object' && value !== null
    ? value.id ?? value.value ?? value.label ?? value.concept
    : value;
  return words(raw).join('-');
}

function displayLabel(id) {
  return id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function canonicalDomain(value) {
  const domain = normalizeCreativeConcept(value);
  return ({
    activities: 'activity',
    location: 'setting',
    locations: 'setting',
    scene: 'setting',
    scenes: 'setting',
    visual: 'camera',
    photography: 'camera'
  })[domain] || domain;
}

function influenceDomain(value) {
  const domain = canonicalDomain(value);
  if (['accessories', 'grooming', 'motifs', 'props'].includes(domain)) return 'style';
  if (domain === 'lighting') return 'camera';
  return INFLUENCE_DOMAINS.includes(domain) ? domain : null;
}

export function normalizeCategoryWeights(weights = {}) {
  const merged = new Map();
  if (weights && typeof weights === 'object' && !Array.isArray(weights)) {
    for (const [key, rawValue] of Object.entries(weights)) {
      const domain = influenceDomain(key);
      const value = Number(rawValue);
      if (INFLUENCE_DOMAINS.includes(domain) && Number.isFinite(value) && value > 0) {
        merged.set(domain, (merged.get(domain) || 0) + value);
      }
    }
  }
  const total = [...merged.values()].reduce((sum, value) => sum + value, 0);
  const normalized = {};
  let assigned = 0;
  INFLUENCE_DOMAINS.forEach((domain, index) => {
    const value = total > 0 ? (merged.get(domain) || 0) / total : DEFAULT_WEIGHT;
    normalized[domain] = index === INFLUENCE_DOMAINS.length - 1 ? round(1 - assigned) : round(value);
    assigned += normalized[domain];
  });
  return normalized;
}

function relationship(source, target, sourceDomain, targetDomain, strength, origin, options = {}) {
  return Object.freeze({
    source: normalizeCreativeConcept(source),
    target: normalizeCreativeConcept(target),
    sourceDomain: canonicalDomain(sourceDomain),
    targetDomain: canonicalDomain(targetDomain),
    strength: round(Math.min(1, Math.max(0, Number(strength) || 0))),
    origin,
    ...options
  });
}

export const EXPLICIT_CREATIVE_RELATIONSHIPS = Object.freeze([
  relationship('cozy', 'warm interior lighting', 'mood', 'lighting', 0.88, 'explicit', { targetLabel: 'Warm interior lighting', targetAliases: ['warm lighting', 'warm lights'], tags: ['warm', 'indoor', 'intimate'] }),
  relationship('cozy', 'intimate mood', 'mood', 'mood', 0.82, 'explicit', { targetLabel: 'Intimate mood', tags: ['quiet', 'warm', 'intimate'] }),
  relationship('cozy', 'indoor setting', 'mood', 'setting', 0.72, 'explicit', { targetLabel: 'Indoor setting', tags: ['indoor', 'warm'] }),
  relationship('quiet', 'reading pause', 'mood', 'activity', 0.84, 'explicit', { targetLabel: 'Reading pause', tags: ['quiet', 'reading', 'intimate'] }),
  relationship('quiet', 'candid 35mm', 'mood', 'camera', 0.76, 'explicit', { targetLabel: 'Candid 35mm', tags: ['quiet', 'candid', 'intimate'] }),
  relationship('bookshop', 'reading pause', 'setting', 'activity', 0.92, 'explicit', { targetLabel: 'Reading pause', tags: ['bookshop', 'reading', 'indoor'] }),
  relationship('bookshop', 'warm interior lighting', 'setting', 'lighting', 0.86, 'explicit', { targetLabel: 'Warm interior lighting', targetAliases: ['warm lighting', 'warm lights'], tags: ['bookshop', 'warm', 'indoor'] }),
  relationship('bookshop', 'shelved interior', 'setting', 'setting', 0.9, 'explicit', { targetLabel: 'Shelved interior', tags: ['bookshop', 'indoor', 'reading'] }),
  relationship('introspective', 'quiet activity', 'mood', 'activity', 0.86, 'explicit', { targetLabel: 'Quiet activity', tags: ['quiet', 'intimate'] }),
  relationship('introspective', 'candid 35mm', 'mood', 'camera', 0.8, 'explicit', { targetLabel: 'Candid 35mm', tags: ['quiet', 'candid', 'intimate'] }),
  relationship('rainy', 'soft overcast lighting', 'setting', 'lighting', 0.84, 'explicit', { targetLabel: 'Soft overcast lighting', tags: ['rainy', 'soft', 'overcast'] }),
  relationship('rainy', 'documentary photography', 'setting', 'camera', 0.62, 'explicit', { targetLabel: 'Documentary photography', tags: ['rainy', 'candid', 'documentary'] }),
  relationship('cinematic', 'layered cinematic framing', 'camera', 'camera', 0.9, 'explicit', { targetLabel: 'Layered cinematic framing', tags: ['cinematic', 'framing'] }),
  relationship('cinematic', 'contrasting dramatic lighting', 'camera', 'lighting', 0.68, 'explicit', { targetLabel: 'Contrasting dramatic lighting', tags: ['cinematic', 'contrast', 'dramatic'] })
]);

function atomTargetDomain(packDomain, atom) {
  if (packDomain === 'activities') return 'activity';
  if (packDomain === 'locations') return 'setting';
  if (packDomain !== 'visual') return canonicalDomain(packDomain);
  const semanticText = `${atom.id} ${atom.value}`.toLowerCase();
  return /light|glow|shadow|overcast|candle|sun-washed/.test(semanticText) ? 'lighting' : 'camera';
}

export function deriveStylePackRelationships(registry = STYLE_PACKS, options = {}) {
  const packStrength = Number.isFinite(Number(options.packStrength)) ? Number(options.packStrength) : DERIVED_PACK_STRENGTH;
  const styleStrength = Number.isFinite(Number(options.styleStrength)) ? Number(options.styleStrength) : DERIVED_STYLE_STRENGTH;
  const relationships = [];
  for (const pack of Object.values(registry || {}).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const [packDomain, atoms] of Object.entries(pack.atoms || {})) {
      for (const atom of atoms || []) {
        const targetDomain = atomTargetDomain(packDomain, atom);
        const atomStrength = Math.min(1, Math.max(0, Number(atom.weight) || 0));
        const tags = [...new Set([...(atom.tags || []), ...words(atom.id), ...words(atom.value)])];
        relationships.push(relationship(pack.id, atom.id, 'style', targetDomain, atomStrength * packStrength, 'derived', {
          sourceLabel: pack.name,
          targetLabel: String(atom.value),
          stylePackId: pack.id,
          tags
        }));
        relationships.push(relationship(atom.id, pack.id, targetDomain, 'style', atomStrength * styleStrength, 'derived', {
          sourceLabel: String(atom.value),
          targetLabel: pack.name,
          stylePackId: pack.id,
          tags
        }));
      }
    }
  }
  return relationships;
}

function validateRelationship(item) {
  return item
    && item.source
    && item.target
    && CREATIVE_DIRECTION_DOMAINS.includes(canonicalDomain(item.targetDomain))
    && RELATIONSHIP_ORIGINS.includes(item.origin)
    && Number.isFinite(Number(item.strength))
    && Number(item.strength) > 0;
}

export function buildCreativeRelationshipCatalogue(options = {}) {
  const explicit = options.explicitRelationships || EXPLICIT_CREATIVE_RELATIONSHIPS;
  const derived = deriveStylePackRelationships(options.stylePacks || STYLE_PACKS, options.derivedStrengths);
  return [...explicit, ...derived]
    .filter(validateRelationship)
    .map(item => relationship(item.source, item.target, item.sourceDomain, item.targetDomain, item.strength, item.origin, {
      sourceLabel: item.sourceLabel,
      targetLabel: item.targetLabel,
      sourceAliases: item.sourceAliases,
      targetAliases: item.targetAliases,
      stylePackId: item.stylePackId,
      tags: [...new Set((item.tags || []).flatMap(words))]
    }));
}

function seedHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed, domain, id) {
  let value = seedHash(`${seed}|${domain}|${id}`) + 0x6D2B79F5;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function conceptIndex(relationships) {
  const index = new Map();
  for (const item of relationships) {
    if (!index.has(item.source)) index.set(item.source, { id: item.source, label: item.sourceLabel || displayLabel(item.source), domain: item.sourceDomain });
    if (!index.has(item.target)) index.set(item.target, { id: item.target, label: item.targetLabel || displayLabel(item.target), domain: item.targetDomain });
    for (const [alias, canonical] of [
      [item.sourceLabel, item.source],
      [item.targetLabel, item.target],
      ...(item.sourceAliases || []).map(alias => [alias, item.source]),
      ...(item.targetAliases || []).map(alias => [alias, item.target])
    ]) {
      const normalized = normalizeCreativeConcept(alias);
      if (normalized && !index.has(normalized)) index.set(normalized, index.get(canonical));
    }
  }
  return index;
}

function normalizeInputs(concepts, index) {
  const seen = new Set();
  const result = [];
  for (const input of Array.isArray(concepts) ? concepts : []) {
    const normalized = normalizeCreativeConcept(input);
    if (!normalized) continue;
    const known = index.get(normalized);
    const id = known?.id || normalized;
    if (seen.has(id)) continue;
    seen.add(id);
    const suppliedDomain = typeof input === 'object' && input !== null ? canonicalDomain(input.domain) : '';
    const relevanceValue = typeof input === 'object' && input !== null ? Number(input.relevance) : 1;
    result.push({
      input: typeof input === 'string' ? input : input.value ?? input.label ?? input.id ?? input.concept ?? '',
      id,
      label: known?.label || displayLabel(normalized),
      domain: CREATIVE_DIRECTION_DOMAINS.includes(suppliedDomain) ? suppliedDomain : known?.domain || null,
      source: typeof input === 'object' && input !== null ? String(input.source ?? input.sourceType ?? 'typed') : 'typed',
      relevance: round(Number.isFinite(relevanceValue) ? Math.min(1, Math.max(0, relevanceValue)) : 1),
      known: Boolean(known)
    });
  }
  return result;
}

function compatibilityBetween(left, right, relationshipLookup) {
  if (left.id === right.id) return 1;
  const leftTags = new Set(left.tags);
  const sharedTags = right.tags.filter(tag => leftTags.has(tag));
  const leftSources = new Set(left.contributions.map(item => item.source));
  const sharedSources = right.contributions.filter(item => leftSources.has(item.source)).length;
  const direct = Math.max(
    relationshipLookup.get(`${left.id}|${right.id}`) || 0,
    relationshipLookup.get(`${right.id}|${left.id}`) || 0
  );
  return round(Math.min(1, direct * 0.7 + Math.min(0.5, sharedSources * 0.25) + Math.min(0.35, sharedTags.length * 0.07)));
}

export function resolveCreativeDirection(input = {}, options = {}) {
  const sourceBefore = JSON.stringify(input);
  const relationships = buildCreativeRelationshipCatalogue(options);
  const index = conceptIndex(relationships);
  const concepts = normalizeInputs(input.concepts, index);
  const weights = normalizeCategoryWeights(input.weights);
  const seed = String(input.seed ?? options.seed ?? 'promptforge-creative-direction');
  const candidates = new Map();

  const addCandidate = (target, contribution, tags = []) => {
    if (!CREATIVE_DIRECTION_DOMAINS.includes(target.domain)) return;
    const key = `${target.domain}|${target.id}`;
    const candidate = candidates.get(key) || {
      id: target.id,
      label: target.label,
      domain: target.domain,
      baseScore: 0,
      tags: [...new Set([...words(target.id), ...words(target.label)])],
      contributions: []
    };
    candidate.baseScore += contribution.influence;
    candidate.tags = [...new Set([...candidate.tags, ...tags.flatMap(words)])];
    candidate.contributions.push(contribution);
    candidates.set(key, candidate);
  };

  for (const concept of concepts.filter(item => item.known && item.domain)) {
    const domainWeight = weights[influenceDomain(concept.domain)];
    addCandidate(concept, {
      source: concept.id,
      sourceLabel: concept.label,
      relationshipStrength: 1,
      origin: 'explicit',
      sourceDomain: concept.domain,
      domainWeight,
      contextualRelevance: concept.relevance,
      influence: round(domainWeight * concept.relevance),
      inputSource: concept.source,
      reason: 'input-concept'
    }, [concept.id]);
  }

  const relationshipsBySource = new Map();
  for (const item of relationships) {
    if (!relationshipsBySource.has(item.source)) relationshipsBySource.set(item.source, []);
    relationshipsBySource.get(item.source).push(item);
  }
  for (const concept of concepts.filter(item => item.known)) {
    for (const item of relationshipsBySource.get(concept.id) || []) {
      const weightedDomain = influenceDomain(item.sourceDomain);
      if (!weightedDomain) continue;
      const sourceWeight = weights[weightedDomain];
      const contextualRelevance = round(concept.relevance * (item.origin === 'derived' ? 0.92 : 1));
      const influence = round(item.strength * sourceWeight * contextualRelevance);
      addCandidate({
        id: item.target,
        label: item.targetLabel || index.get(item.target)?.label || displayLabel(item.target),
        domain: item.targetDomain
      }, {
        source: concept.id,
        sourceLabel: concept.label,
        relationshipStrength: item.strength,
        origin: item.origin,
        sourceDomain: item.sourceDomain,
        domainWeight: sourceWeight,
        contextualRelevance,
        influence,
        inputSource: concept.source,
        reason: item.stylePackId ? `style-pack:${item.stylePackId}` : 'catalogue-relationship'
      }, item.tags || []);
    }
  }

  const relationshipLookup = new Map(relationships.map(item => [`${item.source}|${item.target}`, item.strength]));
  const byDomain = Object.fromEntries(CREATIVE_DIRECTION_DOMAINS.map(domain => [domain, []]));
  for (const candidate of candidates.values()) {
    candidate.baseScore = round(candidate.baseScore);
    byDomain[candidate.domain].push(candidate);
  }
  const peers = [...candidates.values()];
  for (const candidate of peers) {
    const bestByDomain = CREATIVE_DIRECTION_DOMAINS
      .filter(domain => domain !== candidate.domain && byDomain[domain].length)
      .map(domain => Math.max(0, ...byDomain[domain].map(peer => compatibilityBetween(candidate, peer, relationshipLookup))));
    candidate.compatibilityScore = round(bestByDomain.length ? bestByDomain.reduce((sum, value) => sum + value, 0) / bestByDomain.length : 0);
    candidate.seedFactor = round(0.96 + seededUnit(seed, candidate.domain, candidate.id) * 0.08);
    candidate.score = round(candidate.baseScore * candidate.seedFactor * (1 + candidate.compatibilityScore * 0.2));
    candidate.contributions.sort((a, b) => b.influence - a.influence || a.source.localeCompare(b.source));
  }
  for (const domain of CREATIVE_DIRECTION_DOMAINS) {
    byDomain[domain].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    byDomain[domain] = byDomain[domain].map(item => clone(item));
  }
  const selected = Object.fromEntries(CREATIVE_DIRECTION_DOMAINS.map(domain => [domain, byDomain[domain][0] || null]));
  const explanation = Object.values(selected)
    .filter(Boolean)
    .map(item => ({
      domain: item.domain,
      recommendationId: item.id,
      label: item.label,
      suggestedBy: item.contributions.map(contribution => ({
        concept: contribution.source,
        label: contribution.sourceLabel,
        origin: contribution.origin,
        influence: contribution.influence,
        reason: contribution.reason
      })),
      compatibilityScore: item.compatibilityScore
    }));

  if (JSON.stringify(input) !== sourceBefore) throw new Error('Creative Relationship Engine mutated its input');
  return {
    engine: { name: 'PromptForge Creative Relationship Engine', version: '1.0', seed, strategy: 'weighted-soft-compatibility' },
    concepts,
    weights,
    recommendations: byDomain,
    selected,
    explanation
  };
}
