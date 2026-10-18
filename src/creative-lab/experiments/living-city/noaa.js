import {numeric,validateSnapshot,MINUTE} from './sensors.js';
export const API='https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
export const STATIONS={
 tampa:{id:'8726607',name:'Old Port Tampa',label:'Tampa / Old Port Tampa',lat:27.8578,lon:-82.5528},
 stpete:{id:'8726520',name:'St. Petersburg',label:'Tampa Bay / St. Petersburg',lat:27.7606,lon:-82.6269}
};
export const PRODUCTS={water:'water_level',wind:'wind',prediction:'predictions'};
export function requestURL(station,key,now=Date.now()){
 const q=new URLSearchParams({station:station.id,product:PRODUCTS[key],time_zone:'gmt',units:'metric',format:'json',application:'TampaCurated_LivingCity'});
 if(key!=='wind')q.set('datum','MLLW');
 if(key==='prediction'){const start=new Date(Math.floor((now-24*3600000)/3600000)*3600000);q.set('begin_date',start.toISOString().slice(0,16).replaceAll('-','').replace('T',' '));q.set('range','48');q.set('interval','6');}else q.set('range','24');
 return `${API}?${q}`;
}
export function normalizeResponse(body,key,station){
 if(body.error)throw new Error(body.error.message||'NOAA returned an error.');
 if(body.metadata&&String(body.metadata.id)!==station.id)throw new Error('The response belongs to a different station.');
 const list=key==='prediction'?body.predictions:body.data;if(!Array.isArray(list)||!list.length)throw new Error('No readings are available for this product.');
 const dedup=new Map();for(const row of list){
  if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row.t||''))continue;const time=Date.parse(row.t.replace(' ','T')+':00Z');if(!Number.isFinite(time))continue;
  const flags=typeof row.f==='string'?row.f.split(',').map(Number):[],quality=key==='prediction'?'prediction':row.q==='v'?'verified':key==='wind'?'observed':'preliminary';
  // The first preliminary water flag is an outlier SAMPLE COUNT, not a
  // rejection flag. F/R/L flags are the last three. Verified I is retained.
  const rejected=key==='wind'?flags.some(v=>v>0):key==='water'?flags.slice(1).some(v=>v>0):false;
  const base={time,quality:rejected?'flagged':quality,flags};
  if(key==='wind'){let speed=numeric(row.s),direction=numeric(row.d),gust=numeric(row.g);if(speed!==null&&speed<0)speed=null;if(gust!==null&&gust<0)gust=null;if(direction!==null&&(direction<0||direction>360))direction=null;dedup.set(time,{...base,speed:rejected?null:speed,direction:rejected?null:direction,gust:rejected?null:gust});}
  else dedup.set(time,{...base,value:rejected?null:numeric(row.v)});
 }
 const result=[...dedup.values()].sort((a,b)=>a.time-b.time);if(!result.length)throw new Error('No valid timestamps were returned.');return result;
}
async function pause(ms,signal){if(signal?.aborted)throw new DOMException('Aborted','AbortError');await new Promise((resolve,reject)=>{const done=()=>{signal?.removeEventListener('abort',abort);resolve();},timer=setTimeout(done,ms),abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',abort,{once:true});});}
export function createNoaaAdapter({fetcher=globalThis.fetch.bind(globalThis),storage=null,now=Date.now,timeout=12000,spacing=150}={}){
 const memory=new Map();
 function cached(key,kind,station){let item=memory.get(key);if(!item&&storage)try{item=JSON.parse(storage.getItem(key)||'null');}catch{/* Storage is optional. */}
  if(!item||!Number.isFinite(item.at)||item.at>now()+MINUTE||now()-item.at>48*3600000)return null;
  try{const empty={water:[],wind:[],prediction:[]};validateSnapshot({schemaVersion:1,source:station,fetchedAt:item.at,series:{...empty,[kind]:item.rows}});return item;}catch{return null;}
 }
 async function fetchJSON(url,signal){const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetcher(url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw new Error(`NOAA request failed (${response.status}).`);return await response.json();}
  catch(error){if(signal?.aborted)throw new DOMException('Aborted','AbortError');throw new Error(error.name==='AbortError'?'NOAA request timed out.':error.message);}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 return {id:'noaa-coops',sources:Object.entries(STATIONS).map(([id,s])=>({id,label:s.label})),
  async getSnapshot({location='tampa',signal,force=false}={}){
   const station=STATIONS[location];if(!station)throw new Error('Choose a supported NOAA station.');const series={},products={};
   for(const [index,kind]of Object.keys(PRODUCTS).entries()){
    if(signal?.aborted)throw new DOMException('Aborted','AbortError');const key=`living-city:noaa:v1:${station.id}:${kind}`,cache=cached(key,kind,station),ttl=kind==='prediction'?3600000:6*MINUTE,url=requestURL(station,kind,now());
    if(cache&&now()-cache.at<(force?30*1000:ttl)){series[kind]=cache.rows;products[kind]={status:'cache',fetchedAt:cache.at,url:cache.url||url,error:null};continue;}
    try{if(index)await pause(spacing,signal);const body=await fetchJSON(url,signal),rows=normalizeResponse(body,kind,station),entry={at:now(),url,rows};memory.set(key,entry);if(storage)try{storage.setItem(key,JSON.stringify(entry));}catch{/* Continue without persistent cache. */}series[kind]=rows;products[kind]={status:'fresh',fetchedAt:entry.at,url,error:null};}
    catch(error){if(signal?.aborted||error.name==='AbortError')throw error;series[kind]=cache?.rows||[];products[kind]={status:cache?'stale-cache':'error',fetchedAt:cache?.at||null,url:cache?.url||url,error:error.message};}
   }
   return validateSnapshot({schemaVersion:1,source:{id:station.id,name:station.name,provider:'NOAA CO-OPS',lat:station.lat,lon:station.lon,url:`https://tidesandcurrents.noaa.gov/stationhome.html?id=${station.id}`,datum:'MLLW',units:{water:'m',wind:'m/s',direction:'degrees from true north'}},fetchedAt:now(),series,products});
  }
 };
}
