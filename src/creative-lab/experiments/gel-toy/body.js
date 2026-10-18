import {clamp} from '../../shared/tactile/field.js';

/** Local, slowly recovering impressions; separate from the foam ball's elastic spring. */
export class GelBody {
 constructor(){this.reset();}
 reset(){this.time=0;this.amount=0;this.activity=0;this.pointer=null;this.impressions=[];this.current=null;this.config=null;this.releaseAge=0;}
 point(x,y,down,c){
  this.config=c;
  if(!down){if(this.pointer)this.release();return;}
  const p=[(x-.5)*3.4,(.5-y)*3];
  if(!this.pointer){
   if(Math.hypot(...p)>1.05)return;
   // A fresh grip cannot relocate older dents. The bounded history keeps GPU/CPU work steady.
   if(this.impressions.length===6)this.impressions.shift();
   this.current={anchor:p,drag:[0,0],targetDrag:[0,0],pressure:0,target:0,radius:.23+c.radius*.65,age:0};
   this.impressions.push(this.current);
  }
  this.pointer={x,y};this.releaseAge=0;
  this.current.target=clamp((c.mode==='stretch'?.26:.74)*c.strength,0,1);
  this.current.targetDrag=[clamp((p[0]-this.current.anchor[0])*c.strength,-.48,.48),clamp((p[1]-this.current.anchor[1])*c.strength,-.48,.48)];
 }
 release(){if(!this.pointer)return;this.pointer=null;this.current=null;this.releaseAge=0;}
 advance(dt,c){
  this.config=c;dt=clamp(dt,0,.05);this.time+=dt*c.speed;
  const step=dt*Math.max(.2,c.speed)/.65,hold=c.memory*.35,decay=Math.exp(-step/(c.memory*.7));
  this.releaseAge+=step;
  const target=this.pointer ? .18*c.strength : c.autoplay ? (.5+.5*Math.sin(this.time*1.6))*.27 : 0;
  const response=this.pointer||c.autoplay?1-Math.exp(-step*10/c.softness):this.releaseAge<hold?0:1-decay;
  this.amount+= (target-this.amount)*response;
  for(const mark of this.impressions){
   if(mark===this.current){const rate=1-Math.exp(-step*12/c.softness);mark.pressure+=(mark.target-mark.pressure)*rate;for(let i=0;i<2;i++)mark.drag[i]+=(mark.targetDrag[i]-mark.drag[i])*rate;}
   else{mark.age+=step;if(mark.age>hold){mark.pressure*=decay;mark.drag[0]*=decay;mark.drag[1]*=decay;}}
  }
  this.impressions=this.impressions.filter(mark=>mark===this.current||mark.pressure+Math.hypot(...mark.drag)>.0001);
  this.measure();
 }
 settle(){
  // Paused/reduced-motion releases retain the last imprint instead of snapping to a sphere.
  if(this.current){this.amount=.18*(this.config?.strength||1);this.current.pressure=this.current.target;this.current.drag=[...this.current.targetDrag];}
  this.measure();
 }
 measure(){this.activity=this.amount+this.impressions.reduce((sum,mark)=>sum+mark.pressure+Math.hypot(...mark.drag),0);}
 deform(x,y,z){
  const sx=1+this.amount*.3,sy=1-this.amount*.32,sz=1/(sx*sy),front=clamp((z+.05)/.5,0,1);
  let dx=0,dy=0,dent=0,bulge=0;
  for(const mark of this.impressions){
   const r2=(x-mark.anchor[0])**2+(y-mark.anchor[1])**2,local=Math.exp(-r2/(mark.radius*mark.radius)),grip=Math.exp(-r2/.52)*front;
   dx+=mark.drag[0]*grip;dy+=mark.drag[1]*grip;
   dent+=mark.pressure*local;
   bulge+=mark.pressure*(r2/(mark.radius*mark.radius))*local;
  }
  // Smooth saturation bounds repeated overlapping presses without sharp clamps in the skin.
  return [x*sx+.55*Math.tanh(dx/.55),y*sy+.55*Math.tanh(dy/.55),z*sz-front*(.36*Math.tanh(dent)-.055*Math.tanh(bulge))];
 }
 snapshot(){return {time:this.time,activity:this.activity,contact:!!this.pointer,amount:this.amount,impressions:this.impressions.length,retained:this.impressions.reduce((sum,m)=>sum+m.pressure,0)};}
 dispose(){this.pointer=null;this.current=null;this.impressions=[];}
}
