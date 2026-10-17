# Folding Paper Architecture

A drawing becomes a place through actual, reversible 3D hinges. The principal composition is an unfinished conservatory. Mechanical engineering and miniature-city versions use the same engine with independent panel definitions. Original source, vector annotations, and study plate are MIT. The exported Three.js 0.186.1 runtime includes its own MIT license.

## Using the instrument

Scroll over the sheet or scrub **Fold**. Walls rise, attached columns and braces unfold, then roof planes rotate around the moving top edges of their parent walls. The building is assembled by 72%; the final 28% approaches and enters the doorway. Reverse scrolling restores the exact earlier geometry and ends on the original sheet.

**Hold & orbit** freezes the visible fold position. Drag to circle it, use the wheel to zoom, or use arrow keys and +/− with the drawing focused. **Half folded** opens a useful inspection position. **Continue folding** resumes scroll scrubbing. **Back to the drawing** returns to zero. Touch visitors use the slider to fold and drag to orbit; normal page scrolling remains available outside orbit mode. Home/End and arrow keys scrub when the drawing is focused. Space toggles inspection; Escape leaves it.

The inspector controls drawing version, progress, scroll sensitivity, paper transparency, sketch density, overview angle, ink variation, and construction guides. Progress and version are part of the ordinary Lab preset, local storage and current-source export. Orbit position is a temporary inspection view and is not saved. Camera angle changes affect the overview; the entrance route stays aligned with the doorway.

## Standalone example

Extract the ZIP, serve its directory over HTTP (`python3 -m http.server 8080`), and open `example.html`. The package includes local Three.js modules and an import map; it needs no CDN or package installation. It reads `preset.json`, including fold progress and all visual settings. To use a bundler instead, install the exact version in package.json.

The effect has no Tampa dependencies. `index.js` mounts the instrument, `engine.js` implements hinges and panel rendering, `compositions.js` defines the three demonstrations, `illustration.js` constructs stroke lettering and engraved marks, and `camera.js` defines the camera route. `styles.js` supplies scoped UI styles and `style.css` sizes the standalone host.

```js
import {mount} from './creative-lab/experiments/folding-paper/index.js';
import {DEFAULTS} from './creative-lab/experiments/folding-paper/compositions.js';
const effect = mount(document.querySelector('#folding'), {
  ...DEFAULTS, version: 'architecture', progress: 46
}); // give the host a definite height, e.g. 760px
// Your application controls visibility; the example already includes an adapter.
effect.setRunning(true);
effect.setProgress(.58); // 0–1, unlike the percentage in settings
console.log(effect.getProgress(), effect.getPose());
// update takes a complete settings object; replay returns to paper.
// On component teardown:
effect.dispose();
```

The optional third argument to mount receives diagnostics. Completed settings changes emit a bubbling `lab:settings` event. The Lab validates it and synchronizes the inspector, presets and source export. Standalone applications can listen to the same event. The effect does not require that listener to work.

## Define your own fold panels

The generic engine is independent of composition data, camera, DOM and animation loops:

```js
import {createFoldingRig} from './engine.js';
const definition = {
  name: 'Two linked folds',
  panels: [
    {
      id: 'wall', parent: null,
      pivot: [0,0,0], restZ: 0, axis: [1,0,0],
      angle: Math.PI/2, stage: [.1,.45],
      outline: [[-3,0],[3,0],[3,5],[-3,5]],
      holes: [[[-.6,1],[.6,1],[.6,3],[-.6,3]]],
      strokes: [{kind:'guide',points:[[-3.4,0],[3.4,0]]}]
    },
    {
      id: 'roof', parent: 'wall', pivot: [0,5,0],
      axis: [1,0,0], angle: Math.PI/3, stage: [.4,.72],
      outline: [[-3,0],[3,0],[3,4],[-3,4]],
      strokes: [{kind:'pencil',points:[[-2.8,.2],[2.8,3.8]]}]
    }
  ]
};
const rig = createFoldingRig(definition, {
  transparency: .72, variation: .4, guides: true
});
scene.add(rig.root);
rig.setProgress(.46); // a genuine intermediate pose
rig.setProgress(.12); // reverse without integrating or replaying frames
rig.setAppearance({transparency:.8, guides:false});
const matrices = rig.pose(); // world matrices, keyed by panel ID
scene.remove(rig.root);
rig.dispose();
```

