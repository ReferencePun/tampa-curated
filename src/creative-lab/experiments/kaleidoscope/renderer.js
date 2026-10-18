import { TAU, opticalState, sectorTransform } from "./model.js";
export function discRadius(c) {
  return c.border === "none" ? 0.499 : 0.435;
}
/** One clipped wedge and its true reflected copies; no replicated DOM or pixel loop. */
export function renderOptic(canvas, source, c, state) {
  const g = canvas.getContext("2d"),
    N = canvas.width,
    C = N / 2,
    R = N * discRadius(c),
    s = opticalState(c, state.time, state.pan);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, N, N);
  g.fillStyle = c.border === "ivory" ? "#ded9ca" : "#0b1116";
  g.fillRect(0, 0, N, N);
  if (c.border !== "none") {
    const gr = g.createRadialGradient(C, C, R * 0.99, C, C, R * 1.13);
    if (c.border === "brass") {
      gr.addColorStop(0, "#121619");
      gr.addColorStop(0.11, "#423b2c");
      gr.addColorStop(0.23, "#a29062");
      gr.addColorStop(0.31, "#d4c299");
      gr.addColorStop(0.38, "#594f38");
      gr.addColorStop(0.65, "#8c7a50");
      gr.addColorStop(0.88, "#322e24");
      gr.addColorStop(1, "#14191a");
    } else {
      gr.addColorStop(0, "#202a2c");
      gr.addColorStop(0.25, c.border === "ivory" ? "#f7f0dc" : "#78817d");
      gr.addColorStop(0.4, c.border === "ivory" ? "#b6a98b" : "#3f4645");
      gr.addColorStop(1, c.border === "ivory" ? "#d3c9b1" : "#131c22");
    }
    g.fillStyle = gr;
    g.beginPath();
    g.arc(C, C, R * 1.125, 0, TAU);
    g.fill();
    g.lineWidth = N * 0.0007;
    for (let i = 0; i < 120; i++) {
      const a = (i * TAU) / 120 + s.angle,
        r1 = R * (i % 5 ? 1.075 : 1.06),
        r2 = R * 1.095;
      g.strokeStyle = i % 5 ? "#d6c8a43d" : "#ead9b58c";
      g.beginPath();
      g.moveTo(C + Math.cos(a) * r1, C + Math.sin(a) * r1);
      g.lineTo(C + Math.cos(a) * r2, C + Math.sin(a) * r2);
      g.stroke();
    }
  }
  g.save();
  g.translate(C, C);
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.clip();
  g.fillStyle = "#10222b";
  g.fillRect(-R, -R, R * 2, R * 2);
  for (let i = 0; i < c.mirrors * 2; i++) {
    const { angle, flip, wedge } = sectorTransform(i, c, state.time);
    g.save();
    g.rotate(angle);
    g.scale(1, flip);
    g.beginPath();
    // Constant-pixel edge overlap also covers the apex; angular overlap alone
    // shrinks to zero at the center and leaves antialiasing cracks on ivory.
    const margin = 1.1,
      outer = R / Math.cos(wedge / 2) + 4;
    g.moveTo(-margin / Math.tan(wedge / 2), -margin);
    g.lineTo(outer, -margin);
    g.lineTo(
      outer * Math.cos(wedge) - margin * Math.sin(wedge),
      outer * Math.sin(wedge) + margin * Math.cos(wedge),
    );
    g.closePath();
    g.clip();
    g.scale(R * c.zoom, R * c.zoom);
    g.rotate(-s.sourceAngle);
    g.translate(-s.pan.x, -s.pan.y);
    for (let tx = -1; tx <= 1; tx++)
      for (let ty = -1; ty <= 1; ty++) {
        g.save();
        g.translate(tx * 2, ty * 2);
        g.scale(tx % 2 ? -1 : 1, ty % 2 ? -1 : 1);
        g.drawImage(source, -1, -1, 2, 2);
        g.restore();
      }
    g.restore();
  }
  if (c.border !== "none") {
    const v = g.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
    v.addColorStop(0, "#07121900");
    v.addColorStop(1, "#07121988");
    g.fillStyle = v;
    g.fillRect(-R, -R, R * 2, R * 2);
    g.strokeStyle = "#e2d4a640";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, R - 1, 0, TAU);
    g.stroke();
  }
  g.restore();
}
