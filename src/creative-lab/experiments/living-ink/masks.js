// Mask channels: R = growth affinity, G = illustration pigment, B = faint guide.
// Mask dimensions follow the solver, not the displayed canvas. No Tampa imports.
export const HERON_URL=new URL('./assets/heron.svg',import.meta.url);
export const OBSERVATORY_PATHS=(()=>{
 const paths=[],line=(...points)=>paths.push(points),rect=(x,y,w,h)=>line([x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]);
 line([.08,.82],[.92,.82]);line([.1,.85],[.9,.85]);rect(.2,.4,.6,.38);rect(.18,.38,.64,.025);rect(.17,.78,.66,.04);
 for(let j=0;j<5;j++){const rx=.23-j*.045;line(...Array.from({length:55},(_,i)=>{const t=Math.PI*i/54;return [.5+rx*Math.cos(t),.38-.25*Math.sin(t)];}));}
 rect(.47,.085,.06,.045);line([.5,.06],[.5,.085]);
 for(let x=.24;x<.8;x+=.085){rect(x,.5,.012,.28);rect(x-.008,.48,.028,.02);line(...Array.from({length:17},(_,i)=>[x+.048+.036*Math.cos(Math.PI*i/16),.52-.065*Math.sin(Math.PI*i/16)]));}
 rect(.45,.6,.1,.18);line([.5,.6],[.5,.78]);line([.2,.44],[.8,.44]);line([.2,.73],[.8,.73]);
 for(let y=.56;y<.74;y+=.035){line([.215,y],[.295,y]);line([.705,y],[.785,y]);}
 line([.14,.2],[.14,.82]);line([.12,.2],[.16,.2]);line([.12,.82],[.16,.82]);line([.85,.4],[.85,.78]);line([.84,.4],[.87,.4]);line([.84,.78],[.87,.78]);
 return paths;
})();
function blur(source,width,height,passes=3){let data=Float32Array.from(source),next=new Float32Array(data.length);for(let p=0;p<passes;p++){for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=data[Math.max(0,Math.min(height-1,y+dy))*width+Math.max(0,Math.min(width-1,x+dx))];next[y*width+x]=sum/9;}[data,next]=[next,data];}return data;}
function pack(detail,width,height){const affinity=blur(detail,width,height,4),mask=new Uint8Array(width*height*4);for(let i=0;i<detail.length;i++){mask[i*4]=Math.min(255,affinity[i]*3.4);mask[i*4+1]=detail[i];mask[i*4+2]=detail[i];mask[i*4+3]=255;}return mask;}
export function pathMask(paths,width,height,lineWidth=1.2){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.strokeStyle='#fff';ctx.lineWidth=lineWidth;ctx.lineCap='round';ctx.lineJoin='round';
 for(const path of paths){if(path.length<2)continue;ctx.beginPath();path.forEach(([x,y],i)=>{if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Paths need finite normalized coordinates.');ctx[i?'lineTo':'moveTo'](x*width,y*height);});ctx.stroke();}
 const rgba=ctx.getImageData(0,0,width,height).data;return pack(Uint8Array.from({length:width*height},(_,i)=>rgba[i*4+3]),width,height);
}
export function imageMask(image,width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,scale=Math.min(width/iw,height/ih);
 ctx.drawImage(image,(width-iw*scale)/2,(height-ih*scale)/2,iw*scale,ih*scale);const rgba=ctx.getImageData(0,0,width,height).data;
 return pack(Uint8Array.from({length:width*height},(_,i)=>255-(rgba[i*4]*.2126+rgba[i*4+1]*.7152+rgba[i*4+2]*.0722)),width,height);
}
export async function loadImage(source){const image=new Image();image.decoding='async';image.src=String(source);await image.decode();return image;}
