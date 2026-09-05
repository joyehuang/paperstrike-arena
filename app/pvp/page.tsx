'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import { Arena, WEAPONS, type Snapshot } from '../game/arena';
import { TouchControls } from '../touch-controls';
import {
  devicePool,
  type DevicePool,
  type PvpSnapshot,
} from '../game/pvp-protocol';
import { damageLabel } from '../game/combat-feedback';

function Match({
  room,
  snapshot,
  online,
  leave,
}: {
  room: Room;
  snapshot: PvpSnapshot;
  online: boolean;
  leave: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<HTMLCanvasElement>(null);
  const [arena, setArena] = useState<Arena | null>(null),
    [game, setGame] = useState<Snapshot | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    if (!host.current || !map.current) return;
    const a = new Arena(host.current, map.current, setGame, setError);
    a.pvp = { id: room.sessionId, send: (kind, data) => room.send(kind, data) };
    setArena(a);
    return () => a.dispose();
  }, [room]);
  useEffect(() => {
    arena?.applyPvp(snapshot);
  }, [arena, snapshot]);
  useEffect(() => {
    if (!online) arena?.pause();
  }, [online, arena]);
  useEffect(() => {
    const rotate = () => {
      if (arena?.touchMode && innerHeight > innerWidth) arena.pause();
    };
    window.addEventListener('resize', rotate);
    return () => window.removeEventListener('resize', rotate);
  }, [arena]);
  const play = () => {
    if (arena?.touchMode && innerHeight > innerWidth) {
      setError('请先将手机横过来');
      return;
    }
    setError('');
    arena?.start();
  };
  const paused = !game || ['ready', 'paused'].includes(game.phase);
  return (
    <main
      className={`app play-mode pvp-match ${arena?.touchMode ? 'touch-mode' : ''}`}
    >
      <div className={`game-frame ${game?.hurt ? 'hurt' : ''}`}>
        <div className="scene" ref={host} />
        <canvas ref={map} className="pvp-hidden-map" />
        <div className="pvp-hud">
          <span>
            HP {Math.ceil(game?.health ?? 100)} · 护甲{' '}
            {Math.ceil(game?.armor ?? 0)}
          </span>
          <strong>{Math.ceil(snapshot.remaining)} 秒</strong>
          <span>
            {game?.ammo ?? 0} / {game?.reserve ?? 0} ·{' '}
            {WEAPONS[game?.weapon ?? 3].name}
          </span>
        </div>
        <div className={`pvp-crosshair ${game?.hit ? 'confirmed' : ''}`}>
          {game?.aiming && game.weapon === 2 ? '⊕' : '+'}
        </div>
        {game?.reloading && (
          <div className="pvp-reload">
            {game.reloadLabel} · {game.reloadProgress}%
          </div>
        )}
        {game?.hurt && game.lastHurt && (
          <div className="pvp-damage">
            {damageLabel(game.lastHurt.angle)}来袭 · −{game.lastHurt.damage}
          </div>
        )}
        {game?.phase === 'dead' && (
          <div className="pvp-reload">
            {Math.max(0, Math.ceil(game.respawn))} 秒后重生
          </div>
        )}
        {arena?.touchMode && game?.phase === 'running' && (
          <TouchControls arena={arena} game={game} />
        )}
        {!arena?.touchMode && (
          <button className="pvp-pause" onClick={() => arena?.pause()}>
            暂停 / Esc
          </button>
        )}
        {(paused || !online) && (
          <div className="pvp-overlay">
            <h1>{online ? '进入对战' : '正在重连…'}</h1>
            <p>手机与电脑分池 · 单人暂停不会暂停其他玩家</p>
            <p>{error}</p>
            <button disabled={!arena || !online} onClick={play}>
              进入 / 继续
            </button>
            <button onClick={leave}>离开房间</button>
          </div>
        )}
      </div>
    </main>
  );
}
export default function PvpPage() {
  const [endpoint, setEndpoint] = useState(''),
    [device, setDevice] = useState<DevicePool>('desktop'),
    [name, setName] = useState('新画手'),
    [code, setCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null),
    [snapshot, setSnapshot] = useState<PvpSnapshot | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [online, setOnline] = useState(true);
  const current = useRef<Room | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const frame = requestAnimationFrame(() => {
      setDevice(devicePool(navigator.userAgent, navigator.maxTouchPoints));
      setEndpoint(
        process.env.NEXT_PUBLIC_PVP_SERVER_URL ||
          (['localhost', '127.0.0.1'].includes(location.hostname)
            ? 'http://localhost:2567'
            : ''),
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      mounted.current = false;
      void current.current?.leave();
    };
  }, []);
  const join = async (mode: 'quick' | 'create' | 'code') => {
    if (!endpoint || busy) return;
    setBusy(true);
    setError('');
    try {
      const client = new Client(endpoint),
        options = { name, device, touchPoints: navigator.maxTouchPoints };
      const r =
        mode === 'quick'
          ? await client.joinOrCreate('battle', options)
          : mode === 'create'
            ? await client.create('battle', { ...options, private: true })
            : await client.joinById(code.trim(), options);
      if (!mounted.current) {
        await r.leave();
        return;
      }
      current.current = r;
      r.reconnection.minUptime = 0;
      setRoom(r);
      setOnline(true);
      r.onMessage('snapshot', (s: PvpSnapshot) => {
        if (current.current === r) setSnapshot(s);
      });
      r.onDrop(() => {
        if (current.current === r) setOnline(false);
      });
      r.onReconnect(() => {
        if (current.current === r) {
          setOnline(true);
          r.reconnection.enqueuedMessages.length = 0;
          r.send('sync');
        }
      });
      r.onLeave(() => {
        if (current.current === r) {
          current.current = null;
          setRoom(null);
          setSnapshot(null);
          setError('已离开房间或重连超时，可以重新加入。');
        }
      });
      r.send('sync');
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : '连接失败，请稍后再试');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const leave = () => {
    const r = current.current;
    current.current = null;
    void r?.leave();
    setRoom(null);
    setSnapshot(null);
  };
  if (room && snapshot?.phase === 'playing')
    return (
      <Match room={room} snapshot={snapshot} online={online} leave={leave} />
    );
  const own = snapshot?.players.find((p) => p.id === room?.sessionId);
  return (
    <main className="pvp-lobby">
      <Link href="/">← 单人战场与训练场</Link>
      <span className="pvp-kicker">PAPERSTRIKE / PVP</span>
      <h1>
        叫上朋友，
        <br />
        在纸上交锋。
      </h1>
      <p>2–4 人 · 废稿堆场 · 3 分钟自由混战</p>
      <strong className="pvp-pool">
        {device === 'mobile' ? '手机对战池' : '电脑对战池'} ·
        房间码也不能跨设备加入
      </strong>
      {!endpoint && (
        <p className="pvp-notice">
          联机服务准备中，暂未开放匹配。单人战场和训练场仍可正常游玩。
        </p>
      )}
      {!room ? (
        <div className="pvp-card">
          <label>
            昵称
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="pvp-buttons">
            <button
              disabled={!endpoint || busy}
              onClick={() => void join('quick')}
            >
              快速匹配
            </button>
            <button
              disabled={!endpoint || busy}
              onClick={() => void join('create')}
            >
              创建朋友房
            </button>
          </div>
          <label>
            房间码
            <input
              value={code}
              maxLength={32}
              onChange={(e) => setCode(e.target.value)}
              placeholder="粘贴朋友的房间码"
            />
          </label>
          <button
            disabled={!endpoint || busy || !code.trim()}
            onClick={() => void join('code')}
          >
            加入房间
          </button>
        </div>
      ) : (
        <div className="pvp-card">
          <h2>{snapshot?.phase === 'ended' ? '本局结束' : '等待队友'}</h2>
          <p>
            房间码 <strong>{room.roomId}</strong>
          </p>
          <ul>
            {snapshot?.players.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b>
                <span>
                  {p.kills} 击杀 / {p.deaths} 阵亡 ·{' '}
                  {!p.connected ? '重连中' : p.ready ? '已准备' : '未准备'}
                </span>
              </li>
            ))}
          </ul>
          <div className="pvp-buttons">
            <button onClick={() => room.send('ready', !own?.ready)}>
              {own?.ready ? '取消准备' : '准备'}
            </button>
            {snapshot?.host === room.sessionId && (
              <button
                disabled={
                  !snapshot ||
                  snapshot.players.length < 2 ||
                  snapshot.players.some((p) => !p.ready || !p.connected)
                }
                onClick={() => room.send('start')}
              >
                开始对战
              </button>
            )}
            <button onClick={leave}>离开</button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="pvp-notice">
          {error}
        </p>
      )}
      <p className="pvp-footnote">
        第一版联机测试：暂未加入占点、排位和武器轮换。断线时会尝试恢复当前房间。
      </p>
    </main>
  );
}
