import { PRESETS, PALETTES, options } from "./model.js";
import { createLavaLamp } from "./engine.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    hostRunning = false,
    paused = false,
    overflow = "";
  const root = document.createElement("section"),
    abort = new AbortController(),
    urls = new Set();
  root.className = "ll";
  root.setAttribute("aria-label", "Sol living wax lamp");
  const ranges = [
    ["blobs", "Blob count · wax parcels", 6, 24, 1],
    ["viscosity", "Wax viscosity", 0.3, 2, 0.05],
    ["rise", "Buoyant rise", 0.3, 2, 0.05],
    ["merge", "Merge tendency", 0, 2, 0.05],
    ["split", "Split tendency", 0, 2, 0.05],
    ["height", "Lamp height", 0.75, 1.15, 0.05],
    ["glow", "Internal glow", 0, 1.8, 0.05],
    ["opacity", "Liquid opacity", 0, 1, 0.05],
    ["ambient", "Surrounding light", 0, 1, 0.05],
    ["speed", "Motion speed", 0.2, 3, 0.05],
  ];
  root.innerHTML = `<style>${styles}</style><header class="ll-head"><div><span class="ll-kicker">34 / A STUDY IN SLOW MATTER</span><h2>Time,<br><em>made liquid.</em></h2></div><p>Warmth rises.<br>The shape lets go.<br>Nothing here is in a hurry.</p></header>
 <div class="ll-modes" role="group" aria-label="Lamp mode">${[
   ["classic", "Classic lamp", "A warm object in a quiet room"],
   ["ambient", "Giant ambient", "Let the liquid fill the frame"],
   ["column", "Minimal column", "Only glass, light, and wax"],
 ]
   .map(
     ([v, l, d]) =>
       `<button data-mode="${v}" aria-pressed="false"><b>${l}</b><small>${d}</small></button>`,
   )
   .join("")}</div>
 <div class="ll-stage"><div class="ll-rail"><span>S O L <b> / No. 034</b></span><span>WAX / WARMTH / TIME</span></div><canvas class="ll-canvas" role="img" aria-label="A glass lamp containing slowly rising and sinking wax, whose surfaces join and separate."></canvas><div class="ll-footer"><span data-cycle>HEATING BELOW / COOLING ABOVE</span><span data-time>00:00</span></div><button class="ll-exit" data-exit hidden>Close view ×</button></div>
 <div class="ll-actions"><button class="ll-primary" data-fullscreen>Stay a little longer ↗</button><button data-pause aria-pressed="false">Ⅱ Pause time</button><button data-forward>Let 30 seconds pass</button><button data-print>Keep this moment · PNG ↓</button><button data-reset>Start a new cycle ↻</button></div><p class="ll-status" role="status">A slow thermal cycle. Leave it a moment, or let thirty seconds pass.</p>
 <div class="ll-settings-title"><h3>Find your temperature.</h3><small>THE PLEASURE OF SMALL ADJUSTMENTS</small></div><div class="ll-controls"><label>A starting point<select data-preset aria-label="Lamp preset"><option value="">Choose an atmosphere</option>${Object.entries(
   PRESETS,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join(
     "",
   )}</select></label><label>Color palette<select data-control="palette" aria-label="Color palette">${Object.entries(
   PALETTES,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join(
     "",
   )}</select></label><label>Base material<select data-control="base" aria-label="Base material"><option value="brushed">Brushed metal</option><option value="dark">Charcoal metal</option><option value="ceramic">Warm ceramic</option></select></label>${ranges.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}</div>
 <p class="ll-note">The wax is one continuous field. Its parcels can join into a pool or pull apart into smaller forms, so the number of visible blobs changes. More viscosity resists motion; more split tendency lets temperature differences pull neighboring parcels apart.</p>
 <details><summary>Inside Sol · the field, the glass, the quiet</summary><p>The heater is at the bottom and the cooler region is at the top. Warm wax becomes buoyant, rises, cools, and sinks. Drag, neighboring parcels, and a small convection current change its path. The motion is deterministic but never a prerecorded loop.</p><p>A smooth implicit surface combines the wax parcels. Overlapping fields create a shared body and a neck; as parcels separate, that neck narrows and splits. Deformation follows velocity, strain and contact with the bottom. This is a physically informed two-dimensional thermal model with three-dimensional lighting, not a full fluid-dynamics simulation.</p><p>Classic shows the complete lamp. Giant ambient fills the frame with the same wax field; Minimal column keeps the glass and removes the pedestal and cap. Lamp height, base material and surrounding light apply to the object views; the ambient field fills its container.</p><p>Pause freezes the current state. Let thirty seconds pass evaluates the same model further ahead, including while paused. Reduced motion starts still; Resume explicitly enables animation. Hidden tabs and offscreen lamps rest. Export a moment as PNG, or save settings and reusable source through the Lab inspector.</p><p data-backend></p></details><dialog class="ll-immersive" aria-label="Immersive lava lamp"></dialog>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal }),
    say = (t) => ($(".ll-status").textContent = t);
  function sync() {
    for (const e of all("[data-control]"))
      e.value = String(config[e.dataset.control]);
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    for (const e of all("[data-mode]"))
      e.setAttribute("aria-pressed", String(e.dataset.mode === config.mode));
    root.dataset.mode = config.mode;
    for (const key of ["base", "height", "ambient"])
      $(`[data-control="${key}"]`).disabled =
        config.mode === "ambient" ||
        (config.mode === "column" && key === "base");
  }
  function apply(values, publish = true) {
    config = options({ ...config, ...values });
    engine?.update(config);
    sync();
    if (publish) {
      notifying = true;
      root.dispatchEvent(
        new CustomEvent("lab:settings", { bubbles: true, detail: config }),
      );
      notifying = false;
    }
  }
  function syncRunning() {
    engine?.setRunning(hostRunning && !paused);
    $("[data-pause]").textContent =
      hostRunning && !paused ? "Ⅱ Pause time" : "▷ Resume time";
    $("[data-pause]").setAttribute(
      "aria-pressed",
      String(!hostRunning || paused),
    );
  }
  engine = createLavaLamp($(".ll-canvas"), config, {
    frame(s) {
      root.dataset.frames = String(s.frames);
      root.dataset.clock = String(s.time);
      root.dataset.parcels = String(s.parcels);
      root.dataset.running = String(s.running);
      root.dataset.backend = s.renderer;
      root.dataset.rising = String(s.rising);
      root.dataset.falling = String(s.falling);
      $("[data-time]").textContent =
        `${String(Math.floor(s.time / 60)).padStart(2, "0")}:${String(Math.floor(s.time % 60)).padStart(2, "0")}`;
      $("[data-backend]").textContent =
        `Rendering: ${s.renderer}. The model runs locally; no images, footage, or external services are used.`;
      report({ ...s, fps: Math.round(s.fps) });
    },
    motionPreference(v) {
      if (v) {
        paused = true;
        syncRunning();
      }
    },
  });
  on(root, "input", (e) => {
    const k = e.target.dataset.control;
    if (!k) return;
    apply({
      [k]: ["palette", "base"].includes(k)
        ? e.target.value
        : Number(e.target.value),
    });
  });
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      apply({ mode: b.dataset.mode });
      say(
        config.mode === "ambient"
          ? "The same living material, without the object around it."
          : config.mode === "column"
            ? "Glass, light, and the movement of wax."
            : "A little warmth on the tabletop.",
      );
    });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      say("A new atmosphere. Give the wax time to respond.");
    }
  });
  on($("[data-pause]"), "click", () => {
    if (!hostRunning || paused) {
      paused = false;
      hostRunning = true;
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
    } else paused = true;
    syncRunning();
    say(
      paused
        ? "Time held still. A shape worth looking at."
        : "The wax is warming and wandering again.",
    );
  });
  on($("[data-forward]"), "click", () => {
    engine.warmup(30);
    say("Thirty seconds of the thermal cycle, quietly passed.");
  });
  on($("[data-reset]"), "click", () => {
    engine.replay();
    say("The same starting wax, ready for another slow cycle.");
  });
  const stage = $(".ll-stage"),
    dialog = $("dialog"),
    actions = $(".ll-actions");
  function close() {
    if (!dialog.open) return;
    actions.before(stage);
    dialog.close();
    $("[data-exit]").hidden = true;
    document.body.style.overflow = overflow;
    $("[data-fullscreen]").focus({ preventScroll: true });
  }
  on($("[data-fullscreen]"), "click", () => {
    overflow = document.body.style.overflow;
    dialog.append(stage);
    dialog.showModal();
    document.body.style.overflow = "hidden";
    $("[data-exit]").hidden = false;
    $("[data-exit]").focus();
  });
  on($("[data-exit]"), "click", close);
  on(dialog, "cancel", (e) => {
    e.preventDefault();
    close();
  });
  on($("[data-print]"), "click", () =>
    engine.exportCanvas().toBlob((blob) => {
      if (!blob || disposed) return;
      const url = URL.createObjectURL(blob);
      urls.add(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sol-slow-matter.png";
      a.click();
      say("A moment of slow matter, saved.");
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.delete(url);
      }, 1200);
    }, "image/png"),
  );
  sync();
  root.dataset.ready = "true";
  return {
    update(values) {
      if (!notifying && !disposed) apply(values, false);
    },
    setRunning(v) {
      hostRunning = !!v;
      syncRunning();
    },
    replay() {
      engine.replay();
    },
    getState: () => engine.getState(),
    dispose() {
      if (disposed) return;
      close();
      disposed = true;
      abort.abort();
      engine.dispose();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      root.remove();
    },
  };
}
