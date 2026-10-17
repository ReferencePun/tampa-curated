import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
import {Quaternion,Vector3} from 'three';
import {sampleCamera} from '../src/scripts/spatial/path.ts';
import {streetSites,streetSitesFor,streetEnd} from '../src/scripts/spatial/street.ts';
const base=process.env.TEST_BASE??'/tampa-curated';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
const href=route=>`${origin}${base}/${route}`;
await mkdir('test-results/spatial',{recursive:true});
// Check every part of the authored camera path, including the threshold crossing.
const pos=new Vector3(),q=new Quaternion(),lastPos=new Vector3(),lastQ=new Quaternion();
let crossed=false;
for(let i=0;i<=1000;i++){
 const p=i/1000;sampleCamera(p,pos,q);
 assert.ok(Math.abs(q.length()-1)<1e-8);
 assert.ok(Math.abs(new Vector3(1,0,0).applyQuaternion(q).y)<1e-8,'Camera horizon never banks');
 if(i){assert.ok(pos.distanceTo(lastPos)<.7,'No position discontinuities');assert.ok(q.angleTo(lastQ)<.06,'No camera flips');}
 if(lastPos.z>-4&&pos.z<=-4){assert.ok(Math.hypot(pos.x,pos.y-4.45)<2.9,'Camera passes inside the doorway');crossed=true;}
 lastPos.copy(pos);lastQ.copy(q);
}
assert.ok(crossed);assert.ok(new Vector3(0,0,-1).applyQuaternion(q).x<-.98,'Camera has turned left into the city');
// The city must be traversed, not approached as a front-facing skyline.
const streetStart=new Vector3(),streetFinish=new Vector3();
sampleCamera(.75,streetStart,q);sampleCamera(1,streetFinish,q);
for(const site of streetSites){
 assert.ok(streetStart.x>site.position[0]+site.halfWidth,`Start before ${site.name}`);
 assert.ok(site.position[2]<-42||site.position[2]>-26,`${site.name} sits outside the street`);
}
assert.ok(streetStart.x-streetFinish.x>50,'The camera travels through a substantial length of street');
for(const site of streetSites.slice(0,2))assert.ok(streetFinish.x<site.position[0]-site.halfWidth,`Travel past the full frontage of ${site.name}`);
for(const site of streetSites.slice(2))assert.ok(streetFinish.x>site.position[0]+site.halfWidth,'The final pair continues to frame the street ahead');
const streetHeading=q.clone();
for(let i=750;i<=1000;i++){
 sampleCamera(i/1000,pos,q);
 assert.equal(pos.z,-34,'The street camera stays on the centerline without lateral sway');
 assert.equal(pos.y,4.5,'The street camera keeps a constant eye height');
 assert.ok(q.angleTo(streetHeading)<1e-7,'Street heading remains steady instead of glancing side to side');
 if(i>750)assert.ok(pos.x<=lastPos.x+.0001,'Street travel continues forward');lastPos.copy(pos);
}
for(const p of [.82,.89,.95]){
 sampleCamera(p-.00001,lastPos,q);sampleCamera(p,pos,q);sampleCamera(p+.00001,streetStart,q);
 const before=(lastPos.x-pos.x)/.00001,after=(pos.x-streetStart.x)/.00001;
 assert.ok(before>100&&Math.abs(before-after)<.25,'Forward speed stays continuous through street checkpoints');
}
assert.ok(streetFinish.x>streetEnd.x+8,'Stop before the photograph rather than pass through it');
for(const site of streetSitesFor(true)){
 assert.ok(site.position[2]<-38.5||site.position[2]>-29.5,'Mobile buildings stay on either side of the lane');
 assert.equal(site.position[0],streetSites.find(original=>original.name===site.name).position[0],'Mobile retains the same length of street travel');
}
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.TEST_ENGINE&&process.env.TEST_ENGINE!==name)continue;
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1440,height:950}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push(`${r.status()} ${r.url()}`);});
 const root=page.locator('[data-spatial-root]');
 const progress=()=>root.getAttribute('data-progress').then(Number);
 const settle=async(p)=>{await expect.poll(progress,{timeout:10000}).toBeCloseTo(p,2);await expect.poll(async()=>{const a=await root.getAttribute('data-render-frames');await page.waitForTimeout(140);return (await root.getAttribute('data-render-frames'))===a;},{timeout:10000}).toBe(true);};
 const move=async(p)=>{await page.evaluate(p=>{const t=document.querySelector('[data-spatial-track]'),s=document.querySelector('[data-spatial-stage]');scrollTo({top:t.getBoundingClientRect().top+scrollY+(t.offsetHeight-s.clientHeight)*p,behavior:'instant'});},p);await settle(p);};
 await page.goto(href('unfinished-city/#threshold'));await expect(root).toHaveAttribute('data-renderer','ready');await page.evaluate(()=>document.fonts.ready);await settle(.27);
 await expect(page.locator('[data-spatial-canvas] canvas')).toHaveCount(1);
 const snapshots=new Map();
 for(const p of [0,.15,.28,.43,.61,.75,.82,.89,1,.94]){
  await move(p);const state=await root.evaluate(el=>({...el.dataset}));snapshots.set(p,state);
  assert.ok(+state.drawCalls<130,`${name}: bounded drawing work`);
  assert.ok(Math.abs(+state.pinion+(+state.gear)*48/20-171*Math.PI/180)<.00001,'Meshing gears preserve their tooth ratio');
  await page.screenshot({path:`test-results/spatial/${name}-${p}.png`});
 }
 assert.equal(+snapshots.get(0).fold,0);assert.equal(+snapshots.get(.28).fold,1);
 assert.equal(+snapshots.get(.43).lift>0,true);assert.ok(Math.abs(+snapshots.get(.61).lift-5)<.00001);
 await expect(page.locator('[data-photo-link]')).toBeVisible();
 await page.locator('[data-show-drawing]').click();await expect(root).toHaveAttribute('data-photo-reveal','0.000000');await expect(page.locator('[data-photo-link]')).toBeHidden();
 await page.locator('[data-show-drawing]').click();await expect(page.locator('[data-photo-link]')).toBeVisible();
 await page.locator('[data-photo-link]').click();await expect(page).toHaveURL(href('stories/the-city-now/?from=unfinished-city'));
 await expect(page.locator('[data-spatial-return]')).toBeVisible();
 await page.goBack();await expect(root).toHaveAttribute('data-renderer','ready');await settle(.94);
 await page.locator('[data-stage-nav] [data-room-link="drawing"]').click();await settle(0);
 await page.goBack();await settle(.94);
 await page.locator('[data-stage-nav] [data-room-link="threshold"]').click();await settle(.27);
 await page.locator('[data-crank]').focus();await page.keyboard.press('Home');await settle(0);
 await page.locator('[data-crank]').fill('50');await settle(.16);
 await page.locator('[data-crank]').fill('100');await settle(.32);
 for(const p of [.89,.82,.75,.43,.15,0]){
  await move(p);const previous=snapshots.get(p),now=await root.evaluate(el=>({...el.dataset}));
  for(const field of ['cameraPosition','cameraQuaternion','fold','gear','pinion','lift'])assert.equal(now[field],previous[field],`${name}: ${field} reverses exactly at ${p}`);
 }
 // Native wheel input advances the same state and remains untrapped at the end.
 await page.mouse.wheel(0,600);await expect.poll(progress).toBeGreaterThan(.04);
 await page.locator('[data-spatial-instruments] a').click();await expect(page.locator('#field-notes')).toBeInViewport();
 await page.waitForTimeout(150);const frames=await root.getAttribute('data-render-frames');await page.waitForTimeout(300);assert.equal(await root.getAttribute('data-render-frames'),frames,'Rendering stops offscreen');
 await page.locator('[data-static-toggle]').click();await expect(root).toHaveAttribute('data-renderer','static');await expect(page.locator('[data-spatial-canvas] canvas')).toHaveCount(0);
 await page.reload();await expect(root).toHaveAttribute('data-renderer','static');
 await page.locator('[data-spatial-retry]').click();await expect(root).toHaveAttribute('data-renderer','ready');await expect(page.locator('[data-spatial-canvas] canvas')).toHaveCount(1);
 await page.locator('[data-stage-nav] [data-room-link="city"]').click();await settle(.94);
 await page.locator('[data-photo-link]').click();await page.locator('[data-spatial-return]').click();await expect(root).toHaveAttribute('data-renderer','ready');await settle(.94);

 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const phone=await touch.newPage();
 await phone.goto(href('unfinished-city/#threshold'));await expect(phone.locator('[data-spatial-root]')).toHaveAttribute('data-renderer','ready');
 await expect.poll(()=>phone.locator('[data-spatial-root]').getAttribute('data-progress').then(Number),{timeout:10000}).toBeCloseTo(.27,2);
 await phone.locator('[data-stage-nav] [data-room-link="city"]').tap();await expect.poll(()=>phone.locator('[data-spatial-root]').getAttribute('data-progress').then(Number)).toBeCloseTo(.94,2);
 await expect(phone.locator('[data-photo-link]')).toBeVisible();
 for(const p of [.75,.82,.89,1,.94]){
  await phone.evaluate(p=>{const t=document.querySelector('[data-spatial-track]'),s=document.querySelector('[data-spatial-stage]');scrollTo({top:t.getBoundingClientRect().top+scrollY+(t.offsetHeight-s.clientHeight)*p,behavior:'instant'});},p);
  await expect.poll(()=>phone.locator('[data-spatial-root]').getAttribute('data-progress').then(Number),{timeout:10000}).toBeCloseTo(p,3);
  await phone.waitForTimeout(250);await phone.screenshot({path:`test-results/spatial/${name}-mobile-street-${p}.png`});
 }
 await phone.screenshot({path:`test-results/spatial/${name}-mobile-city.png`});
 const photoCaption=await phone.locator('[data-photo-link],.spatial-caption').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
 assert.ok(photoCaption[0].bottom+8<=photoCaption[1].top,'The photograph entrance stays above the mobile caption');
 assert.ok(photoCaption[0].left>=0&&photoCaption[0].right<=390,'The photograph entrance remains inside the viewport');
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const rectangles=await phone.locator('[data-spatial-instruments],.reading-tools').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
 if(rectangles.length===2)assert.ok(rectangles[0].bottom<=rectangles[1].top||rectangles[1].bottom<=rectangles[0].top||rectangles[0].right<=rectangles[1].left,'Controls do not cover reading preferences');
 await touch.close();

 // Readable alternative: no WebGL download or long pinned scroll with reduced motion.
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const still=await reduced.newPage();const requests=[];still.on('request',r=>requests.push(r.url()));
 await still.goto(href('unfinished-city/#corridor'));await expect(still.locator('[data-spatial-root]')).toHaveAttribute('data-renderer','static');await expect(still.locator('canvas')).toHaveCount(0);
 await expect(still.locator('#corridor')).toBeVisible();assert.ok(!requests.some(url=>/controller\..*\.js/.test(url)),'Three.js remains lazy in reduced motion');
 for(const width of [1440,768,594,390,320]){
  await still.setViewportSize({width,height:900});
  for(const size of [16,32]){await still.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,size);assert.ok(await still.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: static reflow ${width}, ${size}`);}
 }
 await still.screenshot({path:`test-results/spatial/${name}-reduced-200.png`,fullPage:true});await reduced.close();
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const plain=await noJS.newPage();await plain.goto(href('unfinished-city/#city'));await expect(plain.locator('#city')).toBeVisible();await expect(plain.locator('.spatial-story-link')).toHaveAttribute('href',`${base}/stories/the-city-now/?from=unfinished-city`);await noJS.close();
 const noGL=await browser.newContext();await noGL.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});const fallback=await noGL.newPage();await fallback.goto(href('unfinished-city/'));await expect(fallback.locator('[data-spatial-root]')).toHaveAttribute('data-renderer','static');await expect(fallback.locator('.spatial-fallback')).toBeVisible();await expect(fallback.locator('.spatial-story-link')).toBeVisible();await noGL.close();
 // Context loss returns to readable content, and a fresh canvas can be requested.
 await page.goto(href('unfinished-city/#corridor'));await expect(root).toHaveAttribute('data-renderer','ready');
 await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(root).toHaveAttribute('data-renderer','static');await expect(page.locator('canvas')).toHaveCount(0);await page.locator('[data-spatial-retry]').click();await expect(root).toHaveAttribute('data-renderer','ready');
 assert.deepEqual(errors,[],`${name}: runtime or asset errors`);
 console.log(`${name}: real 3D, all four rooms, exact reversal, gear coupling, idle/offscreen rendering, deep links/history/story return, crank, mobile, static/no-JS/no-WebGL/context-loss recovery, 10 enlarged-text layouts passed.`);
 await context.close();await browser.close();
}
console.log('Camera continuity: 1,001 upright samples, a valid doorway crossing, 53 units of street travel, fixed street heading/eye height/centerline, continuous speed, and a clear lane passed.');
