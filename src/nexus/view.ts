// The 3D NEXUS cube (Three.js). Plain circuit-metal pieces, a coloured crystal in each face centre,
// and light beams that act as the meters: one beam per matching piece on that face (up to 9).
// Drag empty space to look around. Drag on the cube to turn a layer. Click a glowing layer to turn it.
import * as THREE from "three";
import { FACE, FACE_ORDER, NEEDS, faceOf, type FaceKey, type Move, type NexusRun } from "./cube";

type Result = "turned" | "wrong-direction" | "locked";

interface Beam {
  line: THREE.Line;
  dot: THREE.Sprite;
  curve: THREE.QuadraticBezierCurve3;
  t: number;
  speed: number;
  base: number;
}

interface Crystal {
  face: FaceKey;
  gem: THREE.Mesh;
  cage: THREE.LineSegments;
  glow: THREE.Sprite;
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

let seed = 11;
const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

function canvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!];
}

function orth(x: CanvasRenderingContext2D, n: number): void {
  let px = 20 + rnd() * 216;
  let py = 20 + rnd() * 216;
  x.beginPath();
  x.moveTo(px, py);
  for (let j = 0; j < n; j += 1) {
    if (j % 2) py = 20 + rnd() * 216;
    else px = 20 + rnd() * 216;
    x.lineTo(px, py);
  }
  x.stroke();
}

