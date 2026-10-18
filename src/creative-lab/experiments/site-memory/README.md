# Site Memory — a website that becomes an atlas

Explore a miniature House of Small Discoveries. Enter an observatory, glasshouse, tide room, type foundry, lantern tower and map room. The central drawing becomes a personal architectural/mechanical engraving from your actions. This is a working, independent SVG experiment, not a conventional node graph or an analytics visualization.

## Run and use

Serve the source ZIP over HTTP and open `example.html`. No dependency, API key or build step is required. The included original preview depicts a clearly illustrative sample route; a new visitor begins with an empty journey. The demo never imports the sample as actual history.

- Enter a room: its architectural object joins the drawing. First-visit order determines placement.
- Move to another room: an engraved passage joins the objects. Return trips reinforce its ink.
- Open field notes: leave a tiny book mark. Closing notes adds no event.
- Inspect: add a small gear and an inspection tick. Inspecting again adds another mark.
- Keep a discovery: add a selective pencil seal. Each demo room can be completed once per journey.
- Every event has an individual tick in the memory ribbon, including repeated activity.

The diagram combines perspective architecture, paired corridor contours, stair-like crossbars, small gears, dimension lines, irregular pencil traces and drafting annotations. It is procedural vector linework. Ink/arrangement/complexity/density settings change the actual SVG; they are not cosmetic overlays.

## Determinism and saved data

`model.js` contains the versioned semantic document. `drawing.js` turns it into an SVG string without reading the clock, browser, storage, or random globals. All irregularity comes from the saved numeric seed and stable event/destination keys. `storage.js` is an optional local adapter. `index.js` supplies the demonstration UI and lifecycle; `destinations.js` contains only the invented room content.

A saved journey contains:

```json
{
  "schemaVersion": 1,
  "engineVersion": 1,
  "id": "my-journey-01",
  "title": "An afternoon of discoveries",
  "seed": 49,
  "createdAt": 1792274400000,
  "destinations": [
    {"id": "observatory", "label": "The observatory", "kind": "observatory"},
    {"id": "garden", "label": "The garden", "kind": "glasshouse"}
  ],
  "appearance": {
    "complexity": 2, "density": 1, "inkStyle": "graphite",
    "arrangement": "atlas", "guides": true
  },
  "events": [
    {"seq": 1, "type": "visit", "target": "observatory", "at": 1792274401000},
    {"seq": 2, "type": "inspect", "target": "observatory", "at": 1792274402000},
    {"seq": 3, "type": "visit", "target": "garden", "at": 1792274403000}
  ]
}
```

The semantic record, seed and appearance reconstruct the same SVG string, even after reload, import or reverse replay. `renderJourney` returns a stable `signature` for visual regression; it is a noncryptographic convenience, not a security signature. UTC timestamps are retained for the ledger but do not affect geometry. The renderer has `engineVersion: 1`; a future incompatible drawing algorithm must introduce a new version and retain a renderer/migration for old journeys. Do not silently change the version-1 layout if exact long-term reconstruction is required.

Imports validate identifiers, unique destinations, illustration kinds, versions, event sequence/order, finite monotonic timestamps, settings, size and event count. Unknown event types/targets are rejected; unrelated metadata is discarded. Invalid imports leave the current journey intact. Labels are escaped in SVG and inserted as text in the UI. The file chooser processes JSON locally without uploading it. A different imported journey with a colliding saved ID receives a new storage ID while retaining its seed and exact artwork.

## Portable engine API

```js
import {createMemory} from './model.js';
import {renderJourney} from './drawing.js';

const memory = createMemory({
  id: 'my-journey-01', title: 'An afternoon of discoveries',
  seed: 49, createdAt: Date.now(),
  destinations: [
    {id: 'observatory', label: 'The observatory', kind: 'observatory'},
    {id: 'garden', label: 'The garden', kind: 'glasshouse'}
  ]
});
const unsubscribe = memory.subscribe(journey => {
  drawingContainer.innerHTML = renderJourney(journey).svg;
  // Your storage adapter can save JSON.stringify(journey) here.
});
memory.record({type: 'visit', target: 'observatory'});
memory.record({type: 'open', target: 'observatory'});
memory.record({type: 'inspect', target: 'observatory'});
memory.record({type: 'complete', target: 'observatory'});
memory.record({type: 'visit', target: 'garden'});

const journey = memory.snapshot(); // defensive copy
memory.setAppearance({...journey.appearance, arrangement: 'courtyard'});
memory.load(previouslySavedJourney); // validated, not appended as events
unsubscribe();
```

`createMemory` has no DOM, storage or framework dependency. It never subscribes to clicks, URLs or page views itself. Your site explicitly submits relevant semantic events. The API allows repeat events; the demonstration avoids recording a second click on the already-current room and disables duplicate room completions. Event time defaults to `Date.now()` when *recording*, and a clock moving backward is clamped to the previous event time. Saved geometry does not depend on that clock.

Destination IDs are unique ASCII identifiers, 1–64 characters (`a-z`, digits, period, underscore, colon, hyphen; first character alphanumeric). Labels are up to 64 characters. Available original object renderers: `observatory`, `glasshouse`, `wheel`, `press`, `tower`, `atlas`. These are generic architecture/mechanisms rather than Tampa pages. Add a new kind to `KINDS` and `objectMarkup` in a new engine version when extending the illustration vocabulary.

