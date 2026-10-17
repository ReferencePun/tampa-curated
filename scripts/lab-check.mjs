import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {registry,bundle,labRoot} from './lab-package.mjs';
import {defaults,createPreset,readPreset} from '../src/creative-lab/shared/presets.js';
const experiments=await registry(),checked=new Set();
for(const experiment of experiments){
 const {files}=await bundle(experiment.slug);
 assert.deepEqual(JSON.parse(await readFile(path.join(labRoot,'experiments',experiment.slug,'config.json'),'utf8')),defaults(experiment),'Config defaults match the inspector');
 for(const required of ['entry','thumbnail','readme'])assert.ok(files[`creative-lab/experiments/${experiment.slug}/${experiment[required]}`]);
 for(const file of Object.keys(files).filter(file=>file.startsWith('creative-lab/')&&file.endsWith('.js'))){
  if(checked.has(file))continue;checked.add(file);
  execFileSync(process.execPath,['--check',path.join(labRoot,file.replace(/^creative-lab\//,''))],{stdio:'pipe'});
 }
 const preset=createPreset(experiment,defaults(experiment),'Test round trip');assert.deepEqual(readPreset(experiment,JSON.stringify(preset)).settings,preset.settings);
 assert.throws(()=>readPreset(experiment,{...preset,schemaVersion:999}));assert.throws(()=>readPreset(experiment,{...preset,experiment:'unrelated-study'}));
 assert.throws(()=>readPreset(experiment,{...preset,settings:{...preset.settings,density:100000}}));
 assert.throws(()=>readPreset(experiment,{...preset,settings:{...preset.settings,guides:'yes'}}));
 assert.throws(()=>readPreset(experiment,{...preset,settings:{...preset.settings,guides:null}}));
 assert.throws(()=>readPreset(experiment,{...preset,settings:{...preset.settings,ink:'url(evil)'}}));
 assert.throws(()=>readPreset(experiment,{...preset,settings:{...preset.settings,unknown:true}}));
}
for(const slug of ['draw-a-world','impossible-rooms','folding-paper','living-ink','particle-photos','time-machine','photo-portals','living-city','site-memory','spatial-sound','personal-zines','world-composer'])assert.ok(experiments.some(e=>e.slug===slug),`The future concept ${slug} has its own registry entry`);
assert.ok(experiments.filter(e=>!e.placeholder).length>=2,'Working reference studies exercise the system');
console.log(`Lab lint: ${experiments.length} manifests, source/import closure, local asset/license inclusion, ${checked.size} JavaScript modules, defaults, and preset validation passed.`);
