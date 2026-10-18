import { DISCS, SLAMMERS } from "./catalog.js";
const TAU = Math.PI * 2;
const circle = (g, x, y, r, fill, stroke) => {
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke();
  }
};
function path(g, d, fill, stroke) {
  const p = new Path2D(d);
  if (fill) {
    g.fillStyle = fill;
    g.fill(p);
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke(p);
  }
}
function star(g, x, y, r, color) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      rr = i % 2 ? r * 0.25 : r;
    i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
  }
  g.closePath();
  g.fill();
  g.restore();
}
function arcText(g, str, r, start = -Math.PI * 0.86, end = -Math.PI * 0.14) {
  g.save();
  g.font = "bold 9px Georgia";
  g.textAlign = "center";
  g.textBaseline = "middle";
  [...str.toUpperCase()].forEach((ch, i) => {
    const a = start + ((end - start) * i) / Math.max(1, str.length - 1);
    g.save();
    g.translate(Math.cos(a) * r, Math.sin(a) * r);
    g.rotate(a + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
  });
  g.restore();
}
function engraving(g, d) {
  g.lineWidth = 1.1;
  g.lineJoin = "round";
  g.lineCap = "round";
  const { ink, accent } = d;
  if (d.kind === "moth") {
    path(
      g,
      "M 0 -22 Q -26 -59 -49 -25 Q -51 -5 -12 10 Q -39 15 -30 39 Q -10 48 0 15 Q 12 49 32 35 Q 42 13 11 9 Q 52 0 47 -25 Q 27 -60 0 -22",
      ink,
      accent,
    );
    g.strokeStyle = d.color;
    g.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      path(
        g,
        "M 2 -13 Q 20 -39 34 -22 Q 26 -5 7 3 M 4 10 Q 21 14 23 27 M 0 -20 L 0 24 M 0 -20 Q -8 -38 -17 -34",
        null,
        d.color,
      );
      circle(g, 29, -20, 5, accent);
      circle(g, 17, 24, 3, accent);
      g.restore();
    }
    path(g, "M -2 -24 L 2 -24 L 4 22 L 0 33 L -4 22 Z", accent);
  } else if (d.kind === "fish") {
    circle(g, -19, -20, 24, accent);
    path(
      g,
      "M -48 10 Q -12 -33 34 -9 L 53 -26 L 49 12 L 57 29 L 29 15 Q -10 48 -48 10 Z",
      ink,
      d.color,
    );
    circle(g, -28, 6, 4, d.color);
    path(
      g,
      "M -11 -10 Q 3 3 -9 25 M 0 -13 L 15 -31 L 22 -10 M 3 27 L 20 40 L 22 21",
      null,
      d.color,
    );
    for (let i = 0; i < 4; i++)
      path(g, `M ${i * 9 - 3} -4 q 8 5 0 12 q 8 5 0 12`, null, accent);
  } else if (d.kind === "planet") {
    circle(g, 0, -2, 33, ink, accent);
    g.save();
    g.rotate(-0.35);
    g.strokeStyle = accent;
    g.lineWidth = 5;
    g.beginPath();
    g.ellipse(0, 0, 61, 15, 0, 0, TAU);
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = ink;
    g.beginPath();
    g.ellipse(0, 0, 64, 18, 0, 0, TAU);
    g.stroke();
    g.restore();
    path(
      g,
      "M -24 -22 Q -7 -31 15 -28 M -29 -11 Q -13 -17 6 -15 M -13 21 Q 8 27 24 18",
      null,
      d.color,
    );
    star(g, 45, -43, 8, ink);
    star(g, -42, 37, 6, ink);
  } else if (d.kind === "flower") {
    for (let i = 0; i < 8; i++) {
      g.save();
      g.rotate((i * TAU) / 8);
      path(g, "M 0 0 Q -25 -22 0 -49 Q 25 -22 0 0", ink, accent);
      path(g, "M 0 -8 L 0 -37", null, d.color);
      g.restore();
    }
    circle(g, 0, 0, 13, accent, d.color);
    for (let i = 0; i < 12; i++)
      circle(g, Math.cos(i) * 8, Math.sin(i) * 8, 1.5, d.color);
  } else if (d.kind === "comet") {
    for (let i = 0; i < 6; i++)
      path(
        g,
        `M ${-45 + i * 7} ${-44 - i * 2} L ${-4 + i * 5} ${9 + i * 5}`,
        null,
        ink,
      );
    circle(g, 19, 23, 24, ink, accent);
    star(g, 19, 23, 15, accent);
    star(g, -35, 19, 6, ink);
    star(g, 38, -35, 5, ink);
  } else if (d.kind === "rings") {
    for (let r = 8; r <= 50; r += 7)
      circle(g, Math.sin(r) * 2, 0, r, null, ink);
    star(g, 0, 0, 7, ink);
  } else if (d.kind === "cloud") {
    path(
      g,
      "M -38 17 C -66 5 -44 -24 -26 -16 C -31 -44 4 -52 14 -28 C 37 -47 57 -14 38 -2 C 61 7 49 27 30 22 L -38 22 Z",
      ink,
      accent,
    );
    path(g, "M -15 7 Q 0 -9 17 7 Q 0 23 -15 7 Z", null, accent);
    circle(g, 1, 6, 5, accent);
    for (let i = -2; i <= 2; i++) path(g, `M ${i * 15} 33 l -4 10`, null, ink);
    star(g, -42, -38, 5, ink);
  } else if (d.kind === "sun") {
    for (let i = 0; i < 18; i++) {
      const a = (i * TAU) / 18;
      g.save();
      g.rotate(a);
      path(g, "M -2 -34 L 0 -54 L 3 -34 Z", ink);
      g.restore();
    }
    circle(g, 0, 0, 30, ink, accent);
    g.strokeStyle = accent;
    path(
      g,
      "M -18 -7 Q -11 -13 -5 -6 M 7 -7 Q 14 -13 20 -6 M 1 -4 L -3 8 L 5 8 M -11 17 Q 1 25 13 16",
      null,
      accent,
    );
    circle(g, -11, -4, 1.8, accent);
    circle(g, 13, -4, 1.8, accent);
  } else if (d.kind === "ship") {
    path(g, "M -39 20 L 42 20 L 29 36 L -22 36 Z", ink);
    path(g, "M 2 -50 L 2 19 M -36 14 L 38 14", null, ink);
    path(g, "M -3 -42 Q -29 -19 -33 10 L -4 10 Z", accent, ink);
    path(g, "M 7 -37 L 34 11 L 7 11 Z", ink);
    for (let y = 41; y < 55; y += 7)
      path(g, `M -49 ${y} q 10 -8 20 0 t 20 0 t 20 0 t 20 0 t 20 0`, null, ink);
    star(g, -38, -41, 6, ink);
    circle(g, 34, -39, 9, accent);
  } else if (d.kind === "lizard") {
    path(
      g,
      "M -41 40 Q -4 52 9 14 Q 26 8 24 -16 Q 39 -37 23 -45 Q 2 -50 -3 -26 Q -28 -18 -8 2 Q -10 25 -41 40 Z",
      ink,
      accent,
    );
    path(
      g,
      "M 10 -14 L 40 -10 L 46 -22 M 1 -7 L -32 -14 L -43 -5 M 5 9 L 32 29 L 46 24 M -2 10 L -22 30 L -36 23",
      null,
      ink,
    );
    g.lineWidth = 3;
    g.stroke();
    circle(g, 17, -34, 3, d.color);
    for (let i = 0; i < 6; i++)
      circle(g, 6 + Math.sin(i) * 4, -24 + i * 8, 2, accent);
  } else if (d.kind === "shell") {
    path(
      g,
      "M -41 34 Q -64 2 -28 -26 Q -2 -62 29 -31 Q 62 -5 35 31 L 15 45 L -12 47 Z",
      ink,
      accent,
    );
    g.strokeStyle = d.color;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 1.05 + (i * Math.PI * 0.95) / 8;
      path(
        g,
        `M 0 43 Q ${Math.cos(a) * 8} 0 ${Math.cos(a) * 45} ${Math.sin(a) * 40}`,
        null,
        d.color,
      );
    }
    circle(g, 0, 43, 6, accent);
  } else if (d.kind === "tiger") {
    path(
      g,
      "M -37 -17 L -47 -42 L -22 -35 Q 0 -44 25 -34 L 48 -43 L 38 -15 Q 48 22 19 38 L 0 47 L -19 38 Q -48 22 -37 -17 Z",
      accent,
      ink,
    );
    for (const s of [-1, 1]) {
      g.save();
      g.scale(s, 1);
      path(
        g,
        "M 4 -34 L 11 -10 L 19 -36 M 35 -20 L 15 -4 L 40 -8 M 39 6 L 21 12 L 34 19 M 19 30 L 26 34 L 4 36 Z",
        ink,
      );
      path(g, "M 11 3 Q 18 -4 24 3 M 17 20 L 48 17 M 18 25 L 49 29", null, ink);
      circle(g, 17, 3, 2, ink);
      g.restore();
    }
    path(g, "M -7 16 L 7 16 L 0 23 Z", ink);
    path(g, "M 0 22 L 0 29 M -8 29 Q 0 34 8 29", null, ink);
  } else if (d.kind === "beetle") {
    for (const s of [-1, 1]) {
      g.save();
      g.scale(s, 1);
      path(
        g,
        "M 10 -19 L 32 -26 L 39 -40 M 14 -4 L 43 -3 M 12 17 L 35 29 L 37 42 M 6 -31 Q 23 -48 14 -53",
        null,
        ink,
      );
      g.restore();
    }
    g.beginPath();
    g.ellipse(0, 5, 23, 36, 0, 0, TAU);
    g.fillStyle = ink;
    g.fill();
    g.strokeStyle = accent;
    g.stroke();
    path(g, "M 0 -28 L 0 40", null, d.color);
    circle(g, 0, -27, 13, accent);
    circle(g, 0, 29, 7, accent);
    for (const x of [-11, 11])
      for (let y = -6; y < 20; y += 12) circle(g, x, y, 3, accent);
  } else {
    circle(g, 25, -32, 12, accent);
    for (const [x, y] of [
      [-40, -33],
      [0, -47],
      [42, 9],
      [-34, 14],
    ])
      star(g, x, y, 4, ink);
    path(g, "M -36 33 L 36 33 L 36 48 L -36 48 Z", ink);
    path(g, "M -25 30 L -25 5 Q 0 -30 25 5 L 25 30 Z", null, ink);
    path(
      g,
      "M -21 3 Q 0 -13 21 3 M 0 -17 L 0 29 M -15 -4 L -15 29 M 15 -4 L 15 29",
      null,
      ink,
    );
    g.save();
    g.translate(0, -4);
    g.rotate(-0.5);
    path(g, "M -23 -7 L 30 -7 L 30 7 L -23 7 Z", accent, ink);
    g.restore();
  }
}
export function drawDisc(g, disc, front = true, style = "mixed", size = 320) {
  g.save();
  g.clearRect(0, 0, size, size);
  g.translate(size / 2, size / 2);
  g.scale(size / 210, size / 210);
  g.lineWidth = 1;
  const finish = style === "mixed" ? disc.finish : style;
  circle(g, 0, 0, 100, front ? disc.color : "#e3d5b8", "#594d3f");
  g.save();
  g.beginPath();
  g.arc(0, 0, 98, 0, TAU);
  g.clip();
  if (front) {
    if (finish !== "paper") {
      const shine = g.createLinearGradient(-100, -80, 100, 100);
      if (finish === "holo") {
        for (const [t, c] of [
          [0, "#cfb98266"],
          [0.18, "#5fb9ad88"],
          [0.33, "#ddb4bc66"],
          [0.48, "#c5dbe077"],
          [0.65, "#b0acdb88"],
          [0.85, "#e0bb7777"],
          [1, "#7cc5c666"],
        ])
          shine.addColorStop(t, c);
      } else {
        shine.addColorStop(0, "#fff3b033");
        shine.addColorStop(0.4, "#ffffff66");
        shine.addColorStop(0.55, "#13131b22");
        shine.addColorStop(1, "#fff1ce44");
      }
      g.fillStyle = shine;
      g.fillRect(-100, -100, 200, 200);
    }
    g.globalAlpha = 0.17;
    g.strokeStyle = disc.ink;
    g.lineWidth = 0.5;
    for (let i = 0; i < 45; i++) {
      const y = -90 + i * 4.2;
      path(g, `M -100 ${y} L 100 ${y + 20}`, null, disc.ink);
    }
    g.globalAlpha = 1;
    circle(g, 0, 0, 91, null, disc.ink);
    circle(g, 0, 0, 87, null, disc.ink);
    circle(g, 0, 0, 66, null, disc.ink);
    g.fillStyle = disc.ink;
    arcText(g, disc.name, 76);
    g.save();
    g.translate(0, 3);
    g.scale(0.96, 0.96);
    engraving(g, disc);
    g.restore();
    g.fillStyle = disc.ink;
    g.textAlign = "center";
    g.font = "bold 8px monospace";
    g.fillText("ODD COMPANY", 0, 77);
    g.font = "6px monospace";
    g.fillText(`No. ${disc.number || "00"} / FIRST EDITION`, 0, 85);
    for (const x of [-79, 79]) star(g, x, 0, 4, disc.ink);
    const count = { common: 1, uncommon: 2, rare: 3 }[disc.rarity] || 1;
    for (let i = 0; i < count; i++)
      circle(g, (i - (count - 1) / 2) * 7, 60, 1.5, disc.ink);
  } else {
    g.strokeStyle = "#756958";
    circle(g, 0, 0, 90, null, g.strokeStyle);
    circle(g, 0, 0, 85, null, g.strokeStyle);
    circle(g, 0, 0, 64, null, g.strokeStyle);
    for (let i = 0; i < 36; i++) {
      g.save();
      g.rotate((i * TAU) / 36);
      path(g, "M 0 -84 L 4 -68", null, "#9b8d70");
      g.restore();
    }
    g.fillStyle = "#384d4e";
    g.textAlign = "center";
    g.font = "bold 26px Georgia";
    g.fillText("ODD", 0, -7);
    g.font = "bold 16px Georgia";
    g.fillText("COMPANY", 0, 14);
    g.font = "8px monospace";
    g.fillText("THE TABLETOP DISC CLUB", 0, 31);
    g.font = "9px monospace";
    g.fillText("KEEP THE ODD ONES", 0, -39);
    g.fillText(disc.number || "CUSTOM", 0, 55);
    star(g, 0, -60, 6, "#9f6b4d");
  }
  let seed = (Number(disc.number) || 7) * 379;
  for (let i = 0; i < 1700; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (seed % 2000) / 10 - 100;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = (seed % 2000) / 10 - 100;
    g.fillStyle = i % 2 ? "#fff3c917" : "#11192115";
    g.fillRect(x, y, 0.5, 0.6);
  }
  g.restore();
  g.restore();
}
export function drawSlammer(g, key, size = 320) {
  const s = SLAMMERS[key];
  g.save();
  g.clearRect(0, 0, size, size);
  g.translate(size / 2, size / 2);
  g.scale(size / 210, size / 210);
  g.lineWidth = 1.5;
  const grad = g.createLinearGradient(-90, -80, 90, 100);
  grad.addColorStop(0, s.color);
  grad.addColorStop(0.43, key === "wood" ? "#c28c60" : "#f0e5ca");
  grad.addColorStop(0.52, s.color);
  grad.addColorStop(1, key === "steel" ? "#67777d" : s.color);
  circle(g, 0, 0, 100, grad, "#43504a");
  g.beginPath();
  g.arc(0, 0, 100, 0, TAU);
  g.clip();
  circle(g, 0, 0, 90, null, s.ink);
  circle(g, 0, 0, 85, null, s.ink);
  if (key === "wood") {
    for (let y = -80; y < 90; y += 9)
      path(g, `M -95 ${y} Q -20 ${y - 18} 95 ${y + 3}`, null, "#754d382b");
  } else
    for (let i = 0; i < 70; i++)
      path(g, `M -100 ${i * 3 - 100} L 100 ${i * 3 - 98}`, null, "#ffffff20");
  g.fillStyle = s.ink;
  arcText(g, s.name, 76);
  engraving(g, {
    kind:
      key === "brass"
        ? "sun"
        : key === "steel"
          ? "comet"
          : key === "wood"
            ? "rings"
            : "planet",
    ink: s.ink,
    accent: s.color,
    color: "#e9d7b5",
  });
  g.textAlign = "center";
  g.font = "bold 9px monospace";
  g.fillStyle = s.ink;
  g.fillText(`${s.mass.toFixed(2)} × / SLAMMER`, 0, 77);
  g.restore();
}
/** Assets are generated once; no per-disc DOM during play. */
export function createArtwork(
  catalog = DISCS,
  style = "mixed",
  paint = drawDisc,
) {
  const fronts = new Map(),
    backs = new Map(),
    slammers = new Map(),
    create = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 320;
      return c;
    };
  for (const d of catalog) {
    const f = create(),
      b = create();
    paint(f.getContext("2d"), d, true, style, 320);
    paint(b.getContext("2d"), d, false, style, 320);
    fronts.set(d.id, f);
    backs.set(d.id, b);
  }
  for (const key of Object.keys(SLAMMERS)) {
    const c = create();
    drawSlammer(c.getContext("2d"), key);
    slammers.set(key, c);
  }
  return {
    fronts,
    backs,
    slammers,
    dispose() {
      for (const c of [
        ...fronts.values(),
        ...backs.values(),
        ...slammers.values(),
      ])
        c.width = c.height = 1;
      fronts.clear();
      backs.clear();
      slammers.clear();
    },
  };
}
