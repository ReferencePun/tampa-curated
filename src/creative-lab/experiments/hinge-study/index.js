import {canvasEffect, guides} from '../../shared/canvas-effect.js';

export function mount(host, settings, report) {
  return canvasEffect(host, settings, (ctx, state) => {
    const {width: w, height: h, time, settings: s, pointer} = state;
    guides(ctx, w, h, s.guides);
    const radius = Math.min(w, h) * .33, count = s.density;
    const phase = time * s.speed * .24 + (pointer.active ? pointer.x * .8 : 0);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.lineWidth = .75;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, open = .6 + Math.sin(phase + i * .06 + s.seed) * .4;
      const joint = radius * (s.mode === 'contours' ? .5 : .34);
      const x = Math.cos(a) * joint, y = Math.sin(a) * joint;
      const tipX = x + Math.cos(a + open) * radius * .65, tipY = y + Math.sin(a + open) * radius * .65;
      ctx.strokeStyle = i % 7 === 0 ? s.accent : s.ink; ctx.globalAlpha = i % 7 === 0 ? .9 : .42;
      ctx.beginPath();ctx.moveTo(Math.cos(a) * radius * .14, Math.sin(a) * radius * .14);ctx.lineTo(x, y);ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(a + open + 1.2) * radius * .2, tipY + Math.sin(a + open + 1.2) * radius * .2);ctx.stroke();
      ctx.beginPath();ctx.arc(x, y, 2, 0, Math.PI * 2);ctx.stroke();
    }
    ctx.strokeStyle = s.ink;ctx.globalAlpha = .6;ctx.beginPath();ctx.arc(0, 0, radius * .12, 0, Math.PI * 2);ctx.stroke();ctx.restore();
    return count * 2 + 1;
  }, report);
}
