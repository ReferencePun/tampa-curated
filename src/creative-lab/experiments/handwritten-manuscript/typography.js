import * as THREE from 'three';
import {noise,penFor,INKS,PAPER} from './hand.js';
import {wearSeed,wearPlan,erasedAt} from './wear.js';
export function makeAtlas(texts,config,{mobile=false}={}){
 const glyphs=[...new Set(Array.from(' ?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;—!?()/+−'+Object.values(texts).join('')+config.customText))].slice(0,256),variants=6,cell=mobile?80:96,cols=24,rows=Math.ceil(glyphs.length*variants/cols),canvas=document.createElement('canvas');canvas.width=cols*cell;canvas.height=rows*cell;const ctx=canvas.getContext('2d'),fontSize=cell*.84,lookup=new Map(),advance=new Map();
 const source=document.createElement('canvas');source.width=source.height=cell;const pen=source.getContext('2d',{willReadFrequently:true});
 ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='miter';
 for(let variant=0;variant<variants;variant++)glyphs.forEach((glyph,index)=>{
  const i=index+variant*glyphs.length,x=i%cols*cell,y=Math.floor(i/cols)*cell,seed=i+29;
  pen.clearRect(0,0,cell,cell);pen.save();pen.translate(cell/2,cell*.76);pen.transform(.86+noise(seed+8)*.18,0,(noise(seed+3)-.5)*.48,1.09,0,0);pen.textAlign='center';pen.textBaseline='alphabetic';
  pen.font=`${Math.max(400,Math.min(700,config.weight+(variant===1?130:variant===4?60:0)))} ${fontSize}px "Manuscript Hand"`;
  pen.fillStyle='#151516';pen.globalAlpha=variant===3?.75:1;pen.fillText(glyph,0,0,cell*.8);
  if(variant===1||variant===4){pen.globalAlpha=.44;pen.lineWidth=.55;pen.strokeText(glyph,.65,-.45,cell*.8);}pen.restore();
  // Change the letter's actual shape, not only its angle: hurried loops,
  // crooked stems and uneven nib pressure. Bilinear resampling keeps edges sharp.
  const original=pen.getImageData(0,0,cell,cell),warped=ctx.createImageData(cell,cell),j=config.imperfection;
  for(let py=1;py<cell-1;py++)for(let px=1;px<cell-1;px++){
   const sx=px+j*(Math.sin(py/cell*9+seed)*2.8+Math.sin(py/cell*21+seed*.7)*.8),sy=py+j*Math.sin(px/cell*11+seed*1.3)*1.8;
   const ix=Math.floor(sx),iy=Math.floor(sy);if(ix<0||iy<0||ix>=cell-1||iy>=cell-1)continue;
   const fx=sx-ix,fy=sy-iy,a=(x,y)=>original.data[(y*cell+x)*4+3];
   const coverage=(a(ix,iy)*(1-fx)+a(ix+1,iy)*fx)*(1-fy)+(a(ix,iy+1)*(1-fx)+a(ix+1,iy+1)*fx)*fy;
   const pressure=.72+.28*noise(Math.floor(py/8)+seed*11),tooth=variant===3?(.48+.52*noise(px*13+py*37+seed)):noise(px*13+py*37+seed)<.025?.35:1;
   warped.data.set([21,21,22,coverage*pressure*tooth],(py*cell+px)*4);
  }
  ctx.putImageData(warped,x,y);if(!variant){lookup.set(glyph,index);ctx.font=`${config.weight} ${fontSize}px "Manuscript Hand"`;advance.set(glyph,Math.max(.19,Math.min(.78,ctx.measureText(glyph).width/fontSize)));}
 });
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=4;
 source.width=source.height=1;
 return {mobile,variants,glyphCount:glyphs.length,texture,cols,rows,lookup,advance,bytes:canvas.width*canvas.height*4*4/3,dispose(){texture.dispose();canvas.width=canvas.height=1;}};
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
varying vec3 vPen; uniform vec3 paper; uniform sampler2D atlas; uniform float contrast; uniform float fogDistance; varying vec2 vUv; varying float vShade; varying float vDistance; void main(){vec4 diffuseColor=vec4(1.);
#include <clipping_planes_fragment>
float ink=texture2D(atlas,vUv).a;if(ink<.1)discard;float fade=smoothstep(fogDistance*.35,fogDistance,vDistance);vec3 color=mix(paper,vPen,1.-pow(1.-clamp(contrast*vShade,0.,1.),2.1));color=mix(color,paper,fade);gl_FragColor=vec4(mix(paper,color,min(1.,ink*2.4)),1.);
#include <colorspace_fragment>
}`;
export function glyphBatch(atlas,records,config){
 const geometry=new THREE.PlaneGeometry(1,1),uv=new Float32Array(records.length*4),shade=new Float32Array(records.length),pens=new Float32Array(records.length*3),material=new THREE.ShaderMaterial({uniforms:{paper:{value:new THREE.Color(PAPER)},atlas:{value:atlas.texture},contrast:{value:config.contrast},fogDistance:{value:95*config.depth},burst:{value:0}},vertexShader:vertex,fragmentShader:fragment,side:THREE.DoubleSide,alphaToCoverage:false,clipping:true});
 const mesh=new THREE.InstancedMesh(geometry,material,records.length),transform=new THREE.Object3D();records.forEach((record,i)=>{const [char,x,y,z,size,q,weight]=record,index=(atlas.lookup.get(char)??atlas.lookup.get('?')??0)+(record[7]||0)*atlas.glyphCount;uv.set([index%atlas.cols/atlas.cols,1-(Math.floor(index/atlas.cols)+1)/atlas.rows,1/atlas.cols,1/atlas.rows],i*4);shade[i]=weight??1;const ink=new THREE.Color(INKS[record[8]||0]);pens.set([ink.r,ink.g,ink.b],i*3);transform.position.set(x,y,z);transform.quaternion.fromArray(q);transform.scale.set(size*1.32*(record[9]??1),size*1.32,1);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});geometry.setAttribute('penColor',new THREE.InstancedBufferAttribute(pens,3));geometry.setAttribute('glyphUV',new THREE.InstancedBufferAttribute(uv,4));geometry.setAttribute('printShade',new THREE.InstancedBufferAttribute(shade,1));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name='Batched handwritten ink and pencil';return mesh;
}
// Variation is correlated within words, as it is when a hand speeds up, runs
// out of room, or presses harder. A repeated character still has six forms.
export function wordHand(seed,roughness){
 return {squeeze:1+(noise(seed+31)-.5)*roughness*.5,slant:(noise(seed+17)-.5)*roughness*.36,rise:(noise(seed+43)-.5)*roughness*.22,pressure:.8+noise(seed+53)*.2};
}
export class Typesetter{
 constructor(atlas,config){this.atlas=atlas;this.config=config;this.records=[];this.limit=atlas.mobile?36000:85000;this.serial=0;this.variant=0;this.pen=null;this.hand=null;}
 glyph(char,position,size,quaternion=new THREE.Quaternion(),shade=1){
  if(char===' '||this.records.length>=this.limit)return;
  const n=++this.serial,j=this.config.imperfection,h=this.hand||wordHand(Math.floor(n/7),j),tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),h.slant+(noise(n)-.5)*j*.24),rot=quaternion.clone().multiply(tilt),drift=new THREE.Vector3((noise(n+4)-.5)*j*size*.1,(noise(n+9)-.5)*j*size*.22,0).applyQuaternion(quaternion),variants=this.atlas.variants||6,variant=this.config.font==='graphite'?3:(this.variant+Math.floor(noise(n+2)*variants))%variants;
  this.records.push([char,position.x+drift.x,position.y+drift.y,position.z+drift.z,size*this.config.letterSize*(1+(noise(n+7)-.5)*j*.32),rot.toArray(),shade*h.pressure,variant,this.pen??penFor(n,this.config.font),h.squeeze]);
 }
 text(text,origin,size,quaternion=new THREE.Quaternion(),maxWidth=Infinity,shade=1){
  const pos=new THREE.Vector3(),offset=new THREE.Vector3();let x=0,wordStart=0;
  const originalHand=this.hand,originalPen=this.pen;
  for(const char of Array.from(text)){
   if(!this.hand||char===' '){this.hand=wordHand(this.serial+7,this.config.imperfection);wordStart=x;if(originalPen===null)this.pen=penFor(this.serial,this.config.font);}
   const advance=(this.atlas.advance.get(char)??.6)*size*this.hand.squeeze*(char===' '?1.05:.91);
   if(x+advance>maxWidth)break;
   offset.set(x+advance/2,(x-wordStart)*this.hand.rise,0).applyQuaternion(quaternion);pos.copy(origin).add(offset);this.glyph(char,pos,size,quaternion,shade);x+=advance;
  }
  this.hand=originalHand;this.pen=originalPen;return x;
 }
 paragraph(text,origin,width,height,quaternion=new THREE.Quaternion(),size=.18,shade=1){
  const remaining=Math.max(1,this.limit-this.records.length);size*=Math.max(1,Math.sqrt(width*height*this.config.density**2/(size*size*.48*1.13*remaining)));
  const seed=wearSeed(origin,width,height),wear=wearPlan(width,height,seed),words=(text.trim()||'word').split(/\s+/),step=size*1.35/this.config.density;
  const point=new THREE.Vector3(),offset=new THREE.Vector3();let index=0,row=0;
  for(let y=height;y>0;y-=step*(.92+noise(seed+row*23)*.2),row++){
   let x=size*noise(seed+row)*.6;const slope=(noise(seed+row*11)-.5)*size*.09;
   while(x<width&&this.records.length<this.limit){
    const word=words[index%words.length],hand=wordHand(seed+index*13,this.config.imperfection),wordSize=size/this.config.density*(.92+noise(seed+index*7)*.16),nominal=Array.from(word).reduce((sum,char)=>sum+(this.atlas.advance.get(char)??.6)*wordSize*hand.squeeze*.91,0);
    if(x+nominal>width&&x>size)break;
    const baseline=y+slope*x+Math.sin(x*.8+row)*size*this.config.imperfection*.28;
    offset.set(x,baseline,0).applyQuaternion(quaternion);point.copy(origin).add(offset);
    this.hand=hand;this.pen=penFor(seed+index*9,this.config.font);
    const rubbed=erasedAt(x+nominal/2,y,wear),written=this.text(word,point,wordSize,quaternion,width-x,shade*(1-rubbed*.94));
    // An abandoned word beneath its replacement, not a decorative outline.
    if(noise(seed+index*19)>.974&&nominal<width*.4){
     const previousPen=this.pen;this.pen=0;
     const displaced=new THREE.Vector3(.035,-wordSize*.18,-.009).applyQuaternion(quaternion).add(point);
     this.text(word,displaced,wordSize*.95,quaternion,width-x,.2);
     this.pen=this.config.font==='graphite'?0:2;
     const correction=new THREE.Vector3(0,wordSize*.58,.016).applyQuaternion(quaternion).add(point);
     this.text(['no,','again','perhaps','?'][index%4],correction,wordSize*.59,quaternion,width-x,.85);this.pen=previousPen;
    }
    this.hand=null;this.pen=null;index++;x+=Math.max(written,size*.3)+wordSize*(.16+noise(seed+index)*.24);
   }
  }
 }
}
