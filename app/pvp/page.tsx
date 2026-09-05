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
  PVP_MODES,
  type PvpMode,
} from '../game/pvp-protocol';
import { damageLabel } from '../game/combat-feedback';
import { CombatVitals, CombatReticle } from '../combat-hud';
import { Crosshair, RotateCcw, Pause, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { LEVELS } from '../game/levels';

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
  const [rtt, setRtt] = useState<number | null>(null);
  const [performanceMode, setPerformanceMode] = useState(false);
  useEffect(() => {
    if (!host.current || !map.current) return;
    const a = new Arena(host.current, map.current, setGame, setError);
    a.pvp = { id: room.sessionId, send: (kind, data) => room.send(kind, data) };
    const stop = room.onMessage('snapshot', (s: PvpSnapshot) => a.applyPvp(s));
    const pong = room.onMessage('pong', (sent: number) => {
      const ms = Math.round(performance.now() - sent);
      a.pvpRtt = ms;
      setRtt(ms);
    });
    const ping = setInterval(() => room.send('ping', performance.now()), 2000);
    setArena(a);
    return () => {
      stop();
      pong();
      clearInterval(ping);
      a.dispose();
    };
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
  const level = LEVELS[0];
  return (
    <main
      className={`app play-mode pvp-match ${arena?.touchMode ? 'touch-mode' : ''}`}
    >
      <div
        className={`game-frame ${game?.aiming && game.weapon === 2 ? 'scoped' : ''} ${game?.hurt ? 'hurt' : ''} ${game && game.health <= 30 ? 'critical-health' : ''}`}
      >
        <div className="scene" ref={host} />
        <div className="game-top-left">
          <span className="live-dot" />
          <span>{online ? 'LIVE MATCH' : 'RECONNECTING'}</span>
          <small>
            {PVP_MODES[snapshot.mode || 'classic'].name} · {game?.fps || '—'}{' '}
            FPS · {rtt === null ? '测延迟中' : rtt + ' ms'}
          </small>
        </div>
        <div className="match-score">
          <div>
            <span className="score-number">
              {String(game?.kills || 0).padStart(2, '0')}
            </span>
            <span className="score-label">击杀</span>
          </div>
          <div className="match-time">
            <span>
              {Math.floor((game?.time ?? snapshot.remaining) / 60)}
              <b>:</b>
              {String(
                Math.ceil(game?.time ?? snapshot.remaining) % 60,
              ).padStart(2, '0')}
            </span>
            <small>TIME LEFT</small>
          </div>
          <div>
            <span className="score-number secondary">
              {String(game?.deaths || 0).padStart(2, '0')}
            </span>
            <span className="score-label">阵亡</span>
          </div>
        </div>
        <aside className="minimap-card">
          <div className="minimap-title">
            {level.english}
            <span>N ↑</span>
          </div>
          <canvas
            ref={map}
            width={320}
            height={280}
            aria-label="小地图：自己、地图掩体和补给，不显示其他玩家的位置"
          />
          <div className="map-legend">
            <span>
              <i className="player-dot" />你
            </span>
            <small>{level.name}</small>
          </div>
          <div className="supply-legend">
            <span>＋ 回血</span>
            <span>▰ 弹药</span>
            <span>◇ 护甲</span>
          </div>
        </aside>
        <div className="kill-feed pvp-kill-feed" aria-live="polite">
          {game?.feed.map((item) => (
            <div key={item.id}>
              <span>{item.text}</span>
              <Crosshair size={12} />
            </div>
          ))}
        </div>
        {game && !paused && game.phase !== 'dead' && (
          <>
            <CombatReticle game={game} />
            {game.hurt && game.lastHurt && (
              <div key={game.lastHurt.id} className="received-hit">
                <div
                  className="damage-direction"
                  style={{
                    transform: `translate(-50%,-50%) rotate(${game.lastHurt.angle}rad)`,
                  }}
                >
                  <i className="damage-arc" />
                  <span>▼</span>
                </div>
                <p>
                  <b className="damage-bearing-label">
                    {damageLabel(game.lastHurt.angle)}来袭
                  </b>
                  −{game.lastHurt.damage} HP
                </p>
              </div>
            )}
            {game.reloading && (
              <div className="reload-feedback">
                <div>
                  <RotateCcw size={15} />
                  <strong>{game.reloadLabel}</strong>
                  <span>{game.reloadProgress}%</span>
                </div>
                <Progress value={game.reloadProgress} aria-label="换弹进度" />
              </div>
            )}
            {game.health <= 30 && (
              <div className="critical-notice">
                生命值过低 · 寻找绿色急救包 ＋
              </div>
            )}
            <div className="movement-indicator">
              {game.sprinting ? '↑ 冲刺中' : game.crouching ? '↓ 蹲伏中' : ''}
            </div>
          </>
        )}
        {game && <CombatVitals game={game} reload={() => arena?.reload()} />}
        {!arena?.touchMode && (
          <>
            <div className="combat-loadout">
              {WEAPONS.map((w, i) => (
                <button
                  key={w.name}
                  disabled={(snapshot.mode || 'classic') !== 'classic'}
                  className={game?.weapon === i ? 'active' : ''}
                  onClick={() => arena?.selectWeapon(i)}
                >
                  <b>{i + 1}</b>
                  {w.name}
                </button>
              ))}
            </div>
            <button
              className="pvp-pause"
              onClick={() => arena?.pause()}
              aria-label="暂停"
            >
              <Pause size={15} /> Esc
            </button>
          </>
        )}
        {game?.phase === 'dead' && (
          <div className="death-overlay">
            <span className="handwritten">erased!</span>
            <h2>被擦掉了。</h2>
            <p>{Math.max(0, Math.ceil(game.respawn))} 秒后，重新落笔。</p>
          </div>
        )}
        {arena?.touchMode && game?.phase === 'running' && (
          <TouchControls arena={arena} game={game} />
        )}
        {(paused || !online) && (
          <div className="start-overlay">
            <div className="start-panel">
              <span className="handwritten overline">
                {online ? 'make your mark.' : 'hold that thought.'}
              </span>
              <h1>
                {online ? (
                  <>
                    准备好，
                    <br />
                    大画一场。
                  </>
                ) : (
                  '正在重新连线。'
                )}
              </h1>
              <p>
                {PVP_MODES[snapshot.mode || 'classic'].description}{' '}
                暂停时对局仍会继续。
              </p>
              <div className="level-objective">
                <span>01 / {level.name}</span>
                <b>真人对战 · 三分钟</b>
              </div>
              <label className="pvp-performance">
                <input
                  type="checkbox"
                  checked={performanceMode}
                  onChange={(e) => {
                    setPerformanceMode(e.target.checked);
                    arena?.setPerformanceMode(e.target.checked);
                  }}
                />
                流畅画质 · 降低渲染分辨率
              </label>
              {error && (
                <p role="alert" className="pvp-notice">
                  {error}
                </p>
              )}
              <button
                className="start-button"
                disabled={!arena || !online}
                onClick={play}
              >
                <Crosshair size={19} />
                {online ? '进入 / 继续' : '等待重连…'}
                <span>↗</span>
              </button>
              <div className="start-hint">
                {arena?.touchMode
                  ? '横屏 · 左手移动 · 右手瞄准'
                  : '全屏 · 锁定鼠标 · Esc 暂停'}
              </div>
              <button className="leave-combat" onClick={leave}>
                返回房间大厅 ↙
              </button>
            </div>
            <div className="scribble-note">
              <span>
                这次纸上的对手，
                <br />
                是你的朋友。
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PvpPage() {
  const [endpoint, setEndpoint] = useState(''),
    [mode, setMode] = useState<PvpMode>('classic'),
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
  const join = async (action: 'quick' | 'create' | 'code') => {
    if (!endpoint || busy) return;
    setBusy(true);
    setError('');
    try {
      const client = new Client(endpoint),
        options = { name, device, mode, touchPoints: navigator.maxTouchPoints };
      const r =
        action === 'quick'
          ? await client.joinOrCreate('battle', options)
          : action === 'create'
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
      let lastPhase = '',
        lastUiUpdate = 0;
      r.onMessage('snapshot', (s: PvpSnapshot) => {
        if (current.current !== r) return;
        const now = performance.now();
        if (
          s.phase !== lastPhase ||
          (s.phase !== 'playing' && now - lastUiUpdate >= 200)
        ) {
          lastPhase = s.phase;
          lastUiUpdate = now;
          setSnapshot(s);
        }
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
      if (mounted.current) {
        const message = e instanceof Error ? e.message : '';
        setError(
          /failed to fetch|networkerror|load failed/i.test(message)
            ? '无法连接对战服务器。请稍后重试；如果在内置浏览器中，请用 Chrome 或 Safari 打开 joyehuang.app/pvp。'
            : message || '连接失败，请稍后再试',
        );
      }
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
  const ended = snapshot?.phase === 'ended';
  const standings = [...(snapshot?.players || [])].sort(
    (a, b) => b.kills - a.kills || a.deaths - b.deaths || a.slot - b.slot,
  );
  const winner = standings[0];
  const leaders = standings.filter(
    (p) => p.kills === winner?.kills && p.deaths === winner?.deaths,
  );
  return (
    <main className="pvp-lobby">
      <Link href="/" prefetch={false}>
        ← 单人战场与训练场
      </Link>
      <span className="pvp-kicker">PAPERSTRIKE / PVP</span>
      <h1>
        {ended ? (
          <>
            这一页，
            <br />
            留下了战绩。
          </>
        ) : (
          <>
            叫上朋友，
            <br />
            在纸上交锋。
          </>
        )}
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
          <p>邀请朋友：填写昵称后创建房间，系统会生成房间码。</p>
          <label>
            玩法
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as PvpMode)}
            >
              {Object.entries(PVP_MODES).map(([id, item]) => (
                <option key={id} value={id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <p>{PVP_MODES[mode].description} 房间码加入时使用房主的玩法。</p>
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
            加入朋友的房间码
            <input
              value={code}
              maxLength={32}
              onChange={(e) => setCode(e.target.value)}
              placeholder="仅加入房间时填写，无需自己设置"
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
        <div className={`pvp-card ${ended ? 'pvp-results' : ''}`}>
          {ended && (
            <div className="pvp-result-heading">
              <Trophy size={34} />
              <span className="handwritten">page complete.</span>
            </div>
          )}
          <h2>
            {ended
              ? leaders.length > 1
                ? '势均力敌，一起落款。'
                : `${winner?.name || '画手'}，拿下这一页。`
              : '等待朋友落座。'}
          </h2>
          {ended && (
            <div className="result-stats">
              <span>
                <b>{own?.kills || 0}</b>你的击杀
              </span>
              <span>
                <b>{own?.deaths || 0}</b>你的阵亡
              </span>
              <span>
                <b>
                  {own
                    ? (own.kills / Math.max(1, own.deaths)).toFixed(1)
                    : '0.0'}
                </b>
                K / D
              </span>
            </div>
          )}
          <p>
            {PVP_MODES[snapshot?.mode || 'classic'].name} ·{' '}
            {PVP_MODES[snapshot?.mode || 'classic'].description}
          </p>
          {snapshot?.mode === 'locked' && (
            <label>
              本局武器
              <select
                value={own?.weapon ?? 3}
                disabled={own?.ready}
                onChange={(e) => room.send('weapon', Number(e.target.value))}
              >
                {WEAPONS.map((w, i) => (
                  <option key={i} value={i}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>
            把房间码发给同类设备的朋友。至少两人加入并准备后，房主即可开始。
          </p>
          <p>
            房间码 <strong>{room.roomId}</strong>
          </p>
          <table className="pvp-scoreboard">
            <thead>
              <tr>
                <th>名次</th>
                <th>画手</th>
                <th>击杀</th>
                <th>阵亡</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((p, i) => (
                <tr key={p.id} className={p.id === own?.id ? 'is-you' : ''}>
                  <td>
                    {ended
                      ? standings.findIndex(
                          (v) => v.kills === p.kills && v.deaths === p.deaths,
                        ) + 1
                      : i + 1}
                  </td>
                  <th scope="row">
                    {p.name}
                    {p.id === own?.id && <small>你</small>}
                  </th>
                  <td>{p.kills}</td>
                  <td>{p.deaths}</td>
                  <td>
                    {!p.connected ? '重连中' : p.ready ? '已准备' : '未准备'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pvp-buttons">
            <button onClick={() => room.send('ready', !own?.ready)}>
              {own?.ready ? '取消准备' : ended ? '再画一局 · 准备' : '准备'}
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
        占点与排位尚未开放。断线时会尝试恢复当前房间。
      </p>
    </main>
  );
}
