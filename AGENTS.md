# Design explorations

The user wants to compare multiple ideas before choosing a direction.

- Keep the main homepage (`src/pages/index.astro`) in its established editorial design: oversized blue TAMPA CURATED masthead, palm-tree cover, red portrait, and warm paper. Preserve its working pop-up book and reading controls.
- The illustrated clockwork / blueprint concept is a separate page at `/home2/`, composed in `src/pages/home2.astro`.
- The expressive ink-and-pencil notebook is a separate experiment at `/home3/`, composed in `src/pages/home3.astro`, `src/components/atelier/`, and `src/styles/atelier.css`.
- The curiosity cabinet, archival tracing table, and personal field notebook are separate working rooms under `/experiments/`, with isolated styles and scripts. Keep them separate from the three homepage concepts.
- The tracing table draws its ink and pulls the whole sleeve off to the right with native scrolling. Preserve its loose-film character: warm translucency, softened ink, a top-right pivot, and a slight tilt and upward drift as it is pulled. The sleeve stays flat: do not curl, fold, or roll it. Keep that sequence reversible, preserve the stationary archive underneath, and retain the static original and observations for reduced motion or no JavaScript.
- The spatial vertical slice is separate at `/unfinished-city/`, with one native Three.js renderer in `src/scripts/spatial/`, HTML content and controls, and an accessible static alternative. Preserve its room deep links and shared mechanical geometry. The camera must continue traveling along a street between the Tampa landmark sketches on both sides.
- For a substantially different visual direction, create another separately addressable page. Do not replace an existing concept or broadly restyle shared components unless the user explicitly asks.
- Keep experiments' styling and variant components separate so changes to one concept do not alter the others. Small fixes and requested refinements can stay on their intended page.
- Drawings use small, selective colored-pencil scribbles: uneven overlapping strokes may stray beyond the outlines. Use varied amber, rose, blue and green for scattered window lights, keeping most windows uncolored. New color accents should remain linework with paper showing through, not solid fills. Shared SVG marks live in `ScribbleAccent.astro`; native 3D marks use `Ink.scribble`.
- Keep review work local unless publication is requested.
