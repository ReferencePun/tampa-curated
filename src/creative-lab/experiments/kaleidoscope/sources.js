import { PALETTES, objectPosition, TAU } from "./model.js";
const trace = (g, pts) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
};
function glass(g, o, color) {
  const r = o.size;
  const pts = Array.from({ length: (o.kind % 3) + 3 }, (_, i) => {
    const a = (i * TAU) / ((o.kind % 3) + 3);
    return [Math.cos(a) * r, Math.sin(a) * r * (0.6 + o.kind * 0.08)];
  });
  trace(g, pts);
  const grad = g.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, color + "aa");
  grad.addColorStop(0.8, color + "ee");
  grad.addColorStop(1, color + "77");
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 0.003;
  g.stroke();
  g.save();
  g.scale(0.78, 0.78);
  trace(g, pts);
  g.strokeStyle = "#f6ecc274";
  g.lineWidth = 0.002;
  g.stroke();
  g.restore();
  g.beginPath();
  g.moveTo(-r * 0.45, -r * 0.4);
  g.lineTo(r * 0.3, -r * 0.27);
  g.strokeStyle = "#fff3d48a";
  g.lineWidth = 0.003;
  g.stroke();
  g.beginPath();
  g.arc(-r * 0.2, -r * 0.2, 0.004, 0, TAU);
  g.fillStyle = "#fff7d8";
  g.fill();
  g.strokeStyle = "#fce6b935";
  g.lineWidth = 0.0012;
  for (const [x, y] of pts) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(r * 0.14, -r * 0.12);
    g.stroke();
  }
  g.beginPath();
  g.ellipse(0, 0, r * 0.31, r * 0.53, 0.4, 0, TAU);
  g.strokeStyle = color + "aa";
  g.lineWidth = 0.0015;
  g.stroke();
}
function leaf(g, o, color, p) {
  const r = o.size * 1.5;
  g.strokeStyle = p.ink;
  g.lineWidth = 0.0016;
  g.beginPath();
  g.moveTo(-r, 0);
  g.bezierCurveTo(-r * 0.3, -r * 0.14, r * 0.4, r * 0.06, r, 0);
  g.stroke();
  for (let k = 0; k < 7; k++) {
    const x = -r * 0.8 + k * r * 0.24;
    for (const sign of [-1, 1]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(
        x - r * 0.18,
        -r * 0.28 * sign,
        x + r * 0.12,
        -r * 0.5 * sign,
        x + r * 0.21,
        -r * 0.52 * sign,
      );
      g.bezierCurveTo(
        x + r * 0.24,
        -r * 0.16 * sign,
        x + r * 0.18,
        -r * 0.04 * sign,
        x,
        0,
      );
      g.stroke();
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + r * 0.21, -r * 0.52 * sign);
      g.stroke();
    }
  }
  g.strokeStyle = color;
  g.lineWidth = 0.003;
  g.beginPath();
  g.ellipse(0, 0, r * 0.2, r * 0.7, 0.9, 0, TAU);
  g.stroke();
}
function toy(g, o, color, p) {
  const r = o.size;
  g.fillStyle = color;
  g.strokeStyle = p.bg;
  g.lineWidth = 0.004;
  if (o.kind === 0) {
    trace(
      g,
      Array.from({ length: 10 }, (_, i) => {
        let a = (i * Math.PI) / 5;
        return [
          Math.cos(a) * r * (i % 2 ? 0.42 : 1),
          Math.sin(a) * r * (i % 2 ? 0.42 : 1),
        ];
      }),
    );
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(0, 0, r * 0.16, 0, TAU);
    g.fillStyle = p.bg;
    g.fill();
  } else if (o.kind === 1) {
    g.fillRect(-r * 0.45, -r, r * 0.9, 2 * r);
    g.strokeRect(-r * 0.45, -r, r * 0.9, 2 * r);
    g.beginPath();
    g.moveTo(-r * 0.4, 0);
    g.lineTo(r * 0.4, 0);
    g.stroke();
    g.fillStyle = p.bg;
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.arc(i * r * 0.2, -r * 0.5 + i * r * 0.14, r * 0.07, 0, TAU);
      g.fill();
    }
    g.beginPath();
    g.arc(0, r * 0.5, r * 0.07, 0, TAU);
    g.fill();
  } else if (o.kind === 2) {
    const grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.04, 0, 0, r);
    grad.addColorStop(0, "#ffffed");
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, p.bg);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.strokeStyle = color;
    g.stroke();
  } else if (o.kind === 3) {
    for (let i = 0; i < 6; i++) {
      g.save();
      g.rotate((i * TAU) / 6);
      g.beginPath();
      g.ellipse(r * 0.5, 0, r * 0.55, r * 0.25, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.restore();
    }
    g.fillStyle = "#eed3a0";
    g.beginPath();
    g.arc(0, 0, r * 0.22, 0, TAU);
    g.fill();
  } else if (o.kind === 4) {
    trace(g, [
      [-r, 0],
      [r, 0],
      [r * 0.55, r * 0.5],
      [-r * 0.55, r * 0.5],
    ]);
    g.fill();
    g.stroke();
    trace(g, [
      [-r * 0.7, -0.008],
      [0, -r * 0.9],
      [r * 0.7, -0.008],
    ]);
    g.fillStyle = "#e7d8b8";
    g.fill();
    g.stroke();
  } else {
    g.lineWidth = r * 0.24;
    g.strokeStyle = color;
    g.beginPath();
    g.arc(0, 0, r * 0.7, 0, TAU);
    g.stroke();
    g.strokeStyle = "#efdda09c";
    g.lineWidth = 0.003;
    g.beginPath();
    g.arc(0, 0, r * 0.7, 0.2, Math.PI);
    g.stroke();
  }
}
/** A source painter can be replaced by any canvas/video/image-producing application. */
export function paintSource(canvas, c, state, image) {
  const g = canvas.getContext("2d"),
    N = canvas.width,
    p = PALETTES[c.palette];
  g.setTransform(N / 2, 0, 0, N / 2, N / 2, N / 2);
  g.fillStyle =
    c.source === "lines"
      ? "#eae5d6"
      : c.source === "drawing"
        ? c.palette === "mono"
          ? "#eee6d3"
          : p.bg
        : p.bg;
  g.fillRect(-1, -1, 2, 2);
  if (c.source === "image" && image) {
    const w = image.width,
      h = image.height,
      scale = Math.max(N / w, N / h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(
      image,
      (N - w * scale) / 2,
      (N - h * scale) / 2,
      w * scale,
      h * scale,
    );
    return;
  }
  if (c.source === "drawing") {
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const s of state.strokes) {
      g.strokeStyle = g.fillStyle = s.color;
      g.lineWidth = s.width / 500;
      g.beginPath();
      s.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      if (s.points.length === 1) {
        const pt = s.points[0];
        g.arc(pt.x, pt.y, g.lineWidth / 2, 0, TAU);
        g.fill();
      } else g.stroke();
    }
    return;
  }
  const count = c.source === "lines" ? 35 : c.source === "toys" ? 48 : 85;
  for (const o of state.objects.slice(0, count)) {
    const pos = objectPosition(o, state.time.source, c.source);
    g.save();
    g.translate(pos.x, pos.y);
    g.rotate(pos.angle);
    const color = p.colors[o.color];
    if (c.source === "lines") leaf(g, o, color, p);
    else if (c.source === "toys") toy(g, o, color, p);
    else if (c.source === "particles") {
      const r =
        o.size * 0.18 * (0.8 + 0.2 * Math.sin(state.time.source + o.phase));
      const gr = g.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r);
      gr.addColorStop(0, "#fff1d7");
      gr.addColorStop(0.2, color);
      gr.addColorStop(1, color + "18");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.fill();
      g.strokeStyle = color + "44";
      g.lineWidth = 0.001;
      g.beginPath();
      g.arc(0, 0, r * 1.7, 0, TAU);
      g.stroke();
    } else glass(g, o, color);
    g.restore();
  }
  // Fine flecks suspended between the larger objects, always derived from the seed.
  if (c.source === "glass" || c.source === "particles") {
    g.fillStyle = p.colors[2] + "88";
    for (const o of state.objects) {
      g.beginPath();
      g.arc(o.y, o.x, 0.0015 + o.size * 0.012, 0, TAU);
      g.fill();
      if (c.source === "glass" && o.id % 2 === 0) {
        g.save();
        g.translate(o.y, o.x);
        g.rotate(o.angle);
        const r = o.size * 0.45;
        g.lineWidth = 0.002;
        g.strokeStyle = p.colors[(o.color + 2) % 6] + "a0";
        g.beginPath();
        g.ellipse(0, 0, r, r * 0.4, 0.3, 0, TAU);
        g.stroke();
        g.beginPath();
        g.ellipse(0, 0, r * 0.72, r * 0.22, 0.3, 0, TAU);
        g.stroke();
        g.fillStyle = p.colors[(o.color + 1) % 6];
        g.beginPath();
        g.arc(r * 0.6, 0, 0.009, 0, TAU);
        g.fill();
        g.restore();
      }
    }
  }
}
