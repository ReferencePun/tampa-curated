export type ScribblePoint=[number,number];
export const pencilColors={amber:'#b88328',blue:'#436c86',sage:'#617652',rust:'#97513b',rose:'#a86166'};
export type PencilColor=keyof typeof pencilColors;

/** Fixed, imperfect retracing: the marks never shimmer or change on reload. */
export function scribbleStrokes(width:number,height:number,seed=1):ScribblePoint[][]{
 const gesture=[[-.09,.08],[.91,.27],[.05,.34],[1.08,.62],[.12,.66],[.87,1.04],[.32,.85]];
 const strokes=[-.025,.025].map(pass=>gesture.map(([u,v],i)=>[
  width*(u+pass+.055*Math.sin(seed*1.7+i*2.3)),
  height*(v+pass+.07*Math.sin(seed*.9+i*1.8)),
 ] as ScribblePoint));
 strokes.push([[width*.15,height*.28],[width*.48,-height*.09],[width*.39,height*.76],[width*.76,height*.38]]);
 return strokes;
}
export function scribblePaths(width:number,height:number,seed=1){
 return scribbleStrokes(width,height,seed).map(points=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(''));
}
