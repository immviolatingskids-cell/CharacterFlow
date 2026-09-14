import test from 'node:test';
import assert from 'node:assert/strict';
import {APPEARANCE_CHOICES,CHARACTER_TEMPLATES,INTEREST_CHOICES,LIGHTING_CHOICES,SCENE_PRESETS,WARDROBE_CHOICES,templateDirection} from '../finish-content.js';

test('curated finish content has useful depth in every requested category',()=>{
  assert.ok(APPEARANCE_CHOICES.hair.length>=20);
  assert.ok(APPEARANCE_CHOICES.skin.length>=20);
  assert.ok(APPEARANCE_CHOICES.traits.length>=20);
  assert.ok(SCENE_PRESETS.length>=20);
  assert.ok(LIGHTING_CHOICES.length>=20);
  assert.ok(WARDROBE_CHOICES.length>=20);
  assert.ok(INTEREST_CHOICES.length>=20);
});

test('template direction is a one-time copy that manual editing can override',()=>{
  const template=CHARACTER_TEMPLATES[0],direction=templateDirection(template);
  assert.deepEqual(direction.scene,template.scene);
  assert.deepEqual(direction.wardrobe,template.wardrobe);
  direction.scene.name='Manual scene';
  direction.wardrobe.push('manual piece');
  direction.styleMix.push({packId:'manual',weight:1});
  assert.notEqual(template.scene.name,'Manual scene');
  assert.ok(!template.wardrobe.includes('manual piece'));
  assert.ok(!template.styleMix.some(item=>item.packId==='manual'));
});
