import { PRESETS, PALETTES, RANGES, options } from "./model.js";
import { createAnemoneField } from "./engine.js";
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
  root.className = "af";
  root.setAttribute("aria-label", "Nerine living marine garden");
  root.innerHTML = `<style>${styles}</style><header class="af-head"><div><span class="af-kicker">35 / A STUDY IN SOFT RESPONSE</span><h2>A small,<br><em>living tide.</em></h2></div><p>Brush the surface.<br>A thousand soft gestures<br>answer your own.</p></header>
  <div class="af-modes" role="group" aria-label="Field behavior">${[
    ["attract", "Reach", "Lean into your presence"],
    ["avoid", "Recoil", "Fold away from touch"],
    ["ripple", "Ripple", "Leave a moving current"],
    ["mixed", "Interweave", "Reach, recoil, and ripple"],
  ]
    .map(
      ([v, l, d]) =>
        `<button data-mode="${v}" aria-pressed="false"><b>${l}</b><small>${d}</small></button>`,
    )
    .join("")}</div>
  <div class="af-stage"><div class="af-rail"><span>N E R I N E <b> / No. 035</b></span><span>A GARDEN BENEATH THE SURFACE</span></div><canvas class="af-canvas" tabindex="0" role="img" aria-label="Interactive colony of soft radial anemones. Brush with a pointer or touch. Use arrow keys to move a virtual fingertip, Space to press, and Escape to release."></canvas><div class="af-footer"><span data-count></span><span>BRUSH SLOWLY / WATCH IT FOLLOW</span></div><button class="af-exit" data-exit hidden>Leave the water ×</button></div>
  <div class="af-actions"><button class="af-primary" data-fullscreen>Immerse yourself ↗</button><button data-pause aria-pressed="false">Ⅱ Hold the tide</button><button data-print>Keep a specimen · PNG ↓</button><button data-reset>Let everything settle ↻</button></div>
  <p class="af-status" role="status">Move slowly across the crowns, or sweep through to leave a passing current. Touch works too.</p>
  <div class="af-settings-title"><h3>Small changes in the water.</h3><small>A DIFFERENT GARDEN EACH TIME</small></div>
  <div class="af-controls"><label>A starting point<select data-preset aria-label="Field preset"><option value="">Choose a garden</option>${Object.entries(
    PRESETS,
  )
    .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
    .join("")}</select></label>
  <label>Color palette<select data-control="palette" aria-label="Color palette">${Object.entries(
    PALETTES,
  )
    .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
    .join("")}</select></label>
  <label>Tendril material<select data-control="material" aria-label="Tendril material"><option value="translucent">Translucent tissue</option><option value="satin">Soft satin</option><option value="ink">Graphite / ink</option></select></label>
  ${RANGES.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}
  <label>Water / background<input data-control="background" type="color" aria-label="Background color"></label></div>
  <label class="af-check"><input type="checkbox" data-control="transparent">Transparent substrate · for layering over another design</label>
  <p class="af-note" data-behavior></p>
  <details><summary>Field notes · the motion underneath</summary><p>Every crown has a fixed root and a radial arrangement of curved tentacles. Individual phases give each one its own quiet movement. Local springs bend the crowns; their anchored bases stay in place.</p><p>Reach leans toward your fingertip. Recoil contracts and bends away. Ripple leaves short-lived waves that travel outward through nearby colonies. Interweave combines all three: a crown reaches from afar, then recoils as you get close. Each strength is adjustable independently.</p><p>Arrow keys move a virtual fingertip across the canvas. Space presses or releases it; Escape removes it. Pause holds time while you inspect a still response. Reduced motion begins still, with animation available through Resume. Nothing moves offscreen or in a hidden tab.</p><p>The garden is a stylized two-dimensional spring field with projected radial curves, tapered linework and translucent lighting. It is an artistic marine texture, not a biological simulation. Export a still PNG or use the Lab inspector to save settings and download the complete reusable source.</p><p data-backend></p></details><dialog class="af-immersive" aria-label="Immersive marine garden"></dialog>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal }),
    say = (t) => ($(".af-status").textContent = t);
  function sync() {
    for (const e of all("[data-control]"))
      if (e.type === "checkbox") e.checked = config[e.dataset.control];
      else e.value = String(config[e.dataset.control]);
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    for (const e of all("[data-mode]"))
      e.setAttribute("aria-pressed", String(e.dataset.mode === config.mode));
    root.dataset.mode = config.mode;
    const rgb = parseInt(config.background.slice(1), 16);
    root.dataset.light = String(
      !config.transparent &&
        (rgb >> 16) * 0.2126 +
          ((rgb >> 8) & 255) * 0.7152 +
          (rgb & 255) * 0.0722 >
          155,
    );
    for (const key of ["attraction", "avoidance", "ripple"])
      $(`[data-control="${key}"]`).disabled =
        config.mode !== "mixed" &&
        config.mode !==
          { attraction: "attract", avoidance: "avoid", ripple: "ripple" }[key];
    $("[data-behavior]").textContent =
      config.mode === "mixed"
        ? "Interweave blends the three strengths. Attraction reaches from farther away; recoil takes over close to your fingertip. Ripples linger behind a moving hand."
        : "The active behavior uses its own strength control. Choose Interweave to blend attraction, recoil and traveling ripples.";
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
      hostRunning && !paused ? "Ⅱ Hold the tide" : "▷ Resume the tide";
    $("[data-pause]").setAttribute(
      "aria-pressed",
      String(!hostRunning || paused),
    );
  }
  engine = createAnemoneField($(".af-canvas"), config, {
    frame(s) {
      root.dataset.frames = String(s.frames);
      root.dataset.clock = String(s.time);
      root.dataset.colonies = String(s.colonies);
      root.dataset.tendrils = String(s.tendrils);
      root.dataset.pulses = String(s.pulses);
      root.dataset.contact = String(s.contact.amount);
      root.dataset.running = String(s.running);
      root.dataset.backend = s.renderer;
      $("[data-count]").textContent =
        `${s.colonies} CROWNS / ${s.tendrils.toLocaleString()} TENDRILS`;
      $("[data-backend]").textContent =
        `Rendering: ${s.renderer}. No photographs, external services or prerecorded motion.`;
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
    const v =
      e.target.type === "checkbox"
        ? e.target.checked
        : ["palette", "material", "background"].includes(k)
          ? e.target.value
          : Number(e.target.value);
    apply(
      k === "palette"
        ? { palette: v, background: PALETTES[v].background }
        : { [k]: v },
    );
  });
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      apply({ mode: b.dataset.mode });
      say(
        {
          attract: "A slow reach toward your hand.",
          avoid: "The nearest crowns fold away, then recover.",
          ripple: "Sweep through the garden to send a current outward.",
          mixed: "Far away, a reach. Close by, a recoil. A current follows.",
        }[config.mode],
      );
    });

  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      say("A new garden. Brush over it and watch the small differences.");
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
        ? "The tide is held still. You can still inspect a response with your pointer."
        : "The garden is moving again.",
    );
  });
  on($("[data-reset]"), "click", () => {
    engine.replay();
    say("The crowns have returned to their roots. A fresh current awaits.");
  });
  const stage = $(".af-stage"),
    dialog = $("dialog"),
    actions = $(".af-actions");
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
    $(".af-canvas").focus();
  });
  on(dialog, "keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      (document.activeElement === $(".af-canvas")
        ? $("[data-exit]")
        : $(".af-canvas")
      ).focus();
    }
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
      a.download = "nerine-living-garden.png";
      a.click();
      say("A specimen from the living garden, saved.");
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
