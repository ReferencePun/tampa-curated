export interface SavedNote {id:string;note:string;}
export interface NotebookState {version:1;title:string;items:SavedNote[];}
export const storageKey='tc-field-notebook-v1';
const empty=():NotebookState=>({version:1,title:'My Tampa field notes',items:[]});
const validId=(id:unknown):id is string=>typeof id==='string'&&/^(neighborhoods|stories|businesses|people|photos|quotes|objects):[a-z0-9-]+$/.test(id);
export function normalize(value:unknown):NotebookState {
 if(!value||typeof value!=='object')return empty();
 const raw=value as Partial<NotebookState>;
 if(raw.version!==1||!Array.isArray(raw.items))return empty();
 const seen=new Set<string>();
 return {version:1,title:typeof raw.title==='string'?raw.title.slice(0,100):empty().title,items:raw.items.filter((item):item is SavedNote=>Boolean(item&&validId(item.id)&&!seen.has(item.id)&&seen.add(item.id))).slice(0,100).map(item=>({id:item.id,note:typeof item.note==='string'?item.note.slice(0,2000):''}))};
}
let memory=empty();
let available=true;
export function readNotebook():NotebookState {
 if(!available)return memory;
 try {memory=normalize(JSON.parse(localStorage.getItem(storageKey)||'null'));}catch {available=false;}
 return memory;
}
export function writeNotebook(state:NotebookState) {
 memory=normalize(state);
 try {localStorage.setItem(storageKey,JSON.stringify(memory));available=true;}catch {available=false;}
 window.dispatchEvent(new CustomEvent('notebook:change',{detail:memory}));
 return available;
}
export function notebookStorageAvailable(){return available;}
const sync=()=>{
 const state=readNotebook();
 document.querySelectorAll<HTMLButtonElement>('[data-notebook-save]').forEach(button=>{
  const saved=state.items.some(item=>item.id===button.dataset.notebookSave);
  button.hidden=false;button.setAttribute('aria-pressed',String(saved));
  button.querySelector('[data-save-label]')!.textContent=saved?(available?'Kept in notebook':'Kept for this page'):'Keep in notebook';
  button.querySelector('span[aria-hidden]')!.textContent=saved?'✓':'＋';
 });
 document.querySelectorAll('[data-notebook-count]').forEach(el=>el.textContent=String(state.items.length));
 document.querySelectorAll<HTMLElement>('[data-storage-warning]').forEach(el=>el.hidden=available);
};
if(!document.querySelector('[data-notebook-status]')){const status=document.createElement('p');status.className='sr-only';status.setAttribute('role','status');status.dataset.notebookStatus='';document.body.append(status);}
document.addEventListener('click',event=>{
 const button=(event.target as Element)?.closest<HTMLButtonElement>('[data-notebook-save]');if(!button)return;
 const id=button.dataset.notebookSave;if(!validId(id))return;
 const state=readNotebook(),index=state.items.findIndex(item=>item.id===id);
 if(index>=0)state.items.splice(index,1);else if(state.items.length<100)state.items.push({id,note:''});
 writeNotebook(state);
 const status=document.querySelector('[data-notebook-status]');
 if(status)status.textContent=`${button.dataset.saveTitle} ${index>=0?'removed from':'saved to'} your notebook.${available?'':' Storage is unavailable; this collection will last only while this page stays open.'}`;
});
window.addEventListener('notebook:change',sync);
window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){sync();window.dispatchEvent(new Event('notebook:external'));}});
window.addEventListener('pageshow',sync);
sync();
