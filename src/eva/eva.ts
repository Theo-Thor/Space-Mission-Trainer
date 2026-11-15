// Rover Rescue mission state: player, hazards, parts, repair, drive home. No drawing here.
import {
  BOULDER, CHECKPOINTS, DARK, FACTS, ICE, PARTS, RADIO, ROVER_X, START, STORM, TERRAIN, AIRLOCK_X,
  type PartId,
} from "./level";
import {
  EARTH_GRAVITY, GRAVITY, JUMP_V, PX_PER_M, TIME_SCALE, groundAt, makeBody, stepBody,
  type Body,
} from "./physics";

export interface EvaInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  use: boolean; // pressed this frame
  useHeld: boolean;
}

export interface EvaEvents {
  radio(text: string): void;
  toast(title: string, body: string): void;
  fact(title: string, body: string, source: string): void;
  sound(kind: "pickup" | "land" | "jump" | "alarm" | "repair" | "done"): void;
  done(): void;
}

/** What NEXUS currently gives the level (0–9 for each need). */
export interface EvaNeeds {
  energy: number;
  air: number;
  shield: number;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; size: number; settled: boolean }
export interface Ghost { x: number; y0: number; t: number }

export type EvaPhase = "enter" | "brief" | "walk" | "repair" | "drive" | "end" | "exit";

export const ENTER_TIME = 2.4;
export const EXIT_TIME = 1.8;
const BRIEF_TIME = 4.2;
const BRIDGE = new Set(["bridge"]);
const NONE = new Set<string>();

export class EvaMission {
  phase: EvaPhase = "enter";
  phaseT = 0;
  time = 0;
  readonly body: Body = makeBody(START.x, START.y);
  walkPhase = 0;
  camX = 0;
  camY = 0;
  viewW = 1280;

  checkpoint = 0;
  readonly o2Max: number;
  o2: number;
  cold = 0;
  readonly lampR: number;
  readonly stormWarning: number;
  storm: { state: "idle" | "warning" | "active" | "clear"; t: number } = { state: "idle", t: 0 };

  readonly parts = new Set<PartId>();
  readonly facts = new Set<string>();
  ice = false;
  readonly footprints: { x: number; y: number; dir: number }[] = [];
  readonly dust: Particle[] = [];
  readonly arc: { x: number; y: number }[] = [];
  ghost: Ghost | null = null;
  boulder = { x: BOULDER.from, angle: 0, wait: 0, alive: true };
  knock = 0;

  repair = { step: 0, progress: 0, taps: 0 };
  rover = { x: ROVER_X, y: 560, vx: 0, vy: 0, angle: 0, onGround: true };

  stats = { jumps: 0, maxHeight: 0, maxAir: 0, tethers: 0, start: 0 };
  private jumpStartY = 0;
  private jumpTop = 0;
  private airT = 0;
  private lastPrint = 0;
  private said = new Set<string>();

  constructor(needs: EvaNeeds, private readonly events: EvaEvents) {
    this.o2Max = 50 + needs.air * 8;
    this.o2 = this.o2Max;
    this.lampR = 110 + needs.energy * 20;
    this.stormWarning = 12 + needs.shield;
  }

  /** On-screen layout uses a 720-unit-tall world view. */
  setView(viewW: number, viewH: number): void {
    this.viewW = (viewW / viewH) * 720;
  }

  get inDark(): number {
    const b = this.body;
    if (b.x < DARK.x0 || b.x > DARK.x1) return 0;
    return Math.max(0, Math.min(1, (b.y - DARK.rimY) / 120));
  }

  get inShelter(): boolean {
    const b = this.body;
    return b.x >= STORM.shelterX0 && b.x <= STORM.shelterX1 && b.y > STORM.shelterY;
  }

  get nearRover(): boolean {
    return Math.abs(this.body.x - ROVER_X) < 110 && this.phase === "walk";
  }

