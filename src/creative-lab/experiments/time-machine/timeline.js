// Timeline sampling is independent of Three.js, the DOM and the playback clock.
export const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export const ease=n=>{const t=clamp(n,0,1);return t*t*(3-2*t);};
const numeric=['height','width','depth','roof','presence','opacity','rotation'];
const defaults={height:6,width:8,depth:8,roof:1.5,presence:1,opacity:1,rotation:0,offset:[0,0,0],tint:[.77,.73,.65],media:null};
export function interval(keys,time){if(!Number.isFinite(time))throw new Error('Time must be finite.');const t=clamp(time),right=keys.findIndex(k=>k.at>t);if(right===0)return {a:keys[0],b:keys[0],mix:0};if(right<0)return {a:keys.at(-1),b:keys.at(-1),mix:0};const a=keys[right-1],b=keys[right];return {a,b,mix:ease((t-a.at)/(b.at-a.at))};}
export function sampleKeys(keys,time,base={}){
 const {a,b,mix}=interval(keys,time),start={...defaults,...base,...a},end={...defaults,...base,...b},result={};
 for(const key of numeric)result[key]=start[key]+(end[key]-start[key])*mix;
 for(const key of ['offset','tint'])result[key]=start[key].map((n,i)=>n+(end[key][i]-n)*mix);
 result.media={};if(start.media)result.media[start.media]=(result.media[start.media]||0)+1-mix;if(end.media)result.media[end.media]=(result.media[end.media]||0)+mix;
 return result;
}
export function describeTime(eras,time){const i=eras.findIndex(e=>e.at>=time);if(i<0)return eras.at(-1).label;if(i===0||Math.abs(eras[i].at-time)<.05)return eras[i].label;return `${eras[i-1].label} → ${eras[i].label}`;}
export function advanceClock(time,direction,dt,speed=1){let t=time+clamp(dt,0,.12)*8*speed*direction,d=direction;while(t>100||t<0){if(t>100){t=200-t;d=-1;}if(t<0){t=-t;d=1;}}return {time:t,direction:d};}
export function settleTime(current,target,dt,speed=1){const next=current+(target-current)*(1-Math.exp(-clamp(dt,0,.12)*9*speed));return Math.abs(next-target)<.001?target:next;}
export function dialTime(x,y){const angle=Math.atan2(y,x)*180/Math.PI;const degrees=((angle+135)%360+360)%360;return degrees<=270?degrees/2.7:degrees<315?100:0;}
export function validateLocation(scene){
 const finite=(v,n=3)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=10000);
 if(scene.version!==1||!scene.id||!scene.name||!scene.disclaimer)throw new Error('A location needs version 1, an id, name and an explicit provenance notice.');
 const provenance=value=>{if(!value||!['fictional','reconstruction','documented'].includes(value.kind)||!value.note)throw new Error('Label every location, era, medium and annotation with its provenance.');if(value.kind==='documented'&&(!value.sources?.length||value.sources.some(s=>typeof s!=='string'||!/^https?:\/\//.test(s))))throw new Error('Documented material requires source URLs.');};provenance(scene.provenance);
 if(!Array.isArray(scene.eras)||scene.eras.length<2||scene.eras.length>12)throw new Error('Supply two to twelve ordered eras.');
 const times=keys=>{if(!Array.isArray(keys)||!keys.length||keys.length>32||keys.some((k,i)=>!Number.isFinite(k.at)||k.at<0||k.at>100||(i&&keys[i-1].at>=k.at)))throw new Error('Key times must be strictly increasing from 0 to 100.');};times(scene.eras);scene.eras.forEach(provenance);
 if(!scene.camera||!finite(scene.camera.position)||!finite(scene.camera.target)||!Number.isFinite(scene.camera.span)||scene.camera.span<=0)throw new Error('Supply a finite registered camera and positive view span.');
 if(!scene.ground||!finite(scene.ground.size,2)||scene.ground.size.some(n=>n<=0)||!Number.isFinite(scene.ground.streetWidth)||scene.ground.streetWidth<=0)throw new Error('Supply positive ground dimensions.');
 const media=new Set();for(const item of scene.media||[]){if(media.has(item.id)||!item.id||typeof item.url!=='string'||!item.credit||!item.license)throw new Error('Every medium needs a unique id, URL, credit and license.');media.add(item.id);provenance(item.provenance);}
 if(!Array.isArray(scene.objects)||!scene.objects.length||scene.objects.length>80)throw new Error('Supply 1–80 spatial objects.');
 const ids=new Set();for(const object of scene.objects){if(!object.id||ids.has(object.id)||!['building','column','tree','canopy','mesh'].includes(object.kind)||!finite(object.position))throw new Error('Objects need unique IDs, supported geometry and finite positions.');ids.add(object.id);times(object.keys);
  if(object.kind==='mesh'){
   const vertices=object.geometry?.positions;if(!Array.isArray(vertices)||vertices.length<9||vertices.length%9||vertices.length>54000||vertices.some(n=>!Number.isFinite(n)||Math.abs(n)>1000))throw new Error('Custom geometry uses bounded, non-indexed triangle coordinates.');
   if(object.geometry.frames){times(object.geometry.frames);if(object.geometry.frames.some(f=>!Array.isArray(f.positions)||f.positions.length!==vertices.length||f.positions.some(n=>!Number.isFinite(n)||Math.abs(n)>1000)))throw new Error('Geometry morph frames must share the original topology.');}
  }

  for(const key of object.keys){for(const prop of numeric)if(key[prop]!==undefined&&(!Number.isFinite(key[prop])||Math.abs(key[prop])>1000||(['height','width','depth','roof','presence','opacity'].includes(prop)&&key[prop]<0)))throw new Error(`Invalid ${prop}: ${object.id}`);for(const prop of ['offset','tint'])if(key[prop]!==undefined&&!finite(key[prop]))throw new Error(`Invalid ${prop}: ${object.id}`);if(key.media&&!media.has(key.media))throw new Error(`Unknown medium: ${key.media}`);}
 }
 for(const layer of scene.layers||[]){if(!media.has(layer.media)||!finite(layer.position)||!finite(layer.rotation)||!finite(layer.size,2)||layer.size.some(n=>n<=0))throw new Error('Media layers need registered positions, rotations, sizes and media IDs.');times(layer.keys);}
 for(const note of scene.annotations||[]){if(!ids.has(note.object)||!note.id||!note.label||!note.text||!finite(note.range,2)||note.range[0]>note.range[1])throw new Error('Annotations need a known object and ordered visibility range.');provenance(note.provenance);}
 return scene;
}
