import * as THREE from 'three';
import {noise,penFor,INKS} from './hand.js';
import {wearSeed,wearPlan,erasedAt} from './wear.js';
export function makeAtlas(texts,config,{mobile=false}={}){
 const glyphs=[...new Set(Array.from(' ?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;—!?()/+−'+Object.values(texts).join('')+config.customText))].slice(0,256),cell=mobile?80:112,cols=24,rows=Math.ceil(glyphs.length*4/cols),canvas=document.createElement('canvas');canvas.width=cols*cell;canvas.height=rows*cell;const ctx=canvas.getContext('2d'),fontSize=cell*.92,lookup=new Map(),advance=new Map();
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='miter';
 for(let variant=0;variant<4;variant++)glyphs.forEach((glyph,index)=>{
  const i=index+variant*glyphs.length,x=i%cols*cell,y=Math.floor(i/cols)*cell,seed=i+29;
  ctx.save();ctx.beginPath();ctx.rect(x,y,cell,cell);ctx.clip();ctx.translate(x+cell/2,y+cell*.77);ctx.rotate((noise(seed)-.5)*.12);ctx.transform(.94,-.025,(noise(seed+3)-.5)*.22,1.08,0,0);
  ctx.font=`${Math.max(400,Math.min(700,config.weight+(variant===1?90:variant===3?-60:0)))} ${fontSize}px "Manuscript Hand"`;
  ctx.fillStyle='#090a0b';ctx.globalAlpha=variant===3?.55:1;ctx.fillText(glyph,0,0,cell*.82);
  // A second, imperfect pass of the pen; the last atlas row is a softer pencil.
  if(variant===1){ctx.globalAlpha=.65;ctx.strokeStyle='#101115';ctx.lineWidth=.48;ctx.strokeText(glyph,.25,-.35,cell*.82);}if(variant===3){ctx.globalAlpha=.18;ctx.fillText(glyph,1.9,-1.3,cell*.82);}
  ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1;
  for(let j=0;j<(variant===3?110:35);j++){ctx.fillStyle=`rgba(0,0,0,${.15+noise(seed*7+j)*.5})`;ctx.fillRect((noise(seed*3+j)-.5)*cell,-cell*.8+noise(seed*9+j)*cell,variant===3?1.7:1,noise(seed+j*4)*2+.4);}
  ctx.restore();if(!variant){lookup.set(glyph,index);ctx.font=`${config.weight} ${fontSize}px "Manuscript Hand"`;advance.set(glyph,Math.max(.19,Math.min(.78,ctx.measureText(glyph).width/fontSize)));}
 });
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;
 return {mobile,glyphCount:glyphs.length,texture,cols,rows,lookup,advance,bytes:canvas.width*canvas.height*4*4/3,dispose(){texture.dispose();canvas.width=canvas.height=1;}};
}
const vertex=`
#include <clipping_planes_pars_vertex>
attribute vec3 penColor; varying vec3 vPen; attribute vec4 glyphUV; attribute float printShade; uniform float burst; varying vec2 vUv; varying float vShade; varying float vDistance; void main(){vec3 p=position;float seed=instanceMatrix[3].x*3.71+instanceMatrix[3].y*5.19;vec4 placed=instanceMatrix*vec4(p,1.);placed.x+=sin(seed)*burst*2.;placed.y+=cos(seed*1.7)*burst*2.8;placed.z+=sin(seed*2.2)*burst*4.;vec4 mvPosition=modelViewMatrix*placed;
#include <clipping_planes_vertex>
vPen=penColor;vDistance=-mvPosition.z;vUv=glyphUV.xy+uv*glyphUV.zw;vShade=printShade;gl_Position=projectionMatrix*mvPosition;}`;
// Explicit coverage avoids WebKit color speckling in single-sample portal targets.
// Keep grain as a paper/ink mix and discard only the near-empty glyph fringe.
const fragment=`
#include <clipping_planes_pars_fragment>
varying vec3 vPen; uniform sampler2D atlas; uniform float contrast; uniform float fogDistance; varying vec2 vUv; varying float vShade; varying float vDistance; void main(){vec4 diffuseColor=vec4(1.);
#include <clipping_planes_fragment>
float ink=texture2D(atlas,vUv).a;if(ink<.18)discard;float fade=smoothstep(fogDistance*.35,fogDistance,vDistance);vec3 paper=vec3(.937,.933,.91);vec3 color=mix(paper,vPen,contrast*vShade);color=mix(color,paper,fade);gl_FragColor=vec4(mix(paper,color,min(1.,ink*2.4)),1.);}`;
export function glyphBatch(atlas,records,config){
 const geometry=new THREE.PlaneGeometry(1,1),uv=new Float32Array(records.length*4),shade=new Float32Array(records.length),pens=new Float32Array(records.length*3),material=new THREE.ShaderMaterial({uniforms:{atlas:{value:atlas.texture},contrast:{value:config.contrast},fogDistance:{value:95*config.depth},burst:{value:0}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,alphaToCoverage:false,clipping:true});
 const mesh=new THREE.InstancedMesh(geometry,material,records.length),transform=new THREE.Object3D();records.forEach((record,i)=>{const [char,x,y,z,size,q,weight]=record,index=(atlas.lookup.get(char)??atlas.lookup.get('?')??0)+(record[7]||0)*atlas.glyphCount;uv.set([index%atlas.cols/atlas.cols,1-(Math.floor(index/atlas.cols)+1)/atlas.rows,1/atlas.cols,1/atlas.rows],i*4);shade[i]=weight??1;const ink=new THREE.Color(INKS[record[8]||0]);pens.set([ink.r,ink.g,ink.b],i*3);transform.position.set(x,y,z);transform.quaternion.fromArray(q);transform.scale.set(size*1.32,size*1.32,1);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});geometry.setAttribute('penColor',new THREE.InstancedBufferAttribute(pens,3));geometry.setAttribute('glyphUV',new THREE.InstancedBufferAttribute(uv,4));geometry.setAttribute('printShade',new THREE.InstancedBufferAttribute(shade,1));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name='Batched handwritten ink and pencil';return mesh;
}
export class Typesetter{
 constructor(atlas,config){this.atlas=atlas;this.config=config;this.records=[];this.limit=atlas.mobile?36000:85000;this.serial=0;this.variant=0;this.pen=null;}
 glyph(char,position,size,quaternion=new THREE.Quaternion(),shade=1){if(char===' '||this.records.length>=this.limit)return;const n=++this.serial,j=this.config.imperfection,tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),(noise(n)-.5)*j*.4),rot=quaternion.clone().multiply(tilt),drift=new THREE.Vector3((noise(n+4)-.5)*j*size*.18,(noise(n+9)-.5)*j*size*.28,0).applyQuaternion(quaternion),variant=this.config.font==='graphite'?3:(this.variant+Math.floor(noise(n+2)*4))%4;this.records.push([char,position.x+drift.x,position.y+drift.y,position.z+drift.z,size*this.config.letterSize*(1+(noise(n+7)-.5)*j*.28),rot.toArray(),shade*(.89+noise(n+13)*.11),variant,this.pen??penFor(n,this.config.font)]);}
 text(text,origin,size,quaternion=new THREE.Quaternion(),maxWidth=Infinity,shade=1){const pos=new THREE.Vector3(),offset=new THREE.Vector3();let x=0;for(const char of Array.from(text)){const advance=(this.atlas.advance.get(char)??.6)*size;if(x+advance>maxWidth)break;offset.set(x+advance/2,0,0).applyQuaternion(quaternion);pos.copy(origin).add(offset);this.glyph(char,pos,size,quaternion,shade);x+=advance;}return x;}
 paragraph(text,origin,width,height,quaternion=new THREE.Quaternion(),size=.18,shade=1){const remaining=Math.max(1,this.limit-this.records.length);size*=Math.max(1,Math.sqrt(width*height*this.config.density**2/(size*size*.48*1.13*remaining)));const wear=wearPlan(width,height,wearSeed(origin,width,height)),chars=Array.from(text+' '),step=size*1.24/this.config.density;let index=0;const point=new THREE.Vector3(),offset=new THREE.Vector3();for(let y=height;y>0;y-=step){let x=0;while(x<width){const char=chars[index++%chars.length],advance=(this.atlas.advance.get(char)??.6)*size/this.config.density;if(x+advance>width)break;offset.set(x+advance/2,y+Math.sin(x*.7+y*3.1)*size*this.config.imperfection*.24,0).applyQuaternion(quaternion);point.copy(origin).add(offset);const rubbed=erasedAt(x,y,wear);this.glyph(char,point,size,quaternion,shade*(1-rubbed*.97));x+=advance;}}}
}
