import {reducedMotion} from '../mechanical/settings';

const drawers=[...document.querySelectorAll<HTMLDetailsElement>('.cabinet-drawer')];
const states=new Map(drawers.map(drawer=>[drawer,{open:drawer.open,animation:null as Animation|null}]));
function finish(drawer:HTMLDetailsElement){
 const state=states.get(drawer)!;
 state.animation?.cancel();state.animation=null;
 drawer.open=state.open;
 drawer.style.removeProperty('height');drawer.style.removeProperty('overflow');
 delete drawer.dataset.moving;
 drawer.querySelector<HTMLElement>('.drawer-tray')!.inert=!state.open;
 drawer.querySelector('summary')!.setAttribute('aria-expanded',String(state.open));
}
function move(drawer:HTMLDetailsElement,open:boolean){
 const state=states.get(drawer)!;
 if(state.open===open && !state.animation)return;
 const start=drawer.getBoundingClientRect().height;
 state.animation?.cancel();state.open=open;
 drawer.open=true;
 drawer.style.removeProperty('height');
 const summary=drawer.querySelector('summary')!;
 const end=open?drawer.getBoundingClientRect().height:summary.getBoundingClientRect().height+2;
 summary.setAttribute('aria-expanded',String(open));
 drawer.querySelector<HTMLElement>('.drawer-tray')!.inert=!open;
 if(reducedMotion() || document.hidden || Math.abs(start-end)<1){finish(drawer);return;}
 drawer.dataset.moving='true';drawer.style.overflow='clip';
 const animation=drawer.animate([{height:`${start}px`},{height:`${end}px`}],{duration:Math.min(420,240+Math.abs(end-start)*.15),easing:'cubic-bezier(.22,.68,.24,1)',fill:'both'});
 state.animation=animation;
 animation.onfinish=()=>{if(state.animation===animation)finish(drawer);};
}
function choose(drawer:HTMLDetailsElement,open:boolean){
 for(const other of drawers)if(other!==drawer)move(other,false);
 move(drawer,open);
}
for(const drawer of drawers){
 drawer.querySelector('summary')!.addEventListener('click',event=>{event.preventDefault();choose(drawer,!states.get(drawer)!.open);});
 drawer.dataset.enhanced='true';finish(drawer);
}
const openHash=()=>{const drawer=drawers.find(drawer=>`#${drawer.id}`===location.hash);if(drawer)choose(drawer,true);};
const finishAll=()=>drawers.forEach(finish);
window.addEventListener('hashchange',openHash);
window.addEventListener('resize',finishAll,{passive:true});
window.addEventListener('pagehide',finishAll);
window.addEventListener('beforeprint',finishAll);
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishAll();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',finishAll);
new MutationObserver(()=>{if(reducedMotion())finishAll();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
openHash();
