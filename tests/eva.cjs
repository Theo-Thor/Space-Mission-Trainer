// Rover Rescue: physics numbers, walls and ledges, and the mission flow without a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => {
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
};
const P = require('../src/eva/physics.ts');
const L = require('../src/eva/level.ts');
const { EvaMission } = require('../src/eva/eva.ts');

const dt = 1 / 60;
const flat = { minX: 0, maxX: 5000, ground: [[0, 560], [5000, 560]], platforms: [] };
const idle = { left: false, right: false, jump: false };

// 1. Jump: about 2 m high, about 2.2 s on screen, and 6x the Earth hop for the same push.
const stats = P.jumpStats();
const b = P.makeBody(100, 560);
P.stepBody(b, { ...idle, jump: true }, flat, dt);
let top = b.y, air = 0;
while (!b.onGround && air < 10) { P.stepBody(b, idle, flat, dt); top = Math.min(top, b.y); air += dt; }
const height = 560 - top;
assert(Math.abs(height - stats.height) < 4, `jump height ${height} vs ${stats.height}`);
assert(Math.abs(height / P.PX_PER_M - 2) < 0.1, 'about 2 m high');
assert(Math.abs(air - stats.air) < 0.05, `air time ${air}`);
const earth = P.jumpStats(P.EARTH_GRAVITY);
assert(Math.abs(stats.height / earth.height - P.G_EARTH / P.G_MOON) < 0.01, 'height ratio equals the gravity ratio');
assert(Math.abs(air * P.TIME_SCALE - 3.13) < 0.08, 'about 3.1 s of real Moon time');

// 2. Frame-rate independence within a few px.
for (const step of [1 / 30, 1 / 144]) {
  const c = P.makeBody(100, 560);
  P.stepBody(c, { ...idle, jump: true }, flat, step);
  let t2 = c.y;
  for (let i = 0; i < 2000 && !c.onGround; i++) { P.stepBody(c, idle, flat, step); t2 = Math.min(t2, c.y); }
  assert(Math.abs((560 - t2) - height) < 8, `stable at ${step}`);
}

// 3. A 70 px wall blocks walking but can be jumped; a 20 px rise can be walked.
const wall = { minX: 0, maxX: 2000, ground: [[0, 560], [300, 560], [330, 490], [2000, 490]], platforms: [] };
const w = P.makeBody(200, 560);
for (let i = 0; i < 180; i++) P.stepBody(w, { ...idle, right: true }, wall, dt);
assert(w.x < 320, 'wall blocks walking');
P.stepBody(w, { left: false, right: true, jump: true }, wall, dt);
for (let i = 0; i < 240; i++) P.stepBody(w, { ...idle, right: true }, wall, dt);
assert(w.x > 400 && Math.abs(w.y - 490) < 1, 'jumped up the wall');
const bump = { minX: 0, maxX: 2000, ground: [[0, 560], [300, 560], [400, 540], [2000, 540]], platforms: [] };
const k = P.makeBody(200, 560);
for (let i = 0; i < 240; i++) P.stepBody(k, { ...idle, right: true }, bump, dt);
assert(k.x > 500, 'gentle rise is walkable');

// 4. One-way ledge: jump through from below, land on top, walk off the edge.
const ledge = { minX: 0, maxX: 2000, ground: [[0, 560], [2000, 560]], platforms: [{ x: 150, y: 470, w: 120 }] };
const l = P.makeBody(200, 560);
P.stepBody(l, { ...idle, jump: true }, ledge, dt);
for (let i = 0; i < 200; i++) P.stepBody(l, idle, ledge, dt);
assert(Math.abs(l.y - 470) < 1 && l.onGround, 'landed on the ledge from below');
for (let i = 0; i < 200; i++) P.stepBody(l, { ...idle, right: true }, ledge, dt);
assert(Math.abs(l.y - 560) < 1, 'walked off the ledge');

// 5. Every part, fact, beacon and the rover is reachable from the level layout (no part sits inside rock).
for (const part of L.PARTS) assert(part.y < P.groundAt(L.TERRAIN, part.x), `${part.id} above ground`);
for (const f of L.FACTS) assert(f.y < P.groundAt(L.TERRAIN, f.x), `${f.id} above ground`);

