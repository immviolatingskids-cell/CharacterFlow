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
const debugPort=9333;
const browser=spawn(edge,['--headless=new',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','about:blank'],{stdio:'ignore'});

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
async function endpoint(path,options){for(let attempt=0;attempt<40;attempt++){try{const response=await fetch(`http://127.0.0.1:${debugPort}${path}`,options);if(response.ok)return response.json()}catch{}await wait(100)}throw new Error('Edge DevTools endpoint unavailable')}

let socket;
try{
  const page=await endpoint(`/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/`)}`,{method:'PUT'});
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();const exceptions=[];
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)}if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text)});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
  await command('Runtime.enable');await command('Page.enable');await wait(1800);
  const evaluate=async expression=>{const response=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.text||'browser evaluation failed');return response.result.value};
  await evaluate("localStorage.clear();window.prompt=()=> 'Maya';document.getElementById('surpriseBtn').click()");await wait(150);
  await evaluate("document.querySelector('[data-pack-toggle=\"tech-girlie\"]').click()");
  await evaluate("document.querySelector('[data-pack-toggle=\"streetwear\"]').click()");
  await evaluate("document.querySelector('[data-pack-toggle=\"booktok\"]').click()");
  await evaluate("document.getElementById('sceneBtn').click();document.getElementById('inspectBtn').click()");await wait(300);
  const result=await evaluate("(()=>{const parsed=JSON.parse(document.getElementById('inspectorOutput').textContent);return {title:document.title,character:document.getElementById('studioTitle').textContent,activePacks:[...document.querySelectorAll('.pack-row.active b')].map(node=>node.textContent),scene:document.getElementById('sceneText').textContent,inspectorVisible:!document.getElementById('inspector').classList.contains('hidden'),resolverVersion:parsed.resolver.version,normalizedMix:parsed.normalizedMix,resolvedCategories:Object.keys(parsed.resolved),provenanceCategories:Object.keys(parsed.provenance)}})()");
  await evaluate("document.getElementById('compileBtn').click()");await wait(100);
  result.compilerStatus=await evaluate("document.getElementById('console').textContent");
  result.screenshot=(await command('Page.captureScreenshot',{format:'png'})).data.length>1000;
  assert.equal(exceptions.length,0);assert.match(result.character,/Nova/);assert.deepEqual(result.activePacks,['Tech Girlie','Streetwear','Booktok']);assert.equal(result.scene,'Café');assert.equal(result.inspectorVisible,true);assert.equal(result.resolverVersion,'1.1');assert.equal(result.normalizedMix.length,3);assert.equal(result.resolvedCategories.length,9);assert.equal(result.provenanceCategories.length,9);assert.match(result.compilerStatus,/MockCompiler/);assert.equal(result.screenshot,true);
  console.log(JSON.stringify(result,null,2));
}finally{
  socket?.close();browser.kill();await Promise.race([once(browser,'exit'),wait(2000)]);server.close();
  for(let attempt=0;attempt<10;attempt++){try{rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:100});break}catch(error){if(attempt===9)throw error;await wait(200)}}
}
