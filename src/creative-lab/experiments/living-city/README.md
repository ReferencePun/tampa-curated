# Living City — the estuary observatory

An original SVG mechanical waterfront responds to real environmental measurements. No framework, WebGL, API key, photograph, or server is required. All illustration and effect code is MIT licensed. The source ZIP runs independently of Tampa Curated.

## Start

Serve this directory over HTTP and open `example.html`. The export includes its controls, inspector settings, preset, documentation, and lifecycle adapter. Live mode requests NOAA directly over HTTPS with CORS; simulation works without a network. The preview plate is a static illustration, never a claim of current conditions.

```js
import {mount} from './index.js';
const effect = mount(document.querySelector('#instrument'), {
  mode: 'live', location: 'tampa', sensitivity: 1, smoothing: .8
});
effect.setRunning(true);
// Keep the host sized, e.g. height: 1120px; width: 100%.
effect.update({...effect.getSettings(), complexity: 3});
// Before removing the host:
effect.dispose();
```

`mount(host, settings, reportStats, optionalAdapter)` returns `update`, `setRunning`, `replay`, `dispose`, `getSettings`, `getState`, `getSnapshot`, and async `refresh(force)`. `update` accepts a full settings object; get the current settings before changing individual values. `setRunning(false)` holds motion. Explicit input still changes the instrument pose. `replay()` opens the start of recorded history, or restores the simulation bench. All DOM is scoped to `.lc`; instances have unique SVG clip IDs.

The effect emits bubbling `lab:settings` with settings and `lab:set-pause` with `false` when the visitor explicitly plays history. The portable example handles both. When embedding without that adapter, call `setRunning(true)` yourself. Local recipe selection, PNG-free SVG export and observations JSON are contained in the effect. The Lab's preset and source ZIP controls are provided by the surrounding host.

## Official data, verified products and provenance

Default: **Old Port Tampa, Florida, NOAA 8726607**, 27.8578 N, 82.5528 W. Alternative: **St. Petersburg, NOAA 8726520**, 27.7606 N, 82.6269 W. Both stations returned water level, wind and six-minute tide predictions during implementation. McKay Bay Entrance was checked but not selected because current water/wind were unavailable.