  update(dt: number, input: EvaInput): void {
    this.time += dt;
    this.phaseT += dt;
    this.updateDust(dt);
    if (this.phase === "enter") {
      if (this.phaseT >= ENTER_TIME) this.setPhase("brief");
      this.placeCamera(1);
      return;
    }
    if (this.phase === "brief") {
      if (this.phaseT > 0.6 && !this.said.has("start")) this.say("start", RADIO.start);
      if (this.phaseT >= BRIEF_TIME || ((input.jump || input.use) && this.phaseT > 0.8)) this.setPhase("walk");
      this.placeCamera(dt);
      return;
    }
    if (this.phase === "walk") this.updateWalk(dt, input);
    else if (this.phase === "repair") this.updateRepair(dt, input);
    else if (this.phase === "drive") this.updateDrive(dt, input);
    else if (this.phase === "end") {
      if (this.phaseT > 1.2 && (input.use || input.jump)) this.setPhase("exit");
    } else if (this.phase === "exit") {
      if (this.phaseT >= EXIT_TIME) {
        this.events.done();
        this.phaseT = -999;
      }
    }
    this.placeCamera(dt);
  }

  private setPhase(phase: EvaPhase): void {
    this.phase = phase;
    this.phaseT = 0;
    if (phase === "walk" && !this.stats.start) this.stats.start = this.time;
  }

  private say(key: string, text: string): void {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.events.radio(text);
  }

  // ---------- walking ----------

  private updateWalk(dt: number, input: EvaInput): void {
    const b = this.body;
    this.knock = Math.max(0, this.knock - dt);
    const move = this.knock > 0 ? { left: false, right: false, jump: false } : input;
    const prevX = b.x;
    const r = stepBody(b, move, TERRAIN, dt, NONE);
    if (r.jumped) this.onJump();
    if (!b.onGround) {
      this.airT += dt;
      this.jumpTop = Math.min(this.jumpTop, b.y);
      if (this.arc.length === 0 || Math.hypot(b.x - this.arc[this.arc.length - 1].x, b.y - this.arc[this.arc.length - 1].y) > 14) this.arc.push({ x: b.x, y: b.y });
    }
    if (r.landed) this.onLand(r.impact);
    const moved = Math.abs(b.x - prevX);
    if (b.onGround && moved > 0.2) {
      this.walkPhase += (moved / 150) * Math.PI * 2;
      if (Math.abs(b.x - this.lastPrint) > 28) {
        this.lastPrint = b.x;
        this.footprints.push({ x: b.x, y: b.y, dir: b.facing === "right" ? 1 : -1 });
        if (this.footprints.length > 500) this.footprints.shift();
        if (Math.random() < 0.5) this.puff(b.x, b.y, 1, 40);
      }
    }
    if (this.ghost) {
      this.ghost.t += dt;
      if (b.onGround && this.ghost.t > 0.6) this.ghost = null;
    }

    // Checkpoints refill oxygen.
    for (let i = this.checkpoint + 1; i < CHECKPOINTS.length; i += 1) {
      if (b.x >= CHECKPOINTS[i].x) {
        this.checkpoint = i;
        this.o2 = this.o2Max;
        this.events.toast("BEACON REACHED", `${CHECKPOINTS[i].name} · oxygen refilled`);
        this.events.sound("pickup");
      }
    }
    if (b.x > 1400) this.say("boulders", RADIO.boulders);
    if (b.x > 3720 && b.y < 360) this.say("ridge", RADIO.ridge);
    if (b.x > DARK.x0 && b.y > 600) this.say("crater", RADIO.crater);

    // Oxygen and cold.
    this.o2 -= dt;
    if (this.o2 <= 0) {
      this.tether(RADIO.oxygen);
      return;
    }
    const dark = this.inDark;
    this.cold = dark > 0.5 ? this.cold + dt / 40 : Math.max(0, this.cold - dt / 5);
    if (this.cold >= 1) {
      this.tether(RADIO.cold);
      return;
    }

    this.updateBoulder(dt);
    this.updateStorm(dt);
    this.collect();
    if (this.nearRover && input.use) {
      if (this.parts.size === 3) {
        this.setPhase("repair");
        this.repair = { step: 0, progress: 0, taps: 0 };
        b.vx = 0;
        // Stand beside the rover, not inside it.
        b.x = ROVER_X - 118;
        b.y = groundAt(TERRAIN, b.x);
        b.facing = "right";
      } else {
        this.events.toast("ROVER", `Find all 3 parts first (${this.parts.size}/3).`);
      }
    }
  }

