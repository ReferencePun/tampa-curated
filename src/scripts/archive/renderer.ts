import {WebGLRenderer, OrthographicCamera, Scene, ShaderMaterial, PlaneGeometry, Mesh, Points, Vector2} from 'three';
import {gsap} from 'gsap';
import {samplePhotograph} from './sample';
import {photoVertex,photoFragment,inkVertex,inkFragment} from './shaders';

type Sample=ReturnType<typeof samplePhotograph>;
type Plate={
 element:HTMLElement;link:HTMLAnchorElement;image:HTMLImageElement;button:HTMLButtonElement;
 rect:{left:number;top:number;width:number;height:number};near:boolean;loading:boolean;sample?:Sample;
 scene?:Scene;photo?:ShaderMaterial;ink?:ShaderMaterial;pointer:Vector2;target:Vector2;trail:Vector2;
 strength:number;hover:boolean;energy:number;resolve:number;pinned:boolean;focused:boolean;selection:number;
};
const ease=(value:number,target:number,dt:number,ms:number)=>Math.abs(value-target)<.001?target:value+(target-value)*(1-Math.exp(-dt/ms));
export const archivePositionKey='tc-particle-archive-position';

export class ParticleArchive {
 private renderer:WebGLRenderer;
 private camera=new OrthographicCamera(-1,1,1,-1,0,1);
 private plane=new PlaneGeometry(2,2);
 private plates:Plate[]=[];
 private abort=new AbortController();
 private observer:IntersectionObserver;
 private resizeObserver:ResizeObserver;
 private raf=0;private lastTime=0;private dirty=true;private dead=false;private still=false;
 private viewport={width:innerWidth,height:innerHeight};
 private coarse=matchMedia('(pointer:coarse)').matches;
 private compact=this.coarse||innerWidth<700;
 private dpr=Math.min(devicePixelRatio,this.compact?1.25:1.65);
 private columns=this.compact?190:340;
 private radius=145;private falloff=.68;private frameCount=0;private slowFrames=0;
 private transition:gsap.core.Tween|null=null;private navigationTimer=0;private primed:HTMLAnchorElement|null=null;
 private pendingNavigation:(()=>void)|null=null;
 private selectedSlug='';
 private lastPointer:Vector2|null=null;

