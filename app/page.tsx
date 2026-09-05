'use client';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Arena, drawWeapon, WEAPONS, type Snapshot } from './game/arena';
import { browserGameTools } from './game/webmcp';

const initial: Snapshot = {
  phase: 'ready',
  health: 100,
  kills: 0,
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
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [immersive, setImmersive] = useState(false),
    [motionAmount, setMotionAmount] = useState(25);
  useEffect(() => {
    if (!scene.current || !minimap.current) return;
    try {
      const instance = new Arena(
        scene.current,
        minimap.current,
        setGame,
        setError,
      );
      arena.current = instance;
      const cleanup = browserGameTools(instance);
      setLoaded(true);
      return () => {
        cleanup();
        instance.dispose();
        arena.current = null;
      };
    } catch {
      setError(
        '三维画面未能启动。请使用支持 WebGL 的桌面浏览器，并开启硬件加速。',
      );
    }
  }, []);
  useEffect(() => {
    if (arena.current) {
      arena.current.muted = muted;
      arena.current.volume = volume / 100;
      arena.current.sensitivity = sensitivity / 45;
      arena.current.motionAmount = motionAmount / 100;
    }
  }, [muted, volume, sensitivity, motionAmount]);
  useEffect(() => {
    const listener = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);
  const launch = () => {
      setError('');
      setImmersive(true);
      arena.current?.start();
    },
    overlay = ['ready', 'paused', 'ended'].includes(game.phase),
    weapon = WEAPONS[game.weapon];
  const leaveCombat = () => {
    arena.current?.pause();
    setImmersive(false);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  };
  return (
    <main
      className={`app ${fullscreen ? 'is-fullscreen' : ''} ${immersive ? 'play-mode' : ''}`}
    >
      <header className="site-header">
        <a href="/" className="brand" aria-label="Paperstrike 首页">
          <span className="brand-icon">
            <Crosshair size={29} strokeWidth={1.7} />
          </span>
          <span>
            PAPER<span className="strike-word">STRIKE</span>
            <i>®</i>
          </span>
        </a>
        <div className="header-note">
          a little ink. a lot of action.<span className="note-arrow">↴</span>
        </div>
        <div className="header-actions">
          <span className="prototype-tag">
            <span />
            可玩原型 v0.2
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
            自由混战<span className="slash">/</span>
            <span className="muted">你 vs. 涂鸦小队</span>
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
            <small>3 分钟 · 5 名 AI 对手</small>
          </div>
          <div className="match-score">
            <div>
              <span className="score-number">
                {String(game.kills).padStart(2, '0')}
              </span>
              <span className="score-label">击杀</span>
            </div>
            <div className="match-time">
              <span>
                {Math.floor(game.time / 60)}
                <b>:</b>
                {String(Math.ceil(game.time % 60)).padStart(2, '0')}
              </span>
              <small>TIME LEFT</small>
            </div>
            <div>
              <span className="score-number secondary">
                {String(game.deaths).padStart(2, '0')}
              </span>
              <span className="score-label">阵亡</span>
            </div>
          </div>
          <aside className="minimap-card">
            <div className="minimap-title">
              THE SCRAPYARD<span>N ↑</span>
            </div>
            <canvas
              ref={minimap}
              width={320}
              height={280}
              aria-label="小地图：蓝色为玩家，橙色为敌人"
            />
            <div className="map-legend">
              <span>
                <i className="player-dot" />你
              </span>
              <span>
                <i className="enemy-dot" />
                敌人
              </span>
              <small>01 / 废稿堆场</small>
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
              {game.lastHit && (
                <div
                  key={game.lastHit.id}
                  className={`hit-feedback ${game.lastHit.killed ? 'is-kill' : ''}`}
                >
                  <strong className="damage-number">
                    {game.lastHit.killed ? '✕ ' : ''}−{game.lastHit.damage}
                  </strong>
                  <span>
                    {game.lastHit.killed
                      ? '击杀确认'
                      : game.lastHit.headshot
                        ? '爆头命中'
                        : '命中'}
                  </span>
                  <div className="target-health">
                    <span>
                      涂鸦 {String(game.lastHit.target).padStart(2, '0')}
                      <b>{game.lastHit.health} / 100</b>
                    </span>
                    <i>
                      <b style={{ width: game.lastHit.health + '%' }} />
                    </i>
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
                    <span>▼</span>
                  </div>
                  <p>
                    −{game.lastHurt.damage} HP{' '}
                    <span>
                      受到 涂鸦 {String(game.lastHurt.target).padStart(2, '0')}{' '}
                      的攻击
                    </span>
                  </p>
                </div>
              )}
              {game.health <= 30 && (
                <div className="critical-notice">生命值过低 · 寻找掩体</div>
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
                    ? 'that’s a wrap!'
                    : game.phase === 'paused'
                      ? 'take a breather.'
                      : 'make your mark.'}
                </span>
                <h1>
                  {game.phase === 'ended' ? (
                    '这一局，画完了。'
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
                      : '四把枪，一张草稿纸。留下你的战绩。'}
                  </p>
                )}
                <button
                  className="start-button"
                  disabled={!loaded}
                  onClick={launch}
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
                        ? '再画一局'
                        : '全屏进入战场'
                    : '正在铺开画纸…'}
                  <span>↗</span>
                </button>
                <div className="start-hint">
                  <Mouse size={14} />
                  全屏 · 锁定鼠标<span>·</span>Esc 暂停
                </div>
                {immersive && (
                  <button className="leave-combat" onClick={leaveCombat}>
                    返回武器台 ↙
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
                {game.health <= 30 ? '寻找掩体' : '生命值'}
              </span>
            </div>
            <div className="location-label">
              <span className="handwritten">The Scrapyard</span>
              <small>废稿堆场 / ARENA 01</small>
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
                    ? '正在换弹…'
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
            在废稿堆场与 5 名 AI 对战，3 分钟内争取更多击杀。阵亡 3
            秒后重生，所有武器会补满弹药。
          </DialogDescription>
          <div className="help-grid">
            {controls.map(([key, action]) => (
              <div key={key}>
                <kbd>{key}</kbd>
                <span>{action}</span>
              </div>
            ))}
          </div>
          <p className="dialog-note">
            小地图蓝点是你，橙点是敌人。利用掩体躲避攻击，蹲下能降低散布，狙击枪开镜可放大
            4 倍。
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="paper-dialog">
          <DialogTitle>调整画笔 / SETTINGS</DialogTitle>
          <DialogDescription>找到顺手的瞄准速度和声音大小。</DialogDescription>
          <div className="setting-row">
            <label>
              鼠标灵敏度<b>{sensitivity}</b>
            </label>
            <Slider
              aria-label="鼠标灵敏度"
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
