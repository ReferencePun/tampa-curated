// Pure camera/depth functions. The picture plane is always z=0; the relief
// recedes into negative z. No time-based state or sample assets live here.
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const DEFAULTS={mode:'layered',image:'palms',depth:1.2,parallax:.65,progress:0,blend:.72,quality:'medium',cameraX:0,cameraY:0,guides:true};
export function options(input={}){return {...DEFAULTS,...input,mode:input.mode==='splat'?'splat':'layered',image:['palms','facade'].includes(input.image)?input.image:'palms',depth:clamp(input.depth??DEFAULTS.depth,0,2.5),parallax:clamp(input.parallax??DEFAULTS.parallax,0,1.5),progress:clamp(input.progress??0,0,100),blend:clamp(input.blend??DEFAULTS.blend),quality:['low','medium','high'].includes(input.quality)?input.quality:'medium',cameraX:clamp(input.cameraX??0,-1,1),cameraY:clamp(input.cameraY??0,-1,1),guides:input.guides!==false};}
export function frameSize(aspect){const height=aspect>=1?7/aspect:7;return {width:height*aspect,height};}
export function sampleTransition(progress,aspect=1.5,viewportAspect=1.5,settings=DEFAULTS,pointer=[0,0]){
 const p=clamp(progress/100),size=frameSize(aspect);let fov=42;
 const startZ=Math.max(size.height/2,size.width/3)/Math.tan(fov*Math.PI/360)*1.54;
 fov=2*Math.atan(Math.max(size.height/2,size.width/(2*viewportAspect))*1.54/startZ)*180/Math.PI;
 const emerge=smooth(.04,.43,p),travel=smooth(.05,1,p),inside=-1.15;
 const z=startZ+(inside-startZ)*travel,drift=smooth(.1,.7,p);
 const x=(settings.cameraX+pointer[0]*settings.parallax)*.28*drift;
 const y=(settings.cameraY+pointer[1]*settings.parallax)*.24*drift;
 const averageDepth=12+.75*settings.depth;
 const coverFov=2*Math.atan(Math.min(size.height,size.width/viewportAspect)*(1+averageDepth/startZ)/(2*(averageDepth-inside))*.94)*180/Math.PI;
 fov+=(Math.min(fov,coverFov)-fov)*smooth(.45,1,p);
 return {p,startZ,emerge,z,x,y,fov,size,crossed:z<0,stage:p<.08?'The photograph':p<.4?'Depth gathers':z>=0?'Approaching the threshold':'Inside the photograph',guideOpacity:(1-smooth(.5,.84,p))*.42};
}
// White is near, black is far. Projective expansion keeps the same image
// registered from the original eye while the mesh acquires genuine depth.
export function reliefPoint(u,v,depth,pose,strength){
 const distance=(12+(1-clamp(depth))*1.5*strength)*pose.emerge;
 const expansion=1+distance/pose.startZ;
 return [(u-.5)*pose.size.width*expansion,(v-.5)*pose.size.height*expansion,-distance];
}
export function sampleDepth(map,u,v){
 const x=clamp(u)*(map.width-1),y=(1-clamp(v))*(map.height-1),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const at=(a,b)=>map.data[Math.min(map.height-1,b)*map.width+Math.min(map.width-1,a)];
 return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
}
export function settle(current,target,dt){const next=current+(target-current)*(1-Math.exp(-Math.min(.06,dt)*9));return Math.abs(next-target)<.015?target:next;}
export function validateRegistration(input={}){
 const vector=(value,fallback,name)=>{const a=value??fallback;if(!Array.isArray(a)||a.length!==3||a.some(n=>!Number.isFinite(n)))throw new Error(`${name} must contain three finite numbers.`);return [...a];};
 const result={position:vector(input.position,[0,0,-6],'position'),rotation:vector(input.rotation,[Math.PI,0,0],'rotation'),scale:input.scale??1};
 if(!Number.isFinite(result.scale)||result.scale<=0||result.scale>10000)throw new Error('scale must be between 0 and 10000.');return result;
}
