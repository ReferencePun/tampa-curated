# The Impossible Lab

A permanent, local-first creative-effects archive at `/lab/`, under the site's configured base path (`/tampa-curated/lab/` locally). It reuses Astro 7, static file routing, the existing typography, pnpm, and Playwright. The original Lab shell added no runtime dependency or hosting service; individual spatial studies now declare their own portable Three.js/Spark dependencies. The editorial homepage and existing effects are preserved; the shared Concepts menu and experiment-room index link to the lab.

A Git checkpoint was created before implementation: `checkpoint/before-impossible-lab-2026-10-17` (commit `99451f6`).

## What is implemented

- A searchable, filterable catalog, local favorites, visual plates, category/technology/status metadata, independent URLs, and a small comparison desk.
- Two deliberately small working reference studies, **Line Field** and **Hinge Study**, demonstrating a complete framework-independent effect lifecycle.
- **Draw a World**, a working Three.js drawing-to-architecture instrument with editable paths, three architectural styles, and reversible camera travel.
- **Folding Paper**, a working hierarchical hinge study with a conservatory, mechanical assembly, and miniature city, reversible progress and fixed-pose orbit inspection.
- **Living Ink**, a working reaction–diffusion material with GPU/CPU engines, architecture and image masks, local images, and still export.
- **Particle Photos**, a working GPU engraving instrument with three treatments, image uploads, reversible scatter, field-note transitions, and portable gallery examples.
- **Time Machine**, a registered architectural timeline with a drawn dial, real geometry and custom vertex morphs, fictional neutral/Tampa-inspired scenes, media layers and paired era comparison.
- **Photo Portals**, a reversible projective photo relief with original estimated depth maps and an independent, explicitly unbundled Gaussian-splat loader.
- **Living City**, an original SVG waterfront instrument connected to NOAA water level, wind and tide predictions, with clearly labeled simulation, historical replay and portable data adapters.
- **Site Memory**, a deterministic semantic-event atlas with six explorable rooms, local journey archives, replay, SVG/JSON exports and a portable event API.
- Spatial Sound: an original mechanical listening room with actual phase-driven synthesis, positional Web Audio, silent operation, recording and portable source APIs.
- Three clearly marked proposals: Impossible Rooms, Personal Zines, World Composer.
- The proposals show a neutral calibration plate to exercise the inspector. It is not an implementation of the named future effect. Their downloads are complete scaffolds, explicitly labeled as such.
- Range, numeric, checkbox, color, and select controls; validated structured path state for drawing instruments; default reset, pause/resume, replay, fullscreen/expanded preview, measured diagnostics, and browser-local named presets.
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

Drawing instruments can emit a bubbling `lab:settings` event from inside their mount. The host validates its settings payload before applying it, so drawn paths use the same device storage, named presets, JSON exchange, and current-source download as inspector controls. The `path` setting type accepts an empty array or 2–96 finite normalized coordinate pairs; it is edited by the instrument rather than a scalar inspector field.

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

Unzip, run `python3 -m http.server 8080` in the extracted directory, and open `http://localhost:8080/example.html`. The current studies need no package installation. Draw a World includes the exact installed Three.js browser ESM modules and their license in `vendor/three`, with a local import map. Its portable `geometry.js` has no DOM dependencies; its README documents path injection and camera sampling. ES modules must be served over HTTP rather than opened with `file://`. The example includes visibility/offscreen pausing, reduced-motion handling, replay, and disposal.

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
pnpm test:draw-world
pnpm test:folding-paper
pnpm test:living-ink
pnpm test:particle-photos
pnpm test:time-machine
pnpm test:photo-portals
pnpm test:living-city
pnpm test:site-memory
pnpm test:spatial-sound
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

### Draw a World implementation

Checkpoint: `checkpoint/before-draw-a-world-2026-10-17` at `1eb734e`. The study lives entirely in `experiments/draw-a-world`. Pointer samples are resampled, smoothed into a centripetal spline and turned into batched native 3D linework. An independent arc-length camera follows that same spline with a fixed upright axis. Tight bends and crossings remain editable with an explanation.

The per-study README documents the complete mount and geometry APIs, coordinate schema, limits, and lifecycle. `test:draw-world` exercises distinct generated geometry/camera routes, pointer and touch input, editable controls, reverse travel, presets, actual-path source exports, and the standalone example. Screenshots and source packages are in `test-results/draw-world/`.

Draw a World verification: Astro check reported no errors, warnings, or hints. The build verified 65 pages and 5,539 local links/assets. Geometry tests and Chromium/WebKit interaction tests passed, including distinct freehand camera routes, upright reverse travel, helical rise, point editing, presets, actual-path source exports and the standalone package. Chromium additionally exercised real touch drawing/swiping, context loss/restoration, and the no-WebGL editor. Lab and navigation regressions passed in both engines. No homepage or other experiment implementation was changed.

### Folding Paper implementation

