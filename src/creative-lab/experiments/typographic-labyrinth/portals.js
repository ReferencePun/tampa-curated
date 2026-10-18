import * as THREE from 'three';
import {frameMatrix,portalTransform} from './navigation.js';
const vertex=`varying vec2 vUv;varying vec4 vScreen;
#include <clipping_planes_pars_vertex>
void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);vScreen=projectionMatrix*mvPosition;gl_Position=vScreen;
#include <clipping_planes_vertex>
}`;
const fragment=`uniform sampler2D view;varying vec2 vUv;varying vec4 vScreen;
#include <clipping_planes_pars_fragment>
void main(){
#include <clipping_planes_fragment>
vec2 p=(vUv-.5)*2.;if(dot(p,p)>1.)discard;vec2 screenUV=vScreen.xy/vScreen.w*.5+.5;gl_FragColor=texture2D(view,screenUV);}`;
export function createPortals(definition,architecture,renderer,config,beforeRender=()=>{}){
 const links=[];
 for(const pair of definition.portals)for(const reverse of [false,true]){
  const local=reverse?{...pair,id:pair.id+'-back',from:pair.to,to:pair.from,position:pair.destination,rotation:pair.destinationRotation,destination:pair.position,destinationRotation:pair.rotation,fromZone:pair.toZone,toZone:pair.fromZone}:pair;
  const frame=frameMatrix(local.position,local.rotation,config.scale);if(reverse)frame.multiply(new THREE.Matrix4().makeRotationY(Math.PI));const destinationFrame=frameMatrix(local.destination,local.destinationRotation,config.scale);if(reverse)destinationFrame.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
  const target=new THREE.WebGLRenderTarget(1,1,{samples:0,depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;const geometry=new THREE.PlaneGeometry(local.width*config.scale,local.height*config.scale),material=new THREE.ShaderMaterial({uniforms:{view:{value:target.texture}},vertexShader:vertex,fragmentShader:fragment,side:THREE.FrontSide,clipping:true}),mesh=new THREE.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(frame);mesh.name='Portal '+local.id;architecture.cells.get(local.from).scene.add(mesh);
  const normal=new THREE.Vector3(0,0,-1).transformDirection(destinationFrame),point=new THREE.Vector3().setFromMatrixPosition(destinationFrame);links.push({...local,pair:pair.id,reverse,frame,destinationFrame,transform:portalTransform(pair,config.scale,reverse),target,mesh,clip:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,point),camera:new THREE.PerspectiveCamera(50,1,.025,300*config.scale)});
 }
 let passes=0;const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),bufferSize=new THREE.Vector2();
 function renderViews(room,camera,level=config.recursion,skip=null){const rendered=new Set();if(level<=0)return rendered;camera.updateMatrixWorld(true);matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);const visible=links.filter(link=>link.from===room&&link.pair!==skip&&camera.position.clone().applyMatrix4(link.frame.clone().invert()).z>.015&&frustum.intersectsObject(link.mesh));
  for(const link of visible){if(passes>=6)break;passes++;const pc=link.camera;pc.position.copy(camera.position).applyMatrix4(link.transform);pc.quaternion.copy(new THREE.Quaternion().setFromRotationMatrix(link.transform)).multiply(camera.quaternion);pc.projectionMatrix.copy(camera.projectionMatrix);pc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);pc.updateMatrixWorld(true);const destination=architecture.cells.get(link.to),back=links.find(p=>p.pair===link.pair&&p.reverse!==link.reverse),oldVisibility=back?.mesh.visible;if(back)back.mesh.visible=false;
   const nested=renderViews(link.to,pc,level-1,link.pair),hidden=[];for(const child of links.filter(p=>p.from===link.to&&!nested.has(p.id))){hidden.push([child.mesh,child.mesh.visible]);child.mesh.visible=false;}renderer.getDrawingBufferSize(bufferSize);const cap=config.recursion===2?1280:1024,ratio=Math.min(1,cap/Math.max(bufferSize.x,bufferSize.y)),w=Math.max(1,Math.round(bufferSize.x*ratio)),h=Math.max(1,Math.round(bufferSize.y*ratio));if(link.target.width!==w||link.target.height!==h)link.target.setSize(w,h);renderer.clippingPlanes=[link.clip];beforeRender(link.to,pc);renderer.setRenderTarget(link.target);renderer.clear();renderer.render(destination.scene,pc);for(const [mesh,visible] of hidden)mesh.visible=visible;if(back)back.mesh.visible=oldVisibility;rendered.add(link.id);
  }return rendered;
 }
 return {links,render(room,camera){passes=0;for(const cell of architecture.cells.values())cell.scene.updateMatrixWorld(true);renderViews(room,camera);renderer.clippingPlanes=[];renderer.setRenderTarget(null);return passes;},dispose(){for(const link of links){link.mesh.removeFromParent();link.mesh.geometry.dispose();link.mesh.material.dispose();link.target.dispose();}links.length=0;}};
}
