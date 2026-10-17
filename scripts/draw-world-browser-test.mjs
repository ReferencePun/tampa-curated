import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';
import {bundle} from './lab-package.mjs';
import {exportPath} from '../src/creative-lab/experiments/draw-a-world/path.js';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321',url=origin+'/tampa-curated/lab/draw-a-world/';
const out=path.resolve('test-results/draw-world');await mkdir(out,{recursive:true});
const {files}=await bundle('draw-a-world');
assert.ok(files['vendor/three/three.module.js']&&files['vendor/three/three.core.js']&&files['vendor/three/LICENSE']);
assert.ok(!Object.keys(files).some(file=>file.includes('draft-plate')||file.includes('line-field')));
const server=createServer((req,res)=>{const file=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1);if(!files[file]){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');res.end(files[file]);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browsers=[];
const portableURL=`http://127.0.0.1:${server.address().port}/example.html`;
try{for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.TEST_ENGINE&&process.env.TEST_ENGINE!==name)continue;
 const browser=await engine.launch();browsers.push(browser);const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const root=page.locator('.daw'),stage=page.locator('.daw-stage'),host=page.locator('[data-lab-host]');
 await page.goto(url);await stage.waitFor();await stage.scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-mode','draw');await expect(page.locator('canvas')).toHaveCount(0);
 await page.locator('[data-demo-shell]').screenshot({path:path.join(out,`${name}-blank.png`)});
 async function draw(fn){
  await page.locator('[data-action=draw]').click();await stage.scrollIntoViewIfNeeded();const box=await stage.boundingBox();
  for(let i=0;i<=50;i++){const p=fn(i/50);await page.mouse.move(box.x+p[0]*box.width,box.y+p[1]*box.height);if(i===0)await page.mouse.down();}
  await page.mouse.up();await expect(root).toHaveAttribute('data-error','false');await expect(root).toHaveAttribute('data-mode','model');
 }
 await draw(t=>[.13+.72*t,.75-.5*t]);await expect(page.locator('canvas')).toHaveCount(1);const first=await root.getAttribute('data-signature');
 assert.ok(JSON.parse(await host.getAttribute('data-settings')).path.length>3);
 const buildCount=Number(await root.getAttribute('data-builds'));
 await page.locator('[data-action=enter]').click();await expect(root).toHaveAttribute('data-mode','travel');
 async function travel(value){await page.locator('.daw-journey input').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);await expect.poll(async()=>Number(await root.getAttribute('data-progress'))).toBeCloseTo(value/1000,3);}
 await travel(550);const firstCamera=await root.getAttribute('data-camera');
 await travel(300);const camera30=await root.getAttribute('data-camera'),orientation30=await root.getAttribute('data-orientation');await travel(800);await travel(300);
 assert.equal(await root.getAttribute('data-camera'),camera30);assert.equal(await root.getAttribute('data-orientation'),orientation30,'Camera reverses exactly along the generated path');
 await stage.hover();await page.mouse.wheel(0,140);await expect.poll(async()=>Number(await root.getAttribute('data-progress'))).toBeGreaterThan(.3);
 await page.mouse.wheel(0,-140);await expect.poll(async()=>Number(await root.getAttribute('data-progress'))).toBeCloseTo(.3,3);
 assert.equal(Number(await root.getAttribute('data-builds')),buildCount,'Travel must not rebuild geometry');
 await page.locator('[data-action=paper]').click();await expect(page.locator('.daw-sheet')).toBeVisible();await expect(page.locator('.daw-handle').first()).toBeVisible();
 const point=page.locator('.daw-handle').nth(12);await point.focus();await point.press('ArrowUp');await expect.poll(()=>root.getAttribute('data-signature')).not.toBe(first);
 const afterEdit=await root.getAttribute('data-signature');await page.locator('[data-action=enter]').click();await travel(0);await expect(root).toHaveAttribute('data-mode','edit');
 await draw(t=>[.12+.76*t,.5+.22*Math.sin(t*Math.PI*2)]);const second=await root.getAttribute('data-signature');assert.notEqual(second,afterEdit);
 await page.locator('[data-action=enter]').click();await travel(550);assert.notEqual(await root.getAttribute('data-camera'),firstCamera,'A different drawing must generate a different camera route');
 // Settings preserve travel position, rebuild once after the slider settles, and alter real geometry.
 await page.locator('[data-setting=density]').evaluate(e=>{for(let n=40;n<=48;n++){e.value=String(n);e.dispatchEvent(new Event('input',{bubbles:true}));}});
 await expect.poll(()=>root.getAttribute('data-signature')).not.toBe(second);await expect(root).toHaveAttribute('data-mode','travel');await expect.poll(async()=>Number(await root.getAttribute('data-progress'))).toBeCloseTo(.55,3);
 await page.locator('[data-setting=guides]').uncheck();await page.waitForTimeout(220);await expect(page.locator('.daw-status')).not.toContainText('tight');
 await page.locator('[data-examples]').selectOption('spiral');await expect(root).toHaveAttribute('data-mode','model');await expect(page.locator('[data-setting=style]')).toHaveValue('staircase');
 await page.locator('[data-demo-shell]').screenshot({path:path.join(out,`${name}-spiral.png`)});
 await page.locator('[data-action=enter]').click();await travel(620);await page.locator('[data-demo-shell]').screenshot({path:path.join(out,`${name}-inside.png`)});
 const savedPoints=JSON.parse(await host.getAttribute('data-settings')).path;
 const dl=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await dl,pathFile=path.join(out,`${name}-path.json`);await download.saveAs(pathFile);assert.deepEqual(JSON.parse(await readFile(pathFile,'utf8')).points,savedPoints);
 await page.locator('[data-action=erase]').click();await expect(root).toHaveAttribute('data-mode','draw');assert.deepEqual(JSON.parse(await host.getAttribute('data-settings')).path,[]);
 await page.locator('.daw-file input').setInputFiles(pathFile);await expect(root).toHaveAttribute('data-mode','model');assert.deepEqual(JSON.parse(await host.getAttribute('data-settings')).path,savedPoints);
 await page.locator('.il-presets summary').click();await page.locator('[data-preset-name]').fill('A real drawn world');await page.locator('[data-save]').click();await page.locator('[data-action=erase]').click();await page.locator('[data-saved]').selectOption('0');await expect(root).toHaveAttribute('data-mode','model');assert.deepEqual(JSON.parse(await host.getAttribute('data-settings')).path,savedPoints);
 const zipPromise=page.waitForEvent('download');await page.locator('[data-export-source]').click();const zip=await zipPromise,zipPath=path.join(out,`${name}-source.zip`);await zip.saveAs(zipPath);
 const stored=JSON.parse(execFileSync('python3',['-c','import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(z.read("preset.json").decode())',zipPath],{encoding:'utf8'}));assert.deepEqual(stored.settings.path,savedPoints);
 await page.reload();await page.locator('[data-demo]').scrollIntoViewIfNeeded();await stage.scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-mode','model');assert.deepEqual(JSON.parse(await host.getAttribute('data-settings')).path,savedPoints);
 // Malformed files and geometrically invalid paths remain recoverable on the drawing sheet.
 await page.locator('.daw-file input').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(root).toHaveAttribute('data-error','true');
 const crossed=exportPath([[.1,.1],[.3,.3],[.5,.5],[.7,.7],[.9,.9],[.7,.9],[.5,.9],[.3,.9],[.1,.9],[.3,.7],[.5,.5],[.7,.3],[.9,.1]]);
 await page.locator('.daw-file input').setInputFiles({name:'crossed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(crossed))});await expect(root).toHaveAttribute('data-mode','edit');await expect(page.locator('[data-action=enter]')).toBeDisabled();await expect(page.locator('.daw-status')).toContainText(/bends|tight/);
 await page.locator('[data-examples]').selectOption('bend');await expect(root).toHaveAttribute('data-error','false');
 await page.locator('[data-action=draw]').click();await stage.scrollIntoViewIfNeeded();const tiny=await stage.boundingBox();await page.mouse.click(tiny.x+tiny.width/2,tiny.y+tiny.height/2);await expect(page.locator('[data-action=enter]')).toBeDisabled();assert.deepEqual(JSON.parse(await host.getAttribute('data-settings')).path,[],'An incomplete replacement stroke cannot enter stale architecture');
 await page.locator('[data-examples]').selectOption('bend');await expect(root).toHaveAttribute('data-error','false');
 // Normal-motion interpolation settles and sleeps; expansion stays functional.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-replay]').click();await page.waitForTimeout(1450);
 const frames=await host.getAttribute('data-frames');await page.waitForTimeout(180);assert.equal(await host.getAttribute('data-frames'),frames,'No idle animation loop');
 await page.locator('[data-fullscreen]').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement||!!document.querySelector('.il-expanded'))).toBe(true);await page.locator('[data-fullscreen]').click();
 await stage.scrollIntoViewIfNeeded();await page.locator('[data-action=enter]').click();await page.waitForTimeout(1100);await expect.poll(async()=>Number(await root.getAttribute('data-progress'))).toBeCloseTo(.14,3);
 await page.locator('.il-colophon').scrollIntoViewIfNeeded();await expect(host).toHaveAttribute('data-running','false');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(root).toHaveCount(0);await expect(page.locator('canvas')).toHaveCount(0);
 // Portable package starts from its saved actual path and needs no site services or CDN.
 files['preset.json']=JSON.stringify(stored);
 const portable=await browser.newPage({reducedMotion:'reduce'}),portableErrors=[];portable.on('pageerror',e=>portableErrors.push(e.message));portable.on('response',r=>{if(r.status()>=400)portableErrors.push(r.url());});
 await portable.goto(portableURL);await expect(portable.locator('.daw')).toHaveAttribute('data-mode','model');await portable.locator('[data-action=enter]').click();await portable.locator('.daw-journey input').fill('700');await expect(portable.locator('.daw')).toHaveAttribute('data-progress','0.70000');await portable.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(portable.locator('.daw')).toHaveCount(0);assert.deepEqual(portableErrors,[]);await portable.close();
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await phone.goto(url);await phone.locator('[data-demo]').scrollIntoViewIfNeeded();await phone.locator('.daw-stage').scrollIntoViewIfNeeded();
 if(name==='chromium'){
  const session=await phone.context().newCDPSession(phone),box=await phone.locator('.daw-stage').boundingBox();
  for(let i=0;i<=28;i++){const t=i/28;await session.send('Input.dispatchTouchEvent',{type:i===0?'touchStart':'touchMove',touchPoints:[{x:box.x+box.width*(.15+.7*t),y:box.y+box.height*(.72-.45*t)}]});}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(phone.locator('.daw')).toHaveAttribute('data-mode','model');
  await phone.locator('[data-action=enter]').tap();const travelBox=await phone.locator('.daw-stage').boundingBox();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:travelBox.x+travelBox.width/2,y:travelBox.y+travelBox.height*.7}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:travelBox.x+travelBox.width/2,y:travelBox.y+travelBox.height*.3}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(async()=>Number(await phone.locator('.daw').getAttribute('data-progress'))).toBeGreaterThan(.14);
 }else {await phone.locator('[data-examples]').selectOption('spiral');await phone.locator('[data-action=enter]').tap();}
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await phone.locator('[data-demo-shell]').screenshot({path:path.join(out,`${name}-mobile.png`)});await phone.close();
 // Graphics interruptions retain the path, and a missing GPU leaves a usable drawing editor.
 if(name==='chromium'){
  const recovery=await browser.newPage({reducedMotion:'reduce'});await recovery.goto(url);await recovery.locator('[data-demo]').scrollIntoViewIfNeeded();await recovery.locator('[data-examples]').selectOption('straight');
  await recovery.locator('canvas').evaluate(canvas=>{window.testContext=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');window.testContext.loseContext();});
  await expect(recovery.locator('.daw-status')).toContainText('interrupted');await expect(recovery.locator('[data-action=enter]')).toBeDisabled();
  await recovery.waitForTimeout(150);await recovery.evaluate(()=>window.testContext.restoreContext());await expect(recovery.locator('[data-action=enter]')).toBeEnabled();await recovery.close();
  const fallback=await browser.newPage({reducedMotion:'reduce'});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
  await fallback.goto(url);await fallback.locator('[data-demo]').scrollIntoViewIfNeeded();await fallback.locator('[data-examples]').selectOption('straight');await expect(fallback.locator('.daw-status')).toContainText('unavailable');await expect(fallback.locator('.daw-handle').first()).toBeVisible();await expect(fallback.locator('[data-action=export]')).toBeEnabled();await expect(fallback.locator('[data-action=enter]')).toBeDisabled();await fallback.close();
 }
 assert.deepEqual(errors,[]);await context.close();await browser.close();console.log(`${name}: actual freehand geometry, editable spline, different camera routes, wheel/reverse travel, settings, examples, JSON/preset/source round trips, standalone Three.js export, lifecycle, motion, fullscreen and mobile passed.`);
}}finally{await Promise.all(browsers.map(browser=>browser.close()));server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