Checkpoint: `checkpoint/before-folding-paper-2026-10-17` at `131667d`. The independent study lives in `experiments/folding-paper`. `engine.js` constructs a validated parent-child hinge hierarchy from local outlines, openings, strokes, axes, pivots and stage intervals. `compositions.js` provides three demonstration datasets. No geometry or opacity is swapped as progress changes; only hinge transforms and the camera change.

The conservatory contains 26 panels, including cutout windows, fluted column faces, knee braces, gables, and two roof planes that meet at the same ridge. The mechanical composition has 10 panels; the city has 38. The README explains the reusable schema, complete mount API, deterministic reverse sampling, input controls, and cleanup. Fold position is included in ordinary Lab presets and source packages; orbit is a temporary inspection view. The source package includes the local Three.js runtime and license.

Verification: geometry tests check flatness, real intermediate poses, inherited pivots, roof closure, unchanged geometry/material identities, exact reverse matrices, camera continuity, schema errors, and disposal. Chromium and WebKit tests cover scrubbing, wheel input, fixed-pose orbit, three versions, settings/presets, source export and a separate standalone HTTP example, reduced motion, fullscreen, idle rest, and cleanup. Chromium additionally checks real touch orbit, WebGL context restoration, and the static graphics fallback. No homepage or other experiment implementation was changed.

### Living Ink implementation

Checkpoint: `checkpoint/before-living-ink-2026-10-17` at `8827e87`. Living Ink replaces only its own placeholder at `/lab/living-ink/`; the catalog and Concepts menu expose the working study. The portable engine has no external runtime packages. It advances a Gray–Scott field through two RGBA32F framebuffers and falls back to the same equations on a smaller CPU grid. The UI, solver, GPU resources, shaders, mask helpers, original heron image, and source package live inside `experiments/living-ink/`.

The three modes share evolving chemical concentrations. Architecture and image masks change local reaction rates. Image pigment is gated by accumulated chemical visitation, so an unseeded image remains hidden. The ink rendering derives contours, hatching and dry deposits from the field. Five recipes, local image upload, pointer/touch/keyboard seeds, clear/reseed, still PNG export, Lab preset JSON and portable source are available. The README documents mask channels, brush coordinates, state readback, GPU requirements and lifecycle. Custom uploads remain session-local; recipe/source exports include the original heron and settings rather than an uploaded image or full brush history.

Verification: numerical tests check blank equilibrium, parameter divergence, mask-driven chemistry, finite bounded state, deterministic replay and disposal. Chromium and WebKit tests verify the three modes, CPU/GPU agreement, actual parameter changes, pointer/touch/keyboard seeds, recipes, custom masks, PNG/preset/source export and a separately hosted standalone package. They check reduced motion, offscreen rest, fullscreen and cleanup; Chromium also tests graphics interruption and the no-WebGL fallback. Resource accounting confirms that GPU textures, programs, shaders, framebuffers and vertex arrays are released. Desktop and mobile screenshots were reviewed.

Living Ink build checks: 65 generated pages, 5,669 local links/assets, 14 validated Lab manifests and 32 portable JavaScript modules. The complete Lab regression passed in Chromium and WebKit, including comparison, lifecycle, presets, source ZIPs, standalone exports, reduced motion and nine enlarged-text layouts.
Navigation regression passed all thirteen concept destinations in Chromium and WebKit, including keyboard focus, mobile menus, sixteen reflows and no-JavaScript navigation. Astro check finished with zero errors, warnings or hints. Homepage and other experiment implementations remain unchanged.


### Living Photographic Particles implementation

Checkpoint: `checkpoint/before-particle-photos-2026-10-17` at `0f6dde6`. The independent study replaces its own placeholder at `/lab/particle-photos/`. Each fragment has an immutable image coordinate, sampled tone, local gradient and deterministic variation. A native WebGL2 renderer draws the fragments in one instanced call. The cursor displaces them, then resolves their individual photographic patches. Original-image rendering aligns the same fragments into a continuous photograph. No photographic opacity-mask plane or Stories-page module is involved.

The three treatments, four recipes, pointer/touch/keyboard input, scatter/reassemble, local photograph selection, full aspect ratios, field-note transition, PNG export and Lab presets are implemented inside `experiments/particle-photos`. Image switching reuses the graphics context, texture and buffer. The independent gallery example bounds active renderers to two visible images and demonstrates a transition into a separate article. The engine, instrument and gallery have their own documented APIs. The source ZIP includes all modules, demonstration photographs and individual credits/licenses; custom uploads remain session-local.

The renderer stops at rest, pauses when hidden, applies reduced-motion gestures immediately and falls back to a smaller Canvas 2D engraving. Disposal releases image references, object URLs, GPU objects, observers and event listeners. The numerical and browser checks are in `test:particle-photos`; artifacts remain local in `test-results/particle-photos/`.

Verification: numerical tests confirm image-derived tones and gradients, deterministic anchors, real cursor/scatter displacement, exact reassembly, bounded easing and aspect fitting. Chromium and WebKit verify all three GPU treatments, exact rendered-image return, original reconstruction, local uploads without network writes, aspect changes, field-note transitions, presets, PNG/source exports, and independent standalone/gallery pages. They also cover reduced motion, idle/hidden rest, pause and disposal; Chromium exercises dragged touch input, context interruption and the no-WebGL fallback. Resource accounting confirms that programs, shaders, buffers, textures and vertex arrays are deleted. Desktop, mobile and exported-gallery screenshots were reviewed.

