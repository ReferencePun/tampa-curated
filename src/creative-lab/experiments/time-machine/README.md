# Time as a Physical Dimension

The independent `/lab/time-machine/` study gives a location a reversible time coordinate. One registered street moves through three conceptual states. Walls, roofs, window frames, chimney, canopy and trees transform in place; the fixed camera never follows time. The same scene is sampled twice for era comparison. No full-screen image crossfade or recorded sequence drives the architecture.

## What the demonstration claims

The Meridian block is **fictional**. Workshop, Exchange and Common ground are relative eras at 0, 50 and 100, not calendar dates. All building arrangements are invented. The optional bay block is **Tampa-inspired fiction**, not a historical reconstruction. Every scene carries an always-visible notice.

Photo mode maps an undated Ikuna / Unsplash façade photograph onto an invented building as an artistic surface reference. Its use does not imply that the photo documents an era or this street. The three map layers are original fictional surveys with identical registration. No actual historic maps or building chronology are supplied. `assets/PHOTO-CREDITS.md` keeps photo licensing and provenance explicit. Real historical photographs and surveys can be registered later; they must retain their sources and reconstruction notices.

## Use the instrument

Drag the illustrated dial, scrub the time slider, select an era, or use Home/End and arrow keys on the dial. Automatic playback bounces at the timeline ends; Direction reverses it immediately. Hold this moment stops at the actual intermediate state. Reduced motion disables automatic playback and applies manual changes immediately.

Orbit view permits pointer/touch dragging and arrow keys on the scene. It does not advance time. Lock viewpoint returns to the exact registered camera. Compare eras places a reference moment beside the live timeline (stacked on narrow screens); both views have the same camera transform and projection. The reference selector or inspector can choose another era or an intermediate time. Click a spatial label to read its provenance-tagged note.

Blueprint shows expressive ink, pencil hatching and selective colored strokes. Photo & survey layers adds the registered photographic surface and plan layers while retaining the 3D linework. Changing architectural detail rebuilds the linework once after a debounce; ordinary time/material changes reuse existing geometry. At rest, hidden, paused or offscreen, the renderer stops requesting frames.

## Portable package

Extract the source ZIP, serve its folder over HTTP and open `example.html`. No build or package install is needed: the exact Three.js browser runtime, import map and license are included. The exported preset retains the location, time, comparison, appearance and playback controls. There are no imports from the Tampa homepage, Stories or other experiments.

```js
import {mount} from './creative-lab/experiments/time-machine/index.js';
import {createLocation, DEFAULTS} from './creative-lab/experiments/time-machine/locations.js';
const location = createLocation('meridian');
// Edit this definition, keeping its local coordinate system and provenance.
const effect = mount(document.querySelector('#time-study'), DEFAULTS, console.log, location);
effect.setRunning(true);
// The embedding site owns visibility and user pause state.
effect.setRunning(false);
effect.dispose(); // observers, timers, listeners, geometry, media and renderer
```

Give the host a positioned explicit height (about 950px desktop / 1100px mobile); `style.css` contains the default standalone host. The fourth mount argument is an optional custom location. The complete instrument exposes `update(settings)`, `setRunning`, `replay`, `getTime`, `getViewer` and idempotent `dispose`. Completed changes emit a bubbling `lab:settings` event with the complete current settings.

## Lower-level integration

```js
import {createTimeScene, cameraFor} from './scene.js';
import {sampleKeys, validateLocation} from './timeline.js';
const rig = createTimeScene(validateLocation(myLocation), {
  textures: new Map(), detail: 2, transparency: .5, view: 'blueprint', guides: true
});
scene.add(rig.root); // your own Three.js scene and renderer
const camera = cameraFor(myLocation, width / height);
rig.setTime(37.5); // exact, deterministic; 37.5 means the same pose in either direction
rig.setAppearance({transparency: .7});
rig.setTime(0);
rig.dispose(); // caller owns any supplied textures
```

`createTimeViewer(canvas, location, settings, callbacks)` in `viewer.js` supplies a renderer, media loading, registered camera and two-view rendering. Await `viewer.ready` before inspecting photo layers. It exposes `resize(cssWidth, cssHeight)`, `render(time)`, `update(settings)`, `setLocation(definition)`, `orbit(deltaAzimuth, deltaPolar)`, `resetCamera`, `rig` and `dispose`. `onReady()` signals loaded media; `onError(message)` reports missing media while retaining geometry. The viewport uses one renderer, pixel ratio capped at 1.5, and one set of resources. Textures and stale asynchronous loads are released on location changes or disposal. The instrument handles context loss/restoration and supplies the static fallback.

## Location schema (version 1)

The sample definitions in `locations.js` are directly reusable, serializable data except for asset URL resolution. Use arbitrary **local scene units**, Y up, X across the street, Z along it. Map geographic coordinates into this frame before supplying assets. The camera's position and target are independent of era; media must be rectified or assigned a known pose in this same frame. Time values are normalized 0–100. Actual dates belong in sourced era labels and notes, not in assumed sample chronology.

