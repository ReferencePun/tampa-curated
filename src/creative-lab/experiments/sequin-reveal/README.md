# Sequin Reveal

An independent, tactile photographic surface with individually hinged, beveled tiles. This package contains its own model, Three.js renderer, input UI, photographs and credits. No Tampa page code is required.

## Run

Unzip the source export, run `python3 -m http.server 8080` in its root, and visit `http://localhost:8080/example.html`. Three.js 0.186.1 is included locally with an import map and MIT license. No installation or build is required. The additional gallery example is at `creative-lab/experiments/sequin-reveal/gallery-demo.html`.

For a bundler, install `three@0.186.1` and keep the effect directory and its assets together. Serve over HTTP; do not open ES modules with `file://`.

## Independent renderer

```js
import {createSequinSurface} from './engine.js';
import {DEFAULTS} from './model.js';

const surface = await createSequinSurface({
  image: '/my-image.jpg', // URL, decoded HTMLImageElement or canvas
  width: 900, height: 600,
  settings: {...DEFAULTS, mode: 'reverse', material: 'silver'},
  onComplete: ({completion}) => console.log('Photograph revealed', completion),
  onFrame: statistics => console.log(statistics),
  onContextLoss: () => showStaticPhotograph()
});
container.append(surface.canvas);
surface.setRunning(true);
surface.brush([.15,.4], [.65,.45], 1.4); // normalized start/end, speed in image lengths/s
surface.revealAll();
surface.reset();
surface.update({...surface.settings, hinge: 'vertical'});
await surface.setImage('/another-image.jpg'); // reuses the context; replaces the single texture
surface.resize(container.clientWidth, container.clientHeight);
const blob = await surface.exportPNG();
surface.setRunning(false); // freeze when hidden or offscreen
surface.dispose();        // idempotent, call before removing
```

`surface.view` gives the contained image rectangle `[x,y,width,height]` in CSS pixels. Normalize pointer coordinates relative to that rectangle. The demo preserves complete image content with a grid aspect rounded to the nearest row/column (no crop; at most one cell of aspect approximation). Input aspect ratios from 1:20 to 20:1 are supported. URL images need same-origin access or appropriate CORS headers. Local file URLs are temporary and never transmitted.

The underlying `TileState` class in `model.js` has no DOM or renderer dependency. It stores angles, velocities, targets, delay times and close times in compact typed arrays. `brush`, `wave`, `snap`, `advance` and `statistics` support custom controls. `advance` takes seconds; the renderer uses bounded deltas so a hidden tab does not jump on return. Its exact critically damped spring step avoids unstable explicit Euler integration. There is no ambient idle animation.

## Complete UI

```js
import {mount} from './index.js';
const effect = mount(host, settings, statistics => {}); // host needs a height, e.g. 1000px
// Host supports the Lab/standalone lifecycle:
effect.setRunning(true);
effect.update(nextCompleteSettings);
effect.replay();
effect.dispose();
```

`lab:settings` bubbles validated changes for the shared inspector, preset storage and source export. `sequin:complete` fires on a completed reveal; `sequin:open` marks the transition to the photo's content view. The standalone gallery demonstrates that transition without the Tampa host. Pause leaves the current intermediate geometry visible; deliberate interaction while paused/reduced-motion applies immediately. Keyboard arrows brush, Enter reveals the full surface and Escape releases focus. Native page scrolling remains available outside the surface; touch dragging inside paints the tiles.

## Settings

| Key | Values / meaning |
| --- | --- |
| `mode` | `uncover` or `reverse` |
| `photo` | Demo only: `portrait`, `palms`, `facade` |
| `density` | Integer 24–112 along the longest edge; up to 12,544 tiles |
| `tileSize` | 0.65–1 of a cell before spacing |
| `spacing` | 0–0.24; size multiplier is `tileSize × (1 − spacing)` |
| `hinge` | `horizontal`, `vertical`, `diagonal`; centered axes keep image pieces registered |
| `angle` | 45–180 degrees for brushing; uncover mode caps at 90° |
| `speed` | 0.35–2.5; spring response and coordinated-wave speed |
| `radius` | 4–32 percent of the shorter image edge |
| `delay` | 0–240 milliseconds; peripheral ripple lag |
| `influence` | 0.35–1.8; strength and coverage of brush field |
| `material` | `silver`, `graphite`, `brass`, `paper`, `ink`, `iridescent`, `mirror` |
| `light` | 0–360 degrees; light position around the surface |
| `persistence` | `hold` stays open; `close` closes brushed tiles after a delay |
| `resetDelay` | 0.5–12 seconds of active simulation time |

