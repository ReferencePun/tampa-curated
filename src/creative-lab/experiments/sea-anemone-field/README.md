# Nerine — Sea Anemone Cursor Field

An original marine garden: fixed roots, three radial rings of tapered tentacles, folded central discs, independent idle motion and a local spring response. Five palettes, three materials, six presets, three isolated behaviors and a blend. MIT code and procedural artwork; no external assets or dependencies.

## Run the exported source

Serve the extracted directory over HTTP (`python3 -m http.server 8080`) and open `example.html` for the complete studio. `creative-lab/experiments/sea-anemone-field/embed-demo.html` demonstrates a contained garden, narrow divider and transparent texture over another design. The exported studio includes the shared Lab preview/preset lifecycle; the engine itself is independent.

## Minimal integration

```html
<canvas id="garden" tabindex="0" role="img" aria-label="Interactive sea garden"></canvas>
<style>#garden { display:block; width:100%; height:520px; touch-action:none; }</style>
<script type="module">
import {createAnemoneField} from './creative-lab/experiments/sea-anemone-field/engine.js';
const effect = createAnemoneField(document.querySelector('#garden'), {
  density:64, tendrils:30, mode:'mixed', attraction:.9, avoidance:.6,
  ripple:1.2, palette:'lagoon', background:'#071b20'
});
effect.setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);
// A deliberate Resume button may enable animation even with reduced motion.
window.addEventListener('pagehide', () => effect.dispose(), {once:true});
</script>
```

For a decorative background, set `pointer-events:none` on the canvas and forward normalized coordinates with `effect.point(x,y,pressed)` from the surrounding section. Call `effect.release()` on leave/cancel. Do not consume page scrolling outside the interactive canvas. `transparent:true` leaves the substrate clear; tendrils and their shading still render. Set explicit CSS dimensions; the effect fills them and recomputes its height-based coordinates on resize. Very wide/short placements naturally look sparser vertically: increase length or density as needed.

## API and ownership

`createAnemoneField(canvas, settings, hooks)` returns:

- `update(fullSettings)` — normalizes a complete settings object. Merge with `getState().config` for a partial update. Density/count rebuild the colony; appearance and force changes preserve ongoing motion.
- `setRunning(boolean)` — explicit animation ownership. Starts stopped. Paused pointer input evaluates a still response without changing the clock. Hidden/offscreen canvases suspend automatically.
- `point(x,y,pressed=false)` / `release()` — normalized canvas coordinates, also used by pointer, touch and keyboard handlers.
- `replay()` — reproducible starting garden and cleared ripple history.
- `getState()` — time, counts, contact, frame metrics and normalized config.
- `exportCanvas(width=1800)` — same field rendered to an independent canvas for PNG or other local output. Transparent backgrounds remain transparent.
- `dispose()` — idempotent; cancels RAF, disconnects observers, aborts listeners, releases pointer capture, arrays and caches. Dispose before removing the canvas. Remount after a persisted page restore (see embed demo).

Optional hooks: `frame(state)` (throttled), `contact(contact)` and `motionPreference(reduced)`.

## Controls

`config.json` is the default. `RANGES` and `options()` in `model.js` define numeric bounds and normalization.

| Setting | Meaning |
| --- | --- |
| `density` | 16–140 individual crowns |
| `tendrils` | 12–48 tentacles per crown (three rings) |
| `length` | 0.5–1.6 relative length |
| `softness` | Flexibility/response amplitude; lower spring stiffness as it increases |
| `sway` | Independent idle motion, 0–1.5 |
| `radius` | Pointer influence in canvas-height units, 0.08–0.5 |
| `attraction`, `avoidance`, `ripple` | Independent force strengths, 0–2 |
| `mode` | `attract`, `avoid`, `ripple`, or `mixed` |
| `palette` | `coral`, `lagoon`, `lilac`, `graphite`, `alien` |
| `material` | `translucent`, `satin`, `ink` |
| `glow` | Bounded luminous envelope, 0–1.5; ink intentionally ignores glow |
| `background`, `transparent` | Six-digit hex substrate color or transparent composition |
| `damping` | Velocity decay; higher values suppress overshoot and retain less momentum |
| `speed` | Simulation time scale, 0.2–2 |

Palette and background are independent in the engine/inspector. The studio palette selector chooses that palette's matching background; then its color input can override it. Mixed mode combines long-range attraction, stronger near-finger avoidance and traveling pulses. Setting all three strengths to zero leaves only idle sway. The studio disables strength controls not used by an isolated mode.

## Motion and rendering

`AnemoneField` is DOM-free. A seeded golden-angle distribution creates roots, with varied sizes, colors and phases. Each radial tentacle has a reusable Float32Array of nine projected centerline points. Root springs integrate at 120 Hz with exponential damping. A frame accepts at most 0.1 seconds to prevent a resumed tab from accumulating a huge catch-up step. A bounded queue of 24 pulses travels at the configured radius in height-units per simulation second (0.24 by default), decays with distance/time and expires after three seconds. Stationary pointers do not emit endless waves.

`createFieldRenderer()` is separate and accepts `(canvas, config, field)`. It batches tapered cubic curves by layer, pigment and segment; highlights and terminal bulbs suggest translucent tissue. Glow uses wider low-opacity strokes on a single 28%-resolution surface instead of a full-resolution blur per tentacle. Three Hermite spans per tentacle retain the sampled curvature while reducing repeated path construction. Substrate grain is cached. This is a stylized 2D projected illustration and spring model, not volumetric geometry or biological simulation.

## Accessibility and performance

Normal HTML controls remain usable without manipulating the artwork. The focusable canvas supports arrows, Space/Enter and Escape. Touch captures one active pointer and handles cancellation. Reduced motion starts paused through the studio/standalone host; explicit Resume opts in. Offscreen and hidden canvases suspend both simulation and rendering. Canvas backing width caps at 1350 pixels and device scale at 1.5. Maximum configuration is 6,720 tentacles; use lower density/count for mobile or multiple simultaneous fields. No DOM node per organism, WebGL dependency, tracking, network calls or audio.

The Lab source export, settings presets, fullscreen dialog, PNG export and lifecycle are tested separately from the neutral engine example. Browser tests use Chromium and WebKit (Safari engine); this is not a claim of testing physical iOS hardware.
