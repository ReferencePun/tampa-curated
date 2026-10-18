# The Handwritten Manuscript

A separately addressable handwritten edition of The Impossible Manuscript. It preserves the same architectural composition, impossible stairs, registered portals and reversible journey, with an independent implementation and scoped styles. The original experiment is unchanged.

Black ink, blue ballpoint and red corrections share warm ivory paper. A bundled handwriting font is varied in angle, size, baseline, pressure and retracing. Scratches break up its ink deposits. Underlines, cross-outs, circles, margin arrows and pencil contours live in the actual three-dimensional room coordinates, so they fold, rotate and travel with the architecture. The opening and stairwell share the same geometry: depth expands as the camera enters. A quaternion turn makes a sideways staircase become the way forward. Three bidirectional, rendered letter portals connect the stairwell, cathedral and library. The library returns to the stairwell from another orientation.

This is a finite, authored spatial illusion. It does not simulate literal four-dimensional space. Paragraphs are individually positioned, batched glyphs with empty space between their marks; treads, columns' letter bands, monuments and door counters use real extruded outlines. There are no photographic wall textures or prerecorded sequences.

## Run the export

Unzip, run `python3 -m http.server 8080` in the exported directory, and open `http://localhost:8080/example.html`. No installation or build is needed for that example. It includes the exact Three.js browser runtime and an import map. For a bundled application, install `three@0.186.1`, import the modules below, and copy their local assets together. Serve over HTTP; module imports and font fetching do not work reliably under `file://`.

## Use the complete instrument

```js
import {mount} from './creative-lab/experiments/handwritten-manuscript/index.js';
import {DEMO, DEFAULTS} from './creative-lab/experiments/handwritten-manuscript/content.js';

const host = document.querySelector('#manuscript'); // give it a height, e.g. 1160px
const effect = mount(host, {...DEFAULTS, customText: 'A room between two words.'},
  stats => console.log(stats), {scene: DEMO});
effect.setRunning(true);
// Full settings object; changes that rebuild geometry are debounced by 180ms.
effect.update({...DEFAULTS, density: 1.2});
effect.replay();
const document = effect.serialize(); // {version:1, scene, settings}
// Call when hidden/offscreen; manual slider and chapter selections remain usable.
effect.setRunning(false);
// Before removing the host:
effect.dispose();
```

The UI dispatches a bubbling `lab:settings` event containing its current settings. It does not save browser history, track visitors, request pointer lock, or make external requests. Local preset storage belongs to the surrounding Lab host. Custom writing is included in deliberately exported presets/source ZIPs and scene JSON. Scene JSON imports are capped at 200 KB and validated. Titles and text are never interpreted as HTML.

The four chapter buttons, slider, forward/back arrows and recipes work without continuous animation. Guided travel accepts wheel, arrow keys and a vertical touch drag. Shift-scroll releases webpage scrolling; the journey also releases it at either end. Free mode uses drag-to-look, WASD and directional buttons. Escape or **Exit drawing** releases input, and **Return to paper** restores the opening. No pointer lock or endless scroll trap.

## Use just the renderer

```js
import {createViewer} from './creative-lab/experiments/handwritten-manuscript/viewer.js';
import {DEMO, DEFAULTS} from './creative-lab/experiments/handwritten-manuscript/content.js';

const abort = new AbortController();
const viewer = await createViewer(canvas, DEFAULTS, DEMO, {signal: abort.signal});
viewer.resize(900, 650);                // CSS pixel dimensions
viewer.render(0.47);                   // progress 0–1; renders one frame only
viewer.enterFree(0.58);                // select a declared pedestrian gallery
viewer.look(20, -5);                   // pointer deltas, pixels
viewer.move(1, 0, 1 / 60);             // forward, right, elapsed seconds
viewer.render(0.58);
viewer.leaveFree();
viewer.configure({...DEFAULTS, contrast: 1}); // complete settings object
viewer.loadScene(otherDefinition);     // validated scene; rebuilds, returns to guided mode
console.log(viewer.getState());         // pose, room, geometry/render counts, resources
viewer.dispose();                     // idempotent; later render returns null
```

