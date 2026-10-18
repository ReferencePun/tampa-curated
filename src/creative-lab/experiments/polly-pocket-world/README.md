# Pocket Worlds / Small Hours

An original clamshell miniature with three interchangeable worlds. MIT code and procedural artwork. The URL follows the requested experiment identifier; the object, shell decoration, architecture and interface are original, with no copied commercial artwork, assets or branding.

## Start

Serve the exported ZIP over HTTP and open `example.html`. The exact Three.js 0.186.1 ESM runtime and MIT license are bundled. No CDN, model downloads, font service or build step. `embed-demo.html` demonstrates a separate custom world definition.

## Portable API

```js
import {createPocketViewer} from './viewer.js';
import {WORLDS} from './worlds.js';
const viewer = createPocketViewer(canvas, {world:'beach', open:100}, WORLDS);
viewer.resize(canvas.clientWidth, 600);
viewer.render();
viewer.update({rotation:30, zoom:1.3, actionOne:100});
viewer.render();
// The caller owns animation frames and visibility management.
viewer.dispose();
```

`render(visual)` optionally accepts continuous `open`, `entry` (0–1), `rotation`, `travel` and `actions:[0..100,0..100,0..100]` for an external animation/scroll system. The state is deterministic; arbitrary reverse sampling reconstructs the same hinge, mechanisms and camera. `update(settings)` changes persistent targets and rebuilds only on world/palette/detail changes. `projected()` returns screen-space anchors with frustum and geometry-occlusion visibility; `pick(x,y)` raycasts the actual case. `getState()` and `getToy()` expose diagnostics and integration objects.

Use `mount(host, settings, report)` for the complete accessible UI. It returns update, setRunning, replay, getState, getViewer and dispose. Its transitions stop offscreen or on pause and resume without time jumps. Reduced motion skips tweening but preserves manual scrubbing. Hinge animation, the guided camera and the three mechanisms have independent states.

## World-definition schema

`worlds.js` contains only demonstration data. `toy.js`, `geometry.js` and `viewer.js` form the reusable engine.

```js
{
 id:'my-world', name:'My little world',
 shell:{width:10, depth:8, radius:2.2, lidHeight:1.24},
 lid:'sun', // sun, moon or skyline decoration
 camera:{height:2.4, points:[[0,3],[-3,0],[0,-2.5],[3,0]]},
 pieces:[
   {id:'bridge',type:'bridge',position:[0,0,0],rotation:0,scale:[1,1,1]}
 ],
 paths:[[[0,2],[0,0],[2,-2]]],
 actions:[{
   id:'bridge',target:'bridge',kind:'hinge',from:-1.15,to:0,
   label:'Lower the bridge',description:'A small movable bridge.',
   marker:[0,1.3,0]
 }]
}
```

Positions use Y up, with the base centered at the origin and the hinge along X at rear Z = −depth/2. The world floor is approximately Y = 0. The case rim is Y = .7; the lid ceiling at closure is .7 + lidHeight. Keep scenery below that ceiling and within the rounded interior footprint. Changing shell dimensions does not automatically resize external scenery. The underside of the cover has its own shallow molded illustration, physically parented to the hinge.

Builders receive `(group, piece, kit)` and return optional `pivot`, `pivots` or other references. Pass custom builders as the fourth viewer argument. Use kit methods to register geometry/materials for automatic disposal. Moving groups must be marked `userData.dynamic=true` before batching. A `hinge` rotates local X; a `spin` rotates local Y; `lift` offsets local Y; `path` moves the target root along a closed centripetal spline defined by X/Z points. Path motion includes tangent-based heading. Full turns/closed paths intentionally return to their start. Button repeats reverse the sequence. Custom geometry outside the shared kit is the integrating project's responsibility to dispose.

The full Lab UI assumes three actions. The lower-level viewer supports another number. The first three can be controlled with `actionOne`, `actionTwo`, `actionThree`; render with an `actions` array for arbitrary custom action counts. External definitions may supply a palette object with shell, trim, ground, water, roof, wall, leaf, accent and dark colors. The default world palettes and two collection-wide alternatives live in model.js.

## Controls and behavior

- `world`: beach, city, garden in the demo.
- `open`: 0–100%, a smooth 0–118° hinge angle.
- `zoom`: .7–2.2. `rotation`: −180–180°. `tilt`: 25–78°.
- `density`: 1–3; changes small landscaping and path detail.
- `palette`: original, sorbet, mineral.
- `tour`: slow automatic rotation outside or guided path travel inside.
- `enter`: opens the case and moves into a low, guided view. `travel`: 0–100% around the closed path.
- `hotspots`: show numbered projected markers. Equivalent HTML action buttons remain available.
- `actionOne`, `actionTwo`, `actionThree`: 0–100% deterministic mechanism positions.

Mouse/trackpad drag rotates and tilts. Horizontal touch drag rotates; vertical touch scrolling remains native. Zoom buttons and inspector slider support mobile. Focus the preview for arrow keys, +/- and Enter. A click on the closed 3D case opens it. Hotspots test occlusion against actual geometry rather than always displaying through the shell.

## Rendering, limits, lifecycle

Three.js physical materials, soft directional shadows and a hemisphere fill give the molded plastic its satin highlights. The engine batches fixed pieces into InstancedMeshes by shared geometry/material while preserving independent hinge groups. It does not create thousands of UI elements. The shadow map is capped at 1024px and device pixel ratio is capped at 1.5 (1.25 on narrow screens). There is one renderer, no reflection cube captures or real-time physics.

Rendering is demand-driven. A resting toy uses no RAF loop. Automatic tours and mechanism transitions run only while active. The Lab's fullscreen preview, saved presets, JSON import/export and current-settings source package are supported. Context loss disposes GPU handles while lost and recreates resources on restoration. Disposal releases instancing resources, geometry, materials, shadow targets, renderer, observers, listeners and pending animation/timers.

WebGL2 is required. Without it, a labeled static harbor illustration and all descriptions remain, without claiming live 3D interaction. The same static image is available without JavaScript. No user data or camera history is uploaded.

References: [Three.js raycasting](https://threejs.org/docs/pages/Raycaster.html), [instancing](https://threejs.org/docs/pages/InstancedMesh.html), [renderer](https://threejs.org/docs/pages/WebGLRenderer.html).

## Verification

`pnpm test:pocket-world` covers shell/hinge and mechanism transforms, deterministic reversal, world geometry and closed-case containment, camera routes, three presets, resize/touch/reduced-motion, source export and lifecycle in Chromium and WebKit. WebKit exercises Safari's engine, not physical iPhone/Mac hardware performance.