Coordinates are local XY, in arbitrary drawing units; the root rotates the sheet −90° around X onto the world's XZ ground plane. Each panel first translates to its parent's local `pivot`, rotates around local Z by `restZ`, then rotates around its normalized local `axis`. Children attach to that hinged coordinate system, so the roof inherits the complete wall movement. Angles are radians. For a flat initial drawing use zero Z pivots and coplanar rest rotations; the demonstration's backing sheet sits 0.045 units beneath the drawing to avoid depth artifacts.

`stage: [start,end]` is a strictly increasing interval within 0–1. Each hinge angle is `angle * smoothstep((progress-start)/(end-start))`; there is no accumulated transform or frame-rate dependency. Meshes, holes and strokes are created once. Progress changes only their transforms. No progress-dependent opacity, geometry replacement or crossfades are used. Geometry resources and material identities stay stable across the entire fold.

`outline` and `holes` contain local [x,y] polygon points; use simple polygons and holes inside their outline. ShapeGeometry triangulates them. `surface:false` creates linework only. Strokes are polylines in four kinds: `ink`, `pencil`, `guide`, `accent`. Closed outlines and openings are inked automatically. All surface materials are double-sided, and 3D line annotations remain visible from either side. Coordinates for strokes are lifted 0.012 units from the surface to avoid depth fighting. Text uses original vector stroke glyphs, not raster textures.

Panel IDs must be unique; parents must exist and form an acyclic hierarchy of at most 32 levels and 160 panels. Bad stages, axes, coordinates and nonfinite values are refused. The engine does not perform physical collision solving or manufacture foldable paper nets. Overlapping engraved details and early unfolding panels are intentional working-drawing layers. Define your own nonintersecting nets if fabrication is required.

## Three demonstrations

- **Architecture:** floor plan, four elevations with real window and doorway cutouts, two wall-linked pitched roofs, two gables, four knee braces, and four columns made of three linked fluted faces. The two roof ridges meet geometrically at full assembly.
- **Machine:** a drafting bed, bearing frames with cutouts, hinged crossheads, two rising wheel supports and linked rotating gear drawings. A conceptual machine, not a mechanical load simulation.
- **City:** a street map and six buildings, each with independently staged walls and a roof attached to its rear wall. The final camera travels down the avenue.

The demonstration factory accepts `density` and `variation`; density changes engraving detail, while variation controls deterministic pencil irregularity. The geometry is rebuilt only for a drawing-version, density or variation change. Transparency and guide visibility update existing materials/objects, and fold progress only changes hinge rotations.

## Performance and lifecycle

Linework is batched by ink kind within each hinged panel. No per-stroke draw calls, shadow maps, image textures or postprocessing. Pixel ratio is capped at 1.75. Rebuild controls debounce by 150ms; wheel updates persist after 120ms of rest. Rendering sleeps once folds and camera settle. The host pauses hidden/offscreen effects. Reduced motion gives immediate requested poses and camera positions rather than easing through a dive.

`dispose()` aborts input listeners, disconnects resize observation, cancels timers/frames, releases geometry, shared materials and the WebGL renderer. It is idempotent. Context loss preserves the fold settings and rebuilds on restoration. No JavaScript retains the static drawing and source links. This effect is excluded from simultaneous comparison to keep the lightweight comparison desk inexpensive.

Tests live in `scripts/folding-paper-geometry-test.mjs` and `scripts/folding-paper-browser-test.mjs` in the parent project. They check flatness, intermediate world matrices, parent-child hinge continuity, roof closure, exact reverse poses, resource identity/disposal, scroll and slider behavior, orbit hold, alternative compositions, presets, standalone export, touch, motion preferences and cleanup.
