import * as THREE from 'three';
import {
  WEAPONS,
  OBSTACLES,
  SPAWNS,
  moveBody,
  floorHeight,
  navigationField,
} from './rules';
export { WEAPONS } from './rules';
export type Snapshot = {
  phase: 'ready' | 'running' | 'paused' | 'dead' | 'ended';
  health: number;
  kills: number;
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
};
type Particle = {
  object: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  max: number;
};
const ink = 0x494a40,
  paper = 0xeae7d7,
  orange = 0xd88967;
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
  state: Snapshot = {
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
  };
  muted = false;
  volume = 0.55;
  sensitivity = 1;
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
  private feet = 0;
  private vertical = 0;
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
  private solids: THREE.Mesh[] = [];
  private particles: Particle[] = [];
  private clips: number[] = WEAPONS.map((w) => w.capacity);
  private reserves: number[] = WEAPONS.map((w) => w.reserve);
  private ray = new THREE.Raycaster();
  private audio: AudioContext | null = null;
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
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0xf0eee3);
    this.renderer.autoClear = false;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.tabIndex = 0;
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 1.72, 16);
    this.scene.background = new THREE.Color(0xf0eee3);
    this.scene.fog = new THREE.Fog(0xf0eee3, 26, 70);
    this.scene.add(new THREE.HemisphereLight(0xfffbee, 0xc2bdac, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-15, 25, 12);
    this.scene.add(sun);
    this.gunScene.add(new THREE.HemisphereLight(0xffffff, 0xb9b6a4, 2.5));
    const fill = new THREE.DirectionalLight(0xffffff, 2);
    fill.position.set(-3, 5, 2);
    this.gunScene.add(fill);
    this.gunScene.add(this.gun);
    this.buildWorld();
    this.buildGun();
    this.spawnBots();
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
      mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 1,
        metalness: 0,
        flatShading: true,
      });
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
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(110, 110),
      new THREE.MeshStandardMaterial({ color: 0xeeeadd, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.015;
    this.scene.add(ground);
    this.solids.push(ground);
    const grid = new THREE.GridHelper(86, 43, 0xbcb8a8, 0xcac6b7);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    grid.position.y = 0.001;
    this.scene.add(grid);
    for (const o of OBSTACLES) {
      const color =
        o.kind === 'crate'
          ? 0xd9d3bf
          : o.kind === 'platform' || o.kind === 'step'
            ? 0xd9d6c5
            : 0xe4e0d1;
      const group = this.box(o.w, o.h, o.d, color);
      group.position.set(o.x, o.h / 2, o.z);
      this.scene.add(group);
      this.solids.push(group.children[0] as THREE.Mesh);
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
    const wallTitle = this.textPlane('SCRAP YARD', 15, 5, '#a49b85', 72);
    wallTitle.position.set(-1, 3.15, -20.48);
    this.scene.add(wallTitle);
    const left = this.textPlane('01', 3.5, 2.4, '#807e6d', 135);
    left.position.set(-11, 2.5, -7.47);
    this.scene.add(left);
    const right = this.textPlane('B', 2.8, 2.8, '#a0785e', 145);
    right.position.set(12, 2.8, -6.47);
    this.scene.add(right);
    const floor = this.textPlane('KEEP MOVING →', 9, 3.5, '#9f9b86', 53);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.018, 9.5);
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
      const b = this.box(4 + seeded(i + 4) * 4, h, 4, 0xe4e1d6);
      b.position.set(-36 + i * 7, h / 2, -31 - seeded(i + 8) * 6);
      this.scene.add(b);
    }
    this.scene.updateMatrixWorld(true);
  }
  private buildGun() {
    this.clearGroup(this.gun);
    const index = this.state.weapon;
    const add = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color = 0xd5d1c1,
    ) => {
      const b = this.box(w, h, d, color);
      b.position.set(x, y, z);
      this.gun.add(b);
      return b;
    };
    if (index === 0) {
      add(0.13, 0.15, 0.43, 0, 0, -0.12, 0xd4d2c7);
      add(0.115, 0.22, 0.14, 0, -0.14, 0.02, 0xb4b19f).rotation.x = -0.2;
      add(0.135, 0.055, 0.39, 0, 0.07, -0.13, 0xbabdb2);
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
        add(0.105, 0.29, 0.19, 0, -0.21, -0.23, 0xa8ab96).rotation.x = 0.15;
        for (let i = 0; i < 4; i++)
          add(0.11, 0.012, 0.155, 0, -0.12 - i * 0.05, -0.23, 0x787e69);
      } else {
        add(0.14, 0.12, 0.34, 0, -0.03, -0.64, 0xafa990);
        for (let i = 0; i < 6; i++)
          add(0.145, 0.008, 0.017, 0, 0.034, -0.48 - i * 0.05, 0x646b58);
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
    this.muzzle = new THREE.Group();
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
    this.gun.add(this.muzzle);
    this.gun.position.set(0.39, -0.29, -0.52);
    this.gun.rotation.y = -0.07;
  }
  private spawnBots() {
    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group(),
        body = this.box(0.58, 0.65, 0.35, orange);
      body.position.y = 1.05;
      group.add(body);
      const head = this.box(0.48, 0.45, 0.43, 0xe2c5a7);
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
        const leg = this.box(0.17, 0.66, 0.21, 0xbaaa8f);
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
      const mark = this.textPlane(`0${i + 1}`, 1.1, 0.55, '#aa7457', 90);
      mark.position.set(0, 2.3, 0);
      group.add(mark);
      group.userData.bot = i;
      group.traverse((child) => (child.userData.bot = i));
      this.scene.add(group);
      const spawn = SPAWNS[i + 1];
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
      });
    }
  }
  private bind() {
    const options = { signal: this.abort.signal };
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (document.pointerLockElement === this.renderer.domElement) {
          if (this.state.phase === 'ready' || this.state.phase === 'ended')
            this.reset();
          this.state.phase = this.pausedPhase;
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
        this.error(
          '鼠标锁定没有成功。请再次点击进入；如果当前预览限制了鼠标锁定，请在独立浏览器中打开。',
        );
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
        const zoom = this.state.aiming
          ? this.state.weapon === 2
            ? 0.3
            : 0.65
          : 1;
        this.yaw -= e.movementX * 0.002 * this.sensitivity * zoom;
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
        if (
          e.code === 'Space' &&
          this.state.phase === 'running' &&
          this.feet <=
            floorHeight(
              this.camera.position.x,
              this.camera.position.z,
              this.feet,
            ) +
              0.02
        ) {
          this.vertical = 6.3;
          this.sound('jump');
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
        if (e.button === 2) {
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
    if (this.disposed) return;
    if (this.state.phase === 'running' || this.state.phase === 'dead') return;
    try {
      if (!this.audio) this.audio = new AudioContext();
      void this.audio.resume().catch(() => {});
      this.renderer.domElement.focus({ preventScroll: true });
      const request = this.renderer.domElement.requestPointerLock();
      if (request && typeof request.catch === 'function')
        void request.catch(() => {
          this.error(
            '未能锁定鼠标。请再次点击进入，或在独立浏览器中打开游戏。',
          );
        });
    } catch {
      this.error(
        '此浏览器不支持鼠标锁定，请使用桌面版 Chrome、Edge 或 Firefox。',
      );
    }
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
      kills: 0,
      deaths: 0,
      time: 180,
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
    };
    this.pausedPhase = 'running';
    this.clips = WEAPONS.map((w) => w.capacity);
    this.reserves = WEAPONS.map((w) => w.reserve);
    this.camera.position.set(0, 1.72, 16);
    this.yaw = 0;
    this.pitch = -0.035;
    this.feet = 0;
    this.vertical = 0;
    this.immunity = 2.5;
    this.cooldown = 0;
    this.reloadTime = 0;
    this.hitTime = 0;
    this.hurtTime = 0;
    this.pathTime = 0;
    this.clearInput();
    this.bots.forEach((bot, i) => {
      bot.alive = true;
      bot.health = 100;
      bot.group.visible = true;
      const p = SPAWNS[i + 1];
      bot.group.position.set(p.x, 0, p.z);
      bot.cooldown = 1.5 + i * 0.6;
      bot.repath = 0;
    });
    this.emit();
  }
  private clearInput() {
    this.keys.clear();
    this.held = false;
    this.state.aiming = false;
    this.state.sprinting = false;
    this.state.crouching = false;
  }
  selectWeapon(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return false;
    this.state.weapon = index;
    this.state.ammo = this.clips[index];
    this.state.reserve = this.reserves[index];
    this.state.reloading = false;
    this.state.aiming = false;
    this.reloadTime = 0;
    this.cooldown = 0.22;
    this.held = false;
    this.buildGun();
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
    this.state.aiming = false;
    this.reloadTime = WEAPONS[this.state.weapon].reload;
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
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld(true);
    this.scene.updateMatrixWorld(true);
    const origin = this.camera.position.clone();
    let didHit = false;
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
      this.ray.set(origin, direction);
      this.ray.far = spec.range;
      const targets = [
        ...this.solids,
        ...this.bots.filter((b) => b.alive).map((b) => b.group),
      ];
      const intersections = this.ray
        .intersectObjects(targets, true)
        .filter((hit) => hit.object instanceof THREE.Mesh);
      const impact = intersections[0];
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
      if (impact && typeof impact.object.userData.bot === 'number') {
        const bot = this.bots[impact.object.userData.bot];
        if (bot.alive) {
          const headshot = impact.point.y - bot.group.position.y > 1.45;
          const damage =
            spec.damage *
            (headshot ? 1.5 : 1) *
            (this.state.weapon === 1
              ? Math.max(0.35, 1 - impact.distance / 35)
              : 1);
          bot.health -= damage;
          didHit = true;
          this.hitTime = 0.16;
          this.burst(impact.point, 0xcf8059, 4);
          if (bot.health <= 0) {
            bot.alive = false;
            bot.group.visible = false;
            bot.respawn = 3 + Math.random() * 2;
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
      this.state.hits++;
      this.sound('hit');
    }
    this.emit();
  }
  private tracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const object = this.line([from, to], color, 0.8);
    this.scene.add(object);
    this.particles.push({
      object,
      velocity: new THREE.Vector3(),
      life: 0.07,
      max: 0.07,
    });
  }
  private burst(position: THREE.Vector3, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const object = this.sketch(
        new THREE.PlaneGeometry(
          0.04 + Math.random() * 0.1,
          0.05 + Math.random() * 0.14,
        ),
        color,
        0,
      );
      object.position.copy(position);
      object.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3,
      );
      this.scene.add(object);
      this.particles.push({
        object,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 3,
          (Math.random() - 0.5) * 3,
        ),
        life: 0.4 + Math.random() * 0.4,
        max: 0.8,
      });
    }
  }
  private addFeed(text: string) {
    this.state.feed = [
      ...this.state.feed.slice(-2),
      { id: Date.now() + this.rng++, text },
    ];
  }
  private sound(
    type: 'shot' | 'reload' | 'hit' | 'kill' | 'hurt' | 'jump' | 'step',
  ) {
    if (!this.audio || this.muted || this.volume <= 0) return;
    const ac = this.audio,
      t = ac.currentTime,
      gain = ac.createGain();
    gain.connect(ac.destination);
    let duration = 0.12;
    let loud = 0.035;
    if (type === 'shot') {
      duration =
        this.state.weapon === 1 ? 0.22 : this.state.weapon === 2 ? 0.3 : 0.13;
      loud = 0.2;
      const buffer = ac.createBuffer(
          1,
          Math.floor(ac.sampleRate * duration),
          ac.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
      const noise = ac.createBufferSource();
      noise.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value =
        this.state.weapon === 2 ? 1400 : this.state.weapon === 1 ? 950 : 2400;
      noise.connect(filter);
      filter.connect(gain);
      noise.start(t);
      noise.stop(t + duration);
    } else {
      const osc = ac.createOscillator();
      osc.type = type === 'reload' ? 'triangle' : 'sine';
      const frequency =
        type === 'hit'
          ? 1000
          : type === 'kill'
            ? 660
            : type === 'hurt'
              ? 110
              : type === 'jump'
                ? 180
                : type === 'step'
                  ? 70
                  : 400;
      osc.frequency.setValueAtTime(frequency, t);
      osc.frequency.exponentialRampToValueAtTime(
        type === 'kill' ? 1320 : frequency * 0.45,
        t + duration,
      );
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + duration);
    }
    gain.gain.setValueAtTime(loud * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  }
  private updateBots(dt: number) {
    this.pathTime -= dt;
    if (this.pathTime <= 0) {
      this.field = navigationField(
        this.camera.position.x,
        this.camera.position.z,
      );
      this.pathTime = 0.55;
    }
    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.respawn -= dt;
        if (bot.respawn <= 0) {
          const candidates = SPAWNS.filter(
            (p) =>
              Math.hypot(
                p.x - this.camera.position.x,
                p.z - this.camera.position.z,
              ) > 12,
          );
          const spawn =
            candidates[Math.floor(Math.random() * candidates.length)] ||
            SPAWNS[3];
          bot.group.position.set(spawn.x, 0, spawn.z);
          bot.health = 100;
          bot.alive = true;
          bot.group.visible = true;
          bot.cooldown = 1.5;
          bot.repath = 0;
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
      this.ray.set(origin, direction.normalize());
      this.ray.far = Math.max(0, len - 0.1);
      const blocked = this.ray.intersectObjects(this.solids, false).length > 0;
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
            (mx / norm) * dt * 2.1,
            (mz / norm) * dt * 2.1,
            0,
            0.35,
          );
      } else if (distance < 5) {
        moveBody(
          pos,
          (-dx / distance) * dt * 1.1,
          (-dz / distance) * dt * 1.1,
          0,
          0.35,
        );
      } else {
        const strafe = Math.sin(this.elapsed * 0.7 + bot.id * 2);
        moveBody(
          pos,
          (dz / (distance || 1)) * dt * strafe,
          (-dx / (distance || 1)) * dt * strafe,
          0,
          0.35,
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
        bot.cooldown = 1.15 + Math.random() * 0.8;
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
          this.state.health = Math.max(
            0,
            this.state.health - (7 + Math.floor(Math.random() * 5)),
          );
          this.hurtTime = 0.18;
          this.sound('hurt');
          if (this.state.health <= 0) {
            this.state.deaths++;
            this.state.phase = 'dead';
            this.state.respawn = 3;
            this.state.aiming = false;
            this.state.reloading = false;
            this.reloadTime = 0;
            this.held = false;
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
    let best = SPAWNS[0],
      bestDistance = -1;
    for (const spawn of SPAWNS) {
      const nearest = Math.min(
        ...this.bots
          .filter((b) => b.alive)
          .map((b) =>
            Math.hypot(
              b.group.position.x - spawn.x,
              b.group.position.z - spawn.z,
            ),
          ),
      );
      if (nearest > bestDistance) {
        best = spawn;
        bestDistance = nearest;
      }
    }
    this.camera.position.set(best.x, 1.72, best.z);
    this.feet = 0;
    this.vertical = 0;
    this.yaw = Math.atan2(-best.x, -best.z) + Math.PI;
    this.pitch = 0;
    this.state.health = 100;
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
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
      this.keys.has('KeyW') &&
      !this.state.aiming &&
      !this.state.crouching &&
      !this.state.reloading;
    let forward =
        (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0),
      right = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const moving = forward !== 0 || right !== 0;
    const norm = Math.hypot(forward, right) || 1;
    forward /= norm;
    right /= norm;
    const speed = this.state.crouching
      ? 2
      : this.state.sprinting
        ? 7.4
        : this.state.aiming
          ? 2.6
          : 4.4;
    const dx =
        (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right) *
        speed *
        dt,
      dz =
        (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right) *
        speed *
        dt;
    moveBody(this.camera.position, dx, dz, this.feet);
    this.vertical -= 17 * dt;
    this.feet += this.vertical * dt;
    const floor = floorHeight(
      this.camera.position.x,
      this.camera.position.z,
      Math.max(0, this.feet),
    );
    if (this.feet <= floor) {
      this.feet = floor;
      this.vertical = 0;
    }
    const targetEye = this.state.crouching ? 1.02 : 1.72;
    this.eye = THREE.MathUtils.lerp(this.eye, targetEye, Math.min(1, dt * 12));
    if (moving) this.bob += dt * (this.state.sprinting ? 14 : 9);
    this.camera.position.y =
      this.feet + this.eye + (moving ? Math.sin(this.bob) * 0.025 : 0);
    if (this.held && this.state.weapon === 3) this.fire();
    if (this.state.reloading) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        const need = WEAPONS[this.state.weapon].capacity - this.state.ammo,
          amount = Math.min(need, this.state.reserve);
        this.state.ammo += amount;
        this.state.reserve -= amount;
        this.clips[this.state.weapon] = this.state.ammo;
        this.reserves[this.state.weapon] = this.state.reserve;
        this.state.reloading = false;
        this.emit();
      }
    }
  }
  private tick = (timestamp: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(0.04, (timestamp - (this.last || timestamp)) / 1000);
    this.last = timestamp;
    this.elapsed += dt;
    const active =
      this.state.phase === 'running' || this.state.phase === 'dead';
    if (active) {
      this.state.time = Math.max(0, this.state.time - dt);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.immunity -= dt;
      this.hitTime = Math.max(0, this.hitTime - dt);
      this.hurtTime = Math.max(0, this.hurtTime - dt);
      this.flashTime = Math.max(0, this.flashTime - dt);
      if (this.state.phase === 'running') this.updatePlayer(dt);
      else {
        this.state.respawn -= dt;
        if (this.state.respawn <= 0) this.respawnPlayer();
      }
      this.updateBots(dt);
      if (this.state.time <= 0) {
        this.state.phase = 'ended';
        this.pausedPhase = 'running';
        this.clearInput();
        document.exitPointerLock();
        this.emit();
      }
    }
    this.recoil = THREE.MathUtils.lerp(this.recoil, 0, dt * 13);
    this.camera.rotation.set(
      this.pitch + this.recoil * 0.16,
      this.yaw,
      0,
      'YXZ',
    );
    const targetFov = this.state.aiming
      ? WEAPONS[this.state.weapon].zoom
      : this.state.sprinting
        ? 83
        : 76;
    this.camera.fov = THREE.MathUtils.lerp(
      this.camera.fov,
      targetFov,
      Math.min(1, dt * 14),
    );
    this.camera.updateProjectionMatrix();
    this.gun.visible =
      this.state.phase !== 'dead' &&
      !(this.state.aiming && this.state.weapon === 2);
    const aim = this.state.aiming;
    const moving =
      this.keys.has('KeyW') ||
      this.keys.has('KeyA') ||
      this.keys.has('KeyS') ||
      this.keys.has('KeyD');
    const targetX = aim ? 0 : 0.39,
      targetY = aim ? -0.135 : -0.29;
    this.gun.position.x =
      THREE.MathUtils.lerp(this.gun.position.x, targetX, dt * 16) +
      (moving && !aim ? Math.sin(this.bob) * 0.0009 : 0);
    this.gun.position.y =
      THREE.MathUtils.lerp(this.gun.position.y, targetY, dt * 16) -
      (this.state.reloading
        ? Math.sin(
            Math.min(1, this.reloadTime / WEAPONS[this.state.weapon].reload) *
              Math.PI,
          ) * 0.3
        : 0) *
        dt *
        10;
    this.gun.position.z = -0.52 + this.recoil;
    this.gun.rotation.x = this.recoil + (this.state.sprinting ? -0.27 : 0);
    this.gun.rotation.y = aim ? 0 : -0.07;
    this.gun.rotation.z = this.state.reloading ? -0.35 : 0;
    this.muzzle.visible = this.flashTime > 0 && active;
    if (active || this.state.phase === 'ready') {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.scene.remove(p.object);
          this.disposeObject(p.object);
          this.particles.splice(i, 1);
          continue;
        }
        p.object.position.addScaledVector(p.velocity, dt);
        if (p.max > 0.1) {
          p.velocity.y -= 5 * dt;
          p.object.rotation.x += dt * 4;
          p.object.rotation.z += dt * 3;
        }
      }
    }
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.gunScene, this.gunCamera);
    this.publish += dt;
    if (this.publish > 0.08) {
      this.publish = 0;
      this.drawMap();
      if (active) this.emit();
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
    for (const o of OBSTACLES) {
      ctx.fillStyle = o.kind === 'crate' ? '#d4cdbb' : '#ded9ca';
      ctx.strokeStyle = '#88816d';
      ctx.lineWidth = 1.6;
      const x = (o.x - o.w / 2 + 22.5) * sx,
        z = (o.z - o.d / 2 + 22.5) * sz;
      ctx.fillRect(x, z, o.w * sx, o.d * sz);
      ctx.strokeRect(x, z, o.w * sx, o.d * sz);
    }
    for (const b of this.bots) {
      if (!b.alive) continue;
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
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.gunCamera.aspect = w / h;
    this.gunCamera.updateProjectionMatrix();
    this.drawMap();
  }
  private emit() {
    this.state.hit = this.hitTime > 0;
    this.state.hurt = this.hurtTime > 0;
    this.notify({ ...this.state, feed: [...this.state.feed] });
  }
  getSnapshot() {
    return { ...this.state, feed: [...this.state.feed] };
  }
  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) material.dispose();
      }
    });
  }
  private clearGroup(group: THREE.Group) {
    for (const child of [...group.children]) {
      this.disposeObject(child);
      group.remove(child);
    }
  }
  dispose() {
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
    void this.audio?.close();
  }
}
