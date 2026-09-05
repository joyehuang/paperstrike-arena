import {
  Room,
  ServerError,
  type Client,
  type AuthContext,
} from '@colyseus/core';
import { Battle } from './battle';
import { devicePool, validMode } from '../app/game/pvp-protocol';
import { randomInt } from 'node:crypto';

export class BattleRoom extends Room {
  static active = 0;
  // Allocation is synchronous: one room process owns all active codes.
  private static codes = new Set<string>();
  private registered = false;
  maxClients = 4;
  battle!: Battle;
  private rates = new Map<string, { time: number; count: number }>();
  onCreate(options: { device?: unknown; private?: boolean; mode?: unknown }) {
    if (options.device !== 'mobile' && options.device !== 'desktop')
      throw new ServerError(400, '请选择有效设备分组');
    if (BattleRoom.active >= Number(process.env.MAX_ROOMS || 32))
      throw new ServerError(503, '房间暂满，请稍后重试');
    if (options.mode !== undefined && !validMode(options.mode))
      throw new ServerError(400, '无效的玩法');
    let code: string;
    do {
      code = String(randomInt(100000, 1000000));
    } while (BattleRoom.codes.has(code));
    this.roomId = code;
    BattleRoom.codes.add(code);
    BattleRoom.active++;
    this.registered = true;
    this.battle = new Battle(
      options.device,
      validMode(options.mode) ? options.mode : 'classic',
    );
    if (options.private) void this.setPrivate(true);
    let publishTime = 0;
    const publish = () => {
      this.broadcast('snapshot', this.battle.snapshot());
      this.battle.events = [];
      publishTime = 0;
    };
    this.onMessage('*', (client, type, data) => {
      const now = Date.now();
      let rate = this.rates.get(client.sessionId);
      if (!rate || now - rate.time > 1000) {
        rate = { time: now, count: 0 };
        this.rates.set(client.sessionId, rate);
      }
      if (++rate.count > 90) return;
      const id = client.sessionId,
        p = this.battle.players.get(id);
      if (!p) return;
      if (type === 'ping' && typeof data === 'number')
        client.send('pong', data);
      if (type === 'input') this.battle.input(id, data);
      if (type === 'fire') {
        this.battle.shot(id);
        // Confirm damage immediately instead of waiting for the movement tick.
        if (this.battle.events.some((event) => event.kind === 'hit')) publish();
      }
      if (type === 'reload') this.battle.reload(id);
      if (type === 'jump' && this.battle.phase === 'playing' && p.health > 0)
        p.motion.jumpBuffer = 0.13;
      if (type === 'weapon') this.battle.switchWeapon(id, data);
      if (type === 'ready' && this.battle.phase !== 'playing')
        p.ready = data === true;
      if (type === 'start' && this.battle.start(id)) void this.lock();
      if (type === 'sync') client.send('snapshot', this.battle.snapshot());
    });
    this.setFixedTimestep(({ dt }) => {
      this.battle.step(dt);
      publishTime += dt;
      if (publishTime >= (this.battle.phase === 'playing' ? 1 / 15 : 0.2)) {
        publish();
      }
      if (this.battle.phase === 'ended' && this.locked) void this.unlock();
    }, 30);
  }
  onAuth(
    _client: Client,
    options: { device?: unknown; touchPoints?: number },
    context: AuthContext,
  ) {
    const ua = context.headers.get('user-agent') || '';
    const actual = devicePool(
      ua,
      typeof options.touchPoints === 'number' ? options.touchPoints : 0,
    );
    if (options.device !== actual || actual !== this.battle.device)
      throw new ServerError(403, '手机和电脑不能进入同一个对战房间');
    const origin = context.headers.get('origin');
    const allowed = (
      process.env.ALLOWED_ORIGINS ||
      'http://localhost:5173,http://localhost:3000'
    ).split(',');
    if (origin && !allowed.includes(origin))
      throw new ServerError(403, '不允许的游戏来源');
    return { device: actual };
  }
  onJoin(client: Client, options: { name?: unknown; device?: unknown }) {
    if (options.device !== this.battle.device)
      throw new ServerError(403, '设备分组不一致');
    this.battle.join(
      client.sessionId,
      typeof options.name === 'string' ? options.name : '新画手',
    );
    client.send('snapshot', this.battle.snapshot());
  }
  async onDrop(client: Client) {
    const p = this.battle.players.get(client.sessionId);
    if (p) p.connected = false;
    try {
      await this.allowReconnection(client, 20);
    } catch {
      this.battle.leave(client.sessionId);
    }
  }
  onReconnect(client: Client) {
    const p = this.battle.players.get(client.sessionId);
    if (p) p.connected = true;
  }
  onLeave(client: Client) {
    this.battle.leave(client.sessionId);
    this.rates.delete(client.sessionId);
  }
  onDispose() {
    if (this.registered) {
      BattleRoom.active--;
      BattleRoom.codes.delete(this.roomId);
    }
  }
}
