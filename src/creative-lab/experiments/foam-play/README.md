# Foam Bead Play

A flowing foam-bead surface and a squeezable beaded ball. Tiny dimensional beads gather, fold and recover under your hand.

Thousands of shaded, depth-tested bead instances sit in a continuous material. The surface has a directional wake; the ball uses a bounded viscoelastic deformation with lateral bulging and spring recovery. This is a cohesive toy model, not a full bead-collision or fluid solver.

## Run and embed

Extract the source ZIP, serve it with `python3 -m http.server 8080`, and open `example.html`. The exact Three.js ESM runtime and its MIT license are bundled locally. No CDN, account, photograph or recording is required.

```js
import {createFoamPlay} from './engine.js';
const effect = createFoamPlay(document.querySelector('canvas'), {...settings}, {
  frame(state) { /* frame count, material activity, size and rendering budget */ }
});
effect.setRunning(true);
effect.point(.45, .5, true); // canvas coordinates; normalized, pressed
// Move the same grip or brush to a new position:
effect.point(.65, .4, true);
effect.release();
effect.update({...settings});
const canvas = effect.exportCanvas();
canvas.toBlob(blob => { /* save PNG */ });
effect.setRunning(false);
effect.dispose();
```

The full controls use `mount(host, settings, report)` from index.js. It returns update, setRunning, replay, getState and dispose. Keep the transitive shared/tactile helpers with the effect. The standalone example has no site dependencies.

## Settings

- `form`: Material form. Default: `field`.
- `palette`: Bead palette. Default: `tidal`.
- `density`: Bead count budget. Default: `20000`.
- `beadSize`: Bead diameter. Default: `1.04`.
- `current`: Surface tide. Default: `0.9`.
- `radius`: Hand radius. Default: `0.16`.
- `strength`: Touch strength. Default: `1`.
- `softness`: Material softness. Default: `1`.
- `memory`: Recovery time. Default: `2`.
- `speed`: Motion speed. Default: `0.65`.
- `zoom`: Magnification. Default: `1`.
- `autoplay`: Automatic squeeze (ball). Default: `False`.

Presets live in model.js. The Lab inspector saves/imports/exports validated JSON configurations. PNG captures current geometry. Presets save settings, not an evolving simulation snapshot. Start fresh resets material state. Source export includes every shader and helper.

## Interaction and lifecycle

Native pointer capture supports touch dragging and release outside the canvas. Arrow keys move a virtual hand; Space presses, key release lets go; Escape releases. Reduced motion starts paused and direct input applies a still state. Explicit Resume is available. Visibility and intersection changes halt animation; the host can also call setRunning(false). Dispose aborts input listeners, disconnects observers, cancels animation and timers, revokes download URLs and releases all GPU textures, geometry, materials and the context.

This is an artistic, bounded material model, not a physical measurement. Render quality is capped at 1.75 device pixels per CSS pixel; each study owns one graphics context. Compare mode is disabled. Without WebGL2 the static study plate and documentation remain usable.

## License and references

Original code, procedural patterns, geometry and generated still: MIT. Three.js: MIT, included in vendor/three/LICENSE. User-supplied screenshots and recordings are visual references only and are not distributed. No branded character, logo or product shell is reproduced.
