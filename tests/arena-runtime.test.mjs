import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import { batchSketch, CombatEffects } from '../app/game/rendering.ts';
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
function fixture() {
  const prior = globalThis.document;
  globalThis.document = { createElement: canvas };
  try {
    const arena = Object.create(Arena.prototype);
    Object.assign(arena, {
      scene: new THREE.Scene(),
      gun: new THREE.Group(),
      bots: [],
      decalTextures: [],
      rng: 1,
      camera: new THREE.PerspectiveCamera(68, 16 / 9, 0.06, 130),
      effects: new CombatEffects(),
      state: {
        phase: 'running',
        health: 100,
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

test('the actual assembled arena stays below 80 visible draws, including bots and gun', () => {
  const arena = fixture();
  const count = drawCount(arena.scene) + drawCount(arena.gun) + 2;
  assert.ok(count < 80, `draw budget exceeded: ${count}`);
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
