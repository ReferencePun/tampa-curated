import assert from 'node:assert/strict';
import {Vector3,Matrix4,Quaternion} from 'three';
import {readFile} from 'node:fs/promises';
import {createFoldingRig} from '../src/creative-lab/experiments/folding-paper/engine.js';
import {DEFAULTS,createComposition} from '../src/creative-lab/experiments/folding-paper/compositions.js';
import {cameraPose} from '../src/creative-lab/experiments/folding-paper/camera.js';
import {createPreset,readPreset} from '../src/creative-lab/shared/presets.js';
const signatures=[];
for(const version of ['architecture','machine','city']){
 const definition=createComposition({version}),rig=createFoldingRig(definition),initial=rig.pose(),objects=[],materials=new Set(),geometry=new Set();
 rig.root.traverse(object=>{if(object.geometry){objects.push(object);geometry.add(object.geometry);}if(object.material)materials.add(object.material);});
 for(const object of objects){const positions=object.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){const point=new Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);assert.ok(Math.abs(point.y)<.06,`${version}: initial drawing is flat`);}}
 const opacities=[...materials].map(m=>m.opacity),snapshots=new Map();
 for(const p of [0,.12,.27,.46,.6,.72,1]){
  rig.setProgress(p);snapshots.set(p,rig.pose());
  for(const {anchor,hinge,spec} of rig.panels.values()){
   assert.ok(hinge.matrixWorld.elements.every(Number.isFinite));
   const parent=spec.parent?rig.panels.get(spec.parent).hinge:rig.root;
   const expected=new Vector3(...spec.pivot).applyMatrix4(parent.matrixWorld),actual=new Vector3().setFromMatrixPosition(anchor.matrixWorld);
   assert.ok(actual.distanceTo(expected)<1e-10,'Child hinges remain attached to their moving parents');
  }
 }
 assert.notDeepEqual(snapshots.get(.27),initial);assert.notDeepEqual(snapshots.get(.46),snapshots.get(.72));assert.deepEqual(snapshots.get(.72),snapshots.get(1),'The camera enters only after assembly completes');
 for(const p of [1,.72,.6,.46,.27,.12,0]){rig.setProgress(p);assert.deepEqual(rig.pose(),snapshots.get(p),'Reversing produces the exact earlier world matrices');}
 assert.deepEqual([...materials].map(m=>m.opacity),opacities,'Progress never crossfades surfaces');
 for(const object of objects)assert.ok(geometry.has(object.geometry),'No frame swaps or replacement geometry');
 rig.setProgress(.72);assert.ok(rig.bounds().max.y>7);
 if(version==='architecture'){
  const length=Math.hypot(5.5,3.7),a=new Vector3(0,length,0).applyMatrix4(rig.panels.get('south-roof').hinge.matrixWorld),b=new Vector3(0,length,0).applyMatrix4(rig.panels.get('north-roof').hinge.matrixWorld);
  assert.ok(a.distanceTo(b)<1e-9,'Two linked roof planes meet at the same ridge');assert.ok(Math.abs(a.y-11.3)<1e-9);
  assert.ok(definition.panels.filter(p=>p.holes?.length).length>=4,'The windows and doorway are actual mesh openings');
 }
 let prior;
 for(let i=0;i<=300;i++){const pose=cameraPose(definition,i/300),q=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(pose.position,pose.target,pose.up));if(prior)assert.ok(prior.angleTo(q)<.1,'Camera orientation must remain smooth');prior=q;assert.deepEqual(cameraPose(definition,i/300).position.toArray(),pose.position.toArray());}
 signatures.push(JSON.stringify(rig.pose()));assert.ok(rig.primitives<10000&&objects.length<200);
 rig.setAppearance({transparency:.9,guides:false});rig.root.traverse(o=>{if(o.isMesh)assert.ok(Math.abs(o.material.opacity-.1)<1e-9);if(o.name.endsWith(':guide'))assert.equal(o.visible,false);});
 let disposals=0;for(const g of geometry)g.addEventListener('dispose',()=>disposals++);rig.dispose();rig.dispose();assert.equal(disposals,geometry.size);assert.equal(rig.root.children.length,0);
}
assert.equal(new Set(signatures).size,3);
const base=createComposition(),bad=structuredClone(base);bad.panels[1].parent=bad.panels[1].id;assert.throws(()=>createFoldingRig(bad),/acyclic/);
for(const patch of [{pivot:[NaN,0,0]},{stage:[.5,.4]},{axis:[0,0,0]},{parent:'absent'}]){const d=structuredClone(base);Object.assign(d.panels[1],patch);assert.throws(()=>createFoldingRig(d));}
const manifest=JSON.parse(await readFile('src/creative-lab/experiments/folding-paper/manifest.json','utf8'));
const preset=createPreset(manifest,{...DEFAULTS,version:'city',progress:46.7},'Fold held');assert.deepEqual(readPreset(manifest,JSON.stringify(preset)).settings,preset.settings);
for(const progress of [-1,101,NaN,'50'])assert.throws(()=>readPreset(manifest,{...preset,settings:{...preset.settings,progress}}));
console.log('Folding Paper: flat sheet, genuine intermediate geometry, inherited pivots, meeting roof planes, identical reverse poses, unchanged geometry/material identities, camera continuity, three compositions, validation and disposal passed.');
