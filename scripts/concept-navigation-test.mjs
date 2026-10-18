import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit,expect} from '@playwright/test';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321';
const base=process.env.TEST_BASE??'/tampa-curated';
const routes=['','home2/','home3/','lab/','lab/draw-a-world/','lab/folding-paper/','lab/living-ink/','lab/particle-photos/','lab/time-machine/','lab/photo-portals/','lab/living-city/','lab/site-memory/','lab/spatial-sound/','lab/typographic-labyrinth/','lab/handwritten-manuscript/','lab/light-peg-studio/','lab/sequin-reveal/','lab/slinky-stairs/','lab/living-music-score/','lab/three-color-process/','lab/little-workers/','lab/hall-of-mirrors/','lab/impressed-typography/','stories/','unfinished-city/','experiments/cabinet/','experiments/tracing-city/','experiments/notebook/','experiments/'];
const href=route=>`${origin}${base}/${route}`;
await mkdir('test-results/navigation',{recursive:true});
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(href(''));
 const toggle=page.locator('[data-concept-navigation] summary');
 const panel=page.getByRole('navigation',{name:'Concept pages'});
 await toggle.focus();await page.keyboard.press('Enter');
 await expect(panel).toBeVisible();
 assert.deepEqual(await panel.locator('a').evaluateAll(links=>links.map(link=>link.href)),routes.map(href));
 // Safari's default Tab policy skips links; the disclosure's arrow shortcut is consistent.
 await page.keyboard.press('ArrowDown');await expect(panel.locator('a').first()).toBeFocused();
 await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(toggle).toBeFocused();
 await page.keyboard.press('ArrowUp');await expect(panel.locator('a').last()).toBeFocused();await expect(panel.locator('a').last()).toBeInViewport();
 await page.keyboard.press('Escape');
 for(const route of routes){
  await toggle.click();
  await panel.locator(`a[href="${base}/${route}"]`).click();
  await expect(page).toHaveURL(href(route));
  await toggle.click();
  await expect(panel.locator('a[aria-current="page"]')).toHaveAttribute('href',`${base}/${route}`);
  await page.keyboard.press('Escape');
 }
 for(const width of [1920,1600,1440,1200,1061,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const size of [16,32]){
   await page.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,size);
   await toggle.click();
   const bounds=await panel.boundingBox();
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1,`${name}: dropdown fits at ${width}px / ${size}px text`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Navigation does not overflow the page');
   await panel.locator('a').last().scrollIntoViewIfNeeded();await expect(panel.locator('a').last()).toBeInViewport();
   if(size===16&&[1440,390].includes(width))await page.screenshot({path:`test-results/navigation/${name}-${width}.png`});
   await page.keyboard.press('Escape');
  }
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='16px');
 await toggle.focus();await page.keyboard.press('ArrowUp');
 await expect(panel.locator('a').last()).toBeFocused();await expect(panel.locator('a').last()).toBeInViewport();
 await page.keyboard.press('Escape');
 await toggle.click();
 const outside=await panel.boundingBox();await page.mouse.click(outside.x/2,outside.y+20);await expect(panel).toBeHidden();
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 await toggle.click();await expect(page.locator('#mobile-nav')).toBeHidden();await expect(panel).toBeVisible();
 await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(panel).toBeHidden();
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const noJS=await plain.newPage();await noJS.goto(href(''));
 await noJS.locator('[data-concept-navigation] summary').click();
 await noJS.getByRole('navigation',{name:'Concept pages'}).locator(`a[href="${base}/experiments/tracing-city/"]`).click();
 await expect(noJS).toHaveURL(href('experiments/tracing-city/'));await plain.close();
 assert.deepEqual(errors,[]);
 console.log(`${name}: all twenty-nine concept destinations, current page, keyboard/Escape/focus, outside click, mobile menu coordination, 16 reflows, and no-JS navigation passed.`);
 await browser.close();
}
