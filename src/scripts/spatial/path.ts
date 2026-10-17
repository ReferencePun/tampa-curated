import {CatmullRomCurve3, Matrix4, Quaternion, Vector3} from 'three';
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export const phase=(p:number,a:number,b:number)=>ease((p-a)/(b-a));
type Point=[number,number,number];
export const checkpoints: {progress:number;position:Point;target:Point;roll:number}[]=[
 {progress:0,position:[15,17,26],target:[0,2,-7],roll:0},
 {progress:.13,position:[7,9,16],target:[0,4.4,-5],roll:0},
 {progress:.27,position:[0,4.4,6],target:[0,4.4,-12],roll:0},
 {progress:.40,position:[0,4.4,-9],target:[0,4.6,-23],roll:0},
 {progress:.53,position:[0,4.5,-21],target:[-2,4.5,-32],roll:0},
 {progress:.65,position:[-4,4.5,-31],target:[-19,5.5,-34],roll:0},
 {progress:.75,position:[-17,4.5,-34],target:[-41,5.5,-34],roll:0},
 {progress:.82,position:[-34,4.5,-34],target:[-58,5.5,-34],roll:0},
 {progress:.89,position:[-50,4.5,-34],target:[-74,5.5,-34],roll:0},
 {progress:.95,position:[-63,4.5,-34],target:[-87,5.5,-34],roll:0},
 {progress:1,position:[-70,4.5,-34],target:[-94,5.5,-34],roll:0},
];
const points=checkpoints.map(c=>new Vector3(...c.position));
const path=new CatmullRomCurve3(points,false,'centripetal');
const up=new Vector3(0,1,0),axis=new Vector3(0,0,1);
const rotations=checkpoints.map(c=>new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(...c.position),new Vector3(...c.target),up)).multiply(new Quaternion().setFromAxisAngle(axis,c.roll)).normalize());
const heading=new Vector3(),upright=new Matrix4();
// Continuous forward speed through the street, with a gentle arrival and stop.
// Keeping the eye height and centerline fixed removes the old lateral sway.
const streetVelocity=checkpoints.map((_,i)=>i<=6||i===checkpoints.length-1?0:(checkpoints[i+1].position[0]-checkpoints[i-1].position[0])/(checkpoints[i+1].progress-checkpoints[i-1].progress));
export function sampleCamera(progress:number,position:Vector3,quaternion:Quaternion){
 const p=clamp(progress);
 let i=checkpoints.findIndex((_,index)=>index<checkpoints.length-1&&p<=checkpoints[index+1].progress);
 if(i<0)i=checkpoints.length-2;
 const t=ease((p-checkpoints[i].progress)/(checkpoints[i+1].progress-checkpoints[i].progress));
 path.getPoint((i+t)/(checkpoints.length-1),position);
 quaternion.slerpQuaternions(rotations[i],rotations[i+1],t).normalize();
 if(p>=.75){
  const a=checkpoints[i],b=checkpoints[i+1],duration=b.progress-a.progress,u=clamp((p-a.progress)/duration),u2=u*u,u3=u2*u;
  position.set((2*u3-3*u2+1)*a.position[0]+(u3-2*u2+u)*duration*streetVelocity[i]+(-2*u3+3*u2)*b.position[0]+(u3-u2)*duration*streetVelocity[i+1],4.5,-34);
 }else if(p>=.65){position.y=4.5;position.z=-31-3*phase(p,.65,.75);}
 // Slerping between pitched headings can introduce a small roll even when
 // endpoint rolls are zero. Rebuild with world-up so the horizon stays level.
 heading.set(0,0,-1).applyQuaternion(quaternion).add(position);
 quaternion.setFromRotationMatrix(upright.lookAt(position,heading,up));
}
export const rooms=[
 {id:'drawing',name:'The drawing',progress:0,description:'A building, still deciding what to become. Scroll to lift it from the paper.'},
 {id:'threshold',name:'The threshold',progress:.27,description:'A wheel becomes a doorway. There is more room on the other side.'},
 {id:'corridor',name:'The impossible corridor',progress:.48,description:'Keep going. The passage has a turn the drawing did not promise.'},
 {id:'city',name:'The city',progress:.94,description:'Keep walking. Tampa’s landmarks rise on either side of the street.'},
];
export function roomAt(p:number){return p<.18?0:p<.38?1:p<.73?2:3;}
