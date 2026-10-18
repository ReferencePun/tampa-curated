import { PRESETS, MATERIALS, options, pressState, clamp } from "./model.js";
import { createImpression } from "./renderer.js";
import { lightingSVG, settingsJSON, download } from "./export.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let settings = options(initial),
    renderer,
    active = false,
    disposed = false,
    raf = 0,
    auto = false,
    last = 0,
    publishTimer = 0,
    editTimer = 0,
    lost = false,
    frames = 0;
  const abort = new AbortController(),
    signal = abort.signal,
    root = document.createElement("section");
  root.className = "it";
  root.innerHTML = `<style>${styles}</style><header class="it-head"><div><span class="it-eyebrow">20 / A STUDY IN PRESSURE & LIGHT</span><h2>Words with weight.</h2><p>Some words sit on a page. Others leave an impression. Move the light; feel the difference.</p></div><svg class="it-mark" viewBox="0 0 90 90" fill="none" stroke="currentColor" stroke-width=".7" aria-hidden="true"><path d="M5 25l40-14 40 14-40 14zM5 38l40 14 40-14M5 51l40 14 40-14M5 64l40 14 40-14M45 1v87" stroke-dasharray="2 2"/><path d="M10 30v30M80 30v30M25 7l40 72"/></svg></header><div class="it-tools"><select data-preset aria-label="Typographic composition">${Object.entries(
    PRESETS,
  )
    .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
    .join(
      "",
    )}</select><div class="it-types" role="group" aria-label="Physical treatment"><button data-type="emboss">Emboss</button><button data-type="deboss">Deboss</button><button data-type="letterpress">Letterpress</button></div></div><div class="it-work"><div class="it-sheet" tabindex="0" role="group" aria-label="Print sample. Move pointer or use arrow keys to move the light."><canvas aria-label="Lighting simulation of the current text impression"></canvas><div class="it-fallback" hidden></div><div class="it-registration" aria-hidden="true"><div><span>IMPRESSION / XX</span><span data-stock></span></div><div><span>FIBRE · PRESSURE · LIGHT</span><span>PROOF No. 001</span></div><i class="it-corner"></i><i class="it-corner"></i><i class="it-corner"></i><i class="it-corner"></i></div><div class="it-plate" hidden aria-hidden="true"><span>ENGRAVED PRESS PLATE / CONTACT FACE</span></div></div><aside class="it-side"><svg class="it-dial" viewBox="0 0 100 100" aria-label="Directional light instrument"><circle cx="50" cy="50" r="39"/><circle cx="50" cy="50" r="32" stroke-dasharray="1 5"/><path d="M50 4v12M50 84v12M4 50h12M84 50h12" stroke="currentColor" stroke-width=".6"/><line class="it-ray" x1="50" y1="50" x2="20" y2="20"/><circle data-lamp cx="20" cy="20" r="3"/><circle cx="50" cy="50" r="3"/></svg><div><span class="it-kicker">Raking light</span><p data-light></p><strong data-relief>Raised fibres</strong></div><svg class="it-section" viewBox="0 0 160 100" aria-label="Schematic cross section of press and paper"><path d="M8 72h144M8 78h144M15 82l8-4m12 4 8-4m12 4 8-4m12 4 8-4m12 4 8-4m12 4 8-4m12 4 8-4" fill="none" stroke="#847865" stroke-width=".6"/><path data-profile d="M8 70h144" fill="none" stroke="#554c3d" stroke-width="1.2"/><g data-press-arm fill="none" stroke="#766951" stroke-width=".8"><path d="M40 5v30h80V5M34 35h92v7H34zM78 5v27M82 5v27"/><path d="M45 39h70" stroke-dasharray="2 2"/></g><text x="8" y="97" class="it-press-label">SECTION / DEPTH × 12</text></svg></aside></div><div class="it-bottom"><div><label data-text-label>Your words · up to 240 characters</label><textarea data-text maxlength="240" spellcheck="false"></textarea><p class="it-reading"><strong>Readable text:</strong> <span data-readable></span></p></div><div class="it-timeline"><label data-progress-label>Press cycle <output data-percent></output></label><input data-progress type="range" min="0" max="100" step=".01"/><p class="it-phase"></p><div class="it-actions"><button data-play>Run the press</button><button data-flat>Fresh sheet</button><button data-contrast aria-pressed="false">High contrast</button></div><div class="it-actions"><button data-png>PNG proof ↓</button><button data-svg>SVG lighting ↓</button><button data-json>Settings JSON ↓</button></div><p class="it-note">SVG uses an embedded glyph height map and editable lighting filters. PNG preserves the full paper simulation.</p></div></div><p class="it-status" role="status">Move over the paper to reposition the light. On touch, drag sideways; vertical swipes scroll.</p>`;
  host.append(root);
  const $ = (q) => root.querySelector(q),
    canvas = $("canvas"),
    sheet = $(".it-sheet"),
    text = $("[data-text]"),
    slider = $("[data-progress]"),
    uid = "impression-" + Math.random().toString(36).slice(2);
  text.id = uid;
  slider.id = uid + "-press";
  $("[data-text-label]").htmlFor = text.id;
  $("[data-progress-label]").htmlFor = slider.id;
  const say = (t) => ($(".it-status").textContent = t);
  function publish() {
    clearTimeout(publishTimer);
    root.dispatchEvent(
      new CustomEvent("lab:settings", {
        bubbles: true,
        detail: { ...settings },
      }),
    );
  }
  function later() {
    clearTimeout(publishTimer);
    publishTimer = setTimeout(publish, 180);
  }
  function sync() {
    const p = pressState(settings.progress);
    if (document.activeElement !== text) text.value = settings.text;
    slider.value = settings.progress;
    $("[data-readable]").textContent = settings.text || "(An empty sheet)";
    $("[data-stock]").textContent =
      MATERIALS[settings.material].name.toUpperCase();
    $(".it-fallback").textContent = settings.text || "An empty sheet";
    $("[data-percent]").textContent = Math.round(settings.progress) + "%";
    $(".it-phase").textContent = p.phase;
    $("[data-relief]").textContent =
      settings.treatment === "emboss"
        ? "Raised fibres"
        : settings.treatment === "deboss"
          ? "A quiet recess"
          : "Ink under pressure";
    $("[data-light]").textContent =
      `${Math.round(settings.azimuth)}° / ${Math.round(settings.elevation)}° elevation`;
    const a = (settings.azimuth * Math.PI) / 180,
      x = 50 + Math.cos(a) * 33,
      y = 50 - Math.sin(a) * 33;
    $(".it-ray").setAttribute("x2", x);
    $(".it-ray").setAttribute("y2", y);
    $("[data-lamp]").setAttribute("cx", x);
    $("[data-lamp]").setAttribute("cy", y);
    const d =
      (settings.treatment === "emboss" ? -1 : 1) *
      p.pressure *
      settings.depth *
      1.4;
    $("[data-profile]").setAttribute(
      "d",
      `M8 70H46Q50 70 50 ${70 + d}H68Q72 ${70 + d} 72 70H88Q92 70 92 ${70 + d}H110Q114 ${70 + d} 114 70H152`,
    );
    $("[data-press-arm]").setAttribute(
      "transform",
      `translate(0 ${p.visible ? (1 - p.lift) * 24 : 0})`,
    );
    const plate = $(".it-plate");
    plate.hidden = !p.visible;
    plate.style.transform = `translateY(${-p.lift * 108}%) scale(${1 + p.lift * 0.06})`;
    plate.style.opacity = String(0.65 - p.lift * 0.3);
    $("[data-play]").textContent = auto ? "Pause press" : "Run the press";
    $("[data-play]").setAttribute("aria-pressed", auto);
    $("[data-contrast]").setAttribute("aria-pressed", settings.contrast);
    root.dataset.contrast = settings.contrast;
    root.dataset.progress = settings.progress;
    root.dataset.treatment = settings.treatment;
    root
      .querySelectorAll("[data-type]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.type === settings.treatment),
      );
    canvas.setAttribute(
      "aria-label",
      `${settings.treatment} impression: ${settings.text}`,
    );
  }
  function reportState() {
    frames++;
    const state = renderer?.getState();
    root.dataset.frames = frames;
    root.dataset.depth = state?.depth ?? 0;
    root.dataset.builds = state?.builds ?? 0;
    root.dataset.pressure = state?.pressure ?? 0;
    report({
      fps: 0,
      width: canvas.width,
      height: canvas.height,
      primitives: 2,
      frames,
      running: auto && active,
      renderer: renderer
        ? "WebGL / glyph height-field lighting"
        : "Accessible text fallback",
    });
  }
  function draw() {
    if (disposed || lost) return;
    renderer?.update(settings);
    sync();
    reportState();
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
    if (!active || disposed || !auto) return;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    settings.progress =
      Math.round(clamp(settings.progress + dt * 12.5, 0, 100) * 1e6) / 1e6;
    draw();
    later();
    if (settings.progress >= 100) {
      stop();
      publish();
    } else raf = requestAnimationFrame(tick);
  }
  function update(next, notify = false) {
    if (disposed) return;
    clearTimeout(editTimer);
    stop();
    if (
      next.material &&
      next.material !== settings.material &&
      (!next.paper || next.paper === settings.paper) &&
      (next.roughness === undefined || next.roughness === settings.roughness)
    ) {
      next = {
        ...next,
        paper: MATERIALS[next.material].paper,
        roughness: MATERIALS[next.material].roughness,
      };
      notify = true;
    }
    settings = options({ ...settings, ...next });
    draw();
    if (notify) publish();
  }
  function fallback(message) {
    canvas.hidden = true;
    $(".it-fallback").hidden = false;
    root.dataset.ready = "fallback";
    say(message);
    sync();
  }
  function init() {
    try {
      renderer = createImpression(canvas, settings);
      canvas.hidden = false;
      $(".it-fallback").hidden = true;
      root.dataset.ready = "true";
      resize();
    } catch {
      fallback(
        "Depth rendering is unavailable. The high-contrast text and settings remain usable.",
      );
    }
  }
  function resize() {
    if (disposed || lost) return;
    renderer?.resize(sheet.clientWidth);
    sync();
    reportState();
  }
  init();
  const observer = new ResizeObserver(resize);
  observer.observe(sheet);
  root
    .querySelectorAll("[data-type]")
    .forEach((b) =>
      b.addEventListener(
        "click",
        () => update({ treatment: b.dataset.type }, true),
        { signal },
      ),
    );
  $("[data-preset]").addEventListener(
    "change",
    (e) => update(PRESETS[e.target.value].settings, true),
    { signal },
  );
  text.addEventListener(
    "input",
    () => {
      clearTimeout(editTimer);
      settings.text = text.value;
      editTimer = setTimeout(() => {
        draw();
        publish();
      }, 90);
    },
    { signal },
  );
  slider.addEventListener(
    "input",
    (e) => update({ progress: +e.target.value }, true),
    { signal },
  );
  $("[data-flat]").addEventListener(
    "click",
    () => update({ progress: 0 }, true),
    { signal },
  );
  $("[data-contrast]").addEventListener(
    "click",
    () => update({ contrast: !settings.contrast }, true),
    { signal },
  );
  $("[data-play]").addEventListener(
    "click",
    () => {
      if (auto) {
        stop();
        publish();
        return;
      }
      stop();
      clearTimeout(editTimer);
      settings.text = text.value;
      if (settings.progress >= 99.9) settings.progress = 0;
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
      active = true;
      auto = true;
      last = 0;
      sync();
      raf = requestAnimationFrame(tick);
    },
    { signal },
  );
  function move(e) {
    if (
      !active ||
      lost ||
      disposed ||
      (e.pointerType === "touch" && !e.buttons)
    )
      return;
    const r = sheet.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width - 0.5,
      y = 0.5 - (e.clientY - r.top) / r.height;
    settings.azimuth = Math.round(
      ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
    );
    settings.elevation = Math.round(clamp(70 - Math.hypot(x, y) * 90, 12, 80));
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        draw();
      });
    later();
  }
  sheet.addEventListener("pointermove", move, { signal, passive: true });
  sheet.addEventListener(
    "keydown",
    (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
        return;
      e.preventDefault();
      update(
        {
          azimuth:
            (settings.azimuth +
              (e.key === "ArrowLeft" ? -5 : e.key === "ArrowRight" ? 5 : 0) +
              360) %
            360,
          elevation: clamp(
            settings.elevation +
              (e.key === "ArrowUp" ? 3 : e.key === "ArrowDown" ? -3 : 0),
            12,
            80,
          ),
        },
        true,
      );
    },
    { signal },
  );
  $("[data-json]").addEventListener(
    "click",
    () =>
      download(
        new Blob([settingsJSON(settings)], { type: "application/json" }),
        "impression-settings.json",
      ),
    { signal },
  );
  $("[data-svg]").addEventListener(
    "click",
    () => {
      download(
        new Blob([lightingSVG(settings)], { type: "image/svg+xml" }),
        "impression-lighting.svg",
      );
      say(
        "Exported an SVG lighting study with embedded raster height maps; no font files.",
      );
    },
    { signal },
  );
  $("[data-png]").addEventListener(
    "click",
    () => {
      if (!renderer) {
        say(
          "PNG rendering needs WebGL. SVG lighting and settings can still be exported.",
        );
        return;
      }
      renderer.render();
      canvas.toBlob((blob) => {
        if (blob && !disposed) {
          download(blob, "impression-proof.png");
          say("Exported the current material and lighting as PNG.");
        }
      }, "image/png");
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      if (disposed) return;
      lost = true;
      stop();
      renderer?.setLost();
      renderer?.dispose();
      renderer = null;
      fallback(
        "Graphics interrupted. Your words are preserved; waiting for restoration.",
      );
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      if (disposed) return;
      lost = false;
      init();
      say("The material and light have been restored.");
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
      if (!active) stop();
    },
    replay() {
      update({ progress: 0 }, true);
    },
    getState: () => ({
      settings: { ...settings },
      active,
      auto,
      disposed,
      frames,
      renderer: renderer?.getState(),
    }),
    getRenderer: () => renderer,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      clearTimeout(editTimer);
      clearTimeout(publishTimer);
      abort.abort();
      observer.disconnect();
      renderer?.dispose();
      root.remove();
    },
  };
}
