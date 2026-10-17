import * as T from 'three';
import {Ink,materials,type P} from './ink';
import {pedestrians,samplePedestrian,sampleFoot,groundAt} from './pedestrian-motion';

const H=0,W=1,S=2,N=3,HEAD=4,K0=5,F0=6,TOE0=7,K1=8,F1=9,TOE1=10,E0=11,HAND0=12,E1=13,HAND1=14;
type Mark={person:number;a:number;b:number;t:number;normal:number;dx:number;dy:number;depth:number};

/** Seven small gesture drawings, batched into four reusable line buffers. */
export function createPedestrians(parent:T.Object3D,compact:boolean){
 const group=new T.Group();group.name='Scroll-driven scribble pedestrians';parent.add(group);
 const marks:Mark[][]=Array.from({length:4},()=>[]);
 const poses=pedestrians.map(()=>Array.from({length:15},()=>[0,0,0] as P));
 const states=pedestrians.map(person=>samplePedestrian(person,0,compact));
 function point(person:number,a:number,b:number,t:number,normal:number,tone:number,dx=0,dy=0,depth=0){marks[tone].push({person,a,b,t,normal,dx,dy,depth});}
 function stroke(person:number,a:number,b:number,seed:number,tone=0,passes=3){
  for(let pass=0;pass<passes;pass++)for(let step=0;step<5;step++)for(const end of [step,step+1]){
   const t=end/5,offset=(pass-1)*.018+Math.sin(seed*2.7+end*1.9+pass)*.009;
   point(person,a,b,t,offset,pass===2?1:tone,0,0,(pass-1)*.008);
  }
 }
 for(const [i,person] of pedestrians.entries()){
  // Long, slightly overdrawn gestures, without faces or solid cartoon shapes.
  for(const [a,b] of [[H,W],[W,S],[S,N],[N,HEAD],[S,E0],[E0,HAND0],[S,E1],[E1,HAND1],[H,K0],[K0,F0],[F0,TOE0],[H,K1],[K1,F1],[F1,TOE1]])stroke(i,a,b,i*17+a*5+b);
  for(let pass=0;pass<3;pass++)for(let step=0;step<27;step++)for(const end of [step,step+1]){
   const a=end/27*Math.PI*2,rough=Math.sin(a*5+i*2+pass)*.012;
   point(i,HEAD,HEAD,0,0,pass===2?1:0,Math.cos(a)*(.185+pass*.009+rough),Math.sin(a)*(.235+rough),pass*.009);
  }
  // A handful of searching pencil lines give the torso a loose scribbled weight.
  for(let j=0;j<5;j++){
   point(i,W,S,.05+j*.13,0,j===4?1:0,-.07,.01,j*.002);
   point(i,W,S,.37+j*.14,0,j===4?1:0,.075,0,j*.002);
  }
  if(person.accent){
   // Small unfilled neck/shoulder accents echo the city's colored pencil lights.
   for(let j=0;j<5;j++){
    point(i,N,S,.1+j*.035,0,person.accent,-.13-j*.007,0,.028);
    point(i,N,S,.34+j*.04,0,person.accent,.16,0,.028);
   }
  }
 }
 const buffers=marks.map((list,tone)=>{
  const geometry=new T.BufferGeometry(),positions=new T.BufferAttribute(new Float32Array(list.length*3),3);
  positions.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',positions);
  const lines=new T.LineSegments(geometry,materials[tone]);lines.frustumCulled=false;group.add(lines);
  return positions;
 });
 // A few short hatching strokes anchor each figure to the road. They move with
 // the person, remain flat, and do not become glowing blobs or solid shadows.
 const shadows=pedestrians.map((person,i)=>{
  const shadow=new T.Group(),pen=new Ink();shadow.name=`Pedestrian ${i+1} ground sketch`;
  for(let j=0;j<5;j++)pen.line([-.18+j*.09,0,-.34],[.07+j*.09,0,.35+Math.sin(j+i)*.07],1,false);
  pen.build(shadow);shadow.scale.setScalar(person.scale);group.add(shadow);return shadow;
 });
 function update(progress:number){
  group.visible=progress>.63;if(!group.visible)return '';
  for(const [i,person] of pedestrians.entries()){
   const state=states[i]=samplePedestrian(person,progress,compact),nodes=poses[i];
   const s=person.scale,walk=state.activity,bob=Math.cos(state.cycle*Math.PI*4)*.025*walk;
   const hip=1.36+bob,lean=.055*walk;
   const set=(node:number,x:number,y:number,depth=0)=>{nodes[node][0]=x;nodes[node][1]=y;nodes[node][2]=depth;};
   set(H,0,hip);set(W,.018+lean*.4,1.72+bob);set(S,lean,2.22+bob);
   set(N,lean+.015,2.38+bob);set(HEAD,lean+.018,2.63+bob);
   for(const leg of [0,1]){
    const foot=sampleFoot(state.cycle+leg*.5,state.stride),side=leg===0?1:-1;
    const fx=foot.x/s*walk+side*.13*(1-walk);
    const ground=(groundAt(state.z+person.direction*fx*s,compact)-state.ground)/s;
    const fy=ground+foot.lift*walk;
    // Two-bone leg: the planted foot stays on the road as the body passes it.
    const dx=fx,dy=fy-hip,d=Math.max(.001,Math.hypot(dx,dy));
    const along=d*.5,bend=Math.sqrt(Math.max(0,.75**2-along**2));
    const kneeX=dx*.5-dy/d*bend,kneeY=hip+dy*.5+dx/d*bend;
    set(leg?K1:K0,kneeX,kneeY,side*.055);set(leg?F1:F0,fx,fy,side*.055);
    set(leg?TOE1:TOE0,fx+.22,fy+.015,side*.055);
    const swing=Math.sin(state.cycle*Math.PI*2+leg*Math.PI)*walk;
    set(leg?E1:E0,lean+.09-swing*.23,1.85+bob,side*.075);
    set(leg?HAND1:HAND0,lean+.13-swing*.39,1.56+bob+Math.abs(swing)*.05,side*.075);
   }
   shadows[i].position.set(person.x+.07,groundAt(state.z,compact)+.006,state.z);
  }
  for(const [tone,list] of marks.entries()){
   const buffer=buffers[tone];
   for(let n=0;n<list.length;n++){
    const m=list[n],person=pedestrians[m.person],nodes=poses[m.person],state=states[m.person],a=nodes[m.a],b=nodes[m.b];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
    const horizontal=a[0]+dx*m.t-dy/length*m.normal+m.dx;
    const vertical=a[1]+dy*m.t+dx/length*m.normal+m.dy;
    buffer.setXYZ(n,person.x+(a[2]+(b[2]-a[2])*m.t+m.depth)*person.scale,state.ground+vertical*person.scale,state.z+person.direction*horizontal*person.scale);
   }
   buffer.needsUpdate=true;
  }
  // Existing world cleanup owns every buffer/material; no timer or extra renderer.
  return states.map((s,i)=>`${pedestrians[i].x},${s.z.toFixed(5)},${s.cycle.toFixed(5)}`).join(';');
 }
 return {update,count:pedestrians.length};
}
