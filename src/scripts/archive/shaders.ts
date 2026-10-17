// Original archive shaders. All texture noise is spatial and deterministic:
// no clock drives the ink, so an untouched photograph is completely still.
const field = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uPointer;
uniform vec2 uTrail;
uniform float uRadius;
uniform float uFalloff;
uniform float uStrength;
uniform float uEnergy;
uniform float uResolve;
uniform float uSelection;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
 vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float materialField(vec2 uv) {
 vec2 px=uv*uSize;
 float grain=noise(px*.048)*.62+noise(px*.17)*.25+hash(floor(px*.6))*.13;
 float distanceNow=length((uv-uPointer)*uSize);
 float distanceTrail=length((uv-uTrail)*uSize)+uRadius*.22;
 float d=min(distanceNow,mix(distanceNow,distanceTrail,uEnergy*.6));
 float edge=uRadius*(.68+grain*.65);
 float reveal=1.-smoothstep(edge*(1.-uFalloff),edge,d);
 // An uneven, granular edge instead of a smooth circular window.
 reveal=smoothstep(.02+grain*.28,.92,reveal)*uStrength;
 return max(reveal,uResolve);
}
`;

export const photoVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }
`;
export const photoFragment = /* glsl */ `
precision highp float;
uniform sampler2D uPhoto;
uniform vec4 uCrop;
varying vec2 vUv;
${field}
void main(){
 float reveal=materialField(vUv);
 if(reveal<.003) discard;
 vec3 color=texture2D(uPhoto,mix(uCrop.xy,uCrop.zw,vUv)).rgb;
 float gray=dot(color,vec3(.299,.587,.114));
 vec3 warm=vec3(gray*1.02,gray*.98,gray*.91);
 // Keep a little of the original emulsion; the photograph is fully legible.
 color=mix(warm,color,.10);
 gl_FragColor=vec4(color,reveal);
}
`;
export const inkVertex = /* glsl */ `
attribute vec2 aUV;
attribute vec3 aMark;
attribute float aInk;
uniform float uCell;
uniform float uDpr;
varying vec3 vMark;
varying float vInk;
varying float vReveal;
${field}
void main(){
 vec2 uv=aUV;
 float reveal=materialField(uv);
 vec2 delta=(uv-uPointer)*uSize;
 float dist=length(delta);
 vec2 outward=delta/max(1.,dist);
 vec2 tangent=vec2(-outward.y,outward.x);
 float ring=exp(-pow((dist-uRadius*.55)/(uRadius*.46),2.))*uStrength;
 vec2 shift=(outward*(2.+aMark.x*5.)+tangent*(aMark.y-.5)*8.)*ring*(.2+uEnergy);
 // A brief, contained rearrangement as the selected plate resolves.
 shift+=(uv-.5)*sin(uSelection*3.14159)*(5.+aMark.z*9.);
 gl_Position=vec4(position.xy+shift/uSize*2.,0.,1.);
 gl_PointSize=clamp(uCell*(.5+aInk*1.85)*(.65+aMark.x*.65)*uDpr,1.,15.);
 vMark=aMark; vInk=aInk; vReveal=reveal;
}
`;
export const inkFragment = /* glsl */ `
precision highp float;
varying vec3 vMark;
varying float vInk;
varying float vReveal;
void main(){
 vec2 p=gl_PointCoord-.5;
 float angle=vMark.y*6.28318;
 p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
 float shape;
 if(vMark.z>.82){
  float a=length(p*vec2(1.2,4.));
  float b=length(p*vec2(4.,1.4));
  shape=min(a,b);
 }else if(vMark.z>.57){ shape=length(p*vec2(1.05,3.2)); }
 else { shape=length(p*vec2(1.,1.1+vMark.z)); }
 shape+=sin(p.x*25.+vMark.x*8.)*.025;
 float alpha=(1.-smoothstep(.32,.5,shape))*(.36+vInk*.60)*(1.-vReveal);
 if(alpha<.006)discard;
 vec3 charcoal=mix(vec3(.29,.245,.20),vec3(.105,.094,.080),vInk);
 gl_FragColor=vec4(charcoal,alpha);
}
`;
