import {grainGLSL} from "./grain.js";
import {flowGLSL} from "./flow.js";
export const vertex = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec2 anchor;
layout(location=1) in vec4 info;
layout(location=2) in vec4 extra;
uniform vec2 canvasSize,grid,pointer;
uniform vec4 view;
uniform float radius,displacement,scatter,original,engagement,markSize,contrast;
uniform int mode,layer;
uniform int night;
uniform sampler2D wake;
out vec2 markUV,photoUV;
out vec4 detail;
out vec2 randomMark;
${flowGLSL.replaceAll("texture2D", "texture")}
void main(){
 vec2 corner=vec2(gl_VertexID&1,gl_VertexID>>1)-.5;
 float r=info.w,q=extra.x,dark=pow(clamp(1.-info.x,0.,1.),contrast);
 float field=texture(wake,anchor).r;
 float resolve=mix(clamp(field,0.,1.),1.,original);
 if(layer==0){
  // Fixed image mosaic: cursor motion never changes these photographic vertices.
  vec2 position=view.xy+(anchor+corner/grid)*view.zw;
  gl_Position=vec4((position/canvasSize*2.-1.)*vec2(1.,-1.),0.,1.);
  markUV=corner+.5;photoUV=anchor+corner/grid;
  detail=vec4(0.,0.,resolve,original);randomMark=vec2(r,q);return;
 }
 float spread=scatter*(1.-original)*min(view.z,view.w)*(.22+q*.72);
 vec2 flow=materialFlow(anchor);
 vec2 shift=flow*min(view.z,view.w)*(displacement/24.)*(.72+q*.56)*(1.-original)+vec2(cos(r*6.2831853),sin(r*6.2831853))*spread;
 vec2 cell=view.zw/grid;
 vec2 jitter=vec2(r-.5,q-.5)*cell*(night==1?.30:.66);
 float bend=atan(flow.y,flow.x+.0000001)*min(length(flow)*14.,.26);
 float angle=(night==1?(r-.5)*.12+bend:info.z+(r-.5)*.65)+(q-.5)*scatter*5.;
 mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
 float weight=night==1?(.82+sqrt(info.x)*.48):(.8+dark*1.6);
 vec2 size=cell*weight*markSize;
 vec2 position=view.xy+anchor*view.zw+jitter+shift+rotation*(corner*size);
 gl_Position=vec4((position/canvasSize*2.-1.)*vec2(1.,-1.),0.,1.);
 markUV=corner+.5;photoUV=anchor+corner/grid;
 vec2 destination=anchor+(shift+jitter)/view.zw;
 float coverage=texture(wake,clamp(destination,vec2(0.),vec2(1.))).r;
 detail=vec4(night==1?pow(info.x,contrast*.68):dark,info.y,mix(coverage,1.,original),original);randomMark=vec2(r,q);
}`;
export const fragment = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D photo;
uniform vec3 ink;
uniform int mode,layer;
uniform int night;
uniform float scatter;
in vec2 markUV,photoUV;
in vec4 detail;
in vec2 randomMark;
out vec4 result;
${grainGLSL}
void main(){
 vec2 p=markUV-.5;float r=randomMark.x,q=randomMark.y,dark=detail.x,resolve=detail.z;
 if(layer==0){ result=vec4(texture(photo,clamp(photoUV,0.,1.)).rgb,resolve);return; }
 float shape;
 if(night==1)shape=grainShape(p,q);
 else if(q>.84)shape=min(length(p*vec2(1.2,4.8)),length(p*vec2(4.8,1.3)));
 else if(q>.37)shape=length(p*vec2(1.05,3.7));
 else shape=length(p*vec2(1.5,1.7));
 shape+=sin(p.x*36.+r*18.)*(night==1?.008:.025);
 float mark=1.-smoothstep(.34,.49,shape);
 float selected=smoothstep(r-.055,r+.055,night==1?.08+sqrt(dark)*1.2+detail.y*.25:.04+dark*.94+detail.y*.4);
 float alpha=mark*selected*(night==1?.80+dark*.20:.36+dark*.64)*(1.-resolve);
 vec3 color=texture(photo,clamp(photoUV,0.,1.)).rgb;
 vec3 resolved=color;
 float tone=0.;
 if(mode==1)tone=max(tone,scatter*.7);
 if(mode==1&&scatter>.05)alpha*=1.-scatter*.15*(1.-detail.w);
 if(alpha<.01)discard;
 vec3 pigment=night==1?grainPigment(dark,ink):ink;
 result=vec4(mix(pigment,resolved,tone),alpha);
}`;
