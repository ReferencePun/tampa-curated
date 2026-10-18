import * as THREE from 'three';
import {noise} from './hand.js';

function inside(point,polygon){
 let hit=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)hit=!hit;
 }
 return hit;
}
export function letterPlan(font,text){
 const contours=font.generateShapes(text,1).map(shape=>({outer:shape.getPoints(18),holes:shape.holes.map(h=>h.getPoints(18))}));
 const box=new THREE.Box2().setFromPoints(contours.flatMap(c=>c.outer)),center=box.getCenter(new THREE.Vector2());
 return {box,center,contains(x,y){const p={x:x+center.x,y:y+center.y};return contours.some(c=>inside(p,c.outer)&&!c.holes.some(h=>inside(p,h)));}};
}

// The letter silhouette is only a layout constraint. Nothing fills or traces it:
// all visible structure consists of independently placed handwritten glyphs.
export function writeStructure(types,plan,position,rotation,size,width,depth,phrase,seed){
 const natural=plan.box.getSize(new THREE.Vector2()),sx=width?width/natural.x:size,sy=size;
 const w=natural.x*sx,h=natural.y*sy,step=Math.max(.11,Math.min(.24,h/19)),chars=Array.from(phrase+' '),point=new THREE.Vector3(),offset=new THREE.Vector3();let serial=0;
 for(const layer of [0,1]){
  for(let y=-h/2+step*.35;y<h/2;y+=step*1.13){
   for(let x=-w/2+step*.25;x<w/2;){
    const char=chars[serial++%chars.length],advance=(types.atlas.advance.get(char)??.5)*step*.91;
    const xx=x+advance/2,yy=y+Math.sin(x*2+seed)*step*.08;
    if(plan.contains(xx/sx,yy/sy)){
     offset.set(xx,yy,layer*depth*size).applyQuaternion(rotation);point.copy(position).add(offset);
     types.glyph(char,point,step,rotation,layer?.72:.9);
    }
    x+=Math.max(step*.2,advance);
   }
  }
 }
 // Short rows through the depth make the counters readable edge-on, still text.
 if(depth>.2)for(let i=0;i<18;i++){
  const x=(noise(seed+i)-.5)*w,y=(noise(seed+i*7)-.5)*h;
  if(!plan.contains(x/sx,y/sy))continue;
  offset.set(x,y,0).applyQuaternion(rotation);point.copy(position).add(offset);
  types.text('inside the word',point,step*.7,rotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2)),depth*size,.6);
 }
}
