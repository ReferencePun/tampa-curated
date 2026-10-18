# Drawing Toys

Two original nostalgic drawing instruments: **Wanderline**, a red twin-dial continuous-line toy, and **Softfield**, a rounded magnetic drawing board. All code, shapes, textures, lettering choices and paths are original. No branded art, remote assets, third-party font files or runtime packages.

## Run and embed

Serve the exported ZIP over HTTP and open `example.html`. `embed-demo.html` demonstrates just the independent drawing model and renderer, without the Lab or toy-shell UI.

```js
import {mount} from './index.js';
const toy = mount(element, {mode:'dial', frameStyle:'original'});
toy.setRunning(true);
toy.loadPath({points:[[.1,.8],[.4,.2],[.8,.8],[.1,.8]]});
const artwork = toy.serialize();
toy.update({...toy.getState().settings, mode:'magnetic'});
// Pause while hidden; clean up when the view is removed.
toy.setRunning(false);
toy.dispose();
```

`mount(host, settings, report?, integration?)` accepts an optional `integration.path` or validated `integration.document`. It returns `update`, `setRunning`, `replay`, `serialize`, `loadPath`, `getState`, and `dispose`. `update` accepts a complete configuration; merge with current settings for partial updates. `replay` starts at zero. The full UI has its own pause/continue replay button and a scrubber. The host can listen for `lab:settings` and `lab:set-pause` if integrating it with another control system, or manage `setRunning` itself.

## Independent pieces

- `model.js`: normalized geometry, drawing head, semantic operations, undo/redo, input validation and replay indexing. No DOM.
- `input.js`: captured pointer movement, circular/linear knobs, held keyboard/direction controls and draggable stamps. Invokes a small callback adapter rather than owning pixels.
- `renderer.js`: cached board surface and incremental ink canvas. Paper grain is deterministic. Replay applies complete events to the cache and renders the partial next event on a temporary layer. Backward seeks rebuild from semantic data; erasure never removes the paper substrate.
- `erase.js`: sampleable shake/wipe choreography. No timers or model mutations.
- `export.js`: PNG rendering and Blob download.
- `styles.js` / `index.js`: the two toy shells and accessible controls.

```js
import {createDrawing,pathDocument} from './model.js';
import {createRenderer} from './renderer.js';
const drawing=createDrawing('dial');
drawing.begin();
drawing.move(.1,0,1.8); // always starts at the current head
drawing.move(0,-.15,1.8);
drawing.commit();
const renderer=createRenderer(canvas);
renderer.resize(800,544);
renderer.render(drawing.state(),settings,{progress:.5});
renderer.dispose();
drawing.dispose();
```

A drawing exposes `begin`, `commit`, `cancel`, `move`, `stroke`, `stamp`, `wipe`, `clear`, `undo`, `redo`, `load`, `state`, `serialize`, and `dispose`. Magnetic `stroke(a,b,width,tool)` supports soft/fine/eraser tools. Dial strokes always continue from the existing head, regardless of the supplied start. `wipe(a,b)` sweeps a normalized horizontal interval plus its 7%-wide eraser strip. Stamp shapes are star, circle and square. Store one gesture between begin/commit. A full clear changes the document but remains undoable.

## File formats

Simple path JSON:

```json
{"points":[[0.1,0.8],[0.4,0.2],[0.8,0.8],[0.1,0.8]]}
```

Paths have 2–8,000 points with finite X/Y coordinates from 0 to 1. A path becomes one continuous line, and its endpoint becomes the drawing head. No SVG scripts or external references are accepted.

Drawing JSON has `version:1`, `kind:"drawing-toy"`, `mode`, `cursor:[x,y]`, and `events`. Line events contain `kind:"line"`, `a`, `b`, `width`, `tool`. Magnetic-only stamps contain `shape`, `p`, `size`; wipe events contain `a` and `b`. `readDrawing` validates the complete document before replacing any artwork, including continuity and head position for a twin-dial drawing. Imports are bounded at 4 MB and 16,000 events. Rendering uses normalized coordinates, so changing proportions stretches the composition without discarding marks.

The two toys keep separate session documents. Switching toys or style presets does not erase the other toy's artwork. Save drawing JSON before leaving; drawings are not silently persisted. Lab preset/source exports contain settings and original examples, not a visitor's artwork. PNG exports the currently visible replay position at 1,600px wide without the cursor or shell.

## Settings

| Setting | Range / choices | Effect |
| --- | --- | --- |
| mode | dial / magnetic | Independent drawing documents and controls |
| lineWidth | .7–10 | New marks, in a 1,000-unit board width |
| sensitivity | .3–2.5 | Relative dial/screen steering gain; direct magnetic stylus stays under the pointer |
| boardSize | classic / wide / square | 1,000 × 680 / 550 / 900 logical area |
| stylus | soft / fine / eraser | New magnetic strokes |
| knobSpeed | .25–3 | Knob and held-key travel rate |
| eraseBehavior | animated / instant | Shake / full sweep or immediate clear |
| replaySpeed | .25–3 | Playback rate |
| frameStyle | original / seafoam / graphite | Original shell finishes |
| stampSize | 30–140 | Magnetic stamp diameter, in board units |

## Input and physical behavior

Dial edges use wrapped angular changes, so crossing ±π cannot jump the line. A drag beginning near a knob's center uses vertical movement for precision. Screen dragging steers the existing head by relative movement: lifting and re-pressing cannot teleport it. Two touch pointers can operate the two knobs simultaneously. Arrow keys and held direction buttons provide alternatives. Escape releases focus. The head stops at the board's boundary.

On the magnetic board, lifting the wand starts a separate stroke. Coalesced pointer samples and round continuous segments avoid gaps at speed. A selected stamp can be tapped onto the board, or dragged directly from the tray. The slider removes marks in the strip it crosses, in either direction; it is not a decorative fade. Spot erasing is available as a separate wand tool. Undo/redo treats a stroke, knob gesture, stamp, wipe, clear or imported path as one edit.

The shake button and quick back-and-forth drag on the top grip share the same erase mechanism. Device motion permission is not required. Reduced motion skips shaking and sweeping; manual scrubbing remains available. Replay only starts deliberately.

## Performance and cleanup

The paper texture is cached, with no idle animation loop. New segments update the ink layer incrementally. Only replay and clearing use RAF; they pause while hidden, offscreen or when the host pauses. Resizing invalidates the cached layers and reconstructs the same drawing. Device pixel ratio is capped at two. Up to 24 undo gestures and 16,000 marks bound memory. This full workbench is excluded from simultaneous Lab comparison.

`dispose` releases pointer/keyboard adapters, listeners, observers, animation frames, caches and download URLs. Touch-action is limited to controls and the drawing area; surrounding text remains scrollable. A static illustrated plate remains when JavaScript is disabled. Canvas support is required to draw.

Browser implementation references: [pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture), [canvas compositing](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation), [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).

## Verification

`pnpm test:drawing-toys` checks continuous-line constraints, undo/redo, path validation, deterministic replay, magnetic region clearing, stamps, pointer/keyboard/touch input, resizing, reduced motion, presets, PNG/JSON, standalone source and disposal in Chromium and WebKit. WebKit is a Safari-engine test, not a claim of testing on physical iPhone hardware.
