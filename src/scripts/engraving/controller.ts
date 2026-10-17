import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { crankPosition } from '../../lib/mechanisms';

gsap.registerPlugin(ScrollTrigger);
const clamp = (n:number) => Math.max(0, Math.min(1,n));
const sweep:Record<string,number> = {hero:180,drawing:145,pulley:100,aperture:150,map:160};

export function initMechanisms() {
  const roots=[...document.querySelectorAll<HTMLElement>('[data-machine]')];
  const restorers:(()=>void)[]=[];
  const context=gsap.context(()=>{
    for(const root of roots) {
      const kind=root.dataset.machine!;
      const gears=[...root.querySelectorAll<SVGElement>('[data-gear]')];
      const belts=[...root.querySelectorAll<SVGElement>('[data-belt]')];
      const cranks=[...root.querySelectorAll<SVGGElement>('[data-crank]')];
      const drawings=[...root.querySelectorAll<SVGElement>('[data-drawing]')];
      const apertures=[...root.querySelectorAll<SVGGElement>('[data-aperture]')];
      const lift=root.querySelector<HTMLElement>('.pulley-lift');
      const rig=root.querySelector<SVGSVGElement>('.gallery-rig');
      const window=root.querySelector<SVGRectElement>('[data-drawing-window]');
      const arm=root.querySelector<SVGGElement>('[data-drafting-arm]');
      // Restore the fully legible server-rendered plate for reduced motion.
      const elements=[...root.querySelectorAll<SVGElement|HTMLElement>('[data-gear],[data-belt],[data-crank-arm],[data-connecting-rod],[data-piston],[data-drawing],[data-iris-hole],[data-iris-cutout],[data-iris-rim],[data-iris-blade],[data-lift-cable],[data-weight-cable],[data-counterweight],[data-drawing-window],[data-arm-upper],[data-arm-lower],[data-arm-under],[data-arm-elbow],[data-arm-pen],.pulley-lift')];
      const original=elements.map(el=>({el,attrs:[...el.attributes].map(a=>[a.name,a.value])}));
      restorers.push(()=>{
        for(const {el,attrs} of original) {
          for(const a of [...el.attributes]) el.removeAttribute(a.name);
          for(const [name,value] of attrs) el.setAttribute(name,value);
        }
        delete root.dataset.machineProgress;
        delete root.dataset.machineReady;
      });
      let rigScale=1;
      const measure=()=>{ if(rig) rigScale=rig.clientWidth/800; };
      measure();
      const state={progress:0};
      const render=()=>{
        const p=state.progress,angle=p*sweep[kind];
        root.dataset.machineProgress=p.toFixed(5);
        for(const gear of gears) gear.setAttribute('transform',`rotate(${Number(gear.dataset.phase||0)+angle*Number(gear.dataset.rate||1)})`);
        for(const belt of belts) belt.style.strokeDashoffset=String(-angle*Number(belt.dataset.rate));
        for(const crank of cranks) {
          const theta=Number(crank.dataset.phase)+angle*Number(crank.dataset.rate);
          const point=crankPosition(theta,Number(crank.dataset.radius),Number(crank.dataset.rodLength));
          crank.querySelector('[data-crank-arm]')!.setAttribute('transform',`rotate(${theta})`);
          for(const rod of crank.querySelectorAll('[data-connecting-rod]')) rod.setAttribute('d',`M${point.x} ${point.y}L0 ${point.slider}`);
          crank.querySelector('[data-piston]')!.setAttribute('transform',`translate(0 ${point.slider})`);
        }
        for(const line of drawings) {
          line.style.strokeDasharray='1';
          line.style.strokeDashoffset=String(1-clamp((p-.04)/.72));
        }
        for(const aperture of apertures) {
          const radius=Number(aperture.dataset.radius);
          const opening=kind==='hero'?.62+.34*clamp(p/.8):.14+.82*clamp((p-.06)/.72);
          aperture.querySelector('[data-iris-hole]')!.setAttribute('r',String(radius*opening));
          // Optional hand-cut opening follows the same aperture, with no new timeline.
          aperture.querySelector('[data-iris-cutout]')?.setAttribute('transform',`scale(${opening})`);
          aperture.querySelector('[data-iris-rim]')!.setAttribute('r',String(radius*opening));
          for(const blade of aperture.querySelectorAll('[data-iris-blade]')) blade.setAttribute('transform',`rotate(${p*18})`);
        }
        if(lift) {
          const travel=angle*Math.PI/180*48;
          lift.style.transform=`translateY(${-travel*rigScale}px)`;
          for(const cable of root.querySelectorAll<SVGElement>('[data-lift-cable]')) {
            const left=cable.dataset.liftCable==='left';
            cable.setAttribute('d',`M${left?155:622} 85V${192-travel}H${left?160:640}`);
          }
          for(const cable of root.querySelectorAll<SVGElement>('[data-weight-cable]')) cable.setAttribute('d',`M${cable.dataset.weightCable} 85V${480+travel}`);
          for(const weight of root.querySelectorAll<SVGElement>('[data-counterweight]')) weight.setAttribute('transform',`translate(${weight.dataset.counterweight} ${480+travel})`);
        }
        if(window) window.setAttribute('width',String(492*clamp((p-.15)/.68)));
        if(arm) {
          const x=120+430*p,y=-90-145*Math.sin(p*Math.PI),a=280,b=300;
          const d=Math.hypot(x,y);
          const theta=Math.atan2(y,x)-Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
          const ex=a*Math.cos(theta),ey=a*Math.sin(theta);
          arm.querySelector('[data-arm-upper]')!.setAttribute('d',`M0 0L${ex} ${ey}`);
          arm.querySelector('[data-arm-lower]')!.setAttribute('d',`M${ex} ${ey}L${x} ${y}`);
          arm.querySelector('[data-arm-under]')!.setAttribute('d',`M0 0L${ex} ${ey}L${x} ${y}`);
          for(const [selector,cx,cy] of [['[data-arm-elbow]',ex,ey],['[data-arm-pen]',x,y]] as const) {
            const joint=arm.querySelector(selector)!; joint.setAttribute('cx',String(cx)); joint.setAttribute('cy',String(cy));
          }
        }
      };
      gsap.to(state,{progress:1,ease:'none',onUpdate:render,scrollTrigger:{
        trigger:root,start:kind==='hero'?'top top':'top 85%',
        end:kind==='hero'?'bottom 65%':'bottom 25%',scrub:true,
        invalidateOnRefresh:true,onRefresh:()=>{measure();render();},
      }});
      root.dataset.machineReady='true';
      render();
    }
  });
  let refreshFrame=0,disposed=false;
  const refresh=()=>{
    // A forced refresh resets the scroll position and cancels the book's
    // native smooth navigation. Safe refresh waits for scrolling to settle.
    if(!refreshFrame&&!disposed)refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;ScrollTrigger.refresh(true);});
  };
  const resize=new ResizeObserver(refresh);
  resize.observe(document.querySelector('.page-shell')!);
  document.fonts.ready.then(()=>{if(!disposed)refresh();});
  const events=new AbortController();
  document.addEventListener('load',refresh,{capture:true,signal:events.signal});
  refresh();
  return ()=>{disposed=true;cancelAnimationFrame(refreshFrame);events.abort();resize.disconnect();context.revert();restorers.forEach(restore=>restore());};
}
