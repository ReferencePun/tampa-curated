import { SPECIES } from "./model.js";

const TAU = Math.PI * 2,
  K = 0.552284749831;
const rgba = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};
function smoothPath(points) {
  const path = new Path2D();
  path.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    path.quadraticCurveTo(...a, (a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5);
  }
  path.lineTo(...points.at(-1));
  return path;
}
function softLight(ctx, x, y, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const light = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  light.addColorStop(0, rgba(color, alpha));
  light.addColorStop(0.4, rgba(color, alpha * 0.5));
  light.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = light;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

/**
 * Resolution-independent, projected translucent bell. Draw in normalized bell coordinates.
 * Its contour is the exact ellipse silhouette of a tilted hemisphere above the rim plane,
 * joined to the projected lower rim. All tissue, glancing light and lip curves are drawn
 * at the destination canvas resolution; no small body bitmap is enlarged or crossfaded.
 */
export function drawMembrane(ctx, j, palette, color, glow = 1) {
  const H = SPECIES[j.species].height / SPECIES[j.species].width,
    c = Math.cos(j.tilt),
    s = Math.sin(j.tilt),
    top = Math.sqrt(H * H * c * c + s * s),
    bottom = Math.max(0.025, Math.abs(s)),
    bell = new Path2D();
  bell.moveTo(-1, 0);
  bell.bezierCurveTo(-1, -top * K, -K, -top, 0, -top);
  bell.bezierCurveTo(K, -top, 1, -top * K, 1, 0);
  bell.bezierCurveTo(1, bottom * K, K, bottom, 0, bottom);
  bell.bezierCurveTo(-K, bottom, -1, bottom * K, -1, 0);
  bell.closePath();
  const project = (x, y, z) => [x, y * c - z * s];
  ctx.save();
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.clip(bell);

  // Clear, broad gel shading. The water remains visible through every layer.
  const body = ctx.createLinearGradient(-0.45, -top, 0.5, bottom);
  body.addColorStop(0, rgba(palette.tip, 0.24));
  body.addColorStop(0.25, rgba(color, 0.18));
  body.addColorStop(0.58, rgba(color, 0.025));
  body.addColorStop(1, rgba(palette.tip, 0.08));
  ctx.fillStyle = body;
  ctx.fill(bell);
  softLight(ctx, -0.35, -top * 0.55, 0.8, top * 0.75, palette.tip, 0.18);
  softLight(ctx, 0.55, -top * 0.28, 0.52, top * 0.75, color, 0.08);

  // Diffuse tissue deposits, with broad curved folds instead of little pixelated symbols.
  for (let l = 0; l < 4; l++) {
    const phi = (l * TAU) / 4 + j.id * 0.63,
      cx = Math.cos(phi) * 0.23,
      cz = Math.sin(phi) * 0.23,
      center = project(cx, -H * 0.23, cz),
      points = [];
    softLight(
      ctx,
      center[0],
      center[1],
      0.22,
      0.11 + bottom * 0.1,
      palette.tip,
      0.075,
    );
    for (let n = 0; n <= 32; n++) {
      const a = (n / 32) * Math.PI * 1.68 + phi,
        r = 0.14 * (1 + Math.sin(a * 3 + l * 2) * 0.08),
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r * 0.8,
        y = -H * (0.22 + Math.sin(a * 2 + j.id) * 0.025);
      points.push(project(x, y, z));
    }
    const fold = smoothPath(points);
    for (let layer = 0; layer < 6; layer++) {
      ctx.lineWidth = 0.13 * (1 - layer / 7);
      ctx.strokeStyle = rgba(palette.tip, 0.018);
      ctx.stroke(fold);
    }
    ctx.lineWidth = 0.027;
    ctx.strokeStyle = rgba(palette.tip, 0.15);
    ctx.stroke(fold);
  }

  // A small number of very faint radial canals; no spoke-like wireframe.
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * TAU + j.id * 0.2,
      points = [];
    for (let k = 0; k <= 12; k++) {
      const u = 0.42 + (k / 12) * 0.58,
        r = Math.sin((u * Math.PI) / 2),
        a = angle + Math.sin(u * 5 + i) * 0.012;
      points.push(
        project(
          Math.cos(a) * r,
          -H * Math.cos((u * Math.PI) / 2),
          Math.sin(a) * r,
        ),
      );
    }
    ctx.strokeStyle = rgba(palette.tip, i % 3 ? 0.022 : 0.05);
    ctx.lineWidth = 0.006;
    ctx.stroke(smoothPath(points));
  }

  // Continuous radial falloff across the membrane thickness. Two scaled half-ellipses
  // retain the smooth projected silhouette without expensive repeated outline strokes.
  for (const upper of [true, false]) {
    ctx.save();
    ctx.scale(1, upper ? top : bottom);
    const edge = ctx.createRadialGradient(0, 0, 0, 0, 0, 1),
      strength = (upper ? 1 : 0.7) * (0.85 + glow * 0.15);
    edge.addColorStop(0, rgba(color, 0));
    edge.addColorStop(0.84, rgba(color, 0));
    edge.addColorStop(0.92, rgba(color, 0.012 * strength));
    edge.addColorStop(0.96, rgba(palette.tip, 0.045 * strength));
    edge.addColorStop(0.984, rgba(palette.tip, 0.13 * strength));
    edge.addColorStop(1, rgba(palette.tip, 0.36 * strength));
    ctx.fillStyle = edge;
    ctx.fillRect(-1, upper ? -1 : 0, 2, 1);
    ctx.restore();
  }

  ctx.restore();

  // Two tissue surfaces around the opening: a darker rear skirt and an illuminated,
  // softly scalloped foreground lip. It is an open bell, not a closed glass bubble.
  for (const front of [false, true]) {
    const outer = [],
      inner = [],
      lip = [],
      phase = j.phase * TAU;
    for (let k = 0; k <= 64; k++) {
      const a = (front ? Math.PI : 0) + (k / 64) * Math.PI,
        fold = Math.sin(a * 12 + j.id + phase * 0.25),
        r = 0.985 + fold * 0.015,
        y = 0.018 + Math.sin(a * 8 + phase * 0.3) * 0.025;
      outer.push(project(Math.cos(a) * r, y, Math.sin(a) * r));
      inner.push(
        project(Math.cos(a) * 0.9, -H * 0.17 + fold * 0.012, Math.sin(a) * 0.9),
      );
      lip.push(
        project(
          Math.cos(a) * (r - 0.015),
          y - 0.015,
          Math.sin(a) * (r - 0.015),
        ),
      );
    }
    const skirt = smoothPath([...outer, ...inner.reverse()]);
    skirt.closePath();
    ctx.save();
    const shade = ctx.createLinearGradient(-0.65, -H * 0.1, 0.8, bottom + 0.15);
    shade.addColorStop(0, rgba(palette.tip, front ? 0.24 : 0.08));
    shade.addColorStop(0.5, rgba(color, front ? 0.13 : 0.04));
    shade.addColorStop(1, rgba(palette.tip, front ? 0.25 : 0.09));
    ctx.fillStyle = shade;
    ctx.fill(skirt);
    ctx.lineWidth = 0.014;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(palette.tip, front ? 0.15 : 0.05);
    ctx.stroke(smoothPath(lip));
    // Irregular soft deposits on the lip, without a repeating grid of hard creases.
    for (let k = 4; k < 61; k += 7) {
      const o = outer[k],
        strength =
          (front ? 0.14 : 0.04) * (0.65 + Math.sin(k * 1.8 + j.id) * 0.3);
      softLight(
        ctx,
        o[0] * 0.97,
        o[1] - 0.018,
        0.07,
        0.035,
        palette.tip,
        strength,
      );
    }
    ctx.restore();
  }
}
