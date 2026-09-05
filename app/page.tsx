'use client';
import Link from 'next/link';
import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Crosshair,
  Volume2,
  VolumeX,
  Settings2,
  Maximize2,
  MoveUpRight,
  Heart,
  RotateCcw,
  Mouse,
  Keyboard,
  Pause,
  Shield,
  PackagePlus,
  Music2,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { LEVELS } from './game/levels';
import { MUSIC } from './game/audio';
import { damageLabel } from './game/combat-feedback';
import { Arena, drawWeapon, WEAPONS, type Snapshot } from './game/arena';
import { browserGameTools } from './game/webmcp';
import { TouchControls } from './touch-controls';

const finalCombatLevel = LEVELS.filter((l) => !l.practice).length - 1;

const initial: Snapshot = {
  phase: 'ready',
  health: 100,
  armor: 0,
  level: 0,
  won: false,
  reloadProgress: 0,
  reloadLabel: '',
  pickup: null,
  kills: 0,
  aliveEnemies: 0,
  deaths: 0,
  time: 180,
  weapon: 3,
  ammo: 30,
  reserve: 150,
  reloading: false,
  aiming: false,
  hit: false,
  hurt: false,
  respawn: 0,
  feed: [],
  shots: 0,
  hits: 0,
  sprinting: false,
  crouching: false,
  fps: 0,
  lastHit: null,
  lastHurt: null,
};
const controls = [
  ['W A S D', '移动'],
  ['鼠标', '转动视角'],
  ['左键', '射击'],
  ['右键', '按住瞄准'],
  ['1 – 4', '切换武器'],
  ['R', '换弹'],
  ['Shift', '冲刺'],
  ['C / Ctrl', '蹲下'],
  ['Space', '跳跃'],
  ['Esc', '暂停'],
];
const WeaponDrawing = memo(function WeaponDrawing({
  index,
}: {
  index: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawWeapon(canvas.current, index);
  }, [index]);
  return (
    <canvas
      ref={canvas}
      width={420}
      height={126}
      className="weapon-drawing"
      aria-hidden="true"
    />
  );
});

const LevelMap = memo(function LevelMap({ index }: { index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const level = LEVELS[index];
    ctx.clearRect(0, 0, 100, 100);
    ctx.fillStyle = '#fcfaf1';
    ctx.fillRect(0, 0, 100, 100);
    for (const o of level.obstacles) {
      ctx.fillStyle = o.kind === 'wall' ? level.color : '#c9c2ac';
      ctx.strokeStyle = '#696956';
      ctx.lineWidth = 0.6;
      const x = ((o.x - o.w / 2 + 22) * 100) / 44,
        y = ((o.z - o.d / 2 + 22) * 100) / 44;
      ctx.fillRect(x, y, (o.w * 100) / 44, (o.d * 100) / 44);
      ctx.strokeRect(x, y, (o.w * 100) / 44, (o.d * 100) / 44);
    }
    for (const p of level.pickups) {
      ctx.fillStyle =
        p.kind === 'health'
          ? '#25976c'
          : p.kind === 'shield'
            ? '#477fc1'
            : '#d4982b';
      ctx.fillRect(
        ((p.x + 22) * 100) / 44 - 1.8,
        ((p.z + 22) * 100) / 44 - 1.8,
        3.6,
        3.6,
      );
    }
  }, [index]);
  return (
    <canvas
      ref={ref}
      width={100}
      height={100}
      aria-hidden="true"
      className="level-map-preview"
    />
  );
});