1–24 destinations and up to 512 events are supported. The demonstration is composed for six rooms. Larger supplied catalogs become smaller, denser plans. Per-object decorative glyphs are limited to the first 36 local actions for legibility; all actions remain in the document, counts, complete event ledger and memory ribbon. Density changes hatching, not which semantic events exist. Renderer work is bounded by these limits, not unbounded pointer movement.

## Full instrument API

```js
import {mount} from './index.js';
const instrument = mount(element, {
  persistence: true, inkStyle: 'umber', arrangement: 'courtyard'
}, reportStatistics, {
  storageKey: 'my-site:illustrated-journey:v1',
  destinations: [
    {id: 'workshop', label: 'Workshop', kind: 'press',
     subtitle: 'Inside the workshop.', body: 'Your destination content.',
     note: 'An optional longer note.', inspection: 'Inspect the press',
     seal: 'Keep the printer’s proof'}
  ]
});
instrument.setRunning(true);
instrument.record({type: 'visit', target: 'workshop'});
const snapshot = instrument.serialize();
instrument.load(snapshot);
instrument.update({...instrument.getSettings(), complexity: 3});
const svg = instrument.getArtwork().svg;
instrument.dispose();
```

The fourth argument may supply `destinations`, an initial validated `journey`, a `storageKey`, and a Storage-compatible `storage` object. Pass `storage: null` to disable storage access even if a preference asks to persist. Imported documents carry their own destination labels/kinds; any missing demonstration prose gets a neutral explanation. No route names are hardcoded in the engine.

`mount` returns `record`, `serialize`, `load`, `update`, `setRunning`, `replay`, `getSettings`, `getArtwork`, `dispose`. Only `record` adds events. `load` replaces the current validated journey and follows the persistence setting. `replay` opens the recorded timeline; a native slider can scrub it without animation. `getArtwork()` and artwork export always return the full, completed journey, even while the interface displays a replay prefix. If you want the prefix SVG, call `renderJourney(snapshot, {count: 3})` directly.

When integrating with React/Vue/etc., mount once into a sized element, send application events through `record`, and call `dispose` from the component cleanup. Do not remount on each render. The Lab/standalone wrapper calls `setRunning` as visibility changes; the instrument also suspends its work in hidden/offscreen views. All event listeners, observers, animation frames and Web Animations are cleaned up on disposal.

## Local memory, privacy and concurrency

Default storage key: `impossible:site-memory:journeys:v1`. Stored data is one versioned archive with active journey ID, revision and up to twelve documents. This is device/browser/origin-specific storage, not cloud backup. Export JSON to transfer it.

- Local persistence is on by default and visible in the UI. The blank sheet is not stored until an interaction or explicit save-related action occurs.
- Starting a new journey preserves earlier saved journeys. Resume reconstructs the selected document, including its appearance, and restores it as active.
- Session-only mode stops archive writes and automatic restoration on the next mount. Older saved journeys remain available for explicit resume. Starting over from an unsaved session asks before replacing its drawing.
- Reset all history requires an explicit confirmation, removes only this experiment’s archive, and empties the current drawing. It does not clear unrelated local storage or other experiments.
- Denied/quota-limited storage and corrupt archives never silently claim success. The current drawing remains usable with JSON export. A corrupt archive is not overwritten by automatic saving.
- Storage revision checks detect stale snapshots before a write, and storage events flag changes made by other tabs. If another tab changes the archive, autosave stops. Resume the latest saved version, or export the current session before starting a separate journey. This is browser-local conflict detection, not a cross-device synchronization service.
- No accounts, analytics, identifiers shared with a server, cookies, tracking across the actual Tampa website or environmental/data requests are introduced. The outer Lab still stores its ordinary inspector presets; those contain visual settings, never journey events.

## Controls and exports

| Setting | Default | Meaning |
| --- | --- | --- |
| `complexity` | 2 | 1–3, architectural hatching and mechanical detail |
| `density` | 1 | .5–1.5, in .1 steps; density of corridor crossbars and pencil marks |
| `inkStyle` | `graphite` | `graphite`, `umber`, `blue` |
| `arrangement` | `atlas` | `atlas`, `courtyard`, `procession` |
| `guides` | true | Construction lines, dimension guides |
| `persistence` | true | Save the semantic journey locally |
| `speed` | 1 | .25–3 in .25 steps; line drawing and replay speed |

Replay supports forward/reverse playback, holding, scrubbing and return to the complete journey. Reduced motion keeps immediate still drawings and manual scrubbing but disables automatic playback. Replay never persists or records its temporary prefix. Inactive studies pause replay and in-progress ink strokes; completed drawings have no animation loop.

Journey JSON exports semantic events plus catalog, seed, version and drawing appearance. SVG export is a complete standalone vector artwork with embedded presentation styles and accessible description. The Lab's standard JSON preset/source export contains settings and implementation only, never private visitor history. Export a journey separately and import it into the standalone example to recover the same artwork. The source package includes an independent example, the original preview, full code, this guide and the MIT license.

## Tests

`pnpm test:site-memory` verifies deterministic SVG reconstruction and replay prefixes, different event orders/types, appearance changes, validation/escaping, limits, storage revisions/corruption/erase isolation and the reusable event API. Browser coverage verifies real exploration, local save/reload/resume, session-only behavior, invalid and valid import/export, replay without history mutation, all controls, SVG validity, source export/standalone, mobile, reduced motion, unavailable storage and lifecycle cleanup. No external services are needed.
