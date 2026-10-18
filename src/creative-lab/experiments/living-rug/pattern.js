import {hash} from '../../shared/tactile/field.js';
export const palettes={lapis:['#063d69','#0985c3','#9dcbd1','#a91f18','#e66428','#dcae53','#ece2b7'],wine:['#35122c','#8d2345','#d2878d','#173f49','#376f75','#c99350','#edd7ab'],ochre:['#423021','#a66e33','#d0b56f','#23565a','#57918d','#e0c48d','#f2e7c5']};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export function rugColor(x,y,palette='lapis'){
 const p=palettes[palette]||palettes.lapis,ax=Math.abs(x),ay=Math.abs(y),edge=Math.max(ax,ay),a=Math.atan2(y,x),diamond=ax*.85+ay;
 let c=1;
 if(edge>.82){const band=Math.floor((1-edge)*100);c=band<3?3:band<5?5:band<7?0:3;const u=ax>ay?y:x,flower=Math.sin(u*42)**2+Math.sin((edge-.91)*55)**2;if(flower<.45)c=5;if(flower<.12)c=6;}
 else if(edge>.78)c=Math.sin((edge-.78)*500)>0?5:0;
 else {
  const petal=.26+.055*Math.cos(a*8),d=Math.abs(diamond-petal);
  if(diamond<petal)c=3;if(d<.025)c=5;if(diamond<.12)c=6;if(diamond<.09)c=0;
  const fx=Math.sin(x*15+Math.sin(y*11))*.045,fy=Math.sin(y*19+Math.cos(x*13))*.035;
  const stem=Math.abs(Math.sin((x+fx)*26)*Math.sin((y+fy)*23));
  if(stem<.08&&diamond>.35)c=0;if(stem<.018&&diamond>.35)c=5;
  const floral=Math.sin(x*25)**2+Math.cos(y*23)**2;
  if(floral<.1&&diamond>.38)c=3;if(floral<.025&&diamond>.38)c=6;
  if(Math.abs(ax+ay-1.32)<.025)c=5;
 }
 const color=rgb(p[c]),shade=.72+hash(Math.floor((x+1)*350)+Math.floor((y+1)*350)*400)*.45;
 return color.map(v=>Math.min(1,v*shade));
}
