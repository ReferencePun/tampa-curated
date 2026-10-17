# The Impossible Lab

A permanent, local-first creative-effects archive at `/lab/`, under the site's configured base path (`/tampa-curated/lab/` locally). It reuses Astro 7, static file routing, the existing typography, pnpm, and Playwright. No new runtime dependencies or hosting service were added. The editorial homepage and existing effects are preserved; the shared Concepts menu and experiment-room index link to the lab.

A Git checkpoint was created before implementation: `checkpoint/before-impossible-lab-2026-10-17` (commit `99451f6`).

## What is implemented

- A searchable, filterable catalog, local favorites, visual plates, category/technology/status metadata, independent URLs, and a small comparison desk.
- Two deliberately small working reference studies, **Line Field** and **Hinge Study**, demonstrating a complete framework-independent effect lifecycle.
- Twelve clearly marked proposals: Draw a World, Impossible Rooms, Folding Paper, Living Ink, Particle Photos, Time Machine, Photo Portals, Living City, Site Memory, Spatial Sound, Personal Zines, World Composer.
- The proposals show a neutral calibration plate to exercise the inspector. It is not an implementation of the named future effect. Their downloads are complete scaffolds, explicitly labeled as such.
- Range, numeric, checkbox, color, and select controls; default reset, pause/resume, replay, fullscreen/expanded preview, measured diagnostics, and browser-local named presets.
- Validated JSON preset import/export and complete ZIP exports from the UI or command line. Current UI settings are embedded in a source download; the static default download works without JavaScript.

## Structure

```
src/creative-lab/
  registry.ts                 # Typed build-time registry, discovered from manifests
  host.ts                     # Astro/DOM integration, inspector, lifecycle, persistence
  catalog.ts                  # Search, filters, favorites, comparison controls
  components/ExperimentHost.astro
  shared/
    canvas-effect.js           # Framework-free renderer lifecycle and resize/pointer handling
    presets.js                 # Common validation and serialization
    zip.js                     # Browser/Node ZIP writer
    standalone.js              # Portable example activation and cleanup
    draft-plate.js             # Explicitly generic placeholder drawing
  experiments/<slug>/
    manifest.json             # Discovery, stage, fields, entry, requirements, assets
    config.json               # Default settings, checked against the schema
    index.js                  # Effect mount entry; no Tampa application logic
    style.css                 # Minimal portable host style
    assets/preview.svg        # Original neutral illustration
    README.md                 # Implementation/reuse contract and limits
    LICENSE                   # MIT, scoped to this new lab source
scripts/
  lab-package.mjs             # Safe source/import closure and example packaging
  lab-export.mjs              # Local export CLI
  lab-check.mjs               # Schema, import, asset, syntax and preset validation
  lab-test.mjs                # Browser and standalone-export integration tests
src/pages/lab/
  index.astro
  [slug].astro
  compare.astro
  [slug]/plate.svg.ts
  [slug]/source.zip.ts
  [slug]/source.json.ts
```

All endpoints are generated at build time. No server, login, external storage, or API keys are required. The JSON endpoint is an intentional public source bundle for the download button, not a filesystem browser. It exposes only the same lab code and assets contained in the ZIP.

## Effect contract

The portable core uses explicit-extension ES module imports and exports:

```js
export function mount(host, settings, report) {
  // Return an effect; leave animation paused initially.
  return {
    update(settings) {},
    setRunning(running) {},
    replay() {},
    dispose() {},
  };
}
```

The host lazily imports and mounts a study when its demonstration enters the viewport. It pauses offscreen and when the document is hidden. Reduced motion starts paused but allows explicit opt-in. `dispose()` must cancel frames and remove observers, listeners, graphics resources, and DOM nodes; it must be safe to call again. Page departure and Astro's pre-swap lifecycle dispose mounted effects. BFCache restoration mounts a fresh instance.

The neutral Canvas helper paints once for a parameter change or resize even while paused. Continuous frames require `setRunning(true)`. Diagnostics report measured animation FPS, actual backing-buffer dimensions, primitive count, rendered-frame count, and running state. These are not a frame-rate guarantee or GPU profiling tool.

## Presets and local storage

```json
{
  "schemaVersion": 1,
  "experiment": "line-field",
  "name": "My study",
  "createdAt": "ISO date",
  "settings": {"density": 32, "speed": 0.6, "guides": true, "ink": "#37342e", "accent": "#a75239", "mode": "contours", "seed": 7}
}
```

Imports reject other experiment IDs, unsupported schema versions, unknown fields, wrong types, invalid options/colors, and out-of-range or off-step numbers. Import files are limited to 100 KB. Missing known fields receive defaults, allowing additive settings. A rejected import does not change the drawing. Future breaking setting changes need an explicit migration and a schema-version policy.

