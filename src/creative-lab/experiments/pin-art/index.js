import { options, DEFAULTS, PRESETS, clamp, readField } from "./model.js";
import { createPinField } from "./engine.js";
import { imageHeightMap } from "./images.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}, integration = {}) {
  let config = options({ ...DEFAULTS, ...initial }),
    engine = null,
    disposed = false,
    running = false,
    notifying = false,
    tool = "press",
    drag = null,
    hover = null,
    previous = null,
    pending = null,
    inputRAF = 0,
    uploadSerial = 0,
    localMap = null,
    savedContext = null,
    keyPoint = [0, 0],
    keyPressed = false,
    lost = false;
  const root = document.createElement("div");
  root.className = "pa";
  root.innerHTML = `<style>${styles}</style><header class="pa-head"><div><span class="pa-kicker">CONTOUR / A FIELD OF SMALL POSSIBILITIES</span><h2>Leave an impression.</h2><p>Thousands of tiny rods. One surface that remembers your hand. Press, lift, turn it toward the light.</p></div><svg class="pa-mark" viewBox="0 0 72 72" aria-hidden="true" fill="none" stroke="currentColor" stroke-width=".8">${Array.from({ length: 5 }, (_, i) => `<path d="M${10 + i * 11} 61V${12 + (i % 3) * 9}"/><ellipse cx="${10 + i * 11}" cy="${12 + (i % 3) * 9}" rx="4" ry="2"/>`).join("")}<path d="M4 55l62 0M4 62h62"/></svg></header><nav class="pa-modes" aria-label="Impression modes">${[
    ["pointer", "01 / YOUR HAND", "Pointer press"],
    ["stamp", "02 / SMALL OBJECTS", "Shape stamps"],
    ["image", "03 / LIGHT TO DEPTH", "Height maps"],
    ["wave", "04 / A MOVING FIELD", "Waves"],
  ]
    .map(
      ([id, label, title]) =>
        `<button data-mode-select="${id}"><small>${label}</small><strong>${title}</strong></button>`,
    )
    .join(
      "",
    )}</nav><div class="pa-tools"><div class="pa-tool-group" aria-label="Pointer tool"><button data-tool="press" aria-pressed="true">Sculpt</button><button data-tool="rotate" aria-pressed="false">Rotate view</button></div><select data-direction aria-label="Pin movement direction"><option value="out">Lift outward ↑</option><option value="in">Press inward ↓</option></select><label><input data-hold type="checkbox" checked/>Hold impression</label><select data-shape aria-label="Object stamp shape" hidden><option value="sphere">Sphere</option><option value="cube">Soft cube</option><option value="ring">Torus ring</option><option value="star">Star prism</option></select></div><div class="pa-stage" tabindex="0" role="group" aria-label="Pin sculpture. Drag to sculpt, or choose Rotate view. Arrow keys move the contact point; Space presses it. Shift and arrows rotate the board. Escape releases."><canvas aria-label="Three-dimensional field of individually sliding pins"></canvas><img data-static src="${new URL("./assets/preview.svg", import.meta.url).href}" hidden alt="Static illustration of a pin relief with a circular impression"/><div class="pa-stage-top"><span>CONTOUR / IMPRESSION NO. 24</span><span data-pin-count></span></div><div class="pa-caption"><strong data-caption>Every point, a possibility.</strong><span data-subcaption>DRAG TO SCULPT · TURN TO SEE THE DEPTH</span></div><div class="pa-view"><button data-zoom="-" aria-label="Zoom out">−</button><button data-zoom="+" aria-label="Zoom in">+</button><button data-home aria-label="Reset view">↺</button></div><p class="pa-error" role="status" hidden></p></div><p class="pa-hint" data-hint></p><div class="pa-actions"><button data-center>Press the center</button><button data-release>Release all impressions</button><button data-wave-play hidden>Pause waves Ⅱ</button><button class="pa-reset" data-flat>Reset to flat ↶</button></div><p class="pa-keyboard">Arrow keys move a contact point; Space presses. Shift + arrows rotates the board. + / − zooms. Escape releases your grip.</p><section class="pa-panel" data-image-panel hidden><h3>A little light becomes a landscape.</h3><p>Choose a grayscale height map or any local image. Bright areas lift the pins; dark areas stay lower. This maps brightness to height—it does not infer a face’s 3D shape from a normal photograph.</p><div class="pa-row"><label class="pa-file">Choose local image<input data-image type="file" accept="image/png,image/jpeg,image/webp,image/avif" aria-label="Choose a local height map"/></label><label><input data-invert type="checkbox"/>Invert brightness</label><button data-original>Use original study</button></div><p data-image-name>Original procedural relief. Your images stay on this device.</p></section><section class="pa-panel" data-wave-panel hidden><h3>A surface, breathing quietly.</h3><p>Pause at any moment to inspect the sculpture. The pins still move along their own guides.</p><div class="pa-row"><select data-wave aria-label="Wave pattern"><option value="ripple">Concentric ripple</option><option value="tide">Passing tide</option><option value="interference">Crossed waves</option></select><label>Phase<input data-phase type="range" min="0" max="100" step=".1" aria-label="Wave phase"/></label></div></section><div class="pa-studies" aria-label="Original height studies">${[
    ["orbit", "01 / THE CIRCLE", "Orbital relief"],
    ["palm", "02 / A HAND", "A palm, remembered"],
    ["landscape", "03 / A LANDSCAPE", "Soft topography"],
  ]
    .map(
      ([id, n, t]) =>
        `<button data-sample="${id}"><small>${n}</small><strong>${t}</strong></button>`,
    )
    .join(
      "",
    )}</div><div class="pa-save"><button data-png>Save image ↓</button><button data-relief>Save relief JSON ↓</button><label class="pa-file">Load relief<input data-load type="file" accept=".json,application/json" aria-label="Import pin relief JSON"/></label><select data-preset aria-label="Pin art preset"><option value="">Material studies</option>${Object.entries(
    PRESETS,
  )
    .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
    .join(
      "",
    )}</select></div><p class="pa-status" role="status" aria-live="polite">An orbital relief to begin. Press into it, or start with a flat board.</p><p class="pa-note">Private images and impressions stay in this session. Save a relief to keep it. Lab presets save settings; source exports include the original studies.</p><div class="pa-meter"><span>PINS <b data-count></b></span><span>DISPLACED <b data-displaced></b></span><span>TRAVEL <b data-travel></b></span><span data-renderer>INSTANCED / ONE AXIS EACH</span></div>`;
  host.append(root);
  const abort = new AbortController(),
    signal = abort.signal,
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    urls = new Set(),
    timers = new Set(),
    $ = (q) => root.querySelector(q),
    all = (q) => [...root.querySelectorAll(q)],
    stage = $(".pa-stage"),
    canvas = $("canvas");
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal }),
    say = (s) => ($(".pa-status").textContent = s);
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function sync() {
    root.dataset.mode = config.mode;
    root.dataset.hold = String(config.hold);
    stage.dataset.tool = tool;
    for (const b of all("[data-mode-select]"))
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.modeSelect === config.mode),
      );
    for (const b of all("[data-tool]"))
      b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    $("[data-shape]").hidden = config.mode !== "stamp";
    $("[data-shape]").value = config.shape;
    $("[data-direction]").value = config.direction;
    $("[data-hold]").checked = config.hold;
    $("[data-invert]").checked = config.invert;
    $("[data-wave]").value = config.wave;
    $("[data-phase]").value = String(config.phase);
    $("[data-image-panel]").hidden = config.mode !== "image";
    $("[data-wave-panel]").hidden = config.mode !== "wave";
    $("[data-wave-play]").hidden = config.mode !== "wave" && !config.autoWave;
    $("[data-wave-play]").textContent = config.autoWave
      ? "Pause waves Ⅱ"
      : "Play waves ▷";
    $("[data-caption]").textContent = localMap
      ? "Light, made tangible."
      : {
          orbit: "A circle, held in silver.",
          palm: "A small trace of a hand.",
          landscape: "A landscape under the fingertips.",
          blank: "Every point, a possibility.",
        }[config.sample];
    $("[data-subcaption]").textContent =
      tool === "rotate"
        ? "DRAG TO ROTATE · INSPECT THE LITTLE RODS"
        : "DRAG TO SCULPT · TURN TO SEE THE DEPTH";
    $("[data-hint]").textContent =
      tool === "rotate"
        ? "Drag the board to rotate it. The guides remain fixed; every pin slides on the same axis."
        : config.hold
          ? "Press and drag to leave a lasting impression. Switch between lifting outward and pressing inward. Release all lets the pins settle back."
          : "Press and hold to displace the pins. Lift your pointer and the temporary impression springs back.";
  }
  function frame(stats) {
    if (disposed) return;
    root.dataset.frames = String(stats.frames);
    root.dataset.count = String(stats.count);
    root.dataset.min = stats.min.toFixed(5);
    root.dataset.max = stats.max.toFixed(5);
    root.dataset.energy = stats.energy.toFixed(6);
    root.dataset.moved = String(stats.moved);
    root.dataset.phase = stats.phase.toFixed(5);
    root.dataset.builds = String(stats.builds);
    root.dataset.drawCalls = String(stats.drawCalls);
    root.dataset.quality = String(stats.quality);
    $("[data-pin-count]").textContent =
      stats.count.toLocaleString() + " SLIDING PINS";
    $("[data-count]").textContent = stats.count.toLocaleString();
    $("[data-displaced]").textContent = stats.moved.toLocaleString();
    $("[data-travel]").textContent =
      ((config.pinLength - config.boardDepth) / 2 - 0.09).toFixed(2) +
      " / EACH WAY";
    report({ ...stats, primitives: stats.count });
  }
  function fail(message) {
    $(".pa-error").hidden = false;
    $(".pa-error").textContent = message;
    $("[data-static]").hidden = false;
    for (const b of all(
      "[data-center],[data-release],[data-flat],[data-png],[data-relief]",
    ))
      b.disabled = true;
    root.dataset.ready = "fallback";
  }
  function start() {
    try {
      engine = createPinField(canvas, config, frame);
      engine.setReduced(motion.matches);
      if (savedContext) {
        engine.restore(savedContext);
        savedContext = null;
      } else if (integration.heightInput)
        engine.setProcedural(integration.heightInput, { immediate: true });
      engine.resize(stage.clientWidth, stage.clientHeight);
      engine.render();
      engine.setRunning(running);
      $(".pa-error").hidden = true;
      $("[data-static]").hidden = true;
      for (const b of all(
        "[data-center],[data-release],[data-flat],[data-png],[data-relief]",
      ))
        b.disabled = false;
      root.dataset.ready = "true";
    } catch (error) {
      engine?.dispose();
      engine = null;
      fail(
        "This sculptural field needs WebGL2. The static study and source remain available.",
      );
      say(error.message);
    }
  }
  function apply(next) {
    const old = config;
    config = options(next);
    if (old.sample !== config.sample) {
      localMap = null;
      $("[data-image-name]").textContent =
        "Original procedural relief. Your images stay on this device.";
    }
    engine?.update(config);
    if (localMap && old.invert !== config.invert)
      engine?.setHeightMap(localMap, { invert: config.invert });
    sync();
  }
  function change(patch) {
    apply({ ...config, ...patch });
    publish();
  }
  function resume() {
    if (!motion.matches)
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
  }
  function flush() {
    inputRAF = 0;
    if (!pending || !engine) return;
    const p = pending;
    pending = null;
    engine.press(p.point, previous || p.point, p.pressure);
    previous = p.point;
  }
  function queue(point, pressure = 1) {
    pending = { point, pressure };
    if (!inputRAF) inputRAF = requestAnimationFrame(flush);
  }
  function contact(e) {
    const r = stage.getBoundingClientRect();
    return engine?.hit(e.clientX - r.left, e.clientY - r.top);
  }
  function release() {
    if (inputRAF) {
      cancelAnimationFrame(inputRAF);
      inputRAF = 0;
      flush();
    }
    pending = null;
    previous = null;
    drag = null;
    keyPressed = false;
    engine?.releasePointer();
  }
  on(stage, "pointerdown", (e) => {
    if (e.target !== canvas || e.button !== 0 || !engine) return;
    e.preventDefault();
    stage.focus({ preventScroll: true });
    stage.setPointerCapture(e.pointerId);
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      rotation: config.rotation,
      tilt: config.tilt,
    };
    if (tool === "press") {
      const p = contact(e);
      if (p) {
        resume();
        previous = p;
        engine.press(
          p,
          p,
          e.pointerType === "pen" ? Math.max(0.15, e.pressure) : 1,
        );
      }
    }
  });
  on(stage, "pointermove", (e) => {
    if (!engine || (e.target !== canvas && !drag)) return;
    if (drag && e.pointerId === drag.id) {
      if (tool === "rotate") {
        config = options({
          ...config,
          rotation: drag.rotation + (e.clientX - drag.x) * 0.22,
          tilt: drag.tilt + (e.clientY - drag.y) * 0.18,
        });
        engine.update(config);
      } else {
        const p = contact(e);
        if (p)
          queue(p, e.pointerType === "pen" ? Math.max(0.15, e.pressure) : 1);
      }
    } else if (e.pointerType !== "touch" && tool === "press") {
      hover = contact(e);
      if (!inputRAF)
        inputRAF = requestAnimationFrame(() => {
          inputRAF = 0;
          if (pending) flush();
          else engine?.hover(hover);
        });
    }
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    on(stage, type, (e) => {
      if (drag?.id !== e.pointerId) return;
      release();
      if (stage.hasPointerCapture(e.pointerId))
        stage.releasePointerCapture(e.pointerId);
      publish();
    });
  on(stage, "pointerleave", () => {
    if (!drag) {
      hover = null;
      engine?.hover(null);
    }
  });
  on(window, "blur", release);
  on(stage, "keydown", (e) => {
    if (e.target !== stage) return;
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (arrows.includes(e.key)) {
      e.preventDefault();
      const x = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0,
        y = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
      if (e.shiftKey || tool === "rotate")
        change({
          rotation: config.rotation + x * 5,
          tilt: config.tilt + y * 5,
        });
      else {
        keyPoint = [
          clamp(keyPoint[0] + x * 0.3, -5.8, 5.8),
          clamp(keyPoint[1] + y * 0.3, -3.8, 3.8),
        ];
        engine?.hover(keyPoint);
        if (keyPressed) engine?.press(keyPoint);
      }
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!keyPressed) {
        resume();
        keyPressed = true;
        engine?.press(keyPoint);
      }
    } else if (["+", "=", "-"].includes(e.key)) {
      e.preventDefault();
      change({ zoom: config.zoom + (e.key === "-" ? -0.1 : 0.1) });
    } else if (e.key === "Escape") {
      release();
      stage.blur();
    }
  });
  on(window, "keyup", (e) => {
    if ((e.key === " " || e.key === "Enter") && keyPressed) release();
  });
  for (const b of all("[data-tool]"))
    on(b, "click", () => {
      release();
      tool = b.dataset.tool;
      sync();
    });
  for (const b of all("[data-mode-select]"))
    on(b, "click", () => {
      release();
      change({
        mode: b.dataset.modeSelect,
        autoWave: b.dataset.modeSelect === "wave",
      });
      if (config.autoWave) resume();
    });
  for (const key of ["direction", "shape", "wave"])
    on($(`[data-${key}]`), "change", (e) => change({ [key]: e.target.value }));
  on($("[data-hold]"), "change", (e) => change({ hold: e.target.checked }));
  on($("[data-invert]"), "change", (e) => change({ invert: e.target.checked }));
  on($("[data-phase]"), "input", (e) =>
    change({ phase: +e.target.value, autoWave: false }),
  );
  on($("[data-center]"), "click", () => {
    if (!engine) return;
    resume();
    keyPoint = [0, 0];
    engine.press(keyPoint);
    if (config.hold) engine.releasePointer();
    else {
      const t = setTimeout(() => {
        engine?.releasePointer();
        timers.delete(t);
      }, 800);
      timers.add(t);
    }
    say(
      config.hold
        ? "A small impression, held in the center."
        : "Hold Space over the field for a temporary press, or turn on Hold impression.",
    );
  });
  function clear(message) {
    release();
    change({ mode: "pointer", autoWave: false, sample: "blank" });
    engine?.clear();
    say(message);
  }
  on($("[data-release]"), "click", () => {
    resume();
    clear("Released. The pins are settling back into their guides.");
  });
  on($("[data-flat]"), "click", () => {
    resume();
    clear("A flat field, ready for another impression.");
  });
  on($("[data-wave-play]"), "click", () => {
    change({ autoWave: !config.autoWave });
    if (config.autoWave) resume();
  });
  for (const b of all("[data-zoom]"))
    on(b, "click", () =>
      change({ zoom: config.zoom + (b.dataset.zoom === "+" ? 0.1 : -0.1) }),
    );
  on($("[data-home]"), "click", () =>
    change({ rotation: DEFAULTS.rotation, tilt: DEFAULTS.tilt, zoom: 1 }),
  );
  for (const b of all("[data-sample]"))
    on(b, "click", () => {
      localMap = null;
      change({ sample: b.dataset.sample, autoWave: false });
      engine?.setSample(config.sample);
      say("An original height study. Rotate the board to inspect its contour.");
    });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (!p) return;
    localMap = null;
    apply(p.settings);
    engine?.setSample(config.sample);
    publish();
    e.target.value = "";
    if (config.autoWave) resume();
    say("Material study applied. Every pin is still independently movable.");
  });
  on($("[data-image]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const serial = ++uploadSerial;
    try {
      const map = await imageHeightMap(file);
      if (disposed || serial !== uploadSerial) return;
      change({ mode: "image", autoWave: false });
      localMap = map;
      engine?.setHeightMap(map, { invert: config.invert });
      $("[data-image-name]").textContent =
        `${map.name} · ${map.width} × ${map.height} samples · processed locally`;
      sync();
      say(
        "Your image is now a height field. Brightness, rather than inferred scene depth, controls each pin.",
      );
    } catch (error) {
      if (!disposed) say(error.message);
    } finally {
      e.target.value = "";
    }
  });
  on($("[data-original]"), "click", () => {
    localMap = null;
    engine?.setSample(config.sample);
    $("[data-image-name]").textContent =
      "Original procedural relief. Your images stay on this device.";
    sync();
  });
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    urls.add(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    const t = setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      timers.delete(t);
    }, 1500);
    timers.add(t);
  }
  on($("[data-png]"), "click", async (e) => {
    if (!engine) return;
    e.target.disabled = true;
    try {
      const blob = await engine.exportPNG();
      if (!disposed) {
        download(blob, "pin-art-sculpture.png");
        say("The current sculpture and viewpoint saved as PNG.");
      }
    } catch (error) {
      if (!disposed) say(error.message);
    } finally {
      if (!disposed) e.target.disabled = false;
    }
  });
  on($("[data-relief]"), "click", () => {
    if (engine)
      download(
        new Blob([JSON.stringify(engine.serialize())], {
          type: "application/json",
        }),
        "pin-art-relief.json",
      );
  });
  on($("[data-load]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1500000)
        throw Error("Choose a relief file below 1.5 MB.");
      const doc = readField(JSON.parse(await file.text()));
      if (disposed) return;
      localMap = null;
      engine?.load({ ...doc, values: Array.from(doc.values) });
      config = doc.settings;
      sync();
      publish();
      say("The saved sculpture is restored.");
    } catch (error) {
      if (!disposed) say("Relief unchanged. " + error.message);
    } finally {
      e.target.value = "";
    }
  });
  on(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    if (disposed) return;
    lost = true;
    engine?.setLost();
    release();
    savedContext = engine?.snapshot();
    engine?.dispose();
    engine = null;
    fail("Graphics paused. Waiting to restore the pin field.");
  });
  on(canvas, "webglcontextrestored", () => {
    if (disposed) return;
    lost = false;
    start();
  });
  on(motion, "change", () => engine?.setReduced(motion.matches));
  const observer = new ResizeObserver(() => {
    engine?.resize(stage.clientWidth, stage.clientHeight);
    engine?.render();
  });
  observer.observe(stage);
  sync();
  start();
  return {
    update(next) {
      if (!disposed && !notifying) apply(next);
    },
    setRunning(value) {
      running = Boolean(value);
      if (!running) release();
      engine?.setRunning(running);
    },
    replay() {
      engine?.replay();
    },
    getEngine: () => engine,
    getState: () => ({
      settings: { ...config },
      localImage: localMap?.name || null,
      tool,
      lost,
      disposed,
      ...engine?.getState(),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      uploadSerial++;
      cancelAnimationFrame(inputRAF);
      inputRAF = 0;
      abort.abort();
      observer.disconnect();
      engine?.dispose();
      engine = null;
      timers.forEach(clearTimeout);
      urls.forEach(URL.revokeObjectURL);
      timers.clear();
      urls.clear();
      localMap = null;
      root.remove();
    },
  };
}
