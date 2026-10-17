import {CatmullRomCurve3, Matrix4, Quaternion, Vector3} from 'three';
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export const phase=(p:number,a:number,b:number)=>ease((p-a)/(b-a));
type Point=[number,number,number];
export const checkpoints: {progress:number;position:Point;target:Point;roll:number}[]=[
 {progress:0,position:[15,17,26],target:[0,2,-7],roll:-.025},
 {progress:.13,position:[7,9,16],target:[0,4.4,-5],roll:0},
 {progress:.27,position:[0,4.4,6],target:[0,4.4,-12],roll:0},
 {progress:.40,position:[0,4.4,-9],target:[0,4.6,-23],roll:-.035},
 {progress:.53,position:[0,4.5,-21],target:[-2,4.5,-32],roll:.08},
 {progress:.65,position:[-4,4.7,-31],target:[-19,5,-34],roll:.21},
 {progress:.75,position:[-17,4.4,-34],target:[-37,6,-34],roll:-.05},
 {progress:.88,position:[-32,4.8,-34],target:[-54,6.7,-34],roll:0},
 {progress:1,position:[-42,5,-34],target:[-54,6.7,-34],roll:0},
];
const points=checkpoints.map(c=>new Vector3(...c.position));
const path=new CatmullRomCurve3(points,false,'centripetal');
const up=new Vector3(0,1,0),axis=new Vector3(0,0,1);
const rotations=checkpoints.map(c=>new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(...c.position),new Vector3(...c.target),up)).multiply(new Quaternion().setFromAxisAngle(axis,c.roll)).normalize());
export function sampleCamera(progress:number,position:Vector3,quaternion:Quaternion){
 const p=clamp(progress);
 let i=checkpoints.findIndex((_,index)=>index<checkpoints.length-1&&p<=checkpoints[index+1].progress);
 if(i<0)i=checkpoints.length-2;
 const t=ease((p-checkpoints[i].progress)/(checkpoints[i+1].progress-checkpoints[i].progress));
 path.getPoint((i+t)/(checkpoints.length-1),position);
 quaternion.slerpQuaternions(rotations[i],rotations[i+1],t).normalize();
}
export const rooms=[
 {id:'drawing',name:'The drawing',progress:0,description:'A building, still deciding what to become. Scroll to lift it from the paper.'},
 {id:'threshold',name:'The threshold',progress:.27,description:'A wheel becomes a doorway. There is more room on the other side.'},
 {id:'corridor',name:'The impossible corridor',progress:.48,description:'Keep going. The passage has a turn the drawing did not promise.'},
 {id:'city',name:'The city',progress:.94,description:'Somewhere between the imagined city and the one outside. Enter a photograph.'},
];
export function roomAt(p:number){return p<.18?0:p<.38?1:p<.73?2:3;}
