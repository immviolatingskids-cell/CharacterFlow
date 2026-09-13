import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets=['maya-cafe-portrait.png','scene-cafe.png','scene-street.png','scene-forest.png','wardrobe-capsule.png'];

test('active-character bitmap assets exist in source and publishable dist',()=>{
  for(const asset of assets){
    const source=path.join(root,'assets',asset);
    const published=path.join(root,'dist','assets',asset);
    assert.ok(fs.statSync(source).size>1000,`${asset} source asset is missing or empty`);
    assert.ok(fs.statSync(published).size>1000,`${asset} dist asset is missing or empty`);
    assert.equal(fs.readFileSync(source).equals(fs.readFileSync(published)),true,`${asset} source/dist mismatch`);
  }
});

test('active-character visual surfaces remain image-backed',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/MAYA_PORTRAIT='assets\/maya-cafe-portrait\.png'/);
  assert.match(app,/createTake\(state,kind,MAYA_PORTRAIT\)/);
  assert.match(app,/sceneImage\(state\.scene\.id\)/);
  assert.match(app,/WARDROBE_THUMBNAIL/);
  assert.match(app,/take\.image\|\|sceneImage/);
  assert.match(app,/scene-thumb.*<img/);
});
