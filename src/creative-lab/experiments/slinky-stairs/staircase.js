import * as THREE from 'three';
import {noise} from './model.js';
export const PALETTES={
 pencil:{paper:'#e9e5d9',top:'#ece9df',side:'#dbd6c7',ink:'#434b4c',faint:'#7e8a8c',accent:'#526f86',spring:'#3b464c',metal:.32,rough:.45},
 engraving:{paper:'#e7ddc6',top:'#e8dec8',side:'#c9bba0',ink:'#4e3d2d',faint:'#93816a',accent:'#806146',spring:'#79603a',metal:.55,rough:.38},
 ivory:{paper:'#f0ede4',top:'#f7f4eb',side:'#d8d3c7',ink:'#9a978e',faint:'#c6c2b7',accent:'#a8a092',spring:'#92948c',metal:.42,rough:.34},
 stone:{paper:'#d9d9d2',top:'#c9c9bf',side:'#a1a49c',ink:'#4e5654',faint:'#7c8780',accent:'#536d78',spring:'#919c9d',metal:.8,rough:.26}
};
export function createStaircase(stairs,settings){
 const group=new THREE.Group(),palette=PALETTES[settings.style],lines=[],fine=[],guides=[],textures=[],materials=[];
 const segment=(list,a,b)=>list.push(...a,...b);
 const paper=new THREE.MeshBasicMaterial({color:palette.top,side:THREE.DoubleSide}),edge=new THREE.MeshBasicMaterial({color:palette.side,side:THREE.DoubleSide});materials.push(paper,edge);
 const quad=(a,b,c,d,material)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.computeVertexNormals();const m=new THREE.Mesh(g,material);group.add(m);return m;};
 const label=(text,x,y,z,width)=>{const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle=palette.ink;ctx.font='22px monospace';ctx.textAlign='center';ctx.fillText(text,128,40);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const m=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.push(m);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),m);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y+.009,z);group.add(mesh);};
 for(let i=0;i<stairs.treads.length;i++){
  const t=stairs.treads[i],left=t.x-t.depth/2,right=t.x+t.depth/2,half=t.width/2,drop=i<stairs.treads.length-1?t.y-stairs.treads[i+1].y:.5,y=t.y,lip=.13;
  quad([left,y,-half],[left,y,half],[right,y,half],[right,y,-half],paper);
  quad([right,y,half],[right,y-drop,half],[right,y-drop,-half],[right,y,-half],edge);
  for(const z of [-half,half]){quad([left,y,z],[right,y,z],[right,y-drop-lip,z],[left,y-lip,z],edge);segment(lines,[left,y,z],[right,y,z]);segment(lines,[right,y,z],[right,y-drop-lip,z]);segment(lines,[left,y-lip,z],[right,y-drop-lip,z]);}
  segment(lines,[right,y,-half],[right,y,half]);segment(lines,[left,y,-half],[left,y,half]);
  if(settings.style!=='ivory'){
   // Slightly broken retraced pencil edges, and actual geometric hatch marks.
   for(let j=0;j<18;j++){const z=-half+j/18*t.width;segment(fine,[right+.004,y-drop+.025,z],[right+.004,y-.025,Math.min(half,z+.15)]);}
   for(let j=0;j<20;j++){const x=left+j/20*t.depth,offset=(noise(i*87+j)-.5)*.012;segment(fine,[x,y+.004,half+offset],[x+t.depth/25,y+.004,half+.008+offset]);}
   for(let j=0;j<8;j++){const x=left+.1+j/8*t.depth,z=half+.002;segment(fine,[x,y-.04,z],[Math.min(right,x+.24),y-.18,z]);}
   label(String(i+1).padStart(2,'0'),t.x-.55,y,half-.35,.49);
   for(let j=0;j<3;j++){const x=right-.13-j*.055;segment(fine,[x,y+.006,-half+.13],[x,y+.006,-half+.42]);}
  }
  if(settings.guides){
   const z=-half-.5;segment(guides,[left,y+.01,z],[right,y+.01,z]);for(const x of [left,right]){segment(guides,[x,y+.01,z-.13],[x,y+.01,z+.13]);segment(guides,[x,y+.01,-half-.1],[x,y+.01,z-.24]);}
   for(let j=0;j<10;j++){const x=left+j/10*t.depth;segment(guides,[x,y+.012,0],[x+t.depth/22,y+.012,0]);}
  }
 }
 // A slender stringer underneath the flight makes the treads architectural.
 for(const z of [-stairs.treads[0].width*.3,stairs.treads[0].width*.3])for(let i=0;i<stairs.treads.length-1;i++){const a=stairs.treads[i],b=stairs.treads[i+1];segment(fine,[a.x,a.y-.7,z],[b.x,b.y-.7,z]);segment(fine,[a.x,a.y-.76,z],[b.x,b.y-.76,z]);}
 const batch=(points,color,opacity)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const m=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});materials.push(m);const l=new THREE.LineSegments(g,m);group.add(l);};
 batch(lines,palette.ink,.75);batch(fine,palette.faint,.42);batch(guides,palette.accent,.32);
 // Soft analytic contact pools, no costly per-turn shadow maps.
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,62);gradient.addColorStop(0,'rgba(40,35,27,.19)');gradient.addColorStop(.58,'rgba(40,35,27,.08)');gradient.addColorStop(1,'rgba(40,35,27,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);const texture=new THREE.CanvasTexture(c);textures.push(texture);
 const shadows=Array.from({length:2},()=>{const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.push(mat);const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);m.rotation.x=-Math.PI/2;group.add(m);return m;});
 function contacts(cycle){const {phase,land,from,to}=cycle;shadows[0].position.set(from.x,from.y+.006,0);shadows[1].position.set(to.x,to.y+.006,0);shadows.forEach(s=>s.scale.setScalar(settings.diameter*1.45));shadows[0].material.opacity=phase<=land?1:Math.max(0,1-(phase-land)*4);shadows[1].material.opacity=phase>=land?1:Math.max(0,1-(land-phase)*5);}
 return {group,contacts,dispose(){group.traverse(o=>o.geometry?.dispose());for(const m of new Set(materials))m.dispose();textures.forEach(t=>t.dispose());group.clear();}};
}
