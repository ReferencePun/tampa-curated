import * as THREE from 'three';

export const ease=t=>{const v=Math.max(0,Math.min(1,t));return v*v*(3-2*v);};
export function stageProgress(progress,stage){return ease((progress-stage[0])/(stage[1]-stage[0]));}
/** A panel's points and hinge are local to its parent. The sheet lives in XY;
 * root.rotation.x maps it to the world's XZ ground plane. No DOM or camera. */
export function createFoldingRig(definition,{transparency=.72,variation=.4,guides=true}={}){
  if(!Array.isArray(definition.panels)||!definition.panels.length||definition.panels.length>160)throw new Error('Define between 1 and 160 fold panels.');
  if(!Number.isFinite(transparency)||transparency<0||transparency>1||!Number.isFinite(variation)||variation<0||variation>1)throw new Error('Transparency and ink variation must be between 0 and 1.');
  const specs=new Map(),visiting=new Set(),visited=new Set(),ordered=[];
  for(const panel of definition.panels){
    if(!panel.id||specs.has(panel.id))throw new Error('Each panel needs a unique id.');specs.set(panel.id,panel);
    if(!Array.isArray(panel.pivot)||panel.pivot.length!==3||panel.pivot.some(n=>!Number.isFinite(n)))throw new Error(`Invalid pivot: ${panel.id}`);
    if(panel.axis&&(!Array.isArray(panel.axis)||panel.axis.length!==3||panel.axis.some(n=>!Number.isFinite(n))||Math.hypot(...panel.axis)<1e-6))throw new Error(`Invalid hinge axis: ${panel.id}`);
    if(!Number.isFinite(panel.angle??0)||!Number.isFinite(panel.restZ??0))throw new Error(`Invalid rotation: ${panel.id}`);
    if(!panel.stage||panel.stage.length!==2||panel.stage.some(n=>!Number.isFinite(n)||n<0||n>1)||panel.stage[1]<=panel.stage[0])throw new Error(`Invalid stage: ${panel.id}`);
    for(const points of [panel.outline||[],...(panel.holes||[]),...(panel.strokes||[]).map(s=>s.points)]){
      if(!Array.isArray(points)||points.length>4096||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))))throw new Error(`Invalid local geometry: ${panel.id}`);
    }
  }
  function visit(panel,depth=0){if(depth>32||visiting.has(panel.id))throw new Error('Fold parents must form an acyclic hierarchy.');if(visited.has(panel.id))return;visiting.add(panel.id);if(panel.parent){if(!specs.has(panel.parent))throw new Error(`Unknown parent: ${panel.parent}`);visit(specs.get(panel.parent),depth+1);}visiting.delete(panel.id);visited.add(panel.id);ordered.push(panel);}
  for(const panel of specs.values())visit(panel);
  const root=new THREE.Group();root.name=definition.name;root.rotation.x=-Math.PI/2;
  const panels=new Map(),materials=new Set(),paperMaterials=new Set(),guideObjects=[];let primitives=0,disposed=false;
  const palette={ink:[0x454440,.8],pencil:[0x777269,.36],guide:[0x54767e,.42],accent:[0x9d654c,.65]};
  const lineMaterials=Object.fromEntries(Object.entries(palette).map(([kind,[color,opacity]])=>{const mat=new THREE.LineBasicMaterial({color,opacity,transparent:true,depthWrite:false});materials.add(mat);return [kind,mat];}));
  for(let index=0;index<ordered.length;index++){
    const spec=ordered[index],anchor=new THREE.Group(),hinge=new THREE.Group();anchor.name=`${spec.id}:pivot`;hinge.name=spec.id;
    anchor.position.fromArray(spec.pivot);anchor.rotation.z=spec.restZ||0;anchor.add(hinge);(spec.parent?panels.get(spec.parent).hinge:root).add(anchor);
    const axis=new THREE.Vector3(...(spec.axis||[1,0,0])).normalize();panels.set(spec.id,{anchor,hinge,spec,axis});
    if(spec.outline?.length>=3&&spec.surface!==false){
      const shape=new THREE.Shape(spec.outline.map(p=>new THREE.Vector2(...p)));
      for(const hole of spec.holes||[])shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(...p))));
      const material=new THREE.MeshBasicMaterial({color:spec.paper||0xf5f0e5,side:THREE.DoubleSide,transparent:true,opacity:1-transparency,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
      materials.add(material);paperMaterials.add(material);const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.name=`${spec.id}:paper`;mesh.renderOrder=0;hinge.add(mesh);
    }
    const buffers={ink:[],pencil:[],guide:[],accent:[]};let serial=index*977;
    const noise=()=>{const n=Math.sin(++serial*127.13)*43758.5453;return n-Math.floor(n)-.5;};
    const strokes=[...(spec.strokes||[])];if(spec.outline?.length>=3)strokes.push({points:[...spec.outline,spec.outline[0]],kind:spec.edgeKind||'ink'});
    for(const hole of spec.holes||[])strokes.push({points:[...hole,hole[0]],kind:'ink'});
    for(const stroke of strokes){
      const kind=stroke.kind||'ink';if(!buffers[kind])throw new Error(`Unknown ink kind: ${kind}`);
      for(let i=1;i<stroke.points.length;i++){
        const a=stroke.points[i-1],b=stroke.points[i],rough=kind==='guide'?0:variation*.018;
        buffers[kind].push(a[0]+noise()*rough,a[1]+noise()*rough,.012,b[0]+noise()*rough,b[1]+noise()*rough,.012);primitives++;
      }
    }
    for(const [kind,vertices] of Object.entries(buffers))if(vertices.length){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      const lines=new THREE.LineSegments(geometry,lineMaterials[kind]);lines.name=`${spec.id}:${kind}`;lines.renderOrder=1;hinge.add(lines);if(kind==='guide'){lines.visible=guides;guideObjects.push(lines);}
    }
  }
  const rig={root,panels,primitives,
    setProgress(value){if(!Number.isFinite(value))throw new Error('Fold progress must be finite.');const progress=Math.max(0,Math.min(1,value));for(const {hinge,spec,axis} of panels.values())hinge.quaternion.setFromAxisAngle(axis,(spec.angle||0)*stageProgress(progress,spec.stage));root.updateMatrixWorld(true);return progress;},
    setAppearance({transparency:value=transparency,guides:visible=guides}={}){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Paper transparency must be between 0 and 1.');transparency=value;guides=visible;for(const material of paperMaterials)material.opacity=1-value;for(const object of guideObjects)object.visible=visible;},
    bounds(){return new THREE.Box3().setFromObject(root);},
    pose(){return Object.fromEntries([...panels].map(([id,{hinge}])=>[id,hinge.matrixWorld.toArray()]));},
    dispose(){if(disposed)return;disposed=true;root.traverse(object=>object.geometry?.dispose());for(const material of materials)material.dispose();root.clear();panels.clear();}
  };rig.setProgress(0);return rig;
}
