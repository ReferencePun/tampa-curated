# TAMPA CURATED

An independent editorial website about Tampa’s people, places, neighborhoods, and ideas. Built with Astro 7.4, TypeScript, custom CSS, and static content collections. Designed for GitHub Pages: no server, database, UI framework, remote fonts, or paid hosting is required.

The local Mechanical Atlas revision replaces the three middle homepage sections with an editorial worktable, an interactive photographic sleeve, and an unfolding neighborhood atlas. See [the implementation and review notes](docs/mechanical-atlas.md) for controls, fallbacks, measured costs, verification evidence, and device-testing limits. This revision is not published.

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
| `/` | Cover collage, four featured stories, five profiles, six neighborhoods, directory, newsletter |
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

There are 42 generated HTML pages, plus robots and sitemap files. The seven reading-room additions are reachable through the mobile menu, footer, edition navigation, and search; the desktop Issue 001 marker opens the issue. All links and assets respect the configured repository subpath. Search and directory filters work without a backend, preserve their state in the URL, and include empty and reset states. The reading-room pages add no client runtime and remain fully navigable without JavaScript.

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

Stories additionally require `category`, `neighborhood`, `date`, and `readTime`; `featured: true` places a story in the homepage grid. Profiles require `profession` and `neighborhood` and accept `website` and `instagram`. Their interview text lives in Markdown. Neighborhoods additionally require `character`.

Adding an entry requires no route or template changes. Associated neighborhood pages and site search include it automatically. For the launch edition, also update the demonstration-specific homepage cover, intro copy, footer label, and About page once all of the sample material has been replaced. The homepage’s selected cover story and portrait are composed in `src/pages/index.astro`.

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

The **Reading** control appears on every page. Comfortable text is the default: 19px body copy and at least 16px secondary text, expressed in `rem`. Display headlines and decorative printing inside the illustrated books retain their editorial scale. **Original** restores the earlier type sizes. Both size choices work with the optional **2× text lens** on a mouse or trackpad. The lens follows text, preserves normal clicks and scrolling, and turns off with Escape. Touch users retain normal pinch zoom and the Comfortable option. Preferences are stored locally; storage is optional. Without JavaScript, Comfortable typography remains available.

The sizing draws on the [GOV.UK type scale](https://design-system.service.gov.uk/styles/type-scale/). [W3C Resize Text guidance](https://www.w3.org/WAI/WCAG21/Understanding/resize-text) calls for enlargement to 200% without loss of content or functionality; it does not specify a universal minimum font size. This is not a claim of full WCAG conformance.

The reading suite (`pnpm test:reading`, with Chromium and WebKit installed) covers the two preferences, the 2× lens, clicking through the lens, persistence, Escape and focus, touch behavior, JavaScript disabled, and representative layouts at 320–1440px with normal and doubled text. Lens copies are inert, hidden from assistive technology, and contain only one small text block; no page/scene/image duplication or new rendering dependency is used.

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
