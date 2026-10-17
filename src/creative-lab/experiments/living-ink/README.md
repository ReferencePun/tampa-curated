# Living Ink

An independent, working material study. Place ink on ivory paper; chemistry, not a prerecorded animation, decides what happens next. Five recipes cover branching fields, islands, sepia lace, a growing observatory, and a heron revealed by ink.

## Try it

Draw with a mouse, trackpad or finger. Focus the paper and use arrow keys to move the brush; Enter places a seed. Pause/Resume belongs to the surrounding workbench. Grow one moment advances a held field. Clear leaves truly unseeded paper; Reseed changes the deterministic origins. Replay restores the current recipe's seeds.

The inspector adjusts both diffusion rates, feed/depletion reaction rates, concentration of new brush strokes, steps per frame, ink color, structure influence, brush radius, resolution, guides and seed. Mode and resolution changes start a new field. Other controls affect existing ink without rebuilding its textures. Structure influence applies to architecture and image modes. Ink color and guide visibility affect presentation; chemistry controls change the stored concentrations. Unusual parameter combinations can fade out or settle: use a recipe or reseed to recover.

Save still exports the current paper as a PNG, at its displayed pixel dimensions. Presets save the recipe, not the evolving field or brush history. A custom uploaded image is local to the current session and is NOT included in a preset or source export. The default original heron is included in every source package. Upload PNG, JPEG or WebP under 8 MB and 16 megapixels; use dark subjects on light backgrounds for a delicate reveal.

## Portable instrument

Extract the source ZIP, serve it over HTTP, and open example.html. There are no packages to install. The example starts, pauses and disposes the instrument without Astro or Tampa code.

```js
import {mount} from './creative-lab/experiments/living-ink/index.js';
const settings = {mode:'organic', feed:.036};
const ink = mount(document.querySelector('#paper'), settings);
ink.setRunning(true);
ink.update({...settings, feed:.042}); // complete recipe, or defaults fill missing values
ink.replay();
ink.dispose(); // before removing the host
```

Give the host a height of at least 660px. The module inserts scoped styles. Use config.json as the full default recipe and manifest.json as its control schema. Lifecycle methods are update(settings), setRunning(boolean), replay(), dispose(). A lab:settings event keeps built-in recipes synchronized with an enclosing Lab preset inspector.

## Engine without the interface

```js
import {createInkEngine} from './creative-lab/experiments/living-ink/engine.js';
import {pathMask, imageMask, loadImage} from './creative-lab/experiments/living-ink/masks.js';

const settings = {mode:'architecture'};
const engine = createInkEngine({settings});
document.querySelector('#paper').append(engine.canvas);
engine.resize(900, 600);
const mask = pathMask([
  [[.1,.8],[.5,.15],[.9,.8]],
  [[.2,.8],[.2,.5],[.8,.5],[.8,.8]]
], engine.width, engine.height);
engine.setMask(mask);
engine.brush([{x:.2,y:.7,radius:.025,amount:.8}]);
engine.step(12);
engine.render();
// Call step and render from your own visible, unpaused animation loop.
// Changing options does not discard the field:
engine.update({...settings, mode:'architecture', influence:.9});
const png = await engine.exportPNG();
engine.dispose();
```

For an image, load a same-origin image (or an image with CORS permission), then pass imageMask(image, engine.width, engine.height) to setMask. Set mode:'image'. Supply a photograph or replace assets/heron.svg with your own illustration. Path masks accept arrays of normalized [x,y] polylines. All coordinates are top-down, with x/y in [0,1]. Brush radius is a fraction of the simulation width; amount is in [0,1]. Explicit brush calls process batches of up to 24 points without a simulation step.

You may provide an RGBA Uint8Array of exactly width × height × 4 bytes directly:

- R: affinity, 0–255; modifies local reaction rates.
- G: image pigment, 0–255; multiplied by the field's accumulated visitation, never revealed automatically.
- B: faint architectural guides, 0–255; optional display only.
- A: reserved, set to 255.