The production build contains 65 pages and 5,734 verified internal links/assets. Lab validation covers 14 manifests and 40 portable JavaScript modules. Complete Lab and navigation regressions passed in Chromium and WebKit, including fourteen concept destinations, keyboard/mobile navigation, sixteen reflows, nine enlarged-text layouts, comparison, presets, source packages and no-JavaScript access. This remains a local implementation; the established homepage and other experiment implementations are unchanged.


### Time Machine implementation

Checkpoint: `checkpoint/before-time-machine-2026-10-17` at `1bc4322`. This replaces only the Time Machine placeholder. A pure timeline samples ordered keyframes into a registered Three.js scene: building dimensions, roof pitches, floor frames, chimney, canopy and trees change in place. Custom triangle meshes support same-topology vertex morphs without replacing their buffers. The camera is independent of time. One renderer samples and draws the scene twice for aligned era comparison; narrow screens stack those views.

The neutral Meridian block and optional Tampa-inspired block are explicitly fictional. Workshop, Exchange and Common ground are conceptual periods, not calendar dates. The undated Ikuna photograph is labeled as a surface collage rather than evidence of an era. Three original survey drawings share a fixed world transform, and their plot coordinates are verified against the actual 3D footprints. Location, era, media and annotation data retain separate fictional, reconstruction or documented provenance. Documented entries require source URLs.

The portable schema, geometry engine, viewer and complete instrument are documented inside `experiments/time-machine`. Controls include the pointer/touch/keyboard dial, time slider, era selection, automatic forward/reverse playback, fixed/orbit camera, blueprint/photo mode, transparency, detail and comparison. The source package includes the exact Three.js runtime, photo credit and original surveys. The shared standalone adapter now honors the same explicit pause/resume event as the Lab host, so the instrument’s Play control can resume a paused exported example.

Verification: pure tests confirm ordered sampling, exact reverse poses, genuine intermediate geometry, persistent geometry identities, custom vertex morphs, stable camera matrices, facade registration, actual survey-to-footprint alignment, timeline reversal, dial mapping, provenance validation and resource disposal. Chromium and WebKit pass dial/slider input, time-keyed geometry, fixed-camera stability, orbit without time changes, paired views, photographic layers, fictional/Tampa labels, auto/reverse playback, held moments, preset persistence, invalid imports and source ZIP integrity. The export runs independently on another HTTP origin, including its own Play/host-pause coordination. Mobile touch, readable selectors, responsive comparison, reduced motion, offscreen rest and cleanup pass; Chromium also tests interrupted/restored graphics and the static no-WebGL fallback. Desktop, mobile and standalone screenshots were reviewed.

Astro check: zero errors, warnings or hints. The production build verifies 65 pages and 5,799 internal links/assets; Lab validation checks 14 manifests and 45 portable JavaScript modules. Complete Lab and navigation regressions pass in Chromium and WebKit, including all fifteen concept destinations, nine enlarged-text layouts, sixteen menu reflows, keyboard/mobile behavior, presets, source packages and no-JavaScript access. No publication was performed.

## Photo Portals implementation

Checkpoint: `checkpoint/before-photo-portals-2026-10-17` at `93731c3`. Only the Photo Portals proposal is replaced. The Concepts menu and Lab catalog expose the study. The reusable mesh, pure transition functions, viewer, Spark loader, UI, sample photos and hand-painted depth estimates live in its own directory. Mode A is explicitly limited 2.5D; Mode B requires the visitor’s real reconstruction and captures a corresponding poster from its registered view. No unverified scene is presented as a photographic reconstruction.

The source exporter now includes Spark’s exact browser module and Three’s FullScreenQuad helper only when declared by the study. The module embeds its decoder WASM and worker; both modes run from the exported local HTTP example. Presets contain settings but never local media or scene registration. The original site pages and other studies are preserved.

Validation: 254 source files checked without errors, warnings or hints; Lab lint covers 14 manifests and 51 portable modules. The production build contains 65 pages, with 5,864 internal links/assets verified. Photo Portals passes numerical camera/mesh tests plus Chromium/WebKit checks for reversible travel, wheel/drag/keyboard/touch, photograph and depth-map uploads, actual Spark decoding and poster capture, alignment, preset restoration across images, source ZIP integrity, independently served examples in both modes, reduced motion, context recovery and disposal. Shared Lab regressions and all 16 Concepts destinations pass in both engines, including mobile and enlarged text. A worker-termination race found during testing was resolved by serializing and draining splat sorting before resource disposal. No publication was performed.

## Living City implementation / 2026-10-17

Checkpoint: `checkpoint/before-living-city-2026-10-17` at `84ef38f`. Only the Living City placeholder is replaced. The original SVG estuary observatory contains a linked float/counterweight, water wheels, pulleys, wind compass and turbine, tide instrument, engraved waves, architecture and selective pencil marks. The illustration is explicitly imaginary; it is not a geographical or historical reconstruction.

