import {
  createMotion,
  stepMotion,
  WEAPONS,
  worldHitDistance,
  rayBox,
  type Motion,
} from '../app/game/rules';
import { LEVELS } from '../app/game/levels';
import {
  idleInput,
  parseInput,
  type DevicePool,
  type PvpInput,
  type PvpSnapshot,
  type PvpEvent,
  type PvpMode,
} from '../app/game/pvp-protocol';
import { absorbDamage, collectSupply, PICKUPS } from '../app/game/supplies';

type Player = {
  id: string;
  name: string;
  slot: number;
  ready: boolean;
  connected: boolean;
  motion: Motion;
  input: PvpInput;
  lastInput: number;
  weapon: number;
  health: number;
  armor: number;
  clips: number[];
  reserves: number[];
  kills: number;
  deaths: number;
  reload: number;
  cooldown: number;
  respawn: number;
  immune: number;
};
export class Battle {
  players = new Map<string, Player>();
  phase: PvpSnapshot['phase'] = 'waiting';
  host = '';
  remaining = 180;
  elapsed = 0;
  events: PvpEvent[] = [];
  serial = 0;
  pickups = LEVELS[0].pickups.map((p) => ({ ...p, remaining: 0 }));
  device: DevicePool;
  mode: PvpMode;
  constructor(device: DevicePool, mode: PvpMode = 'classic') {
    this.device = device;
    this.mode = mode;
  }
  join(id: string, name: string) {
    if (this.players.size >= 4 || this.phase === 'playing')
      throw new Error('房间已满或对局已开始');
    const slot = [0, 1, 2, 3].find(
      (n) => ![...this.players.values()].some((p) => p.slot === n),
    )!;
    const spawn = LEVELS[0].spawns[slot];
    this.players.set(id, {
      id,
      name: name.trim().slice(0, 16) || '新画手',
      slot,
      ready: false,
      connected: true,
      motion: createMotion(spawn.x, spawn.z),
      input: idleInput(),
      lastInput: 0,
      weapon: 3,
      health: 100,
      armor: 0,
      clips: WEAPONS.map((w) => w.capacity),
      reserves: WEAPONS.map((w) => w.reserve),
      kills: 0,
      deaths: 0,
      reload: 0,
      cooldown: 0,
      respawn: 0,
      immune: 2.5,
    });
    this.host ||= id;
  }
  leave(id: string) {
    this.players.delete(id);
    if (this.host === id) this.host = this.players.keys().next().value || '';
    if (this.phase === 'playing' && this.players.size < 2) {
      this.phase = 'ended';
      for (const p of this.players.values()) p.ready = false;
    }
  }
  start(id: string) {
    if (
      id !== this.host ||
      this.phase === 'playing' ||
      this.players.size < 2 ||
      [...this.players.values()].some((p) => !p.ready || !p.connected)
    )
      return false;
    this.phase = 'playing';
    this.remaining = 180;
    this.events = [];
    this.pickups.forEach((p) => (p.remaining = 0));
    for (const p of this.players.values()) {
      p.kills = p.deaths = 0;
      if (this.mode === 'rotation') p.weapon = 0;
      this.respawn(p);
    }
    return true;
  }
  input(id: string, value: unknown) {
    const p = this.players.get(id),
      parsed = parseInput(value);
    if (!p || !parsed || !p.connected) return;
    if (parsed.jump && !p.input.jump) p.motion.jumpBuffer = 0.13;
    p.input = parsed;
    p.lastInput = this.elapsed;
  }
  reload(id: string) {
    const p = this.players.get(id);
    if (
      !p ||
      this.phase !== 'playing' ||
      p.health <= 0 ||
      p.reload > 0 ||
      p.clips[p.weapon] >= WEAPONS[p.weapon].capacity ||
      p.reserves[p.weapon] <= 0
    )
      return;
    p.reload = WEAPONS[p.weapon].reload;
    p.input.aim = false;
  }
  switchWeapon(id: string, w: unknown) {
    const p = this.players.get(id);
    if (!p || !Number.isInteger(w) || Number(w) < 0 || Number(w) > 3) return;
    if (this.mode === 'locked' && p.ready && this.phase !== 'playing') return;
    if (
      this.mode === 'rotation' ||
      (this.mode === 'locked' && this.phase === 'playing')
    )
      return;
    p.weapon = Number(w);
    p.reload = 0;
    p.cooldown = 0.22;
    p.input.aim = false;
  }
  shot(id: string) {
    const p = this.players.get(id);
    if (
      !p ||
      !p.connected ||
      this.phase !== 'playing' ||
      p.health <= 0 ||
      p.cooldown > 0 ||
      p.reload > 0 ||
      (p.input.sprint && p.input.forward > 0 && !p.input.aim && !p.input.crouch)
    )
      return;
    const w = WEAPONS[p.weapon];
    if (p.clips[p.weapon] <= 0) {
      this.reload(id);
      return;
    }
    p.clips[p.weapon]--;
    p.cooldown = w.interval;
    p.immune = 0;
    this.event({ kind: 'shot', actor: id });
    const source = {
      x: p.motion.x,
      y: p.motion.feet + (p.input.crouch ? 1.04 : 1.72),
      z: p.motion.z,
    };
    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const spread =
        w.spread *
        (p.input.aim ? (p.weapon === 2 ? 0.015 : 0.32) : 1) *
        (p.input.crouch ? 0.65 : 1);
      const yaw = p.input.yaw + (Math.random() - 0.5) * spread,
        pitch = p.input.pitch + (Math.random() - 0.5) * spread;
      const direction = {
        x: -Math.sin(yaw) * Math.cos(pitch),
        y: Math.sin(pitch),
        z: -Math.cos(yaw) * Math.cos(pitch),
      };
      let distance = worldHitDistance(
          source,
          direction,
          w.range,
          LEVELS[0].obstacles,
        ),
        victim: Player | undefined,
        headshot = false;
      for (const other of this.players.values()) {
        if (other === p || other.health <= 0 || other.immune > 0) continue;
        const m = other.motion,
          scale = other.input.crouch ? 0.65 : 1;
        for (const head of [false, true]) {
          const d = rayBox(
            source,
            direction,
            {
              x: m.x - 0.3,
              y: m.feet + (head ? 1.45 : 0.1) * scale,
              z: m.z - 0.25,
            },
            {
              x: m.x + 0.3,
              y: m.feet + (head ? 1.95 : 1.45) * scale,
              z: m.z + 0.25,
            },
            w.range,
          );
          if (d !== null && d < distance) {
            distance = d;
            victim = other;
            headshot = head;
          }
        }
      }
      if (victim) {
        const damage =
          w.damage *
          (headshot ? 1.5 : 1) *
          (p.weapon === 1 ? Math.max(0.35, 1 - distance / 35) : 1);
        const result = absorbDamage(victim.health, victim.armor, damage);
        victim.health = result.health;
        victim.armor = result.armor;
        this.event({
          kind: 'hit',
          actor: id,
          target: victim.id,
          damage: Math.round(damage),
          headshot,
          health: Math.ceil(victim.health),
          sourceX: p.motion.x,
          sourceZ: p.motion.z,
        });
        if (victim.health <= 0) {
          p.kills++;
          victim.deaths++;
          victim.respawn = 3;
          victim.reload = 0;
          victim.input = idleInput();
        }
      }
    }
    if (this.mode === 'rotation') {
      const next = Math.floor(p.kills / 3) % WEAPONS.length;
      if (p.weapon !== next) {
        p.weapon = next;
        p.reload = 0;
        p.cooldown = 0.25;
        p.input.aim = false;
      }
    }
    if (p.clips[p.weapon] === 0) this.reload(id);
  }
  event(e: Omit<PvpEvent, 'id'>) {
    this.events.push({ ...e, id: ++this.serial });
    this.events = this.events.slice(-32);
  }
  private respawn(p: Player) {
    const ranked = LEVELS[0].spawns
      .map((spawn) => ({
        spawn,
        d: Math.min(
          60,
          ...[...this.players.values()]
            .filter((o) => o !== p && o.health > 0)
            .map((o) => Math.hypot(o.motion.x - spawn.x, o.motion.z - spawn.z)),
        ),
      }))
      .sort((a, b) => b.d - a.d);
    const pool = ranked.filter((s) => s.d >= ranked[0].d - 3),
      spot = pool[Math.floor(Math.random() * pool.length)].spawn;
    p.motion = createMotion(spot.x, spot.z);
    p.health = 100;
    p.armor = 0;
    p.immune = 2.5;
    p.respawn = 0;
    p.reload = 0;
    p.cooldown = 0;
    p.input = idleInput();
    p.clips = WEAPONS.map((w) => w.capacity);
    p.reserves = WEAPONS.map((w) => w.reserve);
  }
  step(dt = 1 / 30) {
    this.elapsed += dt;
    if (this.phase !== 'playing') return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) {
      this.phase = 'ended';
      for (const p of this.players.values()) p.ready = false;
      return;
    }
    for (const pickup of this.pickups)
      pickup.remaining = Math.max(0, pickup.remaining - dt);
    for (const p of this.players.values()) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.immune = Math.max(0, p.immune - dt);
      if (!p.connected || this.elapsed - p.lastInput > 0.3)
        p.input = {
          ...p.input,
          forward: 0,
          right: 0,
          jump: false,
          sprint: false,
        };
      if (p.health <= 0) {
        p.respawn -= dt;
        if (p.respawn <= 0) this.respawn(p);
        continue;
      }
      const i = p.input,
        sprint =
          i.sprint && i.forward > 0 && !i.aim && !i.crouch && p.reload <= 0;
      for (let n = 0; n < 4; n++)
        stepMotion(
          p.motion,
          {
            forward: i.forward,
            right: i.right,
            yaw: i.yaw,
            speed:
              (i.crouch ? 2.1 : sprint ? 7 : i.aim ? 2.8 : 4.6) *
              Math.min(1, Math.hypot(i.forward, i.right)),
          },
          dt / 4,
          LEVELS[0].obstacles,
        );
      if (p.reload > 0) {
        p.reload = Math.max(0, p.reload - dt);
        if (p.reload === 0) {
          const amount = Math.min(
            WEAPONS[p.weapon].capacity - p.clips[p.weapon],
            p.reserves[p.weapon],
          );
          p.clips[p.weapon] += amount;
          p.reserves[p.weapon] -= amount;
        }
      }
      for (const pickup of this.pickups) {
        if (
          pickup.remaining > 0 ||
          p.motion.feet > 0.85 ||
          Math.hypot(pickup.x - p.motion.x, pickup.z - p.motion.z) > 1.15
        )
          continue;
        const dx = pickup.x - p.motion.x,
          dz = pickup.z - p.motion.z,
          distance = Math.hypot(dx, dz);
        if (
          distance > 0.01 &&
          worldHitDistance(
            { x: p.motion.x, y: 0.65, z: p.motion.z },
            { x: dx / distance, y: 0, z: dz / distance },
            distance,
            LEVELS[0].obstacles,
          ) <
            distance - 0.05
        )
          continue;
        const r = collectSupply(pickup.kind, p.health, p.armor, p.reserves);
        if (r.amount) {
          p.health = r.health;
          p.armor = r.armor;
          p.reserves = r.reserves;
          pickup.remaining = PICKUPS[pickup.kind].respawn;
        }
      }
    }
  }
  snapshot(): PvpSnapshot {
    return {
      mode: this.mode,
      phase: this.phase,
      device: this.device,
      host: this.host,
      remaining: this.remaining,
      events: this.events,
      pickups: this.pickups.map((p) => p.remaining),
      players: [...this.players.values()].map((p) => ({
        ack: p.input.seq,
        id: p.id,
        name: p.name,
        slot: p.slot,
        ready: p.ready,
        connected: p.connected,
        motion: { ...p.motion },
        yaw: p.input.yaw,
        pitch: p.input.pitch,
        weapon: p.weapon,
        health: p.health,
        armor: p.armor,
        ammo: p.clips[p.weapon],
        reserve: p.reserves[p.weapon],
        kills: p.kills,
        deaths: p.deaths,
        reload: p.reload,
        respawn: p.respawn,
        crouch: p.input.crouch,
      })),
    };
  }
}
