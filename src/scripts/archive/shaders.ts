import {grainGLSL} from "../../creative-lab/experiments/particle-photos/grain.js";
import {flowGLSL} from "../../creative-lab/experiments/particle-photos/flow.js";
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
uniform sampler2D uWake;
float materialField(vec2 uv) {
 return max(texture2D(uWake,uv).r,uResolve);
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

 vec3 color=texture2D(uPhoto,mix(uCrop.xy,uCrop.zw,vUv)).rgb;
 // The persistent wake exposes the registered photograph between real grains.
 gl_FragColor=vec4(mix(vec3(.12549,.10588,.07451),color,reveal),1.);
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
varying float vBend;
${flowGLSL}
${field}
void main(){
 vec2 uv=aUV;
 float reveal=materialField(uv);
 vec2 flow=materialFlow(uv);
 vec2 shift=flow*min(uSize.x,uSize.y)*(.72+aMark.z*.56)*(1.-uResolve);
 // A brief, contained rearrangement as the selected plate resolves.
 shift+=(uv-.5)*sin(uSelection*3.14159)*(5.+aMark.z*9.);
 gl_Position=vec4(position.xy+shift/uSize*2.,0.,1.);
 gl_PointSize=clamp(uCell*(.82+sqrt(aInk)*.48)*(.93+aMark.x*.14)*uDpr,.7,5.);
 vBend=atan(flow.y,flow.x+.0000001)*min(length(flow)*14.,.26);
 vMark=aMark; vInk=aInk; vReveal=materialField(uv+shift/uSize);
}
`;
export const inkFragment = /* glsl */ `
precision highp float;
varying vec3 vMark;
varying float vInk;
varying float vReveal;
varying float vBend;
${grainGLSL}
void main(){
 vec2 p=gl_PointCoord-.5;
 float angle=(vMark.y-.5)*.12+vBend;
 p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
 float shape;
 shape=grainShape(p,vMark.z);
 shape+=sin(p.x*25.+vMark.x*8.)*.008;
 float alpha=(1.-smoothstep(.32,.5,shape))*(.80+vInk*.20)*(1.-vReveal);
 if(alpha<.006)discard;
 vec3 charcoal=grainPigment(vInk,vec3(.875,.722,.475));
 gl_FragColor=vec4(charcoal,alpha);
}
`;