`navigation.js` is pure Three.js math and requires no DOM. It exposes `validateScene`, `sampleRoute`, `poseQuaternion`, `frameMatrix`, `portalTransform`, `crossedPortal`, `constrainWalk`, `chaptersFor`, `options`, `smooth` and `clamp`. `architecture.js` builds scene geometry independently of input, content and UI. `typography.js` owns glyph layout and the atlas; `portals.js` owns the offscreen views. `content.js` is replaceable demonstration data.

## Scene schema, version 1

Coordinates are right-handed XYZ. Y is up in the main frame; the camera looks toward negative Z. Positions and lengths use arbitrary architectural units. Rotations are XYZ Euler radians; route `roll` is degrees about the camera's local Z. Geometry and portal coordinates must share one scale.

```js
const scene = {
  version: 1, title: 'Another manuscript',
  texts: {essay: 'Original writing supplied by your project.'},
  rooms: [{
    id: 'hall', title: 'The Hall', flatOpening: true,
    structures: [
      {kind:'bridge', position:[-4,0,12], width:8, height:25, text:'essay'},
      {kind:'wall', position:[-4,0,0], rotation:[0,Math.PI/2,0],
        width:20, height:8, text:'essay'},
      {kind:'stairs', position:[0,0,5], steps:10, rise:.25, run:.6,
        width:3, text:'essay'},
      {kind:'column', position:[3,0,0], radius:.5, height:8, text:'essay'}
    ]
  }],
  portals: [],
  navigation: [{id:'main', room:'hall', position:[0,0,0], rotation:[0,0,0],
    bounds:[-3,3,-10,12], floor:0}],
  chapters: [{name:'The Hall', start:0, at:0, note:'Enter between the words.'}],
  route: [
    {p:0,room:'hall',position:[0,6,53],target:[0,6,0],roll:0},
    {p:1,room:'hall',position:[0,1.7,-4],target:[0,1.7,-10],roll:0}
  ]
};
```

For a scene with no opening flattening, omit `flatOpening`. The built-in camera still begins with an editorial framing lens and blends to the chosen field of view over the first 20% of travel; author the first route position accordingly. Chapter labels are supplied by the scene or derived from its rooms. `start` controls when a label begins; `at` is its jump position. Four demonstration chapters occupy three render cells because the first two continuously share geometry.

Each structure accepts `position`, optional `rotation`, and a `text` source key (or literal text). Supported kinds:

| Kind | Required dimensions | Construction |
| --- | --- | --- |
| `paragraph`, `wall` | `width`, `height` | Batched, individually placed handwritten glyphs; walls retain a slightly heavier writing rhythm |
| `bridge` | `width`, `height` | Horizontal sentence plane and a lighter typographic shadow beneath |
| `stairs` | `steps`, `rise`, `run`, `width` | Extruded READ / RISE / STEP / AGAIN treads, paragraph risers, numbered marks |
| `column`, `shaft` | `radius`, `height` | Cylindrical glyph courses and repeated extruded O bands; shaft descends |
| `monument` | `size`, `letter` | Extruded Latin letter or word, 1–12 characters |
| `ring` | `radius` | Circular sentence with additional rows controlled by complexity |
| `anamorph` | `width`, literal `text` | Separated-depth letters aligning from `eye` (default stair-landing viewpoint) |
| `dissolve` | `width`, `height` | Paragraph disperses then assembles at another transform as the camera approaches |

A `dissolve` structure can supply `assembledPosition`, `assembledRotation`, and `trigger:{axis:'z',start:4,end:-4}`. Progress derives from camera position in that room and reverses exactly. Defaults lower the paragraph by 2.7 units and turn it into a horizontal bridge. `repeatGallery:true` adds bounded repeated text bays beyond a room's far end; use the demo's library-sized local frame if enabling this optional composition helper.

`anamorph` uses a reference line 7 units behind and 0.6 units above its local origin. Its default eye is 1.3 units to the right of that origin; an optional world-space `eye` can match another landing. Letter positions follow rays from that viewpoint at deliberately different depths, so they align only when viewed from the intended place. Large extrusions use a Latin subset of the actual Caveat handwriting outlines. The O-shaped portal retains the original geometric aperture to keep the room views precisely registered; its surfaces are pencil-hatched and its contours retraced. Latin and Cyrillic paragraph text uses the bundled Caveat atlas. Unsupported extruded scripts are rejected rather than presented as full coverage.

