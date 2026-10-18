import * as THREE from 'three';
import {sampleDepth,reliefPoint,frameSize} from './transition.js';

const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`uniform sampler2D photograph; uniform vec2 texel; uniform float blend; uniform float alpha; varying vec2 vUv;
 float tone(vec2 p){return dot(texture2D(photograph,p).rgb,vec3(.299,.587,.114));}
 void main(){vec3 photo=texture2D(photograph,vUv).rgb;float g=dot(photo,vec3(.299,.587,.114));
 float edge=length(vec2(tone(vUv+vec2(texel.x,0.))-tone(vUv-vec2(texel.x,0.)),tone(vUv+vec2(0.,texel.y))-tone(vUv-vec2(0.,texel.y))));
 float paper=fract(sin(dot(floor(vUv/texel),vec2(12.9898,78.233)))*43758.5453);
 float hatch=smoothstep(.72,.97,sin((vUv.x+vUv.y*.74)*650.)*.5+.5)*(1.-g)*.025;
 vec3 ink=vec3(.87,.84,.76)*(1.-clamp((1.-g)*.67+edge*1.5+hatch+paper*.045,0.,.92));
 gl_FragColor=vec4(mix(ink,photo,blend),alpha);
 #include <colorspace_fragment>
 }`;

export function createPhotoRelief(texture,depthMap,aspect,quality='medium'){
 const columns={low:64,medium:128,high:224}[quality]||128,rows=Math.max(24,Math.round(columns/aspect));
 const geometry=new THREE.PlaneGeometry(1,1,columns,rows),uv=geometry.attributes.uv,depth=new Float32Array(uv.count);
 const depthRange=[1,0];for(let i=0;i<depth.length;i++){depth[i]=sampleDepth(depthMap,uv.getX(i),uv.getY(i));depthRange[0]=Math.min(depthRange[0],depth[i]);depthRange[1]=Math.max(depthRange[1],depth[i]);}
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{photograph:{value:texture},texel:{value:new THREE.Vector2(1/texture.image.width,1/texture.image.height)},blend:{value:.7},alpha:{value:1}},side:THREE.DoubleSide,transparent:true});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
 // A few cross sections read as a survey of the volume, not a game wireframe.
 const sections=new THREE.BufferGeometry(),sectionMaterial=new THREE.LineBasicMaterial({color:'#6d796f',transparent:true,opacity:0,depthWrite:false});
 const lines=new THREE.LineSegments(sections,sectionMaterial);lines.frustumCulled=false;
 const indices=[];for(let row=0;row<=rows;row+=Math.max(1,Math.round(rows/10)))for(let col=0;col<columns;col++)indices.push(row*(columns+1)+col,row*(columns+1)+col+1);
 const sectionPositions=new Float32Array(indices.length*3);sections.setAttribute('position',new THREE.BufferAttribute(sectionPositions,3));
 let last='';
 function update(pose,settings){
  const key=`${pose.emerge}:${pose.startZ}:${settings.depth}`;if(key!==last){last=key;const positions=geometry.attributes.position;
   for(let i=0;i<uv.count;i++){const p=reliefPoint(uv.getX(i),uv.getY(i),depth[i],pose,settings.depth);positions.setXYZ(i,...p);}
   positions.needsUpdate=true;for(let j=0;j<indices.length;j++){const i=indices[j];sectionPositions[j*3]=positions.getX(i);sectionPositions[j*3+1]=positions.getY(i);sectionPositions[j*3+2]=positions.getZ(i)+.006;}sections.attributes.position.needsUpdate=true;
  }
  material.uniforms.blend.value=settings.blend;sectionMaterial.opacity=settings.guides?pose.emerge*.065*(1-settings.blend*.6):0;
 }
 return {mesh,lines,update,geometry,material,depth,depthRange,dispose(){geometry.dispose();material.dispose();sections.dispose();sectionMaterial.dispose();}};
}

