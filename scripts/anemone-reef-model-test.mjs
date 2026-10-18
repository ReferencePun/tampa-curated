import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ReefField,DEFAULTS,PRESETS,options} from '../src/creative-lab/experiments/anemone-reef/model.js';
const a=new ReefField(),b=new ReefField();assert.deepEqual(a.stems,b.stems);assert.equal(a.stems.length,DEFAULTS.density);
a.project((x,_y,z)=>[x/20+.5,z/14+.5]);b.project((x,_y,z)=>[x/20+.5,z/14+.5]);
const root=a.stems[14];a.point(root.sx+.04,root.sy+.01,true);a.settleInput();const touched=a.stems.filter(s=>Math.hypot(s.dx,s.dz)>.015);assert.ok(touched.length>0&&touched.length<a.stems.length*.8,'Response is local');assert.ok(root.dx<0,'Brush moves away from the hand');
a.update({...DEFAULTS,mode:'follow'});a.settleInput();assert.ok(root.dx>0,'Follow reverses local force');
a.release();for(let i=0;i<600;i++)a.advance(1/60);assert.ok(a.stems.every(s=>Math.hypot(s.dx,s.dz)<.001),'The meadow recovers');assert.equal(a.pulses.length,0);
a.reset();b.reset();for(let i=0;i<120;i++)a.advance(1/120);for(let i=0;i<60;i++)b.advance(1/60);assert.deepEqual(a.stems,b.stems);
// Fast hover sweeps deposit a continuous directional wake, even between pointer events.
const sweep=new ReefField();sweep.project((x,_y,z)=>[x/20+.5,z/14+.5]);
sweep.point(.2,.5);sweep.point(.8,.5);sweep.settleInput();
const middle=sweep.stems.filter(s=>s.sx>.4&&s.sx<.6&&Math.abs(s.sy-.5)<.08);
assert.ok(middle.length>5&&middle.every(s=>s.wakeX>0),'A fast hover reaches the middle of the swept path');
const strength=middle.reduce((v,s)=>v+s.wakeX,0);sweep.release();sweep.advance(.1);
assert.ok(middle.reduce((v,s)=>v+s.wakeX,0)>strength*.8,'The swept pattern persists after the hand leaves');
for(let i=0;i<1800;i++)sweep.advance(1/60);
assert.ok(sweep.stems.every(s=>Math.hypot(s.wakeX,s.wakeY)<.001),'The wake gradually recovers');
sweep.point(.8,.5);sweep.point(.2,.5);assert.ok(middle.every(s=>s.wakeX<0),'Reversing the sweep reverses the pattern');
sweep.screenBasis=[0,-1,1,0];sweep.settleInput();assert.ok(middle.every(s=>s.dz>0),'The camera basis rotates pointer forces into world space');
sweep.dispose();
for(const p of Object.values(PRESETS)){assert.deepEqual(options(p.settings),p.settings);a.update(p.settings);assert.equal(a.stems.length,p.settings.density);}
assert.equal(options({density:100000}).density,560);assert.equal(options({palette:'url(x)'}).palette,DEFAULTS.palette);
const base='src/creative-lab/experiments/anemone-reef/';assert.deepEqual(JSON.parse(await readFile(base+'config.json')),DEFAULTS);const manifest=JSON.parse(await readFile(base+'manifest.json'));assert.deepEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])),DEFAULTS);
a.dispose();a.dispose();assert.equal(a.stems.length,0);console.log('Anemone reef: deterministic anatomy, local/reversible brush direction, recovery, bounded state, presets and disposal passed.');
