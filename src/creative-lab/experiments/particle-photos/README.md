# Living Photographic Particles

A working independent effect at /lab/particle-photos/. Image data becomes a field of tiny anchored grains. The default treatment uses amber, rust and cream horizontal dashes on a dark charcoal image plate. No Stories-page code, global site state, Three.js or other runtime package is required.

## Interaction and materials

The default Amber photographic dust treatment uses fine image-derived horizontal dashes. Highlights carry cream and amber grains; darker shapes fall into rust and charcoal. The Drypoint & graphite preset retains the alternative ivory-paper engraving. Cursor movement increases detail and gently displaces the surrounding marks. Disintegration pulls the same instances away from their image coordinates; Reassemble returns them. Photographic reveal uncovers a registered photograph beneath an irregular cursor field while actual image-derived particles move above it. A fast sweep paints a connected wake rather than isolated circles. That wake lingers and fades back into grains; a stationary cursor keeps a central patch completely clear. This core reconstructs the source photograph at full opacity in every treatment, including engraving. The photograph stays fixed throughout the interaction; only the grains are displaced.

Show original uncovers the continuous, full-color photograph and fades away the particle layer. Leave the plate to settle it exactly after the wake fades. The renderer stops requesting frames when its state reaches rest. Open field note resolves the plate and opens a semantic content panel; Back to the engraving reverses the transition. The bubbling particle-photo:open event contains the selected id and title, allowing an embedding application to coordinate its own navigation.

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

const settings = {mode:'reveal', surface:'night', radius:14, trail:1.2, displacement:24, density:320};
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
| mode | engraving, scatter, or reveal | reveal |
| surface | night (amber/charcoal) or paper (ink/ivory) | night |
| photo | bundled palms, portrait, or facade (instrument only) | palms |
| radius | focus reach as a percentage of the image's shorter side | 6–45 / 14 |
| displacement | cursor-driven separation, scaled to image size | 0–100 / 24 |
| scatter | global displacement of anchored fragments | 0–100 / 0 |
| density | samples along the image's longest edge | 120–420 / 320 |
| markSize | weight of engraved marks | .5–1.7 / 1 |
| contrast | power curve applied to ink darkness | .65–1.8 / 1.15 |
| settle | multiplier on easing duration; larger is slower | .4–2.4 / 1 |
| trail | seconds for a swept reveal to fade after leaving it | .1–2.4 / 1.2 |
| ink | six-digit engraving/grain color | #dfb879 |
| original | resolve the same fragments into the original photo | false |
| guides | show plate labels and construction corners (instrument) | true |
| seed | deterministic variation in the marks | 1–999 / 7 |

Style presets include Amber photographic dust, Drypoint & graphite, An image in flight, Beneath the emulsion, and A portrait in stipple. Changes to density and seed rebuild the instance attributes after a short debounce. Other controls update uniforms/state without resampling the image. Selecting a photograph replaces one texture and one instance buffer. Source export includes the current validated recipe and every dependency/asset of this effect.

## How it works

A bounded sampling canvas measures image luminance and horizontal/vertical gradients. Every grid cell becomes a GPU instance with an immutable normalized anchor, luminance, edge strength, gradient direction, deterministic random values and source color. There are at most 176,400 instances; actual count follows the image's aspect ratio. On charcoal, brighter areas carry more illuminated grains. On ivory, dark areas retain more ink. On charcoal, softly edged horizontal dashes retain a lightly jittered raster pattern, bending gently with the local ripple direction. The ivory treatment retains varied oval marks and gradient-aligned hatching. A shared pigment ramp maps the photograph into dark rust, amber and cream.

WebGL2 uses a four-vertex instanced quad per mark. A first pass reconstructs the photograph at its unchanged image coordinates. A second pass draws the fine marks with per-particle displacement from the pointer ripple field. Their image-derived luminance, edge direction, scatter direction and individual gain preserve the photographic composition. The reveal field controls both the stationary photograph's visibility and the displaced grains' opacity. This is actual moving particle geometry over a registered photograph, with no DOM particles or prerecorded motion.

A bounded 128 × 128 single-channel field records the swept pointer path with a broad irregular feather. Input interpolates each complete pointer segment, so quick gestures leave a connected wake. A small fully clear center grades continuously into partially resolved photographic fragments and then untouched grains. The field decays continuously toward the current cursor footprint over `trail` seconds; it has no hold-and-switch threshold. Photo and particles render in separate passes. The photo pass remains registered; particle opacity samples the reveal at each displaced destination, keeping clear areas free of drifting grains. Reduced motion applies the current footprint immediately and clears it on exit.