### Portal pairs

```js
{
  id:'door', from:'hall', to:'chamber',
  fromZone:'main', toZone:'main',
  position:[0,4,-14], rotation:[0,0,Math.PI/2],
  destination:[0,4,12], destinationRotation:[0,0,0],
  width:4.2, height:6.1, letter:'O'
}
```

The transform is `destinationFrame × inverse(sourceFrame)`. Both endpoints use matching local picture-plane coordinates; negative local Z crosses into the destination. Reverse crossing uses its inverse. Each counter displays a real perspective view rendered with a transformed camera and destination clipping plane. Projective screen coordinates keep that view registered to the main camera. The counter is an elliptical aperture, framed by a real O extrusion. The default aperture dimensions are authored for the supplied size-8.7 O; arbitrary letters or dimensions need corresponding aperture work.

When the guided route changes rooms, place **two keys at exactly the same `p`**: one on the outgoing plane and one at the mapped destination position. Their orientations should also match under the portal transform. Validation checks positions, ordered progress, matching portal connections and finite transforms. The demonstration's camera orientation alignment is additionally verified by tests. Room changes without a portal are rejected. Interpolation is smoothstep translation plus quaternion slerp; every state is directly sampleable in either direction.

Free exploration is intentionally bounded to selected galleries, not a whole-scene physics solver. `navigation` defines a local frame, `[minX,maxX,minZ,maxZ]` rectangle, and `floor`. The eye stays 1.7 units above the support plane. Optional `ramp:{startZ,slope,maximum,width}` supplies the staircase support height. A route key's `zone` chooses the gallery; its default is `main`. Portal `fromZone`/`toZone` connect them. Declare bounds extending slightly across each portal plane so crossing is possible. Avoid overlapping free galleries without an explicit portal connection. The cinematic wall-to-floor turn remains on the guided route.

Scene limits: 1–8 rooms, at most 160 structures, 12 portal pairs, 32 pedestrian galleries, 128 route keys, 32 text sources with 12,000 characters each, and 12 chapter labels. Architectural dimensions are positive and at most 80 units. Keep authored space within the camera's far plane rather than relying solely on schema bounds.

## Controls and presets

| Setting | Range / behavior |
| --- | --- |
| `density` | 0.6–1.4; actual glyph layout density, subject to a room budget |
| `font` | mixed, ink, ballpoint, graphite; different writing-instrument distributions |
| `weight` | 400–700; Caveat variable-font pen pressure |
| `letterSize` | 0.75–1.25; handwritten glyph scale |
| `scale` | 0.7–1.4; architectural scale relative to a constant eye height |
| `complexity` | 1–3; ring courses and repeated library bays |
| `speed` | 0.4–2; wheel/touch and free travel speed |
| `gravity` | 0–180° in 30° steps; additional camera roll, separate from guided orientation |
| `perspective` | 35–75°; field of view after the opening |
| `contrast` | 0.35–1; handwritten ink contrast |
| `extrusion` | 0.08–0.8; actual solid-letter depth |
| `depth` | 0.6–1.6; atmospheric legibility distance, not a change to portal coordinates |
| `recursion` | 1–2; bounded portal levels and target resolution |
| `mode` | guided / free |
| `imperfection` | 0–0.7; deterministic registration and ink-density variation |
| `customText` | up to 1,200 characters; replaces paragraph and dissolving-wall content |

`RECIPES` defines The first draft, Ballpoint stairs, Ink cathedral, Pencil palimpsest and Notes upside down. Their internal keys remain literary, staircases, cathedral, infinite and inverted for scene integration. Named recipes also jump to their corresponding chapter in the demonstration. Lab presets store validated settings; scene JSON stores both architecture and settings. Scene import does not execute scripts or load arbitrary remote assets.

## Rendering, limits and accessibility

Dense writing uses one instanced glyph batch per room plus separate interaction/portal labels. A local Canvas atlas contains up to 256 unique characters in four pressure/retracing treatments, all drawn from the bundled Caveat font. Excess characters fall back to `?`; unsupported scripts follow browser fallback. A FontFace is acquired before the first atlas build, reference-counted across viewers and removed after the last viewer is disposed. Failure is surfaced rather than silently showing the ordinary typeset edition. No font service or CDN is contacted.

