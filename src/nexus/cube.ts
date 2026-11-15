// NEXUS cube logic. No rendering here, so it can be tested on its own.
// A face is named by the outward axis it points along: px = +X, nx = -X, and so on.
// Each face centre is one colony need. Centres never move during face turns.

export type FaceKey = "px" | "nx" | "py" | "ny" | "pz" | "nz";
export type Vec = [number, number, number];

/** A quarter turn of one outer layer. dir is the sign of the rotation about the positive axis (right-handed). */
export interface Move {
  face: FaceKey;
  dir: 1 | -1;
}

export interface Sticker {
  pos: Vec;
  normal: Vec;
  type: FaceKey;
}

export const FACE_ORDER: FaceKey[] = ["px", "nx", "py", "ny", "pz", "nz"];

export const FACE: Record<FaceKey, { axis: 0 | 1 | 2; side: 1 | -1 }> = {
  px: { axis: 0, side: 1 },
  nx: { axis: 0, side: -1 },
  py: { axis: 1, side: 1 },
  ny: { axis: 1, side: -1 },
  pz: { axis: 2, side: 1 },
  nz: { axis: 2, side: -1 },
};

/** Fictional gameplay needs. Opposite faces: Energy/Signal, Water/Air, Shield/Food. */
export const NEEDS: Record<FaceKey, { name: string; color: string }> = {
  px: { name: "Energy", color: "#FFB547" },
  nx: { name: "Signal", color: "#FF6FA8" },
  py: { name: "Water", color: "#3FD8FF" },
  ny: { name: "Air", color: "#D6ECFF" },
  pz: { name: "Shield", color: "#9B7BFF" },
  nz: { name: "Food", color: "#5BE38C" },
};

export function faceOf(axis: number, side: number): FaceKey | null {
  if (side === 0) return null;
  return FACE_ORDER.find((key) => FACE[key].axis === axis && FACE[key].side === side) ?? null;
}

/** Rotate a vector a quarter turn about a principal axis (right-handed). */
export function rotate(v: Vec, axis: number, dir: 1 | -1): Vec {
  const [x, y, z] = v;
  if (axis === 0) return dir === 1 ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return dir === 1 ? [z, y, -x] : [-z, y, x];
  return dir === 1 ? [-y, x, z] : [y, -x, z];
}

export function inverse(move: Move): Move {
  return { face: move.face, dir: move.dir === 1 ? -1 : 1 };
}

export function sameMove(a: Move, b: Move): boolean {
  return a.face === b.face && a.dir === b.dir;
}

export class NexusCube {
  stickers: Sticker[] = [];

  constructor() {
    for (const face of FACE_ORDER) {
      const { axis, side } = FACE[face];
      const normal: Vec = [0, 0, 0];
      normal[axis] = side;
      for (let a = -1; a <= 1; a += 1) {
        for (let b = -1; b <= 1; b += 1) {
          const pos: Vec = [0, 0, 0];
          pos[axis] = side;
          const others = [0, 1, 2].filter((i) => i !== axis);
          pos[others[0]] = a;
          pos[others[1]] = b;
          this.stickers.push({ pos, normal: [...normal] as Vec, type: face });
        }
      }
    }
  }

  apply(move: Move): void {
    const { axis, side } = FACE[move.face];
    for (const s of this.stickers) {
      if (s.pos[axis] !== side) continue;
      s.pos = rotate(s.pos, axis, move.dir);
      s.normal = rotate(s.normal, axis, move.dir);
    }
  }

  /** How many of the 9 stickers on each face carry that face's need. 9 everywhere = solved. */
  counts(): Record<FaceKey, number> {
    const out = { px: 0, nx: 0, py: 0, ny: 0, pz: 0, nz: 0 } as Record<FaceKey, number>;
    for (const s of this.stickers) {
      const axis = s.normal.findIndex((n) => n !== 0);
      const face = faceOf(axis, s.normal[axis]);
      if (face && face === s.type) out[face] += 1;
    }
    return out;
  }

