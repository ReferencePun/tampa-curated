import * as THREE from 'three';
import {validateOptions,preparePath,frameAt,cameraPose} from './path.js';
export {cameraPose};

/** Pure procedural scene generation. No DOM, renderer, animation loop or global state. */
export function generateEnvironment(points,options={}) {
  const settings=validateOptions(options),path=preparePath(points,settings),group=new THREE.Group();
  group.name='Draw a World / generated architecture';
  const buffers={ink:[],pencil:[],guides:[],accent:[]},w=settings.width/2,h=6.2;
  let serial=0;
  const noise=()=>{const n=Math.sin(++serial*127.1+78.233)*43758.5453;return n-Math.floor(n)-.5;};
  function line(a,b,kind='ink',rough=true){
    const amount=rough?settings.irregularity*.075:0;
    buffers[kind].push(a.x+noise()*amount,a.y+noise()*amount,a.z+noise()*amount,b.x+noise()*amount,b.y+noise()*amount,b.z+noise()*amount);
  }
  const at=(frame,x,y)=>frame.center.clone().addScaledVector(frame.right,x).addScaledVector(frame.up,y);
  const divisions=Math.min(600,Math.max(160,Math.ceil(path.length/Math.max(.75,settings.width*.3))));
  const frames=Array.from({length:divisions+1},(_,i)=>frameAt(path.curve,i/divisions));
  const ribs=Math.min(220,Math.max(8,Math.round(settings.density*path.length/100)));
  const roof=settings.style==='vault'?Array.from({length:17},(_,i)=>{const a=i*Math.PI/16;return [Math.cos(a)*w,3.7+Math.sin(a)*2.5];}):[[-w,h],[w,h]];
  for(let i=0;i<=ribs;i++){
    const f=frameAt(path.curve,i/ribs);
    for(const side of [-1,1]){
      line(at(f,side*w,0),at(f,side*w,settings.style==='vault'?3.7:h));
      line(at(f,side*(w+.06),-.08),at(f,side*(w+.06),settings.style==='vault'?3.8:h+.13),'pencil');
      // Small diagonal pencil strokes describe an unfinished wall, not a solid box.
      if(i%2===0)for(let j=0;j<5;j++){
        const a=at(f,side*w,.3+j*.27),b=at(f,side*w,.63+j*.27).addScaledVector(f.tangent,.45);
        line(a,b,'pencil');
      }
      if(i%7===2)for(let j=0;j<4;j++)line(at(f,side*w,4.3+j*.045).addScaledVector(f.tangent,-.18+noise()*.15),at(f,side*w,4.8+j*.035).addScaledVector(f.tangent,.26+noise()*.2),'accent');
    }
    for(let j=1;j<roof.length;j++)line(at(f,...roof[j-1]),at(f,...roof[j]));
    line(at(f,-w,0),at(f,w,0),'pencil');
    if(settings.guides&&i%3===0){
      line(at(f,-w-1.2,-.035),at(f,w+1.2,-.035),'guides',false);
      for(const side of [-1,1]){
        line(at(f,side*(w+.7),-.2),at(f,side*(w+.7),h+1),'guides',false);
        line(at(f,side*(w+.92),h+.45),at(f,side*(w+.48),h+.45),'guides',false);
      }
    }
  }
  const rails=[[-w,0],[w,0],[-w,1.15],[w,1.15],[-w,settings.style==='vault'?3.7:h],[w,settings.style==='vault'?3.7:h]];
  if(settings.style==='vault')rails.push([0,h],[-w*.707,3.7+2.5*.707],[w*.707,3.7+2.5*.707]);
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i];
    for(const [x,y] of rails)line(at(a,x,y),at(b,x,y));
    if(settings.guides&&i%3!==0)line(at(a,0,-.04),at(b,0,-.04),'guides',false);
    if(i%4===0)for(let j=0;j<3;j++)line(at(a,-w+.2+j*.22,-.02),at(b,-w+.5+j*.22,-.02),'pencil');
  }
  if(settings.style==='staircase'){
    const steps=Math.min(320,Math.ceil(path.rise/.17));
    for(let i=0;i<steps;i++){
      const a=frameAt(path.curve,i/steps),b=frameAt(path.curve,(i+1)/steps),up=path.rise/steps;
      line(at(a,-w,up),at(a,w,up));line(at(a,-w,0),at(a,w,0),'pencil');
      for(const side of [-1,1])line(at(a,side*w,up),at(b,side*w,0),'pencil');
    }
  }
  const colors={ink:0x393c3c,pencil:0x776f61,guides:0x607e86,accent:0xaa6a45};
  const opacities={ink:.72,pencil:.29,guides:.27,accent:.55};
  for(const [name,vertices] of Object.entries(buffers)){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const material=new THREE.LineBasicMaterial({color:colors[name],transparent:true,opacity:opacities[name],depthWrite:false});
    const lines=new THREE.LineSegments(geometry,material);lines.name=name;group.add(lines);
  }
  // Very translucent vellum surfaces make depth legible while the structural drawing stays visible.
  const surfaces=[];
  function quad(a,b,c,d){for(const p of [a,b,c,a,c,d])surfaces.push(p.x,p.y,p.z);}
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i];quad(at(a,-w,0),at(b,-w,0),at(b,w,0),at(a,w,0));
    if(i%5<3)for(const side of [-1,1])quad(at(a,side*w,0),at(b,side*w,0),at(b,side*w,3.7),at(a,side*w,3.7));
  }
  const skin=new THREE.BufferGeometry();skin.setAttribute('position',new THREE.Float32BufferAttribute(surfaces,3));
  group.add(new THREE.Mesh(skin,new THREE.MeshBasicMaterial({color:0x9a9684,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false})));
  const bounds=new THREE.Box3().setFromObject(group),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
  const signature=JSON.stringify({points,settings:{...settings,path:undefined}});
  let hash=2166136261;for(let i=0;i<signature.length;i++)hash=Math.imul(hash^signature.charCodeAt(i),16777619);
  let disposed=false;
  return {...path,group,bounds,center,size,signature:(hash>>>0).toString(16),primitives:Object.values(buffers).reduce((sum,a)=>sum+a.length/6,0),
    dispose(){if(disposed)return;disposed=true;group.traverse(object=>{object.geometry?.dispose();if(object.material)for(const material of [object.material].flat())material.dispose();});group.clear();}
  };
}
