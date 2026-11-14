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
        if(source instanceof HTMLImageElement && source.src.includes('/astronaut-v2/')) {
          const name=source.src.split('/').pop();
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
    await talk('chen','NEED_COMMUNICATIONS_BRIEFING');
    await talk('leo','NEED_RADIO_PICKUP');
    await evaluate('window.__SELENE__.interact("radio")');
    assert((await snapshot()).radioAcquired);
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
    await until('window.__SELENE__.snapshot().chapterCompleted','Chapter did not complete');

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
    console.log('PASS: twelve environment assets, six room captures, all eight character views and 32 walking frames, keyboard movement/stopping, wall and door collisions, outfit crossfade, radio, NPC dialogues, Riley path, chapter completion and missing-image fallback.');
    console.log('Screenshots: '+output);
  } finally {
    if(send) { try { await send('Browser.close'); } catch {} }
    socket?.close(); browser.kill(); server.close();
  }
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
