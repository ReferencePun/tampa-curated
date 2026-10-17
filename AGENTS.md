# Design explorations

The user wants to compare multiple ideas before choosing a direction.

- Keep the main homepage (`src/pages/index.astro`) in its established editorial design: oversized blue TAMPA CURATED masthead, palm-tree cover, red portrait, and warm paper. Preserve its working pop-up book and reading controls.
- The illustrated clockwork / blueprint concept is a separate page at `/home2/`, composed in `src/pages/home2.astro`.
- The expressive ink-and-pencil notebook is a separate experiment at `/home3/`, composed in `src/pages/home3.astro`, `src/components/atelier/`, and `src/styles/atelier.css`.
- For a substantially different visual direction, create another separately addressable page. Do not replace an existing concept or broadly restyle shared components unless the user explicitly asks.
- Keep experiments' styling and variant components separate so changes to one concept do not alter the others. Small fixes and requested refinements can stay on their intended page.
- Keep review work local unless publication is requested.
