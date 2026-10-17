export {};
const board=document.querySelector<HTMLElement>('[data-tracing-board]')!;
const sheet=document.querySelector<HTMLElement>('[data-tracing-sheet]')!;
const handle=document.querySelector<HTMLButtonElement>('[data-paper-handle]')!;
const lift=document.querySelector<HTMLInputElement>('[data-paper-lift]')!;
const ink=document.querySelector<HTMLInputElement>('[data-paper-ink]')!;
const peek=document.querySelector<HTMLButtonElement>('[data-paper-peek]')!;
const pins=[...document.querySelectorAll<HTMLButtonElement>('[data-trace-pin]')];
const checks=[...document.querySelectorAll<HTMLInputElement>('[data-layer-toggle]')];
const status=document.querySelector('[data-paper-status]')!;
let x=0,y=0,original=false;
const clamp=(n:number)=>Math.max(-35,Math.min(35,n));
function render(){
 const amount=Number(lift.value);
 board.style.setProperty('--sheet-x',`${x+amount*.56}%`);
 board.style.setProperty('--sheet-y',`${y-amount*.08}%`);
 board.style.setProperty('--sheet-angle',`${amount*-.07}deg`);
 board.style.setProperty('--trace-ink',String(Number(ink.value)/100));
 board.dataset.original=String(original);
 sheet.style.visibility=original?'hidden':'';
 document.querySelector('[data-lift-output]')!.textContent=`${amount}%`;
 document.querySelector('[data-ink-output]')!.textContent=`${ink.value}%`;
 peek.setAttribute('aria-pressed',String(original));peek.textContent=original?'Show tracing paper':'Original only';
 for(const check of checks){
  document.querySelector<SVGElement>(`[data-trace-layer="${check.dataset.layerToggle}"]`)!.style.display=check.checked?'':'none';
  if(check.dataset.layerToggle==='notes')sheet.querySelector<SVGElement>('g[font-family]')!.style.display=check.checked?'':'none';
 }
}
for(const selector of ['[data-paper-controls]','[data-paper-handle]','[data-trace-pins]'])document.querySelector<HTMLElement>(selector)!.hidden=false;
const select=(id:string)=>{
 pins.forEach(pin=>pin.setAttribute('aria-pressed',String(pin.dataset.tracePin===id)));
 document.querySelectorAll<HTMLElement>('[data-observation]').forEach(el=>el.hidden=el.dataset.observation!==id);
};
pins.forEach(pin=>pin.addEventListener('click',()=>{
 select(pin.dataset.tracePin!);
 const article=document.querySelector<HTMLElement>(`[data-observation="${pin.dataset.tracePin}"]`)!;
 status.textContent=article.querySelector('h2')!.textContent;
 // On a narrow screen, reveal the observation below the map and its controls.
 if(matchMedia('(max-width:700px)').matches){article.tabIndex=-1;article.focus({preventScroll:true});article.scrollIntoView({block:'start'});}
}));
select('blocks');
lift.addEventListener('input',()=>{original=false;render();});ink.addEventListener('input',render);checks.forEach(check=>check.addEventListener('change',render));
peek.addEventListener('click',()=>{original=!original;render();});
const reset=()=>{x=0;y=0;lift.value='0';ink.value='75';original=false;checks.forEach(c=>c.checked=true);render();status.textContent='Paper and all layers realigned.';};
document.querySelector('[data-paper-reset]')!.addEventListener('click',reset);
let drag:{id:number;startX:number;startY:number;x:number;y:number;width:number;height:number}|null=null;
handle.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 const box=board.getBoundingClientRect();original=false;render();
 drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,x,y,width:box.width,height:box.height};
 handle.setPointerCapture(event.pointerId);board.classList.add('is-moving');
});
handle.addEventListener('pointermove',event=>{
 if(!drag||drag.id!==event.pointerId)return;
 x=clamp(drag.x+(event.clientX-drag.startX)/drag.width*100);
 y=clamp(drag.y+(event.clientY-drag.startY)/drag.height*100);render();
});
const end=(event:PointerEvent)=>{if(drag?.id!==event.pointerId)return;drag=null;board.classList.remove('is-moving');status.textContent='Paper moved. Use Realign everything to return it to the map.';};
handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);
handle.addEventListener('keydown',event=>{
 const step=event.shiftKey?5:1;
 if(event.key==='Home'){event.preventDefault();reset();return;}
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
 event.preventDefault();original=false;
 if(event.key==='ArrowLeft')x=clamp(x-step);if(event.key==='ArrowRight')x=clamp(x+step);
 if(event.key==='ArrowUp')y=clamp(y-step);if(event.key==='ArrowDown')y=clamp(y+step);
 render();status.textContent=`Paper offset: ${Math.round(x)} percent across, ${Math.round(y)} percent down.`;
});
render();
