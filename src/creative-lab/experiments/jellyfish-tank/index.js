import { PRESETS, PALETTES, SPECIES, RANGES, options } from "./model.js";
import { createJellyfishTank } from "./engine.js";
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
  root.className = "jt";
  root.setAttribute("aria-label", "Pelagia illuminated jellyfish tank");
  root.innerHTML = `<style>${styles}</style><header class="jt-head"><div><span class="jt-kicker">36 / AN INSTALLATION FOR SLOW LOOKING</span><h2>Soft bodies,<br><em>borrowed light.</em></h2></div><p>A bell contracts.<br>A little water moves.<br>The rest follows.</p></header>
  <div class="jt-modes" role="group" aria-label="Tank interaction">${[
    ["ambient", "Just drift", "A quiet autonomous aquarium"],
    ["light", "Follow the light", "Move a soft pool of illumination"],
    ["disturb", "Stir the water", "Drag a current · tap a bell"],
  ]
    .map(
      ([v, l, d]) =>
        `<button data-mode="${v}" aria-pressed="false"><b>${l}</b><small>${d}</small></button>`,
    )
    .join("")}</div>
  <div class="jt-stage"><div class="jt-rail"><span>P E L A G I A <b> / No. 036</b></span><span>SLOW WATER / SOFT LIGHT</span></div><canvas class="jt-canvas" tabindex="0" role="img" aria-label="Luminous jellyfish drift and pulse in a glass aquarium, trailing delicate tentacles. Move to illuminate, drag to stir, or tap a bell to make it pulse. Arrow keys move a virtual hand; Space presses; Escape releases."></canvas><div class="jt-footer"><span data-count></span><span data-hint>DRAG TO STIR · TAP A BELL</span></div><button class="jt-exit" data-exit hidden>Leave the tank ×</button></div>
  <div class="jt-actions"><button class="jt-primary" data-fullscreen>Enter the tank ↗</button><button data-pause aria-pressed="false">Ⅱ Pause drifting</button><button data-disturb>Send a gentle current</button><button data-print>Keep this moment · PNG ↓</button><button data-reset>Begin again ↻</button></div>
  <p class="jt-status" role="status">Move to light the water. Drag to steer a current; tap a nearby bell and watch it pulse.</p>
  <div class="jt-settings-title"><h3>Set the water, leave it living.</h3><small>SMALL CHANGES / DIFFERENT ATMOSPHERES</small></div>
  <div class="jt-controls"><label>A starting point<select data-preset aria-label="Tank preset"><option value="">Choose an atmosphere</option>${Object.entries(
    PRESETS,
  )
    .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
    .join("")}</select></label>
  <label>Color palette<select data-control="palette" aria-label="Color palette">${Object.entries(
    PALETTES,
  )
    .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
    .join("")}</select></label>
  <label>Jellyfish forms<select data-control="species" aria-label="Jellyfish forms"><option value="mixed">A mixed population</option>${Object.entries(
    SPECIES,
  )
    .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
    .join("")}</select></label>
  <label>Scene framing<select data-control="view" aria-label="Scene framing"><option value="tank">Glass aquarium</option><option value="open">Open water / background</option></select></label>
  <label>Rendering detail<select data-control="quality" aria-label="Rendering detail"><option value="economy">Economy · fewer fine details</option><option value="balanced">Balanced</option><option value="fine">Fine · closer inspection</option></select></label>
  <label>Inspection light<input data-control="lightColor" type="color" aria-label="Light color"></label>
  ${RANGES.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}</div>
  <p class="jt-note">Larger bells pulse more slowly. The size controls define a range; the largest bell cannot be smaller than the smallest. Economy keeps the movement while reducing filament detail and suspended particles.</p>
  <details><summary>Field notes · bodies, bells, and borrowed light</summary><p>These are three illustrated forms, not exact biological reconstructions. Moon forms have broad translucent bells and short frilled arms; lanterns are narrower and taller; ribbon forms carry longer folded oral arms. The mixed population favors moon forms. Every swimmer varies in size, depth, rhythm, tilt, and drift. Cobalt light illuminates clear membranes and the thicker tissue suspended inside them.</p><p>A short contraction produces an upward swimming impulse. The longer recovery changes the bell shape without adding that thrust. A slow return current balances the motion. Tentacles have their own linked motion state, so the tips follow a turn later than the body.</p><p>Just drift ignores the pointer. Follow the light illuminates nearby bells and gently draws them toward it. Stir the water responds to your drag direction and speed. The current carries nearby bells and their trailing tissue, then fades after release. Tap a bell to trigger a smooth extra contraction and swimming impulse. While paused, the light remains inspectable; a disturbance waits for Resume.</p><p>Use arrows to move a virtual hand on the focused canvas, Space to press and Escape to release. Reduced motion starts still. Resume is always deliberate. Offscreen and hidden tanks rest. This is procedural two-dimensional artwork with depth cues and soft optical lighting, not a fluid simulation or prerecorded footage.</p><p>Save a PNG here, or use the Lab inspector to save settings and export the portable source. The independent examples include an aquarium, a cropped section, and a hero background.</p><p data-backend></p></details><dialog class="jt-immersive" aria-label="Immersive jellyfish aquarium"></dialog>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal }),
    say = (t) => ($(".jt-status").textContent = t);
  function sync() {
    for (const e of all("[data-control]"))
      if (e.type === "checkbox") e.checked = config[e.dataset.control];
      else e.value = String(config[e.dataset.control]);
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    for (const e of all("[data-mode]"))
      e.setAttribute("aria-pressed", String(e.dataset.mode === config.mode));
    root.dataset.mode = config.mode;
    $("[data-hint]").textContent = {
      ambient: "TAKE YOUR TIME",
      light: "MOVE THE LIGHT · TAP A BELL",
      disturb: "DRAG TO STIR · TAP A BELL",
    }[config.mode];
    $('[data-control="interaction"]').disabled = config.mode === "ambient";
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
      hostRunning && !paused ? "Ⅱ Pause drifting" : "▷ Resume drifting";
    $("[data-pause]").setAttribute(
      "aria-pressed",
      String(!hostRunning || paused),
    );
  }
  engine = createJellyfishTank($(".jt-canvas"), config, {
    frame(s) {
      root.dataset.frames = String(s.frames);
      root.dataset.clock = String(s.time);
      root.dataset.count = String(s.count);
      root.dataset.filaments = String(s.filaments);
      root.dataset.wakes = String(s.wakes);
      root.dataset.currents = String(s.currents);
      root.dataset.reacting = String(s.reacting);
      root.dataset.contact = String(s.contact.amount);
      root.dataset.running = String(s.running);
      root.dataset.backend = s.renderer;
      $("[data-count]").textContent =
        `${s.count} DRIFTERS / ${s.filaments} FILAMENTS`;
      $("[data-backend]").textContent =
        `Rendering: ${s.renderer}. All forms, water and light are generated locally.`;
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
        : ["palette", "species", "view", "quality", "lightColor"].includes(k)
          ? e.target.value
          : Number(e.target.value);
    apply(
      k === "palette"
        ? { palette: v, lightColor: PALETTES[v].light }
        : { [k]: v },
    );
  });
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      apply({ mode: b.dataset.mode });
      say(
        {
          ambient: "Quiet water. Let the bells find their own rhythm.",
          light:
            "Move the light to guide nearby swimmers. Tap a bell to trigger a pulse.",
          disturb:
            "Drag through the water to carry nearby bells with your current. Tap a bell to make it pulse.",
        }[config.mode],
      );
    });

  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      say("A new atmosphere, with a different rhythm in the water.");
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
        ? "Drifting is paused. You can still move the light in Light mode."
        : "The bells are swimming again.",
    );
  });
  on($("[data-disturb]"), "click", () => {
    apply({ mode: "disturb" });
    engine.disturb(0.5, 0.48);
    say(
      hostRunning && !paused
        ? "A soft current, passing through."
        : "A gentle current is ready. Resume to watch it pass.",
    );
  });
  on($("[data-reset]"), "click", () => {
    engine.replay();
    say("The swimmers have returned to their starting positions.");
  });
  const stage = $(".jt-stage"),
    dialog = $("dialog"),
    actions = $(".jt-actions");
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
    $(".jt-canvas").focus();
  });
  on(dialog, "keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      (document.activeElement === $(".jt-canvas")
        ? $("[data-exit]")
        : $(".jt-canvas")
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
      a.download = "pelagia-jellyfish-tank.png";
      a.click();
      say("A moment from the aquarium, saved.");
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
