import {canvasEffect, guides} from './canvas-effect.js';

/** A clearly labeled calibration drawing, not the proposed future effect. */
export function draftPlate(host, settings, report, variant = 0) {
  return canvasEffect(host, settings, (ctx, state) => {
    const {width, height, settings: s, time} = state;
    guides(ctx, width, height, s.guides);
    ctx.save(); ctx.translate(width / 2, height / 2);
    const radius = Math.min(width, height) * .26, count = s.density;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + time * s.speed * .045;
      ctx.strokeStyle = i % 7 === 0 ? s.accent : s.ink; ctx.lineWidth = .75;
      ctx.globalAlpha = i % 7 === 0 ? .8 : .4;
      const r = radius * (.65 + .18 * Math.sin(i * .7 + variant + s.seed));
      ctx.beginPath();
      if (s.mode === 'contours') ctx.ellipse(Math.cos(a) * radius * .18, Math.sin(a) * radius * .18, r, r * .72, a, 0, Math.PI * 2);
      else {ctx.moveTo(Math.cos(a) * radius * .3, Math.sin(a) * radius * .3); ctx.lineTo(Math.cos(a + .4) * r, Math.sin(a + .4) * r);ctx.lineTo(Math.cos(a + .6) * radius, Math.sin(a + .6) * radius);}
      ctx.stroke();
    }
    ctx.restore(); return count;
  }, report);
}
