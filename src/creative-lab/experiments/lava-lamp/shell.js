import { PALETTES, wall } from "./model.js";
import { createWaxRenderer } from "./field-renderer.js";
const alpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function glow(ctx, x, y, rx, ry, color, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, alpha(color, opacity));
  g.addColorStop(0.4, alpha(color, opacity * 0.5));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
export function lampLayout(w, h, c) {
  const scale = Math.min(h * 0.59 * c.height, w * 1.35) / 2.4,
    bottom = h * 0.76,
    top = bottom - scale * 2.4;
  return {
    x: w / 2,
    top,
    bottom,
    scale,
    half: c.mode === "ambient" ? 0.72 : 0.58,
  };
}
/** The shell only decorates a reusable implicit wax field. */
export function createLampRenderer(integration = {}) {
  const fieldRenderer = createWaxRenderer(integration);
  let disposed = false;
  function draw(canvas, field, c) {
    if (disposed || fieldRenderer.lost) return;
    const ctx = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      p = PALETTES[c.palette],
      l = lampLayout(w, h, c);
    ctx.fillStyle = "#100e11";
    ctx.fillRect(0, 0, w, h);
    if (c.mode === "ambient") {
      const surface = fieldRenderer.draw(field, c, w, h);
      ctx.drawImage(surface, 0, 0, w, h);
      const shade = ctx.createRadialGradient(
        w * 0.5,
        h * 0.4,
        h * 0.1,
        w * 0.5,
        h * 0.45,
        h * 0.75,
      );
      shade.addColorStop(0, "rgba(6,5,8,0)");
      shade.addColorStop(1, "rgba(6,5,8,.5)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const { x, top, bottom, scale } = l;
    const baseY = bottom + h * 0.115;
    glow(
      ctx,
      x,
      top + scale * 1.5,
      scale * 2.5,
      scale * 2.8,
      p.light,
      0.1 * c.ambient,
    );
    glow(ctx, x, baseY, scale * 1.7, scale * 0.2, p.light, 0.12 * c.ambient);
    // A quiet tabletop, then the soft shadow of the base.
    ctx.strokeStyle = "rgba(154,122,109,.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY + scale * 0.03);
    ctx.lineTo(w, baseY + scale * 0.03);
    ctx.stroke();
    glow(
      ctx,
      x,
      baseY + scale * 0.05,
      scale * 0.85,
      scale * 0.13,
      "#000000",
      0.95,
    );
    const body = new Path2D();
    for (let i = 0; i <= 48; i++) {
      const y = (i / 48) * 2.4;
      const px = x - wall(y, c.mode) * scale,
        py = bottom - y * scale;
      if (i === 0) body.moveTo(px, py);
      else body.lineTo(px, py);
    }
    for (let i = 48; i >= 0; i--) {
      const y = (i / 48) * 2.4;
      body.lineTo(x + wall(y, c.mode) * scale, bottom - y * scale);
    }
    body.closePath();
    ctx.save();
    ctx.clip(body);
    const surface = fieldRenderer.draw(field, c, scale * 1.16, scale * 2.4);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(surface, x - scale * 0.58, top, scale * 1.16, scale * 2.4);
    // Glass curvature absorbs the edges and reflects a tall, soft studio source.
    const glass = ctx.createLinearGradient(
      x - scale * 0.55,
      0,
      x + scale * 0.55,
      0,
    );
    glass.addColorStop(0, "rgba(0,0,0,.42)");
    glass.addColorStop(0.08, "rgba(212,198,178,.12)");
    glass.addColorStop(0.18, "rgba(255,234,210,.035)");
    glass.addColorStop(0.35, "rgba(255,255,255,0)");
    glass.addColorStop(0.78, "rgba(255,255,255,0)");
    glass.addColorStop(0.93, "rgba(148,164,190,.08)");
    glass.addColorStop(1, "rgba(0,0,0,.48)");
    ctx.fillStyle = glass;
    ctx.fillRect(x - scale * 0.6, top, scale * 1.2, scale * 2.4);
    ctx.lineCap = "round";
    ctx.lineWidth = scale * 0.022;
    ctx.strokeStyle = "rgba(251,233,213,.10)";
    ctx.beginPath();
    ctx.moveTo(
      x - wall(2.27, c.mode) * scale + scale * 0.045,
      top + scale * 0.12,
    );
    ctx.bezierCurveTo(
      x - scale * 0.35,
      top + scale * 0.75,
      x - scale * 0.45,
      top + scale * 1.5,
      x - scale * 0.38,
      bottom - scale * 0.16,
    );
    ctx.stroke();
    ctx.lineWidth = scale * 0.005;
    ctx.strokeStyle = "rgba(255,235,214,.3)";
    ctx.stroke();
    glow(
      ctx,
      x,
      bottom + scale * 0.035,
      scale * 0.65,
      scale * 0.19,
      p.hot,
      0.3 * c.glow,
    );
    ctx.restore();
    ctx.strokeStyle = "rgba(220,207,199,.19)";
    ctx.lineWidth = Math.max(0.6, w * 0.0008);
    ctx.stroke(body);
    if (c.mode === "column") {
      ctx.strokeStyle = "rgba(221,222,232,.3)";
      for (const y of [top, bottom]) {
        ctx.beginPath();
        ctx.ellipse(x, y, scale * 0.48, scale * 0.035, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    const dark = c.base === "dark",
      ceramic = c.base === "ceramic";
    const metal = ctx.createLinearGradient(
      x - scale * 0.6,
      0,
      x + scale * 0.6,
      0,
    );
    const tones = dark
      ? ["#141315", "#414043", "#1d1b20", "#0c0c0e", "#353238"]
      : ceramic
        ? ["#b5a494", "#f1dfc9", "#cfbcaa", "#97867b", "#c8b8a8"]
        : ["#373236", "#b8aaa2", "#71656a", "#322d34", "#9d8a80"];
    [0, 0.23, 0.5, 0.8, 1].forEach((v, i) => metal.addColorStop(v, tones[i]));
    // Original tapered pedestal and a small matching cap, both with elliptical seats.
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.47, bottom - scale * 0.025);
    ctx.bezierCurveTo(
      x - scale * 0.32,
      bottom + scale * 0.12,
      x - scale * 0.35,
      baseY - scale * 0.08,
      x - scale * 0.56,
      baseY,
    );
    ctx.quadraticCurveTo(x, baseY + scale * 0.055, x + scale * 0.56, baseY);
    ctx.bezierCurveTo(
      x + scale * 0.35,
      baseY - scale * 0.08,
      x + scale * 0.32,
      bottom + scale * 0.12,
      x + scale * 0.47,
      bottom - scale * 0.025,
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(x - scale * 0.265, top + scale * 0.025);
    ctx.lineTo(x - scale * 0.2, top - scale * 0.2);
    ctx.quadraticCurveTo(
      x,
      top - scale * 0.235,
      x + scale * 0.2,
      top - scale * 0.2,
    );
    ctx.lineTo(x + scale * 0.265, top + scale * 0.025);
    ctx.quadraticCurveTo(
      x,
      top + scale * 0.055,
      x - scale * 0.265,
      top + scale * 0.025,
    );
    ctx.fill();
    ctx.lineWidth = Math.max(0.5, w * 0.0006);
    ctx.strokeStyle = ceramic
      ? "rgba(255,245,235,.22)"
      : "rgba(238,222,210,.11)";
    for (let i = 0; i < (c.base === "brushed" ? 55 : 3); i++) {
      const yy = bottom + ((baseY - bottom) * (i + 1)) / 57,
        ww =
          scale * (0.36 + 0.12 * Math.pow((yy - bottom) / (baseY - bottom), 3));
      ctx.beginPath();
      ctx.ellipse(x, yy, ww, scale * 0.022, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(239,214,196,.32)";
    for (const [y, r] of [
      [top + scale * 0.022, scale * 0.26],
      [bottom, scale * 0.46],
      [baseY, scale * 0.55],
    ]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, scale * 0.024, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = dark ? "#b2a29a" : ceramic ? "#6c5f58" : "#ded0c6";
    ctx.font = `${Math.max(7, w * 0.009)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("S O L  /  3 4", x, baseY - scale * 0.12);
  }
  return {
    draw,
    get backend() {
      return fieldRenderer.backend;
    },
    get lost() {
      return fieldRenderer.lost;
    },
    dispose() {
      disposed = true;
      fieldRenderer.dispose();
    },
  };
}
