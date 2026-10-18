# Spatial Sound — the listening room

An imaginary instrument in five parts. Perspective SVG, original procedural audio, no runtime dependencies or remote assets. All code and illustration: MIT. There are no sampled sounds or third-party recordings. The main Tampa pages are not involved.

## Try it

Serve the exported folder over HTTP (`python3 -m http.server 8080`), then open `example.html`. The room starts silent. Enable sound deliberately, turn a mechanism, move using the floor plan or arrow buttons, or focus the drawing and use arrows / WASD. Tab + Enter/Space operates a drawn mechanism. Touch uses the floor plan and ordinary buttons without hijacking page scrolling.

- Escapement: every tooth releases a short filtered noise tick.
- Pendulum: each center crossing makes a soft sine tone; alternate crossings choose adjacent scale degrees.
- Harmonic wheel: half-turns choose a register in the selected scale. The drawn crank and sound use the same phase.
- Counterweight: each mid-travel crossing creates filtered grain; the sound source moves with the weight.
- Articulated arm: each half-cycle releases a triangle-wave pluck.

The room has physical source coordinates in meters (x right, y up, z toward the entrance). The listener moves from z=9 toward z=2.5, looking along negative z. The drawing projects the same ground position from an elevated drafting viewpoint; audio distances use the listener’s actual 1.7 m ear height. This is a perspective line illustration, not a navigable mesh or room-acoustics simulation. HRTF spatialization and inverse-distance attenuation provide direction/distance; there is no simulated reverberant architecture.

## Modules

- `mechanics.js`: pure deterministic phase transport, hand-operated increments, mechanical poses, scales and voice parameters. Call `advance(machine, deltaSeconds, settings)` using your animation delta; it returns the actual crossing events. Frame delta is bounded to 100 ms to avoid a catch-up burst after suspension.
- `audio.js`: independent Web Audio engine and procedural voice factory. No references to this room or DOM UI.
- `drawing.js`: perspective SVG illustrator, using the same mechanical state and listener position.
- `index.js` / `styles.js`: complete accessible demonstration, source switches, movement, recipes, export and recording.

## Independent audio integration

```js
import {createSpatialAudio} from './creative-lab/experiments/spatial-sound/audio.js';
const audio = createSpatialAudio({onState: state => console.log(state)});
const removeBell = audio.register({id: 'my-bell', position: [-2, 1.6, -3], gain: .8});
audio.setListener([0, 1.7, 5]);
audio.setSpatialization(1); // 0 centered mono, 1 full positional field
// Only in a click/tap handler:
enableButton.onclick = async () => { await audio.enable(); audio.setRunning(true); };
// Connect this to a real collision, hinge crossing, gesture or other application event:
function hingeCrossed() {
  audio.strike('my-bell', {kind: 'bell', frequency: 261.63, energy: .7, timbre: .4});
}
audio.updateSource('my-bell', {position: [-1, 2, -3], enabled: true, gain: .7});
audio.setVolume(.28); // clamped to 0..0.6
// Explicit controls / visibility lifecycle:
function pause() { audio.setRunning(false); }
function mute() { audio.mute(); }
async function teardown() { removeBell(); await audio.dispose(); }
```

Source IDs must be unique (maximum 32); positions are finite `[x,y,z]` arrays. Gain is 0–1. `register` returns an unregister function; `unregister(id)` is also available. `strike` accepts `tick`, `bell`, `hum`, `brush` or `pluck`, frequency (55–1600 Hz), energy/timbre (0–1); it returns false if muted, paused, interrupted, disabled or at the 24-voice limit. It never buffers unheard events to play later. `createVoice(context, output, voice, at)` also works with `OfflineAudioContext` for non-realtime integration/testing. Each voice returns a disposer and disconnects itself when finished.

`setListener(position)` faces negative z with positive-y up. Every source has a `PannerNode` (HRTF, inverse distance, reference distance 2 m, rolloff 1.2). Spatialization crossfades positional and centered routes. A soft master envelope and compressor follow the summed sources. The engine owns its context; `contextFactory` is an optional injection hook for testing. Do not share a context with an unrelated application unless that application also owns this engine’s close lifecycle.

## Audio permission and lifecycle

