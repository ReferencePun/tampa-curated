# Slow Gel Toy

A glossy, softly translucent gel stress toy. Squeeze, stretch and release a ball or rounded cube with a slow impression recovery.

An original gel object with a continuously deformed surface, recomputed normals, softly transmitted color and procedural studio reflections. A local pressure field creates a dent and a small surrounding bulge. Up to six independent grips retain their positions after release; each holds for 35% of the recovery setting, then exponentially eases back with a time constant of 70% of that setting. Motion speed scales this time. The foam ball keeps its separate elastic model. The skin and highlights respond to the same geometry. This is a controlled toy approximation, not a medical or engineering material model.

## Run and embed

Extract the source ZIP, serve it with `python3 -m http.server 8080`, and open `example.html`. The exact Three.js ESM runtime and its MIT license are bundled locally. No CDN, account, photograph or recording is required.

```js
import {createGelToy} from './engine.js';
const effect = createGelToy(document.querySelector('canvas'), {...settings}, {
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

- `mode`: Hand action. Default: `squeeze`.
- `form`: Toy shape. Default: `ball`.
- `palette`: Gel color. Default: `rose`.
- `translucency`: Light through gel. Default: `0.55`.
- `matte`: Surface softness. Default: `0.3`.
- `radius`: Hand radius. Default: `0.16`.
- `strength`: Touch strength. Default: `1`.
- `softness`: Material softness. Default: `1`.
- `memory`: Impression recovery, 1–30 seconds. Default: `8`. Larger values keep marks for longer; this controls retained shape rather than spring damping.
- `speed`: Motion speed. Default: `0.65`.
- `zoom`: Magnification. Default: `1`.
- `autoplay`: Automatic slow squeeze. Default: `False`.

Presets live in model.js. The Lab inspector saves/imports/exports validated JSON configurations. PNG captures current geometry. Presets save settings, not an evolving simulation snapshot. Start fresh resets material state. Source export includes every shader and helper.

## Interaction and lifecycle

Native pointer capture supports touch dragging and release outside the canvas. Arrow keys move a virtual hand; Space presses, key release lets go; Escape releases. Reduced motion starts paused and direct input applies a still state. Releasing while paused retains the impression; Resume eases it out and Start fresh removes all dents. Explicit Resume is available. Visibility and intersection changes halt animation; the host can also call setRunning(false). Dispose aborts input listeners, disconnects observers, cancels animation and timers, revokes download URLs and releases all GPU textures, geometry, materials and the context.

This is an artistic, bounded material model, not a physical measurement. Render quality is capped at 1.75 device pixels per CSS pixel; each study owns one graphics context. Compare mode is disabled. Without WebGL2 the static study plate and documentation remain usable.

## License and references

Original code, procedural patterns, geometry and generated still: MIT. Three.js: MIT, included in vendor/three/LICENSE. User-supplied screenshots and recordings are visual references only and are not distributed. No branded character, logo or product shell is reproduced.
