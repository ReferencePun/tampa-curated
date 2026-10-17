const root=document.querySelector<HTMLElement>('[data-spatial-root]')!;
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const toggle=root.querySelector<HTMLButtonElement>('[data-static-toggle]')!;
const retry=root.querySelector<HTMLButtonElement>('[data-spatial-retry]')!;
const message=root.querySelector<HTMLElement>('[data-spatial-message]')!;
let controller:{dispose:()=>void}|null=null,attempt=0,loading=false,userStatic=false;
try{userStatic=localStorage.getItem('tc-spatial-mode')==='static';}catch{/* Storage is optional. */}
const remember=(value:string)=>{try{localStorage.setItem('tc-spatial-mode',value);}catch{}};
function staticMode(copy:string){
 attempt++;loading=false;const wasInside=root.dataset.renderer==='ready'&&root.getBoundingClientRect().top<0&&root.getBoundingClientRect().bottom>0;
 controller?.dispose();controller=null;root.dataset.renderer='static';message.textContent=copy;retry.hidden=false;toggle.hidden=true;
 if(wasInside)root.scrollIntoView({block:'start',behavior:'instant'});
}
async function start(){
 if(controller||loading)return;
 loading=true;const token=++attempt;message.textContent='Opening the drawing… The field notes remain available below.';retry.hidden=true;
 try{
  const {mountSpatial}=await import('./controller');if(token!==attempt)return;
  controller=await mountSpatial(root,staticMode);
  if(token!==attempt){controller.dispose();controller=null;return;}
  loading=false;toggle.hidden=false;message.textContent='Scroll to travel. Scroll back to retrace your steps. The crank and room links also move through the drawing.';
 }catch{if(token===attempt)staticMode('This browser cannot open the moving drawing. Explore the illustrated field notes and photographs below.');}
}
toggle.addEventListener('click',()=>{userStatic=true;remember('static');staticMode('Reading without motion. All four rooms and their stories are available below.');});
retry.addEventListener('click',()=>{userStatic=false;remember('moving');void start();});
reduced.addEventListener('change',()=>{if(reduced.matches)staticMode('Reduced motion is on. Enjoy the still drawing and the complete field notes below.');else if(!userStatic)void start();});
if(reduced.matches||userStatic)staticMode(reduced.matches?'Reduced motion is on. Enjoy the still drawing and the complete field notes below.':'Reading without motion. All four rooms and their stories are available below.');
else if(['drawing','threshold','corridor','city'].includes(location.hash.slice(1)))void start();
else{
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void start();}},{rootMargin:'350px'});
 observer.observe(root);
}
export {};