The constructor creates **no AudioContext**. `enable()` must be called directly inside a user gesture and awaited; failure leaves the silent UI usable. Audio opt-in is never stored in presets, local storage or the source ZIP. A muted instance remains muted after `setRunning(true)`. An enabled instance resumes its voices only when the host resumes animation. Browser/device interruptions may suspend the context independently; press Mute then Enable to request resumption.

`setRunning(false)` immediately stops future events, releases active voices and ends recording. The demo also pauses recording playback. The idle context is retained to avoid recreating the graph on each visibility change. `mute()` fades the master and ends recording; motion may continue. `dispose()` cancels recording, disconnects nodes, stops destination tracks and closes the owned context. The UI removes listeners, animation frames and object URLs. The Lab host handles reduced-motion, visibility, offscreen and navigation lifecycle; standalone integration must do the same. Reduced motion starts paused; explicit Run / Enable is an intentional opt-in to motion.

## Recording and scores

`startRecording(callback)` records the post-compressor output through a `MediaStreamAudioDestinationNode`; no `getUserMedia`, permission prompt or microphone input. It ends after 15 seconds, or on `stopRecording`, pause, mute or disposal. The completion callback receives a Blob or null if empty. Codec selection checks `MediaRecorder.isTypeSupported`: Opus WebM, MP4, WebM, then Ogg. Recording can still fail at runtime; JSON export remains available. The UI never plays a recording automatically.

The JSON score includes version, settings, source definitions, mechanical phase, listener position and the latest 256 `strike`, `move`, `setting`, `source` and `recipe` events. A strike carries its exact voice parameters, position, listener and whether it was audible. `at` is mechanical time, so at speed zero multiple hand gestures may share a time; array order is meaningful. This is semantic integration data, not an audio file or a built-in score player. No interaction history is persisted automatically. Browser native recording is the supported way to save the exact timing and mixed output.

## Full component

```js
import {mount} from './creative-lab/experiments/spatial-sound/index.js';
const room = mount(document.querySelector('.my-sized-host'), {speed: .65}, console.log);
room.setRunning(true); // illustration only; does not enable sound
room.update({speed: .35, atmosphere: 'dusk'});
room.getState(); // detached state snapshot / audio diagnostics
room.replay(); // reset the machinery and return to the entrance
room.dispose();
```

Host needs a width and height; UI scrolls inside it. The source includes scoped styles and a working standalone host. `update` supplies a complete settings object (omitted keys use defaults). `lab:settings` communicates inner control changes to a containing Lab inspector; `lab:set-pause` requests an explicit resume. No framework required.

## Settings / presets

| Setting | Range / meaning |
| --- | --- |
| speed | 0–2, step .05; actual mechanical phase velocity |
| volume | 0–.6, step .01; gain, still requires audio activation |
| spatial | 0–1, step .05; centered/positional mix |
| atmosphere | daylight pentatonic, dusk minor, suspended open fifths |
| detail | 1–3; floor hatching density |
| guides | construction lines on/off |
| gear, pendulum, wheel, pulley, arm | individual source enabled; motion remains visible |

Quiet workshop, After hours and Open clockwork are local recipes. The standard Lab inspector saves, imports and exports validated settings. Source export includes the implementation, documentation, original art, license, standalone example and chosen preset. Neither opt-in nor a visitor’s recording/score is silently added to the source ZIP.

## Compatibility / references

Modern desktop and mobile browsers with ES modules, SVG and Web Audio. Browser/OS policies can require renewed audio activation. HRTF and codecs vary; verify headphones and recording formats on your target devices. Without Web Audio, the drawing and score export work. Without JavaScript, the Lab shows the static engraving. Runtime code makes no network requests.

Primary API references: [Web Audio specification](https://webaudio.github.io/web-audio-api/) (AudioContext, AudioListener, PannerNode, destination and node lifecycle); [MediaStream Recording specification](https://www.w3.org/TR/mediastream-recording/) (codec support checks, data events and recorder lifecycle). Consult these for browser implementation requirements.

Run `pnpm test:spatial-sound` in the source repository for mechanical and Chromium/WebKit integration checks, including rendered audio, opt-in, positional movement, controls, recording, export and disposal.
