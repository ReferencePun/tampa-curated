// Original warm, raster-like pigment treatment shared by both particle renderers.
// The reference's short horizontal marks retain the photograph's tonal structure.
export const grainGLSL = `
vec3 grainPigment(float value, vec3 amber) {
 vec3 color=mix(vec3(.24,.075,.025),vec3(.66,.275,.07),smoothstep(.025,.27,value));
 color=mix(color,amber,smoothstep(.19,.59,value));
 return mix(color,vec3(.99,.90,.72),smoothstep(.47,.86,value));
}
float grainShape(vec2 p, float variation) {
 // Low, softly edged rectangles, with slight variation in dash length.
 return max(abs(p.x)*(1.+variation*.18),abs(p.y)*(1.65+variation*.12));
}`;
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function grainPigment(value,hex='#dfb879') {
 const amber=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 let c=mix([.24,.075,.025],[.66,.275,.07],smooth(.025,.27,value));
 c=mix(c,amber,smooth(.19,.59,value));
 return mix(c,[.99,.90,.72],smooth(.47,.86,value)).map(v=>Math.round(v*255));
}
