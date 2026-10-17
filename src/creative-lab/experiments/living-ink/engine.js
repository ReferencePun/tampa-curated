import {createCPU,options,blankState,seedPoints,stamp} from './model.js';
import {createGPU} from './gpu.js';

const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function paperView(width,height){const w=Math.min(width,height*1.5),h=w/1.5;return [(width-w)/2,(height-h)/2,w,h];}
// A canvas which failed WebGL allocation must be replaced before obtaining 2D.
// The caller owns attaching the returned canvas and scheduling simulation steps.
export function createInkEngine({canvas=document.createElement('canvas'),settings={},forceCPU=false}={}){
 let config=options(settings),width=Number(config.resolution),height=Math.round(width/1.5),solver,ctx,buffer,image,mask,disposed=false;
 if(!forceCPU){try{solver=createGPU(canvas,width,height,config);}catch{canvas=document.createElement('canvas');}}
 if(!solver){width=Math.min(160,width);height=Math.round(width/1.5);solver=createCPU(width,height,config);ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas rendering is unavailable.');buffer=document.createElement('canvas');buffer.width=width;buffer.height=height;image=new ImageData(width,height);}
 mask=new Uint8Array(width*height*4);solver.setMask(mask);
 function render(){
  if(disposed)return;const view=paperView(canvas.width,canvas.height);
  if(solver.backend==='GPU'){solver.render(view);return;}
  const data=solver.state,ink=config.ink.match(/\w\w/g).map(v=>parseInt(v,16)),paper=[244,241,232];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4,v=data[i+1],contour=smooth(.06,.072,v)*(1-smooth(.078,.091,v)),innerLine=smooth(.17,.18,v)*(1-smooth(.19,.2,v)),hatch=(.5+.5*Math.sin((x+y*.72)*2.8))**12,cross=(.5+.5*Math.sin((x-y*.9)*3.1))**16;
   let p=contour*(.58+.12*Math.sin(x*1.17+y*.31))+innerLine*.2+smooth(.1,.35,v)*(.06+.3*hatch+.1*cross)+data[i+2]*.055;
   if(config.mode==='architecture')p=Math.max(p*.28,mask[i+1]/255*Math.min(1,data[i+3]*1.35)*(.7+.2*hatch));
   if(config.mode==='image')p=Math.min(1,data[i+3]*1.5)*(mask[i+1]/255)**.7*(.8+.15*hatch)+contour*.035;
   if(config.mode==='architecture'&&config.guides)p=Math.max(p,mask[i+2]/255*.15);
   p=Math.min(.94,p);for(let c=0;c<3;c++)image.data[i+c]=paper[c]+(ink[c]-paper[c])*p;image.data[i+3]=255;
  }
  buffer.getContext('2d').putImageData(image,0,0);ctx.fillStyle='#f4f1e8';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(buffer,...view);
 }
 return {canvas,width,height,backend:solver.backend,get steps(){return solver.steps;},
  update(value){config=options(value);solver.update(config);},
  setMask(value){solver.setMask(value);mask=value.slice();},
  step(count=1){solver.step(Math.max(0,Math.min(2400,Math.floor(count))));},
  brush(points){for(let i=0;i<points.length;i+=24)solver.brush(points.slice(i,i+24));},
  clear(){solver.reset();},
  reseed(){const state=blankState(width,height);stamp(state,width,height,seedPoints(config,mask,width,height));solver.reset(state);},
  read:()=>solver.read(),render,
  resize(w,h){canvas.width=Math.max(1,Math.round(w));canvas.height=Math.max(1,Math.round(h));render();},
  async exportPNG(){render();return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not export the drawing.')),'image/png'));},
  dispose(){if(disposed)return;disposed=true;solver.dispose();buffer=null;image=null;mask=null;canvas.width=canvas.height=1;}
 };
}