  private onJump(): void {
    this.stats.jumps += 1;
    this.jumpStartY = this.body.y;
    this.jumpTop = this.body.y;
    this.airT = 0;
    this.arc.length = 0;
    this.arc.push({ x: this.body.x, y: this.body.y });
    if (this.stats.jumps <= 3) this.ghost = { x: this.body.x, y0: this.body.y, t: 0 };
    this.puff(this.body.x, this.body.y, 6, 70);
    this.events.sound("jump");
  }

  private onLand(impact: number): void {
    const height = this.jumpStartY - this.jumpTop;
    if (height > 20) {
      this.stats.maxHeight = Math.max(this.stats.maxHeight, height);
      this.stats.maxAir = Math.max(this.stats.maxAir, this.airT);
      if (this.stats.jumps === 1) this.say("firstJump", RADIO.firstJump);
    }
    this.puff(this.body.x, this.body.y, Math.min(16, 4 + impact / 30), 60 + impact * 0.3);
    if (impact > 120) this.events.sound("land");
  }

  /** Dust has no air to float in: it flies in clean arcs and drops. */
  private puff(x: number, y: number, n: number, speed: number): void {
    for (let i = 0; i < n; i += 1) {
      const a = Math.PI + Math.random() * Math.PI;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.dust.push({ x, y: y - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.9, life: 2.4, size: 1.5 + Math.random() * 2, settled: false });
    }
    if (this.dust.length > 400) this.dust.splice(0, this.dust.length - 400);
  }

  private updateDust(dt: number): void {
    for (const p of this.dust) {
      p.life -= dt;
      if (p.settled) continue;
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const g = groundAt(TERRAIN, p.x);
      if (p.y >= g) {
        p.y = g;
        p.settled = true;
      }
    }
    for (let i = this.dust.length - 1; i >= 0; i -= 1) if (this.dust[i].life <= 0) this.dust.splice(i, 1);
  }

  private tether(message: string): void {
    const cp = CHECKPOINTS[this.checkpoint];
    const b = this.body;
    b.x = cp.x;
    b.y = groundAt(TERRAIN, cp.x);
    b.vx = 0;
    b.vy = 0;
    b.onGround = true;
    this.o2 = this.o2Max;
    this.cold = 0;
    this.ghost = null;
    this.arc.length = 0;
    if (this.storm.state === "warning" || this.storm.state === "active") this.storm = { state: "idle", t: 0 };
    this.stats.tethers += 1;
    this.events.radio(message);
    this.events.sound("alarm");
  }

  private updateBoulder(dt: number): void {
    const bo = this.boulder;
    const b = this.body;
    if (b.x < 1700 || b.x > 3200) return;
    if (!bo.alive) {
      bo.wait -= dt;
      if (bo.wait <= 0) {
        bo.alive = true;
        bo.x = BOULDER.from;
      }
      return;
    }
    bo.x -= BOULDER.speed * dt;
    bo.angle -= (BOULDER.speed * dt) / BOULDER.r;
    if (bo.x <= BOULDER.to) {
      bo.alive = false;
      bo.wait = BOULDER.pause;
      this.puff(bo.x, groundAt(TERRAIN, bo.x), 10, 90);
      return;
    }
    const cy = groundAt(TERRAIN, bo.x) - BOULDER.r;
    if (this.knock <= 0 && Math.abs(b.x - bo.x) < BOULDER.r + 10 && b.y > cy - BOULDER.r + 6 && b.y < cy + BOULDER.r + 4) {
      b.vx = -220;
      b.vy = -160;
      b.onGround = false;
      this.knock = 0.7;
      this.events.toast("OOF!", "Jump over the rolling boulders.");
      this.events.sound("alarm");
    }
  }