`hand.js` holds seeded variation, ink distributions and font acquisition. `marginalia.js` batches corrections and retraced contours into three line geometries per room. The custom pencil material uses object-space hatching and grain, so it stays attached to the lettering as the camera moves. The glyph shader carries a per-instance ink color. Explicit alpha coverage with paper/ink edge blending avoids WebKit speckling in single-sample portal targets. Every mark is deterministic: revisiting a pose restores the same page. Graphite-only presets suppress colored linework; mixed and ballpoint presets retain selected red corrections.

Each room budgets 85,000 static handwritten glyphs on desktop or 36,000 on mobile; individual structures receive fair quotas so later columns and details are not starved by an earlier wall. Paragraph type size increases when required to respect its quota. Dynamic paragraphs have a separate bounded batch. Desktop pixel ratio is capped at 1.6 and mobile at 1.2; sustained slow render submission lowers it toward 0.8. Portal targets cap their longest side at 1,024 or 1,280 pixels. There are never more than two nested portal levels or six offscreen renders per frame. The recursion is deliberately incomplete beyond that budget.

Nothing auto-plays. The renderer draws on demand, stops when the camera settles, and the host pauses it offscreen or in a hidden tab. Reduced motion uses direct changes rather than easing; visitors can inspect fixed poses through chapter and slider controls. Mobile uses smaller glyph budgets, touch drag and step buttons. Free mode never captures the whole pointer. Exit/reset and readable controls remain outside the 3D artwork.

WebGL2, ES modules, Canvas 2D and modern browser APIs are required. Verified in Chromium and Playwright WebKit on macOS; this is not a guarantee for every physical Safari/iOS GPU. If WebGL is unavailable, the page retains instructions, original writing controls and scene export with an honest fallback message. A lost context releases movement and shows a reload instruction. Disposal aborts pending font loads, cancels animation/timers, removes listeners/observers, revokes download URLs and releases instanced buffers, textures, materials, geometries, portal targets and renderer/context resources. Do not opt this heavy scene into simultaneous comparison.

## Licensing and reference

All demonstration prose, Russian sentences, scene composition and new code are original and MIT-licensed. No passages from novels and no pixels from the supplied reference image are included. The idea of conflicting gravity is inspired by M. C. Escher's *Relativity*; the scene is an original arrangement.

Caveat is by the [Caveat Project Authors / Pablo Impallari](https://github.com/googlefonts/caveat), downloaded from the [official Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/caveat). The original variable `Caveat.ttf` and the derived `caveat-outlines.json` retain SIL OFL 1.1 in `assets/CAVEAT-OFL.txt`. The subset conversion uses FontTools 4.60.1 at weight 540; `scripts/prepare-handwritten-font.py` in the source project reproduces it (authoring only; no Python required by the export).

The O aperture’s Helvetiker outlines are from [Three.js r186](https://github.com/mrdoob/three.js/blob/r186/examples/fonts/helvetiker_regular.typeface.json), credited to Magenta Ltd., 2004. Their redistribution terms are included in `assets/FONT-LICENSE.txt` and the font JSON. `vendor/FontLoader.js` is Three.js code under its included MIT license. The Caveat font is redistributed locally under its included license; no system handwriting font is required. The export includes the Three.js runtime and its license separately.

## Verification

Run `pnpm test:handwritten-manuscript` with the production preview running on port 4321. Model tests additionally verify distinct handwriting outlines, black/blue/red distributions and graphite-only behavior. Model tests cover reversible camera sampling, smooth orientation change, exact portal transforms and inverses, collision bounds, actual letter counters, text density, schema rejection and all preset values. Chromium/WebKit checks exercise the four chapters, free portal crossings and reverse travel, custom text/scene import, recipes, Lab presets/source ZIP, independent HTTP export, pixel-identical reverse rendering, engine reuse with renamed rooms, disposal, reduced motion and mobile layout. Browser tests also check that the local font is loaded, real 3D correction marks are present, the source ZIP contains both font licenses, and the rendered image reverses deterministically. Screenshots and diagnostic snapshots remain in ignored `test-results/handwritten-manuscript/`.
