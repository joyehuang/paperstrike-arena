export const WEAPONS = [
  {
    name: '手枪',
    english: 'SIDEKICK',
    trait: '轻巧 · 精准',
    mode: '半自动',
    capacity: 12,
    reserve: 72,
    damage: 34,
    interval: 0.27,
    reload: 1.15,
    pellets: 1,
    spread: 0.013,
    zoom: 52,
    range: 46,
  },
  {
    name: '霰弹枪',
    english: 'DOODLE-12',
    trait: '近身 · 爆发',
    mode: '泵动式',
    capacity: 6,
    reserve: 36,
    damage: 19,
    interval: 0.85,
    reload: 2.1,
    pellets: 8,
    spread: 0.075,
    zoom: 58,
    range: 23,
  },
  {
    name: '狙击枪',
    english: 'FINE LINER',
    trait: '远距 · 致命',
    mode: '栓动式',
    capacity: 5,
    reserve: 25,
    damage: 110,
    interval: 1.25,
    reload: 2.3,
    pellets: 1,
    spread: 0.05,
    zoom: 19,
    range: 85,
  },
  {
    name: '步枪',
    english: 'SCRIBBLE-4',
    trait: '均衡 · 连射',
    mode: '全自动',
    capacity: 30,
    reserve: 150,
    damage: 26,
    interval: 0.105,
    reload: 1.65,
    pellets: 1,
    spread: 0.023,
    zoom: 48,
    range: 55,
  },
] as const;
export type Obstacle = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: 'wall' | 'crate' | 'platform' | 'step';
};
export const OBSTACLES: Obstacle[] = [
  { x: 0, z: -21, w: 44, d: 1, h: 5, kind: 'wall' },
  { x: 0, z: 21, w: 44, d: 1, h: 5, kind: 'wall' },
  { x: -21, z: 0, w: 1, d: 42, h: 5, kind: 'wall' },
  { x: 21, z: 0, w: 1, d: 42, h: 5, kind: 'wall' },
  { x: -11, z: -10, w: 7, d: 5, h: 4.3, kind: 'wall' },
  { x: 12, z: -10, w: 6, d: 7, h: 4.9, kind: 'wall' },
  { x: -13, z: 7, w: 5, d: 6, h: 3.8, kind: 'wall' },
  { x: 12, z: 9, w: 5, d: 5, h: 3.6, kind: 'wall' },
  { x: -6.4, z: 6, w: 2.5, d: 2.5, h: 2.1, kind: 'crate' },
  { x: -8, z: 3.7, w: 2, d: 2, h: 1.4, kind: 'crate' },
  { x: 6.5, z: 4, w: 3, d: 2.3, h: 1.6, kind: 'crate' },
  { x: 7.3, z: 1.7, w: 1.8, d: 1.8, h: 2.5, kind: 'crate' },
  { x: -3, z: -9, w: 2.5, d: 2.5, h: 1.5, kind: 'crate' },
  { x: 4, z: -13, w: 2.2, d: 2.2, h: 2.6, kind: 'crate' },
  { x: 0, z: -1, w: 5, d: 5, h: 0.65, kind: 'platform' },
  { x: 0, z: 2.25, w: 3, d: 1.5, h: 0.32, kind: 'step' },
  { x: 0, z: -1, w: 1.1, d: 1.1, h: 2.7, kind: 'crate' },
  { x: -17, z: -3, w: 2.5, d: 2.5, h: 1.6, kind: 'crate' },
  { x: 17, z: 0, w: 2, d: 3, h: 1.7, kind: 'crate' },
];
export const SPAWNS = [
  { x: 0, z: 16 },
  { x: -17, z: 16 },
  { x: 17, z: 16 },
  { x: -17, z: -17 },
  { x: 17, z: -17 },
  { x: 0, z: -17 },
  { x: -16, z: 0 },
  { x: 16, z: -4 },
];
export function isBlocked(x: number, z: number, feet = 0, radius = 0.34) {
  return (
    Math.abs(x) > 20.2 ||
    Math.abs(z) > 20.2 ||
    OBSTACLES.some(
      (o) =>
        o.h > feet + 0.4 &&
        Math.abs(x - o.x) < o.w / 2 + radius &&
        Math.abs(z - o.z) < o.d / 2 + radius,
    )
  );
}
export function floorHeight(x: number, z: number, feet: number) {
  let floor = 0;
  for (const o of OBSTACLES)
    if (
      o.h <= feet + 0.4 &&
      Math.abs(x - o.x) < o.w / 2 + 0.15 &&
      Math.abs(z - o.z) < o.d / 2 + 0.15
    )
      floor = Math.max(floor, o.h);
  return floor;
}
export function moveBody(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  feet = 0,
  radius = 0.34,
) {
  if (!isBlocked(pos.x + dx, pos.z, feet, radius)) pos.x += dx;
  if (!isBlocked(pos.x, pos.z + dz, feet, radius)) pos.z += dz;
  return pos;
}
// A reverse distance field lets all opponents navigate around the same obstacles.
export function navigationField(x: number, z: number) {
  const size = 41,
    field = new Int16Array(size * size).fill(-1),
    tx = Math.max(0, Math.min(40, Math.round(x) + 20)),
    tz = Math.max(0, Math.min(40, Math.round(z) + 20));
  const queue = [tz * size + tx];
  field[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i],
      cx = id % size,
      cz = Math.floor(id / size);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx,
        nz = cz + dz,
        ni = nz * size + nx;
      if (
        nx < 0 ||
        nz < 0 ||
        nx >= size ||
        nz >= size ||
        field[ni] !== -1 ||
        isBlocked(nx - 20, nz - 20, 0, 0.38)
      )
        continue;
      field[ni] = field[id] + 1;
      queue.push(ni);
    }
  }
  return field;
}
