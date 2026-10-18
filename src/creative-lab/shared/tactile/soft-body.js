import {clamp} from './field.js';
/** Bounded viscoelastic deformation. Geometry can be sampled at arbitrary material coordinates. */
export class SoftBody {
 constructor(){this.reset();}
 reset(){this.time=0;this.amount=0;this.velocity=0;this.target=0;this.drag=[0,0];this.dragVelocity=[0,0];this.dragTarget=[0,0];this.anchor=[0,0];this.pointer=null;this.activity=0;}
 point(x,y,down,c){if(!down){this.pointer=null;return;}const p=[(x-.5)*3.4,(.5-y)*3.0];if(!this.pointer){this.anchor=p;this.dragTarget=[0,0];}this.pointer={x,y};this.target=c.mode==='stretch'?.2:.62*c.strength;this.dragTarget=[clamp((p[0]-this.anchor[0])*c.strength,-.65,.65),clamp((p[1]-this.anchor[1])*c.strength,-.65,.65)];}
 release(){this.pointer=null;this.target=0;this.dragTarget=[0,0];}
 advance(dt,c){dt=clamp(dt,0,.05);this.time+=dt*c.speed;const target=c.autoplay&&!this.pointer?(.5+.5*Math.sin(this.time*1.6))*.52:this.target,k=38/(c.softness||1),damping=Math.exp(-dt*10/(c.memory||1));this.velocity+=(target-this.amount)*k*dt;this.velocity*=damping;this.amount=clamp(this.amount+this.velocity*dt,0,.9);for(let i=0;i<2;i++){this.dragVelocity[i]+=(this.dragTarget[i]-this.drag[i])*k*dt;this.dragVelocity[i]*=damping;this.drag[i]+=this.dragVelocity[i]*dt;}this.activity=Math.abs(this.amount)+Math.hypot(...this.drag);}
 settle(){this.amount=this.target;this.drag=[...this.dragTarget];this.activity=this.amount+Math.hypot(...this.drag);}
 deform(x,y,z,c){const a=this.amount,sx=1+a*.36,sy=1-a*.47,sz=1/(sx*sy),front=Math.max(0,z+.2),w=Math.exp(-((x-this.anchor[0])**2+(y-this.anchor[1])**2)/(.7+(c.radius||.25)))*front;return [x*sx+this.drag[0]*w,y*sy+this.drag[1]*w,z*sz-a*.23*w];}
 snapshot(){return {time:this.time,activity:this.activity,contact:!!this.pointer,amount:this.amount,drag:[...this.drag]};}
 dispose(){this.pointer=null;}
}
