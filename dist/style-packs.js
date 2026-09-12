export const STYLE_PACK_SCHEMA_VERSION = 1;

const atom = (id, value, weight = 1, options = {}) => Object.freeze({
  id, value, weight,
  tags: options.tags || [],
  compatibility: options.compatibility || [],
  conflicts: options.conflicts || [],
});

export const STYLE_PACKS = Object.freeze({
  'tech-girlie': Object.freeze({
    schemaVersion: STYLE_PACK_SCHEMA_VERSION, id: 'tech-girlie', name: 'Tech Girlie', version: 1,
    description: 'Polished, playful technology-culture presentation with clean editorial detail.',
    atoms: Object.freeze({
      wardrobe: [atom('oversized-blazer', 'oversized tailored blazer', 1.05), atom('sleek-knit-set', 'sleek knit co-ord', .92), atom('metallic-sneakers', 'metallic accent sneakers', .82, {conflicts:['vintage-loafers']})],
      styling: [atom('sleek-gloss', 'sleek hair with a subtle gloss finish', 1), atom('layered-silver', 'layered silver jewellery', .86)],
      props: [atom('slim-laptop', 'slim laptop with minimal decals', 1.05, {compatibility:[{tokens:['workspace','office','cafe'],multiplier:1.18,reason:'work-oriented scene supports a laptop'}]}), atom('wireless-headphones', 'wireless headphones', .88)],
      environment: [atom('creative-workspace', 'graphic creative workspace details', 1, {compatibility:[{tokens:['office','workspace'],multiplier:1.25,reason:'scene supports a working environment'}]}), atom('neon-reflections', 'restrained neon reflections', .76, {compatibility:[{tokens:['night','city'],multiplier:1.24,reason:'night-city context supports neon light'}]})],
      activities: [atom('focused-making', 'focused digital making', 1, {compatibility:[{tokens:['office','workspace'],multiplier:1.2,reason:'work context supports focused making'}]}), atom('coffee-break', 'casual coffee break', .76, {compatibility:[{tokens:['cafe','coffee'],multiplier:1.3,reason:'cafe context supports a coffee break'}]})],
      mood: [atom('assured-playful', 'assured and playful', 1), atom('quietly-focused', 'quietly focused', .9)],
      photography: [atom('clean-editorial', 'clean editorial framing with crisp detail', 1.08), atom('screen-glow', 'soft screen glow with controlled highlights', .82, {compatibility:[{tokens:['indoor','workspace','night'],multiplier:1.18,reason:'available light supports screen glow'}]})],
    }),
  }),
  streetwear: Object.freeze({
    schemaVersion: STYLE_PACK_SCHEMA_VERSION, id: 'streetwear', name: 'Streetwear', version: 1,
    description: 'Relaxed urban layers, grounded movement, and direct documentary energy.',
    atoms: Object.freeze({
      wardrobe: [atom('oversized-blazer', 'oversized tailored blazer', .78), atom('utility-cargo', 'relaxed utility cargos and cropped jacket', 1.1), atom('statement-trainers', 'statement trainers', .96, {conflicts:['vintage-loafers']})],
      styling: [atom('layered-silver', 'layered silver jewellery', .95), atom('textured-casual', 'casual textured styling', 1.02)],
      props: [atom('wireless-headphones', 'wireless headphones', .92), atom('canvas-tote', 'graphic canvas tote', .86)],
      environment: [atom('city-texture', 'layered city textures and concrete geometry', 1.1, {compatibility:[{tokens:['street','city','outdoor'],multiplier:1.24,reason:'urban context supports city texture'}]}), atom('transit-lines', 'graphic transit lines in the background', .8, {compatibility:[{tokens:['station','transit'],multiplier:1.3,reason:'transit context supports station geometry'}]})],
      activities: [atom('walking-city', 'walking through the city', 1.05, {compatibility:[{tokens:['street','city','outdoor'],multiplier:1.2,reason:'urban context supports movement'}]}), atom('friends-linkup', 'meeting friends between plans', .88)],
      mood: [atom('assured-playful', 'assured and playful', .82), atom('unforced-cool', 'unforced and self-possessed', 1.08)],
      photography: [atom('street-documentary', 'handheld street-documentary composition', 1.08, {compatibility:[{tokens:['street','city','outdoor'],multiplier:1.22,reason:'urban context supports documentary framing'}]}), atom('clean-editorial', 'clean editorial framing with crisp detail', .72)],
    }),
  }),
  booktok: Object.freeze({
    schemaVersion: STYLE_PACK_SCHEMA_VERSION, id: 'booktok', name: 'Booktok', version: 1,
    description: 'Literary visual language and intimate, warm presentation without adding Reading as an interest.',
    atoms: Object.freeze({
      wardrobe: [atom('soft-cardigan', 'soft cardigan with relaxed trousers', 1.08), atom('vintage-loafers', 'vintage loafers', .92, {conflicts:['metallic-sneakers','statement-trainers']})],
      styling: [atom('softly-undone', 'softly undone hair and understated accessories', 1.04), atom('layered-silver', 'layered silver jewellery', .68)],
      props: [atom('annotated-paperback', 'annotated paperback and pencil', 1.1, {compatibility:[{tokens:['reading','library','bookshop'],multiplier:1.22,reason:'literary context supports a book prop'}]}), atom('ceramic-mug', 'hand-thrown ceramic mug', .88, {compatibility:[{tokens:['cafe','coffee','home'],multiplier:1.2,reason:'quiet setting supports a warm drink prop'}]})],
      environment: [atom('shelved-interior', 'warm shelves and intimate interior texture', 1.08, {compatibility:[{tokens:['library','bookshop','home'],multiplier:1.28,reason:'interior context supports shelving'}]}), atom('rainy-window', 'rain-softened window light', .84, {compatibility:[{tokens:['rain','cafe','home'],multiplier:1.2,reason:'quiet context supports window atmosphere'}]})],
      activities: [atom('reading-pause', 'pausing over an open book', 1.05, {compatibility:[{tokens:['reading','library','bookshop'],multiplier:1.25,reason:'scene activity supports a reading gesture'}]}), atom('quiet-observation', 'quietly observing the room', .86)],
      mood: [atom('quietly-focused', 'quietly focused', .84), atom('intimate-reflective', 'intimate and reflective', 1.08)],
      photography: [atom('window-light-portrait', 'intimate window-light portrait with shallow depth', 1.08, {compatibility:[{tokens:['indoor','cafe','home','library'],multiplier:1.18,reason:'interior context supports window-light portraiture'}]}), atom('gentle-film-grain', 'gentle film grain and warm tonal roll-off', .92)],
    }),
  }),
});

export const STYLE_PACK_LIST = Object.freeze(Object.values(STYLE_PACKS));
