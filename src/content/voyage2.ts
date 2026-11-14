// Timeline and on-screen facts for the longer (≈33 s) Earth-to-Moon sequence.
// Every figure here is real and sourced (see docs/SCIENCE.md). The craft, the base,
// the crew and the year 2048 are fictional. Times are seconds of animation, not mission time.
// The mission clock and descent readouts are illustrative and labelled that way on screen.

export const VOYAGE2_DURATION = 33.5;

/** Shot boundaries, in seconds. */
export const BEATS2 = {
  liftoff: 3,
  separation: 6.5,
  depart: 9.5,
  transfer: 13.5,
  earthrise: 19,
  orbit: 23.5,
  landing: 27,
  legs: 29.4,
  touchdown: 31.2,
  pullback: 31.7,
} as const;

/** Shot cuts (used for the transition wipes). */
export const CUTS2 = [BEATS2.depart, BEATS2.transfer, BEATS2.earthrise, BEATS2.orbit, BEATS2.landing];

export interface VoyagePhase2 {
  at: number;
  label: string;
}

export const PHASES2: VoyagePhase2[] = [
  { at: 0, label: "FINAL COUNTDOWN" },
  { at: BEATS2.liftoff, label: "LIFTOFF" },
  { at: BEATS2.separation, label: "BOOSTER SEPARATION" },
  { at: BEATS2.depart, label: "TRANS-LUNAR INJECTION" },
  { at: BEATS2.transfer, label: "COAST TO THE MOON" },
  { at: BEATS2.earthrise, label: "EARTHRISE" },
  { at: BEATS2.orbit, label: "LUNAR ORBIT" },
  { at: BEATS2.landing, label: "POWERED DESCENT" },
  { at: BEATS2.touchdown, label: "TOUCHDOWN" },
  { at: BEATS2.pullback, label: "SELENE BASE" },
];

export interface VoyageFact2 {
  from: number;
  to: number;
  title: string;
  value: string;
  note: string;
  source: string;
}

export const FACTS2: VoyageFact2[] = [
  {
    from: BEATS2.depart + 0.3,
    to: BEATS2.transfer - 0.2,
    title: "SPEED IN EARTH ORBIT",
    value: "About 28,000 km/h",
    note: "How fast a craft in low Earth orbit travels, like the International Space Station.",
    source: "NASA — International Space Station facts",
  },
  {
    from: BEATS2.transfer + 0.3,
    to: BEATS2.transfer + 2.7,
    title: "EARTH TO MOON",
    value: "384,400 km",
    note: "Average distance. About 30 Earths would fit in the gap.",
    source: "NASA Science — Moon Facts",
  },
  {
    from: BEATS2.transfer + 2.8,
    to: BEATS2.earthrise - 0.2,
    title: "TRAVEL TIME",
    value: "About 3 days",
    note: "A typical crewed trip. Shown here in a few seconds.",
    source: "NASA — Artemis II mission timeline",
  },
  {
    from: BEATS2.earthrise + 0.3,
    to: BEATS2.earthrise + 2.2,
    title: "EARTH VS MOON",
    value: "3.7 × wider",
    note: "Earth is about 3.7 times wider than the Moon (12,742 km vs 3,475 km).",
    source: "NASA Science — Moon Facts",
  },
  {
    from: BEATS2.earthrise + 2.3,
    to: BEATS2.orbit - 0.2,
    title: "EARTHRISE",
    value: "24 December 1968",
    note: "Apollo 8 astronaut Bill Anders photographed Earth rising over the Moon's horizon.",
    source: "NASA — Apollo 8 Earthrise",
  },
  {
    from: BEATS2.orbit + 0.3,
    to: BEATS2.landing - 0.2,
    title: "LUNAR SOUTH POLE",
    value: "Permanent shadow",
    note: "Some crater floors never see sunlight and may hold water ice.",
    source: "NASA — Lunar Reconnaissance Orbiter, ShadowCam",
  },
  {
    from: BEATS2.landing + 0.3,
    to: BEATS2.touchdown - 0.1,
    title: "LUNAR GRAVITY",
    value: "1.62 m/s²",
    note: "About 1/6 of Earth's (9.81 m/s²). Landing still needs engine thrust.",
    source: "NASA Glenn Research Center",
  },
];

