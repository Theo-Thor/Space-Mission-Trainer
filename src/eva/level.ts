// "Rover Rescue": the side-view Moon level. Coordinates are px, y grows downward.
// The view is 720 px tall in world units; the ground line sits around y 560.
import type { Terrain } from "./physics";

export const TERRAIN: Terrain = {
  minX: 330,
  maxX: 8820,
  ground: [
    // 1. Airlock yard
    [0, 560], [900, 560], [1000, 546], [1100, 556], [1300, 560],
    // 2. Crater hop
    [1440, 560], [1470, 540], [1500, 602], [1600, 610], [1630, 540], [1660, 560],
    [1880, 560], [1910, 538], [1950, 622], [2080, 630], [2120, 538], [2150, 560],
    [2400, 560], [2700, 522], [2950, 500], [3050, 540],
    // 3. Boulder ridge (each step is a wall you jump)
    [3300, 540], [3330, 470], [3500, 470], [3530, 400], [3700, 400], [3730, 330], [3950, 330],
    [3990, 400], [4100, 450], [4250, 520], [4300, 520],
    // 4. Shadow crater (never sees sunlight)
    [4340, 560], [4420, 760], [4500, 900], [5540, 900],
    // Exit: rock steps, each one a jump.
    [5560, 810], [5660, 810], [5680, 720], [5770, 720], [5790, 630], [5870, 630], [5890, 540], [5960, 520],
    // 5. Storm run
    [6100, 520], [6400, 540], [6800, 560], [7700, 560],
    // 6. Rover site
    [8700, 560], [9100, 560],
  ],
  platforms: [
    { x: 740, y: 520, w: 100 },
    { x: 2560, y: 440, w: 130 },
    { x: 4700, y: 840, w: 110 },
    { x: 7000, y: 400, w: 260 },
    { x: 7380, y: 470, w: 100 },
    { x: 7500, y: 380, w: 100 },
    { x: 7620, y: 300, w: 120 },
    // Crane bridge across the crater, lowered after the repair for the drive home.
    { x: 4280, y: 520, w: 1660, tag: "bridge" },
  ],
};

export const START = { x: 380, y: 560 };
export const AIRLOCK_X = 300;
export const ROVER_X = 8250;

export interface Checkpoint {
  x: number;
  name: string;
}
export const CHECKPOINTS: Checkpoint[] = [
  { x: 380, name: "Airlock yard" },
  { x: 1350, name: "Crater hop" },
  { x: 3060, name: "Boulder ridge" },
  { x: 4240, name: "Shadow crater rim" },
  { x: 6150, name: "Storm run" },
  { x: 7760, name: "Rover site" },
];

export type PartId = "wheel" | "battery" | "antenna";
export const PARTS: { id: PartId; name: string; x: number; y: number }[] = [
  { id: "wheel", name: "Spare wheel", x: 2630, y: 420 },
  { id: "battery", name: "Battery", x: 5360, y: 876 },
  { id: "antenna", name: "Antenna", x: 7680, y: 280 },
];

export interface Fact {
  id: string;
  x: number;
  y: number;
  title: string;
  body: string;
  source: string;
}
/** Hidden fact stars. Real NASA facts; the level itself is fictional. */
export const FACTS: Fact[] = [
  { id: "gravity", x: 1150, y: 452, title: "MOON GRAVITY", body: "The Moon pulls with 1.62 m/s², about one sixth of Earth's pull. The same push sends you about six times higher.", source: "Source: NASA Glenn Research Center." },
  { id: "footprints", x: 2250, y: 456, title: "FOOTPRINTS", body: "There is no wind or rain on the Moon, so astronaut footprints can last for a very long time.", source: "Source: NASA." },
  { id: "earth", x: 3850, y: 250, title: "EARTH ON THE HORIZON", body: "From the lunar south pole, Earth sits low on the horizon and is hidden for about half of every month.", source: "Source: NASA lunar communications architecture." },
  { id: "cold", x: 5100, y: 852, title: "COLDER THAN PLUTO", body: "Some crater floors near the poles never see sunlight. NASA's LRO measured about −238 °C there.", source: "Source: NASA LRO Diviner." },
  { id: "dust", x: 6650, y: 440, title: "SHARP DUST", body: "Moon dust is sharp and clingy. It scratched Apollo spacesuits and got into everything.", source: "Source: NASA." },
];

export const ICE = { x: 4900, y: 872, title: "ICE CORE", body: "In 2009 NASA's LCROSS probe hit a shadowed crater and found water ice in the plume.", source: "Source: NASA LCROSS." };

/** The shadow crater: dark below the rim. */
export const DARK = { x0: 4380, x1: 5930, rimY: 560 };

/** Storm: warning starts here; shelter under the rock overhang. */
export const STORM = { trigger: 6300, shelterX0: 7015, shelterX1: 7245, shelterY: 450 };

/** Boulder: rolls left down the slope, again and again. */
export const BOULDER = { from: 2940, to: 2390, r: 30, speed: 115, pause: 1.4 };

export const RADIO = {
  start: "Riley here. The scout rover broke down past the shadow crater. It's our relay while Earth is behind the hills. Find a wheel, a battery and an antenna, then fix it!",
  firstJump: "See how high you went? Same push as on Earth, about six times higher. That's Moon gravity.",
  boulders: "Boulders roll down this slope. Slow, but they still knock you over. Jump them!",
  ridge: "Look up! Earth is sitting right on the horizon.",
  crater: "This crater never sees sunlight. Your helmet lamp is all you've got. Don't stay too long, it's freezing.",
  storm: "Solar storm incoming! Get under the rock overhang ahead!",
  stormClear: "All clear. Great sheltering!",
  stormMissed: "The storm caught you outside! Tether's pulling you back. Shelter under the overhang this time.",
  allParts: "That's all three parts! The rover is just ahead.",
  repaired: "Signal relay online! I lowered the crane bridge over the crater. Drive it home!",
  home: "Welcome back, rover hero!",
  tether: "Gotcha! The tether pulled you back to the last beacon.",
  oxygen: "Oxygen's empty! Back to the beacon for a refill.",
  cold: "Too cold! Back to the crater rim to warm up.",
};
