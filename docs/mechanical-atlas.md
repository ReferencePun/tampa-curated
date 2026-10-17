# Mechanical Atlas — local review

This is a revision of TAMPA CURATED, on `feature/mechanical-atlas`. The baseline is commit `aa8fed04f25b468f08149b4c22833addec2fbc4e`. Nothing in this revision has been pushed or published. The existing deployment workflow, content collections, image credits, navigation, search, directory, masthead, hero, The List, and footer are retained.

## The three scenes

**Editorial worktable.** Four existing featured stories become a landscape lead, an offset tall print, a smaller print with a paper edge, and a text-led entry. A short, reversible scroll separation affects the prints. The margin wheels use one absolute progress value, opposite rotation, a 24:16 ratio, and a half-tooth registration offset. Text and links stay stationary.

**Photographic sleeve.** Five existing fictional profiles share a large print viewer and a stable caption panel. Drag, swipe, focused arrow keys, Home/End, previous/next, and the direct index select the same destinations. Captions announce only settled selections. The fixed archival sleeve clips an aligned set of treated duplicates; originals and duplicates use the same geometry, dimensions, crops, scale, and tilt. Duplicates are decorative and inert.

One lazy WebGL 1 canvas adds a small sampling displacement near the sleeve edges, transmitted tint, and a movement-sensitive highlight. It uses original shader code, no graphics framework, a DPR cap of 1.5, and at most three textures. Calibration measures 24 frame intervals and completed GPU draws before the canvas appears. Save-data, low-memory, context failure, measured budget failure, context loss, and reduced motion retain the DOM print overlay. It renders on demand, stops offscreen/hidden/idle, and disposes resources, including interrupted calibration. The visible treatment label reports the selected renderer without calling the DOM fallback refraction.

**Neighborhood atlas.** Six existing guides share one articulated book. The structural chain is stage → board → book → left/right leaf → attached hinge → front/back surface. Maps, photography, architecture, a palm silhouette, and a foreground registration strip occupy separate planes. Hinge origins sit on the paper spine or the bottom of each rising layer. Filters, clips, grain, and blending stay on leaf surfaces. Original silhouettes and street diagrams are explicitly schematic. Each neighborhood has its own accent, roofline, water trace, arrangement, image, heading, deck, and guide link.

Desktop has the homepage's only sticky section, 200svh total, enabled only at widths ≥1100px and heights ≥760px. Mobile and short windows have an Open/Close control with immediate access to selectors and links. Reduced motion shows the open scene without animation or pinning. Direct neighborhood hashes select their guide and skip the folding introduction.

## Implementation map

| Area | Files |
|---|---|
| Homepage composition | `src/pages/index.astro` |
| Three server-rendered scenes | `src/components/EditorialWorktable.astro`, `PhotographicSleeve.astro`, `NeighborhoodAtlas.astro` |
| Book and margin artwork | `src/components/AtlasBook.astro`, `RegistrationWheels.astro`, `src/config/atlas.ts` |
| Scoped middle-section styles | `src/styles/mechanical.css` |
| Settings and lifecycle | `src/scripts/mechanical/settings.ts`, `index.ts`, `progress.ts` |
| Scene controllers | `worktable.ts`, `sleeve.ts`, `atlas.ts` in that script directory |
| Shared projection / lazy optics | `sleeve-model.ts`, `sleeve-optics.ts` |
| Native page-image transitions | `src/components/NativeImageTransitions.astro`, `Photo.astro`, `BaseLayout.astro`, existing people/story/guide detail templates |
| Browser verification | `scripts/mechanical-test.mjs`, `scripts/mechanical-touch-performance.mjs`, existing `scripts/browser-test.mjs` |

No new dependency was needed. The two absolute scroll mappings and bounded settling motions are small enough to use native events and requestAnimationFrame directly. The existing exact dependency versions and lockfile are preserved. There is no smooth-scroll controller, React, client router, or wheel interception.

The bootstrap imports each scene near the viewport. Scene initializers return disposers. Pagehide releases listeners, observers, animation frames, and graphics resources; pageshow restores enhancements after a back/forward cache return. Stored selections survive ordinary back/forward navigation too. No unload handler or scroll-restoration override is installed.

The System / Reduced control is stored locally. System honors the operating system preference. Reduced disables the scroll controllers, settling motion, fold animation, optical renderer, pinning, and image transitions; selecting content still works immediately.

Navigation uses native cross-document View Transitions, with 420ms timing and only one intended image named at a time. Repeated portraits and treated copies never share that name. Root-page snapshots are disabled. Links, modifier keys, hash navigation, history, focus, and unsupported-browser behavior remain native; no fetch/swap router or artificial navigation delay is added.

## Verification and evidence

Run the normal type/build/link checks first, then start the production preview:

```sh
pnpm check
pnpm build
pnpm verify
pnpm preview
TEST_BASE=/tampa-curated pnpm test:browser
TEST_BASE=/tampa-curated pnpm test:mechanical
node scripts/mechanical-touch-performance.mjs
```

Install browser binaries with `pnpm exec playwright install chromium webkit firefox` when needed. `TEST_BROWSER=chromium,webkit` selects engines for the mechanical suite. A Firefox launch failure is recorded as unverified, never as a passing test. The runtime tests assume a running preview. Root hosting uses `BASE_PATH=/` for build/preview and `TEST_BASE=''` for browser tests.

Verified locally:

