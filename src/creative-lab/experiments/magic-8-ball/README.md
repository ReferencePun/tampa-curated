# Murmur — Magic Answer Orb

An original liquid-filled answer vessel for playful advice, creative prompts and onboarding. The glass, bronze rest, faceted floating plaque, 48 answers and quiet sounds are original procedural work. No branded toy art, commercial recordings, remote services or third-party fonts are used.

Run the exported `example.html` through an HTTP server for the full studio. `embed-demo.html` is a small neutral onboarding widget with its own three-answer collection.

## Independent APIs

```js
import { createAnswerOrb } from './engine.js';
const orb = createAnswerOrb(canvas, {
  answerSet: 'next-step', color: '#315c66', seed: 32, revealSpeed: 1.2
}, {
  answerSets: {
    'next-step': {
      name: 'A small next step',
      answers: [
        ['prompt', 'Choose something you want to explore.'],
        ['prompt', 'Make one small change.'],
        ['prompt', 'Save an idea for later.']
      ]
    }
  },
  question: () => input.value,
  interact: () => orb.setRunning(true),
  shake: event => console.log(event.intensity),
  phase: phase => console.log(phase),
  answer: answer => { output.textContent = answer.text; }
});
orb.setRunning(true);
orb.shake('What shall I try?');
orb.update({ ...orb.getState().config, opacity: 0.8 });
// On unmount:
orb.dispose();
```

The canvas needs CSS width, an aspect ratio of `1000 / 760`, `touch-action: none`, tabindex 0 and an accessible label. Use the `answer` callback to place the completed answer in accessible HTML. The optional studio already provides these and a comfortable reading-size answer below the orb. The renderer begins paused; the host decides when to run. It also checks its own canvas intersection and document visibility. Reduced motion skips the shake and reveal when a question is asked.

`createAnswerOrb` returns `shake(question, gestureStrength, origin)`, `update(fullSettings)`, `setRunning(bool)`, `replay()`, `getState()`, `clearHistory()`, `exportCanvas(width)` and idempotent `dispose()`. `shake` can interrupt a pending reveal. `replay` resets the seed sequence, current answer, six-entry notebook and clocks. `getState` returns copies of public answer/history records. `exportCanvas` accepts widths 400–2400; the studio uses 1600×1216. A print does not contain the question.

## Separation of concerns

- `answers.js`: original collections, validation, deterministic AnswerEngine and preset defaults. No browser requirement.
- `motion.js`: settings normalization, `ShakeGesture`, `OrbMotion` and an evaluable `poseAt(time, intensity)` envelope. No browser requirement.
- `renderer.js`: glass and fluid illustration, cached text plaque and layered rendering. It does not choose answers or read user input.
- `engine.js`: canvas sizing, pointer and keyboard input, animation lifecycle and semantic callbacks.
- `audio.js`: optional synthesized sound with an independent lifecycle. The base visual engine never creates audio.
- `index.js` / `styles.js`: optional full studio, local session notebook, exports and accessible HTML.

## Answer data and deterministic selection

Collections use `{id: {name, description?, answers: [[tone, text], ...]}}`. IDs are lowercase letters, digits and hyphens, 1–40 characters. Supply 1–20 collections with 2–100 answers each. Answer text is limited to 110 characters. Tones are `yes`, `no`, `maybe` or `prompt`; they are semantic metadata and do not change the outcome.

`new AnswerEngine(seed, collections)` accepts seeds 1–9999. `next(id)` returns `{id, mode, setName, tone, text, number}`. It uses a seeded shuffle bag per collection. Every answer appears once per cycle. The cycle offset changes without repeating its preceding answer, including two- and three-answer custom collections. The question does not participate in selection. `snapshot()` / `restore(snapshot)` save and validate sequence cursors independently from animation. This is deterministic toy randomness, not cryptographic randomness or a predictive system. The optional New sequence button obtains a fresh seed locally.

The visual engine adds `question` (at most 180 characters) and `cast` to a selected answer. Only a completed reveal enters its six-item history and fires the `answer` callback. Interrupted outcomes consume their place in the sequence but are not logged as completed. Changing an answer set or seed affects the next shake and leaves an already surfacing plaque intact.

## Motion and rendering

The motion envelope progresses through shaking (0–0.95), submerged (0.95–1.6), rising (1.6–3.8), settling (3.8–4.8), then answered. Reveal speed scales time after the initial shake. The plaque grows from a foreshortened, tilted deep position into a readable face; a damped settling wave completes the motion. Shake intensity also changes the suspended-current energy. Captured pointer distance, reversals and speed determine a bounded gesture multiplier. Cancellation releases the gesture without casting a new answer.

The renderer is a layered Canvas optical illustration, not a volumetric 3D fluid simulation. Gradient glass, multiple drawn current bands, 80 suspended particles, a cached plaque texture and surface reflections create the liquid depth. Live backing width caps at 1600 px and device pixel ratio caps at 2. The completed orb retains restrained ambient movement unless paused or reduced motion is enabled. Animation stops offscreen and in hidden tabs with no catch-up on return. All frames, listeners, observers and canvas references are cleaned up on disposal.

## Settings

| Key | Values | Purpose |
| --- | --- | --- |
| answerSet | classic, poetic, absurd, creative, or custom ID | Collection for the next shake |
| intensity | 0.3–2 | Base shake energy |
| opacity | 0.1–0.95 | Liquid density and suspended grains |
| revealSpeed | 0.5–2 | Speed after the initial shake |
| color | six-digit hex | Glass color |
| lightAngle | 0–360° | Directional highlight position |
| lighting | 0.4–1.8 | Highlight intensity |
| autoShake | boolean | Cast again after a settled answer and idle interval |
| interval | 8–30 seconds | Auto-shake wait, also used before its first cast |
| seed | integer 1–9999 | Reproducible sequence seed |

The five presets change visual settings and answer character. Shared Lab presets persist settings only; questions, answers and sound opt-in are excluded. Source exports include the current settings and original code, not notebook contents.

## Sound, privacy and accessibility

`createOrbAudio()` is independent of the renderer. Call `enable()` only from a visitor action, then `play('shake')` or `play('answer')`. `quiet()` stops voices; `mute()` stops voices and suspends the context; `dispose()` disconnects nodes and closes it. Sound uses a low-pass noise burst and a gently decaying sine tone, with short gain ramps and restrained output. No AudioContext or audio starts before opt-in. Browser policies may prevent sound; the visual experience remains complete. Pause and visibility changes silence active voices.

Questions and the last six completed answers stay in memory, and vanish on reload. Notebook JSON is an explicit download that includes questions. It is a readable record, not a full animation session or import format. PNGs contain the orb and answer only. No accounts, analytics or network fetching. UI inserts questions and answers as text, never HTML. Keyboard alternatives, labeled controls, a live HTML answer, reduced motion and a static original preview are included.

The studio uses modern Canvas, Pointer Events, ResizeObserver, IntersectionObserver and CSS container queries. Tested with WebKit and Chromium, including touch emulation. This is not a claim to have tested every Safari/iOS release. MIT license covers the code, original content, procedural artwork and generated preview.
