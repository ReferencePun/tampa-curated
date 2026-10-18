# Photographic particle archive

The requested experiment replaces the Stories index at `/stories/`. It is also available under **Concepts → Particle archive**. Home 1, Home 2, Home 3, the mechanical book, tracing table, spatial street, and other experiments keep their existing compositions. Article pages receive only a contextual return link when entered from this archive.

## Reference and original implementation

Reviewed [Eddy Naboulet’s site](https://eddy-naboulet.dev/), including its current Projects composition, and the creator’s [Communication Arts interview](https://www.commarts.com/webpicks/eddy-naboulet). The interview describes Astro/TypeScript, Three.js, custom GLSL, image-derived pointer-reactive particles, GSAP, and History API navigation. Those techniques informed the implementation; no source code, artwork, fonts, or shaders were copied from that site. The archive’s shaders and sampling code are original. Existing project dependencies and locally credited photographs are reused.

The vertical slice was first built and visually checked with the real Tampa palm/high-rise photograph, including the full reveal and an article/return round trip. The same renderer was then extended to the other five stories. The site’s sample-editorial and stock-photography disclosures remain visible.

## Image formation and interaction

- CPU sampling runs once per photograph near the viewport. It uses the same centered cover crop as the HTML image. Luminance and neighboring contrast control the probability and weight of each mark; a seeded generator gives each retained point a position, size, angle, and small horizontal dash.
- At rest, visible imagery consists of actual amber, cream and rust GPU point particles on a charcoal image plate. The background/photo shader shows a flat dark ground at rest and reveals registered source color under the interaction field. The surrounding page retains its warm paper.
- Pointer movement paints a broad, feathered photograph reveal and drives actual particle displacement. Shared `RevealWake` records the full swept path in a 128 × 128 material texture: a fully clear center grades continuously into grains, then gradually becomes covered again over about 1.2 seconds. The separate 96 × 96 `PointerRipples` height field receives pressure along the moving pointer path. Its gradients push individual particles apart and together as crests and troughs pass. Absorbing boundaries prevent the whole image from shaking. A held cursor adds no motion. The registered photograph remains undistorted while surrounding points flow; damping and a smooth 2.3-second tail return them exactly to rest. Both compact textures upload only when changed.
- Reach and Softness controls adjust the reveal field. Each plate also has a native **Uncover image** button, useful for touch and keyboard users. **Show photographs** displays the ordinary image collection.
- A small drafting gear turns with native scroll. There is no scroll hijacking. Titles, dates, descriptions, links, instructions, and controls remain HTML.
- The fixed canvas opts into the existing sea-glass surface filter, so the reading tool refracts the rendered ink as well as the page text. It remains inert and preserves click targets.

## Rendering and lifecycle

`src/scripts/archive/index.ts` loads the Three.js/GSAP archive chunk only when motion is allowed. One transparent fixed canvas renders the visible plates with individual viewports and clipped scissor rectangles. DOM rectangles are cached on resize, font readiness, and ResizeObserver notifications; scrolling uses the cached document coordinates. Pointer movement does not read layout.

Desktop sampling uses 320 columns; coarse-pointer/narrow devices use 190. Device pixel ratio is capped at 1.65 desktop and 1.25 touch. Sustained slow frames lower pixel ratio to 1 and reduce the sampling budget for subsequent plates. The six-story collection bounds total retained geometry and texture count. Textures are cropped copies capped at 1280px, uploaded once. The copy avoids responsive HTML image dimensions changing WebGL allocations and requires no additional image request.

Rendering is requested for input, scroll, size changes, and the short settling interval. Scrolling recalculates the reveal from the last screen-space pointer position and cached plate rectangles, keeping it beneath a stationary pointer. Only intersecting plates draw. The frame loop stops when settled or hidden. Page exit and motion-preference changes dispose textures, geometries, materials, the renderer/context, observers, listeners, and pending frames. Browser cache restoration creates one fresh renderer. WebGL initialization or context loss falls back to the normal photographs. Reduced motion, no JavaScript, and print also retain the complete archive and native links.

## Article navigation

A normal unmodified click runs a contained 280ms GSAP resolve with restrained fragment movement. The selected HTML photograph becomes visible before a fresh native click reaches the site’s existing cross-document image transition. This pairs the selected photo with the article hero where the browser supports view transitions. A 650ms fallback ensures animation timing cannot trap navigation. Modified clicks, targets, and ordinary reduced-motion links retain browser behavior. There is no new router or history replacement.

Browser Back uses native scroll restoration. The contextual article return link includes a plate anchor, and matching recent session state restores the previous scroll offset. Storage failure leaves a usable anchor. A Back/Forward round trip must not replace the saved story with an empty selection. The toolbar reserves its loading height to prevent late initialization from shifting the restored position.

## Validation and limitations

The same fine-grain treatment and wake behavior also run in `/lab/particle-photos/`. Both render fixed photographic detail beneath genuinely displaced particles; the Lab uses instanced quads and this archive uses GPU points. The supplied reference recording informed the grain scale, amber tonal range and cursor trail, and is not bundled or redistributed.

Run `pnpm check`, `pnpm build`, `pnpm verify`, and `pnpm test:archive` against the local preview. The archive suite uses Chromium and WebKit for six lazy plates, pixel-stable ink at rest and after pointer exit, reveal controls, article navigation, Back/Forward and explicit return position, responsive hit targets, 320–1440px layouts and doubled text, high-DPI touch, reduced-motion changes, no JavaScript, unavailable WebGL, and context loss. Screenshots live in ignored `test-results/archive/`.

These are automated browser-engine and visual screenshot checks, not a claim of testing physical iPhones or installed desktop Safari. Cross-document image morphing depends on browser support; correct native navigation and the contained resolve remain the fallback. The existing shared Three.js bundle still produces the build’s large-chunk advisory; it is loaded on demand for this page, not added to the ordinary homepage path.

This work is local for review and has not been published.

Review completed October 17, 2026: Astro check reports no errors, warnings, or hints; the build generates 49 pages; verification checks 4,391 internal links/assets. The archive suite passes in Chromium and WebKit, including a framebuffer check that the reveal stays under a stationary cursor during scrolling. The existing navigation, responsive browser, reading, sea-glass, experiments, spatial, mechanical, Home 2/Home 3 engraving, and six-spread atlas suites also pass. The mechanical suite reports Firefox unavailable in this environment, so it remains unverified.

October 18 refinement: the fine amber grains and fading swept reveal passed the particle archive checks in Chromium and WebKit. Local source exports, presets, pointer/touch input, still rendering, and disposal were also checked in the separate Particle Photos study.
