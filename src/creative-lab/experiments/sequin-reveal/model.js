// Pure, deterministic tile state. No renderer, DOM, or Tampa content dependencies.
export const DEFAULTS=Object.freeze({mode:'uncover',photo:'portrait',density:64,tileSize:1,spacing:.025,hinge:'horizontal',angle:180,speed:1,radius:15,delay:90,influence:1,material:'silver',light:315,persistence:'hold',resetDelay:3});
export const RANGES={density:[24,112],tileSize:[.65,1],spacing:[0,.24],angle:[45,180],speed:[.35,2.5],radius:[4,32],delay:[0,240],influence:[.35,1.8],light:[0,360],resetDelay:[.5,12]};
export const CHOICES={mode:['uncover','reverse'],photo:['portrait','palms','facade'],hinge:['horizontal','vertical','diagonal'],material:['silver','graphite','brass','paper','ink','iridescent','mirror'],persistence:['hold','close']};
export function options(value={}){const s={...DEFAULTS,...value};for(const key of Object.keys(s))if(!(key in DEFAULTS))throw new Error(`Unknown setting: ${key}`);for(const [key,[lo,hi]]of Object.entries(RANGES))if(!Number.isFinite(s[key])||s[key]<lo||s[key]>hi)throw new Error(`Invalid ${key}`);if(!Number.isInteger(s.density))throw new Error('Grid density must be an integer');for(const [key,list]of Object.entries(CHOICES))if(!list.includes(s[key]))throw new Error(`Invalid ${key}`);return s;}
export const PRESETS={
 silver:{name:'01 / Brushed silver',settings:{...DEFAULTS}},
 paper:{name:'02 / Folded paper',settings:{...DEFAULTS,mode:'reverse',material:'paper',density:42,spacing:.07,speed:.65,photo:'palms'}},
 ink:{name:'03 / Ink squares',settings:{...DEFAULTS,mode:'reverse',material:'ink',density:52,hinge:'vertical',spacing:.08,photo:'facade'}},
 mosaic:{name:'04 / Quiet iridescence',settings:{...DEFAULTS,mode:'reverse',material:'iridescent',hinge:'diagonal',density:72,radius:19,delay:130}},
 fragments:{name:'05 / Mirror fragments',settings:{...DEFAULTS,material:'mirror',density:112,spacing:.07,radius:12,speed:1.3,photo:'palms'}},
 brass:{name:'06 / Old brass',settings:{...DEFAULTS,material:'brass',density:56,persistence:'close',resetDelay:2.5,photo:'facade'}}
};
export const clamp=(x,lo=0,hi=1)=>Math.max(lo,Math.min(hi,x));
export const random=i=>{const x=Math.sin(i*127.1+19.7)*43758.5453;return x-Math.floor(x);};
export function makeGrid(aspect,density=64){
 if(!Number.isFinite(aspect)||aspect<.05||aspect>20)throw new Error('Image aspect ratio must be between 1:20 and 20:1');
 const columns=aspect>=1?density:Math.max(2,Math.round(density*aspect)),rows=aspect>=1?Math.max(2,Math.round(density/aspect)):density,pitch=10/density;
 return {columns,rows,count:columns*rows,pitch,width:columns*pitch,height:rows*pitch,aspect:columns/rows};
}
export const hingeAxis=hinge=>hinge==='vertical'?[0,1]:hinge==='diagonal'?[Math.SQRT1_2,Math.SQRT1_2]:[1,0];
export function tileCenter(grid,i){return [(i%grid.columns+.5-grid.columns/2)*grid.pitch,(grid.rows/2-Math.floor(i/grid.columns)-.5)*grid.pitch];}
// A centrally pinned 180° flip reflects the local face across its hinge axis.
// Sampling at that final location corrects the mirrored reverse-side image.
export function reverseUV(grid,i,local,hinge){const a=hingeAxis(hinge),c=tileCenter(grid,i),dot=local[0]*a[0]+local[1]*a[1];return [(c[0]+2*dot*a[0]-local[0])/grid.width+.5,(c[1]+2*dot*a[1]-local[1])/grid.height+.5];}
export const fullAngle=s=>s.mode==='uncover'?Math.PI/2:Math.PI;
export const brushAngle=s=>Math.min(s.angle*Math.PI/180,fullAngle(s));
export function spring(x,v,target,dt,speed){const w=11*speed,d=x-target,b=v+w*d,e=Math.exp(-w*dt);return [target+(d+b*dt)*e,(v-w*b*dt)*e];}
export class TileState{
 constructor(grid,settings){this.grid=grid;this.settings=options(settings);this.time=0;this.angles=new Float32Array(grid.count);this.velocity=new Float32Array(grid.count);this.targets=new Float32Array(grid.count);this.pending=new Float32Array(grid.count);this.due=new Float64Array(grid.count).fill(Infinity);this.closeAt=new Float64Array(grid.count).fill(Infinity);this.touched=new Uint8Array(grid.count);this.complete=false;this.revision=0;}
 configure(settings){this.settings=options(settings);}
 schedule(i,target,delay=0,hold=false){this.pending[i]=target;this.due[i]=this.time+delay;this.closeAt[i]=hold||this.settings.persistence==='hold'||target===0?Infinity:this.time+delay+this.settings.resetDelay;}
 brush(from,to,velocity=0,immediate=false){
  const g=this.grid,s=this.settings,p=(xy)=>[(xy[0]-.5)*g.width,(.5-xy[1])*g.height],a=p(from),b=p(to),dx=b[0]-a[0],dy=b[1]-a[1],d2=dx*dx+dy*dy;
  const radius=Math.min(g.width,g.height)*s.radius/100*(1+clamp(velocity,0,3)*.2),reach=radius/g.pitch,cell=xy=>[xy[0]*g.columns,xy[1]*g.rows],ac=cell(from),bc=cell(to);
  const x0=clamp(Math.floor(Math.min(ac[0],bc[0])-reach),0,g.columns-1),x1=clamp(Math.ceil(Math.max(ac[0],bc[0])+reach),0,g.columns-1),y0=clamp(Math.floor(Math.min(ac[1],bc[1])-reach),0,g.rows-1),y1=clamp(Math.ceil(Math.max(ac[1],bc[1])+reach),0,g.rows-1);let hits=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*g.columns+x,[cx,cy]=tileCenter(g,i),t=d2?clamp(((cx-a[0])*dx+(cy-a[1])*dy)/d2):0,distance=Math.hypot(cx-a[0]-t*dx,cy-a[1]-t*dy);if(distance>radius)continue;
   const f=clamp((1-distance/radius)*2.8*s.influence),smooth=f*f*(3-2*f),angle=brushAngle(s)*smooth;if(angle<.008)continue;
   const target=Math.max(angle,this.targets[i],this.pending[i]);this.touched[i]=1;hits++;this.schedule(i,target,s.delay/1000*(distance/radius)**1.3+(1-t)*Math.min(.06,s.delay/2000));
  }
  if(immediate)this.snap();this.revision++;return hits;
 }
 wave(open,immediate=false){const g=this.grid;for(let i=0;i<g.count;i++){const [x,y]=tileCenter(g,i),phase=open?(x/g.width+.5)*.42+(y/g.height+.5)*.1:Math.hypot(x/g.width+.55,y/g.height-.4)*.55;this.schedule(i,open?fullAngle(this.settings):0,phase/this.settings.speed,true);this.touched[i]=open?1:0;}this.complete=false;if(immediate)this.snap();this.revision++;}
 snap(){for(let i=0;i<this.grid.count;i++){if(this.due[i]!==Infinity){this.targets[i]=this.pending[i];this.due[i]=Infinity;}this.angles[i]=this.targets[i];this.velocity[i]=0;}this.revision++;}
 advance(dt){this.time+=clamp(dt,0,.1);let active=false,changed=false;for(let i=0;i<this.grid.count;i++){
  if(this.due[i]<=this.time){this.targets[i]=this.pending[i];this.due[i]=Infinity;}
  if(this.closeAt[i]<=this.time){this.targets[i]=this.pending[i]=0;this.closeAt[i]=Infinity;}
  const delta=this.targets[i]-this.angles[i];if(Math.abs(delta)>.00008||Math.abs(this.velocity[i])>.0004){const [x,v]=spring(this.angles[i],this.velocity[i],this.targets[i],clamp(dt,0,.1),this.settings.speed);this.angles[i]=x;this.velocity[i]=v;active=changed=true;}else if(delta!==0||this.velocity[i]!==0){this.angles[i]=this.targets[i];this.velocity[i]=0;changed=true;}
  if(this.due[i]!==Infinity||this.closeAt[i]!==Infinity)active=true;
 }if(changed)this.revision++;return active;}
 statistics(){let open=0,moved=0;const terminal=fullAngle(this.settings);for(const x of this.angles){if(x>terminal*.96)open++;if(x>.03)moved++;}return {open,moved,count:this.grid.count,completion:open/this.grid.count};}
}
