import * as THREE from "three";
import {
  planeOf,
  reflectedCamera,
  clipCamera,
  portalCamera,
  portalMapping,
  clamp,
} from "./model.js";
const BIAS = new THREE.Matrix4().set(
  0.5,
  0,
  0,
  0.5,
  0,
  0.5,
  0,
  0.5,
  0,
  0,
  0.5,
  0.5,
  0,
  0,
  0,
  1,
);
const vertex = `uniform mat4 projectionTexture; varying vec4 reflected; varying vec2 vUv; void main(){vUv=uv;reflected=projectionTexture*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `uniform sampler2D image;uniform vec3 paper;uniform float enabled;uniform float strength;varying vec4 reflected;varying vec2 vUv;void main(){vec3 c=paper;vec2 uv=reflected.xy/reflected.w;if(enabled>.5&&reflected.w>0.&&all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))){c=mix(paper,texture2D(image,uv).rgb,strength);}float edge=smoothstep(0.,.012,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));c=mix(paper*.97,c,edge);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`;
/** A frame graph, never an onBeforeRender recursion. Targets are unique within a frame. */
export function createReflectionSystem(
  renderer,
  scene,
  {
    depth = 3,
    size = 512,
    budget = 12,
    brightness = 0.92,
    fade = 0.13,
    paper = "#f0ebdf",
  } = {},
) {
  const mirrors = [],
    pool = [],
    paperColor = new THREE.Color(paper);
  let settings = {
      depth: Math.round(clamp(depth, 0, 4)),
      size: Math.round(clamp(size, 128, 1024)),
      budget: Math.round(clamp(budget, 1, 16)),
      brightness: clamp(brightness, 0.3, 1.3),
      fade: clamp(fade, 0, 0.4),
    },
    disposed = false,
    used = 0,
    lastBindings = [],
    stats = { passes: 0, depth: 0, views: [], targets: 0 };
  const blank = new THREE.DataTexture(
    new Uint8Array([240, 235, 223, 255]),
    1,
    1,
  );
  blank.needsUpdate = true;
  blank.colorSpace = THREE.SRGBColorSpace;
  function add({
    id,
    position = [0, 0, 0],
    rotation = 0,
    width = 3,
    height = 5,
    kind = "mirror",
    destination,
  } = {}) {
    const geometry = new THREE.PlaneGeometry(width, height),
      material = new THREE.ShaderMaterial({
        uniforms: {
          image: { value: blank },
          paper: { value: paperColor },
          enabled: { value: 0 },
          strength: { value: 1 },
          projectionTexture: { value: new THREE.Matrix4() },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
      mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(position);
    mesh.rotation.y = rotation;
    mesh.name = id;
    scene.add(mesh);
    const end = destination?.isObject3D ? destination : new THREE.Object3D();
    if (Array.isArray(destination)) end.position.fromArray(destination);
    const item = { id, mesh, kind, destination: end, width, height };
    mirrors.push(item);
    return item;
  }
  function target(index, level) {
    const size = Math.max(128, Math.round(settings.size / (1 + level * 0.45)));
    let item = pool[index];
    if (!item || item.width !== size) {
      item?.dispose();
      item = new THREE.WebGLRenderTarget(size, size, {
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
        samples: Math.min(2, renderer.capabilities.maxSamples || 0),
      });
      item.texture.colorSpace = THREE.LinearSRGBColorSpace;
      item.texture.generateMipmaps = false;
      item.texture.minFilter = THREE.LinearFilter;
      pool[index] = item;
    }
    return item;
  }
  function capture() {
    return mirrors.map((m) => ({
      visible: m.mesh.visible,
      image: m.mesh.material.uniforms.image.value,
      matrix: m.mesh.material.uniforms.projectionTexture.value,
      enabled: m.mesh.material.uniforms.enabled.value,
      strength: m.mesh.material.uniforms.strength.value,
    }));
  }
  function restore(saved) {
    mirrors.forEach((m, i) => {
      m.mesh.visible = saved[i].visible;
      Object.assign(m.mesh.material.uniforms.image, { value: saved[i].image });
      m.mesh.material.uniforms.projectionTexture.value = saved[i].matrix;
      m.mesh.material.uniforms.enabled.value = saved[i].enabled;
      m.mesh.material.uniforms.strength.value = saved[i].strength;
    });
  }
  function bind(m, binding) {
    const u = m.mesh.material.uniforms;
    u.image.value = binding?.target.texture || blank;
    u.enabled.value = binding ? 1 : 0;
    u.projectionTexture.value = binding?.matrix || new THREE.Matrix4();
    u.strength.value = binding
      ? clamp(
          settings.brightness * (1 - settings.fade * binding.level),
          0.08,
          1.3,
        )
      : 1;
  }
  function visible(camera, excluded) {
    const frustum = new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    return mirrors
      .filter(
        (m) =>
          m !== excluded &&
          m.mesh.visible &&
          camera.layers.test(m.mesh.layers) &&
          planeOf(m.mesh).distanceToPoint(
            camera.getWorldPosition(new THREE.Vector3()),
          ) > 0.035 &&
          frustum.intersectsObject(m.mesh),
      )
      .sort(
        (a, b) =>
          a.mesh
            .getWorldPosition(new THREE.Vector3())
            .distanceToSquared(camera.getWorldPosition(new THREE.Vector3())) -
          b.mesh
            .getWorldPosition(new THREE.Vector3())
            .distanceToSquared(camera.getWorldPosition(new THREE.Vector3())),
      );
  }
  function branch(m, source, baseProjection, level, quota) {
    if (quota.count <= 0 || used >= settings.budget || level >= settings.depth)
      return null;
    quota.count--;
    const slot = used++,
      output = target(slot, level),
      saved = capture(),
      plane = planeOf(m.mesh),
      mapping =
        m.kind === "portal" ? portalMapping(m.mesh, m.destination) : null;
    const camera = mapping
        ? portalCamera(source, mapping, baseProjection)
        : reflectedCamera(source, plane, baseProjection),
      matrix = BIAS.clone()
        .multiply(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse);
    if (mapping) matrix.multiply(mapping);
    matrix.multiply(m.mesh.matrixWorld);
    const clip = mapping ? planeOf(m.destination) : plane;
    clipCamera(camera, clip);
    stats.depth = Math.max(stats.depth, level + 1);
    stats.views.push({
      id: m.id,
      kind: m.kind,
      level: level + 1,
      position: camera.position.toArray(),
      source: source.getWorldPosition(new THREE.Vector3()).toArray(),
      plane: [...plane.normal.toArray(), plane.constant],
    });
    try {
      mirrors.forEach((item) => bind(item, null));
      if (level + 1 < settings.depth) {
        const children = visible(camera, m);
        for (const child of children) {
          const b = branch(child, camera, baseProjection, level + 1, quota);
          if (b) bind(child, b);
        }
      }
      m.mesh.visible = false;
      renderer.setRenderTarget(output);
      renderer.state.buffers.depth.setMask(true);
      renderer.clear();
      renderer.render(scene, camera);
      stats.passes++;
      return { target: output, matrix, level };
    } finally {
      restore(saved);
    }
  }
  function render(camera) {
    if (disposed) return stats;
    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);
    used = 0;
    stats = { passes: 0, depth: 0, views: [], targets: pool.length };
    const oldTarget = renderer.getRenderTarget(),
      oldViewport = renderer.getViewport(new THREE.Vector4()),
      oldScissor = renderer.getScissor(new THREE.Vector4()),
      oldScissorTest = renderer.getScissorTest(),
      oldXR = renderer.xr.enabled,
      oldShadow = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setScissorTest(false);
    mirrors.forEach((m) => bind(m, null));
    const candidates = visible(camera),
      bindings = [];
    try {
      const share = Math.max(
        1,
        Math.floor(settings.budget / Math.max(1, candidates.length)),
      );
      for (const m of candidates) {
        const binding = branch(m, camera, camera.projectionMatrix.clone(), 0, {
          count: share,
        });
        if (binding) bindings.push([m, binding]);
      }
      mirrors.forEach((m) => bind(m, null));
      for (const [m, b] of bindings) bind(m, b);
      lastBindings = bindings;
    } finally {
      renderer.setRenderTarget(oldTarget);
      renderer.setViewport(oldViewport);
      renderer.setScissor(oldScissor);
      renderer.setScissorTest(oldScissorTest);
      renderer.xr.enabled = oldXR;
      renderer.shadowMap.autoUpdate = oldShadow;
    }
    stats.targets = pool.length;
    stats.activeTargets = used;
    stats.pixels = pool.reduce((n, t) => n + t.width * t.height, 0);
    return stats;
  }
  return {
    add,
    render,
    mirrors,
    getReflectionTarget(id) {
      return lastBindings.find(([m]) => m.id === id)?.[1].target;
    },
    getState: () => ({
      ...stats,
      targets: pool.length,
      settings: { ...settings },
      disposed,
    }),
    update(next) {
      const old = settings;
      settings = {
        ...settings,
        ...next,
        depth: Math.round(clamp(next.depth ?? settings.depth, 0, 4)),
        budget: Math.round(clamp(next.budget ?? settings.budget, 1, 16)),
        size: Math.round(clamp(next.size ?? settings.size, 128, 1024)),
        brightness: clamp(next.brightness ?? settings.brightness, 0.3, 1.3),
        fade: clamp(next.fade ?? settings.fade, 0, 0.4),
      };
      if (old.size !== settings.size) {
        pool.forEach((t) => t.dispose());
        pool.length = 0;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const m of mirrors) {
        scene.remove(m.mesh);
        m.mesh.geometry.dispose();
        m.mesh.material.dispose();
      }
      pool.forEach((t) => t.dispose());
      pool.length = 0;
      mirrors.length = 0;
      lastBindings = [];
      blank.dispose();
    },
  };
}
