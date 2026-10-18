import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULTS,sampleTransition,reliefPoint,sampleDepth,validateRegistration,options} from '../src/creative-lab/experiments/photo-portals/transition.js';
import {createPhotoRelief} from '../src/creative-lab/experiments/photo-portals/scene.js';
const states=Array.from({length:101},(_,p)=>sampleTransition(p,1.5,1.4,DEFAULTS));
assert.equal(sampleTransition(0,1.5,.5,DEFAULTS).z,states[0].z,'Responsive FOV preserves the poster capture viewpoint');assert.ok(states[0].z>0);assert.equal(states[0].emerge,0);assert.ok(states[100].z<0);assert.equal(states[100].emerge,1);
for(let i=1;i<states.length;i++){assert.ok(states[i].z<=states[i-1].z);assert.ok(states[i].emerge>=states[i-1].emerge);}
for(let p=100;p>=0;p--)assert.deepEqual(sampleTransition(p,1.5,1.4,DEFAULTS),states[p],'Reversal is exact, independent of prior samples');
const full=states[100],near=reliefPoint(.7,.6,1,full,1.5),far=reliefPoint(.7,.6,0,full,1.5);
assert.ok(near[2]>far[2]);assert.ok(full.z>near[2],'Final camera remains in front of estimated surface');
assert.ok(Math.abs(near[0]/(full.startZ-near[2])-far[0]/(full.startZ-far[2]))<1e-10,'Different depths register to the same original eye ray');
assert.notEqual(near[0]/(full.z-near[2]),far[0]/(full.z-far[2]),'Travel produces real differential parallax');
const map={width:2,height:2,data:new Float32Array([0,1,.2,.8])};assert.equal(sampleDepth(map,0,1),0);assert.equal(sampleDepth(map,1,1),1);assert.ok(Math.abs(sampleDepth(map,.5,.5)-.5)<1e-7);
const texture=new THREE.Texture({width:1800,height:1200}),relief=createPhotoRelief(texture,map,1.5,'medium');
relief.update(states[0],DEFAULTS);const original=Array.from(relief.geometry.attributes.position.array);assert.ok(original.filter((_,i)=>i%3===2).every(v=>v===0));
relief.update(full,DEFAULTS);const inside=Array.from(relief.geometry.attributes.position.array);assert.notDeepEqual(inside,original);relief.update(states[0],DEFAULTS);assert.deepEqual(Array.from(relief.geometry.attributes.position.array),original);relief.update(full,{...DEFAULTS,depth:0});const flat=relief.geometry.attributes.position.array;assert.ok(flat.filter((_,i)=>i%3===2).every(v=>Math.abs(v+12)<1e-6));relief.dispose();texture.dispose();
assert.throws(()=>validateRegistration({scale:0}));assert.throws(()=>validateRegistration({position:[0,NaN,0]}));assert.deepEqual(validateRegistration({scale:2,position:[1,2,-7]}).position,[1,2,-7]);assert.equal(options({depth:99}).depth,2.5);
console.log('Photo Portals: reversible camera/mesh, plane crossing, projective ray registration, true parallax, depth sampling, flat-depth fallback and alignment validation passed.');