/** Stylised circuit plate: flat panels, a few traces, a bevel. */
function plateTexture(hole: boolean): THREE.CanvasTexture {
  const [c, x] = canvas();
  x.fillStyle = "#161D2A";
  x.fillRect(0, 0, 256, 256);
  const shades = ["#1C2535", "#222D40", "#121925", "#28344A"];
  for (let i = 0; i < 38; i += 1) {
    x.fillStyle = shades[i % 4];
    x.fillRect(16 + rnd() * 200, 16 + rnd() * 200, 8 + rnd() * 46, 6 + rnd() * 30);
  }
  x.strokeStyle = "#34425C";
  x.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) orth(x, 3);
  x.fillStyle = "#5E7499";
  for (let i = 0; i < 16; i += 1) x.fillRect(16 + rnd() * 222, 16 + rnd() * 222, 3, 3);
  if (hole) {
    x.fillStyle = "#05080E";
    x.fillRect(58, 58, 140, 140);
    x.strokeStyle = "#3A4862";
    x.lineWidth = 3;
    x.strokeRect(58, 58, 140, 140);
  }
  x.strokeStyle = "#0A0E15";
  x.lineWidth = 14;
  x.strokeRect(0, 0, 256, 256);
  x.lineWidth = 3;
  x.strokeStyle = "#3E4E6A";
  x.beginPath();
  x.moveTo(10, 246);
  x.lineTo(10, 10);
  x.lineTo(246, 10);
  x.stroke();
  x.strokeStyle = "#0C1119";
  x.beginPath();
  x.moveTo(246, 10);
  x.lineTo(246, 246);
  x.lineTo(10, 246);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture(): THREE.CanvasTexture {
  const [c, x] = canvas();
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Chevrons pointing to +u. Scrolling the texture makes them flow the way the layer should turn. */
function chevronTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.strokeStyle = "#ffffff";
  x.lineWidth = 9;
  x.lineCap = "round";
  x.lineJoin = "round";
  for (const ox of [22, 86]) {
    x.beginPath();
    x.moveTo(ox, 12);
    x.lineTo(ox + 20, 32);
    x.lineTo(ox, 52);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

function easeInOut(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

export class NexusView {
  onChange: () => void = () => undefined;
  onWrong: () => void = () => undefined;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  private readonly root = new THREE.Group();
  private readonly hints = new THREE.Group();
  private readonly cubies: THREE.Mesh[] = [];
  private readonly pickables: THREE.Object3D[] = [];
  private readonly crystals: Crystal[] = [];
  private readonly beams = {} as Record<FaceKey, Beam[]>;
  private readonly glow = glowTexture();
  private readonly chevrons = chevronTexture();
  private readonly ray = new THREE.Raycaster();
  private readonly observer: ResizeObserver;

  private yaw = -0.7;
  private pitch = 0.42;
  private targetYaw = -0.7;
  private targetPitch = 0.42;
  private busy = false;
  private wobble = 0;
  private flash = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private drag: {
    mode: "orbit" | "cube";
    id: number;
    x: number;
    y: number;
    sx: number;
    sy: number;
    resolved: boolean;
    cubie?: THREE.Object3D;
    normal?: THREE.Vector3;
    point?: THREE.Vector3;
  } | null = null;

  constructor(private readonly host: HTMLElement, private run: NexusRun) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = "nexus-canvas";
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, 13);
    this.buildScene();
    this.buildCube();
    this.buildBeams();
    this.root.add(this.hints);
    this.scene.add(this.root);
    this.bindPointer();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.refresh();
  }

  setRun(run: NexusRun): void {
    this.run = run;
    this.refresh();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.resize();
    requestAnimationFrame((now) => this.loop(now));
  }

  stop(): void {
    this.running = false;
    this.drag = null;
  }

  /** Buttons and the click shortcut come through here, same as a drag. */
  request(move: Move): Result {
    if (this.busy) return "locked";
    if (this.run.isLegal(move)) {
      this.run.play(move);
      const { axis, side } = FACE[move.face];
      this.hints.visible = false;
      this.animateLayer(axis, side, (k) => (move.dir * Math.PI) / 2 * easeInOut(k), (move.dir * Math.PI) / 2, 560, () => {
        this.refresh();
        this.onChange();
      });
      return "turned";
    }
    if (this.run.legalFace(move.face)) {
      const { axis, side } = FACE[move.face];
      this.animateLayer(axis, side, (k) => move.dir * 0.32 * Math.sin(Math.PI * k), 0, 380, () => undefined);
      this.flash = 1.2;
      this.onWrong();
      return "wrong-direction";
    }
    this.wobble = 1;
    return "locked";
  }

  /** Rebuild the suggested-move arrows and show beam counts for the current cube. */
  refresh(): void {
    const counts = this.run.cube.counts();
    for (const face of FACE_ORDER) {
      this.beams[face].forEach((beam, i) => {
        const on = i < counts[face];
        beam.line.visible = on;
        beam.dot.visible = on;
      });
    }
    this.hints.clear();
    for (const move of this.run.legal()) this.addHint(move);
    this.hints.visible = true;
  }

  private buildScene(): void {
    this.scene.add(new THREE.AmbientLight(0x6f86b8, 0.6));
    this.scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0f1a, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(5, 7, 6);
    this.scene.add(sun);
    for (let i = 0; i < 5; i += 1) {
      const e = new THREE.EllipseCurve(0, 0, 9 + i * 3, 4 + i * 1.6, 0, Math.PI * 2);
      const g = new THREE.BufferGeometry().setFromPoints(e.getPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0)));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: i === 2 ? 0xff9a6b : 0x7aa2ff, transparent: true, opacity: i === 2 ? 0.35 : 0.18 }));
      line.rotation.set(1.1 + i * 0.15, 0, 0.3 - i * 0.2);
      line.position.z = -4;
      this.scene.add(line);
    }
    const n = 260;
    const pts = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      pts[i * 3] = (rnd() - 0.5) * 60;
      pts[i * 3 + 1] = (rnd() - 0.5) * 40;
      pts[i * 3 + 2] = -20 - rnd() * 20;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 0.12, transparent: true, opacity: 0.7 })));
  }

  private buildCube(): void {
    const plates = Array.from({ length: 6 }, () => plateTexture(false));
    const hole = plateTexture(true);
    const body = new THREE.BoxGeometry(0.97, 0.97, 0.97);
    const tile = new THREE.PlaneGeometry(0.93, 0.93);
    let v = 0;
    for (let x = -1; x <= 1; x += 1) {
      for (let y = -1; y <= 1; y += 1) {
        for (let z = -1; z <= 1; z += 1) {
          const cubie = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color: 0x0e131c, metalness: 0.7, roughness: 0.4 }));
          cubie.position.set(x, y, z);
          this.pickables.push(cubie);
          for (const face of FACE_ORDER) {
            const { axis, side } = FACE[face];
            if ([x, y, z][axis] !== side) continue;
            const center = [x, y, z].filter((c) => c === 0).length === 2;
            const normal = AXES[axis].clone().multiplyScalar(side);
            const plane = new THREE.Mesh(tile, new THREE.MeshStandardMaterial({ map: center ? hole : plates[v++ % 6], metalness: 0.45, roughness: 0.5 }));
            plane.position.copy(normal).multiplyScalar(0.49);
            plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            plane.userData.legalTint = true;
            cubie.add(plane);
            this.pickables.push(plane);
            if (center) this.addCrystal(cubie, face, normal);
          }
          this.root.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }
  }

  private addCrystal(cubie: THREE.Mesh, face: FaceKey, normal: THREE.Vector3): void {
    const color = new THREE.Color(NEEDS[face].color);
    const holder = new THREE.Group();
    holder.position.copy(normal).multiplyScalar(0.5);
    holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.27, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.95 }),
    );
    gem.scale.set(1, 1, 1.35);
    gem.position.z = 0.06;
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.42, 0)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75 }));
    cage.scale.set(1, 1, 0.55);
    cage.position.z = 0.05;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.scale.set(1.7, 1.7, 1);
    glow.position.z = 0.2;
    const light = new THREE.PointLight(color, 1.6, 3.2);
    light.position.z = 0.7;
    holder.add(gem, cage, glow, light);
    cubie.add(holder);
    this.crystals.push({ face, gem, cage, glow });
  }

  private buildBeams(): void {
    for (const face of FACE_ORDER) {
      const { axis, side } = FACE[face];
      const n = AXES[axis].clone().multiplyScalar(side);
      const a = AXES[(axis + 1) % 3];
      const b = AXES[(axis + 2) % 3];
      const color = new THREE.Color(NEEDS[face].color);
      this.beams[face] = [];
      for (let i = 0; i < 9; i += 1) {
        const start = n.clone().multiplyScalar(1.6);
        const ctrl = n.clone().multiplyScalar(3.4).addScaledVector(a, (rnd() - 0.5) * 3).addScaledVector(b, (rnd() - 0.5) * 3);
        const end = n.clone().multiplyScalar(9).addScaledVector(a, (rnd() - 0.5) * 12).addScaledVector(b, (rnd() - 0.5) * 12);
        const curve = new THREE.QuadraticBezierCurve3(start, ctrl, end);
        const base = 0.3 + rnd() * 0.35;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: base, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
        dot.scale.set(0.22, 0.22, 1);
        this.root.add(line, dot);
        this.beams[face].push({ line, dot, curve, t: rnd(), speed: 0.08 + rnd() * 0.12, base });
      }
    }
  }

  /** Four glowing chevron bands wrap the layer that should turn, flowing in the turn direction. */
  private addHint(move: Move): void {
    const { axis, side } = FACE[move.face];
    const A = AXES[axis];
    const color = new THREE.Color(NEEDS[move.face].color);
    const material = new THREE.MeshBasicMaterial({ map: this.chevrons, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const other of [0, 1, 2].filter((i) => i !== axis)) {
      for (const s of [1, -1]) {
        const m = AXES[other].clone().multiplyScalar(s);
        const flow = new THREE.Vector3().crossVectors(A, m).multiplyScalar(move.dir);
        const up = A.clone().multiplyScalar(move.dir);
        const band = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.55), material);
        band.matrixAutoUpdate = false;
        const basis = new THREE.Matrix4().makeBasis(flow, up, m);
        basis.setPosition(m.clone().multiplyScalar(1.53).addScaledVector(A, side));
        band.matrix.copy(basis);
        this.hints.add(band);
      }
    }
  }

  private animateLayer(axis: number, side: number, angleAt: (k: number) => number, finalAngle: number, duration: number, done: () => void): void {
    this.busy = true;
    this.root.updateMatrixWorld(true);
    const layer = this.cubies.filter((c) => Math.round(c.position.getComponent(axis)) === side);
    const pivot = new THREE.Group();
    this.root.add(pivot);
    pivot.updateMatrixWorld(true);
    for (const c of layer) pivot.attach(c);
    const key = (["x", "y", "z"] as const)[axis];
    const t0 = performance.now();
    const step = (): void => {
      const k = Math.min(1, (performance.now() - t0) / duration);
      pivot.rotation[key] = k < 1 ? angleAt(k) : finalAngle;
      if (k < 1) {
        requestAnimationFrame(step);
        return;
      }
      pivot.updateMatrixWorld(true);
      for (const c of layer) {
        this.root.attach(c);
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      }
      this.root.remove(pivot);
      this.busy = false;
      done();
    };
    requestAnimationFrame(step);
  }

  private bindPointer(): void {
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", (e) => {
      if (this.drag) return;
      const hit = this.pick(e);
      // While a layer is moving, a press on the cube does nothing (it must not become a look-around drag).
      if (hit && this.busy) return;
      el.setPointerCapture(e.pointerId);
      if (hit && !this.busy) {
        let cubie: THREE.Object3D | null = hit.object;
        while (cubie && !this.cubies.includes(cubie as THREE.Mesh)) cubie = cubie.parent;
        const worldNormal = (hit.face?.normal ?? new THREE.Vector3(0, 0, 1)).clone().transformDirection(hit.object.matrixWorld);
        const inv = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
        const local = worldNormal.applyQuaternion(inv);
        const i = [Math.abs(local.x), Math.abs(local.y), Math.abs(local.z)];
        const axis = i.indexOf(Math.max(...i));
        const normal = AXES[axis].clone().multiplyScalar(Math.sign(local.getComponent(axis)));
        this.drag = { mode: "cube", id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, resolved: false, cubie: cubie ?? undefined, normal, point: hit.point.clone() };
      } else {
        this.drag = { mode: "orbit", id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, resolved: false };
      }
    });
    el.addEventListener("pointermove", (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) {
        el.style.cursor = this.pick(e) ? "grab" : "default";
        return;
      }
      if (d.mode === "orbit") {
        this.targetYaw += (e.clientX - d.x) * 0.008;
        this.targetPitch = Math.max(-1.2, Math.min(1.2, this.targetPitch + (e.clientY - d.y) * 0.006));
        d.x = e.clientX;
        d.y = e.clientY;
        return;
      }
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (d.resolved || Math.hypot(dx, dy) < 14) return;
      d.resolved = true;
      const move = this.dragOnLegal(d.cubie!, d.point!, dx, dy) ?? this.moveFromDrag(d.cubie!, d.normal!, d.point!, dx, dy);
      if (move) this.request(move);
      else this.wobble = 1;
    });
    const end = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      if (d.mode !== "cube" || d.resolved || !d.cubie) return;
      // A tap on a glowing layer turns it the suggested way.
      const pos = d.cubie.position;
      const move = this.run.legal().find((m) => Math.round(pos.getComponent(FACE[m.face].axis)) === FACE[m.face].side);
      if (move) this.request(move);
      else this.wobble = 1;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => {
      this.drag = null;
    });
  }

  private pick(e: PointerEvent): THREE.Intersection | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera);
    return this.ray.intersectObjects(this.pickables, false)[0] ?? null;
  }

  private toScreen(p: THREE.Vector3): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const q = p.clone().project(this.camera);
    return new THREE.Vector2(((q.x + 1) / 2) * rect.width, ((1 - q.y) / 2) * rect.height);
  }

  /**
   * Kid-friendly drag: if the grabbed piece belongs to a glowing layer, any drag roughly along
   * that layer's circle turns it, even when dragging across the face that is turning.
   */
  private dragOnLegal(cubie: THREE.Object3D, point: THREE.Vector3, dx: number, dy: number): Move | null {
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const local = this.root.worldToLocal(point.clone());
    const drag = new THREE.Vector2(dx, dy).normalize();
    let best: { move: Move; score: number } | null = null;
    for (const m of this.run.legal()) {
      const { axis, side } = FACE[m.face];
      if (Math.round(cubie.position.getComponent(axis)) !== side) continue;
      const v = new THREE.Vector3().crossVectors(AXES[axis], local).applyQuaternion(rootQ);
      const s = this.toScreen(point.clone().addScaledVector(v, 0.3)).sub(this.toScreen(point));
      if (s.length() < 2) continue;
      const score = s.normalize().dot(drag);
      if (Math.abs(score) < 0.3) continue;
      if (!best || Math.abs(score) > Math.abs(best.score)) best = { move: { face: m.face, dir: score > 0 ? 1 : -1 }, score };
    }
    return best?.move ?? null;
  }

  /** Which layer turn best matches a drag that started on a face with this normal. */
  private moveFromDrag(cubie: THREE.Object3D, normal: THREE.Vector3, point: THREE.Vector3, dx: number, dy: number): Move | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const toScreen = (p: THREE.Vector3): THREE.Vector2 => {
      const q = p.clone().project(this.camera);
      return new THREE.Vector2(((q.x + 1) / 2) * rect.width, ((1 - q.y) / 2) * rect.height);
    };
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const drag = new THREE.Vector2(dx, dy).normalize();
    let best: { axis: number; score: number } | null = null;
    for (let axis = 0; axis < 3; axis += 1) {
      if (Math.abs(normal.getComponent(axis)) > 0.5) continue;
      const surface = new THREE.Vector3().crossVectors(AXES[axis], normal).applyQuaternion(rootQ);
      const s = toScreen(point.clone().addScaledVector(surface, 0.5)).sub(toScreen(point));
      if (s.lengthSq() < 1e-6) continue;
      const score = s.normalize().dot(drag);
      if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis, score };
    }
    if (!best) return null;
    const face = faceOf(best.axis, Math.round(cubie.position.getComponent(best.axis)));
    if (!face) return null;
    return { face, dir: best.score > 0 ? 1 : -1 };
  }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.position.z = 13 * Math.max(1, 1.15 / this.camera.aspect);
    this.camera.updateProjectionMatrix();
  }

  private loop(now: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const t = this.time;
    this.yaw += (this.targetYaw - this.yaw) * 0.12;
    this.pitch += (this.targetPitch - this.pitch) * 0.12;
    this.wobble = Math.max(0, this.wobble - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt);
    this.root.rotation.set(this.pitch, this.yaw, Math.sin(t * 40) * 0.05 * this.wobble, "XYZ");
    this.root.position.y = Math.sin(t * 1.3) * 0.08;

    const legal = new Set(this.run.legal().map((m) => m.face));
    for (const c of this.crystals) {
      const hinted = legal.has(c.face);
      c.gem.rotation.z = t * 0.8;
      c.cage.rotation.z = -t * 0.3;
      const pulse = (hinted ? 1.25 : 1) + (hinted ? 0.25 : 0.1) * Math.sin(t * (hinted ? 4 : 2.2));
      c.glow.scale.set(1.7 * pulse, 1.7 * pulse, 1);
    }
    for (const face of FACE_ORDER) {
      for (const b of this.beams[face]) {
        if (!b.line.visible) continue;
        b.t = (b.t + b.speed * dt) % 1;
        b.dot.position.copy(b.curve.getPoint(b.t));
        (b.dot.material as THREE.SpriteMaterial).opacity = Math.sin(b.t * Math.PI);
      }
    }
    this.chevrons.offset.x -= dt * 1.4;
    const hintMat = this.hints.children[0] as THREE.Mesh | undefined;
    if (hintMat) {
      for (const band of this.hints.children) ((band as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.3 * Math.sin(t * 4) + this.flash * 0.4;
    }
    // Pieces in a legal layer brighten a little so the glowing layer reads even without the arrows.
    for (const cubie of this.cubies) {
      const inLegal = this.run.legal().some((m) => Math.round(cubie.position.getComponent(FACE[m.face].axis)) === FACE[m.face].side);
      const k = inLegal && !this.busy ? 1.25 + 0.15 * Math.sin(t * 3) : 1;
      for (const child of cubie.children) {
        if (child.userData.legalTint) ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).color.setRGB(k * 0.95, k, k * 1.15);
      }
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((n) => this.loop(n));
  }
}
