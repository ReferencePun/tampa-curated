import {validateLocation} from './timeline.js';
export const DEFAULTS=Object.freeze({location:'meridian',progress:0,speed:1,autoplay:false,direction:'forward',camera:'fixed',view:'blueprint',transparency:.48,detail:2,compare:false,compareAt:0,guides:true,annotations:true});
export function options(next={}){const s={...DEFAULTS,...next};for(const [key,[a,b]]of Object.entries({progress:[0,100],speed:[.25,2.5],transparency:[0,.9],detail:[1,3],compareAt:[0,100]}))if(!Number.isFinite(s[key])||s[key]<a||s[key]>b)throw new Error(`Invalid ${key}.`);if(!Number.isInteger(s.detail)||!['meridian','bay'].includes(s.location)||!['fixed','orbit'].includes(s.camera)||!['blueprint','photo'].includes(s.view)||!['forward','reverse'].includes(s.direction)||['autoplay','compare','guides','annotations'].some(k=>typeof s[k]!=='boolean'))throw new Error('Invalid time-machine settings.');return s;}
const fiction=note=>({kind:'fictional',note,sources:[]});
const media=[
 {id:'facade',kind:'photo',url:new URL('./assets/facade.jpg',import.meta.url).href,credit:'Ikuna / Unsplash · https://unsplash.com/photos/wb2DOoxIGJQ',license:'Unsplash',provenance:{kind:'documented',note:'An undated reference photograph of the Ybor Factory Building. Its use as a surface in this invented block is an artistic collage, not historical registration.',sources:['https://unsplash.com/photos/wb2DOoxIGJQ']}},
 ...[
  ['survey-1',new URL('./assets/survey-1.svg',import.meta.url).href],['survey-2',new URL('./assets/survey-2.svg',import.meta.url).href],['survey-3',new URL('./assets/survey-3.svg',import.meta.url).href]
 ].map(([id,url])=>({id,kind:'map',url,credit:'Original conceptual survey / Tampa Curated',license:'MIT',provenance:fiction('An invented plot drawing in the same local coordinates; not a geographic or historical map.')}))
];
const keys=(a,b,c)=>[a,b,c].map((k,i)=>({at:i*50,...k}));
const block=(id,position,a,b,c)=>({id,kind:'building',position,keys:keys(a,b,c)});
export function createLocation(id='meridian'){
 const bay=id==='bay',name=bay?'An imagined bay block':'The Meridian block';
 const objects=[
  block('hall',[-12,0,3],{width:12,depth:11,height:6.4,roof:3,media:'facade',tint:[.76,.68,.56]},{width:12,depth:11,height:13.4,roof:.5,media:'facade',tint:[.63,.68,.68]},{width:12,depth:11,height:7.4,roof:3.5,media:'facade',tint:[.70,.76,.66]}),
  block('corner',[12,0,3],{width:10,depth:10,height:5.2,roof:2},{width:10,depth:10,height:19.8,roof:.2,tint:[.67,.72,.73]},{width:10,depth:10,height:5.2,roof:1.5,tint:[.72,.78,.68]}),
  block('store',[-12,0,-13],{width:12,depth:12,height:4.5,roof:2.2},{width:12,depth:12,height:10.6,roof:.2},{width:12,depth:12,height:3.5,roof:1.7}),
  block('lantern',[12,0,-13],{width:11,depth:12,height:3,roof:1},{width:11,depth:12,height:12,roof:.2},{width:11,depth:12,height:10,roof:5,opacity:.55,tint:[.67,.76,.72]}),
  block('rear',[-8,0,-29],{width:12,depth:7,height:3.4,roof:2.5},{width:14,depth:7,height:8,roof:.2},{width:12,depth:7,height:4,roof:2}),
  {id:'chimney',kind:'column',position:[-20,0,-4],keys:keys({height:16,width:1.5,depth:1.5},{height:7,width:1.5,depth:1.5},{height:0,width:1.5,depth:1.5,presence:0})},
  {id:'arcade',kind:'canopy',position:[3,0,-19],keys:keys({width:6,depth:5,height:0,roof:0,presence:0},{width:6,depth:5,height:2,roof:1,presence:.5},{width:8,depth:11,height:5,roof:2.5,presence:1})},
 ];
 for(const [i,x,z]of [[0,5,9],[1,-5,-7],[2,5,-9],[3,-5,-24],[4,16,-28],[5,21,8]])objects.push({id:`tree-${i}`,kind:'tree',position:[x,0,z],variant:bay?'palm':'branch',keys:keys({height:2.1,width:1.3,depth:1.3,presence:.35},{height:i%2?0:2,width:1.4,depth:1.4,presence:i%2?0:.4},{height:bay?8:6,width:3.5,depth:3.5,presence:1,tint:[.48,.62,.53]})});
 if(bay){objects[0].keys[0].roof=.7;objects[0].keys[2].roof=1.2;objects[1].keys[1].height=16;objects[3].keys[2].roof=3;}
 const eras=[{at:0,label:'Workshop',note:'Low workshops, a working chimney, and open yards.'},{at:50,label:'Exchange',note:'The same plots grow taller. Warehouses become a denser urban block.'},{at:100,label:'Common ground',note:'Some structures shrink; a lantern hall, canopy and trees take their place.'}].map((e,i)=>({...e,id:`era-${i+1}`,...fiction('A conceptual state, not a calendar date or historical claim.')}));
 const note=(id,object,range,label,text)=>({id,object,range,label,text,provenance:fiction(text)});
 return validateLocation({version:1,id,name,description:bay?'Tampa-inspired materials and palm gestures on an invented street.':'One invented street, imagined three ways.',disclaimer:bay?'TAMPA-INSPIRED FICTION · Invented plots and eras. No historical reconstruction.':'FICTIONAL DEMONSTRATION · Relative eras, not historical dates.',provenance:fiction('All plots, building arrangements and temporal transformations are invented. Reference photographs do not establish their historical appearance.'),eras,objects,media,
  camera:{position:[38,30,48],target:[0,4,-9],span:64},ground:{size:[52,66],streetWidth:8},
  layers:media.filter(m=>m.kind==='map').map((m,i)=>({id:m.id,media:m.id,position:[0,.025,-9],rotation:[-Math.PI/2,0,0],size:[52,66],keys:keys({opacity:i===0?.32:0},{opacity:i===1?.32:0},{opacity:i===2?.32:0})})),
  annotations:[note('hall-first','hall',[0,32],'01 / A low beginning','The workshop occupies the same plot in every state. Its roof lifts as the walls grow.'),note('corner-middle','corner',[32,74],'02 / A taller interval','The corner frame rises from five to nearly twenty scene units. Windows assemble floor by floor.'),note('lantern-last','lantern',[74,100],'03 / Room for light','The rear hall becomes a translucent lantern while the front block returns to a lower scale.')]
 });
}
export const PRESETS={workshop:{name:'01 / Workshop',settings:{...DEFAULTS}},exchange:{name:'02 / Exchange',settings:{...DEFAULTS,progress:50}},commons:{name:'03 / Common ground',settings:{...DEFAULTS,progress:100}},comparison:{name:'Two lives, one viewpoint',settings:{...DEFAULTS,progress:100,compare:true,compareAt:0}},bay:{name:'An imagined Tampa block',settings:{...DEFAULTS,location:'bay',progress:27}}};
