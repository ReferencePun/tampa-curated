# Light Peg Studio

An independent, dependency-free illuminated drawing instrument. It uses a single visible Canvas 2D surface, a cached recessed board and small reusable lens sprites. Pegs have separate shadow, colored lens, bright core, rim, reflection and diffusion layers; their coordinates seed a small fixed brightness variation. This is an original interface and set of illustrations, without commercial toy branding or copied assets.

## Start the exported example

Unzip the source, run `python3 -m http.server 8080`, then open `http://localhost:8080/example.html`. No package installation or build is required. The example reads its appearance settings from `preset.json`. A server is needed for ES modules; do not open it through `file://`.

The shared Lab provides inspector settings, favorites, appearance presets, pause/replay, fullscreen and source export. All drawing tools, local image processing and artwork exports are inside this experiment's directory.

## Complete component

```js
import {mount} from './creative-lab/experiments/light-peg-studio/index.js';
import {DEFAULTS} from './creative-lab/experiments/light-peg-studio/model.js';

const host = document.querySelector('#lightboard'); // give the host a height
const effect = mount(host, DEFAULTS, stats => console.log(stats));
effect.setRunning(true); // permits animation, but doesn't start it
// Replace appearance settings; it never implicitly starts animation.
effect.update({...DEFAULTS, palette:'mineral', material:'frosted'});
const drawing = effect.serialize();
effect.replay(); // returns animation time to zero, preserves artwork
// Before removing the component:
effect.dispose();
```

`mount(host, settings, report, {document})` optionally accepts a validated drawing document as its initial artwork. `getState()` returns settings, drawing document, history depth, animation intent, active visibility, render counters and disposal status. Settings changes dispatch a bubbling `lab:settings` event. Deliberately pressing Play light dispatches `lab:set-pause:false` so the shared host can resume. Call `setRunning(false)` when hidden/offscreen; it preserves animation intent but cancels rendering. `dispose()` is idempotent and releases frames, listeners, resize/motion observers, image references, object URLs and all canvas caches.

## Board model and editing without this UI

`model.js` has no DOM or browser dependencies:

```js
import {
  createBoard, stroke, flood, createHistory, resizeBoard,
  documentFor, readDocument, DEFAULTS
} from './model.js';
let board = createBoard(72); // 72 × 45 sockets
const history = createHistory(40);
history.begin(board);
const changed = stroke(board, {x:3,y:4}, {x:30,y:17}, {
  color:7, size:3, tool:'paint'
});
history.commit(board); // one continuous gesture = one undo step
history.begin(board);
flood(board, 0, 0, 2);
history.commit(board);
board = history.undo(board);
const saved = documentFor(board, DEFAULTS);
board = readDocument(JSON.parse(JSON.stringify(saved))).board;
```

- `cells`: `Uint8Array`, row-major, 0 is an empty socket, 1–12 are palette indices.
- `selected`: `Uint8Array`, 0/1 animation selection.
- `order`: `Uint32Array`, insertion/recolor order for progressive illumination.
- `serial`: monotonically increasing drawing order; `seed`: deterministic lens variation.
- `columns`: 24–112 in increments of eight. `rows = round(columns × 0.625)`.
- `stamp`, `stroke` and `flood` mutate the supplied board and return changed cell indices.
- `stroke` uses integer line interpolation between samples, including the endpoints. The UI also processes coalesced pointer samples when available.
- Brushes have odd diameters 1, 3, 5 or 7. Selection stamps affect lit pegs only.
- `resizeBoard` samples the existing board proportionally; content, selection and order move together. Resizing is an undoable edit.
- `createHistory` keeps at most forty typed-array snapshots. New edits after undo discard the redo branch. A canceled touch gesture restores its starting snapshot.

The component supports Place, Remove, flood Fill, straight Line with a preview, Select, Move view, zoom, fit, undo, redo and clear. Changing a color or appearance setting does not add an artwork undo step. Clear, example selection, resolution changes, imports, image conversions and animation selection do. Appearance is independent of artwork history; undoing a grid change also restores the inspector's column count.

## Renderer only

```js
import {createRenderer} from './renderer.js';
const renderer = createRenderer(canvas);
renderer.resize(900, 550); // CSS dimensions; device pixel ratio capped at 2
renderer.render(board, DEFAULTS, 0);
renderer.render(board, DEFAULTS, 0, {dirty:changed});
const hit = renderer.hit(board, pointerX, pointerY); // canvas-local CSS pixels
renderer.pan(30, 0);
renderer.home();
renderer.dispose();
```

`render` also accepts `{selection, cursor, ghost}` for editing overlays and returns counts and CPU submission time. Layout, hit testing and drawing share the same transform. Zoom enlarges the physical objects; Move view pans within bounded limits. Rendering a dirty region first restores the cached board there, then redraws all neighboring peg halos crossing that region. This avoids old glow remaining after an erase. Large changes and animation use a full redraw. Sprite caches are invalidated by material, palette, light, size or view changes. Canvas resources are bounded by the board size and color/brightness bins, not an unbounded drawing history.

