import { props, rooms, type Door, type PropDef, type Room } from "../content/world";

// Artwork changes only. World rectangles still own collision, interaction and depth order.
export const facilityRooms = new Set(rooms.map(room => room.id));
const surfaces = new Map<string, HTMLCanvasElement>();
const kinds = ["desk", "seat", "plant", "console", "locker", "storage", "table", "board", "hatch", "arch", "platform", "moon"] as const;
const art = Object.fromEntries(kinds.map(kind => {
  const image = new Image();
  image.src = `/assets/facility/${kind}.png`;
  return [kind, image];
})) as Record<typeof kinds[number], HTMLImageElement>;

const colors: Record<string, [string, string]> = {
  reception: ["#43566b", "#34465b"], lobby: ["#344b60", "#2a3e50"],
  briefing: ["#43566b", "#34475d"], comms: ["#304c59", "#253d4c"],
  suit: ["#4a5260", "#3b4350"], boarding: ["#2d414e", "#21333f"],
  // Selene Base (Moon)
  "lu-hall": ["#4a5f76", "#394d63"], "lu-lab": ["#304c59", "#253d4c"], "lu-ind": ["#4a5260", "#3b4350"], "lu-hab": ["#43566b", "#34465b"],
  "lu-green": ["#2f5148", "#233f38"], "lu-com": ["#304c59", "#253d4c"], "lu-pow": ["#2d414e", "#21333f"], "lu-air": ["#4a5260", "#3b4350"],
  "lu-gar": ["#2d414e", "#21333f"], "lu-med": ["#43566b", "#34475d"], "lu-vh": ["#364b60", "#2b3e52"], "lu-wh": ["#364b60", "#2b3e52"],
  "lu-eh": ["#364b60", "#2b3e52"], "lu-gwh": ["#364b60", "#2b3e52"], "lu-geh": ["#364b60", "#2b3e52"], "lu-awh": ["#364b60", "#2b3e52"],
  "lu-aeh": ["#364b60", "#2b3e52"],
};
type Footprint = { x: number; y: number; w: number; h: number; blocks: boolean; kind: string };
const codes: Record<string, string> = { reception: "01", lobby: "02", briefing: "03", comms: "04", suit: "05", boarding: "06" };

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string | CanvasGradient, radius = 3): void {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
}

function gradient(ctx: CanvasRenderingContext2D, y: number, height: number, top: string, bottom: string): CanvasGradient {
  const fill = ctx.createLinearGradient(0, y, 0, y + height);
  fill.addColorStop(0, top); fill.addColorStop(1, bottom);
  return fill;
}

function wallPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lamp: boolean): void {
  panel(ctx, x, y, w, h, gradient(ctx, y, h, "#475e75", "#1d2d40"));
  ctx.strokeStyle = "#60768b"; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x + 4, y + 1); ctx.lineTo(x + w - 4, y + 1); ctx.stroke();
  ctx.fillStyle = "#0f1d2c";
  for (const bx of [x + 4, x + w - 4]) for (const by of [y + 4, y + h - 4]) {
    ctx.beginPath(); ctx.arc(bx, by, 1, 0, Math.PI * 2); ctx.fill();
  }
  if (lamp) {
    const horizontal = w > h;
    panel(ctx, x + w * 0.3, y + h * 0.3, w * 0.4, h * 0.4, "#102231", 2);
    panel(ctx, x + w * 0.3 + 2, y + h * 0.3 + 2, w * 0.4 - 4, h * 0.4 - 4, "#83dce2", 1);
    ctx.fillStyle = "#e1f7ee";
    if (horizontal) ctx.fillRect(x + w * 0.3 + 3, y + h * 0.3 + 2, w * 0.4 - 6, 1);
  } else {
    ctx.fillStyle = "#152536";
    for (let i = 0; i < 5; i++) {
      if (w > h) ctx.fillRect(x + w * 0.4 + i * 4, y + 6, 2, h - 12);
      else ctx.fillRect(x + 6, y + h * 0.4 + i * 4, w - 12, 2);
    }
  }
}

function floorInsignia(ctx: CanvasRenderingContext2D, room: Room): void {
  const cx = room.w / 2;
  if (room.id === "reception") {
    const cy = room.h * 0.66;
    ctx.strokeStyle = "rgba(192,212,221,0.18)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 112, cy - 57, 224, 124, 28); ctx.stroke();
    ctx.fillStyle = "rgba(207,224,231,0.27)";
    ctx.beginPath(); ctx.arc(cx, cy - 20, 26, 0.6, 5.6); ctx.arc(cx + 9, cy - 24, 23, 5.2, 1.2, true); ctx.fill();
    ctx.textAlign = "center"; ctx.font = "600 14px Segoe UI, sans-serif";
    ctx.fillText("WELCOME", cx, cy + 28);
    ctx.font = "9px Segoe UI, sans-serif"; ctx.fillText("MISSION PREPARATION", cx, cy + 45);
    ctx.fillStyle = "#c78e4b";
    ctx.fillRect(cx - 90, cy + 65, 28, 2); ctx.fillRect(cx + 62, cy + 65, 28, 2);
  }
  // Flat service covers read as floor details, never new physical obstacles.
  for (const [x, y] of [[room.w - 104, room.h - 68], [48, room.h / 2]]) {
    panel(ctx, x, y, 48, 24, "rgba(16,29,43,0.2)", 2);
    ctx.strokeStyle = "rgba(181,205,219,0.15)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, 46, 22);
    ctx.fillStyle = "rgba(13,25,36,0.4)";
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 7 + i * 6, y + 6, 2, 12);
  }
  ctx.textAlign = "left"; ctx.fillStyle = "rgba(195,215,224,0.15)";
  ctx.font = "600 32px Segoe UI, sans-serif";
  ctx.fillText(codes[room.id] ?? "", room.w - 90, 108);
}

