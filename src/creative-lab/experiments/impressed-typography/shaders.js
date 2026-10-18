export const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const fragment = `precision highp float;
varying vec2 uv;
uniform sampler2D glyph,grain;
uniform vec2 texel;
uniform vec3 paper,ink,light;
uniform float depth,roughness,fiber,specular,intensity,highlight,softness,pressed,inked,aged,contrast;
float shape(vec2 p){return texture2D(glyph,clamp(p,vec2(0.),vec2(1.))).g*depth;}
float textureHeight(vec2 p){return (texture2D(grain,p*vec2(4.6875,3.125)).r-.5)*roughness*.0012;}
float heightAt(vec2 p){return shape(p)+textureHeight(p);}
vec3 linearize(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 encode(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
void main(){
 vec4 g=texture2D(glyph,uv);vec3 grainValue=texture2D(grain,uv*vec2(4.6875,3.125)).rgb;
 float h=heightAt(uv);float dx=(heightAt(uv+vec2(texel.x,0.))-heightAt(uv-vec2(texel.x,0.)))/(3.*texel.x);
 float dy=(heightAt(uv+vec2(0.,texel.y))-heightAt(uv-vec2(0.,texel.y)))/(2.*texel.y);
 vec3 normal=normalize(vec3(-dx,-dy,1.));float diffuse=max(0.,dot(normal,light));
 float occlusion=0.;float origin=shape(uv);vec2 ray=light.xy/vec2(1.5,1.);float range=.065;
 for(int i=1;i<=20;i++){float t=float(i)/20.*range;float obstruction=shape(uv+ray*t)-(origin+light.z*t+.00018);occlusion=max(occlusion,smoothstep(0.,.0002+softness*.004,obstruction));}
 float coverage=g.r*pressed;float dry=smoothstep(.05,.35+roughness*.38,grainValue.g);float accumulation=(1.-g.g)*.2;
 float inkAmount=coverage*inked*clamp(.78+dry*.22+accumulation-roughness*(1.-dry)*.16,0.,1.);
 vec3 base=mix(linearize(paper),linearize(ink),inkAmount);float fleck=(1.-grainValue.b)*fiber*.11;
 base*=1.-fleck+(grainValue.r-.5)*roughness*.12;
 if(aged>.5){float edge=pow(length((uv-.5)*vec2(1.,.8)),2.);base*=1.-edge*.14;}
 float ambient=.38;float illumination=ambient+intensity*diffuse*.82;illumination*=1.-occlusion*.48;
 vec3 halfVector=normalize(light+vec3(0.,0.,1.));float shine=pow(max(0.,dot(normal,halfVector)),mix(110.,9.,highlight))*specular*intensity;
 vec3 color=base*illumination+vec3(shine)*(1.-inkAmount*.7);
 if(contrast>.5)color=mix(vec3(.97),vec3(.035),g.r);
 gl_FragColor=vec4(clamp(encode(color),0.,1.),1.);
}`;
