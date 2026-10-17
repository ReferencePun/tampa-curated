import * as T from 'three';
import {phase} from './path';
import {gearPath,meshPhase} from '../../lib/mechanisms';
type P=[number,number,number];
const paper=0xeee7d8,ink=0x38332c,rust=0x97513b;
const TAU=Math.PI*2;
const surfaces=new T.MeshBasicMaterial({color:0xe8dfcd,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const pale=new T.MeshBasicMaterial({color:paper,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
const materials=[new T.LineBasicMaterial({color:ink,transparent:true,opacity:.85}),new T.LineBasicMaterial({color:0x847361,transparent:true,opacity:.25}),new T.LineBasicMaterial({color:rust,transparent:true,opacity:.72})];

/** Object-space pen deviations are baked once. Nothing is rerandomized per frame. */
class Ink {
 buffers:number[][]=[[],[],[]];seed=1;
 line(a:P,b:P,tone=0,rough=true){
  const length=Math.hypot(...a.map((v,i)=>v-b[i]));
  const n=rough?Math.max(2,Math.min(12,Math.ceil(length*2))):1;
  const seed=this.seed++;
  let previous=a;
  for(let i=1;i<=n;i++){
   const t=i/n,w=rough?Math.sin(t*Math.PI)*.018:0;
   const next=a.map((v,j)=>v+(b[j]-v)*t+w*Math.sin(seed*2.31+j*2+i*.8)) as P;
   this.buffers[tone].push(...previous,...next);previous=next;
  }
  if(rough&&tone===0&&seed%3===0)this.line(a.map((v,i)=>v+(i===1?.028:-.019)) as P,b.map((v,i)=>v+(i===1?.026:.016)) as P,1,false);
 }
 path(points:P[],tone=0,closed=false){for(let i=1;i<points.length;i++)this.line(points[i-1],points[i],tone);if(closed)this.line(points.at(-1)!,points[0],tone);}
 circle(x:number,y:number,z:number,r:number,tone=0,start=0,end=TAU){this.path(Array.from({length:73},(_,i)=>{const a=start+(end-start)*i/72;const wobble=.008*Math.sin(a*7+x);return [x+Math.cos(a)*(r+wobble),y+Math.sin(a)*(r+wobble),z] as P;}),tone);}
 rect(x:number,y:number,z:number,w:number,h:number,tone=0){this.path([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],tone,true);}
 box(x:number,y:number,z:number,w:number,h:number,d:number,tone=0){this.rect(x,y,z,w,h,tone);this.rect(x,y,z+d,w,h,tone);for(const [u,v] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]])this.line([u,v,z],[u,v,z+d],tone);}
 build(parent:T.Object3D){this.buffers.forEach((vertices,i)=>{if(!vertices.length)return;const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));parent.add(new T.LineSegments(geometry,materials[i]));});}
}
function plane(parent:T.Object3D,w:number,h:number,position:P,rotation:P=[0,0,0],material=surfaces){const mesh=new T.Mesh(new T.PlaneGeometry(w,h),material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;}
function gear(radius:number,teeth:number,hole:number){
 const group=new T.Group(),drawing=new Ink(),shape=new T.Shape();
 const edge:P[]=[];
 // Extrude the same involute outlines used by the site's illustrated machinery.
 const coordinates=gearPath(radius*100,teeth).match(/-?\d+(?:\.\d+)?/g)!.map(Number);
 for(let i=0;i<coordinates.length;i+=2){const p:[number,number]=[coordinates[i]/100,coordinates[i+1]/100];if(i===0)shape.moveTo(...p);else shape.lineTo(...p);edge.push([...p,.2]);}
 shape.closePath();const cutout=new T.Path();cutout.absarc(0,0,hole,0,TAU,true);shape.holes.push(cutout);
 const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false,curveSegments:64}),surfaces);mesh.position.z=-.15;group.add(mesh);
 drawing.path(edge,0,true);drawing.path(edge.map(([x,y])=>[x,y,-.15]),1,true);
 drawing.circle(0,0,.22,hole);drawing.circle(0,0,.23,radius*.89,2);
 for(let i=0;i<teeth;i++){const a=TAU*i/teeth;drawing.line([Math.cos(a)*radius*.78,Math.sin(a)*radius*.78,.22],[Math.cos(a)*radius*.87,Math.sin(a)*radius*.87,.22],1);}
 for(let i=0;i<8;i++){const a=TAU*i/8;drawing.circle(Math.cos(a)*radius*.8,Math.sin(a)*radius*.8,.24,.055);}
 drawing.build(group);return group;
}
function wall(parent:T.Object3D,x:number,z:number,direction:number){
 const fold=new T.Group();fold.position.set(x,0,z);parent.add(fold);
 plane(fold,9,21,[direction*4.5,0,0],[-Math.PI/2,0,0],pale);
 const drawing=new Ink();
 drawing.path([[0,.025,-10.5],[direction*9,.025,-10.5],[direction*9,.025,10.5],[0,.025,10.5]],0,true);
 for(let j=-9;j<=9;j+=3){drawing.line([0,.03,j],[direction*9,.03,j]);drawing.line([direction*8.6,.03,j],[direction*8.6,.03,j+2.8]);}
 for(let h=1;h<9;h+=2) drawing.line([direction*h,.025,-10.5],[direction*h,.025,10.5],1);
 for(let j=-9;j<10;j+=3)for(let h=0;h<4;h++)drawing.line([direction*(h*.25+1),.035,j],[direction*(h*.25+3),.035,j+2.6],1);
 drawing.build(fold);return fold;
}
function facade(parent:T.Object3D,w:number,h:number,x:number,z:number,rotation=0){
 const group=new T.Group();group.position.set(x,0,z);group.rotation.y=rotation;parent.add(group);
 plane(group,w,h,[0,h/2,-.035]);
 const pen=new Ink();pen.box(-w/2,0,0,w,h,-2.2);pen.rect(-w/2-.2,h,0,w+.4,.35);pen.rect(-w/2,0,.03,w,.45);
 for(let y=2;y<h-1;y+=2.7){pen.line([-w/2,y-.7,.05],[w/2,y-.7,.05]);for(let x=-w/2+1.1;x<w/2-.5;x+=2.2){pen.rect(x,y,.05,1.05,1.6);pen.rect(x-.1,y-.1,.055,1.25,1.8,1);pen.line([x+.52,y,.07],[x+.52,y+1.6,.07]);pen.line([x,y+.8,.07],[x+1.05,y+.8,.07]);}}
 for(let i=0;i<40;i++){const x=-w/2+(i%8)*.36,y=Math.floor(i/8)*.3;pen.line([x,y,.06],[x+.6,y+.75,.06],1);}
 for(let i=0;i<5;i++)pen.line([-w/2+.3,h+.35+i*.07,.04],[w/2-.3,h+.35+i*.07,.04],1);
 pen.build(group);return group;
}
export function createWorld(compact:boolean){
 const scene=new T.Scene();scene.background=new T.Color(paper);scene.fog=new T.Fog(paper,38,105);
 const drawing=new T.Group();scene.add(drawing);
 plane(drawing,35,36,[0,-.06,-7],[-Math.PI/2,0,0],pale);
 const lines=new Ink();
 lines.path([[-17,0,10],[17,0,10],[17,0,-25],[-17,0,-25]],1,true);
 for(let i=-16;i<=16;i+=2)lines.line([i,.012,9],[i,.012,-25],1,false);
 for(let i=-24;i<=8;i+=2)lines.line([-16,.012,i],[16,.012,i],1,false);
 // Incomplete measuring rails, pencil overshoots, and construction crosses.
 for(let i=0;i<24;i++){const x=-14+i;lines.line([x,.016,11],[x,.016,11+(i%5===0?.5:.22)],i%5===0?2:1);}
 for(const [x,z] of [[-12,7],[12,7],[-12,-22],[12,-22]]){lines.line([x-1,.02,z],[x+1,.02,z],2);lines.line([x,.02,z-1],[x,.02,z+1],2);}
 lines.build(drawing);
 const leftWall=wall(scene,-5,-16,-1),rightWall=wall(scene,5,-16,1);
 const threshold=new T.Group();threshold.position.z=-4;scene.add(threshold);
 const wheel=gear(4.25,48,3.22);wheel.position.y=4.45;threshold.add(wheel);
 const pinion=gear(4.25*20/48,20,.3);pinion.position.set(4.25*(1+20/48),4.45,.03);threshold.add(pinion);
 const crank=new Ink();crank.line([0,0,.4],[1.1,.1,.4],2);crank.circle(1.1,.1,.4,.17);crank.build(pinion);
 const rig=new Ink();rig.box(-5.2,0,-.4,.45,10.2,.6);rig.box(4.9,0,-.4,.45,10.2,.6);rig.box(-5.2,9.7,-.4,10.55,.5,.6);rig.box(7.8,0,-.4,.35,5,.6);
 for(let i=0;i<16;i++)rig.line([-5.16,i*.58,.25],[-4.76,i*.58+.5,.25],1);
 rig.line([4.95,8.6,.2],[7.95,4.45,.2]);rig.circle(-5,10.6,.1,.68);rig.circle(-5,10.6,.1,.56);rig.build(threshold);
 const leaves:T.Group[]=[];
 for(const sign of [-1,1]){
  const hinge=new T.Group();hinge.position.set(sign*3.2,4.45,.12);threshold.add(hinge);leaves.push(hinge);
  plane(hinge,3.2,6.5,[-sign*1.6,0,0]);
  const pen=new Ink();pen.rect(sign<0?0:-3.2,-3.25,.08,3.2,6.5);pen.line([0,-3.25,.1],[-sign*3.2,3.25,.1],2);
  for(let j=0;j<12;j++)pen.line([-sign*.2,-3+j*.5,.1],[-sign*3, -2.5+j*.5,.1],1);
  pen.circle(-sign*2.8,0,.1,.12);pen.build(hinge);
 }
 // A counterweight and sliding panel share one conserved rope length.
 const liftPanel=new T.Group();liftPanel.position.set(-5,2,-9);scene.add(liftPanel);
 plane(liftPanel,2.5,3,[0,0,0]);const panelInk=new Ink();panelInk.rect(-1.25,-1.5,.05,2.5,3);panelInk.path([[-1.2,-1.4,.06],[1.2,1.4,.06],[-1.2,1.4,.06],[1.2,-1.4,.06]],1);panelInk.build(liftPanel);
 const weight=new T.Group();weight.position.set(-7,8,-9);scene.add(weight);const weightInk=new Ink();weightInk.box(-.4,-.6,-.3,.8,1.2,.6);weightInk.build(weight);
 const pulley=gear(.65,16,.15);pulley.position.set(-6,10,-9);scene.add(pulley);
 const cableGeometry=new T.BufferGeometry();const cablePoints=new Float32Array([-5.35,10,-9,-5.35,3.5,-9,-6.65,10,-9,-6.65,8.6,-9]);cableGeometry.setAttribute('position',new T.BufferAttribute(cablePoints,3));scene.add(new T.LineSegments(cableGeometry,materials[0]));
 // A deep arcade with an open left side at the final bay.
 const corridor=new Ink();
 plane(scene,10,30,[0,-.04,-19],[-Math.PI/2,0,0],pale);
 for(let z=-8;z>=-29;z-=3.5){
  corridor.box(-5,0,z,.22,9,.22);corridor.box(4.78,0,z,.22,9,.22);
  corridor.path([[-5,7,z],[-3.5,9,z],[3.5,9,z],[5,7,z]]);
  corridor.path([[-5,7.25,z+.15],[-3.5,9.25,z+.15],[3.5,9.25,z+.15],[5,7.25,z+.15]],1);
  corridor.line([-5,0,z],[5,0,z],1);
  for(let i=0;i<5;i++)corridor.line([4.7,1+i*.4,z],[4.7,2.8+i*.4,z-2.7],1);
 }
 for(let x=-4;x<=4;x+=2)corridor.line([x,.02,1],[x,.02,-34],1);
 corridor.line([-5,9,-5],[-5,9,-29]);corridor.line([5,9,-5],[5,9,-36]);
 corridor.box(-6,0,-38,12,11,.4);corridor.rect(-2,4,-37.98,4,4,2);
 // Impossible stair fragments: precise treads, intentionally missing landings.
 for(let i=0;i<(compact?10:17);i++){const y=2+i*.35,z=-14-i*.63;corridor.box(3.2,y,z,1.7,.12,.6,1);}
 corridor.build(scene);
 // The turn has ceiling rails that continue into the larger street.
 const city=new T.Group();scene.add(city);plane(city,63,23,[-34,-.05,-34],[-Math.PI/2,0,0],pale);
 const cityInk=new Ink();
 for(let x=-8;x>=-60;x-=4){cityInk.line([x,.03,-44],[x,.03,-24],1);cityInk.line([x,10,-39],[x,10,-29],1);}
 for(let z=-43;z<=-25;z+=2)cityInk.line([-7,.02,z],[-62,.02,z],1);
 cityInk.line([-5,10,-39],[-40,10,-39]);cityInk.line([-5,10,-29],[-40,10,-29]);
 for(let x=-13;x>=-45;x-=8){cityInk.box(x,0,-42,.25,10,.25);cityInk.box(x,0,-26,.25,8,.25);}
 cityInk.build(city);
 for(let i=0;i<(compact?3:5);i++){
  facade(city,7.2,8+(i%3)*2,-17-i*9,-44,0);
  facade(city,7.2,7+(i%2)*2,-17-i*9,-24,Math.PI);
 }
 const destination=facade(city,15,12,-54,-34,Math.PI/2);
 const photoMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{map:{value:null},reveal:{value:0},loaded:{value:0}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
  uniform sampler2D map;uniform float reveal;uniform float loaded;varying vec2 vUv;
  float grain(vec2 p){return fract(sin(dot(floor(p),vec2(127.1,311.7)))*43758.5453);}
  void main(){vec4 photo=texture2D(map,vUv);float gray=dot(photo.rgb,vec3(.299,.587,.114));vec3 c=mix(vec3(.12,.105,.08),vec3(.93,.90,.82),gray);float edge=max(abs(vUv.x-.5)*1.6,abs(vUv.y-.5)*1.8);float n=grain(vUv*180.);float a=1.-smoothstep(reveal*.95-.07,reveal*.95+.025,edge+n*.065);gl_FragColor=vec4(c,a*loaded);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const photo=new T.Mesh(new T.PlaneGeometry(12.8,7.9),photoMaterial);photo.position.set(0,6.5,.14);destination.add(photo);
 const frame=new Ink();frame.rect(-6.5,2.5,.2,13,8);frame.rect(-6.7,2.3,.21,13.4,8.4,1);frame.build(destination);
 // A suspended compass on the approach becomes a full architectural scale.
 const compass=new T.Group();compass.position.set(-22,8.8,-34);compass.rotation.y=Math.PI/2;city.add(compass);
 const compassPen=new Ink();compassPen.circle(0,0,0,2.4,1);compassPen.path([[-2,-2,0],[0,2.8,0],[2,-2,0]],2);compassPen.circle(0,2.6,.02,.18);compassPen.line([-2.3,-2.3,0],[-1.8,-1.8,0]);compassPen.line([1.8,-1.8,0],[2.3,-2.3,0]);compassPen.build(compass);
 let texture:T.Texture|null=null,disposed=false;
 async function loadPhoto(url:string,onReady:()=>void){try{const loaded=await new T.TextureLoader().loadAsync(url);if(disposed){loaded.dispose();return;}texture=loaded;texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;photoMaterial.uniforms.map.value=texture;photoMaterial.uniforms.loaded.value=1;onReady();}catch{/* The outlined facade and HTML photograph remain usable. */}}
 function update(p:number,underDrawing=false){
  const fold=phase(p,.015,.22),open=phase(p,.16,.325),lift=phase(p,.36,.61)*5;
  (scene.fog as T.Fog).near=22+16*phase(p,.34,.72);(scene.fog as T.Fog).far=55+45*phase(p,.34,.72);
  threshold.rotation.x=-(1-fold)*Math.PI/2;leftWall.rotation.z=-fold*Math.PI/2;rightWall.rotation.z=fold*Math.PI/2;
  wheel.rotation.z=p*Math.PI*3;pinion.rotation.z=-wheel.rotation.z*48/20+meshPhase(48,20,0)*Math.PI/180;
  leaves[0].rotation.y=open*Math.PI/2;leaves[1].rotation.y=-open*Math.PI/2;
  liftPanel.position.y=2+lift;weight.position.y=8-lift;pulley.rotation.z=lift/.65;
  cablePoints[4]=3.5+lift;cablePoints[10]=8.6-lift;cableGeometry.attributes.position.needsUpdate=true;cableGeometry.computeBoundingSphere();
  photoMaterial.uniforms.reveal.value=underDrawing?0:phase(p,.77,.95);
  compass.rotation.z=phase(p,.63,.81)*.25;
  return {fold,open,gear:wheel.rotation.z,pinion:pinion.rotation.z,lift,reveal:photoMaterial.uniforms.reveal.value};
 }
 function dispose(){disposed=true;const geometries=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.LineSegments){geometries.add(object.geometry);for(const mat of Array.isArray(object.material)?object.material:[object.material])mats.add(mat);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());texture?.dispose();}
 return {scene,update,loadPhoto,dispose,photoPoint:new T.Vector3(-53.7,6.5,-34)};
}
