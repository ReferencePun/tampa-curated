import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';
import {chromium, webkit, expect} from '@playwright/test';

const variant=process.env.TEST_PAGE||'home2';
const url=`${process.env.TEST_ORIGIN||'http://127.0.0.1:4321'}${process.env.TEST_BASE??'/tampa-curated'}/${variant}/`;
const output=`test-results/${variant==='home2'?'engraving':'expressive'}`;
mkdirSync(output,{recursive:true});
const report=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await engine.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.goto(url);
  await page.evaluate(()=>document.fonts.ready);
  // Settle the existing lazy portrait viewer before measuring the plate positions.
  await page.locator('.photographic-sleeve').scrollIntoViewIfNeeded();
  await expect(page.locator('.photographic-sleeve')).toHaveClass(/is-ready/);
  await page.waitForTimeout(400);
  const scrollProgress=async (kind,p)=>{
    await page.locator(`[data-machine="${kind}"]`).evaluate((el,{kind,p})=>{
      const top=el.getBoundingClientRect().top+scrollY;
      const start=kind==='hero'?top:top-innerHeight*.85;
      const end=top+el.offsetHeight-innerHeight*(kind==='hero'?.65:.25);
      scrollTo({top:start+(end-start)*p,behavior:'instant'});
    },{kind,p});
    await expect.poll(async()=>Number(await page.locator(`[data-machine="${kind}"]`).getAttribute('data-machine-progress'))).toBeCloseTo(p,2);
    await page.waitForTimeout(80);
  };
  const state=kind=>page.locator(`[data-machine="${kind}"]`).evaluate(el=>({
    progress:Number(el.dataset.machineProgress),
    gears:[...el.querySelectorAll('[data-gear]')].map(g=>({angle:Number(g.getAttribute('transform').match(/rotate\(([-.\d]+)/)[1]),teeth:Number(g.dataset.teeth||0),r:Number(g.dataset.pitchRadius||0),center:g.parentElement.getAttribute('transform')})),
    iris:Number(el.querySelector('[data-iris-hole]')?.getAttribute('r')||0),
    reveal:Number(el.querySelector('[data-drawing-window]')?.getAttribute('width')||0),
    line:el.querySelector('[data-drawing]')?.style.strokeDashoffset,
    cranks:[...el.querySelectorAll('[data-crank]')].map(c=>{
      const values=c.querySelector('[data-connecting-rod]').getAttribute('d').match(/-?[\d.]+(?:e[+-]?\d+)?/g).map(Number);
      const [x,y,sx,sy]=values;
      return {length:Math.hypot(sx-x,sy-y),expected:Number(c.dataset.rodLength),radius:Math.hypot(x,y),expectedRadius:Number(c.dataset.radius),sliderX:sx};
    }),
    lift:el.querySelector('.pulley-lift')?.style.transform,
    moving:[...el.querySelectorAll('[data-gear],[data-connecting-rod],[data-iris-hole],[data-iris-cutout],[data-drawing],[data-counterweight]')].map(e=>[e.getAttribute('transform'),e.getAttribute('r'),e.getAttribute('d'),e.getAttribute('style')]),
  }));
  let meshChecks=0;
  for(const kind of ['hero','drawing','pulley','aperture','map']) {
    await scrollProgress(kind,.2); const a=await state(kind);
    await scrollProgress(kind,.7); const b=await state(kind);
    assert(b.gears.some((g,i)=>Math.abs(g.angle-a.gears[i].angle)>15),`${kind}: gears advance`);
    for(let i=0;i<b.gears.length;i++)for(let j=i+1;j<b.gears.length;j++){
      const g=b.gears[i],h=b.gears[j];
      if(!g.teeth||!h.teeth||!g.center?.startsWith('translate')||!h.center?.startsWith('translate'))continue;
      const [gx,gy]=g.center.match(/-?[\d.]+/g).map(Number),[hx,hy]=h.center.match(/-?[\d.]+/g).map(Number);
      // A pitch-circle contact is an independently identifiable gear mesh.
      if(Math.abs(Math.hypot(gx-hx,gy-hy)-g.r-h.r)<.2){
        const dg=g.angle-a.gears[i].angle,dh=h.angle-a.gears[j].angle;
        assert(dg*dh<0,`${kind}: meshing gears oppose each other`);
        assert(Math.abs(dg*g.teeth+dh*h.teeth)<.02,`${kind}: tooth travel agrees`);
        meshChecks++;
      }
    }
    for(const crank of [...a.cranks,...b.cranks]){
      assert(Math.abs(crank.length-crank.expected)<.001,'Connecting rods retain their length');
      assert(Math.abs(crank.radius-crank.expectedRadius)<.001,'Crank stays on its pivot circle');
      assert.equal(crank.sliderX,0,'Piston stays on its guide');
    }
    if(kind==='hero'||kind==='aperture')assert(b.iris>a.iris*1.2,`${kind}: photograph opens`);
    if(kind==='drawing')assert(b.reveal>a.reveal+200,'Photograph emerges through drawing');
    if(b.line)assert(Number(b.line)<Number(a.line),'Construction lines draw forward');
    if(kind==='pulley'){
      assert.notEqual(a.lift,b.lift,'Portrait frame travels');
      const attachment=await page.locator('.pulley-assembly').evaluate(el=>{
        const lift=el.querySelector('.pulley-lift').getBoundingClientRect();
        const svg=el.querySelector('svg'),matrix=svg.getScreenCTM();
        const cable=svg.querySelector('[data-lift-cable]');
        const end=cable.getPointAtLength(cable.getTotalLength()).matrixTransform(matrix);
        return {dx:Math.abs(lift.left-end.x),dy:Math.abs(lift.top-end.y)};
      });
      assert(attachment.dx<2&&attachment.dy<2,`Cables meet the lifted frame: ${JSON.stringify(attachment)}`);
      const wheels=await page.locator('.gallery-rig [data-pulley-radius]').evaluateAll(els=>els.map(e=>Number(e.getAttribute('transform').match(/[-\d.]+/)[0])));
      assert(wheels[0]*wheels[1]<0&&Math.abs(wheels[0]+wheels[1])<.001,'Crossed belt counterrotates equal wheels');
    }
    await page.waitForTimeout(500);
    assert.deepEqual((await state(kind)).moving,b.moving,`${kind}: stopping scroll freezes the machine`);
    await scrollProgress(kind,.2); const reversed=await state(kind);
    assert.deepEqual(reversed.moving,a.moving,`${kind}: scroll reversal restores the exact pose`);
    await scrollProgress(kind,.55);
    await page.screenshot({path:`${output}/${name}-${kind}.png`});
  }
  assert(meshChecks>=5,`${name}: expected multiple physical gear meshes, found ${meshChecks}`);
  // Motion preference teardown must restore open photographs and remove triggers.
  await page.getByRole('button',{name:'Reduced',exact:true}).click();
  await expect(page.locator('[data-machine-ready]')).toHaveCount(0);
  assert(Number(await page.locator('[data-machine="drawing"] [data-drawing-window]').getAttribute('width'))===492);
  const staticGear=await page.locator('.hero-assembly [data-gear]').first().getAttribute('transform');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.hero-assembly [data-gear]').first().getAttribute('transform'),staticGear);
  await page.getByRole('button',{name:'System',exact:true}).click();
  await expect(page.locator('[data-machine-ready]')).toHaveCount(5);
  for(const [width,height] of [[768,1024],[594,650],[390,844],[320,667],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(150);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: no horizontal overflow`);
    const heroName=await page.locator('.hero-name').boundingBox();
    const heroCopy=await page.locator('.hero-editorial').boundingBox();
    const illustration=await page.locator('.hero-instrument').boundingBox();
    if(width<=800){
      assert(illustration.y>=heroName.y+heroName.height,'Mobile illustration clears the title');
      assert(heroCopy.y>=illustration.y+illustration.height,'Mobile introduction clears the illustration');
    }
    if(width===390)await page.screenshot({path:`${output}/${name}-mobile.png`});
  }
  assert.deepEqual(errors,[],`${name}: browser errors`);
  const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
  const rp=await reduced.newPage();await rp.goto(url);
  await expect(rp.locator('[data-machine-ready]')).toHaveCount(0);
  assert.equal(await rp.locator('[data-machine="drawing"] [data-drawing-window]').getAttribute('width'),'492');
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const sp=await nojs.newPage();await sp.goto(url);
  assert.equal(await sp.locator('.map-destinations a:visible').count(),6);
  assert.equal(await sp.locator('.story-register a:visible').count(),4);
  await sp.getByRole('link',{name:'Take a detour through Ybor'}).click();
  await expect(sp.locator('h1')).toContainText('Ybor City');
  report.push({browser:name,version:browser.version(),meshChecks,checks:'Five reversible scroll mechanisms; exact idle poses; tooth ratios; fixed-length rods; gallery cable attachment and crossed belt; reveal; reduced-motion teardown; responsive layouts; static links',errors});
  console.log(name,report.at(-1));
  await browser.close();
}
writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2));
