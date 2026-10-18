import * as THREE from "three";
/** One watertight lathed rod and beveled head; translated, never scaled, along Z. */
export function pinGeometry(pitch, length) {
  const shaft = pitch * 0.13,
    head = pitch * 0.41,
    z = length / 2;
  const profile = [
    [0, -z],
    [shaft * 0.8, -z],
    [shaft, -z + 0.025],
    [shaft, z - 0.055],
    [head * 0.82, z - 0.055],
    [head, z - 0.038],
    [head, z - 0.012],
    [head * 0.8, z + 0.01],
    [0, z + 0.01],
  ];
  const geo = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    8,
  );
  geo.rotateX(Math.PI / 2); // Lathe Y becomes +Z.
  return geo;
}
export function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
export function panelGeometry(w, h, depth, r = 0.25) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 5,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}
export function displacedMaterial(material, travel) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.pinTravel = travel;
    shader.vertexShader =
      "attribute float pinHeight;\nuniform float pinTravel;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed.z += pinHeight * pinTravel;",
    );
  };
  material.customProgramCacheKey = () => "pin-slide-z-v1";
  return material;
}
