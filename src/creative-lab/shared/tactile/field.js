/** A brush deposits directional memory along the entire stroke; local springs recover it. */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export class BrushField {
 constructor(size=64){this.size=size;this.time=0;this.x=new Float32Array(size*size);this.y=new Float32Array(size*size);this.z=new Float32Array(size*size);this.tx=new Float32Array(size*size);this.ty=new Float32Array(size*size);this.tz=new Float32Array(size*size);this.data=new Uint8Array(size*size*4);this.pointer=null;this.activity=0;this.pack();}
 point(x,y,down,c){const old=this.pointer||{x,y};this.pointer={x,y,down};const dx=x-old.x,dy=y-old.y,d2=dx*dx+dy*dy,r=c.radius||.16;for(let j=0;j<this.size;j++)for(let i=0;i<this.size;i++){const u=(i+.5)/this.size,v=(j+.5)/this.size,t=d2?clamp(((u-old.x)*dx+(v-old.y)*dy)/d2,0,1):1,ox=u-old.x-dx*t,oy=v-old.y-dy*t,w=Math.exp(-(ox*ox+oy*oy)/(r*r*.38));if(w<.005)continue;const k=j*this.size+i,power=(c.strength||1)*(down?1.4:1);this.tx[k]=clamp(this.tx[k]+dx*19*w*power+(c.mode==='swirl'?-oy:ox)*w*.7,-1.5,1.5);this.ty[k]=clamp(this.ty[k]+dy*19*w*power+(c.mode==='swirl'?ox:oy)*w*.7,-1.5,1.5);this.tz[k]=Math.max(this.tz[k],w*(down?1:.3));}this.activity=1;}
 release(){this.pointer=null;}
 advance(dt,c){dt=clamp(dt,0,.05);this.time+=dt*c.speed;let activity=0;const ease=1-Math.exp(-dt*14/(c.softness||1)),decay=Math.exp(-dt/(c.memory||2));for(let i=0;i<this.x.length;i++){this.tx[i]*=decay;this.ty[i]*=decay;this.tz[i]*=decay;this.x[i]+=(this.tx[i]-this.x[i])*ease;this.y[i]+=(this.ty[i]-this.y[i])*ease;this.z[i]+=(this.tz[i]-this.z[i])*ease;activity=Math.max(activity,Math.abs(this.x[i])+Math.abs(this.y[i])+this.z[i]);}this.activity=activity;this.pack();}
 settle(){this.x.set(this.tx);this.y.set(this.ty);this.z.set(this.tz);this.pack();}
 pack(){for(let i=0;i<this.x.length;i++){this.data[i*4]=Math.round(clamp(this.x[i]/3+.5,0,1)*255);this.data[i*4+1]=Math.round(clamp(this.y[i]/3+.5,0,1)*255);this.data[i*4+2]=Math.round(clamp(this.z[i],0,1)*255);this.data[i*4+3]=255;}}
 reset(){for(const a of [this.x,this.y,this.z,this.tx,this.ty,this.tz])a.fill(0);this.pointer=null;this.time=0;this.activity=0;this.pack();}
 snapshot(){return {time:this.time,activity:this.activity,contact:!!this.pointer};}
 dispose(){for(const key of ['x','y','z','tx','ty','tz','data'])this[key]=null;}
}