  private updateStorm(dt: number): void {
    const s = this.storm;
    const b = this.body;
    if (s.state === "idle" && b.x >= STORM.trigger && b.x < STORM.shelterX1 + 400) {
      this.storm = { state: "warning", t: this.stormWarning };
      this.events.radio(RADIO.storm);
      this.events.sound("alarm");
      return;
    }
    if (s.state === "warning") {
      s.t -= dt;
      if (s.t <= 0) {
        if (this.inShelter) {
          this.storm = { state: "active", t: 5 };
        } else {
          this.tether(RADIO.stormMissed);
        }
      }
    } else if (s.state === "active") {
      s.t -= dt;
      if (!this.inShelter) {
        this.tether(RADIO.stormMissed);
      } else if (s.t <= 0) {
        this.storm = { state: "clear", t: 0 };
        this.events.radio(RADIO.stormClear);
      }
    }
  }

  /** While the storm is active you cannot leave the shelter, so it is never a surprise later. */
  get stormBlocksExit(): boolean {
    return this.storm.state === "active";
  }

  private collect(): void {
    const b = this.body;
    const cx = b.x;
    const cy = b.y - 50;
    const near = (x: number, y: number, r = 46): boolean => Math.hypot(cx - x, cy - y) < r;
    for (const part of PARTS) {
      if (this.parts.has(part.id) || !near(part.x, part.y)) continue;
      this.parts.add(part.id);
      this.events.toast("PART FOUND", `${part.name} · ${this.parts.size}/3`);
      this.events.sound("pickup");
      this.puff(part.x, part.y, 8, 60);
      if (this.parts.size === 3) this.say("allParts", RADIO.allParts);
    }
    for (const f of FACTS) {
      if (this.facts.has(f.id) || !near(f.x, f.y, 42)) continue;
      this.facts.add(f.id);
      this.events.fact(f.title, f.body, f.source);
      this.events.sound("pickup");
    }
    if (!this.ice && near(ICE.x, ICE.y)) {
      this.ice = true;
      this.events.fact(ICE.title, ICE.body, ICE.source);
      this.events.sound("pickup");
    }
  }

  // ---------- repair ----------

  private updateRepair(dt: number, input: EvaInput): void {
    const r = this.repair;
    if (r.step === 0) {
      // Hold E: brush the dust off the solar panel.
      if (input.useHeld) {
        r.progress += dt / 1.8;
        if (Math.random() < 0.6) this.puff(ROVER_X + 10 + Math.random() * 60, 470, 1, 50);
      }
      if (r.progress >= 1) this.nextRepair();
    } else if (r.step === 1) {
      // Tap E three times: bolt on the wheel.
      if (input.use) {
        r.taps += 1;
        r.progress = r.taps / 3;
        this.events.sound("repair");
      }
      if (r.taps >= 3) this.nextRepair();
    } else if (r.step === 2) {
      // Hold E: plug in the battery and the antenna.
      if (input.useHeld) r.progress += dt / 1.4;
      if (r.progress >= 1) this.nextRepair();
    } else if (this.phaseT > 1.6) {
      this.setPhase("drive");
      this.rover = { x: ROVER_X, y: groundAt(TERRAIN, ROVER_X), vx: 0, vy: 0, angle: 0, onGround: true };
    }
  }

  private nextRepair(): void {
    this.repair.step += 1;
    this.repair.progress = 0;
    this.repair.taps = 0;
    this.events.sound("repair");
    if (this.repair.step === 3) {
      this.phaseT = 0;
      this.events.toast("ROVER REPAIRED", "Signal relay online");
      this.say("repaired", RADIO.repaired);
    }
  }

  // ---------- drive ----------

  /** The rover drives on the ground, and on the crane bridge over the crater. */
  private roverGround(x: number): number {
    const g = groundAt(TERRAIN, x);
    const bridge = TERRAIN.platforms.find((p) => p.tag && BRIDGE.has(p.tag) && x >= p.x && x <= p.x + p.w);
    return bridge ? Math.min(g, bridge.y) : g;
  }

