import { OBSTACLES, SPAWNS, type Obstacle } from './rules';

export type PickupKind = 'health' | 'ammo' | 'shield';
export type PickupSpot = { x: number; z: number; kind: PickupKind };
export type Level = {
  practice?: boolean;
  name: string;
  english: string;
  description: string;
  tactic: string;
  color: string;
  sky: number;
  ground: number;
  accent: number;
  goal: number;
  enemies: number;
  duration: number;
  music: string;
  obstacles: Obstacle[];
  spawns: { x: number; z: number }[];
  pickups: PickupSpot[];
};
const boundary = () => OBSTACLES.slice(0, 4).map((o) => ({ ...o }));
const block = (
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  kind: Obstacle['kind'] = 'wall',
): Obstacle => ({ x, z, w, d, h, kind });
const spot = (x: number, z: number, kind: PickupKind): PickupSpot => ({
  x,
  z,
  kind,
});

export const LEVELS: Level[] = [
  {
    name: '废稿堆场',
    english: 'THE SCRAPYARD',
    description: '仓库之间，见招拆招。',
    tactic: '均衡交火 · 侧翼绕行',
    color: '#7caebc',
    sky: 0xc8e3ec,
    ground: 0xf0e9d9,
    accent: 0x8cbdd4,
    goal: 12,
    enemies: 5,
    duration: 180,
    music: 'getaway',
    obstacles: OBSTACLES,
    spawns: SPAWNS,
    pickups: [
      spot(-4, 13, 'health'),
      spot(17, 7, 'health'),
      spot(-17, -10, 'health'),
      spot(5, -17, 'health'),
      spot(4, 12, 'ammo'),
      spot(-7, -3, 'ammo'),
      spot(12, -2, 'ammo'),
      spot(0, -6, 'shield'),
    ],
  },
  {
    name: '折纸工厂',
    english: 'PAPERWORKS',
    description: '穿过产线，抢下补给。',
    tactic: '近距离 · 三路穿插',
    color: '#dba059',
    sky: 0xf0dbbc,
    ground: 0xebe4d4,
    accent: 0xdfa866,
    goal: 16,
    enemies: 6,
    duration: 180,
    music: 'malfunction',
    obstacles: [
      ...boundary(),
      block(-7, -11, 4, 9, 3.6),
      block(7, -11, 4, 9, 3.6),
      block(-7, 8, 4, 10, 3.8),
      block(7, 8, 4, 10, 3.8),
      block(-15, -1, 5, 3, 2.4),
      block(15, -1, 5, 3, 2.4),
      block(0, -1, 3, 4, 1.3, 'crate'),
      block(-2, -12, 1.3, 2, 1.4, 'crate'),
      block(2, 11, 1.3, 2, 1.4, 'crate'),
      block(-15, 11, 2.5, 2.5, 1.7, 'crate'),
      block(15, -12, 2.5, 2.5, 1.7, 'crate'),
      block(-11, -5, 2, 2, 1.2, 'crate'),
      block(11, 4, 2, 2, 1.2, 'crate'),
    ],
    spawns: [
      { x: 0, z: 17 },
      { x: -17, z: 17 },
      { x: 17, z: 17 },
      { x: -17, z: -17 },
      { x: 17, z: -17 },
      { x: 0, z: -17 },
      { x: -18, z: 4 },
      { x: 18, z: -6 },
    ],
    pickups: [
      spot(-3, 16, 'health'),
      spot(13, 14, 'health'),
      spot(-13, -14, 'health'),
      spot(3, -17, 'health'),
      spot(-12, 3, 'ammo'),
      spot(12, -5, 'ammo'),
      spot(3, 6, 'ammo'),
      spot(0, -5, 'shield'),
    ],
  },
  {
    name: '天台速写',
    english: 'SKYLINE SKETCH',
    description: '开阔视野，步步找掩体。',
    tactic: '远距离 · 高低掩体',
    color: '#a18fc5',
    sky: 0xd3d5ec,
    ground: 0xe3e3e6,
    accent: 0xafa0cf,
    goal: 20,
    enemies: 7,
    duration: 180,
    music: 'rush',
    obstacles: [
      ...boundary().map((o) => ({ ...o, h: 2.8 })),
      block(-13, -10, 5, 5, 3.4),
      block(13, 10, 5, 5, 3.4),
      block(-9, 8, 7, 6, 0.9, 'platform'),
      block(-9, 12, 5, 2, 0.3, 'step'),
      block(-9, 11, 5, 1.2, 0.6, 'step'),
      block(9, -8, 7, 6, 0.9, 'platform'),
      block(9, -12, 5, 2, 0.3, 'step'),
      block(9, -11, 5, 1.2, 0.6, 'step'),
      block(-9, 6.5, 2, 2, 2.2, 'crate'),
      block(9, -6.5, 2, 2, 2.2, 'crate'),
      block(0, 1, 2.4, 2.4, 2.8, 'crate'),
      block(-5, -5, 3.5, 1.4, 1.35, 'crate'),
      block(5, 6, 3.5, 1.4, 1.35, 'crate'),
      block(-16, 1, 2.5, 3, 1.6, 'crate'),
      block(16, -1, 2.5, 3, 1.6, 'crate'),
    ],
    spawns: [
      { x: 0, z: 17 },
      { x: -17, z: 17 },
      { x: 17, z: 17 },
      { x: -17, z: -17 },
      { x: 17, z: -17 },
      { x: 0, z: -17 },
      { x: -18, z: -4 },
      { x: 18, z: 4 },
    ],
    pickups: [
      spot(-4, 15, 'health'),
      spot(17, -9, 'health'),
      spot(-17, 9, 'health'),
      spot(4, -15, 'health'),
      spot(-10, 16, 'ammo'),
      spot(10, -16, 'ammo'),
      spot(0, -8, 'ammo'),
      spot(0, 6, 'shield'),
    ],
  },
];

LEVELS.push({
  practice: true,
  name: '练习画室',
  english: 'THE PRACTICE ROOM',
  description:
    '三座静止靶、两座移动靶。自由练枪，没有时间限制，也不会受到攻击。',
  tactic: '自由练习 · 静止 / 移动靶',
  color: '#78bba3',
  sky: 0xdceee8,
  ground: 0xf0ecd9,
  accent: 0x94c9b6,
  goal: 0,
  enemies: 5,
  duration: 0,
  music: 'getaway',
  obstacles: boundary(),
  spawns: [
    { x: 0, z: 16 },
    { x: -12, z: 6 },
    { x: -6, z: 1 },
    { x: 0, z: -4 },
    { x: 6, z: -9 },
    { x: 12, z: -14 },
  ],
  pickups: [],
});
