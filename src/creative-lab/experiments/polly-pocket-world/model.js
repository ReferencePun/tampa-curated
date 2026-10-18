export const clamp = (v, a = 0, b = 1) =>
  Math.max(a, Math.min(b, Number.isFinite(+v) ? +v : a));
export const smooth = (v) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const DEFAULTS = {
  world: "beach",
  open: 0,
  zoom: 1,
  rotation: -18,
  tilt: 53,
  density: 2,
  palette: "original",
  tour: false,
  enter: false,
  hotspots: true,
  travel: 0,
  actionOne: 0,
  actionTwo: 0,
  actionThree: 0,
};
export const PALETTES = {
  beach: {
    shell: "#a5c7b6",
    trim: "#f6e6c8",
    ground: "#e6d0a4",
    water: "#66b4bc",
    roof: "#ce7664",
    wall: "#f4e5c5",
    leaf: "#799e77",
    accent: "#dba95b",
    dark: "#647d79",
  },
  city: {
    shell: "#b2acd0",
    trim: "#f3dfc6",
    ground: "#d5c2a7",
    water: "#8ebfc1",
    roof: "#738ea0",
    wall: "#e9ab91",
    leaf: "#9eac84",
    accent: "#e8c06e",
    dark: "#757185",
  },
  garden: {
    shell: "#cca8b8",
    trim: "#eae4bf",
    ground: "#b2bd91",
    water: "#8ebdba",
    roof: "#b383a8",
    wall: "#f1d9bb",
    leaf: "#748f77",
    accent: "#e2b97a",
    dark: "#7b7685",
  },
  sorbet: {
    shell: "#c7b5d5",
    trim: "#f8e7c9",
    ground: "#e2d5ab",
    water: "#8bc7c7",
    roof: "#db9ca0",
    wall: "#f7d7bd",
    leaf: "#9bbd9b",
    accent: "#eacb85",
    dark: "#8d809c",
  },
  mineral: {
    shell: "#779995",
    trim: "#e7dbc5",
    ground: "#bcbaa4",
    water: "#6c939b",
    roof: "#a46e61",
    wall: "#d8c3a5",
    leaf: "#728b75",
    accent: "#c4a66b",
    dark: "#55616c",
  },
};
export function options(input = {}) {
  const o = { ...DEFAULTS };
  for (const [k, b] of Object.entries({
    open: [0, 100],
    zoom: [0.7, 2.2],
    rotation: [-180, 180],
    tilt: [25, 78],
    density: [1, 3],
    travel: [0, 100],
    actionOne: [0, 100],
    actionTwo: [0, 100],
    actionThree: [0, 100],
  }))
    o[k] = clamp(input[k] ?? o[k], ...b);
  o.density = Math.round(o.density);
  for (const [k, values] of Object.entries({
    world: ["beach", "city", "garden"],
    palette: ["original", "sorbet", "mineral"],
  }))
    if (values.includes(input[k])) o[k] = input[k];
  for (const k of ["tour", "enter", "hotspots"])
    if (typeof input[k] === "boolean") o[k] = input[k];
  if (o.enter) o.open = 100;
  return o;
}
export const PRESETS = {
  beach: { name: "01 / Tidal Post", settings: { ...DEFAULTS, world: "beach" } },
  city: {
    name: "02 / Sunday Square",
    settings: { ...DEFAULTS, world: "city" },
  },
  garden: {
    name: "03 / Moonseed Garden",
    settings: { ...DEFAULTS, world: "garden" },
  },
};
export const hingeAngle = (progress) =>
  (-smooth(progress / 100) * 118 * Math.PI) / 180;
export function actionPose(action, progress) {
  const t = smooth(progress / 100);
  if (action.kind === "hinge")
    return {
      angle:
        (action.from ?? 0) + t * ((action.to ?? -1.3) - (action.from ?? 0)),
    };
  if (action.kind === "spin")
    return { angle: t * (action.turns ?? 1) * Math.PI * 2 };
  if (action.kind === "lift") return { lift: t * (action.height ?? 0.5) };
  return { path: t };
}
export function validateWorld(def) {
  if (
    !def ||
    typeof def.id !== "string" ||
    !Array.isArray(def.pieces) ||
    !Array.isArray(def.actions) ||
    !def.shell
  )
    throw Error("A world requires id, shell, pieces and actions.");
  const ids = new Set();
  for (const p of def.pieces) {
    if (!p.id || ids.has(p.id)) throw Error("Piece IDs must be unique.");
    ids.add(p.id);
    if (
      !Array.isArray(p.position) ||
      p.position.length !== 3 ||
      p.position.some((v) => !Number.isFinite(v))
    )
      throw Error("Piece positions require three finite coordinates.");
  }
  for (const action of def.actions) {
    if (
      !ids.has(action.target) ||
      !["hinge", "spin", "lift", "path"].includes(action.kind)
    )
      throw Error(
        "An action needs an existing target and a supported mechanism.",
      );
    if (
      action.kind === "path" &&
      (!Array.isArray(action.points) || action.points.length < 3)
    )
      throw Error("Path mechanisms require at least three points.");
  }
  for (const key of ["width", "depth", "radius", "lidHeight"])
    if (!Number.isFinite(def.shell[key]) || def.shell[key] <= 0)
      throw Error("Shell dimensions must be positive.");
  if (
    !def.camera ||
    !Number.isFinite(def.camera.height) ||
    !Array.isArray(def.camera.points) ||
    def.camera.points.length < 3 ||
    def.camera.points.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        p.some((v) => !Number.isFinite(v)),
    )
  )
    throw Error(
      "A camera route needs at least three finite X/Z pairs and an eye height.",
    );
  for (const action of def.actions)
    if (
      !Array.isArray(action.marker) ||
      action.marker.length !== 3 ||
      action.marker.some((v) => !Number.isFinite(v))
    )
      throw Error("Each mechanism needs a finite 3D hotspot anchor.");
  return def;
}
