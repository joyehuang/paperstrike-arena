import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createMotion,
  stepMotion,
  PHYSICS_STEP,
  damp,
  viewFov,
  rayBox,
  worldHitDistance,
  obstacleColor,
  OBSTACLES,
} from '../app/game/rules.ts';
import {
  batchSketch,
  CombatEffects,
  renderPixelRatio,
} from '../app/game/rendering.ts';
import { enterCombatView } from '../app/game/presentation.ts';

function simulate(fps, jump = false) {
  const body = createMotion(0, 16);
  if (jump) body.jumpBuffer = 0.13;
  let accumulator = 0,
    apex = 0,
    landings = 0;
  for (let frame = 0; frame < fps * 2; frame++) {
    accumulator += 1 / fps;
    while (accumulator + 1e-10 >= PHYSICS_STEP) {
      const was = body.grounded;
      stepMotion(
        body,
        { forward: 1, right: 0, yaw: 0, speed: 4.6 },
        PHYSICS_STEP,
      );
      apex = Math.max(apex, body.feet);
      if (!was && body.grounded) landings++;
      accumulator -= PHYSICS_STEP;
    }
  }
  return { body, apex, landings };
}
test('30, 60 and 144 Hz frames produce the same running path and jump arc', () => {
  const results = [30, 60, 144].map((fps) => simulate(fps, true));
  for (const r of results) {
    assert.ok(Math.abs(r.body.z - results[0].body.z) < 1e-6);
    assert.ok(Math.abs(r.apex - results[0].apex) < 1e-6);
    assert.equal(r.body.grounded, true);
    assert.equal(r.landings, 1);
    assert.ok(r.apex > 1.1 && r.apex < 1.2);
  }
});
test('ground acceleration eases in, while diagonal movement has no speed bonus', () => {
  const straight = createMotion(),
    diagonal = createMotion();
  stepMotion(
    straight,
    { forward: 1, right: 0, yaw: 0, speed: 7 },
    PHYSICS_STEP,
  );
  assert.ok(Math.hypot(straight.vx, straight.vz) < 2);
  for (let i = 0; i < 100; i++) {
    stepMotion(
      straight,
      { forward: 1, right: 0, yaw: 0, speed: 7 },
      PHYSICS_STEP,
    );
    stepMotion(
      diagonal,
      { forward: 1, right: 1, yaw: 0, speed: 7 },
      PHYSICS_STEP,
    );
  }
  assert.ok(
    Math.abs(
      Math.hypot(straight.vx, straight.vz) -
        Math.hypot(diagonal.vx, diagonal.vz),
    ) < 0.001,
  );
});
test('an extra jump press while airborne does not add vertical velocity', () => {
  const b = createMotion();
  b.jumpBuffer = 0.13;
  for (let i = 0; i < 22; i++)
    stepMotion(b, { forward: 0, right: 0, yaw: 0, speed: 4.6 }, PHYSICS_STEP);
  const before = b.vy;
  b.jumpBuffer = 0.13;
  stepMotion(b, { forward: 0, right: 0, yaw: 0, speed: 4.6 }, PHYSICS_STEP);
  assert.ok(b.vy < before);
});
test('camera easing is consistent across refresh rates', () => {
  const result = (fps) => {
    let x = 0;
    for (let i = 0; i < fps; i++) x = damp(x, 1, 7, 1 / fps);
    return x;
  };
  assert.ok(Math.abs(result(30) - result(144)) < 1e-9);
});
test('sprint adds only three degrees horizontally; scope provides true 4x magnification', () => {
  const aspect = 16 / 9,
    base = viewFov(aspect),
    sprint = viewFov(aspect, 1, 1),
    scope = viewFov(aspect, 4);
  assert.ok(sprint - base < 4);
  assert.ok(
    Math.abs(
      Math.tan((base * Math.PI) / 360) / Math.tan((scope * Math.PI) / 360) - 4,
    ) < 1e-10,
  );
  assert.ok(viewFov(21 / 9) < base);
});
test('analytic cover queries match ray geometry and reject targets behind cover', () => {
  const origin = { x: 0, y: 1.5, z: 10 },
    direction = { x: 0, y: 0, z: -1 };
  const distance = worldHitDistance(origin, direction, 50);
  assert.ok(distance < 11);
  assert.equal(
    rayBox(
      origin,
      direction,
      { x: 10, y: 0, z: -20 },
      { x: 11, y: 3, z: -19 },
      50,
    ),
    null,
  );
  assert.equal(
    rayBox(origin, direction, { x: -1, y: 0, z: 3 }, { x: 1, y: 3, z: 4 }, 50),
    6,
  );
});
test('all colored meshes retain their bounds after reducing to a single draw', () => {
  const root = new THREE.Group();
  root.position.set(5, 2, 3);
  for (let i = 0; i < 50; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 3),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0x5588cc : 0xdd8855 }),
    );
    mesh.position.set(i * 2, 1, 0);
    root.add(mesh);
  }
  const before = new THREE.Box3().setFromObject(root);
  const summary = batchSketch(root);
  const after = new THREE.Box3().setFromObject(root);
  assert.equal(summary.draws, 1);
  assert.equal(root.children.length, 1);
  assert.ok(before.min.distanceTo(after.min) < 1e-6);
  assert.ok(before.max.distanceTo(after.max) < 1e-6);
  assert.ok(root.children[0].geometry.hasAttribute('color'));
});
test('animated branches remain independent when static pieces are batched', () => {
  const root = new THREE.Group(),
    leg = new THREE.Group();
  leg.userData.dynamic = true;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshLambertMaterial(),
  );
  leg.add(mesh);
  root.add(leg);
  batchSketch(root);
  assert.equal(mesh.parent, leg);
});
test('sustained shooting has a fixed two-draw effect pool', () => {
  const effects = new CombatEffects();
  for (let i = 0; i < 500; i++) {
    effects.burst(new THREE.Vector3(), 0xff6633, 10);
    effects.tracer(new THREE.Vector3(), new THREE.Vector3(0, 0, -10), 0xffaa66);
    effects.update(1 / 60);
  }
  assert.equal(effects.root.children.length, 2);
  assert.equal(effects.root.children[0].count, 128);
  effects.update(1);
  assert.ok(
    effects.root.children[1].geometry.attributes.position.array.every(
      (v) => v === 0,
    ),
  );
});
test('4K and high-DPI rendering stay inside a bounded pixel budget', () => {
  for (const [w, h, dpr] of [
    [1920, 1080, 2],
    [3840, 2160, 2],
    [1200, 700, 2],
  ]) {
    const ratio = renderPixelRatio(w, h, dpr);
    assert.ok(w * h * ratio ** 2 <= 1_900_001);
    assert.ok(ratio <= 1.35);
  }
});
test('the arena uses distinct building and cover colors', () => {
  assert.ok(new Set(OBSTACLES.map(obstacleColor)).size >= 5);
});
test('launch requests raw input before fullscreen and tolerates fullscreen denial', async () => {
  const previous = globalThis.document,
    calls = [];
  globalThis.document = { fullscreenEnabled: true, fullscreenElement: null };
  try {
    enterCombatView(
      {
        requestPointerLock: (options) => {
          calls.push(options?.unadjustedMovement ? 'raw' : 'pointer');
          return Promise.resolve();
        },
      },
      {
        requestFullscreen: () => {
          calls.push('fullscreen');
          return Promise.reject(Error('unavailable'));
        },
      },
      () => assert.fail('Pointer lock should remain successful'),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['raw', 'fullscreen']);
  } finally {
    globalThis.document = previous;
  }
});
test('raw-input unsupported falls back to ordinary pointer lock', async () => {
  const previous = globalThis.document,
    calls = [];
  globalThis.document = { fullscreenEnabled: false, fullscreenElement: null };
  try {
    enterCombatView(
      {
        requestPointerLock: (options) => {
          calls.push(options ? 'raw' : 'pointer');
          return options
            ? Promise.reject(
                Object.assign(Error(), { name: 'NotSupportedError' }),
              )
            : Promise.resolve();
        },
      },
      {},
      () => assert.fail('Fallback should succeed'),
    );
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(calls, ['raw', 'pointer']);
  } finally {
    globalThis.document = previous;
  }
});
