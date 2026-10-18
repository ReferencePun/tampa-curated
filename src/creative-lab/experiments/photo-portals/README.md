# Photo Portals — enter a photograph

A standalone Three.js instrument: an engraved photographic frame opens into a real, projectively registered depth mesh. Its deterministic camera path crosses z=0, the original picture plane. Reverse progress exactly retraces the journey. The frame stays in space; it is neither scaled nor faded to imitate travel.

## Try it

Scroll over the picture, drag up/down on touch, use the scene's arrow keys (Shift for larger steps, Home/End), or scrub the progress slider. Scroll outward at either end to continue through the page. Enter moves to the final view; Hold stops at the actual intermediate position; Return retraces it. Reduced motion starts paused and manual inputs change position immediately. The outer Lab pause stops interpolation and holds the current view.

The two photographs have hand-painted grayscale depth estimates. Use the four named recipes to explore a graphite drawing, an emerging threshold, a courtyard and the view within. Illustration/photo blend changes the actual textured surface shader, with image-derived edges, hatching and paper tone.

## Two rendering modes, with honest limits

**A / Layered photograph:** a tessellated photograph with supplied depth. White is near, black is far. Vertices recede into the frame; their x/y coordinates expand along the original eye rays so the flat photographic composition remains registered. The approaching camera then produces genuine differential parallax. This is **limited 2.5D**, not a recovered building or 360° scene. It cannot recover occluded surfaces. Fine foliage and discontinuities stretch; large sideways movements are intentionally restricted. No generative fill or fabricated geometry is substituted.

**B / Gaussian-splat loader:** an actual Spark 2.3.1 renderer, dynamically loaded only when needed. No suitable, licensed reconstruction corresponding to the demo photographs was available, so this mode deliberately ships without a scene. Load your own reconstruction; the instrument centers its bounds and suggests a scale. It captures a matching photographic poster from the original camera and uses the same coordinate system as you move into the splats. This is an asset loader, not a reconstruction service. Alignment controls adjust scale, translation and Euler angles; Recapture updates the poster. The reference poster is captured from the asset itself, never an unrelated stock image.

