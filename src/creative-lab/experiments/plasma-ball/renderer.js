import { PALETTES } from "./model.js";
export function layout(width = 1000, height = 900, scale = 1) {
  const radius = Math.min(width * 0.375, height * 0.36) * scale;
  return { x: width / 2, y: height * 0.435, radius };
}
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
function haze(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.2, rgba(color, alpha * 0.65));
  g.addColorStop(1, rgba(color, 0));
  circle(ctx, x, y, r, g);
}
export function createRenderer() {
  const background = document.createElement("canvas"),
    glow = document.createElement("canvas");
  let key = "";
  function backdrop(c, w, h) {
    const next = [
      w,
      h,
      c.sphereSize,
      c.reflection,
      c.darkness,
      c.palette,
    ].join();
    if (key === next) return;
    key = next;
    background.width = w;
    background.height = h;
    const ctx = background.getContext("2d"),
      { x, y, radius: r } = layout(w, h, c.sphereSize),
      colors = PALETTES[c.palette];
    const base = Math.round(4 + (1 - c.darkness) * 55);
    ctx.fillStyle = `rgb(${base},${base + 1},${base + 5})`;
    ctx.fillRect(0, 0, w, h);
    haze(ctx, x, y, r * 1.55, colors.colors[0], 0.055);
    haze(ctx, x, y + r * 1.14, r * 0.75, colors.colors[2], 0.045);
    // Ground shadow, engraved foot and a subdued lathed metal base.
    ctx.save();
    ctx.translate(x, y + r * 1.2);
    ctx.scale(1, 0.23);
    haze(ctx, 0, 0, r * 0.72, "#000000", 0.9);
    ctx.restore();
    const footY = y + r * 0.91,
      bw = r * 0.74,
      bh = r * 0.26;
    const metal = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    metal.addColorStop(0, "#11121b");
    metal.addColorStop(0.18, "#34303b");
    metal.addColorStop(0.47, "#1e1d28");
    metal.addColorStop(0.8, "#15151c");
    metal.addColorStop(1, "#39303e");
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.39, footY);
    ctx.lineTo(x - bw * 0.5, footY + bh);
    ctx.quadraticCurveTo(x, footY + bh * 1.22, x + bw * 0.5, footY + bh);
    ctx.lineTo(x + bw * 0.39, footY);
    ctx.closePath();
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = "#867486";
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = w * 0.0008;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(
        x,
        footY + bh * 0.22 + i * bh * 0.079,
        bw * (0.4 + i * 0.01),
        bh * 0.09,
        0,
        0,
        Math.PI,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#aba0af";
    ctx.font = `${w * 0.009}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("V O L T A   /   3 3", x, footY + bh * 0.65);
    // Transparent volume and optical rim. The interior remains almost black.
    const glass = ctx.createRadialGradient(
      x - r * 0.25,
      y - r * 0.32,
      r * 0.02,
      x,
      y,
      r,
    );
    glass.addColorStop(0, "rgba(58,37,83,.04)");
    glass.addColorStop(0.75, "rgba(26,27,49,.035)");
    glass.addColorStop(0.93, "rgba(58,63,102,.09)");
    glass.addColorStop(0.985, "rgba(136,130,184,.15)");
    glass.addColorStop(1, "rgba(182,175,202,.08)");
    circle(ctx, x, y, r, glass);
    ctx.strokeStyle = rgba("#b6accd", 0.13 + c.reflection * 0.16);
    ctx.lineWidth = w * 0.0009;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba("#8b82a5", 0.1);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.988, 0, Math.PI * 2);
    ctx.stroke();
  }
  function draw(canvas, config, field) {
    const ctx = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      c = config,
      { x, y, radius: r } = layout(w, h, c.sphereSize),
      palette = PALETTES[c.palette];
    backdrop(c, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(background, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.998, 0, Math.PI * 2);
    ctx.clip();
    // Layered refraction ghost at the perimeter, lighter rear filaments, then cores.
    const paths = field.paths;
    const trace = (target, p, s = 1) => {
      const a = p.points;
      target.moveTo(x + a[0] * r * s, y + a[1] * r * s);
      for (let i = 3; i < a.length; i += 3)
        target.lineTo(x + a[i] * r * s, y + a[i + 1] * r * s);
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "lighter";
    // Bounded low-resolution bloom: no per-filament blur or shadow render passes.
    const gw = Math.max(1, Math.round(w * 0.4)),
      gh = Math.max(1, Math.round(h * 0.4));
    if (glow.width !== gw || glow.height !== gh) {
      glow.width = gw;
      glow.height = gh;
    }
    const g = glow.getContext("2d");
    g.setTransform(0.4, 0, 0, 0.4, 0, 0);
    g.clearRect(0, 0, w + 4, h + 4);
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let color = 0; color < 4; color++) {
      g.beginPath();
      for (const p of paths) if (!p.branch && p.color === color) trace(g, p);
      g.strokeStyle = rgba(
        palette.colors[color],
        0.045 * c.glow * (1 - field.contact.amount * 0.7),
      );
      g.lineWidth = r * 0.052;
      g.stroke();
      g.strokeStyle = rgba(
        palette.colors[color],
        0.085 * c.glow * (1 - field.contact.amount * 0.7),
      );
      g.lineWidth = r * 0.025;
      g.stroke();
    }
    ctx.drawImage(glow, 0, 0, w, h);
    // Batch fine branches by pigment and brightness. Their paths remain independent;
    // the renderer avoids hundreds of tiny additive draw calls.
    for (let color = 0; color < 4; color++)
      for (let band = 0; band < 2; band++) {
        ctx.beginPath();
        let total = 0,
          count = 0;
        for (const p of paths)
          if (
            p.branch &&
            p.color === color &&
            Number(p.strength > 0.2) === band
          ) {
            trace(ctx, p);
            total += p.strength;
            count++;
          }
        if (!count) continue;
        const strength = (total / count) * (c.mode === "ambient" ? 0.83 : 1);
        ctx.strokeStyle = rgba(palette.colors[color], 0.2 * strength * c.glow);
        ctx.lineWidth = r * 0.008;
        ctx.stroke();
        ctx.strokeStyle = rgba(palette.colors[color], 0.65 * strength);
        ctx.lineWidth = r * 0.0024;
        ctx.stroke();
        ctx.strokeStyle = rgba("#f9e3ff", 0.25 * strength);
        ctx.lineWidth = r * 0.001;
        ctx.stroke();
      }
    for (const p of paths) {
      if (p.branch) continue;
      ctx.beginPath();
      trace(ctx, p);
      const color = palette.colors[p.color],
        strength = p.strength * (c.mode === "ambient" ? 0.83 : 1);
      ctx.strokeStyle = rgba(color, 0.19 * strength * c.glow);
      ctx.lineWidth = r * 0.013 * p.width;
      ctx.stroke();
      ctx.strokeStyle = rgba(color, Math.min(0.9, 0.53 * strength));
      ctx.lineWidth = r * 0.0045 * p.width;
      ctx.stroke();
      ctx.strokeStyle = rgba("#f9e3ff", Math.min(0.9, 0.5 * strength));
      ctx.lineWidth = r * 0.0015 * p.width;
      ctx.stroke();
      if (!p.branch) {
        const a = p.points,
          ex = x + a.at(-3) * r,
          ey = y + a.at(-2) * r;
        haze(
          ctx,
          ex,
          ey,
          r * (0.018 + p.pull * 0.025),
          color,
          (0.2 + p.pull * 0.08) * c.glow * p.strength,
        );
      }
    }
    // An electrode rather than a single bright dot: a dark stalk, halo and hot rim.
    ctx.globalCompositeOperation = "source-over";
    const cr = r * c.coreSize;
    const stem = ctx.createLinearGradient(x - cr, 0, x + cr, 0);
    stem.addColorStop(0, "#0c0b15");
    stem.addColorStop(0.5, "#292038");
    stem.addColorStop(1, "#100c1a");
    ctx.fillStyle = stem;
    ctx.beginPath();
    ctx.moveTo(x - cr * 0.24, y);
    ctx.lineTo(x - cr * 0.35, y + r);
    ctx.lineTo(x + cr * 0.35, y + r);
    ctx.lineTo(x + cr * 0.24, y);
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    haze(ctx, x, y, cr * 3.7, palette.colors[0], 0.42 * c.glow);
    haze(ctx, x, y, cr * 1.7, palette.core, 0.6 * c.glow);
    ctx.globalCompositeOperation = "source-over";
    const core = ctx.createRadialGradient(
      x - cr * 0.28,
      y - cr * 0.32,
      cr * 0.1,
      x,
      y,
      cr,
    );
    core.addColorStop(0, "#fff1ff");
    core.addColorStop(0.18, palette.core);
    core.addColorStop(0.52, palette.colors[0]);
    core.addColorStop(0.82, "#41244c");
    core.addColorStop(0.95, palette.core);
    core.addColorStop(1, palette.colors[1]);
    circle(ctx, x, y, cr, core);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8 + field.time * 0.04;
      haze(
        ctx,
        x + Math.cos(a) * cr * 0.92,
        y + Math.sin(a) * cr * 0.92,
        cr * 0.23,
        palette.core,
        0.45,
      );
    }
    // Contact glow lies on the front of the glass, exactly below the input position.
    if (field.contact.amount > 0.01) {
      const q = field.contact,
        len = Math.hypot(q.x, q.y),
        k = Math.min(1, 0.99 / Math.max(0.01, len));
      haze(
        ctx,
        x + q.x * k * r,
        y + q.y * k * r,
        r * 0.14,
        palette.colors[1],
        q.amount * 0.13 * c.glow,
      );
    }
    ctx.restore();
    // Restrained asymmetric softbox reflections; no opaque highlights over the arcs.
    ctx.save();
    ctx.lineCap = "round";
    ctx.globalAlpha = c.reflection;
    ctx.strokeStyle = "rgba(220,219,242,.19)";
    ctx.lineWidth = r * 0.017;
    ctx.beginPath();
    ctx.arc(
      x + r * 0.015,
      y + r * 0.01,
      r * 0.95,
      Math.PI * 1.12,
      Math.PI * 1.47,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(239,236,255,.43)";
    ctx.lineWidth = r * 0.003;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.976, Math.PI * 1.15, Math.PI * 1.38);
    ctx.stroke();
    ctx.strokeStyle = "rgba(151,168,226,.13)";
    ctx.lineWidth = r * 0.009;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.966, -0.23, 0.53);
    ctx.stroke();
    ctx.save();
    ctx.translate(x - r * 0.49, y - r * 0.67);
    ctx.rotate(-0.65);
    ctx.scale(0.3, 1);
    haze(ctx, 0, 0, r * 0.23, "#e0d5ff", 0.22);
    ctx.restore();
    ctx.restore();
  }
  return {
    draw,
    dispose() {
      background.width = background.height = glow.width = glow.height = 1;
      key = "";
    },
  };
}
