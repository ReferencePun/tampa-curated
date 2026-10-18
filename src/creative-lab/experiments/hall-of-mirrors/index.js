import { PRESETS, options, clamp } from "./model.js";
import { createHallViewer } from "./viewer.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let settings = options(initial),
    viewer,
    active = false,
    disposed = false,
    raf = 0,
    frames = 0,
    timer = 0,
    rebuildTimer = 0,
    lost = false,
    auto = false,
    last = 0,
    pointer = [0, 0],
    targetPointer = [0, 0],
    drag = null,
    lastStats;
  const abort = new AbortController(),
    signal = abort.signal,
    motion = matchMedia("(prefers-reduced-motion:reduce)"),
    root = document.createElement("div");
  root.className = "hm";
  root.innerHTML = `<style>${styles}</style><header class="hm-head"><div><span class="hm-eyebrow">19 / STUDIES IN REFLECTED SPACE</span><h2>The room beyond the room.</h2><p>A pencil hall, four looking glasses, and a perspective that refuses to end. Scroll into the drawing; return by retracing your steps.</p></div><svg class="hm-mark" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width=".7" aria-hidden="true"><path d="M8 12v76M92 12v76M13 12v76M87 12v76M14 24l72 13-72 14 72 14-72 13M50 4v92"/><circle cx="50" cy="50" r="38" stroke-dasharray="1 5"/></svg></header><div class="hm-tools"><select data-version aria-label="Mirror configuration">${Object.entries(
    PRESETS,
  )
    .map(
      ([key, p], i) => `<option value="${key}">0${i + 1} / ${p.name}</option>`,
    )
    .join(
      "",
    )}</select><button data-inspect aria-pressed="false">Look around</button><button data-play aria-pressed="false">Play the journey</button><button data-start>Return to the threshold ↶</button></div><p class="hm-portal-note" hidden><strong>An invented passage.</strong> The four side mirrors use physical reflections. The doorway at the far end is an artistic portal to a different chamber; it is not a mirror.</p><div class="hm-scroll" tabindex="0" role="region" aria-label="Hall of mirrors. Scroll to travel, or use the journey timeline."><div class="hm-runway"><div class="hm-viewport"><canvas aria-label="Three-dimensional pencil corridor with live planar reflections"></canvas><img class="hm-plate" src="${new URL("./assets/preview.svg", import.meta.url).href}" alt="Static architectural drawing of the hall of mirrors" hidden/><div class="hm-furniture" aria-hidden="true"><div class="hm-plate-head"><span>SECTION XIX / OPTICAL STUDY</span><span data-projection>PLANAR REFLECTIONS</span></div><div class="hm-plate-foot"><span class="hm-phase">At the threshold</span><span class="hm-direction">a room, remembered<br>by another room.</span></div></div><p class="hm-error" role="status" hidden></p></div></div></div><div class="hm-timeline"><label>Journey through the hall</label><output data-percent>0%</output><input data-journey type="range" min="0" max="100" step=".01" value="0" aria-label="Scroll travel progress"/></div><div class="hm-chapters"><button data-chapter="0">THRESHOLD</button><button data-chapter="30">REFLECTIONS</button><button data-chapter="60">BETWEEN MIRRORS</button><button data-chapter="96">OTHER CHAMBER</button></div><footer class="hm-info"><p class="hm-status" role="status">Scroll inside the drawing. Reflections follow your viewpoint.</p><span class="hm-budget"></span></footer>`;
  host.append(root);
  const $ = (q) => root.querySelector(q),
    scroller = $(".hm-scroll"),
    viewport = $(".hm-viewport"),
    canvas = $("canvas"),
    slider = $("input[data-journey]");
  const uid = "hall-" + Math.random().toString(36).slice(2);
  slider.id = uid;
  $(".hm-timeline label").htmlFor = uid;
  const maxScroll = () =>
      Math.max(1, scroller.scrollHeight - scroller.clientHeight),
    say = (text) => {
      $(".hm-status").textContent = text;
    };
  function publish() {
    clearTimeout(timer);
    root.dispatchEvent(
      new CustomEvent("lab:settings", {
        bubbles: true,
        detail: { ...settings },
      }),
    );
  }
  function queuePublish() {
    clearTimeout(timer);
    timer = setTimeout(publish, 150);
  }
  function sync() {
    root.dataset.version = settings.version;
    root.dataset.progress = String(settings.progress);
    root.dataset.inspect = String(settings.inspection);
    scroller.dataset.inspect = String(settings.inspection);
    $("[data-version]").value = settings.version;
    $("[data-inspect]").setAttribute(
      "aria-pressed",
      String(settings.inspection),
    );
    $("[data-inspect]").textContent = settings.inspection
      ? "Continue walking"
      : "Look around";
    $("[data-play]").setAttribute("aria-pressed", String(auto));
    $("[data-play]").textContent = auto
      ? "Pause the journey"
      : "Play the journey";
    $(".hm-portal-note").hidden = settings.version !== "gallery";
    slider.value = String(settings.progress);
    $("[data-percent]").textContent = Math.round(settings.progress) + "%";
  }
  function render() {
    if (disposed || lost || !viewer) return;
    lastStats = viewer.render(settings.progress / 100, pointer);
    if (!lastStats) return;
    frames++;
    root.dataset.ready = "true";
    root.dataset.frames = String(frames);
    root.dataset.camera = JSON.stringify(lastStats.camera);
    root.dataset.quaternion = JSON.stringify(lastStats.quaternion);
    root.dataset.passes = String(lastStats.reflectionPasses);
    root.dataset.depth = String(lastStats.depth);
    root.dataset.resolution = String(lastStats.resolution);
    root.dataset.drawCalls = String(lastStats.drawCalls);
    root.dataset.renderMs = String(lastStats.costMs);
    root.dataset.builds = String(lastStats.builds);
    root.dataset.chamber = lastStats.chamber;
    $(".hm-phase").textContent = lastStats.phase;
    $("[data-projection]").textContent =
      lastStats.chamber === "invented"
        ? "ARTISTIC PORTAL / INVENTED CHAMBER"
        : settings.version === "gallery"
          ? "MIRRORS + LABELED PORTAL"
          : "LIVE PLANAR REFLECTIONS";
    $(".hm-budget").textContent =
      `${lastStats.depth} reflections deep · ${lastStats.resolution}px plates`;
    report({
      fps: 0,
      width: lastStats.width,
      height: lastStats.height,
      primitives: lastStats.lines,
      frames,
      running: auto && active,
      renderer: "Three.js / bounded planar reflections",
    });
    sync();
  }
  function stop() {
    auto = false;
    last = 0;
    cancelAnimationFrame(raf);
    raf = 0;
    sync();
  }
  function tick(time) {
    raf = 0;
    if (disposed || lost) return;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
    last = time;
    if (auto && active) {
      scroller.scrollTop = Math.min(
        maxScroll(),
        scroller.scrollTop + (maxScroll() * dt) / 42,
      );
      settings.progress = (scroller.scrollTop / maxScroll()) * 100;
      if (settings.progress >= 99.99) auto = false;
      queuePublish();
    }
    let moving = false;
    for (let i = 0; i < 2; i++) {
      pointer[i] +=
        (targetPointer[i] - pointer[i]) *
        (motion.matches ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(pointer[i] - targetPointer[i]) < 0.0001)
        pointer[i] = targetPointer[i];
      else moving = true;
    }
    render();
    if (active && (auto || moving)) raf = requestAnimationFrame(tick);
  }
  function request() {
    if (!raf && !disposed) raf = requestAnimationFrame(tick);
  }
  function seek(value, notify = true) {
    stop();
    settings.progress = clamp(value, 0, 100);
    scroller.scrollTop = (settings.progress / 100) * maxScroll();
    render();
    sync();
    if (notify) publish();
  }
  function resize() {
    const p = settings.progress;
    viewport.style.height = scroller.clientHeight + "px";
    viewer?.resize(viewport.clientWidth, scroller.clientHeight);
    scroller.scrollTop = (p / 100) * maxScroll();
    if (active) request();
  }
  function update(next, notify = false) {
    if (disposed) return;
    const previous = settings;
    settings = options({ ...settings, ...next });
    stop();
    const rebuild = [
      "version",
      "width",
      "length",
      "angle",
      "density",
      "light",
    ].some((k) => previous[k] !== settings[k]);
    if (!settings.inspection) {
      pointer = [0, 0];
      targetPointer = [0, 0];
    }
    if (viewer) {
      clearTimeout(rebuildTimer);
      if (rebuild)
        rebuildTimer = setTimeout(() => {
          if (disposed) return;
          viewer.update(settings);
          resize();
          render();
        }, 70);
      else viewer.update(settings);
    }
    sync();
    seek(settings.progress, false);
    if (notify) publish();
  }
  function fail(message) {
    $(".hm-plate").hidden = false;
    $(".hm-error").hidden = false;
    $(".hm-error").textContent = message;
    canvas.hidden = true;
    root.dataset.ready = "fallback";
    say("A static drawing is shown; live reflections are unavailable.");
  }
  try {
    viewer = createHallViewer(canvas, settings, say);
    resize();
    render();
  } catch (error) {
    fail(
      "This browser could not start WebGL2. The static plate remains available.",
    );
    console.warn("Hall renderer:", error.message);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(scroller);
  scroller.addEventListener(
    "scroll",
    () => {
      if (!active || disposed) return;
      settings.progress = clamp(scroller.scrollTop / maxScroll()) * 100;
      sync();
      request();
      queuePublish();
    },
    { passive: true, signal },
  );
  for (const type of ["wheel", "touchstart", "keydown"])
    scroller.addEventListener(
      type,
      () => {
        if (auto) {
          stop();
          request();
          queuePublish();
        }
      },
      { passive: true, signal },
    );
  scroller.addEventListener(
    "pointerdown",
    (e) => {
      if (!settings.inspection || e.button !== 0) return;
      drag = e.pointerId;
      try {
        scroller.setPointerCapture(e.pointerId);
      } catch {}
    },
    { signal },
  );
  scroller.addEventListener(
    "pointermove",
    (e) => {
      if (
        !settings.inspection ||
        !active ||
        (e.pointerType === "touch" && drag !== e.pointerId)
      )
        return;
      const b = viewport.getBoundingClientRect();
      targetPointer = [
        clamp(((e.clientX - b.left) / b.width) * 2 - 1, -1, 1),
        clamp(1 - ((e.clientY - b.top) / b.height) * 2, -1, 1),
      ];
      request();
    },
    { signal },
  );
  function release(e) {
    if (drag !== e.pointerId) return;
    drag = null;
    if (scroller.hasPointerCapture(e.pointerId))
      scroller.releasePointerCapture(e.pointerId);
  }
  scroller.addEventListener("pointerup", release, { signal });
  scroller.addEventListener("pointercancel", release, { signal });
  scroller.addEventListener(
    "pointerleave",
    () => {
      if (drag === null) {
        targetPointer = [0, 0];
        if (active) request();
      }
    },
    { signal },
  );
  slider.addEventListener("input", (e) => seek(+e.target.value), { signal });
  $("[data-version]").addEventListener(
    "change",
    (e) => {
      pointer = [0, 0];
      targetPointer = [0, 0];
      update({ ...PRESETS[e.target.value].settings, progress: 0 }, true);
    },
    { signal },
  );
  $("[data-inspect]").addEventListener(
    "click",
    () => {
      update({ inspection: !settings.inspection }, true);
      say(
        settings.inspection
          ? "Move the pointer to inspect. On touch, drag to look and use the timeline to travel."
          : "Scroll inside the drawing. Reflections follow your viewpoint.",
      );
    },
    { signal },
  );
  $("[data-start]").addEventListener("click", () => seek(0), { signal });
  root
    .querySelectorAll("[data-chapter]")
    .forEach((b) =>
      b.addEventListener("click", () => seek(+b.dataset.chapter), { signal }),
    );
  $("[data-play]").addEventListener(
    "click",
    () => {
      if (auto) {
        stop();
        publish();
        return;
      }
      if (settings.progress > 99.9) seek(0);
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
      active = true;
      auto = true;
      last = 0;
      sync();
      request();
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      lost = true;
      viewer?.setLost(true);
      // Release old-generation handles while the context is lost. WebKit rejects
      // deleting those handles after restoration into a new context generation.
      viewer?.dispose();
      viewer = null;
      stop();
      fail(
        "The graphics context was interrupted. Waiting for the browser to restore the drawing…",
      );
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      if (disposed) return;
      lost = false;
      try {
        viewer = createHallViewer(canvas, settings, say);
      } catch {
        fail(
          "The browser could not restore WebGL2. The static drawing remains available.",
        );
        return;
      }
      canvas.hidden = false;
      $(".hm-plate").hidden = true;
      $(".hm-error").hidden = true;
      resize();
      request();
      say("The drawing has been restored.");
    },
    { signal },
  );
  return {
    update(next) {
      if (JSON.stringify(options(next)) === JSON.stringify(settings)) return;
      update(next);
    },
    setRunning(value) {
      active = !!value;
      if (!active) {
        stop();
        say("Journey paused · use the timeline to inspect a fixed position.");
      } else {
        say("Scroll inside the drawing. Reflections follow your viewpoint.");
        request();
      }
    },
    replay() {
      seek(0);
    },
    getState: () => ({
      settings: { ...settings },
      active,
      frames,
      auto,
      disposed,
      pointer: [...pointer],
      viewer: viewer?.getState(),
    }),
    getViewer: () => viewer,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      clearTimeout(timer);
      clearTimeout(rebuildTimer);
      abort.abort();
      observer.disconnect();
      viewer?.dispose();
      root.remove();
    },
  };
}
