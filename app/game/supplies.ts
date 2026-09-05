import { WEAPONS } from './rules';
import type { PickupKind } from './levels';

export const PICKUPS = {
  health: { name: '急救包', color: 0x53bc8b, css: '#29865f', respawn: 20 },
  ammo: { name: '弹药箱', color: 0xe7b549, css: '#ad761e', respawn: 18 },
  shield: { name: '护甲片', color: 0x6eacf0, css: '#3477bd', respawn: 25 },
} as const;
export function collectSupply(
  kind: PickupKind,
  health: number,
  armor: number,
  reserves: number[],
) {
  const next = { health, armor, reserves: [...reserves], amount: 0 };
  if (kind === 'health') {
    next.health = Math.min(100, health + 40);
    next.amount = next.health - health;
  }
  if (kind === 'shield') {
    next.armor = Math.min(50, armor + 30);
    next.amount = next.armor - armor;
  }
  if (kind === 'ammo')
    WEAPONS.forEach((w, i) => {
      next.reserves[i] = Math.min(w.reserve, reserves[i] + w.capacity * 2);
      next.amount += next.reserves[i] - reserves[i];
    });
  return next;
}
export function absorbDamage(health: number, armor: number, damage: number) {
  const absorbed = Math.min(armor, damage);
  return {
    health: Math.max(0, health - damage + absorbed),
    armor: armor - absorbed,
    absorbed,
  };
}

const smooth = (a: number, b: number, p: number) => {
  const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** A continuous, multi-stage pose; camera orientation is never part of reloading. */
export function reloadPose(weapon: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const lift = smooth(0, 0.14, p) * (1 - smooth(0.86, 1, p));
  const remove = smooth(0.15, 0.34, p) * (1 - smooth(0.49, 0.68, p));
  const rack = smooth(0.72, 0.8, p) * (1 - smooth(0.81, 0.9, p));
  const shell = p >= 0.22 && p < 0.73 ? ((p - 0.22) / 0.17) % 1 : 0;
  const stage = p < 0.18 ? 0 : p < 0.48 ? 1 : p < 0.72 ? 2 : 3;
  const grip = smooth(0.05, 0.18, p) * (1 - smooth(0.68, 0.73, p));
  const reachAction = smooth(0.7, 0.76, p) * (1 - smooth(0.87, 0.96, p));
  const seat = smooth(0.64, 0.68, p) * (1 - smooth(0.68, 0.73, p));
  const settle = smooth(0.86, 0.9, p) * (1 - smooth(0.9, 0.98, p));
  const shellTravel = smooth(0.05, 0.8, shell) * (1 - smooth(0.88, 1, shell));
  return {
    lift,
    remove,
    rack,
    shell,
    stage,
    grip,
    reachAction,
    seat,
    settle,
    shellTravel,
    shellVisible: shell > 0.02 && shell < 0.88,
    tilt: [0.9, 1.22, 0.68, 0.86][weapon] * lift,
    turn: [0.48, 0.24, 0.55, 0.42][weapon] * lift,
    label:
      weapon === 1
        ? ['翻转枪身', '压入霰弹', '补充霰弹', '推拉护木'][stage]
        : [
            '抬枪换弹',
            '卸下弹匣',
            '装入弹匣',
            weapon === 2 ? '拉栓上膛' : '推栓就绪',
          ][stage],
  };
}
