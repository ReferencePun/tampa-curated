# Pin Art / Contour

An original sculptural pin board. Thousands of beveled heads and cylindrical shafts slide independently along Z inside a graphite guide plate. No photographed material assets or external models; the height studies and studio reflection environment are procedural.

## Start

Serve the exported ZIP over HTTP and open `example.html`. Three.js 0.186.1 and its MIT license are bundled locally. No CDN or build step. `embed-demo.html` is an independent integration with its own procedural surface.

```js
import {createPinField} from './engine.js';
const field=createPinField(canvas,{density:80,material:'steel',hold:true});
field.resize(canvas.clientWidth,600);
field.setProcedural((x,y)=>Math.exp(-(x*x+y*y)/5)*.8);
field.setRunning(true);
field.press([0,0],[-1,0]);
field.releasePointer();
// Stop animation while hidden, then dispose when removed.
field.setRunning(false);
field.dispose();
```

Use `mount(host, settings, report?, {heightInput}?)` for the complete optional UI. It returns `update`, `setRunning`, `replay`, `getState`, `getEngine` and `dispose`. The Lab handles visibility. Independent integrations must call setRunning themselves. Rendering is demand-driven; settled pins have no perpetual animation loop.

## Architecture and API

- `model.js`: DOM-independent typed height, velocity, raw-input and target arrays. Bounded critically damped dynamics, neighboring-target smoothing, shape profiles, wave functions, resampling and validation.
- `geometry.js`: lathed rod/head geometry and an instanced height attribute applied to both the visible and shadow vertex shaders.
- `engine.js`: renderer, guide board, pins, procedural reflection environment, camera, coordinate mapping and lifecycle.
- `images.js`: local image decoding into a bounded brightness map.
- `index.js` / `styles.js`: optional controls, touch/keyboard adapter and local downloads.

`createPinField(canvas, settings, onFrame?)` exposes:

- `update(partialSettings)`, `resize(cssWidth,cssHeight)`, `render()`.
- `press([x,y], previousPoint?, pressure=1)`, `releasePointer()`, `clear()`.
- `hover([x,y] | null)` for a ghost contact object.
- `hit(cssX,cssY)` for a pointer relative to the canvas. It intersects the camera ray with the displaced field in four refinement steps. `project([x,y])` maps a contact into screen pixels.
- `setProcedural((x,y,index)=>height, {immediate=false})`; values are clamped to −1…1.
- `setSample('blank'|'orbit'|'palm'|'landscape')`.
- `setHeightMap({width,height,data}, {invert=false})`; data is a typed array or array of finite values from 0 to 1, at most one million samples. Images are contained within the field without changing aspect ratio.
- `setRunning(bool)`, `setReduced(bool)`, `advance(seconds)` for deterministic fixed-step checks, and `replay()` to rebuild the current target relief from flat.
- `serialize()`, `load(document)`, `exportPNG()`, `getState()`, `dispose()`.
- `snapshot()` / `restore(snapshot)` preserve raw input, current heights, velocity, settings and wave phase for graphics-context recovery. These runtime snapshots are distinct from the validated portable relief file format.

The rectangular field is 12 × 8 world units, centered at [0,0]. X increases right; Y increases up. Height-map rows run top to bottom. The number of rows is round(columns × 2/3), yielding 672 to 10,880 pins. All physical pins use exactly one translation axis, even when viewed from another angle.

## Pin mechanics

A shaft extends from −pinLength/2 to +pinLength/2 before displacement. The guide board spans −boardDepth/2 to +boardDepth/2. Maximum travel in either direction is `(pinLength − boardDepth)/2 − .09`, preserving clearance and keeping rods engaged with both guides. The geometry keeps its length; it is never stretched to fake depth.

The model stores normalized displacements in [−1,1]. `strength` scales targets. Spring speed changes the natural response frequency; a closed-form critically damped step avoids unstable explicit integration. The time step is capped. Smoothing blends each target with four neighbors. Hold mode writes the strongest signed contact into the raw field. Without hold, only the current contact contributes; release returns to the underlying stored relief. **Release all** removes that stored relief and lets the field settle to flat. In a bare engine integration, disable wave mode/autoWave before `clear()` if flat is desired.

