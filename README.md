# TAMPA CURATED

An independent editorial website about Tampa’s people, places, neighborhoods, and ideas. Built with Astro 7.4, TypeScript, custom CSS, and static content collections. Designed for GitHub Pages: no server, database, UI framework, remote fonts, or paid hosting is required.

The original editorial homepage is preserved at `/`: oversized blue masthead, palm-tree cover, red portrait, editorial worktable, photographic sleeve, and the working six-spread pop-up book. The Clockwork City concept lives separately at `/home2/`, with fine-line machinery, Tampa field-note illustrations, a pulley portrait gallery, photographic apertures, and a schematic map. See [the implementation and review notes](docs/clockwork-city.md) for mechanics, fallbacks, verification, and device-testing limits. The expressive ink-and-pencil notebook is a third, separate concept at `/home3/`, with cropped machinery, handwritten notes, torn photographic windows, and an asymmetric composition. These revisions are local and are not published.

Keep substantially different design ideas on separate pages so the user can compare them before selecting a direction. Preserve existing concepts and isolate experiment-specific components and styles; see [AGENTS.md](AGENTS.md).

The initial release is a **demonstration edition**. All five profiles and eight businesses are fictional. Six essays are sample editorial content, not verified reporting. Six real neighborhood names are paired with sample introductions. Stock portraits do not depict the named fictional people. These distinctions appear throughout the site.

## Run locally

Requirements: Node.js 24 (minimum 22.22), pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use the Local URL printed by Astro. Once `origin` is connected to this repository, the local site uses `/tampa-curated/` to match production. To intentionally preview a root-hosted version:

```sh
BASE_PATH=/ pnpm dev
```

The publication is built to static HTML:

```sh
pnpm check
pnpm build
pnpm verify
pnpm preview
```

Astro 7’s preview command runs in the background. Stop it with `pnpm exec astro preview stop`. In restricted environments, set `ASTRO_TELEMETRY_DISABLED=1` to avoid a write to the operating system’s preferences directory.

TypeScript is pinned to 6.0.3 because the current `astro check` does not support TypeScript 7. The lockfile and all direct package versions are committed.

## Routes

| Route | Contents |
| --- | --- |
| `/` | Original editorial cover, featured-story worktable, five-portrait sleeve, six-spread pop-up book, directory, newsletter |
| `/home2/` | Clockwork City concept: illustrated machinery, cigar/ship/rooster studies, pulley portraits, stories, map, pop-up book |
| `/home3/` | Working Notes concept: expressive ink, pencil, torn photos, and scroll-operated machinery, with all existing content and book features |
| `/unfinished-city/` | A continuous 3D drawing: folding threshold, geared doorway, turning corridor, photographic city, and a full static alternative |
| `/experiments/` | Comparison room for three separate working experiments |
| `/experiments/cabinet/` | Six opening drawers of drawings, photographs and words, with linked stories and notebook saves |
| `/experiments/tracing-city/` | An archival 1887 map with scroll-drawn ink, a sliding tracing sleeve and observations |
| `/experiments/notebook/` | Personal collection, notes, ordering, undo, text download and print/PDF layout |
| `/places/` | Editorial place index |
| `/places/[slug]/` | Place descriptions, categories, neighborhood, address and optional links |
| `/people/` | People to Watch |
| `/people/[slug]/` | Portrait, biography, interview, optional website and social links |
| `/stories/` | Story archive |
| `/stories/[slug]/` | Article, context, photo caption, related stories |
| `/neighborhoods/` | Six neighborhood guides |
| `/neighborhoods/[slug]/` | Introduction and associated places/stories |
| `/issues/` | Issue archive with a designed cover for the first edition |
| `/issues/001/` | Editor’s note and linked contents for the complete first edition |
| `/guides/` | Three themed reading routes through the sample publication |
| `/guides/[slug]/` | A first look, After dark, and Independent minds; three linked chapters each |
| `/photo-journal/` | Four Tampa photographs, captioned and credited individually |
| `/the-list/` | Live category, neighborhood, and name filters |
| `/about/` | Publication concept and editorial principles |
| `/search/` | Search across titles, decks, and full content |
| `/credits/` | Photographer attribution and licenses |
| `/404.html` | Custom GitHub Pages error page |

There are 49 generated HTML pages, plus robots and sitemap files. The seven reading-room additions are reachable through the mobile menu, footer, edition navigation, and search; the desktop Issue 001 marker opens the issue. Home 2, Home 3, and Experiments are linked from the mobile menu and footer. All links and assets respect the configured repository subpath. Search and directory filters work without a backend, preserve their state in the URL, and include empty and reset states. The reading-room pages add no client runtime and remain fully navigable without JavaScript.

