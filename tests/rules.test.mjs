import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  WEAPONS,
  OBSTACLES,
  SPAWNS,
  isBlocked,
  moveBody,
  floorHeight,
  navigationField,
} from '../app/game/rules.ts';

test('all player and opponent spawn positions are clear', () => {
  for (const p of SPAWNS)
    assert.equal(isBlocked(p.x, p.z), false, JSON.stringify(p));
});
test('arena perimeter cannot be crossed in any direction', () => {
  for (const [x, z, dx, dz] of [
    [20, 0, 1, 0],
    [-20, 0, -1, 0],
    [0, 20, 0, 1],
    [0, -20, 0, -1],
  ]) {
    const p = { x, z };
    moveBody(p, dx, dz);
    assert.ok(Math.abs(p.x) <= 20.2 && Math.abs(p.z) <= 20.2);
  }
});
test('movement slides along the side of a crate instead of entering it', () => {
  const p = { x: -4.75, z: 6 };
  moveBody(p, -0.5, 0.3);
  assert.equal(p.x, -4.75);
  assert.equal(p.z, 6.3);
});
test('standing height cannot pass through a crate but a sufficient jump can', () => {
  assert.equal(isBlocked(-6.4, 6, 0), true);
  assert.equal(isBlocked(-6.4, 6, 2.2), false);
  assert.equal(floorHeight(-6.4, 6, 2.2), 2.1);
});
test('steps and raised platform provide valid floors', () => {
  assert.equal(floorHeight(0, 2.7, 0), 0.32);
  assert.equal(floorHeight(1, 1, 0.4), 0.65);
  assert.equal(floorHeight(0, 15, 0), 0);
});
test('every AI spawn has a route to the player around cover', () => {
  const field = navigationField(0, 16);
  for (const spawn of SPAWNS.slice(1))
    assert.ok(
      field[(spawn.z + 20) * 41 + spawn.x + 20] >= 0,
      JSON.stringify(spawn),
    );
});
test('following the distance field reaches the player without crossing obstacles', () => {
  const field = navigationField(0, 16);
  for (const spawn of SPAWNS.slice(1)) {
    let x = spawn.x + 20,
      z = spawn.z + 20;
    for (let i = 0; i < 200 && field[z * 41 + x] > 0; i++) {
      const next = [
        [x - 1, z],
        [x + 1, z],
        [x, z - 1],
        [x, z + 1],
      ]
        .filter(
          ([nx, nz]) =>
            nx >= 0 &&
            nz >= 0 &&
            nx < 41 &&
            nz < 41 &&
            field[nz * 41 + nx] >= 0,
        )
        .sort((a, b) => field[a[1] * 41 + a[0]] - field[b[1] * 41 + b[0]])[0];
      assert.ok(next);
      [x, z] = next;
      assert.equal(isBlocked(x - 20, z - 20, 0, 0.38), false);
    }
    assert.equal(field[z * 41 + x], 0);
  }
});
test('3D ray intersections stop a bullet at cover before a hidden target', () => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 1));
  wall.position.set(0, 1.5, -5);
  const target = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1));
  target.position.set(0, 1, -10);
  wall.updateMatrixWorld(true);
  target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 1.5, 0),
    new THREE.Vector3(0, 0, -1),
  );
  assert.equal(ray.intersectObjects([target, wall])[0].object, wall);
  wall.geometry.dispose();
  wall.material.dispose();
  target.geometry.dispose();
  target.material.dispose();
});
test('the shotgun rewards proximity and the sniper rewards precision', () => {
  assert.ok(WEAPONS[1].pellets * WEAPONS[1].damage > 100);
  assert.ok(WEAPONS[1].range < WEAPONS[3].range);
  assert.ok(WEAPONS[2].damage >= 100);
  assert.ok(WEAPONS[2].zoom < WEAPONS[3].zoom);
  assert.ok(WEAPONS[3].interval < WEAPONS[0].interval);
});
test('map blockers have finite positive dimensions', () => {
  for (const o of OBSTACLES)
    for (const key of ['w', 'd', 'h'])
      assert.ok(Number.isFinite(o[key]) && o[key] > 0);
});