Sphere, soft-cube, torus and star profiles are procedural object impressions. They are not a general 3D mesh collision solver. The faint wire object marks the contact footprint; no hidden photogrammetry or prerecorded surface is substituted.

## Controls

| Setting | Range / meaning |
| --- | --- |
| mode | pointer, stamp, image, wave |
| density | 32–128 columns; changes physical pin count |
| pinLength | 1.2–3.6 world units |
| boardDepth | .15–1 world units |
| strength | .1–1 target depth |
| radius | .35–2.8 world units |
| material | steel, brass, graphite, resin |
| spring | .25–3 response rate |
| light | 0–360° directional lamp position |
| smoothing | 0–1 neighboring-height blend |
| hold | retain contact after lifting |
| direction | outward / inward |
| shape | sphere, cube, ring, star |
| sample | blank, orbit, palm, landscape |
| autoWave | animate wave targets; off freezes the wave phase in wave mode |
| wave / waveSpeed | ripple, tide, interference / .15–2 |
| phase | 0–100%, manually inspect a wave |
| rotation / tilt / zoom | camera, with upright orientation and bounded angles |
| invert | invert imported image brightness; original procedural studies retain their own signed heights |

Density changes bilinearly resample the current relief rather than clearing it. Material and geometry changes rebuild a small set of instanced batches; camera and lighting adjustments do not rebuild geometry. Raw height inputs are independent of the sample UI.

## Images, files and privacy

The demo accepts local PNG, JPEG, WebP and AVIF files up to 20 MB and 32 million source pixels. The longest side is resampled to at most 512. Luminance and alpha become height. A normal face photograph is **not** automatically reconstructed in 3D: use a prepared depth map for a meaningful face relief. The original palm is a stylized mathematical drawing, not a scanned hand.

Image pixels are never uploaded. Lab preset/source exports contain settings and original samples, not private artwork. A selected local map remains in this session only. **Save relief JSON** explicitly exports the currently visible pin heights as a version 1 `pin-field` document; loading it freezes those heights as a new editable sculpture. The file records columns, rows, normalized heights and settings. Imports are validated before replacement and limited to 1.5 MB / 16,384 heights. PNG saves the current camera view.

## Performance, accessibility and lifecycle

One instanced mesh draws all rods and heads; one more draws fixed sockets. Only one floating-point height per pin changes each frame. Shadows share one capped 1024px directional target. Device pixel ratio is capped at 1.6 desktop / 1.3 narrow screens, with a further reduction after consistently slow render submissions. This is a bounded GPU submission heuristic, not a universal frame-rate guarantee. The effect is excluded from simultaneous Lab comparison.

Pointer samples are coalesced to an animation frame; long movements interpolate impressions. Touch input uses pointer capture. Switch to Rotate view to inspect depth. Arrow keys move a contact point, Space holds it, Shift + arrows rotates, +/- zooms and Escape releases. Native buttons provide center pressing, release, resetting and view control. The surrounding page remains scrollable.

Reduced motion snaps targets and freezes automatic travel while preserving manual inputs. Offscreen/hidden/paused effects stop simulation. Graphics-context loss retains a relief snapshot, disposes old GPU handles and recreates the renderer after restoration. Disposal cancels frames, pending input work, observers, listeners and downloads; it releases instanced meshes, geometry, materials, shadow maps, environment targets and the renderer.

Official implementation references: [instanced meshes](https://threejs.org/docs/pages/InstancedMesh.html), [instanced attributes](https://threejs.org/docs/pages/InstancedBufferAttribute.html), [material shader hooks](https://threejs.org/docs/pages/Material.html), [prefiltered environments](https://threejs.org/docs/pages/PMREMGenerator.html).

## Verification

`pnpm test:pin-art` tests contact profiles, signed/held/transient impressions, spring settling and limits, resampling, height-map alignment, saved-relief round trips, visible deformation, camera/light controls, wave pause, local images, export, presets, standalone integration, touch/resizing/reduced motion and disposal in Chromium and WebKit. WebKit exercises Safari's engine; it is not a physical-device benchmark.