  isSolved(): boolean {
    return FACE_ORDER.every((face) => this.counts()[face] === 9);
  }

  key(): string {
    return this.stickers.map((s) => `${s.type}${s.pos.join(",")}|${s.normal.join(",")}`).sort().join(";");
  }
}

// ---------- the 11-turn timeline ----------

export interface Step {
  title: string;
  text: string;
  /** One move = forced. Two moves = opposite faces; the player picks the order (they commute, so both orders end on the same cube). */
  moves: Move[];
}

export const TOTAL_TURNS = 11;

export const TIMELINE: Step[] = [
  {
    title: "NEXUS wakes up",
    text: "This cube runs Selene Base. Turn the glowing Food layer to wake up the greenhouse.",
    moves: [{ face: "nz", dir: 1 }],
  },
  {
    title: "Earth is setting",
    text: "Earth is sinking behind the hills. For about two weeks we can't call home. Power first, or radio first?",
    moves: [{ face: "px", dir: 1 }, { face: "nx", dir: -1 }],
  },
  {
    title: "Ice in a dark crater",
    text: "We found ice in a crater colder than Pluto's surface. Water first, or air first?",
    moves: [{ face: "py", dir: -1 }, { face: "ny", dir: 1 }],
  },
  {
    title: "SOLAR STORM",
    text: "A solar storm is coming! Everyone into the shelter. Only one move: the Shield.",
    moves: [{ face: "pz", dir: 1 }],
  },
  {
    title: "After the storm",
    text: "The storm is over. The Sun is low and the solar panels are dusty. Power first, or radio first?",
    moves: [{ face: "px", dir: -1 }, { face: "nx", dir: 1 }],
  },
  {
    title: "The long shadow",
    text: "The Sun is hiding behind the crater rim. Water first, or air first?",
    moves: [{ face: "py", dir: 1 }, { face: "ny", dir: -1 }],
  },
  {
    title: "THE LAST TURN",
    text: "Storm, darkness and no Earth, all at once. One move left. Make it count.",
    moves: [{ face: "pz", dir: -1 }],
  },
];

/** The scramble is the canonical solution played backwards, so turn 11 always solves the cube. */
export function scrambleMoves(): Move[] {
  return TIMELINE.flatMap((step) => step.moves).reverse().map(inverse);
}

export class NexusRun {
  readonly cube = new NexusCube();
  stepIndex = 0;
  turns = 0;
  private remaining: Move[];

  constructor() {
    for (const move of scrambleMoves()) this.cube.apply(move);
    this.remaining = [...TIMELINE[0].moves];
  }

  get done(): boolean {
    return this.turns >= TOTAL_TURNS;
  }

  get step(): Step | null {
    return TIMELINE[this.stepIndex] ?? null;
  }

  /** True when the player already made the first move of a two-move step. */
  get secondOfPair(): boolean {
    const step = this.step;
    return !!step && step.moves.length === 2 && this.remaining.length === 1;
  }

  legal(): Move[] {
    return this.done ? [] : [...this.remaining];
  }

  isLegal(move: Move): boolean {
    return this.remaining.some((m) => sameMove(m, move));
  }

  /** Is this face's layer legal in either direction? */
  legalFace(face: FaceKey): Move | null {
    return this.remaining.find((m) => m.face === face) ?? null;
  }

  play(move: Move): boolean {
    if (this.done || !this.isLegal(move)) return false;
    this.cube.apply(move);
    this.remaining = this.remaining.filter((m) => !sameMove(m, move));
    this.turns += 1;
    if (this.remaining.length === 0) {
      this.stepIndex += 1;
      this.remaining = this.step ? [...this.step.moves] : [];
    }
    return true;
  }

  /** The need that is lowest right now (first in face order on ties). */
  lowest(): FaceKey {
    const counts = this.cube.counts();
    return FACE_ORDER.reduce((best, face) => (counts[face] < counts[best] ? face : best), FACE_ORDER[0]);
  }
}