- [NOAA API documentation](https://api.tidesandcurrents.noaa.gov/api/prod/)
- [Response fields and quality flags](https://api.tidesandcurrents.noaa.gov/api/prod/responseHelp.html)
- [Old Port Tampa station](https://tidesandcurrents.noaa.gov/stationhome.html?id=8726607)
- [Old Port Tampa sensor metadata](https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/8726607.json?expand=sensors)
- [St. Petersburg station](https://tidesandcurrents.noaa.gov/stationhome.html?id=8726520)

The adapter requests `water_level` and `wind` with `range=24`, and `predictions` with `interval=6`, a UTC begin date one day back and `range=48`. All products use `units=metric`, `time_zone=gmt`, `format=json`; water and predictions use `datum=MLLW`. Wind is m/s, direction **from** true north, water is metres above Mean Lower Low Water. MLLW is a vertical reference, not the seabed. Readings apply at the station, not across the whole city. The architecture and mechanisms are artistic inventions, not a depiction of the station or historical building arrangements.

Every displayed observation retains its actual value, timestamp, quality and flags. Numeric zero is valid; missing/empty values become `null`. Preliminary water's first flag is an outlier **sample count**, not a binary rejection; the flat/rate/limit flags suppress questionable values. Verified inferred status is retained in flags. Wind speed/direction/gust are suppressed when NOAA flags are raised. The UI marks preliminary, verified, flagged and stale observations. Observation timestamps are displayed in UTC.

The tide instrument uses the rate between adjacent **predictions**, in m/hour. It does not infer actual water current or claim a measured tide slope. Prediction interpolation is explicit. History chooses the latest actual observation at or before the selected time; if the gap exceeds 18 minutes, that observation is unavailable. Readouts never invent intermediate measurements. Smooth movement happens only in the drawing.

## Cache, errors and lifecycle

- Water and wind TTL: six minutes. Predictions TTL: one hour. Products have independent cache and error state.
- Manual refresh: at most once per 30 seconds. Automatic polling runs every six minutes only when the study is visible, document active, in live mode and outside historical replay.
- Requests are sequential with 150 ms spacing. Each has a 12-second timeout and abort signal. HTTP and NOAA JSON errors are handled.
- Optional localStorage retains the last successful per-station/product responses for at most 48 hours. Denied/quota-limited storage falls back to memory. Cached values keep their original observation timestamps and fetch status; cache never changes a value into “live now.”
- Observations older than 30 minutes are marked **STALE**. Stale wind stops the turbine. Missing sensors fade their instruments and show dashes, never invented live values. A failed product does not suppress working products.
- Simulation never requests environmental data. History freezes its observation window until returning to live. Hiding/unmounting aborts requests and cancels timers/frames; returning checks the adapter cache. Reduced motion shows deterministic instrument positions and disables automatic historical replay.
- `dispose()` removes the SVG, event listeners, observers, polling, animation and active fetch. Download object URLs are revoked after delivery.

## Adapter interface

The four independent layers are `noaa.js` (fetch/normalize/cache), `sensors.js` (schema and time sampling), `mechanics.js` (illustrative states) and `drawing.js` (SVG). `index.js` composes these into the demonstration. Use the pieces without the UI if desired.

```js
const adapter = {
  id: 'my-environment',
  sources: [{id: 'harbor', label: 'My harbor station'}],
  async getSnapshot({location, signal, force}) {
    // Fetch your source; honor signal. Normalize into this contract.
    return {
      schemaVersion: 1,
      source: {
        id: 'harbor', name: 'My harbor', provider: 'My service',
        url: 'https://example.org/station', datum: 'MLLW',
        units: {water: 'm', wind: 'm/s', direction: 'degrees from true north'}
      },
      fetchedAt: Date.now(), // when the request completed, not observation time
      series: {
        water: [{time: 1792274400000, value: .42, quality: 'observed', flags: []}],
        wind: [{time: 1792274400000, speed: 3.2, direction: 80,
                gust: 4.5, quality: 'observed', flags: []}],
        prediction: []
      },
      products: {
        water: {status: 'fresh', fetchedAt: Date.now(), error: null},
        wind: {status: 'fresh', fetchedAt: Date.now(), error: null},
        prediction: {status: 'error', fetchedAt: null, error: 'Not supplied'}
      }
    };
  }
};
mount(host, {location: 'harbor'}, report, adapter);
```

The numbers above are **schema examples**, not current observations. Arrays must be ordered, have unique increasing UTC Unix-millisecond timestamps, contain finite values or explicit `null`, and have at most 20,000 rows each. Empty arrays mean unavailable. Supply all three arrays even if some are empty. Prediction rate needs two points no more than 18 minutes apart. `validateSnapshot` rejects malformed metadata and unordered/nonfinite values. Normalize your source to m, m/s and true-north degrees. This demonstration's HTML labels assume MLLW: to reuse a different datum without any UI changes, convert your observations into MLLW first, or compose `createDrawing` with your own readout labels. The drawing engine itself has no datum assumption. Observation and prediction time sampling accepts arbitrary normalized sources.

Own adapters control their caching and error semantics. The instrument supplies an AbortSignal and enforces its refresh cooldown. Custom source strings are inserted as text; source links accept only HTTP(S).

```js
import {sampleSensors} from './sensors.js';
import {targetMechanics, createMechanism, stepMechanism} from './mechanics.js';
import {createDrawing} from './drawing.js';
const drawing = createDrawing(element);
const target = targetMechanics(sampleSensors(snapshot, Date.now()), settings);
const state = stepMechanism(createMechanism(), target, 1/60, settings.smoothing);
drawing.render(state, settings);
// Repeated steps ease the state. Paused/reduced-motion: last argument false.
drawing.dispose();
```

## Controls and units

| Setting | Default | Purpose |
| --- | --- | --- |
| `mode` | `live` | `live` or clearly labeled `simulation` |
| `location` | `tampa` | `tampa`, `stpete`, or custom adapter source ID |
| `sensitivity` | 1 | Overall illustration gain, .25–2.5; never changes readouts |
| `complexity` | 2 | 1–3: hatching, windows, pencil/engraving details |
| `smoothing` | .8 | 0–2; exponential settling time, 0 immediate |
| `windResponse` | 1 | 0–2, multiplier for turbine speed |
| `tideResponse` | 1 | 0–2, multiplier for water height and predicted tide mechanisms |
| `history` | false | Replay available observation history |
| `progress` | 100 | 0–100% through the last available day |
| `timeScale` | 30 | 1–120 historical minutes per real second |
| `testWater` | .65 | Simulation metres MLLW, −.5 to 2 |
| `testWind` | 4 | Simulation m/s, 0–30 |
| `testDirection` | 70 | Simulation degrees from true north, 0–360 |
| `testTide` | .08 | Simulation predicted change m/hour, −.5 to .5 |
| `guides` | true | Faint construction lines and drafting notes |

Mapping at unit sensitivity: waterY = 565 − 65 × metres (drawing limits 415–625); turbine = 3.2 × m/s degrees/sec (cap 150); tide wheel = 110 × predicted m/hour degrees/sec (cap ±45). Compass is true-north direction with shortest-arc smoothing; counterweight and float have opposite vertical displacement. Gains are illustrative, not physical calibration. The controls explain these connections beside the measurements.

Recipes include the live station plus a quiet estuary, easterly breeze and turning tide, each explicitly simulated. Readings JSON includes mode, selected sample, timestamps, full normalized snapshot and product status; simulation JSON is explicitly marked. SVG saves the current posed engraving and provenance text. Source ZIP uses the Lab exporter and has no imported Tampa page, Stories module or Three.js dependency.

## Verification

Run `pnpm test:living-city` in the parent project. Model tests exercise NOAA normalization, flags, timestamps, missing/zero data, product failures, TTLs, abort, historical gaps, prediction slope, direction wrapping and sensitivity invariants. Browser tests cover live-shaped fixtures, simulation, replay/reverse, settings/presets, export/standalone, mobile, reduced motion and disposal. A separate bounded real NOAA smoke verifies current station connectivity without baking those readings into production or depending on future weather for assertions.
