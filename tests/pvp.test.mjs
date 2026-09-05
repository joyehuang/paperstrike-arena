import test from 'node:test';
import assert from 'node:assert/strict';
import './resolve-typescript.mjs';
const { Battle } = await import('../server/battle.ts');
const { devicePool, parseInput, idleInput } =
  await import('../app/game/pvp-protocol.ts');
const { WEAPONS } = await import('../app/game/rules.ts');
function match() {
  const b = new Battle('desktop');
  b.join('a', 'A');
  b.join('b', 'B');
  b.players.forEach((p) => (p.ready = true));
  assert.equal(b.start('a'), true);
  return b;
}
test('PVP device classification and input validation reject malformed movement', () => {
  assert.equal(devicePool('iPhone'), 'mobile');
  assert.equal(devicePool('Android'), 'mobile');
  assert.equal(devicePool('Windows NT'), 'desktop');
  assert.equal(devicePool('Macintosh', 5), 'mobile');
  assert.equal(parseInput({ forward: NaN }), null);
  assert.equal(parseInput({ ...idleInput(), forward: Infinity }), null);
  assert.equal(parseInput({ ...idleInput(), forward: 900 }).forward, 1);
});
test('PVP requires two ready players and host authority, with four seats maximum', () => {
  const b = new Battle('desktop');
  b.join('a', 'A');
  assert.equal(b.start('a'), false);
  b.join('b', 'B');
  assert.equal(b.start('a'), false);
  b.players.forEach((p) => (p.ready = true));
  assert.equal(b.start('b'), false);
  assert.equal(b.start('a'), true);
  assert.throws(() => b.join('c', 'C'));
  const full = new Battle('mobile');
  for (let i = 0; i < 4; i++) full.join(String(i), 'test');
  assert.throws(() => full.join('5', 'overflow'));
});
test('server prevents fire-rate abuse and auto-reloads the last shot for every weapon', () => {
  for (let w = 0; w < 4; w++) {
    const b = match(),
      p = b.players.get('a');
    p.weapon = w;
    p.clips[w] = 1;
    p.cooldown = 0;
    b.shot('a');
    assert.equal(p.clips[w], 0);
    assert.equal(p.reload, WEAPONS[w].reload);
    const events = b.events.length;
    b.shot('a');
    assert.equal(b.events.length, events);
    for (let i = 0; i < Math.ceil(WEAPONS[w].reload * 30) + 1; i++) b.step();
    assert.equal(p.clips[w], WEAPONS[w].capacity);
    p.clips[w] = 1;
    p.reserves[w] = 0;
    p.cooldown = 0;
    b.shot('a');
    assert.equal(p.reload, 0);
  }
});
test('server damage respects cover and cannot be supplied by clients', () => {
  const b = match(),
    a = b.players.get('a'),
    v = b.players.get('b');
  a.motion.x = v.motion.x = 0;
  a.motion.z = 10;
  v.motion.z = 5;
  a.weapon = 2;
  a.input = idleInput();
  v.immune = 0;
  b.shot('a');
  assert.ok(v.health < 100);
  a.cooldown = 0;
  v.health = 100;
  v.motion.z = -5;
  b.shot('a');
  assert.equal(v.health, 100, 'center crate blocks the shot');
  b.input('a', { ...idleInput(), health: 999, x: 999, forward: 999 });
  b.step();
  assert.ok(a.motion.x < 22);
  assert.equal(a.health, 100);
});
test('stale inputs stop movement and matches end at the authoritative timer', () => {
  const b = match(),
    a = b.players.get('a');
  b.input('a', { ...idleInput(), forward: 1 });
  for (let i = 0; i < 60; i++) b.step();
  assert.ok(Math.abs(a.motion.vz) < 0.01);
  b.remaining = 0.01;
  b.step();
  assert.equal(b.phase, 'ended');
});
