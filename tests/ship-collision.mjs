import { shipObstacles, shipWalkable, SHIP_SPAWN, RILEY_SPAWN, RILEY_ENTER, RILEY_SEAT_PATH, PILOT_SEAT } from "../src/content/ship.ts";

const areas = shipWalkable();
const blocks = shipObstacles();

function blocked(x, y) {
  const box = { x: x - 14, y: y - 12, w: 28, h: 18 };
  const points = [
    [box.x + 1, box.y + 1],
    [box.x + box.w - 1, box.y + 1],
    [box.x + 1, box.y + box.h - 1],
    [box.x + box.w - 1, box.y + box.h - 1],
  ];
  const inside = points.every(([px, py]) =>
    areas.some((area) => px >= area.x && py >= area.y && px <= area.x + area.w && py <= area.y + area.h),
  );
  if (!inside) return true;
  return blocks.some((block) => box.x < block.x + block.w && box.x + box.w > block.x && box.y < block.y + block.h && box.y + box.h > block.y);
}

function hits(x0, y0, x1, y1, allow) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  const hits = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = steps === 0 ? 0 : i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const box = { x: x - 14, y: y - 12, w: 28, h: 18 };
    for (const block of blocks) {
      if (allow.includes(block)) continue;
      if (box.x < block.x + block.w && box.x + box.w > block.x && box.y < block.y + block.h && box.y + box.h > block.y) {
        hits.push(`${Math.round(x)},${Math.round(y)} -> ${block.x},${block.y}`);
      }
    }
  }
  return hits;
}

function route(from, to) {
  const step = 8;
  const key = (x, y) => `${x},${y}`;
  const start = { x: Math.round(from.x), y: Math.round(from.y) };
  const queue = [start];
  const prev = new Map([[key(start.x, start.y), null]]);
  while (queue.length) {
    const here = queue.shift();
    if (Math.hypot(here.x - to.x, here.y - to.y) <= 10) return here;
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const next = { x: here.x + dx, y: here.y + dy };
      const id = key(next.x, next.y);
      if (prev.has(id) || blocked(next.x, next.y)) continue;
      prev.set(id, here);
      queue.push(next);
    }
  }
  return null;
}

const seat = blocks.find((block) => block.x === 460 && block.y === 356);
const rileySeat = blocks.find((block) => block.x === 736 && block.y === 356);
const problems = [];
for (const point of [SHIP_SPAWN, RILEY_SPAWN, { x: 320, y: 292 }, { x: 960, y: 292 }, { x: 502, y: 448 }, ...RILEY_ENTER]) {
  if (blocked(point.x, point.y)) problems.push(`blocked stand ${point.x},${point.y}`);
}
for (const target of [{ x: 320, y: 292 }, { x: 960, y: 292 }, { x: 502, y: 448 }]) {
  if (!route(SHIP_SPAWN, target)) problems.push(`no route to ${target.x},${target.y}`);
}
problems.push(...hits(502, 448, PILOT_SEAT.x, PILOT_SEAT.y, [seat]).map((hit) => `pilot ${hit}`));
let previous = RILEY_ENTER[RILEY_ENTER.length - 1];
for (const point of RILEY_SEAT_PATH) {
  problems.push(...hits(previous.x, previous.y, point.x, point.y, [rileySeat]).map((hit) => `riley ${hit}`));
  previous = point;
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`routes clear, ${blocks.length} solid pieces`);
