import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('http://127.0.0.1:4321/tampa-curated/');
await page.evaluate(()=>document.fonts.ready);
await page.locator('.photographic-sleeve').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const samples=[];
for(const kind of ['hero','drawing','pulley','aperture','map']){
 await page.locator(`[data-machine="${kind}"]`).evaluate(el=>scrollTo({top:el.getBoundingClientRect().top+scrollY,behavior:'instant'}));
 await page.waitForTimeout(300);
 samples.push(await page.locator(`[data-machine="${kind}"]`).evaluate(async root=>{
  const top=root.getBoundingClientRect().top+scrollY;
  const hero=root.dataset.machine==='hero';
  const start=top-(hero?0:innerHeight*.85),end=top+root.offsetHeight-innerHeight*(hero?.65:.25);
  const frames=[],tasks=[];let previous=0;
  const observer=new PerformanceObserver(list=>tasks.push(...list.getEntries().map(e=>e.duration)));
  observer.observe({type:'longtask'});
  for(let i=0;i<120;i++){
   const now=await new Promise(resolve=>requestAnimationFrame(resolve));
   if(previous)frames.push(now-previous);previous=now;
   scrollTo({top:start+(end-start)*(.2+.6*Math.sin(i/119*Math.PI)),behavior:'instant'});
  }
  observer.disconnect();frames.sort((a,b)=>a-b);
  return {plate:root.dataset.machine,samples:frames.length,medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)],worstMs:Math.max(...frames),over25ms:frames.filter(n=>n>25).length,longTasks:tasks};
 }));
}
const result={conditions:'Local unthrottled headless Chromium, 1440×900. Automated frame cadence, not physical-device FPS.',samples};
mkdirSync('test-results/engraving',{recursive:true});
writeFileSync('test-results/engraving/performance.json',JSON.stringify(result,null,2));
console.log(result);await browser.close();
