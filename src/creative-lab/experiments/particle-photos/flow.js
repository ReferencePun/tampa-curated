// Pointer strokes disturb a height field. Its slope displaces individual grains;
// it never translates the photograph or drives the image as an elastic sheet.
export const FLOW_SIZE = 96;
export const FLOW_RANGE = .055;
export const FLOW_TAIL = 2.3;
export const flowGLSL = `
uniform sampler2D uFlow;
vec2 materialFlow(vec2 uv) {
 vec4 encoded=texture2D(uFlow,uv);
 return (vec2(dot(encoded.rg,vec2(65280.,255.)),dot(encoded.ba,vec2(65280.,255.)))-32768.)/32767.*.055;
}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = t => { t=clamp(t,0,1); return t*t*(3-2*t); };

export class PointerRipples {
  constructor(size=FLOW_SIZE) {
    this.size=size;
    this.aspect=1;
    this.age=FLOW_TAIL;
    this.moving=false;
    this.dirty=true;
    this.height=new Float32Array(size*size);
    this.velocity=new Float32Array(size*size);
    this.absorption=new Float32Array(size*size);
    this.data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
      // Absorbing boundary: no waves bouncing back to jiggle the entire frame.
      const edge=Math.min(x,y,size-1-x,size-1-y)/(size-1);
      this.absorption[y*size+x]=4.5+18*(1-smooth(edge/.12));
    }
    this.pack();
  }

  stroke(from,to,aspect,radius) {
    this.aspect=aspect;
    if(!from) return;
    const sx=Math.max(1,aspect), sy=Math.max(1,1/aspect);
    const dx=(to[0]-from[0])*sx, dy=(to[1]-from[1])*sy;
    const length=Math.hypot(dx,dy);
    if(length<.00001) return;
    const width=clamp(radius*.38,.03,.09);
    const pressure=.0022*Math.min(1.4,length/width);
    const n=this.size;
    for(let j=1;j<n-1;j++) for(let i=1;i<n-1;i++) {
      const px=(i/(n-1)-from[0])*sx, py=(j/(n-1)-from[1])*sy;
      const t=clamp((px*dx+py*dy)/(length*length),0,1);
      const distance2=(px-dx*t)**2+(py-dy*t)**2;
      if(distance2>width*width*9) continue;
      // Deposit along the full swept segment, not at a fixed center. Adjacent
      // strokes combine into a continuous wake, including curved gestures.
      const k=j*n+i, weight=Math.exp(-distance2/(width*width)*1.5);
      this.height[k]=clamp(this.height[k]+pressure*weight,-.018,.018);
    }
    this.age=0;
    this.moving=true;
    this.pack();
  }

  advance(dt) {
    if(!this.moving) return;
    const elapsed=clamp(dt,0,.1);
    this.age+=elapsed;
    if(this.age>=FLOW_TAIL) { this.clear(); return; }
    const n=this.size, steps=Math.max(1,Math.ceil(elapsed*180)), h=elapsed/steps;
    const xx=((n-1)/Math.max(1,this.aspect))**2;
    const yy=((n-1)/Math.max(1,1/this.aspect))**2;
    for(let step=0;step<steps;step++) {
      for(let j=1;j<n-1;j++) for(let i=1;i<n-1;i++) {
        const k=j*n+i, z=this.height[k];
        const lap=(this.height[k-1]+this.height[k+1]-2*z)*xx
          +(this.height[k-n]+this.height[k+n]-2*z)*yy;
        // Damped 2D wave equation, with bounded substeps for fast input/scrubbing.
        this.velocity[k]+=h*(.2025*lap-1.5*z-this.absorption[k]*this.velocity[k]);
      }
      for(let k=0;k<n*n;k++) this.height[k]+=this.velocity[k]*h;
    }
    this.pack();
  }

  pack() {
    const n=this.size;
    const fade=1-smooth((this.age-1.4)/(FLOW_TAIL-1.4));
    const sx=(n-1)/Math.max(1,this.aspect), sy=(n-1)/Math.max(1,1/this.aspect);
    for(let j=0;j<n;j++) for(let i=0;i<n;i++) {
      const k=j*n+i;
      // Opposite slopes produce opposite particle motion: compression and
      // expansion along each moving crest, rather than coherent translation.
      const dx=i>0&&i<n-1 ? (this.height[k-1]-this.height[k+1])*sx*.5 : 0;
      const dy=j>0&&j<n-1 ? (this.height[k-n]-this.height[k+n])*sy*.5 : 0;
      const x=Math.round(32768+Math.tanh(dx/FLOW_RANGE)*32767*fade);
      const y=Math.round(32768+Math.tanh(dy/FLOW_RANGE)*32767*fade);
      const p=k*4, a=x>>8, b=x&255, c=y>>8, d=y&255;
      if(this.data[p]!==a||this.data[p+1]!==b||this.data[p+2]!==c||this.data[p+3]!==d) this.dirty=true;
      this.data[p]=a; this.data[p+1]=b; this.data[p+2]=c; this.data[p+3]=d;
    }
  }

  sample(u,v) {
    const px=clamp(u*this.size-.5,0,this.size-1), py=clamp(v*this.size-.5,0,this.size-1);
    const x=Math.floor(px), y=Math.floor(py), tx=px-x, ty=py-y;
    const at=(i,j,c)=>{
      const k=(Math.min(this.size-1,j)*this.size+Math.min(this.size-1,i))*4+c;
      return (this.data[k]*256+this.data[k+1]-32768)/32767*FLOW_RANGE;
    };
    return [0,2].map(c=>(at(x,y,c)*(1-tx)+at(x+1,y,c)*tx)*(1-ty)
      +(at(x,y+1,c)*(1-tx)+at(x+1,y+1,c)*tx)*ty);
  }

  clear() {
    this.height.fill(0); this.velocity.fill(0);
    this.age=FLOW_TAIL; this.moving=false; this.pack();
  }
  dispose() { this.height=this.velocity=this.absorption=this.data=null; }
}
