# Pencil Hall of Mirrors

An independent Three.js experiment: real 3D architectural linework and camera-dependent planar reflections. Original demonstration geometry and code are MIT. Three.js is pinned to 0.186.1 and bundled in the standalone source export with its license. No network asset, texture, video or pre-recorded reflection is used.

## Start

Serve the exported folder over HTTP and open `example.html`. No install or build is needed. The live Lab inspector, saved presets, current-settings export, reduced-motion behavior and lifecycle use the shared Lab contract. `embed-demo.html` inside this experiment is a small independent integration with different geometry and two mirrors.

## Modules

- `model.js`: settings, three presets, reflection mathematics, clipping, portal transforms and the deterministic journey.
- `reflections.js`: reusable mirror surfaces and a bounded recursive frame graph, independent of the corridor.
- `corridor.js`: original batched architectural line geometry, sparse hatching, mirrors' engraved surrounds and two chamber arrangements.
- `viewer.js`: renderer, adaptive quality, camera and demonstration scene lifecycle.
- `index.js`: notebook UI, native scroll region, timeline, controls and pause behavior.

## Integrate just the mirrors

```js
import * as THREE from 'three';
import {createReflectionSystem} from './reflections.js';
const reflections = createReflectionSystem(renderer, scene, {
  depth: 3, size: 512, budget: 12, brightness: .92, fade: .13
});
reflections.add({
  id: 'west', position: [-4, 2.8, -7], rotation: Math.PI / 2,
  width: 5.4, height: 4.9
});
reflections.add({
  id: 'east', position: [4, 2.8, -7], rotation: -Math.PI / 2,
  width: 5.4, height: 4.9
});
// After updating your geometry and camera, on demand:
const stats = reflections.render(camera);
renderer.render(scene, camera);
// Dispose when removing the effect:
reflections.dispose();
```

Mirror geometry starts as a local XY plane; local +Z is its reflective front. `rotation` is a Y-axis rotation in radians; you can change the returned item's `mesh` transform to support arbitrary planar placements. Geometry placed in the same scene appears in the reflections. The renderer is not owned by the reflection system and must be disposed separately. Call `render()` before your main scene render; the system has no `onBeforeRender` hook and never starts its own RAF loop.

`add()` accepts `id`, `position`, `rotation`, `width`, `height`, and optional `kind:'portal'` / `destination`. A destination can be a world-position array or an Object3D transform. The journey switches coordinate frames just before the source plane to avoid the camera near plane clipping the full-screen portal at the crossing. Portal mapping uses destination × 180° turn × inverse(source). Portal imagery uses the mapped camera and mapped texture coordinates. This is an artistic spatial connection, not a reflection. The gallery labels it both in the controls and in the viewport.

`update({depth,size,budget,brightness,fade})` changes rendering settings. The API clamps depth to 4, pass budget to 16 and target dimensions to 128–1024px, including at construction. `getReflectionTarget(id)` exposes a currently rendered root target for explicit inspection/readback; do not retain it across resizing or disposal. `getState()` exposes passes, deepest rendered level, target count, allocated pixels and reflected camera positions. The system restores the caller's render target, viewport, scissor and XR/shadow update flags. It assumes a perspective camera and opaque mirror surfaces. It does not reconstruct rough surfaces, curved mirrors, caustics or ray-traced lighting.

## Reflection correctness

A point is reflected by p − 2·distance(plane,p)·normal. Forward and up vectors are reflected consistently; every virtual camera starts with the original unmodified perspective projection. An oblique near plane clips geometry behind the reflecting surface. Each surface uses a projective texture matrix calculated from its own virtual camera, not flat screen UVs.

Recursion is explicit and bounded. A root mirror gets a fair share of the frame budget. Child mirrors are sorted by proximity after front-face/frustum culling. Each rendered branch owns a unique target within the frame. All bindings are restored after a branch, preventing feedback loops and cross-branch image contamination. On termination, deeper mirrors become quiet paper. With four mirrors and a finite pass budget, some secondary branches terminate before the requested depth; actual depth and pass statistics are available.

The clipping implementation follows the mathematical approach in Three.js Reflector and Eric Lengyel's oblique near-plane method. References:
- https://threejs.org/docs/pages/Reflector.html
- https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Reflector.js
- https://terathon.com/lengyel/Lengyel-Oblique.pdf

The main scene and target textures use Three.js's linear working space; the displayed canvas is sRGB. Reflection brightness scales contrast against the paper, and per-level fading lightens deeper linework.

## Settings and limits

- `version`: `parallel`, `maze`, `gallery`.
- `depth`: 0–4. Zero shows the empty mirror surfaces. One is a nonrecursive physical reflection.
- `angle`: −30–30 degrees. Facing pairs rotate together in the parallel/gallery configurations; the deeper maze pair uses reversed angles.
- `width`: 6–12; `length`: 22–38 world units. Camera and mirror depths track corridor length. Architectural height is fixed.
- `density`: 1–3, original engraving/hatching detail.
- `brightness`: .3–1.3; `fade`: 0–.4 per reflection level.
- `progress`: 0–100; `position`: −1.2–1.2 lateral camera offset.
- `light`: 0–360 degrees, the direction of drawn floor hatching. This is an illustrative shading convention, not a photorealistic light simulation.
- `guides`: construction-line visibility.
- `inspection`: optional limited pointer yaw/pitch; no roll.
- `quality`: `auto`, `low`, `medium`, `high`.

Low quality uses 256px plates, one bounce and at most 5 reflection passes. Medium uses 512px plates / 12 passes. High uses 768px / 16 passes. Target dimensions shrink by depth. Adaptive starts at 320px on narrow screens or 512px otherwise, then reduces resolution after sustained slow CPU submission times; it ultimately caps depth at one. Measurements are CPU render submission time, not GPU timing or a guarantee of a particular frame rate. The interface displays the effective target size and actual depth.

## Scroll, accessibility and lifecycle

The notebook has a native vertical scroll region; no wheel interception is used. A labeled slider and chapter buttons offer direct seeking. All primary journey geometry/camera states are sampled deterministically from progress. Pointer inspection can temporarily change the look direction, and returning to walking clears that offset. Reduced motion starts paused; manual seeks remain possible. Autoplay is explicit and stops on user input or when the preview becomes inactive.

`createHallViewer(canvas, settings)` exposes `render(progress,pointer)`, `resize`, `update`, `getState`, `rebuild` and `dispose`. The caller owns scheduling. It exposes renderer/scene/camera/mirrors for integration and tests. The Lab's `mount()` adds visibility/pause/disposal management. WebGL context loss stops work and disposes the old GPU handles while the context is lost. Restoration creates a fresh renderer and reflection resources, avoiding stale handles across WebKit context generations. Without WebGL2 a labeled static plate is shown; no interactive reconstruction is claimed.

Targets, geometry, materials, observers, listeners, timers and animation frames are cleaned up on disposal. No history or camera trail is uploaded.

## Verification

`pnpm test:hall-of-mirrors` exercises camera reflection invariants, clipping, deterministic reverse sampling, bounded recursive passes, changing viewpoints and reflection pixels, the separate portal, resizing, controls/presets, no idle rendering, source-export isolation, fallback and cleanup. Browser checks run in Chromium and WebKit (Safari's engine), including touch-capable narrow layouts. Hardware Safari/iPhone performance depends on the device; the quality controls and single-bounce mode remain available.