Keys are prefixed `impossible:`. Current settings and up to 20 named presets are isolated by slug. Favorites are local to this browser. Storage failure does not prevent viewing, adjusting, or downloading a study. JSON is the portable backup; this is not cloud synchronization.

## Export and reuse

Run from the project root:

```sh
pnpm lab:export --list
pnpm lab:export line-field
pnpm lab:export line-field --preset path/to/preset.json
pnpm lab:export line-field --out path/to/exports
```

The default destination is the ignored `lab-exports/` directory. Re-exporting a slug replaces that slug's ZIP. The package includes all files in the isolated experiment directory, the transitive closure of relative JS imports, local referenced assets, the preset validator, source license, dependency manifest, compatibility notes, source documentation, and a runnable HTML/JS example. Symlinks, escaping imports, undeclared runtime packages, and computed imports without an adapter fail packaging instead of silently producing a broken bundle.

Unzip, run `python3 -m http.server 8080` in the extracted directory, and open `http://localhost:8080/example.html`. The current studies need no package installation. ES modules must be served over HTTP rather than opened with `file://`. The example includes visibility/offscreen pausing, reduced-motion handling, replay, and disposal.

The browser source button fetches the static source manifest only when requested, adds the current validated preset, and creates the ZIP locally. It does not send the configuration to a server. The static ZIP link contains the default preset. No original Tampa photos, fonts, business logic, credentials, or unrelated experiments are bundled.

## Adding or implementing a study

1. Copy a placeholder directory or create `experiments/<unique-slug>/` with the same manifest shape. Use a stable `id` and slug, a sortable `order`, and truthful `status`/`placeholder` flags. Keep proposed technology separate from actual runtime requirements.
2. Write the effect inside that directory. Add original neutral assets and their exact credits/licenses. Keep framework adapters separate; the core must not import the Tampa page application.
3. Declare settings once in `manifest.json`, and keep `config.json` identical to those defaults. Add reuse/compatibility notes and a preview SVG.
4. Export `mount` from the declared entry. Include all shaders and local assets under the experiment, using explicit relative paths. The registry and lazy loader discover the new directory automatically.
5. Change the placeholder flag only when the effect exists. Keep larger WebGL/audio experiments out of simultaneous live comparison until a lightweight preview strategy is implemented. Only manifests explicitly marked `comparison: "lightweight"` can enter the desk. Two independent slots mount at most two effects; changing a slot disposes its previous effect, and a single-study view pauses the hidden slot. The current eligible choices are the two small reference studies.
6. Run the checks below, export the study, and test the extracted example independently of this repository before marking it working or polished.

Framework-specific effects must declare actual dependencies and installation commands. `package.json` lists runtime packages; installed `node_modules` is intentionally not copied. For a future React/TS/bundled effect, add its appropriate build/example export adapter and test it; the current native-module example must not be presented as a universal React or shader bundler. Computed asset/import paths need explicit packaging support. This foundation does not implement those future adapters speculatively.

## Verification

```sh
pnpm check
pnpm lint:lab
pnpm build
pnpm verify
pnpm test:lab
pnpm test:navigation
```

The repository had no general-purpose lint command. `lint:lab` adds focused manifest/import/asset and JavaScript syntax validation; `pnpm check` remains the Astro/TypeScript check. Browser tests exercise independent routes, catalog/favorites/comparison, parameter changes, persistence, preset round trips and invalid imports, custom and default ZIPs, an extracted standalone example on a separate HTTP server, fullscreen, pause/replay, offscreen rest, navigation disposal, mobile, enlarged text, reduced motion, and no-JavaScript access. ZIP integrity is independently checked with Python's zipfile reader.

Screenshots and extracted QA packages are in the ignored `test-results/lab/` directory. Publication remains a separate requested step.

### Foundation verification — 2026-10-17

- Astro check: 0 errors, warnings, or hints. Lab lint: 14 manifests, 18 portable JavaScript modules, import closure, assets, defaults, and preset validation passed.
- Production build: 65 pages and 5,474 internal links/assets verified.
- Chromium and WebKit: all 14 independent studies, replacement comparison slots, independent settings, saved/imported/exported presets, malformed/cross-study rejection, native and fallback fullscreen, pause/replay, offscreen rest, disposal, mobile, reduced motion, no JavaScript, and nine enlarged-text layouts passed.
- All 14 default ZIPs passed independent archive integrity checks. A custom CLI export ran from a separate HTTP server; browser-generated ZIPs retained current settings. The standalone example passed departure cleanup and BFCache-style restoration.
- Existing navigation: all ten destinations, keyboard/focus, mobile coordination, no JavaScript, and 16 reflows passed in both engines. Existing responsive site suite: 92 page checks passed, including all three homepage editions.
- Desktop and mobile catalog, workbench, and comparison screenshots were visually reviewed. This is local validation, not a physical-device certification or published deployment.