```js
{
  version: 1, id: 'my-location', name: 'My location',
  description: 'A registered spatial study',
  disclaimer: 'FICTIONAL DEMONSTRATION',
  provenance: {kind:'fictional', note:'An invented sample', sources:[]},
  camera: {position:[38,30,48], target:[0,4,-9], span:64},
  ground: {size:[52,66], streetWidth:8},
  eras: [
    {id:'a',at:0,label:'First state',kind:'fictional',note:'Imagined',sources:[]},
    {id:'b',at:100,label:'Second state',kind:'fictional',note:'Imagined',sources:[]}
  ],
  objects: [{
    id:'hall', kind:'building', position:[-12,0,3],
    keys:[
      {at:0,width:12,depth:11,height:6,roof:3,presence:1},
      {at:100,width:12,depth:11,height:14,roof:.5,presence:1}
    ]
  }],
  media: [], layers: [], annotations: []
}
```

- **Eras:** 2–12, strictly increasing `at`. Every era has an id, label, `kind`, `note`, and sources. `kind` is `fictional`, `reconstruction` or `documented`. Documented records require HTTP(S) source URLs. Reconstruction notes should explain uncertainty and link evidence. Validation enforces labels/source presence, not the truth of external claims.
- **Objects:** 1–80 with unique id, kind, fixed position and ordered `keys`. Kinds are `building`, `column`, `tree`, `canopy`, and `mesh`. Trees accept `variant:'palm'` or `'branch'`. Coordinates and topology remain registered across time.
- **Keyframes:** `at`, `width`, `depth`, `height`, `roof`, `presence`, `opacity`, `rotation` (Y radians), `offset:[x,y,z]`, `tint:[r,g,b]` (0–1), `media` (registered media id or null). Numeric values use smoothstep interpolation. Defaults are width/depth 8, height 6, roof 1.5, presence/opacity 1, rotation 0, offset zero and a warm gray tint. Specify repeated dimensions explicitly at every key; omitted properties use defaults, not the previous key. Before/after a track's range, its first/last state holds. Vanishing objects should reduce height or dimensions as well as presence; the demonstrations genuinely collapse/assemble geometry.
- **Custom geometry:** `kind:'mesh'` takes `geometry:{positions:[...]}` as non-indexed triangle XYZ coordinates in a local unit frame (Y typically 0–1), scaled by the same dimension keyframes. Optional `geometry.frames:[{at,positions:[...]}]` provides true vertex morphs. All frames must preserve vertex count and topology. Buffers are updated in place; no frame swaps or geometry reallocations occur. Limit: 54,000 coordinate values per custom object. Factory windows use nine potential floors; custom geometry supports other forms.
- **Media:** `{id,kind,url,credit,license,provenance}`. The provenance object has `kind`, `note`, `sources`. URLs must be same-origin or allow cross-origin texture use. Bundled URLs resolve with `new URL('./assets/name', import.meta.url)`. The instrument does not upload or rectify images. A building's `media` key maps a photograph into its normalized front wall frame, so it follows that wall's size/position through time. Different media IDs blend only within that local surface.
- **Map/image layers:** `{id,media,position:[x,y,z],rotation:[rx,ry,rz],size:[width,height],keys:[{at,opacity}]}`. Euler rotation uses XYZ radians. A ground plan normally rotates `[-Math.PI/2,0,0]`. The transform stays fixed as temporal opacity changes; multiple real rectified era images can share that transform. This local compositing supplements actual architectural morphs.
- **Annotations:** `{id,object,range:[start,end],label,text,provenance}`. The anchor follows the named object's roof in local world space and is projected through the same camera. Its visibility is limited to the stated time range. The UI writes external text with `textContent`.

## Settings

| Setting | Values / default |
| --- | --- |
| location | meridian or bay / meridian |
| progress | 0–100 / 0 |
| speed | .25–2.5 / 1; easing and playback rate multiplier |
| autoplay | boolean / false |
| direction | forward or reverse / forward |
| camera | fixed or orbit / fixed |
| view | blueprint or photo / blueprint |
| transparency | 0–.9 / .48 |
| detail | integer 1–3 / 2 |
| compare | boolean / false |
| compareAt | reference time 0–100 / 0 |
| guides | boolean / true |
| annotations | boolean / true |

Pass a retained complete settings object when updating a single field; `options` merges omitted fields with defaults. Manual time input stops autoplay. A user pause holds the actual intermediate position, which is persisted. The temporary orbit angle is not stored in presets; selecting fixed mode recovers the original registered camera.

## Files and licenses

`timeline.js` owns pure sampling, validation, dial mapping and playback. `locations.js` owns fictional demonstration data and defaults. `scene.js` owns procedural geometry and spatial registration. `viewer.js` owns media, camera, comparison and renderer lifetime. `index.js` / `styles.js` own the instrument. All original code and surveys are MIT; the photograph is Unsplash, and Three.js retains its upstream MIT license. The full source ZIP includes individual credits.

## Verification

`pnpm test:time-machine` checks chronological and reverse sampling, real intermediate geometry, custom vertex morphs, unchanged resource identities, camera stability, photo/map registration and disposal. Browser checks cover the dial, slider, autoplay/reversal, orbit, comparison, photo layers, presets, source export, a separately hosted standalone package, reduced motion, touch, fallback, context recovery and lifecycle.