function bakeRoom(room: Room, roomProps: Footprint[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = room.w; canvas.height = room.h;
  const ctx = canvas.getContext("2d")!;
  panel(ctx, 0, 0, room.w, room.h, "#101c2a", 8);
  panel(ctx, 3, 3, room.w - 6, room.h - 6, "#24384d", 6);
  const [top, bottom] = colors[room.id];
  ctx.fillStyle = gradient(ctx, 28, room.h - 56, top, bottom);
  ctx.fillRect(28, 28, room.w - 56, room.h - 56);
  ctx.save(); ctx.beginPath(); ctx.rect(28, 28, room.w - 56, room.h - 56); ctx.clip();
  // Broad, offset floor joints replace the old tight repeating tile grid.
  // The floor now reads as one continuous facility surface at the game's camera scale.
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(10,24,38,0.24)";
  for (const y of [room.h * 0.34, room.h * 0.72]) {
    ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(room.w * 0.39, y); ctx.moveTo(room.w * 0.43, y); ctx.lineTo(room.w - 28, y); ctx.stroke();
  }
  for (const [x, top, bottom] of [[room.w * 0.31, 28, room.h * 0.34], [room.w * 0.68, room.h * 0.34, room.h * 0.72], [room.w * 0.46, room.h * 0.72, room.h - 28]]) {
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
  }
  // Soft, irregular light pools add depth without making another hard grid.
  for (const [x, y, radius, color] of [
    [room.w * 0.22, room.h * 0.28, room.w * 0.28, "rgba(85,213,233,0.045)"],
    [room.w * 0.76, room.h * 0.68, room.w * 0.32, "rgba(240,168,75,0.035)"],
  ] as const) {
    const glow = ctx.createRadialGradient(x, y, 4, x, y, radius);
    glow.addColorStop(0, color); glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(28, 28, room.w - 56, room.h - 56);
  }
  // Insets ground existing furniture without changing its world footprint.
  for (const prop of roomProps.filter(p => p.x >= room.x + 28 && p.x < room.x + room.w - 28 && p.y >= room.y + 28 && p.y < room.y + room.h - 28 && p.blocks)) {
    if (prop.kind === "plant" || prop.kind === "moon") continue;
    const x = prop.x - room.x; const y = prop.y - room.y;
    panel(ctx, x - 8, y - 6, prop.w + 16, prop.h + 14, "rgba(10,22,32,0.13)", 3);
    ctx.strokeStyle = "rgba(160,187,200,0.15)"; ctx.strokeRect(x - 8, y - 6, prop.w + 16, prop.h + 14);
  }
  floorInsignia(ctx, room);
  const shade = ctx.createLinearGradient(0, 28, 0, 62);
  shade.addColorStop(0, "rgba(4,12,23,0.38)"); shade.addColorStop(1, "rgba(4,12,23,0)");
  ctx.fillStyle = shade; ctx.fillRect(28, 28, room.w - 56, 34);
  const edge = ctx.createLinearGradient(28, 0, 48, 0);
  edge.addColorStop(0, "rgba(4,12,23,0.22)"); edge.addColorStop(1, "rgba(4,12,23,0)");
  ctx.fillStyle = edge; ctx.fillRect(28, 28, 20, room.h - 56);
  ctx.restore();
  // Continuous bulkhead rails with only a few larger service bays avoid the boxed-in look.
  wallPanel(ctx, 28, 7, room.w - 56, 18, true);
  wallPanel(ctx, 28, room.h - 25, room.w - 56, 18, false);
  wallPanel(ctx, 7, 28, 18, room.h - 56, false);
  wallPanel(ctx, room.w - 25, 28, 18, room.h - 56, true);
  return canvas;
}

export function drawFacilityShell(ctx: CanvasRenderingContext2D, room: Room, roomProps: Footprint[] = props): boolean {
  if (!colors[room.id]) return false;
  let surface = surfaces.get(room.id);
  if (!surface) { surface = bakeRoom(room, roomProps); surfaces.set(room.id, surface); }
  ctx.drawImage(surface, room.x, room.y);
  return true;
}

/** Threshold decoration follows each existing doorway's axis and footprint. */
export function drawFacilityThreshold(ctx: CanvasRenderingContext2D, door: Door): void {
  ctx.save(); ctx.translate(door.x + door.w / 2, door.y + door.h / 2);
  if (door.axis === "v") ctx.rotate(Math.PI / 2);
  const width = door.axis === "h" ? door.w : door.h;
  const depth = door.axis === "h" ? door.h : door.w;
  panel(ctx, -width / 2, -depth / 2, width, depth, gradient(ctx, -depth / 2, depth, "#546375", "#344556"), 0);
  ctx.fillStyle = "#182b3c";
  ctx.fillRect(-width / 2, -3, width, 6);
  ctx.fillStyle = "#79b2c0";
  ctx.fillRect(-width / 2 + 12, -1, width - 24, 1);
  for (const y of [-depth / 2 + 6, depth / 2 - 12]) {
    for (let x = -width / 2 + 18; x < width / 2 - 18; x += 20) {
      ctx.fillStyle = "#d29b54";
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 11, y); ctx.lineTo(x + 5, y + 6); ctx.lineTo(x - 6, y + 6); ctx.fill();
    }
  }
  for (const x of [-width / 2 - 3, width / 2 - 9]) {
    panel(ctx, x, -depth / 2 - 3, 12, depth + 6, "#111f2e", 2);
    panel(ctx, x + 2, -depth / 2 - 1, 8, depth + 2, gradient(ctx, -depth / 2, depth, "#a7b6c0", "#566c7c"), 1);
    panel(ctx, x + 4, -depth / 2 + 5, 4, 10, "#86e5e8", 1);
  }
  ctx.restore();
}

