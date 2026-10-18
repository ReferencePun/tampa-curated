import * as THREE from 'three';
import {tileCenter,random} from './model.js';
// One thin, beveled tile plus two stationary bearing caps, repeated in one draw call.
export function tileGeometry(grid,angles){
 const positions=[],normals=[],parts=[];
 function quad(a,b,c,d,part){const n=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a))).normalize();for(const p of [a,b,c,a,c,d]){positions.push(...p);normals.push(n.x,n.y,n.z);parts.push(part);}}
 const ring=(r,z)=>[[-r,-r,z],[r,-r,z],[r,r,z],[-r,r,z]],front=ring(.472,.024),edgeA=ring(.5,.007),edgeB=ring(.5,-.007),back=ring(.472,-.024);
 quad(...front,0);quad(back[3],back[2],back[1],back[0],1);
 for(let i=0;i<4;i++){const j=(i+1)%4;quad(front[j],front[i],edgeA[i],edgeA[j],2);quad(edgeA[j],edgeA[i],edgeB[i],edgeB[j],2);quad(edgeB[j],edgeB[i],back[i],back[j],2);}
 // These two caps do not rotate: a physical reference for each tile's local axis.
 for(const sign of [-1,1]){const x=sign*.51,w=.055,h=.025,z=.035;quad([x-w,-h,z],[x+w,-h,z],[x+w,h,z],[x-w,h,z],3);quad([x-w,h,z],[x+w,h,z],[x+w,h,-z],[x-w,h,-z],3);quad([x-w,-h,-z],[x+w,-h,-z],[x+w,-h,z],[x-w,-h,z],3);}
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('part',new THREE.Float32BufferAttribute(parts,1));
 const centers=new Float32Array(grid.count*2),seeds=new Float32Array(grid.count);for(let i=0;i<grid.count;i++){centers.set(tileCenter(grid,i),i*2);seeds[i]=random(i);}
 geometry.setAttribute('aCenter',new THREE.InstancedBufferAttribute(centers,2));geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,1));geometry.setAttribute('aAngle',new THREE.InstancedBufferAttribute(angles,1).setUsage(THREE.DynamicDrawUsage));geometry.instanceCount=grid.count;geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),Math.hypot(grid.width,grid.height)/2+grid.pitch);return geometry;
}
export const vertexShader=`
attribute float part; attribute vec2 aCenter; attribute float aSeed; attribute float aAngle;
uniform float tileSize; uniform vec2 boardSize; uniform vec2 axis;
varying vec3 vNormal; varying vec3 vPosition; varying vec2 vLocal; varying vec2 vPhoto; varying float vPart; varying float vSeed;
vec3 rotate(vec3 p,vec3 a,float t){return p*cos(t)+cross(a,p)*sin(t)+a*dot(a,p)*(1.-cos(t));}
void main(){
 vec3 a=vec3(axis,0.);vec3 local=position*tileSize;vec3 n=normal;
 vec3 finalPosition=rotate(local,a,3.14159265359);
 vPhoto=(aCenter+finalPosition.xy)/boardSize+.5;
 if(part>2.5){local.xy=mat2(axis.x,axis.y,-axis.y,axis.x)*local.xy;n.xy=mat2(axis.x,axis.y,-axis.y,axis.x)*n.xy;}
 else{local=rotate(local,a,aAngle);n=rotate(n,a,aAngle);}
 vec3 p=vec3(aCenter,0.)+local;vNormal=normalize(normalMatrix*n);vPosition=(modelViewMatrix*vec4(p,1.)).xyz;
 vLocal=position.xy;vSeed=aSeed;vPart=part;gl_Position=projectionMatrix*vec4(vPosition,1.);
}`;
export const fragmentShader=`
uniform sampler2D photograph;uniform float mode;uniform float materialKind;uniform vec3 baseColor;uniform vec3 lightDirection;
varying vec3 vNormal;varying vec3 vPosition;varying vec2 vLocal;varying vec2 vPhoto;varying float vPart;varying float vSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
void main(){
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 viewDir=normalize(-vPosition);float diffuse=max(0.,dot(n,lightDirection));
 if(vPart>.5&&vPart<1.5&&mode>.5){vec3 photo=texture2D(photograph,clamp(vPhoto,vec2(.001),vec2(.999))).rgb;gl_FragColor=vec4(photo*(.94+.06*diffuse),1.);}
 else{
 float grain=hash(floor((vLocal+vSeed)*vec2(130.,850.)))-.5;
 float brush=sin(vLocal.y*680.+vSeed*411.)*.5+sin(vLocal.y*1300.+vSeed*17.)*.5;
 vec3 reflected=reflect(-viewDir,n);float studio=pow(max(0.,dot(reflected,normalize(vec3(-.5,.6,1.)))),5.);
 float band=pow(max(0.,1.-abs(reflected.x*.8+reflected.y*.3-.25)),20.);
 float specular=pow(max(0.,dot(n,normalize(lightDirection+viewDir))),36.);
 float variation=.82+vSeed*.32;
 vec3 color=baseColor*variation*(.48+diffuse*.43)+vec3(.18*studio+.13*band+.16*specular);
 color+=vec3(grain*.025+brush*.013);
 if(materialKind==3.)color=baseColor*(.81+.14*diffuse)+vec3(grain*.03);
 if(materialKind==4.){
  float edge=max(abs(vLocal.x),abs(vLocal.y));float rough=.014*sin(vLocal.y*91.+vSeed*30.)+.008*sin(vLocal.x*137.);
  float stroke=smoothstep(.432+rough,.452+rough,edge)*(1.-smoothstep(.483,.5,edge));
  float scribble=step(.93,sin(vLocal.x*68.+vLocal.y*7.+vSeed*60.))*step(vLocal.y,.18)*step(-.25,vLocal.y)*step(abs(vLocal.x),.28);
  color=mix(vec3(.78,.76,.7)*(1.+grain*.06),vec3(.035,.041,.052),max(stroke,scribble*.64));
 }
 if(materialKind==5.)color=mix(color,.34+.18*cos(vec3(0.,2.2,4.4)+dot(n,viewDir)*6.+vSeed*.9),.34);
 if(materialKind==6.)color=vec3(.12+.42*studio+.28*band+.2*specular)*(variation)+vec3(grain*.012);
 if(vPart>1.5&&vPart<2.5)color=color*.76+vec3(specular*.2);
 if(vPart>2.5)color=vec3(.055,.058,.056)+vec3(diffuse*.08+specular*.12);
 gl_FragColor=vec4(max(vec3(0.),color),1.);
 }
 #include <colorspace_fragment>
}`;

// A narrow, stationary rear lattice supports the pins and blocks light leaking
// through closed seams. It is real geometry behind the tiles, not an image mask.
export function supportGeometry(grid,size,spacing){
 const p=[],z=-grid.pitch*.06,w=grid.pitch*(1-size*(1-spacing)+.012)/2;
 function rect(x0,y0,x1,y1){p.push(x0,y0,z,x1,y0,z,x1,y1,z,x0,y0,z,x1,y1,z,x0,y1,z);}
 for(let x=0;x<=grid.columns;x++){const cx=x*grid.pitch-grid.width/2;rect(cx-w,-grid.height/2,cx+w,grid.height/2);}
 for(let y=0;y<=grid.rows;y++){const cy=y*grid.pitch-grid.height/2;rect(-grid.width/2,cy-w,grid.width/2,cy+w);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));return geometry;
}
