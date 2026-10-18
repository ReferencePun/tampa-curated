import { PALETTES, SPECIES, bellShape, hash } from "./model.js";
import { drawMembrane } from "./membrane.js";
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function haze(ctx, x, y, r, color, opacity) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, opacity));
  g.addColorStop(0.35, rgba(color, opacity * 0.36));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function path(ctx, a) {
  const n = a.length / 2;
  ctx.moveTo(a[0], a[1]);
  for (let i = 1; i < n - 1; i++)
    ctx.quadraticCurveTo(
      a[i * 2],
      a[i * 2 + 1],
      (a[i * 2] + a[i * 2 + 2]) * 0.5,
      (a[i * 2 + 1] + a[i * 2 + 3]) * 0.5,
    );
  ctx.lineTo(a[(n - 1) * 2], a[(n - 1) * 2 + 1]);
}
function ribbon(ctx, chain, j, p, color, t, glow) {
  const a = chain.points,
    n = a.length / 2,
    width =
      j.radius * (chain.arm ? (j.species === "moon" ? 0.18 : 0.16) : 0.035);
  const rootX = a[0],
    rootY = a[1],
    tipX = a.at(-2),
    tipY = a.at(-1);
  for (const [layer, strength] of [
    [1, 0.7],
    [0.64, 0.5],
  ]) {
    const edges = [[], []];
    for (let i = 0; i < n; i++) {
      const prev = Math.max(0, i - 2),
        next = Math.min(n - 1, i + 2),
        dx = a[next * 2] - a[prev * 2],
        dy = a[next * 2 + 1] - a[prev * 2 + 1],
        len = Math.max(0.0001, Math.hypot(dx, dy)),
        u = i / (n - 1),
        taper = Math.sin(Math.PI * (0.12 + u * 0.88)) * (1 - u * 0.45),
        curl =
          0.82 +
          Math.sin(u * 10 - t * 0.35 + chain.seed) * 0.18 +
          Math.sin(u * 46 + chain.seed - t * 0.4) * 0.14,
        fold = width * taper * curl * layer;
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        edges[side].push(
          a[i * 2] - (dy / len) * fold * sign,
          a[i * 2 + 1] + (dx / len) * fold * sign,
        );
      }
    }
    ctx.beginPath();
    path(ctx, edges[0]);
    const reverse = [];
    for (let i = n - 1; i >= 0; i--)
      reverse.push(edges[1][i * 2], edges[1][i * 2 + 1]);
    ctx.lineTo(reverse[0], reverse[1]);
    for (let i = 1; i < n - 1; i++)
      ctx.quadraticCurveTo(
        reverse[i * 2],
        reverse[i * 2 + 1],
        (reverse[i * 2] + reverse[i * 2 + 2]) * 0.5,
        (reverse[i * 2 + 1] + reverse[i * 2 + 3]) * 0.5,
      );
    ctx.lineTo(reverse.at(-2), reverse.at(-1));
    ctx.closePath();
    // A softly lit sheet of tissue, with no tube outlines or repeated ladder-like crossbars.
    const light = ctx.createLinearGradient(rootX, rootY, tipX, tipY);
    light.addColorStop(0, rgba(color, 0.06 * strength));
    light.addColorStop(0.25, rgba(p.tip, (0.3 + glow * 0.03) * strength));
    light.addColorStop(0.66, rgba(color, 0.22 * strength));
    light.addColorStop(1, rgba(color, 0.015));
    ctx.fillStyle = light;
    ctx.fill();
  }
  if (chain.arm) {
    // Loose ruffles along each oral arm: small overlapping, translucent leaves of tissue.
    for (let i = 3; i < n - 3; i += 3) {
      const u = i / (n - 1),
        x = a[i * 2],
        y = a[i * 2 + 1],
        dx = a[(i + 1) * 2] - a[(i - 1) * 2],
        dy = a[(i + 1) * 2 + 1] - a[(i - 1) * 2 + 1],
        angle = Math.atan2(dy, dx),
        size = width * (0.5 + Math.sin(u * Math.PI) * 0.5) * (1 - u * 0.7);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-size * 0.7, 0);
      ctx.bezierCurveTo(-size * 1.2, -size, size * 0.6, -size * 1.3, size, 0);
      ctx.bezierCurveTo(
        size * 0.4,
        size * 0.8,
        -size * 0.9,
        size,
        -size * 0.7,
        0,
      );
      const frillLight = ctx.createLinearGradient(0, -size, 0, size);
      frillLight.addColorStop(0, rgba(p.tip, 0));
      frillLight.addColorStop(0.45, rgba(p.tip, 0.14 * (1 - u * 0.6)));
      frillLight.addColorStop(1, rgba(p.tip, 0.01));
      ctx.fillStyle = frillLight;
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Blue-lit water, native-resolution curved membranes and soft stateful trailing tissue. */
export function createTankRenderer() {
  const backing = document.createElement("canvas");
  let key = "";
  function background(w, h, c) {
    const next = [w, h, c.palette, c.darkness, c.lightColor, c.view].join();
    if (next === key) return;
    key = next;
    backing.width = w;
    backing.height = h;
    const ctx = backing.getContext("2d"),
      p = PALETTES[c.palette],
      blue = c.palette === "abyss",
      luminance = 1 - c.darkness,
      round = Math.min(w, h) * 0.115;
    ctx.fillStyle = "#020610";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    if (c.view === "tank") {
      ctx.beginPath();
      ctx.roundRect(w * 0.035, h * 0.035, w * 0.93, h * 0.93, round);
      ctx.clip();
    }
    const water = ctx.createLinearGradient(w * 0.35, 0, w * 0.68, h);
    water.addColorStop(0, blue ? "#005fff" : p.water);
    water.addColorStop(0.28, p.water);
    water.addColorStop(0.75, blue ? "#031d77" : "#091324");
    water.addColorStop(1, blue ? "#010f3d" : "#030a14");
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(0,3,18,${0.12 + c.darkness * 0.17})`;
    ctx.fillRect(0, 0, w, h);
    haze(
      ctx,
      w * 0.4,
      h * 0.03,
      Math.max(w, h) * 0.7,
      blue ? "#008cff" : p.light,
      0.4 + luminance * 0.35,
    );
    haze(ctx, w * 0.91, h * 0.4, w * 0.5, p.water, 0.5);
    haze(
      ctx,
      w * 0.45,
      h * 0.12,
      h * 0.8,
      c.lightColor,
      0.055 + luminance * 0.14,
    );
    // The aquarium's overhead blue strip diffuses into the water, leaving its base dark.
    ctx.save();
    ctx.translate(w * 0.5, h * 0.05);
    ctx.scale(1, 0.045);
    haze(ctx, 0, 0, w * 0.57, blue ? "#63c5ff" : p.light, 0.42);
    ctx.restore();
    const vignette = ctx.createRadialGradient(
      w * 0.48,
      h * 0.38,
      w * 0.12,
      w * 0.5,
      h * 0.45,
      Math.max(w, h) * 0.69,
    );
    vignette.addColorStop(0, "rgba(0,2,18,0)");
    vignette.addColorStop(1, "rgba(0,2,18,.67)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    if (c.view === "tank") {
      ctx.beginPath();
      ctx.roundRect(w * 0.035, h * 0.035, w * 0.93, h * 0.93, round);
      ctx.strokeStyle = rgba(blue ? "#51a4ff" : p.light, 0.25);
      ctx.lineWidth = Math.max(0.7, w * 0.001);
      ctx.stroke();
      // Glass edge catches the light; the center stays clear.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(w * 0.038, h * 0.038, w * 0.924, h * 0.924, round);
      ctx.clip();
      const glass = ctx.createLinearGradient(w * 0.04, 0, w * 0.14, 0);
      glass.addColorStop(0, rgba(p.light, 0.1));
      glass.addColorStop(1, rgba(p.light, 0));
      ctx.fillStyle = glass;
      ctx.fillRect(w * 0.04, h * 0.05, w * 0.1, h * 0.9);
      ctx.restore();
    }
  }
  function draw(canvas, c, scene) {
    const ctx = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      aspect = w / h,
      p = PALETTES[c.palette],
      t = scene.time;
    background(w, h, c);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(backing, 0, 0);
    ctx.save();
    if (c.view === "tank") {
      ctx.beginPath();
      ctx.roundRect(
        w * 0.037,
        h * 0.037,
        w * 0.926,
        h * 0.926,
        Math.min(w, h) * 0.113,
      );
      ctx.clip();
    }
    ctx.scale(h, h);
    ctx.translate(aspect * 0.5, 0.5);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-aspect * 0.5, -0.5);
    if (c.mode !== "ambient" && scene.pointer.amount) {
      const q = scene.worldPoint();
      haze(ctx, q.x, q.y, 0.42, c.lightColor, 0.24 * c.interaction);
    }
    const count = Math.round(c.particles * (c.quality === "economy" ? 0.5 : 1));
    for (let i = 0; i < count; i++) {
      const x =
          (((hash(i + 602) * aspect + Math.sin(t * 0.027 + i) * 0.025) %
            aspect) +
            aspect) %
          aspect,
        y =
          (((hash(i + 902) - t * (0.001 + hash(i + 1402) * 0.0018)) % 1) + 1) %
          1,
        r = (0.00025 + hash(i + 42) * 0.0007) * (0.7 + hash(i + 88) * 0.6);
      ctx.fillStyle = rgba(c.lightColor, 0.025 + hash(i + 5) * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineJoin = ctx.lineCap = "round";
    for (const j of scene.jellies) {
      const color = p.colors[j.id % 3],
        alpha = 0.38 + j.depth * 0.6,
        b = bellShape(j);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (c.glow > 0)
        haze(
          ctx,
          j.x,
          j.y - b.height * 0.3,
          b.width * 1.9,
          color,
          0.045 * c.glow,
        );
      // Rear tissue is seen through the translucent bell; each filament has its own delay.
      for (const chain of j.chains) {
        ribbon(ctx, chain, j, p, color, t, c.glow);
      }
      const sy =
        (b.height * SPECIES[j.species].width) / SPECIES[j.species].height;
      ctx.save();
      ctx.translate(j.x, j.y);
      ctx.rotate(j.angle);
      ctx.scale(b.width, sy);
      ctx.globalAlpha = Math.min(1, alpha * (0.85 + c.glow * 0.15));
      drawMembrane(ctx, j, p, color, c.glow);
      ctx.restore();
      if (j.response > 0.01 && c.glow > 0)
        haze(
          ctx,
          j.x,
          j.y - b.height * 0.4,
          b.width * 1.7,
          c.lightColor,
          j.response * 0.16 * c.glow,
        );
      ctx.restore();
    }
    if (c.mode === "disturb") {
      const currents = scene.currents || [];
      for (const flow of currents) {
        const fade = Math.exp(-(t - flow.time) * 2.5);
        ctx.beginPath();
        ctx.moveTo(flow.x - flow.vx * 0.035, flow.y - flow.vy * 0.035);
        ctx.quadraticCurveTo(
          flow.x,
          flow.y,
          flow.x + flow.vx * 0.025,
          flow.y + flow.vy * 0.025,
        );
        ctx.strokeStyle = rgba(c.lightColor, 0.12 * fade);
        ctx.lineWidth = 0.0012;
        ctx.stroke();
      }
      for (const wake of scene.wakes) {
        const age = t - wake.time,
          r = 0.025 + age * 0.13;
        ctx.beginPath();
        ctx.ellipse(wake.x, wake.y, r, r * 0.5, -0.12, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(
          c.lightColor,
          0.22 * Math.exp(-age * 1.6) * c.interaction,
        );
        ctx.lineWidth = 0.0006;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  return {
    draw,
    dispose() {
      backing.width = backing.height = 1;
      key = "";
    },
  };
}
