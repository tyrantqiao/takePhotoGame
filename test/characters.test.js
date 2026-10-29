import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModels, poseCharacter } from '../src/characters.js';

test('both actors have upright proportions and articulated head, arms, and legs', () => {
  const models = createModels(new THREE.Scene());
  for (const model of Object.values(models)) {
    const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    assert.ok(size.y > 3, 'full human-height figure');
    assert.ok(size.y / size.x > 2, 'upright silhouette rather than four-legged proportions');
    assert.deepEqual(Object.keys(model.userData.parts).sort(), ['head', 'leftArm', 'leftLeg', 'rightArm', 'rightLeg']);
  }
});
test('posing and restoring an actor restores all joints and exact judging bounds', () => {
  const { rabbit } = createModels(new THREE.Scene());
  const pose = { x: 1, z: -2, yaw: .4, pose: 'lean' };
  poseCharacter(rabbit, pose);
  const before = new THREE.Box3().setFromObject(rabbit);
  poseCharacter(rabbit, { ...pose, pose: 'celebrate' });
  assert.notEqual(rabbit.userData.parts.leftArm.rotation.z, -.11);
  poseCharacter(rabbit, pose);
  const after = new THREE.Box3().setFromObject(rabbit);
  assert.ok(before.min.distanceTo(after.min) < 1e-10);
  assert.ok(before.max.distanceTo(after.max) < 1e-10);
  assert.equal(rabbit.userData.parts.leftArm.rotation.z, -.11);
  assert.equal(rabbit.userData.parts.head.rotation.z, -.19);
});
