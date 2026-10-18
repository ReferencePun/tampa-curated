// Loaded only when a visitor supplies a real scene. Spark's decoders, workers,
// and WASM are embedded in its MIT-licensed browser module, including exports.
import * as THREE from 'three';
import {SparkRenderer,SplatMesh} from '@sparkjsdev/spark';
import {validateRegistration} from './transition.js';

export async function loadSplat(renderer,scene,source,{onDirty=()=>{},onError=()=>{},registration}={}){
 // Own update promises: Spark's automatic render hook launches asynchronous
 // sorting without awaiting it. Serial updates let disposal drain that work
 // before terminating the worker or losing the WebGL context.
 const spark=new SparkRenderer({renderer,onDirty,autoUpdate:false,enableLod:false,minSortIntervalMs:0});
 let mesh;
 try{
  mesh=new SplatMesh(source);await mesh.initialized;
  if(!mesh.numSplats)throw new Error('This file contains no Gaussian splats.');
  const root=new THREE.Group();root.add(mesh);
  const box=mesh.getBoundingBox(),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  mesh.position.copy(center).multiplyScalar(-1);
  const defaultScale=9/Math.max(.001,size.x,size.y,size.z);
  const alignment=validateRegistration(registration??{position:[0,0,-7],rotation:[Math.PI,0,0],scale:defaultScale});
  let pending=null,queued=null,signature='',closing=false,disposal=null;
  const register=input=>{const r=validateRegistration(input);root.position.fromArray(r.position);root.rotation.fromArray(r.rotation);root.scale.setScalar(r.scale);signature='';spark.setDirty();return r;};
  function update(camera){
   if(closing)return Promise.resolve(false);
   camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
   const key=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements].join(',');
   if(key!==signature){signature=key;queued=camera.clone();}
   if(!pending&&queued){
    pending=(async()=>{while(queued&&!closing){const next=queued;queued=null;await spark.update({scene,camera:next});}return !closing;})()
     .catch(error=>{if(!closing)onError(error);return false;})
     .finally(()=>{pending=null;if(!closing)onDirty();});
   }
   return pending||Promise.resolve(true);
  }
  register(alignment);scene.add(spark,root);
  return {spark,mesh,root,alignment,register,update,dispose(){if(disposal)return disposal;closing=true;queued=null;spark.onDirty=undefined;scene.remove(spark,root);disposal=(pending||Promise.resolve()).then(()=>{mesh.dispose();spark.dispose();});return disposal;}};
 }catch(error){mesh?.dispose();spark.dispose();throw error;}
}
