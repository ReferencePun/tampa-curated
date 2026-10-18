import {createBoard,stroke,stamp} from './model.js';
// Original parametric drawings. Coordinates are normalized to preserve compositions.
export const EXAMPLES=[['moth','Afterglow moth','An illuminated specimen, suspended in the dark.'],['garden','Midnight garden','Small blooms, climbing stems, and quiet constellations.'],['orbit','Orbital study','An improbable little observatory of light.'],['wave','Chromatic tide','Ribbons of color moving through a field of apertures.']];
export function example(name,columns=72){const b=createBoard(columns),p=(x,y)=>({x:Math.round(x*(b.columns-1)),y:Math.round(y*(b.rows-1))});const line=(a,c,color,size=1)=>stroke(b,p(...a),p(...c),{color,size});const curve=(fn,color,n=180)=>{let last=fn(0);for(let i=1;i<=n;i++){const next=fn(i/n);line(last,next,typeof color==='function'?color(i/n):color);last=next;}};const dot=(x,y,color,size=1)=>stamp(b,p(x,y),{color,size});
 if(name==='moth'){
  for(const sign of [-1,1]){for(let layer=0;layer<6;layer++){const s=1-layer*.115;curve(t=>{const a=t*Math.PI*2;return [.5+sign*(.055+s*(.18+.16*Math.cos(a))*(.82+.18*Math.sin(a))),.42+s*.27*Math.sin(a)];},t=>[7,8,9,10,11,3][(layer+Math.floor(t*2))%6]);}for(let layer=0;layer<4;layer++)curve(t=>{const a=t*Math.PI*2;return [.5+sign*(.06+(1-layer*.18)*(.12+.10*Math.cos(a))),.68+(1-layer*.18)*.16*Math.sin(a)];},[6,7,3,2][layer]);curve(t=>[.5+sign*(.01+.055*Math.sin(t*1.6)),.28-t*.13],3);dot(.5+sign*.067,.14,4);for(let j=0;j<5;j++)dot(.5+sign*(.13+j*.041),.31+j*.012,4);}
  line([.5,.27],[.5,.79],3,2);for(let y=.32;y<.77;y+=.08)dot(.5,y,4);for(let j=0;j<24;j++){const x=.06+((j*37)%89)/100,y=.07+((j*23)%85)/100;if(Math.abs(x-.5)>.34||y<.12||y>.88)dot(x,y,j%3?8:4);}
 }else if(name==='garden'){
  for(let j=0;j<8;j++){const x=.1+j*.113,h=.24+(j*7%5)*.105;curve(t=>[x+Math.sin(t*3+j)*.025,.89-t*h],j%2?6:5);for(let k=1;k<4;k++){const y=.89-h*k/4,side=k%2?1:-1;curve(t=>[x+side*.065*Math.sin(t*Math.PI),y-t*.1],6);}const cy=.89-h;curve(t=>{const a=t*Math.PI*2,r=.048+.016*Math.cos(a*5);return [x+r*Math.cos(a),cy+r*1.5*Math.sin(a)];},j%3===0?2:j%3===1?10:11);dot(x,cy,3);}
  curve(t=>[.07+t*.86,.91+.015*Math.sin(t*14)],7);for(let j=0;j<30;j++)dot(.05+(j*31%90)/100,.08+(j*13%17)/100,j%5?8:4);
 }else if(name==='orbit'){
  for(let k=0;k<4;k++)curve(t=>{const a=t*Math.PI*2,r=.18+k*.058;return [.5+Math.cos(a)*r,.5+Math.sin(a)*r*.72+Math.cos(a)*.16];},[3,7,8,9][k]);for(let k=0;k<5;k++)curve(t=>{const a=t*Math.PI*2,r=.033+k*.013;return [.5+Math.cos(a)*r,.5+Math.sin(a)*r*1.6];},[4,3,2,1,2][k]);dot(.2,.29,7,3);dot(.78,.69,10,3);for(let j=0;j<50;j++){const x=.06+(j*37%89)/100,y=.06+(j*61%89)/100;if(Math.hypot((x-.5)*1.3,y-.5)>.42)dot(x,y,j%4?8:4);}
 }else{for(let k=0;k<14;k++)curve(t=>[.06+t*.88,.2+k*.039+.13*Math.sin(t*6.1+k*.21)],1+k%12,240);}
 b.selected=b.cells.map(v=>v?1:0);return b;
}
