# The Clockwork City — local review

The October 2026 homepage redesign replaces the cover collage and repeated middle image rows with an original engraved mechanical edition. The work stays on `feature/mechanical-atlas`; the checkpoint branch `checkpoint/before-clockwork-city-20261017` points to `602cd38`. No push or publication is part of this revision.

The brief's referenced concept illustration was not attached, so the implementation follows its written art direction and reuses the existing licensed Tampa photographs. No external artwork or demo code was copied.

## Experience

- **Clockwork hero:** a sixty-tooth open wheel frames the Tampa waterfront. Four meshing gears, two connected pulleys, two slider cranks, and a calibrated compass share scroll progress. The aperture opens and drafting lines extend during a short sticky sequence on tall desktop windows. On phones, the simplified illustration sits immediately below the title, followed by the introduction.
- **A city drawn from life:** an articulated two-link drafting arm, paired gears, and traced architectural lines uncover the Ybor Factory Building photo. The original drawing is explicitly schematic.
- **Pulley gallery:** a crossed belt counterrotates equal grooved wheels. Inner cables lift the portrait sleeve while outer weights descend by the same distance. The five existing profiles retain drag/swipe, keyboard, index, controls, history, and image-treatment fallbacks.
- **Clockwork aperture:** an eight-part engraved iris reveals the waterfront after dark. The four existing featured stories form a readable editorial register below it.
- **Mechanical map:** a fine-line schematic connects all six neighborhood guides, with a traced route, geared pointer, and rotating compass.
- **Pop-up atlas:** the existing six-spread book remains. Pages turn from right to left across the spine; the cover is not replayed. Resting and turning spreads now share the same viewport fit so phone gutters cannot clip a corner.

The pale paper, muted blue drafting ink, graphite text, and serif headings apply to the homepage. Interior routes and their comfortable reading sizes are preserved. The sea glass still refracts the actual page; search, directory filters, newsletter availability, photo credits, and demonstration disclosures remain intact.

## Implementation

| Responsibility | Location |
| --- | --- |
| Original involute-derived teeth, registration, belt tangents, crank geometry | `src/lib/mechanisms.ts` |
| Reusable engraved gears, pulley wheels, rods, aperture, dials, image frames | `src/components/engraving/` |
| Page compositions | `ClockworkHero`, `CityDrawing`, `ClockworkAperture`, `MechanicalMap`, `PulleyGalleryRig` |
| Motion and lifecycle | `src/scripts/engraving/controller.ts`, `index.ts` |
| Edition styles and responsive composition | `src/styles/engraving.css` |
| Existing book renderer and fit | `src/scripts/mechanical/atlas.ts`, `atlas-book.ts` |

GSAP 3.15.0 is pinned in the package manifest and lockfile. One `ScrollTrigger` with `scrub: true` drives an absolute progress value per composition. All rotation ratios and linkages derive from that value; there are no independent wheel loops, scroll interception, or synthetic scrolling system. Reversing to the same offset restores the same pose. Stopping scrolling freezes the mechanisms.

Meshing gears have equal module, center distance equal to the sum of pitch radii, opposite angular velocity, and tooth-count ratios. The hero uses an open belt (same rotation direction; radius ratio); the gallery uses a crossed belt (opposite rotation direction). Cable travel equals wheel radius × angle in radians. Slider-crank rods retain a constant length. The drafting arm uses a two-link inverse kinematic solution with fixed lengths.

Geometry and responsive scaling are measured outside the animation callback. SVG attributes and the lifted frame's transform are written only when progress changes. The initial server markup is a complete static plate with open photographic windows. Reduced motion skips the animation import, removes active controllers when toggled, and restores that static artwork. Listeners, observers, animations, and scheduled work are released on teardown; back/forward cache restores the controllers.

Layout changes request a **safe** ScrollTrigger refresh. Forcing a refresh during the atlas's native smooth chapter navigation can cancel that scroll, so recalculation must wait until scrolling settles. See the [official refresh documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.refresh()/).

## Verification

With the production preview running at `/tampa-curated/`:

```sh
pnpm check
pnpm build
pnpm verify
TEST_BASE=/tampa-curated pnpm test:browser
pnpm test:reading
TEST_BROWSER=chromium,webkit pnpm test:mechanical
node scripts/engraving-test.mjs
node scripts/atlas-regression.mjs
node scripts/sea-glass-test.mjs
node scripts/mechanical-touch-performance.mjs
node scripts/engraving-performance.mjs
```

