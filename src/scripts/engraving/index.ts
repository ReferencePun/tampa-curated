import { reducedMotion } from '../mechanical/settings';
let dispose=()=>{},version=0,observer:MutationObserver|undefined,events:AbortController|undefined;
async function reset() {
  const token=++version;
  dispose();dispose=()=>{};
  if(reducedMotion())return;
  try {
    const {initMechanisms}=await import('./controller');
    if(token===version)dispose=initMechanisms();
  } catch (error) {
    // The server-rendered illustrations and every destination remain available.
    console.warn('The illustrated mechanisms could not be loaded.', error);
  }
}
function boot() {
  events?.abort();observer?.disconnect();
  events=new AbortController();
  observer=new MutationObserver(()=>{void reset();});
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{void reset();},{signal:events.signal});
  void reset();
}
boot();
window.addEventListener('pagehide',()=>{version++;dispose();observer?.disconnect();events?.abort();});
window.addEventListener('pageshow',event=>{if(event.persisted)boot();});
