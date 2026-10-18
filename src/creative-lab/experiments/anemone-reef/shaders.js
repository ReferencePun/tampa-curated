export const vertex=`
attribute vec4 rootShape; attribute vec4 anatomy; attribute vec4 response;
uniform float clock; uniform float lengthScale; uniform float thickness; uniform float current;
varying vec3 vNormal; varying vec3 vWorld; varying float vHeight; varying float vTone;
vec3 center(float t,out vec3 tangent){
 float phase=anatomy.z,h=rootShape.w*lengthScale*(1.-response.z*.23);
 float a=clock*.71+phase+t*1.5,b=clock*.91+phase-t*2.5,c=clock*.7+phase-t*2.;
 float swell=sin(a)*.18+sin(clock*.39+rootShape.x*.27+rootShape.z*.2)*.32;
 vec2 lean=anatomy.xy+response.xy+vec2(-.68+swell,cos(clock*.48+phase)*.16)*current;
 vec2 elbow=vec2(sin(phase)*.5,cos(phase*1.7)*.35),flow=vec2(sin(b)*.08,cos(c)*.05);
 float ease=pow(t,1.8);
 vec2 bend=lean*ease+elbow*sin(t*3.14159)+flow*current*t*t;
 vec2 derivative=lean*1.8*pow(t,.8)+vec2(cos(a)*.27,0.)*current*ease+elbow*3.14159*cos(t*3.14159)+(vec2(-cos(b)*.2,sin(c)*.1)*t*t+flow*2.*t)*current;
 tangent=normalize(vec3(derivative.x,h+8.1*pow(1.-t,2.),derivative.y));
 return rootShape.xyz+vec3(bend.x,h*t-2.7*pow(1.-t,3.),bend.y);
}
void main(){
 float rad=anatomy.w*thickness; float ratio=min(.15,rad/(rootShape.w*lengthScale));
 float cap=position.y>1.?position.y-1.:0.; float t=position.y>1.?1.-ratio+sin(cap)*ratio:position.y*(1.-ratio);
 vec3 tangent;vec3 p=center(t,tangent);
 vec3 side=normalize(cross(vec3(0.,0.,1.),tangent)),front=normalize(cross(tangent,side));
 vec3 circle=side*position.x+front*position.z;
 float fullness=1.12-.29*t+sin(t*3.14159)*(.08+sin(anatomy.z)*.09)+sin(t*14.+anatomy.z)*.014;
 p+=circle*rad*cos(cap)*fullness;
 vNormal=normalize(normalMatrix*(circle*cos(cap)+tangent*sin(cap)));
 vec4 view=modelViewMatrix*vec4(p,1.);vWorld=view.xyz;vHeight=t;vTone=response.w;
 gl_Position=projectionMatrix*view;
}`;
export const fragment=`
uniform vec3 bodyColor;uniform vec3 tipColor;uniform vec3 shadowColor;uniform vec3 waterColor;uniform vec3 lampColor;uniform float illumination;uniform float translucency;uniform vec3 hand;uniform vec2 viewport;
varying vec3 vNormal;varying vec3 vWorld;varying float vHeight;varying float vTone;
void main(){
 vec3 n=normalize(vNormal),eye=normalize(-vWorld),light=normalize(vec3(-.6,.85,.5));
 float facing=clamp(dot(n,eye),0.,1.),wrap=clamp((dot(n,light)+.65)/1.65,0.,1.);
 float edge=pow(1.-facing,2.3),shine=pow(max(0.,dot(n,normalize(light+eye))),46.);
 float tip=smoothstep(.64,1.,vHeight),base=.36+.64*smoothstep(.12,.9,vHeight);
 vec3 flesh=mix(bodyColor,tipColor,tip*.28+vTone*.08);
 vec3 color=mix(shadowColor,flesh,(.16+.7*wrap)*base);
 // Thin edges and the rounded tip transmit a broad underwater light.
 float transmitted=(edge*.44+tip*.16+pow(max(0.,dot(-n,light)),2.)*.18)*translucency;
 color+=lampColor*(transmitted*(.58+.42*wrap)+shine*.18)*illumination;
 color+=tipColor*pow(1.-facing,8.)*.08*illumination;
 vec2 handDelta=(gl_FragCoord.xy/viewport-hand.xy)*vec2(viewport.x/viewport.y,1.);
 float handLight=exp(-dot(handDelta,handDelta)/.065)*hand.z;
 color+=lampColor*handLight*(.035+edge*.15)*translucency;
 color*=.97+sin(vHeight*57.+vTone*20.)*.008+vTone*.06;
 float fog=smoothstep(15.,31.,-vWorld.z);color=mix(color,waterColor,fog*.58);
 // Sorted front-facing membranes let adjacent stems show through their thin edges.
 float alpha=1.-translucency*(.055+.15*pow(1.-facing,.7)+tip*.035);
 gl_FragColor=vec4(color,alpha);
 #include <colorspace_fragment>
}`;
export const screenVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const focusFragment=`
uniform sampler2D sceneColor;uniform sampler2D sceneDepth;uniform vec2 pixels;uniform float focus;uniform float nearPlane;uniform float farPlane;uniform float focusDistance;uniform float glow;varying vec2 vUv;
float distanceAt(vec2 uv){float z=texture2D(sceneDepth,uv).r;return nearPlane*farPlane/(farPlane-z*(farPlane-nearPlane));}
void main(){float z=distanceAt(vUv);float radius=clamp(abs(z-focusDistance)/6.,0.,1.)*focus*7.;vec4 color=texture2D(sceneColor,vUv)*.28;
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a))*pixels*radius;float sampleZ=distanceAt(vUv+offset);float weight=abs(sampleZ-z)>2.?0.:1.;color+=mix(texture2D(sceneColor,vUv),texture2D(sceneColor,vUv+offset),weight)*.09;}
 // Restrained optical diffusion around the brightest tissue, not a neon outline.
 vec3 bloom=vec3(0.);
 for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 sampleColor=texture2D(sceneColor,vUv+vec2(cos(a),sin(a))*pixels*5.).rgb;bloom+=max(sampleColor-vec3(.37),vec3(0.));}
 color.rgb+=bloom*.045*glow;
 // A quiet optical vignette, without a decorative frame over the animals.
 float edge=smoothstep(.2,.82,length((vUv-.5)*vec2(1.,.85)));color.rgb*=1.-edge*.16;
 gl_FragColor=color;
 #include <colorspace_fragment>
}`;
