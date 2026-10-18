// Deterministic mark-making: no animated noise or random changes on revisiting a page.
export const INKS=['#131517','#203d72','#9d302d'];
export const PAPER='#efeee8';
export const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function penFor(serial,style='mixed'){
 if(style==='graphite')return 0;
 if(style==='ballpoint')return Math.floor(serial/57)%7===0?2:1;
 if(style==='ink')return Math.floor(serial/83)%11===0?1:0;
 const chunk=noise(Math.floor(serial/43)+17);
 return chunk>.89?2:chunk>.58?1:0;
}
let facePromise,users=0;
export async function acquireHandwriting(signal){
 if(!facePromise)facePromise=new FontFace('Manuscript Hand',`url(${new URL('./assets/Caveat.ttf',import.meta.url)})`,{weight:'400 700'}).load().catch(error=>{facePromise=null;throw error;});
 const face=await facePromise;
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 users++;document.fonts.add(face);let released=false;
 return ()=>{if(released)return;released=true;if(--users===0)document.fonts.delete(face);};
}

// Leave letter counters registered, but let the outside edge wander like a drawing.
export function roughEdge(x,y,halfWidth,halfHeight){
 const rim=Math.max(0,Math.min(1,(Math.hypot(x/halfWidth,y/halfHeight)-.8)/.2));
 return [x+rim*(Math.sin(y*31)+.32*Math.sin(y*97))*halfWidth*.055,y+rim*(Math.sin(x*41)+.26*Math.sin(x*113))*halfHeight*.045];
}
