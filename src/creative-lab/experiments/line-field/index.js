import {canvasEffect, guides} from '../../shared/canvas-effect.js';

export function mount(host, settings, report) {
  return canvasEffect(host, settings, (ctx, state) => {
    const {width: w, height: h, time, settings: s, pointer} = state;
    guides(ctx, w, h, s.guides);
    const size = Math.min(w * .8, h * 1.1), phase = time * s.speed * .35;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.lineWidth = .75;
    for (let line = 0; line < s.density; line++) {
      const v = line / Math.max(1, s.density - 1), layer = (v - .5) * size * .7;
      ctx.strokeStyle = line % 9 === 0 ? s.accent : s.ink; ctx.globalAlpha = line % 9 === 0 ? .85 : .5;
      ctx.beginPath();
      for (let step = 0; step <= 100; step++) {
        const u = step / 100, angle = u * Math.PI * 2;
        let x, y;
        if (s.mode === 'contours') {
          const radius = size * (.12 + v * .3) * (1 + .11 * Math.sin(angle * 3 + phase + s.seed));
          x = Math.cos(angle) * radius; y = Math.sin(angle) * radius * .68;
        } else {
          x = (u - .5) * size;
          y = layer + Math.sin(u * 6.28 + phase + v * 3) * size * .09 + Math.sin(u * 12 + s.seed) * size * .02;
        }
        if (pointer.active) {
          const dx = x - pointer.x * w / 2, dy = y - pointer.y * h / 2;
          const influence = Math.exp(-(dx * dx + dy * dy) / (size * size * .045));
          x += dx * influence * .32; y += dy * influence * .32;
        }
        y += Math.sin(step * 1.7 + line + s.seed) * .38;
        if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore(); return s.density;
  }, report);
}
