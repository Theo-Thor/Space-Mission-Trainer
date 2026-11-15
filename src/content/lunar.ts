import type { Dir, Look, Rect } from "../types";
import type { Decal } from "../render/lunar-art";
import { WALL, type Door, type Room } from "./world";

// Selene Base, lunar south pole (fictional, year 2048). Layout = approved option D2.
// World in pixels, origin top-left. Rooms share edges and never overlap.
export const LUNAR_WORLD = { width: 3450, height: 3200 };

const HALL = { floor: "#1D2F45", accent: "#4F7C95" };
function room(id: string, label: string, x: number, y: number, w: number, h: number, floor: string, accent: string): Room {
  return { id: `lu-${id}`, label, x, y, w, h, floor, accent };
}
function hall(id: string, x: number, y: number, w: number, h: number): Room {
  return room(id, "HALLWAY", x, y, w, h, HALL.floor, HALL.accent);
}

export const lunarRooms: Room[] = [
  // The Grand Hall stays empty on purpose until it is designed.
  room("hall", "GRAND HALL", 1050, 40, 1300, 680, "#2C4260", "#D5DEE8"),
  hall("vh", 1550, 720, 300, 760),
  hall("wh", 1050, 900, 500, 260),
  hall("eh", 1850, 900, 360, 260),
  room("lab", "SCIENCE LAB", 450, 760, 600, 700, "#1E3C4C", "#55D5E9"),
  room("ind", "ICE PROCESSING", 24, 840, 426, 560, "#3A4658", "#F0A84B"),
  room("hab", "CREW HABITAT", 2210, 740, 620, 720, "#314864", "#E8EFF5"),
  room("green", "GREENHOUSE", 2830, 860, 500, 520, "#23473A", "#7BD88F"),
  hall("gwh", 800, 250, 250, 250),
  room("com", "COMMS RELAY", 250, 100, 550, 600, "#1E3C4C", "#55D5E9"),
  hall("geh", 2350, 300, 330, 240),
  room("pow", "POWER & LIFE SUPPORT", 2680, 100, 620, 620, "#1B2C3C", "#F0A84B"),
  room("air", "AIRLOCK & SUIT-UP", 1450, 1480, 500, 340, "#3A4658", "#F0A84B"),
  hall("awh", 1090, 1530, 360, 240),
  room("gar", "ROVER GARAGE", 450, 1480, 640, 340, "#1B2C3C", "#F0A84B"),
  hall("aeh", 1950, 1530, 200, 240),
  room("med", "MEDICAL BAY", 2150, 1480, 480, 340, "#34445C", "#E8EFF5"),
];

/** The open ground outside. Walking here needs the suit. */
export const SURFACE_AREA = { x: 24, y: 1820, w: 3402, h: 1340 };
export const SURFACE_ROOM: Room = { id: "lu-surface", label: "LUNAR SURFACE", ...SURFACE_AREA, floor: "#5B626D", accent: "#C9D3DE" };
export const PAD = { x: 1700, y: 1960 };
export const CRATER = { x: 3050, y: 1960, rx: 240, ry: 55 };
/** Craters on the open surface south of the base (top-down). The shadowed crater above is one of them. */
export const SURFACE_CRATERS = [
  { x: 820, y: 2620, rx: 300, ry: 115, label: "SELENE CRATER" },
  { x: 2010, y: 2330, rx: 95, ry: 36, label: "" },
  { x: 2160, y: 2420, rx: 60, ry: 24, label: "" },
  { x: 1900, y: 2460, rx: 48, ry: 20, label: "" },
];
/** NEXUS keys: 11 glowing shards on the open surface. Each one charges one turn of the cube. */
export const NEXUS_KEYS: { x: number; y: number; color: string }[] = [
  [300, 1900], [1150, 1880], [2300, 1900], [2960, 2120], [520, 2350], [1000, 2430],
  [1760, 2600], [2210, 2250], [3200, 2500], [2060, 3060], [900, 3000],
].map(([x, y], i) => ({ x, y, color: ["#FFB547", "#FF6FA8", "#3FD8FF", "#D6ECFF", "#9B7BFF", "#5BE38C"][i % 6] }));
/** A boulder that rolled downhill, leaving a track (as seen in LRO images). */
export const BOULDER_TRACK = { x0: 1180, y0: 2760, x1: 1560, y1: 2950 };

const byId = (id: string): Room => {
  const found = lunarRooms.find((r) => r.id === `lu-${id}`);
  if (!found) throw new Error(`Missing lunar room ${id}`);
  return found;
};

