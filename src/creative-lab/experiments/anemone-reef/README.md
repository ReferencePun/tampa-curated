# Sea Anemone Reef / 35B

An independent marine study inspired by the user's supplied reference: dense, fleshy olive tentacles with pale aqua tips, rounded bodies and gentle flowing motion. The previous Sea Anemone Cursor Field remains unchanged at its own route.

The default view pulls back over 560 smaller tentacles so a sweep moves a broad pattern through the reef. View magnification ranges from .65 to 1.35; the close-up preset retains the intimate reference view.

The scene uses original procedural geometry and shading. The reference photograph is not embedded, copied into textures or redistributed. No fish are included: this study concentrates on the anemones.

## Standalone

Unzip the Lab source export, run `python3 -m http.server 8080` in that folder, and open `http://localhost:8080/example.html`. The exact Three.js browser runtime and license are included. No package installation or Tampa page code is needed. For a bundled application, install `three@0.186.1`.

```js
import {createAnemoneReef} from './creative-lab/experiments/anemone-reef/engine.js';
import {DEFAULTS} from './creative-lab/experiments/anemone-reef/model.js';
const canvas=document.querySelector('canvas'); // give it a CSS width and height
const reef=createAnemoneReef(canvas,DEFAULTS,{
  frame: state => console.log(state.count,state.moved,state.fps),
  error: message => console.warn(message)
});
reef.setRunning(true);                 // caller owns the animation policy
reef.point(.5,.5,true);                // normalized screen x/y, pressed
reef.release();
reef.update({...DEFAULTS,palette:'lagoon'}); // complete settings object
reef.setRunning(false);               // keeps a responsive still view
reef.exportCanvas().toBlob(saveBlob,'image/png');
reef.replay();
reef.dispose();                        // idempotent
```

`mount(host, settings, report)` in `index.js` supplies the whole studio, fullscreen dialog, presets, keyboard help and PNG export. It returns the shared Lab lifecycle (`update`, `setRunning`, `replay`, `dispose`). The host should have a definite height. Settings changes emit `lab:settings`; user Resume emits `lab:set-pause`. Only the Lab host stores settings locally. The engine makes no network requests.

## Anatomy and behavior

`model.js` is DOM-free. `ReefField` creates seeded clustered roots, individual lengths, widths, leans and phases. `project(callback)` supplies normalized screen positions from any camera; the Three renderer uses it so interaction selects the visible region of the reef. `point`, `release`, `advance`, `settleInput`, `update`, `reset`, `snapshot` and `dispose` are public. Fixed 120 Hz damped springs bend each body individually. Pointer movement deposits a directional wake along the entire swept segment; fast hover gestures therefore comb continuous patterns without gaps. Wakes persist after release and decay over several seconds. `screenBasis` maps screen directions to the camera’s ground-plane axes. Inputs are bounded, and at most 16 short-lived traveling pulses are retained. No frames are integrated while paused; `settleInput` provides a static response.

`renderer.js` uses one instanced tube geometry (shared by the color and depth passes). The shaft bends along an anchored analytic centerline, with a local delayed bend near the tip. Seven rings complete a hemispherical end. Normals follow the bent centerline and cap. Geometry really overlaps in depth; this is not a field of billboard sprites. Instances are sorted back to front when the camera changes. Their front-facing membranes alpha-composite with their neighbors, with thicker centers and more transparent edges. A separate instanced depth pass supplies nearest-surface depth to the optical focus effect. Wrapped lighting, transmitted edge light, a restrained bright-tissue diffusion pass and a local hand light suggest translucent tissue. Sorting uses the undeformed body centers; highly intersecting or maximally bent stems can have minor transparency-order approximations. The effect is an artistic model, not an exact species reconstruction or a physically complete simulation of subsurface scattering.

`shaders.js` keeps geometry deformation and shading portable. A two-sample render target smooths silhouettes. The optional post-process samples a depth texture and softens distant structures while rejecting samples across large depth discontinuities. Standard sRGB output is used in the main view and intermediate target. High quality uses 16 radial sides and 24 shaft sections; low quality uses 10 sides and 18 sections and skips soft focus. Maximum density is 560 tentacles; pixel ratio is capped at 1.75.

## Settings

| Setting | Meaning / range |
|---|---|
| `mode` | `brush`, `follow`, `ripple` |
| `density` | 120–560 tentacles |
| `length`, `thickness` | Anatomy scale: .65–1.4 and .65–1.5 |
| `current` | 0–1.5 background current; zero removes idle sway |
| `speed` | .2–1.5 simulation-time multiplier for ambient motion |
| `softness` | .4–1.8 local flexibility |
| `radius` | .08–.4 normalized pointer falloff |
| `strength` | 0–2 local interaction strength |
| `palette` | `seagrass`, `lagoon`, `honey` |
| `light` | .4–1.6 light intensity |
| `translucency` | 0–1 tissue rim and back-light contribution |
| `focus` | 0–1 depth-aware soft focus |
| `zoom` | .65–1.35 camera magnification; default .8 |
| `angle` | -.4–.4 slight camera angle change |
| `elevation` | 0–1 close-up to overhead camera; default .8 |
| `quality` | `high` or `low` |

Four complete presets live in `PRESETS`: reference sea glass, blue current, macro close-up and warm shallows. Shared Lab preset JSON and source export retain every setting.

## Interaction and lifecycle

Mouse hover combs continuous patterns from above. A view toggle switches to the close-up. Hold and sweep to part the meadow more strongly; taps add a traveling current. Captured Pointer Events support touch and pen. Arrow keys move a virtual hand, Space presses it, and Escape releases it. The fullscreen dialog closes through Escape or its visible exit button and restores focus. No sound, pointer lock or device permission is used.

Reduced motion starts still through the Lab host. For direct integration, respect `prefers-reduced-motion` before calling `setRunning(true)`. An explicit Resume may enable animation. The engine also responds to preference changes, intersection and document visibility. Disposal cancels requestAnimationFrame, releases pointer capture, disconnects observers, removes listeners, clears model arrays and destroys GPU buffers, materials, render/depth targets and the WebGL context.

WebGL2 is required. If unavailable, the studio gives an explicit fallback message; the Lab retains its static study plate and documentation. Physical Safari/iOS GPU performance can vary. Lower quality and reduced density are available.

## Validation

Run `node scripts/anemone-reef-model-test.mjs` and `node scripts/anemone-reef-browser-test.mjs` with the production preview running at port 4321. The tests cover deterministic anatomy, local brush/follow responses, gap-free hover wakes, persistence and recovery, camera-basis mapping, bounded pulses and spring recovery, presets, keyboard/touch, resizing, fullscreen, PNG, standalone source export, no offscreen work and lifecycle cleanup in Chromium and WebKit.

Original code and the generated study plate are MIT licensed. Three.js retains its separately bundled MIT license.
