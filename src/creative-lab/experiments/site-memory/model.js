// Semantic journey data only: no DOM, browser storage, routing or networking.
export const VERSION=1,MAX_EVENTS=512,MAX_DESTINATIONS=24;
export const TYPES=['visit','open','inspect','complete'];
export const KINDS=['observatory','glasshouse','wheel','press','tower','atlas'];
export const DEFAULT_APPEARANCE={complexity:2,density:1,inkStyle:'graphite',arrangement:'atlas',guides:true};
export const DEFAULTS={...DEFAULT_APPEARANCE,persistence:true,speed:1};
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function settings(input={}){const s={...DEFAULTS,...input};return {complexity:Math.round(clamp(Number(s.complexity)||1,1,3)),density:Math.round(clamp(Number(s.density)||.5,.5,1.5)*10)/10,inkStyle:['graphite','umber','blue'].includes(s.inkStyle)?s.inkStyle:'graphite',arrangement:['atlas','courtyard','procession'].includes(s.arrangement)?s.arrangement:'atlas',guides:!!s.guides,persistence:!!s.persistence,speed:Math.round(clamp(Number(s.speed)||.25,.25,3)*4)/4};}
export function appearanceOf(input){return Object.fromEntries(Object.keys(DEFAULT_APPEARANCE).map(k=>[k,settings(input)[k]]));}
const idPattern=/^[a-z0-9][a-z0-9._:-]{0,63}$/i;
const text=(v,max,label)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f]/.test(v))throw new Error(`Invalid ${label}.`);return v;};
export function validateDestinations(input){if(!Array.isArray(input)||input.length<1||input.length>MAX_DESTINATIONS)throw new Error('Supply 1–24 destinations.');const seen=new Set();return input.map(d=>{if(!d||typeof d.id!=='string'||!idPattern.test(d.id)||seen.has(d.id))throw new Error('Destination IDs must be unique, short identifiers.');seen.add(d.id);if(!KINDS.includes(d.kind))throw new Error('Unsupported destination illustration.');return {id:d.id,label:text(d.label,64,'destination label'),kind:d.kind};});}
export function validateJourney(input){
 if(!input||input.schemaVersion!==VERSION||input.engineVersion!==VERSION)throw new Error('This journey uses an unsupported version.');
 if(typeof input.id!=='string'||!idPattern.test(input.id))throw new Error('Invalid journey identifier.');const title=text(input.title,80,'journey title');if(!Number.isInteger(input.seed)||input.seed<0||input.seed>4294967295)throw new Error('Invalid drawing seed.');if(!Number.isFinite(input.createdAt)||input.createdAt<0||input.createdAt>8640000000000000)throw new Error('Invalid creation time.');
 const destinations=validateDestinations(input.destinations),known=new Set(destinations.map(d=>d.id)),appearance=appearanceOf(input.appearance);if(!input.appearance||Object.keys(DEFAULT_APPEARANCE).some(k=>appearance[k]!==input.appearance[k]))throw new Error('Invalid saved drawing settings.');
 if(!Array.isArray(input.events)||input.events.length>MAX_EVENTS)throw new Error('A journey can contain at most 512 events.');let previous=input.createdAt;
 const events=input.events.map((event,index)=>{if(!event||event.seq!==index+1||!TYPES.includes(event.type)||!known.has(event.target)||!Number.isFinite(event.at)||event.at<previous||event.at>8640000000000000)throw new Error(`Invalid exploration event ${index+1}.`);previous=event.at;return {seq:index+1,type:event.type,target:event.target,at:event.at};});
 return {schemaVersion:VERSION,engineVersion:VERSION,id:input.id,title,seed:input.seed,createdAt:input.createdAt,destinations,appearance,events};
}
export function createJourney({id,seed=17,title='Untitled journey',createdAt=Date.now(),destinations,appearance=DEFAULT_APPEARANCE}){return validateJourney({schemaVersion:VERSION,engineVersion:VERSION,id,seed,title,createdAt,destinations,appearance:appearanceOf(appearance),events:[]});}
export function appendEvent(journey,{type,target,at=Date.now()}){const copy=validateJourney(journey);if(copy.events.length===MAX_EVENTS)throw new Error('This journey has reached 512 marks. Export it or start a new journey.');if(!TYPES.includes(type))throw new Error('Use visit, open, inspect, or complete.');if(!copy.destinations.some(d=>d.id===target))throw new Error('Unknown destination.');if(!Number.isFinite(at))throw new Error('Invalid event time.');copy.events.push({seq:copy.events.length+1,type,target,at:Math.max(copy.events.at(-1)?.at??copy.createdAt,at)});return validateJourney(copy);}
export function summarize(journey,count=journey.events.length){const events=journey.events.slice(0,clamp(Math.floor(count),0,journey.events.length)),places=new Map(),edges=new Map();let previous=null;
 for(const event of events){if(!places.has(event.target))places.set(event.target,{id:event.target,order:places.size,birth:event.seq,visits:0,opens:0,inspections:0,seals:0,total:0});const p=places.get(event.target);p.total++;p[event.type==='visit'?'visits':event.type==='open'?'opens':event.type==='inspect'?'inspections':'seals']++;
  if(event.type==='visit'){if(previous&&previous!==event.target){const key=[previous,event.target].sort().join('|');let edge=edges.get(key);if(!edge){edge={key,a:previous,b:event.target,birth:event.seq,count:0,events:[]};edges.set(key,edge);}edge.count++;edge.events.push(event.seq);}previous=event.target;}
 }
 return {events,places,edges,current:events.at(-1)?.target||null};
}
export function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function fingerprint(journey){return hash(JSON.stringify(validateJourney(journey))).toString(16).padStart(8,'0');}
export function createMemory({journey,...definition}){let value=journey?validateJourney(journey):createJourney(definition);const listeners=new Set();const publish=()=>listeners.forEach(fn=>fn(validateJourney(value)));
 return {record(event){value=appendEvent(value,event);publish();return validateJourney(value);},snapshot:()=>validateJourney(value),load(next){value=validateJourney(next);publish();},setAppearance(next){value={...value,appearance:appearanceOf(next)};publish();},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
}
