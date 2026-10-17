# Spatial Sound

A composition you walk through, with distance, direction, and silence.

Stage: PLACEHOLDER — the named effect has not been implemented. The interactive plate is only a calibration drawing.

## Use outside Tampa Curated

1. Extract the complete export, preserving its folders.
2. Run `python3 -m http.server 8080` from the extracted directory.
3. Open `http://localhost:8080/example.html`. ES modules need HTTP; double-clicking the HTML file is not supported.
4. Copy `creative-lab/` into your project, retaining its shared helpers. No package installation is required for this current implementation.

```js
import { mount } from './creative-lab/experiments/spatial-sound/index.js';
const effect = mount(document.querySelector('.impossible-effect'), preset.settings, console.log);
effect.setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);
// Apply a validated preset: effect.update(nextSettings);
// Stop on hidden/offscreen: effect.setRunning(false);
// Before navigation/removal: effect.dispose();
```

Include `style.css` or provide a positioned container with explicit width and height. The source package includes a complete example, a settings preset, a dependency manifest, and all relative imports.

## Contract

`mount(host, settings, report?)` returns `update`, `setRunning`, `replay`, and idempotent `dispose`. The host owns visibility and user pause state. Reported statistics are measured animation FPS, backing-buffer dimensions, drawing primitives, and rendered frames; they are not a performance guarantee.

The neutral preview uses no Tampa business logic, photographs, external fonts, audio, or credentials. Optional branding belongs in presets. The current renderer uses Canvas 2D and vanilla JavaScript; the planned implementation may require Web Audio / user activation.

## Compatibility and limitations

Modern browsers with ES modules, Canvas 2D, ResizeObserver, and requestAnimationFrame. Test on your target devices. Reduced motion should start paused; the host must pause when hidden and dispose when removed. This effect is decorative: keep meaningful text and navigation in HTML. This is not an exact physical simulation.

## Assets and license

Original vector preview and source: Tampa Curated, MIT. The included license applies only to the exported lab code and drawings, not the rest of the Tampa Curated site. No third-party assets are included.
