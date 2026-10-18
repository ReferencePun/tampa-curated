# Living Photographic Particles

A working independent effect at /lab/particle-photos/. Image data becomes a field of anchored, expressive marks. No Stories-page code, global site state, Three.js or other runtime package is required.

## Interaction and materials

Ink engraving combines luminance-weighted stippling, scratches and crossed marks. Local image gradients orient the strokes. Cursor movement increases detail and displaces the surrounding marks. Disintegration pulls the same instances away from their image coordinates; Reassemble returns them. Photographic reveal resolves the fragments themselves into clear, textured patches under an irregular cursor field. There is no photographic plane beneath a reveal mask.

Show original resolves the same instanced quads into a continuous, full-color photograph. Leave the plate to settle it exactly. The renderer stops requesting frames when its state reaches rest. Open field note resolves the plate and opens a semantic content panel; Back to the engraving reverses the transition. The bubbling particle-photo:open event contains the selected id and title, allowing an embedding application to coordinate its own navigation.

Mouse/trackpad movement, finger dragging, and focused arrow keys drive the same normalized focus. Escape releases it. Reduced motion starts held and applies gestures/settings immediately. Pause stops easing; explicit interaction can still change the held drawing. All labels and buttons remain HTML.

The three bundled photographs have landscape and portrait proportions. A photo is contained, not cropped: original composition and aspect ratio survive resizing. Upload a local PNG, JPEG or WebP under 12 MB and 24 megapixels. Images are decoded, sampled and textured locally with no upload request. Transparent pixels are composited onto ivory. Custom photos stay in this session, and are not saved in presets or source exports. Save still exports the current canvas as PNG; named presets save settings and the selected bundled-photo id.

## Complete portable example

Extract the ZIP, serve the folder over local HTTP, and open example.html. There is no install/build step. For the three-image gallery and content transition, open:

    creative-lab/experiments/particle-photos/gallery-demo.html

The gallery adapter mounts at most two visible instances, releases offscreen renderers, pauses hidden tabs, and leaves accessible ordinary images in unmounted slots. It uses the same effect as a single plate. gallery-demo.js shows an effect resolving into a separate article and returning to the gallery without any Tampa routing.

## Single-image API

```js
import {createParticleImage} from './engine.js';
import {loadPhoto} from './images.js';

const settings = {mode:'reveal', radius:25, displacement:30, density:300};
const image = await loadPhoto('/my-photo.jpg'); // same origin or CORS permitted
const effect = createParticleImage({
  image, width:800, height:600, settings,
  onFrame(stats) { /* measured frames, count, backend, state */ },
  onContextLoss() { /* dispose and remount with forceCPU:true */ }
});
document.querySelector('#my-image').append(effect.canvas);
effect.resize(800, 600, devicePixelRatio);
effect.setRunning(true);
effect.pointer(.5, .4, true); // normalized coordinates within the fitted image
// Pointer position from the canvas: subtract view[0,1], divide by view[2,3].
const fittedImageRect = effect.view;
effect.leave();
effect.update({...settings, scatter:100});
effect.update({...settings, original:true, scatter:0});
const still = await effect.exportPNG();
effect.setRunning(false); // offscreen, page hidden, or user pause
// Later, before removing it:
effect.dispose();
```

The source can be a decoded HTMLImageElement, ImageBitmap or canvas. loadPhoto is an optional URL/image helper. Dimensions supplied to resize are CSS pixels; device pixel ratio is capped at 1.75. setImage(nextDecodedImage) replaces the current image without creating another graphics context. update accepts a partial recipe over defaults; pass your retained full settings when changing one field. forceCPU:true selects the smaller Canvas 2D renderer. Its marks are coarser and color treatment simpler, but still image-derived and interactive.

For the complete control panel, import mount from index.js and use the standard Lab lifecycle: update(settings), setRunning(boolean), replay(), dispose(). The instrument automatically handles resizing, pointer/touch/keyboard events, graphics interruption, local upload and the detail panel. The parent is responsible for visibility and pause; the included standalone adapter demonstrates both. mountGallery(root, items, {onOpen}) in gallery.js accepts items containing id, name, url, alt, credit, source and note. Keep essential alt text and content outside a bare canvas when integrating the engine directly.

## Settings

