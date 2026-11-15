// Production-browser regression check; uses installed Chrome and Node's native CDP WebSocket.
// Run after npm run build: node tests/player-art-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'selene-player-art-'));
const root = path.resolve(__dirname, '../dist');
const chrome = process.env.SELENE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert(fs.existsSync(path.join(root, 'index.html')), 'Run npm run build first');
assert(fs.existsSync(chrome), 'Set SELENE_CHROME to an installed Chrome executable');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  const target = file === root ? path.join(root, 'index.html') : file;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end(); return; }
  const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.mp4':'video/mp4' };
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = path.join(output, 'chrome-profile');
  const browser = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank'], { windowsHide:true, stdio:'ignore' });
  let socket;
  let send;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i=0; i<100 && !fs.existsSync(portFile); i++) await delay(100);
    assert(fs.existsSync(portFile), 'Chrome debugging endpoint did not start');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(t => t.type === 'page');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen=resolve; socket.onerror=reject; });
    let seq=0;
    const pending=new Map();
    const errors=[];
    socket.onmessage=event=>{
      const msg=JSON.parse(event.data);
      if(msg.id && pending.has(msg.id)) {
        const p=pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
      }
      if(msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
      if(msg.method==='Fetch.requestPaused') void send('Fetch.fulfillRequest', {requestId:msg.params.requestId,responseCode:404,body:''});
    };
    send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},10000);
      pending.set(id,{resolve,reject,timer}); socket.send(JSON.stringify({id,method,params}));
    });
    const evaluate=async expression=>{
      const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const snapshot=()=>evaluate('window.__SELENE__.snapshot()');
    const until=async(expression,message,timeout=6000)=>{
      for(let elapsed=0;elapsed<timeout;elapsed+=80){if(await evaluate(expression))return;await delay(80);}
      throw new Error(message);
    };
    const key=async(k,ms=230,capture)=>{
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code:`Key${k.toUpperCase()}`});
      if(capture){await delay(ms/2);await screenshot(capture);await delay(ms/2);}else await delay(ms);
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code:`Key${k.toUpperCase()}`});
      await delay(500);
    };
    const screenshot=async(name)=>{
      assert(await evaluate('document.querySelector("#cinematic").hidden && document.querySelector("#registration").hidden'), 'Startup overlay obscures game');
      const image=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(image.data,'base64'));
    };
    const startGame=async()=>{
      await until('!!window.__SELENE__','Game did not initialize');
      // Let loadeddata finish before skipping; it otherwise reopens the cinematic.
      await until('document.querySelector("#cine").readyState >= 2 || !!document.querySelector("#cine").error','Cinematic did not settle');
      await evaluate('document.querySelector("#skip-cine").click(); document.querySelector("#name-input").value="Artwork test"; document.querySelector("#reg-form").requestSubmit()');
      await until('document.querySelector("#registration").hidden','Registration did not finish');
      await delay(3000);
    };
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`
      window.__artCheck={seen:[],last:'',blends:0,walkFrames:{},environment:[]};
      const original=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(source,...args){
        if(source instanceof HTMLImageElement && source.src.includes('/assets/facility/')) {
          const name=source.src.split('/').pop();
          if(!window.__artCheck.environment.includes(name))window.__artCheck.environment.push(name);
        }
        const artSrc=source instanceof HTMLImageElement ? source.src : (source && source.dataset && source.dataset.src) || '';
        if(artSrc.includes('/astronaut-v2/')) {
          const name=artSrc.split('/').pop();
          if(name.endsWith('-walk.png')) {
            const key=name+':'+args[1];
            const frames=window.__artCheck.walkFrames[key]??=[];
            if(!frames.includes(args[0]))frames.push(args[0]);
          }
          if(!window.__artCheck.seen.includes(name))window.__artCheck.seen.push(name);
          if(this.canvas.id==='view')window.__artCheck.last=name;
        }
        if(this.canvas.id==='view' && source instanceof HTMLCanvasElement && source.width===320)window.__artCheck.blends++;
        return original.call(this,source,...args);
      };
    `});
    const url=`http://127.0.0.1:${server.address().port}/`;
    await send('Page.navigate',{url});
    await startGame();
    for(const [room,x,y] of [['reception',1074,1440],['lobby',1074,844],['briefing',1074,320],['communications',290,850],['suit-bay',1885,850],['departure',2415,930]]) {
      await evaluate(`window.__SELENE__.teleport(${x},${y})`);await delay(1500);
      await screenshot('environment-'+room);
    }
    assert.equal((await evaluate('window.__artCheck.environment')).length,12,'Environment assets did not all render');
    const frameTiming=await evaluate(`new Promise(resolve=>{
      const times=[];let last=performance.now();
      function sample(now){times.push(now-last);last=now;if(times.length<60)requestAnimationFrame(sample);else{times.sort((a,b)=>a-b);resolve({median:times[30],p95:times[57]});}}
      requestAnimationFrame(sample);
    })`);
    console.log('Frame timing (ms): '+JSON.stringify(frameTiming));
    await evaluate('window.__SELENE__.teleport(1074,1440)');
    const directions=[['w','up','back'],['s','down','front'],['a','left','left'],['d','right','right']];
    async function checkDirections(outfit) {
      for(const [input,facing,view] of directions) {
        const before=await snapshot(); await key(input,650,`${outfit}-${view}-walking`); const after=await snapshot();
        assert.equal(after.facing,facing);
        assert(Math.hypot(after.x-before.x,after.y-before.y)>20,'Keyboard movement did not move player');
        await until(`window.__artCheck.last === ${JSON.stringify(`${outfit}-${view}.png`)}`,'Walk pose did not settle to idle');
        assert.equal(after.walking,false,'Stopping should clear walking');
      }
    }
    await checkDirections('uniform');
    await key('s',50); await screenshot('uniform-in-game');
    await evaluate('window.__SELENE__.teleport(1074,1640)'); await key('s',600);
    const wall=await snapshot(); assert(wall.y<=1652); assert.equal(wall.walking,false);
    await evaluate('window.__SELENE__.teleport(1074,1340)'); await key('w',1250);
    const door=await snapshot(); assert(door.y<1176); assert.equal(door.doors[0].openness,1);

    async function talk(id, expectedPhase) {
      await evaluate(`window.__SELENE__.interact(${JSON.stringify(id)})`);
      assert((await snapshot()).dialogue,`No dialogue for ${id}`);
      for(let i=0;i<40 && (await snapshot()).dialogue;i++) {
        await evaluate('window.__SELENE__.advance()'); await delay(45);
      }
      assert.equal((await snapshot()).phase,expectedPhase);
    }
    // Free-roam Chapter 1: the radio is on from the start and talks never change the phase.
    assert((await snapshot()).radioAcquired);
    await talk('chen','NEED_SUIT_EQUIPPING');
    await talk('leo','NEED_SUIT_EQUIPPING');
    await talk('nia','NEED_SUIT_EQUIPPING');
    await evaluate('window.__SELENE__.teleport(1885,900); window.__SELENE__.interact("suit")');
    await until('window.__SELENE__.snapshot().suitEquipped','Equipment sequence did not complete');
    assert(await evaluate('window.__artCheck.blends>0'),'Outfit transition never rendered');
    await checkDirections('spacesuit');
    await key('s',50); await screenshot('spacesuit-in-game');
    assert.equal((await evaluate('window.__artCheck.seen.filter(name=>!name.endsWith("-walk.png"))')).length,8);
    const walkFrames=await evaluate('window.__artCheck.walkFrames');
    for(const outfit of ['uniform','spacesuit'])for(const row of [0,512,1024,1536]) {
      assert.equal(walkFrames[`${outfit}-walk.png:${row}`]?.length,4,`Missing animated frames: ${outfit}, row ${row}`);
    }
    await talk('riley','NEED_BOARDING');
    await until('window.__SELENE__.snapshot().companionAtHatch','Riley failed to arrive');
    await evaluate('window.__SELENE__.teleport(2608,844)');
    await talk('hatch','NEED_BOARDING');
    // No spaceship interior and no chapter cards: boarding rolls the flight, touchdown continues at the base.
    await until('window.__SELENE__.snapshot().scene === "voyage"','Boarding did not start the flight',8000);
    await evaluate('window.__SELENE__.skipVoyage()');
    await until('window.__SELENE__.snapshot().scene === "lunar"','Touchdown did not continue at Selene Base');
    assert(await evaluate('document.querySelector("#arrival").hidden && document.querySelector("#complete").hidden'), 'No chapter cards after the flight');
    await delay(1600); await screenshot('moon-arrival');

    // NEXUS: open from the Grand Hall, play 11 turns, leave, and see the base react.
    await evaluate('window.__SELENE__.teleport(2390,1720)');
    await delay(1200); await screenshot('room-medical-dim');
    // A NEXUS key on the surface.
    await evaluate('window.__SELENE__.teleport(300,1900)');
    await until('window.__SELENE__.keys(0) === 1','Key was not picked up',4000);
    await screenshot('surface-key');
    // The cube rises out of the floor in the Grand Hall.
    await evaluate('window.__SELENE__.teleport(1700,600)');
    for (const [ms, name] of [[350, 'rise-1-warning'], [700, 'rise-2-iris'], [800, 'rise-3-lifting'], [800, 'rise-4-lock'], [700, 'rise-5-ignite'], [1400, 'nexus-pedestal'], [2200, 'nexus-idle-turn']]) {
      await delay(ms); await screenshot(name);
    }
    await evaluate('window.__SELENE__.nexus()');
    await until('!document.querySelector("#nexus").hidden','NEXUS did not open',8000);
    await delay(1500); await screenshot('nexus-open');
    // One key = one turn; the second turn is refused until another key is found.
    assert(await evaluate('window.__SELENE__.nexusPlay(0)'), 'First turn with one key');
    await until('document.querySelector("#nexus-turn").textContent.includes("Turn 2")','First turn did not finish');
    await delay(700);
    assert.equal(await evaluate('window.__SELENE__.nexusPlay(0)'), false, 'No key, no turn');
    await evaluate('document.querySelector(".nexus-choice").click()');
    assert(await evaluate('document.querySelector("#nexus-orbi-say").textContent.startsWith("Turning")'), 'ORBI explains a turn');
    await screenshot('nexus-explain');
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await evaluate('window.__SELENE__.keys(11)');
    await evaluate('window.__SELENE__.nexus()');
    await until('!document.querySelector("#nexus").hidden','NEXUS did not reopen',8000);
    for (let i = 1; i < 11; i++) {
      const before = await evaluate('document.querySelector("#nexus-turn").textContent');
      await until(`window.__SELENE__.nexusPlay(${i % 2}) || window.__SELENE__.nexusPlay(0)`,`NEXUS turn ${i + 1} refused`);
      await until(`document.querySelector("#nexus-turn").textContent !== ${JSON.stringify(before)}`,`NEXUS turn ${i + 1} did not finish`);
    }
    await until('!document.querySelector("#nexus-end").hidden','2048 ending did not appear');
    await screenshot('nexus-2048');
    await evaluate('document.querySelector("#nexus-end-leave").click()');
    await until('document.querySelector("#nexus").hidden && /(Selene Base is ready|rescue the scout rover)/.test(document.querySelector("#objective").innerText)','Base did not react to the solved cube');
    await evaluate('window.__SELENE__.teleport(705,1010); window.__SELENE__.interact("jun")');
    await until('(window.__SELENE__.advance(), String(window.__SELENE__.snapshot().line).includes("Every need is full"))','Crew line did not change after NEXUS');
    console.log('NEXUS: opened, 11 turns, 2048 ending, base and crew reacted.');

    // ROVER RESCUE: side-view EVA from the Rover Exit, through every zone, and back to the base.
    await until('(window.__SELENE__.advance(), !window.__SELENE__.snapshot().dialogue)','Dialogue did not close');
    await evaluate('window.__SELENE__.teleport(770,1790)');
    await delay(300);
    await until('(window.__SELENE__.interact("lu-eva"), window.__SELENE__.evaState() !== null)','EVA did not open');
    await until('window.__SELENE__.evaState()?.phase === "enter"','EVA did not start from the Rover Exit');
    await delay(900); await screenshot('eva-0-tilt');
    await until('window.__SELENE__.evaState()?.phase === "brief"','EVA briefing did not appear',6000);
    await delay(400); await screenshot('eva-1-brief');
    await key(' ', 60);
    await until('window.__SELENE__.evaState()?.phase === "walk"','EVA did not start walking');
    await key('d', 900);
    await key(' ', 60); await delay(500); await screenshot('eva-2-jump');
    await delay(2200);
    const evaShot = async (x, name, wait = 900) => { await evaluate(`window.__SELENE__.evaDo("teleport", ${x})`); await delay(wait); await screenshot(name); };
    await evaShot(2500, 'eva-3-boulders', 2400);
    await evaShot(3800, 'eva-4-ridge');
    await evaShot(5000, 'eva-5-crater');
    await evaShot(6400, 'eva-6-storm-warning', 1500);
    await evaluate('window.__SELENE__.evaDo("teleport", 7130)');
    await until('window.__SELENE__.evaState().storm === "active"','Storm did not start',25000);
    await delay(800); await screenshot('eva-7-storm-shelter');
    await until('window.__SELENE__.evaState().storm === "clear"','Storm did not clear',10000);
    await evaluate('window.__SELENE__.evaDo("parts")');
    await evaShot(8190, 'eva-8-rover');
    await key('e', 60);
    await until('window.__SELENE__.evaState().phase === "repair"','Repair did not start');
    await key('e', 900); await screenshot('eva-9-repair');
    await evaluate('window.__SELENE__.evaDo("repair")');
    await until('window.__SELENE__.evaState().phase === "drive"','Drive did not start');
    await evaluate('window.__SELENE__.evaDo("drive", 5200)');
    await key('a', 1500); await screenshot('eva-10-bridge');
    await evaluate('window.__SELENE__.evaDo("drive", 700)');
    await key('a', 3000);
    await until('window.__SELENE__.evaState().phase === "end"','Drive did not reach the airlock',8000);
    await delay(1400); await screenshot('eva-11-end');
    await key('e', 60);
    await until('window.__SELENE__.snapshot().scene === "lunar"','EVA did not return to the base',6000);
    await delay(600); await screenshot('eva-12-back');
    console.log('ROVER RESCUE: tilt in, brief, jump, zones, storm shelter, repair, drive home, back in the garage.');
    await until('!document.querySelector("#finale").hidden','Finale did not appear after NEXUS and the rover',6000);
    await delay(900); await screenshot('finale');
    await evaluate('document.querySelector("#finale-continue").click()');
    await until('document.querySelector("#finale").hidden','Finale did not close');

    // OPEN SURFACE: walk out south of the base, examine things; facts land in the Mission data panel.
    const surfaceShot = async (x, y, id, title, name) => {
      await evaluate(`window.__SELENE__.teleport(${x},${y})`);
      await delay(700);
      await evaluate(`window.__SELENE__.interact(${JSON.stringify(id)})`);
      await until(`document.querySelector('#datalog-list li.latest strong')?.textContent === ${JSON.stringify(title)}`, `No data for ${id}`);
      await delay(300); await screenshot(name);
    };
    await surfaceShot(1390, 2390, 'lu-ltv', 'MOON ROVER', 'surface-1-rover');
    await surfaceShot(820, 2470, 'lu-crater-big', 'IMPACT CRATER', 'surface-2-crater');
    await surfaceShot(2680, 2250, 'lu-drill', 'ICE DRILL', 'surface-3-drill');
    await surfaceShot(2620, 2890, 'lu-solar', 'SOLAR MASTS', 'surface-4-solar');
    await surfaceShot(1590, 3020, 'lu-boulder', 'BOULDER TRACK', 'surface-5-boulder');
    await surfaceShot(395, 3060, 'lu-seismo', 'MOONQUAKES', 'surface-6-seismo');
    assert(await evaluate('document.querySelector("#inspect").hidden'), 'Facts must not open the closable popup');
    console.log('SURFACE: rover, craters, drill, solar masts, boulder track, seismometer; facts in the Mission data panel.');

    // DEMO MENU: from registration straight into the NEXUS cube.
    await send('Page.reload',{ignoreCache:true});
    await until('!!window.__SELENE__ && !!document.querySelector("#demo-jump button[data-jump=nexus]")','Demo menu missing');
    await until('!document.querySelector("#cinematic").hidden || !document.querySelector("#registration").hidden','Intro did not start');
    await evaluate('document.querySelector("#skip-cine, #cinematic button")?.click()');
    await until('document.querySelector("#cinematic").hidden && !document.querySelector("#registration").hidden','Registration did not appear',12000);
    await delay(300); fs.writeFileSync(path.join(output,'demo-menu.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await evaluate('document.querySelector("#demo-jump button[data-jump=nexus]").click()');
    await until('!document.querySelector("#nexus").hidden','Demo jump to NEXUS failed',12000);
    await delay(900); await screenshot('demo-nexus');
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    console.log('DEMO MENU: jumped from registration straight into NEXUS.');

    // One broken frame must not crash the renderer or prevent keyboard movement.
    await send('Fetch.enable',{patterns:[{urlPattern:'*uniform-front.png',requestStage:'Request'}]});
    await send('Page.reload',{ignoreCache:true});
    await delay(200);
    await startGame();
    await evaluate('window.__SELENE__.teleport(1074,1440)');
    await key('s'); await screenshot('missing-art-fallback');
    assert((await snapshot()).y>1460,'Missing image prevented movement');
    assert.equal(await evaluate('window.__artCheck.seen.includes("uniform-front.png")'),false);
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS: twelve environment assets, six room captures, all eight character views and 32 walking frames, keyboard movement/stopping, wall and door collisions, outfit crossfade, radio, NPC dialogues, Riley path, boarding into the spacecraft and missing-image fallback.');
    console.log('Screenshots: '+output);
  } finally {
    if(send) { try { await send('Browser.close'); } catch {} }
    socket?.close(); browser.kill(); server.close();
  }
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
