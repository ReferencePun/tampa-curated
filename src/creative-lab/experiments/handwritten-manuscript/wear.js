import * as THREE from 'three';
import {noise,PAPER_RGB} from './hand.js';
export const wearSeed=(origin,width,height)=>Math.round(origin.x*23+origin.y*13+origin.z*7+width*11+height*17);
export function wearPlan(width,height,seed){
 const count=height<.6?1:3;
 return Array.from({length:count},(_,i)=>({
  x:width*(.16+noise(seed+i*19)*.68),y:height*(.13+noise(seed+i*37+1)*.72),
  rx:width*(.14+noise(seed+i*7+3)*.16),ry:Math.max(.1,Math.min(1.2,height*(.045+noise(seed+i*11+8)*.085))),
  angle:(noise(seed+i*13+4)-.5)*.5,strength:.68+noise(seed+i*29+6)*.28,variant:i%2
 }));
}
export function erasedAt(x,y,marks){
 let amount=0;for(const m of marks){const dx=x-m.x,dy=y-m.y,c=Math.cos(m.angle),s=Math.sin(m.angle),u=(dx*c+dy*s)/m.rx,v=(-dx*s+dy*c)/m.ry;const edge=Math.exp(-(u*u*u*u+v*v)*1.6);amount=Math.max(amount,edge*m.strength);}return amount;
}
const hash=(x,y)=>noise(x*37+y*101);
function field(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}
function rubbingTexture(erase){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,256);
 for(let y=0;y<256;y++)for(let x=0;x<512;x++){
  const u=(x-256)/218,v=(y-128)/83,n=field(x*.035,y*.065),grit=hash(x,y),edge=Math.exp(-(u*u*u*u+v*v)*1.9),ragged=edge*(.22+n*.78),drag=field(x*.012,y*.22),sweep=Math.exp(-(u*u*u*u+v*v)*3.1),fringe=Math.max(0,edge-sweep),i=(y*512+x)*4;
  // Graphite remains around the edge; the eraser pulls short paper-colored streaks through it.
  let alpha=erase?fringe*(.7+drag*.5)+ragged*.1:ragged*(.22+drag*.6);
  const lifted=erase&&Math.abs(v)<.68&&drag>.46;
  const rgb=lifted?PAPER_RGB:[52,50,46];
  if(lifted)alpha=sweep*(.18+drag*.35);
  alpha*=.35+grit*.65;if(grit>.94)alpha*=.18;
  pixels.data.set([...rgb,Math.round(Math.min(.65,alpha)*255)],i);
 }
 ctx.putImageData(pixels,0,0);ctx.lineCap='butt';
 // Fibrous eraser scrapes are directional and broken, never a soft circular blur.
 for(let j=0;j<110;j++){const x=35+noise(j*17)*380,y=65+noise(j*29)*130,len=7+noise(j*11)*84;ctx.strokeStyle=j%4===0?'rgba(35,34,31,.14)':'rgba(231,217,183,.23)';ctx.lineWidth=.35+noise(j)*1.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y+(noise(j+5)-.5)*12);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function makeWearResources(resources){const textures=[rubbingTexture(false),rubbingTexture(true)];for(const texture of textures)resources.add(texture);return textures;}
export class PageWear{
 constructor(textures){this.textures=textures;this.records=[[],[]];this.count=0;}
 surface(origin,rotation,width,height){
  for(const m of wearPlan(width,height,wearSeed(origin,width,height))){const transform=new THREE.Object3D();transform.position.copy(new THREE.Vector3(m.x,m.y,.022).applyQuaternion(rotation).add(origin));transform.quaternion.copy(rotation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),m.angle));transform.scale.set(m.rx*2.65,m.ry*3.15,1);transform.updateMatrix();this.records[m.variant].push(transform.matrix.clone());this.count++;}
 }
 build(root,resources){for(let variant=0;variant<2;variant++){const records=this.records[variant];if(!records.length)continue;const geometry=new THREE.PlaneGeometry(1,1),material=new THREE.MeshBasicMaterial({map:this.textures[variant],transparent:true,opacity:variant?.95:.62,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),mesh=new THREE.InstancedMesh(geometry,material,records.length);records.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();mesh.name=variant?'Kneaded eraser residue':'Graphite rubbed into the page';root.add(mesh);resources.add(mesh);resources.add(geometry);resources.add(material);}return this.count;}
}
export function paperTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=768;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(768,768);
 for(let y=0;y<768;y++)for(let x=0;x<768;x++){const variation=(noise(x+y*768)-.5)*7+field(x*.009,y*.009)*3,i=(y*768+x)*4;pixels.data.set([...PAPER_RGB.map(channel=>channel+variation),255],i);}
 ctx.putImageData(pixels,0,0);for(let i=0;i<700;i++){const x=noise(i*9)*768,y=noise(i*17)*768;ctx.strokeStyle=i%3?'rgba(90,86,77,.06)':'rgba(244,230,195,.18)';ctx.lineWidth=.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+noise(i+1)*8,y+(noise(i+4)-.5)*3);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