Canvas 2D was chosen for up to 7,840 sockets: cached repeated primitives give a portable implementation without WebGL context management or thousands of DOM objects. The design follows [MDN's canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas). Lens sprites use twelve brightness steps; animation targets 30 FPS and editing paints on pointer input. A still board performs no animation work. WebGL instancing may be more suitable if an embedding project increases the board size by an order of magnitude; that is outside this implementation's limits.

## Image conversion

Local image selection accepts browser-decodable PNG, JPEG, WebP, GIF and AVIF, at most 20 MB and 32 million decoded pixels. An animated format contributes its decoded still frame. The image stays in memory through a local object URL; it is not uploaded, fetched remotely, stored in presets or included in source exports. Replacing the image revokes its URL, and pending decode results are discarded after disposal or a newer selection.

The image is contained within the board while preserving aspect ratio, sampled with Canvas downscaling, then processed by `quantize(rgba, columns, rows, settings)`. This pure function maps RGB values to the selected twelve-color palette with a weighted distance and optional Floyd–Steinberg error diffusion. Transparency and a configurable luminance threshold leave sockets empty. The result is ordinary editable board state, not an image overlay. Resolution, palette, darkness and dither changes can reconvert the retained source; previous drawings remain in undo history. Transparent letterboxing remains unlit.

## Animation

The board starts still. Choose Animate, select some lit pegs and deliberately press Play light. The three patterns are soft waves, deterministic twinkle and insertion-order reveal. `lightAt(board, index, time, settings)` produces a brightness and palette index without mutating stored artwork. Unselected pegs retain their steady light. Color cycling is optional and off by default. The time slider inspects a fixed state without autoplay.

`selected` and `order` are stored in drawing documents, so animation can be replayed elsewhere. Reduced motion starts paused; deliberate Play light can opt into the controlled animation. Changes to the reduced-motion preference stop playback. Host pause, hidden tabs and offscreen views cancel animation frames. There is no sound, flickering strobe, autonomous startup or wall-clock jump on resuming.

## Settings

| Key | Values / effect |
| --- | --- |
| `columns` | 24–112, step 8; aspect ratio stays 8:5 |
| `diameter` | 0.4–0.9; physical lens diameter relative to the base grid unit |
| `spacing` | 0.8–1.3; grid pitch independent of lens diameter |
| `palette` | spectrum, ember, mineral; twelve colors per tray |
| `glow` | 0–1.4; halo intensity |
| `background` | 0–0.3; black-board illumination |
| `diffusion` | 0–1; halo reach |
| `material` | glass, frosted, resin; reflection/grain/facet treatment |
| `mode` | draw, image, animate |
| `animation` | wave, twinkle, trace |
| `speed` | 0.1–2; animation time multiplier |
| `amplitude` | 0–0.8; selected peg modulation depth |
| `colorMotion` | optional selected-peg palette cycling |
| `zoom` | 1–3; pan separately through Move view |
| `brush` | 1, 3, 5, 7; diameter in sockets |
| `threshold` | 0–0.8; image luminance below which sockets remain empty |
| `dither` | 0–1; color quantization error diffusion |

The Lab's style presets and source ZIP store these settings. The current visitor's artwork must be saved separately as drawing JSON; a message in the UI states this explicitly. No artwork is silently stored in browser storage.

## File format and exports

`documentFor(board, settings, time, type)` returns a version 1 document. `type` is `light-peg-drawing` or `light-peg-animation`. Both include the complete board, settings, selected cells, insertion order, seed and captured animation time. The latter is explicitly named for reuse as a complete animation configuration. Import supports either and always leaves playback paused.

JSON imports are at most 500 KB. They validate version/type, supported dimensions, array lengths, integer palette indices, selection bits, insertion order and seed. Settings are normalized against supported bounds. Imported strings are not executed or inserted as HTML. For your own importer, use `readDocument()` instead of trusting a decoded object.

`pngFor(board, settings, time)` produces a complete 2048 × 1320 PNG regardless of the current viewport crop, zoom or editing overlays. It renders on a temporary canvas and disposes it after encoding. `svgFor(board, settings, time)` produces a self-contained SVG still with repeated recessed holes, radial lens gradients, halos and highlights. SVG uses a simplified vector material; the raster PNG preserves the full Canvas treatment. Neither export embeds the original imported photograph. Both capture the current light state. PNG creation uses the standard [canvas Blob export API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).

## Accessibility, compatibility and limits

The focused canvas supports arrow keys to move a visible cell cursor, Space to place a peg, Delete/Backspace to remove it, Shift+arrows to paint, and Ctrl/Cmd+Z, Shift+Z or Y for history. Escape releases focus. All tools and color buttons have text/accessible names and visible focus. On touch, the drawing surface accepts a captured single-finger gesture; use Move view to pan and the detail slider to zoom. Pinch zoom is not hijacked elsewhere on the page. Use Clear selection then Select to choose a subset. The Subtract selection checkbox removes pegs from that subset on touch; Alt is also available as a keyboard shortcut.

The art itself is visual; textual counts, tool state, instructions, JSON exports and the original examples remain available. If Canvas 2D is unavailable, a clear static fallback explains the limitation. Browser decoder format support may vary. Automated interaction tests use Chromium and Playwright WebKit on macOS. The running page was also opened and checked for successful rendering in desktop Safari. Physical iOS devices have not been tested; their memory, touch and decoding limits can differ.

Original code, original parametric moth/garden/orbital/wave drawings and generated preview are MIT-licensed. No external assets or third-party runtime packages are required. Files retain the included license when reused.

## Verification

With the local production preview running, use `pnpm test:light-peg-studio`. Model checks cover continuous interpolation, flood-fill boundaries, reversible edits and grid changes, redo invalidation, strict document validation, actual quantization/dither differences, selected-only deterministic animation and original examples. Browser checks cover pointer/touch/keyboard tools, material rendering, resize/zoom, undo/redo, local image conversion without uploads, exports/presets, source ZIP and a separately served standalone instance, reduced motion, rest and lifecycle cleanup.
