import {point, TAU} from './mechanisms';

const xy=(x:number,y:number)=>`${x.toFixed(2)} ${y.toFixed(2)}`;

/** Deliberate broken contour studies. These are surface drawings, never the
 * pitch/tooth geometry. Each pressure pass is stable and generated at build time. */
export function contour(radius:number, seed:number, start=0, end=TAU, strength=1) {
  const count=Math.max(4,Math.ceil((end-start)*radius/7));
  return Array.from({length:count+1},(_,i)=>{
    const a=start+(end-start)*i/count;
    const r=radius+strength*(.7*Math.sin(a*5+seed)+.32*Math.sin(a*17-seed)+.18*Math.cos(a*31));
    const [x,y]=point(r,a);
    return `${i?'L':'M'}${xy(x,y)}`;
  }).join('');
}

export function ringHatch(r:number,seed:number) {
  // An uneven band of shading, concentrated on the lower-left quadrant.
  const marks=Array.from({length:Math.round(r*1.25)},(_,i)=>{
    const a=TAU*i/Math.round(r*1.25),dense=Math.sin(a-.4)>.15;
    if(!dense&&i%3)return '';
    const from=point(r*(.815+.012*Math.sin(i*2.3+seed)),a);
    const to=point(r*(dense?.953:.9),a+.018+.004*Math.cos(i));
    return `M${xy(...from as [number,number])}l${xy((to[0]-from[0])*.43+.3,(to[1]-from[1])*.43)}L${xy(...to as [number,number])}`;
  }).join('');
  const cross=Array.from({length:Math.round(r*.55)},(_,i)=>{
    const a=.6+Math.PI*i/Math.round(r*.55);
    const from=point(r*.84,a),to=point(r*.94,a-.045);
    return `M${xy(...from as [number,number])}L${xy(...to as [number,number])}`;
  }).join('');
  return {marks,cross};
}

/** Torn oval rather than a regular porthole; used only for the photo opening. */
export function tornOval(cx:number,cy:number,rx:number,ry:number,seed=0) {
  return Array.from({length:61},(_,i)=>{
    const a=i/60*TAU;
    const edge=1+.035*Math.sin(a*7+seed)+.025*Math.cos(a*19)-.018*Math.sin(a*29);
    return `${i?'L':'M'}${xy(cx+Math.cos(a)*rx*edge,cy+Math.sin(a)*ry*edge)}`;
  }).join('')+'Z';
}
