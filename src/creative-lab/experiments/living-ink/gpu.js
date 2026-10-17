import {vertex,simulation,display} from './shaders.js';
import {options,blankState,validateMask,brushes} from './model.js';

// Two float framebuffer attachments alternate: a pass never reads its own output.
// Coordinates are top-down in the state texture, converted only by the display pass.
export function createGPU(canvas,width,height,initial){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power',preserveDrawingBuffer:false});
 if(!gl)throw new Error('WebGL2 unavailable.');
 const textures=[],buffers=[],programs=[];let vao=null,disposed=false,current=0,steps=0,config=options(initial);
 function dispose(){if(disposed)return;disposed=true;for(const p of programs)gl.deleteProgram(p);for(const t of textures)gl.deleteTexture(t);for(const f of buffers)gl.deleteFramebuffer(f);if(vao)gl.deleteVertexArray(vao);gl.getExtension('WEBGL_lose_context')?.loseContext();}
 try{
  if(!gl.getExtension('EXT_color_buffer_float'))throw new Error('Floating-point framebuffers unavailable.');
  function program(fragment){
   const p=gl.createProgram(),shaders=[];programs.push(p);
   try{for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));}
   finally{shaders.forEach(s=>gl.deleteShader(s));}return p;
  }
  function texture(float){const t=gl.createTexture();textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,float?gl.RGBA32F:gl.RGBA8,width,height,0,gl.RGBA,float?gl.FLOAT:gl.UNSIGNED_BYTE,null);return t;}
  const state=[texture(true),texture(true)],mask=texture(false),solve=program(simulation),render=program(display);
  for(const t of state){const f=gl.createFramebuffer();buffers.push(f);gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Floating-point framebuffer is incomplete.');}
  vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  const locations=new Map();function loc(p,name){const key=`${p===solve?'s':'r'}:${name}`;if(!locations.has(key))locations.set(key,gl.getUniformLocation(p,name));return locations.get(key);}
  function bind(p){if(disposed)throw new Error('Ink engine is disposed.');gl.useProgram(p);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,state[current]);gl.uniform1i(loc(p,'stateTex'),0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);gl.uniform1i(loc(p,'maskTex'),1);gl.uniform1i(loc(p,'mode'),['organic','architecture','image'].indexOf(config.mode));}
  function pass(advance,points=[]){
   bind(solve);gl.bindFramebuffer(gl.FRAMEBUFFER,buffers[1-current]);gl.viewport(0,0,width,height);
   gl.uniform2f(loc(solve,'diffusion'),config.diffusionU,config.diffusionV);gl.uniform2f(loc(solve,'reaction'),config.feed,config.kill);gl.uniform1f(loc(solve,'influence'),config.influence);gl.uniform1i(loc(solve,'advance'),advance?1:0);gl.uniform1i(loc(solve,'brushCount'),points.length);
   if(points.length)gl.uniform4fv(loc(solve,'brush[0]'),new Float32Array(points.flatMap(p=>[p.x,p.y,p.radius,p.amount])));
   gl.drawArrays(gl.TRIANGLES,0,3);current=1-current;
  }
  function reset(data=blankState(width,height)){if(data.length!==width*height*4)throw new Error('Incorrect state size.');gl.activeTexture(gl.TEXTURE0);for(const t of state){gl.bindTexture(gl.TEXTURE_2D,t);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.FLOAT,data);}steps=0;current=0;}
  reset();
  return {backend:'GPU',width,height,get steps(){return steps;},update(value){config=options(value);},setMask(data){validateMask(data,width,height);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);},step(count=1){for(let i=0;i<count;i++)pass(true);steps+=count;},brush(points){pass(false,brushes(points));},reset,
   render(view){bind(render);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform4fv(loc(render,'view'),view);gl.uniform1f(loc(render,'canvasHeight'),canvas.height);gl.uniform1i(loc(render,'guides'),config.guides?1:0);const rgb=config.ink.match(/\w\w/g).map(v=>parseInt(v,16)/255);gl.uniform3fv(loc(render,'ink'),rgb);gl.drawArrays(gl.TRIANGLES,0,3);},
   read(){const data=new Float32Array(width*height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,buffers[current]);gl.readPixels(0,0,width,height,gl.RGBA,gl.FLOAT,data);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return data;},dispose
  };
 }catch(error){dispose();throw error;}
}