| Key | Meaning | Range / default |
| --- | --- | --- |
| mode | engraving, scatter, or reveal | engraving |
| photo | bundled palms, portrait, or facade (instrument only) | palms |
| radius | focus reach as a percentage of the image's shorter side | 6–45 / 23 |
| displacement | cursor-driven separation, scaled to image size | 0–100 / 32 |
| scatter | global displacement of anchored fragments | 0–100 / 0 |
| density | samples along the image's longest edge | 120–420 / 300 |
| markSize | weight of engraved marks | .5–1.7 / 1 |
| contrast | power curve applied to ink darkness | .65–1.8 / 1.15 |
| settle | multiplier on easing duration; larger is slower | .4–2.4 / 1 |
| ink | six-digit engraving color | #343129 |
| original | resolve the same fragments into the original photo | false |
| guides | show plate labels and construction corners (instrument) | true |
| seed | deterministic variation in the marks | 1–999 / 7 |

Style presets include Drypoint & graphite, An image in flight, Beneath the emulsion, and A portrait in stipple. Changes to density and seed rebuild the instance attributes after a short debounce. Other controls update uniforms/state without resampling the image. Selecting a photograph replaces one texture and one instance buffer. Source export includes the current validated recipe and every dependency/asset of this effect.

## How it works

A bounded sampling canvas measures image luminance and horizontal/vertical gradients. Every grid cell becomes a GPU instance with an immutable normalized anchor, luminance, edge strength, gradient direction, deterministic random values and source color. There are at most 176,400 instances; actual count follows the image's aspect ratio. Light areas retain less ink. Jitter, elongated marks and gradient-aligned hatching avoid a regular pixel mosaic.

WebGL2 draws a four-vertex instanced quad per mark in one draw call. The vertex shader moves each fragment using its anchor, random scatter direction, focus distance and current eased state. The fragment shader shapes the mark or resolves its own small source-image patch. In the fully resolved state, contiguous patches meet to reconstruct the photograph. No DOM particles, photographic opacity-mask plane, time-driven noise, remote shader or prerecorded sequence is involved.

Focus and scatter state converge with exponential damping, clamp long frame delays, and snap within a small threshold. Input requests render work; stationary/untouched plates stop. Sample buffers do not change during pointer movement. The CPU fallback uses the same displacement equations with up to 120 samples along the longest side. The GPU path keeps one program, one buffer, one vertex array and one texture per instance. Textures are capped at 1536px along the longest side, independently of the uploaded file's dimensions. Full canvas readback occurs only for an explicit still export or a test.

The instrument cancels stale image decodes, disposes replaced resources, revokes local object URLs, and releases observers, listeners, timers, animation callbacks, buffers, textures, programs, shaders, vertex arrays and the graphics context on disposal. The gallery additionally bounds concurrent contexts and releases those outside the viewport. A lost graphics context switches the main instrument to the CPU implementation; the gallery retains its accessible original image.

## Source map

- model.js: validated settings, recipes, pure sampling and displacement, easing.
- images.js: independent photo definitions, local loading, aspect-preserving sampling.
- shaders.js / renderer.js: original instanced GPU renderer and Canvas fallback.
- engine.js: reusable image engine, resizing, update scheduling and disposal.
- index.js / styles.js / style.css: complete instrument and content-view example.
- gallery.js / gallery-demo.html / gallery-demo.js: bounded gallery integration.
- assets/: three photographs, derived SVG still and PHOTO-CREDITS.md.

## Reference and licenses

Studied [Eddy Naboulet's portfolio](https://eddy-naboulet.dev/) in its Projects view at rest and under the pointer. The relevant ideas are image-derived forms, local pointer response and image-to-content continuity. The creator describes these techniques in his [Communication Arts interview](https://www.commarts.com/webpicks/eddy-naboulet). Its dark desktop composition, CRT effects, typography, artwork and code are not reproduced here.

Original implementation: MIT, see LICENSE. Photographs: Brandon Burridge, Christopher Campbell and Ikuna under the [Unsplash license](https://unsplash.com/license), not MIT. Individual source URLs and licensing notes are in assets/PHOTO-CREDITS.md and the export's ASSETS.md. Preserve the applicable photo license/credit when reusing the bundled demonstration images.

## Verification

pnpm test:particle-photos checks deterministic image-derived sampling, gradient/contrast differences, real displacement, exact anchor return, bounded easing and aspect fitting. Browser checks exercise all treatments, GPU rendering, source independence, pointer/touch/keyboard input, original toggling, image changes, local uploads, portrait resizing, presets, PNG/source exports, the field-note round trip, standalone and gallery examples, idle/hidden rest, reduced motion, fallback and resource cleanup.
