import {vertex,fragment} from './shaders.js';
import {particlePose} from './model.js';
export function gpuRenderer(canvas){
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:false,stencil:false,powerPreference:'low-power'});if(!gl)throw new Error('WebGL2 unavailable.');
 let program,buffer,texture,vao,disposed=false,prepared;const shaders=[];
 function dispose(){if(disposed)return;disposed=true;if(buffer)gl.deleteBuffer(buffer);if(texture)gl.deleteTexture(texture);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);for(const s of shaders)gl.deleteShader(s);gl.getExtension('WEBGL_lose_context')?.loseContext();}
 try{
  program=gl.createProgram();for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  vao=gl.createVertexArray();buffer=gl.createBuffer();texture=gl.createTexture();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [index,size,offset]of [[0,2,0],[1,4,8],[2,4,24]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,40,offset);gl.vertexAttribDivisor(index,1);}
  gl.bindTexture(gl.TEXTURE_2D,texture);for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
  gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);const locations={};for(const name of ['canvasSize','grid','pointer','view','radius','displacement','scatter','original','engagement','markSize','contrast','mode','photo','ink'])locations[name]=gl.getUniformLocation(program,name);
  return {backend:'GPU',
   setImage(data){prepared=data;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.sampled.attributes,gl.STATIC_DRAW);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data.texture);},
   draw(state,settings,view){if(disposed||!prepared)return;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(245/255,241/255,231/255,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.bindVertexArray(vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(locations.photo,0);gl.uniform2f(locations.canvasSize,canvas.width,canvas.height);gl.uniform2f(locations.grid,prepared.sampled.columns,prepared.sampled.rows);gl.uniform2f(locations.pointer,state.x,state.y);gl.uniform4fv(locations.view,view);
    for(const name of ['radius','displacement','markSize','contrast'])gl.uniform1f(locations[name],settings[name]);for(const name of ['scatter','original'])gl.uniform1f(locations[name],state[name]);gl.uniform1f(locations.engagement,state.active);gl.uniform1i(locations.mode,['engraving','scatter','reveal'].indexOf(settings.mode));gl.uniform3fv(locations.ink,settings.ink.match(/\w\w/g).map(v=>parseInt(v,16)/255));gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,prepared.sampled.count);
   },dispose
  };
 }catch(e){dispose();throw e;}
}
export function cpuRenderer(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas drawing unavailable.');let prepared;
 return {backend:'CPU',setImage(data){prepared=data;},draw(frame,settings,view){
  if(!prepared)return;const {sampled,texture}=prepared,a=sampled.attributes;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#f5f1e7';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(frame.original===1){ctx.drawImage(texture,...view);return;}
  const cw=view[2]/sampled.columns,ch=view[3]/sampled.rows;
  for(let n=0;n<sampled.count;n++){
   const i=n*10,r=a[i+5],q=a[i+6],dark=(1-a[i+2])**settings.contrast,pose=particlePose(sampled,n,frame,settings,view),resolve=pose.field*(settings.mode==='engraving'?.74:1)*(1-frame.original)+frame.original;
   if(r>.04+dark*.94+a[i+3]*.4+resolve*.24&&resolve<.03)continue;
   const angle=(a[i+4]+(r-.5)*.65+(q-.5)*frame.scatter*5)*(1-resolve),scale=(.8+dark*1.6)*settings.markSize*(1-resolve)+1.006*resolve,w=cw*scale,h=ch*scale;
   const x=pose.x+(r-.5)*cw*.66*(1-resolve),y=pose.y+(q-.5)*ch*.66*(1-resolve);ctx.setTransform(Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),x,y);
   ctx.globalAlpha=(.36+dark*.64)*(1-resolve);ctx.fillStyle=settings.ink;ctx.beginPath();if(q>.37){ctx.ellipse(0,0,w*.43,h*.12,0,0,Math.PI*2);}else ctx.ellipse(0,0,w*.26,h*.24,0,0,Math.PI*2);ctx.fill();
   if(resolve>.02||settings.mode==='scatter'&&frame.scatter>.02){ctx.globalAlpha=Math.max(resolve,settings.mode==='scatter'?frame.scatter*.65:0);ctx.drawImage(texture,(a[i]-1/sampled.columns/2)*texture.width,(a[i+1]-1/sampled.rows/2)*texture.height,texture.width/sampled.columns,texture.height/sampled.rows,-w/2,-h/2,w,h);}
  }ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
 },dispose(){prepared=null;}};
}