- Type/content check: no errors, warnings, or hints.
- Static build: 35 pages; all generated internal links and assets verified, unique titles/descriptions, and one h1 per page.
- Existing 32 responsive page checks, mobile menu/Escape/focus, directory category/neighborhood/name filters, empty/reset states, query persistence, search, and the no-JS directory.
- Chromium 156 and WebKit 27.2: forward/reverse scroll; partial drag captures at 22%, 50%, and 80%; stable captions; identical duplicate geometry; buttons, focused keyboard navigation, direct selection, pointer cancellation, profile/guide navigation, reload/back, bounded textures, and idle rendering stop.
- System reduced motion, saved Reduced mode, no JavaScript, no WebGL, direct portrait/guide hashes, and forward history. Native image transitions reached ready with exactly one named image in both tested engines.
- Chromium touch input: vertical scrolling, horizontal swipe, and pinch zoom. Simulated context loss removes the canvas and leaves controls usable.
- Captures at 1440×900, 1536×960, 768×1024, 390×844, 375×667, and 844×390. The 720×450 CSS viewport checks reflow equivalent to a 1440×900 desktop at 200% zoom.

Evidence is intentionally local and Git-ignored:

- Baseline: `test-results/mechanical-baseline/`.
- Configured-base results: `test-results/mechanical-base/report.json`, `performance.json`, `size.json`, and viewport/state PNGs.
- Root-hosted results: `test-results/mechanical-root/`.
- Review recording: `test-results/mechanical-base/review.webm`.

At 1440×900, the locally automated Chromium scroll sample recorded 179 intervals: median 16.7ms, p95 16.8ms, no intervals over 25ms, and no animation long tasks. Initial optical calibration selected WebGL in Chromium and WebKit, with approximately 16.7–17ms median cadence and 0.5ms mean completed draw cost. This is a local, unthrottled automation measurement, **not a physical-device FPS claim**.

The baseline homepage was 25,148 bytes / 5,501 bytes gzip, with 514 inline JavaScript bytes. The revision is approximately 61KB / 11KB gzip HTML. The conservative initial JavaScript bound is about **4.3KB gzip**, including the bootstrap, nearby worktable/progress modules, and all inline JavaScript. All scene JavaScript together is about **12KB gzip**; the optical renderer is its own deferred chunk of about **3KB gzip**. Added homepage CSS is about **5KB gzip**. See `size.json` for exact build filenames and byte counts. Gzip is measured locally; server compression may differ. No new photographs or external image requests were added.

## Remaining verification limits

Firefox 157 downloaded successfully but could not launch its temporary profile on this host, including a retry using `/private/tmp`. Firefox behavior remains unverified.

WebKit interaction checks pass, but its automated screenshots flatten some nested perspective compared with Chromium. Explicit rear-face paint order/culling avoids reversed paper backs while retaining the structural 3D hierarchy. The camera's bounded motion keeps these rear faces pointing away throughout. Rectangular photo surfaces avoid the compositor fragments observed with clipped photo faces; separate SVG layers supply the paper silhouettes. These captures are not proof of Safari or iPhone rendering. A real Safari/macOS and iOS device review of depth, touch, native transitions, and performance remains advisable before publishing. Modifier-link handlers preserve native defaults; opening an actual background tab could not be confirmed through the local automation harness.

## Assets for a real editorial edition

Replace fictional profile names/copy and stock models with commissioned portraits, recorded interviews, and approved biographical information. Commission consistent portrait crops with room around the head and shoulders for the sleeve. Replace the illustrative Seminole Heights coffee, Hyde Park palms, Tampa Heights interior, and Water Street aerial with verified, neighborhood-specific photography. A wide contextual photograph plus separate architecture, vegetation, and foreground cutouts would give each atlas scene more local specificity. Keep licenses and photographer credits attached to every replacement. Existing demonstration and image-context disclosures remain visible.

## Reference review

References were read for selective technical guidance; the external demos were not executed and no tutorial code, models, shaders, or image assets were copied.

- [Codrops 3D carousel](https://tympanus.net/codrops/2025/05/07/on-scroll-3d-carousel/) and its [MIT repository](https://github.com/codrops/3DCarousel/) informed the restrained depth relationship, not an infinite scroll behavior.
- [Liquid glass article](https://tympanus.net/codrops/2026/09/08/building-an-infinite-liquid-glass-grid-with-three-js-webgpu-and-tsl/) informed the decision to keep the optical sampling bounded to one surface. Its React/WebGPU stack was not adopted.
- [Paper effect article](https://tympanus.net/codrops/2026/09/19/crumbled-paper-houdini-vat-threejs/) and [repository](https://github.com/item-develop/paper-crumple-demo) were inspected; no VAT/Houdini pipeline was required for articulated paper hinges.
- [MDN transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transform-style) identifies flattening properties; [MDN native view transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using) and [Astro's transition guidance](https://docs.astro.build/en/guides/view-transitions/) informed the native MPA implementation.
- [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) were evaluated. The final implementation uses no animation dependency.
- [WCAG dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), [animation controls](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [animation performance guidance](https://web.dev/articles/animations-guide), and [Astro GitHub deployment](https://docs.astro.build/en/guides/deploy/github/) informed the controls, rendering constraints, and base-safe static build.
- [Playwright's WebKit screenshot issue](https://github.com/microsoft/playwright/issues/21620) documents a related perspective/backface capture limitation. It is context for the observed difference, not proof of its exact cause on this host.
