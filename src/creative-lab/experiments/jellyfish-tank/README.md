# Pelagia — Light-Up Jellyfish Tank

An original cobalt-lit aquarium: translucent bells contract and relax, drive their own swimming motion, and trail independently simulated, ruffled oral tissue. Three artistic forms, five palettes, six presets, three interaction modes, three rendering qualities, and glass/open-water framing. Code, anatomy, lighting and generated preview are MIT. No external assets, libraries, accounts or network requests.

## Standalone use

Serve the exported ZIP's extracted directory over HTTP (`python3 -m http.server 8080`). Open `example.html` for the full studio, or `creative-lab/experiments/jellyfish-tank/embed-demo.html` for three neutral integrations.

```html
<canvas id="aquarium" tabindex="0" role="img" aria-label="An interactive illuminated jellyfish aquarium"></canvas>
<style>#aquarium { display:block; width:100%; height:650px; touch-action:none; }</style>
<script type="module">
import {createJellyfishTank} from './creative-lab/experiments/jellyfish-tank/engine.js';
const tank = createJellyfishTank(document.querySelector('#aquarium'), {
  count:12, species:'mixed', palette:'abyss', mode:'disturb', quality:'balanced'
});
tank.setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);
// A deliberate Resume control can opt into movement.
window.addEventListener('pagehide', () => tank.dispose(), {once:true});
</script>
```

For a hero or cropped section, choose `view:'open'`, size the canvas with CSS, and use `zoom` to frame it. A decorative background should use `pointer-events:none` and `aria-hidden=true`. If its section should be interactive, forward normalized section coordinates through `tank.point(x,y,pressed)`, and call `release()` on leave or cancellation. Do not intercept ordinary page scrolling outside the intentional touch canvas. The included embed demo demonstrates all three placements and page lifecycle ownership.

## Layers and API

- `JellyfishScene(settings, aspect)` in `model.js` has no DOM dependencies. It owns `jellies`, each swimmer's bell phase, position, velocity, orientation and typed-array filament chains. `advance(seconds)` integrates the scene; `update(settings)`, `resize(aspect)`, `point(x,y,pressed)`, `disturb(x,y)`, `tap(x,y)`, `release()`, `reset()`, `snapshot()` and `dispose()` manage it.
- `SPECIES` is a separate definition table containing bell width/height, filament count and relative length, pulse period, and oral-arm count. Edit this table for custom artistic forms. The renderer builds anatomy from the resulting bell dimensions and chain state. These are stylized forms, not exact biological species.
- `pulse(phase)` returns contraction and its derivative. `bellShape(jellyfish)` uses that contraction to define the actual dome width/height. `attachment(jellyfish, chain)` is shared by the constraint model.
- `createTankRenderer()` exposes `draw(canvas, config, scene)` and `dispose()`. It owns only a cached background canvas. Supply another renderer if the same simulation should drive WebGL or another medium.
- `createJellyfishTank(canvas, initial, hooks)` owns input, responsive sizing, rendering, and lifecycle. It starts stopped. Its API is `update(fullSettings)`, `setRunning(bool)`, `replay()`, `point(x,y,pressed)`, `release()`, `disturb(x=.5,y=.5)`, `getState()`, `exportCanvas(width=1800)`, `dispose()`. Merge partial updates with `getState().config`. The underlying DOM-free scene is available as `.field`. For a custom render loop, call `scene.advance(dt)` followed by `renderer.draw(canvas, settings, scene.renderState())` to retain smooth display interpolation.
- Optional hooks are `frame(state)` (throttled), `contact(pointer)` and `motionPreference(reduced)`.

Disposal is idempotent. It cancels RAF, disconnects observers, aborts listeners, releases capture, and clears arrays/caches. Dispose before removing a canvas. Recreate it on a persisted page restore; the embed demo shows this. Hiding/offscreen suspension preserves the scene clock instead of simulating a large catch-up jump.

## Settings

`config.json` contains defaults. `RANGES` and `options()` describe and validate limits.

| Key | Meaning |
| --- | --- |
| `mode` | `ambient`, `light`, `disturb` |
| `count` | 2–16 swimmers |
| `minSize`, `maxSize` | Relative bell size range; maximum is normalized to at least minimum |
| `pulseSpeed` | Bell-cycle frequency multiplier, 0.25–2 |
| `driftSpeed` | Travel/current scale, 0.25–2; independent of bell frequency |
| `tentacleLength` | Relative filament/ribbon length, 0.4–1.8 |
| `glow` | Internal light and soft optical halos, 0–2 |
| `particles` | 0–250 suspended particles; Economy renders half |
| `lightColor` | Six-digit hex inspection/water light color |
| `darkness` | Tank background darkness, 0.5–1 |
| `interaction` | Local reaction strength, 0–2; Ambient ignores it |
| `species` | `mixed`, `moon`, `lantern`, `ribbon` |
| `palette` | `abyss`, `orchid`, `moon`, `tropical`, `graphite` |
| `zoom` | Centered framing, 0.7–1.8; pointer mapping accounts for zoom |
| `quality` | `economy`, `balanced`, `fine` |
| `view` | `tank` glass enclosure or `open` scene for cropping/backgrounds |

