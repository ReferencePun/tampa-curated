import { PALETTES, hash } from "./model.js";
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Canvas renderer, independent of animation/input ownership. Coordinates are height units. */
export function createFieldRenderer() {
  const backing = document.createElement("canvas"),
    bloom = document.createElement("canvas");
  let key = "";
  function substrate(w, h, c) {
    const k = [w, h, c.background, c.palette, c.transparent].join();
    if (key === k) return;
    key = k;
    backing.width = w;
    backing.height = h;
    const ctx = backing.getContext("2d");
    if (c.transparent) return;
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(
      w * 0.48,
      h * 0.45,
      0,
      w * 0.48,
      h * 0.45,
      Math.max(w, h) * 0.75,
    );
    g.addColorStop(
      0,
      rgba(
        PALETTES[c.palette].colors[0],
        c.palette === "graphite" ? 0.05 : 0.09,
      ),
    );
    g.addColorStop(1, "rgba(0,0,0,.15)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Quiet sediment, cached rather than animated television noise.
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rgba(
        PALETTES[c.palette].colors[i % 4],
        0.04 + hash(i + 42) * 0.08,
      );
      ctx.fillRect(
        hash(i + 1) * w,
        hash(i + 4001) * h,
        0.6 + hash(i) * 1.1,
        0.6,
      );
    }
  }
  function draw(canvas, c, field) {
    const ctx = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      palette = PALETTES[c.palette],
      ink = c.material === "ink",
      trans = c.material === "translucent";
    substrate(w, h, c);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(backing, 0, 0);
    ctx.save();
    ctx.scale(h, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const scale = Math.sqrt(64 / c.density),
      thickness = 0.0045 * scale * (c.material === "ink" ? 0.3 : 1);
    // Soft basal shadows make every radial colony a rooted organism, not a flat ray.
    if (!ink)
      for (const r of field.colonies) {
        const size = 0.055 * r.size * c.length,
          g = ctx.createRadialGradient(
            r.x * field.aspect,
            r.y,
            0,
            r.x * field.aspect,
            r.y,
            size,
          );
        g.addColorStop(0, "rgba(0,0,0,.45)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(
          r.x * field.aspect,
          r.y,
          size,
          size * 0.58,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    const trace = (p, from, to, target = ctx) => {
      const a = p.points;
      target.moveTo(a[from * 2], a[from * 2 + 1]);
      // Three Hermite spans retain the sampled centerline's curvature, without
      // rebuilding eight tiny cubic segments in every material pass.
      for (let i = from; i < to; i += 3) {
        const j = Math.min(to, i + 3),
          delta = j - i,
          prev = Math.max(0, i - 1),
          after = Math.min(8, i + 1),
          before = Math.max(0, j - 1),
          next = Math.min(8, j + 1),
          k0 = delta / (3 * (after - prev)),
          k1 = delta / (3 * (next - before));
        target.bezierCurveTo(
          a[i * 2] + (a[after * 2] - a[prev * 2]) * k0,
          a[i * 2 + 1] + (a[after * 2 + 1] - a[prev * 2 + 1]) * k0,
          a[j * 2] - (a[next * 2] - a[before * 2]) * k1,
          a[j * 2 + 1] - (a[next * 2 + 1] - a[before * 2 + 1]) * k1,
          a[j * 2],
          a[j * 2 + 1],
        );
      }
    };
    // A single small bloom surface carries the optical diffusion. Drawing wide
    // translucent paths at full backing resolution is costly on software Canvas.
    if (c.glow > 0 && !ink) {
      const bw = Math.max(1, Math.round(w * 0.28)),
        bh = Math.max(1, Math.round(h * 0.28));
      if (bloom.width !== bw || bloom.height !== bh) {
        bloom.width = bw;
        bloom.height = bh;
      }
      const g = bloom.getContext("2d");
      g.setTransform(bw / (w / h), 0, 0, bh, 0, 0);
      g.clearRect(0, 0, w / h, 1);
      g.lineCap = "round";
      g.lineJoin = "round";
      for (let color = 0; color < 4; color++) {
        g.beginPath();
        for (const p of field.paths) if (p.color === color) trace(p, 0, 8, g);
        g.strokeStyle = rgba(palette.colors[color], 0.035 * c.glow);
        g.lineWidth = thickness * 4;
        g.stroke();
        g.strokeStyle = rgba(palette.colors[color], 0.06 * c.glow);
        g.lineWidth = thickness * 2.3;
        g.stroke();
      }
      ctx.drawImage(bloom, 0, 0, w / h, 1);
    }
    for (let front = 0; front < 2; front++) {
      if (front === 1)
        for (const r of field.colonies) {
          // Folded oral disc, rim and short radial ribs between the rooted tentacles.
          const x = r.x * field.aspect,
            y = r.y - 0.018 * r.size * c.length,
            L = 0.017 * r.size * c.length;
          ctx.fillStyle = ink
            ? rgba(c.background, 0.85)
            : rgba(palette.colors[r.color], 0.24);
          ctx.strokeStyle = rgba(palette.colors[r.color], 0.55);
          ctx.lineWidth = 0.0008;
          ctx.beginPath();
          ctx.ellipse(x, y, L, L * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = rgba(palette.tip, 0.22);
          ctx.beginPath();
          for (let j = 0; j < 16; j++) {
            const a = (j * Math.PI) / 8;
            ctx.moveTo(x + Math.cos(a) * L * 0.27, y + Math.sin(a) * L * 0.11);
            ctx.lineTo(x + Math.cos(a) * L * 0.9, y + Math.sin(a) * L * 0.36);
          }
          ctx.stroke();
          ctx.fillStyle = ink ? rgba("#333633", 0.3) : "rgba(0,0,0,.55)";
          ctx.beginPath();
          ctx.ellipse(x, y, L * 0.25, L * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      for (let color = 0; color < 4; color++) {
        for (let part = 0; part < 3; part++) {
          const from = [0, 3, 6][part],
            to = [3, 6, 8][part],
            width = thickness * [1, 0.7, 0.4][part];
          ctx.beginPath();
          for (const p of field.paths)
            if (p.front === front && p.color === color) trace(p, from, to);
          ctx.strokeStyle = rgba(
            palette.colors[color],
            ink ? 0.65 : trans ? 0.49 : 0.87,
          );
          ctx.lineWidth = width;
          ctx.stroke();
          if (!ink) {
            ctx.strokeStyle = rgba(
              palette.tip,
              (front ? 0.2 : 0.12) + (trans ? 0.06 : 0),
            );
            ctx.lineWidth = width * 0.32;
            ctx.stroke();
          }
        }
        // Rounded terminal bulbs are sparse luminous punctuation on the fine translucent tubes.
        ctx.beginPath();
        for (const p of field.paths)
          if (p.front === front && p.color === color) {
            const a = p.points,
              r = thickness * (ink ? 0.48 : 0.62) * (p.ring === 0 ? 1 : 0.72);
            ctx.moveTo(a[16] + r, a[17]);
            ctx.arc(a[16], a[17], r, 0, Math.PI * 2);
          }
        ctx.fillStyle = rgba(
          ink ? palette.colors[color] : palette.tip,
          front ? 0.75 : 0.42,
        );
        ctx.fill();
      }
    }
    // Pointer field is visible only as a soft pool of light, never an outline over the artwork.
    if (field.pointer.amount && !ink && c.glow > 0) {
      const q = field.pointer,
        r = c.radius * 0.55,
        g = ctx.createRadialGradient(
          q.x * field.aspect,
          q.y,
          0,
          q.x * field.aspect,
          q.y,
          r,
        );
      g.addColorStop(0, rgba(palette.tip, 0.035 * c.glow));
      g.addColorStop(1, rgba(palette.tip, 0));
      ctx.fillStyle = g;
      ctx.fillRect(q.x * field.aspect - r, q.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  return {
    draw,
    dispose() {
      backing.width = backing.height = bloom.width = bloom.height = 1;
      key = "";
    },
  };
}