 constructor(private root:HTMLElement,private fail:()=>void, elements:HTMLElement[]){
  this.renderer=new WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:true});
  this.renderer.setClearColor(0,0);this.renderer.autoClear=false;
  this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(innerWidth,innerHeight,false);
  const canvas=this.renderer.domElement;canvas.className='particle-archive-canvas';canvas.setAttribute('aria-hidden','true');canvas.dataset.glassSurface='';
  document.body.append(canvas);
  this.plates=elements.map(element=>({element,link:element.querySelector('[data-archive-image]')!,image:element.querySelector('img')!,button:element.querySelector('[data-archive-uncover]')!,rect:{left:0,top:0,width:0,height:0},near:false,loading:false,pointer:new Vector2(.5,.5),target:new Vector2(.5,.5),trail:new Vector2(.5,.5),strength:0,hover:false,energy:0,resolve:0,pinned:false,focused:false,selection:0}));
  const options={signal:this.abort.signal};
  this.observer=new IntersectionObserver(entries=>{
   for(const entry of entries){const plate=this.plates.find(p=>p.link===entry.target);if(!plate)continue;
    plate.near=entry.isIntersecting;if(plate.near)void this.prepare(plate);
    else {plate.hover=false;plate.strength=0;plate.energy=0;}
   }this.wake();
  },{rootMargin:'500px 0px'});
  this.resizeObserver=new ResizeObserver(()=>{this.dirty=true;this.wake();});
  this.resizeObserver.observe(root);
  for(const plate of this.plates){
   this.observer.observe(plate.link);this.resizeObserver.observe(plate.link);
   plate.link.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||this.still)return;
    const x=(event.clientX-plate.rect.left)/plate.rect.width,y=1-(event.clientY+scrollY-plate.rect.top)/plate.rect.height;
    const distance=Math.hypot((x-plate.target.x)*plate.rect.width,(y-plate.target.y)*plate.rect.height);
    if(!plate.hover){plate.pointer.set(x,y);plate.trail.set(x,y);}
    plate.target.set(x,y);plate.energy=Math.min(1,plate.energy+distance*.025);plate.hover=true;this.wake();
   },{...options,passive:true});
   plate.link.addEventListener('pointerleave',()=>{plate.hover=false;this.wake();},options);
   plate.element.addEventListener('focusin',event=>{
    // Pointer focus must not turn a local brush into an all-image reveal.
    plate.focused=(event.target as HTMLElement).matches(':focus-visible');this.wake();
   },options);
   plate.element.addEventListener('focusout',()=>{plate.focused=false;this.wake();},options);
   plate.button.addEventListener('click',()=>{
    plate.pinned=!plate.pinned;plate.button.setAttribute('aria-pressed',String(plate.pinned));
    plate.button.textContent=plate.pinned?'Return to ink ↙':'Uncover image ↗';
    plate.focused=false;this.wake();
   },options);
  }
  root.addEventListener('click',event=>this.select(event),options);
  root.querySelector('[data-archive-mode-toggle]')?.addEventListener('click',()=>{
   this.still=!this.still;root.dataset.archiveMode=this.still?'still':'ink';
   const button=root.querySelector('[data-archive-mode-toggle]')!;
   button.textContent=this.still?'Return to ink':'Show photographs';button.setAttribute('aria-pressed',String(this.still));
   for(const plate of this.plates)plate.button.hidden=this.still||!plate.sample;
   this.wake();
  },options);
  for(const name of ['radius','falloff'] as const){
   root.querySelector<HTMLInputElement>(`[data-archive-${name}]`)?.addEventListener('input',event=>{
    const value=Number((event.target as HTMLInputElement).value);
    if(name==='radius')this.radius=value;else this.falloff=value/100;
    root.querySelector(`[data-${name}-value]`)!.textContent=String(value);this.wake();
   },options);
  }
  document.addEventListener('pointermove',event=>{
   if(event.pointerType!=='touch'){
    this.lastPointer??=new Vector2();this.lastPointer.set(event.clientX,event.clientY);
   }
  },{...options,passive:true});
  const leaveWindow=()=>{this.lastPointer=null;for(const plate of this.plates)plate.hover=false;this.wake();};
  document.addEventListener('pointerleave',leaveWindow,options);window.addEventListener('blur',leaveWindow,options);
  window.addEventListener('scroll',()=>{this.followScroll();this.wake();},{...options,passive:true});
  window.addEventListener('resize',()=>{this.dirty=true;this.wake();},options);
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden){cancelAnimationFrame(this.raf);this.raf=0;this.lastTime=0;this.pendingNavigation?.();}
   else {this.dirty=true;this.wake();}
  },options);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.pendingNavigation?.();this.fail();},options);
  void document.fonts.ready.then(()=>{this.dirty=true;this.wake();});
  root.dataset.archiveMode='ink';
  const modeButton=root.querySelector('[data-archive-mode-toggle]')!;
  modeButton.textContent='Show photographs';modeButton.setAttribute('aria-pressed','false');
  this.wake();
 }

 private async prepare(plate:Plate){
  if(this.dead||plate.loading||plate.sample)return;
  plate.loading=true;
  try{
   plate.image.loading='eager';await plate.image.decode();if(this.dead)return;
   const sample=samplePhotograph(plate.image,Number(plate.element.dataset.ratio),this.columns,731+this.plates.indexOf(plate)*8191);
   const uniforms={uSize:{value:new Vector2(1,1)},uPointer:{value:plate.pointer},uTrail:{value:plate.trail},uRadius:{value:this.radius},uFalloff:{value:this.falloff},uStrength:{value:0},uEnergy:{value:0},uResolve:{value:0},uSelection:{value:0},uDpr:{value:this.dpr},uCell:{value:1},uPhoto:{value:sample.texture},uCrop:{value:sample.crop}};
   const photo=new ShaderMaterial({uniforms,vertexShader:photoVertex,fragmentShader:photoFragment,transparent:true,depthTest:false,depthWrite:false});
   const ink=new ShaderMaterial({uniforms,vertexShader:inkVertex,fragmentShader:inkFragment,transparent:true,depthTest:false,depthWrite:false});
   const scene=new Scene(),image=new Mesh(this.plane,photo),points=new Points(sample.geometry,ink);
   image.frustumCulled=false;points.frustumCulled=false;image.renderOrder=0;points.renderOrder=1;scene.add(image,points);
   plate.sample=sample;plate.scene=scene;plate.photo=photo;plate.ink=ink;
   // Compile before suppressing the HTML fallback, avoiding a blank first plate.
   await this.renderer.compileAsync(scene,this.camera);if(this.dead)return;
   plate.element.dataset.particleReady='';plate.element.dataset.particleCount=String(sample.count);
   plate.button.hidden=this.still;
   this.root.querySelector<HTMLElement>('[data-archive-controls]')!.hidden=false;
   this.root.querySelector('[data-archive-instruction]')!.textContent=this.coarse?'Tap “Uncover image” to look beneath the ink.':'Move across a photograph to disturb the ink.';
   this.dirty=true;this.wake();
  }catch{
   // A failed photo remains an ordinary, usable editorial link.
   delete plate.element.dataset.particleReady;
   if(!this.plates.some(p=>p.element.hasAttribute('data-particle-ready')))this.fail();
  }
 }

 private measure(){
  this.viewport={width:innerWidth,height:innerHeight};
  this.renderer.setSize(innerWidth,innerHeight,false);
  for(const plate of this.plates){const rect=plate.link.getBoundingClientRect();plate.rect={left:rect.left,top:rect.top+scrollY,width:rect.width,height:rect.height};}
  this.followScroll();
  this.dirty=false;
 }

 private followScroll(){
  if(!this.lastPointer||this.still)return;
  for(const plate of this.plates){
   const r=plate.rect,x=(this.lastPointer.x-r.left)/r.width,y=1-(this.lastPointer.y+scrollY-r.top)/r.height;
   const inside=x>=0&&x<=1&&y>=0&&y<=1;
   if(inside){
    if(!plate.hover){plate.pointer.set(x,y);plate.trail.set(x,y);}
    else plate.energy=Math.min(1,plate.energy+Math.hypot((x-plate.target.x)*r.width,(y-plate.target.y)*r.height)*.025);
    plate.target.set(x,y);
   }
   plate.hover=inside;
  }
 }

 private wake=()=>{if(!this.dead&&!this.raf&&!document.hidden)this.raf=requestAnimationFrame(this.draw);};
 private draw=(time:number)=>{
  this.raf=0;if(this.dead||document.hidden)return;
  const dt=this.lastTime?Math.min(50,time-this.lastTime):16;
  if(this.lastTime&&time-this.lastTime>28&&time-this.lastTime<150)this.slowFrames++;else this.slowFrames=Math.max(0,this.slowFrames-1);
  if(this.slowFrames>24&&this.dpr>1){this.dpr=1;this.columns=this.compact?155:260;this.renderer.setPixelRatio(1);this.dirty=true;this.slowFrames=0;}
  if(this.dirty)this.measure();
  const {width,height}=this.viewport;
  this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,width,height);this.renderer.clear();
  let moving=false;
  if(!this.still)for(const plate of this.plates){
   if(!plate.scene||!plate.ink||!plate.element.hasAttribute('data-particle-ready'))continue;
   const r=plate.rect,top=r.top-scrollY;
   if(top>=height||top+r.height<=0||r.width<1||plate.element.hasAttribute('data-archive-transition'))continue;
   const targetResolve=plate.pinned||plate.focused?1:0;
   plate.strength=ease(plate.strength,plate.hover?1:0,dt,150);
   if(!this.transition)plate.resolve=ease(plate.resolve,targetResolve,dt,170);
   plate.pointer.set(ease(plate.pointer.x,plate.target.x,dt,65),ease(plate.pointer.y,plate.target.y,dt,65));
   plate.trail.set(ease(plate.trail.x,plate.pointer.x,dt,130),ease(plate.trail.y,plate.pointer.y,dt,130));
   plate.energy=ease(plate.energy,0,dt,180);
   moving||=plate.strength!==(plate.hover?1:0)||plate.resolve!==targetResolve||plate.energy>0||!plate.pointer.equals(plate.target)||!plate.trail.equals(plate.pointer);
   const u=plate.ink.uniforms;u.uSize.value.set(r.width,r.height);u.uRadius.value=this.radius;u.uFalloff.value=this.falloff;
   u.uStrength.value=plate.strength;u.uEnergy.value=plate.energy;u.uResolve.value=plate.resolve;u.uSelection.value=plate.selection;
   u.uCell.value=r.width/plate.sample!.columns;u.uDpr.value=this.dpr;
   this.renderer.setViewport(r.left,height-top-r.height,r.width,r.height);
   const bottom=Math.max(0,height-top-r.height),right=Math.min(width,r.left+r.width);
   this.renderer.setScissor(Math.max(0,r.left),bottom,Math.max(0,right-Math.max(0,r.left)),Math.min(height,height-top)-bottom);
   this.renderer.setScissorTest(true);this.renderer.render(plate.scene,this.camera);
  }
  this.renderer.setScissorTest(false);
  this.root.style.setProperty('--archive-angle',`${scrollY*.035}deg`);
  this.frameCount++;
  if(moving){this.lastTime=time;this.wake();}
  else {this.lastTime=0;this.renderer.domElement.dataset.frames=String(this.frameCount);}
 };

 private select(event:MouseEvent){
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-shared-link]');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
  const plate=this.plates.find(p=>p.element.contains(link));if(!plate)return;
  this.selectedSlug=plate.element.dataset.story!;this.savePosition();
  if(link===this.primed||this.still||!plate.sample||this.dead)return;
  event.preventDefault();if(this.pendingNavigation)return;
  this.root.setAttribute('aria-busy','true');
  const navigate=()=>{
   if(!this.pendingNavigation)return;this.pendingNavigation=null;clearTimeout(this.navigationTimer);
   this.transition?.kill();this.transition=null;this.primed=link;
   plate.element.dataset.archiveTransition='';this.wake();
   // Fresh native click reaches the existing cross-document image transition
   // handler, and preserves normal browser URL/history/focus behavior.
   link.click();
  };
  this.pendingNavigation=navigate;
  this.navigationTimer=window.setTimeout(navigate,650);
  this.transition=gsap.to(plate,{resolve:1,selection:1,duration:.28,ease:'power2.out',onUpdate:this.wake,onComplete:()=>{
   plate.element.dataset.archiveTransition='';this.wake();
   requestAnimationFrame(()=>requestAnimationFrame(navigate));
  }});
 }

 savePosition(){
  if(!this.selectedSlug)return;
  try{sessionStorage.setItem(archivePositionKey,JSON.stringify({slug:this.selectedSlug,y:scrollY,time:Date.now()}));}catch{/* Storage is optional. */}
 }

 dispose(){
  if(this.dead)return;this.dead=true;this.abort.abort();this.observer.disconnect();this.resizeObserver.disconnect();cancelAnimationFrame(this.raf);
  clearTimeout(this.navigationTimer);this.transition?.kill();this.pendingNavigation=null;this.root.removeAttribute('aria-busy');
  for(const plate of this.plates){plate.sample?.geometry.dispose();plate.sample?.texture.dispose();plate.photo?.dispose();plate.ink?.dispose();delete plate.element.dataset.particleReady;delete plate.element.dataset.archiveTransition;plate.button.hidden=true;}
  this.plane.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();this.root.dataset.archiveMode='still';
  this.root.querySelector<HTMLElement>('[data-archive-controls]')!.hidden=true;
 }
}
