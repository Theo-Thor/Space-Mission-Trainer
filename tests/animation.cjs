const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file) {
  const m = new Module(file, module);
  m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
  return m.exports;
}
const {CharacterAnimator} = load('src/systems/animation.ts');
const {AutomaticDoor,doorPanels,actorFootprint,overlaps} = load('src/systems/doors.ts');
const dt = 1/60;
for (const axis of ['h','v']) {
  const d = {id:'test',x:0,y:0,w:axis==='h'?176:56,h:axis==='h'?56:176,axis};
  const door = new AutomaticDoor(d);
  const body = actorFootprint({x:d.w/2,y:d.h/2});
  assert(door.blocks(body));
  for (let cycle=0;cycle<10;cycle++) {
    for(let i=0;i<60;i++) door.update(dt,[body]);
    assert.equal(door.openness,1);
    assert(!door.blocks(body));
    for(let i=0;i<180;i++) { door.update(dt,[body]); assert.equal(door.openness,1); }
    for(let i=0;i<30;i++) door.update(dt,[]);
    assert.equal(door.openness,1,'close delay');
    for(let i=0;i<120;i++) door.update(dt,[]);
    assert.equal(door.openness,0);
    assert(door.blocks(body));
  }
  // Re-enter while closing: reverse immediately, without crossing the body.
  door.openness=0.8;
  door.update(dt,[body]);
  assert(door.openness>0.8);
  assert(!doorPanels(d,door.openness).some(p=>overlaps(p,body)));
  // Approach at full player speed; panel collision must stop passage until clear.
  door.openness=0;
  const a={x:axis==='h'?88:-140,y:axis==='h'?-140:88};
  let crossed=false;
  for(let i=0;i<180;i++) {
    door.update(dt,[actorFootprint(a)]);
    const next={x:a.x+(axis==='v'?230*dt:0),y:a.y+(axis==='h'?230*dt:0)};
    if(!door.blocks(actorFootprint(next))) Object.assign(a,next);
    assert(!door.blocks(actorFootprint(a)),'no panel overlap during crossing');
    if(axis==='h'?a.y>d.h+20:a.x>d.w+20) { crossed=true; break; }
  }
  assert(crossed);
}
function walk(fps,speed) {
  const animator=new CharacterAnimator();
  const a={x:0,y:0,walking:false,walkPhase:0}; animator.track(a);
  for(let i=0;i<fps;i++) {a.x+=speed/fps; animator.update(a,1/fps);}
  return {a,animator};
}
const normal=walk(60,230), slow=walk(60,115), high=walk(120,230);
assert(Math.abs(normal.a.walkPhase-high.a.walkPhase)<1e-8,'frame rate independent stride');
assert(Math.abs(normal.a.walkPhase-(230*Math.PI*2/112)%(Math.PI*2))<1e-8);
assert(slow.a.walking);
const phase=normal.a.walkPhase;
for(let i=0;i<60;i++) normal.animator.update(normal.a,dt);
assert.equal(normal.a.walkPhase,phase);
assert(!normal.a.walking);
assert(normal.a.gait<0.001,'smooth settling');
normal.a.x+=1000; normal.animator.update(normal.a,dt);
assert(!normal.a.walking,'teleport is not a stride');
console.log('PASS: both door axes, 20 repeated cycles, occupancy hold, delayed close, reversal, full-speed crossing, frame-rate independent gait, stopping and teleport.');
