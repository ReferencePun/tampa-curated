# Fine Trouble — a reusable precision toy

An original patient, six imaginary nuisances and real continuous pointer collision. No branded patient, item names, artwork or audio assets are used. Everything in this folder is original and MIT licensed. No external runtime or network assets.

## Play

Hold an object, carry it through the recessed channel, and release inside the end ring. The circular guard indicates the full checked footprint. The tweezer handles are decorative and above the surface. Hitting an edge returns that one piece and costs 25 points (score floor zero). A successful extraction adds 100. Releasing away from the exit, Escape, pointer cancellation, losing focus or pausing returns the piece without a fault.

This is a 2D precision game, with illustrated physical depth and a marked extraction route, not a 3D surgical simulator. All ailments are fictional jokes.

Choose an object card to magnify a cavity, particularly on touchscreens. Drag with a mouse, trackpad, finger or pen. Choose a card and use Space to grip/release, arrows to move, Shift+arrows for finer movement, Escape to cancel. No forced gestures outside the canvas; the rest of the page scrolls normally.

Classic has unlimited attempts. Timed starts only from Start the clock and ends at the selected duration. Precision ends after three edge contacts. Peculiar diagnosis shuffles objects between cavities with a seeded shuffle on each new appointment.

## Files and layers

- `model.js`: browser-independent polygon geometry, continuous collision, semantic game state, settings and presets.
- `board.js`: the original six cavity paths and funny objects. No game rules embedded in the illustration.
- `renderer.js`: cached printed patient, tactile channel rims, piece drawings, tweezer and completion feedback.
- `engine.js`: canvas sizing, pointer/keyboard adapter, focus view, animation lifecycle. No Lab imports.
- `audio.js`: optional, short, low-gain synthesized feedback. Nothing is allocated before the Enable sound gesture.
- `index.js`, `styles.js`: optional HTML interface and Lab bridge.
- `embed-demo.html` / `embed-demo.js`: independent custom L-shaped board with a different token and scoring scheme.

## Embed the complete UI

```js
import { mount } from './creative-lab/experiments/operation-game/index.js';
const toy = mount(container, { difficulty: 'gentle', objectCount: 3 });
toy.setRunning(true); // caller should gate this with visibility
// toy.update(settings); toy.replay(); toy.getState(); toy.serialize();
// Call toy.dispose() before removing the host.
```

The exported `example.html` includes styles, settings, visibility gating, pause, replay and lifecycle disposal. Serve it using a local HTTP server; ES modules do not load reliably from file://. No bundler is needed. The custom example lives in `creative-lab/experiments/operation-game/embed-demo.html`.

## Bring your own board

```js
import { PrecisionGame } from './model.js';
const scene = {
  width: 900, height: 720,
  cavities: [{
    id: 'sample', name: 'A small token',
    polygon: [{x:100,y:100}, {x:300,y:100}, {x:300,y:160}, {x:100,y:160}],
    start: {x:130,y:130}, exit: {x:270,y:130},
    radius: 8, exitRadius: 10,
    path: [{x:130,y:130}, {x:270,y:130}], // optional visual guide only
    kind: 'biscuit', color: '#b59b56'
  }],
  rules: { points: 100, penalty: 25, strikes: 3 }
};
const game = new PrecisionGame(scene, { mode: 'classic', tolerance: 2 }, event => {
  // grab, returned, contact, extracted, start, time
});
game.begin({x:130,y:130});
game.move({x:270,y:130});
game.end(); // success only inside the exit radius, after legal travel
```

Polygons must be simple, non-self-intersecting arrays with 3–512 vertices; 1–24 cavities. Cavities should not overlap. Units are logical board coordinates. Start and exit must fit the base piece. Ensure the whole route has room for the largest configured radius: `piece.radius * objectSize + tolerance + (precision ? 1 : 0)`. A custom board must supply traversable geometry for its chosen settings. The validator catches invalid dimensions, duplicate IDs, nonfinite coordinates, self intersections, and invalid origins/exits, but cannot guarantee every arbitrary route is solvable. Use the pure model to validate routes as in the included test.

`path` is only a visual guide; gameplay always uses the actual polygon. A custom polygon need not have a guide. `channelPolygon(path, width)` builds simple mitered channels with circular end caps. Avoid self-crossing paths and 180-degree turns.

