// Framework-independent sensor schema, sampling and display semantics.
export const MINUTE=60000,STALE_AFTER=30*MINUTE,MAX_GAP=18*MINUTE;
export const numeric=value=>value===null||value===undefined||String(value).trim()===''?null:Number.isFinite(Number(value))?Number(value):null;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validateSnapshot(input){
 if(input?.schemaVersion!==1||!input.source||typeof input.source.id!=='string'||typeof input.source.name!=='string'||!Number.isFinite(input.fetchedAt))throw new Error('Invalid sensor snapshot metadata.');
 for(const [key,fields]of Object.entries({water:['value'],wind:['speed','direction','gust'],prediction:['value']})){
  const rows=input.series?.[key];if(!Array.isArray(rows)||rows.length>20000)throw new Error(`Invalid ${key} series.`);
  let previous=-Infinity;for(const row of rows){if(!Number.isFinite(row.time)||row.time<=previous)throw new Error(`Unordered ${key} timestamps.`);previous=row.time;for(const field of fields)if(row[field]!==null&&!Number.isFinite(row[field]))throw new Error(`Invalid ${key}.${field}.`);}
 }
 return input;
}
export function recordAt(rows,time,maxAge=Infinity){let lo=0,hi=rows.length-1,result=null;while(lo<=hi){const m=(lo+hi)>>1;if(rows[m].time<=time){result=rows[m];lo=m+1;}else hi=m-1;}return result&&time-result.time<=maxAge?result:null;}
export function predictionAt(rows,time){
 const left=recordAt(rows,time);if(!left)return null;const index=rows.indexOf(left),right=rows[index+1];
 if(!right||right.time-left.time>MAX_GAP||left.value===null||right.value===null)return null;
 const t=(time-left.time)/(right.time-left.time);return {value:left.value+(right.value-left.value)*t,rate:(right.value-left.value)/((right.time-left.time)/3600000),time,quality:'prediction'};
}
export function sampleSensors(snapshot,time,{history=false}={}){
 const series=snapshot?.series||{water:[],wind:[],prediction:[]},water=recordAt(series.water,time,history?MAX_GAP:Infinity),wind=recordAt(series.wind,time,history?MAX_GAP:Infinity),tide=predictionAt(series.prediction,time);
 return {kind:history?'history':'live',time,water,wind,tide,waterStale:!!water&&time-water.time>STALE_AFTER,windStale:!!wind&&time-wind.time>STALE_AFTER};
}
export function simulationSensors(settings,time=Date.now()){
 return {kind:'simulation',time,water:{value:settings.testWater,time,quality:'simulation'},wind:{speed:settings.testWind,direction:settings.testDirection,gust:null,time,quality:'simulation'},tide:{value:settings.testWater,rate:settings.testTide,time,quality:'simulation'},waterStale:false,windStale:false};
}
export function historyBounds(snapshot){const times=[...(snapshot?.series.water||[]),...(snapshot?.series.wind||[])].map(r=>r.time);if(times.length<2)return null;const end=Math.max(...times),start=Math.max(Math.min(...times),end-24*3600000);return end>start?{start,end}:null;}
export function tideLabel(rate){return rate===null||rate===undefined?'Unavailable':Math.abs(rate)<.015?'Near a turn':rate>0?'Rising':'Falling';}
export function directionName(degrees){if(degrees===null)return '—';return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(degrees/22.5)%16];}
