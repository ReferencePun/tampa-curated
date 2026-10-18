// A tiny, dependency-free perspective renderer. Geometry is shared between both eyes.
// Off-axis projection converges on z=0; nearer/further geometry has different disparity.
export function project(point, eye = 0, width = 600, height = 450, pan = 0) {
  const [x, y, z] = point,
    cy = 4.8,
    cz = 13,
    pitch = 0.26;
  const dy = y - cy,
    dz = z - cz,
    depth = -dz * Math.cos(pitch) - dy * Math.sin(pitch);
  const yy = dy * Math.cos(pitch) - dz * Math.sin(pitch),
    f = width * 1.08;
  const convergence = cz * Math.cos(pitch) + cy * Math.sin(pitch);
  return [
    width / 2 + f * ((x - eye + pan) / depth + eye / convergence),
    height * 0.54 - (f * yy) / depth,
  ];
}
const palettes = {
  harbor: ["#d8e2d3", "#90b5b1", "#476d70", "#ecbd70", "#b9513a"],
  garden: ["#e2dfbc", "#92b695", "#486956", "#eedbaa", "#bb7763"],
  city: ["#e7b78d", "#6c919e", "#334e6a", "#e9d3a1", "#c56448"],
  coast: ["#f1dab1", "#7eb3ba", "#3a7b8d", "#f5e3bb", "#d7654f"],
  observatory: ["#8b9fa7", "#567986", "#334555", "#dbc493", "#b77856"],
  moon: ["#a8b4bf", "#8295aa", "#3f4d64", "#d8d6c1", "#bb6d4f"],
};
const shade = (hex, f) =>
  "#" +
  hex
    .slice(1)
    .match(/../g)
    .map((x) =>
      Math.max(0, Math.min(255, Math.round(parseInt(x, 16) * f)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
function architecture(theme, seed = 0) {
  const faces = [],
    lines = [];
  const p = palettes[theme] || palettes.harbor;
  const poly = (v, color, stroke = "#374d50") =>
    faces.push({ v, color, stroke });
  const line = (a, b, color = "#6b7973", width = 0.012) =>
    lines.push({ a, b, color, width });
  function box(x, z, w, d, h, color, y = 0) {
    const a = x - w / 2,
      b = x + w / 2,
      c = z - d / 2,
      e = z + d / 2;
    poly(
      [
        [a, y, c],
        [b, y, c],
        [b, y, e],
        [a, y, e],
      ],
      shade(color, 0.72),
    );
    poly(
      [
        [a, y, c],
        [a, y + h, c],
        [a, y + h, e],
        [a, y, e],
      ],
      shade(color, 0.78),
    );
    poly(
      [
        [b, y, c],
        [b, y + h, c],
        [b, y + h, e],
        [b, y, e],
      ],
      shade(color, 0.91),
    );
    poly(
      [
        [a, y + h, c],
        [b, y + h, c],
        [b, y + h, e],
        [a, y + h, e],
      ],
      shade(color, 1.06),
    );
    poly(
      [
        [a, y, e],
        [a, y + h, e],
        [b, y + h, e],
        [b, y, e],
      ],
      color,
    );
  }
  function roof(x, z, w, d, h, y, color) {
    poly(
      [
        [x - w / 2, y, z - d / 2],
        [x, y + h, z - d / 2],
        [x, y + h, z + d / 2],
        [x - w / 2, y, z + d / 2],
      ],
      shade(color, 0.8),
    );
    poly(
      [
        [x + w / 2, y, z - d / 2],
        [x, y + h, z - d / 2],
        [x, y + h, z + d / 2],
        [x + w / 2, y, z + d / 2],
      ],
      color,
    );
    poly(
      [
        [x - w / 2, y, z + d / 2],
        [x, y + h, z + d / 2],
        [x + w / 2, y, z + d / 2],
      ],
      shade(color, 0.92),
    );
  }
  function house(x, z, w, h, color, roofColor = p[4]) {
    box(x, z, w, 1.35, h, color);
    roof(x, z, w + 0.2, 1.55, 0.65, h, roofColor);
    for (let row = 0; row < Math.floor(h / 0.65); row++)
      for (let col = 0; col < Math.max(2, Math.floor(w / 0.45)); col++) {
        const xx =
            x -
            w * 0.34 +
            (col * w * 0.68) / (Math.max(2, Math.floor(w / 0.45)) - 1),
          yy = 0.5 + row * 0.65;
        poly(
          [
            [xx - 0.1, yy - 0.15, z + 0.68],
            [xx - 0.1, yy + 0.15, z + 0.68],
            [xx + 0.1, yy + 0.15, z + 0.68],
            [xx + 0.1, yy - 0.15, z + 0.68],
          ],
          (row + col + seed) % 4 === 0 ? "#f4d48b" : p[2],
        );
        line([xx, yy - 0.15, z + 0.69], [xx, yy + 0.15, z + 0.69], color);
        line([xx - 0.1, yy, z + 0.69], [xx + 0.1, yy, z + 0.69], color);
      }
    box(x, z + 0.7, 0.3, 0.06, 0.65, p[2]);
  }
  function tree(x, z, h = 2) {
    box(x, z, 0.09, 0.09, h * 0.7, "#716e4f");
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          b = ((i + 1) * Math.PI) / 4,
          r = 0.55 * (1 - j * 0.2),
          y = h * 0.35 + j * h * 0.19;
        poly(
          [
            [x + Math.cos(a) * r, y, z + Math.sin(a) * r],
            [x, h * 0.68 + j * h * 0.16, z],
            [x + Math.cos(b) * r, y, z + Math.sin(b) * r],
          ],
          shade("#63836c", 0.8 + (i % 3) * 0.11),
        );
      }
  }
  function dome(x, z, y, r, color) {
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 16; i++) {
        const v = [];
        for (const [a, b] of [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ]) {
          const ph = (a / 16) * Math.PI * 2,
            t = ((b / 5) * Math.PI) / 2;
          v.push([
            x + Math.cos(ph) * Math.cos(t) * r,
            y + Math.sin(t) * r,
            z + Math.sin(ph) * Math.cos(t) * r,
          ]);
        }
        poly(
          v,
          shade(
            color,
            0.83 + Math.sin((i / 16) * Math.PI * 2) * 0.12 + j * 0.04,
          ),
        );
      }
  }
  poly(
    [
      [-6, -0.1, -5],
      [6, -0.1, -5],
      [6, -0.1, 6],
      [-6, -0.1, 6],
    ],
    p[3],
  );
  if (["harbor", "coast"].includes(theme)) {
    poly(
      [
        [-6, 0.015, 1.6],
        [6, 0.015, 1.6],
        [6, 0.015, 7],
        [-6, 0.015, 7],
      ],
      p[1],
    );
    for (let j = 0; j < 28; j++) {
      const z = 2 + j * 0.16;
      for (let i = 0; i < 5; i++) {
        const x = -5 + i * 2.4 + Math.sin(j * 3 + i) * 0.5;
        line(
          [x, 0.025, z],
          [x + 0.6 + (j % 3) * 0.1, 0.025, z],
          "#c1ddd0",
          0.015,
        );
      }
    }
    box(-0.8, 2.4, 1.4, 4, 0.12, "#b5a47e");
    for (let i = 0; i < 15; i++)
      line(
        [-1.5, 0.14, 0.5 + i * 0.26],
        [-0.1, 0.14, 0.5 + i * 0.26],
        "#817b64",
      );
    house(2, -2, 1.8, 1.5, "#e4ce9c");
    house(-1, -2.8, 1.5, 1.9, "#f1dec0");
    house(-3, -1, 1.3, 1.2, "#c89976");
    if (theme === "harbor") {
      box(3.8, -0.4, 0.85, 0.85, 2.6, "#e8e2c7");
      box(3.8, -0.4, 0.91, 0.91, 0.35, p[4], 1.5);
      box(3.8, -0.4, 1.05, 1.05, 0.4, p[2], 2.65);
      roof(3.8, -0.4, 1.3, 1.3, 0.5, 3.05, p[4]);
    } else
      for (let i = 0; i < 3; i++) {
        const x = 1 + i * 1.25;
        box(x, 0.2, 0.05, 0.05, 0.9, p[2]);
        roof(x, 0.2, 1.2, 1.2, 0.35, 0.9, i % 2 ? p[4] : "#eee3c9");
      }
    poly(
      [
        [1, 0.15, 3],
        [2, 0.15, 3.5],
        [2.7, 0.15, 3],
        [2.4, 0.15, 2.65],
        [1.3, 0.15, 2.65],
      ],
      p[4],
    );
    line([1.8, 0.2, 3], [1.8, 1.8, 3], p[2], 0.03);
    poly(
      [
        [1.78, 0.5, 3],
        [1.78, 1.8, 3],
        [0.95, 0.5, 3],
      ],
      "#f7ebca",
    );
    tree(-4, -3, 2.5);
    tree(4, -3, 2.1);
  } else if (theme === "garden") {
    poly(
      [
        [-0.6, 0, 5],
        [0.6, 0, 5],
        [0.4, 0, -3],
        [-0.4, 0, -3],
      ],
      "#b8a78d",
    );
    house(0, -2, 2.7, 1.3, "#c2d6bc", "#5e998e");
    for (let i = 0; i < 6; i++)
      line(
        [-1.3 + i * 0.52, 0, -1.31],
        [-1.3 + i * 0.52, 1.3, -1.31],
        "#7b9488",
        0.035,
      );
    dome(0, -2, 1.9, 1.25, "#9ebcac");
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1,
        z = -4 + Math.floor(i / 2) * 2.1;
      tree(side * (2.3 + (i % 3) * 0.35), z, 1.8 + (i % 3) * 0.3);
    }
    for (const x of [-1.4, 1.4]) {
      box(x, 1.8, 0.6, 2.5, 0.12, "#88a18b");
      for (let j = 0; j < 9; j++)
        box(
          x + Math.sin(j * 2) * 0.2,
          1 + j * 0.2,
          0.1,
          0.12,
          0.2,
          j % 2 ? "#c28378" : "#dbc57e",
        );
    }
  } else if (theme === "city") {
    poly(
      [
        [-0.8, 0, -5],
        [0.8, 0, -5],
        [1.7, 0, 6],
        [-1.7, 0, 6],
      ],
      "#9c9e94",
    );
    for (let i = 0; i < 4; i++) {
      house(
        -2.2,
        -4 + i * 2.2,
        1.7,
        1.8 + (i % 3) * 0.5,
        shade(p[3], 0.94 + i * 0.03),
      );
      house(
        2.2,
        -4 + i * 2.2,
        1.7,
        2 + (i % 2) * 0.9,
        i % 2 ? "#c9b7a4" : "#9bb5ae",
      );
    }
    box(0.2, 2.2, 0.6, 1.1, 0.35, p[4]);
    box(0.2, 2.15, 0.5, 0.6, 0.25, "#dadac4", 0.35);
    for (let i = 0; i < 8; i++)
      line(
        [-0.05, 0.02, -4 + i * 1.2],
        [0.05, 0.02, -3.5 + i * 1.2],
        "#e7ddc4",
        0.04,
      );
  } else {
    for (let i = 0; i < 7; i++)
      box(
        -4 + i * 1.3,
        -2 + Math.sin(i) * 3,
        0.9,
        1.2,
        0.12 + (i % 3) * 0.13,
        shade(p[3], 0.84 + (i % 4) * 0.04),
      );
    box(0, -1, 3, 3, 1.5, theme === "moon" ? "#c5c7c1" : "#bca27e");
    dome(0, -1, 1.5, 1.65, theme === "moon" ? "#acb9bc" : "#72908d");
    box(-2.6, 1, 1.1, 1.6, 0.9, p[4]);
    dome(-2.6, 1, 0.9, 0.6, "#dfd9bb");
    for (let i = 0; i < 4; i++) {
      line([0.4 + i * 0.15, 3.4, -1], [1.5 + i * 0.15, 3.95, -1], p[2], 0.05);
    }
    if (theme === "observatory") {
      tree(-3, -3, 2.5);
      tree(3, -2, 2.4);
      tree(3.5, 2, 1.7);
    } else {
      box(2.9, 1.8, 0.07, 0.07, 1.9, "#e0dac5");
      poly(
        [
          [2.9, 1.9, 1.8],
          [3.7, 1.75, 1.8],
          [3.7, 1.3, 1.8],
          [2.9, 1.4, 1.8],
        ],
        p[4],
      );
    }
  }
  // Tiny people and railings establish the scale.
  for (let i = 0; i < 3; i++) {
    const x = -0.4 + i * 0.42,
      z = 0.1 + i * 0.7;
    box(x, z, 0.1, 0.1, 0.35, p[2]);
    dome(x, z, 0.4, 0.07, p[3]);
  }
  return { faces, lines, p };
}
export function createSceneRenderer(onLoad = () => {}) {
  const images = new Map(),
    worlds = new Map();
  let disposed = false;
  function getImage(src) {
    if (!src) return null;
    if (images.has(src)) return images.get(src);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      if (!disposed) onLoad();
    };
    img.onerror = () => {
      img.dataset.failed = "true";
      if (!disposed) onLoad();
    };
    images.set(src, img);
    img.src = src;
    return img;
  }
  function photo(ctx, img, w, h) {
    if (img?.complete && img.naturalWidth) {
      const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      ctx.drawImage(
        img,
        (w - img.naturalWidth * scale) / 2,
        (h - img.naturalHeight * scale) / 2,
        img.naturalWidth * scale,
        img.naturalHeight * scale,
      );
      return true;
    }
    ctx.fillStyle = "#d9cfb7";
    ctx.font = "16px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(
      img?.dataset.failed ? "Image unavailable" : "Opening the little window…",
      w / 2,
      h / 2,
    );
    return false;
  }
  function render(
    canvas,
    scene,
    {
      eye = 0,
      pan = 0,
      zoom = 1,
      phase = 1,
      transition = "instant",
      inserted = true,
      dpr = 1,
    } = {},
  ) {
    const rect = canvas.getBoundingClientRect(),
      w = Math.max(120, rect.width || 360),
      h = Math.max(90, rect.height || 260),
      pixel = Math.min(2, dpr);
    if (
      canvas.width !== Math.round(w * pixel) ||
      canvas.height !== Math.round(h * pixel)
    ) {
      canvas.width = Math.round(w * pixel);
      canvas.height = Math.round(h * pixel);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(pixel, 0, 0, pixel, 0, 0);
    ctx.fillStyle = "#172322";
    ctx.fillRect(0, 0, w, h);
    if (!inserted) {
      ctx.fillStyle = "#a8b0a0";
      ctx.textAlign = "center";
      ctx.font = "15px Georgia";
      ctx.fillText("A world is waiting.", w / 2, h / 2);
      return;
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);
    let ready = true;
    if (scene.kind === "photo" || scene.kind === "stereo-pair") {
      const src =
        scene.kind === "photo" ? scene.src : eye > 0 ? scene.right : scene.left;
      ready = photo(ctx, getImage(src), w, h);
    } else {
      const key = scene.theme + ":" + scene.seed;
      if (!worlds.has(key))
        worlds.set(key, architecture(scene.theme, scene.seed));
      const { faces, lines, p } = worlds.get(key),
        isDrawing = scene.kind === "illustration";
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, p[0]);
      grad.addColorStop(1, "#f1e4c6");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Sun, stars and distant contour bands belong to the far plane.
      ctx.fillStyle =
        scene.theme === "moon" || scene.theme === "observatory"
          ? "#f4e6bc"
          : "#f6df9d";
      ctx.beginPath();
      ctx.arc(w * 0.77 + eye * 3, h * 0.23, w * 0.065, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle = "rgba(255,244,214,.5)";
        ctx.fillRect(
          (((i * 137 + scene.seed * 43) % 997) / 997) * w,
          (((i * 53) % 219) / 850) * h,
          1.3,
          1.3,
        );
      }
      const pr = (v) => project(v, eye, w, h, pan),
        // Ground polygons must sit behind the architecture; sorting their large
        // centroids with the buildings would paint over the distant facades.
        depth = (v) =>
          v.every((p) => p[1] <= 0.03)
            ? -1000 + v[0][1]
            : v.reduce((a, p) => a + p[2], 0) / v.length;
      for (const f of [...faces].sort((a, b) => depth(a.v) - depth(b.v))) {
        ctx.beginPath();
        f.v.forEach((v, i) => {
          const q = pr(v);
          i ? ctx.lineTo(...q) : ctx.moveTo(...q);
        });
        ctx.closePath();
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.lineWidth = isDrawing ? 0.75 : 0.45;
        ctx.strokeStyle = isDrawing ? "#4c5f58" : f.stroke + "77";
        ctx.stroke();
      }
      for (const l of lines) {
        ctx.beginPath();
        ctx.moveTo(...pr(l.a));
        ctx.lineTo(...pr(l.b));
        ctx.strokeStyle = l.color;
        ctx.lineWidth = Math.max(0.55, (l.width * w) / 9);
        ctx.stroke();
      }
      if (isDrawing) {
        ctx.strokeStyle = "rgba(71,73,58,.09)";
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 160; i++) {
          const x = (((i * 97) % 1000) / 1000) * w,
            y = (((i * 71) % 1000) / 1000) * h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 3 + (i % 6), y - 3);
          ctx.stroke();
        }
        ctx.strokeStyle = "#eef0d344";
        ctx.strokeRect(9, 9, w - 18, h - 18);
      }
    }
    ctx.restore();
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.15,
      w / 2,
      h / 2,
      w * 0.64,
    );
    vignette.addColorStop(0, "#0000");
    vignette.addColorStop(1, "#07121088");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (phase < 1 && transition !== "instant") {
      if (transition === "shutter") {
        const cover = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
        ctx.fillStyle = "#111817";
        ctx.fillRect(0, 0, w, (h / 2) * cover);
        ctx.fillRect(0, h - (h / 2) * cover, w, (h / 2) * cover);
      } else {
        ctx.fillStyle = `rgba(15,22,20,${Math.sin(phase * Math.PI)})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    canvas.dataset.imageReady = String(ready);
  }
  return {
    render,
    preload(scene) {
      if (scene.kind === "photo") getImage(scene.src);
      if (scene.kind === "stereo-pair") {
        getImage(scene.left);
        getImage(scene.right);
      }
    },
    clear() {
      for (const img of images.values()) {
        img.onload = img.onerror = null;
        img.src = "";
      }
      images.clear();
      worlds.clear();
    },
    dispose() {
      disposed = true;
      this.clear();
    },
  };
}
