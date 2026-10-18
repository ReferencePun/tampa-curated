import {
  DEFAULTS,
  PRESETS,
  options,
  createDrawing,
  pathDocument,
  readDrawing,
  boardHeight,
  LIMIT,
  clamp,
} from "./model.js";
import { EXAMPLES, examplePath } from "./examples.js";
import { createRenderer } from "./renderer.js";
import { bindInput } from "./input.js";
import { erasePose } from "./erase.js";
import { pngFor, download } from "./export.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}, integration = {}) {
  let config = options({ ...DEFAULTS, ...initial }),
    disposed = false,
    notifying = false,
    running = false,
    renderer,
    input,
    raf = 0,
    last = 0,
    frames = 0,
    progress = 1,
    playing = false,
    erase = null,
    eraser = 0,
    cursor = null,
    ghost = null,
    angleX = 0,
    angleY = 0;
  const drawings = {
      dial: createDrawing("dial"),
      magnetic: createDrawing("magnetic"),
    },
    root = document.createElement("div"),
    abort = new AbortController(),
    signal = abort.signal,
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    urls = new Set(),
    timers = new Set();
  const drawing = () => drawings[config.mode];
  root.className = "dt";
  root.innerHTML = `<style>${styles}</style><header class="dt-head"><div><span class="dt-kicker">23 / THE SMALL PLEASURE OF MAKING A MARK</span><h2>Take a line for a walk.</h2><p>Two little drawing machines. A pair of dials, a magnetic wand, and nowhere in particular to go.</p></div><span class="dt-no" aria-hidden="true">↝</span></header><nav class="dt-modes" aria-label="Drawing toy"><button data-toy="dial"><small>01 / A CONTINUOUS ADVENTURE</small><strong>Twin-dial drawing</strong></button><button data-toy="magnetic"><small>02 / LEAVE A LITTLE TRACE</small><strong>Magnetic board</strong></button></nav><div class="dt-bench"><div class="dt-shell"><div class="dt-grip" data-shake-grip title="Drag rapidly back and forth to shake the twin-dial toy"><span class="dt-brand" data-brand>Wanderline</span><small data-shell-note>TWIN DIAL / ONE UNBROKEN LINE</small></div><div class="dt-bezel"><div class="dt-board"><canvas tabindex="0" role="group" aria-label="Drawing board. Drag to draw; arrow keys move the drawing head. Escape releases focus."></canvas><div class="dt-glass"></div><div class="dt-invitation"><strong data-invitation>Turn either dial.</strong><span data-invitation-note>A LITTLE LINE CAN GO A LONG WAY.</span></div><i class="dt-stylus" hidden aria-hidden="true"></i><span class="dt-ghost" hidden aria-hidden="true"></span><i class="dt-wipe-line" hidden></i></div></div><div class="dt-bottom" data-dials><div class="dt-dial-wrap"><button class="dt-dial" data-dial="x" aria-label="Horizontal drawing knob. Drag around the dial or pull its center. Arrow keys turn it."><i></i></button><span class="dt-axis">← HORIZONTAL →</span></div><div class="dt-console"><strong>A line with no end.</strong><p>Turn the edges. Pull the centers.<br>Two dials. One drawing head.</p><button class="dt-shake" data-erase>Shake to erase ↔</button></div><div class="dt-dial-wrap"><button class="dt-dial" data-dial="y" aria-label="Vertical drawing knob. Drag around the dial or pull its center. Arrow keys turn it."><i></i></button><span class="dt-axis">↕ VERTICAL ↕</span></div></div><div class="dt-magnet-controls" hidden><label class="dt-slider-label"><span>THE LITTLE ERASER</span><span>SLIDE TO SWEEP →</span></label><input class="dt-eraser" data-eraser type="range" min="0" max="1000" step="1" value="0" aria-label="Magnetic eraser position"/><div class="dt-stamp-tray"><button class="dt-stamp" data-stamp="star" aria-label="Star stamp" aria-pressed="false">✶</button><button class="dt-stamp" data-stamp="circle" aria-label="Circle stamp" aria-pressed="false">●</button><button class="dt-stamp" data-stamp="square" aria-label="Square stamp" aria-pressed="false">■</button><span>DRAG A STAMP<br>OR SELECT & TAP</span></div></div></div></div><div class="dt-tools"><button data-undo>↶ Undo</button><button data-redo>↷ Redo</button><label data-stylus-label hidden>Wand<select data-stylus aria-label="Magnetic stylus"><option value="soft">Soft magnet</option><option value="fine">Fine tip</option><option value="eraser">Spot eraser</option></select></label><button data-sweep hidden>Sweep clean →</button><div class="dt-direction-pad" aria-label="Drawing head direction">${[
    ["ArrowLeft", "←"],
    ["ArrowUp", "↑"],
    ["ArrowDown", "↓"],
    ["ArrowRight", "→"],
  ]
    .map(
      ([key, label]) =>
        `<button data-direction="${key}" aria-label="Draw ${key.slice(5).toLowerCase()}">${label}</button>`,
    )
    .join(
      "",
    )}</div></div><p class="dt-hint" data-hint></p><div class="dt-transport"><button data-play>Replay drawing ▷</button><input data-replay-progress type="range" min="0" max="1000" step="1" value="1000" aria-label="Drawing replay position"/><output data-progress>100%</output></div><div class="dt-examples" aria-label="Original path demonstrations">${EXAMPLES.map(([id, name], i) => `<button data-example="${id}"><small>PATH / 0${i + 1}</small><strong>${name}</strong></button>`).join("")}</div><div class="dt-save"><button data-png>Save drawing PNG ↓</button><button data-json>Save drawing JSON ↓</button><label class="dt-file">Import path / drawing<input data-import-drawing type="file" accept=".json,application/json" aria-label="Import path or drawing JSON"/></label><select data-recipe aria-label="Toy style preset"><option value="">Toy styles</option>${Object.entries(
    PRESETS,
  )
    .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
    .join(
      "",
    )}</select></div><p class="dt-status" role="status" aria-live="polite">Your first line is waiting at the little drawing head.</p><p class="dt-footnote">Each toy keeps its own drawing while you switch. Save JSON before leaving; Lab presets save the toy settings. Original toy designs, with a fondness for simpler things. <span class="dt-limit" data-count></span></p>`;
  host.append(root);
  const $ = (q) => root.querySelector(q),
    all = (q) => [...root.querySelectorAll(q)],
    canvas = $("canvas"),
    board = $(".dt-board"),
    shell = $(".dt-shell");
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal });
  const say = (s) => ($(".dt-status").textContent = s);
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function sync() {
    const state = drawing().state(),
      mag = config.mode === "magnetic";
    root.dataset.mode = config.mode;
    root.dataset.frame = config.frameStyle;
    root.dataset.events = String(state.events.length);
    root.dataset.cursor = JSON.stringify(state.cursor);
    root.dataset.playing = String(playing);
    root.dataset.erasing = String(!!erase);
    root.dataset.progress = progress.toFixed(4);
    root.dataset.undo = String(state.undo);
    root.dataset.redo = String(state.redo);
    root.dataset.eraser = String(eraser);
    for (const b of all("[data-toy]"))
      b.setAttribute("aria-pressed", String(b.dataset.toy === config.mode));
    $("[data-dials]").hidden = mag;
    $(".dt-magnet-controls").hidden = !mag;
    $("[data-stylus-label]").hidden = !mag;
    $("[data-sweep]").hidden = !mag;
    $("[data-stylus]").value = config.stylus;
    $("[data-brand]").textContent = mag ? "Softfield" : "Wanderline";
    $("[data-shell-note]").textContent = mag
      ? "MAGNETIC WAND / A QUIET IMPRESSION"
      : "TWIN DIAL / ONE UNBROKEN LINE";
    board.style.aspectRatio = `1000 / ${boardHeight(config.boardSize)}`;
    $("[data-undo]").disabled = !state.undo || !!erase;
    $("[data-redo]").disabled = !state.redo || !!erase;
    $("[data-play]").disabled = !state.events.length || !!erase;
    $("[data-play]").textContent = playing
      ? "Pause replay Ⅱ"
      : "Replay drawing ▷";
    $("[data-replay-progress]").value = String(progress * 1000);
    $("[data-replay-progress]").disabled = !!erase;
    $("[data-progress]").textContent = Math.round(progress * 100) + "%";
    $("[data-eraser]").value = String(eraser * 1000);
    $("[data-eraser]").disabled = !!erase;
    $("[data-count]").textContent =
      `${state.events.length.toLocaleString()} MARKS`;
    $("[data-invitation]").textContent = mag
      ? "A wand, a mark, a memory."
      : "Turn either dial.";
    $("[data-invitation-note]").textContent = mag
      ? "DRAW DIRECTLY. LIFT. BEGIN SOMEWHERE ELSE."
      : "ONE LINE. NO LIFTING. KEEP GOING.";
    $(".dt-invitation").hidden = state.events.length > 0;
    $("[data-hint]").textContent = mag
      ? "Draw with the wand. Drag a stamp onto the board, or select one and tap. Pull the eraser along its track: only the part it passes over disappears."
      : "Drag around either dial; pull its center for fine control. Or drag the silver screen, use arrow keys, or hold the direction buttons. The head never lifts. Shake using the button or a quick back-and-forth drag on the top grip.";
    $(".dt-stylus").hidden = !mag || !cursor;
    $(".dt-ghost").hidden = !ghost;
    for (const b of all(
      "[data-example], [data-toy], [data-recipe], [data-import-drawing], [data-sweep], [data-erase]",
    ))
      b.disabled = !!erase;
  }
  function draw() {
    if (disposed || !renderer) return;
    sync();
    const state = drawing().state(),
      pose = erase
        ? erasePose(config.mode, erase.p, motion.matches)
        : { x: 0, y: 0, angle: 0, opacity: 1, wipe: null };
    shell.style.transform = `translate(${pose.x}px,${pose.y}px) rotate(${pose.angle}deg)`;
    const stats = renderer.render(state, config, {
      progress,
      opacity: pose.opacity,
      wipe: pose.wipe,
      cursor:
        config.mode === "dial" && !playing && !erase ? state.cursor : null,
    });
    frames++;
    root.dataset.frames = String(frames);
    root.dataset.applied = String(renderer.getState().applied);
    root.dataset.width = String(canvas.width);
    root.dataset.height = String(canvas.height);
    report({
      ...stats,
      frames,
      fps: running && (playing || erase) ? 60 : 0,
      running: running && Boolean(playing || erase),
      renderer: "Canvas 2D · cached silver / magnetic cells",
    });
    if (cursor) {
      $(".dt-stylus").style.left = cursor[0] * 100 + "%";
      $(".dt-stylus").style.top = cursor[1] * 100 + "%";
    }
    if (ghost) {
      const g = $(".dt-ghost");
      g.textContent = { star: "✶", circle: "●", square: "■" }[ghost.shape];
      g.style.left = ghost.p[0] * 100 + "%";
      g.style.top = ghost.p[1] * 100 + "%";
      g.style.width = config.stampSize / 10 + "%";
      g.style.height =
        (config.stampSize / boardHeight(config.boardSize)) * 100 + "%";
    }
    $("[data-dial=x]").style.setProperty("--angle", angleX + "deg");
    $("[data-dial=y]").style.setProperty("--angle", angleY + "deg");
  }
  function wake() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!disposed && running && !document.hidden && (playing || erase))
      raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (disposed || !running || document.hidden) return;
    const dt = last ? Math.min(0.06, (now - last) / 1000) : 0;
    last = now;
    if (erase) {
      erase.p = Math.min(
        1,
        erase.p + dt / (config.mode === "dial" ? 1.05 : 1.2),
      );
      if (config.mode === "magnetic") {
        eraser = erase.p;
        showWipe(eraser);
      }
      if (erase.p >= 1) {
        drawing().clear();
        erase = null;
        angleX = angleY = 0;
        hideWipe();
        say("A fresh board. The previous drawing is still in Undo.");
      }
    }
    if (playing) {
      const duration = clamp(4 + drawing().state().total * 3, 5, 45);
      progress = Math.min(1, progress + (dt * config.replaySpeed) / duration);
      if (progress >= 1) playing = false;
    }
    draw();
    if (playing || erase) raf = requestAnimationFrame(tick);
  }
  function stopReplay() {
    playing = false;
    progress = 1;
    wake();
  }
  function prepare() {
    if (disposed || erase || !renderer) return false;
    if (drawing().state().events.length >= LIMIT) {
      say(
        "This drawing has reached 16,000 marks. Save it, then clear the board.",
      );
      return false;
    }
    stopReplay();
    return true;
  }
  function showWipe(value) {
    $(".dt-wipe-line").hidden = false;
    $(".dt-wipe-line").style.left = value * 100 + "%";
  }
  function hideWipe() {
    $(".dt-wipe-line").hidden = true;
  }
  function reset() {
    input?.cancel();
    stopReplay();
    cursor = null;
    ghost = null;
    if (motion.matches || config.eraseBehavior === "instant") {
      drawing().clear();
      angleX = angleY = 0;
      eraser = config.mode === "magnetic" ? 1 : 0;
      draw();
      say("Board cleared. Undo brings it back.");
      return;
    }
    erase = { p: 0 };
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    draw();
    wake();
  }
  function history(redo = false) {
    input?.cancel();
    if (erase) return;
    stopReplay();
    if (redo) drawing().redo();
    else drawing().undo();
    renderer?.invalidate();
    draw();
    say(redo ? "The next mark, returned." : "One gesture undone.");
  }
  function apply(next) {
    input?.cancel();
    const before = config;
    config = options(next);
    if (before.mode !== config.mode) {
      erase = null;
      stopReplay();
      eraser = 0;
      cursor = null;
      ghost = null;
      input?.setStamp(null);
      hideWipe();
    }
    if (before.stylus !== config.stylus) input?.setStamp(null);
    sync();
    if (before.boardSize !== config.boardSize) resize();
    else draw();
  }
  function change(patch) {
    apply({ ...config, ...patch });
    publish();
  }
  function replay() {
    if (erase || !drawing().state().events.length) return;
    input?.cancel();
    progress = 0;
    playing = true;
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    draw();
    wake();
  }
  function resize() {
    if (renderer) {
      renderer.resize(board.clientWidth, board.clientHeight);
      draw();
    }
  }
  try {
    renderer = createRenderer(canvas);
    root.dataset.ready = "true";
  } catch (error) {
    root.dataset.ready = "fallback";
    canvas.hidden = true;
    const p = document.createElement("p");
    p.className = "dt-fallback";
    p.textContent =
      "This drawing toy needs Canvas 2D. You can still read the controls and download the reusable source.";
    board.append(p);
    say(error.message);
  }
  input = bindInput(root, {
    settings: () => config,
    drawing,
    prepare,
    changed: draw,
    angle(dx, dy) {
      angleX += dx;
      angleY += dy;
    },
    cursor(value) {
      cursor = value;
    },
    ghost(value) {
      ghost = value;
      draw();
    },
    history,
    shake: reset,
    stampSelected(shape) {
      say(
        shape
          ? `${shape[0].toUpperCase() + shape.slice(1)} stamp selected. Tap the board, or select it again to return to the wand.`
          : "The wand is ready.",
      );
    },
  });
  for (const b of all("[data-toy]"))
    on(b, "click", () => change({ mode: b.dataset.toy }));
  on($("[data-stylus]"), "change", (e) => change({ stylus: e.target.value }));
  on($("[data-erase]"), "click", reset);
  on($("[data-sweep]"), "click", reset);
  on($("[data-undo]"), "click", () => history());
  on($("[data-redo]"), "click", () => history(true));
  on($("[data-play]"), "click", () => {
    if (playing) {
      playing = false;
      wake();
      draw();
    } else if (progress < 1 && progress > 0) {
      playing = true;
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
      wake();
      draw();
    } else replay();
  });
  on($("[data-replay-progress]"), "input", (e) => {
    playing = false;
    progress = Number(e.target.value) / 1000;
    wake();
    draw();
  });
  on($("[data-eraser]"), "input", (e) => {
    if (!prepare()) return;
    const value = Number(e.target.value) / 1000;
    drawing().begin();
    drawing().wipe(eraser, value);
    eraser = value;
    showWipe(value);
    draw();
  });
  for (const event of ["change", "pointerup", "blur"])
    on($("[data-eraser]"), event, () => {
      drawing().commit();
      hideWipe();
      draw();
    });
  function loadPath(value) {
    const doc = pathDocument(value, config.mode, config.lineWidth);
    input.cancel();
    stopReplay();
    drawing().load(doc);
    renderer?.invalidate();
    draw();
    say(
      "A continuous path is on the board. Replay it, or keep drawing from its last point.",
    );
  }
  for (const b of all("[data-example]"))
    on(b, "click", () => loadPath(examplePath(b.dataset.example)));
  on($("[data-recipe]"), "change", (e) => {
    const preset = PRESETS[e.target.value];
    if (preset) {
      change(preset.settings);
      say("Toy style changed. Your two drawings are still here.");
    }
    e.target.value = "";
  });
  function save(blob, name) {
    const revoke = download(blob, name);
    urls.add(revoke);
    const timer = setTimeout(() => {
      revoke();
      urls.delete(revoke);
      timers.delete(timer);
    }, 1500);
    timers.add(timer);
  }
  on($("[data-png]"), "click", async (e) => {
    e.target.disabled = true;
    try {
      const s = drawing().state(),
        snapshot = { ...s, events: s.events.slice(), prefix: s.prefix.slice() };
      const blob = await pngFor(snapshot, { ...config }, progress);
      if (!disposed) {
        save(blob, `${config.mode}-drawing.png`);
        say("Your visible drawing saved at 1,600 pixels wide.");
      }
    } catch (error) {
      if (!disposed) say(error.message);
    } finally {
      if (!disposed) e.target.disabled = false;
    }
  });
  on($("[data-json]"), "click", () =>
    save(
      new Blob([JSON.stringify(drawing().serialize())], {
        type: "application/json",
      }),
      `${config.mode}-drawing.json`,
    ),
  );
  on($("[data-import-drawing]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 4000000)
        throw Error("Choose a JSON file smaller than 4 MB.");
      const value = JSON.parse(await file.text());
      if (disposed) return;
      if (value.kind === "drawing-toy") {
        const doc = readDrawing(value);
        change({ mode: doc.mode });
        stopReplay();
        drawing().load(doc);
        renderer?.invalidate();
        draw();
        say("Drawing restored, including its recorded eraser movements.");
      } else loadPath(value);
    } catch (error) {
      say(`Drawing unchanged. ${error.message}`);
    } finally {
      e.target.value = "";
    }
  });
  on(motion, "change", () => {
    if (motion.matches && erase) {
      drawing().clear();
      erase = null;
      hideWipe();
      draw();
    }
    wake();
  });
  on(document, "visibilitychange", wake);
  const observer = new ResizeObserver(resize);
  observer.observe(board);
  if (integration.path) loadPath(integration.path);
  else if (integration.document) {
    const doc = readDrawing(integration.document);
    config.mode = doc.mode;
    drawing().load(doc);
  }
  sync();
  resize();
  return {
    update(next) {
      if (!notifying && !disposed) apply(next);
    },
    setRunning(value) {
      running = Boolean(value);
      if (!running) input.cancel();
      wake();
    },
    replay,
    getState: () => ({
      settings: { ...config },
      drawing: drawing().serialize(),
      progress,
      playing,
      erase: erase?.p,
      frames,
      running,
      disposed,
      input: input.getState(),
      renderer: renderer?.getState(),
    }),
    serialize: () => drawing().serialize(),
    loadPath,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      input.dispose();
      abort.abort();
      observer.disconnect();
      renderer?.dispose();
      drawings.dial.dispose();
      drawings.magnetic.dispose();
      timers.forEach(clearTimeout);
      timers.clear();
      urls.forEach((fn) => fn());
      urls.clear();
      root.remove();
    },
  };
}