The official NOAA adapter uses Old Port Tampa (8726607), with St. Petersburg (8726520) as an alternative. Supported water level, wind and six-minute tide prediction products were verified against the official API and station metadata. One browser smoke received actual Old Port Tampa observations with their UTC timestamps and preliminary status; these transient readings are retained only in ignored test output, never used as a production fallback. Water is metres MLLW, wind is m/s from true north, and tide-wheel movement derives from predicted rise/fall rather than a fictional current measurement.

The source separates API transport/cache (`noaa.js`), normalized observations/time sampling (`sensors.js`), mechanical mapping (`mechanics.js`), SVG rendering (`drawing.js`) and UI/lifecycle. Independent product caches, quality flags, abort/timeouts, missing/flagged/stale values, refresh cooldown and visibility-based polling are covered. Simulation is explicitly labeled and makes no data requests. Recent observations replay in either direction with their actual timestamps; gaps stay unavailable and visual smoothing never changes the measured readout. Presets, SVG/JSON export and the complete dependency-free standalone source are integrated with the Lab.

`pnpm test:living-city` covers model semantics and Chromium/WebKit interaction, controls, history, simulation, station changes/cache, stale and partial failure, presets, source ZIP/standalone, SVG validity, mobile, reduced motion and cleanup. The complete Lab suite and navigation regression passed in Chromium/WebKit: 14 independent studies, all 17 concept destinations, presets/exports, lazy lifecycle, no-JavaScript access, nine enlarged-text layouts and sixteen navigation reflows. The shared homepage and existing experiment implementations remain unchanged. No publication was performed.


## Site Memory implementation / 2026-10-17

Checkpoint: `checkpoint/before-site-memory-2026-10-17` at `d3fbf53`. Only the Site Memory placeholder is replaced. The neutral House of Small Discoveries contains six miniature destinations with original architectural/mechanical drawings and explorable content. Visits, opened notes, inspections and collected discoveries are explicit semantic events; activity elsewhere on Tampa Curated is never recorded.

The reusable model owns a versioned journey, destination vocabulary, event sequence, seed and drawing appearance. The pure SVG renderer reconstructs identical geometry from that document without consulting the current time or random globals. First-visit order changes placement; transitions engrave corridors, return visits reinforce ink, and notes/gears/pencil seals accumulate. Each event also has a permanent tick in the memory ribbon. Three arrangements, three ink treatments, complexity, density and guides alter actual geometry/styles. Replay renders temporary event prefixes in either direction without changing the saved journey.

The optional local archive supports twelve journeys, explicit new/resume/reset, session-only mode, revision conflict detection, corrupt/denied/quota-limited storage handling and isolated deletion. JSON import validates schema/version, IDs, types, targets, order, timestamps, bounds and appearance. SVG export is self-contained. The source package includes only implementation, settings, original preview and demo content; private visitor journeys are exported separately. Both the pure model and full instrument expose documented semantic-event APIs for unrelated websites.

Model and Chromium/WebKit tests cover semantic actions, deterministic reconstruction and replay prefixes, all drawing controls, local save/reload/resume, session-only behavior, import validation, JSON/SVG exports, preset/source export, an independent standalone instance and custom destinations, storage failure, mobile, reduced motion and cleanup. Shared Lab and navigation regressions passed in both engines: fourteen studies, eighteen concept destinations, presets, exports, comparison, no-JavaScript views, nine enlarged-text layouts and sixteen navigation reflows. The build contains 65 pages and 5,994 verified internal links/assets; Lab checks cover fourteen manifests and 61 portable JavaScript modules. Work remains local.


## Spatial Sound implementation · 17 October 2026

Checkpoint: `checkpoint/before-spatial-sound-2026-10-17` at `c463ed4`. Only the Spatial Sound placeholder is replaced. The original perspective engraving contains meshed gears, a harmonic wheel, a suspended pendulum, a counterweight and an articulated arm. Ground-position navigation moves the viewpoint and spatial listener together. Pure mechanical crossing events and manual phase increments drive procedural Web Audio voices; source positions follow the bob, weight and arm.

The independent audio engine supports positioned-source registration, listener position, HRTF/distance attenuation, centered/positional blending, bounded voices, soft envelopes and a master compressor. No AudioContext exists until deliberate activation. Source switches, three scales/recipes, speed, volume, pause and Stop all are available. MediaRecorder saves up to fifteen seconds of generated output; score JSON remains available without recorder support. No microphone, uploads, accounts, external assets or persisted audio permission. The portable source includes original art, all modules, settings, lifecycle documentation and an independent example.

Model and Chromium/WebKit tests verify deterministic crossings, moving coordinates, hand operation, parameter effects, actual offline-rendered channel energy and peak levels, distinct waveforms, left/right panning, centered mono, silent startup/fallback, recording, local downloads, presets, source ZIP, standalone use, mobile and context disposal. An asynchronous recorder test guards output finalization against overlapping sessions. Shared Lab and navigation regressions pass in both engines: fourteen studies, nineteen concept destinations, preset/source exports, comparison, lifecycle, no-JavaScript views, nine enlarged-text layouts and sixteen navigation reflows. Build verification covers 65 pages and 6,059 internal links/assets; Lab lint covers fourteen manifests and 65 portable JavaScript modules. Work remains local.

