import type {Experiment} from './registry';
import {defaults,validateSettings,createPreset,readPreset} from './shared/presets.js';
type Settings=Record<string,string|number|boolean>;
type Stats={fps:number;width:number;height:number;primitives:number;frames:number;running:boolean;renderer:string};
type Effect={update:(settings:Settings)=>void;setRunning:(running:boolean)=>void;replay:()=>void;dispose:()=>void};
type Module={mount:(host:HTMLElement,settings:Settings,report:(stats:Stats)=>void)=>Effect};
const loaders=import.meta.glob<Module>('./experiments/*/index.js');
const active=new Set<()=>void>();
function download(content:BlobPart,name:string,type:string){
 const objectURL=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');
 link.href=objectURL;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(objectURL),1000);
}
function createHost(root:HTMLElement){
 if(root.dataset.initialized)return;
 root.dataset.initialized='true';
 const manifest:Experiment=JSON.parse(root.querySelector('[data-lab-manifest]')!.textContent!);
 const get=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const mount=get('[data-mount]'),still=get<HTMLImageElement>('[data-still]'),feedback=get('[data-feedback]'),playback=get('[data-playback]');
 const shell=get('[data-demo-shell]'),pause=get<HTMLButtonElement>('[data-pause]'),replay=get<HTMLButtonElement>('[data-replay]'),fullscreen=get<HTMLButtonElement>('[data-fullscreen]');
 const fields=get<HTMLFieldSetElement>('[data-settings]'),saved=get<HTMLSelectElement>('[data-saved]'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const abort=new AbortController(),signal=abort.signal,currentKey=`impossible:current:${manifest.slug}`,savedKey=`impossible:presets:${manifest.slug}`;
 let settings:Settings=defaults(manifest),effect:Effect|undefined,visible=false,loading=false,disposed=false,paused=motion.matches,expanded=false,previousOverflow='';
 let stored:ReturnType<typeof createPreset>[]=[];
 const say=(message:string)=>{feedback.textContent=message;};
 const store=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{say('Browser storage is unavailable. Export JSON to keep your settings.');return false;}};
 try{
  const previous=localStorage.getItem(currentKey);if(previous)settings=readPreset(manifest,JSON.parse(previous)).settings;
  const values=JSON.parse(localStorage.getItem(savedKey)||'[]');
  if(Array.isArray(values))stored=values.slice(0,20).flatMap(value=>{try{return [readPreset(manifest,value)];}catch{return [];}});
 }catch{say('Starting with defaults. A saved configuration could not be read.');}
 function syncInputs(){
  root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-setting]').forEach(input=>{
   const key=input.dataset.setting!,value=settings[key];
   if(input instanceof HTMLInputElement&&input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);
   const output=root.querySelector(`[data-value="${key}"]`);if(output)output.textContent=String(value);
  });
 }
 function populate(){
  saved.replaceChildren(new Option('Choose a saved preset',''),...stored.map((preset,index)=>new Option(preset.name,String(index))));
 }
 function apply(next:Settings,persist=true){
  settings=validateSettings(manifest,next);syncInputs();effect?.update(settings);root.dataset.settings=JSON.stringify(settings);
  if(persist)store(currentKey,createPreset(manifest,settings,'Current settings'));
 }
 function report(stats:Stats){
  root.dataset.frames=String(stats.frames);root.dataset.running=String(stats.running);
  get('[data-statistics]').textContent=`${stats.renderer} · ${stats.fps} FPS · ${stats.width} × ${stats.height} px · ${stats.primitives} drawing primitives · ${stats.frames} frames · ${stats.running?'running':'at rest'}`;
 }
 async function sync(){
  if(disposed)return;
  pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));
  playback.textContent=paused?'Paused · adjust or replay the still drawing':visible?'Move over the drawing to explore':'Resting outside the viewport';
  if(visible&&!document.hidden&&!effect&&!loading){
   loading=true;root.dataset.loading='true';
   try{
    const loader=loaders[`./experiments/${manifest.slug}/${manifest.entry}`];
    if(!loader)throw new Error('The effect entry could not be found.');
    const module=await loader();
    if(disposed||!visible||document.hidden)return;
    effect=module.mount(mount,settings,report);still.hidden=true;root.dataset.mounted='true';pause.disabled=false;replay.disabled=false;
   }catch(error){say(error instanceof Error?error.message:'The live study could not start.');playback.textContent='Still plate · live renderer unavailable';}
   finally{loading=false;root.dataset.loading='false';}
  }
  effect?.setRunning(visible&&!paused&&!document.hidden);
 }
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;void sync();},{threshold:.05});observer.observe(mount);
 document.addEventListener('visibilitychange',()=>void sync(),{signal});
 motion.addEventListener('change',()=>{paused=motion.matches;void sync();},{signal});
 root.addEventListener('lab:set-pause',event=>{paused=Boolean((event as CustomEvent).detail);void sync();},{signal});
 pause.addEventListener('click',()=>{paused=!paused;void sync();},{signal});
 replay.addEventListener('click',()=>{effect?.replay();say(paused?'Returned to the first frame. Resume to animate.':'Replayed from the first frame.');},{signal});
 get<HTMLInputElement>('[data-debug]').addEventListener('change',event=>{get('[data-statistics]').hidden=!(event.target as HTMLInputElement).checked;},{signal});
 root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-setting]').forEach(input=>input.addEventListener('input',()=>{
  const value=input instanceof HTMLInputElement&&input.type==='checkbox'?input.checked:input instanceof HTMLInputElement&&['range','number'].includes(input.type)?Number(input.value):input.value;
  if(input instanceof HTMLInputElement&&!input.validity.valid)return;
  try{apply({...settings,[input.dataset.setting!]:value});}catch(error){say((error as Error).message);}
 },{signal}));
 get('[data-reset]').addEventListener('click',()=>{apply(defaults(manifest));effect?.replay();say('Default settings restored.');},{signal});
 get('[data-save]').addEventListener('click',()=>{
  const name=get<HTMLInputElement>('[data-preset-name]').value.trim()||'My study';
  if(stored.length>=20){say('This study already has 20 presets. Delete one or export a JSON file.');return;}
  stored.push(createPreset(manifest,settings,name));populate();saved.value=String(stored.length-1);
  if(store(savedKey,stored))say(`Saved “${name}” on this device.`);
 },{signal});
 saved.addEventListener('change',()=>{if(saved.value==='')return;const preset=stored[Number(saved.value)];if(preset){apply(preset.settings);say(`Restored “${preset.name}”.`);}},{signal});
 get('[data-delete]').addEventListener('click',()=>{
  if(saved.value===''){say('Choose a saved preset first.');return;}
  stored.splice(Number(saved.value),1);populate();if(store(savedKey,stored))say('Selected preset deleted.');
 },{signal});
 get('[data-export-preset]').addEventListener('click',()=>{
  download(JSON.stringify(createPreset(manifest,settings,get<HTMLInputElement>('[data-preset-name]').value),null,2),`${manifest.slug}-preset.json`,'application/json');say('Preset exported as JSON.');
 },{signal});
 get<HTMLInputElement>('[data-import]').addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
  try{
   if(file.size>100_000)throw new Error('Preset files must be smaller than 100 KB.');
   const preset=readPreset(manifest,await file.text());if(disposed)return;
   apply(preset.settings);get<HTMLInputElement>('[data-preset-name]').value=preset.name;say(`Imported “${preset.name}”. Save it to keep a named copy.`);
  }catch(error){say(`Could not import: ${(error as Error).message}`);}finally{input.value='';}
 },{signal});
 get<HTMLButtonElement>('[data-export-source]')?.addEventListener('click',async event=>{
  const button=event.currentTarget as HTMLButtonElement;button.disabled=true;say('Packing the complete source and your current settings…');
  try{
   const [{zip},response]=await Promise.all([import('./shared/zip.js'),fetch(root.dataset.source!,{signal})]);
   if(!response.ok)throw new Error('Source package could not be fetched. Try the default source link.');
   const source=await response.json() as {files:Record<string,string>};if(disposed)return;
   const files:Record<string,Uint8Array|string>=Object.fromEntries(Object.entries(source.files).map(([path,data])=>[path,Uint8Array.from(atob(data),character=>character.charCodeAt(0))]));
   files['preset.json']=JSON.stringify(createPreset(manifest,settings,get<HTMLInputElement>('[data-preset-name]').value),null,2);
   download(zip(files),`${manifest.slug}.zip`,'application/zip');say('Complete source package exported with your settings.');
  }catch(error){if(!disposed)say((error as Error).message);}finally{button.disabled=false;}
 },{signal});
 function exitExpanded(){
  if(!expanded)return;expanded=false;shell.classList.remove('il-expanded');shell.removeAttribute('role');shell.removeAttribute('aria-modal');shell.removeAttribute('aria-label');document.body.style.overflow=previousOverflow;fullscreen.textContent='Expand ↗';fullscreen.focus();
 }
 function enterExpanded(){previousOverflow=document.body.style.overflow;expanded=true;shell.classList.add('il-expanded');shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label',`${manifest.name} expanded preview`);document.body.style.overflow='hidden';fullscreen.textContent='Close ×';}
 fullscreen.addEventListener('click',async()=>{
  if(expanded){exitExpanded();return;}
  if(document.fullscreenElement===shell){await document.exitFullscreen();return;}
  if(shell.requestFullscreen){try{await shell.requestFullscreen();return;}catch{/* Expanded-page preview works when native fullscreen is unavailable. */}}
  enterExpanded();
 },{signal});
 document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement===shell?'Close ×':'Expand ↗';},{signal});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')exitExpanded();
  if(expanded&&event.key==='Tab'){
   const targets=[...shell.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]')].filter(element=>element.getClientRects().length);
   const first=targets[0],last=targets.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 },{signal});
 fields.disabled=false;apply(settings,false);populate();void sync();
 function dispose(){
  if(disposed)return;disposed=true;abort.abort();observer.disconnect();effect?.dispose();effect=undefined;still.hidden=false;exitExpanded();
  root.dataset.mounted='false';root.dataset.running='false';delete root.dataset.initialized;active.delete(dispose);
 }
 active.add(dispose);
 root.addEventListener('lab:dispose',dispose,{signal});
}
function boot(){document.querySelectorAll<HTMLElement>('[data-lab-host]').forEach(createHost);}
boot();
window.addEventListener('pagehide',()=>{for(const dispose of [...active])dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)boot();});
document.addEventListener('astro:before-swap',()=>{for(const dispose of [...active])dispose();});
document.addEventListener('astro:page-load',boot);
document.addEventListener('lab:refresh',boot);
