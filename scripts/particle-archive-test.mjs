import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
const base=process.env.TEST_BASE??'/tampa-curated';
const archiveURL=`${origin}${base}/stories/`;
const output='test-results/archive';await mkdir(output,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settle(page){await page.mouse.move(8,8);await page.waitForTimeout(3000);}
async function showPlate(page,index=0){
 await page.locator('[data-archive-image]').nth(index).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY-70,behavior:'instant'}));
 await expect(page.locator('[data-archive-plate]').nth(index)).toHaveAttribute('data-particle-ready','');
 await page.waitForTimeout(180);
}

for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.TEST_ENGINE&&process.env.TEST_ENGINE!==name)continue;
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'||/GL_INVALID/.test(message.text()))errors.push(message.text());});
 await page.goto(archiveURL);await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('[data-archive-plate]')).toHaveCount(6);
 await expect(page.locator('.particle-archive-canvas')).toHaveCount(1);
 await expect(page.locator('[data-particle-ready]').first()).toBeVisible();
 assert.ok(await page.locator('[data-particle-ready]').count()<6,'Resources initialize near the viewport, not all at once');
 await page.screenshot({path:`${output}/${name}-top.png`});
 await showPlate(page);await settle(page);
 const first=page.locator('[data-archive-image]').first();
 const box=await first.boundingBox();const clip={x:box.x+3,y:box.y+3,width:box.width-6,height:box.height-6};
 const idle=await page.screenshot({clip});
 await page.screenshot({path:`${output}/${name}-ink.png`});
 await delay(150);const still=await page.screenshot({clip});assert.ok(idle.equals(still),'Unchanged ink is pixel-stable');
 const frames=await page.locator('.particle-archive-canvas').getAttribute('data-frames');
 await page.waitForTimeout(250);assert.equal(await page.locator('.particle-archive-canvas').getAttribute('data-frames'),frames,'Idle renderer is stopped');
 await page.mouse.move(box.x+box.width*.30,box.y+box.height*.54);
 await page.mouse.move(box.x+box.width*.52,box.y+box.height*.65,{steps:8});await page.waitForTimeout(400);
 const reveal=await page.screenshot({clip});assert.ok(!reveal.equals(idle),'Pointer reveals a different image');
 await page.screenshot({path:`${output}/${name}-reveal.png`});
 await page.mouse.move(8,8);const wake=await page.screenshot({clip});assert.ok(!wake.equals(idle),'A released cursor leaves a fading photographic wake');
 await settle(page);const restored=await page.screenshot({clip});assert.ok(idle.equals(restored),'Ink returns to the exact original formation');
 // Read the actual framebuffer after scrolling beneath a stationary pointer:
 // its center must still contain opaque photographic detail, not sparse ink.
 const pointer={x:box.x+box.width*.72,y:box.y+box.height*.45};
 await page.mouse.move(pointer.x,pointer.y);await page.waitForTimeout(1100);
 await page.evaluate(()=>scrollBy(0,140));await page.waitForTimeout(1100);
 const coverage=await page.evaluate(({x,y})=>new Promise(resolve=>{
  dispatchEvent(new Event('scroll'));requestAnimationFrame(()=>{
   const canvas=document.querySelector('.particle-archive-canvas'),gl=canvas.getContext('webgl2'),dpr=canvas.width/innerWidth;
   const pixels=new Uint8Array(20*20*4);gl.readPixels(Math.round(x*dpr)-10,Math.round((innerHeight-y)*dpr)-10,20,20,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let alpha=0;for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];resolve(alpha/(400*255));
  });
 }),pointer);
 assert.ok(coverage>.98,'Reveal remains beneath the cursor while the image scrolls');
 await page.screenshot({path:`${output}/${name}-scroll-reveal.png`});await showPlate(page,0);await settle(page);
 // The cursor core must show the actual photo, not a translucent particle blend.
 const core={x:box.x+box.width*.6,y:box.y+box.height*.45};
 await page.mouse.move(core.x,core.y);await page.waitForTimeout(600);
 const readCore=()=>page.evaluate(({x,y})=>new Promise(resolve=>{dispatchEvent(new Event('scroll'));requestAnimationFrame(()=>{const c=document.querySelector('.particle-archive-canvas'),gl=c.getContext('webgl2'),dpr=c.width/innerWidth,p=new Uint8Array(24*24*4);gl.readPixels(Math.round(x*dpr)-12,Math.round((innerHeight-y)*dpr)-12,24,24,gl.RGBA,gl.UNSIGNED_BYTE,p);resolve(Array.from(p));});}),core);
 const cursorPixels=await readCore();
 await page.locator('[data-archive-uncover]').first().evaluate(button=>button.click());await page.waitForTimeout(1300);const photographPixels=await readCore();
 assert.ok(cursorPixels.every((v,i)=>Math.abs(v-photographPixels[i])<=1),'The hovered center exactly matches the fully revealed photograph');
 await page.locator('[data-archive-uncover]').first().evaluate(button=>button.click());await settle(page);
 // The photograph resolves without replacing its native article anchor.
 await page.locator('[data-archive-uncover]').first().click();await page.waitForTimeout(1500);
 await expect(page.locator('[data-archive-uncover]').first()).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:`${output}/${name}-photograph.png`});
 await page.locator('[data-archive-uncover]').first().click();await settle(page);
 await page.evaluate(()=>scrollTo(0,0));
 await page.locator('.archive-brush summary').click();
 await page.locator('[data-archive-radius]').fill('200');await page.locator('[data-archive-falloff]').fill('40');
 await expect(page.locator('[data-radius-value]')).toHaveText('200');await expect(page.locator('[data-falloff-value]')).toHaveText('40');
 await page.locator('.archive-brush summary').click();
 await page.locator('[data-archive-mode-toggle]').click();await expect(page.locator('[data-particle-archive]')).toHaveAttribute('data-archive-mode','still');
 await expect(page.locator('[data-archive-image] .photo').first()).toHaveCSS('opacity','1');
 await page.locator('[data-archive-mode-toggle]').click();
 // Keyboard focus reveals the plate; Enter remains a native article action.
 await showPlate(page,0);await page.keyboard.press('Tab');await first.focus();
 await expect(first).toBeFocused();await page.waitForTimeout(1500);
 await first.press('Enter');await expect(page).toHaveURL(/the-city-now\/\?from=particle-archive$/);
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tc-image-transition')||'null')?.key),'story-the-city-now','Selected photo participates in the existing image transition');
 await page.goBack();await expect(page).toHaveURL(archiveURL);await showPlate(page,0);
 await page.getByRole('button',{name:/^Reading/}).click();await page.getByRole('button',{name:'Sea glass Off'}).click();
 const glassBox=await first.boundingBox();await page.mouse.move(glassBox.x+180,glassBox.y+180);
 await expect(page.locator('.particle-archive-canvas')).toHaveAttribute('data-sea-glass-surface','');
 await expect(page.locator('[data-text-lens]')).toBeVisible();
 await page.screenshot({path:`${output}/${name}-sea-glass.png`});
 await page.keyboard.press('Escape');await expect(page.locator('.particle-archive-canvas')).not.toHaveAttribute('data-sea-glass-surface','');
 // All six load, remain aligned with hit targets, and fit narrow viewports.
 for(let i=0;i<6;i++){
  await showPlate(page,i);assert.ok(Number(await page.locator('[data-archive-plate]').nth(i).getAttribute('data-particle-count'))>8000);
  const r=await page.locator('[data-archive-image]').nth(i).boundingBox();
  assert.ok(r.y>=0&&r.x>=0&&r.x+r.width<=1441,'Image target stays in its intended viewport');
  const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('[data-archive-image]')?.closest('[data-archive-plate]')?.dataset.story,{x:r.x+r.width*.5,y:r.y+Math.min(r.height*.5,400)});
  assert.equal(hit,await page.locator('[data-archive-plate]').nth(i).getAttribute('data-story'));
 }
 await showPlate(page,4);await page.waitForTimeout(250);
 const originalScroll=await page.evaluate(()=>scrollY);
 await page.locator('[data-archive-image]').nth(4).click();await expect(page).toHaveURL(/stories\/the-long-way-home\/\?from=particle-archive$/);
 await expect(page.locator('[data-archive-return]')).toBeVisible();await expect(page.locator('.detail-figure img')).toBeVisible();
 await page.goBack();await expect(page).toHaveURL(archiveURL);await page.waitForTimeout(600);
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-originalScroll)<5,'Browser Back restores archive position');
 await page.goForward();await expect(page.locator('[data-archive-return]')).toBeVisible();
 await page.locator('[data-archive-return]').click();await expect(page).toHaveURL(/stories\/#plate-the-long-way-home$/);await page.waitForTimeout(700);
 assert.ok(Math.abs(await page.evaluate(()=>scrollY)-originalScroll)<5,'Explicit return restores archive position');
 await expect(page.locator('.particle-archive-canvas')).toHaveCount(1);
 await page.setViewportSize({width:768,height:1000});await showPlate(page,2);
 await page.screenshot({path:`${output}/${name}-tablet.png`});
 for(const width of [390,320])for(const size of [16,32]){
  await page.setViewportSize({width,height:900});await page.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,size);
  await showPlate(page,0);await settle(page);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}px, ${size}px type`);
  if(size===16)await page.screenshot({path:`${output}/${name}-${width}.png`});
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='16px');
 // Preference changes dispose the renderer and can safely reconstruct it.
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.particle-archive-canvas')).toHaveCount(0);
 await expect(first.locator('.photo')).toHaveCSS('opacity','1');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('.particle-archive-canvas')).toHaveCount(1);
 await page.evaluate(()=>document.querySelector('.particle-archive-canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('.particle-archive-canvas')).toHaveCount(0);await expect(first.locator('.photo')).toHaveCSS('opacity','1');
 assert.deepEqual(errors,[],`${name} has no JavaScript, shader, or texture errors`);
 await context.close();
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});
 const mobile=await touch.newPage();await mobile.goto(archiveURL);await showPlate(mobile,0);
 await mobile.locator('[data-archive-uncover]').first().tap();await expect(mobile.locator('[data-archive-uncover]').first()).toHaveAttribute('aria-pressed','true');
 await mobile.waitForTimeout(1400);await mobile.screenshot({path:`${output}/${name}-touch-reveal.png`});
 assert.ok(Number(await mobile.locator('[data-archive-plate]').first().getAttribute('data-particle-count'))<40000,'Touch uses a smaller particle budget');
 await mobile.locator('[data-archive-image]').first().tap();await expect(mobile).toHaveURL(/the-city-now\/\?from=particle-archive$/);await touch.close();
 for(const mode of ['no-js','reduced','no-webgl']){
  const fallback=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='no-webgl')await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
  const plain=await fallback.newPage();await plain.goto(archiveURL);await plain.waitForTimeout(600);
  await expect(plain.locator('.particle-archive-canvas')).toHaveCount(0);await expect(plain.locator('[data-archive-image] .photo').first()).toHaveCSS('opacity','1');
  await plain.locator('[data-archive-image]').first().click();await expect(plain).toHaveURL(/the-city-now\/\?from=particle-archive$/);await fallback.close();
 }
 console.log(`${name}: six lazy plates, stable ink, pointer/exit/scroll, controls, keyboard, sea glass, native navigation/back/return, responsive alignment, touch, reduced motion, no-JS, no-WebGL, and context-loss fallback passed.`);
 await browser.close();
}
