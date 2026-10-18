import assert from 'node:assert/strict';
import {DEFAULTS,options,samplePixels,frameState,advance,particlePose,fitImage} from '../src/creative-lab/experiments/particle-photos/model.js';
import {RevealWake,resolvedField} from '../src/creative-lab/experiments/particle-photos/wake.js';
const width=120,height=80,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=x*255/(width-1);data[i+1]=y*255/(height-1);data[i+2]=x<60?30:220;data[i+3]=255;}
const sample=samplePixels({data,width,height}),same=samplePixels({data,width,height}),other=samplePixels({data,width,height},19);assert.deepEqual(sample.attributes,same.attributes);assert.notDeepEqual(sample.attributes,other.attributes);assert.equal(sample.count,width*height);assert.ok(sample.attributes.every(Number.isFinite));
const dark=sample.attributes[2],light=sample.attributes[(sample.count-1)*10+2];assert.ok(light-dark>.8,'Luminance really follows the supplied photograph');assert.ok(sample.attributes[(40*width+59)*10+3]>.1,'Image boundary supplies a structural edge');
const view=[20,30,900,600],base=frameState(),rest=particlePose(sample,4000,base,DEFAULTS,view),i=4000*10;assert.equal(rest.x,20+sample.attributes[i]*900);assert.equal(rest.y,30+sample.attributes[i+1]*600);
const dispersed=particlePose(sample,4000,{...base,scatter:1},DEFAULTS,view);assert.ok(Math.hypot(rest.x-dispersed.x,rest.y-dispersed.y)>100,'Scatter changes individual geometry');
const focus={...base,x:sample.attributes[i]-.055,y:sample.attributes[i+1],active:1};const moved=particlePose(sample,4000,focus,DEFAULTS,view),stronger=particlePose(sample,4000,focus,{...DEFAULTS,displacement:100},view);assert.notEqual(moved.x,rest.x);assert.ok(Math.abs(stronger.x-rest.x)>Math.abs(moved.x-rest.x));
assert.deepEqual(particlePose(sample,4000,{...focus,active:0,scatter:0},DEFAULTS,view),rest,'Exit returns exactly to the immutable anchor');
const original=particlePose(sample,4000,{...focus,scatter:1,original:1},DEFAULTS,view);assert.equal(original.x,rest.x);assert.equal(original.y,rest.y,'Original mode reconstructs source coordinates');
const state=frameState(),target={...state,active:1,scatter:1};let previous=0;for(let j=0;j<400;j++){advance(state,target,1/60);assert.ok(state.scatter>=previous&&state.scatter<=1);previous=state.scatter;}assert.equal(state.scatter,1);assert.equal(advance(state,target,1/60),false);target.active=target.scatter=0;for(let j=0;j<400;j++)advance(state,target,1/60);assert.equal(state.scatter,0);assert.equal(state.active,0);
for(const [w,h,ratio]of [[300,500,.66],[1200,400,3],[390,300,1.5],[600,600,.1]]){const [x,y,iw,ih]=fitImage(w,h,ratio);assert.ok(x>=0&&y>=0&&x+iw<=w&&y+ih<=h);assert.ok(Math.abs(iw/ih-ratio)<1e-8);}
assert.throws(()=>options({density:10000}));assert.throws(()=>options({radius:NaN}));assert.throws(()=>samplePixels({data:new Uint8Array(16),width:500,height:500}));
const wake=new RevealWake();wake.point(.2,.5,null,1.5,15);wake.point(.8,.5,[.2,.5],1.5,15);
for(let i=0;i<10;i++)wake.advance(1/60,DEFAULTS.trail);
assert.ok(wake.sample(.5,.5)>.85,'A fast sweep leaves a connected, almost clear photographic wake');
assert.ok(wake.sample(.8,.5)>.97,'The active center becomes fully photographic');
assert.equal(wake.sample(.5,.1),0,'The reveal stays local');
for(let i=0;i<20;i++)wake.advance(1/60,DEFAULTS.trail);
assert.equal(wake.sample(.8,.5),1,'A held cursor fully resolves the original image');
// The wide spatial feather must retain many intermediate materials, rather than
// thresholding a mostly binary hole in the grains.
const feather=Array.from({length:40},(_,i)=>resolvedField(wake.sample(.8,.5+i*.005)));
assert.ok(new Set(feather.filter(v=>v>.1&&v<.9)).size>=9,'Broad feather blends clear photo continuously into grains');
wake.leave();const fade=[];
for(let i=0;i<170;i++){wake.advance(1/60,DEFAULTS.trail);if(i%8===0)fade.push(wake.sample(.8,.5));}
assert.ok(fade.every((v,i)=>!i||v<=fade[i-1]),'Coverage returns monotonically after leaving');
assert.ok(fade.filter(v=>v>.15&&v<.85).length>=5,'The wake spends time visibly half-covered instead of switching abruptly');
assert.ok(wake.data.every(v=>v===0),'Every point returns exactly to its initial material');
assert.equal(wake.moving,false,'Both material and motion stop at rest');
wake.point(.5,.5,null,1.5,15,true);assert.equal(wake.sample(.5,.5),1);wake.leave(true);assert.ok(wake.data.every(v=>v===0),'Reduced-motion exit is immediate');
wake.point(.5,.5,null,1.5,15);for(let i=0;i<20;i++)wake.advance(1/60,DEFAULTS.trail);assert.deepEqual(wake.flow(.61,.5),[0,0],'A stationary hover does not emit repeating circular waves');wake.dispose();
const {PointerRipples,FLOW_TAIL,FLOW_RANGE}=await import('../src/creative-lab/experiments/particle-photos/flow.js');
const ripple=new PointerRipples();ripple.stroke([.25,.5],[.55,.5],1.5,.15);
const above=ripple.sample(.4,.43),below=ripple.sample(.4,.57);
assert.ok(above[1]<-.005&&below[1]>.005,'Particles on opposite sides of the stroke spread apart, not translate as one sheet');
assert.ok(Math.abs(above[1]+below[1])<1e-8,'The initial wake has no shared translational jiggle');
assert.deepEqual(ripple.sample(.8,.55),[0,0],'The distant image does not move immediately with the pointer');
for(let i=0;i<12;i++)ripple.advance(1/60);
assert.ok(ripple.sample(.4,.43)[1]>.003,'A passing crest reverses the local slope into a compression trough');
for(let i=0;i<12;i++)ripple.advance(1/60);
assert.ok(ripple.sample(.4,.7)[1]>.003,'A ripple travels beyond the original pointer path');
for(let i=0;i<24;i++)ripple.advance(1/60);
assert.ok(Math.hypot(...ripple.sample(.8,.55))>.0003,'The moving ripple reaches across the image after propagation');
assert.ok(ripple.height.every(Number.isFinite),'Wave integration remains finite');
const curved=new PointerRipples();curved.stroke([.2,.3],[.5,.3],1,.15);curved.stroke([.5,.3],[.5,.7],1,.15);
assert.ok(curved.sample(.44,.6)[0]<-.005&&curved.sample(.56,.6)[0]>.005,'Turning the pointer creates a wake along the new segment');
for(let i=0;i<Math.ceil(FLOW_TAIL*60)+1;i++)ripple.advance(1/60);
assert.deepEqual(ripple.sample(.8,.55),[0,0]);assert.equal(ripple.moving,false,'Ripples reach exact rest without an idle loop');
for(const aspect of [.25,1,4]){const f=new PointerRipples();for(let i=0;i<180;i++){f.stroke([.4,.5],[.6,.55],aspect,.45);f.advance(i%2?.1:1/120);assert.ok(f.height.every(Number.isFinite),'Repeated fast sweeps stay stable');assert.ok(Math.hypot(...f.sample(.5,.5))<=Math.sqrt(2)*FLOW_RANGE,'Particle displacement remains bounded');}f.dispose();}
ripple.dispose();curved.dispose();
console.log('Particle Photos: image sampling, continuous reveal, gradual recovery, opposing particle displacement, traveling ripple crests/troughs, curved pointer wakes and stable idle return passed.');
