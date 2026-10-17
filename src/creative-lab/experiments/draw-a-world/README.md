# Draw a World

A working, portable drawing-to-architecture instrument. Every input path creates its own 3D linework, translucent surfaces and camera route. MIT original source and SVG; Three.js 0.186.1 has its own MIT license in the export.

## Try it

Draw one generous open line, or choose an example. Architecture grows from the stroke. Choose **Enter drawing**, then scroll over the drawing to travel. Scroll backward to retrace the route; at the start you return to paper. **Return to paper** also works at any point. Touch users drag vertically. Arrow keys, Home/End, and the Travel slider provide keyboard alternatives. **Edit points** exposes draggable spline controls; focus a point and use arrow keys to adjust it. **Freehand** replaces the route on the next completed stroke. **Erase** clears it.

The open corridor, vaulted passage and rising staircase share the drawn route but have distinct structural geometry. A spiral with Rising staircase becomes a helical passage. Example selection picks a suitable style; the inspector can change it afterward.

## Constraints

One open path, 2–96 normalized [x,y] points, no closed loops, intersections, overlapping hairpins or very tight corners. Plan length is limited to five times the sheet depth to keep intricate paths bounded. Coordinates must be finite and within 0–1. World X spans `depth`, world Z spans `depth * .65`; a staircase rises 9.5% of planar path length. Narrow the corridor, increase smoothing, or separate bends when validation fails. Invalid drawings stay editable with an explanation; a previous valid corridor is never shown in their place. The constraints are geometric, not a physics or collision system. Perspective depth scales the plan, not the camera's field of view. Structure height is 6.2 units; eye height is 2.55 units.

## Standalone

Extract the ZIP, serve its directory over HTTP (for example `python3 -m http.server 8080`), and open `example.html`. No install or network CDN is needed. Its import map resolves the included Three.js runtime in `vendor/three/`. It reads `preset.json`, including the drawn path. For a bundler install `three@0.186.1` instead. Keep the effect's files together.

## Mount the complete instrument

```js
import {mount} from './creative-lab/experiments/draw-a-world/index.js';
import {DEFAULTS} from './creative-lab/experiments/draw-a-world/path.js';
const effect = mount(document.querySelector('#instrument'), {
  ...DEFAULTS,
  path: [[.12,.72], [.36,.56], [.62,.39], [.88,.22]],
  style: 'vault'
});
effect.setRunning(true);
// The host needs a definite height, e.g. 700px, and a width.
effect.setPath([[.1,.7], [.4,.35], [.8,.25]]);
const exportedPath = effect.getPath();
// Update takes a complete settings object. Replay returns to the overview.
// Use visibility/IntersectionObserver in your application to control setRunning.
// Before unmounting:
effect.dispose();
```

`mount` returns `update(settings)`, `setRunning(boolean)`, `replay()`, `dispose()`, `setPath(points)` and `getPath()`. The optional third argument receives renderer diagnostics. Completed path changes emit a bubbling `lab:settings` CustomEvent with a complete settings object. The Lab validates and stores this in the same preset pipeline as its inspector. A standalone host can listen to this event to persist state. No Lab services are required by the effect.

## Generate geometry without the UI

```js
import {generateEnvironment, cameraPose} from './geometry.js';
const environment = generateEnvironment(
  [[.12,.72], [.36,.56], [.62,.39], [.88,.22]],
  {style:'vault', width:5, depth:120, density:38, smoothing:.65}
);
scene.add(environment.group);
const pose = cameraPose(environment, .4); // 0–1 along this path, either direction
camera.position.copy(pose.position);
camera.up.copy(pose.up);
camera.lookAt(pose.target);
// Rebuild explicitly when your path changes, then release the old GPU resources.
scene.remove(environment.group);
environment.dispose();
```

`geometry.js` has no DOM, renderer, or animation loop. Its result contains `group`, `curve` (arc-length sampled CatmullRomCurve3), `length`, `bounds`, `center`, `size`, `points`, `rise`, `signature`, `primitives`, and an idempotent `dispose()`. Camera orientation uses an upright world axis and a short look-ahead along the same spline; it does not roll or bank. `path.js` exports validation, freehand simplification, smoothing, example paths, frame sampling, JSON helpers, and defaults.

## Path JSON and presets

Path JSON is independent of visual settings:

```json
{"schemaVersion":1,"type":"impossible-lab-path","coordinateSystem":"normalized-paper","points":[[0.12,0.72],[0.36,0.56],[0.62,0.39],[0.88,0.22]]}
```

The Lab's version-1 preset contains all scalar controls plus `settings.path`. Preset import/export, device storage and source ZIP with current settings preserve the actual drawing. An empty path is valid and opens blank paper. Malformed or oversized JSON is refused. `config.json` and the manifest describe matching defaults. Future schema changes should be versioned.

## Performance, accessibility and lifecycle

Pointer movement only updates a lightweight SVG preview; geometry rebuilds on release. Inspector changes debounce by 140ms. Line segments are batched into four materials and one translucent mesh. Adaptive tessellation is capped at 600 segments, 220 structural ribs and 320 treads. GPU pixel ratio is capped at 1.75. The curve and camera sample arc length, avoiding inconsistent speeds from uneven pointer sampling. Rendering sleeps when the reveal/travel interpolation settles, offscreen, hidden, or paused. Reduced motion applies user-driven travel immediately without a dive animation. Wheel input is consumed only over active architecture, and released at its endpoints; page scrolling elsewhere stays native.

ResizeObserver, pointer capture, events, animation frames, timers, geometry, materials and the renderer are released by `dispose()`. WebGL context loss preserves the editable path and rebuilds on restoration. If WebGL2 is unavailable, drawing/editing/path export remain available. Without JavaScript the static architectural plate and downloadable source remain. This substantial effect is intentionally excluded from simultaneous lightweight comparison.
