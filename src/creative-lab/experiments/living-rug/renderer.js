import * as THREE from 'three';
import {hash} from '../../shared/tactile/field.js';
import {rugColor} from './pattern.js';
const vertex=`
attribute vec4 root;attribute vec3 pigment;varying vec3 ink;varying float along,across,shine,phase,brushed;
uniform sampler2D memory;uniform float clock,fiberLength,wind,strength;uniform vec2 extent;
void main(){float t=position.y;vec2 uv=root.xy*.5+.5;vec3 f=texture2D(memory,vec2(uv.x,1.-uv.y)).rgb;vec2 brush=(f.rg-.5)*3.;brush.y=-brush.y;
 vec2 p=root.xy;float a=atan(sin(p.x*7.+cos(p.y*6.)+clock*.19)+cos(p.y*9.-clock*.13),cos(p.y*7.+sin(p.x*5.)-clock*.16)+sin(p.x*8.+clock*.11));
 float curl=sin(p.x*9.+p.y*7.+clock*.23)*1.55;float l=(.05+root.z*.075)*fiberLength;float theta=a+curl*t+(root.w-.5)*.18;
 vec2 d=vec2(cos(theta),sin(theta))*(l*t*(.4+wind*.75));d+=brush*.22*t*t;
 float crossWidth=.0044*(.65+root.w*.6)*(1.-t*.62);vec2 side=vec2(-sin(theta),cos(theta))*position.x*crossWidth;
 vec3 point=vec3((p+d+side)*extent,.014+sin(t*3.14159)*l*.65+f.b*.035);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(point,1.);ink=pigment;along=t;across=position.x;shine=.86+.12*cos(theta-.8)+.10*pow(t,2.);phase=root.w*6.28318+p.x*5.+p.y*7.;brushed=min(1.,length(brush)*.6);
}`;
const fragment=`precision highp float;varying vec3 ink;varying float along,across,shine,phase,brushed;uniform float clock,glow,shimmer;
void main(){
 float edge=1.-smoothstep(.20,1.,abs(across));
 float tip=1.-smoothstep(.965,1.,along);
 float roundness=sqrt(max(0.,1.-across*across));
 vec3 c=ink*shine*(.56+.42*smoothstep(0.,.7,along))*(.76+.24*roundness);
 // Broad moving gleams run along the actual curved strand, never over the image as an overlay.
 float pulse=pow(.5+.5*sin(along*6.1-clock*.9*shimmer+phase),3.);
 float core=exp(-across*across*7.5);
 float gleam=(.06+1.05*pulse)*(.12+.88*pow(.5+.5*sin(phase*3.7),3.));
 vec3 radiance=mix(ink/max(.15,max(ink.r,max(ink.g,ink.b))),vec3(.88,.96,1.),.12+.40*pulse);
 c+=radiance*core*gleam*glow*(.92+brushed*.48);
 c+=ink*glow*.09*roundness;
 c=pow(max(c,vec3(0.)),vec3(.9));
 gl_FragColor=vec4(c,edge*tip);
}`;
const fullscreenVertex=`varying vec2 uvp;void main(){uvp=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const bloomFragment=`precision highp float;varying vec2 uvp;uniform sampler2D source;uniform vec2 direction;uniform bool extract;
vec3 sampleLight(vec2 p){vec3 c=texture2D(source,p).rgb;return extract?c*smoothstep(.58,.94,dot(c,vec3(.2126,.7152,.0722))):c;}
void main(){vec3 c=sampleLight(uvp)*.227027;c+=(sampleLight(uvp+direction*1.384615)+sampleLight(uvp-direction*1.384615))*.316216;c+=(sampleLight(uvp+direction*3.230769)+sampleLight(uvp-direction*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`;
export function createRugRenderer(canvas,field,initial){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.65,1.65,1.15,-1.15,.1,10);camera.position.set(0,0,5);scene.background=new THREE.Color('#090e13');
 // Bright-pass bloom is a separate, bounded half-resolution pass. The pattern remains in the sharp base.
 const surface=new THREE.WebGLRenderTarget(1,1,{samples:4}),finishScene=new THREE.Scene(),finishCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const bloomA=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),bloomB=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false}),blurScene=new THREE.Scene();
 const blurMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:surface.texture},direction:{value:new THREE.Vector2()},extract:{value:true}},vertexShader:fullscreenVertex,fragmentShader:bloomFragment});
 const finishMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{pile:{value:surface.texture},bloom:{value:bloomB.texture},glow:{value:1},texel:{value:new THREE.Vector2(1,1)}},vertexShader:fullscreenVertex,fragmentShader:`precision highp float;varying vec2 uvp;uniform sampler2D pile,bloom;uniform vec2 texel;uniform float glow;
void main(){vec2 d=texel*.8;vec3 c=texture2D(pile,uvp).rgb*.48;c+=(texture2D(pile,uvp+vec2(d.x,0.)).rgb+texture2D(pile,uvp-vec2(d.x,0.)).rgb+texture2D(pile,uvp+vec2(0.,d.y)).rgb+texture2D(pile,uvp-vec2(0.,d.y)).rgb)*.13;
vec3 halo=texture2D(bloom,uvp).rgb;vec2 wide=texel*7.;vec3 aura=(texture2D(bloom,uvp+vec2(wide.x,0.)).rgb+texture2D(bloom,uvp-vec2(wide.x,0.)).rgb+texture2D(bloom,uvp+vec2(0.,wide.y)).rgb+texture2D(bloom,uvp-vec2(0.,wide.y)).rgb)*.25;
c=1.-(1.-clamp(c,0.,1.))*exp(-(halo*.65+aura*.22)*glow);gl_FragColor=vec4(c,1.);}`}),finishGeometry=new THREE.PlaneGeometry(2,2);finishScene.add(new THREE.Mesh(finishGeometry,finishMaterial));blurScene.add(new THREE.Mesh(finishGeometry,blurMaterial));
 const texture=new THREE.DataTexture(field.data,field.size,field.size);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
 // Coverage masks the fringe before depth writing, so feathered edges don't cut holes in neighboring fibers.
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,alphaToCoverage:true,depthWrite:true,side:THREE.DoubleSide,uniforms:{memory:{value:texture},clock:{value:0},glow:{value:1},shimmer:{value:1},fiberLength:{value:1},wind:{value:1},strength:{value:1},extent:{value:new THREE.Vector2(1.3,.84)}}});
 const backingGeometry=new THREE.PlaneGeometry(2.6,1.68,128,80),backingMaterial=new THREE.MeshBasicMaterial({vertexColors:true}),backing=new THREE.Mesh(backingGeometry,backingMaterial);backing.position.z=.002;scene.add(backing);
 let mesh,geometry,count=0,palette='',width=1,height=1;
 function configure(c){if(count!==c.density||palette!==c.palette){if(mesh)scene.remove(mesh);geometry?.dispose();geometry=new THREE.InstancedBufferGeometry();const pos=[],indices=[],segments=14;for(let j=0;j<=segments;j++){pos.push(-1,j/segments,0,1,j/segments,0);if(j<segments){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setIndex(indices);const roots=new Float32Array(c.density*4),colors=new Float32Array(c.density*3);const cols=Math.ceil(Math.sqrt(c.density*1.55)),rows=Math.ceil(c.density/cols);for(let i=0;i<c.density;i++){const x=((i%cols+hash(i)*.8)/cols)*2-1,y=((Math.floor(i/cols)+hash(i+77)*.8)/rows)*2-1;roots.set([x,y,hash(i+18),hash(i+92)],i*4);colors.set(rugColor(x,y,c.palette),i*3);}geometry.setAttribute('root',new THREE.InstancedBufferAttribute(roots,4));geometry.setAttribute('pigment',new THREE.InstancedBufferAttribute(colors,3));geometry.instanceCount=c.density;mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);count=c.density;palette=c.palette;
 const p=backingGeometry.attributes.position,baseColors=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)baseColors.set(rugColor(p.getX(i)/1.3,p.getY(i)/.84,c.palette).map(v=>v*.22),i*3);backingGeometry.setAttribute('color',new THREE.BufferAttribute(baseColors,3));
 }material.uniforms.fiberLength.value=c.length;material.uniforms.wind.value=c.current;material.uniforms.glow.value=c.glow;material.uniforms.shimmer.value=c.shimmer;finishMaterial.uniforms.glow.value=c.glow;camera.zoom=c.zoom;camera.updateProjectionMatrix();}
 function resize(w,h,c){width=w;height=h;renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setSize(w,h,false);surface.setSize(canvas.width,canvas.height);for(const target of [bloomA,bloomB])target.setSize(Math.max(1,Math.ceil(canvas.width/2)),Math.max(1,Math.ceil(canvas.height/2)));finishMaterial.uniforms.texel.value.set(1/w,1/h);const a=w/h;camera.left=-Math.max(1.55,1.12*a);camera.right=-camera.left;camera.top=Math.max(1.12,1.55/a);camera.bottom=-camera.top;configure(c);}
 configure(initial);return {configure,resize,input(x,y){return [((x-.5)*(camera.right-camera.left)/camera.zoom/1.3+1)*.5,(1-(.5-y)*(camera.top-camera.bottom)/camera.zoom/.84)*.5];},draw(c){texture.needsUpdate=true;material.uniforms.clock.value=field.time*c.current;renderer.setRenderTarget(surface);renderer.render(scene,camera);
 blurMaterial.uniforms.source.value=surface.texture;blurMaterial.uniforms.extract.value=true;blurMaterial.uniforms.direction.value.set(2.2/width,0);renderer.setRenderTarget(bloomA);renderer.render(blurScene,finishCamera);
 blurMaterial.uniforms.source.value=bloomA.texture;blurMaterial.uniforms.extract.value=false;blurMaterial.uniforms.direction.value.set(0,2.2/height);renderer.setRenderTarget(bloomB);renderer.render(blurScene,finishCamera);
 renderer.setRenderTarget(null);renderer.render(finishScene,finishCamera);},stats:()=>({width,height,primitives:count,renderer:'Luminous silk fibers · local gleams and bloom'}),dispose(){geometry.dispose();material.dispose();backingGeometry.dispose();backingMaterial.dispose();texture.dispose();surface.dispose();bloomA.dispose();bloomB.dispose();blurMaterial.dispose();finishGeometry.dispose();finishMaterial.dispose();blurScene.clear();finishScene.clear();scene.clear();renderer.dispose();renderer.forceContextLoss();}};
}
