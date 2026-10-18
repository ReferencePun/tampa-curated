import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';
import {registry} from './lab-package.mjs';
import {createPreset,defaults} from '../src/creative-lab/shared/presets.js';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:4321',base=process.env.TEST_BASE??'/tampa-curated';
const href=route=>`${origin}${base}/lab/${route}`;
const out=path.resolve('test-results/lab');await mkdir(out,{recursive:true});
const entries=await registry(),manifest=entries.find(e=>e.slug==='line-field');
const preset=createPreset(manifest,{...defaults(manifest),density:44,seed:23},'Portable drawing');
await writeFile(path.join(out,'custom-preset.json'),JSON.stringify(preset));
execFileSync(process.execPath,['scripts/lab-export.mjs','line-field','--preset',path.join(out,'custom-preset.json'),'--out',out]);
function unpack(file,destination){
 execFileSync('python3',['-c','import zipfile,sys,pathlib\nz=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None\nassert all(not p.startswith("/") and ".." not in pathlib.PurePosixPath(p).parts for p in z.namelist())\nz.extractall(sys.argv[2])',file,destination]);
}
unpack(path.join(out,'line-field.zip'),path.join(out,'standalone'));
assert.equal(JSON.parse(await readFile(path.join(out,'standalone/preset.json'),'utf8')).settings.seed,23);
const files=execFileSync('python3',['-c','import zipfile,sys;print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))',path.join(out,'line-field.zip')],{encoding:'utf8'});
assert.ok(files.includes('creative-lab/shared/canvas-effect.js')&&files.includes('assets/preview.svg')&&files.includes('example.js')&&files.includes('LICENSE'));
assert.ok(!files.includes('hinge-study')&&!files.includes('node_modules'),'Export contains only its own source closure');
for(const entry of entries){
 const response=await fetch(href(`${entry.slug}/source.zip`));assert.equal(response.status,200);
 const file=path.join(out,`${entry.slug}-default.zip`);await writeFile(file,new Uint8Array(await response.arrayBuffer()));
 execFileSync('python3',['-c','import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert "README.md" in z.namelist();assert "preset.json" in z.namelist()',file]);
}
const server=createServer(async(req,res)=>{
 try{
  const file=path.resolve(out,'standalone','.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
  if(!file.startsWith(path.join(out,'standalone')+path.sep))throw new Error('Invalid path');
  await stat(file);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const standalone=`http://127.0.0.1:${server.address().port}/example.html`;
try{
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 if(process.env.TEST_ENGINE&&process.env.TEST_ENGINE!==name)continue;
 const browser=await engine.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(href(''));await expect(page.locator('[data-card]')).toHaveCount(14);await expect(page.locator('canvas')).toHaveCount(0);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(out,`${name}-catalog.png`),fullPage:true});
 await page.getByRole('searchbox').fill('sound');await expect(page.locator('[data-card]:visible')).toHaveCount(1);
 await page.locator('[data-clear-filters]').click();await page.locator('select[name="status"]').selectOption('working');await expect(page.locator('[data-card]:visible')).toHaveCount(entries.filter(e=>e.status==='working').length);
 await page.locator('[data-clear-filters]').click();await page.locator('[data-favorite="line-field"]').click();await page.getByLabel('Favorites only').check();await expect(page.locator('[data-card]:visible')).toHaveCount(1);
 await page.reload();await expect(page.locator('[data-favorite="line-field"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-compare="line-field"]').check();await page.locator('[data-compare="hinge-study"]').check();await expect(page.locator('[data-compare-link]')).toBeVisible();
 await page.locator('[data-compare-link]').click();await expect(page).toHaveURL(/lab\/compare\//);
 await page.locator('[data-comparison]').scrollIntoViewIfNeeded();await expect(page.locator('canvas')).toHaveCount(2);
 await page.locator('[data-study-select="right"]').selectOption('line-field');await expect(page.locator('[data-compare-side="right"] [data-lab-host]')).toHaveAttribute('data-slug','line-field');await expect(page.locator('canvas')).toHaveCount(2);
 assert.equal(await page.locator('[data-compare-side="right"] [data-setting="density"]').getAttribute('id'),'right-template-line-field-density','Cloned inspectors keep distinct label IDs');
 await page.locator('[data-study-select="right"]').selectOption('hinge-study');await expect(page.locator('canvas')).toHaveCount(2);
 await page.locator('[data-pause-all]').click();await expect(page.locator('[data-lab-host]').first()).toHaveAttribute('data-running','false');await expect(page.locator('[data-lab-host]').last()).toHaveAttribute('data-running','false');
 await page.locator('[data-comparison-view]').selectOption('left');await expect(page.locator('[data-compare-side="right"]')).toBeHidden();
 await page.locator('[data-pause-all]').click();await expect(page.locator('[data-compare-side="right"] [data-lab-host]')).toHaveAttribute('data-running','false');
 await page.locator('[data-comparison-view]').selectOption('both');await page.screenshot({path:path.join(out,`${name}-comparison.png`),fullPage:true});
 for(const entry of entries){
  await page.goto(href(`${entry.slug}/`));await expect(page.locator('h1')).toContainText(entry.name);
  await page.locator('[data-demo]').scrollIntoViewIfNeeded();await expect(page.locator('[data-lab-host]')).toHaveAttribute('data-mounted','true');await expect(page.locator('canvas')).toHaveCount(['draw-a-world','living-city','site-memory'].includes(entry.slug)?0:1);
  if(entry.placeholder)await expect(page.locator('.il-placeholder-note')).toContainText('has not been built yet');
 }
 await page.goto(href('line-field/'));const root=page.locator('[data-lab-host]');await page.locator('[data-demo]').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-mounted','true');
 const settings=async()=>JSON.parse(await root.getAttribute('data-settings'));
 await page.locator('[data-setting="density"]').evaluate(input=>{input.value='48';input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await settings()).density,48);
 await page.locator('[data-setting="seed"]').fill('19');assert.equal((await settings()).seed,19);
 await page.locator('[data-setting="guides"]').uncheck();assert.equal((await settings()).guides,false);
 await page.locator('[data-setting="mode"]').selectOption('open');assert.equal((await settings()).mode,'open');
 await page.locator('[data-setting="accent"]').evaluate(input=>{input.value='#557788';input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await settings()).accent,'#557788');
 await page.locator('.il-presets summary').click();await page.locator('[data-preset-name]').fill('Evening lines');await page.locator('[data-save]').click();
 await page.locator('[data-reset]').click();assert.equal((await settings()).density,32);await page.locator('[data-saved]').selectOption('0');assert.equal((await settings()).density,48);
 const exportedPromise=page.waitForEvent('download');await page.locator('[data-export-preset]').click();const exported=await exportedPromise;const jsonPath=path.join(out,`${name}-preset.json`);await exported.saveAs(jsonPath);
 const saved=JSON.parse(await readFile(jsonPath,'utf8'));assert.equal(saved.experiment,'line-field');assert.equal(saved.settings.accent,'#557788');
 await page.locator('[data-reset]').click();await page.locator('[data-import]').setInputFiles(jsonPath);await expect.poll(async()=>(await settings()).density).toBe(48);
 await page.locator('[data-import]').setInputFiles({name:'wrong.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...saved,experiment:'spatial-sound'}))});await expect(page.locator('[data-feedback]')).toContainText('Could not import');assert.equal((await settings()).density,48);
 await page.reload();assert.equal((await settings()).seed,19);await page.locator('[data-demo]').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-mounted','true');
 await page.locator('[data-pause]').click();await expect(root).toHaveAttribute('data-running','false');const frames=await root.getAttribute('data-frames');await page.waitForTimeout(180);assert.equal(await root.getAttribute('data-frames'),frames,'No idle animation frames');
 await page.locator('[data-debug]').check();await expect(page.locator('[data-statistics]')).toContainText('Canvas 2D');
 await page.locator('[data-replay]').click();await expect(page.locator('[data-feedback]')).toContainText('first frame');
 await page.locator('[data-pause]').click();await expect(root).toHaveAttribute('data-running','true');
 await page.locator('[data-fullscreen]').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement||!!document.querySelector('.il-expanded'))).toBe(true);await page.locator('[data-fullscreen]').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement||!!document.querySelector('.il-expanded'))).toBe(false);
 await page.locator('[data-demo-shell]').evaluate(element=>Object.defineProperty(element,'requestFullscreen',{value:undefined,configurable:true}));
 await page.locator('[data-fullscreen]').click();await expect(page.getByRole('dialog',{name:'Line Field expanded preview'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.il-expanded')).toHaveCount(0);await expect(page.locator('[data-fullscreen]')).toBeFocused();
 await page.locator('[data-demo]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${name}-workbench.png`)});
 const sourcePromise=page.waitForEvent('download');await page.locator('[data-export-source]').click();const source=await sourcePromise,sourcePath=path.join(out,`${name}-live.zip`);await source.saveAs(sourcePath);
 unpack(sourcePath,path.join(out,`${name}-live`));assert.equal(JSON.parse(await readFile(path.join(out,`${name}-live/preset.json`),'utf8')).settings.seed,19);
 await page.locator('.il-colophon').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-running','false');
 // Observe cleanup in the same document, including a pending lazy import.
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('canvas')).toHaveCount(0);await expect(root).toHaveAttribute('data-mounted','false');
 await page.goto(href('hinge-study/'));await page.locator('[data-demo]').scrollIntoViewIfNeeded();await expect(page.locator('canvas')).toHaveCount(1);
 const phone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 for(const route of ['', 'line-field/','draw-a-world/','compare/']){
  await phone.goto(href(route));if(route)await phone.locator('[data-demo]').first().scrollIntoViewIfNeeded();
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: mobile overflow ${route}`);
  await phone.screenshot({path:path.join(out,`${name}-mobile-${route.replaceAll('/','')||'catalog'}.png`),fullPage:true});
 }
 await phone.close();
 const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});await reduced.goto(href('line-field/'));await reduced.locator('[data-demo]').scrollIntoViewIfNeeded();await expect(reduced.locator('[data-lab-host]')).toHaveAttribute('data-mounted','true');await expect(reduced.locator('[data-lab-host]')).toHaveAttribute('data-running','false');
 await reduced.getByRole('button',{name:'Resume',exact:true}).click();await expect(reduced.locator('[data-lab-host]')).toHaveAttribute('data-running','true');
 for(const route of ['', 'line-field/','compare/'])for(const width of [320,768,1440]){
  await reduced.setViewportSize({width,height:1000});await reduced.goto(href(route));await reduced.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert.ok(await reduced.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: enlarged text overflow ${route} ${width}`);
 }
 await reduced.close();
 const plain=await browser.newPage({javaScriptEnabled:false});await plain.goto(href('draw-a-world/'));await expect(plain.locator('[data-still]')).toBeVisible();await expect(plain.locator('a[download]').first()).toHaveAttribute('href',`${base}/lab/draw-a-world/source.zip`);await plain.close();
 const portable=await browser.newPage();const portableErrors=[];portable.on('pageerror',e=>portableErrors.push(e.message));portable.on('response',r=>{if(r.status()>=400)portableErrors.push(`${r.status()} ${r.url()}`);});
 await portable.goto(standalone);await expect(portable.locator('canvas')).toHaveCount(1);await portable.locator('#pause').click();await expect(portable.locator('#pause')).toHaveText('Resume');await portable.locator('#replay').click();
 await portable.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));document.dispatchEvent(new Event('visibilitychange'));});await expect(portable.locator('canvas')).toHaveCount(0);
 await portable.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(portable.locator('canvas')).toHaveCount(1);
 assert.deepEqual(portableErrors,[]);await portable.close();
 assert.deepEqual(errors,[]);console.log(`${name}: 14 independent studies, catalog/favorites/comparison, live settings, preset round trips and invalid imports, source ZIP with current settings, standalone export, fullscreen, lazy lifecycle/disposal, mobile, reduced motion, no JS and 9 enlarged-text layouts passed.`);
 await context.close();await browser.close();
}
}finally{await new Promise(resolve=>server.close(resolve));}
