import * as THREE from 'three';
import {PALETTES} from './model.js';
import {vertex,fragment,screenVertex,focusFragment} from './shaders.js';
function tubeGeometry(quality){
 const sides=quality==='low'?10:16,shaft=quality==='low'?18:24,caps=7,vertices=[],indices=[],rings=shaft+1+caps;
 for(let row=0;row<rings;row++)for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2,t=row<=shaft?row/shaft:1+(row-shaft)/caps*Math.PI/2;vertices.push(Math.cos(angle),t,Math.sin(angle));}
 for(let row=0;row<rings-1;row++)for(let j=0;j<sides;j++){const a=row*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);return geometry;
}
export function createReefRenderer(canvas,field){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.info.autoReset=false;
 const scene=new THREE.Scene(),depthScene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,60),postScene=new THREE.Scene(),postCamera=new THREE.Camera(),target=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true,samples:2});target.texture.colorSpace=THREE.SRGBColorSpace;target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const postMaterial=new THREE.ShaderMaterial({vertexShader:screenVertex,fragmentShader:focusFragment,depthTest:false,depthWrite:false,uniforms:{sceneColor:{value:target.texture},sceneDepth:{value:target.depthTexture},pixels:{value:new THREE.Vector2()},focus:{value:.5},nearPlane:{value:.1},farPlane:{value:60},focusDistance:{value:15.8},glow:{value:1}}}),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial);postScene.add(quad);
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,side:THREE.FrontSide,transparent:true,depthWrite:false,uniforms:{clock:{value:0},lengthScale:{value:1},thickness:{value:1},current:{value:.6},bodyColor:{value:new THREE.Color()},tipColor:{value:new THREE.Color()},shadowColor:{value:new THREE.Color()},waterColor:{value:new THREE.Color()},lampColor:{value:new THREE.Color()},illumination:{value:1},translucency:{value:1},hand:{value:new THREE.Vector3(.5,.5,0)},viewport:{value:new THREE.Vector2(1,1)}}});
 const depthMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:'void main(){gl_FragColor=vec4(0.);}',uniforms:material.uniforms,colorWrite:false,side:THREE.FrontSide});
 let mesh,depthMesh,geometry,sorted=[],lastCount=0,lastQuality='',width=1,height=1,disposed=false;
 const projected=new THREE.Vector3();
 function project(){field.project((x,y,z)=>{projected.set(x,y,z).project(camera);return [projected.x*.5+.5,.5-projected.y*.5];});field.aspect=width/height;const m=camera.matrixWorld.elements,r=Math.hypot(m[0],m[2])||1,d=Math.hypot(m[4],m[6])||1;field.screenBasis=[m[0]/r,m[2]/r,-m[4]/d,-m[6]/d];}
 function configure(config){
  const palette=PALETTES[config.palette];for(const [key,source]of [['bodyColor','body'],['tipColor','tip'],['shadowColor','shadow'],['waterColor','water'],['lampColor','light']])material.uniforms[key].value.set(palette[source]);scene.background=new THREE.Color(palette.water);
  for(const [key,value]of [['lengthScale',config.length],['thickness',config.thickness],['current',config.current],['illumination',config.light],['translucency',config.translucency]])material.uniforms[key].value=value;
  postMaterial.uniforms.focus.value=config.quality==='low'?0:config.focus;postMaterial.uniforms.glow.value=config.translucency*config.light;
  if(lastCount!==field.stems.length||lastQuality!==config.quality){
   geometry?.dispose();if(mesh)scene.remove(mesh);if(depthMesh)depthScene.remove(depthMesh);
   geometry=tubeGeometry(config.quality);geometry.instanceCount=field.stems.length;
   for(const key of ['rootShape','anatomy','response'])geometry.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(field.stems.length*4),4).setUsage(THREE.DynamicDrawUsage));
   mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.name='Translucent living anemone tissue';scene.add(mesh);
   depthMesh=new THREE.Mesh(geometry,depthMaterial);depthMesh.frustumCulled=false;depthScene.add(depthMesh);
   lastCount=field.stems.length;lastQuality=config.quality;
  }
  const e=config.elevation;
  camera.position.set(2.2+config.angle*7,6.8+e*10,10.5-e*6.8);camera.lookAt(config.angle,1.3,-.3);camera.zoom=config.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  postMaterial.uniforms.focusDistance.value=camera.position.distanceTo(new THREE.Vector3(config.angle,2.6,-.3));
  // Stable back-to-front instance order for overlapping translucent membranes.
  sorted=field.stems.map((stem,index)=>({stem,index,z:new THREE.Vector3(stem.x+stem.leanX*.6,stem.y+stem.length*.6,stem.z+stem.leanZ*.6).applyMatrix4(camera.matrixWorldInverse).z})).sort((a,b)=>a.z-b.z||a.index-b.index);
  sorted.forEach(({stem:s},i)=>{geometry.attributes.rootShape.setXYZW(i,s.x,s.y,s.z,s.length);geometry.attributes.anatomy.setXYZW(i,s.leanX,s.leanZ,s.phase,s.radius);});geometry.attributes.rootShape.needsUpdate=true;geometry.attributes.anatomy.needsUpdate=true;
  project();
 }
 function resize(w,h,config){width=Math.max(1,w);height=Math.max(1,h);const dpr=Math.min(config.quality==='low'?1:1.75,globalThis.devicePixelRatio||1);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width/height<.8?43:36;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new THREE.Vector2());target.setSize(size.x,size.y);material.uniforms.viewport.value.copy(size);postMaterial.uniforms.pixels.value.set(1/size.x,1/size.y);project();}
 function draw(config){if(disposed)return;renderer.info.reset();material.uniforms.clock.value=field.time;material.uniforms.hand.value.set(field.pointer.x,1-field.pointer.y,field.pointer.active?1:0);const data=geometry.attributes.response;sorted.forEach(({stem:s},i)=>data.setXYZW(i,s.dx,s.dz,s.curl,s.tone));data.needsUpdate=true;
  if(config.quality!=='low'){renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.autoClear=false;renderer.render(depthScene,camera);renderer.autoClear=true;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}else{renderer.setRenderTarget(null);renderer.render(scene,camera);}
 }
 configure(field.config);
 return {configure,resize,draw,getState:()=>({triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,width:canvas.width,height:canvas.height}),dispose(){if(disposed)return;disposed=true;geometry.dispose();material.dispose();depthMaterial.dispose();quad.geometry.dispose();postMaterial.dispose();target.depthTexture.dispose();target.dispose();scene.clear();depthScene.clear();postScene.clear();renderer.dispose();renderer.forceContextLoss();}};
}
