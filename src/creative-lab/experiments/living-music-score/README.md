# Living Music Score

An original musician’s notebook: a real one-voice score draws itself, plays its written notes, and can be edited. The three demo melodies and original code are MIT. Handwritten annotation outlines use Caveat, under SIL OFL 1.1 (included). No recordings or other people's compositions are used.

Serve the exported directory with `python3 -m http.server 8080`, then open `example.html`. No install, CDN or build is needed. `embed-demo.html` is a minimal separate music-website integration.

## Architecture

- `music.js`: original compositions, spelled pitch / frequency, validation, semantic note editing, duration splitting, accidental state and settings.
- `layout.js`: treble staff positions, ledger lines, stems, rhythmic spacing, eighth-note beams, ties and bar lines.
- `sketch.js`: actual sampled pen paths, seeded irregularity, pressure variation and beat-keyed stroke schedule.
- `drawing.js`: SVG renderer, exact tool-tip tracking, note highlighting, accessible selections and clean vector export.
- `audio.js`: lazy AudioContext, procedural note voices, 140 ms scheduling horizon / 25 ms lookahead timer, clock-based playback, pause and seek.
- `export.js`: Standard MIDI File type 0, PNG rasterization, score/animation documents and downloads.
- `index.js`: complete Lab interface, composition editor, controls and lifecycle adapter.

## Independent composition schema

```js
import {makeComposition} from './music.js';
const composition = makeComposition({
  id:'my-melody', title:'A small invention', meter:4, tempo:88,
  events:[
    {id:'one',pitch:'C4',duration:1,instrument:'piano'},
    {id:'two',pitch:'E4',duration:1,instrument:'piano'},
    {id:'three',pitch:'G4',duration:1.5,instrument:'piano'},
    {id:'four',pitch:null,duration:.5,instrument:'piano'}
  ]
});
```

