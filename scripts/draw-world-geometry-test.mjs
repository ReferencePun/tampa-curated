import assert from 'node:assert/strict';
import {Quaternion,Matrix4} from 'three';
import {readFile} from 'node:fs/promises';
import {DEFAULTS,EXAMPLES,simplifyStroke,importPath,exportPath} from '../src/creative-lab/experiments/draw-a-world/path.js';
import {generateEnvironment,cameraPose} from '../src/creative-lab/experiments/draw-a-world/geometry.js';
import {createPreset,readPreset} from '../src/creative-lab/shared/presets.js';
const manifest=JSON.parse(await readFile('src/creative-lab/experiments/draw-a-world/manifest.json','utf8'));
const scenes=[];
for(const [name,path] of Object.entries(EXAMPLES)){
 const model=generateEnvironment(path,{style:name==='spiral'?'staircase':'corridor'});scenes.push(model);
 assert.ok(model.length>50);assert.ok(model.primitives<10000);
 for(const object of model.group.children){const position=object.geometry.getAttribute('position');assert.ok([...position.array].every(Number.isFinite));}
 let previous=null;
 for(let i=0;i<=300;i++){
  const t=i/300,pose=cameraPose(model,t),center=model.curve.getPointAt(t);
  assert.ok(Math.abs(pose.position.x-center.x)<1e-9&&Math.abs(pose.position.z-center.z)<1e-9,'Camera follows the actual generated curve');
  assert.ok(Math.abs(pose.position.y-center.y-2.55)<1e-9);
  const orientation=new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(pose.position,pose.target,pose.up));
  if(previous)assert.ok(previous.angleTo(orientation)<.2,`${name}: orientation must be smooth`);previous=orientation;
  assert.deepEqual(cameraPose(model,t).position.toArray(),pose.position.toArray(),'Reversing travel is deterministic');
 }
 if(name==='spiral')assert.ok(cameraPose(model,1).position.y-cameraPose(model,0).position.y>10,'Spiral is genuinely helical');
 assert.deepEqual(importPath(exportPath(path)),path);
}
assert.equal(new Set(scenes.map(m=>m.signature)).size,3);assert.equal(new Set(scenes.map(m=>m.length.toFixed(2))).size,3);
const vault=generateEnvironment(EXAMPLES.bend,{style:'vault'});assert.ok(vault.primitives>scenes[1].primitives);scenes.push(vault);
const width=generateEnvironment(EXAMPLES.straight,{width:9}),density=generateEnvironment(EXAMPLES.straight,{density:70}),guides=generateEnvironment(EXAMPLES.straight,{guides:false});scenes.push(width,density,guides);
assert.notDeepEqual(width.bounds,scenes[0].bounds);assert.ok(density.primitives>scenes[0].primitives);assert.equal(guides.group.getObjectByName('guides').geometry.getAttribute('position').count,0);
assert.throws(()=>generateEnvironment([[.1,.1],[.9,.9],[.1,.9],[.9,.1]],{smoothing:0}),/bends|Crossings/);
for(const path of [[],[[.2,.2]],[[.2,.2],[.201,.201]],[[NaN,.2],[.9,.5]],[[.2,.2],[1.1,.5]]])assert.throws(()=>generateEnvironment(path));
assert.throws(()=>generateEnvironment(EXAMPLES.straight,{density:Infinity}));
assert.ok(simplifyStroke(Array.from({length:3000},(_,i)=>[.1+i/4000,.5])).length<=41);
const saved=createPreset(manifest,{...DEFAULTS,path:EXAMPLES.spiral},'Actual path');assert.deepEqual(readPreset(manifest,JSON.stringify(saved)).settings.path,EXAMPLES.spiral);
for(const path of [null,[[.1,.2]],[[2,.2],[.3,.4]],Array(97).fill([.1,.2]),[['.1',.2],[.3,.4]]])assert.throws(()=>readPreset(manifest,{...saved,settings:{...saved.settings,path}}));
for(const model of scenes){let disposed=0;const count=model.group.children.length;for(const object of model.group.children)object.geometry.addEventListener('dispose',()=>disposed++);model.dispose();model.dispose();assert.equal(disposed,count);assert.equal(model.group.children.length,0);}
console.log('Draw a World geometry: distinct real paths, bounded geometry, smooth upright camera, reverse sampling, helical rise, styles, parameters, input validation, preset/path round trips, and disposal passed.');
