import { angleDelta, clamp } from "./model.js";
/** Pointer/keyboard adapter; it owns no artwork and no shell styling. */
export function bindInput(root, api) {
  const abort = new AbortController(),
    signal = abort.signal,
    canvas = root.querySelector("canvas"),
    knobs = [...root.querySelectorAll("[data-dial]")];
  const pointers = new Map(),
    held = new Map();
  let raf = 0,
    last = 0,
    canvasPointer = null,
    previous = null,
    stampDrag = null,
    selected = null,
    disposed = false;
  const on = (el, type, fn, opts = {}) =>
    el.addEventListener(type, fn, { ...opts, signal });
  const capture = (el, e) => {
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  function coordinate(e, clip = true) {
    const r = canvas.getBoundingClientRect(),
      p = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    return clip ? p.map((v) => clamp(v, 0, 1)) : p;
  }
  const inside = (p) => p.every((v) => v >= 0 && v <= 1);
  function step(dx, dy) {
    const s = api.settings();
    if (
      api.drawing().move(dx * s.sensitivity, dy * s.sensitivity, s.lineWidth)
    ) {
      api.angle(dx * 900, dy * 900);
      api.changed();
    }
  }
  function finish() {
    if (!pointers.size && !held.size && canvasPointer === null)
      api.drawing().commit();
    api.changed();
  }
  function endCanvas() {
    if (canvasPointer === null) return;
    const id = canvasPointer;
    canvasPointer = null;
    previous = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    api.cursor(null);
    finish();
  }
  on(canvas, "pointerdown", (e) => {
    if (e.button !== 0 || canvasPointer !== null || !api.prepare()) return;
    canvas.focus({ preventScroll: true });
    capture(canvas, e);
    canvasPointer = e.pointerId;
    previous = coordinate(e);
    api.drawing().begin();
    if (api.settings().mode === "magnetic") {
      if (selected)
        api.drawing().stamp(selected, previous, api.settings().stampSize);
      else
        api
          .drawing()
          .stroke(
            previous,
            previous,
            api.settings().lineWidth,
            api.settings().stylus,
          );
    }
    api.cursor(previous);
    api.changed();
  });
  on(canvas, "pointermove", (e) => {
    if (canvasPointer !== e.pointerId) return;
    const samples = e.getCoalescedEvents?.() || [e];
    for (const sample of samples.length ? samples : [e]) {
      const p = coordinate(sample);
      if (api.settings().mode === "dial")
        step(p[0] - previous[0], p[1] - previous[1]);
      else if (!selected)
        api
          .drawing()
          .stroke(previous, p, api.settings().lineWidth, api.settings().stylus);
      previous = p;
      api.cursor(p);
    }
    api.changed();
  });
  on(canvas, "pointerup", endCanvas);
  on(canvas, "pointercancel", endCanvas);
  on(canvas, "lostpointercapture", endCanvas);
  for (const knob of knobs) {
    on(knob, "pointerdown", (e) => {
      if (e.button !== 0 || !api.prepare()) return;
      capture(knob, e);
      knob.focus({ preventScroll: true });
      const r = knob.getBoundingClientRect(),
        x = e.clientX - r.left - r.width / 2,
        y = e.clientY - r.top - r.height / 2;
      pointers.set(e.pointerId, {
        knob,
        axis: knob.dataset.dial,
        angle: Math.atan2(y, x),
        y: e.clientY,
        linear: Math.hypot(x, y) < r.width * 0.22,
      });
      api.drawing().begin();
    });
    on(knob, "pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const r = knob.getBoundingClientRect(),
        angle = Math.atan2(
          e.clientY - r.top - r.height / 2,
          e.clientX - r.left - r.width / 2,
        );
      const d = p.linear
        ? (p.y - e.clientY) * 0.0014
        : angleDelta(p.angle, angle) * 0.055;
      p.angle = angle;
      p.y = e.clientY;
      step(
        p.axis === "x" ? d * api.settings().knobSpeed : 0,
        p.axis === "y" ? d * api.settings().knobSpeed : 0,
      );
    });
    const end = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (knob.hasPointerCapture(e.pointerId))
        knob.releasePointerCapture(e.pointerId);
      finish();
    };
    on(knob, "pointerup", end);
    on(knob, "pointercancel", end);
    on(knob, "lostpointercapture", end);
  }
  function keyboardFrame(now) {
    raf = 0;
    if (disposed || !held.size || document.hidden) return;
    const dt = last ? Math.min(0.04, (now - last) / 1000) : 0;
    last = now;
    let x = 0,
      y = 0;
    for (const vector of held.values()) {
      x += vector[0];
      y += vector[1];
    }
    const amount = dt * 0.16 * api.settings().knobSpeed;
    if (api.settings().mode === "dial") step(x * amount, y * amount);
    else {
      const state = api.drawing().state(),
        next = [
          clamp(state.cursor[0] + x * amount, 0, 1),
          clamp(state.cursor[1] + y * amount, 0, 1),
        ];
      api
        .drawing()
        .stroke(
          state.cursor,
          next,
          api.settings().lineWidth,
          api.settings().stylus,
        );
      api.changed();
    }
    raf = requestAnimationFrame(keyboardFrame);
  }
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  function startKey(key, axis) {
    if (held.has(key) || !api.prepare()) return;
    let v = directions[key];
    if (axis) v = axis === "x" ? [v[0] || -v[1], 0] : [0, v[1] || v[0]];
    held.set(key, v);
    api.drawing().begin();
    if (api.settings().mode === "dial")
      step(
        v[0] * 0.004 * api.settings().knobSpeed,
        v[1] * 0.004 * api.settings().knobSpeed,
      );
    last = 0;
    if (!raf) raf = requestAnimationFrame(keyboardFrame);
  }
  function stopKey(key) {
    if (!held.has(key)) return;
    held.delete(key);
    if (!held.size) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      finish();
    }
  }
  for (const target of [canvas, ...knobs])
    on(target, "keydown", (e) => {
      if (directions[e.key]) {
        e.preventDefault();
        startKey(e.key, target.dataset.dial);
      } else if (e.key === "Escape") {
        cancel();
        target.blur();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        api.history(e.shiftKey);
      }
    });
  on(window, "keyup", (e) => stopKey(e.key));
  for (const button of root.querySelectorAll("[data-direction]")) {
    const key = button.dataset.direction;
    on(button, "pointerdown", (e) => {
      capture(button, e);
      startKey(key);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      on(button, event, () => stopKey(key));
    on(button, "click", (e) => {
      if (e.detail === 0) {
        startKey(key);
        stopKey(key);
      }
    });
  }
  for (const button of root.querySelectorAll("[data-stamp]")) {
    on(button, "pointerdown", (e) => {
      if (!api.prepare()) return;
      capture(button, e);
      stampDrag = {
        id: e.pointerId,
        shape: button.dataset.stamp,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      };
    });
    on(button, "pointermove", (e) => {
      if (stampDrag?.id !== e.pointerId) return;
      stampDrag.moved ||=
        Math.hypot(e.clientX - stampDrag.x, e.clientY - stampDrag.y) > 5;
      const p = coordinate(e, false);
      api.ghost(inside(p) ? { shape: stampDrag.shape, p } : null);
    });
    on(button, "pointerup", (e) => {
      if (stampDrag?.id !== e.pointerId) return;
      const p = coordinate(e, false),
        drag = stampDrag;
      stampDrag = null;
      api.ghost(null);
      if (drag.moved && inside(p)) {
        api.drawing().begin();
        api.drawing().stamp(drag.shape, p, api.settings().stampSize);
        api.drawing().commit();
        api.changed();
      } else if (!drag.moved)
        setStamp(selected === drag.shape ? null : drag.shape);
    });
    on(button, "pointercancel", () => {
      stampDrag = null;
      api.ghost(null);
    });
    on(button, "keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setStamp(
          selected === button.dataset.stamp ? null : button.dataset.stamp,
        );
      }
    });
  }
  function setStamp(value) {
    selected = value;
    for (const b of root.querySelectorAll("[data-stamp]"))
      b.setAttribute("aria-pressed", String(b.dataset.stamp === value));
    api.stampSelected(value);
  }
  function cancel() {
    endCanvas();
    pointers.clear();
    held.clear();
    cancelAnimationFrame(raf);
    raf = 0;
    stampDrag = null;
    api.ghost(null);
    api.drawing().commit();
  }
  on(window, "blur", cancel);
  on(document, "visibilitychange", () => {
    if (document.hidden) cancel();
  });
  // A deliberate back-and-forth drag on the molded top grip is an alternative to the shake button.
  const grip = root.querySelector("[data-shake-grip]");
  let shaking = null;
  on(grip, "pointerdown", (e) => {
    if (api.settings().mode !== "dial" || e.button !== 0) return;
    capture(grip, e);
    shaking = {
      id: e.pointerId,
      x: e.clientX,
      time: performance.now(),
      direction: 0,
      turns: 0,
    };
  });
  on(grip, "pointermove", (e) => {
    if (shaking?.id !== e.pointerId) return;
    const dx = e.clientX - shaking.x;
    if (Math.abs(dx) < 18) return;
    const d = Math.sign(dx),
      now = performance.now();
    if (now - shaking.time > 650) shaking.turns = 0;
    if (shaking.direction && shaking.direction !== d) shaking.turns++;
    shaking.x = e.clientX;
    shaking.direction = d;
    shaking.time = now;
    if (shaking.turns >= 3) {
      shaking = null;
      api.shake();
    }
  });
  on(grip, "pointerup", () => (shaking = null));
  on(grip, "pointercancel", () => (shaking = null));
  return {
    cancel,
    setStamp,
    dispose() {
      disposed = true;
      cancel();
      abort.abort();
    },
    getState: () => ({ pointers: pointers.size, keys: held.size, selected }),
  };
}