The pure `options` function validates values; `DEFAULTS` and six `PRESETS` are exported. Reveal all always turns every tile to 90°/180° and holds it there, independently of the brush angle and automatic close setting. Reset schedules a diagonal wave. A new image, density, mode or hinge rebuilds/resets the appropriate geometry so old image pieces cannot be misregistered. Changes to lighting/material preserve the drawing.

The UI accepts local PNG/JPEG/WebP images up to 12 MB and 24 megapixels. Decoding and texture preparation happen locally; textures are capped at 2048 pixels. Uploads live only in the current session and are not saved into settings, source ZIPs or browser storage. Source and preset exports retain the selected bundled photograph. PNG export saves the actual current surface.

## Physical rendering and limits

One `InstancedBufferGeometry` combines a thin bevelled square and two stationary bearing caps. Each instance has a stable center, seed and spring-controlled angle. Geometry and normals rotate around the same hinge in the vertex shader. The caps stay fixed, making the pivot relationship visible. Material shading includes directional light, a restrained procedural studio reflection, per-tile variation and fine brushed grain. These are approximate material responses, not ray-traced mirrors or simulated reflective scenes. Paper/ink and iridescence use the same actual geometry.

Uncover mode places a separate photograph behind the full maximum hinge sweep, preventing intersection/z-fighting. A thin, real rear lattice supports the pins and blocks light leaking through closed seams. At 90° the tiles are almost edge-on; their thickness and the perspective still leave slight physical slivers. Reverse mode hides that image plane: the image exists only on the tile backs. Its UVs are derived from each face's final 180° position, including diagonal hinges, so pieces are not mirrored or shifted by a row. Gaps, bevels and bearing caps remain visible. The complete reverse image is a tiled photograph, not an opacity overlay.

A pointer sweep measures distance to the entire previous/current segment, avoiding holes from fast movement. Velocity widens the field within a bound. Tile rotation decreases with distance; peripheral scheduling delays form the ripple. Every spring has deterministic state. Geometry stays in a single tile draw call; the backing, photograph and thin rear support lattice add at most three more. There are no per-tile DOM elements or shadow maps.

Resource use is bounded by density and image size. Resize changes the camera and viewport without rebuilding tiles. One renderer is reused on image changes. The previous image texture is disposed before allocating its replacement, including dimension changes that require fresh immutable storage in WebKit. Work stops at rest, offscreen and in hidden tabs. Dispose cancels animation and pending image generations, disconnects UI observers, removes listeners, releases geometries/materials/textures, clears canvas backing storage, revokes file URLs and destroys the WebGL context. Heavy scenes are deliberately excluded from simultaneous Lab comparison.

WebGL2 and modern ES-module/PointerEvent APIs are required. A static photograph and content view remain available if WebGL cannot start or a context is lost. The preview is tested in Chromium and Playwright WebKit, including simulated touch; this does not certify every physical Safari/iOS GPU.

## Assets and license

Original code, geometry, shaders and UI: MIT. Three.js: MIT, bundled separately in source exports. Three bundled photographs retain the Unsplash license and credits in `assets/PHOTO-CREDITS.md`. No trademarked product interface, reference-site code or external animation is included. Supply your own images or retain the relevant credits when reusing the demo photos.

## Verification

`pnpm test:sequin-reveal` runs model and browser tests with the local production preview at port 4321. Checks cover contiguous fast strokes, velocity/ripple behavior, stable reversible springs, all hinge UVs, delayed closing, complete/reset waves, live settings, image aspect changes, local uploads, reduced motion, touch, resize without rebuilds, presets, PNG, source ZIP, standalone renderer reuse and disposal. Diagnostic screenshots remain in ignored `test-results/sequin-reveal/`.
