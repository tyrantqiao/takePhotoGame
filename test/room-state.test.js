import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomAuthority, MAX_PLAYERS, validCamera, validImage } from '../src/room-state.js';

const image = 'data:image/jpeg;base64,/9j/AA==';
const camera = { position: [1, 2, 6], quaternion: [0, 0, 0, 1], fov: 40 };
function setup() {
  let now = 10000;
  const authority = new RoomAuthority('host', '主播', (shot, pose, challenge) => shot.fov + pose.x + challenge, () => now);
  authority.join('guest', '摄影师');
  const start = (challenge = 0) => authority.command('host', { type: 'start', duration: 30, challenge });
  const photo = (extra = {}) => ({ type: 'photo', roundId: authority.state.round.id, seq: authority.state.model.seq, image, camera, score: 100, ...extra });
  return { authority, start, photo, advance(ms) { now += ms; } };
}
test('only host can start, only assigned model can move; role changes are locked during rounds', () => {
  const { authority: a, start } = setup();
  assert.ok(a.command('guest', { type: 'start', duration: 30, challenge: 0 }));
  assert.ok(a.command('guest', { type: 'move', dx: 1, dz: 0, turn: 0 }));
  assert.equal(a.command('host', { type: 'role', id: 'guest' }), null);
  assert.equal(start(), null);
  assert.ok(a.command('host', { type: 'role', id: 'host' }));
  assert.ok(a.command('host', { type: 'move', dx: 1, dz: 0, turn: 0 }));
  assert.equal(a.command('guest', { type: 'move', dx: .1, dz: 0, turn: .1 }), null);
});
test('host recomputes scores, keeps best photo, hides images until deadline', () => {
  const { authority: a, start, photo, advance } = setup(); start(2);
  assert.equal(a.command('guest', photo()), null);
  assert.equal(a.state.entries[0].score, 42); // Client-supplied 100 is ignored.
  assert.equal(a.snapshot().entries[0].image, undefined);
  advance(600);
  assert.equal(a.command('guest', photo({ camera: { ...camera, fov: 30 } })), null);
  assert.equal(a.state.entries[0].score, 42);
  advance(600);
  a.command('guest', photo({ camera: { ...camera, fov: 60 } }));
  assert.equal(a.state.entries[0].score, 62);
  advance(30000); assert.equal(a.tick(), true);
  assert.equal(a.snapshot().entries[0].image, image);
  assert.ok(a.command('guest', photo()));
});
test('stationary models stay valid after five seconds, stale poses and stale rounds are rejected', () => {
  const { authority: a, start, photo, advance } = setup(); start(); advance(6000);
  assert.equal(a.command('guest', photo()), null);
  const oldPhoto = photo();
  a.command('host', { type: 'move', dx: .1, dz: 0, turn: 0 });
  assert.ok(a.command('guest', oldPhoto));
  advance(30000); a.tick(); start();
  assert.ok(a.command('guest', oldPhoto));
  assert.equal(a.state.entries.length, 0);
});
test('rejects invalid packets, forged scores, model submissions and stale player identities', () => {
  const { authority: a, start, photo } = setup(); start();
  for (const packet of [null, {}, photo({ image: 'javascript:alert(1)' }), photo({ camera: { ...camera, position: [NaN, 0, 0] } }), photo({ seq: -1 })]) assert.ok(a.command('guest', packet));
  assert.ok(a.command('host', photo()));
  assert.ok(a.command('stranger', photo()));
  assert.equal(a.state.entries.length, 0);
});
test('limits room capacity and movement; a disconnected model ends the round', () => {
  const { authority: a, start } = setup();
  for (let i = 2; i < MAX_PLAYERS; i++) assert.equal(a.join('p' + i, 'Guest'), true);
  assert.equal(a.join('overflow', 'Guest'), false);
  assert.equal(a.join('guest', 'Duplicate'), false);
  a.command('host', { type: 'role', id: 'guest' }); start();
  a.command('guest', { type: 'move', dx: 100, dz: -100, turn: Infinity });
  assert.equal(a.state.model.x, 0);
  a.command('guest', { type: 'move', dx: 100, dz: -100, turn: 100 });
  assert.equal(a.state.model.x, .2); assert.equal(a.state.model.z, -.2);
  a.leave('guest'); assert.equal(a.state.round.phase, 'results'); assert.equal(a.state.modelId, 'host');
});
test('photo payload limits prevent unsupported image URLs and unbounded camera values', () => {
  assert.equal(validImage(image), true);
  assert.equal(validImage('data:image/jpeg;base64,' + 'a'.repeat(160000)), false);
  assert.equal(validImage('https://example.com/image.jpg'), false);
  assert.equal(validCamera(camera), true);
  for (const invalid of [{ ...camera, fov: 0 }, { ...camera, position: [100, 0, 0] }, { ...camera, quaternion: [1, 1, 1, 1] }]) assert.equal(validCamera(invalid), false);
});

test('maps are host-controlled and locked during competition; changing maps invalidates old pose history', () => {
  const { authority: a, start } = setup();
  assert.equal(a.state.location, 'kyoto');
  assert.ok(a.command('guest', { type: 'location', location: 'paris' }));
  assert.ok(a.command('host', { type: 'location', location: 'unknown' }));
  a.command('host', { type: 'move', dx: .2, dz: .2, turn: .1 });
  const oldSeq = a.state.model.seq;
  assert.equal(a.command('host', { type: 'location', location: 'santorini' }), null);
  assert.equal(a.state.location, 'santorini');
  assert.equal(a.state.model.x, 0); assert.equal(a.state.model.z, 0);
  assert.equal(a.history.has(oldSeq), false);
  start();
  assert.ok(a.command('host', { type: 'location', location: 'paris' }));
  assert.equal(a.state.location, 'santorini');
  assert.equal(a.snapshot().location, 'santorini');
});
