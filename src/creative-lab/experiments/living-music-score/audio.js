import {clamp,pitchInfo,validateComposition} from './music.js';
// Procedural voices only. Can also be scheduled into an OfflineAudioContext.
export function createNoteVoice(context,output,event,at,duration){
 const frequency=pitchInfo(event.pitch).frequency,kind=event.instrument||'piano',gain=context.createGain(),filter=context.createBiquadFilter(),sources=[],partials=kind==='celesta'?[[1,.8],[2.76,.12],[5.4,.03]]:kind==='reed'?[[1,.7],[2,.16],[3,.08]]:[[1,.8],[2,.15],[3,.035]];
 filter.type='lowpass';filter.frequency.value=kind==='reed'?2100:4800;filter.Q.value=.45;gain.connect(filter);filter.connect(output);const end=at+Math.max(.006,duration),attack=Math.min(.018,duration*.12),level=kind==='reed'?.11:.15;
 gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+attack);if(kind==='reed'){gain.gain.setValueAtTime(level*.72,Math.max(at+attack,end-.055));gain.gain.linearRampToValueAtTime(0,end);}else{gain.gain.exponentialRampToValueAtTime(.00012,Math.max(at+attack+.005,end-.01));gain.gain.linearRampToValueAtTime(0,end);}
 let disposed=false,remaining=partials.length;const gains=[];const cleanup=()=>{if(disposed)return;disposed=true;for(const source of sources)source.disconnect();gains.forEach(g=>g.disconnect());gain.disconnect();filter.disconnect();};
 for(const [ratio,weight]of partials){const oscillator=context.createOscillator(),part=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency*ratio,at);part.gain.value=weight;oscillator.connect(part);part.connect(gain);sources.push(oscillator);gains.push(part);oscillator.onended=()=>{if(--remaining===0)cleanup();};oscillator.start(at);oscillator.stop(end+.012);}
 return {eventId:event.id,at,end,frequency,dispose(){if(disposed)return;const now=context.currentTime;gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.005);for(const source of sources)try{source.stop(now+.025);}catch{}},disconnect:cleanup};
}
export function createScoreAudio({contextFactory,onState=()=>{}}={}){
 let context=null,master=null,limiter=null,disposed=false,playing=false,composition=null,tempo=88,volume=.3,position=0,base=0,timer=0,cursor=0,serial=0,scheduled=0;const voices=new Set();
 const beat=()=>playing?clamp((context.currentTime-base)*tempo/60,position,composition.totalBeats):position;
 const getState=()=>({context:context?.state||'uncreated',playing,beat:beat(),scheduled,voices:voices.size,disposed,tempo,volume});
 const notify=()=>onState(getState());
 function release(){clearInterval(timer);timer=0;for(const voice of voices)voice.dispose();voices.clear();}
 function pause(){serial++;if(playing)position=beat();playing=false;release();notify();return position;}
 function pump(){if(!playing||disposed||context.state!=='running')return;const now=context.currentTime,horizon=now+.14,seconds=60/tempo;for(const voice of voices)if(voice.end<now-.04){voice.disconnect();voices.delete(voice);}while(cursor<composition.events.length){const event=composition.events[cursor],at=base+event.start*seconds,end=base+(event.start+event.duration)*seconds;if(at>horizon)break;cursor++;if(!event.pitch||end<=now+.005)continue;const start=Math.max(now+.003,at,base+position*seconds),voice=createNoteVoice(context,master,event,start,end-start);voices.add(voice);scheduled++;}if(beat()>=composition.totalBeats){position=composition.totalBeats;playing=false;clearInterval(timer);timer=0;notify();}}
 async function play(score,{from=0,bpm=score.tempo,gain=.3}={}){
  if(disposed)throw new Error('Player disposed');const next=validateComposition(score);if(!Number.isFinite(from)||!Number.isFinite(bpm)||bpm<40||bpm>160)throw new Error('Invalid playback position or tempo');pause();const ticket=++serial;
  if(!context){const Factory=globalThis.AudioContext||globalThis.webkitAudioContext;if(!contextFactory&&!Factory)throw new Error('Web Audio is unavailable. The silent score and exports still work.');context=contextFactory?contextFactory():new Factory();master=context.createGain();master.gain.value=0;limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=16;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.12;master.connect(limiter);limiter.connect(context.destination);context.onstatechange=()=>{if(playing&&context.state!=='running')pause();else notify();};}
  await context.resume();if(disposed||ticket!==serial)return false;if(context.state!=='running')throw new Error('Audio is paused by the browser. Press Play again to resume.');composition=next;tempo=bpm;volume=clamp(gain,0,.6);position=clamp(from,-20,score.totalBeats);base=context.currentTime+.045-position*60/tempo;cursor=0;scheduled=0;playing=true;master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(volume,context.currentTime,.015);pump();timer=setInterval(pump,25);notify();return true;
 }
 function seek(value){pause();if(!Number.isFinite(value))throw new Error('Position must be finite');position=composition?clamp(value,-20,composition.totalBeats):value;notify();}
 function setVolume(value){volume=clamp(value,0,.6);if(master)master.gain.setTargetAtTime(volume,context.currentTime,.015);notify();}
 async function dispose(){if(disposed)return;const active=[...voices];pause();disposed=true;for(const voice of active)voice.disconnect();voices.clear();if(context){context.onstatechange=null;master.disconnect();limiter.disconnect();if(context.state!=='closed')await context.close();}notify();}
 return {play,pause,seek,setVolume,getBeat:beat,getState,dispose};
}
