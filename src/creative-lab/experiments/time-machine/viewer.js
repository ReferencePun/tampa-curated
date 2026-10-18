import * as THREE from 'three';
import {createTimeScene,cameraFor} from './scene.js';
import {validateLocation} from './timeline.js';
// One renderer serves both comparison views. Time never drives the camera.
export function createTimeViewer(canvas,definition,settings,{onReady=()=>{},onError=()=>{}}={}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));renderer.setClearColor('#f2eee3');renderer.autoClear=false;
 const scene=new THREE.Scene();let location,rig,textures=new Map(),disposed=false,generation=0,width=1,height=1,frames=0,builds=0,config={...settings},orbit={theta:0,phi:1,radius:60},ready=Promise.resolve();
 function resetCamera(){const p=new THREE.Vector3(...location.camera.position).sub(new THREE.Vector3(...location.camera.target));orbit={theta:Math.atan2(p.x,p.z),phi:Math.acos(p.y/p.length()),radius:p.length()};}
 function build(){if(rig){scene.remove(rig.root);rig.dispose();}rig=createTimeScene(location,{...config,textures});scene.add(rig.root);builds++;}
 function setLocation(next){validateLocation(next);const token=++generation;location=next;resetCamera();for(const texture of textures.values())texture.dispose();textures=new Map();build();
  ready=Promise.all((location.media||[]).map(async media=>{try{const texture=await new THREE.TextureLoader().loadAsync(media.url);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return [media.id,texture];}catch{return [media.id,null];}})).then(entries=>{
   if(disposed||token!==generation){entries.forEach(([,t])=>t?.dispose());return;}textures=new Map(entries.filter(([,t])=>t));build();if(entries.some(([,t])=>!t))onError('A reference image could not load. Its registered drawing is still available.');onReady();
  });return ready;
 }
 function resize(w,h){width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));renderer.setSize(width,height,false);}
 function render(time){if(disposed)return;const stacked=width<600,views=config.compare?(stacked?[{x:0,y:0,w:width,h:height/2,time:config.compareAt},{x:0,y:height/2,w:width,h:height/2,time}]:[{x:0,y:0,w:width/2,h:height,time:config.compareAt},{x:width/2,y:0,w:width/2,h:height,time}]):[{x:0,y:0,w:width,h:height,time}];
  const annotations=[],cameras=[],media=[],poses=[];renderer.setScissorTest(true);
  for(const [index,v]of views.entries()){
   rig.setTime(v.time);const camera=cameraFor(location,v.w/v.h);
   if(config.camera==='orbit'){camera.position.copy(new THREE.Vector3(...location.camera.target).add(new THREE.Vector3(Math.sin(orbit.phi)*Math.sin(orbit.theta),Math.cos(orbit.phi),Math.sin(orbit.phi)*Math.cos(orbit.theta)).multiplyScalar(orbit.radius)));camera.lookAt(new THREE.Vector3(...location.camera.target));camera.updateMatrixWorld(true);}
   renderer.setViewport(v.x,height-v.y-v.h,v.w,v.h);renderer.setScissor(v.x,height-v.y-v.h,v.w,v.h);renderer.clear();renderer.render(scene,camera);
   cameras.push({position:camera.position.toArray(),matrix:camera.matrixWorld.toArray(),projection:camera.projectionMatrix.toArray()});poses.push(rig.snapshot());media.push(rig.mediaPose());
   for(const note of location.annotations||[]){const p=rig.anchor(note.object).project(camera);annotations.push({...note,panel:index,x:v.x+(p.x+1)*v.w/2,y:v.y+(1-p.y)*v.h/2,visible:config.annotations&&v.time>=note.range[0]&&v.time<=note.range[1]&&Math.abs(p.x)<.92&&Math.abs(p.y)<.92});}
  }
  renderer.setScissorTest(false);frames++;return {frames,builds,width:canvas.width,height:canvas.height,primitives:rig.primitives,views,annotations,cameras,media,poses};
 }
 setLocation(definition);
 return {canvas,get ready(){return ready;},get rig(){return rig;},get definition(){return location;},resize,render,setLocation,
  update(next){const detail=next.detail!==config.detail;config={...next};if(detail)build();else rig.setAppearance(config);if(config.camera==='fixed')resetCamera();},orbit(dx,dy){orbit.theta+=dx;orbit.phi=Math.max(.25,Math.min(1.4,orbit.phi+dy));},resetCamera,
  dispose(){if(disposed)return;disposed=true;++generation;rig?.dispose();for(const texture of textures.values())texture.dispose();textures.clear();renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();scene.clear();}
 };
}
