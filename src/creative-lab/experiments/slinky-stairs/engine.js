import * as THREE from 'three';
import {options,createStairs,validateStairs,clamp} from './model.js';
import {createCoil} from './geometry.js';
import {createStaircase,PALETTES} from './staircase.js';
/** Portable renderer. No scroll, clock, DOM navigation or Tampa data in this engine. */
export function createSlinkyStairs({settings={},stairs:inputStairs=null,width=900,height=650,onFrame=()=>{},onContextLoss=()=>{}}={}){
 let s=options(settings),stairs=structuredClone(validateStairs(inputStairs||createStairs(s))),disposed=false,frames=0,builds=0,p=s.progress/100,sample=null,coil,staircase,mesh;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(PALETTES[s.style].paper);renderer.setSize(width,height,false);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,200),hemi=new THREE.HemisphereLight('#ffffff','#9b9384',2.7),key=new THREE.DirectionalLight('#fffdf6',3.4),rim=new THREE.DirectionalLight('#c7d7e4',1.5);key.position.set(-5,15,9);rim.position.set(12,3,-6);scene.add(hemi,key,rim);
 let geometryTime=0,renderTime=0;
 function build(){coil?.dispose();staircase?.dispose();if(mesh){scene.remove(mesh);mesh.material.dispose();}if(staircase)scene.remove(staircase.group);coil=createCoil(s);const pal=PALETTES[s.style];mesh=new THREE.Mesh(coil.geometry,new THREE.MeshStandardMaterial({color:pal.spring,metalness:pal.metal,roughness:pal.rough}));mesh.frustumCulled=false;scene.add(mesh);staircase=createStaircase(stairs,s);scene.add(staircase.group);renderer.setClearColor(pal.paper);builds++;}
 function cameraPose(){
  const aspect=width/height,first=stairs.treads[0],last=stairs.treads.at(-1),tracking=s.camera==='tracking',target=tracking?sample.cycle.tracking:[(first.x+last.x)/2,(first.y+last.y)/2,0];
  const elevation=s.angle*Math.PI/180,azimuth=s.azimuth*Math.PI/180,direction=new THREE.Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
  let span;if(tracking){span=Math.max(7.4,8.8/aspect);camera.position.set(target[0]+direction.x*45,target[1]+.6+direction.y*45,direction.z*45);camera.lookAt(target[0]+.4,target[1]+.6,0);}else{
   camera.position.set(target[0]+direction.x*60,target[1]+direction.y*60,direction.z*60);camera.lookAt(...target);camera.updateMatrixWorld();const inverse=camera.matrixWorldInverse;let maxX=0,maxY=0;for(const t of stairs.treads)for(const x of [t.x-t.depth/2,t.x+t.depth/2])for(const y of [t.y-1.3,t.y+4])for(const z of [-t.width/2,t.width/2]){const v=new THREE.Vector3(x,y,z).applyMatrix4(inverse);maxX=Math.max(maxX,Math.abs(v.x));maxY=Math.max(maxY,Math.abs(v.y));}span=Math.max(maxY*2.15,maxX*2.15/aspect);
  }
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 function render(){if(disposed)return;const start=performance.now();sample=coil.update(p,s,stairs);geometryTime=performance.now()-start;staircase.contacts(sample.cycle);cameraPose();const draw=performance.now();renderer.render(scene,camera);renderTime=performance.now()-draw;frames++;onFrame(getState());}
 function getState(){return {progress:p,step:sample?.cycle.step,phase:sample?.cycle.phase,label:sample?.cycle.label,frames,builds,width,height,coils:s.coils,segments:coil.segments,vertices:coil.geometry.attributes.position.count,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,geometryMs:geometryTime,renderMs:renderTime,corrected:sample?.corrected,maxCorrection:sample?.maxCorrection,camera:camera.position.toArray(),target:s.camera==='tracking'?sample?.cycle.tracking:null,disposed};}
 function setProgress(value){if(!Number.isFinite(value))throw new Error('Progress must be finite');p=clamp(value);render();}
 function update(next){if(disposed)return;const prior=s;s=options(next);p=s.progress/100;const geometryKeys=['coils','thickness','diameter','steps','tread','rise','width','style','guides'];if(geometryKeys.some(k=>s[k]!==prior[k])){stairs=validateStairs(inputStairs||createStairs(s));build();}render();}
 const lost=e=>{e.preventDefault();onContextLoss();};renderer.domElement.addEventListener('webglcontextlost',lost);
 build();render();return {canvas:renderer.domElement,setProgress,update,render,getState,get settings(){return {...s,progress:p*100};},getStairs:()=>structuredClone(stairs),getPoints:()=>coil.points.slice(),resize(w,h){if(disposed||w<1||h<1)return;width=w;height=h;renderer.setSize(w,h,false);render();},exportPNG(){render();return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export unavailable'))));},dispose(){if(disposed)return;disposed=true;renderer.domElement.removeEventListener('webglcontextlost',lost);coil.dispose();staircase.dispose();mesh.material.dispose();scene.clear();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}
