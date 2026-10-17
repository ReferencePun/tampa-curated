// The same bounded Gray–Scott update is used by the CPU and WebGL solvers.
export const DEFAULTS = Object.freeze({mode:'organic',diffusionU:1,diffusionV:.5,feed:.036,kill:.06,concentration:.8,speed:12,ink:'#393730',influence:.8,radius:12,resolution:'384',guides:true,seed:7});
export const RECIPES = Object.freeze({
 branches:{name:'01 / Root & branch',settings:{...DEFAULTS}},
 islands:{name:'02 / Charcoal islands',settings:{...DEFAULTS,feed:.026,kill:.061,speed:16,ink:'#484844',seed:19}},
 lace:{name:'03 / Sepia lace',settings:{...DEFAULTS,feed:.042,kill:.059,diffusionV:.48,ink:'#755443',seed:31}},
 architecture:{name:'04 / The growing observatory',settings:{...DEFAULTS,mode:'architecture',feed:.028,kill:.054,influence:.9,ink:'#414943',speed:16}},
 image:{name:'05 / A heron, remembered',settings:{...DEFAULTS,mode:'image',feed:.03,kill:.055,influence:.85,ink:'#5e5044',speed:18}}
});
export function options(value={}){
 const out={...DEFAULTS,...value};
 const bounds={diffusionU:[.4,1.2],diffusionV:[.15,.65],feed:[.01,.07],kill:[.035,.075],concentration:[.2,1],speed:[1,24],influence:[0,1],radius:[3,40],seed:[1,999]};
 for(const [key,[lo,hi]] of Object.entries(bounds))if(!Number.isFinite(out[key])||out[key]<lo||out[key]>hi)throw new Error(`Invalid ${key}: expected ${lo}–${hi}.`);
 if(!['organic','architecture','image'].includes(out.mode)||!['192','256','384','512'].includes(String(out.resolution))||!/^#[0-9a-f]{6}$/i.test(out.ink)||typeof out.guides!=='boolean')throw new Error('Invalid ink settings.');
 out.resolution=String(out.resolution);return out;
}
export const clamp=value=>Math.max(0,Math.min(1,value));
export function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function blankState(width,height){const data=new Float32Array(width*height*4);for(let i=0;i<data.length;i+=4)data[i]=1;return data;}
export function validateMask(mask,width,height){if(!(mask instanceof Uint8Array)||mask.length!==width*height*4)throw new Error('Mask must be an RGBA Uint8Array matching the simulation size.');return mask;}
export function brushes(input){return input.slice(0,24).map(p=>{if(![p.x,p.y,p.radius,p.amount].every(Number.isFinite)||p.radius<=0)throw new Error('Brush inputs need finite x, y, radius and amount.');return {x:clamp(p.x),y:clamp(p.y),radius:Math.max(.001,Math.min(.2,p.radius)),amount:clamp(p.amount)};});}
export function stamp(state,width,height,points){
 for(const p of brushes(points)){
  const cx=p.x*width-.5,cy=p.y*height-.5,r=p.radius*width;
  for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(height-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(width-1,Math.ceil(cx+r));x++){
   const t=Math.hypot(x-cx,y-cy)/r;if(t>=1)continue;const falloff=1-Math.max(0,Math.min(1,(t-.65)/.35)),a=falloff*falloff*(3-2*falloff)*p.amount,i=(y*width+x)*4;
   state[i]=Math.min(state[i],1-a*.65);state[i+1]=Math.max(state[i+1],a*.55);state[i+3]=Math.max(state[i+3],a*.6);
  }
 }
}
export function seedPoints(settings,mask,width,height){
 const rng=random(settings.seed),points=[];
 if(settings.mode==='organic'){
  for(const [x,y,r] of [[.34,.43,.027],[.6,.62,.022],[.65,.31,.014]])for(let j=0;j<4;j++)points.push({x:x+(rng()-.5)*.08,y:y+(rng()-.5)*.1,radius:r*(.7+rng()*.6),amount:settings.concentration});
 }else{
  // Sparse origins selected from the mask; the intervening drawing is unseeded.
  const candidates=[];for(let i=0;i<width*height;i++)if(mask[i*4+1]>90)candidates.push(i);
  for(let j=0;j<8&&candidates.length;j++){const i=candidates[Math.floor(rng()*candidates.length)];points.push({x:(i%width+.5)/width,y:(Math.floor(i/width)+.5)/height,radius:.022,amount:settings.concentration});}
 }
 return points;
}
export function createCPU(width,height,settings=DEFAULTS){
 let current=blankState(width,height),next=blankState(width,height),mask=new Uint8Array(width*height*4),config=options(settings),disposed=false,steps=0;
 const offsets=[[-1,0,.2],[1,0,.2],[0,-1,.2],[0,1,.2],[-1,-1,.05],[1,-1,.05],[-1,1,.05],[1,1,.05]];
 function step(count=1){
  if(disposed)throw new Error('Ink engine is disposed.');
  const s=config,structure=s.mode==='organic'?0:s.influence;
  for(let k=0;k<count;k++){
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,u=current[i],v=current[i+1],affinity=mask[i]/255;
    let lu=-u,lv=-v;for(const [dx,dy,weight]of offsets){const n=(Math.min(height-1,Math.max(0,y+dy))*width+Math.min(width-1,Math.max(0,x+dx)))*4;lu+=current[n]*weight;lv+=current[n+1]*weight;}
    const feed=s.feed+structure*(affinity-.5)*.008,kill=s.kill+structure*((1-affinity)*(s.mode==='architecture'?.035:.012)-affinity*.006),reaction=u*v*v;
    next[i]=clamp(u+(s.diffusionU*lu-reaction+feed*(1-u))*.8);
    next[i+1]=clamp(v+(s.diffusionV*lv+reaction-(feed+kill)*v)*.8);
    next[i+2]=clamp(current[i+2]+Math.max(0,v-.12)*.0008);
    next[i+3]=Math.max(current[i+3],clamp((v-.015)*4));
   }
   [current,next]=[next,current];steps++;
  }
 }
 return {backend:'CPU',width,height,step,get steps(){return steps;},update(value){config=options(value);},setMask(value){mask=validateMask(value,width,height).slice();},brush(points){stamp(current,width,height,points);},reset(data=blankState(width,height)){if(data.length!==current.length)throw new Error('Incorrect state size.');current.set(data);steps=0;},read:()=>current.slice(),get state(){return current;},get mask(){return mask;},dispose(){disposed=true;current=next=new Float32Array();mask=new Uint8Array();}};
}
