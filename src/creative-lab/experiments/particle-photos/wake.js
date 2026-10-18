import {PointerRipples} from './flow.js';
// A continuous photographic reveal, independent of particle displacement.
export const resolvedField=field=>Math.max(0,Math.min(1,field));
export class RevealWake {
 constructor(size=128){
  this.size=size;this.values=new Float32Array(size*size);this.head=new Float32Array(size*size);
  this.visible=new Float32Array(size*size);this.data=new Uint8Array(size*size);
  this.motion=new PointerRipples();this.dirty=true;this.moving=false;
 }
 point(x,y,previous,aspect,radius,immediate=false,softness=.72){
  this.head.fill(0);
  const sx=Math.max(1,aspect),sy=Math.max(1,1/aspect),r=radius/100;
  const ax=previous?previous[0]:x,ay=previous?previous[1]:y;
  const vx=(x-ax)*sx,vy=(y-ay)*sy,length2=vx*vx+vy*vy;
  if(immediate)this.motion.clear();else this.motion.stroke(previous,[x,y],aspect,r);
  const inner=r*.56,outer=r*(.92+Math.max(.15,Math.min(.95,softness))*.5);
  for(let j=0;j<this.size;j++)for(let i=0;i<this.size;i++){
   const n=j*this.size+i,u=(i+.5)/this.size,v=(j+.5)/this.size;
   const boundary=1+.035*Math.sin(u*39+Math.sin(v*21))+.02*Math.sin(v*49+u*13);
   const weight=distance=>{const t=Math.max(0,Math.min(1,(outer*boundary-distance)/(outer*boundary-inner)));return t*t*(3-2*t);};
   this.head[n]=weight(Math.hypot((u-x)*sx,(v-y)*sy));
   const px=(u-ax)*sx,py=(v-ay)*sy,t=length2?Math.max(0,Math.min(1,(px*vx+py*vy)/length2)):1;
   const swept=weight(Math.hypot(px-vx*t,py-vy*t));
   this.values[n]=immediate?this.head[n]:Math.max(this.values[n],swept);
   if(immediate)this.visible[n]=this.values[n];
  }
  this.pack();
 }
 leave(immediate=false){
  this.head.fill(0);
  if(immediate){this.values.fill(0);this.visible.fill(0);this.motion.clear();}
  this.pack();
 }
 advance(dt,duration){
  const step=Math.min(.1,Math.max(0,dt)),loss=step/Math.max(.05,duration);
  this.motion.advance(step);
  for(let n=0;n<this.values.length;n++){
   this.values[n]=Math.max(this.head[n],this.values[n]-loss);
   const delta=this.values[n]-this.visible[n];
   this.visible[n]+=delta*(1-Math.exp(-step/(delta>0?.035:.1)));
   if(Math.abs(this.values[n]-this.visible[n])<.001)this.visible[n]=this.values[n];
  }
  this.pack();return this.moving;
 }
 pack(){
  this.moving=this.motion.moving;
  for(let n=0;n<this.data.length;n++){
   const value=Math.round(this.visible[n]*255);
   if(value!==this.data[n])this.dirty=true;
   this.data[n]=value;
   if(this.values[n]>this.head[n]+.00001||Math.abs(this.visible[n]-this.values[n])>.00001)this.moving=true;
  }
 }
 flow(u,v){return this.motion.sample(u,v);}
 sample(u,v){
  const x=Math.max(0,Math.min(this.size-1,u*this.size-.5)),y=Math.max(0,Math.min(this.size-1,v*this.size-.5));
  const i=Math.floor(x),j=Math.floor(y),tx=x-i,ty=y-j;
  const at=(xx,yy)=>this.data[Math.min(this.size-1,yy)*this.size+Math.min(this.size-1,xx)]/255;
  return (at(i,j)*(1-tx)+at(i+1,j)*tx)*(1-ty)+(at(i,j+1)*(1-tx)+at(i+1,j+1)*tx)*ty;
 }
 clear(){this.values.fill(0);this.head.fill(0);this.visible.fill(0);this.motion.clear();this.pack();}
 dispose(){this.values=this.head=this.visible=this.data=null;this.motion.dispose();}
}