A separate 96 × 96 height field implements a damped two-dimensional wave equation. Pointer movement deposits pressure continuously along every swept segment. The height gradient moves particles away from crests and into troughs: neighboring regions visibly expand and compress instead of moving together. Waves originate along the visitor's actual path, including bends; a stationary cursor adds no energy. Narrow pressure deposits produce a local ripple response, while absorbing boundaries prevent reflections from shaking the whole image. Per-particle gain varies slightly to preserve the granular character. Bounded substeps, damping and a final fade return the field to exact rest after 2.3 seconds. Two signed 16-bit slope components pack into one bilinearly filtered RGBA8 texture shared by GPU and CPU rendering. `grain.js`, `wake.js` and `flow.js` also drive Stories, without depending on that archive.

Focus and scatter state converge with exponential damping, clamp long frame delays, and snap within a small threshold. Input requests render work; stationary/untouched plates stop. Sample buffers do not change during pointer movement. The CPU fallback uses the same displacement equations with up to 120 samples along the longest side. The GPU path renders a fixed photographic mosaic and then displaced grains in two draw calls. It keeps one program, one buffer, one vertex array, one image texture, one small wake texture and one small flow texture per effect. Textures are capped at 1536px along the longest side, independently of the uploaded file's dimensions. Full canvas readback occurs only for an explicit still export or a test.

The instrument cancels stale image decodes, disposes replaced resources, revokes local object URLs, and releases observers, listeners, timers, animation callbacks, buffers, textures, programs, shaders, vertex arrays and the graphics context on disposal. The gallery additionally bounds concurrent contexts and releases those outside the viewport. A lost graphics context switches the main instrument to the CPU implementation; the gallery retains its accessible original image.

## Source map

- model.js: validated settings, recipes, pure sampling and displacement, easing.
- images.js: independent photo definitions, local loading, aspect-preserving sampling.
- shaders.js / renderer.js: original instanced GPU renderer and Canvas fallback.
- grain.js: shared amber pigment and horizontal-dash material for GPU and Canvas rendering.
- wake.js: reusable swept reveal field, continuous material blending and bounded decay.
- flow.js: portable pointer-driven ripple field, fixed-size state, CPU sampling and shared GLSL decoding.
- engine.js: reusable image engine, resizing, update scheduling and disposal.
- index.js / styles.js / style.css: complete instrument and content-view example.
- gallery.js / gallery-demo.html / gallery-demo.js: bounded gallery integration.
- assets/: three photographs, derived SVG still and PHOTO-CREDITS.md.

## Reference and licenses

Studied [Eddy Naboulet's portfolio](https://eddy-naboulet.dev/) in its Projects view at rest and under the pointer, including the user-supplied recording of its fine amber dashes and trailing photographic reveal. The recording is a visual reference and is not redistributed. The relevant ideas are image-derived forms, local pointer response and image-to-content continuity. The creator describes these techniques in his [Communication Arts interview](https://www.commarts.com/webpicks/eddy-naboulet). Its desktop layout, CRT effects, typography, artwork and code are not reproduced here.

Original implementation: MIT, see LICENSE. Photographs: Brandon Burridge, Christopher Campbell and Ikuna under the [Unsplash license](https://unsplash.com/license), not MIT. Individual source URLs and licensing notes are in assets/PHOTO-CREDITS.md and the export's ASSETS.md. Preserve the applicable photo license/credit when reusing the bundled demonstration images.

## Verification

pnpm test:particle-photos checks deterministic image-derived sampling, gradient/contrast differences, real displacement, exact anchor return, bounded easing, gap-free swept trails, gradual intermediate coverage, opposing particle displacement, crest/trough propagation, curved wakes, exact settling, reduced-motion release and aspect fitting. Browser regression checks compare the pixels under the cursor against the fully resolved source in all three modes, and in the Stories archive. Browser checks exercise all treatments, GPU rendering, source independence, pointer/touch/keyboard input, original toggling, image changes, local uploads, portrait resizing, presets, PNG/source exports, the field-note round trip, standalone and gallery examples, idle/hidden rest, reduced motion, fallback and resource cleanup.
