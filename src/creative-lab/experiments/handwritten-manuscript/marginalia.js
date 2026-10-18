import * as THREE from 'three';
import {INKS,noise} from './hand.js';
// Shared line batches keep corrections attached to their architectural surfaces.
export class Marginalia {
 constructor(){this.lines=[[],[],[]];this.count=0;}
 path(points,pen=0){for(let i=1;i<points.length;i++)this.lines[pen].push(...points[i-1].toArray(),...points[i].toArray());this.count+=Math.max(0,points.length-1);}
 stroke(points,pen=0,roughness=.012,seed=0){for(let pass=0;pass<2;pass++)this.path(points.map((p,i)=>p.clone().add(new THREE.Vector3((noise(seed+i*3+pass)-.5)*roughness,(noise(seed+i*5+pass)-.5)*roughness,(noise(seed+i+pass)-.5)*roughness))),pen);}
 paragraph(s,rotation,origin,index,types,config){
  const width=s.width,height=s.height;if(!width||!height)return;
  const at=(x,y,z=.035)=>new THREE.Vector3(x,y,z).applyQuaternion(rotation).add(origin),pen=config.font==='graphite'?0:index%3===0?2:1;
  // Uneven underlinings and a few emphatic cross-outs, with paper between strokes.
  for(let row=0;row<Math.min(6,Math.floor(height));row++){
   const y=(.15+noise(index*71+row)*.68)*height,x=noise(index*13+row)*width*.46,len=width*(.22+noise(index+row)*.25),points=[];
   for(let i=0;i<=20;i++)points.push(at(x+len*i/20,y+Math.sin(i*1.2+row)*.018+(noise(i+index)-.5)*.04));
   this.stroke(points,pen,.025,index+row*7);
   if(row===2)for(let j=0;j<6;j++)this.path([at(x+len*j/6,y-.15),at(x+len*(j+.8)/6,y+.2)],pen);
  }
  if(index%3===0){const x=width*.5,y=height*.56,rx=width*.23,ry=Math.min(.65,height*.12),points=[];for(let i=0;i<=70;i++){const t=i/70*Math.PI*2;points.push(at(x+Math.cos(t)*rx+(noise(i+index)-.5)*.05,y+Math.sin(t)*ry));}this.stroke(points,pen,.04,index);}
  if(index%2===0){const x=width+.18,y=height*.63,words=['keep going','no, this way','a room?','turn the page','almost a floor'];types.pen=pen;types.text(words[index%words.length],at(x,y),.5,rotation,4.5,.95);types.pen=null;this.stroke([at(x+.12,y-.12),at(x-.15,y-.35),at(x-.55,y-.44)],pen,.03,index);this.path([at(x-.42,y-.2),at(x-.55,y-.44),at(x-.25,y-.52)],pen);}
  // Sparse pencil layout ticks and abandoned line endings.
  for(const y of [0,height])this.stroke([at(-.2,y),at(width+.15,y+.025)],0,.025,index+3);
 }
 contour(shapes,center,matrix,depth,pen,seed){
  for(const shape of shapes)for(const contour of [shape,...shape.holes]){
   const points=contour.getPoints(5);
   for(let pass=0;pass<2;pass++){const line=points.map((p,i)=>new THREE.Vector3(p.x-center.x+(noise(i+seed+pass)-.5)*.009,p.y-center.y+(noise(i*3+seed+pass)-.5)*.009,depth+.003+pass*.002).applyMatrix4(matrix));this.path(line,pen);}
  }
 }
 build(root,resources){for(let i=0;i<3;i++){if(!this.lines[i].length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(this.lines[i],3));const material=new THREE.LineBasicMaterial({color:INKS[i],transparent:true,opacity:i===0?.42:.66,depthWrite:false});const mesh=new THREE.LineSegments(geometry,material);mesh.name=['Graphite retracing','Ballpoint revisions','Red pencil corrections'][i];root.add(mesh);resources.add(geometry);resources.add(material);}return this.count;}
}
export function pencilMaterial(color,side=false){
 const material=new THREE.MeshBasicMaterial({color});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSketch;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSketch=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSketch;').replace('#include <color_fragment>',`#include <color_fragment>
   float hatch=smoothstep(.3,.8,sin((vSketch.x+vSketch.y*.68)*370.+sin(vSketch.y*97.)*1.5));
   float grain=fract(sin(dot(floor(vSketch.xy*850.),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb=mix(vec3(.913,.871,.784),diffuseColor.rgb,${side?'.09+hatch*.18':'.12+hatch*.53'}*(.65+grain*.35));`);
 };
 material.customProgramCacheKey=()=>side?'hand-pencil-side':'hand-pencil-face';return material;
}