The mask helpers blur affinity while retaining fine pigment lines. Organic mode ignores mask affinity. Architecture uses stronger growth suppression away from guides; image mode uses gentler suppression to let fronts travel across the photograph. Setting influence to zero removes mask effects on chemistry, while image pigment is still gated by chemical visitation.

engine.read() returns a Float32Array snapshot with channels [U, V, deposited pigment, peak visitation]. Readback is explicit and may synchronize the GPU; it is never done by the animation loop. createCPU in model.js is a DOM-free reference solver with reset(snapshot), step, brush, setMask, read and dispose, suitable for numerical tests. createGPU in gpu.js exposes the equivalent solver. Use createInkEngine({forceCPU:true}) to exercise fallback rendering.

## Simulation and rendering

Gray–Scott finite differences with clamped (no-flux) boundaries:

    U' = Du ∇²U − UV² + F(1 − U)
    V' = Dv ∇²V + UV² − (F + K)V

The nine-point Laplacian uses center −1, cardinal .2 and diagonal .05 weights; Euler dt=.8. The inspector keeps parameters in bounded, tested ranges. The field is clamped to [0,1] for numerical robustness; this is an artistic material, not a calibrated chemical experiment. At affinity a and influence b, local feed is F + b(a − .5) × .008; local depletion is K + b[(1 − a)c − a × .006], where c=.035 for architecture and .012 for image. Organic b=0. No mask term creates V from zero.

Two RGBA32F framebuffer textures alternate each update; a pass never samples its output attachment. WebGL2 and EXT_color_buffer_float plus framebuffer completeness are checked at runtime. Float textures use NEAREST; the display pass interpolates explicitly so no floating-point filtering extension is required. A fullscreen triangle advances the grid. A separate pass renders contours, fine crosshatching and dry pigment from the stored concentrations. Hatching is stationary and appears only in deposited or currently active ink.

The graphics fallback runs the same equations on a 160 × 107 grid with fewer steps per frame. Its composition is coarser and develops at a different rate; the interface labels it honestly. A GPU interruption switches to this fallback with fresh seeds. Parameter extremes and all five recipes are tested for finite bounded state.

The instrument targets 30 rendered updates/second, caps pointer queues and catch-up work, and never rebuilds textures during drawing. The Lab/standalone adapter gates work on intersection, document visibility and Pause. Reduced motion starts held. Resolution changes are debounced. dispose removes listeners, observers, timers, animation callbacks, programs, shaders, textures, framebuffers, vertex arrays and the graphics context. Image decoding is generation-guarded against stale work after disposal or a mode change. Full-frame GPU readbacks are used only for explicit snapshots and tests.

## Source map and licensing

- model.js — defaults, recipes, input validation, seeding, DOM-free CPU solver.
- shaders.js / gpu.js — numerical shaders, ping-pong resources, GPU display pass.
- engine.js — reusable renderer/solver facade and CPU display fallback.
- masks.js — original architectural paths and image/path mask adapters.
- index.js / styles.js / style.css — instrument, scoped UI, page sizing.
- assets/heron.svg — original natural-history line drawing, MIT.
- assets/preview.svg — original still of this simulation, MIT.

All implementation and demonstration assets are MIT; see LICENSE. No remote runtime dependencies or demonstration image requests.

Primary references: John E. Pearson, [Complex Patterns in a Simple System](https://arxiv.org/abs/patt-sol/9304003), 1993; Khronos, [EXT_color_buffer_float specification](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/). These inform the model and GPU capability checks; all code and artwork here are original.

## Verification

pnpm test:living-ink runs numerical and browser regression checks: unseeded equilibrium, real parameter and mask divergences, CPU/GPU agreement, pointer/touch input, pause/clear/reseed, three modes, recipes, PNG/preset/source exports, standalone source, CPU fallback, context loss, visibility and disposal. pnpm lint:lab verifies source/import closure and preset validation.
