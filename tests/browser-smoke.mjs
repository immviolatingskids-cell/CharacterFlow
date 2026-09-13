import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {extname,join,normalize} from 'node:path';

const root=normalize(new URL('..',import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const server=createServer(async(request,response)=>{try{const pathname=request.url==='/'?'index.html':request.url.split('?')[0].replace(/^\//,'');const file=join(root,pathname);if(!file.startsWith(root))throw new Error('invalid path');response.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');response.end(await readFile(file))}catch{response.statusCode=404;response.end('not found')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const profile=mkdtempSync(join(tmpdir(),'promptforge-browser-'));
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugProbe=createServer();await new Promise(resolve=>debugProbe.listen(0,'127.0.0.1',resolve));const debugPort=debugProbe.address().port;await new Promise(resolve=>debugProbe.close(resolve));
const browser=spawn(edge,['--headless=new',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore'});

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
async function endpoint(path,options){for(let attempt=0;attempt<80;attempt++){try{const response=await fetch(`http://127.0.0.1:${debugPort}${path}`,options);if(response.ok)return response.json()}catch{}await wait(100)}throw new Error('Edge DevTools endpoint unavailable')}

let socket;
try{
  const page=await endpoint(`/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/`)}`,{method:'PUT'});
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();const exceptions=[];
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)}if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text)});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
  await command('Runtime.enable');await command('Page.enable');await wait(1800);
  const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text||'browser evaluation failed');return response.result.value};
  let appReady=false;for(let attempt=0;attempt<80;attempt++){appReady=await evaluate("document.readyState==='complete'&&!!document.getElementById('workspaceRoot')");if(appReady)break;await wait(100)}if(!appReady)throw new Error('PromptForge app did not finish loading');
  await evaluate("localStorage.clear();document.querySelector('[data-workspace=\"create\"]').click();document.getElementById('surpriseBtn').click()");await wait(1300);
  await evaluate("document.getElementById('browseStyleBtn').click();const toggle=document.querySelector('[data-drawer-pack-toggle=\"tech-girlie\"]');if(!toggle.checked)toggle.click()");await wait(100);
  await evaluate("document.querySelector('[data-close-drawer]').click();document.getElementById('sceneBtn').click();document.querySelector('[data-scene-id=\"cafe\"]').click();document.getElementById('inspectBtn').click()");await wait(300);
  const result=await evaluate("(()=>({title:document.title,character:document.getElementById('studioTitle').textContent,activePacks:[...document.querySelectorAll('.mix-card b')].map(node=>node.textContent),scene:document.getElementById('sceneText').textContent,takes:document.querySelectorAll('[data-take]').length,forge:document.querySelector('.forge-orbital').dataset.forgeState,stageButtonFont:getComputedStyle(document.getElementById('newTakeBtn')).fontSize}))()");
  await evaluate("document.querySelector('[data-close-drawer]').click();document.getElementById('commandTrigger').click();document.getElementById('commandInput').value='Focus';document.getElementById('commandInput').dispatchEvent(new Event('input'));document.getElementById('commandInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))");await wait(100);
  result.focusMode=await evaluate("document.body.classList.contains('focus-mode')");
  await evaluate("document.querySelector('.sidenav [data-workspace=\"library\"]').click();document.querySelector('[data-library-family=\"gaming\"]').click();document.getElementById('librarySearch').value='Speedrunning';document.getElementById('librarySearch').dispatchEvent(new Event('input',{bubbles:true}))");await wait(120);
  result.library=await evaluate("(()=>({workspace:document.querySelector('.library-head h1').textContent,category:document.querySelector('.library-browser-head h2').textContent,families:document.querySelectorAll('[data-library-family]').length,detail:document.querySelector('.detail-head h2').textContent,query:document.getElementById('librarySearch').value,starter:document.querySelector('.detail-head .library-kicker').textContent,gemini:document.getElementById('libraryExpand').textContent}))()");
  await command('Emulation.setDeviceMetricsOverride',{width:741,height:600,deviceScaleFactor:1,mobile:false});await wait(150);
  result.laptopOverflow=await evaluate("document.documentElement.scrollWidth<=window.innerWidth");
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(150);
  result.mobileOverflow=await evaluate("document.documentElement.scrollWidth<=window.innerWidth");
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  result.reducedMotion=await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
  result.compilerStatus=await evaluate("document.getElementById('console').textContent");
  result.screenshot=(await command('Page.captureScreenshot',{format:'png'})).data.length>1000;
  assert.equal(exceptions.length,0);assert.match(result.character,/Nova/);assert.ok(result.activePacks.includes('Tech Girlie'));assert.equal(result.scene,'Café');assert.ok(result.takes>=1);assert.equal(result.forge,'idle');assert.equal(result.focusMode,true);assert.match(result.library.workspace,/Library/);assert.match(result.library.category,/Interests/);assert.equal(result.library.families,1);assert.equal(result.library.detail,'Gaming');assert.equal(result.library.query,'Speedrunning');assert.equal(result.library.starter,'STARTER STRUCTURE');assert.equal(result.library.gemini,'Prepare review');assert.equal(result.laptopOverflow,true);assert.equal(result.mobileOverflow,true);assert.equal(result.reducedMotion,true);assert.equal(result.stageButtonFont,'14px');assert.match(result.compilerStatus,/MockCompiler/);assert.equal(result.screenshot,true);
  console.log(JSON.stringify(result,null,2));
}finally{
  socket?.close();browser.kill();await Promise.race([once(browser,'exit'),wait(2000)]);server.close();
  for(let attempt=0;attempt<10;attempt++){try{rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:100});break}catch(error){if(attempt===9)console.warn(`Temporary browser profile cleanup deferred: ${error.code}`);else await wait(200)}}
}
