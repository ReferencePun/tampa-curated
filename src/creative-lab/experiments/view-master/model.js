export const DEFAULTS = Object.freeze({
  reel: "atlas",
  mode: "standard",
  order: "forward",
  depth: 0.55,
  zoom: 1,
  spacing: 1,
  transition: "shutter",
  palette: "vermilion",
  clickSound: false,
  autoplay: false,
  interval: 5,
});
export const PRESETS = {
  classic: { name: "The pocket atlas", settings: { ...DEFAULTS } },
  stereo: {
    name: "Two eyes, one tiny world",
    settings: {
      ...DEFAULTS,
      reel: "miniatures",
      mode: "stereo",
      palette: "seafoam",
      depth: 0.7,
    },
  },
  archive: {
    name: "The photo drawer",
    settings: {
      ...DEFAULTS,
      reel: "photos",
      mode: "exploded",
      palette: "cream",
      transition: "dissolve",
    },
  },
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const enums = {
  reel: ["atlas", "miniatures", "photos", "custom"],
  mode: ["standard", "stereo", "exploded"],
  order: ["forward", "reverse"],
  transition: ["shutter", "dissolve", "instant"],
  palette: ["vermilion", "seafoam", "cream", "midnight"],
};
export function options(input = {}) {
  const c = { ...DEFAULTS };
  for (const [k, values] of Object.entries(enums))
    if (values.includes(input[k])) c[k] = input[k];
  for (const [k, min, max, step] of [
    ["depth", 0, 1, 0.05],
    ["zoom", 0.8, 1.5, 0.05],
    ["spacing", 0.7, 1.2, 0.05],
    ["interval", 2, 12, 0.5],
  ])
    if (Number.isFinite(input[k]))
      c[k] = Number(
        (
          min +
          Math.round((clamp(input[k], min, max) - min) / step) * step
        ).toFixed(3),
      );
  for (const k of ["clickSound", "autoplay"])
    if (typeof input[k] === "boolean") c[k] = input[k];
  return c;
}
export function createTransport(count = 1) {
  const countFor = (n) =>
    Number.isFinite(n) ? clamp(Math.trunc(n), 1, 24) : 1;
  count = countFor(count);
  let index = 0,
    inserted = true,
    phase = 1,
    from = 0,
    turns = 0,
    rotation = 0;
  return {
    state: () => ({ index, from, inserted, phase, turns, count, rotation }),
    select(i, animate = true) {
      if (!inserted || !Number.isFinite(i)) return false;
      from = index;
      index = ((Math.trunc(i) % count) + count) % count;
      let delta = index - from;
      if (Math.abs(delta) > count / 2) delta -= Math.sign(delta) * count;
      if (Math.abs(delta) === count / 2)
        delta = Math.sign(i - from) * Math.abs(delta);
      rotation += delta;
      phase = animate ? 0 : 1;
      turns++;
      return true;
    },
    advance(direction = 1, reverse = false, animate = true) {
      return this.select(index + direction * (reverse ? -1 : 1), animate);
    },
    tick(dt) {
      phase = clamp(
        phase + (Number.isFinite(dt) ? Math.max(0, dt) : 0) / 0.52,
        0,
        1,
      );
      return phase < 1;
    },
    insert(value) {
      inserted = !!value;
      phase = 1;
    },
    reset(n = count) {
      count = countFor(n);
      index = from = 0;
      phase = 1;
      inserted = true;
      turns = rotation = 0;
    },
  };
}
const themes = ["harbor", "garden", "city", "moon", "coast", "observatory"];
function imageSource(value, allowExternal) {
  if (typeof value !== "string" || !value.length || value.length > 14000000)
    throw Error("A photograph needs a valid image source.");
  if (/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=\s]+$/i.test(value))
    return value;
  if (
    allowExternal &&
    !/^(javascript|data|file):/i.test(value) &&
    !/[<>\u0000]/.test(value)
  )
    return value;
  throw Error(
    "Imported reels accept embedded PNG, JPEG or WebP images. Add local photographs, then save the reel to embed them.",
  );
}
export function readReel(input, { allowExternal = false } = {}) {
  const r = typeof input === "string" ? JSON.parse(input) : input;
  if (
    !r ||
    r.version !== 1 ||
    !Array.isArray(r.scenes) ||
    !r.scenes.length ||
    r.scenes.length > 24
  )
    throw Error("Use a version 1 reel with 1–24 scenes.");
  const text = (v, f, max = 180) =>
    typeof v === "string" ? v.slice(0, max) : f;
  return {
    version: 1,
    id: text(r.id, "custom", 60),
    title: text(r.title, "My little reel", 80),
    description: text(r.description, "A personal collection of tiny windows."),
    scenes: r.scenes.map((s, i) => {
      if (
        !s ||
        !["illustration", "world", "photo", "stereo-pair"].includes(s.kind)
      )
        throw Error(
          "Unknown scene type. Use illustration, world, photo or stereo-pair.",
        );
      const scene = {
        id: `frame-${i}`,
        title: text(s.title, `Scene ${i + 1}`, 90),
        caption: text(s.caption, ""),
        kind: s.kind,
      };
      if (s.kind === "photo") scene.src = imageSource(s.src, allowExternal);
      else if (s.kind === "stereo-pair") {
        scene.left = imageSource(s.left, allowExternal);
        scene.right = imageSource(s.right, allowExternal);
      } else {
        if (!themes.includes(s.theme)) throw Error("Unknown procedural theme.");
        scene.theme = s.theme;
        scene.seed = Number.isFinite(s.seed)
          ? clamp(Math.trunc(s.seed), 0, 9999)
          : i;
      }
      return scene;
    }),
  };
}
export function shiftScene(reel, index, delta) {
  const next = structuredClone(reel),
    to = clamp(index + delta, 0, reel.scenes.length - 1);
  const [s] = next.scenes.splice(index, 1);
  next.scenes.splice(to, 0, s);
  return { reel: next, index: to };
}
