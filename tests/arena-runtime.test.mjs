import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import './resolve-typescript.mjs';
import { batchSketch, CombatEffects } from '../app/game/rendering.ts';
const { LEVELS } = await import('../app/game/levels.ts');
const { createMotion, PHYSICS_STEP } = await import('../app/game/rules.ts');
const source = fs.readFileSync(
  new URL('../app/game/arena.ts', import.meta.url),
  'utf8',
);
const output = ts
  .transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replaceAll("from './", "from '../app/game/")
  .replace(/from '(\.\.\/app\/game\/[^']+)'/g, "from '$1.ts'");
fs.mkdirSync(new URL('../work/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../work/arena-runtime.mjs', import.meta.url), output);
const { Arena, WEAPONS } = await import('../work/arena-runtime.mjs');

const canvas = () => ({
  width: 0,
  height: 0,
  getContext: () => ({ fillText() {}, translate() {}, rotate() {} }),
});
function fixture(levelIndex = 0) {
  const prior = globalThis.document;
  globalThis.document = { createElement: canvas };
  try {
    const arena = Object.create(Arena.prototype);
    Object.assign(arena, {
      scene: new THREE.Scene(),
      gun: new THREE.Group(),
      bots: [],
      level: LEVELS[levelIndex],
      pickups: [],
      pickupTime: 0,
      elapsed: 0,
      keys: new Set(),
      motion: createMotion(),
      previousMotion: { x: 0, z: 16, feet: 0 },
      stepDistance: 0,
      reloadStage: -1,
      reloadTime: 0,
      reserves: WEAPONS.map((w) => w.reserve),
      map: { getContext: () => null },
      renderer: { domElement: {} },
      audioEngine: { play() {}, stopMusic() {} },
      decalTextures: [],
      rng: 1,
      camera: new THREE.PerspectiveCamera(68, 16 / 9, 0.06, 130),
      effects: new CombatEffects(),
      state: {
        phase: 'running',
        health: 100,
        armor: 0,
        level: levelIndex,
        won: false,
        reloadProgress: 0,
        reloadLabel: '',
        pickup: null,
        kills: 0,
        deaths: 0,
        time: 180,
        weapon: 0,
        ammo: 12,
        reserve: 72,
        reloading: false,
        aiming: false,
        sprinting: false,
        crouching: false,
        shots: 0,
        hits: 0,
        feed: [],
        lastHit: null,
        lastHurt: null,
        fps: 60,
      },
      clips: WEAPONS.map((w) => w.capacity),
      cooldown: 0,
      hitTime: 0,
      hurtTime: 0,
      hitSerial: 0,
      notify() {},
      pitch: 0,
      yaw: 0,
    });
    arena.buildWorld();
    batchSketch(arena.scene);
    arena.buildGun();
    arena.spawnBots();
    arena.buildPickups();
    arena.camera.position.set(0, 1.67, 10);
    return arena;
  } finally {
    globalThis.document = prior;
  }
}
function drawCount(root) {
  let count = 0;
  root.traverseVisible((o) => {
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.Line ||
      o instanceof THREE.Sprite
    )
      count++;
  });
  return count;
}

test('each assembled map stays below 110 draws including supplies, bots and moving gun parts', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const arena = fixture(i);
    const count = drawCount(arena.scene) + drawCount(arena.gun) + 2;
    assert.ok(count < 110, `map ${i} draw budget exceeded: ${count}`);
    assert.equal(arena.bots.length, LEVELS[i].enemies);
  }
});
test('a real shot updates enemy health, headshot damage and feedback consistently', () => {
  const arena = fixture(),
    bot = arena.bots[0];
  bot.group.position.set(0, 0, 5);
  arena.fire();
  assert.equal(bot.health, 49);
  assert.equal(arena.state.lastHit.damage, 51);
  assert.equal(arena.state.lastHit.health, 49);
  assert.equal(arena.state.lastHit.headshot, true);
  assert.equal(arena.state.ammo, 11);
  assert.ok(bot.healthBar.scale.x < 0.79);
  arena.cooldown = 0;
  arena.fire();
  assert.equal(arena.state.kills, 1);
  assert.equal(arena.state.lastHit.killed, true);
  assert.equal(arena.state.lastHit.health, 0);
  assert.equal(bot.alive, false);
});
test('a central crate blocks a real shot before it reaches the enemy', () => {
  const arena = fixture(),
    bot = arena.bots[0];
  bot.group.position.set(0, 0, -5);
  arena.fire();
  assert.equal(bot.health, 100);
  assert.equal(arena.state.lastHit, null);
  assert.equal(arena.state.kills, 0);
});

test('actual supplies heal once, preserve unusable pickups and respawn after their timer', () => {
  const arena = fixture(),
    p = arena.pickups.find((p) => p.kind === 'health');
  arena.motion.x = p.x;
  arena.motion.z = p.z;
  arena.updatePickups(0.1);
  assert.equal(p.remaining, 0, 'full HP must not consume a health pack');
  arena.state.health = 35;
  arena.updatePickups(0.1);
  assert.equal(arena.state.health, 75);
  assert.ok(p.remaining > 0);
  assert.match(arena.state.pickup.text, /40/);
  arena.updatePickups(1);
  assert.equal(arena.state.health, 75, 'no duplicate collection');
  arena.motion.x = 0;
  arena.motion.z = 16;
  arena.updatePickups(20);
  assert.equal(p.remaining, 0);
  assert.equal(p.group.visible, true);
});