`begin(point)` grips only an unremoved object. Initial grip locks the piece center to an offset from the pointer, allowing a comfortable hit target without a collision penalty. `move(point)` checks a swept disk: both endpoints must be in the polygon, and the entire movement segment must stay at least the checked radius from every boundary edge. Concave shortcuts and rapid jumps therefore fail. A binary search locates first contact for feedback. This is analytical continuous collision, not sparse spatial sampling.

`end(cancel)` either extracts at the exit or returns the object safely. `advance(seconds)` advances active game time and transient feedback. The model never consults wall time. The browser adapter caps a frame at 100 ms to avoid a stall causing an unfair instant loss; visibility pause never catches up. `state()` returns scores, phase and remaining time. `log` stores up to 40 semantic extraction/contact records, not pointer traces. No analytics.

## Canvas adapter

```js
import { createPrecisionToy } from './engine.js';
const toy = createPrecisionToy(canvas, settings, {
  scene, // omit to use Milo
  background(ctx, scene, settings) { /* your cached board artwork */ },
  piece(ctx, cavity, x, y, radius, raised) { /* your token artwork */ },
  event(event) { /* optional scoring / sound / completion callback */ },
  frame(state) { /* optional accessible status */ },
  interact() { /* optional request to resume */ },
  quiet() { /* stop your sounds when hidden */ }
});
toy.setRunning(true);
toy.inspect('sample'); // null returns to the full board
toy.start(); // begins a ready timed challenge
// update(settings), reset(), begin(point), move(point), end(cancel), getState(), dispose()
```

Give the canvas `width:100%; aspect-ratio:5/4; touch-action:none` for the 900×720 sample. Match aspect ratio to custom scene dimensions. The supplied renderer's recovery tray uses the right-hand portion of a 900×720 board; for a differently arranged board, use the pure model with your own renderer. The neutral example replaces artwork and token while retaining that coordinate convention.

## Settings

| Setting | Range / choices | Effect |
|---|---|---|
| mode | classic, timed, precision, silly | Rules and object shuffle |
| difficulty | gentle, steady, expert | Original channel widths 54, 44, 34 units |
| tolerance | 0–5, step 0.5 | Extra safety clearance; larger is harder |
| timer | 30–180 seconds | Timed appointment length |
| objectCount | 1–6 | Original board objects; custom scene owns its count |
| objectSize | 0.7–1.25 | Object and collision size |
| boardStyle | sage, coral, blue | Toy finish only |
| sound | boolean | Sound preference; never grants audio activation |
| sensitivity | 0.4–1.5 | Relative tool travel per hand travel; keyboard step multiplier |

Changes to game rules reset the round; board finish, sound and sensitivity preserve it. `PRESETS` contains five complete settings documents. Shared Lab presets save settings; they do not save in-progress rounds. Local setup export always mutes sound. Case-note JSON is an immutable score/event report, not a restorable saved game.

## Sound, cleanup and accessibility

Sound is off by default. The dedicated button calls `audio.enable()` from a deliberate gesture. Restoring presets or selecting the inspector preference never creates an AudioContext. `mute()` stops voices and suspends the context; `dispose()` closes it. Context-resume races are canceled if the owner is disposed. Only two short procedural triangle/sine sounds are used, with soft attack/release and restrained gain.

All controls are HTML. Readable status and case notes mirror sounds. The canvas is keyboard focusable; a complete textual list of objects is provided. It remains a spatial motor game and is not a nonvisual game alternative. Reduced motion removes celebratory rays; pointer movement remains immediate. No board shaking or camera animation.

Dispose the canvas adapter to cancel RAF, remove all listeners, release capture, disconnect ResizeObserver, and shrink owned canvases. The UI also disposes audio and download URLs. Host pause/hidden/offscreen states stop the challenge clock and cancel a grip safely. Settings and files are local; no accounts, server storage or external telemetry.

## Verification

`pnpm test:operation` tests real route traversal for all presets and maximum difficulty, concave shortcuts, continuous wall contacts, exact clearance, no double scoring, cancellation, timer expiry, three-strike failure, reproducible shuffling and custom boards. Browser checks cover desktop WebKit and Chromium, touch gestures, resizing, inspector/presets, optional audio, source ZIP portability and cleanup. Desktop WebKit is an automated compatibility check, not a claim of testing every Safari/iOS device.