// Which room pairs get a 176 px doorway, and which of those carry a wayfinding sign.
const PAIRS: [string, string, string?][] = [
  ["hall", "vh", "GRAND HALL"], ["vh", "air", "AIRLOCK"], ["vh", "wh", "SCIENCE LAB"], ["vh", "eh", "HABITAT"],
  ["wh", "lab"], ["lab", "ind"], ["eh", "hab"], ["hab", "green"],
  ["hall", "gwh"], ["gwh", "com"], ["hall", "geh"], ["geh", "pow"],
  ["air", "awh"], ["awh", "gar"], ["air", "aeh"], ["aeh", "med"],
];

function doorBetween(index: number, a: Room, b: Room, sign = ""): Door {
  const accent = b.label === "HALLWAY" ? a.accent : b.accent;
  const hallway = a.label === "HALLWAY" ? a : b;
  if (Math.abs(a.x + a.w - b.x) < 1 || Math.abs(b.x + b.w - a.x) < 1) {
    const e = Math.abs(a.x + a.w - b.x) < 1 ? a.x + a.w : a.x;
    const c = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2;
    const homeLeft = hallway.x + hallway.w / 2 < e;
    return { id: `lu-d${index}`, x: e - 28, y: c - 88, w: 56, h: 176, axis: "v", accent, sign, signAt: { x: e + (homeLeft ? -110 : 110), y: c - 100 } };
  }
  const e = Math.abs(a.y + a.h - b.y) < 1 ? a.y + a.h : a.y;
  const c = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
  const homeAbove = hallway.y + hallway.h / 2 < e;
  return { id: `lu-d${index}`, x: c - 88, y: e - 28, w: 176, h: 56, axis: "h", accent, sign, signAt: { x: c, y: e + (homeAbove ? -60 : 80) } };
}

export const lunarDoors: Door[] = [
  ...PAIRS.map(([a, b, sign], index) => doorBetween(index, byId(a), byId(b), sign)),
  // EVA hatches: bridge the south wall of three rooms onto the surface.
  ...(["air", "gar", "med"] as const).map((id, index): Door => {
    const r = byId(id);
    const cx = r.x + r.w / 2;
    const ey = r.y + r.h;
    return { id: `lu-x${index}`, x: cx - 88, y: ey - 28, w: 176, h: 56, axis: "h", accent: "#F0A84B", sign: id === "gar" ? "ROVER EXIT" : "EVA", signAt: { x: cx, y: ey - 58 } };
  }),
];
// The airlock sign sits higher in the spine so it is readable on the way down.
lunarDoors[1].signAt = { x: lunarDoors[1].x + 88, y: 1400 };

export interface LunarProp {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  blocks: boolean;
  text?: string;
  prompt?: string;
  radius?: number;
  ax?: number;
  ay?: number;
  examine?: { title: string; body: string; detail: string };
}

// Natural drawing sizes from lunar-art.ts; props scale uniformly from these.
const NAT: Record<string, [number, number]> = {
  microscope: [200, 80], centrifuge: [100, 90], freezer: [90, 130], printer: [190, 140], glovebox: [210, 110], samples: [220, 70],
  icetank: [110, 160], melter: [170, 120], corerack: [250, 70], pump: [90, 80], earthglobe: [110, 130], radiorack: [110, 140],
  dishdesk: [200, 90], wallscreen: [240, 70], headset: [180, 72], bunk: [150, 120], galley: [250, 84], couch: [210, 80],
  roundtable: [110, 90], shelf: [150, 60], hydro: [210, 96], watertank: [96, 150], seedcab: [100, 120], composter: [74, 74],
  reactor: [170, 190], battery: [190, 100], inverter: [110, 130], reel: [66, 66], powerdesk: [160, 70], medbed: [160, 110],
  medcab: [110, 130], ivstand: [40, 110], scanner: [150, 130], toolwall: [250, 50], workbench: [210, 86], tires: [120, 90],
  charger: [110, 100], crates: [130, 90], o2rack: [110, 130], helmets: [150, 66], dustshower: [90, 130], evabench: [190, 50],
  extinguisher: [28, 52], firstaid: [44, 40], rover: [210, 95], nexus: [240, 300], datapillar: [56, 140], orbi: [64, 84],
  ltv: [300, 190], drillrig: [160, 200], solarmast: [80, 190], seismo: [130, 80], boulder: [130, 96],
};

