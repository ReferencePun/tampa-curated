import * as THREE from 'three';
import {Font} from './vendor/FontLoader.js';
import {Typesetter,glyphBatch} from './typography.js';
import {letterPlan,writeStructure} from './text-structures.js';
import {PageWear,makeWearResources,paperTexture} from './wear.js';

const v=a=>new THREE.Vector3(...a),q=r=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...(r||[0,0,0])));
export function buildArchitecture(definition,atlas,fontData,config){
 const font=new Font(fontData),cells=new Map(),resources=new Set(),plans=new Map(),structuralTypes=new Map(),dynamic=[];
 const wearTextures=makeWearResources(resources),paper=paperTexture();resources.add(paper);
 let glyphCount=0,wearCount=0,textStructureCount=0;
 function writtenStructure(room,text,position,rotation,size,width){
  if(!plans.has(text))plans.set(text,letterPlan(font,text));
  if(!structuralTypes.has(room)){const types=new Typesetter(atlas,config);types.limit=atlas.mobile?24000:48000;structuralTypes.set(room,types);}
  const types=structuralTypes.get(room);textStructureCount++;
  if(size<1){
   types.text(text.toLowerCase()+' / '+text.toLowerCase(),position.clone().add(new THREE.Vector3(-(width||2)/2,0,0).applyQuaternion(rotation)),size*1.4,rotation,width||3,.95);
  }else{
   writeStructure(types,plans.get(text),position,rotation,size,width,config.extrusion,config.customText||definition.texts.cathedral||Object.values(definition.texts)[0],textStructureCount);
  }
 }
 for(const spec of definition.rooms){const scene=new THREE.Scene();scene.background=paper;const root=new THREE.Group();root.scale.setScalar(config.scale);scene.add(root,new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(-5,15,16);scene.add(light);const types=new Typesetter(atlas,config),cell={scene,root,spec,types,wear:new PageWear(wearTextures),portals:[],dynamic:[]};cells.set(spec.id,cell);
 const budget=types.limit,quota=Math.floor(budget/Math.max(8,spec.structures.length));
 for(const s of spec.structures){types.limit=Math.min(budget,types.records.length+quota);types.variant=({wall:2,stairs:1,shaft:2,ring:1,anamorph:3})[s.kind]||0;const origin=v(s.position),rotation=q(s.rotation),text=config.customText&&(s.kind==='paragraph'||s.kind==='dissolve')?config.customText:definition.texts[s.text]||s.text||definition.texts.manuscript||Object.values(definition.texts)[0],apply=point=>point.applyQuaternion(rotation).add(origin);
  if(s.kind==='paragraph'||s.kind==='wall'){types.paragraph(text,origin,s.width,s.height,rotation,s.kind==='wall'?.28:.25,s.kind==='wall'?.82:1);cell.wear.surface(origin,rotation,s.width,s.height);}
  if(s.kind==='bridge'){const plane=rotation.clone().multiply(q([-Math.PI/2,0,0]));types.paragraph(text,origin,s.width,s.height,plane,.22,1);cell.wear.surface(origin,plane,s.width,s.height);types.paragraph(text,origin.clone().add(new THREE.Vector3(0,-.24,0).applyQuaternion(rotation)),s.width,s.height,plane,.22,.26);}
  if(s.kind==='stairs'){for(let i=0;i<s.steps;i++){const word=['READ','RISE','STEP','AGAIN'][i%4],pos=apply(new THREE.Vector3(0,i*s.rise,-i*s.run)),face=rotation.clone().multiply(q([-Math.PI/2,0,0]));writtenStructure(spec.id,word,pos,face,.52,s.width);const riser=apply(new THREE.Vector3(-s.width/2,i*s.rise-.2,-i*s.run+.18));types.paragraph(text,riser,s.width,.24,rotation,.12,.92);types.text(`${i+1} / ${word}`,apply(new THREE.Vector3(s.width/2+.1,i*s.rise,-i*s.run)),.15,rotation,2,.75);}const height=s.steps*s.rise,run=s.steps*s.run;for(const x of [-s.width/2,s.width/2]){const angle=Math.atan2(height,run),railQ=rotation.clone().multiply(q([0,Math.PI/2,angle]));types.text('every sentence is a way of crossing the empty space',apply(new THREE.Vector3(x,-.15,.2)),.23,railQ,run*1.1,.65);}}
  if(s.kind==='column'||s.kind==='shaft'){const direction=s.kind==='shaft'?-1:1,chars=Array.from(text),rows=Math.ceil(s.height/(.22/config.density)),around=Math.ceil(s.radius*28*config.density);for(let y=0;y<rows;y++)for(let j=0;j<around;j++){const angle=j/around*Math.PI*2+y*.027,local=new THREE.Vector3(Math.sin(angle)*s.radius,direction*y*.22/config.density,Math.cos(angle)*s.radius),face=rotation.clone().multiply(q([0,angle,0]));types.glyph(chars[(j+y*around)%chars.length],apply(local),.22,face,.86);}for(let y=0;y<s.height;y+=2.7){writtenStructure(spec.id,'O',apply(new THREE.Vector3(0,direction*y,0)),rotation.clone().multiply(q([-Math.PI/2,0,0])),s.radius*1.7);}}
  if(s.kind==='monument')writtenStructure(spec.id,s.letter,origin,rotation,s.size);
  if(s.kind==='ring'){const line='THE SENTENCE RETURNS / СЛОВА ВОЗВРАЩАЮТСЯ / ',chars=Array.from(line.repeat(4)),radius=s.radius;for(let i=0;i<chars.length;i++){const angle=i/chars.length*Math.PI*2,point=apply(new THREE.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius)),face=rotation.clone().multiply(q([-Math.PI/2,0,-angle]));types.glyph(chars[i],point,.4,face,1);}for(let ring=1;ring<=config.complexity;ring++){const count=120,r=radius+ring*.26;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2;types.glyph(chars[i%chars.length],apply(new THREE.Vector3(Math.sin(angle)*r,.1*ring,Math.cos(angle)*r)),.19,rotation.clone().multiply(q([-Math.PI/2,0,-angle])),.62);}}}
  if(s.kind==='anamorph'){const eye=s.eye?v(s.eye):apply(new THREE.Vector3(1.3,0,0)),localEye=eye.clone().sub(origin).applyQuaternion(rotation.clone().invert()),label=s.text||text,step=s.width/label.length;for(let i=0;i<label.length;i++){const point=apply(new THREE.Vector3(-s.width/2+i*step,.6,-7)),distance=3.5+(i%5)*1.2,ratio=distance/Math.max(.1,localEye.z+7);point.sub(eye).multiplyScalar(ratio).add(eye);types.glyph(label[i],point,step*1.5*ratio,rotation,1);}}
  if(s.kind==='dissolve'){const moving=new Typesetter(atlas,config);moving.paragraph(text,new THREE.Vector3(-s.width/2,0,0),s.width,s.height,new THREE.Quaternion(),.24,1);const mesh=glyphBatch(atlas,moving.records,config),group=new THREE.Group();group.position.copy(origin);group.add(mesh);root.add(group);const data={group,mesh,origin:origin.clone(),destination:v(s.assembledPosition||[origin.x,origin.y-2.7,origin.z]),rotation:s.assembledRotation||[-Math.PI/2,0,0],baseRotation:s.rotation||[0,0,0],trigger:s.trigger||{axis:'z',start:origin.z+3,end:origin.z-5},kind:'dissolve',room:spec.id};dynamic.push(data);cell.dynamic.push(data);glyphCount+=moving.records.length;resources.add(mesh.geometry);resources.add(mesh.material);resources.add(mesh);}
 }
 types.limit=budget;
 // Selected galleries repeat into negative space; they are real, bounded geometry.
 if(spec.repeatGallery)for(let i=0;i<config.complexity*2;i++){const z=-20-i*8;types.paragraph(definition.texts.library||Object.values(definition.texts)[0],new THREE.Vector3(-5,0,z),10,8,new THREE.Quaternion(),.22,.55-i*.04);writtenStructure(spec.id,'O',new THREE.Vector3(0,4,z),new THREE.Quaternion(),10);}
 const batch=glyphBatch(atlas,types.records,config);root.add(batch);resources.add(batch.geometry);resources.add(batch.material);resources.add(batch);cell.batch=batch;glyphCount+=types.records.length;delete cell.types;
 }
 // Word-built letter arches retain an empty counter for the registered portal.
 for(const portal of definition.portals)for(const reverse of [false,true]){const room=reverse?portal.to:portal.from,position=reverse?portal.destination:portal.position,rotation=reverse?portal.destinationRotation:portal.rotation;writtenStructure(room,portal.letter||'O',v(position),q(rotation),8.7);const cell=cells.get(room),label=new Typesetter(atlas,config),quat=q(rotation);label.text(reverse?'THE PREVIOUS PAGE':'THE ROOM INSIDE THE LETTER',v(position).add(new THREE.Vector3(-2.1,4.9,.12).applyQuaternion(quat)),.24,quat,6,.9);const mesh=glyphBatch(atlas,label.records,config);cell.root.add(mesh);resources.add(mesh.geometry);resources.add(mesh.material);resources.add(mesh);glyphCount+=label.records.length;}
 for(const [room,types] of structuralTypes){const mesh=glyphBatch(atlas,types.records,config);mesh.name='Architecture written entirely in words';cells.get(room).root.add(mesh);resources.add(mesh);resources.add(mesh.geometry);resources.add(mesh.material);glyphCount+=types.records.length;}
 for(const cell of cells.values())wearCount+=cell.wear.build(cell.root,resources);
 return {cells,dynamic,glyphCount,solidCount:0,textStructureCount,markCount:0,wearCount,dispose(){for(const resource of resources){resource.dispose();if(resource.isTexture&&resource.image?.getContext)resource.image.width=resource.image.height=1;}resources.clear();for(const cell of cells.values())cell.scene.clear();cells.clear();}};
}
