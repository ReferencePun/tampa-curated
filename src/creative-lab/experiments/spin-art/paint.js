import { PAPERS, hash } from "./model.js";
const tones = new Map();
function pigment(hex) {
  if (tones.has(hex)) return tones.get(hex);
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    mix = (t) =>
      "rgb(" +
      rgb
        .map((v) => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t))
        .join(",") +
      ")";
  const shades = [mix(-0.045), hex, mix(0.02), mix(0.18)];
  if (tones.size > 256) tones.clear();
  tones.set(hex, shades);
  return shades;
}
/** One asymmetric liquid bead, shared by Canvas and vector export. */
function beadPoints(x, y, w, seed) {
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6,
      r = w * 0.5 * (0.9 + hash(seed + i * 13) * 0.15);
    return [
      x + Math.cos(a) * r,
      y + Math.sin(a) * r * (0.93 + hash(seed + 8) * 0.14),
    ];
  });
}
function beadPath(points) {
  let d = `M${(points[11][0] + points[0][0]) / 2} ${(points[11][1] + points[0][1]) / 2}`;
  for (let i = 0; i < 12; i++) {
    const p = points[i],
      n = points[(i + 1) % 12];
    d += `Q${p[0]} ${p[1]} ${(p[0] + n[0]) / 2} ${(p[1] + n[1]) / 2}`;
  }
  return d + "Z";
}
export function ribbonPath(m) {
  const [, x, y, xx, yy, w, , , , end = w] = m,
    dx = xx - x,
    dy = yy - y,
    len = Math.hypot(dx, dy);
  if (len < 0.0003) return beadPath(beadPoints(xx, yy, w, m[10] || 0));
  const nx = -dy / len,
    ny = dx / len,
    a = w * 0.5,
    b = end * 0.5;
  return `M${x + nx * a} ${y + ny * a}L${xx + nx * b} ${yy + ny * b}Q${xx + (dx / len) * b} ${yy + (dy / len) * b} ${xx - nx * b} ${yy - ny * b}L${x - nx * a} ${y - ny * a}Q${x - (dx / len) * a} ${y - (dy / len) * a} ${x + nx * a} ${y + ny * a}Z`;
}
function tracePaint(g, m) {
  const [, x, y, xx, yy, w, , , kind, end = w] = m,
    dx = xx - x,
    dy = yy - y,
    len = Math.hypot(dx, dy);
  g.beginPath();
  if (kind === "bead" || len < 0.0003) {
    const pts = beadPoints(xx, yy, w, m[10] || 0);
    g.moveTo((pts[11][0] + pts[0][0]) / 2, (pts[11][1] + pts[0][1]) / 2);
    for (let i = 0; i < 12; i++) {
      const p = pts[i],
        n = pts[(i + 1) % 12];
      g.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2);
    }
  } else {
    const nx = -dy / len,
      ny = dx / len,
      a = w * 0.5,
      b = end * 0.5;
    g.moveTo(x + nx * a, y + ny * a);
    g.lineTo(xx + nx * b, yy + ny * b);
    g.quadraticCurveTo(
      xx + (dx / len) * b,
      yy + (dy / len) * b,
      xx - nx * b,
      yy - ny * b,
    );
    g.lineTo(x - nx * a, y - ny * a);
    g.quadraticCurveTo(
      x - (dx / len) * a,
      y - (dy / len) * a,
      x + nx * a,
      y + ny * a,
    );
  }
  g.closePath();
}
/** Incremental opaque pigment bodies with tapered ridges and uneven pooled edges. */
export function drawMarks(g, marks, size, hidden = new Set()) {
  const r = size / 2;
  g.save();
  g.translate(r, r);
  g.scale(r, r);
  g.beginPath();
  g.arc(0, 0, 1, 0, Math.PI * 2);
  g.clip();
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const m of marks) {
    if (hidden.has(m[0])) continue;
    const [, x, y, xx, yy, w, color, alpha, kind] = m;
    g.globalAlpha = alpha;
    g.fillStyle = g.strokeStyle = color;
    if (kind === "ribbon" || kind === "bead") {
      // Thick pigment absorbs light nonlinearly; near-opaque paint must not reveal
      // every overlap between successive deposits as a mechanical seam.
      g.globalAlpha = 1 - Math.pow(1 - alpha, 3);
      const shades = pigment(color),
        dx = xx - x,
        dy = yy - y,
        len = Math.hypot(dx, dy);
      if (kind === "ribbon" && w < 0.012) {
        g.lineWidth = (w + (m[9] || w)) * 0.5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(xx + 1e-7, yy);
        g.stroke();
        continue;
      }
      tracePaint(g, m);
      if (w > 0.004) {
        let grad;
        if (kind === "bead" || len < 0.0003) {
          grad = g.createRadialGradient(
            xx - w * 0.15,
            yy - w * 0.18,
            0,
            xx,
            yy,
            w * 0.55,
          );
          grad.addColorStop(0, shades[2]);
          grad.addColorStop(0.38, color);
          grad.addColorStop(0.82, color);
          grad.addColorStop(1, shades[0]);
        } else {
          const nx = -dy / len,
            ny = dx / len,
            cx = (x + xx) / 2,
            cy = (y + yy) / 2,
            lit = nx * -0.5 + ny * -0.8 > 0;
          grad = g.createLinearGradient(
            cx - nx * w * 0.5,
            cy - ny * w * 0.5,
            cx + nx * w * 0.5,
            cy + ny * w * 0.5,
          );
          grad.addColorStop(0, shades[0]);
          grad.addColorStop(0.18, lit ? color : shades[2]);
          grad.addColorStop(0.48, color);
          grad.addColorStop(0.78, lit ? shades[2] : color);
          grad.addColorStop(1, shades[0]);
        }
        g.fillStyle = grad;
      }
      g.fill();
      // Small broken highlights belong to deposited beads, not to every polyline join.
      if (kind === "bead" && w > 0.009) {
        g.globalAlpha = alpha * 0.3;
        g.strokeStyle = shades[3];
        g.lineWidth = Math.max(0.0006, w * 0.045);
        g.beginPath();
        g.ellipse(
          xx - w * 0.11,
          yy - w * 0.1,
          w * 0.27,
          w * 0.23,
          -0.4,
          Math.PI,
          Math.PI * 1.65,
        );
        g.stroke();
      }
    } else if (kind === "wash") {
      const grad = g.createRadialGradient(xx, yy, 0, xx, yy, w * 0.85);
      grad.addColorStop(0, color + "70");
      grad.addColorStop(0.55, color + "30");
      grad.addColorStop(1, color + "00");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(xx, yy, w * 0.85, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "drop") {
      g.beginPath();
      g.ellipse(xx, yy, w * 0.5, w * 0.45, 0.4, 0, Math.PI * 2);
      g.fill();
    } else {
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(xx + 1e-7, yy);
      g.stroke();
    }
  }
  g.restore();
}
let paperGrain;
export function drawPaperGrain(g, x, y, size) {
  if (!paperGrain) {
    paperGrain = document.createElement("canvas");
    paperGrain.width = paperGrain.height = 128;
    const c = paperGrain.getContext("2d");
    for (let i = 0; i < 1800; i++) {
      c.fillStyle = i % 3 ? "rgba(83,67,43,.065)" : "rgba(255,255,255,.14)";
      c.fillRect(
        hash(i + 3) * 128,
        hash(i + 51) * 128,
        0.5 + hash(i + 9) * 1.4,
        0.4 + hash(i + 77) * 0.7,
      );
    }
  }
  g.save();
  g.translate(x, y);
  const scale = size / 1024;
  g.scale(scale, scale);
  g.fillStyle = g.createPattern(paperGrain, "repeat");
  g.fillRect(0, 0, 1024, 1024);
  g.restore();
}
export function compositePaper(g, paint, size, paper, angle = 0) {
  g.clearRect(0, 0, size, size);
  g.save();
  g.translate(size / 2, size / 2);
  g.rotate(angle);
  g.beginPath();
  g.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = PAPERS[paper] || PAPERS.ivory;
  g.fillRect(-size / 2, -size / 2, size, size);
  drawPaperGrain(g, -size / 2, -size / 2, size);
  g.drawImage(paint, -size / 2, -size / 2, size, size);
  g.restore();
}
export function svgArtwork(doc) {
  const size = doc.settings.paperSize,
    paths = doc.marks
      .map((m) => {
        const [, x, y, xx, yy, w, c, a, kind] = m;
        return kind === "ribbon" || kind === "bead"
          ? `<path d="${kind === "ribbon" ? ribbonPath(m) : beadPath(beadPoints(xx, yy, w, m[10] || 0))}" fill="${c}" opacity="${a}"/>`
          : kind === "line"
            ? `<path d="M${x} ${y}L${xx + 1e-7} ${yy}" stroke="${c}" stroke-width="${w}" opacity="${a}" stroke-linecap="round"/>`
            : `<circle cx="${xx}" cy="${yy}" r="${w * (kind === "wash" ? 0.7 : 0.5)}" fill="${c}" opacity="${kind === "wash" ? a * 0.45 : a}"/>`;
      })
      .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-1 -1 2 2"><defs><clipPath id="disc"><circle r="1"/></clipPath></defs><g clip-path="url(#disc)"><circle r="1" fill="${PAPERS[doc.settings.paper]}"/><g transform="rotate(${(doc.angle * 180) / Math.PI})" fill="none">${paths}</g></g></svg>`;
}
