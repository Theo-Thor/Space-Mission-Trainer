// Side-view Moon physics. Pure functions and data only, so it can be tested without a browser.
//
// Real numbers: Moon gravity 1.62 m/s², Earth 9.81 m/s² (NASA). The scene uses 60 px per metre.
// "In the middle" tuning: the physics are the Moon's real ones, but game time runs 1.43× faster
// than Moon time, so a jump lasts about 2.2 s on screen instead of about 3.1 s. Heights are real:
// the same push gives a jump about 6× higher than on Earth.

export const PX_PER_M = 60;
export const TIME_SCALE = 1.43;
export const G_MOON = 1.62;
export const G_EARTH = 9.81;
/** Take-off speed of the jump push, m/s (about a 0.33 m hop on Earth). */
export const JUMP_SPEED = 2.54;

const s2 = TIME_SCALE * TIME_SCALE;
export const GRAVITY = G_MOON * PX_PER_M * s2; // px/s² on screen
export const EARTH_GRAVITY = G_EARTH * PX_PER_M * s2;
export const JUMP_V = JUMP_SPEED * PX_PER_M * TIME_SCALE; // px/s on screen

export const WALK_MAX = 190;
const GROUND_ACCEL = 900; // low traction: slow to start and stop
const GROUND_FRICTION = 650;
const AIR_ACCEL = 420;
/** Rises taller than this block walking; you must jump. */
export const STEP = 26;
/** Ground steeper than this (rise over run) is a wall: about 55°. */
export const MAX_SLOPE = 1.4;
const COYOTE = 0.12;
const BUFFER = 0.14;

export interface Platform {
  x: number;
  y: number; // top surface
  w: number;
  /** Platforms that exist only in some phases (the crane bridge). */
  tag?: string;
}

export interface Terrain {
  /** Ground surface as a polyline of [x, y], sorted by x. y grows downward. */
  ground: [number, number][];
  platforms: Platform[];
  minX: number;
  maxX: number;
}

export interface Body {
  x: number;
  y: number; // feet
  vx: number;
  vy: number;
  onGround: boolean;
  facing: "left" | "right";
  coyote: number;
  buffer: number;
}

export interface Input {
  left: boolean;
  right: boolean;
  jump: boolean; // pressed this frame
}

export interface StepResult {
  jumped: boolean;
  landed: boolean;
  /** Downward speed at landing, px/s. */
  impact: number;
}

export function groundAt(t: Terrain, x: number): number {
  const g = t.ground;
  if (x <= g[0][0]) return g[0][1];
  for (let i = 1; i < g.length; i += 1) {
    const [x1, y1] = g[i];
    if (x <= x1) {
      const [x0, y0] = g[i - 1];
      const k = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * k;
    }
  }
  return g[g.length - 1][1];
}

function activePlatforms(t: Terrain, tags: Set<string>): Platform[] {
  return t.platforms.filter((p) => !p.tag || tags.has(p.tag));
}

/** The highest surface at x that is at or below the feet (one-way platforms can be jumped through from below). */
export function surfaceBelow(t: Terrain, x: number, feet: number, tags: Set<string> = new Set()): number {
  let best = groundAt(t, x);
  for (const p of activePlatforms(t, tags)) {
    if (x < p.x || x > p.x + p.w) continue;
    if (p.y >= feet - 1 && p.y < best) best = p.y;
  }
  return best;
}

export function makeBody(x: number, y: number): Body {
  return { x, y, vx: 0, vy: 0, onGround: true, facing: "right", coyote: 0, buffer: 0 };
}

export function stepBody(b: Body, input: Input, t: Terrain, dt: number, tags: Set<string> = new Set()): StepResult {
  const result: StepResult = { jumped: false, landed: false, impact: 0 };
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) b.facing = dir > 0 ? "right" : "left";
  const accel = b.onGround ? GROUND_ACCEL : AIR_ACCEL;
  if (dir) {
    b.vx += dir * accel * dt;
  } else if (b.onGround) {
    const drop = GROUND_FRICTION * dt;
    b.vx = Math.abs(b.vx) <= drop ? 0 : b.vx - Math.sign(b.vx) * drop;
  }
  b.vx = Math.max(-WALK_MAX, Math.min(WALK_MAX, b.vx));

  b.coyote = b.onGround ? COYOTE : Math.max(0, b.coyote - dt);
  b.buffer = input.jump ? BUFFER : Math.max(0, b.buffer - dt);
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = -JUMP_V;
    b.onGround = false;
    b.coyote = 0;
    b.buffer = 0;
    result.jumped = true;
  }

  // Horizontal: steep rises act as walls.
  let nx = Math.max(t.minX, Math.min(t.maxX, b.x + b.vx * dt));
  const ahead = surfaceBelow(t, nx, b.y - STEP, tags);
  const rise = b.y - ahead;
  const run = Math.abs(nx - b.x);
  if (rise > STEP || (rise > 1 && run > 0 && rise / run > MAX_SLOPE)) {
    nx = b.x;
    b.vx = 0;
  }
  b.x = nx;

  // Vertical.
  const wasGround = b.onGround;
  b.vy += GRAVITY * dt;
  const ny = b.y + b.vy * dt;
  const support = surfaceBelow(t, b.x, b.y, tags);
  if (b.vy >= 0 && ny >= support) {
    if (!wasGround) {
      result.landed = true;
      result.impact = b.vy;
    }
    b.y = support;
    b.vy = 0;
    b.onGround = true;
  } else if (wasGround && b.vy >= 0 && support - b.y <= STEP) {
    // Walking down a slope or a small step: stay on the ground.
    b.y = support;
    b.vy = 0;
    b.onGround = true;
  } else {
    b.y = ny;
    b.onGround = false;
  }
  // Never end up inside the ground (steep slopes while rising).
  const floor = groundAt(t, b.x);
  if (b.y > floor) {
    b.y = floor;
    if (b.vy > 0) b.vy = 0;
    b.onGround = true;
  }
  return result;
}

/** Height (px) and air time (s, on screen) of a jump from flat ground. */
export function jumpStats(gravity = GRAVITY, v = JUMP_V): { height: number; air: number } {
  return { height: (v * v) / (2 * gravity), air: (2 * v) / gravity };
}
