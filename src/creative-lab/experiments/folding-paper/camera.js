import {Vector3} from 'three';
import {ease} from './engine.js';
/** Deterministic camera choreography, separate from the panel hierarchy. */
export function cameraPose(composition,progress,angle=68,aspect=1.6){
 const p=Math.max(0,Math.min(1,progress)),fold=ease(Math.min(1,p/.72));
 const elevation=(angle-18*fold)*Math.PI/180,azimuth=.28*(1-fold)+.38*fold;
 const direction=new Vector3(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
 const span=Math.max(...composition.sheet)*(1-fold)+composition.assembledSpan*fold;
 const distance=span*(1.45-.21*fold)/Math.min(1,Math.max(.35,aspect));
 const center=new Vector3(...composition.focus).multiplyScalar(fold);center.y+=Math.sin(fold*Math.PI)*2;
 const overview=center.clone().addScaledVector(direction,distance);
 const entry=new Vector3(...composition.entry),inside=new Vector3(...composition.inside),look=new Vector3(...composition.look);
 let position=overview,target=center;
 if(p>.72&&p<.86){const t=ease((p-.72)/.14);position=overview.clone().lerp(entry,t);target=center.clone().lerp(look,t);}
 else if(p>=.86){const t=ease((p-.86)/.14);position=entry.clone().lerp(inside,t);target=look;}
 return {position,target,up:new Vector3(0,1,0)};
}
