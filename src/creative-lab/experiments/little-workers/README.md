# Little Scribble Workers

Five original articulated pencil studies build a small webpage. No external packages, images, fonts, services or tracking. Original code and artwork: MIT.

## Run and inspect

Serve the exported directory with any local HTTP server and open `example.html`. The complete notebook and its local controls work independently of Tampa. `embed-demo.html` is a smaller ordinary-document integration. No build/install step is necessary. Lab inspector presets and source exports use `config.json` / `manifest.json` and include the selected settings.

## Portable attachment API

```js
import {createMarginWorker} from './worker.js';
const worker = createMarginWorker({
  element: document.querySelector('.reserved-art'), // positioned, aspect-ratio:760/430
  activity: 'hammer', // hammer | ladder | rope | paint | carry
  target: document.querySelector('.divider'),
  character: 'coat', // crew | draughtsman | coat | apron
  position: 'left', // left | right (mirrors the drawing)
  scale: 1, // .75–1.25, preserves hands/tool contact
  settings: {ink:'#37342e', stroke:.8, irregularity:.7},
  scrollTrigger: document.querySelector('.chapter'), // omit for controlled mode
  scrollRoot: null, // null = document; otherwise a native scroll container
  sequence: {start:.1, end:.9}, // normalized working interval
  onOutput(output, state) { /* connect another application property */ }
});
worker.setProgress(.42); // exact seek; no elapsed-time integration
worker.update({character:'apron', side:'right'});
worker.getState();
worker.dispose();
```

Reserve space before mounting. Put the output in a sibling or descendant within that reserved art area. The worker adds only an absolutely positioned SVG with `pointer-events:none` and `aria-hidden`. It never prevents pointer, touch or wheel events. Put functional links/buttons outside visual clipping targets. Original inline target styles are restored on disposal. The SVG scales to 760×430 coordinates; output targets use CSS percentages. On a mirrored layout, mirror target positions too; do not mirror readable text.

The optional trigger maps its top crossing 70% of the viewport to progress zero, and its bottom moving past −40% to one. It listens passively to the chosen scroll root. Omit the trigger when integrating with your existing timeline; call `setProgress()` with a normalized value. `sequence` remaps a subsection of that timeline. The notebook demo instead assigns one working interval to each section's sticky card.

## Data and jobs

`evaluate(activity, progress, settings)` in `model.js` is a DOM-free pure function. Its result includes articulated `pose` joints, an optional `tool`, and `output`. Every frame is reproducible at any progress, including reverse and discontinuous seeks. There is no accumulated physics, randomness or automatic loop.

- **hammer**: five nails, each hit at cycle phase .6. `output.completed`, `divider`, and per-nail `depth` derive from that cycle. Hammer head equals the nail position at impact. The worker moves to the next nail after striking.
- **ladder**: eight alternating advances on 22-unit rungs. One hand/foot pair stays planted while the other pair moves two rungs; contacts alternate. `output.reveal` clips the actual HTML paragraph from the same progress.
- **rope**: a pair of overhead sheaves and a ratchet. Each 36.5-unit pull grows the tail by precisely the distance the load leg shrinks. The load stays held during the return grip. `output.lift` raises the actual HTML figure; `ropeAngle = lift / 22` rotates the wheels. The figure's top is at 61% of the stage, under the hook. This is a kinematic drawing of a ratcheted hoist, not a rope dynamics simulation.
- **paint**: an arc-length trace over the original architectural path. `output.tip` is exactly the pencil tip and the last revealed point while drawing. The pencil lifts between five separate contours, leaving no spurious connecting lines. A little drafting carriage supports the figure as it traces high and low details. Previously traced segments remain until progress reverses.
- **carry**: three timber deliveries. Walking, placement and empty-handed return have separate phases; the visible beams and the revealed HTML thought use the same track. At each endpoint the beam lies on its support.

`joint()` solves the two-bone joint around exact contact endpoints. A small length extension is permitted for extreme character size settings; this is expressive drawn anatomy rather than a biomechanical simulation. Body variation changes garments without shifting tools. `drawing.js` makes contour jitter and hatching from fixed seeds; nothing flickers at a held progress.

## Settings

- `character`: a mixed crew by default, or a rumpled jacket, long coat or working apron. Head proportions and garments distinguish the three original figure studies.
- `size`: .75–1.25; anatomy scale around fixed contacts.
- `activity`: `team` or any individual job.
- `irregularity`: 0–1, seeded broken pencil contours.
- `ink`: six-digit hexadecimal color.
- `stroke`: .35–1.4 SVG units.
- `progress`: 0–100, the notebook's scroll position.
- `distance`: 1200–5000 working scroll pixels, excluding the five visible card heights.
- `speed`: .5–2, pace within each working interval: lower values build later, higher values earlier; every job still finishes at its endpoint.
- `side`: left or right. The demo repositions its HTML outputs along with the mirrored actors.

Local presets provide graphite, red-pencil, fine-nib and notebook studies. Export the current configuration with the Lab preset controls and use it in the source ZIP's standalone example.

## Accessibility, motion and lifecycle

The demo uses a native keyboard-focusable scroll region, HTML headings, a labeled timeline and selects, and readable explanatory text. Actors cannot block any interaction. Sections reserve height; animation transforms/clips output without reflow. On narrow screens the drawing is enlarged inside its reserved area; text remains HTML.

Reduced-motion users receive a paused preview and can seek explicitly or choose the finished page. Autoplay is opt-in; wheel, touch, pointer or keyboard interaction in the notebook stops it. Hidden/offscreen previews stop autoplay. Idle progress schedules no continuing frames. `mount()` returns `update`, `setRunning`, `replay`, `getState`, and `dispose`; disposal cancels scheduled work, removes listeners/observers and restores outputs. The source adapter has no continuous animation loop.

## Verification

Run `pnpm test:little-workers`. Model checks exercise every track in both directions, planted contacts, hammer impacts, rope length, brush contact, beam placement and seeded rendering. Browser checks cover native scrolling, manual seeks, individual activities, controls/presets, touch-capable narrow layouts, actual wheel movement, keyboard, exported standalone files, native-document attachment and disposal in Chromium and WebKit (Safari's engine). A physical iPhone is not emulated hardware testing.
