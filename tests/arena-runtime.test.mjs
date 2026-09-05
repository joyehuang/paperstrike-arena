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
      sensitivity: 1,
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

test('PVP client forwards shots while only server snapshots can damage opponents', async () => {
  const { Battle } = await import('../server/battle.ts');
  const battle = new Battle('desktop');
  battle.join('a', 'A');
  battle.join('b', 'B');
  battle.players.forEach((p) => (p.ready = true));
  battle.start('a');
  const arena = fixture(),
    sent = [];
  arena.pvp = { id: 'a', send: (kind, data) => sent.push({ kind, data }) };
  arena.pvpEvent = 0;
  arena.applyPvp(battle.snapshot());
  arena.cooldown = 0;
  arena.bots[0].group.position.set(
    arena.camera.position.x,
    0,
    arena.camera.position.z - 5,
  );
  arena.fire();
  assert.ok(sent.some((m) => m.kind === 'fire'));
  assert.equal(arena.bots[0].health, 100);
  battle.players.get('a').health = 42;
  battle.players.get('a').clips[3] = 2;
  arena.applyPvp(battle.snapshot());
  assert.equal(arena.state.health, 42);
  assert.equal(arena.state.ammo, 2);
  const pos = arena.bots[0].group.position.clone();
  arena.updateBots(0.1);
  assert.notEqual(
    arena.bots[0].group.position.distanceTo(pos),
    0,
    'remote movement follows server interpolation',
  );
});

test('every weapon automatically reloads immediately after its last real shot', () => {
  for (let w = 0; w < 4; w++) {
    const arena = fixture();
    arena.selectWeapon(w);
    arena.cooldown = 0;
    arena.state.ammo = arena.clips[w] = 1;
    arena.state.aiming = true;
    arena.fire();
    assert.equal(arena.state.ammo, 0);
    assert.equal(arena.state.shots, 1);
    assert.equal(arena.state.reloading, true);
    assert.equal(arena.state.aiming, false);
    assert.equal(arena.reloadTime, WEAPONS[w].reload);
    arena.fire();
    assert.equal(arena.state.shots, 1, 'reload cannot create a phantom shot');
    arena.updatePlayer(WEAPONS[w].reload);
    assert.equal(arena.state.ammo, WEAPONS[w].capacity);
    arena.state.ammo = arena.clips[w] = 1;
    arena.state.reserve = arena.reserves[w] = 0;
    arena.cooldown = 0;
    arena.fire();
    assert.equal(
      arena.state.reloading,
      false,
      'no reserve cannot manufacture ammunition',
    );
    assert.equal(arena.state.ammo, 0);
  }
});

