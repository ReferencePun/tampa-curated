import * as THREE from 'three';
import {sampleKeys,interval,validateLocation,clamp} from './timeline.js';
export function createTimeScene(definition,{textures=new Map(),detail=2,transparency=.48,view='blueprint',guides=true}={}){
 validateLocation(definition);const root=new THREE.Group(),objects=new Map(),layers=[],materials=new Set(),geometries=new Set();let disposed=false,primitives=0,time=0,appearance={transparency,view,guides};
 function material(color,opacity=1,line=true){const m=line?new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}):new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});materials.add(m);return m;}
 const ink=material('#4b4941',.8),pencil=material('#83796a',.24),accent=material('#9c7350',.66),survey=material('#647f88',.27),green=material('#718573',.6);
 function geometry(g){geometries.add(g);return g;}
 function lines(parent,points,mat=ink){if(!points.length)return null;const g=geometry(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const mesh=new THREE.LineSegments(g,mat);parent.add(mesh);primitives+=points.length/6;return mesh;}
 const segment=(array,a,b)=>array.push(...a,...b);
 function outline(parent,w,h,d,mat){const p=[],corners=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]];for(const [a,b]of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])segment(p,corners[a],corners[b]);return lines(parent,p,mat);}
 // The paving, kerbs and registration marks are invariant across time.
 const ground=new THREE.Group();root.add(ground);const paving=[],kerbs=[],marks=[];const [gw,gd]=definition.ground.size,sw=definition.ground.streetWidth/2;
 for(const x of [-sw-1.8,-sw,sw,sw+1.8])segment(kerbs,[x,.03,-gd/2-9],[x,.03,gd/2-9]);
 for(let z=-39;z<22;z+=3){for(const x of [-sw-1.8,sw])segment(paving,[x,.035,z],[x+1.8,.035,z+.08]);if(z<8)segment(marks,[0,.04,z],[0,.04,z+1.3]);}
 for(let x=-sw;x<sw;x+=.8)segment(paving,[x,.035,12],[x,.035,15]);
 let n=1;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};for(let i=0;i<190*detail;i++){const x=(random()-.5)*gw,z=(random()-.5)*gd-9;segment(paving,[x,.01,z],[x+.1+random()*.6,.01,z+.15]);}
 for(const [x,z]of [[0,0],[0,-22],[-22,17],[22,17]]){segment(marks,[x-.7,.05,z],[x+.7,.05,z]);segment(marks,[x,.05,z-.7],[x,.05,z+.7]);}
 lines(ground,paving,pencil);lines(ground,kerbs,ink);const registration=lines(ground,marks,survey);
 for(const spec of definition.objects){
  const group=new THREE.Group();group.position.fromArray(spec.position);root.add(group);const shape=new THREE.Group();group.add(shape);const record={spec,group,shape,floors:[],photos:[],paper:[],guide:null,roof:null,pose:null};objects.set(spec.id,record);
  const paper=material('#e6dfcf',.52,false);record.paper.push(paper);
  if(spec.kind==='building'||spec.kind==='column'){
   const body=new THREE.Group();shape.add(body);record.body=body;
   const g=geometry(spec.kind==='column'?new THREE.CylinderGeometry(.5,.56,1,12):new THREE.BoxGeometry(1,1,1));g.translate(0,.5,0);const mesh=new THREE.Mesh(g,paper);body.add(mesh);
   if(spec.kind==='column'){const edges=new THREE.EdgesGeometry(g);geometry(edges);body.add(new THREE.LineSegments(edges,ink));primitives+=edges.attributes.position.count/2;}
   else outline(body,1,1,1,ink);
   if(spec.kind==='building'){
    const roof=new THREE.Group();shape.add(roof);record.roof=roof;
    const rg=geometry(new THREE.BufferGeometry());rg.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,0,1,.5,.5,0,.5,-.5,0,-.5,0,1,-.5,0,1,.5,-.5,0,-.5,0,1,.5,-.5,0,.5,.5,0,-.5,.5,0,.5,0,1,.5,.5,0,-.5,0,1,.5,0,1,-.5],3));rg.computeVertexNormals();roof.add(new THREE.Mesh(rg,paper));const re=geometry(new THREE.EdgesGeometry(rg));roof.add(new THREE.LineSegments(re,ink));primitives+=re.attributes.position.count/2;
    const hatch=[];for(let z=-.48;z<.5;z+=.075/detail){segment(hatch,[-.5,.01,z],[0,1.01,z+.012]);segment(hatch,[0,1.01,z],[.5,.01,z+.012]);}lines(roof,hatch,pencil);
    for(let floor=0;floor<9;floor++){
     const level=new THREE.Group();shape.add(level);record.floors.push(level);const windows=[],etch=[],lights=[];
     for(let col=0;col<4;col++){
      const a=-.44+col*.235,b=a+.15,y=.22,top=.82;
      for(const side of [1,-1]){const z=side*.503;for(const [u,v]of [[[a,y,z],[b,y,z]],[[a,top,z],[b,top,z]],[[a,y,z],[a,top,z]],[[b,y,z],[b,top,z]],[[a,.5,z],[b,.5,z]]])segment(windows,u,v);if(detail>1)segment(windows,[(a+b)/2,y,z],[(a+b)/2,top,z]);
       if((floor*7+col*3+(side>0?1:2))%11===0)for(let k=0;k<5;k++)segment(lights,[a-.008+k*.033,y-.04,z+.002],[a+.035+k*.031,top+.05,z+.003]);
       if(detail>1)for(let k=0;k<detail*2;k++)segment(etch,[a-.025,top+.05+k*.023,z],[b+.02,top+.048+k*.023,z]);
      }
     }
     // Side elevations and floor cornices share the same registered frame.
     for(const x of [-.503,.503])for(let col=0;col<3;col++){const z=-.4+col*.3;for(const [a,b]of [[[x,.2,z],[x,.8,z]],[[x,.8,z],[x,.8,z+.2]],[[x,.8,z+.2],[x,.2,z+.2]],[[x,.2,z+.2],[x,.2,z]]])segment(windows,a,b);}
     for(const z of [-.505,.505]){segment(windows,[-.51,.98,z],[.51,.98,z]);if(detail>1)segment(etch,[-.51,.94,z],[.51,.945,z]);}
     lines(level,windows,ink);lines(level,etch,pencil);lines(level,lights,floor%2?green:accent);
    }
    for(const id of new Set(spec.keys.map(k=>k.media).filter(Boolean))){const texture=textures.get(id);if(!texture)continue;const mat=material('#d9c7ac',0,false);mat.map=texture;mat.depthWrite=false;const mesh=new THREE.Mesh(geometry(new THREE.PlaneGeometry(1,1)),mat);mesh.renderOrder=0;shape.add(mesh);record.photos.push({id,mesh,mat});}
   }
  }else if(spec.kind==='mesh'){
   const g=geometry(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(spec.geometry.positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,paper);shape.add(mesh);
   const edges=[];for(let i=0;i<spec.geometry.positions.length;i+=9)for(const [a,b]of [[0,3],[3,6],[6,0]])segment(edges,spec.geometry.positions.slice(i+a,i+a+3),spec.geometry.positions.slice(i+b,i+b+3));
   record.custom={geometry:g,lines:lines(shape,edges,ink)};
  }else if(spec.kind==='tree'){
   const branches=[],foliage=[];segment(branches,[0,0,0],[.025,.7,0]);segment(branches,[.025,0,.02],[0,.72,.02]);
   for(let i=0;i<(spec.variant==='palm'?8:11);i++){const a=i*2.399,dx=Math.cos(a),dz=Math.sin(a),base=spec.variant==='palm'?.73:.35+(i%4)*.09;let previous=[0,base,0];for(let k=1;k<=6;k++){const f=k/6,point=[dx*f*.5,base+(spec.variant==='palm'?Math.sin(f*Math.PI)*.23:.45*f),dz*f*.5];segment(foliage,previous,point);if(detail>1&&k>2)segment(foliage,[point[0]-.08,point[1]-.025,point[2]-.07],[point[0]+.09,point[1]+.02,point[2]+.06]);previous=point;}}
   lines(shape,branches,ink);lines(shape,foliage,green);
  }else if(spec.kind==='canopy'){
   const framework=[],hatch=[];for(let z=-.5;z<=.501;z+=.1){segment(framework,[-.5,0,z],[-.5,.6,z]);segment(framework,[-.5,.6,z],[0,1,z]);segment(framework,[0,1,z],[.5,.6,z]);segment(framework,[.5,.6,z],[.5,0,z]);}for(let x=-.5;x<=.501;x+=.1)segment(hatch,[x,1-Math.abs(x)*.8,-.5],[x,1-Math.abs(x)*.8,.5]);lines(shape,framework,ink);lines(shape,hatch,accent);
  }
  const max=spec.keys.reduce((a,k)=>({width:Math.max(a.width,k.width||8),height:Math.max(a.height,(k.height||0)+(k.roof||0)),depth:Math.max(a.depth,k.depth||8)}),{width:0,height:0,depth:0});
  const guideMaterial=material('#6f8790',.18);record.guide=outline(group,max.width,max.height,max.depth,guideMaterial);record.guideCount=record.guide.geometry.attributes.position.count;
 }
 for(const spec of definition.layers||[]){const texture=textures.get(spec.media);if(!texture)continue;const mat=material('#b9ac91',0,false);mat.map=texture;mat.depthWrite=false;const mesh=new THREE.Mesh(geometry(new THREE.PlaneGeometry(...spec.size)),mat);mesh.position.fromArray(spec.position);mesh.rotation.fromArray(spec.rotation);root.add(mesh);layers.push({spec,mesh,mat});}
 function setTime(value){if(disposed)return;time=clamp(value);for(const record of objects.values()){
  const {spec,group,shape,body,roof,floors,photos,guide}=record,p=sampleKeys(spec.keys,time);record.pose=p;group.position.fromArray(spec.position.map((n,i)=>n+p.offset[i]));group.rotation.y=p.rotation;shape.visible=p.presence>.001&&p.height>.001;
  if(body){body.scale.set(p.width,Math.max(.0001,p.height),p.depth);if(roof){roof.position.y=p.height;roof.scale.set(p.width,Math.max(.0001,p.roof),p.depth);roof.visible=p.roof>.01;}floors.forEach((floor,i)=>{const h=clamp(p.height-i*2.7,0,2.7);floor.visible=h>.02;floor.position.y=i*2.7;floor.scale.set(p.width,Math.max(.001,h),p.depth);});}
  else shape.scale.set(p.width,Math.max(.0001,p.height),p.depth);
  if(record.custom&&spec.geometry.frames){const {a,b,mix}=interval(spec.geometry.frames,time),positions=record.custom.geometry.attributes.position,edges=record.custom.lines.geometry.attributes.position;for(let i=0;i<positions.array.length;i++)positions.array[i]=a.positions[i]+(b.positions[i]-a.positions[i])*mix;positions.needsUpdate=true;let n=0;for(let i=0;i<positions.array.length;i+=9)for(const [start,end]of [[0,3],[3,6],[6,0]])for(const point of [start,end])for(let axis=0;axis<3;axis++)edges.array[n++]=positions.array[i+point+axis];edges.needsUpdate=true;record.custom.geometry.computeBoundingSphere();record.custom.lines.geometry.computeBoundingSphere();}

  for(const mat of record.paper){mat.opacity=(1-appearance.transparency)*p.opacity*p.presence;mat.color.setRGB(...p.tint).lerp(new THREE.Color('#f4efdf'),appearance.view==='blueprint'?.8:.3);}
  for(const {id,mesh,mat}of photos){mesh.position.set(0,p.height/2,p.depth/2+.015);mesh.scale.set(p.width,p.height,1);mat.opacity=appearance.view==='photo'?(p.media[id]||0)*p.presence*(1-appearance.transparency*.65):0;mesh.visible=mat.opacity>.001;}
  const transition=Math.sin(interval(spec.keys,time).mix*Math.PI);guide.visible=appearance.guides;guide.material.opacity=.11+transition*.24;guide.geometry.setDrawRange(0,Math.max(2,Math.floor(record.guideCount*(.28+.72*transition)/2)*2));
 }
 for(const {spec,mat,mesh}of layers){mat.opacity=appearance.view==='photo'?sampleKeys(spec.keys,time).opacity:0;mesh.visible=mat.opacity>.001;}registration.visible=appearance.guides;root.updateMatrixWorld(true);return time;}
 const api={root,objects,layers,primitives,setTime,setAppearance(next){appearance={...appearance,...next};setTime(time);},snapshot(){return Object.fromEntries([...objects].map(([id,r])=>[id,{...r.pose,matrix:r.group.matrixWorld.toArray()}]));},mediaPose(){return [...layers.map(r=>({id:r.spec.id,matrix:r.mesh.matrixWorld.toArray(),opacity:r.mat.opacity})),...[...objects].flatMap(([id,r])=>r.photos.map(p=>({id:`${id}:${p.id}`,matrix:p.mesh.matrixWorld.toArray(),opacity:p.mat.opacity})))];},anchor(id){const r=objects.get(id);if(!r)return new THREE.Vector3();return new THREE.Vector3(0,r.pose.height+r.pose.roof+.9,0).applyMatrix4(r.group.matrixWorld);},dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();root.clear();objects.clear();layers.length=0;}};setTime(0);return api;
}
export function cameraFor(definition,aspect=1){const span=Math.max(definition.camera.span,42*aspect),camera=new THREE.OrthographicCamera(-span/2,span/2,span/aspect/2,-span/aspect/2,.1,500);camera.position.fromArray(definition.camera.position);camera.up.set(0,1,0);camera.lookAt(new THREE.Vector3(...definition.camera.target));camera.updateMatrixWorld(true);return camera;}
