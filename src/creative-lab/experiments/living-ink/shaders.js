export const vertex=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const simulation=`#version 300 es
precision highp float;
uniform sampler2D stateTex,maskTex;
uniform vec2 diffusion,reaction;
uniform float influence;
uniform int mode,brushCount;
uniform bool advance;
uniform vec4 brush[24];
out vec4 result;
vec4 cell(ivec2 p){return texelFetch(stateTex,clamp(p,ivec2(0),textureSize(stateTex,0)-1),0);}
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy);vec2 size=vec2(textureSize(stateTex,0));vec4 s=cell(p);
 if(advance){
  vec2 lap=-s.rg;
  lap+=.2*(cell(p+ivec2(1,0)).rg+cell(p+ivec2(-1,0)).rg+cell(p+ivec2(0,1)).rg+cell(p+ivec2(0,-1)).rg);
  lap+=.05*(cell(p+ivec2(1,1)).rg+cell(p+ivec2(-1,1)).rg+cell(p+ivec2(1,-1)).rg+cell(p+ivec2(-1,-1)).rg);
  float a=texelFetch(maskTex,p,0).r,factor=mode==0?0.:influence;
  float feed=reaction.x+factor*(a-.5)*.008;
  float kill=reaction.y+factor*((1.-a)*(mode==1?.035:.012)-a*.006);
  float uvv=s.r*s.g*s.g;
  result=vec4(clamp(s.rg+.8*(diffusion*lap+vec2(-uvv+feed*(1.-s.r),uvv-(feed+kill)*s.g)),0.,1.),clamp(s.b+max(0.,s.g-.12)*.0008,0.,1.),max(s.a,clamp((s.g-.015)*4.,0.,1.)));
 }else{
  result=s;
  for(int j=0;j<24;j++){if(j>=brushCount)break;float d=distance(vec2(p)+.5,brush[j].xy*size)/(brush[j].z*size.x);float a=(1.-smoothstep(.65,1.,d))*brush[j].w;result.r=min(result.r,1.-a*.65);result.g=max(result.g,a*.55);result.a=max(result.a,a*.6);}
 }
}`;
export const display=`#version 300 es
precision highp float;
uniform sampler2D stateTex,maskTex;
uniform vec3 ink;
uniform vec4 view;
uniform float canvasHeight;
uniform int mode;
uniform bool guides;
out vec4 result;
vec4 sampleState(vec2 p){vec2 size=vec2(textureSize(stateTex,0));vec2 t=p*size-.5,base=floor(t),f=fract(t);ivec2 hi=textureSize(stateTex,0)-1;return mix(mix(texelFetch(stateTex,clamp(ivec2(base),ivec2(0),hi),0),texelFetch(stateTex,clamp(ivec2(base)+ivec2(1,0),ivec2(0),hi),0),f.x),mix(texelFetch(stateTex,clamp(ivec2(base)+ivec2(0,1),ivec2(0),hi),0),texelFetch(stateTex,clamp(ivec2(base)+ivec2(1,1),ivec2(0),hi),0),f.x),f.y);}
void main(){
 vec2 uv=(vec2(gl_FragCoord.x,canvasHeight-gl_FragCoord.y)-view.xy)/view.zw;
 vec3 paper=vec3(.958,.945,.909);
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))){result=vec4(paper,1.);return;}
 vec4 s=sampleState(uv);vec4 mask=texture(maskTex,uv);
 float contour=smoothstep(.06,.072,s.g)*(1.-smoothstep(.078,.091,s.g));
 float innerLine=smoothstep(.17,.18,s.g)*(1.-smoothstep(.19,.2,s.g));
 vec2 px=uv*vec2(textureSize(stateTex,0));
 float hatch=pow(.5+.5*sin((px.x+px.y*.72)*2.8),12.);
 float cross=pow(.5+.5*sin((px.x-px.y*.9)*3.1),16.);
 float pigment=contour*(.58+.12*sin(px.x*1.17+px.y*.31))+innerLine*.2+smoothstep(.1,.35,s.g)*(.06+.3*hatch+.1*cross)+s.b*.055;
 if(mode==1)pigment=max(pigment*.28,mask.g*min(1.,s.a*1.35)*(.7+.2*hatch));
 if(mode==2)pigment=min(1.,s.a*1.5)*pow(mask.g,.7)*(.8+.15*hatch)+contour*.035;
 if(mode==1&&guides)pigment=max(pigment,mask.b*.15);
 result=vec4(mix(paper,ink,clamp(pigment,0.,.94)),1.);
}`;
