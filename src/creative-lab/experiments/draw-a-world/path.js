import {CatmullRomCurve3, Vector3} from 'three';

export const DEFAULTS = {style:'corridor',smoothing:0.65,width:5,density:38,depth:120,irregularity:0.35,speed:1,guides:true,path:[]};
export function validateOptions(options={}) {
  const value={...DEFAULTS,...options};
  for(const [key,min,max] of [['smoothing',0,1],['width',2,9],['density',12,70],['depth',80,200],['irregularity',0,1],['speed',.25,2]])
    if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw new Error(`${key} must be between ${min} and ${max}.`);
  if(!['corridor','vault','staircase'].includes(value.style)||typeof value.guides!=='boolean')throw new Error('Choose a valid architectural style and construction-line visibility.');
  return value;
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function validatePoints(points,{allowEmpty=false}={}) {
  if(!Array.isArray(points)||points.length>96||points.length===1||(!allowEmpty&&points.length<2))throw new Error('Use one open path with 2–96 points.');
  if(points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1)))throw new Error('Path coordinates must be pairs of numbers between 0 and 1.');
  return points.map(p=>[...p]);
}
// Arc-length resampling makes dense stylus input and slow mouse input equivalent.
export function simplifyStroke(raw) {
  const points=[];for(const point of raw)if(!points.length||distance(point,points.at(-1))>.0008)points.push(point);
  if(points.length<2)throw new Error('Draw a longer line to make a passage.');
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+distance(points[i],points[i-1]));
  const total=lengths.at(-1);if(total<.12)throw new Error('Draw a longer line—at least a fifth of the sheet.');
  const count=Math.min(40,Math.max(3,Math.ceil(total/.035))),result=[];
  let j=1;
  for(let i=0;i<=count;i++){
    const at=total*i/count;while(j<lengths.length-1&&lengths[j]<at)j++;
    const t=(at-lengths[j-1])/(lengths[j]-lengths[j-1]||1);
    result.push(points[j-1].map((v,k)=>+(v+(points[j][k]-v)*t).toFixed(5)));
  }
  return result;
}
export function smoothPoints(points,amount) {
  let next=validatePoints(points);
  for(let pass=0;pass<3;pass++)next=next.map((p,i,a)=>i===0||i===a.length-1?p:p.map((v,k)=>v*(1-amount*.6)+(a[i-1][k]+a[i+1][k])*amount*.3));
  return next;
}
export function preparePath(input,options={}) {
  const settings=validateOptions(options),points=smoothPoints(input,settings.smoothing);
  const planar=points.map(p=>new Vector3((p[0]-.5)*settings.depth,0,(p[1]-.5)*settings.depth*.65));
  const flat=new CatmullRomCurve3(planar,false,'centripetal');flat.arcLengthDivisions=800;
  const length=flat.getLength();if(length<settings.width*3)throw new Error('The line is too short for this width. Draw farther or narrow the passage.');
  if(length>settings.depth*5)throw new Error('This line is too intricate for the sheet. Try a simpler, shorter route.');
  const divisions=Math.min(720,Math.max(160,Math.ceil(length/(settings.width*.35))));
  const samples=flat.getSpacedPoints(divisions);
  // Refuse crossings and overlapping tight hairpins, rather than building walls through the camera.
  for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
    if((j-i)*length/divisions>settings.width*2.5&&samples[i].distanceTo(samples[j])<settings.width*1.15)
      throw new Error('Leave more room between bends. Crossings and closed loops are not supported yet.');
  }
  for(let i=2;i<samples.length-2;i++){
    const a=samples[i].clone().sub(samples[i-2]),b=samples[i+2].clone().sub(samples[i]);
    const angle=a.angleTo(b),radius=(a.length()+b.length())/(2*Math.max(angle,.0001));
    if(radius<settings.width*.65)throw new Error('That bend is too tight. Increase smoothing, narrow the passage, or draw a gentler curve.');
  }
  const rise=settings.style==='staircase'?length*.095:0;
  const world=samples.map((p,i)=>new Vector3(p.x,rise*i/divisions,p.z));
  const curve=new CatmullRomCurve3(world,false,'centripetal');curve.arcLengthDivisions=1200;
  return {curve,length:curve.getLength(),points,rise};
}
export function frameAt(curve,t) {
  const center=curve.getPointAt(Math.max(0,Math.min(1,t))),tangent=curve.getTangentAt(Math.max(0,Math.min(1,t))).normalize();
  const right=new Vector3().crossVectors(tangent,new Vector3(0,1,0)).normalize();
  return {center,tangent,right,up:new Vector3(0,1,0)};
}
export function cameraPose(model,progress) {
  const t=Math.max(0,Math.min(1,progress)),frame=frameAt(model.curve,t);
  const position=frame.center.clone().add(new Vector3(0,2.55,0));
  const lookAt=t+Math.min(.025,3/model.length);
  const ahead=frameAt(model.curve,Math.min(1,lookAt)).center.clone().add(new Vector3(0,2.55,0));
  if(lookAt>1)ahead.addScaledVector(frameAt(model.curve,1).tangent,(lookAt-1)*model.length);
  return {position,target:ahead,up:frame.up};
}
export const EXAMPLES = {
  straight:[[.12,.72],[.36,.56],[.62,.39],[.88,.22]],
  bend:Array.from({length:25},(_,i)=>{const t=i/24;return [.15+.7*t,.5+.24*Math.sin(t*Math.PI*2)];}),
  spiral:Array.from({length:49},(_,i)=>{const t=i/48,a=-Math.PI/2+t*Math.PI*2.6,r=.39-.29*t;return [.5+r*Math.cos(a),.5+r*Math.sin(a)];})
};
export function exportPath(points) {return {schemaVersion:1,type:'impossible-lab-path',coordinateSystem:'normalized-paper',points:validatePoints(points)};}
export function importPath(value) {
  const data=typeof value==='string'?JSON.parse(value):value;
  if(data?.schemaVersion!==1||data?.type!=='impossible-lab-path'||data?.coordinateSystem!=='normalized-paper')throw new Error('Choose a Draw a World path JSON file.');
  return validatePoints(data.points);
}