export default function Home() {
  const scene = useRef<HTMLDivElement>(null),
    minimap = useRef<HTMLCanvasElement>(null),
    arena = useRef<Arena | null>(null);
  const [game, setGame] = useState<Snapshot>(initial),
    [muted, setMuted] = useState(false),
    [help, setHelp] = useState(false),
    [settings, setSettings] = useState(false),
    [sensitivity, setSensitivity] = useState(45),
    [volume, setVolume] = useState(55),
    [musicVolume, setMusicVolume] = useState(28),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [immersive, setImmersive] = useState(false),
    [motionAmount, setMotionAmount] = useState(25);
  const [touch, setTouch] = useState(false);
  const [engine, setEngine] = useState<Arena | null>(null);
  const [unlimited, setUnlimited] = useState(true);
  useEffect(() => {
    let instance: Arena | null = null;
    let cleanup = () => {};
    // Initialize after layout so the renderer starts with the canvas's measured size.
    const frame = requestAnimationFrame(() => {
      if (!scene.current || !minimap.current) return;
      try {
        instance = new Arena(scene.current, minimap.current, setGame, setError);
        arena.current = instance;
        setEngine(instance);
        setTouch(instance.touchMode);
        cleanup = browserGameTools(instance);
        setLoaded(true);
      } catch {
        setError(
          '三维画面未能启动。请使用支持 WebGL 的浏览器，并开启硬件加速。',
        );
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      cleanup();
      instance?.dispose();
      arena.current = null;
    };
  }, []);
  useEffect(() => {
    if (arena.current) {
      arena.current.muted = muted;
      arena.current.volume = volume / 100;
      arena.current.musicVolume = musicVolume / 100;
      arena.current.sensitivity = sensitivity / 45;
      arena.current.motionAmount = motionAmount / 100;
    }
  }, [muted, volume, musicVolume, sensitivity, motionAmount]);
  useEffect(() => {
    const listener = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);
  const launch = () => {
      setError('');
      setImmersive(true);
      if (touch && window.innerHeight > window.innerWidth) return;
      arena.current?.start();
    },
    overlay = ['ready', 'paused', 'ended'].includes(game.phase),
    weapon = WEAPONS[game.weapon],
    level = LEVELS[game.level],
    track = MUSIC[level.music as keyof typeof MUSIC];
  const advance = () => {
    if (arena.current?.selectLevel(game.level + 1)) launch();
  };
  const leaveCombat = () => {
    arena.current?.pause();
    setImmersive(false);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    const rotate = () => {
      if (arena.current?.touchMode && window.innerHeight > window.innerWidth)
        arena.current.pause();
    };
    window.addEventListener('resize', rotate);
    return () => window.removeEventListener('resize', rotate);
  }, []);
  return (
    <main
      className={`app ${touch ? 'touch-mode' : ''} ${fullscreen ? 'is-fullscreen' : ''} ${immersive ? 'play-mode' : ''}`}
    >
      <header className="site-header">
        <Link
          href="/"
          prefetch={false}
          className="brand"
          aria-label="Paperstrike 首页"
        >
          <span className="brand-icon">
            <Crosshair size={29} strokeWidth={1.7} />
          </span>
          <span>
            PAPER<span className="strike-word">STRIKE</span>
            <i>®</i>
          </span>
        </Link>
        <div className="header-note">
          a little ink. a lot of action.<span className="note-arrow">↴</span>
        </div>
        <div className="header-actions">
          <a
            href="/pvp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-button"
          >
            多人对战 ↗
          </a>
          <span className="prototype-tag">
            <span />
            可玩原型 v0.3
          </span>
          <button
            className="icon-button"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? '开启声音' : '静音'}
            title={muted ? '开启声音' : '静音'}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              arena.current?.pause();
              setSettings(true);
            }}
            aria-label="游戏设置"
            title="游戏设置"
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      <section className="arena-section">
        <div className="section-heading">
          <div className="arena-label">
            <span className="ink-dot" />
            {level.practice ? '训练场' : '闯关混战'}
            <span className="slash">/</span>
            <span className="muted">
              {level.practice ? '练准心，也练手感' : '你 vs. 涂鸦小队'}
            </span>
          </div>
          <button
            className="text-button"
            onClick={() => {
              arena.current?.pause();
              setHelp(true);
            }}
          >
            <Keyboard size={16} />
            操作说明
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div
          className={`game-frame ${game.aiming && game.weapon === 2 ? 'scoped' : ''} ${game.hurt ? 'hurt' : ''} ${game.health <= 30 && game.phase === 'running' ? 'critical-health' : ''}`}
          id="game-frame"
        >
          <div ref={scene} className="scene" aria-label="三维手绘射击竞技场" />
          {touch && immersive && (
            <div className="rotate-notice">
              <strong>请横过手机</strong>
              <p>左手移动，右手瞄准。横屏后点击开始或继续。</p>
              <button onClick={leaveCombat}>返回菜单</button>
            </div>
          )}
          {touch && game.phase === 'running' && engine && (
            <TouchControls arena={engine} game={game} />
          )}
          <div className="paper-grain" />
          <div className="game-top-left">
            <span className="live-dot" />
            <span>
              {game.phase === 'running'
                ? 'LIVE MATCH'
                : game.phase === 'paused'
                  ? 'PAUSED'
                  : 'DEATHMATCH'}
            </span>
            <small>
              {level.practice
                ? '练习画室 · 靶子不会还击'
                : `第 ${game.level + 1} 关 · 敌人 ${game.aliveEnemies} / ${level.enemies} 存活`}
            </small>
          </div>
          <div className="match-score">
            <div>
              <span className="score-number">
                {String(game.kills).padStart(2, '0')}
              </span>
              <span className="score-label">
                {level.practice ? '击倒靶子' : `击杀 / 目标 ${level.goal}`}
              </span>
            </div>
            <div className="match-time">
              <span>
                {level.practice ? '∞' : Math.floor(game.time / 60)}
                {!level.practice && (
                  <>
                    <b>:</b>
                    {String(Math.ceil(game.time % 60)).padStart(2, '0')}
                  </>
                )}
              </span>
              <small>{level.practice ? '自由练习' : 'TIME LEFT'}</small>
            </div>
            <div>
              <span className="score-number secondary">
                {level.practice
                  ? `${game.shots ? Math.round((game.hits / game.shots) * 100) : 0}%`
                  : String(game.deaths).padStart(2, '0')}
              </span>
              <span className="score-label">
                {level.practice ? '命中率' : '阵亡'}
              </span>
            </div>
          </div>
          <aside className="minimap-card">
            <div className="minimap-title">
              {level.english}
              <span>N ↑</span>
            </div>
            <canvas
              ref={minimap}
              width={320}
              height={280}
              aria-label="小地图：蓝色箭头是玩家，橙色圆点是敌人，绿色加号是急救包，黄色方块是弹药，蓝色菱形是护甲"
            />
            <div className="map-legend">
              <span>
                <i className="player-dot" />你
              </span>
              <span>
                <i className="enemy-dot" />
                敌人
              </span>
              <small>
                0{game.level + 1} / {level.name}
              </small>
            </div>
            <div className="supply-legend">
              <span>＋ 回血</span>
              <span>▰ 弹药</span>
              <span>◇ 护甲</span>
            </div>
          </aside>
          <div className="kill-feed" aria-live="polite">
            {game.feed.slice(-3).map((item) => (
              <div key={item.id}>
                <span>{item.text}</span>
                <Crosshair size={12} />
              </div>
            ))}
          </div>
          <div className="world-note">
            <span>一张纸，就是整个战场。</span>
            <MoveUpRight size={28} strokeWidth={1.1} />
          </div>
          {!overlay && game.phase !== 'dead' && (
            <>
              <div
                className={`crosshair ${game.hit ? 'confirmed' : ''} ${game.hit && game.lastHit?.killed ? 'kill-confirmed' : ''} ${game.aiming ? 'ads' : ''}`}
              >
                <i />
                <i />
                <i />
                <i />
                <b />
              </div>
              {game.weapon === 2 && game.aiming && (
                <div className="scope-mask">
                  <div className="scope-reticle">
                    <i />
                    <b />
                    <span>× 4.0</span>
                  </div>
                </div>
              )}
              {game.hurt && game.lastHurt && (
                <div
                  key={game.lastHurt.id}
                  className="received-hit"
                  aria-live="polite"
                >
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
                    {game.lastHurt.damage > 0
                      ? '−' + game.lastHurt.damage + ' HP'
                      : '护甲抵挡'}{' '}
                    <span>
                      受到 涂鸦 {String(game.lastHurt.target).padStart(2, '0')}{' '}
                      的攻击
                    </span>
                  </p>
                </div>
              )}
              {game.pickup && (
                <output
                  key={game.pickup.id}
                  className={'pickup-feedback ' + game.pickup.kind}
                >
                  {game.pickup.kind === 'health' ? (
                    <Heart size={22} />
                  ) : game.pickup.kind === 'shield' ? (
                    <Shield size={22} />
                  ) : (
                    <PackagePlus size={22} />
                  )}
                  <strong>{game.pickup.text}</strong>
                  <span>已拾取</span>
                </output>
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
          {overlay && !error && (
            <div className="start-overlay">
              <div className="start-panel">
                <span className="handwritten overline">
                  {game.phase === 'ended'
                    ? game.won
                      ? 'page cleared!'
                      : 'one more try.'
                    : game.phase === 'paused'
                      ? 'take a breather.'
                      : 'make your mark.'}
                </span>
                <h1>
                  {game.phase === 'ended' ? (
                    game.won ? (
                      game.level === finalCombatLevel ? (
                        '天台速写，拿下了。'
                      ) : (
                        '这张画纸，拿下了。'
                      )
                    ) : (
                      '差一点，再来一局。'
                    )
                  ) : game.phase === 'paused' ? (
                    '笔先放一下。'
                  ) : (
                    <>
                      准备好，
                      <br />
                      大画一场。
                    </>
                  )}
                </h1>
                {game.phase === 'ended' ? (
                  <div className="result-stats">
                    <span>
                      <b>{game.kills}</b> 击杀
                    </span>
                    <span>
                      <b>{game.deaths}</b> 阵亡
                    </span>
                    <span>
                      <b>
                        {game.shots
                          ? Math.round((game.hits / game.shots) * 100)
                          : 0}
                        %
                      </b>{' '}
                      命中率
                    </span>
                  </div>
                ) : (
                  <p>
                    {game.phase === 'paused'
                      ? '战场已暂停，准备好了就继续。'
                      : level.description}
                  </p>
                )}
                <div className="level-objective">
                  <span>
                    0{game.level + 1} / {level.name}
                  </span>
                  <b>
                    {level.practice
                      ? '静止靶 + 移动靶 · 不限时'
                      : `${level.goal} 次击杀 · ${level.duration / 60} 分钟`}
                  </b>
                </div>
                {level.practice && (
                  <div className="training-options">
                    <label>
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={(e) => {
                          setUnlimited(e.target.checked);
                          if (arena.current)
                            arena.current.trainingUnlimited = e.target.checked;
                        }}
                      />
                      无限备用弹药（仍需换弹）
                    </label>
                    <button onClick={() => arena.current?.resetTraining()}>
                      重置练习统计
                    </button>
                  </div>
                )}
                <button
                  className="start-button"
                  disabled={!loaded}
                  onClick={
                    game.phase === 'ended' &&
                    game.won &&
                    game.level < finalCombatLevel
                      ? advance
                      : launch
                  }
                >
                  {game.phase === 'ended' ? (
                    <RotateCcw size={19} />
                  ) : (
                    <Crosshair size={19} />
                  )}{' '}
                  {loaded
                    ? game.phase === 'paused'
                      ? '继续战斗'
                      : game.phase === 'ended'
                        ? game.won && game.level < finalCombatLevel
                          ? '进入下一关'
                          : '再画一局'
                        : level.practice
                          ? '进入训练场'
                          : touch
                            ? '横屏进入战场'
                            : '全屏进入战场'
                    : '正在铺开画纸…'}
                  <span>↗</span>
                </button>
                {game.phase === 'ended' &&
                  game.won &&
                  game.level < finalCombatLevel && (
                    <button className="replay-level" onClick={launch}>
                      重玩这一关
                    </button>
                  )}
                <div className="start-hint">
                  <Mouse size={14} />
                  {touch
                    ? '左摇杆移动 · 右侧滑动瞄准 · 点击暂停'
                    : '全屏 · 锁定鼠标 · Esc 暂停'}
                </div>
                {immersive && (
                  <button className="leave-combat" onClick={leaveCombat}>
                    选择关卡 / 武器 ↙
                  </button>
                )}
              </div>
              <div className="scribble-note">
                <span>
                  别被画风骗了，
                  <br />
                  它们真的会还手。
                </span>
                <span className="curved-arrow">⤴</span>
              </div>
            </div>
          )}
          {error && (
            <div className="error-panel" role="alert">
              <strong>稍等，画笔卡住了。</strong>
              <p>{error}</p>
              <button className="text-button" onClick={launch}>
                重新尝试 ↗
              </button>
              <button className="leave-combat" onClick={leaveCombat}>
                返回武器台
              </button>
            </div>
          )}
          {game.phase === 'dead' && (
            <div className="death-overlay">
              <span className="handwritten">erased!</span>
              <h2>被擦掉了。</h2>
              <p>{Math.ceil(game.respawn)} 秒后，重新落笔。</p>
            </div>
          )}
          <div className="bottom-hud">
            <div className="health-hud">
              <Heart size={22} strokeWidth={1.8} />
              <div>
                <span className="health-number">
                  {Math.ceil(game.health)} <small>/ 100</small>
                </span>
                <div className="health-track">
                  <b
                    className="health-trail"
                    style={{ width: game.health + '%' }}
                  />
                  <span style={{ width: `${game.health}%` }} />
                </div>
              </div>
              <span className="health-caption">
                {game.armor > 0 ? (
                  <>
                    <Shield size={14} /> {game.armor} 护甲
                  </>
                ) : game.health <= 30 ? (
                  '寻找急救包'
                ) : (
                  '生命值'
                )}
              </span>
            </div>
            <div className="location-label">
              <span className="handwritten">{level.english}</span>
              <small>
                {level.name} / ARENA 0{game.level + 1}
              </small>
            </div>
            <div className="ammo-hud">
              <span className="ammo-icon">▰ ▰ ▰</span>
              <div>
                <span className="ammo-number">
                  {game.reloading ? '···' : String(game.ammo).padStart(2, '0')}
                  <small> / {game.reserve}</small>
                </span>
                <small>
                  {game.reloading
                    ? game.reloadLabel
                    : `${weapon.name} · ${weapon.mode}`}
                </small>
              </div>
              <button
                onClick={() => arena.current?.reload()}
                className="reload-key"
                title="换弹"
              >
                R
              </button>
            </div>
          </div>
          <button
            className="fullscreen-button"
            aria-label={fullscreen || immersive ? '返回窗口' : '全屏竞技场'}
            onClick={() => {
              if (immersive || fullscreen) leaveCombat();
              else {
                setImmersive(true);
                if (document.fullscreenEnabled)
                  void document.documentElement
                    .requestFullscreen({ navigationUI: 'hide' })
                    .catch(() => {});
              }
            }}
          >
            <Maximize2 size={16} />
          </button>
          <div className="combat-loadout">
            {WEAPONS.map((item, index) => (
              <button
                key={item.name}
                className={game.weapon === index ? 'active' : ''}
                onClick={() => arena.current?.selectWeapon(index)}
                aria-label={`装备${item.name}`}
              >
                <kbd>{index + 1}</kbd>
                {item.name}
              </button>
            ))}
          </div>
          <span className="performance-readout">
            {game.fps > 0 ? `${game.fps} FPS` : 'PAPERSTRIKE'}
            <span>自适应画质</span>
          </span>
          {game.phase === 'running' && (
            <button
              className="pause-button"
              onClick={() => arena.current?.pause()}
              aria-label="暂停"
            >
              <Pause size={17} />
            </button>
          )}
        </div>
        <section className="level-section" aria-labelledby="level-heading">
          <div className="level-section-heading">
            <h2 id="level-heading">换一张画纸。</h2>
            <span>选择关卡 · 达成击杀目标即可通关</span>
          </div>
          <RadioGroup
            aria-label="选择关卡"
            value={String(game.level)}
            onValueChange={(value) => arena.current?.selectLevel(Number(value))}
            className="level-grid"
            disabled={game.phase === 'running' || game.phase === 'dead'}
          >
            {LEVELS.map((item, index) => (
              <label
                htmlFor={'level-' + index}
                className={
                  'level-card ' + (game.level === index ? 'selected' : '')
                }
                key={item.name}
              >
                <LevelMap index={index} />
                <div className="level-card-info">
                  <span className="level-number">
                    {item.practice ? '独立训练场' : `关卡 0${index + 1}`}{' '}
                    <RadioGroupItem
                      id={'level-' + index}
                      value={String(index)}
                      aria-label={item.name}
                    />
                  </span>
                  <strong>{item.name}</strong>
                  <span>{item.tactic}</span>
                  <small>
                    {item.practice
                      ? '5 座靶子 · 不限时 · 可选无限弹药'
                      : `最多 ${item.enemies} 名对手 · ${item.goal} 次击杀`}
                  </small>
                </div>
                <ChevronRight size={17} className="level-card-arrow" />
              </label>
            ))}
          </RadioGroup>
          <div className="supply-notes">
            <span>
              <Heart size={15} />
              急救包 +40
            </span>
            <span>
              <PackagePlus size={15} />
              各武器补充弹药
            </span>
            <span>
              <Shield size={15} />
              护甲 +30，最多 50
            </span>
            <small>走近自动拾取 · 18–25 秒刷新</small>
          </div>
        </section>
        <div className="loadout-heading">
          <div>
            <span className="handwritten">Pick your pencil.</span>
            <span className="muted">选一把，留下点痕迹。</span>
          </div>
          <span className="switch-hint">
            <kbd>1</kbd> — <kbd>4</kbd>切换武器<span>/</span>滚轮切换
          </span>
        </div>
        <div className="weapon-grid">
          {WEAPONS.map((item, index) => (
            <button
              key={item.name}
              aria-pressed={game.weapon === index}
              className={`weapon-card ${game.weapon === index ? 'selected' : ''}`}
              onClick={() => arena.current?.selectWeapon(index)}
            >
              <span className="weapon-number">0{index + 1}</span>
              <span className="weapon-shortcut">{index + 1}</span>
              <WeaponDrawing index={index} />
              <div className="weapon-card-bottom">
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.english}</span>
                </div>
                <span className="weapon-trait">
                  {game.weapon === index ? (
                    <>
                      <span className="tiny-dot" />
                      已装备
                    </>
                  ) : (
                    item.trait
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="controls-strip">
          <span>
            <kbd>W A S D</kbd>移动
          </span>
          <span>
            <Mouse size={15} />
            左键射击 / 右键瞄准
          </span>
          <span>
            <kbd>R</kbd>换弹
          </span>
          <span>
            <kbd>Space</kbd>跳跃
          </span>
          <span>
            <kbd>Shift</kbd>冲刺
          </span>
          <span>
            <kbd>C</kbd>蹲下
          </span>
          <span>
            <kbd>Esc</kbd>暂停
          </span>
        </div>
      </section>
      <footer className="site-footer">
        <span>
          <span className="orange-star">✳</span>画得随意，打得认真。
        </span>
        <span>
          NO TEXTURES. JUST CHARACTER.
          <span className="footer-page">PAGE 001 ↗</span>
        </span>
      </footer>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="paper-dialog">
          <DialogTitle>操作手册 / FIELD NOTES</DialogTitle>
          <DialogDescription>
            在三张地图挑战涂鸦小队，3 分钟内分别完成 12、16、20
            次击杀即可通关。阵亡 3 秒后重生，武器补满弹药。
          </DialogDescription>
          <div className="help-grid">
            {(touch
              ? [
                  ['左摇杆', '移动，向前推满冲刺'],
                  ['右侧滑动', '转动视角'],
                  ['开火', '点击射击，步枪可按住'],
                  ['开镜 / 蹲下', '点击切换状态'],
                  ['跳跃 / 换弹', '点击执行'],
                  ['暂停', '暂停并返回菜单'],
                ]
              : controls
            ).map(([key, action]) => (
              <div key={key}>
                <kbd>{key}</kbd>
                <span>{action}</span>
              </div>
            ))}
          </div>
          <p className="dialog-note">
            练习画室提供静止靶和移动靶，不限时、不会受伤，可在暂停面板重置统计或切换无限备用弹药。
            小地图蓝点是你，橙点是敌人。利用掩体躲避攻击，蹲下能降低散布，狙击枪开镜可放大
            4 倍。走近绿色急救包恢复 40
            点生命，黄色弹药箱补充各武器备用弹药，蓝色护甲片增加 30
            点护甲。补给会在 18–25 秒后刷新。
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="paper-dialog">
          <DialogTitle>调整画笔 / SETTINGS</DialogTitle>
          <DialogDescription>找到顺手的瞄准速度和声音大小。</DialogDescription>
          <div className="setting-row">
            <label>
              {touch ? '触屏灵敏度' : '鼠标灵敏度'}
              <b>{sensitivity}</b>
            </label>
            <Slider
              aria-label={touch ? '触屏灵敏度' : '鼠标灵敏度'}
              min={10}
              max={100}
              value={[sensitivity]}
              onValueChange={(value) =>
                setSensitivity(Array.isArray(value) ? value[0] : value)
              }
            />
          </div>
          <div className="setting-row">
            <label>
              音效音量<b>{volume}%</b>
            </label>
            <Slider
              aria-label="音效音量"
              min={0}
              max={100}
              value={[volume]}
              onValueChange={(value) =>
                setVolume(Array.isArray(value) ? value[0] : value)
              }
            />
          </div>
          <div className="setting-row">
            <label>
              音乐音量<b>{musicVolume}%</b>
            </label>
            <Slider
              aria-label="音乐音量"
              min={0}
              max={100}
              value={[musicVolume]}
              onValueChange={(value) =>
                setMusicVolume(Array.isArray(value) ? value[0] : value)
              }
            />
          </div>
          <div className="music-credit">
            <Music2 size={17} />
            <div>
              <span>本关配乐</span>
              <a href={track.source} target="_blank" rel="noreferrer">
                {track.title} ↗
              </a>
              <small>Vitalezzz · CC0 / 音效：Kenney</small>
            </div>
            <a href="/audio/credits.txt" target="_blank" rel="noreferrer">
              鸣谢
            </a>
          </div>
          <div className="setting-row">
            <label>
              镜头动作幅度<b>{motionAmount}%</b>
            </label>
            <Slider
              aria-label="镜头动作幅度"
              min={0}
              max={100}
              value={[motionAmount]}
              onValueChange={(value) =>
                setMotionAmount(Array.isArray(value) ? value[0] : value)
              }
            />
          </div>
          <button className="outline-button" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}{' '}
            {muted ? '声音已关闭 · 点击开启' : '声音已开启 · 点击静音'}
          </button>
          <p className="dialog-note">推荐使用桌面浏览器、键盘和鼠标游玩。</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
