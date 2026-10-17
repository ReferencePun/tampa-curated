import {reducedMotion} from '../mechanical/settings';
import type {ParticleArchive} from './renderer';

const root=document.querySelector<HTMLElement>('[data-particle-archive]');
if(root){
 let archive:ParticleArchive|undefined,generation=0,failed=false;
 const fallback=()=>{
  failed=true;generation++;archive?.dispose();archive=undefined;root.dataset.archiveMode='still';
  root.querySelector('[data-archive-instruction]')!.textContent='Six studies. Follow a photograph into its story.';
 };
 const start=async()=>{
  const current=++generation;archive?.dispose();archive=undefined;
  root.querySelector('[data-archive-instruction]')!.textContent='Six studies. Follow a photograph into its story.';
  if(reducedMotion()||failed)return;
  try{
   const {ParticleArchive}=await import('./renderer');
   if(current!==generation||reducedMotion())return;
   archive=new ParticleArchive(root,fallback,Array.from(root.querySelectorAll<HTMLElement>('[data-archive-plate]')));
  }catch{fallback();}
 };
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 motion.addEventListener('change',()=>void start());
 const preferences=new MutationObserver(()=>void start());
 preferences.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
 window.addEventListener('pagehide',()=>{generation++;archive?.savePosition();archive?.dispose();archive=undefined;});
 window.addEventListener('pageshow',event=>{if(event.persisted)void start();});
 void start();
 // Explicit return links restore a matching recent position. Browser Back is
 // left to the browser's own scroll restoration; hashes still work without JS.
 if(location.hash.startsWith('#plate-')){
  let interrupted=false;
  const cancel=()=>{interrupted=true;};
  window.addEventListener('wheel',cancel,{once:true,passive:true});window.addEventListener('touchstart',cancel,{once:true,passive:true});window.addEventListener('keydown',cancel,{once:true});
  void document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
   try{const saved=JSON.parse(sessionStorage.getItem('tc-particle-archive-position')||'null');
    if(!interrupted&&saved?.slug===location.hash.slice(7)&&Date.now()-saved.time<1800000&&Number.isFinite(saved.y))window.scrollTo({top:saved.y,behavior:'instant'});
   }catch{/* The ordinary hash remains a useful fallback. */}
   window.removeEventListener('wheel',cancel);window.removeEventListener('touchstart',cancel);window.removeEventListener('keydown',cancel);
  })));
 }
}