The spatial vertical slice at `/unfinished-city/` adds one native Three.js canvas and a reversible journey through an unfinished architectural drawing. It shares the existing mechanical geometry, photographs, stories, and notebook. See [architecture, reference licenses, verification, and next scenes](docs/unfinished-city.md). Review remains local.

## Three editorial experiments

The experiments share a paper-and-ink palette while keeping their layout and interactions in `src/pages/experiments/`, `src/components/experiments/`, `src/scripts/experiments/`, and `src/styles/experiments.css`. They do not replace Home, Home 2, or Home 3. Only a small notebook save control is added to existing neighborhood, story, person, and place detail pages.

- **Cabinet:** six native disclosure drawers work with a pointer, touch, keyboard, or JavaScript disabled. With JavaScript, opening one closes the previous drawer. Direct links such as `/experiments/cabinet/#drawer-sail` open an individual drawer. Original cigar, ship, and rooster drawings, two credited photographs, and an editorial quotation can be collected.
- **Tracing city:** the underlying image is sheet 1 of the [June 1887 Sanborn Fire Insurance Map of Tampa](https://www.loc.gov/item/sanborn01352_002/), courtesy of the Library of Congress, Geography and Map Division, Sanborn Maps Collection. The Library identifies the collection as public domain. A locally stored 1613×1913 JPEG in `src/assets/archive/` was obtained from the [Library's image service](https://tile.loc.gov/image-services/iiif/service:gmd:gmd393m:g3934m:g3934tm:g3934tm_g013521887:01352_1887-0001/full/pct:25/0/default.jpg); Astro generates the displayed WebP. The tracing is our interpretive drawing of the same historical sheet, not present-day cartography. Native scrolling draws streets, water, margin notes, and colored pencil marks; after a pause, the tracing sleeve slides off to the right to reveal the stationary original. Scrolling upward reverses the sequence. The whole SVG sleeve moves as one flat sheet, with its ink and paper texture attached; it does not curl, fold, or roll. The animation only renders when scroll progress changes. Reduced motion, short viewports, enlarged text, and JavaScript disabled show a complete tracing and a separate unobstructed original; all observations and save links remain in ordinary document flow. Its styles live in `src/styles/tracing-city.css`.
- **Field notebook:** a 31-piece shelf combines existing editorial entries, the three drawings, photographs, and a quotation. Collect from other pages, name the collection, write personal notes, move items earlier or later, remove with undo, and download a readable text copy with links and notes. Print/Save PDF uses the browser's print dialog and a collection-only layout. Records remain in this browser under `tc-field-notebook-v1`; there is no account, remote storage, or cross-device sync. Clearing browser storage removes the collection. If storage is blocked, the page explicitly warns that changes last only until navigation or reload. Printed and downloaded copies remain available independently.

The interactions use native controls and small event-driven scripts; there is no continuous animation loop, new runtime dependency, or third-party request. Reduced motion disables decorative transitions. Existing demonstration-content disclosures remain on saved pieces. Run `pnpm test:experiments` against the local preview with Chromium and WebKit installed. It exercises drawer keyboard/touch behavior, cross-page and cross-tab persistence, notes, order, undo, download, print styles, scroll-driven drawing, reversible sideways sleeve movement, stationary archive, idle rendering, native keyboard scrolling, tracing fallbacks, storage failures, no-JavaScript fallbacks, and all four pages at 320–1440px with normal and doubled body text. These are browser-engine checks, not claims of physical iPhone/Safari testing.

## Project map

- `src/pages/` — generated routes and page composition.
- `src/layouts/BaseLayout.astro` — page frame, metadata, canonical URLs, social previews, fonts.
- `src/components/` — navigation, footer, cover building blocks, responsive photos, editorial cards, disclosures, newsletter.
- `src/styles/global.css` — design tokens, print composition, interior layouts, tablet/mobile styles, reduced-motion rules.
- `src/content.config.ts` — validated content schemas and neighborhood references.
- `src/content/{stories,people,businesses,neighborhoods}/` — Markdown editorial content, one entry per file.
- `src/config/site.ts` — publication settings, categories, and navigation.
- `src/config/reading.ts` — reading-guide copy, chapter references, and searchable publication-page metadata.
- `src/styles/reading.css` — scoped layouts for the issue archive, reading routes, and photo journal.
- `src/lib/urls.ts` — the single internal URL helper; use it for every internal path.
- `src/lib/photos.ts` — local photo registry.
- `src/assets/photos/` — original licensed source images; Astro creates responsive WebP variants.
- `src/data/photo-credits.json` — photographer/source/license records.
- `public/licenses/` — the font license texts shipped with the site.
- `astro.config.mjs` — root/repository deployment detection, static output, sitemap.
- `.github/workflows/deploy.yml` — checks, build, link verification, and GitHub Pages deployment.
- `scripts/verify-build.mjs` — generated links, assets, route presence, metadata, and heading checks.
- `scripts/browser-test.mjs` — responsive layouts and real browser interaction checks.

## Add or update editorial content

1. Copy an existing Markdown file in the appropriate collection.
2. Rename the file to a lowercase, hyphenated URL slug, for example `my-new-story.md`. The filename determines its URL automatically.
3. Edit the frontmatter and Markdown body. Use an existing neighborhood filename as the `neighborhood` value. References and category values are checked during the build.
4. Run `pnpm check`, `pnpm build`, and `pnpm verify`.
5. Commit and push to `main`; the workflow publishes the change.

A business example (fictional until replaced with verified information):

```yaml
---
title: "Example Place"
deck: "A concise editorial introduction."
image: "restaurant"
imageAlt: "Illustrative stock image for a fictional example."
treatment: "natural"
categories: ["Restaurants"]
neighborhood: "tampa-heights"
address: null
order: 10
demo: true
---

## The idea

Write the editorial description here.
```

For a real business, supply its verified address and optionally `website` and `instagram` as complete HTTPS URLs. Never invent contact details or hours. The template displays a truthful unavailable state when a field is absent. Remove the fictional body copy, caption, and disclosures only once that entry is ready for publication, then set `demo: false`.

Common fields are `title`, `deck`, `image`, `imageAlt`, `treatment`, `order`, and `demo`. Lower `order` values appear first. Available image treatments: `natural`, `mono`, `blue`, `red`, `ochre`.

Stories additionally require `category`, `neighborhood`, `date`, and `readTime`; `featured: true` places a story in the homepage story register. Profiles require `profession` and `neighborhood` and accept `website` and `instagram`. Their interview text lives in Markdown. Neighborhoods additionally require `character`.

Adding an entry requires no route or template changes. Associated neighborhood pages and site search include it automatically. For the launch edition, also update the demonstration-specific homepage cover, intro copy, footer label, and About page once all of the sample material has been replaced. The original homepage is composed in `src/pages/index.astro`; the illustrated concept is in `src/pages/home2.astro` and `src/components/engraving/`. Home 3 is composed in `src/pages/home3.astro`, `src/components/atelier/`, and the scoped `src/styles/atelier.css`, reusing the existing mechanism controller and book. The separate `PulleyPortraitGallery.astro` preserves the original homepage’s `PhotographicSleeve.astro`.

### Photography

1. Put a licensed photograph in `src/assets/photos/`.
2. Import and register it under a stable key in `src/lib/photos.ts`.
3. Use that key in the entry’s `image` field and write descriptive `imageAlt` text.
4. Add its photographer, original source page, and license URL to `src/data/photo-credits.json`.
5. Confirm the crop at mobile and desktop widths. All supplied source images are local; no third-party image service is needed at runtime.

The original photo files are retained for future crops. `Photo.astro` emits responsive WebP sources with explicit dimensions and lazy loading; cover and detail-page images load eagerly. Photo licensing records are available publicly at `/credits/`. The publication design references the supplied Transmission screenshot without reusing its branding, content, or images.

### Newsletter and public contact details

Edit `src/config/site.ts`:

- `newsletterUrl`: a real hosted signup form from Buttondown, Mailchimp, or your chosen service. The newsletter CTA links directly to that service; this site does not collect or store email addresses.
- `instagramUrl`: the publication’s real public Instagram URL.
- `contactEmail`: the intended public contact email.

Empty values show coming-soon text, not fake links or subscription confirmations. No keys or secrets belong in these fields. Review the external newsletter provider’s privacy and consent settings before opening signups.

## GitHub Pages deployment

Repository: https://github.com/ReferencePun/tampa-curated

Published site address: https://dylanforsberg.com/tampa-curated/

The standard address, https://referencepun.github.io/tampa-curated/, redirects there because this account already has a custom domain on its GitHub Pages user site. This was discovered from GitHub's Pages API and verified over HTTPS. No project-specific custom domain was assumed or added; HTTPS is enabled for this project.

In GitHub, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push to `main`, or run **Actions → Deploy Tampa Curated to GitHub Pages → Run workflow**. The workflow installs the locked dependencies, checks types/content, builds, verifies links/assets, uploads the static artifact, and uses the official GitHub Pages deployment actions. Pull requests run the build checks without deploying.

The workflow reads the actual origin and base path from the official `actions/configure-pages` action, so canonical URLs, social previews, the sitemap, and assets follow the published domain. Without those overrides, Astro uses `GITHUB_REPOSITORY` or reads the GitHub `origin` URL locally:

- `ReferencePun/tampa-curated` → `site: https://ReferencePun.github.io`, `base: /tampa-curated`.
- `ReferencePun/ReferencePun.github.io` → the same domain, `base: /`.
- No GitHub origin → localhost at `/`, suitable for an unconnected checkout.

`SITE_URL` and `BASE_PATH` environment variables explicitly override those settings when needed. Do not set a custom domain until it is actually configured. No `CNAME` file is included. Page-specific canonical and Open Graph URLs, the sitemap, and robots sitemap location all use the resolved site/base.

The deployment job needs `pages: write` and `id-token: write`; the build job needs only `contents: read` and `pages: read` to retrieve its URL. No stored credentials are used in the workflow. If the repository is moved, update its origin and build again.

## Validation

### Reading preferences

The **Reading** control appears on every page. Comfortable text is the default: 19px body copy and at least 16px secondary text, expressed in `rem`. Display headlines and decorative printing inside the illustrated books retain their editorial scale. **Original** restores the earlier type sizes. Both size choices work with optional **Sea glass** on a mouse or trackpad. An irregular, translucent green shard follows the pointer and refracts live text, photographs, rules, and moving scenes. Its center gently magnifies, while uneven thickness bends the edges. It preserves normal clicks and scrolling and turns off with Escape. Touch users retain normal pinch zoom and the Comfortable option. Preferences are stored locally; storage is optional. Without JavaScript, Comfortable typography remains available.

The sizing draws on the [GOV.UK type scale](https://design-system.service.gov.uk/styles/type-scale/). [W3C Resize Text guidance](https://www.w3.org/WAI/WCAG21/Understanding/resize-text) calls for enlargement to 200% without loss of content or functionality; it does not specify a universal minimum font size. This is not a claim of full WCAG conformance.

The reading suite (`pnpm test:reading`, with Chromium and WebKit installed) covers both text sizes, sea glass, clicking through the glass, persistence, Escape and focus, touch behavior, JavaScript disabled, and representative layouts at 320–1440px with normal and doubled text. `node scripts/sea-glass-test.mjs` additionally compares rendered photo and text pixels with the decorative overlay hidden, checks local refraction bounds, and exercises all six moving atlas spreads.

Sea glass uses a lazily loaded SVG displacement filter on the actual page. A small generated optical map describes the shard’s thickness; it is not a page capture. Only intersecting sections are filtered, and tall sections are subdivided so the seven-screen atlas track is never rasterized as one layer. No cloned text, images, scenes, screenshot loop, or rendering dependency is introduced. The decorative overlay is inert and hidden from assistive technology. Pointer/scroll events schedule at most one frame; disabling the glass removes active filters. This source-filter approach avoids WebKit’s [URL backdrop-filter limitation](https://bugs.webkit.org/show_bug.cgi?id=245510); displacement follows the [SVG filter primitive](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap).

```sh
pnpm check
pnpm build
pnpm verify
pnpm exec playwright install chromium
pnpm preview
TEST_BASE=/tampa-curated pnpm test:browser
pnpm exec astro preview stop
```

For root hosting, build with `BASE_PATH=/` and omit `TEST_BASE`. `TEST_ORIGIN` can point the browser checks at another local preview. Screenshot output is ignored by Git in `test-results/`.

The browser suite checks representative pages at **1600, 1440, 768, and 390 px**, captures four homepage screenshots, checks horizontal overflow, exercises the mobile menu and Escape/focus behavior, combines category/neighborhood/name filters, tests empty and reset states and query persistence, checks site search, verifies reduced-motion behavior, and reads the directory with JavaScript disabled. The build verifier checks every generated page’s local links and asset references.

Before publishing real reporting, replace the demonstration people/businesses and sample essays, add approved portraits and location photography, verify practical details, and configure contact/social/newsletter destinations. The current edition intentionally makes no verified endorsements.
