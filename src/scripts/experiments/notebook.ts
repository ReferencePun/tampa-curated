import {readNotebook,writeNotebook,notebookStorageAvailable,type SavedNote} from './notebook-store';
const board=document.querySelector<HTMLOListElement>('[data-notebook-board]')!;
const title=document.querySelector<HTMLInputElement>('[data-notebook-title]')!;
const status=document.querySelector<HTMLElement>('[data-notebook-board-status]')!;
const templates=new Map([...document.querySelectorAll<HTMLTemplateElement>('[data-note-template]')].map(t=>[t.dataset.noteTemplate!,t]));
const undoWrap=document.querySelector<HTMLElement>('[data-note-undo-wrap]')!;
let removed:{item:SavedNote;index:number}|null=null;
let renderedIds='';
function render(){
 const state=readNotebook(),items=state.items.filter(item=>templates.has(item.id));
 if(document.activeElement!==title)title.value=state.title;
 document.querySelector('[data-note-print-title]')!.textContent=state.title||'My Tampa field notes';
 const key=JSON.stringify(items.map(item=>item.id));
 if(key!==renderedIds){
  board.replaceChildren(...items.map(item=>templates.get(item.id)!.content.cloneNode(true)));renderedIds=key;
  board.querySelectorAll('img').forEach(image=>image.loading='eager');
 }
 [...board.querySelectorAll<HTMLElement>('[data-note-id]')].forEach((card,index)=>{
  card.querySelector('[data-piece-number]')!.textContent=String(index+1).padStart(2,'0');
  const textarea=card.querySelector<HTMLTextAreaElement>('[data-note-text]')!;
  if(document.activeElement!==textarea)textarea.value=items[index].note;
  card.querySelector('[data-note-print-text]')!.textContent=items[index].note;
  card.querySelector<HTMLButtonElement>('[data-note-move="-1"]')!.disabled=index===0;
  card.querySelector<HTMLButtonElement>('[data-note-move="1"]')!.disabled=index===items.length-1;
 });
 document.querySelector<HTMLElement>('[data-notebook-empty]')!.hidden=items.length>0;
 document.querySelector<HTMLButtonElement>('[data-note-print]')!.disabled=!items.length;
 document.querySelector<HTMLButtonElement>('[data-note-export]')!.disabled=!items.length;
 document.querySelectorAll<HTMLElement>('[data-storage-warning]').forEach(el=>el.hidden=notebookStorageAvailable());
}
const announce=(text:string)=>{status.textContent=text;};
function focusPiece(id:string){const h=[...board.querySelectorAll<HTMLElement>('[data-note-id]')].find(e=>e.dataset.noteId===id)?.querySelector('h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
window.addEventListener('notebook:change',render);window.addEventListener('notebook:external',render);window.addEventListener('pageshow',render);
title.addEventListener('input',()=>{const state=readNotebook();state.title=title.value;writeNotebook(state);});
board.addEventListener('input',event=>{
 const input=event.target as HTMLTextAreaElement;if(!input.matches('[data-note-text]'))return;
 const id=input.closest<HTMLElement>('[data-note-id]')!.dataset.noteId;
 const state=readNotebook(),item=state.items.find(item=>item.id===id);if(item){item.note=input.value;writeNotebook(state);}
});
board.addEventListener('click',event=>{
 const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
 const card=button.closest<HTMLElement>('[data-note-id]')!,id=card.dataset.noteId!;
 const state=readNotebook(),index=state.items.findIndex(item=>item.id===id);if(index<0)return;
 const name=card.querySelector('h2')!.textContent;
 if(button.hasAttribute('data-note-remove')){
  removed={item:{...state.items[index]},index};state.items.splice(index,1);writeNotebook(state);
  undoWrap.hidden=false;undoWrap.querySelector('p')!.textContent=`Removed “${name}”.`;
  undoWrap.querySelector('button')!.focus({preventScroll:true});announce(`${name} removed. Undo is available.`);
 }else if(button.dataset.noteMove){
  const next=index+Number(button.dataset.noteMove);if(next<0||next>=state.items.length)return;
  [state.items[index],state.items[next]]=[state.items[next],state.items[index]];writeNotebook(state);focusPiece(id);announce(`${name} moved to position ${next+1}.`);
 }
});
document.querySelector('[data-note-undo]')!.addEventListener('click',()=>{
 if(!removed)return;const state=readNotebook();
 if(!state.items.some(item=>item.id===removed!.item.id))state.items.splice(Math.min(removed.index,state.items.length),0,removed.item);
 const id=removed.item.id;removed=null;undoWrap.hidden=true;writeNotebook(state);focusPiece(id);announce('Piece restored.');
});
const starter=document.querySelector<HTMLButtonElement>('[data-note-starter]')!;starter.hidden=false;
starter.addEventListener('click',()=>{
 const state=readNotebook();for(const id of ['neighborhoods:ybor-city','photos:tampa-night','quotes:small-things'])if(!state.items.some(item=>item.id===id))state.items.push({id,note:''});
 writeNotebook(state);announce('Three pieces added. You can now add notes and change their order.');
});
document.querySelector<HTMLElement>('[data-notebook-tools]')!.hidden=false;
document.querySelector('[data-note-print]')!.addEventListener('click',async()=>{render();await Promise.all([...board.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));window.print();});
document.querySelector('[data-note-export]')!.addEventListener('click',()=>{
 const state=readNotebook();
 const pieces=state.items.filter(item=>templates.has(item.id)).map((item,index)=>{
  const card=templates.get(item.id)!.content;
  const link=card.querySelector<HTMLAnchorElement>('.lab-link')!;
  const source=new URL(link.getAttribute('href')!,location.href).href;
  return `${String(index+1).padStart(2,'0')} / ${card.querySelector('h2')!.textContent}\n${card.querySelector('p')!.textContent}\n${card.querySelector('.note-disclosure')!.textContent}\n${source}\n\nMy notes:\n${item.note||'—'}\n`;
 });
 const content=`${state.title||'My Tampa field notes'}\nTAMPA CURATED / PERSONAL COLLECTION\n\n${pieces.join('\n────────────────────────────\n\n')}`;
 const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),href=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=href;a.download='tampa-field-notebook.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);announce('Collection downloaded, including your notes and chosen order.');
});
const form=document.querySelector<HTMLFormElement>('[data-shelf-filters]')!;form.hidden=false;
const search=form.querySelector<HTMLInputElement>('input')!,kind=form.querySelector<HTMLSelectElement>('select')!;
const cards=[...document.querySelectorAll<HTMLElement>('[data-shelf-piece]')];
const filter=()=>{
 const words=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);let count=0;
 for(const card of cards){const match=(kind.value==='All'||card.dataset.pieceKind===kind.value)&&words.every(word=>card.dataset.pieceSearch!.includes(word));card.hidden=!match;if(match)count++;}
 document.querySelector('[data-shelf-count]')!.textContent=`${count} ${count===1?'piece':'pieces'}`;
 document.querySelector<HTMLElement>('[data-shelf-empty]')!.hidden=count>0;
};
form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',filter);form.addEventListener('reset',()=>{setTimeout(filter,0);});
render();
