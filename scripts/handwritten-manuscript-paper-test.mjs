import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';
import {bundle} from './lab-package.mjs';
const {files}=await bundle('handwritten-manuscript'),out=path.resolve('test-results/handwritten-manuscript');await mkdir(out,{recursive:true});
assert.ok(files['creative-lab/experiments/handwritten-manuscript/text-structures.js']);
const server=createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1);if(!files[name]){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'})[path.extname(name)]||'application/octet-stream');res.end(files[name]);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/example.html`;
try{for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await expect(page.locator('.hm')).toHaveAttribute('data-ready','true',{timeout:30000});
 await page.locator('[data-travel]').fill('680');await page.locator('.hm-stage').screenshot({path:path.join(out,`${name}-warm-text.png`)});
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 const report=await page.evaluate(async()=>{
  const base='./creative-lab/experiments/handwritten-manuscript/';
  const {createViewer}=await import(base+'viewer.js'),{DEMO,DEFAULTS}=await import(base+'content.js');
  const canvas=document.createElement('canvas');canvas.style.cssText='width:900px;height:650px';document.body.append(canvas);const viewer=await createViewer(canvas),gl=canvas.getContext('webgl2');
  const paper=[];
  for(const p of [0,.29,.61,.619,.62,.621,.68,.799,.8,.81,.939,.94,.95]){
   const state=viewer.render(p),data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
   let white=0,warm=0;const bins=new Map();
   for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(r>230&&g>230&&b>225)white++;if(r>190&&r-g>7&&g-b>16){warm++;const key=[r>>2,g>>2,b>>2].join(',');bins.set(key,(bins.get(key)||0)+1);}}
   const mode=[...bins].sort((a,b)=>b[1]-a[1])[0]?.[0].split(',').map(v=>Number(v)*4);paper.push({p,room:state.room,white:white/(data.length/4),warm:warm/(data.length/4),mode});
  }
  viewer.dispose();canvas.remove();
  // Inspect the actual exported scene graph, not only its reported diagnostics.
  const {buildArchitecture}=await import(base+'architecture.js'),{makeAtlas}=await import(base+'typography.js'),{acquireHandwriting}=await import(base+'hand.js');
  const release=await acquireHandwriting(),font=await(await fetch(base+'assets/caveat-outlines.json')).json(),o=await(await fetch(base+'assets/helvetiker.json')).json();font.glyphs.O=o.glyphs.O;
  const atlas=makeAtlas(DEMO.texts,DEFAULTS,{mobile:true}),architecture=buildArchitecture(DEMO,atlas,font,DEFAULTS),unexpected=[];let textMeshes=0,smudges=0;
  for(const cell of architecture.cells.values())cell.root.traverse(obj=>{if(obj.isLine||obj.isLineSegments)unexpected.push(obj.type);if(obj.isMesh){if(obj.geometry.attributes.glyphUV)textMeshes++;else if(obj.name.includes('eraser')||obj.name.includes('Graphite'))smudges++;else unexpected.push(obj.name||obj.type);}});
  architecture.dispose();atlas.dispose();release();return {paper,unexpected,textMeshes,smudges};
 });
 assert.deepEqual(report.unexpected,[],'No non-text architectural solids or outlines');assert.ok(report.textMeshes>=6);assert.ok(report.smudges>=6);
 for(const sample of report.paper){assert.ok(sample.white<.001,`${sample.p}: white flash or white glyph background`);assert.ok(sample.warm>.18,`${sample.p}: yellow paper must remain visible`);assert.ok(sample.mode[0]-sample.mode[1]>=8&&sample.mode[1]-sample.mode[2]>=20);}
 assert.deepEqual(errors,[]);await writeFile(path.join(out,`${name}-paper-analysis.json`),JSON.stringify(report,null,2));console.log(`${name}: warm paper across 13 positions/portal boundaries; exported architecture entirely glyphs; graphite residue and cleanup verified.`);
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
