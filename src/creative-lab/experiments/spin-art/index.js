import { PALETTES, PRESETS, options } from "./model.js";
import { createSpinArt } from "./engine.js";
import { makeStudy, STUDIES } from "./studies.js";
import { drawMarks, compositePaper } from "./paint.js";
import { styles } from "./styles.js";
const ICONS = {
  splatter: "M5 14l4-1m5-6l1 1m7 11l3-1m6-13l-1 2m4 7l5 1M20 11l2 1m-7 7l1-1",
  stream: "M3 17C13-3 18 25 28 8S36 15 43 5",
  dots: "M6 12h.1m9-6h.1m7 11h.1m10-7h.1m9 7h.1",
  marker: "M3 17Q13 1 23 11T43 5",
  bloom: "M4 15Q24 8 42 12M12 12l6-8m4 7l5 7m3-6l5-8m-21 9l3 6",
};
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    lastSheet = null,
    hostRunning = false,
    currentStudy = "flare";
  const abort = new AbortController(),
    urls = new Set(),
    timers = new Set(),
    root = document.createElement("section"),
    docs = new Map();
  root.className = "sa";
  root.setAttribute("aria-label", "Whirl spin-art studio");
  const tools = [
      ["splatter", "Splatter"],
      ["stream", "Stream"],
      ["dots", "Drips"],
      ["marker", "Marker"],
      ["bloom", "Ink bloom"],
    ],
    ranges = [
      ["speed", "Spin speed", 0, 90, 1],
      ["thickness", "Paint thickness", 1, 30, 1],
      ["dripRate", "Drips per second", 4, 60, 1],
      ["colors", "Colors at once", 1, 4, 1],
      ["spread", "Paint spread", 0, 1, 0.05],
      ["viscosity", "Paint body · fluid to thick", 0.1, 1, 0.05],
      ["opacity", "Paint opacity", 0.1, 1, 0.05],
    ];
  root.innerHTML = `<style>${styles}</style><header class="sa-head"><div><span class="sa-kicker">28 / THE VERY SMALL COLOUR CLUB</span><h2>Let it get<br>out of hand.</h2></div><p>One turning sheet.<br>A few good colors.<br><em>No two accidents alike.</em></p></header><div class="sa-topline"><strong data-title>VERMILION HOUR / ORIGINAL STUDY</strong><span data-rpm>0 RPM · CLOCKWISE</span></div><div class="sa-stage"><canvas class="sa-board" tabindex="0" role="group" aria-label="Spinning paint disc. Hold and drag to paint. Arrow keys move the dropper, Space toggles pouring, Escape releases the tool."></canvas></div>
 <div class="sa-motor-row"><button class="sa-motor" data-motor>Ⅱ Stop the wheel</button><button class="sa-simple" data-drop>＋ One good drop</button><button class="sa-simple sa-autopaint" data-auto aria-pressed="false">Auto-pour</button></div><p class="sa-hint">Hold to pour. Slow spins gather paint into puddles; faster spins pull it into tapered ribbons and throw droplets into the tray. Try a short pour near the center, then let it spread.</p>
 <nav class="sa-tools" aria-label="Paint behavior">${tools.map(([id, label]) => `<button class="sa-tool" data-tool="${id}"><svg viewBox="0 0 46 22" aria-hidden="true" style="${id === "dots" ? "stroke-width:5" : ""}"><path d="${ICONS[id]}"/></svg>${label}</button>`).join("")}</nav><div class="sa-paint-tray"><div class="sa-swatches" aria-label="Paint colors"></div><label class="sa-color-label">Mix your own <input type="color" data-ink aria-label="Custom paint color" value="${config.ink}"></label></div>
 <div class="sa-utility"><div class="sa-history"><button data-undo>↶ Undo paint</button><button data-redo>↷ Redo</button></div><button data-clear>New blank sheet ↗</button><button data-restore hidden>Recover previous sheet</button></div><p class="sa-status" role="status">An original study is on the wheel. Paint over it, or begin with a blank sheet.</p>
 <div class="sa-section"><h3>A small change changes everything.</h3><small>MORE SPEED / A DIFFERENT KIND OF MESS</small></div><div class="sa-controls">${ranges.map(([key, label, min, max, step]) => `<label>${label}<output data-value="${key}"></output><input data-control="${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}"></label>`).join("")}<label>Spin direction<select data-control="direction" aria-label="Spin direction"><option value="clockwise">Clockwise ↻</option><option value="counterclockwise">Counterclockwise ↺</option></select></label><label>Color palette<select data-control="palette" aria-label="Color palette">${Object.entries(
   PALETTES,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join(
     "",
   )}</select></label><label>Paper size · pixels<select data-control="paperSize" aria-label="Paper size">${[512, 768, 1024, 1280, 1536, 1792, 2048].map((n) => `<option value="${n}">${n} × ${n} px</option>`).join("")}</select></label></div><div class="sa-preset-line"><label>Paper stock<select data-control="paper" aria-label="Paper stock"><option value="ivory">Warm ivory</option><option value="white">Gallery white</option><option value="night">Midnight paper</option></select></label><label>A starting recipe<select data-preset aria-label="Spin-art preset"><option value="">Choose a recipe</option>${Object.entries(
   PRESETS,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join("")}</select></label></div>
 <div class="sa-section"><h3>Good accidents, kept.</h3><small>THREE ORIGINAL STUDIES / MADE WITH THIS MACHINE</small></div><div class="sa-example-list">${Object.entries(
   STUDIES,
 )
   .map(
     ([id, s]) =>
       `<button class="sa-example" data-study="${id}"><canvas width="200" height="200" aria-hidden="true"></canvas><b>${s.name}</b><small>${s.subtitle}</small></button>`,
   )
   .join(
     "",
   )}</div><div class="sa-save"><button data-png>Keep the artwork · PNG ↓</button><button data-svg>Vector drawing · SVG ↓</button><button data-json>Save the paint · JSON ↓</button><label class="sa-file">Load an artwork<input data-import type="file" accept=".json,application/json" aria-label="Load spin-art artwork"></label></div><p class="sa-note">Paint stays on the paper when the wheel stops. Save your artwork before leaving; Lab presets remember the controls. PNG keeps the current orientation and transparent corners. SVG preserves the paint shapes; PNG keeps the pigment texture and raised highlights. Nothing leaves your browser until you save it.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, type, fn) =>
      el.addEventListener(type, fn, { signal: abort.signal }),
    say = (t) => ($(".sa-status").textContent = t);
  function doc(id) {
    if (!docs.has(id)) docs.set(id, makeStudy(id));
    return docs.get(id);
  }
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function text(sel, value) {
    const e = $(sel);
    if (e.textContent !== value) e.textContent = value;
  }
  function tray() {
    const el = $(".sa-swatches");
    el.replaceChildren();
    PALETTES[config.palette].colors.forEach((color, i) => {
      const b = document.createElement("button");
      b.className = "sa-swatch";
      b.dataset.color = color;
      b.style.setProperty("--swatch", color);
      b.setAttribute("aria-label", `Paint ${i + 1}: ${color}`);
      b.setAttribute(
        "aria-pressed",
        String(config.ink.toLowerCase() === color),
      );
      el.append(b);
    });
  }
  function sync() {
    for (const b of all("[data-tool]"))
      b.setAttribute("aria-pressed", String(b.dataset.tool === config.style));
    for (const el of all("[data-control]"))
      el.value = String(config[el.dataset.control]);
    for (const el of all("[data-value]"))
      el.textContent = String(config[el.dataset.value]);
    $("[data-ink]").value = config.ink;
    $("[data-restore]").hidden = !lastSheet;
    root.dataset.style = config.style;
    root.dataset.palette = config.palette;
    root.dataset.paper = config.paper;
    tray();
    if (engine) stats(engine.getState());
  }
  function stats(s) {
    for (const k of [
      "marks",
      "visible",
      "wet",
      "angle",
      "rpm",
      "motor",
      "auto",
      "running",
      "frames",
      "time",
      "paperSize",
    ])
      root.dataset[k] =
        typeof s[k] === "number"
          ? s[k].toFixed(["time", "angle", "rpm"].includes(k) ? 3 : 0)
          : String(s[k]);
    text(
      "[data-rpm]",
      `${Math.abs(Math.round(s.rpm))} RPM · ${config.direction === "clockwise" ? "CLOCKWISE" : "REVERSE"}`,
    );
    text("[data-motor]", s.motor ? "Ⅱ Stop the wheel" : "↻ Spin the wheel");
    $("[data-motor]").setAttribute("aria-pressed", String(s.motor));
    $("[data-auto]").setAttribute("aria-pressed", String(s.auto));
    text("[data-auto]", s.auto ? "Stop pouring" : "Auto-pour");
    $("[data-undo]").disabled = !s.undo;
    $("[data-redo]").disabled = !s.redo;
    if (s.saturated)
      say("This sheet is full of paint. Save it, then start a fresh one.");
    report({
      fps: s.fps,
      width: s.width,
      height: s.height,
      primitives: s.visible,
      frames: s.frames,
      running: s.running && s.motor,
      renderer: "Canvas 2D · retained paint / rotating paper",
    });
  }
  function resume() {
    hostRunning = true;
    engine.setRunning(true);
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
  }
  function apply(next) {
    const old = config;
    config = options(next);
    engine?.update(config);
    if (engine && old.autoDrip !== config.autoDrip)
      engine.setAuto(config.autoDrip);
    sync();
  }
  function change(v) {
    apply({ ...config, ...v });
    publish();
  }
  engine = createSpinArt($(".sa-board"), config, {
    document: doc("flare"),
    frame: stats,
    interact() {
      resume();
      currentStudy = "custom";
      text("[data-title]", "YOUR COLOUR / YOUR GOOD ACCIDENT");
    },
  });
  engine.update(config);
  if (
    config.autoDrip &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    engine.setAuto(true);
  for (const b of all("[data-tool]"))
    on(b, "click", () => {
      change({ style: b.dataset.tool });
      say(
        {
          splatter: "A fine spray, pulled into little radial streaks.",
          stream: "A steady stream. Follow the turning paper.",
          dots: "Separate drops. Speed and drip rate set their spacing.",
          marker: "A clean line that follows your hand across a moving page.",
          bloom: "Loose ink feathers outward, then settles into the paper.",
        }[config.style],
      );
    });
  on($(".sa-swatches"), "click", (e) => {
    const b = e.target.closest("[data-color]");
    if (b) change({ ink: b.dataset.color });
  });
  on($("[data-ink]"), "input", (e) => change({ ink: e.target.value }));
  for (const el of all("[data-control]"))
    on(el, "input", () => {
      const key = el.dataset.control,
        value =
          el.type === "range" || key === "paperSize" ? +el.value : el.value;
      change({
        [key]: value,
        ...(key === "palette" ? { ink: PALETTES[value].colors[0] } : {}),
      });
    });
  on($("[data-motor]"), "click", () => {
    const on = !engine.getState().motor;
    if (on) resume();
    engine.setMotor(on);
    say(
      on
        ? "The paper is moving. Your hand can stay still."
        : "Wheel stopped. The paint is yours to examine.",
    );
  });
  on($("[data-auto]"), "click", () => {
    resume();
    change({ autoDrip: !engine.getState().auto });
    say(
      config.autoDrip
        ? "The dropper is pouring. Move over the disc to guide it."
        : "The dropper is closed. Let the last paint settle.",
    );
  });
  on($("[data-drop]"), "click", () => {
    resume();
    const p = engine.model.pointer;
    engine.begin(p.x, p.y, 1);
    engine.end();
    currentStudy = "custom";
    text("[data-title]", "YOUR COLOUR / YOUR GOOD ACCIDENT");
    say("One good drop. See where it goes.");
  });
  function stopAuto() {
    if (config.autoDrip) {
      config.autoDrip = false;
      engine.setAuto(false);
      publish();
    }
  }
  on($("[data-undo]"), "click", () => {
    engine.undo();
    stopAuto();
    say("The last pass of paint has lifted off.");
    sync();
  });
  on($("[data-redo]"), "click", () => {
    engine.redo();
    say("That pass of paint is back.");
    sync();
  });
  on($("[data-clear]"), "click", () => {
    lastSheet = engine.serialize();
    engine.clear();
    config.autoDrip = false;
    engine.update(config);
    publish();
    currentStudy = "blank";
    text("[data-title]", "A FRESH SHEET / ANYTHING COULD HAPPEN");
    say("Fresh paper. Start the wheel, or draw with it still.");
    sync();
  });
  on($("[data-restore]"), "click", () => {
    const previous = lastSheet;
    lastSheet = engine.serialize();
    engine.load(previous);
    config = options(previous.settings);
    publish();
    sync();
    say("The previous sheet is back. The wheel is stopped.");
  });
  for (const b of all("[data-study]"))
    on(b, "click", () => {
      lastSheet = engine.serialize();
      currentStudy = b.dataset.study;
      engine.load(doc(currentStudy));
      config = options(engine.model.config);
      publish();
      text(
        "[data-title]",
        STUDIES[currentStudy].name.toUpperCase() + " / ORIGINAL STUDY",
      );
      say("Original study loaded. The wheel is stopped for a closer look.");
      sync();
    });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      publish();
      say(
        "Recipe changed. Your existing paint stays exactly where you put it.",
      );
    }
  });
  function download(blob, name) {
    if (!blob || disposed) return;
    const u = URL.createObjectURL(blob);
    urls.add(u);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    const t = setTimeout(() => {
      URL.revokeObjectURL(u);
      urls.delete(u);
      timers.delete(t);
    }, 1500);
    timers.add(t);
  }
  on($("[data-png]"), "click", async (e) => {
    e.target.disabled = true;
    try {
      const blob = await engine.png();
      if (!disposed) {
        download(blob, "whirl-spin-art.png");
        say(
          `${config.paperSize} × ${config.paperSize} PNG saved, at this paper orientation.`,
        );
      }
    } finally {
      if (!disposed) e.target.disabled = false;
    }
  });
  on($("[data-svg]"), "click", () => {
    download(
      new Blob([engine.svg()], { type: "image/svg+xml" }),
      "whirl-spin-art.svg",
    );
    say(
      "Vector artwork saved. Soft ink edges are simplified; PNG preserves the full paint texture.",
    );
  });
  on($("[data-json]"), "click", () =>
    download(
      new Blob([JSON.stringify(engine.serialize())], {
        type: "application/json",
      }),
      "whirl-spin-art.json",
    ),
  );
  on($("[data-import]"), "change", async (e) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 22000000)
        throw Error("Choose an artwork smaller than 22 MB.");
      const data = JSON.parse(await f.text());
      if (disposed) return;
      const old = engine.serialize();
      engine.load(data);
      lastSheet = old;
      config = options(engine.model.config);
      publish();
      sync();
      text("[data-title]", "YOUR SAVED ARTWORK / BACK ON THE WHEEL");
      say("Artwork restored. The wheel and automatic paint are stopped.");
    } catch (err) {
      if (!disposed) say(err.message);
    } finally {
      e.target.value = "";
    }
  });
  for (const b of all("[data-study]")) {
    const d = doc(b.dataset.study),
      paint = document.createElement("canvas");
    paint.width = paint.height = 240;
    drawMarks(paint.getContext("2d"), d.marks, 240);
    const c = b.querySelector("canvas");
    compositePaper(c.getContext("2d"), paint, 200, d.settings.paper, 0);
    paint.width = paint.height = 1;
  }
  sync();
  root.dataset.ready = "true";
  return {
    update(next) {
      if (!notifying && !disposed) apply(next);
    },
    setRunning(value) {
      hostRunning = !!value;
      engine.setRunning(hostRunning);
    },
    replay() {
      engine.setMotor(false);
      engine.model.angle = 0;
      engine.update(config);
      say(
        "Paper returned to its original orientation. Your painting is preserved.",
      );
    },
    getState: () => engine.getState(),
    serialize: () => engine.serialize(),
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      for (const t of timers) clearTimeout(t);
      for (const u of urls) URL.revokeObjectURL(u);
      docs.clear();
      lastSheet = null;
      engine.dispose();
      root.remove();
    },
  };
}