There is no configured lint command. `astro check` covers TypeScript and Astro diagnostics. Browser evidence and captures live under the Git-ignored `test-results/` directory.

`engraving-test.mjs` checks all five sequences forward/backward and at rest; seven identifiable physical gear meshes; constant rod lengths; the cable's rendered attachment to the moving frame; opposite pulley motion; photo and drawing reveals; reduced-motion cleanup; narrow layouts; and no-JavaScript destinations. `atlas-regression.mjs` additionally checks painted paper/photo pixels, both sides of every page turn, controls, bounds, and history. Existing browser, reading, portrait, and sea-glass suites remain in use with selectors updated for the new homepage.

Physical macOS Safari and iOS device testing is still outstanding. Playwright WebKit exercises a Safari-related engine but is not a claim of physical Safari/iPhone verification. Local headless frame timing is evidence of automated cadence, not a device performance guarantee. The existing Firefox launch limitation is documented in the historical atlas notes.

### Results from the initial engraving pass

- Astro check: zero errors, warnings, or hints. Production build: 42 pages; 2,581 internal links/assets verified.
- Chromium 156 and WebKit 27.2: the new mechanism suite, all five page turns across six spreads, portrait interaction/history/fallbacks, and sea-glass pixel checks pass. Visual captures were inspected at desktop and phone widths.
- The existing browser suite passes 60 responsive route checks. The reading suite passes 90 viewport/enlarged-text combinations per engine, including 320px and 200% text size.
- Chromium touch simulation passes native vertical scrolling, a portrait swipe, 1.5× pinch zoom, and graphics-context-loss fallback.
- The five mechanical plates each recorded 119 frame intervals: median 16.7ms, p95 16.7–16.8ms, no intervals over 25ms and no long tasks. The book's 179-interval sample recorded the same cadence. These measurements were taken locally without throttling.
- Current homepage HTML: 219,752 bytes / 53,022 bytes gzip. The new GSAP/controller chunk is 117,033 bytes / 45,400 bytes gzip and is skipped in reduced-motion mode. The illustrations are native SVG; no new photo downloads, 3D framework, or external runtime service was introduced.


### Hand-drawn drafting refinement

The illustrations now use much finer strokes, softly retraced rings, uneven hatching, and faint drafting grids. `src/lib/drafting.ts` generates repeatable pen deviations at build time; the paths remain attached to their rotating parts. There is no animated noise, raster roughening filter, or new animation dependency. Photograph masks, mechanical ratios, scroll behavior, and reading sizes are retained. Phone strokes are slightly reinforced to stay visible at the smaller scale.

Astro check/build and all 2,581 link/asset checks pass. The Chromium and WebKit engraving suites pass, including physical gear/rod/cable relationships, stop/reverse behavior, reduced motion, responsive layouts, and static links. Updated visual captures are in `test-results/engraving/`. The more detailed server-rendered SVG brings homepage HTML to 365,097 bytes / 119,817 bytes gzip.

The final local, unthrottled Chromium timing run recorded 119 intervals per scene: median 16.7ms, p95 16.7–16.8ms, zero intervals above 25ms, and no long tasks across all five scenes. An earlier run under heavy system load stuttered; the repeat measures automated cadence, not physical-device performance.

### Tampa field notes

The homepage now includes an illustrated folio after the Ybor architectural study: tobacco leaf, unlit banded cigars and a crescent maker’s blade; an imagined three-masted pirate ship with rigging, planked hull and crossed-cutlass pennant; and a rooster with individually etched feather barbs. A rope-wrapped anchor also appears in the neighborhood map. These are original SVG drawings in the existing fine blue ink, with descriptive accessible titles and readable HTML captions. The artwork is rendered at build time, adds no animation or dependencies, and the folio stacks into single studies on phones.

The cultural references were checked against Visit Tampa Bay’s [Ybor City overview](https://www.visittampabay.com/ybor-city/) and [Gasparilla overview](https://www.visittampabay.com/tampa-events/gasparilla-season/). The ship is expressly described as imagined, rather than a measured depiction of the José Gasparilla.

Validation: Astro reports no diagnostics; all 42 pages build and 2,584 internal links/assets resolve. Chromium and WebKit pass the existing five-mechanism suite, plus illustration layout checks at 1440, 800, 594, 390 and 320 pixels, enlarged text at 320 pixels, accessible image labeling and neighborhood navigation. Desktop and phone captures are saved in `test-results/tampa-studies/` and were visually inspected, including a final refinement of the rooster’s face and feather texture.
