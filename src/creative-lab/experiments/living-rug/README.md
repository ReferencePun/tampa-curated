# The Living Rug

Brush a Persian-inspired woven pattern into flowing curls. Individual luminous fibers lean, carry light and slowly recover.

An original procedural medallion and floral border, woven from individually curved fibers. The reference recordings inform the flowing pile; no reference image or video is used as a texture. Directional brush memory bends the tips while their roots keep the ornament registered.

## Run and embed

Extract the source ZIP, serve it with `python3 -m http.server 8080`, and open `example.html`. The exact Three.js ESM runtime and its MIT license are bundled locally. No CDN, account, photograph or recording is required.

```js
import {createLivingRug} from './engine.js';
const effect = createLivingRug(document.querySelector('canvas'), {...settings}, {
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

- `mode`: Brush behavior. Default: `brush`.
- `palette`: Thread palette. Default: `lapis`.
- `glow`: Thread radiance, 0–2.5. Default: `1.25`. Controls strand emission and the soft surrounding halo. Zero gives a matte version.
- `shimmer`: Light flowing along fibers, 0–1.5. Default: `0.8`. Zero stops the traveling gleams.
- `density`: Individual fibers. Default: `80000`.
- `length`: Fiber length. Default: `1.45`.
- `current`: Unattended current. Default: `0.85`.
- `radius`: Hand radius. Default: `0.16`.
- `strength`: Touch strength. Default: `1`.
- `softness`: Material softness. Default: `1`.
- `memory`: Recovery time. Default: `2`.
- `speed`: Motion speed. Default: `0.65`.
- `zoom`: Magnification. Default: `1`.

Presets live in model.js. The Lab inspector saves/imports/exports validated JSON configurations. PNG captures current geometry. Presets save settings, not an evolving simulation snapshot. Start fresh resets material state. Source export includes every shader and helper.

## Interaction and lifecycle

Native pointer capture supports touch dragging and release outside the canvas. Arrow keys move a virtual hand; Space presses, key release lets go; Escape releases. Reduced motion starts paused and direct input applies a still state. Explicit Resume is available. Visibility and intersection changes halt animation; the host can also call setRunning(false). Dispose aborts input listeners, disconnects observers, cancels animation and timers, revokes download URLs and releases all GPU textures, geometry, materials and the context.

This is an artistic, bounded material model, not a physical measurement. Render quality is capped at 1.75 device pixels per CSS pixel; each study owns one graphics context. Compare mode is disabled. Without WebGL2 the static study plate and documentation remain usable.

## License and references

Original code, procedural patterns, geometry and generated still: MIT. Three.js: MIT, included in vendor/three/LICENSE. User-supplied screenshots and recordings are visual references only and are not distributed. No branded character, logo or product shell is reproduced.

## Pile rendering

80,000 overlapping curved ribbons form the default pile. Wider, softly rounded fibers carry localized cyan, warm-white and gold emission. Continuous phase offsets move broad gleams along each curved strand. The brush field gently brightens nearby fibers as it bends them. Multisample alpha-to-coverage preserves soft strand edges without transparent depth cutouts. A darker woven backing fills the gaps between roots. A softening pass preserves the ornament and combed motion; a luminance-thresholded, separable half-resolution bloom pass adds a colored halo to the brightest filaments. A second, broader halo is sampled from the same bloom texture. Rendering has four bounded passes and no temporal accumulation, so Pause and PNG export preserve an exact still. Both bloom targets resize with the surface and are disposed with it. All geometry and materials are released on disposal.
