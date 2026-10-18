/** Seeded anatomy + damped local responses. No DOM or Three.js dependency. */
export const DEFAULTS=Object.freeze({mode:'brush',density:560,length:1,thickness:1.05,current:.45,speed:.6,softness:1.15,radius:.24,strength:1.3,palette:'seagrass',light:1.2,translucency:.85,focus:.2,zoom:.8,angle:0,elevation:.8,quality:'high'});
export const RANGES=[['density','Tentacle density',120,560,20],['length','Tentacle length',.65,1.4,.05],['thickness','Fleshy thickness',.65,1.5,.05],['current','Underwater current',0,1.5,.05],['speed','Motion speed',.2,1.5,.05],['softness','Flexibility',.4,1.8,.05],['radius','Brush radius',.08,.4,.01],['strength','Touch response',0,2,.05],['light','Light through the tips',.4,1.6,.05],['translucency','Translucent tissue',0,1,.05],['focus','Soft background focus',0,1,.05],['zoom','View magnification',.65,1.35,.05],['angle','View angle',-.4,.4,.05],['elevation','View from above',0,1,.05]];
export const PALETTES={seagrass:{name:'Sea glass / olive',body:'#747743',tip:'#9ee3ce',shadow:'#1c3026',water:'#0a2729',light:'#b1f5df'},lagoon:{name:'Blue lagoon',body:'#4c7e79',tip:'#8ccfce',shadow:'#162d36',water:'#0b202e',light:'#a0dcf0'},honey:{name:'Warm shallows',body:'#8e8060',tip:'#d5c997',shadow:'#34362b',water:'#192f2d',light:'#e2e6be'}};
export const PRESETS={reference:{name:'01 · Sea-glass meadow',settings:{...DEFAULTS}},lagoon:{name:'02 · A blue current',settings:{...DEFAULTS,palette:'lagoon',mode:'follow',current:.9,light:1.2}},close:{name:'03 · Among the tentacles',settings:{...DEFAULTS,zoom:1.2,density:380,thickness:1.1,focus:.55,speed:.4,elevation:.2}},shallows:{name:'04 · Warm shallows',settings:{...DEFAULTS,palette:'honey',current:.4,focus:.35,light:1.2}}};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function options(input={}){const c={...DEFAULTS};for(const [key,,min,max]of RANGES)c[key]=clamp(Number.isFinite(input[key])?input[key]:c[key],min,max);c.density=Math.round(c.density);if(['brush','follow','ripple'].includes(input.mode))c.mode=input.mode;if(PALETTES[input.palette])c.palette=input.palette;if(['high','low'].includes(input.quality))c.quality=input.quality;return c;}
export class ReefField{
 constructor(settings={}){this.config=options(settings);this.aspect=1.6;this.screenBasis=[1,0,0,1];this.reset();}
 reset(){this.time=0;this.accumulator=0;this.pulses=[];this.lastPulse=-1;this.pointer={x:.5,y:.5,active:false,pressed:false,dx:0,dy:0};this.stems=Array.from({length:this.config.density},(_,i)=>{
  // Jittered, overlapping colonies, seen at close range. No neat rows of grass.
  const colony=i%12,colX=colony%4,colZ=Math.floor(colony/4),angle=hash(i+9)*Math.PI*2,r=Math.sqrt(hash(i+27))*2.2;
  return {x:(colX-1.5)*4+Math.cos(angle)*r,z:(colZ-1)*3.9+Math.sin(angle)*r,y:-.25-hash(i+81)*.45,length:2.5+hash(i+53)*2.1,radius:.13+hash(i+71)*.105,leanX:Math.cos(angle)*(.6+hash(i+13)*1.0)-.8,leanZ:Math.sin(angle)*(.35+hash(i+31)*.85),phase:hash(i+47)*Math.PI*2,tone:hash(i+101),dx:0,dz:0,vx:0,vz:0,curl:0,vc:0,wakeX:0,wakeY:0,sx:hash(i),sy:hash(i+4)};
 });}
 update(settings){const next=options(settings),rebuild=next.density!==this.config.density;this.config=next;if(rebuild)this.reset();return rebuild;}
 project(projector){for(const s of this.stems){const p=projector(s.x+s.leanX,s.y+s.length*this.config.length,s.z+s.leanZ);s.sx=p[0];s.sy=p[1];}}
 point(x,y,pressed=false){
  const old=this.pointer;x=clamp(x,-.2,1.2);y=clamp(y,-.2,1.2);
  const rawX=old.active?x-old.x:0,rawY=old.active?y-old.y:0,dx=clamp(rawX,-.14,.14),dy=clamp(rawY,-.14,.14);
  this.pointer={x,y,active:true,pressed,dx,dy};
  // Deposit a directional wake along the complete swept segment, including fast strokes.
  const vx=rawX*this.aspect,vy=rawY,distance=Math.hypot(vx,vy),c=this.config;
  if(old.active&&distance>.0002){
   const radius=c.radius*.75,energy=Math.min(1,distance*16)*(pressed?1.25:1),ux=vx/distance,uy=vy/distance;
   for(const s of this.stems){const ax=(s.sx-old.x)*this.aspect,ay=s.sy-old.y,t=clamp((ax*vx+ay*vy)/(distance*distance),0,1),d=Math.hypot(ax-vx*t,ay-vy*t),weight=Math.exp(-d*d/(radius*radius));
    const blend=clamp(weight*energy,0,.9),power=2.4*c.strength*c.softness;
    s.wakeX+=(ux*power-s.wakeX)*blend;s.wakeY+=(uy*power-s.wakeY)*blend;
   }
  }
  if(pressed&&!old.pressed||distance>.012&&this.time-this.lastPulse>.1){this.pulses.push({x,y,age:0,power:pressed?1:.55});this.pulses=this.pulses.slice(-16);this.lastPulse=this.time;}
 }
 release(){this.pointer.active=false;this.pointer.pressed=false;this.pointer.dx=this.pointer.dy=0;}
 target(s){const c=this.config,p=this.pointer;let dx=s.wakeX,dz=s.wakeY,curl=0;
  if(p.active){const x=(s.sx-p.x)*this.aspect,y=s.sy-p.y,d=Math.hypot(x,y),falloff=Math.exp(-d*d/(c.radius*c.radius*.65)),direction=c.mode==='follow'?-1:1;
   if(c.mode!=='ripple'){dx+=direction*x/(d+.04)*falloff*c.strength*.75*c.softness;dz+=direction*y/(d+.04)*falloff*c.strength*.75*c.softness;curl=falloff*(p.pressed?.32:.09)*c.strength;}
   dx+=p.dx*falloff*10*c.strength;dz+=p.dy*falloff*9*c.strength;
  }
  for(const pulse of this.pulses){const x=(s.sx-pulse.x)*this.aspect,y=s.sy-pulse.y,d=Math.hypot(x,y),wave=Math.exp(-Math.pow((d-pulse.age*.24)/.1,2))*Math.exp(-pulse.age*1.5)*pulse.power*c.strength;dx+=x/(d+.03)*wave*.6;dz+=y/(d+.03)*wave*.6;curl+=wave*.07;}
  const [rx,rz,downX,downZ]=this.screenBasis;return [clamp(dx*rx+dz*downX,-3.2,3.2),clamp(dx*rz+dz*downZ,-3.2,3.2),clamp(curl,0,.5)];
 }
 settleInput(){for(const s of this.stems){[s.dx,s.dz,s.curl]=this.target(s);s.vx=s.vz=s.vc=0;}}
 advance(seconds){this.accumulator+=clamp(seconds,0,.1);const dt=1/120;while(this.accumulator>=dt){this.accumulator-=dt;this.time+=dt*this.config.speed;for(const p of this.pulses)p.age+=dt;this.pulses=this.pulses.filter(p=>p.age<2.8);for(const s of this.stems){s.wakeX*=Math.exp(-dt*.55);s.wakeY*=Math.exp(-dt*.55);const target=this.target(s),k=26/this.config.softness;for(const [key,vel,value]of [['dx','vx',target[0]],['dz','vz',target[1]],['curl','vc',target[2]]]){s[vel]+=(value-s[key])*k*dt;s[vel]*=Math.exp(-7*dt);s[key]+=s[vel]*dt;}}this.pointer.dx*=.96;this.pointer.dy*=.96;}}
 snapshot(){return {time:this.time,count:this.stems.length,contact:this.pointer.active,wake:this.stems.filter(s=>Math.hypot(s.wakeX,s.wakeY)>.08).length,pulses:this.pulses.length,moved:this.stems.filter(s=>Math.hypot(s.dx,s.dz)>.015).length};}
 dispose(){this.stems.length=0;this.pulses.length=0;}
}
