/** Radial dead zone and bounded analog travel, independent of device pixels. */
export function joystickInput(dx: number, dy: number, radius = 48) {
  const length = Math.hypot(dx, dy);
  const amount = Math.min(1, length / radius);
  if (amount < 0.12) return { right: 0, forward: 0 };
  const strength = (amount - 0.12) / 0.88;
  return {
    right: (dx / length) * strength,
    forward: (-dy / length) * strength,
  };
}
