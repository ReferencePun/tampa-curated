import {options,frameState,advance,fitImage,particlePose} from './model.js';
import {prepareImage} from './images.js';
import {gpuRenderer,cpuRenderer} from './renderer.js';

// The portable image effect owns one texture, one instance buffer and one canvas.
// Its adapter owns pointer events and visibility. There is no gallery/site import.
export function createParticleImage({image,canvas=document.createElement('canvas'),width=900,height=600,settings={},forceCPU=false,onFrame=()=>{},onContextLoss=()=>{}}){
 let config=options(settings),renderer,source=image,prepared,disposed=false,running=false,raf=0,last=0,frames=0,builds=0,timer=0,fps=0,cssWidth=width,cssHeight=height,dpr=1;
 const state=frameState(config),target={...state},abort=new AbortController();
 if(!forceCPU){try{renderer=gpuRenderer(canvas);}catch{canvas=document.createElement('canvas');}}
 if(!renderer)renderer=cpuRenderer(canvas);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(!disposed){running=false;cancelAnimationFrame(raf);raf=0;onContextLoss();}},{signal:abort.signal});
 function view(){return fitImage(canvas.width,canvas.height,prepared?.sampled.aspect||1.5,Math.min(cssWidth,cssHeight)*.055*dpr);}
 function render(){if(disposed||!prepared)return;renderer.draw(state,config,view());frames++;onFrame({frames,builds,count:prepared.sampled.count,backend:renderer.backend,running:running&&moving(),fps:running?fps:0,width:canvas.width,height:canvas.height,state:{...state}});}
 function moving(){return Object.keys(state).some(key=>Math.abs(state[key]-target[key])>.000001);}
 function tick(time){raf=0;if(!running||disposed)return;const dt=Math.max(.001,(time-last)/1000);last=time;fps=Math.round(1/dt);const moving=advance(state,target,dt,config.settle);render();if(moving)raf=requestAnimationFrame(tick);}
 function invalidate(){if(disposed)return;if(!running){Object.assign(state,target);render();}else if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
 function build(){clearTimeout(timer);prepared=prepareImage(source,renderer.backend==='CPU'?Math.min(120,config.density):config.density,config.seed);renderer.setImage(prepared);builds++;render();}
 function resize(w,h,pixelRatio=1){cssWidth=Math.max(1,w);cssHeight=Math.max(1,h);dpr=Math.min(1.75,Math.max(1,pixelRatio));canvas.width=Math.round(cssWidth*dpr);canvas.height=Math.round(cssHeight*dpr);render();}
 build();resize(width,height);
 return {canvas,get backend(){return renderer.backend;},get count(){return prepared.sampled.count;},get builds(){return builds;},get state(){return {...state};},get image(){return source;},
  get view(){return view().map(v=>v/dpr);},
  setImage(next){if(disposed)return;source=next;build();},
  update(next){const previous=config;config=options(next);target.scatter=config.scatter/100;target.original=config.original?1:0;if(previous.density!==config.density||previous.seed!==config.seed){clearTimeout(timer);timer=setTimeout(()=>{if(!disposed)build();},140);}invalidate();},
  pointer(x,y,active=true){if(!Number.isFinite(x)||!Number.isFinite(y))return;target.x=Math.max(-1,Math.min(2,x));target.y=Math.max(-1,Math.min(2,y));target.active=active?1:0;invalidate();},
  leave(){target.active=0;invalidate();},
  setRunning(value){running=Boolean(value);if(!running){cancelAnimationFrame(raf);raf=0;render();}else invalidate();},
  resize,render,
  samplePositions(indices=[0,100,1000]){return indices.filter(i=>i>=0&&i<prepared.sampled.count).map(i=>particlePose(prepared.sampled,i,state,config,view()));},
  async exportPNG(){render();return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not save the plate.')),'image/png'));},
  dispose(){if(disposed)return;disposed=true;abort.abort();cancelAnimationFrame(raf);clearTimeout(timer);renderer.dispose();prepared=null;source=null;canvas.width=canvas.height=1;}
 };
}
