import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');

test('audited navigation keeps labels aligned and exposes a working Settings workspace', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.match(html, /data-workspace="inspiration" href="#workspace=inspiration">Inspiration/);
  assert.match(html, /data-workspace="library" href="#workspace=library">Library/);
  assert.match(app, /settings:\['Settings','Workspace preferences'/);
  assert.match(app, /function renderSettingsWorkspace/);
  assert.match(app, /data-workspace="settings"/);
});

test('drawers and workspace routing are keyboard-safe and deep-linkable', () => {
  const app = read('app.js');
  assert.match(app, /drawer\.inert=!open/);
  assert.match(app, /document\.querySelectorAll\('\.drawer:not\(\.open\)'\)\.forEach\(drawer=>drawer\.inert=true\)/);
  assert.match(app, /function workspaceFromHash\(hash=location\.hash\)/);
  assert.match(app, /window\.history\.pushState\(null,'',hash\)/);
  assert.match(app, /window\.addEventListener\('hashchange'/);
});

test('mobile Library uses the compact category control instead of a scroll rail', () => {
  const css = read('styles.css');
  assert.match(css, /\.library-categories\{display:none\}/);
  assert.match(css, /\.library-filter select\{width:100%\}/);
});

test('settings preferences are device-local and leave canonical studio data untouched', () => {
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(app, /function saveUI\(\)\{localStorage\.setItem\(UI_KEY/);
  assert.match(app, /Preferences here are saved only on this device/);
  assert.match(app, /Character Core, Take, Project or Library data is removed/);
  assert.match(css, /html\[data-motion="reduce"\]/);
});

test('audited Inspiration surface exposes only working modes', () => {
  const app = read('app.js');
  assert.doesNotMatch(app, /data-future-inspiration/);
  assert.doesNotMatch(app, /From Image arrives next/);
  assert.match(app, /data-inspiration-mode="takes"/);
});

test('audited Take and semantic labels remain identifiable', () => {
  const app = read('app.js');
  assert.match(app, /Take \$\{String\(index\+1\)\.padStart\(2,'0'\)\} ·/);
  assert.match(app, /lighting:\{label:'Lighting'/);
  assert.match(app, /No primary reference selected/);
  assert.match(app, /badge\.textContent=locked\?'Manual':'Resolved'/);
});

test('audited Scenes cards are existing-task controls with mobile hit areas', () => {
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(app, /data-scene-select/);
  assert.match(app, /Scene selected/);
  assert.match(css, /\.sidenav button\{min-width:44px;min-height:44px\}/);
  assert.match(css, /\.image-action\{min-width:44px!important;min-height:44px!important\}/);
});

test('annotated controls describe their actual behavior and preserve working states', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.match(html, /id="userControl"[^>]*aria-label="Edit active character"[\s\S]*?<span>Edit character<\/span>/);
  assert.doesNotMatch(html, /id="userControl"[\s\S]*?aria-hidden="true">⌄/);
  assert.match(app, /appearance\.hair\.colour/);
  assert.match(app, /id="newProjectBtn"/);
  assert.match(app, /state=createProject\(state/);
});

test('image prompt surface keeps diagnostics advanced and readable', () => {
  const html = read('index.html');
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(html, /IMAGE PROMPT/);
  assert.match(html, /Advanced generation settings/);
  assert.doesNotMatch(html, /id="inspector"/);
  assert.match(app, /image prompt ready/);
  assert.match(app, /if\(\$\('inspectorOutput'\)\)/);
  assert.match(css, /\.prompt-preview\{[^}]*white-space:pre-wrap/);
  assert.match(app, /Core values/);
  assert.match(app, /Direction in Studio/);
});

test('layout audit corrections keep prompt, wardrobe, style and stage controls usable', () => {
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(app, /prompt-details/);
  assert.match(app, /wardrobeClearBtn/);
  assert.match(app, /Wardrobe fields cleared/);
  assert.match(app, /pack-examples/);
  assert.match(app, /editorialNote\(activeTake\?'Character direction captured/);
  assert.match(css, /\.portrait-frame\{background:transparent!important/);
  assert.match(css, /\.inspiration-concept button\{min-width:32px;min-height:32px/);
});