test('supply pickup never reaches through a wall or across a jump', () => {
  const arena = fixture(),
    p = arena.pickups[0];
  arena.state.health = 20;
  p.x = -0.7;
  p.z = -1;
  arena.motion.x = -0.7;
  arena.motion.z = -1;
  arena.motion.feet = 1.2;
  arena.updatePickups(0.1);
  assert.equal(arena.state.health, 20);
  arena.motion.feet = 0;
  arena.motion.x = 0;
  arena.updatePickups(0.1);
  assert.equal(arena.state.health, 20, 'crate blocks pickup ray');
});

test('each weapon transfers ammunition exactly once after its reload and cancels on switching', () => {
  for (let w = 0; w < WEAPONS.length; w++) {
    const arena = fixture();
    arena.selectWeapon(w);
    arena.state.ammo = arena.clips[w] = 0;
    assert.equal(arena.reload(), true);
    for (let t = 0; t < WEAPONS[w].reload - 0.05; t += PHYSICS_STEP)
      arena.updatePlayer(PHYSICS_STEP);
    assert.equal(arena.state.ammo, 0);
    assert.ok(arena.state.reloadProgress >= 90);
    for (let n = 0; n < 20; n++) arena.updatePlayer(PHYSICS_STEP);
    assert.equal(arena.state.reloading, false);
    assert.equal(arena.state.ammo, WEAPONS[w].capacity);
    assert.equal(arena.state.reserve, WEAPONS[w].reserve - WEAPONS[w].capacity);
    const reserve = arena.state.reserve;
    arena.updatePlayer(1);
    assert.equal(arena.state.reserve, reserve);
    arena.state.ammo = arena.clips[w] = 1;
    arena.reload();
    arena.updatePlayer(0.2);
    arena.selectWeapon((w + 1) % 4);
    arena.updatePlayer(3);
    assert.equal(arena.clips[w], 1);
    assert.equal(arena.reserves[w], reserve);
  }
});

test('level selection rebuilds geometry and resets match, supplies and navigation state', () => {
  const arena = fixture();
  arena.state.phase = 'paused';
  arena.state.health = 20;
  arena.state.armor = 25;
  arena.state.kills = 5;
  arena.pickups[0].remaining = 18;
  const previous = globalThis.document;
  globalThis.document = { createElement: canvas };
  try {
    for (const i of [1, 2, 0, 2]) {
      assert.equal(arena.selectLevel(i), true);
      assert.equal(arena.state.phase, 'ready');
      assert.equal(arena.state.level, i);
      assert.equal(arena.state.health, 100);
      assert.equal(arena.state.armor, 0);
      assert.equal(arena.state.kills, 0);
      assert.equal(arena.bots.length, LEVELS[i].enemies);
      assert.equal(arena.pickups.length, LEVELS[i].pickups.length);
      assert.ok(arena.pickups.every((p) => p.remaining === 0));
      assert.equal(arena.motion.x, LEVELS[i].spawns[0].x);
      assert.equal(arena.motion.z, LEVELS[i].spawns[0].z);
      assert.ok(drawCount(arena.scene) + drawCount(arena.gun) < 110);
    }
    arena.state.phase = 'running';
    assert.equal(arena.selectLevel(1), false, 'live combat cannot switch map');
  } finally {
    globalThis.document = previous;
  }
});

test('the final required kill ends the level and records a win', () => {
  const arena = fixture();
  arena.state.kills = LEVELS[0].goal - 1;
  arena.bots[0].health = 20;
  arena.bots[0].group.position.set(0, 0, 5);
  const previous = globalThis.document;
  globalThis.document = { pointerLockElement: null };
  try {
    arena.fire();
    assert.equal(arena.state.phase, 'ended');
    assert.equal(arena.state.won, true);
    assert.equal(arena.state.kills, LEVELS[0].goal);
  } finally {
    globalThis.document = previous;
  }
});

test('reloading visibly moves the magazine or shell within the view without moving the aim camera', () => {
  for (let w = 0; w < 4; w++) {
    const arena = fixture();
    arena.selectWeapon(w);
    Object.assign(arena, {
      recoil: 0,
      swayX: 0,
      swayY: 0,
      bob: 0,
      bobAmplitude: 0,
      sprintBlend: 0,
      flashTime: 0,
    });
    const view = new THREE.PerspectiveCamera(60, 16 / 9, 0.01, 10);
    const orientation = arena.camera.quaternion.clone();
    arena.updateGun(1, true);
    arena.gun.updateMatrixWorld(true);
    const part = arena.magazine || arena.reloadShell;
    const before = part.getWorldPosition(new THREE.Vector3()).project(view);
    arena.state.reloading = true;
    arena.reloadTime = WEAPONS[w].reload * 0.6;
    arena.updateGun(1, true);
    arena.gun.updateMatrixWorld(true);
    const during = part.getWorldPosition(new THREE.Vector3()).project(view);
    assert.ok(
      Math.abs(during.x) < 0.92 && Math.abs(during.y) < 0.92,
      `${WEAPONS[w].name}: reload part cropped at ${during.toArray()}`,
    );
    assert.ok(
      before.distanceTo(during) > 0.15,
      'reload must create a visible screen-space change',
    );
    assert.ok(arena.camera.quaternion.equals(orientation));
    assert.ok(
      part.children.some((child) => child.name === 'batched-surfaces'),
      'moving part retains rendered geometry',
    );
  }
});
