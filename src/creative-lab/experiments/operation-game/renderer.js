export const THEMES = {
  sage: {
    shell: "#74928b",
    dark: "#3c5c56",
    paper: "#f0e8d4",
    suit: "#b5c5bb",
  },
  coral: {
    shell: "#b27361",
    dark: "#744e46",
    paper: "#f5e7d7",
    suit: "#d7bc9e",
  },
  blue: {
    shell: "#708b9e",
    dark: "#344e68",
    paper: "#ece8d9",
    suit: "#aebec9",
  },
};
const line = (g, pts) => {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
};
const round = (g, x, y, w, h, r, fill, stroke) => {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke();
  }
};
function text(g, t, x, y, size = 12, color = "#3c514c", font = "sans-serif") {
  g.fillStyle = color;
  g.font = `${size}px ${font}`;
  g.fillText(t, x, y);
}
function circle(g, x, y, r, fill, stroke) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke();
  }
}
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
export function pieceGlyph(g, item, x, y, r = 10, raised = false) {
  g.save();
  g.translate(x, y);
  g.scale(r / 10, r / 10);
  g.lineWidth = 1.4;
  g.lineCap = "round";
  g.lineJoin = "round";
  if (raised) {
    g.shadowColor = "#17282066";
    g.shadowBlur = 3;
    g.shadowOffsetY = 3;
  }
  const color = item.color || "#bc9154";
  if (item.kind === "butterfly") {
    path(
      g,
      "M 0 0 C -13 -14 -14 2 -3 3 C -12 13 -1 12 0 3 C 10 14 14 3 3 2 C 15 -10 3 -13 0 0",
      color,
      "#6b4a3b",
    );
    path(g, "M 0 -6 L 0 7 M 0 -6 L -3 -10 M 0 -6 L 4 -9", null, "#513c36");
  } else if (item.kind === "biscuit") {
    circle(g, 0, 0, 9, color, "#775c31");
    for (const [a, b] of [
      [-4, -4],
      [3, -5],
      [5, 2],
      [-2, 4],
      [-1, -1],
    ])
      circle(g, a, b, 1.1, "#684d37");
  } else if (item.kind === "cloud") {
    path(
      g,
      "M -7 4 C -16 0 -6 -9 -3 -4 C 0 -16 14 -6 8 -1 C 16 0 12 7 6 5 Z",
      color,
      "#42606b",
    );
    path(g, "M 0 5 L -3 10 L 3 9 L 0 14", null, "#be8c3e");
  } else if (item.kind === "marbles") {
    for (const [x, y, c] of [
      [-4, -3, color],
      [5, -1, "#b68c4a"],
      [0, 6, "#63809d"],
    ]) {
      circle(g, x, y, 4.5, c, "#38594f");
      path(
        g,
        `M ${x - 2} ${y - 2} Q ${x + 3} ${y - 1} ${x} ${y + 3}`,
        null,
        "#f2e9cb",
      );
    }
  } else if (item.kind === "screw") {
    g.rotate(-0.45);
    round(g, -3, -6, 6, 16, 1, color, "#624e46");
    round(g, -8, -9, 16, 5, 2, "#c9b5a0", "#624e46");
    for (let y = -3; y < 9; y += 3)
      path(g, `M -4 ${y} L 4 ${y - 2}`, null, "#735b4c");
    path(g, "M -4 -7 L 4 -7", null, "#624e46");
  } else {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 180; i++) {
      const t = (i / 179) * Math.PI * 6,
        x = Math.cos(t) * 8,
        y = Math.sin(t * 1.4) * 7;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.lineWidth = 0.6;
    g.strokeStyle = "#f1d699";
    g.stroke();
  }
  g.shadowColor = "transparent";
  g.restore();
}
export function drawBoard(g, scene, config) {
  const t = THEMES[config.boardStyle];
  g.clearRect(0, 0, scene.width, scene.height);
  g.fillStyle = t.shell;
  g.fillRect(0, 0, 900, 720);
  const grad = g.createLinearGradient(0, 0, 0, 720);
  grad.addColorStop(0, "#ffffff32");
  grad.addColorStop(0.6, "#ffffff00");
  grad.addColorStop(1, "#14271e38");
  g.fillStyle = grad;
  g.fillRect(0, 0, 900, 720);
  g.lineWidth = 1;
  round(g, 10, 10, 880, 700, 30, null, "#f0f1d85c");
  g.shadowColor = "#24393244";
  g.shadowBlur = 10;
  g.shadowOffsetY = 4;
  round(g, 28, 26, 644, 668, 25, t.paper, "#385248");
  g.shadowColor = "transparent";
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
  // Original printed patient: a contemplative collector in a nightshirt and slippers.
  const body =
    "M 355 212 Q 320 220 305 253 L 235 365 Q 209 410 227 460 L 245 509 Q 260 528 279 504 L 269 430 L 303 365 L 295 479 Q 300 506 333 507 L 337 626 Q 352 647 386 634 L 416 507 L 455 508 L 480 638 Q 512 651 537 631 L 552 482 L 550 371 L 583 435 L 578 485 Q 600 510 618 485 L 625 422 Q 614 372 585 320 L 553 247 Q 540 224 505 216 Z";
  g.shadowColor = "#685f4830";
  g.shadowBlur = 8;
  g.shadowOffsetY = 4;
  path(g, body, t.suit, "#6c7c6a");
  g.shadowColor = "transparent";
  g.shadowBlur = 0;
  g.shadowOffsetY = 0;
  g.save();
  g.clip(new Path2D(body));
  g.strokeStyle = "#f9f1dd77";
  g.lineWidth = 1;
  for (let x = 220; x < 650; x += 12)
    path(g, `M ${x} 210 L ${x - 40} 650`, null, g.strokeStyle);
  g.restore();
  path(
    g,
    "M 340 622 Q 364 611 390 626 L 397 658 Q 368 679 322 664 Q 311 652 340 641 Z",
    "#c28166",
    "#6f6753",
  );
  path(
    g,
    "M 481 627 Q 507 616 539 627 L 550 647 Q 586 652 564 668 L 485 666 Z",
    "#c28166",
    "#6f6753",
  );
  path(
    g,
    "M 380 213 L 399 254 L 430 229 L 456 253 L 488 215",
    t.paper,
    "#768372",
  );
  path(
    g,
    "M 396 195 L 398 224 Q 427 248 458 224 L 459 193",
    "#d5af8b",
    "#7a7260",
  );
  g.save();
  g.translate(429, 148);
  g.rotate(-0.08);
  circle(g, -66, 7, 16, "#d9b58d", "#7f7a64");
  circle(g, 66, 7, 16, "#d9b58d", "#7f7a64");
  g.beginPath();
  g.ellipse(0, 0, 65, 78, 0, 0, Math.PI * 2);
  g.fillStyle = "#e3c6a3";
  g.fill();
  g.strokeStyle = "#82755e";
  g.stroke();
  path(
    g,
    "M -60 -27 C -83 -71 -19 -100 11 -80 C 36 -96 69 -58 60 -26 L 47 -50 Q 24 -32 7 -61 Q -20 -32 -45 -46 Z",
    "#535847",
    "#394a40",
  );
  path(g, "M -38 -8 Q -28 -15 -17 -9 M 18 -9 Q 30 -17 42 -10", null, "#5d6250");
  circle(g, -27, 4, 2, "#435345");
  circle(g, 28, 4, 2, "#435345");
  path(g, "M 0 1 L -5 19 Q 3 24 10 18 M -19 39 Q 2 44 22 35", null, "#8c7860");
  g.strokeStyle = "#686b56";
  g.lineWidth = 1.6;
  circle(g, -27, 5, 18, null, g.strokeStyle);
  circle(g, 28, 5, 18, null, g.strokeStyle);
  path(
    g,
    "M -9 2 Q 0 -3 10 2 M -44 0 L -60 -7 M 46 0 L 62 -7",
    null,
    g.strokeStyle,
  );
  g.restore();
  text(g, "MILO", 60, 71, 29, t.dark, "Georgia");
  text(g, "Collector of", 61, 94, 13, t.dark);
  text(g, "small worries.", 61, 113, 13, t.dark);
  path(g, "M 60 132 L 171 132", null, "#8d9981");
  text(g, "CASE 029", 62, 162, 11, t.dark, "monospace");
  text(g, "Very well,", 62, 197, 18, "#8c7561", "Georgia");
  text(g, "considering.", 62, 219, 18, "#8c7561", "Georgia");
  text(g, "REMOVE WITH CARE", 62, 604, 10, t.dark, "monospace");
  path(
    g,
    "M 90 555 Q 73 494 101 480 Q 128 495 110 555 M 98 552 L 101 505 L 104 552",
    null,
    "#87928a",
  );
  text(g, "A little room", 62, 638, 14, t.dark, "Georgia");
  text(g, "to feel lighter.", 62, 658, 14, t.dark, "Georgia");
  // Light paper fibers, deterministic and very quiet.
  let seed = 471;
  for (let i = 0; i < 1400; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = 36 + (seed % 628);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = 34 + (seed % 650);
    g.fillStyle = i % 2 ? "#574f2910" : "#ffffff25";
    g.fillRect(x, y, 1, 0.6);
  }
  for (const [i, c] of scene.cavities.entries()) {
    line(g, c.polygon);
    g.closePath();
    g.lineJoin = "round";
    g.lineWidth = 7;
    g.strokeStyle = "#e7e1cc";
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = "#788277";
    g.stroke();
    const shade = g.createLinearGradient(
      c.start.x,
      c.start.y - 30,
      c.start.x,
      c.start.y + 36,
    );
    shade.addColorStop(0, "#253c39");
    shade.addColorStop(1, "#566963");
    g.fillStyle = shade;
    g.fill();
    g.save();
    g.clip();
    g.translate(0, 3);
    line(g, c.polygon);
    g.closePath();
    g.lineWidth = 3;
    g.strokeStyle = "#142a275c";
    g.stroke();
    g.restore();
    text(
      g,
      String(i + 1).padStart(2, "0"),
      c.start.x - 35,
      c.start.y - 32,
      10,
      t.dark,
      "monospace",
    );
  }
  text(g, "SMALL MATTERS", 698, 58, 14, "#fff4d8", "Georgia");
  text(g, "RECOVERY TRAY", 699, 79, 10, "#e9e4c9", "monospace");
  for (let i = 0; i < 6; i++) {
    const y = 103 + i * 82;
    round(g, 698, y, 172, 69, 12, "#263d3730", "#d4deca55");
    circle(g, 725, y + 29, 17, "#304a421c", "#d3d9c655");
    text(
      g,
      String(i + 1).padStart(2, "0"),
      753,
      y + 31,
      11,
      "#eee6d0",
      "monospace",
    );
  }
  round(g, 698, 614, 172, 52, 12, "#28473e33", "#d4deca55");
  circle(g, 721, 640, 8, "#374b3d", "#c1c4a1");
  text(g, "STEADY HAND", 740, 644, 10, "#f2ebd4", "monospace");
  for (const [x, y] of [
    [17, 23],
    [882, 23],
    [17, 694],
    [882, 694],
  ]) {
    circle(g, x, y, 5, "#bbc4af", "#475e53");
    path(g, `M ${x - 2} ${y - 2} L ${x + 2} ${y + 2}`, null, "#65776a");
  }
}
export function viewFor(scene, focus) {
  const c = scene.cavities.find((c) => c.id === focus);
  if (!c) return { scale: 1, x: 0, y: 0 };
  const xs = c.polygon.map((p) => p.x),
    ys = c.polygon.map((p) => p.y),
    cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const scale = Math.min(
    3.8,
    scene.width / (Math.max(...xs) - Math.min(...xs) + 100),
    scene.height / (Math.max(...ys) - Math.min(...ys) + 110),
  );
  return {
    scale,
    x: scene.width / 2 - cx * scale,
    y: scene.height / 2 - cy * scale,
  };
}
export function drawGame(
  g,
  bg,
  model,
  view,
  tool,
  reduced = false,
  paintPiece = pieceGlyph,
) {
  const { scene, config } = model;
  g.save();
  g.fillStyle = THEMES[config.boardStyle].paper;
  g.fillRect(0, 0, scene.width, scene.height);
  g.translate(view.x, view.y);
  g.scale(view.scale, view.scale);
  g.drawImage(bg, 0, 0, scene.width, scene.height);
  for (let i = 0; i < scene.cavities.length; i++) {
    const c = scene.cavities[i],
      p = model.pieces[i],
      active = model.active === i;
    if (p.removed) {
      circle(g, c.exit.x, c.exit.y, 7, "#88af9244", "#bbd0ac");
      path(g, `M ${c.exit.x - 4} ${c.exit.y} l 3 3 l 5 -6`, null, "#d7e9c2");
    } else {
      if (c.path) {
        g.save();
        g.setLineDash([1, 5]);
        g.lineCap = "round";
        g.lineWidth = 1;
        g.strokeStyle = active ? "#efdfad" : "#adb9a077";
        line(g, c.path);
        g.stroke();
        g.restore();
      }
      circle(
        g,
        c.exit.x,
        c.exit.y,
        c.exitRadius,
        null,
        active ? "#f2d792" : "#b3c2a0",
      );
      circle(g, c.exit.x, c.exit.y, 2, "#d2d4ad");
      paintPiece(g, c, p.x, p.y, c.radius * config.objectSize, active);
      if (active) {
        circle(g, p.x, p.y, model.radius(c), null, "#fceab0");
        if (Math.hypot(p.x - c.exit.x, p.y - c.exit.y) <= c.exitRadius)
          circle(g, c.exit.x, c.exit.y, c.exitRadius + 3, null, "#c4e4b8");
      }
    }
    if (p.removed) {
      paintPiece(g, c, 725, 132 + i * 82, 12, true);
      text(g, "RECOVERED", 753, 136 + i * 82, 9, "#f2edce", "monospace");
    }
  }
  if (model.flash) {
    circle(g, 721, 640, 9, "#d65b43", "#f5c994");
    if (model.contact) {
      circle(
        g,
        model.contact.x,
        model.contact.y,
        model.radius(
          scene.cavities.find((c) => c.id === model.log[0]?.id) ||
            scene.cavities[0],
        ) + 4,
        null,
        "#e67855",
      );
    }
  }
  if (model.celebration && !reduced) {
    const c = scene.cavities.find((c) => c.id === model.log[0]?.id);
    if (c) {
      g.strokeStyle = "#d7b76e";
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4,
          r = 17 + (1 - model.celebration / 0.7) * 14;
        path(
          g,
          `M ${c.exit.x + Math.cos(a) * r} ${c.exit.y + Math.sin(a) * r} l ${Math.cos(a) * 4} ${Math.sin(a) * 4}`,
          null,
          g.strokeStyle,
        );
      }
    }
  }
  if (tool.visible) {
    const p = model.active === null ? tool : model.pieces[model.active];
    g.save();
    g.translate(p.x, p.y);
    g.rotate(-0.3);
    g.lineWidth = 1;
    path(
      g,
      "M -2 0 L -9 -40 Q -8 -52 0 -53 Q 8 -52 9 -40 L 2 0 L 5 -38 L -5 -38 Z",
      "#bfcac1",
      "#42574f",
    );
    path(g, "M -6 -38 L -3 -3 M 6 -38 L 3 -3", null, "#fbf7df");
    g.restore();
    if (model.active === null) circle(g, p.x, p.y, 3, null, "#f4d396");
  }
  g.restore();
}