The studio palette selector also chooses the matching light; those remain independent engine/inspector settings. Size, species, count, length and quality changes rebuild the population/chains. Appearance and speed controls preserve motion state. Smallest/largest limits prevent an inverted size range.

## Motion

A fixed 120 Hz integrator evaluates a short 28% contraction and a 72% recovery. Quintic easing brings both velocity and acceleration smoothly to rest at the pulse boundaries. `renderState()` interpolates reusable display buffers between physics steps, so high-refresh screens and uneven frame timing do not repeat or skip discrete poses; the view trails the simulation by one 8.3 ms step. Positive contraction derivative produces thrust along the swimmer's orientation; recovery contributes no thrust. Larger swimmers have a longer pulse period and less acceleration. A return current balances the mean upward impulse, while slow currents, drag and soft positional restoration keep the inhabitants in view. Individual headings and slowly changing viewing tilts affect the bell projection and chain attachment positions; heading also changes propulsion. This is a physically suggestive animation model, not computational fluid dynamics.

Tentacles are stateful Verlet chains, with drag, a downward bias, weak varying water forces and three passes of distance constraints per step. Their roots attach to the deforming rim or interior arms; their tips retain momentum. The delayed deformation survives arbitrary frame timing without a rigid sprite translation. Frame input is bounded to 0.1 seconds; large suspended-tab catch-up is deliberately omitted.

The default `disturb` mode is interactive immediately: hover illuminates the water; a drag deposits directional current samples. Motion is bounded to 1.2 world units/second, with at most 20 samples that expire after 2.2 seconds. A distance/age envelope transfers the stroke's momentum into nearby bodies and their constrained tissue. Hover strokes apply one quarter of the drag force. Releasing lets the current dissipate; it does not snap bodies back.

A press hit-tests nearby bell centers (within 1.8 radii) and triggers one additional, smooth 1.8-second contraction. The same contraction derivative adds swimming thrust, so the response changes both the body shape and its movement. Repeated taps have a short cooldown. Empty-water taps create a ripple without selecting a distant animal. Call `scene.tap(x,y)` with normalized coordinates to integrate this behavior with another UI; it returns the selected ID or -1.

Light mode illuminates and attracts nearby swimmers. Disturbance keeps at most 12 waves, expiring after 3.5 seconds. Ambient ignores interaction. While paused, the inspection light redraws but poses remain frozen; currents and pulses wait for Resume. Arrow keys, Space/Enter and Escape provide equivalent input through a virtual hand.

## Rendering, performance and accessibility

Canvas 2D combines a blue-lit aquarium with broad translucent oral folds and short, soft marginal tissue. `membrane.js` draws the projected ellipsoidal bell directly at the destination resolution using continuous Bézier curves, clear gradients, faint radial canals and smooth edge light. The internal horseshoe folds are also vector paths; neither enlarged body bitmaps nor an angle atlas are used. Smooth tilt changes project the anatomy continuously, and contraction deforms the projection and its chain roots together. A separate projected opening has rear and foreground skirt surfaces with softly scalloped folds. The default population uses a mix of side, oblique and face-on views; most show the bell cavity. Oral folds are tapering translucent sheets with small overlapping ruffles, without wire outlines or repeated crossbars. This is a 2.5D artistic aquarium, not a reconstruction or fluid simulation. The supplied aquarium photographs informed the visual direction and are not bundled assets.

`drawMembrane(context, jellyfish, palette, color, glow)` is reusable independently of the scene: translate and scale the context to the bell's center and radii, then draw. Anatomy and lighting scale to the destination, including large PNG exports. It allocates no persistent graphics resources.

Economy uses 14 nodes per chain, fewer marginal folds, and half the particle count; canvas width caps at 900 pixels / DPR 1. Balanced uses 24 nodes and caps at 3072 / DPR 2; Fine uses 32 and caps at 4096 / DPR 2. Display-resolution rendering keeps curves smooth on Retina screens and in fullscreen. Only the water backdrop is cached. Disposal clears this backdrop and the simulation's reusable arrays. There is no DOM node per tentacle or particle. Use Economy and a lower count for several simultaneous backgrounds.

The shared preview and standalone host start paused for reduced motion. Explicit Resume enables movement. Hidden or offscreen scenes stop drawing and integrating. Keyboard input uses arrows, Space/Enter and Escape; mouse, captured single-touch, cancellation and resize are supported. Ordinary HTML controls operate the experiment without touching the artwork. The Lab keeps an original generated preview for no-JavaScript viewing. Fullscreen uses a native modal dialog with focus return; exports are processed locally.

Model tests check directional drag displacement, tap-induced contraction/thrust, bounded current expiry, empty-water/ambient taps, smooth pulse boundaries, interpolated high-refresh display poses, pulse/thrust coupling, size-dependent periods, delayed chains and anchors, constraint bounds, deterministic steps, local reactions, wake expiry, settings and cleanup. Browser tests cover WebKit (Safari engine), Chromium, touch, resizing, reduced motion, presets, source export and standalone lifecycle. Browser automation is not physical iOS-device testing.
