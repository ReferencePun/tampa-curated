# Impressed Typography

A portable printing bench: embossed paper, recessed letters and shallow inked letterpress, all lit from a glyph-derived height field. Original code and artwork are MIT. No runtime dependencies, remote services or font binaries.

## Start / integrate

Serve the source export over HTTP and open `example.html`. `embed-demo.html` inside this experiment contains a separate minimal surface, independent of the Lab UI.

```js
import {createImpression} from './renderer.js';
const impression = createImpression(canvas, {
  text: 'Paper remembers.', treatment: 'emboss',
  font: 'serif', weight: 700, depth: 5,
  paper: '#e9e4d7', azimuth: 140, elevation: 32
});
impression.resize(canvas.clientWidth);
impression.update({azimuth: 45, treatment: 'deboss'});
// Supply meaningful, visible HTML text alongside the canvas.
// Call resize from your ResizeObserver and dispose on removal:
impression.dispose();
```

Use `mount(host, settings, report)` from `index.js` for the full printing bench. It returns `update`, `setRunning`, `replay`, `getState`, `getRenderer` and `dispose`. The shared Lab contract connects the inspector, pause, presets and source export. There is no automatic animation until the visitor runs the press.

## How depth works

`glyphs.js` rasterizes the actual text and selected system font into a 1200 × 800 mask. A two-pass chamfer distance field rounds each glyph's edge into a bevel. Fractional antialias coverage is preserved. Text wraps to the sheet, shrinking its requested size when needed; explicit newlines are retained. Up to 240 characters are supported. The layout records the actual fitted size and lines.

`renderer.js` uploads the mask/height data and a seeded procedural fibre texture. `shaders.js` computes surface normals from central differences of the signed height field plus fine paper microrelief. Lighting includes diffuse and broad specular terms, twenty bounded directional height-field shadow samples, and sRGB decode/encode. The model is a top-down 2.5D optical approximation, not volumetric paper mechanics or calibrated measurements.

Emboss has positive height. Deboss reverses the height and therefore the surface normals and shadow geometry. Letterpress uses a negative height at 48% of the same depth, with irregular grain-driven ink coverage and additional accumulation near its edges. Ink is deposited as pressure increases. The diffuse light illuminates both substrate and lettering consistently; changing the treatment is not a palette swap.

`model.js` supplies the deterministic press timeline. Contact begins at 32%, pressure rises through 64%, the plate lifts after 68%, and the impression remains. Reversing progress reverses the complete process. The illustrated overhead plate and exaggerated side section are explanatory UI, separate from the actual relief shading.

## Coordinates / settings

- `text`: up to 240 characters. Markup is always treated as text.
- `font`: `serif`, `sans`, `mono`. Georgia/Times, Arial/Helvetica and Courier/system fallbacks. `weight`: 400–700; browsers may synthesize unavailable weights.
- `size`: 32–220 design pixels before fitting. `spacing`: −4–16 design pixels. Zero spacing uses whole-line native text shaping; nonzero spacing uses character advance, best suited to Latin specimens.
- `treatment`: `emboss`, `deboss`, `letterpress`. `depth`: 0–12 reference pixels; not a measurement in millimeters.
- `material`: `cotton`, `handmade`, `recycled`, `charcoal`, `archive`, `plaster`. The bench's material selector applies the corresponding paper color and roughness unless those were explicitly changed in a preset. Low-level renderer integrations should pass `MATERIALS[name].paper` and `.roughness` when choosing a complete material preset.
- `roughness`: 0–1. `paper` and `ink`: six-digit sRGB hex colors.
- `azimuth`: 0–360°, with zero to the right and 90° above the sheet. `elevation`: 12–80°. Light direction is toward the source.
- `intensity`: .2–2. `highlight`: 0–1, broadens the specular lobe. `shadow`: 0–1, softens the height-field shadow threshold.
- `progress`: 0–100%. `contrast`: high-contrast flat proof, deliberately independent of the subtle material lighting.

The UI exposes five complete typographic compositions plus six substrate choices. Complete settings can be saved and restored with the Lab's local presets/JSON. No text leaves the device.

## Exports

- **PNG**: actual current WebGL surface, including relief, ink, grain and illumination. UI/plate overlay is omitted. Resolution follows the preview, capped at 1500 × 1000.
- **SVG lighting study**: a self-contained simplified SVG with embedded PNG glyph height maps and `feDiffuseLighting`. Lighting filters and colors remain editable. It is not an all-vector font outline export and does not reproduce GPU ray shadows or paper microrelief. Recesses invert the height alpha rather than faking relief with CSS text shadows. The title/description and metadata retain readable text/settings.
- **Settings JSON**: versioned settings, compatible with the Lab's preset importer.
- **Source ZIP**: all shaders, mask/bevel generation, texture generation, UI, export functions, examples and MIT license. No CSS-only version is claimed; the source includes the working WebGL and SVG implementations.

No font software is copied or redistributed. Browser-installed system fonts remain on the user's device. Exact metrics may differ across operating systems. To embed a custom font, load a font you have rights to use and extend `FONTS`; only distribute its binary if its license permits that use.

## Accessibility, performance, lifecycle

Readable HTML text is always present below the sample. A high-contrast button provides an unambiguous proof. Pointer motion, touch dragging and keyboard arrows change light; the same parameters have labeled inspector controls. Touch vertical scrolling remains native. Reduced motion starts paused; explicit manual control and the deliberate press button remain available.

The GPU uses one draw call and two textures. Maximum preview dimensions are bounded; masks rebuild only for text/font/spacing changes, and typing is debounced. A resting study uses no animation loop. The host pauses animation when offscreen/hidden. Removal cancels frames, timers, listeners and observers and deletes GPU resources. Context loss disposes old handles while lost, then restoration creates fresh resources. Unsupported WebGL receives a clearly labeled high-contrast HTML fallback; SVG and settings export remain usable.

References considered: [SVG diffuse lighting](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDiffuseLighting) and [WebGL resource/performance practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

## Verification

Run `pnpm test:impressed-typography` for mathematical bevel/normal/press checks and Chromium/WebKit browser coverage: reversed lighting, positive/negative relief, typography, materials, deterministic scrubbing, touch layouts, exports, standalone embedding, local presets, fallback and cleanup. WebKit is Safari's browser engine; these tests do not measure a physical iPhone or Mac GPU.
