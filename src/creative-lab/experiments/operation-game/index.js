import { DEFAULTS, PRESETS, options } from "./model.js";
import { createPrecisionToy } from "./engine.js";
import { createToyAudio } from "./audio.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    localPause = false,
    hostRunning = false,
    alertUntil = 0,
    lastLog = "";
  const root = document.createElement("section"),
    abort = new AbortController(),
    audio = createToyAudio(),
    urls = new Set();
  root.className = "op";
  root.setAttribute("aria-label", "Fine Trouble precision toy");
  const ranges = [
    ["tolerance", "Safety clearance · board units", 0, 5, 0.5],
    ["timer", "Challenge seconds", 30, 180, 5],
    ["objectCount", "Little predicaments", 1, 6, 1],
    ["objectSize", "Piece size", 0.7, 1.25, 0.05],
    ["sensitivity", "Tool travel / hand travel", 0.4, 1.5, 0.05],
  ];
  root.innerHTML = `<style>${styles}</style><header class="op-head"><div><span class="op-kicker">29 / THE DEPARTMENT OF MINOR PREDICAMENTS</span><h2>A steady hand.<br><em>A little less trouble.</em></h2><p>Milo has been carrying a few things around.<br>Perhaps you could help him let them go.</p></div><div class="op-seal">SMALL MATTERS<b>handled<br>with care</b>EST. THIS AFTERNOON</div></header>
 <nav class="op-modes" aria-label="Game mode"><button data-mode="classic">Careful extraction</button><button data-mode="timed">Against the clock</button><button data-mode="precision">Three strikes</button><button data-mode="silly">Peculiar diagnosis</button></nav>
 <div class="op-toy"><div class="op-brand-row"><div class="op-brand">Fine Trouble<small>A GAME OF SMALL REMOVALS</small></div><span class="op-serial">STEADY HAND TOY CO.<br>PATIENT Nº 029 / MILO</span></div><div class="op-canvas-wrap"><canvas tabindex="0" role="group" aria-label="Milo's patient board. Drag a piece along its dotted cavity route and release inside the lift ring. Choose a close-up below for touch or keyboard play."></canvas><div class="op-view"><button data-overview hidden>↙ Whole board</button></div></div>
 <div class="op-console"><div><small>SMALL MATTERS REMOVED</small><output data-success>0 <em>/ 6</em></output></div><div><small data-clock-label>POINTS / 100 PER PIECE</small><output data-score>000</output></div><div><small><i class="op-fault-light" aria-hidden="true"></i>EDGE CONTACTS</small><output data-faults>0</output></div></div></div>
 <div class="op-status-row"><p class="op-status" role="status">Begin with any little object. A close-up gives your hand more room.</p><button class="op-start" data-start hidden>Start the clock</button></div>
 <div class="op-steps"><div><strong><b>1.</b> Pick up.</strong><p>Press and hold a small object. The thin ring is the checked footprint.</p></div><div><strong><b>2.</b> Keep steady.</strong><p>Follow the dotted route. The tweezer handles float above the board.</p></div><div><strong><b>3.</b> Let go.</strong><p>Release inside the end ring to lift the piece into the recovery tray.</p></div></div>
 <div class="op-tools"><button data-reset>↻ New appointment</button><button data-pause aria-pressed="false">Ⅱ Pause</button><button data-sound aria-pressed="false">Sound off · enable</button></div>
 <div class="op-recovered" data-summary hidden></div><div class="op-section"><h3>A closer examination.</h3><small>CHOOSE A CAVITY / GET CLOSER</small></div><div class="op-objects"></div>
 <details class="op-keyboard"><summary>Keyboard & touch instructions</summary><p>Choose a cavity for a magnified view. With the board focused, Space grips or releases the piece; arrow keys move the tool, and Shift + arrows make smaller adjustments. Escape returns the piece safely. On touchscreens, use the close-up and drag slowly. Lifting your finger inside the end ring completes the removal; lifting elsewhere returns the piece without a penalty.</p></details>
 <div class="op-section"><h3>Set the stakes.</h3><small>PATIENCE IS ADJUSTABLE</small></div><div class="op-controls"><label>Difficulty<select data-control="difficulty" aria-label="Difficulty"><option value="gentle">Gentle · generous cavities</option><option value="steady">Steady · a little care</option><option value="expert">Expert · very little room</option></select></label><label>Board finish<select data-control="boardStyle" aria-label="Board style"><option value="sage">Sea-glass green</option><option value="coral">Faded terracotta</option><option value="blue">Uniform blue</option></select></label>${ranges.map(([key, label, min, max, step]) => `<label>${label}<output data-value="${key}"></output><input type="range" data-control="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}"></label>`).join("")}<label>Ready-made appointments<select data-preset aria-label="Game preset"><option value="">Choose a starting point</option>${Object.entries(
   PRESETS,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join("")}</select></label></div>
 <p class="op-note">More safety clearance makes the checked ring larger, so you must keep farther from the metal rim. Rule changes begin a fresh appointment. Edge contacts return the current piece and cost 25 points; three contacts end Precision mode. A canceled grip is free.</p>
 <div class="op-save"><button data-save>Save setup · JSON ↓</button><label class="op-file">Load setup<input type="file" data-import accept=".json,application/json" aria-label="Load precision toy settings"></label><button data-log-export>Keep the case notes ↓</button></div>
 <div class="op-section"><h3>Case notes.</h3><small>THIS APPOINTMENT ONLY</small></div><ol class="op-log" aria-label="Extraction history"><li>Nothing removed. Nothing to worry about.</li></ol><p class="op-note">Milo and all six little predicaments are original illustrations. Sound is optional and starts only with your permission. Everything stays in this browser.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (e, t, f) => e.addEventListener(t, f, { signal: abort.signal }),
    say = (t) => ($(".op-status").textContent = t);
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function text(s, v) {
    if ($(s).textContent !== v) $(s).textContent = v;
  }
  function objects() {
    const container = $(".op-objects");
    container.replaceChildren();
    engine.model.scene.cavities.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "op-object";
      b.dataset.inspect = c.id;
      b.innerHTML = `<span>0${i + 1} / CLOSE-UP ↗</span><strong></strong><small></small>`;
      b.querySelector("strong").textContent = c.name;
      b.querySelector("small").textContent = c.note;
      on(b, "click", () => {
        engine.inspect(c.id);
        sync();
        $("canvas").focus({ preventScroll: true });
        $(".op-toy").scrollIntoView({ behavior: "instant", block: "center" });
        say(
          `${c.name}. Follow the dotted route; release at the ring. Space grips, arrows move.`,
        );
      });
      container.append(b);
    });
  }
  function sync() {
    root.dataset.mode = config.mode;
    root.dataset.style = config.boardStyle;
    for (const b of all("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === config.mode));
    for (const e of all("[data-control]"))
      e.value = String(config[e.dataset.control]);
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    $("[data-start]").hidden = config.mode !== "timed";
    $("[data-sound]").setAttribute("aria-pressed", String(audio.enabled));
    text(
      "[data-sound]",
      audio.enabled ? "Sound on · mute" : "Sound off · enable",
    );
    root.dataset.audio = audio.state;
    if (engine) stats(engine.getState());
  }
  function stats(s) {
    for (const k of [
      "status",
      "score",
      "faults",
      "successes",
      "count",
      "running",
      "frames",
      "focus",
      "remaining",
    ])
      root.dataset[k] =
        typeof s[k] === "number"
          ? s[k].toFixed(k === "remaining" ? 2 : 0)
          : String(s[k]);
    const recovered = `${s.successes} <em>/ ${s.count}</em>`;
    if ($("[data-success]").innerHTML !== recovered)
      $("[data-success]").innerHTML = recovered;
    text(
      "[data-clock-label]",
      config.mode === "timed"
        ? `SECONDS LEFT · ${s.score} POINTS`
        : "POINTS / 100 PER PIECE",
    );
    text(
      "[data-score]",
      config.mode === "timed"
        ? String(Math.ceil(s.remaining)).padStart(2, "0")
        : String(s.score).padStart(3, "0"),
    );
    text(
      "[data-faults]",
      config.mode === "precision" ? `${s.faults} / 3` : String(s.faults),
    );
    $("[data-overview]").hidden = !s.focus;
    text(
      "[data-start]",
      s.status === "ready" ? "Start the clock" : "Restart the clock",
    );
    root.dataset.alert = String(performance.now() < alertUntil);
    for (const [i, b] of all("[data-inspect]").entries()) {
      b.setAttribute("aria-pressed", String(b.dataset.inspect === s.focus));
      b.dataset.removed = String(engine.model.pieces[i]?.removed || false);
    }
    const final = ["complete", "failed", "finished"].includes(s.status);
    $("[data-summary]").hidden = !final;
    if (final)
      text(
        "[data-summary]",
        `${s.status === "complete" ? "All clear. Milo feels lighter." : s.status === "failed" ? "Three contacts. Time for a fresh hand." : "The appointment is over."} ${s.successes}/${s.count} removed · ${s.score} points · ${s.faults} edge contacts.`,
      );
    if (engine) {
      const key = JSON.stringify(engine.model.log);
      if (key !== lastLog) {
        lastLog = key;
        const list = $(".op-log");
        list.replaceChildren();
        for (const entry of engine.model.log) {
          const li = document.createElement("li"),
            c = engine.model.scene.cavities.find((c) => c.id === entry.id);
          li.textContent = `${entry.time.toFixed(1)}s · ${c?.name || entry.id} · ${entry.type === "extracted" ? "+100 / removed" : "−25 / rim contact"}`;
          list.append(li);
        }
        if (!engine.model.log.length) {
          const li = document.createElement("li");
          li.textContent = "Nothing removed. Nothing to worry about.";
          list.append(li);
        }
      }
    }
    report({
      fps: s.fps,
      width: s.width,
      height: s.height,
      primitives: s.count,
      frames: s.frames,
      running: s.running,
      renderer: "Canvas 2D · continuous swept-disk collision",
    });
  }
  function event(e) {
    const c = engine?.model.scene.cavities.find((c) => c.id === e.id);
    if (e.type === "contact") {
      alertUntil = performance.now() + 600;
      audio.play("contact");
      say(
        e.finished
          ? "Three contacts. The appointment is over; start again when ready."
          : `${c?.name}: metal rim touched. The piece is back in place. −25 points.`,
      );
    } else if (e.type === "extracted") {
      audio.play("success");
      say(
        e.complete
          ? "All clear. Every little worry recovered. Nicely handled."
          : `${c?.name} recovered. +100 points. A little lighter already.`,
      );
    } else if (e.type === "returned" && !e.cancel)
      say("Piece returned safely. Release inside the end ring to remove it.");
    else if (e.type === "time") {
      audio.quiet();
      say("Time is up. Your completed removals are in the case notes.");
    } else if (e.type === "grab")
      say(
        `${c?.name}: keep the ring away from the edge. Follow the dots to the lift ring.`,
      );
  }
  function resume() {
    localPause = false;
    hostRunning = true;
    engine?.setRunning(true);
    text("[data-pause]", "Ⅱ Pause");
    $("[data-pause]").setAttribute("aria-pressed", "false");
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
  }
  function apply(next) {
    const old = config;
    config = options(next);
    const restart = [
      "mode",
      "difficulty",
      "tolerance",
      "timer",
      "objectCount",
      "objectSize",
    ].some((k) => old[k] !== config[k]);
    engine.update(config);
    if (!config.sound) audio.mute();
    if (restart) {
      objects();
      say(
        config.mode === "timed"
          ? "Press Start the clock when you are ready."
          : "A fresh appointment. Choose a cavity for a close-up.",
      );
    }
    sync();
  }
  function change(next) {
    apply({ ...config, ...next });
    publish();
  }
  engine = createPrecisionToy($("canvas"), config, {
    frame: stats,
    event,
    interact: () => {
      resume();
      if (engine.model.status === "ready")
        say("Press Start the clock before picking up a piece.");
    },
    quiet: () => audio.quiet(),
  });
  objects();
  sync();
  for (const b of all("[data-mode]"))
    on(b, "click", () => change({ mode: b.dataset.mode }));
  for (const e of all("[data-control]"))
    on(e, "input", () =>
      change({
        [e.dataset.control]: e.type === "range" ? Number(e.value) : e.value,
      }),
    );
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      publish();
      say(`${p.name}. Your appointment is ready.`);
    }
  });
  on($("[data-overview]"), "click", () => {
    engine.inspect(null);
    sync();
  });
  on($("[data-reset]"), "click", () => {
    engine.reset();
    objects();
    sync();
    say(
      config.mode === "silly"
        ? "A newly shuffled diagnosis. Same careful hand."
        : "A new appointment. Take your time.",
    );
  });
  on($("[data-start]"), "click", () => {
    resume();
    engine.reset(false);
    engine.start();
    objects();
    sync();
    say(`${config.timer} seconds. Take only the risks you mean to.`);
  });
  on($("[data-pause]"), "click", () => {
    if (localPause) resume();
    else {
      localPause = true;
      engine.setRunning(false);
      audio.quiet();
      text("[data-pause]", "▶ Resume");
      $("[data-pause]").setAttribute("aria-pressed", "true");
      say("Paused. The current piece has been returned safely.");
    }
  });
  on($("[data-sound]"), "click", async () => {
    if (audio.enabled) {
      audio.mute();
      config.sound = false;
    } else {
      config.sound = await audio.enable();
      if (!config.sound)
        say(
          "Audio is unavailable here. The light and case notes still show every contact.",
        );
    }
    if (disposed) return;
    engine.update(config);
    sync();
    publish();
  });
  function download(blob, name) {
    for (const old of urls) URL.revokeObjectURL(old);
    urls.clear();
    const url = URL.createObjectURL(blob);
    urls.add(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }
  const json = (v, name) =>
    download(
      new Blob([JSON.stringify(v, null, 2)], { type: "application/json" }),
      name,
    );
  on($("[data-save]"), "click", () =>
    json(engine.exportSettings(), "fine-trouble-setup.json"),
  );
  on($("[data-log-export]"), "click", () =>
    json(
      {
        type: "fine-trouble-case",
        version: 1,
        settings: { ...config, sound: false },
        result: engine.model.state(),
        events: engine.model.log.map((e) => ({
          ...e,
          name: engine.model.scene.cavities.find((c) => c.id === e.id)?.name,
        })),
      },
      "fine-trouble-case-notes.json",
    ),
  );
  on($("[data-import]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100000) throw Error("Choose a small setup file.");
      const doc = JSON.parse(await file.text());
      if (disposed) return;
      if (
        doc.type !== "fine-trouble-setup" ||
        doc.version !== 1 ||
        !doc.settings ||
        Object.keys(doc.settings).some((k) => !(k in DEFAULTS)) ||
        Object.entries(doc.settings).some(
          ([k, v]) => typeof v !== typeof DEFAULTS[k],
        )
      )
        throw Error("Choose a Fine Trouble setup JSON file.");
      apply({ ...doc.settings, sound: false });
      publish();
      say("Saved setup loaded. Sound remains off until you enable it.");
    } catch (err) {
      if (!disposed) say(err.message);
    } finally {
      e.target.value = "";
    }
  });
  root.dataset.ready = "true";
  return {
    update(next) {
      if (!notifying && !disposed) apply(next);
    },
    setRunning(value) {
      hostRunning = !!value;
      engine.setRunning(hostRunning && !localPause);
      if (!value) audio.quiet();
    },
    replay() {
      engine.reset();
      objects();
      sync();
    },
    getState: () => engine.getState(),
    serialize: () => engine.exportSettings(),
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      engine.dispose();
      audio.dispose();
      for (const u of urls) URL.revokeObjectURL(u);
      urls.clear();
      root.remove();
    },
  };
}
