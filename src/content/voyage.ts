// Timeline and on-screen facts for the Earth-to-Moon sequence that follows Chapter 1.
// Every figure here is real and sourced (see docs/SCIENCE.md). The craft, the base,
// the crew and the year 2048 are fictional. Times are seconds of animation, not mission time.

export const VOYAGE_DURATION = 22.5;

/** Scene boundaries, in seconds. */
export const BEATS = {
  liftoff: 1.5,
  separation: 3.4,
  depart: 4.6,
  transfer: 8.6,
  orbit: 13,
  landing: 17,
  legs: 18.2,
  touchdown: 20.6,
} as const;

export interface VoyagePhase {
  at: number;
  label: string;
}

export const PHASES: VoyagePhase[] = [
  { at: 0, label: "FINAL COUNTDOWN" },
  { at: BEATS.liftoff, label: "LIFTOFF" },
  { at: BEATS.separation, label: "BOOSTER SEPARATION" },
  { at: BEATS.depart, label: "TRANS-LUNAR INJECTION" },
  { at: BEATS.transfer, label: "COAST TO THE MOON" },
  { at: BEATS.orbit, label: "LUNAR ORBIT" },
  { at: BEATS.landing, label: "POWERED DESCENT" },
  { at: BEATS.touchdown, label: "TOUCHDOWN" },
];

export interface VoyageFact {
  from: number;
  to: number;
  title: string;
  value: string;
  note: string;
  source: string;
}

export const FACTS: VoyageFact[] = [
  {
    from: BEATS.depart + 0.3,
    to: BEATS.transfer - 0.2,
    title: "EARTH TO MOON",
    value: "384,400 km",
    note: "Average distance. About 30 Earths would fit in the gap.",
    source: "NASA Science — Moon Facts",
  },
  {
    from: BEATS.transfer + 0.3,
    to: BEATS.orbit - 0.2,
    title: "TRAVEL TIME",
    value: "About 3 days",
    note: "A typical crewed trip. Shown here in a few seconds.",
    source: "NASA — Artemis II mission timeline",
  },
  {
    from: BEATS.orbit + 0.3,
    to: BEATS.landing - 0.2,
    title: "LUNAR SOUTH POLE",
    value: "Permanent shadow",
    note: "Some crater floors never see sunlight and may hold water ice.",
    source: "NASA — Lunar Reconnaissance Orbiter, ShadowCam",
  },
  {
    from: BEATS.landing + 0.3,
    to: VOYAGE_DURATION,
    title: "LUNAR GRAVITY",
    value: "1.62 m/s²",
    note: "About 1/6 of Earth's (9.81 m/s²). Landing still needs engine thrust.",
    source: "NASA Glenn Research Center",
  },
];

export type VoyageSound = "beep" | "liftoff" | "separation" | "burn" | "radio" | "pulse" | "touchdown";

export interface VoyageCue {
  at: number;
  sound: VoyageSound;
}

function descentPulses(): VoyageCue[] {
  const cues: VoyageCue[] = [];
  for (let t = BEATS.landing + 0.3; t < BEATS.touchdown - 0.1; t += 0.42) cues.push({ at: t, sound: "pulse" });
  return cues;
}

// Space is silent, so exterior shots stay quiet. Tones stand in for cabin and radio sounds.
const UNSORTED_CUES: VoyageCue[] = [
  { at: 0, sound: "beep" },
  { at: 0.5, sound: "beep" },
  { at: 1.0, sound: "beep" },
  { at: BEATS.liftoff, sound: "liftoff" },
  { at: BEATS.separation, sound: "separation" },
  { at: BEATS.depart + 0.4, sound: "burn" },
  { at: BEATS.transfer + 0.2, sound: "radio" },
  { at: BEATS.orbit + 0.2, sound: "radio" },
  ...descentPulses(),
  { at: BEATS.touchdown, sound: "touchdown" },
];

export const CUES: VoyageCue[] = [...UNSORTED_CUES].sort((a, b) => a.at - b.at);

export function phaseAt(t: number): string {
  let label = PHASES[0].label;
  for (const phase of PHASES) if (t >= phase.at) label = phase.label;
  return label;
}
