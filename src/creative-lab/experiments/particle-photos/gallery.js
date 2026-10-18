import {createParticleImage} from './engine.js';
import {loadPhoto} from './images.js';

// A bounded gallery adapter: at most two visible WebGL contexts. Normal HTML
// images occupy all other slots, including before loading and after disposal.
export function mountGallery(root,items,{onOpen=()=>{}}={}){
 const abort=new AbortController(),signal=abort.signal,motion=matchMedia('(prefers-reduced-motion: reduce)'),slots=[];let disposed=false;
 function open(slot){if(slot.effect)slot.effect.update({mode:'reveal',density:240,original:true,scatter:0});onOpen(slot.item,slot.figure);}
 for(const item of items){
  const figure=document.createElement('figure'),stage=document.createElement('div'),image=document.createElement('img'),caption=document.createElement('figcaption'),button=document.createElement('button');
  figure.className='particle-gallery-card';stage.className='particle-gallery-stage';stage.tabIndex=0;stage.setAttribute('aria-label',`${item.name}. Move or touch to reveal; Enter opens the field note.`);image.src=item.url;image.alt=item.alt;caption.textContent=item.name;button.textContent='Open field note ↗';button.type='button';stage.append(image);caption.append(button);figure.append(stage,caption);root.append(figure);
  const slot={item,figure,stage,image,effect:null,visible:false,ratio:0,loading:false,token:0};slots.push(slot);
  stage.addEventListener('pointermove',event=>{if(!slot.effect)return;const b=stage.getBoundingClientRect(),[x,y,w,h]=slot.effect.view;slot.effect.pointer((event.clientX-b.left-x)/w,(event.clientY-b.top-y)/h,true);},{signal});
  stage.addEventListener('pointerdown',event=>{if(!slot.effect)return;const b=stage.getBoundingClientRect(),[x,y,w,h]=slot.effect.view;slot.effect.pointer((event.clientX-b.left-x)/w,(event.clientY-b.top-y)/h,true);},{signal});
  stage.addEventListener('pointercancel',()=>slot.effect?.leave(),{signal});stage.addEventListener('pointerleave',()=>slot.effect?.leave(),{signal});stage.addEventListener('pointerup',event=>{if(event.pointerType==='touch')slot.effect?.leave();},{signal});
  stage.addEventListener('keydown',event=>{if(event.key==='Enter')open(slot);if(event.key==='Escape')slot.effect?.leave();},{signal});button.addEventListener('click',()=>open(slot),{signal});
 }
 function release(slot){slot.token++;slot.loading=false;if(slot.effect){slot.effect.dispose();slot.effect.canvas.remove();slot.effect=null;}slot.image.hidden=false;}
 async function activate(slot){
  const token=++slot.token;slot.loading=true;
  try{const image=await loadPhoto(slot.item.url);if(disposed||token!==slot.token||!slot.visible)return;slot.effect=createParticleImage({image,settings:{mode:'reveal',density:240},width:slot.stage.clientWidth,height:slot.stage.clientHeight,onContextLoss:()=>release(slot)});slot.stage.append(slot.effect.canvas);slot.image.hidden=true;slot.effect.resize(slot.stage.clientWidth,slot.stage.clientHeight,devicePixelRatio||1);slot.effect.setRunning(!document.hidden&&!motion.matches);}
  catch{/* The accessible original image remains usable. */}finally{if(token===slot.token)slot.loading=false;}
 }
 function sync(){if(disposed)return;const selected=slots.filter(s=>s.visible).sort((a,b)=>b.ratio-a.ratio).slice(0,2);for(const slot of slots)if(!selected.includes(slot))release(slot);let active=slots.filter(s=>s.effect||s.loading).length;for(const slot of selected){slot.effect?.setRunning(!document.hidden&&!motion.matches&&slot.visible);if(!slot.effect&&!slot.loading&&active<2){active++;void activate(slot);}}}
 const observer=new IntersectionObserver(entries=>{for(const e of entries){const slot=slots.find(s=>s.stage===e.target);slot.visible=e.isIntersecting;slot.ratio=e.intersectionRatio;}sync();},{threshold:[0,.05,.25,.5,.75,1]});slots.forEach(s=>observer.observe(s.stage));
 const resize=new ResizeObserver(entries=>{for(const e of entries){const slot=slots.find(s=>s.stage===e.target);slot.effect?.resize(e.contentRect.width,e.contentRect.height,devicePixelRatio||1);}});slots.forEach(s=>resize.observe(s.stage));
 document.addEventListener('visibilitychange',sync,{signal});motion.addEventListener('change',sync,{signal});
 return {reset(){slots.forEach(s=>{s.effect?.update({mode:'reveal',density:240,scatter:0,original:false});s.effect?.leave();});},dispose(){if(disposed)return;disposed=true;abort.abort();observer.disconnect();resize.disconnect();slots.forEach(s=>{release(s);s.figure.remove();});}};
}
