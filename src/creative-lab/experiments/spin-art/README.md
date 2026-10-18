# Whirl · Spin Art Machine

A portable studio toy: wet paint on a rotating paper disc. The hand lives in the
stationary machine frame; the paint lives on the paper. Their relative motion
creates the artwork. All sample studies are original and use the same model.

## Use the exported package

Serve the folder over local HTTP and open `example.html`. The complete Lab-style
UI, default configuration and artwork are included with no install or build step.
For a minimal engine integration, open
`creative-lab/experiments/spin-art/embed-demo.html`. It starts with blank paper,
imports the engine directly and has no Tampa or Lab dependencies.

## Making a painting

Hold and drag over the disc. Staying in one place draws around the spinning
paper; moving toward or away from the center produces spirals and irregular
bands. Paint keeps its place when the motor stops. Try short bursts and leave
some paper showing. Space toggles pouring when the canvas has keyboard focus;
arrow keys move the dropper, Shift makes larger steps, Escape releases it.

The five tools have different deposition rules:

- **Splatter:** irregular droplets with thin outward tails.
- **Stream:** a continuous rounded paint line with wet radial streaks.
- **Drips:** separate deposits whose spacing follows drip rate and rotation.
- **Marker:** a clean continuous trace, without wet pigment flow.
- **Ink bloom:** diluted deposits and several irregular spreading branches.

Auto-pour moves a nozzle gently in radius. Hover over the disc to guide its
center. Manual painting temporarily takes over from automatic pouring. Up to
four neighboring nozzles deposit different colors simultaneously. The chosen
color feeds the first nozzle; the others follow the active palette.

Undo removes the last paint pass and all its wet tails; redo restores it in the
original compositing order. New sheet and original-study selection retain one
previous sheet behind the Recover previous sheet button. Save before leaving.
Shared Lab presets store controls, not artwork.

## Settings

| Key         | Range / options                               | Meaning                                                                    |
| ----------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| `speed`     | 0–90 RPM                                      | Signed by direction; motor approaches speed smoothly                       |
| `direction` | clockwise, counterclockwise                   | Paper rotation direction                                                   |
| `style`     | splatter, stream, dots, marker, bloom         | Pigment behavior                                                           |
| `thickness` | 1–30                                          | Relative paint width, defined against a 1024 px sheet                      |
| `dripRate`  | 4–60                                          | Discrete drops / wet stream deposits per second                            |
| `palette`   | studio, citrus, mineral, electric, monochrome | Future paint colors                                                        |
| `ink`       | #RRGGBB                                       | First nozzle / manually selected color                                     |
| `colors`    | 1–4                                           | Simultaneous adjacent paint sources                                        |
| `viscosity` | .1–1                                          | Paint body: fluid paint travels farther; thick paint pools near the nozzle |
| `spread`    | 0–1                                           | Outward flow and small irregular spreading                                 |
| `paperSize` | 512–2048, steps of 256                        | Paint buffer and exported PNG dimensions                                   |
| `opacity`   | .1–1                                          | Pigment alpha                                                              |
| `autoDrip`  | boolean                                       | Lab UI automatic-pour configuration                                        |
| `paper`     | ivory, white, night                           | Stock color behind retained paint                                          |

Settings change future marks; existing paint retains its original color and
position. Paper resolution rerenders the retained marks without discarding art.
The displayed machine always fits its container. Paper stock changes the
substrate behind existing transparent pigment.

## Reusable engine

```js
import { createSpinArt } from "./engine.js";
const studio = createSpinArt(
  canvas,
  {
    speed: 42,
    style: "splatter",
    colors: 3,
    palette: "citrus",
    ink: "#ed7036",
    thickness: 9,
  },
  {
    frame(state) {
      /* RPM, marks, motor, wet paint, dimensions, FPS */
    },
    interact() {
      /* explicit pointer or keyboard action */
    },
  },
);
studio.setRunning(true); // Call only while visible and not paused.
studio.setMotor(true);
studio.begin(0.4, -0.15); // Radius 1 paper coordinates in the stationary machine.
studio.move(0.65, 0.1);
studio.end();
studio.setAuto(true); // Autonomous pouring is deliberately armed separately.
studio.setAuto(false);
studio.setMotor(false);
const artwork = studio.serialize();
const pngBlob = await studio.png();
const svgText = studio.svg();
studio.undo();
studio.redo();
studio.load(artwork); // Loaded art starts with wheel and paint stopped.
studio.clear();
studio.dispose();
```

Set the canvas CSS aspect ratio to `900 / 760` and `touch-action: none`. The
engine scales pointer coordinates into the machine and captures a single touch
or pointer until release. Stylus pressure adjusts thickness. All ordinary page
scrolling outside the canvas remains native. The engine owns only the supplied
canvas, observers and input listeners. It starts with rendering paused; the
parent should use an IntersectionObserver to gate `setRunning`. Page visibility
also pauses internal work. No elapsed time is caught up after resuming.

