import { random, WIDTH, HEIGHT } from "./model.js";
import { patternPaths } from "./challenges.js";
export const FACES = {
  milo: {
    name: "Milo",
    subtitle: "A very serious daydreamer",
    color: "#bb6548",
  },
  cleo: {
    name: "Cleo",
    subtitle: "Botanist. Excellent company.",
    color: "#688c7c",
  },
  cosmo: {
    name: "Cosmo",
    subtitle: "A cat of unknown occupation",
    color: "#7d8799",
  },
};
function path(ctx, d, fill, stroke = "#4d483b", width = 2) {
  const p = new Path2D(d);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(p);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke(p);
  }
}
function oval(ctx, x, y, rx, ry, fill, stroke = "#4d483b", width = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
export function drawPortrait(ctx, config) {
  const { face, style } = config,
    ink = style === "blueprint" ? "#344c63" : "#504b3e",
    skin =
      face === "cosmo" ? "#dcc9a2" : face === "cleo" ? "#d8a17c" : "#efd1a4",
    shirt = FACES[face].color;
  ctx.fillStyle =
    style === "sunshine"
      ? "#f3dfa1"
      : style === "blueprint"
        ? "#e3e7db"
        : "#f2e8d0";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // A dry printed paper, without an expensive per-frame texture pass.
  for (let i = 0; i < 1900; i++) {
    const x = random(i, 31) * WIDTH,
      y = random(i, 32) * HEIGHT;
    ctx.fillStyle = i % 3 ? "#75664510" : "#fff8";
    ctx.fillRect(x, y, random(i, 33) * 1.5 + 0.4, 0.7);
  }
  ctx.strokeStyle = "#857b5b44";
  ctx.lineWidth = 1;
  ctx.strokeRect(25.5, 25.5, 849, 709);
  ctx.fillStyle = ink;
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillText("PORTRAIT / 0" + (Object.keys(FACES).indexOf(face) + 1), 53, 64);
  ctx.textAlign = "right";
  ctx.fillText("A LITTLE CHANGE OF CHARACTER", 847, 64);
  // Sparse registration marks and tiny printed combs.
  ctx.strokeStyle = ink + "55";
  for (const [x, y] of [
    [42, 98],
    [858, 98],
    [42, 603],
    [858, 603],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(450 + side * 286, 365);
    ctx.rotate(side * 0.25);
    ctx.strokeStyle = ink + "44";
    ctx.strokeRect(-20, -76, 40, 130);
    for (let j = 0; j < 16; j++) {
      ctx.beginPath();
      ctx.moveTo(-20, -69 + j * 7);
      ctx.lineTo(6, -69 + j * 7);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Shoulders, neck, and an original outfit for each little portrait.
  path(
    ctx,
    "M243 591 Q259 532 365 514 L407 489 L494 489 L538 515 Q636 533 655 591 Z",
    shirt,
    ink,
    2.5,
  );
  path(ctx, "M413 451 L409 513 Q449 541 491 513 L487 451 Z", skin, ink, 2.5);
  if (face === "cleo") {
    path(
      ctx,
      "M408 506 L450 541 L491 506 L527 525 L478 565 L450 543 L423 565 L374 525 Z",
      "#e8ddbe",
      ink,
      2,
    );
    for (let i = 0; i < 9; i++) {
      const x = 291 + i * 38,
        y = 560 + (i % 2) * 16;
      oval(ctx, x, y, 5, 5, "#d7c695", null);
      for (let j = 0; j < 5; j++) {
        const a = (j * Math.PI * 2) / 5;
        oval(
          ctx,
          x + Math.cos(a) * 8,
          y + Math.sin(a) * 8,
          4,
          4,
          "#d8c6a266",
          null,
        );
      }
    }
  } else if (face === "cosmo") {
    path(
      ctx,
      "M405 504 L449 536 L497 504 L519 520 L449 563 L379 520 Z",
      "#e7d4ad",
      ink,
      2,
    );
    path(ctx, "M442 548 L458 548 L466 591 L432 591 Z", "#bf6d50", ink, 2);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = "#e3d4b877";
      ctx.beginPath();
      ctx.moveTo(264, 547 + i * 10);
      ctx.lineTo(360, 547 + i * 10);
      ctx.moveTo(541, 547 + i * 10);
      ctx.lineTo(635, 547 + i * 10);
      ctx.stroke();
    }
  } else {
    path(
      ctx,
      "M408 507 L448 537 L491 507 L518 522 L484 553 L449 538 L414 553 L380 522 Z",
      "#f6ead0",
      ink,
      2,
    );
    path(
      ctx,
      "M448 542 L407 529 L407 563 L449 551 L493 564 L493 528 L452 542 Z",
      "#364e4a",
      ink,
      2,
    );
    oval(ctx, 450, 546, 9, 10, "#bdaf81", ink, 1.5);
    for (let i = 0; i < 18; i++) {
      const x = 273 + random(i, 45) * 350,
        y = 557 + random(i, 46) * 33;
      oval(ctx, x, y, 1.8, 1.8, "#f2d6aa", null);
    }
  }
  const off = face === "cosmo" ? -10 : face === "cleo" ? 5 : 0;
  ctx.save();
  ctx.translate(0, off);
  if (face === "cosmo") {
    path(
      ctx,
      "M315 254 L295 140 Q337 153 383 199 Q450 174 517 199 Q563 153 605 140 L585 254 Q603 350 570 420 Q532 477 450 480 Q367 478 330 420 Q298 350 315 254 Z",
      skin,
      ink,
      2.8,
    );
    path(ctx, "M322 231 L311 169 L363 210 Z", "#c28d78", null);
    path(ctx, "M579 231 L589 169 L537 210 Z", "#c28d78", null);
  } else {
    oval(ctx, 315, 326, 24, 39, skin, ink, 2.5);
    oval(ctx, 585, 326, 24, 39, skin, ink, 2.5);
    path(
      ctx,
      face === "cleo"
        ? "M323 276 C319 193 370 159 450 161 C538 159 580 204 577 278 L569 388 Q553 465 450 486 Q348 465 331 388 Z"
        : "M327 270 Q322 153 450 149 Q578 153 573 270 L568 380 Q552 474 450 482 Q347 473 332 380 Z",
      skin,
      ink,
      2.8,
    );
    ctx.strokeStyle = "#9a775a77";
    ctx.lineWidth = 1.5;
    for (const x of [312, 588]) {
      ctx.beginPath();
      ctx.ellipse(x, 326, 10, 21, 0, -1.7, 1.7);
      ctx.stroke();
    }
  }
  // The brows and hair are deliberately absent: they belong to the visitor.
  for (const side of [-1, 1]) {
    const x = 450 + side * 70;
    oval(ctx, x, 301, 34, 20, "#f8edcf", ink, 2);
    oval(
      ctx,
      x - side * 4,
      301,
      8,
      13,
      face === "cosmo" ? "#6c8461" : "#596b60",
      ink,
      1,
    );
    oval(ctx, x - side * 4, 301, 3, 9, ink, null);
    oval(ctx, x - side * 4 - 2, 296, 1.5, 2, "#faf4dc", null);
    path(ctx, `M${x - 37} 299 Q${x} 269 ${x + 37} 299`, null, ink, 2.5);
    if (face === "cleo") {
      path(
        ctx,
        `M${x + side * 33} 290 L${x + side * 41} 281 M${x + side * 27} 285 L${x + side * 32} 277`,
        null,
        ink,
        1.5,
      );
      oval(ctx, 450 + side * 123, 386, 10, 17, "#b9995f", ink, 1.5);
    }
    for (let i = 0; i < 21; i++) {
      const xx = 450 + side * (92 + random(i, 5) * 22),
        yy = 354 + random(i, 6) * 29;
      oval(ctx, xx, yy, 1.2, 1.2, "#b16d513d", null);
    }
  }
  if (face === "cosmo") {
    path(ctx, "M433 351 Q450 342 467 351 L450 366 Z", "#9c6c5d", ink, 1.8);
    path(
      ctx,
      "M450 366 L450 389 M450 389 Q431 410 414 392 M450 389 Q469 410 486 392",
      null,
      ink,
      2,
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        path(
          ctx,
          `M${450 + side * 67} ${368 + i * 11} L${450 + side * 146} ${353 + i * 23}`,
          null,
          ink + "99",
          1.2,
        );
  } else {
    path(
      ctx,
      face === "cleo"
        ? "M449 311 Q433 345 432 354 Q448 365 466 354"
        : "M450 311 L431 351 Q437 364 465 355",
      null,
      ink,
      2.2,
    );
    path(
      ctx,
      "M408 410 Q450 431 492 410 Q452 448 408 410 Z",
      "#b46f59",
      ink,
      1.6,
    );
    path(ctx, "M414 411 Q450 421 486 411", null, "#f8e8cf", 3);
    path(ctx, "M433 452 Q450 457 467 451", null, "#aa856477", 1.2);
  }
  // Slightly offset lithographic contour and cheek hatching keep it printed, not glossy.
  ctx.strokeStyle = style === "blueprint" ? "#587ea944" : "#b16d5133";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(453, 314, 124, 157, 0.015, Math.PI * 0.63, Math.PI * 1.36);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.font = "italic 19px Georgia";
  ctx.fillText(FACES[face].name + " / " + FACES[face].subtitle, 450, 619);
  path(
    ctx,
    "M57 637 Q450 628 843 637 L843 716 Q450 725 57 716 Z",
    "#d7cfb2",
    "#a69a7966",
    1.5,
  );
  ctx.fillStyle = "#70684f";
  ctx.font = "10px monospace";
  ctx.fillText("THE FILING TRAY  /  PICK UP A PINCH FROM HERE", 450, 743);
}
export function drawGuide(ctx, config) {
  if (!config.guides || config.mode === "free") return;
  const paths = patternPaths(config.template, config.face);
  ctx.save();
  ctx.strokeStyle = "#9b573b66";
  ctx.lineWidth = 20;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([1, 12]);
  for (const p of paths) {
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
}
export function drawFilings(ctx, field) {
  const colors = ["#252b28", "#3b3930", "#575246"];
  for (let group = 0; group < 3; group++) {
    ctx.beginPath();
    for (let i = group; i < field.count; i += 3) {
      const x = field.x[i],
        y = field.y[i],
        length = 2 + random(i, 51) * 4.5,
        a = field.angle[i],
        dx = (Math.cos(a) * length) / 2,
        dy = (Math.sin(a) * length) / 2;
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.strokeStyle = colors[group];
    ctx.lineWidth = group === 0 ? 1.45 : 1.1;
    ctx.lineCap = "square";
    ctx.stroke();
  }
  ctx.strokeStyle = "#ede3ba77";
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  for (let i = 0; i < field.count; i += 11) {
    const x = field.x[i],
      y = field.y[i];
    ctx.moveTo(x, y - 0.5);
    ctx.lineTo(
      x + Math.cos(field.angle[i]) * 2,
      y + Math.sin(field.angle[i]) * 2 - 0.5,
    );
  }
  ctx.stroke();
}
export function drawMagnet(ctx, field, visible = true) {
  if (!visible) return;
  const { x, y, down, heading } = field.magnet;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = down ? "#b3554277" : "#5b756155";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, field.config.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.rotate(heading + Math.PI / 2);
  ctx.shadowColor = "#342e3655";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  path(
    ctx,
    "M-13 -22 L-13 -3 Q-13 13 0 13 Q13 13 13 -3 L13 -22 L5 -22 L5 -3 Q5 4 0 4 Q-5 4 -5 -3 L-5 -22 Z",
    down ? "#b95740" : "#8c6b52",
    "#564d3c",
    1.2,
  );
  ctx.shadowBlur = 0;
  path(ctx, "M-13 -22 H-5 V-13 H-13 Z", "#e2d9b7", "#736d57", 0.8);
  path(ctx, "M5 -22 H13 V-13 H5 Z", "#b4c6b7", "#736d57", 0.8);
  ctx.restore();
}
