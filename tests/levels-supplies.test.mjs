import test from 'node:test';
import assert from 'node:assert/strict';
import './resolve-typescript.mjs';
const { LEVELS } = await import('../app/game/levels.ts');
const {
  WEAPONS,
  isBlocked,
  navigationField,
  worldHitDistance,
  createMotion,
  stepMotion,
} = await import('../app/game/rules.ts');
const { collectSupply, absorbDamage, reloadPose } =
  await import('../app/game/supplies.ts');

test('every spawn and pickup on all three maps is clear and reachable from the player spawn', () => {
  for (const level of LEVELS) {
    const field = navigationField(
      level.spawns[0].x,
      level.spawns[0].z,
      level.obstacles,
    );
    for (const point of [...level.spawns, ...level.pickups]) {
      assert.equal(
        isBlocked(point.x, point.z, 0, 0.38, level.obstacles),
        false,
        `${level.name} blocked ${JSON.stringify(point)}`,
      );
      assert.ok(
        field[(point.z + 20) * 41 + point.x + 20] >= 0,
        `${level.name} unreachable ${JSON.stringify(point)}`,
      );
    }
    assert.ok(level.spawns.length > level.enemies);
  }
});

test('collision and bullet bounds follow the selected layout independently', () => {
  assert.equal(isBlocked(-7, 10, 0, 0.34, LEVELS[0].obstacles), false);
  assert.equal(isBlocked(-7, 10, 0, 0.34, LEVELS[1].obstacles), true);
  const from = { x: -7, y: 1.7, z: 17 },
    ray = { x: 0, y: 0, z: -1 };
  assert.ok(
    worldHitDistance(from, ray, 40, LEVELS[1].obstacles) <
      worldHitDistance(from, ray, 40, LEVELS[0].obstacles),
  );
  assert.equal(
    isBlocked(-7, 10, 0, 0.34, LEVELS[0].obstacles),
    false,
    'map lookup cannot mutate another map',
  );
});

test('health, ammo and armor pickups respect capacities; armor is used before health', () => {
  const full = WEAPONS.map((w) => w.reserve);
  assert.equal(collectSupply('health', 85, 0, full).amount, 15);
  assert.equal(collectSupply('health', 100, 0, full).amount, 0);
  assert.equal(collectSupply('shield', 100, 40, full).armor, 50);
  assert.equal(collectSupply('shield', 100, 50, full).amount, 0);
  assert.equal(collectSupply('ammo', 100, 0, full).amount, 0);
  const empty = [0, 0, 0, 0];
  assert.deepEqual(
    collectSupply('ammo', 100, 0, empty).reserves,
    WEAPONS.map((w) => w.capacity * 2),
  );
  assert.deepEqual(
    empty,
    [0, 0, 0, 0],
    'collection does not mutate caller inventory',
  );
  assert.deepEqual(absorbDamage(80, 30, 12), {
    health: 80,
    armor: 18,
    absorbed: 12,
  });
  assert.deepEqual(absorbDamage(80, 5, 12), {
    health: 73,
    armor: 0,
    absorbed: 5,
  });
  assert.deepEqual(absorbDamage(5, 0, 12), {
    health: 0,
    armor: 0,
    absorbed: 0,
  });
});

test('reload poses expose magazine removal, reinsertion and bolt action, returning to rest', () => {
  for (let w = 0; w < 4; w++) {
    assert.equal(reloadPose(w, 0).lift, 0);
    assert.equal(reloadPose(w, 0.4).remove, 1);
    assert.equal(reloadPose(w, 0.69).remove, 0);
    assert.ok(reloadPose(w, 0.81).rack > 0.9);
    const end = reloadPose(w, 1);
    assert.equal(end.lift + end.remove + end.rack + end.shell, 0);
  }
  assert.match(reloadPose(1, 0.3).label, /霰弹/);
  assert.match(reloadPose(2, 0.8).label, /拉栓/);
});

test('rooftop stairs can be climbed using ordinary movement', () => {
  const body = createMotion(-9, 16);
  let top = 0;
  for (let n = 0; n < 360; n++) {
    stepMotion(
      body,
      { forward: 1, right: 0, yaw: 0, speed: 4.6 },
      1 / 120,
      LEVELS[2].obstacles,
    );
    top = Math.max(top, body.feet);
  }
  assert.ok(top >= 0.9, `failed to climb terrace: height ${top}, z ${body.z}`);
});
