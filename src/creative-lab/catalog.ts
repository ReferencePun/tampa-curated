const favoriteKey='impossible:favorites';
let favorites:string[]=[];
try{const value=JSON.parse(localStorage.getItem(favoriteKey)||'[]');if(Array.isArray(value))favorites=value.filter(item=>typeof item==='string');}catch{/* Favorites are optional. */}
function updateFavorites(){document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button=>{const selected=favorites.includes(button.dataset.favorite!);button.setAttribute('aria-pressed',String(selected));button.textContent=selected?'★':'☆';});}
document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button=>button.addEventListener('click',()=>{
 const slug=button.dataset.favorite!;favorites=favorites.includes(slug)?favorites.filter(item=>item!==slug):[...favorites,slug];
 try{localStorage.setItem(favoriteKey,JSON.stringify(favorites));}catch{button.title='Favorites are temporary because browser storage is unavailable.';}
 updateFavorites();filter();
}));updateFavorites();
const form=document.querySelector<HTMLFormElement>('[data-catalog-filters]'),cards=[...document.querySelectorAll<HTMLElement>('[data-card]')];
function filter(){
 if(!form)return;const data=new FormData(form),query=String(data.get('query')||'').trim().toLowerCase();let count=0;
 for(const card of cards){
  const match=(!query||card.dataset.search?.includes(query))&&(!data.get('category')||card.dataset.category===data.get('category'))&&(!data.get('status')||card.dataset.status===data.get('status'))&&(!data.get('technology')||card.dataset.technology?.includes(String(data.get('technology'))))&&(!data.get('favorites')||favorites.includes(card.dataset.slug!));
  card.hidden=!match;if(match)count++;
 }
 document.querySelector('[data-results]')!.textContent=`${count} ${count===1?'study':'studies'} shown`;
 (document.querySelector('[data-empty]') as HTMLElement).hidden=count>0;
}
form?.addEventListener('input',filter);form?.addEventListener('submit',event=>event.preventDefault());
document.querySelector('[data-clear-filters]')?.addEventListener('click',()=>{form?.reset();filter();});
const compareInputs=[...document.querySelectorAll<HTMLInputElement>('[data-compare]')];
function compare(){
 const chosen=compareInputs.filter(input=>input.checked),tray=document.querySelector<HTMLElement>('[data-compare-tray]');if(!tray)return;
 tray.hidden=!chosen.length;document.querySelector('[data-compare-count]')!.textContent=`${chosen.length} of 2 selected`;
 const link=document.querySelector<HTMLAnchorElement>('[data-compare-link]')!;
 link.hidden=chosen.length!==2;
 if(chosen.length===2){const target=new URL(link.href);target.searchParams.set('a',chosen[0].dataset.compare!);target.searchParams.set('b',chosen[1].dataset.compare!);link.href=target.href;}
 for(const input of compareInputs)input.disabled=input.dataset.eligible!=='true'||(!input.checked&&chosen.length>=2);
}
compareInputs.forEach(input=>input.addEventListener('change',compare));
document.querySelector('[data-clear-compare]')?.addEventListener('click',()=>{compareInputs.forEach(input=>input.checked=false);compare();});
const comparison=document.querySelector<HTMLElement>('[data-comparison]');
document.querySelector<HTMLSelectElement>('[data-comparison-view]')?.addEventListener('change',event=>{if(comparison)comparison.dataset.view=(event.target as HTMLSelectElement).value;});
let bothPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const both=document.querySelector<HTMLButtonElement>('[data-pause-all]');if(both)both.textContent=bothPaused?'Resume both':'Pause both';
both?.addEventListener('click',()=>{bothPaused=!bothPaused;comparison?.querySelectorAll('[data-lab-host]').forEach(host=>host.dispatchEvent(new CustomEvent('lab:set-pause',{detail:bothPaused})));both.textContent=bothPaused?'Resume both':'Pause both';});
function choose(side:string,slug:string){
 const template=[...document.querySelectorAll<HTMLTemplateElement>('[data-study-template]')].find(item=>item.dataset.studyTemplate===slug);
 const slot=comparison?.querySelector<HTMLElement>(`[data-compare-side="${side}"]`);if(!template||!slot)return;
 const current=slot.querySelector<HTMLElement>('[data-lab-host]');if(current?.dataset.slug===slug)return;
 current?.dispatchEvent(new Event('lab:dispose'));
 const fragment=template.content.cloneNode(true) as DocumentFragment;
 fragment.querySelectorAll<HTMLElement>('[id]').forEach(element=>element.id=`${side}-${element.id}`);
 fragment.querySelectorAll<HTMLLabelElement>('label[for]').forEach(label=>label.htmlFor=`${side}-${label.htmlFor}`);
 slot.querySelector('[data-slot-host]')!.replaceChildren(fragment);
 slot.querySelector('[data-slot-title]')!.textContent=template.dataset.name!;
 slot.querySelector<HTMLSelectElement>('[data-study-select]')!.value=slug;
 document.dispatchEvent(new Event('lab:refresh'));
 slot.querySelector('[data-lab-host]')?.dispatchEvent(new CustomEvent('lab:set-pause',{detail:bothPaused}));
}
document.querySelectorAll<HTMLSelectElement>('[data-study-select]').forEach(select=>select.addEventListener('change',()=>{
 choose(select.dataset.studySelect!,select.value);
 const target=new URL(location.href);target.searchParams.set(select.dataset.studySelect==='left'?'a':'b',select.value);history.replaceState(null,'',target);
}));
if(comparison){const query=new URLSearchParams(location.search);if(query.has('a'))choose('left',query.get('a')!);if(query.has('b'))choose('right',query.get('b')!);}
document.querySelectorAll<HTMLButtonElement>('[data-copy-command]').forEach(button=>button.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(button.dataset.copyCommand!);button.textContent='Copied';}catch{button.textContent='Select the command to copy';}
}));
