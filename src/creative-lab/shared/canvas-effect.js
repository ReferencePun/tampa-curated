/** Framework-free lifecycle. Host owns activation; an inactive effect schedules no frames. */
export function canvasEffect(host, initial, draw, report = () => {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;position:absolute;inset:0';
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable. The still plate remains available.');
  host.append(canvas);
  let settings = {...initial}, width = 1, height = 1, ratio = 1, time = 0;
  let running = false, disposed = false, frame = 0, last = 0, frames = 0, sample = 0, sampleFrames = 0, fps = 0;
  const pointer = {x: 0, y: 0, active: false};
  function paint() {
    if (disposed) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const count = draw(context, {width, height, time, settings, pointer});
    frames++;
    if (!running || frames % 15 === 0) report({fps: running ? fps : 0, width: canvas.width, height: canvas.height, primitives: count, frames, running, renderer: 'Canvas 2D'});
  }
  function tick(now) {
    frame = 0;
    if (!running || disposed) return;
    if (last) time += Math.min((now - last) / 1000, .05);
    last = now;
    if (!sample) sample = now;
    sampleFrames++;
    if (now - sample >= 500) { fps = Math.round(sampleFrames * 1000 / (now - sample)); sample = now; sampleFrames = 0; }
    paint(); frame = requestAnimationFrame(tick);
  }
  function resize() {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
    ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); paint();
  }
  function move(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / width * 2 - 1;
    pointer.y = (event.clientY - rect.top) / height * 2 - 1;
    pointer.active = true; if (!running) paint();
  }
  function leave() { pointer.active = false; if (!running) paint(); }
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  return {
    update(next) { settings = {...next}; paint(); },
    setRunning(value) {
      if (disposed || value === running) return;
      running = value; last = 0; sample = 0; sampleFrames = 0; fps = 0;
      cancelAnimationFrame(frame); frame = 0;
      if (running) frame = requestAnimationFrame(tick); else paint();
    },
    replay() { time = 0; paint(); },
    dispose() {
      if (disposed) return;
      disposed = true; running = false; cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.remove();
    },
  };
}

export function guides(ctx, width, height, enabled) {
  if (!enabled) return;
  ctx.save(); ctx.strokeStyle = '#8e8273'; ctx.globalAlpha = .35; ctx.lineWidth = .6;
  ctx.setLineDash([3, 7]); ctx.beginPath();
  ctx.moveTo(width / 2, 24); ctx.lineTo(width / 2, height - 24);
  ctx.moveTo(24, height / 2); ctx.lineTo(width - 24, height / 2); ctx.stroke();
  ctx.setLineDash([]);
  for (const x of [24, width - 24]) for (const y of [24, height - 24]) {
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
  }
  ctx.restore();
}
