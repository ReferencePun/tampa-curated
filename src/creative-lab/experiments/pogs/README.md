# Odd Company — reusable collectible disc game

An original illustrated tabletop toy with twelve editions and four slammers. All illustrations, geometry, textures and code in this folder are original and MIT licensed. No branded characters, commercial disc art, external fonts, recordings or network assets.

## Playing

Discs start face down. Drag from the heavy slammer toward a point on the stack, then release. Drag distance and speed determine power; the visible cross marks the impact point. A miss flips nothing. Alternatively, tap to aim and press Strike for the selected power. Focus the canvas and use arrows to aim, Shift+arrows for smaller movements, Space to strike. Touch is captured only during a flick, and pointer cancellation safely abandons it.

After the discs settle, only front-side-up discs count. Press Collect to bank them. The rest stack up again. Every banked human-player disc is added to the local album. Restarting a round preserves the album but discards unbanked results.

- Practice: unlimited strikes until the table is clear.
- Versus CPU: alternating turns against Mica; each flipped disc is one point. The CPU uses the same slammer, material settings and impact model. Its aim and power vary deterministically. It automatically banks after a 1.6 second result inspection, then returns the turn. No outside network or hidden difficulty multiplier.
- Collection: inspect fronts/reverses, counts and missing editions. Play for missing editions deals uncollected designs first. Rarity is an illustration tier, not money, a paid reward or a market value.
- Builder: add up to 16 discs, including duplicates, in bottom-to-top order. Remove individual positions or reverse the stack. Deal it to play.

## Architecture

- `catalog.js`: original disc definitions, slammer masses/materials, defaults and five presets.
- `model.js`: independent game state, impact plans, trajectory evaluation, stack validation, collection document validation.
- `art.js`: original procedural canvas illustrations and texture cache. Separate front/back artwork for every edition.
- `renderer.js`: orthographic three-dimensional projection of disc planes, visible thickness, shadows, table and collection trays.
- `engine.js`: one canvas, input, resize and animation lifecycle.
- `index.js` / `styles.js`: optional HTML Lab UI, album storage and JSON downloads.
- `embed-demo.html` / `embed-demo.js`: a neutral table using three custom disc designs and a different ordered stack.

## Model and scoring

This is a controlled toy approximation, not a general-purpose rigid-body solver. It does not choose a random winning count and then decorate it. `planStrike` computes overlap between impact and stack, slammer mass, power, angle, edge leverage and effective surface friction. Energy is attenuated toward the bottom of the stack and varied by a stable ID/serial-derived disc grain value. That energy determines angular travel in half-turns, lift, release delay and scatter distance.

`sampleDisc(plan, time)` evaluates the same trajectory at arbitrary times. The disc really rotates, exposes its reverse/front surfaces, lifts clear of the tabletop during rotation, and settles. A small separation pass spreads landing footprints for legibility, and flight height is bounded so extreme control settings remain in view. Angular parity at rest is the scoring result: an odd number of half-turns is face up, an even number is face down. Restacking interpolates uncollected positions back to the pile; collected pieces travel toward the winner’s side. Power is intentionally non-monotonic: another half-turn can put the back up again.

The model uses no browser clock. Identical stack, settings and impact produce identical plans and outcomes. `advance(dt)` changes only the timeline; no live unstable physics state. The adapter limits frames to 50 ms so a browser stall cannot skip an entire turn. Paused/hidden states never catch up. CPU aim varies deterministically by round and turn, but uses exactly the same physical response. Players can observe results before choosing different inputs.

## Embed the full interface

```js
import { mount } from './creative-lab/experiments/pogs/index.js';
const game = mount(container, { mode: 'practice', stackSize: 8 }, console.log, {
  storageKey: 'my-site.my-disc-album.v1' // optional namespace
});
game.setRunning(true); // gate with visibility in your app
// game.update(settings); game.replay(); game.getState();
// game.dispose() before removing the host
```

The exported `example.html` includes styles, preset settings, visibility gating, shared pause/replay and disposal. Serve it over local HTTP; ES modules are not reliably available with file://. No bundler or third-party packages needed.

## Use your own discs

```js
import { DiscGame } from './model.js';
const catalog = [
  { id: 'red', name: 'Red square' },
  { id: 'blue', name: 'Blue triangle' }
];
const stack = ['red', 'blue', 'red']; // bottom → top, duplicates allowed
const model = new DiscGame({ power: 0.6, stackSize: 3 }, {
  catalog, stack,
  event(e) {
    // strike, land, collect, thinking, ready, complete
    // collect: { type, actor: 'you'|'cpu', ids: [...] }
  }
});
model.strike({ x: 15, y: 0, power: 0.6 });
model.advance(3); // yields a readable result, never auto-banks a human turn
model.collect();
model.advance(1); // restacks or ends the round
```

