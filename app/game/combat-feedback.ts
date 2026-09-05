import { isBlocked, worldHitDistance, type Obstacle } from './rules';

type Point = { x: number; z: number };

/** A failed safety check postpones spawning instead of using a nearby fallback. */
export function enemySpawn(
  points: Point[],
  player: Point & { y?: number },
  occupied: Point[],
  death: Point,
  obstacles: Obstacle[],
  random = Math.random,
): Point | null {
  const candidates = points.filter(
    (p) =>
      Math.hypot(p.x - player.x, p.z - player.z) >= 18 &&
      Math.hypot(p.x - death.x, p.z - death.z) >= 8 &&
      occupied.every(
        (other) => Math.hypot(p.x - other.x, p.z - other.z) >= 5,
      ) &&
      !isBlocked(p.x, p.z, 0, 0.38, obstacles),
  );
  const hidden = candidates.filter((p) => {
    const dx = p.x - player.x,
      dy = 1.4 - (player.y ?? 1.72),
      dz = p.z - player.z;
    const distance = Math.hypot(dx, dy, dz);
    return (
      worldHitDistance(
        { x: player.x, y: player.y ?? 1.72, z: player.z },
        { x: dx / distance, y: dy / distance, z: dz / distance },
        distance,
        obstacles,
      ) <
      distance - 0.1
    );
  });
  return hidden.length
    ? hidden[Math.min(hidden.length - 1, Math.floor(random() * hidden.length))]
    : null;
}

export function damageBearing(player: Point, source: Point, yaw: number) {
  const angle = Math.atan2(source.x - player.x, player.z - source.z) + yaw;
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function damageLabel(angle: number) {
  const names = [
    '前方',
    '右前方',
    '右侧',
    '右后方',
    '后方',
    '左后方',
    '左侧',
    '左前方',
  ];
  return names[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];
}
