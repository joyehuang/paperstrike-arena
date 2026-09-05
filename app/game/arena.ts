import * as THREE from 'three';
import { batchSketch, CombatEffects, renderPixelRatio } from './rendering';
import { enterCombatView } from './presentation';
import type { PvpLink, PvpSnapshot, PvpMode } from './pvp-protocol';
import { enemySpawn, damageBearing } from './combat-feedback';
import { LEVELS, type PickupSpot } from './levels';
import { PICKUPS, collectSupply, absorbDamage, reloadPose } from './supplies';
import { GameAudio, type Sound } from './audio';
import {
  PHYSICS_STEP,
  createMotion,
  stepMotion,
  damp,
  viewFov,
  obstacleColor,
  rayBox,
  worldHitDistance,
} from './rules';
import { WEAPONS, moveBody, navigationField } from './rules';
export { WEAPONS } from './rules';
export type Snapshot = {
  phase: 'ready' | 'running' | 'paused' | 'dead' | 'ended';
  health: number;
  armor: number;
  level: number;
  won: boolean;
  reloadProgress: number;
  reloadLabel: string;
  pickup: { id: number; text: string; kind: PickupSpot['kind'] } | null;
  kills: number;
  aliveEnemies: number;
  deaths: number;
  time: number;
  weapon: number;
  ammo: number;
  reserve: number;
  reloading: boolean;
  aiming: boolean;
  hit: boolean;
  hurt: boolean;
  respawn: number;
  feed: { id: number; text: string }[];
  shots: number;
  hits: number;
  sprinting: boolean;
  crouching: boolean;
  fps: number;
  lastHit: {
    id: number;
    damage: number;
    health: number;
    target: number;
    headshot: boolean;
    killed: boolean;
  } | null;
  lastHurt: {
    id: number;
    damage: number;
    absorbed: number;
    angle: number;
    sourceX: number;
    sourceZ: number;
    target: number;
  } | null;
};
type Bot = {
  group: THREE.Group;
  health: number;
  alive: boolean;
  respawn: number;
  cooldown: number;
  id: number;
  legs: THREE.Group[];
  target: THREE.Vector3;
  repath: number;
  healthBar: THREE.Sprite;
  flash: number;
  surface: THREE.MeshLambertMaterial;
};
const ink = 0x394755,
  paper = 0xf1ead7,
  orange = 0xe77863;
const seeded = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function drawWeapon(canvas: HTMLCanvasElement, index: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(210, 65);
  ctx.scale(index === 0 ? 1.1 : 1, 1);
  ctx.rotate(-0.035);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const polygon = (points: number[][], fill = '#ece9df') => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#4b4b40';
    ctx.lineWidth = 2.1;
    ctx.stroke();
    ctx.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? ctx.lineTo(x + Math.sin(i * 4) * 1.3, y + 1.2)
        : ctx.moveTo(x + 0.8, y + 1.1),
    );
    ctx.closePath();
    ctx.strokeStyle = '#77736765';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  };
  const line = (a: number, b: number, c: number, d: number) => {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#646354';
    ctx.stroke();
  };
  if (index === 0) {
    polygon([
      [-62, -19],
      [64, -19],
      [67, -2],
      [15, 0],
      [10, 10],
      [-3, 10],
      [-12, 42],
      [-39, 40],
      [-32, 0],
      [-61, 0],
    ]);
    polygon(
      [
        [-62, -19],
        [65, -19],
        [65, -3],
        [-62, -3],
      ],
      '#d6d4ca',
    );
    for (let n = 0; n < 5; n++) line(-49 + n * 5, -16, -51 + n * 5, -7);
    polygon(
      [
        [-29, 3],
        [-5, 5],
        [-14, 37],
        [-34, 36],
      ],
      '#cdcabb',
    );
    line(14, 3, 17, 19);
    line(17, 19, -6, 19);
    line(-10, 10, 4, 10);
  } else {
    const barrel = index === 2 ? 139 : index === 1 ? 127 : 125;
    polygon(
      [
        [-76, -12],
        [49, -12],
        [55, 10],
        [-22, 13],
        [-27, 38],
        [-45, 34],
        [-42, 10],
        [-76, 7],
      ],
      '#e4e1d5',
    );
    polygon(
      [
        [45, -10],
        [barrel, -10],
        [barrel, -3],
        [45, -2],
      ],
      '#c5c4b9',
    );
    polygon(
      [
        [-75, -9],
        [-120, -3],
        [-143, -11],
        [-144, 18],
        [-122, 19],
        [-76, 6],
      ],
      '#dad5c5',
    );
    if (index === 1) {
      polygon(
        [
          [23, 0],
          [101, 0],
          [100, 13],
          [22, 13],
        ],
        '#c5c2b1',
      );
      for (let n = 0; n < 9; n++) line(30 + n * 7, 3, 28 + n * 7, 10);
      line(-64, -6, 31, -6);
    } else {
      polygon(
        [
          [-6, 10],
          [17, 11],
          [21, 36],
          [9, 42],
          [-8, 38],
        ],
        '#c3c1b3',
      );
      for (let n = 0; n < 4; n++) line(-2 + n * 5, 15, 2 + n * 5, 32);
      polygon(
        [
          [24, -11],
          [76, -11],
          [76, 3],
          [26, 3],
        ],
        '#d4d1c4',
      );
      for (let n = 0; n < 6; n++) line(31 + n * 7, -8, 29 + n * 7, 0);
    }
    if (index === 2) {
      polygon(
        [
          [-22, -35],
          [66, -35],
          [66, -22],
          [-22, -22],
        ],
        '#c9c8be',
      );
      polygon(
        [
          [-27, -37],
          [-15, -37],
          [-15, -20],
          [-27, -20],
        ],
        '#dedbcf',
      );
      polygon(
        [
          [57, -39],
          [75, -39],
          [75, -18],
          [57, -18],
        ],
        '#dedbcf',
      );
      line(0, -22, 0, -13);
      line(42, -22, 42, -13);
    } else if (index === 3) {
      polygon(
        [
          [-30, -23],
          [13, -23],
          [13, -13],
          [-30, -13],
        ],
        '#b8b8aa',
      );
      line(107, -17, 107, -10);
      line(-24, -23, -24, -30);
    }
    line(-29, 13, -14, 23);
    line(-14, 23, -3, 13);
  }
  ctx.restore();
}