test('training targets cannot damage players and reuse static and moving target slots', () => {
  const arena = fixture(LEVELS.findIndex((l) => l.practice));
  const start = arena.bots.map((b) => b.group.position.clone());
  arena.elapsed = 1;
  arena.updateBots(1);
  assert.equal(arena.state.health, 100);
  assert.equal(arena.state.phase, 'running');
  assert.equal(arena.bots[0].group.position.x, start[0].x);
  assert.notEqual(arena.bots[1].group.position.x, start[1].x);
  const target = arena.bots[0];
  target.group.position.set(0, 0, 5);
  arena.fire();
  arena.cooldown = 0;
  arena.fire();
  assert.equal(arena.state.kills, 1);
  assert.equal(
    arena.state.phase,
    'running',
    'practice has no kill victory threshold',
  );
  arena.updateBots(1);
  assert.equal(target.alive, false);
  arena.updateBots(1.1);
  assert.equal(target.alive, true);
  assert.equal(target.health, 100);
  assert.equal(arena.bots.length, 5);
});
test('practice unlimited reserve is optional and still requires a reload', () => {
  const arena = fixture(LEVELS.findIndex((l) => l.practice));
  arena.trainingUnlimited = true;
  arena.state.reserve = arena.reserves[0] = 0;
  arena.state.ammo = arena.clips[0] = 0;
  arena.updatePlayer(PHYSICS_STEP);
  assert.equal(arena.state.reserve, WEAPONS[0].reserve);
  assert.equal(arena.state.ammo, 0);
  assert.equal(arena.reload(), true);
  arena.updatePlayer(WEAPONS[0].reload);
  assert.equal(arena.state.ammo, WEAPONS[0].capacity);
  arena.trainingUnlimited = false;
  arena.state.reserve = arena.reserves[0] = 3;
  arena.updatePlayer(PHYSICS_STEP);
  assert.equal(arena.state.reserve, 3);
});
test('touch movement is analog, aim is bounded and pausing releases held controls', () => {
  const arena = fixture();
  arena.touchMode = true;
  arena.touchMove(0.4, 0);
  for (let i = 0; i < 60; i++) arena.updatePlayer(PHYSICS_STEP);
  assert.ok(Math.abs(arena.motion.vz) < 2);
  arena.touchMove(1, 0);
  arena.updatePlayer(PHYSICS_STEP);
  assert.equal(arena.state.sprinting, true);
  arena.touchLook(10, 10000);
  assert.ok(arena.yaw < 0);
  assert.equal(arena.pitch, -1.35);
  arena.touchAction('aim');
  arena.touchAction('crouch');
  arena.updatePlayer(PHYSICS_STEP);
  assert.equal(arena.state.aiming, true);
  assert.equal(arena.state.crouching, true);
  arena.touchAction('jump');
  assert.ok(arena.motion.jumpBuffer > 0);
  const prior = globalThis.document;
  globalThis.document = {};
  try {
    arena.pause();
  } finally {
    globalThis.document = prior;
  }
  assert.equal(arena.touchForward, 0);
  assert.equal(arena.state.aiming, false);
  assert.equal(arena.held, false);
  arena.touchMove(1, 0);
  arena.touchAction('fire');
  assert.equal(arena.touchForward, 0);
  assert.equal(arena.held, false);
});
test('touch launch works without pointer lock or fullscreen support', () => {
  const arena = fixture();
  arena.touchMode = true;
  arena.state.phase = 'ready';
  arena.audioEngine.unlock = () => {};
  arena.renderer.domElement.focus = () => {};
  arena.error = () => {};
  const prior = globalThis.document;
  globalThis.document = { fullscreenEnabled: false };
  try {
    arena.start();
  } finally {
    globalThis.document = prior;
  }
  assert.equal(arena.state.phase, 'running');
  assert.equal(arena.state.health, 100);
});

test('repeated bot deaths reuse a fixed roster and only respawn safely', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    if (LEVELS[level].practice) continue;
    const arena = fixture(level);
    const roster = [...arena.bots];
    for (let round = 0; round < 12; round++) {
      arena.bots.forEach((b) => {
        b.alive = false;
        b.group.visible = false;
        b.respawn = 0;
      });
      arena.updateBots(0.01);
      arena.emit();
      assert.deepEqual(arena.bots, roster, 'reuse existing bots');
      assert.equal(arena.bots.length, LEVELS[level].enemies);
      assert.equal(
        arena.state.aliveEnemies,
        arena.bots.filter((b) => b.alive).length,
      );
      for (const bot of arena.bots.filter((b) => b.alive)) {
        assert.ok(bot.group.position.distanceTo(arena.camera.position) >= 18);
        assert.equal(bot.cooldown, 2.5);
      }
    }
    arena.level = { ...arena.level, spawns: [{ x: 0, z: 10 }] };
    arena.bots.forEach((b) => {
      b.alive = false;
      b.respawn = 0;
    });
    arena.updateBots(0.01);
    assert.ok(arena.bots.every((b) => !b.alive && b.respawn === 1));
  }
});

test('incoming-hit direction follows turns without restarting its hit identity', () => {
  const arena = fixture();
  arena.hurtTime = 1;
  arena.state.lastHurt = {
    id: 1,
    sourceX: 0,
    sourceZ: 0,
    angle: 0,
    damage: 8,
    absorbed: 0,
    target: 1,
  };
  arena.emit();
  arena.yaw = Math.PI / 2;
  arena.emit();
  assert.ok(Math.abs(arena.state.lastHurt.angle - Math.PI / 2) < 0.02);
  assert.equal(arena.state.lastHurt.id, 1);
});

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

test('reload hands hold the magazine and animated parts stay visible throughout the sequence', () => {
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
    arena.state.reloading = true;
    for (let frame = 0; frame <= 120; frame++) {
      const p = frame / 120;
      arena.reloadTime = WEAPONS[w].reload * (1 - p);
      arena.updateGun(WEAPONS[w].reload / 120, true);
      arena.gun.updateMatrixWorld(true);
      if (p >= 0.2 && p <= 0.85) {
        for (const part of [
          arena.magazine,
          arena.reloadShell,
          arena.supportHand,
        ].filter(Boolean)) {
          if (!part.visible) continue;
          const screen = part
            .getWorldPosition(new THREE.Vector3())
            .project(view);
          assert.ok(
            Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1,
            `weapon ${w} progress ${p}: part outside screen ${screen.toArray()}`,
          );
        }
      }
      if (arena.magazine && p >= 0.2 && p <= 0.65)
        assert.ok(
          arena.supportHand.position.distanceTo(arena.magazine.position) < 0.12,
        );
    }
    assert.ok(
      arena.supportHand.position.distanceTo(arena.supportHand.userData.rest) <
        0.001,
    );
  }
});

