import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {chromium, webkit, expect} from '@playwright/test';
import {tracingTimeline} from '../src/scripts/experiments/tracing-sequence.ts';

assert.equal(tracingTimeline(.64).ink,1);
assert.equal(tracingTimeline(.64).slide,0);
assert.equal(tracingTimeline(1).slide,1);

const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
const base=process.env.TEST_BASE??'/tampa-curated';
const href=route=>`${origin}${base}/${route}`;
const key='tc-field-notebook-v1';
const output='test-results/experiments';
await mkdir(output,{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(origin))errors.push(`${response.status()} ${response.url()}`);});
 const goto=async route=>{await page.goto(href(route));await page.evaluate(()=>document.fonts.ready);};
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);

 // Each physical drawer exposes real content, and only one is open at a time.
 await goto('experiments/cabinet/');
 await expect(page.locator('.cabinet-drawer')).toHaveCount(6);
 await expect(page.locator('.cabinet-drawer[open]')).toHaveCount(1);
 await page.locator('#drawer-sail summary').click();
 await expect(page.locator('#drawer-sail')).toHaveAttribute('open','');
 await expect(page.locator('.cabinet-drawer[open]')).toHaveCount(1);
 await page.locator('#drawer-feather summary').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#drawer-feather')).toHaveAttribute('open','');
 await page.locator('#drawer-feather [data-notebook-save]').click();
 await expect(page.locator('[data-notebook-count]').first()).toHaveText('1');
 await page.screenshot({path:`${output}/${name}-cabinet.png`,fullPage:true,animations:'disabled'});
 await goto('experiments/cabinet/#drawer-light');
 await expect(page.locator('#drawer-light')).toHaveAttribute('open','');
 await page.locator('#drawer-light [data-notebook-save]').click();
 assert.equal((await state()).items.length,2);

 // Collection, notes, order and removal survive real navigations and reloads.
 await goto('experiments/notebook/');
 const pieces=page.locator('.notebook-board [data-note-id]');
 await expect(pieces).toHaveCount(2);
 await page.locator('[data-notebook-title]').fill('A Saturday in Tampa');
 const note='Walk slowly.\nLook up at the brickwork. <script>text only</script>';
 await pieces.first().locator('textarea').fill(note);
 const rooster=pieces.filter({has:page.locator('[data-note-text][aria-label="My notes on The early riser"]')});
 await rooster.locator('[data-note-move="1"]').click();
 assert.equal((await state()).items[1].id,'objects:feather');
 await page.reload();
 await expect(page.locator('[data-notebook-title]')).toHaveValue('A Saturday in Tampa');
 await expect(pieces.nth(1).locator('textarea')).toHaveValue(note);
 await pieces.nth(1).locator('[data-note-remove]').click();
 await expect(pieces).toHaveCount(1);
 await page.locator('[data-note-undo]').click();
 await expect(pieces).toHaveCount(2);
 await expect(pieces.nth(1).locator('textarea')).toHaveValue(note);
 await expect(pieces.nth(1).locator('h2')).toBeFocused();

 // Search/filter controls, save toggles, another tab and ordinary article pages.
 const shelf=page.locator('[data-shelf-piece]:visible');
 const total=await shelf.count();
 await page.locator('[data-shelf-filters] input').fill('no-such-piece-xyz');
 await expect(shelf).toHaveCount(0);
 await expect(page.locator('[data-shelf-empty]')).toBeVisible();
 await page.locator('[data-shelf-filters] button').click();
 await expect(shelf).toHaveCount(total);
 await page.locator('[data-shelf-filters] select').selectOption('Quotation');
 await expect(shelf).toHaveCount(1);
 await shelf.locator('[data-notebook-save]').click();
 await expect(pieces).toHaveCount(3);
 await expect(page.locator('.notebook-board .rooster-study')).toHaveCount(1);
 const duplicates=await page.locator('[id]').evaluateAll(elements=>{
  const ids=elements.map(el=>el.id);return ids.filter((id,index)=>ids.indexOf(id)!==index);
 });
 assert.deepEqual(duplicates,[],'Collected illustrations have unique accessible labels');
 const other=await context.newPage();
 await other.goto(href('neighborhoods/downtown/'));
 await other.locator('[data-notebook-save="neighborhoods:downtown"]').click();
 await expect(pieces).toHaveCount(4);
 await other.close();
 await page.locator('[data-shelf-filters] button').click();
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${output}/${name}-notebook.png`,fullPage:true,animations:'disabled'});

 // Export includes the user's content; print suppresses controls and the shelf.
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-note-export]').click()]);
 const exported=await readFile(await download.path(),'utf8');
 assert.ok(exported.includes('A Saturday in Tampa'));
 assert.ok(exported.includes('Look up at the brickwork.'));
 assert.ok(exported.includes('The early riser'));
 assert.ok(exported.includes(href('experiments/cabinet/#drawer-feather')));
 await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});
 await page.locator('[data-note-print]').click();
 await expect.poll(()=>page.evaluate(()=>window.__printed)).toBe(true);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.collection-shelf')).toBeHidden();
 await expect(page.locator('[data-notebook-title]')).toBeHidden();
 await expect(page.locator('[data-note-print-title]')).toHaveText('A Saturday in Tampa');
 await expect(pieces.nth(1).locator('[data-note-print-text]')).toBeVisible();
 await expect(pieces.nth(1).locator('[data-note-print-text]')).toHaveText(note);
 await page.screenshot({path:`${output}/${name}-print.png`,fullPage:true,animations:'disabled'});
 await page.emulateMedia({media:'screen'});

 // Native scrolling draws the ink, then slides the flat sleeve off the stationary archive.
 await goto('experiments/tracing-city/');
 const journey=page.locator('[data-tracing-journey]'),sheet=page.locator('[data-tracing-sheet]');
 const scrollTrace=async (progress,targetPage=page)=>{
  await targetPage.evaluate(progress=>{
   const track=document.querySelector('[data-tracing-track]'),stage=document.querySelector('[data-tracing-stage]');
   scrollTo({top:track.getBoundingClientRect().top+scrollY+(track.offsetHeight-stage.offsetHeight)*progress,behavior:'instant'});
  },progress);
  await expect.poll(async()=>Math.abs(Number(await targetPage.locator('[data-tracing-journey]').getAttribute('data-tracing-progress'))-progress)).toBeLessThan(.002);
 };
 await expect(journey).toHaveAttribute('data-tracing-mode','scroll');
 await expect(page.locator('[data-paper-handle], [data-paper-lift], [data-paper-ink]')).toHaveCount(0);
 await scrollTrace(0);
 await expect(journey).toHaveAttribute('data-ink-progress','0.0000');
 assert.equal(await page.locator('[data-trace-layer="streets"] path').first().evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await page.screenshot({path:`${output}/${name}-trace-blank.png`});
 await scrollTrace(.35);
 const strokeState=()=>page.locator('[data-trace-layer] path').evaluateAll(paths=>paths.map(path=>path.getAttribute('style')));
 const drawing=await strokeState();
 await page.screenshot({path:`${output}/${name}-trace-drawing.png`});
 await scrollTrace(.64);
 await expect(journey).toHaveAttribute('data-ink-progress','1.0000');
 await expect(journey).toHaveAttribute('data-slide-progress','0.0000');
 const mapPosition=await page.locator('.archive-map').boundingBox();
 await page.screenshot({path:`${output}/${name}-trace-drawn.png`});
 await scrollTrace(.80);
 assert.ok(Number(await journey.getAttribute('data-slide-progress'))>.1);
 const sleeveTransform=()=>sheet.evaluate(el=>{
  const m=new DOMMatrixReadOnly(getComputedStyle(el).transform);
  const rect=el.getBoundingClientRect();
  return {a:m.a,b:m.b,c:m.c,d:m.d,x:m.e,y:m.f,is2D:m.is2D,left:rect.left,width:rect.width,height:rect.height};
 });
 const sliding=await sleeveTransform();
 assert.ok(sliding.is2D && Math.abs(sliding.a*sliding.d-sliding.b*sliding.c-1)<.00001,'Film stays flat without stretching');
 assert.ok(Math.abs(Math.hypot(sliding.a,sliding.b)-1)<.00001);
 assert.ok(Math.abs(Math.hypot(sliding.c,sliding.d)-1)<.00001);
 const tilt=Math.atan2(sliding.b,sliding.a)*180/Math.PI;
 assert.ok(tilt<0 && tilt>-8 && sliding.y<0,'Film tilts gently and drifts upward as it is pulled');
 assert.ok(sliding.x>0 && sliding.x<sliding.width,'Sleeve is partway off to the right');
 await expect(page.locator('[data-trace-fold], [data-trace-curl]')).toHaveCount(0);
 assert.deepEqual(await page.locator('.archive-map').boundingBox(),mapPosition);
 await page.screenshot({path:`${output}/${name}-trace-slide.png`});
 await scrollTrace(1);
 await expect(sheet).toBeHidden();
 const removed=await sleeveTransform();
 assert.ok(removed.left>=mapPosition.x+mapPosition.width,'Entire sleeve clears the original map');
 await page.screenshot({path:`${output}/${name}-trace-original.png`});
 await scrollTrace(.8);
 assert.deepEqual(await sleeveTransform(),sliding,'Reverse scroll brings the flat sleeve back along the same path');
 await scrollTrace(.35);
 assert.equal((await sleeveTransform()).x,0);
 assert.deepEqual(await strokeState(),drawing,'Reverse scroll restores the same strokes');
 const frames=await journey.getAttribute('data-render-frames');
 await page.waitForTimeout(250);
 assert.equal(await journey.getAttribute('data-render-frames'),frames,'No rendering while idle');
 const before=await page.evaluate(()=>scrollY);
 await page.keyboard.press('PageDown');
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before);
 await page.locator('a[href="#tracing-notes"]').click();
 await expect(page.locator('#tracing-notes')).toBeInViewport();
 await expect(page.locator('[data-observation]:visible')).toHaveCount(3);
 const traceSave=page.locator('[data-observation="water"] [data-notebook-save]');
 await traceSave.click();
 assert.ok((await state()).items.some(item=>item.id==='stories:the-city-now'));
 // Motion preferences can change without a reload, including midway through a slide.
 await scrollTrace(.8);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(journey).toHaveAttribute('data-tracing-mode','still');
 await expect(page.locator('.tracing-still-original')).toBeVisible();
 await expect(sheet).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(journey).toHaveAttribute('data-tracing-mode','scroll');
 await scrollTrace(.64);
 await expect(journey).toHaveAttribute('data-ink-progress','1.0000');

 // Short windows must never overlap the map, captions, or footer during a slide.
 for(const [width,height] of [[1440,650],[768,650],[320,600]]){
  await page.setViewportSize({width,height});
  for(const progress of [.64,.8,.97]){
   await scrollTrace(progress);
   const bounds=await page.evaluate(()=>{
    const r=s=>document.querySelector(s).getBoundingClientRect();
    return {map:r('.tracing-board').toJSON(),text:r('.tracing-narrative').toJSON(),footer:r('.tracing-stage-bottom').top,header:r('.tracing-stage-top').bottom};
   });
   assert.ok(bounds.map.bottom<=bounds.footer && bounds.text.bottom<=bounds.footer,`${name}: content fits ${width}×${height}`);
   assert.ok(bounds.map.top>=bounds.header && bounds.text.top>=bounds.header);
   if(width<760) assert.ok(bounds.map.bottom<=bounds.text.top,`${name}: map never overlaps the caption`);
  }
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='20px');
 await expect(journey).toHaveAttribute('data-tracing-mode','still');

 // Reflow, doubled body text, reduced motion and touch controls.
 let checks=0;
 for(const width of [1440,768,594,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of ['experiments/','experiments/cabinet/','experiments/tracing-city/','experiments/notebook/']){
   await goto(route);
   for(const size of [16,32]){
    await page.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,size);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: overflow ${route} ${width}px, text ${size/16}×`);
    if(route==='experiments/tracing-city/'&&size===32) await expect(page.locator('[data-tracing-journey]')).toHaveAttribute('data-tracing-mode','still');
    checks++;
   }
   if(width===390){await page.evaluate(()=>document.documentElement.style.fontSize='16px');await page.screenshot({path:`${output}/${name}-${route.split('/')[1]||'index'}-mobile.png`,fullPage:true,animations:'disabled'});}
  }
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await goto('experiments/cabinet/');
 assert.equal(await page.locator('.drawer-tray').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 const touchPage=await touch.newPage();await touchPage.goto(href('experiments/cabinet/'));
 await touchPage.locator('#drawer-sail summary').tap();
 await expect(touchPage.locator('#drawer-sail')).toHaveAttribute('open','');
 await touchPage.goto(href('experiments/tracing-city/'));
 await touchPage.evaluate(async()=>{await document.fonts.ready;await document.querySelector('.archive-map').decode();});
 await scrollTrace(.8,touchPage);
 // Let mobile WebKit composite the decoded archive after this large scroll jump.
 await touchPage.waitForTimeout(250);
 await touchPage.screenshot({path:`${output}/${name}-trace-mobile-slide.png`});
 await touchPage.locator('a[href="#tracing-notes"]').tap();
 await expect(touchPage.locator('#tracing-notes')).toBeInViewport();
 await expect(touchPage.locator('[data-observation]:visible')).toHaveCount(3);
 await touch.close();

 // Native drawer and all editorial content remain readable without scripts.
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const staticPage=await noJS.newPage();await staticPage.goto(href('experiments/cabinet/'));
 await staticPage.locator('#drawer-sail summary').click();
 await expect(staticPage.locator('#drawer-sail .drawer-tray')).toBeVisible();
 await expect(staticPage.locator('[data-notebook-save]').first()).toBeHidden();
 await staticPage.goto(href('experiments/tracing-city/'));
 await expect(staticPage.locator('[data-observation]:visible')).toHaveCount(3);
 await expect(staticPage.locator('.tracing-still-original')).toBeVisible();
 await expect(staticPage.locator('[data-tracing-journey]')).toHaveAttribute('data-tracing-mode','still');
 await staticPage.goto(href('experiments/notebook/'));
 await expect(staticPage.locator('[data-shelf-piece]')).toHaveCount(total);
 await expect(staticPage.locator('noscript')).toBeVisible();await noJS.close();

 // Blocked storage must preserve the current page collection and disclose it.
 const denied=await browser.newContext();
 await denied.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
 const deniedPage=await denied.newPage();await deniedPage.goto(href('experiments/notebook/'));
 await deniedPage.locator('[data-note-starter]').click();
 await expect(deniedPage.locator('[data-notebook-board] [data-note-id]')).toHaveCount(3);
 await expect(deniedPage.locator('[data-storage-warning]')).toBeVisible();
 await deniedPage.locator('[data-notebook-title]').fill('Temporary notes');
 await expect(deniedPage.locator('[data-notebook-board] [data-note-id]')).toHaveCount(3);
 await denied.close();
 // Corrupt storage is recoverable with the next intentional save.
 await page.evaluate(key=>localStorage.setItem(key,'broken JSON'),key);
 await goto('experiments/notebook/');await page.locator('[data-note-starter]').click();
 await expect(pieces).toHaveCount(3);
 assert.equal((await state()).version,1);
 await expect(page.locator('[data-storage-warning]')).toBeHidden();
 assert.deepEqual(errors,[],`${name}: console or asset errors`);
 console.log(`${name}: drawers, keyboard, cross-page/tab saves, notes, order, undo, export, print, scroll drawing, reversible sideways sleeve, ${checks} reflow checks, touch, reduced motion, no JS, blocked/corrupt storage passed.`);
 await context.close();await browser.close();
}