## The Impossible Manuscript · 18 October 2026

Checkpoint: `checkpoint/before-typographic-labyrinth-2026-10-17` at `8537610`. This is a new independent study at `/lab/typographic-labyrinth/`, reachable from Concepts and the Lab catalog. The established homepage and all other experiment implementations are preserved. The source consists of original text/scene data, pure navigation math, instanced typography, real letter extrusions, a bounded portal renderer, the viewer and its own controls/styles.

The flat composition expands into the same three-dimensional stairwell. Three differently oriented letter staircases share that space; a quaternion turn brings the sideways staircase under the camera. Letter counters display registered perspective views into a cathedral and library. Portal transforms map both position and orientation, and the last doorway returns to the original stairwell from a different direction. Four chapters occupy three rendering cells. A landing contains an anamorphic sentence; an approaching paragraph disperses and assembles into a bridge. All states reverse deterministically.

The demo provides guided wheel/touch/slider travel and bounded free pedestrian galleries with keyboard, drag and directional buttons. It has five recipes, custom Latin/Cyrillic writing, inspector controls, scene import/export, Lab presets and an independent source package. The source includes local Three.js, licensed Helvetiker outlines, original prose, a rendered preview and a documented scene schema. Shared preset support gains a validated, length-limited text setting; other existing setting types retain their behavior. The experiment is excluded from simultaneous comparison.

The default scene contains approximately 142,000 printed glyphs across its rooms and 151 instanced solid letters. Glyph quotas preserve later architectural details, and mobile reduces the text budget. Portal depth is bounded to two levels and six offscreen views. Portal targets beyond the current recursion budget are hidden instead of displaying stale views from earlier positions. All instance buffers, targets, materials, geometry, font textures, listeners and the graphics context are released on disposal. Reduced motion uses direct positions, and a settled view stops rendering.

`pnpm test:typographic-labyrinth` covers reversible poses, smooth wall-to-floor rotation, portal coordinate registration/inverses, supported walking bounds, real letter holes, text density, presets and schema rejection. Chromium and WebKit cover all chapters, free portal crossing and return, five recipes, custom writing/scenes, preset/source ZIP integrity, independent HTTP use, exact rendered return, renamed-room integration, mobile, reduced motion and disposal. The no-WebGL path retains readable controls and export with an explicit fallback. Rendered desktop/mobile views were inspected; the source package includes a screenshot of the actual staircase. This remains local, with no publication.

Final validation: Astro reports zero errors, warnings or hints; 66 pages and 6,199 internal links/assets verify. Lab lint validates fifteen manifests and 74 portable modules. The shared Lab regression passes in Chromium/WebKit, including presets, source exports, comparison, lifecycle, no-JavaScript access and nine enlarged-text layouts. Concepts navigation passes all twenty destinations, desktop keyboard behavior, mobile menus and sixteen reflows in both engines.


## Light Peg Studio · 18 October 2026

Checkpoint: `checkpoint/before-light-peg-studio-2026-10-18` at `796462c`. This is a new independent study at `/lab/light-peg-studio/`, linked from Concepts and the Lab catalog. Its portable folder contains a pure board/editing model, original parametric examples, cached Canvas renderer, artwork exporters and the instrument UI. No new runtime dependency or external artwork is required.

The board contains 360–7,840 recessed sockets. Each illuminated peg combines a shadow, translucent colored lens, bright core, rim, reflection and soft diffusion, with deterministic brightness variation. Clear, frosted and faceted resin treatments use different sprites. The renderer caches the recessed board and material sprites, restores dirty regions while painting, and stops completely when still. Hit testing shares the zoom/pan transform.

Place, erase, brush, flood fill, straight line, animation selection and touch-friendly selection subtraction support reversible gestures. Integer interpolation fills fast pointer movements; canceled gestures restore their starting state. Keyboard editing, forty-step undo/redo, proportional grid resizing and four original examples are included. Local image decoding feeds an editable palette-quantized board with adjustable darkness and error diffusion; no file is uploaded. Selected pegs support waves, seeded twinkle, progressive illumination and optional palette cycling. Playback is deliberate, pausable, scrubbable and visibility-aware.

Drawing JSON preserves colors, order, selection, seed, settings and animation position. Import validates bounded versioned data. PNG captures the full board at 2048 × 1320; SVG uses self-contained vector lenses; animation JSON includes the complete board. Shared presets store appearance separately from private artwork. The independent source ZIP includes the original preview, license, complete modules and integration guide. It runs from a static HTTP server without installation or Tampa page dependencies.

