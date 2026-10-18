# Oddly Dapper / Magnetic Hair Toy

Original portraits, a printed toy shell, and individually movable iron filings. MIT, with no external media, font files, third-party runtime, copied branding, or network dependencies.

## Play

Press in the dark tray. Drag the magnet up onto the face, then lift to leave a tuft. A sweep collects filings all along its path, including fast movements. Pick up a pinch selects existing grains from the tray and latches the magnet down. Move over the glass, then press Lift & leave filings. Keep magnet down supports hover-based grooming without holding a mouse button. Touch uses press-and-drag. Canvas keyboard controls: arrows move; Shift accelerates; Space latches/releases; P picks up a pinch; Escape releases and leaves focus.

Three original faces can be slipped under the existing filings. Shake it clean returns all grains to the tray. A reset does not change the portrait or controls. Increasing density adds grains to the tray; reducing it samples the existing field evenly, preserving the overall drawing.

Free grooming has no score or clock. Follow a pattern shows an optional dotted guide and live match score. Beat the clock starts explicitly, resets the tray, and runs for 20–90 seconds. Finish now submits early. The timer freezes with the Lab pause, offscreen preview, or hidden tab. Utter nonsense offers a rotating set of absurd prompts, with no competitive score. You can continue grooming after a challenge ends.

## Portable setup

Serve the extracted source directory over HTTP. Open example.html for the complete Lab-independent toy. Open creative-lab/experiments/magnetic-hair-toy/embed-demo.html for an independent particle layer over a custom poster. Neither example needs a build step, CDN, framework, or Tampa styles. Browsers do not allow normal ES modules over file://.

```js
import {createMagneticLayer} from './creative-lab/experiments/magnetic-hair-toy/engine.js';
const layer=createMagneticLayer(document.querySelector('canvas'), {
  density:3800, strength:1.15, radius:62, clumping:.45
}, {
  background(ctx, settings) {
    // Logical coordinates are always 900 × 760, regardless of CSS size or DPR.
    ctx.fillStyle='#eee6ce'; ctx.fillRect(0,0,900,760);
    ctx.drawImage(myOwnImage,0,0,900,760);
  },
  change(stats) { console.log(stats.held, stats.placed); }
});
layer.setRunning(true);
// Later: layer.dispose();
```

Set canvas CSS width:100%, aspect-ratio:900/760 and touch-action:none. Give it tabindex=0 and an accessible label. For automatic lifecycle gating, use IntersectionObserver and document.visibilitychange as shown in embed-demo.js. Dispose before removing or remounting the component. For the complete optional toy shell use `mount(container, settings, report)` from index.js and reserve at least 1500px before lazy mounting. It implements the shared Lab update/setRunning/replay/dispose interface.

## Engine API

- `update(partialSettings)`: normalized controls; background cache refreshed.
- `setRunning(boolean)`: allows active frames; false freezes timers, releases capture state, stops RAF. Direct user operations remain available as immediate edits.
- `setContinuous(boolean)`: request frame/tick callbacks even when the magnet is up, e.g. an explicit challenge clock. Disable when done.
- `move(x,y,capture=true)`, `engage()`, `release()`: logical-coordinate magnet input. Coordinates must be finite; edges are constrained. Use move(x,y,false) before engaging to start a new stroke without collecting along an unintended previous path.
- `setLatched(boolean)`: hold/release a magnet without a pressed pointer.
- `loadPinch()`: selects up to 260 additional existing tray grains, plus grains directly under the magnet; never changes total particle count. A radius-dependent carrying limit keeps the pinch grainy rather than collapsing the entire tray into one black spot.
- `shake()`, `reset()`: animated or immediate deterministic return to the reservoir.
- `getState()`: count, held, placed, energy, checksum, ticks, frames, running, latched, shaking, shakeProgress.
- `serialize()`, `load(document)`: full artwork data; load validates the entire document before mutating the field. Returns normalized settings so external controls can synchronize.
- `png()`: Promise<Blob>, 1800×1520 image, excluding the magnet and guide overlay.
- `draw()`: redraw if an external image finishes loading.
- `field`: lower-level DOM-independent FilingsField, for custom tooling.
- `dispose()`: cancel RAF; abort listeners; disconnect ResizeObserver; release particle arrays and background cache.

