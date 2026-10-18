/** Shared lifecycle only. Material state and rendering are injected and export independently. */
export function createTactileEngine(canvas,initial,model,makeRenderer,hooks={}){
 let config={...initial},running=false,visible=true,disposed=false,raf=0,last=0,frames=0,pointer=null,reported=0,fps=0;
 const abort=new AbortController(),on=(t,e,f)=>t.addEventListener(e,f,{signal:abort.signal}),renderer=makeRenderer(canvas,model,config),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const active=()=>running&&visible&&!document.hidden;
 function state(){return {...model.snapshot(),...renderer.stats(),config:{...config},frames,running:active(),fps:Math.round(fps)};}
 function draw(force=true){if(disposed)return;renderer.draw(config);frames++;if(force||performance.now()-reported>120){reported=performance.now();hooks.frame?.(state());}}
 function halt(){cancelAnimationFrame(raf);raf=0;last=0;}
 function tick(t){raf=0;if(disposed||!active())return;const dt=last?Math.min(.05,(t-last)/1000):1/60;last=t;fps=fps*.95+.05/dt;model.advance(dt,config);draw(false);raf=requestAnimationFrame(tick);}
 function wake(){if(!disposed&&active()&&!raf)raf=requestAnimationFrame(tick);}
 function point(x,y,down=false){if(disposed)return;const uv=renderer.input?.(x,y)||[x,y];model.point(...uv,down,config);if(!active())model.settle();draw();wake();}
 function release(){const id=pointer;pointer=null;try{if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch{}model.release();if(!active()){model.settle();draw();}}
 const coords=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];};
 on(canvas,'pointerdown',e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(pointer);point(...coords(e),true);});
 on(canvas,'pointermove',e=>{if(pointer!==null&&e.pointerId!==pointer||e.pointerType==='touch'&&pointer===null)return;point(...coords(e),pointer!==null);});
 on(canvas,'pointerup',e=>{if(e.pointerId===pointer)release();});on(canvas,'pointerleave',()=>{if(pointer===null)release();});for(const event of ['pointercancel','lostpointercapture','blur'])on(canvas,event,release);
 let keyX=.5,keyY=.5,keyDown=false;
 on(canvas,'keydown',e=>{const delta={ArrowLeft:[-.045,0],ArrowRight:[.045,0],ArrowUp:[0,-.045],ArrowDown:[0,.045]}[e.key];if(delta){e.preventDefault();keyX=Math.max(.1,Math.min(.9,keyX+delta[0]));keyY=Math.max(.1,Math.min(.9,keyY+delta[1]));point(keyX,keyY,keyDown);}if(e.code==='Space'&&!e.repeat){e.preventDefault();keyDown=true;point(keyX,keyY,true);}if(e.key==='Escape'){keyDown=false;release();}});on(canvas,'keyup',e=>{if(e.code==='Space'){keyDown=false;release();}});
 function resize(){const r=canvas.getBoundingClientRect();renderer.resize(r.width||900,r.height||650,config);draw();}
 const ro=new ResizeObserver(resize);ro.observe(canvas);const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;halt();if(!visible)release();else wake();},{threshold:.01});io.observe(canvas);
 on(document,'visibilitychange',()=>{halt();if(document.hidden)release();else wake();});on(motion,'change',()=>{if(motion.matches){running=false;halt();release();}hooks.motionPreference?.(motion.matches);});on(canvas,'webglcontextlost',e=>{e.preventDefault();running=false;halt();hooks.error?.('Graphics were interrupted. Reload to return to this material.');});
 resize();return {model,point,release,getState:state,setRunning(value){if(disposed)return;running=!!value;halt();if(running)wake();else draw();},update(value){if(disposed)return;config={...value};renderer.configure(config);resize();},replay(){model.reset();draw();},exportCanvas(){draw();return canvas;},dispose(){if(disposed)return;release();disposed=true;halt();abort.abort();ro.disconnect();io.disconnect();renderer.dispose();model.dispose();canvas.width=canvas.height=1;},get disposed(){return disposed;}};
}