Spark references: [SplatMesh API](https://sparkjs.dev/docs/splat-mesh/), [renderer](https://sparkjs.dev/docs/spark-renderer/), [on-demand rendering](https://sparkjs.dev/docs/on-demand/), [MIT source](https://github.com/sparkjsdev/spark).

## Start the exported package

Extract the source ZIP, run `python3 -m http.server 8080`, and open `http://localhost:8080/example.html`. Do not use file://. The exact Three.js and Spark browser modules, Three's FullScreenQuad helper, their licenses, sample photographs and depth maps are local. Spark includes its decoder WASM and worker code. No CDN, Tampa pages, Stories logic or build step is required. A bundler integration can instead install the exact versions declared in package.json.

## Complete instrument

```js
import {mount} from './creative-lab/experiments/photo-portals/index.js';
const effect = mount(sizedElement, {
  mode: 'layered', progress: 0, depth: 1.2, parallax: 0.65,
  blend: 0.72, quality: 'medium', cameraX: 0, cameraY: 0, guides: true
}, stats => console.log(stats), {
  image: '/my-courtyard.jpg',
  depth: '/my-courtyard-depth.png'
});
effect.setRunning(true);
// Connect visibility to setRunning; stop when offscreen or document.hidden.
effect.update({...settings, progress: 75});
effect.replay();
effect.dispose(); // before removing the host
```

Use a positioned host with at least 1000px height (1250px on narrow screens) for the complete controls. Its styles are injected and scoped. `style.css` supplies the generic export wrapper. Host applications can listen to bubbling `lab:settings` and `lab:set-pause` events. Source and preset exports contain controls only; local images, depth maps and splats must be supplied again. Scene registration is session state; copy it into your integration schema to retain it.

## Viewer without the demonstration UI

```js
import {createPortalViewer} from './creative-lab/experiments/photo-portals/viewer.js';
import {DEFAULTS} from './creative-lab/experiments/photo-portals/transition.js';
const viewer = createPortalViewer(canvas, DEFAULTS, {
  onDirty: () => requestRender() // coalesce into your next animation frame
});
await viewer.setImage({image:'/courtyard.jpg', depth:'/depth.png'});
viewer.resize(960,600);
viewer.render(0); // progress 0..100, optional normalized pointer [x,y]
viewer.render(65, [0.2,-0.1]);
viewer.update({...DEFAULTS, depth:1.5});
viewer.render(100);
viewer.dispose();
```

`transition.js` has pure `sampleTransition`, `reliefPoint`, `sampleDepth` and `validateRegistration` functions. `scene.js` creates the photo mesh and mechanical frame. `viewer.js` owns Three resources. `splat.js` alone imports Spark. `samples.js` supplies demonstration content. The viewer can be embedded in a gallery: mount only visible images and dispose distant ones; do not run many splat renderers simultaneously.

## External splat assets and coordinate system

First load a photograph using `setImage` to establish frame aspect ratio, then switch the viewer to splat mode. The supplied photograph is replaced by a captured poster when the scene is ready:

```js
viewer.update({...DEFAULTS, mode:'splat'});
await viewer.setSplat({url:'/my-scene.spz'}, {
  position:[0,0,-7], rotation:[Math.PI,0,0], scale:1
});
viewer.render(0);
viewer.render(100);
// For local assets, use {fileBytes: Uint8Array, fileName:'scene.splat'}.
viewer.register({position:[0,0,-8], rotation:[Math.PI,0.1,0], scale:0.8});
await viewer.capturePoster();
```

The original frame is centered at the origin, in XY; +Y is up, the camera travels toward negative Z, and its final Z is -1.15. A scene's geometry is centered on its bounding box before the outer registration transform is applied. Rotation is XYZ Euler radians, uniform scale must be positive. Omit registration for a suggested fit. Keep important geometry in front of the final camera (negative Z), and recapture after alignment. Responsive field-of-view changes retain the original reference eye. Prefer source captures with a natural entrance and sufficient reconstruction coverage. Photograph-to-splat matching is guaranteed only for this captured viewpoint, not for arbitrary external photos.

## File preparation

- Photographs: browser-decodable JPEG, PNG or WebP; picker limit 20 MB, decoded limit 60 megapixels, long edge resized to 2048px. Supported aspect ratios 1:3 to 3.5:1. Same-origin or CORS-enabled URLs for integrations.
- Depth maps: same crop, orientation and proportions as the photo; grayscale PNG recommended, white near and black far. Softened boundaries reduce tearing. Maps are downsampled to a 256px-wide CPU field and bilinearly sampled. Built-in SVG estimates use no external resources. Picker accepts raster formats only.
- Without depth, custom imagery is intentionally flat and labeled as needing a map. This is not automatic monocular depth estimation.
- Splat picker: `.ply` (Gaussian-splat PLY), `.splat`, `.ksplat`, `.spz`; maximum 64 MB. Ordinary triangle-mesh PLY is not a reconstructed splat scene. The viewer API may accept other formats supported by the pinned Spark release, but these four are the demo's declared formats. No multi-file scenes or paged streaming UI.
- Prepare splats in a tool such as a Gaussian-splat capture pipeline, prune distant outliers, orient consistently and downsample before delivery. Prefer fewer than 500,000 splats for mobile. A small compressed file can still expand to a large GPU allocation; the file limit is not a memory guarantee.
- Keep asset licenses and permissions. The demo's photographs retain the Unsplash License; original code, frame artwork and estimated depth drawings are MIT. See assets/PHOTO-CREDITS.md and exported ASSETS.md.

## Controls

| Setting | Range | Meaning |
| --- | --- | --- |
| mode | layered / splat | Depth mesh or your real scene |
| image | palms / facade | Demo photo; custom media overrides it during this session |
| progress | 0–100 | Fully reversible camera travel |
| depth | 0–2.5 | Relief range in Mode A (0 makes uniform depth) |
| parallax | 0–1.5 | Small pointer offset during travel |
| blend | 0–1 | Graphite → photograph on the image surface |
| cameraX / cameraY | -1–1 | Persistent subtle viewpoint offsets |
| quality | low / medium / high | 64 / 128 / 224 horizontal mesh segments, bounded pixel ratio |
| guides | boolean | Construction rails and sparse depth cross sections |

Depth and image illustration apply to Mode A and the photographic poster; real splats retain their captured color. Quality changes photo tessellation and pixel ratio; it does not decimate the user's splats. Progress presets remain portable; uploads and alignment are never serialized into browser storage.

## Performance, lifecycle and compatibility

WebGL2 required. Current Chromium and WebKit are exercised by the repository's browser suite. Spark additionally uses Web Workers, WebAssembly and blob worker URLs; a restrictive CSP must permit those mechanisms. Its runtime is lazy, so Mode A does not load the heavy decoder. Desktop is recommended for larger splat scenes. The renderer stops at rest, pauses interpolation when inactive, and releases geometry, textures, listeners, object URLs and GPU resources on disposal. File loads use generation checks to discard obsolete results. Splat sorts are coalesced and awaited before releasing their worker and graphics context, so switching modes does not interrupt an outstanding worker promise. Reduced motion disables hover parallax and animated interpolation, with explicit manual positions available. Context loss retains the current position; restoration redraws it. A static illustrated plate covers no-WebGL/no-JavaScript cases.

## Validation

Run `pnpm test:photo-portals`, `pnpm lint:lab`, `pnpm check`, `pnpm build`, `pnpm verify`, `pnpm test:lab` and `pnpm test:navigation` in the parent repository. Numerical tests check ray registration, depth sampling, deterministic reverse camera travel and scene alignment validation. Browser checks exercise real rendering, image/depth uploads, the actual Spark decoder with an explicitly synthetic test fixture, source export, standalone operation, pointer/touch input and disposal. Test fixtures are not presented to visitors as reconstructions.
