# Slinky Staircase

A continuous helical wire walks down eight engraved treads. A reversible movement study, isolated from the Tampa homepage and other experiments. Original code and illustration: MIT. Three.js 0.186.1: MIT.

## Open the export

Serve the ZIP directory with `python3 -m http.server 8080`, then open `http://localhost:8080/example.html`. The exact Three.js runtime and import map are bundled. No installation, CDN, API, account or external imagery is required. Open `creative-lab/experiments/slinky-stairs/scroll-demo.html` for a native document-scroll integration.

The complete instrument supports four study presets, timeline scrubbing, scroll/trackpad, touch dragging, keyboard arrows/Home/End/Space, PNG export and deliberate autoplay. Shift-scroll releases the page; outward scrolling at either end also releases it. The shared Lab inspector saves, imports and exports settings and source ZIPs. Local preset settings include the current pose. PNG captures the rendered drawing, without UI labels.

## Portable engine

```js
import {createSlinkyStairs} from './engine.js';
const effect = createSlinkyStairs({
  settings: {coils:48, diameter:1.9, camera:'tracking'},
  width:900, height:650,
  onFrame: state => console.log(state.progress, state.label)
});
container.append(effect.canvas);
effect.setProgress(0.0625); // half of the first descent: normalized 0–1
// Bind this to your timeline or native scroll position.
effect.resize(container.clientWidth, 650);
effect.update({...effect.settings, style:'engraving'});
// Later: remove listeners, then release all geometry, materials and textures.
effect.dispose();
```

`settings` merges with defaults. `update` accepts the same settings schema and current percentage `progress`. `setProgress` accepts normalized 0–1 and clamps finite input. `getState` returns progress, descent/phase, rendering counts and timings. `getPoints` copies the actual wire center points for inspection. `getStairs` returns a copy. `exportPNG` returns a Promise of a Blob. `dispose` is idempotent and releases the WebGL context. The engine has no animation loop, scroll listener, clock, UI framework or dependency on Tampa. The `mount(host, settings, report)` adapter in index.js provides the full Lab instrument.

## Stair geometry

Pass an optional `stairs` object:

```js
const stairs = {version:1,treads:[
  {x:0, y:0, depth:3.1, width:3.8},
  {x:3.1, y:-0.72, depth:3.1, width:3.8},
  {x:6.2, y:-1.44, depth:3.1, width:3.8}
]};
const effect = createSlinkyStairs({stairs, settings:{diameter:1.9}});
```

Y is up; travel is +X; Z is transverse. X/Y identify the center of the tread's top surface. Each tread spans x ± depth/2, z ± width/2. Define 2–20 adjacent, strictly descending rectangular treads. Depth 2.4–6, width 2.6–8, drop at most 1.6; coordinates within ±100. All treads must touch edge-to-edge. Custom geometry is independent of the inspector's generated step count/depth/rise/width. Use uniform treads for the most natural rhythm. Turns, spiral stairs and ascending treads are outside this component's model.

## How the spring walks

`model.js` contains the deterministic pose function, independent of Three.js. The axis has a vertical stem, a constant-radius arch, and a terminal straight section. One end remains anchored on the upper tread as the other tips, extends and falls; after landing the lower end anchors and the trailing end follows. Material direction alternates each descent. Quintic phase easing has zero endpoint velocity. A recovery compression is evaluated analytically. No accumulated integration state is used.

The helix is sampled around this deforming axis in material coordinates. Curvature-aware spacing reserves enough room for the inside turns, rather than letting a tight bend cut through itself. A conservative contact limit keeps the wire above the treads. `geometry.js` updates one preallocated eight-sided tube mesh, with normals and a continuous winding. `staircase.js` draws actual tread and riser geometry, edge linework, hatching, engraved numbering and construction lines. Contact pools are analytic shading, not a physics solver or expensive per-turn shadow maps.

This is an authored, physically informed motion, not a calibrated elastic-body simulation. Wire length is allowed to change; the settings do not encode real elastic constants, mass, friction, stress or conservation of energy. Larger stiffness delays landing, compression alters stacked height/recovery, and stretch increases the arch's stem extension. The inspiration is the alternating end contact of a loose spring, discussed in [On Slinky: the dynamics of a loose, heavy spring](https://www3.eng.cam.ac.uk/~hemh1/TV/On_Slinky_the_dynamics_of_a_loose_heavy_spring.pdf). No figures or trajectories were copied.

## Settings

- `coils` 28–72: turns; `thickness` .010–.028: wire diameter; `diameter` 1.25–2.3: spring outer diameter.
- `stiffness` .5–1.6: landing timing; `compression` .35–.95: resting pitch/recovery; `stretch` .7–1.45: extension.
- `steps` 6–10 descents; `tread` 2.8–4; `rise` .4–1.15; `width` 3–5.5.
- `speed` .35–2 scales UI scroll and autoplay; `slowMotion` .15–1 scales autoplay only. Neither changes the shape at a given progress.
- `style`: pencil, engraving, ivory, stone. `guides`: construction lines.
- `camera`: tracking or fixed; `angle` 18–65 elevation; `azimuth` −30–65 degrees.
- `progress` 0–100 percent in the inspector, normalized 0–1 in `setProgress`.

The fixed camera fits the complete flight and remains stationary for all progress values. The following camera tracks a deterministic path with no wobble or time-dependent damping. Changing dimensions or aspect ratio refits the frame. `PRESETS` in model.js supplies the four complete recipes.

## Lifecycle, access and performance

WebGL2 is required for interactive rendering. Pointer Events and ES modules are required by the UI. A static plate remains available without WebGL; no JavaScript retains the Lab's still image. All controls are keyboard accessible. Nothing autoplays on load. Reduced-motion visitors can use direct scrubbing; the Lab's host pauses animation by default. Offscreen/hidden playback suspends with no elapsed-time catch-up.

Only topology/material changes rebuild resources. Scrubbing updates fixed GPU buffers; resizing changes the projection and drawing buffer. Maximum topology is 2,304 wire segments × 8 sides; no per-coil DOM nodes. Device pixel ratio is capped at two. There are no real-time shadows. Rendering happens only when the state or dimensions change, or when playback is explicitly running. Call dispose on removal, and remove your integration's listeners and observers. On context loss, the demo shows its static plate and invites a reload.

Tests are in `scripts/slinky-stairs-model-test.mjs` and `scripts/slinky-stairs-browser-test.mjs`: trajectory determinism, transition continuity, stair clearance, presets, reverse/fast scrub, camera stability, input, standalone export and cleanup. Playwright WebKit tests the Safari engine; a particular device's thermal performance or trackpad characteristics are not guaranteed by that test.