export function createFrame(aspect){
 const root=new THREE.Group(),{width:w,height:h}=frameSize(aspect),positions=[],accent=[],guides=[];
 const segment=(a,b,store=positions)=>store.push(...a,...b);
 const rect=(x,y,width,height,z=0)=>{const c=[[x,y,z],[x+width,y,z],[x+width,y+height,z],[x,y+height,z]];c.forEach((a,i)=>segment(a,c[(i+1)%4]));};
 const circle=(x,y,r,start=0,end=Math.PI*2,store=positions)=>{for(let i=0;i<80;i++){const a=start+(end-start)*i/80,b=start+(end-start)*(i+1)/80;segment([x+Math.cos(a)*r,y+Math.sin(a)*r,.08],[x+Math.cos(b)*r,y+Math.sin(b)*r,.08],store);}};
 // Pencil retracing is deterministic, so reversing never changes the drawing.
 for(let i=0;i<5;i++){const d=.08+i*.045;rect(-w/2-d,-h/2-d,w+2*d,h+2*d,.04+i*.002);}
 rect(-w/2-.29,-h/2-.305,w+.591,h+.604,.04);
 const paper=new THREE.MeshBasicMaterial({color:'#eee9db',side:THREE.DoubleSide});
  // A real wall with an open aperture occludes the scene beyond the frame.
  // It naturally leaves the camera's view when the picture plane is crossed.
  const wallMaterial=new THREE.MeshBasicMaterial({color:'#f2eee3',side:THREE.DoubleSide});
  for(const [x,y,a,b]of [[0,h/2+40,160,80],[0,-h/2-40,160,80],[-w/2-40,0,80,h],[w/2+40,0,80,h]]){
   const wall=new THREE.Mesh(new THREE.PlaneGeometry(a,b),wallMaterial);wall.position.set(x,y,.005);root.add(wall);
  }
 const bars=[[0,h/2+.15,w+.6,.3],[0,-h/2-.15,w+.6,.3],[-w/2-.15,0,.3,h],[w/2+.15,0,.3,h]];
 for(const [x,y,a,b]of bars){const m=new THREE.Mesh(new THREE.PlaneGeometry(a,b),paper);m.position.set(x,y,.015);root.add(m);}
 // Engraved hinges, adjustable calipers, and pinholes outside the photograph.
 for(const x of [-w/2-.42,w/2+.42])for(const y of [-h/2-.42,h/2+.42]){circle(x,y,.08);circle(x,y,.027);segment([x-.13,y,.06],[x+.13,y,.06]);segment([x,y-.13,.06],[x,y+.13,.06]);}
 for(let i=0;i<85;i++){const x=-w/2+i*w/84;segment([x,-h/2-.49,.02],[x,-h/2-(i%7?.54:.62),.02]);}
 for(let i=0;i<48;i++){const y=-h/2+i*h/47;segment([-w/2-.48,y,.02],[-w/2-(i%5?.53:.62),y,.02]);}
 circle(w/2+.54,0,.31,-2.2,2.2);circle(w/2+.54,0,.38,-2.2,2.2);segment([w/2+.3,0,.03],[w/2+1.08,.0,.03]);
 for(let i=0;i<20;i++){const t=i*.1;segment([w/2+.4+t*.27,-.2+Math.sin(i*7)*.02,.07],[w/2+.6+t*.27,.22+Math.cos(i*5)*.015,.07],accent);}
 for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){segment([x*1.3,y*1.3,-.02],[x*2,y*2,-10],guides);}
 for(let i=0;i<4;i++){const z=-2-i*2;for(const x of [-w/2,w/2])segment([x*1.5,-h*.65,z],[x*1.5,h*.65,z],guides);}
 const materials=[];function lineSet(values,color,opacity){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(values,3));const m=new THREE.LineBasicMaterial({color,opacity,transparent:true});materials.push(m);const l=new THREE.LineSegments(g,m);root.add(l);return l;}
 lineSet(positions,'#61594c',.72);lineSet(accent,'#a36d3c',.4);const survey=lineSet(guides,'#73867e',.28);
 return {root,setGuides(value,opacity){survey.visible=value;survey.material.opacity=opacity;},dispose(){root.traverse(o=>{o.geometry?.dispose();});materials.forEach(m=>m.dispose());paper.dispose();wallMaterial.dispose();}};
}
