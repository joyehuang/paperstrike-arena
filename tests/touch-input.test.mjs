import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickInput } from '../app/game/touch-input.ts';
test('touch stick dead zone, analog strength and diagonal clamping', () => {
  assert.deepEqual(joystickInput(0, 0), { right: 0, forward: 0 });
  assert.deepEqual(joystickInput(2, 2), { right: 0, forward: 0 });
  assert.ok(joystickInput(0, -24).forward < 0.5);
  assert.equal(joystickInput(0, -100).forward, 1);
  const diagonal = joystickInput(100, -100);
  assert.ok(Math.abs(Math.hypot(diagonal.forward, diagonal.right) - 1) < 1e-9);
  assert.equal(joystickInput(0, 100).forward, -1);
});
