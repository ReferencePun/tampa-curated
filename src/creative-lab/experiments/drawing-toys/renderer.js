import { boardHeight, replayPosition, clamp } from "./model.js";
export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  if (!context) throw Error("Canvas 2D is unavailable.");
  const base = document.createElement("canvas"),
    ink = document.createElement("canvas"),
    bc = base.getContext("2d"),
    ic = ink.getContext("2d");
  let width = 1,
    height = 1,
    scale = 1,
    key = "",
    epoch = -1,
    applied = 0,
    mode = "",
    frames = 0,
    rebuilt = 0;
  function background(config) {
    const next = [config.mode, config.boardSize, width, height].join(":");
    if (key === next) return;
    key = next;
    mode = config.mode;
    const h = boardHeight(config.boardSize);
    base.width = ink.width = canvas.width = width;
    base.height = ink.height = canvas.height = height;
    scale = width / 1000;
    bc.setTransform(scale, 0, 0, height / h, 0, 0);
    const g = bc.createLinearGradient(0, 0, 1000, h);
    if (mode === "dial") {
      g.addColorStop(0, "#a6aaa3");
      g.addColorStop(0.35, "#c8ccc2");
      g.addColorStop(1, "#babfb5");
    } else {
      g.addColorStop(0, "#d0d3c5");
      g.addColorStop(0.45, "#e1e2d3");
      g.addColorStop(1, "#cdd2c4");
    }
    bc.fillStyle = g;
    bc.fillRect(0, 0, 1000, h);
    let seed = 19;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    bc.fillStyle = mode === "dial" ? "#34403b0c" : "#5b635111";
    for (let i = 0; i < 12500; i++) {
      const x = random() * 1000,
        y = random() * h;
      bc.fillRect(x, y, 0.35 + random() * 0.9, 0.35 + random() * 0.65);
    }
    if (mode === "magnetic") {
      bc.strokeStyle = "#717b6216";
      bc.lineWidth = 0.55;
      bc.beginPath();
      for (let y = 0; y < h; y += 7)
        for (let x = (Math.floor(y / 7) % 2) * 4; x < 1000; x += 8) {
          bc.moveTo(x, y);
          bc.lineTo(x + 4, y - 2);
          bc.lineTo(x + 8, y);
          bc.lineTo(x + 8, y + 4);
        }
      bc.stroke();
    }
    const edge = bc.createRadialGradient(
      500,
      h * 0.45,
      h * 0.2,
      500,
      h * 0.5,
      650,
    );
    edge.addColorStop(0, "#0000");
    edge.addColorStop(1, "#27362b22");
    bc.fillStyle = edge;
    bc.fillRect(0, 0, 1000, h);
    epoch = -1;
    applied = 0;
    rebuilt++;
  }
  function event(ctx, e, f = 1, config) {
    const h = boardHeight(config.boardSize);
    ctx.save();
    ctx.setTransform(scale, 0, 0, height / h, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (e.kind === "wipe") {
      const end = e.a + (e.b - e.a) * f;
      ctx.clearRect(
        (Math.min(e.a, end) - 0.035) * 1000,
        -2,
        (Math.abs(e.a - end) + 0.07) * 1000,
        h + 4,
      );
    }
    if (e.kind === "line") {
      const a = [e.a[0] * 1000, e.a[1] * h],
        b = [
          (e.a[0] + (e.b[0] - e.a[0]) * f) * 1000,
          (e.a[1] + (e.b[1] - e.a[1]) * f) * h,
        ];
      ctx.lineWidth = e.width;
      if (e.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = Math.max(16, e.width * 4);
      } else {
        ctx.strokeStyle = config.mode === "dial" ? "#3e4740" : "#424f48";
        ctx.globalAlpha = config.mode === "dial" ? 0.88 : 0.83;
        if (config.mode === "magnetic" && e.tool === "soft") {
          ctx.lineWidth = e.width * 1.5;
          ctx.shadowColor = "#424f48b3";
          ctx.shadowBlur = 1.15 * scale;
        }
      }
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.1) {
        ctx.beginPath();
        ctx.arc(...a, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      }
    }
    if (e.kind === "stamp") {
      const x = e.p[0] * 1000,
        y = e.p[1] * h,
        r = e.size / 2;
      ctx.globalAlpha = clamp(f, 0, 1) * 0.86;
      ctx.fillStyle = "#48564e";
      ctx.shadowColor = "#47554c88";
      ctx.shadowBlur = 1.4 * scale;
      ctx.beginPath();
      if (e.shape === "circle") ctx.arc(x, y, r, 0, Math.PI * 2);
      else if (e.shape === "square") ctx.rect(x - r, y - r, r * 2, r * 2);
      else {
        for (let i = 0; i < 10; i++) {
          const t = -Math.PI / 2 + (i * Math.PI) / 5,
            d = i % 2 ? r * 0.46 : r;
          const p = [x + Math.cos(t) * d, y + Math.sin(t) * d];
          if (!i) ctx.moveTo(...p);
          else ctx.lineTo(...p);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }
  function render(
    state,
    config,
    { progress = 1, opacity = 1, wipe = null, cursor = null } = {},
  ) {
    background(config);
    const sample = replayPosition(state, progress);
    if (epoch !== state.epoch || sample.index < applied) {
      ic.clearRect(0, 0, width, height);
      epoch = state.epoch;
      applied = 0;
    }
    while (applied < sample.index)
      event(ic, state.events[applied++], 1, config);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(base, 0, 0);
    context.save();
    context.globalAlpha = opacity;
    // A transient partial event is composited on a copy so erasers affect ink, never paper.
    if (sample.fraction > 0 || wipe !== null) {
      const temp = temporary();
      const tc = temp.getContext("2d");
      tc.clearRect(0, 0, width, height);
      tc.drawImage(ink, 0, 0);
      if (sample.fraction > 0)
        event(tc, state.events[sample.index], sample.fraction, config);
      if (wipe !== null) event(tc, { kind: "wipe", a: 0, b: wipe }, 1, config);
      context.drawImage(temp, 0, 0);
    } else context.drawImage(ink, 0, 0);
    context.restore();
    if (cursor) {
      context.save();
      context.strokeStyle = "#fff9";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(cursor[0] * width, cursor[1] * height, 4, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    frames++;
    return { frames, rebuilt, width, height, primitives: state.events.length };
  }
  let scratch = null;
  function temporary() {
    if (!scratch) scratch = document.createElement("canvas");
    if (scratch.width !== width || scratch.height !== height) {
      scratch.width = width;
      scratch.height = height;
    }
    return scratch;
  }
  return {
    render,
    resize(w, h, dpr = Math.min(globalThis.devicePixelRatio || 1, 2)) {
      width = Math.max(1, Math.round(w * dpr));
      height = Math.max(1, Math.round(h * dpr));
      key = "";
    },
    invalidate() {
      epoch = -1;
      applied = 0;
    },
    dispose() {
      for (const c of [base, ink, scratch, canvas])
        if (c) c.width = c.height = 1;
      scratch = null;
    },
    getState: () => ({ frames, rebuilt, applied, width, height }),
  };
}
