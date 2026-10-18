# Sol — Lava Lamp

A slow thermal model and a continuous wax surface, presented as an original glass object. No footage, stock assets, sound or runtime dependencies. MIT licensed.

## Start and embed

Serve the exported directory over HTTP and open `example.html` for the studio. `creative-lab/experiments/lava-lamp/embed-demo.html` demonstrates a lamp, a minimal column and a wide background independently of Tampa.

```js
import { createLavaLamp } from "./engine.js";
const lamp = createLavaLamp(canvas, { palette: "ember", mode: "classic" });
lamp.setRunning(!matchMedia("(prefers-reduced-motion: reduce)").matches);
// Canvas CSS: width:100%; aspect-ratio:10/9; display:block
lamp.update({ ...lamp.getState().config, viscosity: 1.4 });
// Before removing the canvas:
lamp.dispose();
```

Provide an accessible canvas description and HTML pause button. For a decorative background, place text outside the canvas. Canvas dimensions and aspect ratio can be chosen by the embedding page. The shell fits within the available width/height; Ambient fills the container.

## Three independent layers

- `WaxField` from `model.js` is DOM-free. `advance(seconds)`, `update(fullSettings)`, `reset()` and `snapshot()` operate a fixed-step, seeded thermal model. `parcels` contain position, velocity, mass, temperature, deformation axes and angle. The model has no network, randomness per frame, or page assumptions.
- `createWaxRenderer({forceFallback:false})` from `field-renderer.js` produces just the density field. `draw(field,settings,width,height)` returns a canvas; `backend` identifies the implementation; `dispose()` releases resources. WebGL2 evaluates the Gaussian sum and analytic gradient. A lower-resolution CPU implementation uses the same `sampleField()` function if WebGL2 is unavailable. The fallback preserves surface merging, with softer detail and a lower frame rate.
- `createLampRenderer(integration)` from `shell.js` adds a separate glass, cap, pedestal and ambient light. Its `draw(canvas,field,settings)` and `dispose()` can be used with another playback system. `createLavaLamp` adds lifecycle, sizing, export and the animation loop.

`createLavaLamp(canvas,settings,hooks,integration)` returns `update(fullSettings)`, `setRunning(bool)`, `replay()`, `warmup(seconds=30)`, `getState()`, `exportCanvas(width=1800)`, and idempotent `dispose()`. `field` exposes the model for custom integration. Hooks are `frame(state)` (throttled to about 5 Hz) and `motionPreference(isReduced)`. Pass `{forceFallback:true}` as the fourth argument to test CPU rendering. Omitted keys in update return to defaults; spread current settings for partial changes.

## What moves and what merges

Each parcel carries constant mass. Bottom heat and top cooling change its temperature. A hysteretic thermal-memory state switches in the lower and upper zones, with delayed heat exchange as the parcel travels. This stylized transport prevents the model from collapsing into a static neutral-temperature mass. Temperature changes buoyancy; viscosity changes drag. Nearby parcels attract, compressed parcels repel, and temperature differences apply separation forces controlled by Split tendency. A weak deterministic convection current breaks perfect symmetry. Deformation depends on vertical velocity, local strain and proximity to the bottom.

The wax is the level set `sum(2.8 * exp(-softness * ellipticalDistance²)) = 1`, with `softness = 2.7 - merge * 0.42`. This creates genuinely connected surfaces and narrowing necks as parcels approach or separate. Individual parcels remain in the model; visible blob count therefore differs from the seed parcel count. It is not a set of separately composited circles. The Gaussian kernels are elliptical, rotate, deform, and combine before shading. Analytic density gradients give the material its curved illumination.

This is a physically informed **two-dimensional thermal and surface model**, not a three-dimensional fluid solver. Parcel mass is conserved, but the area enclosed by the smooth implicit surface can vary during blending. The displayed timer is model time, not a measured temperature. Base material, object height and surrounding light are shell controls; Ambient fills its container and omits those details. The studio disables controls that do not apply to its chosen view.

## Settings

| Key       | Range / values                     | Meaning                                                 |
| --------- | ---------------------------------- | ------------------------------------------------------- |
| mode      | classic, ambient, column           | Complete object, full-frame material, glass-only column |
| blobs     | 6–24                               | Seed wax parcels; changing count restarts the field     |
| viscosity | 0.3–2                              | Velocity damping and resistance to elongation           |
| rise      | 0.3–2                              | Buoyant acceleration                                    |
| merge     | 0–2                                | Cohesion and field overlap                              |
| split     | 0–2                                | Thermal shear and strain deformation                    |
| palette   | ember, orchid, lagoon, pearl, neon | Five wax/liquid/illumination combinations               |
| height    | 0.75–1.15                          | Object size within its canvas                           |
| glow      | 0–1.8                              | Interior and density-field glow                         |
| opacity   | 0–1                                | Liquid color density                                    |
| base      | brushed, dark, ceramic             | Pedestal and cap finish in Classic                      |
| ambient   | 0–1                                | Surrounding environmental light in object views         |
| speed     | 0.2–3                              | Model time multiplier                                   |

`DEFAULTS`, `PALETTES` and six full `PRESETS` are exported by `model.js`; matching settings are registered in the Lab inspector. The studio's thirty-second button advances thirty seconds of playback at the selected speed, without an uncontrolled real-time jump. Reset returns to a reproducible starting arrangement.

## Lifecycle, compatibility and exports

WebGL2 renders one full-screen quad with at most 24 kernel uniforms. The field buffer caps at 700×1100; the object field usually needs far fewer pixels. Canvas 2D composes that field into the lamp. The fallback caps at 160×360 and performs the same field evaluation on the CPU. The visible canvas caps at 1400 pixels wide and DPR 1.5. There are no per-blob DOM elements or per-frame geometry rebuilds.

Offscreen canvases and hidden tabs stop simulation and rendering. Reduced motion starts still in the Lab and examples; Resume explicitly opts in. Context loss retains the last composed frame; restoration recreates the shader and quad. Disposal removes listeners/observers, cancels rAF, deletes GPU resources and releases the context. The examples dispose on pagehide and remount after a persisted pageshow.

The immersive viewer uses a native dialog, so it also works where element Fullscreen API is unavailable. Escape closes it and returns focus. PNG exports the actual current state. Shared Lab controls save/load/export settings and create a standalone source ZIP containing this experiment only.

## Validation and licensing

`pnpm test:lava-lamp` checks thermal evolution, fixed-step determinism, mass conservation, bounds, connected-field merging/separation, parameter effects, presets, pause, resize, fullscreen, reduced motion, WebGL/CPU rendering, exports and cleanup. `pnpm lint:lab`, `pnpm check`, and `pnpm verify` validate packaging and site integration.

All code, shaders, shell artwork and the rendered preview are original MIT-licensed work. No external images, recordings or fonts are redistributed. Keep the included LICENSE with reusable source.