Model tests cover interpolation, fill boundaries, undo/redo/cancel, grid changes, validation, quantization, deterministic selected animation and examples. Browser checks cover desktop tools, real touch input, keyboard input, material differences, image conversion, JSON/PNG/SVG, presets/source ZIP, independent HTTP mounting, disposal and mobile resizing. Pixel checks verify dirty repaint matches a complete repaint. A bounded 112-column rendering benchmark checks responsiveness without claiming a universal device frame rate. Automated checks use Chromium and WebKit; desktop Safari successfully loaded the working instrument, while physical iOS testing remains unperformed. Work remains local.

Final validation: Astro reports zero errors, warnings or hints. The build contains 67 pages and 6,357 verified internal links/assets; Lab lint validates sixteen manifests and eighty portable modules. The Light Peg model and browser suites pass in Chromium and WebKit, including selection subtraction, full/dirty pixel equivalence and standalone source reuse. Shared Lab checks pass sixteen independent studies and nine enlarged-text layouts; Concepts navigation passes all twenty-one destinations and sixteen reflows in both engines. Desktop lens detail and the revised narrow-screen layout were visually inspected.


## The Handwritten Manuscript · 18 October 2026

Checkpoint: `checkpoint/before-handwritten-manuscript-2026-10-18` at `9a66403`. This independent edition lives at `/lab/handwritten-manuscript/`, beside the original manuscript in Concepts and the Lab. It preserves the existing spatial composition, reversible journey, wall-to-floor rotation, portals and free galleries. Original experiment files and homepage remain unchanged.

The new rendering uses a locally bundled, OFL-licensed Caveat font for Latin/Cyrillic writing. Atlas variants introduce pen-pressure changes, scratches and imperfect retracing. Seeded per-letter rotation, scale and baseline offsets keep the draft loose without animation jitter. Consecutive passages share black, blue or red ink; settings also offer mostly black, ballpoint, or graphite-only treatments. Real spatial line batches add underlines, cross-outs, circles, arrows and handwritten margin notes.

Large words use actual handwriting outlines derived from Caveat at weight 540. Their surfaces carry object-space pencil hatching and their contours are traced twice. The O-shaped apertures keep their original geometric registration, with the same pencil treatment. Each room batches the extra linework into at most three draw calls. The default view contains roughly 122,000 handwritten glyphs, 151 structural letters and 180,000 line segments (counts depend on the density preset and viewport). The shared font is acquired before building and reference-counted across viewers; disposal releases it alongside the existing GPU resources.

The portable package has its own defaults, manifest, controls, styles, original writing, complete scene engine, actual-render preview, handwriting font, derived outlines and both font licenses. The project includes a FontTools authoring script for reproducing the outline subset; exported examples need only a static HTTP server. Styles and font settings are isolated from the original edition. Review remains local.

Validation: model tests and complete Chromium/WebKit browser checks pass, covering all four chapters, free portal crossing and return, reverse pixel identity, five recipes, custom writing/scenes, presets, standalone source export, mobile and lifecycle disposal. A new pixel regression detects spurious saturated colors; both engines report zero after replacing multisample glyph alpha coverage with explicit ink/paper coverage. The original edition retains its own renderer. Desktop, rotated-room and mobile views were visually inspected. Shared Lab checks pass seventeen studies and nine enlarged-text layouts; Concepts navigation passes all twenty-two destinations and sixteen reflows in both engines. Astro reports zero errors, warnings or hints; 68 pages and 6,502 internal links/assets verify. No publication was performed.


### Sketchbook wear refinement · 18 October 2026

Checkpoint: `checkpoint/before-sketchbook-wear-2026-10-18` at `1d8cd7f`. The handwritten edition now has sharper, lighter-pressure ink, broken contours, displaced abandoned outlines, and irregular graphite marks instead of even wave hatching. The O doorway's outer edge wanders while the actual inner counter remains unchanged. Original manuscript and other pages are untouched.

A deterministic wear plan fades actual glyphs and places eraser rubs, scraped paper, and dragged graphite in matching room coordinates. The original procedural textures use two instanced surface batches per room; they remain fixed to the architecture during travel. The default composition has 78 rubbing patches and about 85,000 sketch segments. Canvas backing stores and GPU textures are released on disposal. The controls now read as handwritten page annotations, with neutral paper, unboxed buttons, and lightly rubbed captions.

Validation: full Chromium and WebKit suites pass navigation, reverse rendering, free portal crossings, five recipes, local preset import/export, standalone source reuse, mobile, reduced motion and disposal. Model tests cover deterministic erasure and unchanged portal-counter geometry. Astro reports zero errors, warnings or hints; Lab lint and all 68 built pages and 6,502 links/assets pass. Review remains local.


## Sequin Reveal · 18 October 2026

Created independently at `/lab/sequin-reveal/`, following local checkpoint `aaada49`. The Lab catalog, shared Concepts dropdown, preview, inspector, saved presets and source packages all include this study. No existing effect or homepage was restyled.

A native Three.js instanced geometry combines thin beveled tiles with stationary hinge caps. Each tile has independent angle, spring velocity, target and delayed state in typed arrays. Continuous pointer segments avoid gaps on quick sweeps; velocity broadens the disturbance and distance delays the surrounding ripple. Uncover mode has a photograph beneath the rotating surface and a thin rear support lattice. Reverse mode places the photograph only on tile backs, with a corrected final-position UV map for horizontal, vertical and diagonal hinges.

