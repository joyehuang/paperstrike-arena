import * as THREE from 'three';

/** Bake static pencil geometry into one colored surface draw and one line draw.
 * Textured decals and explicitly dynamic branches retain their own transforms. */
export function batchSketch(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const positions: number[] = [],
    normals: number[] = [],
    colors: number[] = [];
  const linePositions: number[] = [],
    lineColors: number[] = [];
  const remove: THREE.Object3D[] = [];
  const matrix = new THREE.Matrix4(),
    normalMatrix = new THREE.Matrix3();
  const p = new THREE.Vector3(),
    n = new THREE.Vector3();
  root.traverse((object) => {
    let ancestor: THREE.Object3D | null = object;
    while (ancestor && ancestor !== root) {
      if (ancestor.userData.dynamic) return;
      ancestor = ancestor.parent;
    }
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line))
      return;
    const material = object.material;
    if (Array.isArray(material) || ('map' in material && material.map)) return;
    if (!('color' in material)) return;
    const color = material.color as THREE.Color;
    matrix.multiplyMatrices(inverse, object.matrixWorld);
    normalMatrix.getNormalMatrix(matrix);
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry;
    const attr = geometry.getAttribute('position'),
      normal = geometry.getAttribute('normal');
    const addVertex = (index: number, isLine: boolean) => {
      p.fromBufferAttribute(attr, index).applyMatrix4(matrix);
      if (isLine) {
        linePositions.push(p.x, p.y, p.z);
        lineColors.push(color.r, color.g, color.b);
      } else {
        positions.push(p.x, p.y, p.z);
        n.fromBufferAttribute(normal, index)
          .applyMatrix3(normalMatrix)
          .normalize();
        normals.push(n.x, n.y, n.z);
        colors.push(color.r, color.g, color.b);
      }
    };
    if (object instanceof THREE.Mesh) {
      for (let i = 0; i < attr.count; i++) addVertex(i, false);
    } else if (object instanceof THREE.LineSegments) {
      for (let i = 0; i < attr.count; i++) addVertex(i, true);
    } else {
      for (let i = 1; i < attr.count; i++) {
        addVertex(i - 1, true);
        addVertex(i, true);
      }
    }
    if (geometry !== object.geometry) geometry.dispose();
    remove.push(object);
  });
  for (const object of remove) {
    object.removeFromParent();
    const drawable = object as THREE.Mesh;
    drawable.geometry.dispose();
    (drawable.material as THREE.Material).dispose();
  }
  if (positions.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    mesh.name = 'batched-surfaces';
    root.add(mesh);
  }
  if (linePositions.length) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(lineColors, 3),
    );
    geometry.computeBoundingSphere();
    const lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    lines.name = 'batched-pencil';
    root.add(lines);
  }
  return {
    surfaces: positions.length / 9,
    lineSegments: linePositions.length / 6,
    draws: Number(positions.length > 0) + Number(linePositions.length > 0),
  };
}

/** A fixed GPU allocation: sustained firing never creates more particle meshes. */
export class CombatEffects {
  readonly root = new THREE.Group();
  private chips: THREE.InstancedMesh;
  private trails: THREE.LineSegments;
  private lives = new Float32Array(128);
  private velocities = new Float32Array(128 * 3);
  private points = new Float32Array(128 * 3);
  private trailLives = new Float32Array(32);
  private trailPositions = new Float32Array(32 * 6);
  private trailColors = new Float32Array(32 * 6);
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private scale = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private chipCursor = 0;
  private trailCursor = 0;
  constructor() {
    this.root.userData.dynamic = true;
    this.chips = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.1, 0.14),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      128,
    );
    this.chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chips.frustumCulled = false;
    for (let i = 0; i < 128; i++) {
      this.matrix.makeScale(0, 0, 0);
      this.chips.setMatrixAt(i, this.matrix);
      this.chips.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.root.add(this.chips);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.trailColors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.trails = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    this.trails.frustumCulled = false;
    this.root.add(this.trails);
  }
  burst(point: THREE.Vector3, color: number, count: number) {
    const shade = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.chipCursor++ % 128,
        j = i * 3;
      this.lives[i] = 0.45 + Math.random() * 0.3;
      this.points[j] = point.x;
      this.points[j + 1] = point.y;
      this.points[j + 2] = point.z;
      this.velocities[j] = (Math.random() - 0.5) * 3;
      this.velocities[j + 1] = 1 + Math.random() * 2;
      this.velocities[j + 2] = (Math.random() - 0.5) * 3;
      this.chips.setColorAt(i, shade);
    }
    if (this.chips.instanceColor) this.chips.instanceColor.needsUpdate = true;
  }
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const i = this.trailCursor++ % 32,
      j = i * 6,
      shade = new THREE.Color(color);
    this.trailLives[i] = 0.09;
    this.trailPositions.set([from.x, from.y, from.z, to.x, to.y, to.z], j);
    this.trailColors.set(
      [shade.r, shade.g, shade.b, shade.r, shade.g, shade.b],
      j,
    );
    this.trails.geometry.attributes.position.needsUpdate = true;
    this.trails.geometry.attributes.color.needsUpdate = true;
  }
  update(dt: number) {
    for (let i = 0; i < 128; i++) {
      if (this.lives[i] <= 0) continue;
      this.lives[i] -= dt;
      const j = i * 3;
      for (let k = 0; k < 3; k++)
        this.points[j + k] += this.velocities[j + k] * dt;
      this.velocities[j + 1] -= 6 * dt;
      this.position.fromArray(this.points, j);
      this.scale.setScalar(Math.max(0, Math.min(1, this.lives[i] * 5)));
      this.rotation.setFromAxisAngle(
        THREE.Object3D.DEFAULT_UP,
        this.lives[i] * 8 + i,
      );
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.chips.setMatrixAt(i, this.matrix);
    }
    this.chips.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 32; i++) {
      if (this.trailLives[i] <= 0) continue;
      this.trailLives[i] -= dt;
      if (this.trailLives[i] <= 0)
        this.trailPositions.fill(0, i * 6, i * 6 + 6);
    }
    this.trails.geometry.attributes.position.needsUpdate = true;
  }
}

export function renderPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  quality = 1,
) {
  return (
    Math.min(
      deviceRatio,
      1.35,
      Math.sqrt(1_900_000 / Math.max(1, width * height)),
    ) * quality
  );
}
