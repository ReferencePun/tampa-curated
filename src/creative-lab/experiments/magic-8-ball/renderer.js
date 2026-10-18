import { hash } from "./answers.js";
const TAU = Math.PI * 2;
function color(hex, m = 1, a = 1) {
  const rgb = [1, 3, 5].map((i) =>
    Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * m)),
  );
  return `rgba(${rgb},${a})`;
}
function circle(g, x, y, r, fill) {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
function ellipse(g, x, y, rx, ry, fill, angle = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, angle, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
export function plaquePath(g, w = 340, h = 220) {
  g.beginPath();
  g.moveTo(-w * 0.38, -h * 0.5);
  g.lineTo(w * 0.38, -h * 0.5);
  g.lineTo(w * 0.5, -h * 0.15);
  g.lineTo(w * 0.43, h * 0.38);
  g.lineTo(0, h * 0.52);
  g.lineTo(-w * 0.43, h * 0.38);
  g.lineTo(-w * 0.5, -h * 0.15);
  g.closePath();
}
function wrap(g, text, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (g.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
export function makePlaque(text, subtitle = "THE QUESTION VESSEL") {
  const cv = document.createElement("canvas");
  cv.width = 760;
  cv.height = 520;
  const g = cv.getContext("2d");
  g.scale(2, 2);
  g.translate(190, 130);
  plaquePath(g);
  const gr = g.createLinearGradient(-100, -120, 80, 120);
  gr.addColorStop(0, "#e0e9df");
  gr.addColorStop(0.42, "#b8ccc8");
  gr.addColorStop(1, "#87aaa9");
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = "#e9ddad";
  g.lineWidth = 2;
  g.stroke();
  g.save();
  g.scale(0.93, 0.89);
  plaquePath(g);
  g.strokeStyle = "#506e70";
  g.lineWidth = 0.7;
  g.stroke();
  g.restore();
  let size = 37,
    lines;
  do {
    g.font = `${size}px Georgia,serif`;
    lines = wrap(g, text, 270);
    if (lines.length * (size * 1.13) < 134) break;
    size--;
  } while (size > 25);
  g.fillStyle = "#1c4249";
  g.textAlign = "center";
  g.textBaseline = "middle";
  lines.forEach((l, i) =>
    g.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.13 - 6),
  );
  g.font = "9px monospace";
  g.fillStyle = "#456a6b";
  g.fillText(subtitle.toUpperCase().slice(0, 35), 0, 80);
  g.strokeStyle = "#577a78";
  g.lineWidth = 0.8;
  for (const x of [-135, 135]) {
    g.beginPath();
    g.moveTo(x, -20);
    g.lineTo(x, 20);
    g.moveTo(x - 4, 0);
    g.lineTo(x + 4, 0);
    g.stroke();
  }
  return cv;
}
/** Layered drawn optics: glass shell, internal motion, floating plaque and surface reflections. */
export function renderOrb(canvas, c, world, plaque) {
  const g = canvas.getContext("2d"),
    W = canvas.width,
    H = canvas.height;
  g.setTransform(W / 1000, 0, 0, H / 760, 0, 0);
  g.clearRect(0, 0, 1000, 760);
  const bg = g.createRadialGradient(500, 320, 40, 500, 360, 620);
  bg.addColorStop(0, "#26333d");
  bg.addColorStop(1, "#0c151f");
  g.fillStyle = bg;
  g.fillRect(0, 0, 1000, 760);
  const viewScale = world.viewScale || 1;
  g.save();
  g.translate(500, 350);
  g.scale(viewScale, viewScale);
  g.translate(-500, -350);
  // Fine engraved meridians give the vessel a quiet optical-bench setting.
  g.strokeStyle = "#a7b4ab14";
  g.lineWidth = 1;
  for (const radius of [298, 315, 326]) {
    g.beginPath();
    g.ellipse(500, 355, radius, radius * 0.94, 0, 0, TAU);
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const a = (i * TAU) / 60,
      r = i % 5 ? 315 : 307;
    g.beginPath();
    g.moveTo(500 + Math.cos(a) * r, 355 + Math.sin(a) * r * 0.94);
    g.lineTo(500 + Math.cos(a) * 324, 355 + Math.sin(a) * 304);
    g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const x = 100 + hash(i + 23) * 800,
      y = 90 + hash(i + 267) * 530;
    if (Math.hypot(x - 500, y - 350) < 300) continue;
    g.fillStyle = "#c9bd9460";
    g.fillRect(x, y, 1.6, 1.6);
  }
  const shadow = g.createRadialGradient(500, 644, 8, 500, 644, 235);
  shadow.addColorStop(0, "#000a");
  shadow.addColorStop(1, "#0000");
  ellipse(g, 500, 644, 255, 43, shadow);
  // A small bronze rest, original to this vessel, anchors the spherical body.
  const base = g.createLinearGradient(0, 600, 0, 650);
  base.addColorStop(0, "#b4a17a");
  base.addColorStop(0.4, "#71634d");
  base.addColorStop(1, "#292b2b");
  ellipse(g, 500, 622, 137, 23, base);
  ellipse(g, 500, 615, 124, 14, "#242e32");
  const pose = world.pose,
    drag = world.drag || { x: 0, y: 0 },
    cx = 500 + pose.x + drag.x,
    cy = 350 + pose.y + drag.y,
    R = 249;
  g.save();
  g.translate(cx, cy);
  g.rotate(pose.roll + drag.x * 0.0008);
  const a = (c.lightAngle * Math.PI) / 180,
    light = {
      x: Math.cos(a) * 115 + (world.light?.x || 0) * 24,
      y: Math.sin(a) * 115 + (world.light?.y || 0) * 24,
    },
    shell = g.createRadialGradient(light.x, light.y, 10, 10, 25, R * 1.15);
  shell.addColorStop(0, color(c.color, 1.65));
  shell.addColorStop(0.3, color(c.color, 1.1));
  shell.addColorStop(0.68, color(c.color, 0.5));
  shell.addColorStop(0.87, color(c.color, 0.22));
  shell.addColorStop(1, "#101b26");
  circle(g, 0, 0, R, shell);
  g.save();
  g.beginPath();
  g.arc(0, 0, R - 17, 0, TAU);
  g.clip();
  const interior = g.createRadialGradient(
    light.x * 0.7,
    light.y * 0.8,
    8,
    0,
    40,
    R * 1.2,
  );
  interior.addColorStop(0, color(c.color, 1.3, 0.95));
  interior.addColorStop(0.35, color(c.color, 0.8, 0.95));
  interior.addColorStop(0.7, color(c.color, 0.31, 0.9));
  interior.addColorStop(1, "#071a22");
  circle(g, 0, 0, R - 17, interior);
  // Suspended currents wind continuously, then gain energy from the shake.
  const time = world.clock,
    energy = pose.energy + (world.charge || 0) * 0.7;
  for (let i = 0; i < 16; i++) {
    g.save();
    g.rotate(
      time * 0.018 +
        Math.sin(time * 0.15 + i) * 0.07 +
        energy * Math.sin(i * 2 + time * 2) * 0.14,
    );
    const y = -175 + i * 24 + Math.sin(time * 0.34 + i) * 7;
    g.beginPath();
    g.moveTo(-260, y);
    g.bezierCurveTo(
      -130,
      y - 30 - energy * 22,
      90,
      y + 25 + energy * 20,
      270,
      y - 13,
    );
    g.strokeStyle = color(c.color, 1.4, 0.015 + c.opacity * 0.025);
    g.lineWidth = 12 + (i % 3) * 10;
    g.stroke();
    g.beginPath();
    g.moveTo(-240, y - 6);
    g.bezierCurveTo(-100, y - 40, 110, y + 20, 250, y);
    g.strokeStyle = "#b7cebf12";
    g.lineWidth = 0.8;
    g.stroke();
    g.restore();
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.sin(time * 0.17 + i * 1.7) * 125,
      y = Math.cos(time * 0.13 + i * 2) * 130;
    const mist = g.createRadialGradient(x, y, 5, x, y, 110);
    mist.addColorStop(0, color(c.color, 1.7, 0.08 + c.opacity * 0.05));
    mist.addColorStop(1, color(c.color, 0.7, 0));
    ellipse(g, x, y, 110, 70, mist, Math.sin(time * 0.1 + i));
  }
  // The answer plate rises from depth, rotating away from edge-on into focus.
  const visibility = world.hasAnswer ? pose.visibility : 1,
    depth = world.hasAnswer ? pose.rise : 1;
  g.save();
  g.translate(
    Math.sin(time * 0.4) * 1.1,
    15 + (world.hasAnswer ? pose.faceY : 0),
  );
  g.rotate(world.hasAnswer ? pose.faceAngle : 0);
  g.scale(
    world.hasAnswer ? pose.faceScale : 1,
    (world.hasAnswer ? pose.faceScale : 1) *
      Math.cos(world.hasAnswer ? pose.tilt : 0),
  );
  g.globalAlpha = world.hasAnswer ? 0.16 + visibility * 0.84 : 0.75;
  g.shadowColor = "#b2dfd12b";
  g.shadowBlur = 12 * visibility;
  g.drawImage(plaque, -190, -130, 380, 260);
  g.restore();
  // Depth fog covers the submerged plate; the final surface remains readable.
  const fog = g.createRadialGradient(0, 50, 40, 0, 0, 245);
  fog.addColorStop(
    0,
    color(c.color, 0.28, (1 - depth) * 0.94 + c.opacity * 0.08),
  );
  fog.addColorStop(1, color(c.color, 0.25, 0.25));
  circle(g, 0, 0, 245, fog);
  for (let i = 0; i < 80; i++) {
    const r = 20 + hash(i + 961) * 205,
      theta =
        hash(i + 555) * TAU +
        time * (0.025 + hash(i + 4) * 0.035) +
        energy * Math.sin(time * 0.7 + i) * 0.23,
      x = Math.cos(theta) * r,
      y = Math.sin(theta) * r * 0.86;
    circle(
      g,
      x,
      y,
      (0.65 + hash(i + 834) * 1.7) * (1 + energy * 0.2),
      `rgba(208,224,208,${(0.06 + hash(i + 77) * 0.2) * (c.opacity + 0.25)})`,
    );
  }
  // Soft highlight patches and a thin meniscus belong to the glass, not the plaque.
  const shine = g.createRadialGradient(
    light.x,
    light.y,
    3,
    light.x,
    light.y,
    97,
  );
  shine.addColorStop(0, `rgba(239,249,236,${0.2 * c.lighting})`);
  shine.addColorStop(0.45, `rgba(224,240,235,${0.06 * c.lighting})`);
  shine.addColorStop(1, "#f0ffed00");
  circle(g, light.x, light.y, 100, shine);
  g.save();
  g.rotate(a + Math.PI * 0.5);
  g.strokeStyle = `rgba(236,242,223,${0.38 * c.lighting})`;
  g.lineWidth = 3.5;
  g.lineCap = "round";
  g.beginPath();
  g.arc(0, 0, R - 19, -2.1, -1.25);
  g.stroke();
  g.strokeStyle = `rgba(230,239,216,${0.1 * c.lighting})`;
  g.lineWidth = 12;
  g.beginPath();
  g.arc(0, 0, R - 23, -2, -1.38);
  g.stroke();
  g.restore();
  g.restore();
  g.save();
  g.rotate(a + Math.PI * 0.5);
  const sheen = g.createRadialGradient(-75, -153, 4, -60, -126, 101);
  sheen.addColorStop(0, `rgba(236,250,241,${0.32 * c.lighting})`);
  sheen.addColorStop(0.42, `rgba(218,241,231,${0.09 * c.lighting})`);
  sheen.addColorStop(1, "#d8f1e700");
  ellipse(g, -65, -139, 104, 51, sheen, -0.34);
  g.strokeStyle = `rgba(220,241,229,${0.22 * c.lighting})`;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, 0, R - 9, -2.38, -1.3);
  g.stroke();
  g.restore();
  g.strokeStyle = color(c.color, 2, 0.65);
  g.lineWidth = 1.1;
  g.beginPath();
  g.arc(0, 0, R - 2, 0, TAU);
  g.stroke();
  g.strokeStyle = "#d5be8650";
  g.lineWidth = 1;
  g.beginPath();
  g.ellipse(0, 13, R - 4, 239, 0, 0.04, Math.PI * 0.98);
  g.stroke();
  g.fillStyle = "#d8cead99";
  g.font = "11px monospace";
  g.textAlign = "center";
  g.fillText("M U R M U R", 0, -188);
  g.fillStyle = "#adb9ac77";
  g.font = "8px monospace";
  g.fillText("A VESSEL FOR UNCERTAIN THINGS", 0, 190);
  g.restore();
  g.restore();
  if (viewScale > 1) return;
  g.fillStyle = "#bfb99e";
  g.font = "11px monospace";
  g.textAlign = "center";
  g.fillText(world.phaseLabel || "ASK. SHAKE. LET IT SETTLE.", 500, 704);
  g.fillStyle = "#81968f";
  g.font = "10px monospace";
  g.fillText("NOTHING IS CERTAIN. THAT IS PART OF THE CHARM.", 500, 728);
}