function shadow(ctx: CanvasRenderingContext2D, p: PropDef): void {
  ctx.save(); ctx.fillStyle = "rgba(4,14,23,0.28)";
  ctx.beginPath(); ctx.ellipse(p.x + p.w / 2 + 3, p.y + p.h - 1, p.w * 0.48, Math.min(12, p.h * 0.2 + 3), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawFacilityProp(ctx: CanvasRenderingContext2D, p: PropDef, state: { radioTaken: boolean; suitReady: boolean; hatchOpen: boolean; time: number }): boolean {
  const room = rooms.find(r => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (!room || !facilityRooms.has(room.id)) return false;
  const kind = p.kind === "bench" ? (p.id === "radio" ? "table" : "seat") : p.kind;
  const image = art[kind];
  if (!image?.complete || !image.naturalWidth) return false;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  shadow(ctx, p);
  let width = p.w;
  let height = Math.min(p.h + 60, width * image.naturalHeight / image.naturalWidth);
  let x = p.x; let y = p.y + p.h - height;
  if (p.kind === "plant") { height = p.h + 18; width = height * image.naturalWidth / image.naturalHeight; x = p.x + (p.w - width) / 2; y = p.y + p.h - height; }
  if (p.kind === "seat" || (p.kind === "bench" && p.id !== "radio")) {
    const count = Math.max(1, Math.round(p.w / 76));
    const unit = p.w / count; const h = Math.min(58, unit * image.naturalHeight / image.naturalWidth);
    for (let i = 0; i < count; i++) ctx.drawImage(image, p.x + i * unit, p.y + p.h - h, unit, h);
  } else if (p.kind === "hatch") {
    width = 100; height = p.h + 12; x = p.x - 50; y = p.y - 12;
    ctx.drawImage(image, x, y, width, height);
    if (state.hatchOpen) {
      panel(ctx, x + 18, y + 30, width - 36, height - 44, "#071822", 5);
      ctx.fillStyle = "#55d5e9"; ctx.fillRect(x + 19, y + 32, 2, height - 48);
    }
  } else if (p.kind === "arch") {
    // Transparent aperture remains traversable; uprights align with the existing arch.
    ctx.drawImage(image, p.x, p.y - 24, p.w, p.h + 24);
  } else ctx.drawImage(image, x, y, width, height);
  if (p.kind === "board") {
    panel(ctx, p.x + 14, p.y + p.h - 25, p.w - 28, 20, "rgba(8,24,35,0.94)", 2);
    ctx.fillStyle = "#dcecf0"; ctx.font = "600 11px Segoe UI, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(p.text ?? "SELENE", p.x + p.w / 2, p.y + p.h - 11);
  }
  if (p.id === "radio" && !state.radioTaken) {
    panel(ctx, p.x + p.w / 2 - 10, p.y + 4, 20, 27, "#102b3b", 3);
    ctx.fillStyle = "#6bdae6"; ctx.fillRect(p.x + p.w / 2 - 6, p.y + 9, 12, 7);
    ctx.fillStyle = "#aebcc4"; ctx.fillRect(p.x + p.w / 2 + 5, p.y - 2, 2, 8);
  }
  if (p.kind === "locker" && state.suitReady) {
    ctx.fillStyle = "#7de0d1"; ctx.fillRect(p.x + 20, p.y + p.h - 5, p.w - 40, 2);
  }
  if (p.kind === "moon") {
    ctx.fillStyle = "#dcecf0"; ctx.font = "600 11px Segoe UI, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SOUTH POLE OBJECTIVE", p.x + p.w / 2, p.y + p.h + 17);
  }
  ctx.restore(); return true;
}
