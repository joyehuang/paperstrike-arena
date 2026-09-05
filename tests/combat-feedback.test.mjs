import test from 'node:test';
import assert from 'node:assert/strict';
import './resolve-typescript.mjs';
const { enemySpawn, damageBearing, damageLabel } =
  await import('../app/game/combat-feedback.ts');

const cover = [{ x: 0, z: -10, w: 40, d: 2, h: 4, kind: 'wall' }];
const points = [
  { x: -10, z: -20 },
  { x: 10, z: -20 },
];
test('respawn chooses varied covered points and never falls back beside the player', () => {
  const player = { x: 0, z: 0 },
    death = { x: 0, z: 4 };
  assert.deepEqual(
    enemySpawn(points, player, [], death, cover, () => 0),
    points[0],
  );
  assert.deepEqual(
    enemySpawn(points, player, [], death, cover, () => 0.99),
    points[1],
  );
  assert.equal(
    enemySpawn(points, player, [], death, []),
    null,
    'visible points must wait',
  );
  assert.equal(enemySpawn([{ x: 0, z: -12 }], player, [], death, cover), null);
  assert.equal(
    enemySpawn(points, player, points, death, cover),
    null,
    'occupied points must wait',
  );
  assert.deepEqual(
    enemySpawn(points, player, [], points[0], cover),
    points[1],
    'avoid death location',
  );
});
test('damage directions match camera orientation in every quadrant and after turning', () => {
  const p = { x: 0, z: 0 };
  for (const [x, z, label] of [
    [0, -10, '前方'],
    [10, -10, '右前方'],
    [10, 0, '右侧'],
    [0, 10, '后方'],
    [-10, 0, '左侧'],
  ]) {
    assert.equal(damageLabel(damageBearing(p, { x, z }, 0)), label);
  }
  assert.equal(
    damageLabel(damageBearing(p, { x: 0, z: -10 }, Math.PI / 2)),
    '右侧',
  );
  assert.equal(
    damageLabel(damageBearing(p, { x: 0, z: -10 }, Math.PI)),
    '后方',
  );
  assert.equal(
    damageLabel(damageBearing(p, { x: 0, z: -10 }, Math.PI * 8)),
    '前方',
  );
});