export type VoyageSound2 = "beep" | "liftoff" | "separation" | "burn" | "radio" | "pulse" | "touchdown";

export interface VoyageCue2 {
  at: number;
  sound: VoyageSound2;
}

function descentPulses(): VoyageCue2[] {
  const cues: VoyageCue2[] = [];
  for (let t = BEATS2.landing + 0.4; t < BEATS2.touchdown - 0.1; t += 0.42) cues.push({ at: t, sound: "pulse" });
  return cues;
}

// Space is silent, so exterior shots stay quiet. Tones stand in for cabin and radio sounds.
export const CUES2: VoyageCue2[] = [
  { at: 0, sound: "beep" },
  { at: 1, sound: "beep" },
  { at: 2, sound: "beep" },
  { at: BEATS2.liftoff, sound: "liftoff" },
  { at: BEATS2.separation, sound: "separation" },
  { at: BEATS2.depart + 0.5, sound: "burn" },
  { at: BEATS2.transfer + 0.4, sound: "radio" },
  { at: BEATS2.earthrise + 0.6, sound: "radio" },
  { at: BEATS2.orbit + 0.3, sound: "radio" },
  ...descentPulses(),
  { at: BEATS2.touchdown, sound: "touchdown" },
].sort((a, b) => a.at - b.at) as VoyageCue2[];

export function phaseAt2(t: number): string {
  let label = PHASES2[0].label;
  for (const phase of PHASES2) if (t >= phase.at) label = phase.label;
  return label;
}

/**
 * Illustrative mission clock: animation time → mission elapsed seconds.
 * Negative = countdown. Keyframes follow a typical crewed profile (about 3 days to the Moon).
 */
const CLOCK: [number, number][] = [
  [0, -3],
  [BEATS2.liftoff, 0],
  [BEATS2.depart, 8 * 60 + 30], // main engine cutoff, in Earth orbit
  [BEATS2.transfer, 2 * 3600 + 45 * 60], // burn toward the Moon
  [BEATS2.earthrise, 3 * 86400], // arrival, about 3 days
  [BEATS2.orbit, 3 * 86400 + 2 * 3600],
  [BEATS2.landing, 3 * 86400 + 20 * 3600],
  [BEATS2.touchdown, 3 * 86400 + 20 * 3600 + 12 * 60],
  [VOYAGE2_DURATION, 3 * 86400 + 20 * 3600 + 12 * 60 + 40],
];

export function missionSeconds(t: number): number {
  for (let i = 1; i < CLOCK.length; i += 1) {
    const [t0, m0] = CLOCK[i - 1];
    const [t1, m1] = CLOCK[i];
    if (t <= t1) {
      const u = Math.max(0, (t - t0) / (t1 - t0));
      // Countdown and launch run at real speed; long stretches are compressed.
      return t1 - t0 === m1 - m0 ? m0 + (t - t0) : m0 + (m1 - m0) * u;
    }
  }
  return CLOCK[CLOCK.length - 1][1];
}

export function formatClock(seconds: number): string {
  const sign = seconds < 0 ? "T−" : "T+";
  let s = Math.floor(Math.abs(seconds));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sign} ${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Illustrative descent readout: altitude (m) and vertical speed (m/s) during powered descent. */
export function descentReadout(t: number): { altitude: number; speed: number } | null {
  if (t < BEATS2.landing || t > BEATS2.touchdown + 0.6) return null;
  const u = Math.min(1, Math.max(0, (t - BEATS2.landing) / (BEATS2.touchdown - BEATS2.landing)));
  const altitude = Math.round(2000 * Math.pow(1 - u, 2));
  const speed = u >= 1 ? 0 : Math.max(0.5, 40 * (1 - u) * (1 - u) + 0.8);
  return { altitude, speed: Math.round(speed * 10) / 10 };
}
