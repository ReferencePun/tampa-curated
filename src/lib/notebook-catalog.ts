import {getCollection} from 'astro:content';
import {curiosities} from '../data/experiments';
export interface NotebookEntry {id:string;title:string;kind:string;description:string;route:string;image?:string;art?:string;alt?:string;disclosure:string;}
export async function getNotebookCatalog():Promise<NotebookEntry[]> {
 const [neighborhoods,stories,places,people]=await Promise.all([getCollection('neighborhoods'),getCollection('stories'),getCollection('businesses'),getCollection('people')]);
 const groups=[{rows:neighborhoods,key:'neighborhoods',kind:'Neighborhood',path:'neighborhoods',disclosure:'Real neighborhood · sample editorial guide'}, {rows:stories,key:'stories',kind:'Story',path:'stories',disclosure:'Sample editorial'}, {rows:places,key:'businesses',kind:'Place',path:'places',disclosure:'Fictional demonstration business'}, {rows:people,key:'people',kind:'Person',path:'people',disclosure:'Fictional profile · illustrative stock portrait'}];
 return [
  ...groups.flatMap(group=>group.rows.sort((a,b)=>a.data.order-b.data.order).map(entry=>({id:`${group.key}:${entry.id}`,title:entry.data.title,kind:group.kind,description:entry.data.deck,route:`${group.path}/${entry.id}/`,image:entry.data.image,alt:entry.data.imageAlt,disclosure:group.disclosure}))),
  ...curiosities.filter(item=>['cigar','ship','rooster'].includes(item.kind)).map(item=>({id:item.save,title:item.object,kind:'Drawing',description:item.note,route:`experiments/cabinet/#drawer-${item.id}`,art:item.kind,disclosure:item.context})),
  {id:'photos:tampa-night',title:'Stay for the light',kind:'Photograph',description:'Downtown Tampa reflected in the water at night.',route:'photo-journal/',image:'tampa-night',alt:'Tampa skyline reflected in the water',disclosure:'Bhargava Marripati / Unsplash'},
  {id:'photos:ybor',title:'At street level',kind:'Photograph',description:'The windows and brickwork of the Ybor Factory Building.',route:'photo-journal/',image:'ybor',alt:'Ybor Factory Building',disclosure:'Ikuna / Unsplash'},
  {id:'quotes:small-things',title:'A city is a collection of small things.',kind:'Quotation',description:'From “The city now.” A prompt to look for the details.',route:'stories/the-city-now/',disclosure:'The editors / sample editorial'},
 ];
}