The study includes seven materials, six presets, three credited local photos, local image selection, coordinated reveal/reset waves, optional delayed closing, keyboard/touch controls, PNG export, and a photograph-to-content transition. Uploaded images never leave the device or enter preset/source exports. The standalone package includes an independent gallery example, exact Three.js runtime, reusable model/renderer, documentation and asset licenses.

The renderer rests without animation work, pauses when hidden/offscreen, and disposes its buffers, geometries, texture, canvas backing store and context. Image changes keep one renderer and replace the previous texture to accommodate WebKit's immutable texture dimensions. The default is 2,752 tiles; square images can use 12,544. Rendering needs at most four draw calls with no per-tile shadow maps. Review remains local.

Validation: full Chromium and WebKit suites pass both modes, all presets, landscape/portrait uploads, keyboard/touch, delayed closing, PNG/preset/source downloads, standalone gallery integration, real intermediate poses and resource disposal. Synthetic-image sampling gives a mean reverse-image error below one channel value in both engines across all three hinge directions. The maximum 12,544-tile case renders in four draw calls with finite spring state and clean context disposal; local median CPU frame submission was below 1 ms (not a GPU-frame-rate guarantee). WebKit context-loss recovery and the refined mobile view also pass. Concepts navigation verifies all 23 destinations, sixteen responsive reflows and no-JavaScript access. Astro reports zero errors, warnings or hints; Lab lint validates 18 studies and 99 portable modules; 69 built pages and 6,649 internal links/assets verify. No publication was performed.

## Slinky Staircase — study 15

Created independently at `/lab/slinky-stairs/`, after checkpoint `c521919`. Registered in the Lab catalog and the desktop/mobile Concepts dropdown. The homepage and earlier experiments retain their designs.

The portable model evaluates a continuous helix around a deformable, curvature-aware axis. Alternating ends anchor to adjacent treads; each descent tips, extends, falls, lands, follows, compresses and recovers. The model is a deterministic authored trajectory, not a calibrated physics solver. Any normalized progress reconstructs the same geometry. A conservative contact envelope keeps the tube above the tread surfaces, and curvature-aware spacing preserves clearance between neighboring turns.

Eight descents by default (six to ten), four materials, 28–72 turns, wire/diameter/stiffness/compression/stretch settings, stair dimensions, fixed/tracking cameras, speed, slow motion, guides and progress. Scroll/trackpad and touch drag operate the surface; keyboard and timeline controls provide equivalent navigation. Autoplay is deliberate, reversible and pauses when hidden or offscreen. Rendering stops when progress is held. Fixed tube buffers avoid geometry allocation during scrubbing; disposal releases geometries, textures, materials and the WebGL context.

`engine.js` accepts settings and optional descending tread geometry, with no dependency on the site UI. `model.js`, `geometry.js` and `staircase.js` separate the trajectory, tube updates and illustration. The source package includes the exact Three.js runtime, the complete instrument, presets, docs, original study plate and `scroll-demo.html`, a native document-scroll integration. The effect is excluded from simultaneous comparison.

Validation: model tests cover deterministic poses, both types of contact handover, all presets and dense extremes, adjacent-turn spacing, tube-vertex stair clearance, normals, reusable buffers and custom stairs. Chromium and WebKit verify reverse pixel equality, fixed camera stability, all material presets, fast scrubbing, wheel/keyboard/touch input, playback/reverse/pause, resize, PNG/settings/source ZIPs, independent exported rendering and context disposal. Maximum topology is 20,745 tube vertices. Dense-coil CPU frame submission measured around 1–2 ms locally; this is not a device-independent GPU frame-rate guarantee. Playwright WebKit exercises Safari’s engine, rather than a physical Safari device. Review remains local.

## Living Music Score — study 16

Created independently at `/lab/living-music-score/`, following local checkpoint `961ea87`. Registered in the Lab and shared desktop/mobile Concepts navigation. The established homepage and earlier experiments retain their own designs.

Three original eight-measure melodies use one structured event model for visible notation, procedural Web Audio and MIDI. The restricted treble renderer supports G3–E6, 3/4 and 4/4, eighth through whole notes, dotted rhythms, rests, accidentals, ledger lines, beat-grouped beams and ties. Edits reflow subsequent notes and split sustained durations across bars/strong beats without retriggering the audio. Final incomplete bars receive silent rests. The supported notation scope is explicit in the UI and reuse guide.

Actual stroke paths draw the staff, clefs, note heads, stems, beams and annotations. Seeded irregularity and variable width create pressure changes. The optional pen, pencil or quill follows the current path's arc length and tangent. Scroll, touch, keyboard and slider writing reverse deterministically. Playback schedules oscillator voices against AudioContext time and uses the same clock for writing and highlighting. Audio starts only with Play; pause, seek, mute, stop, offscreen state and disposal are handled explicitly. Returning or importing a score never resumes sound automatically.

