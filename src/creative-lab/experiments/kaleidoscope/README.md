# Kaleidoscope — a little world, infinitely reflected

A portable optical renderer, six source modes and a complete local drawing/photograph studio. No accounts, network service, rendering framework or Tampa runtime is needed. Run the root `example.html` through an HTTP server to use the exported studio. `embed-demo.html` is a small, neutral integration with its own source painter.

## Embed the renderer

```js
import { createKaleidoscope } from './engine.js';
const effect = createKaleidoscope(document.querySelector('canvas'), {
  source: 'glass', mirrors: 7, zoom: 1.1, rotationSpeed: 1.2
}, {
  // Optional second canvas shows the unmirrored source.
  sourceCanvas: document.querySelector('#source'),
  frame: stats => console.log(stats.fps),
  change: settings => console.log(settings.rotation)
});
effect.setRunning(true);
// Supply a decoded HTMLImageElement or canvas. Switch to image mode.
effect.setImage(image);
effect.update({ ...effect.getState().config, source: 'image' });
// Lifecycle: pause when your component is inactive, dispose on removal.
effect.setRunning(false);
effect.dispose();
```

The studio uses modern CSS container queries to adapt to narrow embeds and an HTML dialog for the immersive view. Give the optical canvas a square CSS size, `touch-action:none`, a focusable tabindex and an accessible name. The engine watches resizing, intersection and document visibility. It begins paused. A reduced-motion-aware host should call `setRunning(false)` until the visitor explicitly opts in. The supplied studio and standalone wrapper already do this. Offscreen animation has no catch-up; manual edits can still render a still frame.

`update(settings)` accepts a full configuration; use `getState().config` when patching. `center()`, `rearrange()`, `replay()`, `undo()`, `redo()`, `clear()`, `setImage(image)`, `serialize()`, `restore(document, decodedImage)`, `exportCanvas(size)` and `dispose()` are public. `getSourceState()` returns a safe copy. `exportCanvas` accepts 256–4096 px. `dispose()` is idempotent. `setImage` snapshots the decoded image onto a canvas capped at 1600 px, freezing animated formats at their decoded frame. Host code owns image loading; the optional studio guards async decode/import races and object-URL cleanup.

## Source contract and reuse

A `drawSource(canvas, config, state, image)` hook replaces all sample artwork. Fill the entire square canvas. It is sampled in normalized coordinates −1…1. This can be a photo gallery, a video frame, procedural art, drawings or a rendered 3D scene. A gallery swaps decoded images with `setImage` without destroying the mirror system. Background integrations can use `interaction:'off'`, `border:'none'`, and a custom painter. See the neutral example for a two-color original source.

`state.objects` holds 85 deterministic sample objects. Their `dx`/`dy` offsets are editable in the source chamber. Custom sources can ignore these, or interpret their own data in the painter. `state.time.source` advances by `animationSpeed`; `state.time.rotation` advances by `rotationSpeed`. Pause stops both clocks. Input remains usable while still. The renderer uses the same `foldPoint` inverse mapping for drawing as for reflected sampling. Small seam crossings can start separate stroke segments to prevent a straight bridging mark across the chamber.

## Settings

| Key | Range / values | Meaning |
| --- | --- | --- |
| source | glass, lines, image, particles, toys, drawing | Source painter |
| mirrors | 3–16 integer | Mirror pairs, giving 6–32 reflected sectors |
| rotation | 0–360° | Manual tube orientation |
| rotationSpeed | −6…6°/s | Automatic tube rotation; negative reverses |
| zoom | 0.6–2.4 | Optical magnification |
| palette | jewel, tide, dusk, ember, mono | Original-source colors; photos retain theirs |
| softness | 0–1 | Low-pass source resampling; zero is sharp |
| interaction | stir, rotate, off | Main pointer action; the rim always rotates unless off |
| animationSpeed | 0–2 | Source clock multiplier; independent of rotation |
| border | brass, graphite, ivory, none | Instrument frame |
| brush | 1–18 | Stroke width in source-pixel units |
| ink | six-digit hex color | New drawing strokes |

`PRESETS` contains seven full configurations. Draw mode's starting preset is still, ivory and blue. Tiny toy objects are original stars, dominoes, beads, flowers, paper boats and rings. The herbarium uses botanical stroke geometry. There are no commercial toy logos or downloaded decorative assets.

## Optical method and performance

Canvas clipping produces one canonical wedge and alternating reflected copies. Adjacent sectors share a boundary and sample the same source. A slight overlap prevents rasterization cracks. The source painter runs once per frame at 768×768, not once per mirror. Mirrored texture extension outside the source square keeps zoomed-out or panned images filled. Softness downsamples a common source before reflection, preserving exact symmetry. The main canvas caps backing dimensions at 1600 px. Prints regenerate the source at up to 2048 px before mirroring; they do not change the live resolution. The circle, retaining ring and optical vignette are procedural.

This is a 2D optical simulation, not ray-traced volumetric glass. Lighting on toy fragments and the tube is drawn, and mirrored wedges are exact geometric transforms. No thousands of DOM objects, remote shaders or continuously rebuilt meshes. Only the source object count and sector count are bounded; idle zero-speed scenes do not retain an animation loop.

## Saving and privacy

Composition JSON version 1 stores semantic strokes, seed and object offsets, optical controls, pan and both clocks. A supplied image is embedded as a locally encoded JPEG with longest edge at most 1400 px. This is a portable visual state, not an event video. Repeatedly saving a lossy JPEG can soften image details; PNG print export preserves the rendered frame. `validateDocument()` validates all coordinates, numeric limits, stroke limits and image data URLs. The engine regenerates all base objects from the seed rather than trusting imported object geometry.

For restore: validate the JSON, decode `image` when present, then call `restore(rawDocument, imageElement)` while paused. The studio does this and holds the saved moment. Shared Lab presets/source packages contain settings only; use composition JSON separately for drawings and uploaded photos. No image is sent anywhere. Source export includes only the licensed built-in sample photograph.

## Assets and licensing

Code, procedural forms, preview and UI: MIT, copyright 2026 Tampa Curated. The bundled `assets/palms.jpg` is by Brandon Burridge on Unsplash: https://unsplash.com/photos/4wesDlSBq2o, distributed under https://unsplash.com/license. No third-party fonts are bundled; typography uses system serif and sans-serif fonts. Uploaded images remain the visitor's responsibility and are never included in source export.

## Checks

Model tests verify mirror/reflection invariance, reversible rotation, distinct zoom/seed effects, settings bounds and document validation. Browser checks exercise all six sources, drawing/undo, source object movement, photo selection, touch, presets, resizing, pause/offscreen/reduced motion, image/state exports, disposal and the extracted standalone package in WebKit and Chromium. WebKit testing is a browser-engine check, not a claim of testing every Safari release or iOS device.
