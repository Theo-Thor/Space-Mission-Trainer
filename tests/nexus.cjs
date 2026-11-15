// Checks the NEXUS rules: every allowed path ends solved after exactly 11 turns,
// both orders of a pair merge to the same cube, and illegal moves are refused.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file) {
  const m = new Module(file, module);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return m.exports;
}
const { NexusCube, NexusRun, TIMELINE, TOTAL_TURNS, FACE_ORDER, rotate } = load('src/nexus/cube.ts');

// Quarter turns: four in a row are the identity; a turn then its inverse is the identity.
for (let axis = 0; axis < 3; axis++) {
  let v = [1, 2, 3];
  for (let i = 0; i < 4; i++) v = rotate(v, axis, 1);
  assert.deepEqual(v, [1, 2, 3]);
  assert.deepEqual(rotate(rotate([1, 2, 3], axis, 1), axis, -1), [1, 2, 3]);
}
const solved = new NexusCube();
assert(solved.isSolved());
for (const face of FACE_ORDER) {
  const c = new NexusCube();
  for (let i = 0; i < 4; i++) c.apply({ face, dir: 1 });
  assert(c.isSolved(), `four ${face} turns return to solved`);
}

assert.equal(TIMELINE.reduce((n, s) => n + s.moves.length, 0), TOTAL_TURNS);
const start = new NexusRun();
assert(!start.cube.isSolved(), 'the run must start scrambled');
const startCounts = start.cube.counts();
assert(FACE_ORDER.some((f) => startCounts[f] < 9));

// Every combination of pair orders (2^pairs paths).
const pairs = TIMELINE.filter((s) => s.moves.length === 2).length;
let paths = 0;
for (let mask = 0; mask < 1 << pairs; mask++) {
  const run = new NexusRun();
  let p = 0;
  const merges = [];
  for (const step of TIMELINE) {
    let order = step.moves;
    if (step.moves.length === 2) { if (mask & (1 << p)) order = [...step.moves].reverse(); p++; }
    for (const move of order) {
      assert.equal(run.legal().length, step.moves.length === 2 && move === order[0] ? 2 : 1);
      assert(run.play(move));
    }
    merges.push(run.cube.key());
  }
  assert.equal(run.turns, TOTAL_TURNS);
  assert(run.done);
  assert(run.cube.isSolved(), `path ${mask} ends solved`);
  if (mask === 0) globalThis.reference = merges;
  else assert.deepEqual(merges, globalThis.reference, 'paths merge after every step');
  paths++;
}

// Illegal moves are refused and change nothing.
const run = new NexusRun();
const before = run.cube.key();
assert.equal(run.play({ face: 'px', dir: 1 }), false);
assert.equal(run.play({ face: 'nz', dir: -1 }), false, 'wrong direction is refused');
assert.equal(run.cube.key(), before);
assert.equal(run.turns, 0);

// The first move of a pair changes the meters differently from the other order.
const a = new NexusRun(); const b = new NexusRun();
a.play(TIMELINE[0].moves[0]); b.play(TIMELINE[0].moves[0]);
a.play(TIMELINE[1].moves[0]); b.play(TIMELINE[1].moves[1]);
assert.notDeepEqual(a.cube.counts(), b.cube.counts(), 'pair orders differ for a while');

console.log(`PASS: ${paths} paths, all solved after ${TOTAL_TURNS} turns, pairs merge, illegal moves refused. Start meters: ${JSON.stringify(startCounts)}`);
