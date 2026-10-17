# Design explorations

The user wants to compare multiple ideas before choosing a direction.

- Keep the main homepage (`src/pages/index.astro`) in its established editorial design: oversized blue TAMPA CURATED masthead, palm-tree cover, red portrait, and warm paper. Preserve its working pop-up book and reading controls.
- The illustrated clockwork / blueprint concept is a separate page at `/home2/`, composed in `src/pages/home2.astro`.
- The expressive ink-and-pencil notebook is a separate experiment at `/home3/`, composed in `src/pages/home3.astro`, `src/components/atelier/`, and `src/styles/atelier.css`.
- The curiosity cabinet, archival tracing table, and personal field notebook are separate working rooms under `/experiments/`, with isolated styles and scripts. Keep them separate from the three homepage concepts.
- The spatial vertical slice is separate at `/unfinished-city/`, with one native Three.js renderer in `src/scripts/spatial/`, HTML content and controls, and an accessible static alternative. Preserve its room deep links and shared mechanical geometry. The camera must continue traveling along a street between the Tampa landmark sketches on both sides.
- For a substantially different visual direction, create another separately addressable page. Do not replace an existing concept or broadly restyle shared components unless the user explicitly asks.
- Keep experiments' styling and variant components separate so changes to one concept do not alter the others. Small fixes and requested refinements can stay on their intended page.
- Keep review work local unless publication is requested.
