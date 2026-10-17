# The unfinished city

A local vertical slice at `/unfinished-city/`, connected to the existing experiment index, mobile menu, footer, story pages, and field notebook. Home, Home 2, Home 3, their pop-up books, and their scroll-driven illustrations are preserved.

## What the journey does

1. **The drawing:** a mechanical threshold and long wall planes begin flat against a drafting sheet. They rotate around actual hinges as the camera approaches.
2. **The threshold:** an extruded ring gear surrounds a real circular opening. Two door leaves swing inward; the camera passes through the open geometry into a deeper arcade.
3. **The corridor:** repeated structural bays, incomplete stairs, and a pulley/counterweight establish depth. The camera rounds the corner and changes its direction of travel by approximately 90 degrees. A small, authored roll accompanies the turn and returns to level.
4. **The city:** a wider invented streetscape opens beyond the corridor. A localized shader reveal develops an existing, credited Ybor photograph within an architectural facade. An HTML link opens the existing story and a contextual return link leads back to the city.

This is a single staged 3D world. The doorway reveals a physically larger environment behind its aperture; it does not use recursive portals or teleport the camera between independent coordinate systems. That choice keeps this vertical slice continuous, reversible, and economical. A true alternate-space portal is a useful next extension, not a capability claimed here.

## Architecture

- **Framework:** existing static Astro site; native Three.js 0.186.1, with `@types/three` 0.186.0. React, React Three Fiber, Drei, a model loader, and a second animation framework are unnecessary for this slice.
- **One canvas:** `src/scripts/spatial/controller.ts` owns one WebGL renderer, scene, perspective camera, and lifecycle. Three.js is loaded dynamically when the experience approaches the viewport, or when a room deep link is requested.
- **Choreography:** `path.ts` contains nine configurable checkpoints with normalized progress, position, look target, and roll. A centripetal Catmull–Rom curve interpolates position; normalized quaternions and spherical interpolation control orientation. Each checkpoint eases into a deliberate resting view. A short, time-based damping step follows native scroll progress; it does not intercept wheel or touch scrolling.
- **Unified state:** the same progress drives the camera, wall hinges, door leaves, gear pair, counterweight, pulley, compass, photograph reveal, captions, and room navigation. Backward scrolling evaluates the same functions in reverse; there are no independently running mechanical timelines.
- **Existing machinery:** the gears extrude the involute outlines from `src/lib/mechanisms.ts`, also used by the site's SVG machinery. The 48/20 tooth pair uses shared `meshPhase` and pitch-circle separation. The smaller gear turns at the negative 48/20 ratio. The pulley and counterweight move by equal and opposite travel, conserving cable length.
- **Drawing language:** `world.ts` batches thin line segments by ink tone. Pen deviations, repeated contours, hatch marks, and broken construction lines are generated once in object coordinates. Pale planes provide selective occlusion; outlines are separated from filled surfaces to avoid coplanar fighting. No frame-by-frame random noise is applied to the architecture.
- **Photography:** the existing Ybor image is built to a local WebP and fetched for the scene only after the corridor approach. A small custom shader reveals it with an irregular graphite-like boundary and a muted tonal treatment. The drawing-underneath button reverses that reveal. The semantic photograph, credit, and story link remain in HTML below the scene.
- **HTML layer:** all editorial copy, navigation, buttons, inputs, captions, and story links remain real HTML. The canvas is decorative to assistive technology; it contains no essential text or exclusive navigation.

## Interaction and history

Normal scrolling, trackpads, mouse wheels, keyboard scrolling, and touch scrolling drive the passage. The four room links jump to meaningful camera views. The crank is a labeled native range control, usable by pointer, touch, and keyboard, that scrubs the opening sequence. The passage can be exited directly to the field notes.

Room links use `#drawing`, `#threshold`, `#corridor`, and `#city`. Explicit room changes create history entries; settled scroll positions update the current entry without adding dozens of history entries. Browser Back and the story's contextual return link are supported. In moving mode, the static article IDs are temporarily renamed so WebKit cannot re-anchor the browser to the written notes after fonts load. Reading mode restores the normal article anchors.

The field notebook's existing save control works on the ending story. Collections retain their established browser-local behavior.

## Fallbacks and performance

- Reduced motion defaults to an original static SVG plate and complete, ordinary editorial content. The renderer is not loaded. A visitor may explicitly try the moving version.
- “Read without motion” remembers the preference locally. Storage is optional.
- A small or text-enlarged viewport switches to the still layout if controls and captions would crowd the canvas.
- JavaScript disabled, WebGL unavailable, or a lost graphics context leave the drawing, all four written rooms, photograph, and story links usable. A retry creates a new canvas after disposing of the previous scene.
- Mobile uses fewer secondary buildings and stair fragments, with a wider camera field of view. Pixel ratio is capped at 1.25 on mobile and 1.7 on desktop; sustained slow frames can reduce it further to 0.85.
- Rendering is scheduled only while progress changes or an input, asset load, resize, or visibility change needs a frame. It stops at rest, offscreen, and in a hidden tab. Geometry, textures, observers, event listeners, and the renderer are disposed when leaving moving mode.
- The spatial renderer chunk is approximately 574 KB uncompressed / 145 KB gzip in the current build. There are no remote model files, postprocessing pipelines, real-time shadows, audio, or per-room WebGL canvases.

