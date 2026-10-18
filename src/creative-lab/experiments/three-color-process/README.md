# Three-Color Process

Three monochrome records, one additive projection. Original code is MIT; archival and modern photographs retain the separate notices in `assets/ASSET-LICENSES.txt`.

Serve the exported directory over HTTP and open `example.html`. No installation, CDN or runtime package is needed. `embed-demo.html` demonstrates the smaller renderer API.

## What this demonstrates

Prokudin-Gorskii made sequential exposures through different color filters. Filtered projected light was superimposed on a screen. This digital instrument combines the red, green and blue intensity records arithmetically. It **does not** imply that physically stacking ordinary transparent colored sheets reproduces additive projection. The glass frames are an interaction metaphor; the three thumbnails are monochrome records, and the central screen is the simulated projection.

The historical source is *Mosaics on walls in Old Bukhara*, cataloged between 1905 and 1915, Library of Congress LC-DIG-prok-01876. Its original scan contains three separate exposures, top blue / middle green / bottom red. `bukhara-records.png` packs actual independently cropped records, prepared from that scan, into RGB components. It is not a separation of a finished colorized image. The included JSON documents translation against green edge structure, a common crop and independent percentile contrast normalization. No local retouching was performed. Residual fringes, emulsion damage and imperfect correspondence remain. The comparison baseline is our registered reconstruction, not an original color photograph. These scanned records have no supplied scene-linear calibration; treating their normalized display intensities as sRGB is a declared demonstration convention, not colorimetric restoration.

Modern and locally supplied photographs are decoded by the browser into an explicitly requested sRGB Canvas 2D working image. Wide-gamut sources are converted to sRGB. Images are proportionally limited to 1,280 pixels on the longest side; transparent areas are flattened against black. The source comparison refers to this decoded working image, not a raw camera file or an unchanged wide-gamut original.

## Color math

For encoded sRGB component `v` in 0–1:

```
linear = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1/2.4) - 0.055
```

Each record contributes only its own primary. There is no opacity averaging or CSS blend-mode shortcut. Exposure is `2 ** stops`, and channel balance is a linear gain. Spatial interpolation happens after decoding each sample to linear light. The GPU uses four nearest texel reads per record and explicit bilinear interpolation, avoiding interpolation of gamma-encoded values. Output is clamped to sRGB gamut and encoded once. CPU reconstruction uses the same model with Float32 records and a 16-bit-index encoding lookup table. Neutral aligned opaque 8-bit images round-trip to the original bytes within rounding tolerance.

Fringe intensity is an artistic difference multiplier: `registered + intensity * (transformed - registered)` in linear light. One is faithful geometric channel reconstruction. Zero removes that geometric difference; values above one exaggerate it. This does not alter the saved plate coordinates. Comparison shows the registered source baseline on the left and the current projection on the right. PNG export always exports the combined reconstruction without comparison, glass frames or guides.

## Reusable APIs

```js
import {separate, fromRecords, DEFAULTS, align, reconstruct} from './model.js';
import {createPlateRenderer, fitImage} from './renderer.js';

const dataset = separate(imageData, {title:'My photograph'}); // opaque sRGB RGBA
// Or three independently supplied 8-bit positive grayscale records:
const historic = fromRecords([redRecord, greenRecord, blueRecord]);
// Each record: {width, height, data: Uint8Array(width * height)}.
// All must already share a calibrated coordinate system and dimensions.
const settings = align(DEFAULTS);
const pixels = reconstruct(dataset, settings); // {width,height,data:RGBA8}
const renderer = createPlateRenderer(container);
renderer.setImage(dataset);
renderer.render(settings, {width:container.clientWidth, height:600});
// Update only when settings or layout change. No permanent loop is needed.
renderer.dispose();
```

`model.js` has no DOM/site dependencies. `separate` / `fromRecords` own typed arrays. Inputs are bounded to 8 megapixels and 4096 per dimension. `recordImage(dataset,index,{width,filtered})` exports a monochrome or filtered record. `reconstruct(dataset,settings,{width,height,view,reference})` produces a clean image. `pixelAt` exposes individual linear-light samples for validation and small previews.

Positions are percentages of image width/height, independent of viewport scale. Rotation is clockwise about each image's center. Source sampling applies the inverse rigid transform. `fitImage` and `stageToImage` share the renderer's viewport transform for precise pointer input. Settings include each channel's X/Y/angle/exposure/balance/visibility, selected record, inspection view, snapping, guides, magnification, comparison and fringe intensity.

`Align the plates` restores known shared origins (zero transforms), with a short reversible-to-manual easing gesture. For the historical sample, those origins are the preprocessing calibration; for a modern split they are inherently identical. It does not claim to solve arbitrary unregistered archival records at runtime. `snapPlate` holds offsets within a 1% radial threshold and angles within 1.5 degrees. Arrow keys nudge 0.1%; Shift nudges 1%. Touch uses pointer capture; cancellation restores the prior gesture. Pan view moves the viewport without changing registration. Experimental recipes change actual coordinates, angles and exposures.

## Persistence and exports

The Lab's local presets and the alignment JSON retain settings. A private photograph remains in memory only and is never uploaded, embedded into a preset, or packaged with exported source. After reload, reselect it; selection retains restored alignment. The normal sample source named in a preset remains the fallback image. Separate records export as original monochrome PNGs; their geometric placement/exposure belongs to the alignment, not the record itself. Reconstructed PNG uses working image resolution. The image import allows JPEG, PNG and WebP up to 25 MB; very large decoded files can still exceed device memory.

## Lifecycle / compatibility

A single WebGL quad and texture compute all three channels. Geometry never grows with image dimensions. Preview resolution is capped at device pixel ratio 1.5. One requestAnimationFrame coalesces pointer changes; no frames run while still. Short alignment animation pauses offscreen, on shared Pause, or in a hidden tab. Reduced motion aligns instantly. `dispose` aborts input listeners/fetches, stops frames/timers, disconnects observers, revokes preview URLs and releases texture/buffer/program/context resources. Context restoration reloads the current image. The Canvas fallback limits preview width to 560 pixels; exported reconstruction remains full working resolution. Keyboard/numeric controls provide an alternative to dragging.

## References

- [Library of Congress: Color photography method](https://www.loc.gov/collections/prokudin-gorskii/articles-and-essays/color-photography-method/)
- [Library of Congress: Making color images](https://www.loc.gov/exhibits/empire/making.html)
- [Historical item and rights advisory](https://www.loc.gov/pictures/item/2018680335/)
- [Collection rights and restrictions](https://www.loc.gov/rr/print/res/237_prok.html)
- [W3C: sRGB transfer functions and color handling](https://www.w3.org/TR/css-color-4/#color-conversion-code)
