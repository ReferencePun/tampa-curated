import * as THREE from 'three';
import {sampleSpring} from './model.js';
// Fixed buffers: only coordinates/normals change when the timeline is scrubbed.
export function createCoil(settings){
 const segments=settings.coils*32,sides=8,count=(segments+1)*(sides+1),positions=new Float32Array(count*3),normals=new Float32Array(count*3),points=new Float32Array((segments+1)*3),indices=[];
 for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
 for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const end=segments*(sides+1);indices.push(end,end+j,end+j+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);
 function update(progress,s,stairs){
  const sample=sampleSpring(progress,s,stairs,segments,points),radius=s.thickness/2;
  for(let i=0;i<=segments;i++){
   const a=Math.max(0,i-1)*3,b=Math.min(segments,i+1)*3;let tx=points[b]-points[a],ty=points[b+1]-points[a+1],tz=points[b+2]-points[a+2],length=Math.hypot(tx,ty,tz);tx/=length;ty/=length;tz/=length;
   // Project a deterministic reference onto the wire's normal plane. This is a
   // circular tube, so its roll has no visible material seams or stored state.
   let nx,ny,nz;if(Math.abs(ty)<.94){nx=-tz;ny=0;nz=tx;}else{nx=0;ny=tz;nz=-ty;}length=Math.hypot(nx,ny,nz);nx/=length;ny/=length;nz/=length;
   const bx=ty*nz-tz*ny,by=tz*nx-tx*nz,bz=tx*ny-ty*nx;
   for(let j=0;j<=sides;j++){const theta=j/sides*Math.PI*2,c=Math.cos(theta),sn=Math.sin(theta),x=nx*c+bx*sn,y=ny*c+by*sn,z=nz*c+bz*sn,k=(i*(sides+1)+j)*3;positions[k]=points[i*3]+x*radius;positions[k+1]=points[i*3+1]+y*radius;positions[k+2]=points[i*3+2]+z*radius;normals[k]=x;normals[k+1]=y;normals[k+2]=z;}
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;geometry.computeBoundingSphere();return sample;
 }
 return {geometry,points,segments,update,dispose(){geometry.dispose();}};
}