## Reference and license audit

Engineering principles were studied; no reference-site models, textures, images, artwork, or source implementation were copied into this project.

| Reference | Inspected material and useful principle | License / use here |
| --- | --- | --- |
| [Santal Architecture](https://santalarch.com/) | Public page and entry bundle; Nuxt, GSAP/ScrollTrigger and Lenis identifiers are visible. Spatial pacing and changes of orientation informed the brief. | Site identifies its content as copyright Santal. No reusable application-source or asset license verified; no assets or code reused. |
| [ITom portfolio](https://github.com/ITomPoland/portfolio-itom) | Camera ownership, room state, corridor visibility, and performance-tier implementations. [Creator's technical article](https://tympanus.net/codrops/2026/06/11/sketching-the-impossible-a-3d-portfolio-built-without-a-single-3d-model/) also describes construction from simple geometry. | [MIT code license](https://github.com/ITomPoland/portfolio-itom/blob/main/LICENSE); README excludes personal assets and copywriting from reuse. No assets or implementation copied. |
| [Codrops camera-path tutorial](https://tympanus.net/codrops/2026/07/07/building-a-scroll-driven-3d-gallery-using-a-blender-camera-path-with-three-js-and-gsap/) and [curve-gallery](https://github.com/gaspoorf/curve-gallery) | Curve reconstruction and a normalized progress value controlling the camera. Repository manifest uses Three ^0.184.0 and GSAP ^3.15.0. | No repository `LICENSE` was available at the inspected path. Used the general camera-path principle; implemented our own authored checkpoints, native-scroll controller, and scene. |
| [Drei MeshPortalMaterial](https://drei.docs.pmnd.rs/portals/mesh-portal-material) | Source reviewed for render targets, masking, scene-relative coordinates, and crossing blends. | [MIT](https://github.com/pmndrs/drei/blob/master/LICENSE). Not installed or copied; the current doorway uses physical staging. |
| [R3FSketchMaterial](https://github.com/abhishekmill/R3FSketchMaterial) | Object-space marks, stable hatching, derivative-aware lines, and outline separation. | [MIT code](https://github.com/abhishekmill/R3FSketchMaterial/blob/main/LICENSE); demo car is separately CC-BY 3.0. Neither shader code nor car imported. Our lines are independently generated native geometry. |
| [Emergent Mind portal rooms](https://www.emergentmind.com/visualizations/portal-rooms) | Public description of camera transforms and clipped recursive sectors. | Linked implementation returned 403; no implementation reuse license verified. Mathematical reference only. |

Three.js is MIT; its complete license is retained in `public/licenses/three.txt`. The existing GSAP dependency has its own Standard “No Charge” license, not MIT, and is not imported by the new spatial controller. The photograph retains its existing Ikuna / Unsplash attribution. The new architecture is an original imaginary space, not a historical reconstruction of Tampa.

## Verification

Run against the local preview:

```sh
pnpm check
pnpm build
pnpm verify
pnpm test:spatial
TEST_BASE=/tampa-curated pnpm test:browser
node scripts/spatial-record.mjs
```

The spatial suite samples the camera path 1,001 times, checks normalized orientations, bounded camera changes, a valid crossing through the circular aperture, and the final direction of travel. Real-browser tests cover all four rooms, matching forward/reverse states, gear coupling, the crank, photo reveal, story entry/return, browser history, deep links, mobile controls, idle/offscreen rendering, local preferences, reduced motion, 200% text reflow, no JavaScript, no WebGL, and simulated graphics-context recovery. Both browser engines passed; the general site suite also passed 88 responsive page checks. Screenshots and a recording are saved in the ignored `test-results/spatial/` directory.

The final mobile typography and automatic still-mode transition after live text enlargement also passed in both engines. Build validation checked 49 HTML pages and 3,937 internal links/assets. Type checking reported no errors or warnings.

The recording is `test-results/spatial/unfinished-city.webm`, showing forward travel, the photograph toggle, and reverse travel. During the 1280 × 800 headless recording, animation-frame intervals had a median of 33.3 ms and a 95th percentile of 66.7 ms; adaptive resolution reached 0.85, with 65 draw calls in the final scene state. These measurements include recording overhead and are diagnostic, not a claim of 60 fps on hardware.

Chromium and Playwright WebKit are the browser targets. WebKit exercises the Safari rendering engine family; these checks do not certify physical desktop Safari or an iPhone. A hands-on Safari/trackpad/device pass remains appropriate before publishing.

## Next scenes worth building

1. **The harbor observatory.** Put a single clipped render-target portal behind the circular gear. A small opening could contain a vastly larger ship-rigging room with a different horizon, providing a stronger impossible-space effect while keeping rendering bounded.
2. **The Ybor rolling room.** Extend the existing paper folds into a concertina of tobacco-leaf studies and architectural vaults. A pulley-operated wall could reveal a verified photographic story without adding game-like controls.
3. **The suspended archive.** Let a saved notebook piece appear as a drawing pinned inside an architectural drawer. Opening it would lead to the existing notebook or story, connecting spatial exploration to a useful personal collection.

The first is the best next step: it deepens the spatial illusion established by this prototype without rebuilding the working homepage or multiplying unrelated scenes.
