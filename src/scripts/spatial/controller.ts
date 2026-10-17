import * as T from 'three';
import {sampleCamera,rooms,roomAt,clamp,phase} from './path';
import {createWorld} from './world';
export async function mountSpatial(root:HTMLElement,onFailure:(message:string)=>void){
 const track=root.querySelector<HTMLElement>('[data-spatial-track]')!,stage=root.querySelector<HTMLElement>('[data-spatial-stage]')!;
 const holder=root.querySelector<HTMLElement>('[data-spatial-canvas]')!;
 const compact=matchMedia('(max-width:700px)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:compact?'low-power':'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0xeee7d8);
 renderer.domElement.setAttribute('aria-hidden','true');holder.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(48,1,.08,150),world=createWorld(compact);
 const abort=new AbortController(),signal=abort.signal;
 let current=0,target=0,frame=0,last=0,visible=true,disposed=false,drawingOnly=false,room=-1,photoRequested=false,interacted=false;
 let start=0,travel=1,width=1,height=1,renderedFrames=0,lastSavedProgress=-1;
 let dpr=Math.min(devicePixelRatio,compact?1.25:1.7),frameCount=0,frameTime=0,qualityChanges=0;
 const photoLink=root.querySelector<HTMLAnchorElement>('[data-photo-link]')!;
 const drawButton=root.querySelector<HTMLButtonElement>('[data-show-drawing]')!;
 const crank=root.querySelector<HTMLInputElement>('[data-crank]')!;
 const instruments=root.querySelector<HTMLElement>('[data-spatial-instruments]')!;
 const caption=root.querySelector<HTMLElement>('.spatial-caption')!;
 const roomNumber=root.querySelector<HTMLElement>('[data-room-number]')!;
 const roomHeading=root.querySelector<HTMLElement>('[data-room-heading]')!;
 const roomCopy=root.querySelector<HTMLElement>('[data-room-copy]')!;
 const pencilNote=root.querySelector<HTMLElement>('[data-pencil-note]')!;
 const crankLabel=root.querySelector<HTMLElement>('[data-crank-label]')!;
 const coordinates=root.querySelector<HTMLElement>('[data-world-coordinates]')!;
 let photoWidth=0,photoHeight=0,captionTop=0,displayedPercent=-1;
 let captionAnimation:Animation|undefined;
 const setHidden=(element:HTMLElement,hidden:boolean)=>{if(element.hidden!==hidden)element.hidden=hidden;};
 const measureOverlay=()=>{photoWidth=photoLink.offsetWidth;photoHeight=photoLink.offsetHeight;captionTop=caption.offsetTop;};
 const position=new T.Vector3(),quaternion=new T.Quaternion(),projected=new T.Vector3();
 const links=[...document.querySelectorAll<HTMLAnchorElement>('[data-room-link]')];
 // The static articles own these anchors only in reading mode. Keeping their
 // IDs live during a cinematic deep link lets WebKit re-anchor after font load.
 const readingAnchors=rooms.map(room=>document.getElementById(room.id)!);
 readingAnchors.forEach((element,index)=>element.id=`notes-${rooms[index].id}`);
 function measure(){
  width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);
  if(height<480||caption.offsetHeight+instruments.offsetHeight+175>height*.92){onFailure('For this window size, the still drawing gives the text more room. All four rooms and stories are available below.');return;}
  start=track.getBoundingClientRect().top+scrollY;travel=Math.max(1,track.offsetHeight-height);
  camera.aspect=width/height;camera.fov=width<700?67:48;camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);readScroll();
  measureOverlay();
 }
 function readScroll(){target=clamp((scrollY-start)/travel);request();}
 function request(){if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
 function render(time:number){
  frame=0;if(disposed||!visible||document.hidden)return;
  const elapsed=last?time-last:16;last=time;
  const delta=target-current;
  current=Math.abs(delta)<.000025?target:current+delta*(1-Math.exp(-Math.min(elapsed,50)/95));
  sampleCamera(current,position,quaternion);camera.position.copy(position);camera.quaternion.copy(quaternion);
  const fieldOfView=width<700?67+17*phase(current,.62,.75):48;
  if(camera.fov!==fieldOfView){camera.fov=fieldOfView;camera.updateProjectionMatrix();}
  const mechanical=world.update(current,drawingOnly);
  renderer.render(world.scene,camera);
  root.dataset.renderFrames=String(++renderedFrames);
  const active=roomAt(current);
  const roomChanged=active!==room;
  if(roomChanged){
   if(room!==-1){captionAnimation?.cancel();captionAnimation=caption.animate([{opacity:.7},{opacity:1}],{duration:180,easing:'ease-out'});}
   room=active;roomNumber.textContent=`0${active+1} / ${rooms[active].name.toUpperCase()}`;roomHeading.textContent=rooms[active].name;roomCopy.textContent=rooms[active].description;links.forEach(link=>{if(link.dataset.roomLink===rooms[active].id)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  }
  if((roomChanged||current===target)&&current!==lastSavedProgress&&scrollY>=start-10&&scrollY<start+travel+height*.5){history.replaceState({...history.state,spatialRoom:rooms[active].id,spatialProgress:current},'',`#${rooms[active].id}`);lastSavedProgress=current;}
  const city=current>.89;
  setHidden(pencilNote,current>.19);
  setHidden(crankLabel,current>.37);
  setHidden(drawButton,!city);
  const crankValue=String(Math.round(clamp(current/.32)*100));if(crank.value!==crankValue)crank.value=crankValue;
  root.style.setProperty('--crank-angle',`${current*540}deg`);
  root.style.setProperty('--journey-progress',String(current));
  const percent=Math.round(current*100);
  if(percent!==displayedPercent||roomChanged){coordinates.textContent=`PLATE 0${active+1} / ${String(percent).padStart(3,'0')}% THROUGH THE DRAWING`;displayedPercent=percent;}
  projected.copy(world.photoPoint).project(camera);
  const photoVisible=city&&!drawingOnly&&Math.abs(projected.x)<.9&&Math.abs(projected.y)<.95&&projected.z<1;
  if(photoLink.hidden===photoVisible){photoLink.hidden=!photoVisible;if(photoVisible)measureOverlay();}
  if(photoVisible){
   const halfWidth=photoWidth/2,halfHeight=photoHeight/2;
   const bottom=width<700?captionTop-14:height-85;
   photoLink.style.left=`${Math.max(halfWidth+14,Math.min(width-halfWidth-14,(projected.x*.5+.5)*width))}px`;
   photoLink.style.top=`${Math.max(110+halfHeight,Math.min(bottom-halfHeight,(-projected.y*.5+.5)*height))}px`;
  }
  if(current>.60&&!photoRequested){photoRequested=true;void world.loadPhoto(root.dataset.photo!,request);}
  // Diagnostics describe rendered state, so tests can prove reversal and coupling.
  Object.assign(root.dataset,{progress:current.toFixed(6),cameraPosition:position.toArray().join(','),cameraQuaternion:quaternion.toArray().join(','),fold:mechanical.fold.toFixed(6),gear:mechanical.gear.toFixed(6),pinion:mechanical.pinion.toFixed(6),lift:mechanical.lift.toFixed(6),photoReveal:mechanical.reveal.toFixed(6),pedestrians:mechanical.pedestrians,pedestrianCount:String(mechanical.pedestrianCount),drawCalls:String(renderer.info.render.calls),resolution:dpr.toFixed(2)});
  if(Math.abs(delta)>.0001&&elapsed<100){frameCount++;frameTime+=elapsed;if(frameCount>=45){if(frameTime/frameCount>28&&qualityChanges<3&&dpr>.85){dpr=Math.max(.85,dpr-.2);qualityChanges++;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}frameCount=0;frameTime=0;}}
  if(current!==target)request();else last=0;
 }
 function goTo(id:string,push=false){
  const destination=rooms.find(room=>room.id===id);if(!destination)return;
  if(push){interacted=true;if(location.hash!==`#${id}`)history.pushState({spatialRoom:id},'',`#${id}`);}
  window.scrollTo({top:start+travel*destination.progress,behavior:'instant'});readScroll();
 }
 function restoreLocation(){const saved=history.state?.spatialProgress;if(history.state?.spatialRoom===location.hash.slice(1)&&typeof saved==='number'&&Number.isFinite(saved)){window.scrollTo({top:start+travel*clamp(saved),behavior:'instant'});readScroll();}else goTo(location.hash.slice(1));}
 document.addEventListener('click',event=>{
  const exit=(event.target as Element).closest<HTMLAnchorElement>('a[href="#field-notes"]');
  if(exit&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();interacted=true;history.pushState({},'','#field-notes');document.getElementById('field-notes')!.scrollIntoView({block:'start',behavior:'instant'});return;}
  const link=(event.target as Element).closest<HTMLAnchorElement>('[data-room-link]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();goTo(link.dataset.roomLink!,true);
 },{signal});
 window.addEventListener('popstate',restoreLocation,{signal});
 window.addEventListener('hashchange',restoreLocation,{signal});
 window.addEventListener('scroll',readScroll,{passive:true,signal});
 for(const event of ['wheel','touchstart','keydown'])window.addEventListener(event,()=>{interacted=true;},{passive:true,once:true,signal});
 window.addEventListener('pageshow',()=>{measure();readScroll();},{signal});
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();},{signal});
 crank.addEventListener('input',()=>{window.scrollTo({top:start+travel*Number(crank.value)/100*.32,behavior:'instant'});readScroll();},{signal});
 drawButton.addEventListener('click',()=>{drawingOnly=!drawingOnly;drawButton.setAttribute('aria-pressed',String(drawingOnly));drawButton.textContent=drawingOnly?'Bring back the photograph':'See the drawing beneath';request();},{signal});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();onFailure('The moving drawing is unavailable. The illustrated field notes and stories are ready below.');},{signal});
 const resize=new ResizeObserver(measure);resize.observe(stage);resize.observe(caption);resize.observe(instruments);resize.observe(document.querySelector('.spatial-intro')!);
 const overlayResize=new ResizeObserver(()=>{measureOverlay();request();});overlayResize.observe(photoLink);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible){readScroll();request();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'0px'});observer.observe(stage);
 root.dataset.renderer='ready';instruments.hidden=false;root.querySelector<HTMLElement>('[data-spatial-progress]')!.hidden=false;root.querySelector<HTMLElement>('[data-stage-nav]')!.hidden=false;
 measure();
 const backForward=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='back_forward';
 if(backForward)restoreLocation();else if(rooms.some(room=>`#${room.id}`===location.hash))goTo(location.hash.slice(1));
 current=target;
 const settleInitialLink=()=>{void document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(disposed||interacted)return;measure();if(rooms.some(room=>`#${room.id}`===location.hash)){if(backForward)restoreLocation();else goTo(location.hash.slice(1));current=target;request();}})));};
 if(document.readyState==='complete')settleInitialLink();else window.addEventListener('load',settleInitialLink,{once:true,signal});
 request();
 return {dispose(){disposed=true;abort.abort();resize.disconnect();overlayResize.disconnect();observer.disconnect();captionAnimation?.cancel();cancelAnimationFrame(frame);world.dispose();renderer.dispose();renderer.domElement.remove();readingAnchors.forEach((element,index)=>element.id=rooms[index].id);instruments.hidden=true;photoLink.hidden=true;root.querySelector<HTMLElement>('[data-stage-nav]')!.hidden=true;root.querySelector<HTMLElement>('[data-spatial-progress]')!.hidden=true;links.forEach(link=>link.removeAttribute('aria-current'));}};
}
