import {reducedMotion} from '../mechanical/settings';
import {interval, tracingTimeline} from './tracing-sequence';

function mountTracing() {
 const candidate = document.querySelector<HTMLElement>('[data-tracing-journey]');
 if (!candidate) return () => {};
 const root = candidate;
 const find = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
 const track = find<HTMLElement>('[data-tracing-track]');
 const stage = find<HTMLElement>('[data-tracing-stage]');
 const sheet = find<SVGSVGElement>('[data-tracing-sheet]');
 const labels = find<SVGGElement>('[data-trace-labels]');
 const chapter = find<HTMLElement>('[data-tracing-chapter]');
 const heading = find<HTMLElement>('[data-tracing-heading]');
 const copy = find<HTMLElement>('[data-tracing-copy]');
 const cue = find<HTMLElement>('[data-tracing-cue]');
 const direction = find<HTMLElement>('[data-tracing-direction]');
 const steps = [...root.querySelectorAll<HTMLElement>('[data-trace-step]')];
 const initial = {chapter:chapter.textContent, heading:heading.innerHTML, copy:copy.textContent};
 const phases = [
  {chapter:'01 / THE INK FINDS ITS WAY',heading:'First, <br/><em>a few lines.</em>',copy:'A block. A creek. A note in the margin. Keep scrolling as the drawing follows the city beneath.',cue:'SCROLL TO DRAW ↓'},
  {chapter:'02 / THE SLEEVE SLIDES AWAY',heading:'Paper moves. <br/><em>The city stays.</em>',copy:'The sleeve slides to the right, carrying the drawing with it. The original sheet stays in place.',cue:'SCROLL TO REVEAL ↓'},
  {chapter:'03 / BACK TO THE ARCHIVE',heading:'The original, <br/><em>still here.</em>',copy:'Tampa, June 1887. Keep going for the field notes, or scroll back to slide the drawing into place again.',cue:'THE FIELD NOTES ARE BELOW ↓'},
 ];
 const windows = {streets:[.04,.33], water:[.25,.45], notes:[.43,.58]} as const;
 const strokes = Object.entries(windows).flatMap(([layer, [start,end]]) => {
  const paths = [...root.querySelectorAll<SVGGeometryElement>(`[data-trace-layer="${layer}"] path, [data-trace-layer="${layer}"] circle`)];
  const ordinary = paths.filter(path => !path.closest('[data-scribble-accent]'));
  return paths.map(path => {
   const scribble = !!path.closest('[data-scribble-accent]');
   const at = Math.max(0, ordinary.indexOf(path)) / Math.max(1, ordinary.length - 1);
   return {path, length:path.getTotalLength(), style:path.getAttribute('style'), start:scribble ? .48 : start + at * (end-start) * .72, end:scribble ? .60 : start + (at * .72 + .28) * (end-start)};
  });
 });
 let active: boolean | undefined;
 let visible = true, frame = 0, top = 0, travel = 1, phase = -1, lastProgress = -1, frames = 0;
 const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
 function render() {
  frame = 0;
  if (!active || !visible || document.hidden) return;
  const state = tracingTimeline((scrollY-top)/travel);
  if (state.progress === lastProgress) return;
  lastProgress = state.progress;
  for (const stroke of strokes) {
   const amount = interval(state.progress, stroke.start, stroke.end);
   if (amount === 1) {
    if (stroke.style === null) stroke.path.removeAttribute('style');
    else stroke.path.setAttribute('style', stroke.style);
   } else {
    stroke.path.style.strokeDasharray = `${stroke.length} ${stroke.length}`;
    stroke.path.style.strokeDashoffset = String(stroke.length * (1-amount));
    stroke.path.style.visibility = amount === 0 ? 'hidden' : 'visible';
   }
  }
  labels.style.opacity = String(interval(state.progress,.50,.60));
  // Restore the original loose-film pull: a top-right pivot, slight tilt, and upward drift.
  sheet.style.transform = `translate(${state.slide * 104}%, ${state.slide * -8}%) rotate(${state.slide * -7}deg)`;
  sheet.style.visibility = state.slide === 1 ? 'hidden' : '';
  if (phase !== state.phase) {
   phase = state.phase;
   const text = phases[phase];
   chapter.textContent=text.chapter;heading.innerHTML=text.heading;copy.textContent=text.copy;cue.textContent=text.cue;
   steps.forEach((step,i)=>step.toggleAttribute('data-current',i===phase));
  }
  root.style.setProperty('--trace-progress',String(state.progress));
  root.dataset.tracingProgress=state.progress.toFixed(4);
  root.dataset.inkProgress=state.ink.toFixed(4);
  root.dataset.slideProgress=state.slide.toFixed(4);
  root.dataset.tracingPhase=String(phase);
  root.dataset.renderFrames=String(++frames);
 }
 const request = () => {if (active && visible && !document.hidden && !frame) frame=requestAnimationFrame(render);};
 function reset() {
  for (const {path,style} of strokes) {if (style === null) path.removeAttribute('style');else path.setAttribute('style',style);}
  labels.style.opacity='';sheet.style.visibility='';
  sheet.style.transform='';
  chapter.textContent=initial.chapter;heading.innerHTML=initial.heading;copy.textContent=initial.copy;
  steps.forEach(step=>step.removeAttribute('data-current'));
  root.dataset.inkProgress='1';root.dataset.slideProgress='0';
 }
 function measure() {
  const enabled = !reducedMotion() && innerHeight >= 600 && parseFloat(getComputedStyle(document.documentElement).fontSize) <= 18;
  if (enabled !== active) {
   active=enabled;root.dataset.tracingMode=active?'scroll':'still';
   cue.hidden=!active;direction.hidden=!active;phase=-1;lastProgress=-1;
   if (!active) {cancelAnimationFrame(frame);frame=0;reset();}
  }
  if (!active) return;
  top=track.getBoundingClientRect().top+scrollY;
  travel=Math.max(1,track.offsetHeight-stage.offsetHeight);
  request();
 }
 const intersection = new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if (visible) request();else {cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});
 intersection.observe(track);
 const resize = new ResizeObserver(measure);
 resize.observe(document.documentElement);resize.observe(stage);
 const preference = new MutationObserver(measure);
 preference.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion','style','class']});
 window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',measure,{passive:true});
 document.addEventListener('visibilitychange',request);motionQuery.addEventListener('change',measure);
 measure();
 return () => {
  cancelAnimationFrame(frame);intersection.disconnect();resize.disconnect();preference.disconnect();
  window.removeEventListener('scroll',request);window.removeEventListener('resize',measure);
  document.removeEventListener('visibilitychange',request);motionQuery.removeEventListener('change',measure);
  reset();
 };
}
let dispose = mountTracing();
window.addEventListener('pagehide',()=>dispose());
window.addEventListener('pageshow',event=>{if (event.persisted) dispose=mountTracing();});