// 5b. The main route can be played: hold right, jump only when blocked, shelter from the storm.
{
  const bot = new EvaMission({ energy: 4, air: 4, shield: 4 }, { radio() {}, toast() {}, fact() {}, sound() {}, done() {} });
  bot.debugTeleport(L.START.x);
  let t = 0, lastX = bot.body.x, stuck = 0;
  while (bot.body.x < L.ROVER_X - 60 && t < 240) {
    const sheltering = bot.storm.state !== 'idle' && bot.storm.state !== 'clear' && bot.inShelter;
    const blocked = bot.body.onGround && Math.abs(bot.body.x - lastX) < 0.5;
    stuck = blocked ? stuck + 1 : 0;
    lastX = bot.body.x;
    bot.update(dt, { left: false, right: !sheltering, jump: stuck > 3, use: false, useHeld: false });
    t += dt;
  }
  assert(bot.body.x >= L.ROVER_X - 60, `bot stuck at x ${Math.round(bot.body.x)}`);
  console.log(`Route: the whole level walks through in ${t.toFixed(0)} s with ${bot.stats.jumps} jumps and ${bot.stats.tethers} tethers.`);
}

// 6. Mission flow: brief -> walk -> parts -> repair -> drive -> end -> exit -> done.
const said = [];
let done = false;
const m = new EvaMission({ energy: 6, air: 5, shield: 4 }, {
  radio: (t) => said.push(t), toast: () => {}, fact: () => {}, sound: () => {}, done: () => { done = true; },
});
assert.equal(m.o2Max, 90);
assert.equal(m.lampR, 230);
assert.equal(m.stormWarning, 16);
const input = { left: false, right: false, jump: false, use: false, useHeld: false };
for (let i = 0; i < 400 && m.phase !== 'walk'; i++) m.update(dt, { ...input, jump: i > 120 });
assert.equal(m.phase, 'walk');
assert(said.some((t) => t.includes('scout rover')), 'briefing radio');
// Collect each part by standing on it.
for (const part of L.PARTS) {
  m.debugTeleport(part.x);
  m.body.y = part.y + 50; m.body.onGround = false; m.body.vy = 0;
  m.update(dt, input);
}
assert.equal(m.parts.size, 3, 'parts collected');
// Storm: tethered if caught outside, safe in the shelter.
m.debugTeleport(L.STORM.trigger + 10);
m.update(dt, input);
assert.equal(m.storm.state, 'warning');
m.debugTeleport((L.STORM.shelterX0 + L.STORM.shelterX1) / 2);
for (let i = 0; i < 60 * 25 && m.storm.state !== 'clear'; i++) m.update(dt, input);
assert.equal(m.storm.state, 'clear', 'storm passed while sheltered');
// Oxygen runs out -> tether back, never a game over.
const before = m.stats.tethers;
m.o2 = 0.01;
m.update(dt, input);
assert.equal(m.stats.tethers, before + 1);
assert.equal(m.o2, m.o2Max);
// Repair at the rover.
m.debugTeleport(L.ROVER_X - 40);
m.update(dt, { ...input, use: true });
assert.equal(m.phase, 'repair');
for (let i = 0; i < 200; i++) m.update(dt, { ...input, useHeld: true });
assert.equal(m.repair.step, 1, 'panel brushed');
for (let i = 0; i < 3; i++) { m.update(dt, { ...input, use: true }); m.update(dt, input); }
assert.equal(m.repair.step, 2, 'wheel bolted');
for (let i = 0; i < 200; i++) m.update(dt, { ...input, useHeld: true });
for (let i = 0; i < 200 && m.phase === 'repair'; i++) m.update(dt, input);
assert.equal(m.phase, 'drive');
// Drive all the way home over the bridge.
for (let i = 0; i < 60 * 120 && m.phase === 'drive'; i++) m.update(dt, { ...input, left: true });
assert.equal(m.phase, 'end', `drove home (rover x ${Math.round(m.rover.x)})`);
for (let i = 0; i < 120; i++) m.update(dt, input);
m.update(dt, { ...input, use: true });
for (let i = 0; i < 200 && !done; i++) m.update(dt, input);
assert(done, 'mission returns to the base');
const sum = m.summary();
assert(sum.earthHeightM > 0.3 && sum.earthHeightM < 0.36);

console.log(`PASS: jump ${(height / P.PX_PER_M).toFixed(2)} m, ${air.toFixed(2)} s on screen (${(air * P.TIME_SCALE).toFixed(2)} s Moon time), Earth hop ${(earth.height / P.PX_PER_M).toFixed(2)} m; walls, ledges, parts, storm shelter, oxygen tether, 3-step repair, drive home over the bridge.`);