test('reload mechanical cues occur once at insertion and action contact points', () => {
  for (let w = 0; w < 4; w++) {
    const arena = fixture();
    arena.selectWeapon(w);
    arena.state.ammo = arena.clips[w] = 0;
    const cues = [];
    arena.audioEngine.play = (type) => cues.push(type);
    arena.reload();
    for (let t = 0; t < WEAPONS[w].reload + 0.1; t += PHYSICS_STEP)
      arena.updatePlayer(PHYSICS_STEP);
    assert.deepEqual(
      cues,
      w === 1
        ? ['reload', 'magIn', 'magIn', 'magIn', 'bolt']
        : ['reload', 'magOut', 'magIn', 'bolt'],
    );
  }
});

test('PVP acknowledgements preserve predicted movement and cache overhead nicknames', async () => {
  const { Battle } = await import('../server/battle.ts');
  const battle = new Battle('desktop');
  battle.join('a', 'A');
  battle.join('b', '朋友 B');
  const arena = fixture();
  arena.pvp = { id: 'a', send() {} };
  arena.pvpEvent = 0;
  arena.applyPvp(battle.snapshot());
  const label = arena.bots[0].group.getObjectByName('player-name');
  assert.ok(label.isSprite, 'nickname always faces the camera');
  assert.equal(label.userData.playerName, '朋友 B');
  const version = label.material.map.version;
  const p = battle.players.get('a');
  p.input.seq = 42;
  arena.pvpHistory = new Map([[42, { x: p.motion.x, z: p.motion.z }]]);
  arena.motion.x = p.motion.x + 0.7;
  arena.applyPvp(battle.snapshot());
  assert.equal(
    arena.motion.x,
    p.motion.x + 0.7,
    'do not pull current movement back to old server position',
  );
  assert.equal(
    label.material.map.version,
    version,
    'unchanged name does not upload a new texture',
  );
});

test('PVP screen labels remain legible, obey cover, and never label yourself', async () => {
  const { Battle } = await import('../server/battle.ts');
  const battle = new Battle('desktop');
  battle.join('a', '自己');
  battle.join('b', '朋友的昵称');
  const arena = fixture();
  arena.pvp = { id: 'a', send() {} };
  arena.pvpEvent = 0;
  arena.applyPvp(battle.snapshot());
  const nodes = [];
  arena.host = {
    clientWidth: 1280,
    clientHeight: 720,
    appendChild(node) {
      nodes.push(node);
    },
  };
  const prior = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      dataset: {},
      style: {},
      hidden: false,
      textContent: '',
      remove() {},
    }),
  };
  try {
    arena.camera.position.set(0, 1.72, 10);
    arena.camera.lookAt(0, 1.72, 0);
    arena.camera.updateMatrixWorld(true);
    arena.bots[0].group.position.set(0, 0, 5);
    arena.updateNameplates();
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].textContent, '朋友的昵称');
    assert.equal(nodes[0].hidden, false);
    assert.ok(nodes[0].style.transform.includes('translate('));
    arena.bots[0].group.position.set(0, 0, -5);
    arena.updateNameplates();
    assert.equal(
      nodes[0].hidden,
      true,
      'central cover hides the overhead label',
    );
    arena.bots[0].group.position.set(0, 0, 15);
    arena.updateNameplates();
    assert.equal(nodes[0].hidden, true, 'behind-camera label is hidden');
  } finally {
    globalThis.document = prior;
  }
});

test('PVP kill feed names both players and does not repeat snapshot events', async () => {
  const { Battle } = await import('../server/battle.ts');
  const battle = new Battle('desktop');
  battle.join('a', '甲');
  battle.join('b', '乙');
  const arena = fixture();
  arena.pvp = { id: 'a', send() {} };
  arena.pvpEvent = 0;
  const snapshot = battle.snapshot();
  snapshot.events = [
    { id: 1, kind: 'hit', actor: 'a', target: 'b', health: 0, damage: 100 },
  ];
  arena.applyPvp(snapshot);
  arena.applyPvp(snapshot);
  assert.equal(arena.state.feed.length, 1);
  assert.equal(arena.state.feed[0].text, '甲 击杀了 乙');
});
