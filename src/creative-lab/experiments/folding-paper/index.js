import * as THREE from 'three';
import {createFoldingRig} from './engine.js';
import {DEFAULTS,validateOptions,createComposition} from './compositions.js';
import {cameraPose} from './camera.js';
import {styles} from './styles.js';

export function mount(host,initial={},report=()=>{}){
 const root=document.createElement('div');root.className='fp';root.dataset.orbit='false';
 root.innerHTML=`<style>${styles}</style><div class="fp-tools" aria-label="Folding controls"><select aria-label="Folding composition" data-version><option value="architecture">01 / The conservatory</option><option value="machine">02 / The engine</option><option value="city">03 / The paper city</option></select><button data-orbit aria-pressed="false">Hold & orbit</button><button data-half>Half folded</button><button data-flat>Back to the drawing</button></div><div class="fp-stage" tabindex="0" role="group" aria-label="Folding paper architecture. Scroll to fold, or use the progress slider. Arrow keys adjust the fold. Hold and orbit freezes the structure for inspection."><div class="fp-caption"><span data-title>PLATE 03 / THE UNBUILT CONSERVATORY</span><span data-phase>01 / THE DRAWING</span></div><span class="fp-pencil">the fold is the drawing.</span><div class="fp-error" role="status" hidden></div></div><div class="fp-foot"><p class="fp-status" role="status" aria-live="polite">Scroll over the drawing. Every crease has somewhere to go.</p><label class="fp-timeline">Fold <input type="range" min="0" max="1000" step="1" value="0" aria-label="Scrub folding transformation"/><output>0%</output></label><div class="fp-chapters" aria-hidden="true"><span>DRAWING</span><span>HINGES</span><span>ASSEMBLY</span><span>ENTER</span></div><p class="fp-hint">Scroll in either direction, or scrub the slider. Hold & orbit lets you examine any fold. On touch, use the slider to fold and drag to orbit.</p></div>`;
 host.append(root);
 const $=q=>root.querySelector(q),stage=$('.fp-stage'),slider=$('.fp-timeline input'),output=$('.fp-timeline output'),orbitButton=$('[data-orbit]'),status=$('.fp-status'),error=$('.fp-error'),version=$('[data-version]');
 const plate=document.createElement('img');plate.className='fp-fallback';plate.src=new URL('./assets/preview.svg',import.meta.url).href;plate.alt='Static illustration of the partially folded conservatory';plate.hidden=true;stage.prepend(plate);
 const abort=new AbortController(),signal=abort.signal,motion=matchMedia('(prefers-reduced-motion: reduce)');
 let settings=validateOptions({...DEFAULTS,...initial}),definition,rig,renderer,scene,camera,disposed=false,lost=false,running=false,orbit=false;
 let current=settings.progress/100,target=current,raf=0,timer=0,persistTimer=0,last=0,frames=0,builds=0,width=1,height=1,fps=0,drag=null;
 let orbitTheta=0,orbitPhi=1,orbitRadius=30,cameraMoving=false;
 const orbitCenter=new THREE.Vector3(),viewPosition=new THREE.Vector3(),viewTarget=new THREE.Vector3();
 function publish(){root.dispatchEvent(new CustomEvent('lab:settings',{bubbles:true,detail:{...settings}}));}
 function queuePublish(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>{if(!disposed)publish();},120);}
 function phase(){return current<.04?'01 / THE DRAWING':current<.4?'02 / WALLS & HINGES':current<.72?'03 / LINKED ASSEMBLY':current<.86?'04 / THE APPROACH':'05 / INSIDE THE DRAWING';}
 function reportStats(){const active=running&&(Math.abs(current-target)>1e-5||cameraMoving);report({fps:active?fps:0,width:renderer?.domElement.width||width,height:renderer?.domElement.height||height,primitives:rig?.primitives||0,frames,running:active,renderer:renderer?'Three.js / linked hinges':'Static drawing'});}
 function desiredCamera(){
  if(orbit){const v=new THREE.Vector3(Math.sin(orbitPhi)*Math.sin(orbitTheta),Math.cos(orbitPhi),Math.sin(orbitPhi)*Math.cos(orbitTheta));return {position:orbitCenter.clone().addScaledVector(v,orbitRadius),target:orbitCenter.clone()};}
  return cameraPose(definition,current,settings.angle,width/height);
 }
 function paint(dt=0,immediate=false){
  if(disposed||lost||!rig||!renderer)return;
  rig.setProgress(current);const pose=desiredCamera();
  if(immediate||!running||motion.matches){viewPosition.copy(pose.position);viewTarget.copy(pose.target);}else{const blend=1-Math.exp(-Math.max(.001,dt)*12);viewPosition.lerp(pose.position,blend);viewTarget.lerp(pose.target,blend);}
  cameraMoving=viewPosition.distanceToSquared(pose.position)+viewTarget.distanceToSquared(pose.target)>1e-7;
  if(!cameraMoving){viewPosition.copy(pose.position);viewTarget.copy(pose.target);}
  camera.position.copy(viewPosition);camera.up.set(0,1,0);camera.lookAt(viewTarget);renderer.render(scene,camera);frames++;
  slider.value=String(Math.round(current*1000));output.value=`${(current*100).toFixed(1).replace('.0','')}%`;
  $('[data-phase]').textContent=orbit?'HOLD / ORBIT THE FOLD':phase();
  root.dataset.progress=current.toFixed(5);root.dataset.builds=String(builds);root.dataset.panels=String(rig.panels.size);root.dataset.camera=JSON.stringify(camera.position.toArray());root.dataset.pose=JSON.stringify(rig.pose());root.dataset.version=settings.version;root.dataset.primitives=String(rig.primitives);
  reportStats();
 }
 function tick(time){raf=0;if(disposed||!running||lost)return;const elapsed=(time-last)/1000||.016,dt=Math.min(.05,elapsed);last=time;fps=Math.round(1/elapsed);
  current+=(target-current)*(1-Math.exp(-dt*10));if(Math.abs(current-target)<.00001)current=target;paint(dt);
  if(current!==target||cameraMoving)raf=requestAnimationFrame(tick);
 }
 function invalidate(immediate=false){if(disposed||!rig||lost)return;if(immediate||!running||motion.matches){current=target;paint(0,true);}else if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}}
 function resize(){const bounds=stage.getBoundingClientRect();width=Math.max(1,Math.round(bounds.width));height=Math.max(1,Math.round(bounds.height));if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();invalidate(true);}}
 const observer=new ResizeObserver(resize);observer.observe(stage);
 function build(){
  clearTimeout(timer);try{
   const nextDefinition=createComposition(settings),nextRig=createFoldingRig(nextDefinition,settings);
   if(!renderer){try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setClearColor(0xf0ebdf,0);renderer.domElement.setAttribute('aria-label','An architectural drawing assembled by real three-dimensional hinges');stage.prepend(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(48,1,.04,800);
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;plate.hidden=false;error.hidden=false;error.textContent='Graphics were interrupted. Your fold position is saved; the drawing will return when graphics recover.';},{signal});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;build();},{signal});
   }catch(e){nextRig.dispose();throw e;}}
   if(rig){scene.remove(rig.root);rig.dispose();}rig=nextRig;definition=nextDefinition;scene.add(rig.root);builds++;
   $('[data-title]').textContent=`PLATE 03 / ${definition.name.toUpperCase()}`;version.value=settings.version;error.hidden=true;plate.hidden=true;
   resize();paint(0,true);status.textContent=orbit?'Fold held in space. Drag to orbit; use + and − to zoom.':definition.caption;
  }catch(e){plate.hidden=false;error.hidden=false;error.textContent=e.message?.includes('WebGL')?'This study needs WebGL2. The static drawing and complete source download are still available.':e.message;}
 }
 function leaveOrbit(){orbit=false;root.dataset.orbit='false';orbitButton.setAttribute('aria-pressed','false');orbitButton.textContent='Hold & orbit';}
 function setProgress(value,{notify=true}={}){
  if(!Number.isFinite(value))throw new Error('Fold progress must be finite.');leaveOrbit();target=Math.round(Math.max(0,Math.min(1,value))*1000)/1000;settings={...settings,progress:Math.round(target*1000)/10};
  status.textContent=target===0?'The same panels, unfolded back onto the sheet.':target>=.86?'Inside the drawing. Reverse the scroll to return to the paper.':definition?.caption||'Preparing the drawing.';
  invalidate();if(notify)queuePublish();
 }
 function hold(){
  if(!rig)return;
  if(orbit){leaveOrbit();status.textContent='Continue scrolling to fold, or unfold, the drawing.';invalidate();return;}
  cancelAnimationFrame(raf);raf=0;target=current=Math.round(current*1000)/1000;settings={...settings,progress:Math.round(current*1000)/10};rig.setProgress(current);
  const focus=new THREE.Vector3(...definition.focus).multiplyScalar(Math.min(1,current/.72));orbitCenter.copy(focus);
  const offset=viewPosition.clone().sub(orbitCenter);orbitRadius=Math.max(4,offset.length());orbitPhi=Math.acos(Math.max(-1,Math.min(1,offset.y/orbitRadius)));orbitTheta=Math.atan2(offset.x,offset.z);orbitPhi=Math.min(1.49,Math.max(.12,orbitPhi));
  orbit=true;root.dataset.orbit='true';orbitButton.setAttribute('aria-pressed','true');orbitButton.textContent='Continue folding';status.textContent='Fold held in space. Drag to orbit; arrow keys rotate, + and − zoom.';paint(0,true);publish();
 }
 function selectVersion(value){if(value===settings.version)return;settings=validateOptions({...settings,version:value,progress:0});target=current=0;leaveOrbit();build();publish();}
 version.addEventListener('change',()=>selectVersion(version.value),{signal});
 orbitButton.addEventListener('click',hold,{signal});$('[data-half]').addEventListener('click',()=>{setProgress(.46);current=target;paint(0,true);hold();},{signal});
 $('[data-flat]').addEventListener('click',()=>setProgress(0),{signal});slider.addEventListener('input',()=>setProgress(Number(slider.value)/1000),{signal});
 slider.addEventListener('change',()=>{clearTimeout(persistTimer);publish();},{signal});
 stage.addEventListener('wheel',event=>{
  if(!rig||lost||event.ctrlKey)return;const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?height:1);if(!delta)return;
  if(orbit){event.preventDefault();orbitRadius=Math.max(4,Math.min(160,orbitRadius*Math.exp(delta*.001)));invalidate();return;}
  if((target>=1&&delta>0)||(target<=0&&delta<0))return;event.preventDefault();setProgress(target+Math.max(-200,Math.min(200,delta))*.0006*settings.speed);
 },{signal,passive:false});
 stage.addEventListener('pointerdown',event=>{if(!orbit||event.button!==0||drag!==null)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};stage.setPointerCapture(event.pointerId);root.dataset.dragging='true';},{signal});
 stage.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;orbitTheta-=(event.clientX-drag.x)*.006;orbitPhi=Math.max(.12,Math.min(1.49,orbitPhi+(event.clientY-drag.y)*.006));drag.x=event.clientX;drag.y=event.clientY;invalidate();},{signal});
 const release=event=>{if(!drag||drag.id!==event.pointerId)return;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);drag=null;root.dataset.dragging='false';};stage.addEventListener('pointerup',release,{signal});stage.addEventListener('pointercancel',release,{signal});
 stage.addEventListener('keydown',event=>{
  if(event.key===' '){event.preventDefault();hold();return;}if(event.key==='Escape'&&orbit){leaveOrbit();invalidate();return;}
  if(orbit&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(event.key)){
   event.preventDefault();if(event.key==='ArrowLeft')orbitTheta-=.12;if(event.key==='ArrowRight')orbitTheta+=.12;if(event.key==='ArrowUp')orbitPhi=Math.max(.12,orbitPhi-.08);if(event.key==='ArrowDown')orbitPhi=Math.min(1.49,orbitPhi+.08);if(['+','='].includes(event.key))orbitRadius=Math.max(4,orbitRadius*.9);if(['-','_'].includes(event.key))orbitRadius=Math.min(160,orbitRadius*1.1);invalidate();return;
  }
  if(['Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setProgress(event.key==='Home'?0:event.key==='End'?1:target+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)*.025*settings.speed);}
 },{signal});
 motion.addEventListener('change',()=>invalidate(true),{signal});
 function update(next){
  const previous=settings;settings=validateOptions(next);
  if(previous.version!==settings.version){target=current=settings.progress/100;leaveOrbit();build();return;}
  if(previous.progress!==settings.progress)setProgress(settings.progress/100,{notify:false});
  if(orbit&&previous.angle!==settings.angle)orbitPhi=(90-settings.angle)*Math.PI/180;
  if(previous.density!==settings.density||previous.variation!==settings.variation){clearTimeout(timer);timer=setTimeout(build,150);}
  else{rig?.setAppearance(settings);invalidate();}
 }
 build();
 return {update,setProgress,getProgress:()=>current,getPose:()=>rig?.pose(),
  setRunning(value){
   const stopping=running&&!value;running=value;
   if(!value){cancelAnimationFrame(raf);raf=0;
    if(stopping&&Math.abs(target-current)>1e-5){target=current=Math.round(current*1000)/1000;settings={...settings,progress:Math.round(current*1000)/10};paint(0,true);queuePublish();}
    reportStats();
   }else invalidate();
  },
  replay(){setProgress(0);},
  dispose(){if(disposed)return;clearTimeout(persistTimer);publish();disposed=true;abort.abort();observer.disconnect();clearTimeout(timer);cancelAnimationFrame(raf);rig?.dispose();renderer?.dispose();renderer?.forceContextLoss();root.remove();}
 };
}