export class Arena {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(76, 1, 0.06, 130);
  gunScene = new THREE.Scene();
  gunCamera = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
  gun = new THREE.Group();
  muzzle = new THREE.Group();
  private magazine: THREE.Group | null = null;
  private actionPart: THREE.Group | null = null;
  private supportHand: THREE.Group | null = null;
  private reloadShell: THREE.Group | null = null;
  private level = LEVELS[0];
  private pickups: (PickupSpot & { group: THREE.Group; remaining: number })[] =
    [];
  private pickupTime = 0;
  private reloadStage = -1;
  private stepDistance = 0;
  private audioEngine = new GameAudio();
  state: Snapshot = {
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
  muted = false;
  volume = 0.55;
  musicVolume = 0.28;
  sensitivity = 1;
  motionAmount = 0.25;
  touchMode = false;
  trainingUnlimited = true;
  pvp: PvpLink | null = null;
  private pvpInputTime = 0;
  private pvpEvent = 0;
  pvpMode: PvpMode = 'classic';
  pvpRtt = 0;
  private pvpSeq = 0;
  private pvpHistory = new Map<number, { x: number; z: number }>();
  private pvpInitialized = false;
  private pvpLastAck = -1;
  private nameplates = new Map<string, HTMLDivElement>();
  private nameplatePoint = new THREE.Vector3();
  private nameplateDirection = new THREE.Vector3();
  private pvpFeedExpiry = new Map<number, number>();
  private maxResolutionQuality = 1;
  private touchForward = 0;
  private touchRight = 0;
  private host: HTMLDivElement;
  private map: HTMLCanvasElement;
  private notify: (state: Snapshot) => void;
  private error: (message: string) => void;
  private abort = new AbortController();
  private observer: ResizeObserver;
  private frame = 0;
  private last = 0;
  private elapsed = 0;
  private publish = 0;
  private keys = new Set<string>();
  private held = false;
  private yaw = 0;
  private pitch = -0.035;
  private motion = createMotion();
  private previousMotion = { x: 0, z: 16, feet: 0 };
  private accumulator = 0;
  private cameraFeet = 0;
  private bobAmplitude = 0;
  private sprintBlend = 0;
  private swayX = 0;
  private swayY = 0;
  private lookTime = 0;
  private hitSerial = 0;
  private lastSnapshot: Snapshot | null = null;
  private effects = new CombatEffects();
  private resolutionQuality = 1;
  private qualityCooldown = 0;
  private frameAverage = 1 / 60;
  private fpsTime = 0;
  private fpsFrames = 0;
  private eye = 1.72;
  private bob = 0;
  private recoil = 0;
  private cooldown = 0;
  private reloadTime = 0;
  private hitTime = 0;
  private hurtTime = 0;
  private immunity = 2;
  private pathTime = 0;
  private field = new Int16Array(1681);
  private bots: Bot[] = [];

  private clips: number[] = WEAPONS.map((w) => w.capacity);
  private reserves: number[] = WEAPONS.map((w) => w.reserve);

  private rng = 1;
  private disposed = false;
  private flashTime = 0;
  private decalTextures: THREE.Texture[] = [];
  private pausedPhase: 'running' | 'dead' = 'running';

  constructor(
    host: HTMLDivElement,
    map: HTMLCanvasElement,
    notify: (state: Snapshot) => void,
    error: (message: string) => void,
  ) {
    this.host = host;
    this.map = map;
    this.notify = notify;
    this.error = error;
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.touchMode,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0xf0eee3);
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.72, 16);
    this.scene.background = new THREE.Color(0xe6f0f5);
    this.scene.fog = new THREE.Fog(0xe6f0f5, 32, 80);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x879fba, 1.5));
    const sun = new THREE.DirectionalLight(0xfff5de, 1.25);
    sun.position.set(-15, 25, 12);
    this.scene.add(sun);
    this.gunScene.add(new THREE.HemisphereLight(0xffffff, 0xb9b6a4, 2.5));
    const fill = new THREE.DirectionalLight(0xffffff, 2);
    fill.position.set(-3, 5, 2);
    this.gunScene.add(fill);
    this.gunScene.add(this.gun);
    this.buildWorld();
    batchSketch(this.scene);
    this.scene.add(this.effects.root);
    this.buildGun();
    this.spawnBots();
    this.buildPickups();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.bind();
    this.emit();
    this.frame = requestAnimationFrame(this.tick);
  }
  private random() {
    return seeded(this.rng++);
  }
  private sketch(
    geometry: THREE.BufferGeometry,
    color: number = paper,
    rough = 0.007,
  ) {
    const group = new THREE.Group(),
      mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const mesh = new THREE.Mesh(geometry, mat);
    group.add(mesh);
    const edge = new THREE.EdgesGeometry(geometry, 24);
    group.add(
      new THREE.LineSegments(
        edge,
        new THREE.LineBasicMaterial({
          color: ink,
          transparent: true,
          opacity: 0.87,
        }),
      ),
    );
    if (rough) {
      const echo = edge.clone();
      const arr = echo.attributes.position;
      for (let i = 0; i < arr.count; i++)
        arr.setXYZ(
          i,
          arr.getX(i) + (seeded(i + 2) - 0.5) * rough,
          arr.getY(i) + (seeded(i + 9) - 0.5) * rough,
          arr.getZ(i) + (seeded(i + 22) - 0.5) * rough,
        );
      group.add(
        new THREE.LineSegments(
          echo,
          new THREE.LineBasicMaterial({
            color: 0x777366,
            transparent: true,
            opacity: 0.25,
          }),
        ),
      );
    }
    return group;
  }
  private box(w: number, h: number, d: number, color: number = paper) {
    return this.sketch(new THREE.BoxGeometry(w, h, d), color, 0.035);
  }
  private line(points: THREE.Vector3[], color = ink, opacity = 0.6) {
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    );
  }
  private textPlane(
    text: string,
    width: number,
    height: number,
    color = '#777262',
    size = 100,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px 'Segoe Print', 'Comic Sans MS', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(256, 128);
    ctx.rotate(-0.035);
    ctx.fillText(text, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.decalTextures.push(tex);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  }
  private buildWorld() {
    this.scene.background = new THREE.Color(this.level.sky);
    this.scene.fog = new THREE.Fog(this.level.sky, 32, 80);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshLambertMaterial({ color: this.level.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.015;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(86, 43, 0xbcb8a8, 0xcac6b7);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    grid.position.y = 0.001;
    this.scene.add(grid);
    if (this.level.practice) {
      for (const distance of [10, 15, 20, 25, 30]) {
        const marker = this.textPlane(`${distance} m`, 3, 1.2, '#378575', 90);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(-17, 0.025, 16 - distance);
        this.scene.add(marker);
      }
    }
    for (const o of this.level.obstacles) {
      const color =
        o.kind === 'wall' && this.state.level > 0
          ? this.level.accent
          : obstacleColor(o);
      const group = this.box(o.w, o.h, o.d, color);
      group.position.set(o.x, o.h / 2, o.z);
      this.scene.add(group);
      const vertices: number[] = [];
      const count = Math.min(30, Math.floor(o.w * o.h * 1.3));
      for (let j = 0; j < count; j++) {
        const x = (seeded(j * 3 + o.x + 40) - 0.5) * o.w * 0.96,
          y = (seeded(j * 4 + o.z + 60) - 0.5) * o.h * 0.95;
        const len = Math.min(0.5, o.h * 0.15);
        vertices.push(
          x,
          y,
          o.d / 2 + 0.006,
          x + len * 0.45,
          Math.min(o.h / 2, y + len),
          o.d / 2 + 0.006,
        );
      }
      const hatch = new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.Float32BufferAttribute(vertices, 3),
        ),
        new THREE.LineBasicMaterial({
          color: 0x777460,
          transparent: true,
          opacity: 0.26,
        }),
      );
      group.add(hatch);
      if (o.kind === 'crate') {
        for (const side of [-1, 1]) {
          const z = side * (o.d / 2 + 0.018);
          group.add(
            this.line(
              [
                new THREE.Vector3(-o.w * 0.43, -o.h * 0.43, z),
                new THREE.Vector3(o.w * 0.43, o.h * 0.43, z),
              ],
              0x64634f,
              0.42,
            ),
          );
          group.add(
            this.line(
              [
                new THREE.Vector3(-o.w * 0.43, o.h * 0.43, z),
                new THREE.Vector3(o.w * 0.43, -o.h * 0.43, z),
              ],
              0x64634f,
              0.42,
            ),
          );
        }
        const rim1 = this.box(o.w + 0.045, 0.075, o.d + 0.045, 0xb9b39d);
        rim1.position.y = o.h * 0.39;
        group.add(rim1);
        const rim2 = this.box(o.w + 0.045, 0.075, o.d + 0.045, 0xb9b39d);
        rim2.position.y = -o.h * 0.39;
        group.add(rim2);
      }
    }
    const wallTitle = this.textPlane(
      this.level.english,
      17,
      4,
      '#526d95',
      this.state.level === 0 ? 65 : 54,
    );
    wallTitle.position.set(0, this.state.level === 2 ? 1.6 : 3.15, -20.48);
    this.scene.add(wallTitle);
    if (this.level.obstacles.length > 5) {
      const markerA = this.level.obstacles[4];
      const markerB = this.level.obstacles[5];
      const left = this.textPlane('A', 2.5, 2, '#376d94', 135);
      left.position.set(
        markerA.x,
        markerA.h * 0.6,
        markerA.z + markerA.d / 2 + 0.03,
      );
      this.scene.add(left);
      const right = this.textPlane('B', 2.8, 2.8, '#328570', 145);
      right.position.set(
        markerB.x,
        markerB.h * 0.6,
        markerB.z + markerB.d / 2 + 0.03,
      );
      this.scene.add(right);
    }
    const floor = this.textPlane(
      this.level.practice ? 'FIRING LINE' : 'KEEP MOVING →',
      9,
      3.5,
      '#bd8d40',
      53,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.018, this.level.practice ? 16 : 9.5);
    this.scene.add(floor);
    const floor2 = this.textPlane('×', 3, 3, '#bc997c', 140);
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.set(-5, 0.02, -4);
    this.scene.add(floor2);
    for (let i = 0; i < 26; i++) {
      const points: THREE.Vector3[] = [];
      const x = (this.random() - 0.5) * 39,
        z = (this.random() - 0.5) * 39;
      for (let k = 0; k < 4; k++)
        points.push(
          new THREE.Vector3(
            x + k * 0.16,
            0.014,
            z + Math.sin(k * 3 + i) * 0.07,
          ),
        );
      this.scene.add(this.line(points, 0xaca58c, 0.35));
    }
    // Faint skyline beyond the play boundary, drawn with the same pencil edges.
    for (let i = 0; i < 11; i++) {
      const h = 4 + seeded(i) * 8;
      const b = this.box(
        4 + seeded(i + 4) * 4,
        h,
        4,
        [0xb4cadd, 0xc5bdda, 0xbbd6cb][i % 3],
      );
      b.position.set(-36 + i * 7, h / 2, -31 - seeded(i + 8) * 6);
      this.scene.add(b);
    }
    this.scene.updateMatrixWorld(true);
  }
  private buildGun() {
    this.clearGroup(this.gun);
    const index = this.state.weapon;
    this.magazine =
      this.actionPart =
      this.supportHand =
      this.reloadShell =
        null;
    const dynamic = (part: THREE.Group) => {
      part.userData.dynamic = true;
      part.userData.rest = part.position.clone();
      batchSketch(part);
      return part;
    };
    const add = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color = [0x859fcb, 0xdbbb65, 0xb2a1ce, 0x78aa9c][this.state.weapon],
    ) => {
      const b = this.box(w, h, d, color);
      b.position.set(x, y, z);
      this.gun.add(b);
      return b;
    };
    if (index === 0) {
      add(0.13, 0.15, 0.43, 0, 0, -0.12, 0xd4d2c7);
      add(0.115, 0.22, 0.14, 0, -0.14, 0.02, 0xb4b19f).rotation.x = -0.2;
      this.actionPart = dynamic(
        add(0.135, 0.055, 0.39, 0, 0.07, -0.13, 0xbabdb2),
      );
      this.magazine = dynamic(add(0.095, 0.13, 0.11, 0, -0.25, 0.02, 0x6b7b92));
      add(0.025, 0.035, 0.035, 0, 0.115, -0.3, 0x525748);
      add(0.09, 0.04, 0.05, 0, 0.11, 0.04, 0x686b5b);
    } else {
      add(0.14, 0.18, 0.57, 0, 0, -0.15);
      add(0.1, 0.24, 0.12, 0, -0.18, 0.02, 0xb5b29f).rotation.x = -0.2;
      add(0.105, 0.14, 0.36, 0, -0.035, 0.24, 0xb3b29d);
      add(0.14, 0.1, 0.1, 0, -0.055, 0.42, 0x939883);
      add(0.09, 0.1, index === 2 ? 0.8 : 0.6, 0, 0.01, -0.64, 0xa9ad9d);
      add(
        0.045,
        0.045,
        index === 2 ? 0.46 : 0.24,
        0,
        0.035,
        index === 2 ? -1.08 : -0.95,
        0x626957,
      );
      if (index !== 1) {
        const mag = add(0.105, 0.29, 0.19, 0, -0.21, -0.23, 0x65796e);
        mag.rotation.x = 0.15;
        for (let i = 0; i < 4; i++) {
          const ridge = this.box(0.11, 0.012, 0.155, 0xced7c6);
          ridge.position.y = 0.09 - i * 0.05;
          mag.add(ridge);
        }
        this.magazine = dynamic(mag);
        this.actionPart = dynamic(
          add(0.11, 0.045, 0.14, 0.1, 0.05, -0.13, 0x4e605c),
        );
      } else {
        const pump = add(0.14, 0.12, 0.34, 0, -0.03, -0.64, 0xafa990);
        for (let i = 0; i < 6; i++) {
          const ridge = this.box(0.145, 0.008, 0.017, 0x646b58);
          ridge.position.set(0, 0.064, 0.16 - i * 0.05);
          pump.add(ridge);
        }
        this.actionPart = dynamic(pump);
        this.reloadShell = dynamic(
          add(0.07, 0.07, 0.16, -0.14, -0.12, -0.22, 0xe57556),
        );
        this.reloadShell.visible = false;
      }
      if (index === 2) {
        const scope = this.sketch(
          new THREE.CylinderGeometry(0.078, 0.078, 0.43, 10),
          0xaeb1a2,
        );
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.19, -0.2);
        this.gun.add(scope);
        add(0.08, 0.1, 0.05, 0, 0.13, -0.04);
        add(0.08, 0.1, 0.05, 0, 0.13, -0.35);
      } else {
        add(0.025, 0.065, 0.03, 0, 0.12, -0.68, 0x555e49);
        add(0.14, 0.04, 0.08, 0, 0.11, 0.07, 0x646b55);
        const sight = this.sketch(
          new THREE.TorusGeometry(0.039, 0.009, 4, 12),
          0x4f5944,
        );
        sight.position.set(0, 0.15, 0.07);
        this.gun.add(sight);
      }
    }
    const sleeve = add(0.17, 0.22, 0.32, 0.07, -0.23, 0.24, 0xd0cbb7);
    sleeve.rotation.z = -0.3;
    const hand = add(0.145, 0.16, 0.17, 0.025, -0.15, 0.03, 0xe6ddc7);
    hand.rotation.x = -0.3;
    const support = new THREE.Group();
    const palm = this.box(0.14, 0.14, 0.16, 0xebc9a3);
    support.add(palm);
    const cuff = this.box(0.16, 0.15, 0.21, 0x7ea6bd);
    cuff.position.set(-0.04, -0.035, 0.14);
    support.add(cuff);
    support.position.set(-0.16, -0.15, index === 0 ? 0.02 : -0.34);
    this.gun.add(support);
    this.supportHand = dynamic(support);
    this.muzzle = new THREE.Group();
    this.muzzle.userData.dynamic = true;
    const muzzleZ = index === 0 ? -0.38 : index === 2 ? -1.33 : -1.08;
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const points = [
        new THREE.Vector3(0, 0, muzzleZ),
        new THREE.Vector3(
          Math.cos(angle) * 0.12,
          Math.sin(angle) * 0.12,
          muzzleZ - 0.06,
        ),
      ];
      this.muzzle.add(this.line(points, 0xed9b51, 1));
    }
    const flash = this.sketch(new THREE.OctahedronGeometry(0.085), 0xffc473, 0);
    flash.scale.set(1, 1, 1.8);
    flash.position.z = muzzleZ;
    this.muzzle.add(flash);
    this.muzzle.visible = false;
    batchSketch(this.muzzle);
    this.gun.add(this.muzzle);
    batchSketch(this.gun);
    this.gun.position.set(0.39, -0.29, -0.52);
    this.gun.rotation.y = -0.07;
  }
  private spawnBots() {
    for (let i = 0; i < this.level.enemies; i++) {
      const group = new THREE.Group(),
        body = this.box(0.58, 0.65, 0.35, orange);
      body.position.y = 1.05;
      group.add(body);
      const head = this.box(0.48, 0.45, 0.43, 0xf2d39a);
      head.position.y = 1.67;
      head.rotation.z = (i % 2 ? 1 : -1) * 0.09;
      group.add(head);
      for (const x of [-0.105, 0.105]) {
        head.add(
          this.line(
            [
              new THREE.Vector3(x - 0.045, 0.04, 0.221),
              new THREE.Vector3(x + 0.045, -0.035, 0.221),
            ],
            0x4b4538,
            1,
          ),
        );
        head.add(
          this.line(
            [
              new THREE.Vector3(x + 0.045, 0.04, 0.222),
              new THREE.Vector3(x - 0.045, -0.035, 0.222),
            ],
            0x4b4538,
            1,
          ),
        );
      }
      head.add(
        this.line(
          [
            new THREE.Vector3(-0.055, -0.11, 0.225),
            new THREE.Vector3(0.06, -0.11, 0.225),
          ],
          0x4b4538,
          0.8,
        ),
      );
      const legs: THREE.Group[] = [];
      for (const x of [-0.17, 0.17]) {
        const leg = this.box(0.17, 0.66, 0.21, 0x7f93b5);
        batchSketch(leg);
        leg.userData.dynamic = true;
        leg.position.set(x, 0.43, 0);
        group.add(leg);
        legs.push(leg);
        const foot = this.box(0.2, 0.12, 0.32, 0x797d66);
        foot.position.set(x, 0.09, 0.05);
        group.add(foot);
        const arm = this.box(0.15, 0.5, 0.17, 0xd3b293);
        arm.rotation.x = -0.7;
        arm.position.set(x * 2.2, 1.07, 0.18);
        group.add(arm);
      }
      const weapon = this.box(0.12, 0.13, 0.63, 0x777d68);
      weapon.position.set(0.27, 1.15, 0.45);
      group.add(weapon);
      const mark = this.textPlane(`0${i + 1}`, 1.1, 0.55, '#a84443', 90);
      const nameLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: mark.material.map, depthWrite: false }),
      );
      mark.geometry.dispose();
      mark.material.dispose();
      nameLabel.position.set(0, 2.4, 0);
      nameLabel.scale.set(1.6, 0.8, 1);
      nameLabel.name = 'player-name';
      group.add(nameLabel);
      group.userData.bot = i;
      batchSketch(group);
      const healthBackground = new THREE.Sprite(
        new THREE.SpriteMaterial({ color: 0x394755 }),
      );
      healthBackground.position.set(0, 2.06, 0);
      healthBackground.scale.set(0.85, 0.105, 1);
      group.add(healthBackground);
      const healthBar = new THREE.Sprite(
        new THREE.SpriteMaterial({ color: 0xf47060 }),
      );
      healthBar.position.set(0, 2.06, 0.004);
      healthBar.scale.set(0.79, 0.064, 1);
      group.add(healthBar);
      const surface = (
        group.children.find(
          (child) => child.name === 'batched-surfaces',
        ) as THREE.Mesh
      ).material as THREE.MeshLambertMaterial;
      this.scene.add(group);
      const spawn = this.level.spawns[i + 1];
      group.position.set(spawn.x, 0, spawn.z);
      this.bots.push({
        group,
        health: 100,
        alive: true,
        respawn: 0,
        cooldown: 1 + i * 0.7,
        id: i,
        legs,
        target: new THREE.Vector3(spawn.x, 0, spawn.z),
        repath: 0,
        healthBar,
        flash: 0,
        surface,
      });
    }
  }
  private bind() {
    const options = { signal: this.abort.signal };
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (this.touchMode) return;
        if (document.pointerLockElement === this.renderer.domElement) {
          if (
            !this.pvp &&
            (this.state.phase === 'ready' || this.state.phase === 'ended')
          )
            this.reset();
          this.state.phase = this.pausedPhase;
          this.last = performance.now();
          this.accumulator = 0;
          this.lookTime = this.last + 0.12 * 1000;
          this.error('');
          this.emit();
        } else if (
          this.state.phase === 'running' ||
          this.state.phase === 'dead'
        ) {
          this.pausedPhase = this.state.phase;
          this.state.phase = 'paused';
          this.clearInput();
          this.emit();
        }
      },
      options,
    );
    document.addEventListener(
      'pointerlockerror',
      () => {
        // Promise rejection handles real failures; raw-input fallback may also emit this event.
      },
      options,
    );
    document.addEventListener(
      'mousemove',
      (e) => {
        if (
          document.pointerLockElement !== this.renderer.domElement ||
          this.state.phase !== 'running'
        )
          return;
        if (performance.now() < this.lookTime) return;
        const zoom = this.state.aiming
          ? this.state.weapon === 2
            ? 0.3
            : 0.65
          : 1;
        this.yaw -= e.movementX * 0.002 * this.sensitivity * zoom;
        this.swayX = THREE.MathUtils.clamp(
          this.swayX + e.movementX * 0.00015,
          -0.025,
          0.025,
        );
        this.swayY = THREE.MathUtils.clamp(
          this.swayY + e.movementY * 0.00012,
          -0.018,
          0.018,
        );
        this.pitch = THREE.MathUtils.clamp(
          this.pitch - e.movementY * 0.002 * this.sensitivity * zoom,
          -1.35,
          1.35,
        );
      },
      options,
    );
    document.addEventListener(
      'keydown',
      (e) => {
        if (document.pointerLockElement !== this.renderer.domElement) return;
        if (
          [
            'Space',
            'Tab',
            'ControlLeft',
            'ControlRight',
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
          ].includes(e.code)
        )
          e.preventDefault();
        this.keys.add(e.code);
        if (e.repeat) return;
        if (e.code === 'KeyR') this.reload();
        if (/^Digit[1-4]$/.test(e.code))
          this.selectWeapon(Number(e.code.slice(-1)) - 1);
        if (e.code === 'Space' && this.state.phase === 'running') {
          this.motion.jumpBuffer = 0.13;
          this.pvp?.send('jump', null);
        }
      },
      options,
    );
    document.addEventListener(
      'keyup',
      (e) => {
        this.keys.delete(e.code);
      },
      options,
    );
    document.addEventListener(
      'mousedown',
      (e) => {
        if (
          document.pointerLockElement !== this.renderer.domElement ||
          this.state.phase !== 'running'
        )
          return;
        if (e.button === 0) {
          this.held = true;
          this.fire();
        }
        if (e.button === 2 && !this.state.reloading) {
          this.state.aiming = true;
          this.emit();
        }
      },
      options,
    );
    document.addEventListener(
      'mouseup',
      (e) => {
        if (e.button === 0) this.held = false;
        if (e.button === 2) {
          this.state.aiming = false;
          this.emit();
        }
      },
      options,
    );
    this.host.addEventListener(
      'contextmenu',
      (e) => e.preventDefault(),
      options,
    );
    this.host.addEventListener(
      'wheel',
      (e) => {
        if (document.pointerLockElement !== this.renderer.domElement) return;
        e.preventDefault();
        this.selectWeapon((this.state.weapon + (e.deltaY > 0 ? 1 : 3)) % 4);
      },
      { ...options, passive: false },
    );
    window.addEventListener('blur', () => this.pause(), options);
    document.addEventListener(
      'fullscreenchange',
      () => {
        if (this.touchMode && !document.fullscreenElement) this.pause();
      },
      options,
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.pause();
      },
      options,
    );
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.pause();
        this.error('图形上下文已中断，请刷新页面重新进入战场。');
      },
      options,
    );
  }
  start() {
    if (
      this.disposed ||
      this.state.phase === 'running' ||
      this.state.phase === 'dead'
    )
      return;
    this.audioEngine.unlock(this.level.music);
    this.renderer.domElement.focus({ preventScroll: true });
    if (this.touchMode) {
      if (
        !this.pvp &&
        (this.state.phase === 'ready' || this.state.phase === 'ended')
      )
        this.reset();
      this.state.phase = this.pausedPhase;
      this.last = performance.now();
      this.accumulator = 0;
      this.error('');
      if (document.fullscreenEnabled && !document.fullscreenElement)
        void document.documentElement.requestFullscreen().catch(() => {});
      this.emit();
      return;
    }
    enterCombatView(
      this.renderer.domElement,
      document.documentElement,
      this.error,
    );
  }
  applyPvp(snapshot: PvpSnapshot) {
    if (!this.pvp) return;
    const own = snapshot.players.find((p) => p.id === this.pvp!.id);
    if (!own) return;
    this.pvpMode = snapshot.mode || 'classic';
    const respawn = this.state.health <= 0 && own.health > 0;
    const historical =
      own.ack === undefined ? undefined : this.pvpHistory?.get(own.ack);
    const lead = historical ? 0 : Math.min(0.15, (this.pvpRtt || 0) / 2000);
    const dx =
      own.motion.x + own.motion.vx * lead - (historical?.x ?? this.motion.x);
    const dz =
      own.motion.z + own.motion.vz * lead - (historical?.z ?? this.motion.z);
    const error = Math.hypot(dx, dz);
    if (!this.pvpInitialized || respawn || error > 2) {
      if (!this.pvpInitialized || respawn) {
        this.yaw = Math.atan2(own.motion.x, own.motion.z);
        this.pitch = 0;
      }
      Object.assign(this.motion, own.motion);
      Object.assign(this.previousMotion, {
        x: own.motion.x,
        z: own.motion.z,
        feet: own.motion.feet,
      });
      this.pvpHistory?.clear();
      this.pvpInitialized = true;
    } else if (
      error > 0.12 &&
      (own.ack === undefined || own.ack !== this.pvpLastAck)
    ) {
      const blend = 0.25;
      this.motion.x += dx * blend;
      this.motion.z += dz * blend;
      this.previousMotion.x += dx * blend;
      this.previousMotion.z += dz * blend;
      for (const point of this.pvpHistory?.values() || []) {
        point.x += dx * blend;
        point.z += dz * blend;
      }
    }
    this.pvpLastAck = own.ack ?? -1;
    if (own.ack !== undefined)
      for (const seq of this.pvpHistory?.keys() || []) {
        if (seq < own.ack) this.pvpHistory.delete(seq);
      }
    if (this.state.weapon !== own.weapon) {
      this.state.weapon = own.weapon;
      this.buildGun();
    }
    Object.assign(this.state, {
      health: own.health,
      armor: own.armor,
      ammo: own.ammo,
      reserve: own.reserve,
      kills: own.kills,
      deaths: own.deaths,
      time: snapshot.remaining,
      respawn: own.respawn,
      reloading: own.reload > 0,
    });
    this.clips[own.weapon] = own.ammo;
    this.reserves[own.weapon] = own.reserve;
    this.reloadTime = own.reload;
    if (own.reload > 0) {
      this.state.aiming = false;
      const progress = 1 - own.reload / WEAPONS[own.weapon].reload;
      this.state.reloadProgress = Math.round(progress * 100);
      this.state.reloadLabel = reloadPose(own.weapon, progress).label;
    } else {
      this.state.reloadProgress = 0;
      this.state.reloadLabel = '';
    }
    if (own.health <= 0 && this.state.phase === 'running') {
      this.state.phase = 'dead';
      this.clearInput();
    }
    if (respawn && this.state.phase === 'dead') this.state.phase = 'running';
    const others = snapshot.players.filter((p) => p.id !== own.id);
    this.bots.forEach((b, i) => {
      const p = others[i];
      b.alive = !!p && p.health > 0;
      b.group.visible = b.alive;
      if (!p) return;
      b.group.userData.playerId = p.id;
      b.group.userData.playerName = p.name;
      const label = b.group.getObjectByName('player-name') as
        | THREE.Sprite
        | undefined;
      if (label && label.userData.playerName !== p.name) {
        const canvas = label.material.map!.image as HTMLCanvasElement;
        canvas.width = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#274756';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name, 256, 128, 490);
        label.material.map!.needsUpdate = true;
        label.userData.playerName = p.name;
        label.scale.set(2.4, 1.2 / (p.crouch ? 0.65 : 1), 1);
      }
      b.health = p.health;
      b.healthBar.scale.x = (0.79 * p.health) / 100;
      b.target.set(p.motion.x, p.motion.feet, p.motion.z);
      b.group.rotation.y = p.yaw + Math.PI;
      b.group.scale.y = p.crouch ? 0.65 : 1;
    });
    this.pickups.forEach((p, i) => {
      p.remaining = snapshot.pickups[i] || 0;
      p.group.visible = p.remaining <= 0;
    });
    for (const event of snapshot.events) {
      if (event.id <= this.pvpEvent) continue;
      this.pvpEvent = event.id;
      if (event.kind === 'hit' && event.health === 0 && event.target) {
        const killer =
          snapshot.players.find((p) => p.id === event.actor)?.name || '玩家';
        const victim =
          snapshot.players.find((p) => p.id === event.target)?.name || '玩家';
        const id = event.id;
        this.state.feed = [
          ...this.state.feed.slice(-3),
          { id, text: `${killer} 击杀了 ${victim}` },
        ];
        this.pvpFeedExpiry ||= new Map();
        this.pvpFeedExpiry.set(id, performance.now() + 6000);
      }
      if (event.kind === 'shot' && event.actor !== own.id) {
        const shooter = others.find((p) => p.id === event.actor);
        if (shooter) {
          const from = new THREE.Vector3(
            shooter.motion.x,
            shooter.motion.feet + 1.4,
            shooter.motion.z,
          );
          const to = from
            .clone()
            .add(
              new THREE.Vector3(
                -Math.sin(shooter.yaw),
                Math.sin(shooter.pitch),
                -Math.cos(shooter.yaw),
              ).multiplyScalar(20),
            );
          this.tracer(from, to, 0xcd815f);
          this.audioEngine?.play('shot', shooter.weapon);
        }
      }
      if (event.kind === 'hit' && event.target === own.id) {
        this.state.lastHurt = {
          id: ++this.hitSerial,
          damage: event.damage || 0,
          absorbed: 0,
          sourceX: event.sourceX || 0,
          sourceZ: event.sourceZ || 0,
          angle: damageBearing(
            this.camera.position,
            { x: event.sourceX || 0, z: event.sourceZ || 0 },
            this.yaw,
          ),
          target: 1,
        };
        this.hurtTime = 1.25;
        this.sound('hurt');
      }
      if (event.kind === 'hit' && event.actor === own.id) {
        this.hitTime = 0.32;
        this.state.lastHit = {
          id: ++this.hitSerial,
          damage: event.damage || 0,
          health: event.health || 0,
          target: 1,
          headshot: !!event.headshot,
          killed: event.health === 0,
        };
        this.sound(event.health === 0 ? 'kill' : 'hit');
      }
    }
  }
  private sendPvpInput() {
    if (!this.pvp) return;
    this.pvpHistory ||= new Map();
    this.pvpSeq = (this.pvpSeq || 0) + 1;
    this.pvpHistory.set(this.pvpSeq, { x: this.motion.x, z: this.motion.z });
    if (this.pvpHistory.size > 120)
      this.pvpHistory.delete(this.pvpHistory.keys().next().value!);
    this.pvp?.send('input', {
      seq: this.pvpSeq,
      forward:
        Number(this.keys.has('KeyW')) -
        Number(this.keys.has('KeyS')) +
        (this.touchForward || 0),
      right:
        Number(this.keys.has('KeyD')) -
        Number(this.keys.has('KeyA')) +
        (this.touchRight || 0),
      yaw: this.yaw,
      pitch: this.pitch,
      aim: this.state.aiming,
      crouch: this.state.crouching,
      sprint: this.state.sprinting,
      jump: false,
    });
  }
  pause() {
    if (this.state.phase === 'running' || this.state.phase === 'dead') {
      this.pausedPhase = this.state.phase;
      this.state.phase = 'paused';
      this.clearInput();
      if (document.pointerLockElement === this.renderer.domElement)
        document.exitPointerLock();
      this.emit();
    }
  }
  private reset() {
    const selected = this.state.weapon;
    this.state = {
      phase: 'running',
      health: 100,
      armor: 0,
      level: LEVELS.indexOf(this.level),
      won: false,
      reloadProgress: 0,
      reloadLabel: '',
      pickup: null,
      kills: 0,
      aliveEnemies: this.level.enemies,
      deaths: 0,
      time: this.level.duration,
      weapon: selected,
      ammo: WEAPONS[selected].capacity,
      reserve: WEAPONS[selected].reserve,
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
      fps: this.state.fps,
      lastHit: null,
      lastHurt: null,
    };
    this.pausedPhase = 'running';
    this.clips = WEAPONS.map((w) => w.capacity);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.camera.position.set(
      this.level.spawns[0].x,
      1.72,
      this.level.spawns[0].z,
    );
    this.yaw = 0;
    this.pitch = -0.035;
    this.motion = createMotion(this.camera.position.x, this.camera.position.z);
    this.previousMotion = { x: this.motion.x, z: this.motion.z, feet: 0 };
    this.accumulator = 0;
    this.cameraFeet = 0;
    this.eye = 1.72;
    this.sprintBlend = 0;
    this.bobAmplitude = 0;
    this.immunity = 2.5;
    this.cooldown = 0;
    this.reloadTime = 0;
    this.hitTime = 0;
    this.hurtTime = 0;
    this.pathTime = 0;
    this.pickupTime = 0;
    this.reloadStage = -1;
    this.stepDistance = 0;
    this.effects.update(5);
    this.pickups.forEach((p) => {
      p.remaining = 0;
      p.group.visible = true;
    });
    this.clearInput();
    this.bots.forEach((bot, i) => {
      bot.alive = true;
      bot.health = 100;
      bot.group.visible = true;
      const p = this.level.spawns[i + 1];
      bot.group.position.set(p.x, 0, p.z);
      bot.cooldown = 1.5 + i * 0.6;
      bot.repath = 0;
      bot.healthBar.scale.x = 0.79;
      bot.flash = 0;
      bot.surface.emissive.setHex(0x000000);
    });
    this.emit();
  }
  selectLevel(index: number) {
    if (
      !Number.isInteger(index) ||
      !LEVELS[index] ||
      this.state.phase === 'running' ||
      this.state.phase === 'dead'
    )
      return false;
    this.level = LEVELS[index];
    this.state.level = index;
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const child = this.scene.children[i];
      if (child instanceof THREE.Light || child === this.effects.root) continue;
      this.disposeObject(child);
      this.scene.remove(child);
    }
    this.scene.remove(this.effects.root);
    this.decalTextures.forEach((t) => t.dispose());
    this.decalTextures = [];
    this.bots = [];
    this.pickups = [];
    this.buildWorld();
    batchSketch(this.scene);
    this.scene.add(this.effects.root);
    this.spawnBots();
    this.buildPickups();
    this.reset();
    this.state.phase = 'ready';
    this.audioEngine.stopMusic();
    this.drawMap();
    this.emit();
    return true;
  }
  private finish(won: boolean) {
    if (this.state.phase === 'ended') return;
    this.state.phase = 'ended';
    this.state.won = won;
    this.state.reloading = false;
    this.reloadTime = 0;
    this.pausedPhase = 'running';
    this.clearInput();
    this.sound(won ? 'victory' : 'hurt');
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.emit();
  }
  private buildPickups() {
    this.pickups = this.level.pickups.map((p) => {
      const group = new THREE.Group();
      const color = PICKUPS[p.kind].color;
      const base = this.box(0.65, 0.4, 0.38, color);
      group.add(base);
      if (p.kind === 'health') {
        const horizontal = this.box(0.38, 0.11, 0.42, 0xfffcec);
        const vertical = this.box(0.11, 0.3, 0.43, 0xfffcec);
        group.add(horizontal, vertical);
      } else if (p.kind === 'ammo') {
        for (let i = 0; i < 3; i++) {
          const bullet = this.sketch(
            new THREE.CylinderGeometry(0.04, 0.045, 0.29, 6),
            0xfff2b2,
            0,
          );
          bullet.position.set((i - 1) * 0.15, 0.05, 0.23);
          group.add(bullet);
        }
      } else {
        const badge = this.sketch(
          new THREE.CircleGeometry(0.2, 5),
          0xeaf4ff,
          0,
        );
        badge.position.z = 0.22;
        badge.rotation.z = Math.PI * 0.3;
        group.add(badge);
      }
      const handle = this.box(0.26, 0.07, 0.1, 0x516575);
      handle.position.y = 0.25;
      group.add(handle);
      batchSketch(group);
      group.position.set(p.x, 0.65, p.z);
      this.scene.add(group);
      return { ...p, group, remaining: 0 };
    });
  }
  private updatePickups(dt: number) {
    if (this.pvp) return;
    this.pickupTime = Math.max(0, this.pickupTime - dt);
    if (this.pickupTime === 0) this.state.pickup = null;
    for (const p of this.pickups) {
      p.remaining = Math.max(0, p.remaining - dt);
      p.group.visible = p.remaining === 0;
      if (!p.group.visible) continue;
      p.group.position.y = 0.65 + Math.sin(this.elapsed * 2 + p.x) * 0.09;
      p.group.rotation.y += dt * 0.65;
      if (
        this.state.phase !== 'running' ||
        this.motion.feet > 0.7 ||
        Math.hypot(this.motion.x - p.x, this.motion.z - p.z) > 1.15
      )
        continue;
      const from = new THREE.Vector3(this.motion.x, 0.5, this.motion.z);
      const direction = new THREE.Vector3(p.x - from.x, 0, p.z - from.z);
      const distance = direction.length();
      if (
        distance > 0.01 &&
        worldHitDistance(
          from,
          direction.normalize(),
          distance,
          this.level.obstacles,
        ) <
          distance - 0.05
      )
        continue;
      const result = collectSupply(
        p.kind,
        this.state.health,
        this.state.armor,
        this.reserves,
      );
      if (!result.amount) continue;
      this.state.health = result.health;
      this.state.armor = result.armor;
      this.reserves = result.reserves;
      this.state.reserve = this.reserves[this.state.weapon];
      p.remaining = PICKUPS[p.kind].respawn;
      p.group.visible = false;
      const text =
        p.kind === 'health'
          ? '+' + result.amount + ' 生命值'
          : p.kind === 'shield'
            ? '+' + result.amount + ' 护甲'
            : '弹药补给 +' + result.amount;
      this.state.pickup = { id: ++this.hitSerial, text, kind: p.kind };
      this.pickupTime = 2.1;
      this.burst(p.group.position, PICKUPS[p.kind].color, 12);
      this.sound('pickup');
      this.emit();
    }
  }
  private clearInput() {
    this.touchForward = this.touchRight = 0;
    this.keys.clear();
    this.held = false;
    this.motion.vx = 0;
    this.motion.vz = 0;
    this.motion.jumpBuffer = 0;
    this.state.aiming = false;
    this.state.sprinting = false;
    this.state.crouching = false;
    if (this.pvp) this.sendPvpInput();
  }
  selectWeapon(index: number) {
    if (this.pvp && this.pvpMode !== 'classic') return;
    if (!Number.isInteger(index) || index < 0 || index > 3) return false;
    this.state.weapon = index;
    this.pvp?.send('weapon', index);
    this.state.ammo = this.clips[index];
    this.state.reserve = this.reserves[index];
    this.state.reloading = false;
    this.state.reloadProgress = 0;
    this.state.reloadLabel = '';
    this.state.aiming = false;
    this.reloadTime = 0;
    this.cooldown = 0.22;
    this.held = false;
    this.buildGun();
    this.emit();
    return true;
  }
  touchMove(forward: number, right: number) {
    if (!this.touchMode || this.state.phase !== 'running') return;
    this.touchForward = Math.max(-1, Math.min(1, forward));
    this.touchRight = Math.max(-1, Math.min(1, right));
  }
  touchLook(dx: number, dy: number) {
    if (!this.touchMode || this.state.phase !== 'running') return;
    const scale =
      0.004 *
      this.sensitivity *
      (this.state.aiming ? (this.state.weapon === 2 ? 0.3 : 0.65) : 1);
    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * scale, -1.35, 1.35);
  }
  touchAction(action: 'fire' | 'aim' | 'crouch' | 'jump', pressed = true) {
    if (!this.touchMode) return;
    if (action === 'fire' && !pressed) {
      this.held = false;
      return;
    }
    if (this.state.phase !== 'running') return;
    if (action === 'fire') {
      this.held = true;
      this.state.sprinting = false;
      this.fire();
    }
    if (action === 'aim' && !this.state.reloading)
      this.state.aiming = !this.state.aiming;
    if (action === 'crouch') {
      if (this.keys.has('KeyC')) this.keys.delete('KeyC');
      else this.keys.add('KeyC');
    }
    if (action === 'jump') {
      this.motion.jumpBuffer = 0.13;
      this.pvp?.send('jump', null);
    }
    this.emit();
  }
  resetTraining() {
    if (!this.level.practice || this.state.phase === 'running') return false;
    this.reset();
    this.state.phase = 'ready';
    this.emit();
    return true;
  }
  reload() {
    if (
      this.state.phase !== 'running' ||
      this.state.reloading ||
      this.state.ammo >= WEAPONS[this.state.weapon].capacity ||
      this.state.reserve <= 0
    )
      return false;
    this.state.reloading = true;
    this.pvp?.send('reload', null);
    this.state.aiming = false;
    this.reloadTime = WEAPONS[this.state.weapon].reload;
    this.reloadStage = 0;
    this.state.reloadProgress = 0;
    this.state.reloadLabel = reloadPose(this.state.weapon, 0).label;
    this.sound('reload');
    this.emit();
    return true;
  }
  private fire() {
    if (
      this.state.phase !== 'running' ||
      this.state.reloading ||
      this.cooldown > 0 ||
      this.state.sprinting
    )
      return;
    if (this.state.ammo <= 0) {
      this.reload();
      return;
    }
    const spec = WEAPONS[this.state.weapon];
    this.state.ammo--;
    this.clips[this.state.weapon] = this.state.ammo;
    this.cooldown = spec.interval;
    this.state.shots++;
    this.recoil =
      this.state.weapon === 1 ? 0.15 : this.state.weapon === 2 ? 0.2 : 0.065;
    this.flashTime = 0.055;
    this.sound('shot');
    if (this.pvp) {
      this.sendPvpInput();
      this.pvp.send('fire', null);
      if (this.state.ammo === 0) this.reload();
      this.emit();
      return;
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld(true);
    const origin = this.camera.position.clone();
    let didHit = false;
    const hitTotals = new Map<
      number,
      { damage: number; headshot: boolean; killed: boolean }
    >();
    for (let pellet = 0; pellet < spec.pellets; pellet++) {
      const spread =
        spec.spread *
        (this.state.aiming ? (this.state.weapon === 2 ? 0.015 : 0.32) : 1) *
        (this.state.crouching ? 0.65 : 1);
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        -1,
      )
        .normalize()
        .applyQuaternion(this.camera.quaternion);
      const impact = this.castShot(origin, direction, spec.range);
      const end =
        impact?.point || origin.clone().addScaledVector(direction, spec.range);
      if (pellet < 3)
        this.tracer(
          origin
            .clone()
            .add(
              new THREE.Vector3(0.07, -0.12, 0).applyQuaternion(
                this.camera.quaternion,
              ),
            ),
          end,
          0xd1a56b,
        );
      if (impact && impact.bot !== null) {
        const bot = this.bots[impact.bot];
        if (bot.alive) {
          const headshot = impact.headshot;
          const damage =
            spec.damage *
            (headshot ? 1.5 : 1) *
            (this.state.weapon === 1
              ? Math.max(0.35, 1 - impact.distance / 35)
              : 1);
          bot.health = Math.max(0, bot.health - damage);
          bot.healthBar.scale.x = (0.79 * bot.health) / 100;
          bot.flash = 0.14;
          const prior = hitTotals.get(bot.id) || {
            damage: 0,
            headshot: false,
            killed: false,
          };
          hitTotals.set(bot.id, {
            damage: prior.damage + damage,
            headshot: prior.headshot || headshot,
            killed: bot.health <= 0,
          });
          didHit = true;
          this.hitTime = 0.32;
          this.burst(impact.point, 0xcf8059, 4);
          if (bot.health <= 0) {
            bot.alive = false;
            bot.group.visible = false;
            bot.respawn = 7 + Math.random() * 3;
            this.state.kills++;
            this.addFeed(
              `${headshot ? '精准命中！' : '已擦除'} 涂鸦 ${String(bot.id + 1).padStart(2, '0')}`,
            );
            this.burst(
              bot.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
              0xd2a278,
              14,
            );
            this.sound('kill');
          }
        }
      } else if (impact) {
        this.burst(end, 0xa39a79, 3);
      }
    }
    if (didHit) {
      const [id, result] = [...hitTotals.entries()].at(-1)!;
      this.state.lastHit = {
        id: ++this.hitSerial,
        damage: Math.round(result.damage),
        health: Math.ceil(this.bots[id].health),
        target: id + 1,
        headshot: result.headshot,
        killed: result.killed,
      };
      this.state.hits++;
      this.sound('hit');
    }
    if (!this.level.practice && this.state.kills >= this.level.goal)
      this.finish(true);
    if (this.state.ammo === 0) {
      if (this.level.practice && this.trainingUnlimited)
        this.state.reserve = this.reserves[this.state.weapon] = spec.reserve;
      this.reload();
    }
    this.emit();
  }
  private castShot(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
  ) {
    let nearest = worldHitDistance(
        origin,
        direction,
        range,
        this.level.obstacles,
      ),
      target: number | null = null,
      headshot = false;
    for (const bot of this.bots) {
      if (!bot.alive) continue;
      const p = bot.group.position;
      for (const head of [false, true]) {
        const half = head ? 0.25 : 0.35,
          minY = head ? 1.44 : 0.1,
          maxY = head ? 1.91 : 1.4;
        const hit = rayBox(
          origin,
          direction,
          { x: p.x - half, y: p.y + minY, z: p.z - 0.25 },
          { x: p.x + half, y: p.y + maxY, z: p.z + 0.25 },
          nearest,
        );
        if (hit !== null && hit < nearest) {
          nearest = hit;
          target = bot.id;
          headshot = head;
        }
      }
    }
    if (nearest >= range) return null;
    return {
      point: origin.clone().addScaledVector(direction, nearest),
      distance: nearest,
      bot: target,
      headshot,
    };
  }
  private tracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    this.effects.tracer(from, to, color);
  }
  private burst(position: THREE.Vector3, color: number, count: number) {
    this.effects.burst(position, color, count);
  }
  private addFeed(text: string) {
    this.state.feed = [
      ...this.state.feed.slice(-2),
      { id: Date.now() + this.rng++, text },
    ];
  }
  setPerformanceMode(enabled: boolean) {
    this.maxResolutionQuality = enabled ? 0.7 : 1;
    this.resolutionQuality = this.maxResolutionQuality;
    this.resize();
  }
  private updateNameplates() {
    if (!this.pvp || !this.host || typeof document === 'undefined') return;
    this.nameplates ||= new Map();
    this.nameplatePoint ||= new THREE.Vector3();
    this.nameplateDirection ||= new THREE.Vector3();
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    const seen = new Set<string>();
    for (const b of this.bots) {
      const id = b.group.userData.playerId as string | undefined;
      if (!id) continue;
      seen.add(id);
      let node = this.nameplates.get(id);
      if (!node) {
        node = document.createElement('div');
        node.className = 'player-nameplate';
        node.dataset.playerId = id;
        this.host.appendChild(node);
        this.nameplates.set(id, node);
      }
      if (node.textContent !== b.group.userData.playerName)
        node.textContent = b.group.userData.playerName;
      const sprite = b.group.getObjectByName('player-name');
      if (sprite) sprite.visible = false;
      const point = this.nameplatePoint.set(
        b.group.position.x,
        b.group.position.y + 2.25 * b.group.scale.y,
        b.group.position.z,
      );
      const direction = this.nameplateDirection
        .copy(point)
        .sub(this.camera.position);
      const distance = direction.length();
      direction.normalize();
      const visible =
        b.alive &&
        distance < 55 &&
        worldHitDistance(
          this.camera.position,
          direction,
          distance,
          this.level.obstacles,
        ) >=
          distance - 0.1;
      point.project(this.camera);
      node.hidden =
        !visible ||
        point.z < -1 ||
        point.z > 1 ||
        Math.abs(point.x) > 1 ||
        Math.abs(point.y) > 1;
      if (!node.hidden)
        node.style.transform = `translate(${((point.x + 1) * width) / 2}px,${((1 - point.y) * height) / 2}px) translate(-50%,-100%)`;
    }
    for (const [id, node] of this.nameplates)
      if (!seen.has(id)) {
        node.remove();
        this.nameplates.delete(id);
      }
  }
  private sound(type: Sound) {
    this.audioEngine?.play(type, this.state.weapon);
  }
  private updateBots(dt: number) {
    if (this.pvp) {
      for (const b of this.bots)
        if (b.alive) b.group.position.lerp(b.target, 1 - Math.exp(-15 * dt));
      return;
    }
    if (this.level.practice) {
      for (const bot of this.bots) {
        const origin = this.level.spawns[bot.id + 1];
        if (!bot.alive) {
          bot.respawn = Math.min(bot.respawn, 2) - dt;
          if (bot.respawn > 0) continue;
          bot.alive = true;
          bot.group.visible = true;
          bot.health = 100;
          bot.healthBar.scale.x = 0.79;
        }
        bot.group.position.set(
          origin.x +
            (bot.id % 2 ? Math.sin(this.elapsed * 1.3 + bot.id) * 2 : 0),
          0,
          origin.z,
        );
        bot.group.rotation.y = Math.atan2(
          this.camera.position.x - bot.group.position.x,
          this.camera.position.z - bot.group.position.z,
        );
      }
      return;
    }
    this.pathTime -= dt;
    if (this.pathTime <= 0) {
      this.field = navigationField(
        this.camera.position.x,
        this.camera.position.z,
        this.level.obstacles,
      );
      this.pathTime = 0.55;
    }
    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.respawn -= dt;
        if (bot.respawn <= 0) {
          const spawn = enemySpawn(
            this.level.spawns,
            this.camera.position,
            this.bots.filter((b) => b.alive).map((b) => b.group.position),
            bot.group.position,
            this.level.obstacles,
          );
          if (!spawn) {
            bot.respawn = 1;
            continue;
          }
          bot.group.position.set(spawn.x, 0, spawn.z);
          bot.health = 100;
          bot.alive = true;
          bot.group.visible = true;
          bot.cooldown = 2.5;
          bot.target.copy(bot.group.position);
          bot.repath = 0;
          bot.healthBar.scale.x = 0.79;
          bot.flash = 0;
        }
        continue;
      }
      const pos = bot.group.position,
        dx = this.camera.position.x - pos.x,
        dz = this.camera.position.z - pos.z,
        distance = Math.hypot(dx, dz);
      bot.group.rotation.y = Math.atan2(dx, dz);
      bot.cooldown -= dt;
      const origin = pos.clone().add(new THREE.Vector3(0, 1.4, 0)),
        destination = this.camera.position.clone();
      const direction = destination.clone().sub(origin),
        len = direction.length();
      direction.normalize();
      const blocked =
        worldHitDistance(origin, direction, len, this.level.obstacles) <
        len - 0.1;
      if (blocked || distance > 9) {
        bot.repath -= dt;
        if (bot.repath <= 0 || pos.distanceTo(bot.target) < 0.35) {
          const cx = Math.round(pos.x) + 20,
            cz = Math.round(pos.z) + 20;
          let best = 32767,
            tx = pos.x,
            tz = pos.z;
          for (const [ox, oz] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = cx + ox,
              nz = cz + oz;
            if (nx < 0 || nz < 0 || nx > 40 || nz > 40) continue;
            const v = this.field[nz * 41 + nx];
            if (v >= 0 && v < best) {
              best = v;
              tx = nx - 20;
              tz = nz - 20;
            }
          }
          bot.target.set(tx, 0, tz);
          bot.repath = 0.6;
        }
        let mx = bot.target.x - pos.x,
          mz = bot.target.z - pos.z;
        const ml = Math.hypot(mx, mz);
        if (!blocked && distance > 9) {
          mx = dx;
          mz = dz;
        }
        const norm = Math.hypot(mx, mz) || 1;
        if (ml > 0.08 || !blocked)
          moveBody(
            pos,
            (mx / norm) * dt * (2.1 + this.state.level * 0.15),
            (mz / norm) * dt * (2.1 + this.state.level * 0.15),
            0,
            0.35,
            this.level.obstacles,
          );
      } else if (distance < 5) {
        moveBody(
          pos,
          (-dx / (distance || 1)) * dt * 1.1,
          (-dz / (distance || 1)) * dt * 1.1,
          0,
          0.35,
          this.level.obstacles,
        );
      } else {
        const strafe = Math.sin(this.elapsed * 0.7 + bot.id * 2);
        moveBody(
          pos,
          (dz / (distance || 1)) * dt * strafe,
          (-dx / (distance || 1)) * dt * strafe,
          0,
          0.35,
          this.level.obstacles,
        );
      }
      bot.legs[0].rotation.x = Math.sin(this.elapsed * 7 + bot.id) * 0.2;
      bot.legs[1].rotation.x = -bot.legs[0].rotation.x;
      if (
        !blocked &&
        distance < 28 &&
        bot.cooldown <= 0 &&
        this.state.phase === 'running'
      ) {
        bot.cooldown = 1.35 - this.state.level * 0.1 + Math.random() * 0.8;
        const muzzle = pos
          .clone()
          .add(
            new THREE.Vector3(
              (dx / (distance || 1)) * 0.6,
              1.25,
              (dz / (distance || 1)) * 0.6,
            ),
          );
        this.tracer(muzzle, destination, 0xcd815f);
        if (
          this.immunity <= 0 &&
          Math.random() < 0.55 - Math.min(distance, 25) * 0.01
        ) {
          const damage = 7 + Math.floor(Math.random() * 5);
          const received = absorbDamage(
            this.state.health,
            this.state.armor,
            damage,
          );
          this.state.health = received.health;
          this.state.armor = received.armor;
          this.state.lastHurt = {
            id: ++this.hitSerial,
            damage: damage - received.absorbed,
            absorbed: received.absorbed,
            angle: damageBearing(this.camera.position, pos, this.yaw),
            sourceX: pos.x,
            sourceZ: pos.z,
            target: bot.id + 1,
          };
          this.hurtTime = 1.25;
          this.sound('hurt');
          if (this.state.health <= 0) {
            this.state.deaths++;
            this.state.phase = 'dead';
            this.state.respawn = 3;
            this.state.aiming = false;
            this.state.reloading = false;
            this.reloadTime = 0;
            this.clearInput();
            this.addFeed(
              `涂鸦 ${String(bot.id + 1).padStart(2, '0')} 擦掉了你`,
            );
          }
          this.emit();
        }
      }
    }
  }
  private respawnPlayer() {
    const ranked = this.level.spawns
      .map((spawn) => ({
        spawn,
        distance: Math.min(
          60,
          ...this.bots
            .filter((b) => b.alive)
            .map((b) =>
              Math.hypot(
                b.group.position.x - spawn.x,
                b.group.position.z - spawn.z,
              ),
            ),
        ),
      }))
      .sort((a, b) => b.distance - a.distance);
    const safest = ranked.filter((p) => p.distance >= ranked[0].distance - 3);
    const best = safest[Math.floor(Math.random() * safest.length)].spawn;
    this.camera.position.set(best.x, 1.72, best.z);
    this.motion = createMotion(this.camera.position.x, this.camera.position.z);
    this.previousMotion = { x: this.motion.x, z: this.motion.z, feet: 0 };
    this.accumulator = 0;
    this.cameraFeet = 0;
    this.eye = 1.72;
    this.sprintBlend = 0;
    this.bobAmplitude = 0;
    this.yaw = Math.atan2(-best.x, -best.z) + Math.PI;
    this.pitch = 0;
    this.state.health = 100;
    this.state.armor = 0;
    this.state.pickup = null;
    this.state.reloadProgress = 0;
    this.state.reloadLabel = '';
    this.state.lastHit = null;
    this.state.lastHurt = null;
    this.hurtTime = 0;
    this.hitTime = 0;
    this.state.phase = 'running';
    this.immunity = 2.5;
    this.state.respawn = 0;
    this.clips = WEAPONS.map((w) => w.capacity);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.state.ammo = this.clips[this.state.weapon];
    this.state.reserve = this.reserves[this.state.weapon];
    this.emit();
  }
  private updatePlayer(dt: number) {
    this.state.crouching =
      this.keys.has('KeyC') ||
      this.keys.has('ControlLeft') ||
      this.keys.has('ControlRight');
    this.state.sprinting =
      (this.keys.has('ShiftLeft') ||
        this.keys.has('ShiftRight') ||
        (this.touchMode && this.touchForward > 0.9)) &&
      (this.keys.has('KeyW') || (this.touchMode && this.touchForward > 0.9)) &&
      !this.keys.has('KeyS') &&
      !this.state.aiming &&
      !this.state.crouching &&
      !this.state.reloading &&
      !this.held;
    const forward =
        Number(this.keys.has('KeyW')) -
        Number(this.keys.has('KeyS')) +
        (this.touchForward || 0),
      right =
        Number(this.keys.has('KeyD')) -
        Number(this.keys.has('KeyA')) +
        (this.touchRight || 0);
    const speed = this.state.crouching
      ? 2.1
      : this.state.sprinting
        ? 7
        : this.state.aiming
          ? 2.8
          : 4.6;
    this.previousMotion.x = this.motion.x;
    this.previousMotion.z = this.motion.z;
    this.previousMotion.feet = this.motion.feet;
    const grounded = this.motion.grounded;
    stepMotion(
      this.motion,
      {
        forward,
        right,
        yaw: this.yaw,
        speed: speed * Math.min(1, Math.hypot(forward, right)),
      },
      dt,
      this.level.obstacles,
    );
    if (grounded && !this.motion.grounded && this.motion.vy > 0)
      this.sound('jump');
    if (this.motion.grounded) {
      this.stepDistance += Math.hypot(this.motion.vx, this.motion.vz) * dt;
      if (this.stepDistance > (this.state.crouching ? 2.8 : 2.1)) {
        this.stepDistance = 0;
        this.sound('step');
      }
    }
    if (this.state.reloading && !this.pvp) {
      const previousProgress =
        1 - this.reloadTime / WEAPONS[this.state.weapon].reload;
      this.reloadTime = Math.max(0, this.reloadTime - dt);
      const progress = 1 - this.reloadTime / WEAPONS[this.state.weapon].reload;
      const pose = reloadPose(this.state.weapon, progress);
      this.state.reloadProgress = Math.round(progress * 20) * 5;
      this.state.reloadLabel = pose.label;
      const cues: [number, Sound][] =
        this.state.weapon === 1
          ? [
              [0.356, 'magIn'],
              [0.526, 'magIn'],
              [0.696, 'magIn'],
              [0.8, 'bolt'],
            ]
          : [
              [0.18, 'magOut'],
              [0.67, 'magIn'],
              [0.8, 'bolt'],
            ];
      for (const [at, sound] of cues)
        if (previousProgress < at && progress >= at) this.sound(sound);
      if (this.reloadTime <= 0) {
        const amount = Math.min(
          WEAPONS[this.state.weapon].capacity - this.state.ammo,
          this.state.reserve,
        );
        this.state.ammo += amount;
        this.state.reserve -= amount;
        this.clips[this.state.weapon] = this.state.ammo;
        this.reserves[this.state.weapon] = this.state.reserve;
        this.state.reloading = false;
        this.state.reloadProgress = 100;
        this.state.reloadLabel = '';
        this.emit();
      }
    }
    if (this.level.practice && this.trainingUnlimited) {
      this.state.reserve = this.reserves[this.state.weapon] =
        WEAPONS[this.state.weapon].reserve;
    }
    if (this.pvp) {
      this.pvpInputTime += dt;
      if (this.pvpInputTime >= 1 / 30) {
        this.pvpInputTime = 0;
        this.sendPvpInput();
      }
    }
  }
  private updateGun(dt: number, active: boolean) {
    this.gun.visible =
      this.state.phase !== 'dead' &&
      !(this.state.aiming && this.state.weapon === 2);
    const aim = this.state.aiming;
    const pose = reloadPose(
      this.state.weapon,
      this.state.reloading
        ? 1 - this.reloadTime / WEAPONS[this.state.weapon].reload
        : 1,
    );
    const reload = pose.lift;
    if (this.magazine) {
      this.magazine.position.copy(this.magazine.userData.rest);
      this.magazine.position.y -= pose.remove * 0.28;
      this.magazine.position.x -= pose.remove * 0.2;
      this.magazine.position.z += pose.remove * 0.04;
      this.magazine.rotation.z = -pose.remove * 0.45;
    }
    if (this.actionPart) {
      this.actionPart.position.copy(this.actionPart.userData.rest);
      this.actionPart.position.z +=
        pose.rack * (this.state.weapon === 1 ? 0.24 : 0.15);
      this.actionPart.rotation.z =
        this.state.weapon === 2 ? -pose.reachAction * 0.55 : 0;
    }
    if (this.supportHand) {
      this.supportHand.position.copy(this.supportHand.userData.rest);
      if (this.magazine) {
        const grip = this.magazine.position
          .clone()
          .add(new THREE.Vector3(-0.065, -0.025, 0.065));
        this.supportHand.position.lerp(grip, pose.grip);
      }
      if (this.actionPart) {
        const action = this.actionPart.position
          .clone()
          .add(new THREE.Vector3(-0.08, -0.025, 0.02));
        this.supportHand.position.lerp(action, pose.reachAction);
      }
      this.supportHand.rotation.z = -pose.remove * 0.45;
      this.supportHand.rotation.x = -pose.reachAction * 0.3;
    }
    if (this.reloadShell) {
      this.reloadShell.visible = this.state.reloading && pose.shellVisible;
      this.reloadShell.position.copy(this.reloadShell.userData.rest);
      this.reloadShell.position.x -= (1 - pose.shellTravel) * 0.25;
      this.reloadShell.position.y -= (1 - pose.shellTravel) * 0.2;
      this.reloadShell.position.z += (1 - pose.shellTravel) * 0.08;
      this.reloadShell.scale.setScalar(
        pose.shellVisible ? 1 - Math.max(0, (pose.shell - 0.76) / 0.12) : 1,
      );
      if (this.supportHand) {
        this.supportHand.position.lerp(
          this.reloadShell.position
            .clone()
            .add(new THREE.Vector3(-0.055, -0.03, 0.055)),
          pose.grip,
        );
        this.supportHand.rotation.z -= 0.25 * pose.grip;
      }
    }
    this.swayX = damp(this.swayX, 0, 14, dt);
    this.swayY = damp(this.swayY, 0, 14, dt);
    const gunBob =
      Math.sin(this.bob) * 0.006 * this.bobAmplitude * (aim ? 0.15 : 1);
    this.gun.position.x = damp(
      this.gun.position.x,
      (aim ? 0 : 0.37) - reload * 0.18 - this.swayX + gunBob,
      18,
      dt,
    );
    this.gun.position.y = damp(
      this.gun.position.y,
      (aim ? -0.135 : -0.28) -
        this.sprintBlend * 0.035 +
        reload * (this.state.weapon === 0 ? 0.34 : 0.22) +
        gunBob * 0.7 +
        this.swayY,
      18,
      dt,
    );
    this.gun.position.z = damp(
      this.gun.position.z,
      -0.52 +
        this.recoil -
        reload * 0.2 +
        pose.seat * 0.035 -
        pose.settle * 0.02,
      22,
      dt,
    );
    this.gun.rotation.x = damp(
      this.gun.rotation.x,
      this.recoil -
        this.sprintBlend * 0.1 +
        reload * 0.2 -
        pose.seat * 0.06 +
        pose.settle * 0.035,
      16,
      dt,
    );
    this.gun.rotation.y = damp(
      this.gun.rotation.y,
      (aim ? 0 : -0.06) + pose.turn,
      16,
      dt,
    );
    this.gun.rotation.z = damp(
      this.gun.rotation.z,
      -pose.tilt - this.sprintBlend * 0.045,
      14,
      dt,
    );
    this.muzzle.visible = this.flashTime > 0 && active;
  }
  private tick = (timestamp: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const rawDt = Math.max(0, (timestamp - (this.last || timestamp)) / 1000);
    this.last = timestamp;
    const dt = Math.min(rawDt, 0.1),
      active = this.state.phase === 'running' || this.state.phase === 'dead';
    if (active) this.elapsed += dt;
    if (active) {
      if (!this.level.practice && !this.pvp)
        this.state.time = Math.max(0, this.state.time - rawDt);
      this.immunity -= dt;
      this.hitTime = Math.max(0, this.hitTime - dt);
      this.hurtTime = Math.max(0, this.hurtTime - dt);
      this.flashTime = Math.max(0, this.flashTime - dt);
      this.accumulator = Math.min(this.accumulator + dt, 0.1);
      while (this.accumulator >= PHYSICS_STEP) {
        this.cooldown = Math.max(0, this.cooldown - PHYSICS_STEP);
        if (this.state.phase === 'running') this.updatePlayer(PHYSICS_STEP);
        this.accumulator -= PHYSICS_STEP;
      }
      if (this.state.phase === 'dead') {
        this.state.respawn -= dt;
        if (this.state.respawn <= 0 && !this.pvp) this.respawnPlayer();
      }
      if (!this.level.practice && !this.pvp && this.state.time <= 0) {
        this.finish(false);
      }
    }
    const alpha = this.accumulator / PHYSICS_STEP;
    const speed = Math.hypot(this.motion.vx, this.motion.vz);
    this.eye = damp(this.eye, this.state.crouching ? 1.04 : 1.72, 14, dt);
    this.sprintBlend = damp(
      this.sprintBlend,
      this.state.sprinting ? 1 : 0,
      7,
      dt,
    );
    this.bobAmplitude = damp(
      this.bobAmplitude,
      active && this.motion.grounded ? Math.min(1, speed / 4.6) : 0,
      12,
      dt,
    );
    this.bob += speed * dt * 2;
    const foot = THREE.MathUtils.lerp(
      this.previousMotion.feet,
      this.motion.feet,
      alpha,
    );
    // Smooth stair steps only. Jump height follows the interpolated simulation directly.
    this.cameraFeet = this.motion.grounded
      ? damp(this.cameraFeet, foot, 28, dt)
      : foot;
    this.camera.position.set(
      THREE.MathUtils.lerp(this.previousMotion.x, this.motion.x, alpha),
      this.cameraFeet +
        this.eye +
        Math.sin(this.bob) * 0.012 * this.bobAmplitude * this.motionAmount -
        this.motion.landing * this.motionAmount,
      THREE.MathUtils.lerp(this.previousMotion.z, this.motion.z, alpha),
    );
    this.recoil = damp(this.recoil, 0, 15, dt);
    // Mouse rotation is applied immediately, without camera smoothing or roll.
    this.camera.rotation.set(
      this.pitch + this.recoil * 0.07,
      this.yaw,
      0,
      'YXZ',
    );
    const zoom = this.state.aiming ? [1.5, 1.25, 4, 1.6][this.state.weapon] : 1;
    const targetFov = viewFov(this.camera.aspect, zoom, this.sprintBlend),
      fov = damp(this.camera.fov, targetFov, 12, dt);
    if (Math.abs(fov - this.camera.fov) > 0.001) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (active) {
      this.updatePickups(dt);
      this.updateBots(dt);
      if (this.held && this.state.weapon === 3) this.fire();
      this.effects.update(dt);
    }
    for (const bot of this.bots) {
      bot.flash = Math.max(0, bot.flash - dt);
      bot.surface.emissive.setHex(bot.flash > 0 ? 0xff4736 : 0x000000);
      bot.surface.emissiveIntensity = bot.flash > 0 ? 0.65 : 0;
    }
    this.updateGun(dt, active);
    this.renderer.info.reset();
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.gunScene, this.gunCamera);
    this.updateNameplates();
    if (this.pvp && this.state.feed.length) {
      const now = performance.now();
      for (const [id, expiry] of this.pvpFeedExpiry || [])
        if (expiry <= now) this.pvpFeedExpiry.delete(id);
      const next = this.state.feed.filter(
        (item) => (this.pvpFeedExpiry?.get(item.id) || 0) > now,
      );
      if (next.length !== this.state.feed.length) this.state.feed = next;
    }
    if (active && rawDt > 0) {
      this.frameAverage = damp(this.frameAverage, Math.min(rawDt, 0.1), 1, dt);
      this.fpsTime += rawDt;
      this.fpsFrames++;
      this.qualityCooldown -= dt;
      if (this.fpsTime >= 1) {
        this.state.fps = Math.round(this.fpsFrames / this.fpsTime);
        this.fpsTime = 0;
        this.fpsFrames = 0;
      }
      if (this.qualityCooldown <= 0) {
        const next =
          this.frameAverage > 0.023
            ? Math.max(0.65, this.resolutionQuality - 0.1)
            : this.frameAverage < 0.0175
              ? Math.min(
                  this.maxResolutionQuality,
                  this.resolutionQuality + 0.05,
                )
              : this.resolutionQuality;
        if (next !== this.resolutionQuality) {
          this.resolutionQuality = next;
          this.resize();
        }
        this.qualityCooldown = this.frameAverage > 0.023 ? 3 : 8;
      }
    }
    this.audioEngine.update(
      this.state.phase === 'running' || this.state.phase === 'dead',
      this.volume,
      this.musicVolume,
      this.muted,
    );
    this.publish += dt;
    if (this.publish > 0.1) {
      this.publish = 0;
      this.drawMap();
      this.emit();
    }
  };

  private drawMap() {
    const ctx = this.map.getContext('2d');
    if (!ctx) return;
    const w = this.map.width,
      h = this.map.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f0eee3';
    ctx.fillRect(0, 0, w, h);
    const sx = w / 45,
      sz = h / 45;
    ctx.strokeStyle = '#d5d0c2';
    ctx.lineWidth = 0.6;
    for (let i = 0; i <= 45; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i * sx, 0);
      ctx.lineTo(i * sx, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * sz);
      ctx.lineTo(w, i * sz);
      ctx.stroke();
    }
    for (const o of this.level.obstacles) {
      ctx.fillStyle = '#' + obstacleColor(o).toString(16).padStart(6, '0');
      ctx.strokeStyle = '#88816d';
      ctx.lineWidth = 1.6;
      const x = (o.x - o.w / 2 + 22.5) * sx,
        z = (o.z - o.d / 2 + 22.5) * sz;
      ctx.fillRect(x, z, o.w * sx, o.d * sz);
      ctx.strokeRect(x, z, o.w * sx, o.d * sz);
    }
    for (const p of this.pickups) {
      const x = (p.x + 22.5) * sx,
        y = (p.z + 22.5) * sz;
      ctx.globalAlpha = p.remaining > 0 ? 0.25 : 1;
      ctx.fillStyle = PICKUPS[p.kind].css;
      ctx.strokeStyle = '#fffdf1';
      ctx.lineWidth = 2;
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        p.kind === 'health' ? '+' : p.kind === 'ammo' ? '•' : '◇',
        x,
        y,
      );
    }
    ctx.globalAlpha = 1;
    for (const b of this.bots) {
      if (!b.alive || this.pvp) continue;
      ctx.fillStyle = '#d78160';
      ctx.strokeStyle = '#fdfaf0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        (b.group.position.x + 22.5) * sx,
        (b.group.position.z + 22.5) * sz,
        5.4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }
    const px = (this.camera.position.x + 22.5) * sx,
      pz = (this.camera.position.z + 22.5) * sz;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-this.yaw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 32, -Math.PI / 2 - 0.52, -Math.PI / 2 + 0.52);
    ctx.closePath();
    ctx.fillStyle = '#6e95ae26';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(-6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fillStyle = '#668fa9';
    ctx.strokeStyle = '#f9f8f0';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  private resize() {
    const w = this.host.clientWidth || 1000,
      h = this.host.clientHeight || 600;
    this.renderer.setPixelRatio(
      renderPixelRatio(w, h, devicePixelRatio, this.resolutionQuality) *
        (this.touchMode ? 0.72 : 1),
    );
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = viewFov(
      w / h,
      this.state.aiming ? [1.5, 1.25, 4, 1.6][this.state.weapon] : 1,
      this.sprintBlend,
    );
    this.camera.updateProjectionMatrix();
    this.gunCamera.aspect = w / h;
    this.gunCamera.updateProjectionMatrix();
    this.drawMap();
  }
  private emit() {
    this.state.aliveEnemies = this.bots.filter((b) => b.alive).length;
    if (this.hurtTime > 0 && this.state.lastHurt) {
      const hit = this.state.lastHurt;
      const angle =
        Math.round(
          damageBearing(
            this.camera.position,
            { x: hit.sourceX, z: hit.sourceZ },
            this.yaw,
          ) * 60,
        ) / 60;
      if (angle !== hit.angle) this.state.lastHurt = { ...hit, angle };
    }
    this.state.hit = this.hitTime > 0;
    this.state.hurt = this.hurtTime > 0;
    const next = {
      ...this.state,
      time: Math.ceil(this.state.time),
      respawn: Math.ceil(this.state.respawn),
    };
    if (
      this.lastSnapshot &&
      Object.keys(next).every(
        (key) =>
          next[key as keyof Snapshot] ===
          this.lastSnapshot![key as keyof Snapshot],
      )
    )
      return;
    this.lastSnapshot = next;
    this.notify({ ...next, feed: [...next.feed] });
  }
  getSnapshot() {
    return { ...this.state, feed: [...this.state.feed] };
  }
  getDiagnostics() {
    return {
      fps: this.state.fps,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      pixelRatio: this.renderer.getPixelRatio(),
      geometries: this.renderer.info.memory.geometries,
    };
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.Sprite
      ) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) material.dispose();
      }
    });
  }
  private clearGroup(group: THREE.Group) {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      this.disposeObject(child);
      group.remove(child);
    }
  }
  dispose() {
    this.nameplates?.forEach((node) => node.remove());
    this.nameplates?.clear();
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.observer.disconnect();
    if (document.pointerLockElement === this.renderer.domElement)
      document.exitPointerLock();
    this.disposeObject(this.scene);
    this.disposeObject(this.gunScene);
    this.decalTextures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.audioEngine.dispose();
  }
}
