import {STYLE_PACKS} from './style-packs.js';

export const CONTENT_DOMAINS = Object.freeze(['wardrobe','accessories','grooming','motifs','props','activities','locations','mood','visual','occupations','interests','hobbies','scenes','colours','photography','traits']);
const clone = value => structuredClone(value);
const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function transformContentRows({archetypes=[], domains=[], items=[], influences=[]}={}) {
  const domainsById = new Map(domains.map(row => [row.id, row.slug]));
  const itemsById = new Map(items.map(row => [row.id, row]));
  const packs = {};
  for (const archetype of archetypes) {
    const atoms = Object.fromEntries(CONTENT_DOMAINS.map(domain => [domain, []]));
    for (const relation of influences.filter(item => item.archetype_id === archetype.id && (item.review_status || 'approved') === 'approved')) {
      const item = itemsById.get(relation.content_item_id); const domain = domainsById.get(item?.domain_id);
      if (!item || (item.review_status || 'approved') !== 'approved' || !atoms[domain]) continue;
      atoms[domain].push({id: item.slug, value: item.label, weight: Number(relation.weight), tags: item.metadata?.tags || [], conflicts: item.metadata?.conflicts || []});
    }
    packs[archetype.slug] = {schemaVersion: 1, id: archetype.slug, name: archetype.name, version: 1, description: archetype.description || '', influence: Object.fromEntries(CONTENT_DOMAINS.map(domain => [domain, 'medium'])), atoms};
  }
  return packs;
}

export function createSupabaseContentStore({client, signedIn = true, localCatalogue = STYLE_PACKS} = {}) {
  const fallback = () => clone(localCatalogue);
  return { async loadCatalogue() {
    if (!client || !signedIn) return fallback();
    try {
      const tables = await Promise.all(['archetypes','content_domains','content_items','archetype_influences'].map(table => client.from(table).select('*')));
      if (tables.some(result => result.error) || !tables[0].data?.length || !tables[3].data?.length) return fallback();
      const catalogue = transformContentRows({archetypes: tables[0].data, domains: tables[1].data, items: tables[2].data, influences: tables[3].data});
      return Object.keys(catalogue).length ? catalogue : fallback();
    } catch { return fallback(); }
  }};
}

export function validateContentImport(payload, {domains=CONTENT_DOMAINS}={}) {
  const errors = [], seen = new Set(), archetype = payload?.archetype;
  if (!archetype?.slug || !archetype?.name) errors.push('archetype slug and name are required');
  const influences = (payload?.influences || []).map((entry, index) => {
    const normalized = {...entry, slug: slug(entry.slug || entry.item), reviewStatus: entry.reviewStatus || 'pending'};
    if (!normalized.slug || !normalized.item) errors.push(`influences[${index}] requires item and slug`);
    if (!domains.includes(normalized.domain)) errors.push(`influences[${index}] has unsupported domain`);
    if (!Number.isFinite(Number(normalized.weight)) || Number(normalized.weight) < 0 || Number(normalized.weight) > 1.25) errors.push(`influences[${index}] has invalid weight`);
    if (seen.has(`${normalized.domain}:${normalized.slug}`)) errors.push(`duplicate item: ${normalized.domain}/${normalized.slug}`); else seen.add(`${normalized.domain}:${normalized.slug}`);
    return {...normalized, weight: Number(normalized.weight), reviewStatus: normalized.reviewStatus === 'approved' ? 'approved' : 'pending'};
  });
  return {valid: !errors.length, errors, payload: errors.length ? null : {archetype: {...archetype, slug: slug(archetype.slug)}, influences}};
}

export function previewApprovedManifest(manifest) { return (manifest?.candidates || []).filter(candidate => candidate.reviewStatus === 'approved').map(candidate => ({archetype: {slug: candidate.stylePackId, name: candidate.stylePackName || candidate.stylePackId}, influences: [{domain: candidate.domain || 'occupations', item: candidate.label, slug: slug(candidate.label), weight: Number(candidate.weight || 0), relationshipType: candidate.relationshipType || 'likely', rationale: candidate.rationale || '', provenance: candidate.source || candidate.provenance || 'generated', reviewStatus: 'approved'}]})); }

export function normalizedImportRows(manifest) {
  return previewApprovedManifest(manifest).map(group => ({...group, influences: group.influences.map(item => ({...item, provenance: item.provenance || 'generated'}))}));
}

const checked = async operation => {
  const result = await operation;
  if (result?.error) throw result.error;
  return result?.data;
};

// Import is intentionally an explicit, privileged operation. Public clients should
// remain read-only; call this from a trusted review/admin adapter.
export async function importApprovedManifest(client, manifest) {
  if (!client?.from) throw new Error('Supabase client is required');
  const groups = normalizedImportRows(manifest);
  const domains = await checked(client.from('content_domains').select('id,slug')) || [];
  const domainIds = new Map(domains.map(row => [row.slug, row.id]));
  const imported = [];
  for (const group of groups) {
    const archetype = await checked(client.from('archetypes').upsert({slug: group.archetype.slug, name: group.archetype.name, status: 'active'}, {onConflict: 'slug'}).select('id').single());
    for (const item of group.influences) {
      const domainId = domainIds.get(item.domain);
      if (!domainId) throw new Error(`Unknown content domain: ${item.domain}`);
      const content = await checked(client.from('content_items').upsert({domain_id: domainId, slug: item.slug, label: item.item, provenance: item.provenance, review_status: 'approved'}, {onConflict: 'domain_id,slug'}).select('id').single());
      await checked(client.from('archetype_influences').upsert({archetype_id: archetype.id, content_item_id: content.id, weight: item.weight, relationship_type: item.relationshipType, rationale: item.rationale, provenance: item.provenance, review_status: 'approved'}, {onConflict: 'archetype_id,content_item_id'}));
      imported.push({archetypeId: archetype.id, contentItemId: content.id, domain: item.domain});
    }
  }
  return {groups: groups.length, influences: imported};
}
