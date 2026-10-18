import {webkit,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const browser=await webkit.launch();
const out='test-results/particle-photos';
await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:2,reducedMotion:'reduce',acceptDownloads:true});
 await page.goto('http://127.0.0.1:4321/tampa-curated/lab/particle-photos/');
 await page.locator('[data-demo]').scrollIntoViewIfNeeded();
 await expect(page.locator('.pp')).toHaveAttribute('data-ready','true');
 const download=page.waitForEvent('download');
 await page.locator('.pp [data-save]').click();
 const png=await readFile(await(await download).path());
 const preview=await page.evaluate(async base64=>{
  const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
  const c=document.createElement('canvas');c.width=800;c.height=Math.round(800*image.height/image.width);
  const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);
  return {url:c.toDataURL(),height:c.height};
 },png.toString('base64'));
 if(process.argv.includes('--thumbnail'))await writeFile('src/creative-lab/experiments/particle-photos/assets/preview.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${preview.height}"><title>Amber photographic dust — Tampa palms in fine image-derived grains</title><image width="800" height="${preview.height}" href="${preview.url}"/></svg>`);
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-reference-rest.png`});
 await page.emulateMedia({reducedMotion:'no-preference'});
 // A real pointer sweep through the photograph, including the native input adapter.
 const b=await page.locator('.pp-stage').boundingBox();
 await page.mouse.move(b.x+b.width*.32,b.y+b.height*.6);
 await page.mouse.move(b.x+b.width*.68,b.y+b.height*.46,{steps:12});
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-reference-sweep.png`});
 await page.mouse.move(1,1);
 await page.waitForTimeout(350);
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-wake-early.png`});
 await page.waitForTimeout(550);
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-wake-middle.png`});
 await page.waitForTimeout(550);
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-wake-late.png`});
 await page.waitForTimeout(1600);
 const frames=await page.locator('.pp').getAttribute('data-frames');
 await page.waitForTimeout(200);
 await expect(page.locator('.pp')).toHaveAttribute('data-frames',frames);
 const metrics=await page.evaluate(async()=>{
  const stage=document.querySelector('.pp-stage'),root=document.querySelector('.pp'),r=stage.getBoundingClientRect();
  const start=performance.now(),first=Number(root.dataset.frames);
  await new Promise(resolve=>{function step(t){const elapsed=t-start;stage.dispatchEvent(new PointerEvent('pointermove',{clientX:r.x+r.width*(.5+Math.sin(elapsed*.005)*.25),clientY:r.y+r.height*(.5+Math.cos(elapsed*.003)*.15),pointerType:'mouse',bubbles:true}));if(elapsed<2000)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
  return {fps:Math.round((Number(root.dataset.frames)-first)*1000/(performance.now()-start)),count:root.dataset.count};
 });
 console.log('WebKit continuous sweep:',metrics);
 await page.locator('[data-preset]').selectOption('etching');
 await expect(page.locator('.pp')).toHaveAttribute('data-surface','paper');
 await page.locator('.pp-stage').screenshot({path:`${out}/webkit-ivory-preset.png`});
 console.log('Fine-grain still, photographic sweep, idle stop and ivory preset visually captured.');
}finally{await browser.close();}
