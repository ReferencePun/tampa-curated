import * as THREE from 'three';
import {createPhotoRelief,createFrame} from './scene.js';
import {sampleTransition,smooth} from './transition.js';

export async function readImage(url,maxSize=2048){
 const image=new Image();image.decoding='async';image.crossOrigin='anonymous';image.src=url;await image.decode();
 if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60000000)throw new Error('Choose an image smaller than 60 megapixels.');
 const scale=Math.min(1,maxSize/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas;
}
export function depthFromImage(image){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=Math.max(1,Math.round(256*image.height/image.width));const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,data=new Float32Array(canvas.width*canvas.height);for(let i=0;i<data.length;i++)data[i]=(pixels[i*4]*.299+pixels[i*4+1]*.587+pixels[i*4+2]*.114)/255;return {width:canvas.width,height:canvas.height,data};
}
export function createPortalViewer(canvas,initial,{onDirty=()=>{},onError=()=>{}}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setClearColor('#f2eee3');renderer.setPixelRatio(Math.min(devicePixelRatio||1,initial.quality==='high'?2:1.5));
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.025,300),retiring=new Set();let config={...initial},frame,relief,texture,depthMap,aspect=1.5,width=1,height=1,disposed=false,version=0,frames=0,builds=0,splat=null,source=null,sourceTexture=null,lastPose=null;
 function retire(asset){if(!asset)return;const pending=asset.dispose();retiring.add(pending);pending.finally(()=>retiring.delete(pending));}
 function rebuild(){frame?.dispose();relief?.dispose();if(frame)scene.remove(frame.root);if(relief)scene.remove(relief.mesh,relief.lines);frame=createFrame(aspect);scene.add(frame.root);if(texture){relief=createPhotoRelief(texture,depthMap,aspect,config.quality);scene.add(relief.mesh,relief.lines);}builds++;}
 async function setImage(next){const token=++version;const [photo,depth]=await Promise.all([readImage(next.image),next.depth?readImage(next.depth,512):null]);if(disposed||token!==version)return false;
  const ratio=photo.width/photo.height;if(ratio<.3||ratio>3.5)throw new Error('Use an image with an aspect ratio between 1:3 and 3.5:1.');if(depth&&Math.abs(depth.width/depth.height-ratio)/ratio>.04)throw new Error('The depth map must have the same proportions as its photograph.');
  source=next;sourceTexture?.dispose();sourceTexture=null;texture?.dispose();texture=new THREE.CanvasTexture(photo);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());aspect=ratio;
  depthMap=depth?depthFromImage(depth):{width:2,height:2,data:new Float32Array([.5,.5,.5,.5])};rebuild();onDirty();return true;
 }
 function resize(w,h){width=Math.max(1,w);height=Math.max(1,h);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 function render(progress,pointer=[0,0]){if(disposed||!relief)return null;const pose=sampleTransition(progress,aspect,width/height,config,pointer);lastPose=pose;camera.fov=pose.fov;camera.aspect=width/height;camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(pose.x*.13,pose.y*.13,-10);camera.updateProjectionMatrix();
  if(config.mode==='splat'&&splat){relief.update({...pose,emerge:0},config);relief.material.uniforms.alpha.value=1-smooth(.12,.62,pose.p);relief.mesh.visible=pose.p<.64;relief.lines.visible=false;splat.root.visible=true;splat.spark.visible=true;splat.mesh.opacity=1;}
  else{relief.mesh.visible=config.mode==='layered';relief.lines.visible=config.mode==='layered';relief.material.uniforms.alpha.value=1;relief.update(pose,config);if(splat){splat.root.visible=false;splat.spark.visible=false;}}
  frame.root.visible=true;frame.setGuides(config.guides,pose.guideOpacity);if(config.mode==='splat'&&splat)splat.update(camera);renderer.render(scene,camera);frames++;
  return {frames,builds,pose,vertices:relief.geometry.attributes.position.count,depthRange:relief.depthRange,camera:camera.position.toArray(),width:canvas.width,height:canvas.height,splats:splat?.mesh.numSplats||0};
 }
 async function setSplat(input,registration){const token=++version;const {loadSplat}=await import('./splat.js');if(disposed||token!==version)return false;
  const candidate=await loadSplat(renderer,scene,input,{onDirty,onError,registration});if(disposed||token!==version){retire(candidate);return false;}retire(splat);splat=candidate;return capturePoster();
 }
 async function capturePoster(){if(!splat||disposed)return false;const token=version;
  const pose=sampleTransition(0,aspect,width/height,config);camera.position.set(0,0,pose.startZ);camera.lookAt(0,0,0);camera.aspect=aspect;camera.fov=2*Math.atan(pose.size.height/(2*pose.startZ))*180/Math.PI;camera.updateProjectionMatrix();frame.root.visible=false;relief.mesh.visible=relief.lines.visible=false;splat.root.visible=splat.spark.visible=true;
  const previous=renderer.getSize(new THREE.Vector2());renderer.setSize(768,Math.round(768/aspect),false);
  try{const updated=await splat.update(camera);if(disposed||token!==version)return false;if(!updated)throw new Error('The scene could not be rendered on this device.');renderer.render(scene,camera);const poster=await readImage(canvas.toDataURL('image/png'));if(disposed||token!==version)return false;
   if(!sourceTexture)sourceTexture=texture;else texture.dispose();texture=new THREE.CanvasTexture(poster);texture.colorSpace=THREE.SRGBColorSpace;rebuild();return true;
  }finally{if(!disposed){renderer.setSize(previous.x,previous.y,false);frame.root.visible=true;onDirty();}}
 }
 function leaveSplat(){if(sourceTexture){texture.dispose();texture=sourceTexture;sourceTexture=null;rebuild();}retire(splat);splat=null;}
 return {setImage,resize,render,setSplat,capturePoster,get alignment(){return splat?.alignment;},register(input){if(!splat)return;const r=splat.register(input);splat.alignment=r;return r;},get source(){return source;},get pose(){return lastPose;},get renderer(){return renderer;},
  update(next){const changed=next.quality!==config.quality,mode=next.mode!==config.mode;config={...next};if(mode){++version;if(config.mode==='layered')leaveSplat();}if(changed){renderer.setPixelRatio(Math.min(devicePixelRatio||1,config.quality==='high'?2:config.quality==='low'?1:1.5));renderer.setSize(width,height,false);rebuild();}},
  dispose(){if(disposed)return;disposed=true;++version;retire(splat);frame?.dispose();relief?.dispose();texture?.dispose();sourceTexture?.dispose();scene.clear();Promise.allSettled([...retiring]).then(()=>{renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();});}
 };
}