export const lunarProps: LunarProp[] = [];
export const lunarDecals: Decal[] = [];
function p(kind: string, x: number, y: number, s = 1, extra: Partial<LunarProp> = {}): void {
  const [w, h] = NAT[kind];
  lunarProps.push({ id: extra.id ?? `lu-p${lunarProps.length}`, kind, x, y, w: Math.round(w * s), h: Math.round(h * s), blocks: true, ...extra });
}
function dc(kind: string, x: number, y: number, w: number, h: number, color?: string): void {
  lunarDecals.push({ kind, x, y, w, h, color });
}

// GRAND HALL: the NEXUS pedestal sits in the middle of the base.
p("nexus", 1580, 220, 1, { id: "lu-nexus", prompt: "E — Examine NEXUS", radius: 130, ax: 1700, ay: 560 });
// The NEXUS chamber: light lines from every door to the cube, need screens, data pillars, consoles, ORBI.
dc("stripe", 1078, 373, 500, 4, "rgba(85,213,233,0.45)");
dc("stripe", 1822, 418, 500, 4, "rgba(85,213,233,0.45)");
dc("stripe", 1698, 528, 4, 164, "rgba(85,213,233,0.45)");
dc("ring", 1560, 470, 280, 90, "rgba(85,213,233,0.35)");
p("wallscreen", 1110, 74, 0.75, { text: "ENERGY · SIGNAL" });
p("wallscreen", 1340, 74, 0.75, { text: "WATER · AIR" });
p("wallscreen", 1880, 74, 0.75, { text: "SHIELD · FOOD" });
p("wallscreen", 2110, 74, 0.75, { text: "SKY DATA · NASA" });
p("datapillar", 1110, 160); p("datapillar", 1110, 500); p("datapillar", 2240, 150); p("datapillar", 2240, 540);
p("powerdesk", 1190, 610, 0.9); p("dishdesk", 2030, 610, 0.8);
p("orbi", 1860, 440, 1, { id: "lu-orbi", blocks: false, prompt: "E — Talk to ORBI", radius: 90, ax: 1892, ay: 540 });
// ROVER EXIT: the way out to the side-view EVA level (nothing is drawn; it is the doorway itself).
// ---------- OPEN SURFACE south of the base: walk out and examine things ----------
const ex = (title: string, body: string, detail: string) => ({ title, body, detail });
p("ltv", 1240, 2160, 1, {
  id: "lu-ltv", prompt: "E — Examine Moon Rover", radius: 120, ax: 1390, ay: 2380,
  examine: ex("MOON ROVER", "Apollo 15, 16 and 17 astronauts drove a Lunar Roving Vehicle across the Moon. NASA's Artemis program plans a new Lunar Terrain Vehicle for the south pole.", "Source: NASA — Apollo LRV and Artemis LTV."),
});
p("drillrig", 2600, 2010, 1, {
  id: "lu-drill", prompt: "E — Examine Ice Drill", radius: 110, ax: 2680, ay: 2240,
  examine: ex("ICE DRILL", "In 1998 NASA's Lunar Prospector found extra hydrogen near the Moon's poles, an early clue that ice may hide in the cold craters.", "Source: NASA — Lunar Prospector."),
});
for (const [i, sx] of [2380, 2480, 2580, 2680, 2780].entries()) {
  p("solarmast", sx, 2660, 1, i === 2 ? {
    id: "lu-solar", prompt: "E — Examine Solar Mast", radius: 110, ax: sx + 40, ay: 2880,
    examine: ex("SOLAR MASTS", "At the south pole the Sun stays low on the horizon, so panels stand upright. Some ridges near the pole are lit up to about 90% of the time.", "Source: NASA LRO / LROC."),
  } : {});
}
p("boulder", BOULDER_TRACK.x1 - 40, BOULDER_TRACK.y1 - 60, 1, {
  id: "lu-boulder", prompt: "E — Examine Boulder Track", radius: 110, ax: BOULDER_TRACK.x1 + 30, ay: BOULDER_TRACK.y1 + 60,
  examine: ex("BOULDER TRACK", "NASA's Lunar Reconnaissance Orbiter has photographed boulders that rolled down slopes and left long tracks in the dust.", "Source: NASA LRO / LROC."),
});
p("seismo", 330, 2930, 1, {
  id: "lu-seismo", prompt: "E — Examine Seismometer", radius: 100, ax: 395, ay: 3050,
  examine: ex("MOONQUAKES", "Seismometers left by Apollo astronauts recorded moonquakes for years. The Moon still shakes a little as it cools and shrinks.", "Source: NASA — Apollo Passive Seismic Experiment."),
});
// Craters are examined from their rim (nothing drawn here; the floor art draws the craters).
lunarProps.push(
  { id: "lu-crater-big", kind: "marker", x: 800, y: 2480, w: 40, h: 10, blocks: false, prompt: "E — Examine Selene Crater", radius: 120, ax: 820, ay: 2480,
    examine: ex("IMPACT CRATER", "Most Moon craters were made by asteroids and comets crashing in. With no wind or rain, craters can last for billions of years.", "Source: NASA Science — Moon.") },
  { id: "lu-crater-small", kind: "marker", x: 1990, y: 2270, w: 40, h: 10, blocks: false, prompt: "E — Examine Small Craters", radius: 110, ax: 2010, ay: 2270,
    examine: ex("TINY IMPACTS", "With no air to slow them down, even tiny space rocks hit the Moon at full speed and dig small craters.", "Source: NASA Science — Moon.") },
  { id: "lu-crater-dark", kind: "marker", x: 3030, y: 1880, w: 40, h: 10, blocks: false, prompt: "E — Examine Shadowed Crater", radius: 120, ax: 3050, ay: 1880,
    examine: ex("NEVER SUNLIT", "Some crater floors near the poles never see sunlight. NASA's LRO measured temperatures around −238 °C, colder than Pluto's surface.", "Source: NASA LRO Diviner.") },
);
lunarProps.push({ id: "lu-eva", kind: "eva-hatch", x: 740, y: 1780, w: 60, h: 10, blocks: false, prompt: "E — Go outside: Rover Rescue", radius: 100, ax: 770, ay: 1800 });
// SCIENCE LAB
dc("grate", 560, 1010, 360, 110); dc("stripe", 478, 1118, 544, 4, "rgba(85,213,233,0.25)");
p("freezer", 490, 802); p("microscope", 600, 812); p("centrifuge", 830, 806);
p("printer", 500, 1252); p("glovebox", 730, 1296); p("samples", 735, 1212);
// ICE PROCESSING
dc("pipe", 120, 1035, 0, 205, "#7DB6D6"); dc("pipe", 240, 1035, 0, 205, "#7DB6D6"); dc("pipe", 360, 1035, 0, 60, "#7DB6D6"); dc("grate", 60, 1140, 260, 80);
p("icetank", 64, 880); p("icetank", 184, 880);
p("icetank", 304, 880, 1, {
  id: "lu-icetank", prompt: "E — Examine Ice Tank", radius: 90, ax: 359, ay: 1062,
  examine: {
    title: "WATER ICE TANK",
    body: "Water ice was detected in a permanently shadowed lunar crater when NASA's LCROSS probe struck it in 2009. Ice like this could become drinking water and rocket fuel.",
    detail: "Source: NASA — LCROSS mission (2009).",
  },
});
p("corerack", 70, 1062, 0.95); p("melter", 64, 1214); p("pump", 270, 1280);
// COMMS RELAY
dc("stripe", 290, 300, 420, 6, "rgba(85,213,233,0.3)"); dc("glow", 490, 380, 200, 200, "rgba(85,213,233,0.30)");
p("wallscreen", 300, 138, 1, { text: "EARTH LINK" }); p("radiorack", 580, 140); p("headset", 300, 330);
p("earthglobe", 520, 420); p("dishdesk", 300, 516); p("crates", 620, 540, 0.9);
// POWER & LIFE SUPPORT
dc("ring", 3030, 290, 230, 70, "rgba(123,216,143,0.5)"); dc("grate", 2790, 380, 150, 130);
p("battery", 2830, 140); p("reactor", 3050, 140); p("inverter", 3140, 430); p("reel", 3010, 478);
p("powerdesk", 2790, 540); p("battery", 3000, 570);
// CREW HABITAT
dc("rug", 2400, 1006, 290, 170, "#2F5F7A");
p("bunk", 2250, 782); p("bunk", 2420, 782); p("bunk", 2590, 782);
p("shelf", 2252, 1212); p("roundtable", 2520, 1226); p("couch", 2262, 1322); p("galley", 2528, 1338);
// GREENHOUSE
dc("glow", 3040, 890, 260, 480, "rgba(183,121,232,0.22)");
p("hydro", 3070, 896);
p("hydro", 3070, 1006, 1, {
  id: "lu-hydro", prompt: "E — Examine Growth Rack", radius: 90, ax: 3046, ay: 1060,
  examine: {
    title: "PLANT GROWTH RACK",
    body: "Astronauts on the International Space Station have grown and eaten lettuce using NASA's Veggie plant chamber. Fresh food will matter on long missions.",
    detail: "Source: NASA — Veggie plant growth system, ISS.",
  },
});
p("hydro", 3070, 1116); p("hydro", 3070, 1226);
p("watertank", 2880, 900); p("seedcab", 2880, 1186); p("composter", 2990, 1272);
// ROVER GARAGE
dc("stripe", 700, 1735, 230, 34, "rgba(240,168,75,0.22)"); dc("arrows", 760, 1765, 60, 40);
p("toolwall", 500, 1520, 0.96); p("crates", 770, 1525, 0.85); p("charger", 900, 1522);
p("tires", 492, 1580, 0.9); p("workbench", 492, 1668, 0.96);
p("rover", 720, 1628, 1, {
  id: "lu-rover", prompt: "E — Examine Rover", radius: 90, ax: 825, ay: 1748,
  examine: {
    title: "LUNAR ROVER",
    body: "NASA's Artemis program plans a Lunar Terrain Vehicle so astronauts can travel across the south pole region.",
    detail: "Source: NASA — Artemis Lunar Terrain Vehicle (LTV).",
  },
});
// AIRLOCK & SUIT-UP
dc("ring", 1590, 1590, 220, 120, "rgba(240,168,75,0.7)"); dc("hazard", 1650, 1772, 100, 14); dc("hazard", 1612, 1510, 176, 8);
p("helmets", 1482, 1512, 0.82); p("dustshower", 1800, 1510, 0.6); p("o2rack", 1860, 1512, 0.55); p("evabench", 1802, 1750, 0.62);
// MEDICAL BAY
dc("cross", 2290, 1640, 90, 90);
p("medbed", 2300, 1516); p("medcab", 2474, 1514, 0.95); p("scanner", 2420, 1648, 0.9); p("ivstand", 2248, 1520, 0.9);
// Spine hallway wall gear (kept out of the walkway)
p("extinguisher", 1568, 790); p("firstaid", 1790, 800); p("extinguisher", 1810, 1340);