The default motor is enabled on regular-motion devices but remains stopped for
reduced motion. `setAuto` explicitly arms pouring; the configuration field alone
does not start it in a bare engine. The Lab adapter connects its auto control to
that method. `hooks.document` can supply an initial artwork. Apply `update` after
loading to override its settings. `load` validates the full document before
replacing any existing artwork.

The independent `model.js` has no DOM, Canvas, or Tampa dependencies:

```js
import { SpinArt, paperPoint } from "./model.js";
const paint = new SpinArt({ speed: 30, ink: "#315c9a" });
paint.setMotor(true);
paint.begin(0.5, 0);
paint.advance(1 / 60); // Fixed 120 Hz substeps; max 100 ms per update.
const newMarks = paint.drain();
// Each mark: [passId, x1, y1, x2, y2, width, color, opacity, kind].
// New paint uses ribbon/bead with optional [endWidth, seed] at indices 9/10.
// Legacy line, drop and wash records remain supported. All positions are relative to paper radius 1.
paint.end();
```

`paperPoint(x, y, angle)` maps stationary input into the moving paper;
`screenPoint` is its inverse. The retained mark list and group visibility supply
a renderer-independent output for branded generators. `paint.js` implements an incremental Canvas rasterizer with asymmetric pooled silhouettes, continuous variable-width ribbons, gentle edge shading, broken liquid highlights and a subtle paper grain. Rounded cap shading is restricted to beads so long rivulets do not become chains of shiny dots. PNG compositing and SVG serialization use the same retained shapes. Replace
`renderer.js` to use the same painting system in a different physical shell.
`studies.js` is optional original demonstration content.

## Paint model and constraints

This is a physically informed parcel model, not a full fluid solver or a quantitatively accurate simulation. A fixed-step emitter
deposits marks in paper coordinates. Wet parcels accelerate outward with squared angular speed, resist that motion through viscosity, and curve under a rotating-frame Coriolis term. A finite pigment budget and drying window taper the resulting ribbons. Neighboring fresh droplets coalesce into heavier pools. Large moving beads can split once into smaller fingers. Paint reaching the edge is ejected into the collecting tray. Neighboring fresh pigments mix locally through a simple absorption approximation; dry layers retain their color. Dry marks do not keep moving.
Turning the paper changes only the display transform, not the stored artwork.

Markers never spawn wet flow. Zero spread prevents centrifugal tails. Stopping
the motor immediately stops rotation; wet pigment retains a brief viscous drift before settling. Reverse direction changes new trajectories; the squared
speed term still pushes pigment outward. A fixed seed and identical timed input
produce identical marks. Different input timing naturally produces different art.

The model retains at most 180,000 marks and 800 wet deposits. At the mark limit,
painting stops with a message to save and start another sheet. This prevents
unbounded memory growth during extreme unattended pouring. Single displayed
canvases use a device pixel ratio cap of 2; PNG uses the actual paper resolution.
Physics runs at 120 Hz; wet trails retain at most 24 tapered segments per second per parcel, independently of the display frame rate. Fine trails use a lightweight stroke path. Pigment coverage uses a nonlinear absorption curve to prevent seams where wet deposits overlap. No pixels are read back every frame. Paint rasterizes incrementally, and an idle,
stopped wheel schedules no continuous animation work.

## Export and lifecycle

- PNG: exact raster appearance at paperSize, current orientation, transparent
  outside the paper circle. The resolution control changes its dimensions.
- SVG: portable vector silhouettes at the current orientation. Raised shading, paper grain and diffuse wash edges use a simplified vector approximation; PNG is the faithful texture export.
- Artwork JSON v2 (v1 is still accepted): validated retained marks, paper orientation and settings. Paint
  passes remain undoable on load; pouring and rotation resume only explicitly.
- Source ZIP: all model, renderer, UI, presets, original study, license, neutral
  integration example and this guide. No network dependency or external assets.

`dispose` is idempotent: it cancels RAF, disconnects ResizeObserver, removes input
listeners, clears model memory and releases canvas buffers. Shared Lab visibility,
pause, reduced-motion and page lifecycle controls are supported. The neutral
example demonstrates its own visibility and bfcache lifecycle handling.

## Accessibility and verification

The studio is silent. Buttons and inputs are keyboard accessible, meaningful
status is HTML, and a static original study remains without JavaScript. With
reduced motion, use stationary paper or deliberately start the motor. Automatic
pouring is an explicit control. Desktop WebKit and Chromium, simulated touch,
resize, PNG/JSON/SVG, independent source export, pause and disposal are covered by
the test scripts. Emulation is not a claim of testing on a physical iPhone.

All code, machine artwork and original generative studies are MIT licensed.
No commercial recordings, fonts, photographs, trademarks or toy artwork ship
with the effect.
