import * as THREE from 'three';
import {DEFAULTS,EXAMPLES,simplifyStroke,smoothPoints,validatePoints,exportPath,importPath} from './path.js';
import {generateEnvironment,cameraPose} from './geometry.js';
import {styles} from './styles.js';

/** Mount a self-contained drawing instrument. All path coordinates are normalized [x,y]. */
export function mount(host,initial={},report=()=>{}) {
  const root=document.createElement('div');root.className='daw';root.dataset.mode='draw';
  root.innerHTML=`<style>${styles}</style><div class="daw-tools" aria-label="Drawing tools">
    <button data-action="draw" title="Draw a new line">Freehand</button><button data-action="edit" disabled>Edit points</button>
    <select data-examples aria-label="Example paths"><option value="">Try a path…</option><option value="straight">A long corridor</option><option value="bend">A winding passage</option><option value="spiral">A rising spiral</option></select>
    <button data-action="enter" class="daw-primary" disabled>Enter drawing ↗</button><button data-action="paper" hidden>Return to paper</button><button data-action="erase" disabled>Erase</button>
    <button data-action="export" disabled>Path JSON ↓</button><label class="daw-file">Load path ↑<input type="file" accept=".json,application/json" aria-label="Load path JSON"/></label>
  </div><div class="daw-stage" tabindex="0" role="group" aria-label="Drawing paper. Draw one open line, or choose an example. In travel mode, scroll or use arrow keys.">
    <svg class="daw-sheet" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-label="Editable drawing path">
      <g class="daw-guides"><path d="M35 85V35H85 M915 35H965V85 M965 565V615H915 M85 615H35V565 M480 325H520 M500 305V345 M35 325H55 M945 325H965 M500 35V55 M500 595V615"/><path d="M115 590H215 M115 585V595 M165 585V595 M215 585V595"/></g><path class="daw-stroke"/><g data-handles></g>
    </svg><div class="daw-empty"><em>Draw somewhere to go.</em><span>A line of ink. A passage in space.<br/>Draw one generous, open line across the paper.</span><small>Or begin with an example above ↗</small></div><span class="daw-corner">01 / PLAN STUDY<br/>INK → ARCHITECTURE</span><span class="daw-scale">NOT TO SCALE</span>
  </div><div class="daw-foot"><p class="daw-status" role="status" aria-live="polite">Make a line with your mouse, pen, or finger.</p><label class="daw-journey" hidden>Travel <input type="range" min="0" max="1000" value="0" step="1" aria-label="Travel through your drawing"/><output>0%</output></label><p class="daw-note">One open path. Leave space between bends; crossings and closed loops are not supported. Scroll inside the drawing to travel.</p></div>`;
  host.append(root);
  const $=selector=>root.querySelector(selector),stage=$('.daw-stage'),sheet=$('.daw-sheet'),stroke=$('.daw-stroke'),handles=$('[data-handles]'),empty=$('.daw-empty'),status=$('.daw-status'),journey=$('.daw-journey'),slider=journey.querySelector('input'),percent=journey.querySelector('output');
  const abort=new AbortController(),signal=abort.signal,motion=matchMedia('(prefers-reduced-motion: reduce)');
  let settings={...DEFAULTS,...initial},points=validatePoints(settings.path,{allowEmpty:true}),model=null,renderer=null,scene=null,camera=null;
  let running=false,disposed=false,frame=0,timer=0,frames=0,builds=0,width=1,height=1,last=0,progress=0,target=0,reveal=1,mode='draw',pointer=null,raw=[],handle=-1,previousY=0,lost=false,fps=0;
  const overview=new THREE.Vector3(),overviewTarget=new THREE.Vector3();
  function say(text,error=false){status.textContent=text;root.dataset.error=String(error);}
  function publish(){settings={...settings,path:points.map(p=>[...p])};root.dispatchEvent(new CustomEvent('lab:settings',{bubbles:true,detail:{...settings}}));}
  function stats(){const active=running&&(progress!==target||reveal<1);report({fps:active?fps:0,width:renderer?.domElement.width||width,height:renderer?.domElement.height||height,primitives:model?.primitives||0,frames,running:active,renderer:renderer?'Three.js / WebGL2':'Drawing paper / SVG'});}
  function modeTo(next){
    mode=next;root.dataset.mode=next;const paper=next==='draw'||next==='edit';sheet.toggleAttribute('hidden',!paper);empty.hidden=next!=='draw'||points.length>0;
    if(renderer)renderer.domElement.hidden=paper;
    $('[data-action="paper"]').hidden=paper;$('[data-action="enter"]').hidden=next==='travel';
    $('[data-action="enter"]').disabled=!model||lost;$('[data-action="edit"]').disabled=!points.length;
    $('[data-action="erase"]').disabled=!points.length;$('[data-action="export"]').disabled=points.length<2;
    journey.hidden=paper||!model;$('.daw-corner').innerHTML=paper?'01 / PLAN STUDY<br/>INK → ARCHITECTURE':next==='travel'?'03 / INSIDE THE DRAWING':'02 / CONSTRUCTION STUDY';
    root.dataset.pathPoints=String(points.length);
  }
  function drawSheet(rawPoints=points){
    handles.replaceChildren();if(!rawPoints.length){stroke.setAttribute('d','');return;}
    let display=rawPoints;
    if(mode==='edit'&&rawPoints.length>1){
      const smooth=smoothPoints(rawPoints,settings.smoothing),curve=new THREE.CatmullRomCurve3(smooth.map(p=>new THREE.Vector3(p[0],p[1],0)),false,'centripetal');
      display=curve.getPoints(180).map(p=>[p.x,p.y]);
    }
    stroke.setAttribute('d',display.map((p,i)=>`${i?'L':'M'}${p[0]*1000},${p[1]*650}`).join(' '));
    if(mode==='edit')points.forEach((p,i)=>{
      const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.classList.add('daw-handle');circle.setAttribute('cx',String(p[0]*1000));circle.setAttribute('cy',String(p[1]*650));circle.setAttribute('r',String(width<600?9:5));circle.setAttribute('tabindex','0');circle.setAttribute('role','button');circle.setAttribute('aria-label',`Path point ${i+1}. Drag or use arrow keys.`);circle.dataset.point=String(i);handles.append(circle);
    });
  }
  function ensureRenderer(){
    if(renderer)return;
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setClearColor(0xf2eee3,0);
    renderer.domElement.setAttribute('aria-label','Architecture generated from your path');stage.prepend(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(52,1,.04,1200);
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;modeTo('edit');drawSheet();say('The 3D context was interrupted. Your path is safe; it will rebuild when graphics return.',true);},{signal});
    renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;rebuild(true);},{signal});resize();
  }
  function fit(){
    if(!model||!camera)return;
    const direction=new THREE.Vector3(.17,.94,1).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
    const tanV=Math.tan(camera.fov*Math.PI/360),tanH=tanV*camera.aspect;
    let distance=1;
    const p=new THREE.Vector3();
    for(const object of model.group.children){const positions=object.geometry.getAttribute('position');for(let i=0;i<positions.count;i++){
      p.fromBufferAttribute(positions,i).sub(model.center);
      distance=Math.max(distance,p.dot(direction)+Math.max(Math.abs(p.dot(right))/tanH,Math.abs(p.dot(up))/tanV));
    }}
    distance*=1.16;
    overviewTarget.copy(model.center);overview.copy(model.center).addScaledVector(direction,distance);
    camera.far=Math.max(1000,distance*5);camera.updateProjectionMatrix();scene.fog=new THREE.Fog(0xf2eee3,Math.max(60,distance*1.1),Math.max(220,distance*3));
  }
  function resize(){const rect=stage.getBoundingClientRect();width=Math.max(1,Math.round(rect.width));height=Math.max(1,Math.round(rect.height));if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fit();}invalidate();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  function paint(){
    if(disposed||lost)return;
    if(renderer&&model&&mode!=='draw'&&mode!=='edit'){
      model.group.scale.y=.02+.98*reveal;
      const entry=cameraPose(model,0),blend=Math.min(1,progress/.14),ease=blend*blend*(3-2*blend);
      if(progress<.14){camera.position.lerpVectors(overview,entry.position,ease);camera.lookAt(overviewTarget.clone().lerp(entry.target,ease));}
      else {const pose=cameraPose(model,(progress-.14)/.86);camera.position.copy(pose.position);camera.lookAt(pose.target);}
      camera.up.set(0,1,0);renderer.render(scene,camera);frames++;
      root.dataset.camera=JSON.stringify(camera.position.toArray());root.dataset.orientation=JSON.stringify(camera.quaternion.toArray());
    }
    slider.value=String(Math.round(progress*1000));percent.value=`${Math.round(Math.max(0,(progress-.14)/.86)*100)}%`;
    root.dataset.progress=progress.toFixed(5);root.dataset.builds=String(builds);root.dataset.signature=model?.signature||'';stats();
  }
  function tick(time){
    frame=0;if(disposed||!running||lost)return;
    const elapsed=(time-last)/1000||.016,dt=Math.min(.05,elapsed);fps=Math.round(1/elapsed);last=time;
    progress+=(target-progress)*(1-Math.exp(-dt*9));if(Math.abs(target-progress)<.0001)progress=target;
    reveal=Math.min(1,reveal+dt*.9);paint();
    if(progress!==target||reveal<1)frame=requestAnimationFrame(tick);else if(progress===0&&mode==='travel'){modeTo('edit');drawSheet();say('Back on paper. Move a point, or draw another route.');}
  }
  function invalidate(){
    if(disposed)return;
    if(!running||motion.matches){progress=target;reveal=1;paint();return;}
    if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
  }
  function clearModel(){if(model){scene?.remove(model.group);model.dispose();model=null;}}
  function rebuild(showModel=false){
    clearTimeout(timer);cancelAnimationFrame(frame);frame=0;clearModel();progress=target=0;reveal=1;
    if(points.length<2){modeTo('draw');drawSheet();paint();return;}
    try{
      const built=generateEnvironment(points,settings);
      try{ensureRenderer();}catch(error){built.dispose();throw error;}
      model=built;scene.add(model.group);builds++;fit();reveal=showModel?0:1;
      if(showModel||mode==='travel'||mode==='model')modeTo('model');else modeTo('edit');
      drawSheet();say(mode==='edit'?'Drag a point to reshape the passage. Arrow keys also move a focused point.':'Your line is architecture. Enter the drawing, then scroll to travel.');invalidate();
    }catch(error){modeTo('edit');drawSheet();say(error.message?.includes('WebGL')?'3D graphics are unavailable here. You can still edit and export your path; try a browser with WebGL2.':error.message,true);paint();}
  }
  function setPath(next,{show=true,notify=true}={}){points=validatePoints(next,{allowEmpty:true});settings={...settings,path:points};rebuild(show);if(notify)publish();}
  function paper(){progress=target=0;modeTo(points.length?'edit':'draw');drawSheet();say(points.length?'Back on paper. Drag a point, or choose Freehand for a new stroke.':'Make a line with your mouse, pen, or finger.');invalidate();}
  function travel(value){if(!model||lost)return;reveal=1;modeTo('travel');target=Math.max(0,Math.min(1,value));say('Scroll forward or back. Drag vertically on touch. Arrow keys and the Travel slider work too.');invalidate();if((!running||motion.matches)&&target===0)paper();}
  function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='draw'){modeTo('draw');drawSheet();say('Draw a new open line. Your next stroke replaces the previous route.');}
    if(action==='edit'||action==='paper')paper();
    if(action==='enter')travel(.14);
    if(action==='erase'){setPath([]);say('A fresh sheet. Draw somewhere else.');}
    if(action==='export')download(exportPath(points),'draw-a-world-path.json');
  },{signal});
  $('[data-examples]').addEventListener('change',event=>{
    const key=event.target.value;if(!EXAMPLES[key])return;
    settings={...settings,style:key==='spiral'?'staircase':key==='bend'?'vault':'corridor'};setPath(EXAMPLES[key]);event.target.value='';
  },{signal});
  $('.daw-file input').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>40000)throw new Error('Path files must be smaller than 40 KB.');const next=importPath(await file.text());if(!disposed)setPath(next);}catch(error){if(!disposed)say(error.message,true);}finally{event.target.value='';}
  },{signal});
  const coordinate=event=>{const box=stage.getBoundingClientRect();return [Math.max(.025,Math.min(.975,(event.clientX-box.left)/box.width)),Math.max(.035,Math.min(.965,(event.clientY-box.top)/box.height))];};
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0||pointer!==null)return;pointer=event.pointerId;stage.setPointerCapture(pointer);previousY=event.clientY;
    if(mode==='draw'){raw=[coordinate(event)];empty.hidden=true;stroke.setAttribute('d','');handles.replaceChildren();}
    else if(mode==='edit'){handle=event.target.dataset.point===undefined?-1:Number(event.target.dataset.point);}
  },{signal});
  stage.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    if(mode==='draw'){
      const events=event.getCoalescedEvents?.()||[event];for(const e of events.length?events:[event]){const p=coordinate(e);if(raw.length<4000&&(!raw.length||Math.hypot(p[0]-raw.at(-1)[0],p[1]-raw.at(-1)[1])>.001))raw.push(p);}drawSheet(raw);
    }else if(mode==='edit'&&handle>=0){points[handle]=coordinate(event);drawSheet();}
    else if(mode==='model'||mode==='travel'){travel(target+(previousY-event.clientY)*.0018*settings.speed);previousY=event.clientY;}
  },{signal});
  function endPointer(event){
    if(event.pointerId!==pointer)return;const canceled=event.type==='pointercancel';pointer=null;
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    if(mode==='draw'){
      if(canceled){drawSheet();empty.hidden=!!points.length;return;}
      try{setPath(simplifyStroke(raw));}catch(error){setPath([]);drawSheet(raw);empty.hidden=true;say(error.message,true);}
    }else if(mode==='edit'&&handle>=0){handle=-1;rebuild(false);publish();}
  }
  stage.addEventListener('pointerup',endPointer,{signal});stage.addEventListener('pointercancel',endPointer,{signal});
  stage.addEventListener('wheel',event=>{
    if((mode!=='model'&&mode!=='travel')||!model)return;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?height:1);
    if((target>=1&&delta>0)||(target<=0&&delta<0))return;
    event.preventDefault();travel(target+Math.max(-180,Math.min(180,delta))*.00065*settings.speed);
  },{signal,passive:false});
  slider.addEventListener('input',()=>travel(Number(slider.value)/1000),{signal});
  stage.addEventListener('keydown',event=>{
    const arrows={ArrowUp:[0,-.008],ArrowDown:[0,.008],ArrowLeft:[-.008,0],ArrowRight:[.008,0]};
    if(mode==='edit'&&event.target.dataset.point!==undefined&&arrows[event.key]){
      event.preventDefault();const i=Number(event.target.dataset.point),delta=arrows[event.key];points[i]=points[i].map((v,k)=>Math.min(.975,Math.max(.025,v+delta[k])));drawSheet();handles.children[i]?.focus();clearTimeout(timer);timer=setTimeout(()=>{rebuild(false);handles.children[i]?.focus();publish();},180);return;
    }
    if(event.key==='Escape'){paper();return;}
    if(!model)return;
    if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)){event.preventDefault();travel(event.key==='Home'?0:event.key==='End'?1:target+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)*.035*settings.speed);}
  },{signal});
  motion.addEventListener('change',()=>invalidate(),{signal});
  function update(next){
    const previous=settings;settings={...DEFAULTS,...next};
    if(JSON.stringify(settings.path)!==JSON.stringify(points)){setPath(settings.path,{show:settings.path.length>0,notify:false});return;}
    const keys=['style','smoothing','width','density','depth','irregularity','guides'];
    if(keys.some(key=>previous[key]!==settings[key])&&points.length){clearTimeout(timer);timer=setTimeout(()=>{
      const priorMode=mode,priorTarget=target;rebuild(false);
      if(model&&priorMode==='travel'){progress=target=priorTarget;modeTo('travel');invalidate();}
    },140);}
  }
  if(points.length)rebuild(true);else {modeTo('draw');drawSheet();resize();}
  return {update,setPath:next=>setPath(next),getPath:()=>exportPath(points),
    setRunning(value){running=value;if(!value){cancelAnimationFrame(frame);frame=0;stats();}else invalidate();},
    replay(){if(model){progress=target=0;reveal=0;modeTo('model');invalidate();}else paper();},
    dispose(){if(disposed)return;disposed=true;abort.abort();resizeObserver.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);clearModel();renderer?.dispose();renderer?.forceContextLoss();root.remove();}
  };
}