export interface LunarActorDef {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Dir;
  look: Look;
}

export const lunarCrew: LunarActorDef[] = [
  { id: "jun", name: "Jun Park", x: 705, y: 950, facing: "down", look: "jun" },
  { id: "mara", name: "Mara Quinn", x: 392, y: 462, facing: "down", look: "mara" },
  { id: "omar", name: "Omar Haddad", x: 2705, y: 1190, facing: "left", look: "omar" },
];

export const NPC_GREETING = "Welcome to the Lunar station.";

export const LUNAR_SPAWN = { x: PAD.x - 40, y: PAD.y };
export const LUNAR_RILEY = { x: PAD.x + 60, y: PAD.y - 4 };

export function lunarWalkable(): Rect[] {
  return [
    ...lunarRooms.map((r) => ({ x: r.x + WALL, y: r.y + WALL, w: r.w - WALL * 2, h: r.h - WALL * 2 })),
    ...lunarDoors.map((d) => ({ x: d.x, y: d.y, w: d.w, h: d.h })),
    // Surface interior overlaps the hatch bridges (which end at y 1848).
    { x: SURFACE_AREA.x + 24, y: SURFACE_AREA.y + 10, w: SURFACE_AREA.w - 48, h: SURFACE_AREA.h - 34 },
  ];
}

export function lunarObstacles(): Rect[] {
  // NEXUS floats: only the platform base blocks walking, not the whole hologram.
  const solid: Rect[] = lunarProps.filter((prop) => prop.blocks).map(({ id, x, y, w, h }) =>
    id === "lu-nexus" ? { x: x + 40, y: y + 236, w: w - 80, h: 50 } : { x, y, w, h });
  // The shadowed crater is a hole, not a floor: keep players on its rim.
  solid.push({ x: CRATER.x - CRATER.rx + 30, y: CRATER.y - CRATER.ry + 8, w: CRATER.rx * 2 - 60, h: CRATER.ry * 2 - 16 });
  for (const c of SURFACE_CRATERS) solid.push({ x: c.x - c.rx * 0.8, y: c.y - c.ry * 0.7, w: c.rx * 1.6, h: c.ry * 1.4 });
  return solid;
}

export function lunarRoomAt(x: number, y: number): Room {
  if (y >= SURFACE_AREA.y) return SURFACE_ROOM;
  for (let i = lunarRooms.length - 1; i >= 0; i -= 1) {
    const r = lunarRooms[i];
    if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
  }
  return SURFACE_ROOM;
}

export function onSurface(y: number): boolean {
  return y >= SURFACE_AREA.y;
}
