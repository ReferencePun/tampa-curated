# Elsewhere / Reel Viewer

An original pocket picture theatre for `/lab/view-master`. No commercial toy branding or product artwork is included. Code, procedural worlds and preview illustration: MIT. Photographs: Unsplash license, with individual attribution in assets/PHOTO-CREDITS.md.

## Run the exported package

Serve the extracted directory over HTTP (`npx serve .`, or any static server). Open example.html for the complete viewer and Lab preset; open embed-demo.html for a small custom-reel integration. All runtime code and sample images are bundled. No CDN, framework, network API or build step is required. `file://` module loading is not supported by browsers.

## Integrate the toy

```js
import { mount } from './creative-lab/experiments/view-master/index.js';
const viewer = mount(document.querySelector('#toy'), {mode:'stereo',depth:0.55}, console.log, {
  reel: {version:1,id:'portfolio',title:'A few little places',scenes:[
    {id:'harbour',kind:'world',theme:'harbor',seed:0,title:'A small harbour',caption:'An imaginary place.'},
    {id:'photo',kind:'photo',src:'./my-photo.jpg',title:'My photograph',caption:'Your credit here.'}
  ]},
  onSceneChange(scene,index) { console.log(scene.title,index); }
});
viewer.setRunning(true);
// On removal: viewer.dispose();
```

Reserve at least 1450px of height in the embedding container before lazy mounting. The shell is responsive and uses scoped `.rv` styles injected by mount. A ResizeObserver resizes its canvases. Include style.css only when using the Lab/standalone wrapper; the embedding example needs no site CSS.

Returned API: `update(fullSettings)`, `setRunning(boolean)`, `replay()` (first frame), `loadReel(reel)`, `getState()`, asynchronous `exportReel()` (embeds image bytes), `dispose()`. The third argument reports rendering metrics. A bubbling `lab:settings` event reports changes; `lab:set-pause` asks the optional host to resume. They are harmless without a Lab host.

Use IntersectionObserver and document.visibilitychange to call setRunning(false) while inactive. Dispose releases RAF, ResizeObserver, input listeners, image cache and AudioContext. Keep your returned handle while the viewer is mounted. Dispose before remounting the same host. Import decoding is bounded, local and invalidated after disposal.

## Reel schema, version 1

- `version`: 1; `id`: string; `title`: string; optional `description`.
- `scenes`: 1–24 items, in presentation order.
- Each scene: `id`, `kind`, `title`, `caption`.
- `kind: 'illustration' | 'world'`: `theme` is `harbor`, `garden`, `city`, `coast`, `observatory`, or `moon`; optional integer `seed` (0–9999) varies lighted details. These are original imaginary locations, not historical reconstructions.
- `kind: 'photo'`: `src`, a photograph. Aspect ratio is preserved with letterboxing, not cropped to invent depth.
- `kind: 'stereo-pair'`: `left` and `right` image sources, made from genuinely different viewpoints. Supply aligned parallel stereo photographs with matching dimensions and color; do not swap eyes. Start with low depth/disparity. Supplied photographic disparity is already baked in; the depth control affects procedural scenes only.
- The JavaScript API accepts trusted relative URLs, HTTP(S) URLs, and raster data URLs. Remote images require CORS permission for drawing/export. The demo's JSON import accepts embedded PNG/JPEG/WebP data only; it cannot silently fetch a URL from an imported file.
- Local multi-file selection creates embedded JPEG records, capped at 1800 pixels and 18MB per input; up to 24 records. JSON import is limited to 50MB. No file is uploaded.
- Text is inserted via textContent. Imported IDs are normalized to frame indexes. Saving the reel includes its current order and image data; built-in photos retain their original license.

Reordering clones the selected reel into a personal collection. The original sample collections never change. Lab settings/source exports do not include visitors' images or custom order: explicitly save the reel JSON before leaving. The demo does not persist private reels in browser storage.

## Independent scene and transport layers

`createTransport(count)` in model.js owns normalized index, previous index, insertion state and shutter phase. `select(index)`, `advance(direction,reverse)`, `tick(seconds)`, `insert(boolean)` and `reset(count)` are independent of the DOM. Wrapping is deterministic in both directions, including rapid clicks.

`createSceneRenderer(onImageLoad)` in renderer.js supplies `render(canvas, scene, options)`, `preload(scene)`, `clear()` and `dispose()`. Render options: eye offset in world units, pan, zoom, phase, transition, inserted, dpr. The projected cuboids, roofs, domes, trees, railings and boats use the same geometry for each eye. `project(point,eye,width,height,pan)` applies off-axis convergence on the central plane. Near and far points have opposite disparity relative to that plane. The illustration treatment adds contour/hatching; miniature mode uses restrained shaded surfaces. This is a lightweight painter-sorted scene renderer, not a general-purpose mesh engine; avoid interpenetrating arbitrary geometry.

For a custom image gallery, pass your own photo scenes and use onSceneChange to synchronize a content panel. For new procedural scenes, extend architecture() or replace renderer.js behind the same interface; the reel transport and shell stay independent.

## Controls and presets

Defaults live in config.json and model.js; manifest.json declares the same settings for the shared inspector. `PRESETS` contains three complete validated recipes.

- reel: atlas / miniatures / photos / custom (load personal reel first)
- mode: standard / stereo / exploded
- order: forward / reverse; individual scene order can also be edited
- depth: 0–1, procedural eye separation; zero gives identical viewpoints
- zoom: 0.8–1.5, optical image magnification
- spacing: 0.7–1.2, radial reel-window spacing
- transition: shutter / dissolve (through dark) / instant
- palette: vermilion / seafoam / cream / midnight
- clickSound: false by default; explicit Enable click sound remains required even if restored true
- autoplay: false by default; interval: 2–12 seconds

The lever, arrow buttons, keyboard arrows, horizontal swipes and frame selections share one transport. Reel ejection disables advance and freezes autoplay. Insert resumes it. Inspect mode exposes both frame windows and the selected frame enlarged. Settings JSON and the shared Lab presets are separate from reel JSON.

## Stereo and accessibility

Stereo is a pair of parallel, separate viewpoints, not an anaglyph or a claim that a flat display alone becomes three-dimensional. Fuse them with an appropriate parallel-view stereoscope. The two eyepieces show the same view in Standard mode. Mono photographs stay identical in both eyes. No inferred depth, AI reconstruction or arbitrary plane displacement is presented as real stereo.

All controls are HTML, captions are accessible text, and the eyepiece canvases have descriptive labels. Nothing requires sound or stereo fusion. Reduced motion freezes autoplay, snaps transitions, and removes pointer parallax. Buttons still advance. Touch gestures only capture horizontal advances; vertical page scrolling remains available.

Sound is an original procedural triangle-oscillator click at a quiet gain, never a sample. AudioContext is created/resumed in the explicit sound-button event. Muting, hiding the page, host pause and disposal stop sound. Restored settings do not unlock audio; re-enable after a pause. No autoplay audio or external assets are involved.

## Verification

`pnpm test:reel-viewer` checks schema bounds, reversible transport, convergence/disparity, presets, desktop WebKit and Chromium, pointer/touch navigation, image import, JSON roundtrip, stereo alignment, pause, reduced motion, source ZIP and isolated standalone loading. `pnpm lint:lab`, `pnpm check`, `pnpm build` and `pnpm verify` check registration and links. WebKit tests exercise the Safari engine, not a physical iPhone or macOS Safari application.
