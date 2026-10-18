import { hash, PAPERS } from "./model.js";
import { drawPaperGrain } from "./paint.js";
export const VIEW = { width: 900, height: 760, cx: 450, cy: 345, radius: 280 };
const circle = (g, x, y, r, fill, stroke, width = 1) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.stroke();
  }
};
export function machineBackdrop(g) {
  const { cx, cy } = VIEW;
  g.clearRect(0, 0, 900, 760);
  g.save();
  let grad = g.createLinearGradient(60, 20, 850, 740);
  grad.addColorStop(0, "#eee6cf");
  grad.addColorStop(0.55, "#e0d8bd");
  grad.addColorStop(1, "#c3c4a8");
  g.shadowColor = "#2b454640";
  g.shadowBlur = 18;
  g.shadowOffsetY = 12;
  g.fillStyle = grad;
  g.beginPath();
  g.roundRect(48, 22, 804, 708, 48);
  g.fill();
  g.shadowColor = "transparent";
  g.strokeStyle = "#b3b49b";
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.roundRect(54, 27, 792, 694, 44);
  g.strokeStyle = "#fcf5dc";
  g.stroke();
  circle(g, cx, cy, 315, "#203e3d", "#b3bca4", 4);
  circle(g, cx, cy, 304, "#2c4c48", "#1d3936", 3);
  circle(g, cx, cy, 292, "#506456", "#759080", 1);
  for (let i = 0; i < 240; i++) {
    const a = hash(i + 8) * 6.283,
      r = 289 + hash(i + 33) * 19,
      x = cx + Math.cos(a) * r,
      y = cy + Math.sin(a) * r;
    circle(
      g,
      x,
      y,
      0.4 + hash(i + 2) * 2,
      ["#e5a777", "#d3b85c", "#698f9f", "#9bb0a3"][i % 4],
    );
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2,
      r = i % 6 === 0 ? 327 : 322;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 316, cy + Math.sin(a) * 316);
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.strokeStyle = "#889b83";
    g.lineWidth = 0.8;
    g.stroke();
  }
  for (const [x, y] of [
    [82, 62],
    [818, 62],
    [82, 690],
    [818, 690],
  ]) {
    circle(g, x, y, 6, "#bcc4ac", "#9ca88c");
    g.strokeStyle = "#7e9181";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - 3, y + 2);
    g.lineTo(x + 3, y - 2);
    g.stroke();
  }
  g.fillStyle = "#42635b";
  g.font = "italic bold 24px Georgia";
  g.fillText("Whirl / 28", 88, 103);
  g.font = "9px monospace";
  g.fillText("COLOUR IN MOTION", 89, 119);
  g.textAlign = "right";
  g.font = "10px monospace";
  g.fillText("THE SMALL STUDIO", 811, 103);
  g.fillText("PAINT / PAPER / MOMENTUM", 811, 119);
  g.textAlign = "left";
  g.font = "11px monospace";
  g.fillStyle = "#6d8170";
  g.fillText("MADE TO MAKE A MESS", 90, 690);
  g.textAlign = "right";
  g.fillText("Ø 01 / HAND-FED COLOUR", 809, 690);
  g.restore();
}
export function drawMachine(
  g,
  paint,
  background,
  model,
  { cursor = null, hover = false } = {},
) {
  const { cx, cy, radius: r } = VIEW;
  g.clearRect(0, 0, 900, 760);
  g.drawImage(background, 0, 0);
  g.save();
  g.translate(cx, cy);
  g.rotate(model.angle);
  g.shadowColor = "#142e3d66";
  g.shadowBlur = 10;
  circle(g, 0, 3, r + 2, "#dadac4");
  g.shadowColor = "transparent";
  circle(g, 0, 0, r, PAPERS[model.config.paper]);
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.clip();
  drawPaperGrain(g, -r, -r, r * 2);
  g.drawImage(paint, -r, -r, r * 2, r * 2);
  g.restore();
  circle(g, 0, 0, r, null, "#fffbea55", 0.8);
  // Tiny plate marks make the physical rotation legible even on unpainted paper.
  g.strokeStyle = model.config.paper === "night" ? "#8d9c9a" : "#b5b4a0";
  g.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate((i * Math.PI) / 2);
    g.beginPath();
    g.moveTo(0, -r + 3);
    g.lineTo(0, -r + 8);
    g.stroke();
    g.restore();
  }
  for (const a of [0, 2.1, 4.2]) {
    g.save();
    g.rotate(a);
    g.fillStyle = "#8e9c89";
    g.beginPath();
    g.roundRect(-7, -r - 12, 14, 16, 4);
    g.fill();
    g.fillStyle = "#d0d4b7";
    g.fillRect(-5, -r - 10, 10, 2);
    g.restore();
  }
  g.restore();
  // New paint leaving the paper becomes a small splatter in the collecting tray.
  for (const s of model.spills) {
    if (model.hidden.has(s.group)) continue;
    const { x, y } = s,
      d = Math.hypot(x, y);
    if (d > 1 && d < 1.12)
      circle(g, cx + x * r, cy + y * r, Math.max(0.7, s.w * r * 0.5), s.color);
  }
  if (cursor && (hover || model.pointer.down || model.autoArmed)) {
    const x = cx + cursor.x * r,
      y = cy + cursor.y * r;
    if (Math.hypot(cursor.x, cursor.y) <= 1.05) {
      g.save();
      g.strokeStyle =
        model.config.paper === "night" ? "#f7eed7aa" : "#334c51aa";
      g.lineWidth = 1;
      g.setLineDash([3, 3]);
      circle(
        g,
        x,
        y,
        Math.max(5, (model.config.thickness * r) / 512 / 2 + 3),
        null,
        g.strokeStyle,
        1,
      );
      g.setLineDash([]);
      // A little tipped paint pipette follows the actual point of deposition.
      g.translate(x + 4, y - 5);
      g.rotate(0.5);
      g.fillStyle = "#ede9d2";
      g.strokeStyle = "#526661";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-3, 0);
      g.lineTo(-5, -26);
      g.lineTo(5, -26);
      g.lineTo(3, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = model.config.ink;
      g.fillRect(-3, -24, 6, 15);
      g.fillStyle = "#3f5b56";
      g.beginPath();
      g.roundRect(-7, -41, 14, 17, 5);
      g.fill();
      g.restore();
    }
  }
}
