import { DEFAULTS, PRESETS, options } from "./model.js";
import { createWaterToy } from "./engine.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    localPause = false,
    hostRunning = false,
    lastCaught = 0,
    finished = false;
  const abort = new AbortController(),
    timers = new Set(),
    root = document.createElement("section");
  root.className = "wrt";
  root.setAttribute("aria-label", "Tideling water ring toy");
  const ranges = [
    ["strength", "Pump strength", 0.4, 1.8, 0.05],
    ["buoyancy", "Sinking weight", 0.4, 1.6, 0.05],
    ["ringCount", "Little rings", 4, 24, 1],
    ["turbulence", "Water turbulence", 0, 1, 0.05],
    ["timer", "Challenge seconds", 20, 180, 5],
  ];
  root.innerHTML = `<style>${styles}</style><header class="wrt-head"><div><span class="wrt-kicker">27 / A SMALL EXERCISE IN PATIENCE</span><h2>Just one more pump.</h2><p>A pocketful of water, a handful of rings.<br>Sometimes the trick is letting things settle.</p></div><div class="wrt-head-seal"><small>NO BATTERIES</small><b>just tides</b><small>& A LITTLE LUCK</small></div></header>
 <nav class="wrt-modes" aria-label="Water toy mode"><button data-mode="classic">Two pegs</button><button data-mode="challenge">Challenge</button><button data-mode="world">Little worlds</button><button data-mode="endless">Endless</button></nav>
 <div class="wrt-toy"><div class="wrt-toy-top"><div class="wrt-brand">Tideling<span>A LITTLE WORLD / UNDER WATER</span></div><div class="wrt-serial">POCKET CURRENT CO.<br>WATER GAME Nº 027</div></div><canvas class="wrt-canvas" tabindex="0" role="group" aria-label="Water chamber. Press A for the left pump, D for the right pump, or Space for both. Let rings fall onto the pegs."></canvas>
 <div class="wrt-console"><div class="wrt-pump-wrap"><button class="wrt-pump" data-pump="0" aria-label="Left pump">↑</button><small>LEFT CURRENT<span class="wrt-keyhint"> / A</span></small></div><div class="wrt-display" aria-label="Game score"><small data-meter-label>RINGS AT REST</small><output class="wrt-score" data-score>0 <em>/ 10</em></output><span class="wrt-round" data-round>LET THEM FALL INTO PLACE</span><output class="wrt-clock" data-clock hidden>01:00</output></div><div class="wrt-pump-wrap"><button class="wrt-pump" data-pump="1" aria-label="Right pump">↑</button><small>RIGHT CURRENT<span class="wrt-keyhint"> / D</span></small></div></div>
 <div class="wrt-bottom"><button data-reset>↻ Start afresh</button><button data-pause aria-pressed="false">Ⅱ Hold the tide</button></div><i class="wrt-screw left" aria-hidden="true"></i><i class="wrt-screw right" aria-hidden="true"></i></div>
 <p class="wrt-hint">Tap either pump to send up a current. Wait for the rings to drift down over the peg tips. A few well-timed taps go further than a flood.</p>
 <div class="wrt-status-row"><p class="wrt-status" role="status">The water is still. Your move.</p><button class="wrt-action" data-start hidden>Start 60-second challenge</button></div>
 <div class="wrt-presets" aria-label="Miniature worlds"><button class="wrt-world" data-world="harbor"><b>The little harbor</b><small>LIGHTHOUSE / LOW TIDE</small></button><button class="wrt-world" data-world="reef"><b>Coral carnival</b><small>A QUIET UNDERSEA GARDEN</small></button><button class="wrt-world" data-world="moon"><b>The moon pool</b><small>GRAVITY TAKES THE DAY OFF</small></button></div>
 <div class="wrt-section"><h3>Make your own current.</h3><small>THE PHYSICS OF A LAZY AFTERNOON</small></div><div class="wrt-controls">${ranges.map(([key, label, min, max, step]) => `<label>${label}<output data-value="${key}"></output><input type="range" data-control="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}"></label>`).join("")}
 <label>Peg arrangement<select data-control="layout" aria-label="Peg layout"><option value="duet">Two patient pegs</option><option value="quartet">Four-point challenge</option><option value="terraces">Three little terraces</option><option value="arch">An ascending arch</option></select></label><label>Chamber shape<select data-control="shape" aria-label="Chamber shape"><option value="rounded">Soft rectangle</option><option value="porthole">Deep rounded capsule</option></select></label><label>Starting points<select data-preset aria-label="Water toy preset"><option value="">Choose a toy setup</option>${Object.entries(
   PRESETS,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join("")}</select></label></div>
 <div class="wrt-toggles"><label><input type="checkbox" data-free> Free play · hide the score</label></div><div class="wrt-save"><button data-png>Keep a postcard · PNG ↓</button><button data-settings>Save this setup · JSON ↓</button><label class="wrt-file">Load a setup<input data-import type="file" accept=".json,application/json" aria-label="Load water toy settings"></label></div><p class="wrt-note">Two currents, actual little catches. A ring scores only when its opening passes down over a peg tip. Caught rings stay put. Original toy & illustrations; everything runs here, quietly, in your browser.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, type, fn) =>
      el.addEventListener(type, fn, { signal: abort.signal }),
    say = (text) => ($(".wrt-status").textContent = text);
  function later(fn, ms) {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!disposed) fn();
    }, ms);
    timers.add(t);
  }
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function sync() {
    root.dataset.mode = config.mode;
    root.dataset.world = config.world;
    for (const b of all("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === config.mode));
    for (const b of all("[data-world]"))
      b.setAttribute("aria-pressed", String(b.dataset.world === config.world));
    for (const e of all("[data-control]"))
      e.value = String(config[e.dataset.control]);
    for (const e of all("[data-value]"))
      e.textContent = String(+config[e.dataset.value].toFixed(2));
    $("[data-free]").checked = config.freePlay;
    $("[data-start]").hidden = config.mode !== "challenge";
    $("[data-clock]").hidden = config.mode !== "challenge";
    $("[data-start]").textContent = `Start ${config.timer}-second challenge`;
    if (engine) stats(engine.getState());
  }
  // Avoid repeatedly replacing live-region contents on animation frames.
  function write(selector, value, html = false) {
    const el = $(selector),
      property = html ? "innerHTML" : "textContent";
    if (el[property] !== value) el[property] = value;
  }
  function stats(s) {
    for (const k of [
      "caught",
      "count",
      "pumps",
      "frames",
      "running",
      "round",
      "challenge",
      "time",
      "remaining",
    ])
      root.dataset[k] =
        typeof s[k] === "number"
          ? s[k].toFixed(k === "time" || k === "remaining" ? 2 : 0)
          : String(s[k]);
    write(
      "[data-meter-label]",
      config.freePlay
        ? "NO NEED TO KEEP COUNT"
        : config.mode === "endless"
          ? "RINGS / THIS ROUND"
          : "RINGS AT REST",
    );
    write(
      "[data-score]",
      config.freePlay ? "Free play" : `${s.caught} <em>/ ${s.count}</em>`,
      true,
    );
    write(
      "[data-round]",
      config.mode === "endless"
        ? `ROUND ${s.round} · ${s.total} CAUGHT IN ALL`
        : s.complete
          ? "A PERFECT LITTLE CATCH"
          : `${s.pumps} ${s.pumps === 1 ? "PUMP" : "PUMPS"}`,
    );
    const sec = Math.ceil(s.remaining);
    write(
      "[data-clock]",
      `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`,
    );
    write(
      "[data-start]",
      s.challenge === "playing"
        ? "Restart the challenge"
        : `Start ${config.timer}-second challenge`,
    );
    if (s.caught > lastCaught) {
      say(
        s.complete
          ? "Every ring home. A perfect little afternoon."
          : `${s.caught} ${s.caught === 1 ? "ring has" : "rings have"} found a peg. Give the others a little time.`,
      );
      lastCaught = s.caught;
    }
    if (s.challenge === "finished" && !finished) {
      finished = true;
      say(
        s.complete
          ? `All ${s.count} rings caught with ${sec} seconds to spare.`
          : `Time. ${s.caught} of ${s.count} rings caught in ${config.timer} seconds. Try a slower rhythm.`,
      );
    }
    report({
      fps: s.fps,
      width: s.width,
      height: s.height,
      primitives: s.count + (engine?.model.bubbles.length ?? 0),
      frames: s.frames,
      running: s.running,
      renderer: "Canvas 2D · fixed-step water currents",
    });
  }
  function apply(next) {
    const old = config;
    config = options(next);
    const reset = ["mode", "layout", "shape", "timer", "ringCount"].some(
      (k) => config[k] !== old[k],
    );
    if (reset) {
      lastCaught = 0;
      finished = false;
      say(
        config.mode === "challenge"
          ? "Start the clock when you are ready."
          : config.mode === "endless"
            ? "Catch them all. Another handful arrives when the pegs are full."
            : "Fresh water, fresh possibilities.",
      );
    }
    engine?.update(config);
    sync();
  }
  function change(values) {
    apply({ ...config, ...values });
    publish();
  }
  function resume() {
    localPause = false;
    hostRunning = true;
    engine.setRunning(true);
    $("[data-pause]").textContent = "Ⅱ Hold the tide";
    $("[data-pause]").setAttribute("aria-pressed", "false");
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
  }
  function pump(i) {
    if (config.mode === "challenge" && engine.model.challenge !== "playing") {
      say("Press “Start challenge” to put time on the clock.");
      return;
    }
    resume();
    if (engine.pump(i)) {
      const b = $(`[data-pump="${i}"]`);
      b.classList.add("wrt-pressed");
      later(() => b.classList.remove("wrt-pressed"), 160);
    }
  }
  function reset() {
    lastCaught = 0;
    finished = false;
    engine.reset();
    $(".wrt-toy").classList.remove("wrt-resetting");
    void root.offsetWidth;
    $(".wrt-toy").classList.add("wrt-resetting");
    later(() => $(".wrt-toy").classList.remove("wrt-resetting"), 700);
    say(
      config.mode === "challenge"
        ? "A new challenge is ready. Start the clock when you like."
        : "Back to the bottom. Take a breath, try another current.",
    );
    sync();
  }
  engine = createWaterToy($(".wrt-canvas"), config, {
    frame: stats,
    event(e) {
      if (e.type === "round") {
        lastCaught = 0;
        say(`Round ${e.round}. A fresh handful, and the afternoon goes on.`);
      }
    },
  });
  all("[data-pump]").forEach((b) =>
    on(b, "click", () => pump(+b.dataset.pump)),
  );
  on($(".wrt-canvas"), "keydown", (e) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (["a", "d", "arrowleft", "arrowright", " "].includes(key)) {
      e.preventDefault();
      if (key === "a" || key === "arrowleft") pump(0);
      else if (key === "d" || key === "arrowright") pump(1);
      else {
        pump(0);
        pump(1);
      }
    }
  });
  all("[data-mode]").forEach((b) =>
    on(b, "click", () => {
      const mode = b.dataset.mode;
      change({
        mode,
        layout:
          mode === "challenge"
            ? "quartet"
            : mode === "world"
              ? "terraces"
              : "duet",
        ...(mode === "world" ? { world: "reef" } : {}),
      });
    }),
  );
  all("[data-world]").forEach((b) =>
    on(b, "click", () => change({ world: b.dataset.world })),
  );
  all("[data-control]").forEach((e) =>
    on(e, "input", () =>
      change({ [e.dataset.control]: e.type === "range" ? +e.value : e.value }),
    ),
  );
  on($("[data-free]"), "change", (e) => change({ freePlay: e.target.checked }));
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      publish();
      say(`${p.name.split(" · ")[1]}. A fresh little experiment.`);
    }
  });
  on($("[data-reset]"), "click", reset);
  on($("[data-pause]"), "click", () => {
    localPause = !localPause;
    engine.setRunning(hostRunning && !localPause);
    $("[data-pause]").textContent = localPause
      ? "▶ Let it drift"
      : "Ⅱ Hold the tide";
    $("[data-pause]").setAttribute("aria-pressed", String(localPause));
    if (!localPause) resume();
  });
  on($("[data-start]"), "click", () => {
    lastCaught = 0;
    finished = false;
    engine.start();
    resume();
    say(`You have ${config.timer} seconds. The rings like a little patience.`);
  });
  function download(blob, name) {
    if (!blob || disposed) return;
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    later(() => URL.revokeObjectURL(url), 2000);
    urls.add(url);
  }
  const urls = new Set();
  on($("[data-png]"), "click", async () => {
    const blob = await engine.png();
    if (!disposed) {
      download(blob, "tideling-postcard.png");
      say("Your little water world, kept as a postcard.");
    }
  });
  on($("[data-settings]"), "click", () =>
    download(
      new Blob(
        [
          JSON.stringify(
            { type: "waterfall-ring-toss", version: 1, settings: config },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "tideling-setup.json",
    ),
  );
  on($("[data-import]"), "change", async (e) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 25000) throw Error("Choose a setup smaller than 25 KB.");
      const data = JSON.parse(await f.text());
      if (disposed) return;
      if (
        data.type !== "waterfall-ring-toss" ||
        data.version !== 1 ||
        !data.settings ||
        Object.keys(data.settings).some((k) => !(k in DEFAULTS))
      )
        throw Error("Choose a Tideling setup JSON.");
      apply(data.settings);
      publish();
      say("Your saved setup is back in the water.");
    } catch (err) {
      if (!disposed) say(err.message);
    } finally {
      e.target.value = "";
    }
  });
  sync();
  root.dataset.ready = "true";
  return {
    update(next) {
      if (!notifying && !disposed) apply(next);
    },
    setRunning(value) {
      hostRunning = !!value;
      engine.setRunning(hostRunning && !localPause);
    },
    replay: reset,
    getState: () => engine.getState(),
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      for (const t of timers) clearTimeout(t);
      for (const u of urls) URL.revokeObjectURL(u);
      engine.dispose();
      root.remove();
    },
  };
}
