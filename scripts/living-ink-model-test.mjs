import assert from 'node:assert/strict';
import {createCPU,DEFAULTS,blankState,stamp,options,RECIPES} from '../src/creative-lab/experiments/living-ink/model.js';
const width=64,height=48,blank=blankState(width,height),state=blank.slice();stamp(state,width,height,[{x:.42,y:.5,radius:.085,amount:.9}]);
const diff=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
const mask=new Uint8Array(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=Math.abs(y-height/2)<4?255:0;mask[i]=mask[i+1]=mask[i+2]=v;mask[i+3]=255;}
function run(settings={},data=state,steps=350){const e=createCPU(width,height,{...DEFAULTS,...settings});e.setMask(mask);e.reset(data);e.step(steps);const result=e.read();e.dispose();assert.ok(result.every(n=>Number.isFinite(n)&&n>=0&&n<=1));return result;}
assert.deepEqual(run({},blank),blank,'Unseeded paper remains blank: no autonomous reveal');
const organic=run();assert.ok(diff(organic,state)>40,'The field genuinely evolves');
for(const [key,value]of Object.entries({diffusionU:.72,diffusionV:.3,feed:.026,kill:.068})){const changed=run({[key]:value});assert.ok(diff(organic,changed)>8,`${key} changes chemical concentrations`);}
const guided=run({mode:'architecture',influence:1}),unguided=run({mode:'architecture',influence:0});assert.ok(diff(guided,unguided)>40,'Architecture alters chemistry, not only display');
const picture=run({mode:'image',influence:1});assert.ok(diff(picture,organic)>20,'Image mask changes reaction rates');
assert.deepEqual(run({mode:'image'},blank),blank,'An untouched image remains hidden');
const seeded=state.slice();stamp(seeded,width,height,[{x:.7,y:.3,radius:.08,amount:.4}]);assert.ok(diff(run({},seeded),organic)>5,'Brush input changes the future state');
const e=createCPU(width,height);e.reset(state);e.step(100);const held=e.read();e.step(0);assert.deepEqual(e.read(),held);e.reset();assert.deepEqual(e.read(),blank);e.reset(state);e.step(350);assert.deepEqual(e.read(),organic,'Replay is deterministic');e.dispose();assert.throws(()=>e.step());
for(const recipe of Object.values(RECIPES))run(recipe.settings,state,600);
run({diffusionU:1.2,diffusionV:.65,feed:.07,kill:.075},state,800);
assert.throws(()=>options({feed:NaN}));assert.throws(()=>options({resolution:'4096'}));assert.throws(()=>options({mode:'unknown'}));
console.log('Living Ink: blank equilibrium, seeded evolution, four parameter divergences, mask-driven chemistry, image reveal gating, brush input, determinism, bounded recipes and disposal passed.');
