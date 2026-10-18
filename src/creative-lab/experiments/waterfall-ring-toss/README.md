# Tideling · Waterfall Ring Toss

An original, silent pocket water game. Two water jets lift colored rings through
three printed miniature worlds. Let a ring descend over a peg and it slides into
a stack. Everything, including scoring, is derived from the simulation.

## Run the portable package

Serve the exported ZIP using any local HTTP server and open `example.html` for
the full inspector-compatible toy. No installation, build step or remote assets
are required. `creative-lab/experiments/waterfall-ring-toss/embed-demo.html` is a
second, neutral integration with custom pegs, pumps, scoring and backdrop. It
imports the engine directly; no Tampa component or Lab runtime is involved.

## Play

- Tap the two physical pump buttons; each impulse acts on a different area.
- Focus the chamber and press A / D, left / right arrows, or Space for both.
- Wait after pumping. Rings must be descending with their opening over a tip to
  catch. Secured rings stay on the peg until reset.
- Two pegs is the classic game. Challenge uses four pegs by default and an
  explicitly started timer. Little worlds offers three backdrops; layouts remain
  independently configurable. Endless replenishes a cleared board after 2.2 s.
- Free play hides the counter. Hold the tide freezes motion and challenge time.
- Start afresh resets positions, score, total, clock and pump history.

## Settings

| Setting      | Values                             | Meaning                                            |
| ------------ | ---------------------------------- | -------------------------------------------------- |
| `mode`       | classic, challenge, world, endless | Game rules; changes reset the board                |
| `strength`   | .4–1.8                             | Water-jet impulse multiplier                       |
| `buoyancy`   | .4–1.6                             | Effective downward weight; lower sinks more slowly |
| `ringCount`  | 4–24                               | Number of rings; resets the board                  |
| `layout`     | duet, quartet, terraces, arch      | Peg arrangement; resets the board                  |
| `shape`      | rounded, porthole                  | Chamber corner radius / collision boundary         |
| `turbulence` | 0–1                                | Horizontal drift and pump eddies                   |
| `world`      | harbor, reef, moon                 | Original printed backdrop                          |
| `timer`      | 20–180 seconds, steps of 5         | Challenge length; resets the board                 |
| `freePlay`   | boolean                            | Hide counters without changing simulation          |

The scene and settings remain independent. Selecting a thumbnail only changes
its scenery. The preset selector also applies a complete setup; Moon pool uses
lower effective gravity. Shared Lab presets and setup JSON save settings, not
live positions. PNG saves the chamber at its current rendered resolution.

## Canvas API

```js
import { createWaterToy } from "./engine.js";
const toy = createWaterToy(
  canvas,
  { ringCount: 10, strength: 1 },
  {
    scene: {
      chamber: { left: 24, right: 776, top: 16, bottom: 484 },
      pegs: [
        { id: "left", x: 265, tip: 215, base: 341 },
        { id: "right", x: 535, tip: 235, base: 361 },
      ],
      pumps: [
        { x: 265, y: 454, spread: 305, drift: 0 },
        { x: 535, y: 454, spread: 305, drift: 0 },
      ],
      scoring: { points: 1, captureTolerance: 12, stackSpacing: 7 },
    },
    event(event) {
      /* pump, catch, round, finish */
    },
    frame(state) {
      /* score, caught, pumps, remaining, time, fps */
    },
  },
);
toy.setRunning(true); // Only while your component is visible.
toy.pump(0); // Returns false if cooling down / challenge not started.
toy.pump(1);
toy.start(); // Reset and start a timed challenge.
toy.update({ turbulence: 0.3 });
toy.reset();
const state = toy.getState();
const blob = await toy.png();
toy.dispose(); // Safe to call twice.
```

Canvas CSS must preserve the 8:5 aspect ratio. `ResizeObserver` changes the pixel
buffer, capped at device pixel ratio 2, without changing model coordinates. The
controller starts paused. The parent should call `setRunning(false)` offscreen;
internal page-visibility handling also suspends background tabs. No time is
caught up on return. The example includes visibility, pause and bfcache handling.
Dispose cancels RAF, disconnects resize, removes listeners and releases buffers.

`hooks.background(context, model)` can replace the printed landscape. It is
cached and called on settings changes; dynamic water, rings, pegs and glass
remain separate. All coordinates use an 800×500 logical plane, positive y down.
Up to 8 pegs, 4 pumps and 24 rings are supported. Optional `scene.objects` is an
array of `{x,y,radius,color}` (12–22 radius, #RRGGBB); it overrides ringCount.
Custom geometry is validated. If pump definitions are omitted, the two demo
nozzles are placed beneath suitable pegs in the selected layout. Explicit
pump coordinates are always preserved. Pump forces fall off with horizontal distance
and chamber height. `spread` controls that range, `drift` adds lateral impulse.
The catch tolerance is also limited to the ring opening; points never change
capture geometry. A peg's physical length limits how many rings it can hold.
Custom scene authors must provide enough peg capacity for their intended goal.

## Model only

```js
import { WaterToy } from "./model.js";
const model = new WaterToy(settings, scene);
model.pump(0);
model.advance(1 / 60); // Internally fixed 120 Hz steps.
console.log(model.rings, model.pegs, model.state());
const semanticEvents = model.drainEvents();
```

No DOM or Canvas dependencies in the model. The same initial settings and
pump events at the same simulation times produce the same states. Large elapsed
updates are capped to 250 ms to prevent runaway catch-up; the canvas controller
further limits frame gaps to 80 ms. Normal 30/60/120 Hz partitioning agrees.

## Physics and limitations

This is an intentionally approachable 2D toy, with 2.5D ring drawing. Jets apply
bounded impulses and entrainment. Rings have drag, effective weight, deterministic
eddies, soft ring contacts and rounded chamber boundaries. Capturing requires a
downward tip crossing, an aligned opening and sufficiently level orientation.
Captured rings settle continuously down their peg and expose proper front/back
arcs. The game is not a fluid solver or an exact 3D torus collision simulation.
There is no artificial snap-to-peg force or randomly assigned score.

## Performance and accessibility

At most 24 rings and 160 bubbles. A cached illustration, one Canvas and ordinary
HTML controls; no per-particle DOM. Simulation/clock pause together offscreen,
when hidden, and through the Lab or toy pause controls. Reduced motion removes
ambient wave movement and reset rocking while preserving deliberately activated
pump motion. Essential movement stops after the initiated settling interval.
Touch uses normal large buttons and permits native page scrolling. Status and
score remain accessible HTML. A static original illustration is available if
JavaScript is disabled. Desktop WebKit and Chromium are exercised by the browser
suite; iOS touch is exercised through mobile browser emulation, not a real device.

## Export and license

Source ZIP includes the model, renderer, controller, UI, scoped styling, presets,
original preview SVG, this guide, MIT license and both integration examples.
No third-party assets, fonts, logos, recordings or toy branding are bundled.
Code, miniature illustrations and the original Tideling design are MIT licensed.
