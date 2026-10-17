import {createInkEngine,paperView} from './engine.js';
import {options,RECIPES} from './model.js';
import {HERON_URL,OBSERVATORY_PATHS,pathMask,imageMask,loadImage} from './masks.js';
import {styles} from './styles.js';

export function mount(host,initial={},report=()=>{}){
 const root=document.createElement('div');root.className='li';
 root.innerHTML=`<style>${styles}</style><div class="li-modes" role="group" aria-label="Ink modes"><button data-mode="organic"><small>01 / FREE GROWTH</small>Reaction ink</button><button data-mode="architecture"><small>02 / LIVING LINES</small>Architecture</button><button data-mode="image"><small>03 / HIDDEN IMAGE</small>Ink to image</button></div><div class="li-tools"><select aria-label="Ink recipe" data-recipe><option value="">Choose an ink recipe</option>${Object.entries(RECIPES).map(([id,r])=>`<option value="${id}">${r.name}</option>`).join('')}</select><button data-clear>Clear paper</button><button data-reseed>Reseed</button><button data-png>Save still ↓</button><label class="li-upload" hidden>Use your image<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Supply an image mask"/></label><button data-heron hidden>Use the heron</button></div><div class="li-stage" tabindex="0" role="group" aria-label="Living ink paper. Draw with a pointer or finger. Arrow keys move the brush; Enter places ink. Use Pause above to hold the simulation."><div class="li-caption" aria-hidden="true"><span data-title>FIELD 04 / REACTION INK</span><span data-clock>THE FIRST DROP</span></div><i class="li-corner a"></i><i class="li-corner b"></i><span class="li-poem">leave room for what happens next.</span><i class="li-cursor"></i><div class="li-error" role="status" hidden></div></div><div class="li-foot"><p class="li-status" role="status" aria-live="polite">Place a little ink. Let the paper take it from there.</p><div class="li-meta"><span data-engine>Preparing the paper…</span><button data-step>Grow one moment →</button></div><p class="li-hint">Draw to plant ink. Pause above to hold it; grow one moment to inspect the next stage. Recipes save the parameters; a still saves the marks. <span data-image-note hidden>Your image stays on this device, for this session only. Source exports include the original heron mask.</span></p></div>`;
 host.append(root);const $=s=>root.querySelector(s),stage=$('.li-stage'),status=$('.li-status'),error=$('.li-error'),recipe=$('[data-recipe]');
 const abort=new AbortController(),signal=abort.signal;
 let settings=options(initial),engine=null,running=false,ready=false,disposed=false,raf=0,last=0,frames=0,fps=0,generation=0,resizeTimer=0,uploadGeneration=0,forceCPU=false;
 let image=null,customImage=null,customName='',pointer=null,cursor={x:.5,y:.5},pending=[],rebuildTimer=0;
 const originalImage=loadImage(HERON_URL).then(value=>{image=value;return value;});originalImage.catch(()=>{});
 function say(message){status.textContent=message;}
 function publish(){root.dispatchEvent(new CustomEvent('lab:settings',{bubbles:true,detail:{...settings}}));}
 function stats(){if(!engine)return;root.dataset.steps=String(engine.steps);root.dataset.backend=engine.backend;root.dataset.mode=settings.mode;root.dataset.ready=String(ready);root.dataset.running=String(running&&ready);root.dataset.resolution=`${engine.width}×${engine.height}`;report({fps:running?fps:0,width:engine.canvas.width,height:engine.canvas.height,primitives:engine.width*engine.height,frames,running:running&&ready,renderer:engine.backend==='GPU'?'WebGL2 / Gray–Scott':'Canvas 2D / Gray–Scott'});}
 function paint(){if(!engine||disposed)return;engine.render();frames++;$('[data-clock]').textContent=`${engine.steps.toLocaleString()} GROWTH STEPS`;$('[data-engine]').textContent=`${engine.width} × ${engine.height} cells · ${engine.backend==='GPU'?'GPU ink':'smaller CPU study'}${running?'':' · held'}`;stats();}
 function fit(){if(!engine||disposed)return;const r=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.75);engine.resize(r.width*dpr,r.height*dpr);positionCursor();paint();}
 function syncMode(){root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===settings.mode)));$('.li-upload').hidden=settings.mode!=='image';$('[data-heron]').hidden=settings.mode!=='image'||!customImage;$('[data-image-note]').hidden=settings.mode!=='image';$('[data-title]').textContent=settings.mode==='organic'?'FIELD 04 / REACTION INK':settings.mode==='architecture'?'PLATE 04 / THE OBSERVATORY':`PLATE 04 / ${customImage?'YOUR IMAGE':'THE HERON'}`;}
 function start(){if(!raf&&running&&ready&&!disposed){last=performance.now();raf=requestAnimationFrame(tick);}}
 function tick(time){
  raf=0;if(!running||!ready||disposed)return;
  const elapsed=time-last;if(elapsed<32){raf=requestAnimationFrame(tick);return;}
  last=time;fps=Math.round(1000/elapsed);flush();engine.step(Math.max(1,Math.round(settings.speed*Math.min(1.5,elapsed/33.333)*(engine.backend==='CPU'?.35:1))));paint();raf=requestAnimationFrame(tick);
 }
 async function build({reseed=true}={}){
  const token=++generation;ready=false;cancelAnimationFrame(raf);raf=0;pending=[];pointer=null;
  engine?.dispose();engine?.canvas.remove();engine=null;syncMode();error.hidden=true;
  try{
   engine=createInkEngine({settings,forceCPU});const active=engine;active.canvas.setAttribute('aria-label','Procedural ink on ivory paper');stage.prepend(active.canvas);
   active.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(disposed||engine!==active)return;forceCPU=true;say('Graphics were interrupted. Continuing with a smaller ink study and fresh seeds.');void build();},{signal});
   fit();let mask;
   if(settings.mode==='image'){const source=customImage||image||await originalImage;if(disposed||token!==generation)return;mask=imageMask(source,active.width,active.height);}
   else mask=settings.mode==='architecture'?pathMask(OBSERVATORY_PATHS,active.width,active.height):new Uint8Array(active.width*active.height*4);
   if(disposed||token!==generation)return;active.setMask(mask);if(reseed)active.reseed();ready=true;paint();start();
  }catch(e){if(disposed||token!==generation)return;error.hidden=false;error.textContent=`The paper could not start: ${e.message}. Try a different ink mode or reload the page.`;stats();}
 }
 function apply(next){
  const before=settings;settings=options(next);syncMode();recipe.value='';
  if(before.resolution!==settings.resolution){ready=false;cancelAnimationFrame(raf);raf=0;clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>void build(),160);say('Changing the paper grain starts a new field.');return;}
  if(before.mode!==settings.mode){clearTimeout(rebuildTimer);void build();say(settings.mode==='architecture'?'Touch a faint line. Ink follows the architecture.':settings.mode==='image'?'Seed the paper to uncover an original heron drawing. The image emerges only where ink has travelled.':'Place a little ink. Let the paper take it from there.');return;}
  engine?.update(settings);if(before.seed!==settings.seed&&ready)engine.reseed();paint();
 }
 root.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.mode;if(key===settings.mode)return;const next=key==='architecture'?RECIPES.architecture.settings:key==='image'?RECIPES.image.settings:RECIPES.branches.settings;apply({...settings,...next,resolution:settings.resolution,ink:settings.ink});publish();},{signal}));
 recipe.addEventListener('change',()=>{const id=recipe.value;if(!RECIPES[id])return;const replaceMask=customImage&&settings.mode===RECIPES[id].settings.mode;customImage=null;customName='';apply({...RECIPES[id].settings,resolution:settings.resolution});if(replaceMask)void build();else if(ready){engine.reseed();paint();}recipe.value=id;say(`${RECIPES[id].name.slice(5)} — a fresh recipe, with room to grow.`);publish();recipe.value=id;},{signal});
 $('[data-clear]').addEventListener('click',()=>{if(!ready)return;pending=[];engine.clear();paint();say('A clean sheet. Nothing grows until you place a new seed.');},{signal});
 $('[data-reseed]').addEventListener('click',()=>{if(!ready)return;pending=[];settings={...settings,seed:settings.seed%999+1};engine.update(settings);engine.reseed();paint();publish();say('Fresh origins. The same chemistry, another drawing.');},{signal});
 $('[data-step]').addEventListener('click',()=>{if(!ready)return;flush();engine.step(engine.backend==='GPU'?160:60);paint();say('One moment of growth. Use Pause above to hold the paper between steps.');},{signal});
 $('[data-png]').addEventListener('click',async event=>{
  if(!ready)return;const button=event.currentTarget;button.disabled=true;
  try{const blob=await engine.exportPNG();if(disposed)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`living-ink-${settings.mode}-${engine.steps}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Saved this moment as a PNG. The living field continues here.');}
  catch(e){if(!disposed)say(e.message);}finally{button.disabled=false;}
 },{signal});
 $('.li-upload input').addEventListener('change',async event=>{
  const input=event.target,file=input.files?.[0];if(!file)return;const token=++uploadGeneration;let url;
  try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8_000_000)throw new Error('Choose a PNG, JPEG or WebP smaller than 8 MB.');url=URL.createObjectURL(file);const supplied=await loadImage(url);if(disposed||token!==uploadGeneration)return;if(supplied.naturalWidth*supplied.naturalHeight>16_000_000)throw new Error('Choose an image under 16 megapixels.');customImage=supplied;customName=file.name;await build();say(`“${customName}” is now guiding the ink. Dark details receive more pigment. This image stays in this session.`);}
  catch(e){if(!disposed)say(e.message);}finally{if(url)URL.revokeObjectURL(url);input.value='';}
 },{signal});
 $('[data-heron]').addEventListener('click',()=>{++uploadGeneration;customImage=null;customName='';void build();say('The original heron is hidden in the paper again.');},{signal});
 function positionCursor(){if(!engine)return;const [x,y,w,h]=paperView(stage.clientWidth,stage.clientHeight),dot=$('.li-cursor');dot.style.left=`${x+cursor.x*w}px`;dot.style.top=`${y+cursor.y*h}px`;dot.style.width=dot.style.height=`${settings.radius/384*w*2}px`;}
 function point(event){const b=stage.getBoundingClientRect(),[x,y,w,h]=paperView(b.width,b.height);return {x:(event.clientX-b.left-x)/w,y:(event.clientY-b.top-y)/h};}
 function deposit(p,previous){
  if(p.x<0||p.x>1||p.y<0||p.y>1)return;cursor=p;positionCursor();const radius=settings.radius/384;
  const n=previous?Math.min(32,Math.max(1,Math.ceil(Math.hypot(p.x-previous.x,(p.y-previous.y)/1.5)/(radius*.5)))):1;
  for(let i=1;i<=n;i++)pending.push({x:previous?previous.x+(p.x-previous.x)*i/n:p.x,y:previous?previous.y+(p.y-previous.y)*i/n:p.y,radius,amount:settings.concentration});
  if(pending.length>96)pending=pending.slice(-96);if(!running){flush();paint();}
 }
 function flush(){if(pending.length&&ready){engine.brush(pending);pending=[];}}
 stage.addEventListener('pointerdown',event=>{if(!ready||event.button!==0||pointer)return;stage.focus({preventScroll:true});const p=point(event);pointer={id:event.pointerId,point:p};stage.setPointerCapture(event.pointerId);deposit(p);},{signal});
 stage.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId)return;const p=point(event);deposit(p,pointer.point);pointer.point=p;},{signal});
 function release(event){if(!pointer||pointer.id!==event.pointerId)return;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);pointer=null;flush();paint();}
 stage.addEventListener('pointerup',release,{signal});stage.addEventListener('pointercancel',release,{signal});stage.addEventListener('lostpointercapture',()=>{pointer=null;},{signal});
 stage.addEventListener('keydown',event=>{if(!ready)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();cursor={x:Math.max(.02,Math.min(.98,cursor.x+(event.key==='ArrowRight'?.025:event.key==='ArrowLeft'?-.025:0))),y:Math.max(.02,Math.min(.98,cursor.y+(event.key==='ArrowDown'?.025:event.key==='ArrowUp'?-.025:0)))};positionCursor();}if(event.key==='Enter'){event.preventDefault();deposit(cursor);flush();paint();say('Ink placed at the brush. Move with arrow keys to place another seed.');}},{signal});
 const observer=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,50);});observer.observe(stage);void build();
 return {update:apply,setRunning(value){running=Boolean(value);if(!running){cancelAnimationFrame(raf);raf=0;flush();paint();}else start();stats();},replay(){if(ready){pending=[];engine.reseed();paint();}},
  // Explicit readback is for snapshots/tests; the animation never reads GPU state.
  snapshot:()=>engine?.read(),getEngine:()=>engine,
  dispose(){if(disposed)return;disposed=true;++generation;++uploadGeneration;abort.abort();observer.disconnect();clearTimeout(resizeTimer);clearTimeout(rebuildTimer);cancelAnimationFrame(raf);engine?.dispose();customImage=null;image=null;root.remove();}
 };
}
