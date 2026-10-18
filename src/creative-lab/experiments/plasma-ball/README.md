# Volta — Interactive Plasma Ball

An original, dependency-free electrical illustration. Connected tendrils evolve in a shared field, branch, converge on a front-glass contact, and redistribute. Canvas layers add luminous cores, a glass vessel, restrained reflections and a metal rest. This is an artistic electrical model, not a physical plasma solver.

## Portable quick start

Serve the exported directory over HTTP. Open `example.html` for the entire studio, or `creative-lab/experiments/plasma-ball/embed-demo.html` for hero, widget and ambient placements. No Tampa runtime, framework, asset download or build step is required.

```js
import { createPlasmaBall } from "./engine.js";
const globe = createPlasmaBall(
  canvas,
  {
    mode: "classic",
    palette: "violet",
    filaments: 36,
    branching: 2,
  },
  {
    frame: (state) => {
      /* optional metrics, throttled to ~7 Hz */
    },
  },
);
globe.setRunning(!matchMedia("(prefers-reduced-motion: reduce)").matches);
// Later: all settings may be supplied; omitted settings return to defaults.
globe.update({ mode: "ambient", palette: "arctic", speed: 0.6 });
// Always dispose before removing/replacing the canvas.
globe.dispose();
```

Give the canvas an explicit CSS size: `width:100%; aspect-ratio:10/9; display:block; touch-action:none`. Wide sections and small widgets are supported: sphere size derives from the smaller available dimension. Use `pointer-events:none` for decorative backgrounds, provide a pause button, and keep important text outside the canvas. For interactive embeddings give the canvas `tabindex="0"` and an accessible description of the arrow/Space/Escape controls.

## Settings

`DEFAULTS`, `PRESETS` and `PALETTES` are exported by `model.js`. Settings are bounded and normalized by `options()`; invalid values fall back to defaults.

| Setting    | Range / values                              | Effect                                                    |
| ---------- | ------------------------------------------- | --------------------------------------------------------- |
| mode       | classic, intense, ambient                   | Convergence, thickness, field speed and brightness        |
| filaments  | 12–80                                       | Connected main trunks                                     |
| branching  | 0–4                                         | Branches per trunk                                        |
| glow       | 0.2–1.8                                     | Bloom and local contact glow                              |
| speed      | 0.1–2                                       | Procedural field clock rate                               |
| attraction | 0–2                                         | Contact convergence; zero disables attraction             |
| palette    | violet, arctic, ember, spectral, monochrome | Arc and electrode colors                                  |
| coreSize   | 0.04–0.14                                   | Electrode radius / globe radius                           |
| sphereSize | 0.7–1.1                                     | Globe size within available canvas                        |
| flicker    | 0–1                                         | Small bounded brightness variation, never on/off flashing |
| reflection | 0–1                                         | Glass specular arcs and edge intensity                    |
| darkness   | 0.65–1                                      | Background darkness, independent of arc luminance         |
| idle       | boolean                                     | Continue evolving without contact                         |

Intense mode increases convergence and width at the contact. Ambient mode multiplies field speed by 0.38 and brightness by 0.83. Pressing also increases convergence in every mode. Five full presets are provided; the shared Lab inspector saves, loads and exports custom presets.

## Public API and data model

`createPlasmaBall(canvas, settings, hooks)` returns:

- `update(fullSettings)` — normalize settings, rebuild geometry buffers only when counts change.
- `setRunning(boolean)` — pause/resume time. Pointer inspection still works statically while paused. Passing true is an explicit choice to animate, including after reduced motion.
- `point(x,y,pressed=false)` — custom input, in sphere-local units: x/y ±1 at the rim. Coordinates and canvas hit testing share `layout()`.
- `release()` — smoothly return to the free field; immediate when paused.
- `replay()` — reset clock and contacts to the same starting field.
- `getState()` — time, contact, configuration, path counts, mean contact distance, frame count, rendering metrics.
- `exportCanvas(width=1800)` — a newly rendered PNG-ready canvas, 320–2400 px wide, same field and aspect ratio.
- `dispose()` — idempotent cleanup of pointer capture, listeners, observers, buffers and rAF.

Optional hooks: `frame(state)`, `contact(contactState)`, `motionPreference(isReduced)`. `field` exposes the underlying model for custom rendering/testing.

`PlasmaField` in `model.js` has no DOM dependencies. `advance(deltaSeconds)` advances a bounded step; `point()` / `release()` set target contact; `settleInput()` evaluates input immediately; `evaluate()` updates paths. Each path owns a persistent `Float32Array` of projected xyz positions. Branches record their parent and fork fraction. The first branch vertex exactly matches its sampled parent vertex. The same configuration, clock and input history yield the same field; no random values are sampled per frame. Trunks terminate on a three-dimensional unit sphere and use weak-perspective projection. Front-contact inversion keeps them registered under the cursor.

This is an orthographic-style optical illustration rather than a fully orbitable scene. Branches connect to trunks and nearby shell points; no collision or electromagnetics solver is involved. Screen-space highlights are deliberately restrained. Palette definitions can be extended in `PALETTES` using four six-digit hexadecimal colors and a core color.

## Input, motion and lifecycle

Mouse hover attracts, primary press/touch intensifies; captured dragging remains continuous. Touch cancellation, capture loss and blur release the contact. Arrow keys position contact, Space/Enter toggles intensity, Escape releases. The studio includes a top-layer dialog with close/Escape and keyboard focus return. It works independently of browser Fullscreen API support.

Offscreen and hidden canvases suspend animation. With idle disabled, the loop also sleeps after contact decays. Reduced motion starts paused in the supplied examples; the studio's explicit Resume can opt in. Changing the system preference to reduce stops a running engine. The studio uses no sound, uploads, networking, storage or analytics; only shared Lab presets are stored locally by the host.

The renderer uses one visible canvas plus cached backdrop and low-resolution bloom buffers. Maximum geometry is 80 trunks × 57 vertices plus 320 branches × 25 vertices. Backing width is capped at 1600 and device ratio at 2. Fine branches are batched by pigment and brightness; trunks retain individual widths and brightness. No per-filament shadow blur, DOM nodes or GPU resources. Export temporarily redraws cached buffers at export size; the next live frame restores the display size.

## Tests and rights

`pnpm test:plasma-ball` checks deterministic evolution, connected branches, convergence/release, every setting/preset, mouse/touch/keyboard, resizing, motion pause, standalone source export, image export and cleanup in WebKit and Chromium. `pnpm lint:lab` checks packaging closure and licenses.

All code, procedural artwork and preview are original and MIT licensed. No commercial toy branding, imagery, fonts, sounds or external assets are included. Retain the supplied LICENSE when redistributing source.
