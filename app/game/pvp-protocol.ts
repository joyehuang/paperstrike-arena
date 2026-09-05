import type { Motion } from './rules';
export type DevicePool = 'mobile' | 'desktop';
export function devicePool(userAgent: string, touchPoints = 0): DevicePool {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && touchPoints > 1)
    ? 'mobile'
    : 'desktop';
}
export type PvpInput = {
  forward: number;
  right: number;
  yaw: number;
  pitch: number;
  aim: boolean;
  crouch: boolean;
  sprint: boolean;
  jump: boolean;
};
export const idleInput = (): PvpInput => ({
  forward: 0,
  right: 0,
  yaw: 0,
  pitch: 0,
  aim: false,
  crouch: false,
  sprint: false,
  jump: false,
});
export function parseInput(value: unknown): PvpInput | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    !['forward', 'right', 'yaw', 'pitch'].every(
      (k) => typeof v[k] === 'number' && Number.isFinite(v[k]),
    )
  )
    return null;
  return {
    forward: Math.max(-1, Math.min(1, v.forward as number)),
    right: Math.max(-1, Math.min(1, v.right as number)),
    yaw: (v.yaw as number) % (Math.PI * 2),
    pitch: Math.max(-1.35, Math.min(1.35, v.pitch as number)),
    aim: v.aim === true,
    crouch: v.crouch === true,
    sprint: v.sprint === true,
    jump: v.jump === true,
  };
}
export type PvpPlayer = {
  id: string;
  name: string;
  slot: number;
  ready: boolean;
  connected: boolean;
  motion: Motion;
  yaw: number;
  pitch: number;
  weapon: number;
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  kills: number;
  deaths: number;
  reload: number;
  respawn: number;
  crouch: boolean;
};
export type PvpEvent = {
  id: number;
  kind: 'shot' | 'hit';
  actor: string;
  target?: string;
  damage?: number;
  headshot?: boolean;
  health?: number;
  sourceX?: number;
  sourceZ?: number;
};
export type PvpSnapshot = {
  phase: 'waiting' | 'playing' | 'ended';
  device: DevicePool;
  host: string;
  remaining: number;
  players: PvpPlayer[];
  events: PvpEvent[];
  pickups: number[];
};
export type PvpLink = {
  id: string;
  send: (kind: string, data: unknown) => void;
};