The Compose editor changes pitches, durations and titles, adds/removes notes and offers edit undo. The shared inspector, three ink presets and saved Lab presets include custom composition data. SVG, PNG, composition JSON, standard MIDI and replayable drawing recipes export locally. The independent source package includes layout, stroke, drawing, audio and export modules, Caveat handwriting outlines with their OFL license, an actual rendered preview and a separate embedding example. No runtime dependency or remote recording is needed. The effect is excluded from simultaneous comparison.

Validation: pure model tests cover diatonic/enharmonic positions, measure totals, accidentals, ledger lines, ties, beams, deterministic stroke order, exact tool endpoints, long titles and parsed MIDI timing. Chromium and WebKit verify silent arrival, reverse strokes, real wheel/touch/keyboard interaction, playback completion/pause/seek/mute, editable notation, all presets and exports, local restore, standalone reuse, resizing and closed AudioContexts after disposal. OfflineAudioContext renders produce the written A4 and C5 fundamentals and expected silent intervals; a pitch/duration edit changes both frequency and sustained energy. Browser checks exercise Safari's WebKit engine, not physical audio hardware or OS interruption behavior. Review remains local.

Final checks: Astro reports zero errors, warnings or hints; 71 built pages and 6,949 internal links/assets verify. Lab lint passes twenty manifests and 115 portable modules. Shared Lab regressions pass all twenty studies in Chromium/WebKit; Concepts navigation passes all twenty-five destinations and sixteen responsive reflows in each engine. Full exported scores and the mobile editor were visually inspected; down-stem flags remain on the correct side, and partial final systems end at the last barline. No publication was performed.

## Three-Color Process — study 17

Created independently at `/lab/three-color-process/`, following local checkpoint `92f3a7f`. Registered in the Lab and the shared desktop/mobile Concepts dropdown. Existing concept implementations and the editorial homepage are preserved.

The optical bench uses three genuine intensity records, draggable glass frames, registration crosses, monochrome thumbnails and a digital additive projection. Each record can be inspected in grayscale or through its corresponding primary. Offset, rotation, visibility, exposure, balance, fringe intensity, magnification, panning and comparison controls operate the same underlying image transforms. Keyboard nudges, numeric inputs, touch capture, gesture cancellation, gentle snapping and automatic return to the known calibration supplement dragging. The interface explicitly distinguishes combined projected light from physically stacking colored sheets.

The historical source is Prokudin-Gorskii's *Mosaics on walls in Old Bukhara*, cataloged between 1905 and 1915, Library of Congress LC-DIG-prok-01876. The bundled RGB asset contains independent records from the original three-exposure scan, not channels split from a finished color rendering. The source scan, exact crop/translation recipe, contrast treatment, credits and rights advisory are included. Residual emulsion damage and alignment discrepancies remain; the view is labeled as this project's reconstruction. A credited modern photograph and local JPEG/PNG/WebP selection demonstrate digital separation. Local images stay in memory and are excluded from presets and source exports.

The portable model decodes sRGB to linear light before bilinear sampling, exposure and artistic fringe adjustment, then encodes once for display. GPU sampling uses explicit nearest-texel reads and interpolation; rotation coefficients are calculated on the CPU to avoid platform-dependent fragment trigonometry errors. A single WebGL quad/texture handles the projection. A Canvas fallback renders the same model at reduced preview resolution. No frames run while idle. Disposal releases the texture, buffers, shader program, context, image URLs, decode listeners, timers and observers; context restoration reloads the current data.

Clean reconstruction PNG, three individual grayscale plate PNGs, alignment JSON, shared Lab presets and a standalone source package are implemented. Re-selecting a private image retains restored alignment. `model.js` accepts arbitrary sRGB image data or three equal-sized, calibrated grayscale records; `renderer.js` and `images.js` separate projection from loading and UI. A minimal standalone embedding example and documented coordinate/color contracts are included. This study is excluded from simultaneous comparison.

Validation: model checks confirm exact reconstruction of 2,048 varied sRGB pixels, genuine channel exports, linear-light interpolation/exposure, inverse rigid transforms, visibility, snapping and presets. Chromium and WebKit verify drag accuracy within one browser CSS pixel, exact keyboard nudges, touch, inspection/filter modes, pan/zoom, comparison, private image selection, preset/PNG/source exports, standalone integration, context restoration and disposal. An uploaded 80 × 120 portrait calibration image round-trips through the UI and PNG export with zero pixel error. GPU and CPU output match exactly at neutral registration; rotated/exposed samples differ by at most one 8-bit value, with mean error below 0.002. The Canvas fallback is exact at native dimensions. Desktop and mobile frames/controls were visually inspected. WebKit testing covers Safari's engine rather than physical devices. Review remains local.

Final integration checks: Astro reports zero errors, warnings or hints. The build contains 72 pages and 7,102 verified internal links/assets. Lab validation passes 21 manifests and 121 portable modules. Shared Lab regressions pass all 21 studies in Chromium/WebKit; Concepts navigation passes all 26 destinations and sixteen responsive reflows in each engine. The delivered preview is captured from the actual registered projection, and the source package includes provenance and processing metadata. No publication was performed.
