// Positions and footsteps depend only on the journey, never elapsed time.
export const crosswalks=[-32,-63,-85,-104];
export const pedestrians=[
 {x:-31.65,start:.711,end:.785,direction:1,scale:1,offset:0,accent:2},
 {x:-30.35,start:.721,end:.791,direction:1,scale:.92,offset:.36,accent:3},
 {x:-31.05,start:.722,end:.798,direction:-1,scale:1.04,offset:.18,accent:0},
 {x:-62.55,start:.825,end:.907,direction:-1,scale:1.02,offset:.12,accent:3},
 {x:-61.25,start:.84,end:.918,direction:1,scale:.94,offset:.42,accent:0},
 {x:-84.55,start:.905,end:.995,direction:1,scale:1.03,offset:.23,accent:2},
 {x:-83.35,start:.918,end:1,direction:-1,scale:.96,offset:.06,accent:0},
];
export type Pedestrian=typeof pedestrians[number];
const clamp=(v:number)=>Math.min(1,Math.max(0,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export function groundAt(z:number,compact:boolean){
 return .045+.14*smooth((Math.abs(z+34)-(compact?4.5:8)+.12)/.38);
}
export function samplePedestrian(person:Pedestrian,progress:number,compact:boolean){
 const halfRoad=compact?4.5:8,span=2*(halfRoad+1.1);
 const crossing=smooth((progress-person.start)/(person.end-person.start));
 const distance=crossing*span,z=-34+person.direction*(-span/2+distance);
 const stride=1.65*person.scale,cycle=distance/stride+person.offset;
 const activity=smooth(crossing/.075)*smooth((1-crossing)/.075);
 return {z,distance,stride,cycle,activity,crossing,ground:groundAt(z,compact)};
}
export function sampleFoot(cycle:number,stride:number){
 const phase=((cycle%1)+1)%1;
 if(phase<.5)return {x:stride*(.25-phase),lift:0,stance:true};
 const swing=(phase-.5)*2;
 return {x:stride*(-.25+swing*.5-Math.sin(swing*Math.PI*2)/(Math.PI*2)),lift:Math.sin(swing*Math.PI)**2*.29,stance:false};
}
