import { SLAMMERS } from "./catalog.js";
import { clamp, ease } from "./model.js";
export const VIEW = {
  width: 1000,
  height: 680,
  cx: 500,
  cy: 290,
  tilt: 0.68,
  lift: 0.85,
  launch: { x: 0, y: 310 },
};
export const project = (p) => ({
  x: VIEW.cx + p.x,
  y: VIEW.cy + p.y * VIEW.tilt - (p.z || 0) * VIEW.lift,
});
export const unproject = (p) => ({
  x: p.x - VIEW.cx,
  y: (p.y - VIEW.cy) / VIEW.tilt,
});
const path = (g, d) => {
  const p = new Path2D(d);
  g.stroke(p);
};
const text = (g, s, x, y, size = 12, color = "#e6d5b3", font = "monospace") => {
  g.fillStyle = color;
  g.font = `${size}px ${font}`;
  g.fillText(s, x, y);
};
function ellipse(g, x, y, rx, ry, fill, stroke) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke();
  }
}
export function tableBackground(g, config) {
  g.clearRect(0, 0, 1000, 680);
  const wood = g.createLinearGradient(0, 0, 1000, 680);
  wood.addColorStop(0, "#664a37");
  wood.addColorStop(0.5, "#a17b56");
  wood.addColorStop(1, "#5e4536");
  g.fillStyle = wood;
  g.fillRect(0, 0, 1000, 680);
  g.lineWidth = 1;
  g.strokeStyle = "#211c1722";
  for (let i = 0; i < 100; i++) {
    const y = i * 7;
    path(g, `M 0 ${y} Q 240 ${y + 25} 530 ${y - 4} T 1000 ${y + 4}`);
  }
  const color = { felt: "#344f4a", wood: "#b48759", linen: "#d6c5a2" }[
      config.surface
    ],
    edge = { felt: "#203b36", wood: "#795439", linen: "#96866c" }[
      config.surface
    ];
  g.shadowColor = "#161b175c";
  g.shadowBlur = 15;
  g.shadowOffsetY = 8;
  g.beginPath();
  g.roundRect(27, 23, 946, 630, 88);
  g.fillStyle = edge;
  g.fill();
  g.shadowColor = "transparent";
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
  g.beginPath();
  g.roundRect(37, 31, 926, 608, 80);
  g.fillStyle = color;
  g.fill();
  g.save();
  g.clip();
  let s = 739;
  for (let i = 0; i < 9500; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const x = 40 + (s % 920);
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const y = 30 + (s % 610);
    g.fillStyle = i % 2 ? "#fff4cf09" : "#051f1213";
    g.fillRect(
      x,
      y,
      config.surface === "wood" ? 28 : 1.3,
      config.surface === "linen" ? 0.6 : 1.3,
    );
  }
  if (config.surface === "linen") {
    g.strokeStyle = "#715a3510";
    for (let x = 40; x < 960; x += 4) path(g, `M ${x} 30 L ${x} 640`);
    for (let y = 30; y < 640; y += 4) path(g, `M 40 ${y} L 960 ${y}`);
  }
  g.restore();
  g.setLineDash([3, 6]);
  g.strokeStyle = config.surface === "felt" ? "#d2c19855" : "#423f3655";
  g.lineWidth = 1;
  g.beginPath();
  g.roundRect(53, 46, 894, 579, 68);
  g.stroke();
  g.setLineDash([]);
  const ink = config.surface === "felt" ? "#d6ceb4" : "#584c3d";
  g.globalAlpha = 0.35;
  for (const radius of [36, 72, 112])
    ellipse(g, VIEW.cx, VIEW.cy, radius, radius * VIEW.tilt, null, ink);
  g.strokeStyle = ink;
  path(
    g,
    "M 370 290 L 410 290 M 590 290 L 630 290 M 500 197 L 500 220 M 500 360 L 500 382",
  );
  g.globalAlpha = 1;
  text(g, "ODD COMPANY", 77, 91, 13, ink);
  text(g, "THE TABLETOP DISC CLUB", 77, 111, 9, ink);
  g.textAlign = "right";
  text(g, "SERIES 01", 918, 91, 12, ink);
  text(g, "KEEP THE ODD ONES", 918, 111, 9, ink);
  g.textAlign = "left";
  text(g, "FACE UP = YOURS", 78, 590, 10, ink);
  text(g, "LEAVE NOTHING BUT THE TABLE.", 626, 590, 10, ink);
  g.strokeStyle = ink;
  g.globalAlpha = 0.35;
  path(g, "M 78 565 L 250 565 M 750 565 L 922 565");
  g.globalAlpha = 1;
}
function basis(axis, angle, yaw) {
  const ax = Math.cos(axis),
    ay = Math.sin(axis),
    ca = Math.cos(angle),
    sa = Math.sin(angle);
  const rotate = (x, y) => {
    const dot = ax * x + ay * y;
    return {
      x: x * ca + ax * dot * (1 - ca),
      y: y * ca + ay * dot * (1 - ca),
      z: (ax * y - ay * x) * sa,
    };
  };
  const u = rotate(Math.cos(yaw), Math.sin(yaw)),
    v = rotate(-Math.sin(yaw), Math.cos(yaw));
  return {
    a: u.x,
    b: u.y * VIEW.tilt - u.z * VIEW.lift,
    c: v.x,
    d: v.y * VIEW.tilt - v.z * VIEW.lift,
  };
}
function drawPhysical(
  g,
  pose,
  front,
  back,
  radius = 41,
  thickness = 2.2,
  metal = false,
) {
  const p = project(pose),
    m = basis(pose.axis || 0, pose.angle || 0, pose.yaw || 0),
    det = m.a * m.d - m.b * m.c;
  g.save();
  g.globalAlpha = pose.alpha ?? 1;
  // Paper or metal sidewall, displaced along the table normal.
  for (let j = thickness; j >= 1; j -= 1.5) {
    g.save();
    g.translate(p.x, p.y + j * 0.85);
    g.transform(m.a, m.b, m.c, m.d, 0, 0);
    ellipse(
      g,
      0,
      0,
      radius,
      radius,
      metal ? (j > thickness / 2 ? "#5a625d" : "#c2b69a") : "#b4a68e",
    );
    g.restore();
  }
  g.save();
  g.translate(p.x, p.y);
  g.transform(m.a, m.b, m.c, m.d, 0, 0);
  const img = det < 0 ? front : back;
  if (det < 0) g.scale(-1, 1);
  if (img) g.drawImage(img, -radius, -radius, radius * 2, radius * 2);
  g.restore();
  if (Math.abs(det) < 0.09) {
    g.strokeStyle = metal ? "#d7cda9" : "#d6c6a5";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(p.x - m.a * radius, p.y - m.b * radius);
    g.lineTo(p.x + m.a * radius, p.y + m.b * radius);
    g.stroke();
  }
  g.restore();
}
function shadow(g, p, r = 41) {
  const q = project({ ...p, z: 0 });
  g.save();
  g.globalAlpha = (p.alpha ?? 1) * (0.21 / (1 + (p.z || 0) / 130));
  ellipse(
    g,
    q.x + (p.z || 0) * 0.12,
    q.y + 4,
    r * (1 + (p.z || 0) / 300),
    r * 0.5 * (1 + (p.z || 0) / 300),
    "#101e18",
  );
  g.restore();
}
export function drawTable(g, bg, game, art, input = {}) {
  g.drawImage(bg, 0, 0);
  const ink = game.config.surface === "felt" ? "#e8ddc1" : "#4c463b";
  for (const side of ["you", "cpu"]) {
    const ids = game[side];
    for (let i = 0; i < Math.min(7, ids.length); i++) {
      g.save();
      const x = side === "you" ? 95 + i * 17 : 870 - i * 17;
      g.translate(x, 520 - i * 2);
      g.rotate(((i % 3) - 1) * 0.09);
      g.shadowColor = "#15271d44";
      g.shadowBlur = 4;
      g.shadowOffsetY = 3;
      g.drawImage(art.fronts.get(ids[i]), -24, -24, 48, 48);
      g.restore();
    }
    if (ids.length)
      text(
        g,
        side === "you" ? "YOUR SIDE" : "MICA / CPU",
        side === "you" ? 78 : 805,
        554,
        9,
        ink,
      );
  }
  const poses = game.poses();
  for (const p of poses) shadow(g, p);
  if (game.phase === "flight" && game.clock > 0.3 && game.clock < 0.58) {
    const t = (game.clock - 0.3) / 0.28,
      q = project({ x: game.plan.x, y: game.plan.y });
    g.save();
    g.globalAlpha = (1 - t) * 0.55;
    g.lineWidth = 1.5;
    ellipse(g, q.x, q.y, 30 + t * 75, (30 + t * 75) * VIEW.tilt, null, ink);
    g.restore();
  }
  let sp = { ...VIEW.launch, z: 12, angle: 0.1, axis: 0, yaw: 0, alpha: 1 };
  if (game.plan) {
    const t = game.phase === "flight" ? clamp(game.clock / 0.32, 0, 1) : 1,
      p = game.plan;
    sp = {
      x: VIEW.launch.x + (p.x - VIEW.launch.x) * t,
      y: VIEW.launch.y + (p.y - VIEW.launch.y) * t,
      z:
        12 * (1 - t) +
        Math.sin(Math.PI * t) * 155 +
        (game.stack.length * 2.2 + 6) * t,
      angle: p.tilt * Math.sin(t * Math.PI),
      axis: Math.atan2(p.y - VIEW.launch.y, p.x),
      yaw: t * 0.7,
      alpha: 1,
    };
    if (t === 1) {
      const landing =
        game.phase === "flight" ? clamp((game.clock - 0.32) / 0.28, 0, 1) : 1;
      sp.x += 42 * ease(landing);
      sp.y += 48 * ease(landing);
      sp.z =
        (game.stack.length * 2.2 + 6) * (1 - landing) +
        8 * landing +
        Math.sin(landing * Math.PI) * 28;
      sp.angle = p.tilt * Math.sin(landing * Math.PI) * 0.4;
    }
  }
  const sr = SLAMMERS[game.plan?.slammer || game.config.slammer].radius;
  shadow(g, sp, sr);
  const texture = art.slammers.get(game.plan?.slammer || game.config.slammer);
  const drawables = [
    ...poses.map((p) => ({ p, slammer: false })),
    { p: sp, slammer: true },
  ];
  drawables.sort(
    (a, b) => a.p.y * 0.85 + a.p.z * 0.68 - (b.p.y * 0.85 + b.p.z * 0.68),
  );
  for (const item of drawables) {
    if (item.slammer) drawPhysical(g, item.p, texture, texture, sr, 7, true);
    else
      drawPhysical(
        g,
        item.p,
        art.fronts.get(item.p.id),
        art.backs.get(item.p.id),
      );
  }
  if (game.phase === "ready" && game.actor === "you") {
    const aim = input.aim || { x: 10, y: 0 },
      target = project(aim),
      start = project({ ...VIEW.launch, z: 12 });
    g.save();
    g.lineWidth = 1;
    g.strokeStyle = "#e3aa73";
    g.setLineDash([5, 7]);
    g.beginPath();
    g.moveTo(start.x, start.y - 46);
    g.lineTo(target.x, target.y);
    g.stroke();
    g.setLineDash([]);
    ellipse(g, target.x, target.y, 7, 7 * VIEW.tilt, null, "#f4cf9d");
    g.beginPath();
    g.moveTo(target.x - 12, target.y);
    g.lineTo(target.x + 12, target.y);
    g.moveTo(target.x, target.y - 9);
    g.lineTo(target.x, target.y + 9);
    g.stroke();
    const power = input.dragging ? input.power : game.config.power;
    g.strokeStyle = "#ceb98b66";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(start.x, start.y, 48, Math.PI * 0.1, Math.PI * 0.9);
    g.stroke();
    g.strokeStyle = "#e4b376";
    g.beginPath();
    g.arc(start.x, start.y, 48, Math.PI * 0.1, Math.PI * (0.1 + 0.8 * power));
    g.stroke();
    g.restore();
    g.textAlign = "center";
    text(
      g,
      input.dragging ? "RELEASE TO STRIKE" : "FLICK TOWARD THE STACK",
      500,
      580,
      10,
      ink,
    );
    g.textAlign = "left";
  }
  if (game.phase === "thinking") {
    g.textAlign = "center";
    text(g, "MICA IS LINING UP A SHOT…", 500, 575, 11, ink);
    g.textAlign = "left";
  }
  if (game.phase === "complete") {
    g.textAlign = "center";
    text(g, "A CLEAN TABLE.", 500, 262, 36, ink, "Georgia");
    text(
      g,
      game.config.mode === "cpu"
        ? game.you.length === game.cpu.length
          ? "A FRIENDLY DRAW."
          : game.you.length > game.cpu.length
            ? "YOUR ROUND."
            : "MICA TAKES THIS ROUND."
        : "A GOOD LITTLE HAUL.",
      500,
      294,
      12,
      ink,
    );
    g.textAlign = "left";
  }
}
