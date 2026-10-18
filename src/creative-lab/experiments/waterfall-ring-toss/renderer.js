import { WIDTH, HEIGHT, hash } from "./model.js";
const palettes = {
  harbor: {
    water: "#b6d8d1",
    deep: "#75aaa9",
    ink: "#466f70",
    land: "#d7d4aa",
    accent: "#dd8061",
  },
  reef: {
    water: "#b9d8da",
    deep: "#83b9be",
    ink: "#507d83",
    land: "#ddd1ab",
    accent: "#db8f83",
  },
  moon: {
    water: "#b9c9dd",
    deep: "#788fab",
    ink: "#526780",
    land: "#d1d3d5",
    accent: "#dbc58c",
  },
};
export function chamberPath(g, model) {
  const c = model.scene.chamber;
  g.beginPath();
  g.roundRect(
    c.left,
    c.top,
    c.right - c.left,
    c.bottom - c.top,
    model.config.shape === "porthole"
      ? Math.min(142, (c.bottom - c.top) / 2)
      : 46,
  );
}
function line(g, points, color, width = 1) {
  g.beginPath();
  points.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p)));
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}
function dot(g, x, y, r, color) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}
function building(g, x, y, w, h, p) {
  g.fillStyle = p.land;
  g.strokeStyle = p.ink;
  g.lineWidth = 1.2;
  g.fillRect(x, y - h, w, h);
  g.strokeRect(x, y - h, w, h);
  for (let xx = x + 6; xx < x + w - 4; xx += 9)
    for (let yy = y - h + 8; yy < y - 4; yy += 13) {
      g.strokeStyle = p.ink;
      g.strokeRect(xx, yy, 3, 5);
    }
}
export function drawBackdrop(g, model) {
  const p = palettes[model.config.world],
    c = model.scene.chamber;
  g.clearRect(0, 0, WIDTH, HEIGHT);
  g.save();
  chamberPath(g, model);
  g.clip();
  let grad = g.createLinearGradient(0, c.top, 0, c.bottom);
  grad.addColorStop(0, "#edf4dc");
  grad.addColorStop(0.18, p.water);
  grad.addColorStop(1, p.deep);
  g.fillStyle = grad;
  g.fillRect(0, 0, WIDTH, HEIGHT);
  // A printed landscape behind the chamber, deliberately quieter than the rings.
  g.globalAlpha = 0.58;
  g.strokeStyle = p.ink;
  g.lineWidth = 0.9;
  for (let y = 105; y < 400; y += 47) {
    g.beginPath();
    g.moveTo(25, y);
    g.bezierCurveTo(260, y - 22, 490, y + 26, 785, y - 4);
    g.stroke();
  }
  g.globalAlpha = 0.9;
  if (model.config.world === "harbor") {
    dot(g, 628, 111, 35, "#f0dfb4");
    g.strokeStyle = p.ink;
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(628, 111, 40, 0, 6.28);
    g.stroke();
    building(g, 70, 390, 52, 82, p);
    building(g, 125, 390, 32, 62, p);
    building(g, 644, 395, 42, 93, p);
    building(g, 691, 395, 45, 60, p);
    g.fillStyle = "#e9dec1";
    g.strokeStyle = p.ink;
    g.beginPath();
    g.moveTo(360, 356);
    g.lineTo(371, 247);
    g.lineTo(396, 247);
    g.lineTo(407, 356);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = p.accent;
    g.fillRect(368, 286, 33, 15);
    g.strokeRect(371, 230, 25, 17);
    g.beginPath();
    g.moveTo(365, 230);
    g.lineTo(383, 216);
    g.lineTo(402, 230);
    g.closePath();
    g.fill();
    g.stroke();
    line(
      g,
      [
        [383, 216],
        [383, 206],
      ],
      p.ink,
    );
    line(
      g,
      [
        [333, 370],
        [336, 351],
        [430, 351],
        [433, 370],
      ],
      p.ink,
    );
    g.fillStyle = p.land;
    g.fillRect(327, 370, 112, 8);
    for (let i = 0; i < 3; i++)
      line(
        g,
        [
          [174 + i * 19, 119 - i * 7],
          [181 + i * 19, 115 - i * 7],
          [188 + i * 19, 120 - i * 7],
        ],
        p.ink,
      );
    // One small sailboat on the printed horizon.
    g.fillStyle = "#ece3c6";
    g.beginPath();
    g.moveTo(490, 155);
    g.lineTo(490, 106);
    g.lineTo(521, 155);
    g.closePath();
    g.fill();
    g.stroke();
    line(
      g,
      [
        [478, 162],
        [489, 174],
        [525, 174],
        [537, 162],
        [478, 162],
      ],
      p.ink,
      1.6,
    );
  } else if (model.config.world === "reef") {
    for (let i = 0; i < 10; i++) {
      const x = 60 + i * 76,
        h = 50 + hash(i + 7) * 100;
      g.strokeStyle = i % 2 ? p.accent : p.ink;
      g.lineWidth = 4;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x, 425);
      g.bezierCurveTo(x - 20, 390, x + 20, 390 - h * 0.5, x, 425 - h);
      g.stroke();
      for (let k = 0; k < 3; k++)
        line(
          g,
          [
            [x, 410 - k * 19],
            [x + (k % 2 ? 22 : -22), 392 - k * 19],
          ],
          g.strokeStyle,
          3,
        );
    }
    for (const [x, y] of [
      [180, 150],
      [560, 115],
      [647, 206],
    ]) {
      g.save();
      g.translate(x, y);
      g.fillStyle = "#d5b778";
      g.beginPath();
      g.ellipse(0, 0, 18, 8, 0, 0, 6.28);
      g.fill();
      g.beginPath();
      g.moveTo(-17, 0);
      g.lineTo(-28, -10);
      g.lineTo(-28, 10);
      g.closePath();
      g.fill();
      dot(g, 10, -1, 1.4, p.ink);
      g.restore();
    }
    g.strokeStyle = p.ink;
    g.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.arc(400, 420, 18 + i * 4, Math.PI, Math.PI * 2);
      g.stroke();
    }
  } else {
    for (let i = 0; i < 45; i++) {
      const x = 60 + hash(i + 1) * 680,
        y = 54 + hash(i + 72) * 290;
      line(
        g,
        [
          [x - 2, y],
          [x + 2, y],
        ],
        "#e6eadc",
        1.2,
      );
      line(
        g,
        [
          [x, y - 2],
          [x, y + 2],
        ],
        "#e6eadc",
        1.2,
      );
    }
    dot(g, 600, 117, 42, "#e1dfc6");
    for (let i = 0; i < 7; i++)
      dot(
        g,
        580 + hash(i + 10) * 40,
        94 + hash(i + 40) * 40,
        3 + hash(i + 2) * 6,
        "#c7c9bf",
      );
    g.strokeStyle = p.ink;
    g.fillStyle = "#cbd3d0";
    g.beginPath();
    g.arc(398, 366, 57, Math.PI, 0);
    g.lineTo(455, 381);
    g.lineTo(341, 381);
    g.closePath();
    g.fill();
    g.stroke();
    for (let i = -2; i <= 2; i++)
      line(
        g,
        [
          [398 + i * 14, 313 + Math.abs(i) * 7],
          [398 + i * 20, 366],
        ],
        p.ink,
      );
    line(
      g,
      [
        [398, 310],
        [398, 284],
        [415, 284],
        [415, 294],
        [398, 294],
      ],
      p.ink,
    );
    building(g, 104, 398, 52, 32, p);
    building(g, 653, 398, 43, 48, p);
  }
  g.globalAlpha = 1;
  g.fillStyle = p.land;
  g.beginPath();
  g.moveTo(0, 439);
  g.bezierCurveTo(220, 404, 270, 451, 405, 430);
  g.bezierCurveTo(570, 410, 690, 449, 800, 421);
  g.lineTo(800, 500);
  g.lineTo(0, 500);
  g.closePath();
  g.fill();
  for (let i = 0; i < 170; i++) {
    const x = 32 + hash(i) * 736,
      y = 445 + hash(i + 300) * 38;
    line(
      g,
      [
        [x, y],
        [x + 1 + hash(i + 900) * 3, y - 1],
      ],
      "#829583",
      0.65,
    );
  }
  g.globalAlpha = 0.3;
  for (let i = 0; i < 25; i++) {
    g.strokeStyle = "#fff8e2";
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(
      64 + hash(i + 123) * 670,
      70 + hash(i + 96) * 320,
      1 + hash(i + 18) * 2,
      0,
      6.28,
    );
    g.stroke();
  }
  g.globalAlpha = 1;
  // Physical lower nozzles, molded into the floor.
  for (const pump of model.scene.pumps) {
    g.fillStyle = "#526f6b";
    g.beginPath();
    g.ellipse(pump.x, pump.y + 12, 27, 7, 0, 0, 6.28);
    g.fill();
    g.fillStyle = "#e4dfbe";
    g.fillRect(pump.x - 22, pump.y, 44, 10);
    g.strokeStyle = "#596e65";
    g.strokeRect(pump.x - 22, pump.y, 44, 10);
    for (let i = -3; i <= 3; i++)
      line(
        g,
        [
          [pump.x + i * 5, pump.y],
          [pump.x + i * 5, pump.y + 7],
        ],
        "#647d74",
        2,
      );
  }
  g.restore();
}
function ring(g, r, part = "whole") {
  g.save();
  g.translate(r.x, r.y);
  g.rotate(r.angle);
  const start = part === "front" ? 0 : Math.PI,
    end =
      part === "back" ? Math.PI * 2 : part === "front" ? Math.PI : Math.PI * 3;
  g.lineWidth = 6.2;
  g.strokeStyle = "rgba(32,70,70,.22)";
  g.beginPath();
  g.ellipse(0.5, 2, r.radius, 7.2, 0, start, end);
  g.stroke();
  g.strokeStyle = r.color;
  g.lineWidth = 5.1;
  g.beginPath();
  g.ellipse(0, 0, r.radius, 7.2, 0, start, end);
  g.stroke();
  g.strokeStyle = "rgba(255,255,230,.7)";
  g.lineWidth = 1.1;
  g.beginPath();
  g.ellipse(-0.5, -1.3, r.radius - 0.8, 6.5, 0, start + 0.1, end - 0.28);
  g.stroke();
  g.strokeStyle = "rgba(35,50,50,.23)";
  g.lineWidth = 0.9;
  g.beginPath();
  g.ellipse(0.3, 1.2, r.radius - 1, 6.3, 0, start + 0.12, end - 0.15);
  g.stroke();
  g.restore();
}
export function drawWaterToy(g, model, backdrop, { reduced = false } = {}) {
  g.clearRect(0, 0, WIDTH, HEIGHT);
  g.drawImage(backdrop, 0, 0);
  const c = model.scene.chamber;
  g.save();
  chamberPath(g, model);
  g.clip();
  if (!reduced) {
    g.save();
    g.globalCompositeOperation = "soft-light";
    g.strokeStyle = "#fffbe3";
    g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      for (let x = 20; x < 790; x += 8) {
        const y = 75 + i * 81 + Math.sin(x * 0.014 + model.time * 0.5 + i) * 9;
        x === 20 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  for (const burst of model.bursts) {
    const p = model.scene.pumps[burst.index],
      alpha = Math.max(0, 1 - burst.age / 1.4);
    g.strokeStyle = `rgba(241,255,232,${alpha * 0.38})`;
    g.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(p.x + i * 9, p.y);
      g.bezierCurveTo(
        p.x + i * 17,
        p.y - 60,
        p.x + i * 38,
        p.y - 90 - burst.age * 80,
        p.x + i * 45,
        p.y - 130 - burst.age * 100,
      );
      g.stroke();
    }
  }
  for (const r of model.rings.filter((r) => r.peg !== null)) ring(g, r, "back");
  for (const p of model.pegs) {
    g.fillStyle = "#507d7a";
    g.beginPath();
    g.ellipse(p.x + 2, p.base + 9, 33, 8, 0, 0, 6.28);
    g.fill();
    let grad = g.createLinearGradient(p.x - 18, 0, p.x + 18, 0);
    grad.addColorStop(0, "#d6c59a");
    grad.addColorStop(0.4, "#f4e8c6");
    grad.addColorStop(1, "#baaa83");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(p.x - 24, p.base - 1, 48, 9, 4);
    g.fill();
    grad = g.createLinearGradient(p.x - 4, 0, p.x + 5, 0);
    grad.addColorStop(0, "#b69868");
    grad.addColorStop(0.4, "#fff4cb");
    grad.addColorStop(0.75, "#e3cd98");
    grad.addColorStop(1, "#968e6c");
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(p.x - 4, p.tip, 8, p.base - p.tip, 4);
    g.fill();
    g.strokeStyle = "rgba(74,89,71,.25)";
    g.lineWidth = 0.8;
    g.stroke();
    dot(g, p.x - 1, p.tip + 4, 1.5, "#fff8dd");
  }
  for (const r of model.rings.filter((r) => r.peg !== null))
    ring(g, r, "front");
  for (const r of model.rings
    .filter((r) => r.peg === null)
    .sort((a, b) => a.y - b.y))
    ring(g, r);
  for (const b of model.bubbles) {
    g.strokeStyle = "rgba(248,255,244,.6)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, 6.28);
    g.stroke();
    dot(g, b.x - b.r * 0.3, b.y - b.r * 0.45, 0.8, "#f6ffef");
  }
  // The meniscus, inner gasket, and a restrained reflection on the clear cover.
  g.strokeStyle = "rgba(243,255,234,.8)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(c.left + 20, c.top + 22);
  g.bezierCurveTo(230, c.top + 30, 620, c.top + 14, c.right - 20, c.top + 23);
  g.stroke();
  const gloss = g.createLinearGradient(0, 0, 600, 440);
  gloss.addColorStop(0, "rgba(255,255,245,.25)");
  gloss.addColorStop(0.3, "rgba(255,255,245,0)");
  gloss.addColorStop(0.72, "rgba(255,255,245,0)");
  gloss.addColorStop(0.74, "rgba(255,255,245,.07)");
  gloss.addColorStop(1, "rgba(255,255,245,0)");
  g.fillStyle = gloss;
  g.fillRect(0, 0, 800, 500);
  g.restore();
  chamberPath(g, model);
  g.lineWidth = 9;
  g.strokeStyle = "rgba(37,67,62,.25)";
  g.stroke();
  chamberPath(g, model);
  g.lineWidth = 3;
  g.strokeStyle = "#e1ece0";
  g.stroke();
  g.save();
  g.strokeStyle = "rgba(255,255,242,.7)";
  g.lineWidth = 3;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(c.left + 16, c.top + 85);
  g.quadraticCurveTo(c.left + 14, c.top + 30, c.left + 65, c.top + 15);
  g.stroke();
  g.restore();
}
