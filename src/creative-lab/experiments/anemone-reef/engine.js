import {ReefField,options,clamp} from './model.js';
import {createReefRenderer} from './renderer.js';
export function createAnemoneReef(canvas,initial={},hooks={}){
 let config=options(initial),running=false,visible=true,disposed=false,raf=0,last=0,frames=0,fps=0,pointer=null,reported=0;
 const field=new ReefField(config),renderer=createReefRenderer(canvas,field),abort=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const on=(t,e,f)=>t.addEventListener(e,f,{signal:abort.signal}),active=()=>running&&visible&&!document.hidden;
 function state(){return {...field.snapshot(),...renderer.getState(),frames,fps:Math.round(fps),running:active(),config:{...config},primitives:field.stems.length,renderer:'Instanced 3D tissue · local springs'};}
 function draw(force=true){if(disposed)return;renderer.draw(config);frames++;if(force||performance.now()-reported>160){reported=performance.now();hooks.frame?.(state());}}
 function halt(){cancelAnimationFrame(raf);raf=0;last=0;}
 function tick(t){raf=0;if(disposed||!active())return;const elapsed=last?(t-last)/1000:0;last=t;if(elapsed){fps=fps?fps*.93+.07/elapsed:1/elapsed;field.advance(Math.min(.06,elapsed));}draw(false);raf=requestAnimationFrame(tick);}
 function wake(){if(!disposed&&active()&&!raf)raf=requestAnimationFrame(tick);}
 function point(x,y,pressed=false){if(disposed)return;field.point(x,y,pressed);if(!active()){field.settleInput();draw();}wake();}
 function release(){if(disposed)return;const old=pointer;pointer=null;try{if(old!==null&&canvas.hasPointerCapture(old))canvas.releasePointerCapture(old);}catch{}field.release();if(!active())field.settleInput();draw();}
 const coords=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];};
 on(canvas,'pointerdown',e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.focus({preventScroll:true});canvas.setPointerCapture(pointer);point(...coords(e),true);});
 on(canvas,'pointermove',e=>{if(pointer!==null&&pointer!==e.pointerId||e.pointerType==='touch'&&pointer===null)return;point(...coords(e),pointer!==null);});
 on(canvas,'pointerup',e=>{if(e.pointerId===pointer)release();});on(canvas,'pointerleave',()=>{if(pointer===null)release();});for(const event of ['pointercancel','lostpointercapture','blur'])on(canvas,event,release);
 on(canvas,'keydown',e=>{const d={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]}[e.key];if(d){e.preventDefault();point(clamp(field.pointer.x+d[0],0,1),clamp(field.pointer.y+d[1],0,1),field.pointer.pressed);}if(e.code==='Space'&&!e.repeat){e.preventDefault();point(field.pointer.x,field.pointer.y,!field.pointer.pressed);}if(e.key==='Escape')release();});
 function resize(){if(disposed)return;const r=canvas.getBoundingClientRect();renderer.resize(r.width||1000,r.height||650,config);draw();}
 const ro=new ResizeObserver(resize);ro.observe(canvas);const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;halt();if(!visible)release();else wake();},{threshold:.01});io.observe(canvas);
 on(document,'visibilitychange',()=>{halt();if(document.hidden)release();else wake();});on(reduced,'change',()=>{if(reduced.matches){running=false;halt();release();}hooks.motionPreference?.(reduced.matches);});
 on(canvas,'webglcontextlost',e=>{e.preventDefault();running=false;halt();hooks.error?.('The graphics context was interrupted. Reload to return to the reef.');});
 resize();
 return {field,point,release,getState:state,setRunning(value){if(disposed)return;running=!!value;halt();if(running)wake();else draw();},update(values){if(disposed)return;config=options(values);field.update(config);renderer.configure(config);resize();if(!active())field.settleInput();draw();},replay(){if(disposed)return;field.reset();renderer.configure(config);draw();},exportCanvas(){draw();return canvas;},dispose(){if(disposed)return;release();disposed=true;running=false;halt();abort.abort();ro.disconnect();io.disconnect();renderer.dispose();field.dispose();canvas.width=canvas.height=1;},get disposed(){return disposed;}};
}
