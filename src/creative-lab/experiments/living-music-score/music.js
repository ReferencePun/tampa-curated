// All durations and start positions are quarter-note beats, never wall-clock time.
export const DURATIONS=[.5,1,1.5,2,3,4];
export const SOUNDS=['piano','celesta','reed'];
export const DEFAULTS={song:'window',tempo:88,sound:'piano',speed:1,pressure:.6,ink:'#343330',irregularity:.48,staffSize:1,mode:'scroll',tool:'pen',volume:.3,progress:0,composition:''};
export const RANGES={tempo:[40,160],speed:[.35,2],pressure:[0,1],irregularity:[0,1],staffSize:[.8,1.35],volume:[0,.6],progress:[0,100]};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function pitchInfo(pitch){const match=/^([A-G])([#b]?)([3-6])$/.exec(pitch||'');if(!match)throw new Error('Use a spelled pitch such as C4, F#4 or Bb5.');const [,letter,accidental,octaveText]=match,octave=+octaveText,natural={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[letter],alter=accidental==='#'?1:accidental==='b'?-1:0,midi=(octave+1)*12+natural+alter;if(midi<55||midi>88)throw new Error('This treble study supports G3 through E6.');return {letter,accidental,alter,octave,midi,diatonic:octave*7+'CDEFGAB'.indexOf(letter),frequency:440*2**((midi-69)/12)};}
export function notationFor(duration){const base=({.5:'eighth',1:'quarter',1.5:'quarter',2:'half',3:'half',4:'whole'})[duration];if(!base)throw new Error('Unsupported note duration');return {value:base,dotted:duration===1.5||duration===3};}
export function makeComposition({id='custom',title='A small invention',meter=4,tempo=88,instrument='piano',events}){
 if(typeof title!=='string'||title.length>80||typeof id!=='string'||id.length>50||![3,4].includes(meter)||!Number.isFinite(tempo)||tempo<40||tempo>160||!SOUNDS.includes(instrument)||!Array.isArray(events)||events.length<1||events.length>96)throw new Error('Use 1–96 events, 3/4 or 4/4, and a tempo from 40–160.');let start=0;const ids=new Set();
 const normalized=events.map((event,index)=>{if(!event||!DURATIONS.includes(event.duration))throw new Error('Choose an eighth, quarter, dotted quarter, half, dotted half or whole note.');const pitch=event.pitch===null?null:String(event.pitch);if(pitch!==null)pitchInfo(pitch);const eventId=typeof event.id==='string'?event.id:`n${index+1}`;if(!/^[\w-]{1,40}$/.test(eventId)||ids.has(eventId))throw new Error('Every note needs a unique short ID.');ids.add(eventId);const sound=event.instrument||instrument;if(!SOUNDS.includes(sound))throw new Error('Unknown sound');const item={id:eventId,pitch,start,duration:event.duration,measure:Math.floor(start/meter)+1,instrument:sound,notation:notationFor(event.duration)};start+=event.duration;return item;});
 if(start>meter*12)throw new Error('Keep the melody within twelve measures.');return {version:1,id,title,meter:{beats:meter,unit:4},tempo,events:normalized,totalBeats:Math.ceil(start/meter)*meter};
}
export function validateComposition(input){
 if(!input||input.version!==1||input.meter?.unit!==4)throw new Error('Unsupported composition format');const normalized=makeComposition({id:input.id,title:input.title,meter:input.meter.beats,tempo:input.tempo,events:input.events});for(let i=0;i<normalized.events.length;i++){const a=normalized.events[i],b=input.events[i];if(b.start!==a.start||b.measure!==a.measure)throw new Error('Events must be consecutive, nonoverlapping quarter-beat positions with matching measures.');}if(input.totalBeats!==normalized.totalBeats)throw new Error('Composition length does not match the events');return normalized;
}
const notes=rows=>rows.flat().map(([pitch,duration])=>({pitch,duration}));
export const SONGS={
 window:makeComposition({id:'window',title:'A window left open',tempo:88,events:notes([
 [['E4',.5],['G4',.5],['A4',1],['G4',1],['E4',1]], [['D4',1],['E4',.5],['G4',.5],['C5',2]],
 [['B4',1],['A4',1],['G4',1],[null,1]], [['E4',1.5],['D4',.5],['C4',2]],
 [['G4',.5],['A4',.5],['C5',1],['B4',.5],['A4',.5],['G4',1]], [['E5',1],['D5',1],['C5',2]],
 [['B4',1],['A4',.5],['G4',.5],['E4',1],['D4',1]], [['C4',3],[null,1]]])}),
 moth:makeComposition({id:'moth',title:'Moth at the window',tempo:76,events:notes([
 [['A4',1],['C5',.5],['E5',.5],['D5',1],['B4',1]], [['A4',2],[null,.5],['E4',.5],['A4',1]],
 [['C5',.5],['B4',.5],['A4',.5],['G#4',.5],['A4',2]], [['E5',1],['D5',.5],['C5',.5],['B4',1],['G4',1]],
 [['A4',1.5],['B4',.5],['C5',1],['E5',1]], [['D5',1],['B4',1],['G#4',1],['G4',1]],
 [['E4',.5],['A4',.5],['C5',1],['B4',1],['G#4',1]], [['A4',3],[null,1]]])}),
 waltz:makeComposition({id:'waltz',title:'Blue hour, in three',meter:3,tempo:96,events:notes([
 [['F4',1],['A4',1],['C5',1]], [['Bb4',1],['A4',.5],['G4',.5],['F4',1]],
 [['A4',2],['C5',1]], [['G4',3]], [['F4',.5],['G4',.5],['A4',1],['C5',1]],
 [['D5',1],['C5',1],['Bb4',1]], [['A4',1],['G4',1],['E4',1]], [['F4',3]]])})
};
export function options(value={}){const s={...DEFAULTS,...value};for(const k of Object.keys(s))if(!(k in DEFAULTS))throw new Error(`Unknown setting: ${k}`);for(const [k,[a,b]]of Object.entries(RANGES))if(!Number.isFinite(s[k])||s[k]<a||s[k]>b)throw new Error(`Invalid ${k}`);if(!SONGS[s.song]||!['score',...SOUNDS].includes(s.sound)||!['scroll','play','compose'].includes(s.mode)||!['pen','pencil','quill','none'].includes(s.tool)||!/^#[0-9a-f]{6}$/i.test(s.ink)||typeof s.composition!=='string'||s.composition.length>24000)throw new Error('Invalid score settings');if(s.composition)validateComposition(JSON.parse(s.composition));return s;}
export const PRESETS={pencil:{name:'Pencil, softly',settings:{...DEFAULTS,tool:'pencil',pressure:.8,irregularity:.65,ink:'#57524b'}},blue:{name:'Blue-ink nocturne',settings:{...DEFAULTS,song:'moth',tempo:76,ink:'#314d73',tool:'pen',sound:'celesta'}},quill:{name:'An old waltz',settings:{...DEFAULTS,song:'waltz',tempo:96,ink:'#5e4331',tool:'quill',sound:'reed',pressure:.8}}};
export function compositionFor(s){const source=s.composition?validateComposition(JSON.parse(s.composition)):SONGS[s.song];return {...source,tempo:s.tempo,events:source.events.map(e=>({...e,instrument:s.sound==='score'?e.instrument:s.sound}))};}
export function editEvent(composition,id,changes){const events=composition.events.map(e=>e.id===id?{...e,...changes}:e);return makeComposition({id:'custom',title:composition.title,meter:composition.meter.beats,tempo:composition.tempo,events});}
// Split at bar lines and strong beats; tie the pitched fragments, not the audio.
export function notatedEvents(composition){
 const meter=composition.meter.beats,events=[...composition.events],end=events.at(-1).start+events.at(-1).duration;if(end<composition.totalBeats)events.push({id:'padding',pitch:null,start:end,duration:composition.totalBeats-end,instrument:'piano',padding:true});const fragments=[];
 for(const event of events){let start=event.start,remaining=event.duration,index=0;while(remaining>1e-8){const beat=start%meter,available=Math.min(remaining,meter-beat);let duration;
  if(start%1!==0)duration=.5;else if(available>=4&&beat===0)duration=4;else if(available>=3&&beat===0)duration=3;else if(available>=2&&(meter===3||beat%2===0))duration=2;else if(available>=1.5&&(meter===3||beat%2===0))duration=1.5;else duration=available>=1?1:.5;
  const info=event.pitch?pitchInfo(event.pitch):null;fragments.push({...event,id:`${event.id}-${index}`,eventId:event.padding?null:event.id,start,duration,measure:Math.floor(start/meter),beat,fragment:index,info,...notationFor(duration),tieIn:event.pitch!==null&&index>0,tieOut:event.pitch!==null&&remaining>duration,accidental:null});start+=duration;remaining-=duration;index++;
 }}
 let measure=-1,accidentals=new Map();for(const f of fragments){if(f.measure!==measure){measure=f.measure;accidentals=new Map();}if(!f.info)continue;const key=f.info.letter+f.info.octave,prior=accidentals.get(key)||0;if(f.info.alter!==prior)f.accidental=f.info.alter===1?'sharp':f.info.alter===-1?'flat':'natural';accidentals.set(key,f.info.alter);}
 return fragments;
}
export function activeEvents(composition,beat){return composition.events.filter(e=>e.pitch!==null&&beat>=e.start&&beat<e.start+e.duration).map(e=>e.id);}