The version-1 document contains `id`, `title`, `meter:{beats:3|4,unit:4}`, `tempo`, `totalBeats`, and `events`. Every event has a unique short `id`, `pitch` (spelled pitch such as F#4, Bb4 or null for rest), `start`, `duration`, one-based `measure`, `instrument`, and derived `notation:{value,dotted}`. Start and duration units are **quarter-note beats**, not seconds. `makeComposition` assigns consecutive start times and measure indices. `validateComposition` rejects gaps, overlaps, unsupported pitches/rhythms and inconsistent measures/lengths. Maximum 96 events / 12 measures. Imported files are limited to 80 KB; titles are text, never markup. Pitches use A4 = 440 Hz equal temperament.

One voice in treble clef; 3/4 or 4/4; G3–E6; single sharps/flats/naturals; eighth, quarter, dotted quarter, half, dotted half and whole durations. There is no key signature: chromatic alterations are written explicitly. Accidentals persist for a spelled pitch/octave within the measure, then reset. Pitch editing preserves spelling. Chords, polyphony, tuplets, grace notes, pickups, multiple staves and alternative clefs are intentionally outside this renderer. It does not silently pretend to support them.

Long durations split at bar lines and strong beats, with visible ties for pitched fragments; the audio and MIDI keep one sustained event. Rests split without ties. Eighth notes beam within quarter-note groups. Half and whole note heads remain open; dotted line notes place their dot in the space above. MIDI pitch and staff position derive from the same spelling, but enharmonic pitches retain different vertical positions. Final incomplete measures receive visible silent padding rests.

VexFlow’s documented engraving interfaces were considered. This small renderer deliberately owns the restricted layout and every pen path rather than converting a broad engraving engine's filled glyphs into a drawing animation. Its supported rules have explicit tests. For a broader score format, supply a different layout adapter and retain the sketch/audio modules.

## Independent rendering and playback

```js
import {loadHandwriting,createScoreDrawing} from './drawing.js';
import {createScoreAudio} from './audio.js';
import {DEFAULTS} from './music.js';
const font = await loadHandwriting(abortSignal);
const drawing = createScoreDrawing({host,composition,
  settings:DEFAULTS,font,width:900});
const audio = createScoreAudio(); // does not create an AudioContext
// Call only in an actual visitor click/tap handler:
playButton.onclick = async () => {
  await audio.play(composition,{from:0,bpm:88,gain:.3});
};
function paintFromAudioClock(){
  const beat=audio.getBeat(),plan=drawing.getPlan();
  drawing.render((beat+plan.lead)/(plan.total+plan.lead),
    {beat,playing:audio.getState().playing});
}
// Your animation loop calls paintFromAudioClock while playing.
// Silent normalized drawing / reverse scrubbing:
drawing.render(.5);
// Pause retains the exact beat. Seeking is silent; press Play to resume.
const heldBeat=audio.pause();
audio.seek(12);
await audio.play(composition,{from:12,bpm:88,gain:.3});
// Cleanup your listeners/RAF, then:
drawing.dispose();
await audio.dispose();
```

`getPlan` exposes the quarter-beat drawing timeline and layout. It starts at `-lead`; a short silent introduction writes the staff/clefs. Note groups finish just before their first audible onset. The drawing speed setting changes preparation time and scroll sensitivity, not the composition's tempo. Beamed groups are written together so the first sounding eighth already has a valid beam. The highlighted note follows the current audio beat. Pausing stops scheduled voices; resuming a sustained note plays only its remaining duration with a short click-free attack. Seeking always stops playback; it never starts sound unexpectedly.

The optional pen, pencil and quill attach to the current stroke's sampled arc length and tangent. Reverse progress erases exactly the same paths. Pressure and slight seeded irregularity alter the real linework, without changing a note's staff position. The original shape is not hidden under a random animated pencil.

`createScoreDrawing.update(composition,settings,width)` rebuilds notation only when content, settings or width change. `render(progress,{beat,playing,compose,selectedId})` updates the paths that changed. `exportSVG` returns the complete clean score without the tool, note hit areas or active highlight. `dispose` removes SVG/listeners. For the full interface use `mount(host,settings,report)` and its `update`, `setRunning`, `replay` and `dispose` methods.

## Audio lifecycle and safety

Audio is synthesized locally. “Felt keys”, “Celesta” and “Soft reed” are quiet approximations built from oscillators with shaped envelopes, not sampled acoustic instruments. They preserve the fundamental frequency. Volume starts at .3 and is capped at .6; a compressor and short attacks/releases avoid sharp transients. Mute sets master gain to zero without affecting visual timing. Play is the sole audio activation action. Import, scrolling, presets, page loading and editing never call AudioContext.resume.

`play` creates/resumes the context inside the gesture, awaits its running state, and schedules against `currentTime` with a small output lead. Timer callbacks only fill the scheduling horizon; they do not define musical event time. `getBeat` reads the same audio clock. Browser interruption, host pause, hidden/offscreen state and disposal stop playback; returning to the page requires Play. No elapsed-time catch-up or unsolicited restart occurs. Safari may require another gesture after OS audio interruption. With no Web Audio, silent drawing, composition editing and exports remain usable. No microphone or permissions are requested.

`createNoteVoice(context,output,event,at,duration)` is also usable with OfflineAudioContext. The audio engine owns its context. Calling dispose cancels timers, stops scheduled sources, disconnects gains/filters and closes the context. The host must cancel its own animation frames and listeners. No ambient render loop runs at rest.

## Controls, presets and files

Song, tempo, synthesized instrument, drawing speed, pressure, ink, irregularity, staff size, mode, pen/pencil/quill visibility, volume and progress are in the shared inspector. The Compose UI stores validated composition JSON in a hidden settings field so Lab presets and source packages retain edits; no technical JSON control is exposed in the creative workflow. Sound activation is never saved. The browser's Lab storage keeps this study's settings locally. No server, account, analytics or network upload is used.

- SVG and PNG: complete score at full legibility, independent of partial writing position.
- Composition JSON: actual musical events with beats, pitches, instruments and derived notation.
- MIDI: format 0, 480 ticks/quarter, tempo/time signature, note on/off pairs and three General MIDI programs. No drawing introduction in the MIDI file.
- Drawing recipe: version, composition and appearance/progress; audio is explicitly disabled. Import restores a silent drawing.
- Source ZIP: independent engine, UI, assets, OFL license and integration example, with the Lab's current settings.

## Validation and references

`pnpm test:living-music-score` checks note positions, accidentals, rhythm totals/ties, MIDI events, deterministic strokes, reverse scrubbing, pointer/touch, note editing, audio activation/timing and source exports in Chromium and WebKit. Offline rendered audio is checked against written pitch and note timing. Playwright WebKit covers Safari's engine; physical audio hardware, output latency and OS interruption behavior need device-specific listening checks.

Primary references: [LilyPond simple notation](https://lilypond.org/doc/v2.24/Documentation/learning/simple-notation), [LilyPond rhythms](https://lilypond.org/doc/v2.26/Documentation/notation/writing-rhythms), [VexFlow engraving tutorial](https://github.com/vexflow/vexflow/wiki/Tutorial), [Web Audio specification](https://webaudio.github.io/web-audio-api/).
