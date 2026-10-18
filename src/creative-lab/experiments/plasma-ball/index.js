import { DEFAULTS, PRESETS, PALETTES, options } from "./model.js";
import { createPlasmaBall } from "./engine.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    hostRunning = false,
    paused = false,
    previousFocus = null,
    overflow = "";
  const root = document.createElement("section"),
    abort = new AbortController(),
    urls = new Set();
  root.className = "pb";
  root.setAttribute("aria-label", "Volta interactive plasma globe");
  const ranges = [
    ["filaments", "Filament count", 12, 80, 1],
    ["branching", "Branching complexity", 0, 4, 1],
    ["glow", "Glow intensity", 0.2, 1.8, 0.05],
    ["speed", "Plasma speed", 0.1, 2, 0.05],
    ["attraction", "Attraction strength", 0, 2, 0.05],
    ["coreSize", "Electrode size", 0.04, 0.14, 0.005],
    ["sphereSize", "Sphere size", 0.7, 1.1, 0.05],
    ["flicker", "Ambient flicker", 0, 1, 0.05],
    ["reflection", "Glass reflections", 0, 1, 0.05],
    ["darkness", "Background darkness", 0.65, 1, 0.01],
  ];
  root.innerHTML = `<style>${styles}</style><header class="pb-head"><div><span class="pb-kicker">33 / AN ELECTRICAL CURIOSITY</span><h2>A little lightning.<br><em>Under glass.</em></h2></div><p>Bring a hand close.<br>Watch the current gather.<br>Let go, and let it wander.</p></header>
 <div class="pb-modes" role="group" aria-label="Plasma mode">${[
   ["classic", "Classic plasma", "Restless & responsive"],
   ["intense", "Intense touch", "A stronger connection"],
   ["ambient", "Ambient energy", "A slower kind of electricity"],
 ]
   .map(
     ([v, l, d]) =>
       `<button data-mode="${v}" aria-pressed="false"><b>${l}</b><small>${d}</small></button>`,
   )
   .join("")}</div>
 <div class="pb-stage"><div class="pb-rail"><span>V O L T A <b> / 033</b></span><span>GLASS / CURRENT / CURIOSITY</span></div><canvas class="pb-canvas" tabindex="0" role="group" aria-label="Interactive plasma globe. Move or touch to attract filaments. Arrow keys move the contact; Space intensifies it; Escape releases."></canvas><div class="pb-footer"><span data-contact>IDLE / A FIELD OF POSSIBILITIES</span><span class="pb-meter" aria-hidden="true">${"<i></i>".repeat(10)}</span></div><button class="pb-exit" data-exit hidden>Close view ×</button></div>
 <div class="pb-actions"><button class="pb-primary" data-fullscreen>Enter the dark ↗</button><button data-pause aria-pressed="false">Ⅱ Pause current</button><button data-release>Release contact</button><button data-print>Keep this moment · PNG ↓</button><button data-reset>Begin again ↻</button></div><p class="pb-status" role="status">Hover to gather the filaments. Press for a brighter connection.</p>
 <div class="pb-settings-title"><h3>Tune the atmosphere.</h3><small>SMALL CHANGES / DIFFERENT CURRENTS</small></div><div class="pb-controls"><label>Starting point<select data-preset aria-label="Plasma preset"><option value="">Choose a current</option>${Object.entries(
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
   )}</select></label>${ranges.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}</div>
 <label class="pb-check"><input type="checkbox" data-control="idle"> Let the current wander when unattended</label><p class="pb-note">Turn idle motion off for a globe that wakes only near your hand. Pause holds the electrical field; you can still inspect it with a pointer or the arrow keys. No sound, no flashing bursts.</p>
 <details><summary>Inside the glass · how the current behaves</summary><p>Each filament is a connected, evolving line from the electrode to the spherical shell. Smaller branches split from its trunk. Approaching the glass bends most of the field toward your hand; pressing strengthens that connection. A few arcs keep wandering, and the field redistributes when you leave.</p><p>The glass and current are a procedural Canvas illustration with projected three-dimensional paths, layered luminous strokes, a refracted edge and reflective highlights. This is an artistic electrical model, not a physical plasma solver. Intense touch increases convergence and local thickness; Ambient energy slows the field and softens its light.</p><p>Touch and drag on the globe, or focus it and use the arrow keys. Space or Enter toggles an intensified contact; Escape releases it. Enter the dark opens an immersive view; Escape closes that view. Hidden tabs and offscreen globes stop drawing. Reduced motion starts paused, and Resume is an explicit choice to animate.</p><p>Five starting points are included. Save a custom preset or export settings and portable source through the Lab inspector. Keep this moment saves the actual field as a PNG. The reusable engine also works without this studio, in a small widget or a wide ambient section.</p></details><dialog class="pb-immersive" aria-label="Immersive plasma globe"></dialog>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal }),
    say = (t) => ($(".pb-status").textContent = t);
  function sync() {
    for (const e of all("[data-control]")) {
      const v = config[e.dataset.control];
      if (e.type === "checkbox") e.checked = v;
      else e.value = String(v);
    }
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    for (const e of all("[data-mode]"))
      e.setAttribute("aria-pressed", String(e.dataset.mode === config.mode));
    root.dataset.mode = config.mode;
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
      hostRunning && !paused ? "Ⅱ Pause current" : "▷ Resume current";
    $("[data-pause]").setAttribute(
      "aria-pressed",
      String(!hostRunning || paused),
    );
  }
  engine = createPlasmaBall($(".pb-canvas"), config, {
    frame(s) {
      root.dataset.frames = String(s.frames);
      root.dataset.clock = String(s.time);
      root.dataset.contact = String(s.contact.amount);
      root.dataset.pressed = String(s.contact.pressed);
      root.dataset.paths = String(s.paths);
      root.dataset.distance = String(s.meanContactDistance);
      root.dataset.running = String(s.running);
      $("[data-contact]").textContent =
        s.contact.amount > 0.05
          ? s.contact.pressed
            ? "CONTACT / THE FIELD GATHERS"
            : "PROXIMITY / FOLLOWING YOUR HAND"
          : "IDLE / A FIELD OF POSSIBILITIES";
      const bars = all(".pb-meter i");
      bars.forEach(
        (b, i) =>
          (b.style.transform = `scaleY(${0.35 + s.contact.amount * 0.65 + Math.sin(s.time * 1.5 + i) * 0.1})`),
      );
      report(s);
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
      [k]:
        e.target.type === "checkbox"
          ? e.target.checked
          : k === "palette"
            ? e.target.value
            : Number(e.target.value),
    });
  });
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      apply({ mode: b.dataset.mode });
      say(
        {
          classic: "The field is restless and responsive.",
          intense: "A stronger connection. Press against the glass.",
          ambient: "Slower currents, quieter light.",
        }[config.mode],
      );
    });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      say("A different current, under the same glass.");
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
        ? "The field is held still. Pointer inspection remains available."
        : "The current is moving again.",
    );
  });
  on($("[data-release]"), "click", () => {
    engine.release();
    say("Released. The current returns to its own paths.");
  });
  on($("[data-reset]"), "click", () => {
    apply(DEFAULTS);
    engine.replay();
    $("[data-preset]").value = "classic";
    say("Back to the first current.");
  });
  const stage = $(".pb-stage"),
    dialog = $("dialog"),
    actions = $(".pb-actions");
  function close() {
    if (!dialog.open) return;
    actions.before(stage);
    dialog.close();
    $("[data-exit]").hidden = true;
    document.body.style.overflow = overflow;
    previousFocus?.focus({ preventScroll: true });
  }
  on($("[data-fullscreen]"), "click", () => {
    previousFocus = $("[data-fullscreen]");
    overflow = document.body.style.overflow;
    dialog.append(stage);
    dialog.showModal();
    document.body.style.overflow = "hidden";
    $("[data-exit]").hidden = false;
    $(".pb-canvas").focus({ preventScroll: true });
  });
  on($("[data-exit]"), "click", close);
  on(dialog, "cancel", (e) => {
    e.preventDefault();
    close();
  });
  on(dialog, "keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      (document.activeElement === $(".pb-canvas")
        ? $("[data-exit]")
        : $(".pb-canvas")
      ).focus();
    }
  });
  on($("[data-print]"), "click", () =>
    engine.exportCanvas().toBlob((blob) => {
      if (!blob || disposed) return;
      const url = URL.createObjectURL(blob);
      urls.add(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = "volta-current.png";
      a.click();
      say("This particular current, kept as a PNG.");
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