Optional hooks: `background(ctx,settings)` caches a portrait/poster; `overlay(ctx,settings)` draws guide annotations beneath filings; `change(stats)` reports user changes; `frame(stats)` reports rendering; `tick(seconds)` supplies capped active elapsed time; `shake(progress)` supports a matching shell animation. Avoid rebuilding UI or expensive geometry on each frame.

## Simulation

`model.js` holds typed position, velocity, angle and selection arrays. Particle i has stable hash-derived size, reservoir position and magnet offset. A swept-segment proximity test collects filings along fast pointer paths. Carried filings move with the magnet and converge toward bounded local offsets under damped attraction. Increasing clumping quantizes transverse offsets into narrow uneven strands, and reduces angle dispersion. Each grain stays a rigid segment; no metaballs or image overlays are used.

The model is deliberately a playful, physically informed interaction rather than a full electromagnetic solver. Selected grains latch to the magnet until release; carrying capacity depends on radius, so the load remains a visible group of separate grains. There is no gravity while the tray lies flat; dropped arrangements stay in place. Shake uses a reversible-in-parameter, deterministic interpolation from the current drawing to the reservoir with a bounded jitter envelope. The UI plays it forward only. No Math.random is used in geometry or motion.

The layer uses fixed 1/120-second model steps and bounded catch-up for responsive rendering. The same ordered input commands and substeps produce the same state. Arbitrary different pointer event streams are different inputs; artwork JSON is the exact restoration mechanism. Canvas draws filings in three batched stroke paths with a sparse highlight pass. Paper/portrait rendering is cached. There is no per-particle DOM or per-frame texture generation.

## Matching and timing

`challenges.js` separates paths, scoring, and the challenge clock from rendering. `patternPaths(kind,face)` supplies guide polylines; `patternSamples` samples them. `scorePattern(field,kind,face)` computes coverage (required grain count near each sample) and precision (fraction of all placed grains within 26 logical pixels of the shape). Their harmonic mean is the score. Tray grains below y=600 are excluded; unrelated marks elsewhere reduce precision. No magnets or forces pull automatically toward a pattern. `createChallenge()` exposes start, tick, finish, reset, state.

## Controls / saved state

Defaults and three presets live in model.js. config.json and manifest.json expose the same defaults to the Lab inspector:
- density: 1200–7000, increments of 100
- strength: .3–2.5; radius: 25–110 logical pixels; clumping: 0–1
- face: milo / cleo / cosmo
- mode: free / timed / template / silly
- resetSpeed: .4–2, inverse shake duration (1.15 seconds at 1)
- style: lithograph / blueprint / sunshine
- hiddenMagnet: hides the drawn magnet and field guide, without changing forces
- template: handlebar / brows / beard / crown / antennae / spiral
- guides: show the target only in pattern-based modes
- challengeLength: 20–90 seconds, increments of 5

Artwork version 1 stores width=900, height=760, normalized settings, and particles as [x,y,angle] records. Import accepts up to 1.8MB, requires 1200–7000 finite bounded records in increments of 100, and validates before applying. JSON restores the composition; active velocities, held state, clock and score are not resumed. Settings/preset/source export keeps controls only; it never silently includes private artwork. PNG and artwork JSON are explicit visitor exports. Nothing is uploaded or persisted by the engine.

## Accessibility and performance

No sound. Touch gestures are captured only inside the canvas. Nearby text explains the toy and alternatives; the current score and status use HTML. The optional timer only starts on an explicit action, and all challenges are also playable without a clock. Reduced motion suppresses the shell shake, instantly resets filings, and snaps direct manipulation; a visitor can still explicitly start a timer. Background/offscreen state freezes active work.

DPR is capped at 2; rendering is idle when the magnet is up and no clock or shake is active. Bounds and counts are fixed for predictability. The demo's score calculation is throttled during movement; do not calculate a large custom score inside every frame callback.

## Tests

`pnpm test:magnetic-hair` tests deterministic attraction, swept pickup, release retention, clumping/strength effects, bounds, density changes, shake restoration, matching accuracy, timer pause/completion, artwork validation/roundtrip, browser input, touch, presets, lifecycle, source export, isolated embedding and reduced motion. WebKit checks exercise the Safari engine, not a physical iPhone. Standard Lab lint, Astro check, build and internal-link verification also apply.