Catalog: 1–64 objects, unique lowercase alphanumeric/hyphen IDs (1–60 characters), names up to 90 characters. Stack: 1–16 known IDs. Original art also uses `kind`, `color`, `ink`, `accent`, `number`, `finish`, `rarity`; these are not required by the model. Input validation rejects unknown stack IDs, oversized stacks and malformed catalogs.

`strike` succeeds only for the current actor in ready state. Repeated strikes while resolving and repeated collection calls are rejected. `newRound(ids?)` starts fresh scores and stack; an external album is intentionally independent. `state()` reports phase, actor, remaining stack count, pending flips and each side’s banked count. `poses()` reports projected-model poses. `history` retains up to 40 banked turn records. `planStrike` and `sampleDisc` can drive your own renderer.

## Canvas adapter and custom art

```js
import { createDiscTable } from './engine.js';
const table = createDiscTable(canvas, settings, {
  catalog, stack,
  drawDisc(ctx, disc, front, style, size) {
    // Draw into a transparent square bitmap. The physical circle is centered
    // at size/2 with radius size*0.476. Supply both front and reverse artwork.
  },
  background(ctx, settings) { /* optional 1000×680 table artwork */ },
  frame(state) { /* update accessible HTML */ },
  event(event) { /* bank collection, report completion */ },
  interact() { /* optionally request resume */ }
});
table.setRunning(true);
table.aim({ x: 20, y: 0 });
table.strike(); // selected power
// collect(), reset(orderedIds), update(settings), getState(), dispose()
```

Use `width:100%; aspect-ratio:25/17; touch-action:none` on the canvas. World x/y coordinates are relative to the stack center. The table uses `screenX = 500+x`, `screenY = 290+0.68*y-0.85*z`. Pointer aiming uses the inverse projection on the tabletop. Disc bases are rotated in 3D and projected as affine planes. The determinant selects the visible front or reverse texture; physical thickness is drawn along the vertical axis. Score uses the same final rotation, not the screen-facing side during flight.

Artwork is generated once per finish, stored in offscreen canvases, and reused. A maximum of sixteen discs and one slammer animate on one visible canvas. No per-frame DOM tree of discs. Images in the collection are static snapshots. A supplied `drawDisc` callback lets another site render photos, logos or its own illustration, provided it holds the rights. The neutral embed example demonstrates this callback without the Lab UI or Tampa data.

## Settings

| Key | Values | Effect |
|---|---|---|
| mode | practice, cpu, collection, builder | Rules; mode changes reset the round |
| stackSize | 1–16 | Automatic stack; changes reset the round |
| slammer | brass, steel, wood, enamel | Mass 1.28, 1.62, 0.86, 1.12 and contact radius |
| power | 0.15–1, step .05 | Button/keyboard strike power; flick gestures override one shot |
| angle | 0–65 degrees | Tilt adds turning leverage |
| friction | 0.1–0.9, step .05 | Effective tabletop resistance |
| surface | felt, wood, linen | Different rendering and resistance factor |
| style | mixed, paper, metal, holo | Artwork finish; does not change scoring |

All other changes affect the next shot or drawing without rerolling an in-flight result. The original custom builder and complete table file save an ordered stack separately from inspector settings. Shared Lab presets contain controls only. A loaded table starts a fresh round, not a saved midflight game. `PRESETS` supplies five complete configurations.

## Collection persistence

Album documents: `{type:'odd-company-album', version:1, counts:{'moon-moth':2}}`. Counts are whole numbers 0–99,999 and keys must be known catalog IDs. Import replaces the album after full validation. Export uses JSON; no data leaves the device unless the user chooses to share that file. The UI defaults to localStorage under its own namespace; unchecking Keep collection deletes stored history and keeps only the current in-memory album. Clear album supports undo within the session. Storage failure keeps gameplay functioning and offers export.

Only a banked `collect` event for actor `you` updates the album. CPU winnings, unrecovered pending flips, previewed artwork and builder additions do not. JSON is user-owned, editable data, not an authenticated competitive score.

## Lifecycle and reduced motion

`setRunning(false)` cancels the RAF and active drag but preserves in-flight state. Hidden documents, offscreen Lab previews, collection/builder views and explicit pause stop CPU timers and animation. At rest, no RAF runs. ResizeObserver rerenders at a capped pixel ratio of 2. Pointer capture is released on cancel, blur and disposal. `dispose()` aborts listeners, disconnects resize observation, cancels animation, clears all texture maps and shrinks owned canvases. No audio is created.

Reduced motion immediately resolves flights to their true orientations and skips the restacking travel, while preserving result inspection, scoring and CPU pacing. All essential controls have HTML alternatives. This remains a visual tabletop game; it is not a full nonvisual game interface.

## Verification

`pnpm test:pogs` covers deterministic impact plans and final orientation, misses, parameter effects, stack order, collection invariants, CPU turns, round completion, malformed data, pointer flicking, touch, album persistence, preset/setup files, standalone export, reduced motion, pause and cleanup in desktop WebKit and Chromium. WebKit automation is not a claim of testing every physical Safari/iOS device.