  private updateDrive(dt: number, input: EvaInput): void {
    const v = this.rover;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) v.vx += dir * 420 * dt;
    else v.vx -= Math.sign(v.vx) * Math.min(Math.abs(v.vx), 160 * dt);
    v.vx = Math.max(-300, Math.min(300, v.vx));
    const prevGround = this.roverGround(v.x);
    v.x = Math.max(AIRLOCK_X + 40, Math.min(TERRAIN.maxX, v.x + v.vx * dt));
    const g = this.roverGround(v.x);
    if (v.onGround) {
      if (g < v.y) {
        // Climbing: steep rises throw the rover up a little (low gravity hops).
        const rise = v.y - g;
        v.y = g;
        if (rise > 6) {
          v.vy = -Math.min(240, (rise / Math.max(dt, 0.001)) * 0.25);
          v.onGround = false;
        }
      } else if (g - v.y > 4 && g > prevGround + 3) {
        v.onGround = false;
      } else {
        v.y = g;
      }
    }
    if (!v.onGround) {
      v.vy += GRAVITY * dt;
      v.y += v.vy * dt;
      if (v.y >= g) {
        const impact = v.vy;
        v.y = g;
        v.vy = impact > 140 ? -impact * 0.25 : 0;
        v.onGround = v.vy === 0;
        if (impact > 120) {
          this.puff(v.x - 30, g, 6, 70);
          this.puff(v.x + 30, g, 6, 70);
          this.events.sound("land");
        }
      }
    }
    const slope = Math.atan2(this.roverGround(v.x + 34) - this.roverGround(v.x - 34), 68);
    v.angle += ((v.onGround ? slope : v.angle * 0.98) - v.angle) * Math.min(1, dt * 8);
    if (Math.abs(v.vx) > 60 && v.onGround && Math.random() < 0.4) this.puff(v.x - Math.sign(v.vx) * 34, v.y, 1, 50);
    this.body.x = v.x;
    this.body.y = v.y;
    if (v.x <= AIRLOCK_X + 80) {
      this.say("home", RADIO.home);
      this.events.sound("done");
      this.setPhase("end");
    }
  }

  // ---------- camera ----------

  private placeCamera(dt: number): void {
    const b = this.body;
    const lead = b.facing === "right" ? 0.36 : 0.56;
    const tx = Math.max(0, b.x - this.viewW * (this.phase === "drive" ? 0.6 : lead));
    const ty = Math.max(-260, Math.min(330, b.y - 720 * 0.66));
    const k = dt >= 1 ? 1 : Math.min(1, dt * 4);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
  }

  /** Real-world numbers for the end card. */
  summary(): { heightM: number; moonAir: number; earthHeightM: number; earthAir: number; facts: number; minutes: number } {
    const heightM = this.stats.maxHeight / PX_PER_M;
    const v = JUMP_V / PX_PER_M / TIME_SCALE; // real take-off speed, m/s
    return {
      heightM,
      moonAir: this.stats.maxAir * TIME_SCALE,
      earthHeightM: (v * v) / (2 * 9.81),
      earthAir: (2 * v) / 9.81,
      facts: this.facts.size + (this.ice ? 1 : 0),
      minutes: (this.time - this.stats.start) / 60,
    };
  }

  /** Earth ghost height above take-off at time t (same push, Earth gravity), px. */
  static earthHop(t: number): number {
    return Math.max(0, JUMP_V * t - 0.5 * EARTH_GRAVITY * t * t);
  }

  // ---------- test and demo helpers ----------

  debugTeleport(x: number): void {
    const b = this.body;
    b.x = x;
    b.y = groundAt(TERRAIN, x);
    b.vx = 0;
    b.vy = 0;
    b.onGround = true;
    if (this.phase === "enter" || this.phase === "brief") this.setPhase("walk");
  }

  debugCollectAll(): void {
    for (const p of PARTS) this.parts.add(p.id);
  }

  debugFinishRepair(): void {
    this.setPhase("repair");
    this.repair = { step: 3, progress: 0, taps: 0 };
    this.phaseT = 99;
  }

  debugDriveTo(x: number): void {
    this.rover.x = x;
    this.rover.y = this.roverGround(x);
  }
}
