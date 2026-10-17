import * as T from 'three';
export type P=[number,number,number];
export const paper=0xeee7d8,ink=0x38332c,rust=0x97513b;
export const TAU=Math.PI*2;
export const surfaces=new T.MeshBasicMaterial({color:0xe8dfcd,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
export const pale=new T.MeshBasicMaterial({color:paper,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
export const materials=[new T.LineBasicMaterial({color:ink,transparent:true,opacity:.85}),new T.LineBasicMaterial({color:0x847361,transparent:true,opacity:.25}),new T.LineBasicMaterial({color:rust,transparent:true,opacity:.72}),new T.LineBasicMaterial({color:0x436c86,transparent:true,opacity:.76}),new T.LineBasicMaterial({color:0x617652,transparent:true,opacity:.72}),new T.LineBasicMaterial({color:0xb88328,transparent:true,opacity:.85})];

/** Object-space pen deviations are baked once. Nothing is rerandomized per frame. */
export class Ink {
 buffers:number[][]=materials.map(()=>[]);seed=1;
 line(a:P,b:P,tone=0,rough=true){
  const length=Math.hypot(...a.map((v,i)=>v-b[i]));
  const n=rough?Math.max(2,Math.min(12,Math.ceil(length*2))):1;
  const seed=this.seed++;
  let previous=a;
  for(let i=1;i<=n;i++){
   const t=i/n,w=rough?Math.sin(t*Math.PI)*.018:0;
   const next=a.map((v,j)=>v+(b[j]-v)*t+w*Math.sin(seed*2.31+j*2+i*.8)) as P;
   this.buffers[tone].push(...previous,...next);previous=next;
  }
  if(rough&&tone===0&&seed%3===0)this.line(a.map((v,i)=>v+(i===1?.028:-.019)) as P,b.map((v,i)=>v+(i===1?.026:.016)) as P,1,false);
 }
 path(points:P[],tone=0,closed=false){for(let i=1;i<points.length;i++)this.line(points[i-1],points[i],tone);if(closed)this.line(points.at(-1)!,points[0],tone);}
 circle(x:number,y:number,z:number,r:number,tone=0,start=0,end=TAU){this.path(Array.from({length:73},(_,i)=>{const a=start+(end-start)*i/72;const wobble=.008*Math.sin(a*7+x);return [x+Math.cos(a)*(r+wobble),y+Math.sin(a)*(r+wobble),z] as P;}),tone);}
 rect(x:number,y:number,z:number,w:number,h:number,tone=0){this.path([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],tone,true);}
 box(x:number,y:number,z:number,w:number,h:number,d:number,tone=0){this.rect(x,y,z,w,h,tone);this.rect(x,y,z+d,w,h,tone);for(const [u,v] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])this.line([u,v,z],[u,v,z+d],tone);}
 build(parent:T.Object3D){this.buffers.forEach((vertices,i)=>{if(!vertices.length)return;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));parent.add(new T.LineSegments(geometry,materials[i]));});}
}
export function plane(parent:T.Object3D,w:number,h:number,position:P,rotation:P=[0,0,0],material=surfaces){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;}
