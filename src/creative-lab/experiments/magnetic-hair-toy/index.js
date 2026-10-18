import { DEFAULTS, PRESETS, options, WIDTH, HEIGHT } from "./model.js";
import { FACES, drawPortrait, drawGuide } from "./illustration.js";
import { PATTERNS, scorePattern, createChallenge } from "./challenges.js";
import { createMagneticLayer } from "./engine.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options({ ...DEFAULTS, ...initial }),
    engine,
    disposed = false,
    notifying = false,
    score = { score: 0, coverage: 0, precision: 0 },
    scoreTime = 0,
    lastScore = 0,
    lastFinished = false;
  const abort = new AbortController(),
    challenge = createChallenge(),
    root = document.createElement("section");
  root.className = "mht";
  root.setAttribute("aria-label", "Oddly Dapper magnetic portrait toy");
  root.innerHTML = `<style>${styles}</style><header class="mht-head"><div><span class="mht-kicker">26 / THE GENTLE ART OF LOOKING RIDICULOUS</span><h2>A change of character.</h2><p>A small magnet. A few thousand iron filings. A face with absolutely no say in the matter.</p></div><div class="mht-stamp">EST. THIS<br><b>very</b>MOMENT</div></header><nav class="mht-modes" aria-label="Grooming mode"><button data-mode="free">Free grooming</button><button data-mode="timed">Beat the clock</button><button data-mode="template">Follow a pattern</button><button data-mode="silly">Utter nonsense</button></nav>
 <div class="mht-legend"><span>PRESS · GATHER · COMB · LIFT</span><span data-filing-count></span></div><div class="mht-board-wrap"><div class="mht-brand"><strong>Oddly Dapper</strong><small>THE MAGNETIC PORTRAIT PARLOUR</small></div><div class="mht-window"><canvas class="mht-board" tabindex="0" role="group" aria-label="Magnetic portrait. Drag from the filing tray to groom. Arrow keys move the magnet, Space holds or lifts it, P picks up a pinch, Escape releases."></canvas></div><i class="mht-screw" aria-hidden="true"></i><i class="mht-screw" aria-hidden="true"></i><span class="mht-footer-label">A LITTLE IRON / A LOT OF PERSONALITY</span></div>
 <div class="mht-tools"><button class="mht-primary" data-pinch>Pick up a pinch ↗</button><button data-hold aria-pressed="false">Keep magnet down</button><button data-lift>Lift & leave filings</button><button data-shake>Shake it clean ↔</button></div><p class="mht-hint">Press in the dark tray, drag up to the face, then lift to leave a tuft. Or pick up a pinch and move your magnet into place. Space holds or lifts; arrow keys comb.</p>
 <div class="mht-challenge"><div><small data-mode-label>THE CHAIR IS YOURS</small><h3 data-task-title>Give Milo a new idea.</h3><p data-task-copy>Hair, eyebrows, a distinguished moustache, or something entirely your own. Nothing here needs to be sensible.</p><label data-pattern-label hidden><span class="mht-kicker">A LITTLE ASSIGNMENT</span><select data-template aria-label="Grooming pattern">${Object.entries(
   PATTERNS,
 )
   .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
   .join(
     "",
   )}</select></label><div class="mht-timer-actions"><button data-start hidden>Start 45-second challenge</button><button data-finish hidden>Finish now</button><button data-next-task hidden>Another absurd idea ↻</button><button data-check hidden>Check my handiwork</button></div></div><div class="mht-meter"><div class="mht-score"><output data-score>0</output><span data-score-unit>FILINGS ON FACE</span></div><progress data-progress max="100" value="0" aria-label="Pattern match score" hidden></progress><small data-score-detail>THE REST ARE WAITING IN THE TRAY</small><output class="mht-clock" data-clock hidden>00:45</output></div></div>
 <div class="mht-section-title"><h3>Choose your character</h3><small>SLIP A NEW PORTRAIT UNDER THE FILINGS</small></div><div class="mht-faces">${Object.entries(
   FACES,
 )
   .map(
     ([id, f]) =>
       `<button class="mht-face" data-face="${id}"><canvas width="136" height="150" aria-hidden="true"></canvas><span><strong>${f.name}</strong><small>${f.subtitle}</small></span></button>`,
   )
   .join("")}</div>
 <div class="mht-controls"><label>Magnetic pull<output data-value="strength"></output><input data-control="strength" type="range" min=".3" max="2.5" step=".05" aria-label="Magnetic strength"></label><label>Magnet reach<output data-value="radius"></output><input data-control="radius" type="range" min="25" max="110" step="1" aria-label="Magnetic falloff radius"></label><label>Little clumps<output data-value="clumping"></output><input data-control="clumping" type="range" min="0" max="1" step=".05" aria-label="Clumping behavior"></label><label>Filing count<output data-value="density"></output><input data-control="density" type="range" min="1200" max="7000" step="100" aria-label="Particle density"></label><label>Shake speed<output data-value="resetSpeed"></output><input data-control="resetSpeed" type="range" min=".4" max="2" step=".1" aria-label="Shake reset speed"></label><label>Printed finish<select data-control="style"><option value="lithograph">Warm lithograph</option><option value="blueprint">Blue pencil proof</option><option value="sunshine">Sun-faded yellow</option></select></label></div><div class="mht-toggles"><label><input data-hidden type="checkbox"> Hide the magnet</label><label><input data-guides type="checkbox" checked> Show pattern hints</label></div>
 <div class="mht-save"><button data-png>Keep the portrait · PNG ↓</button><button data-json>Save the filings · JSON ↓</button><label class="mht-file">Load a saved portrait<input data-import type="file" accept="application/json,.json" aria-label="Import grooming artwork"></label><select data-preset aria-label="Magnetic toy preset"><option value="">A few starting points</option>${Object.entries(
   PRESETS,
 )
   .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
   .join(
     "",
   )}</select></div><p class="mht-status" role="status">The tray is full. The possibilities are unreasonable.</p><p class="mht-note">Original portraits and toy design. Your artwork stays here until you save it; Lab presets keep the controls. No accounts, uploads, or sound.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, event, fn) =>
      el.addEventListener(event, fn, { signal: abort.signal }),
    say = (text) => ($(".mht-status").textContent = text);
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function scoreNow() {
    if (!engine) return;
    lastScore = performance.now();
    score = scorePattern(engine.field, config.template, config.face);
    syncMeter();
  }
  function syncMeter() {
    if (!engine) return;
    const s = engine.getState(),
      c = challenge.state(),
      free = config.mode === "free" || config.mode === "silly";
    $("[data-score]").textContent = String(
      free ? s.placed : c.status === "finished" ? c.result : score.score,
    );
    $("[data-score-unit]").textContent = free
      ? "FILINGS ON FACE"
      : "% PATTERN MATCH";
    $("[data-progress]").hidden = free;
    $("[data-progress]").value = score.score;
    $("[data-score-detail]").textContent = free
      ? `${(s.count - s.placed).toLocaleString()} LITTLE FILINGS STILL IN THE TRAY`
      : `${score.coverage}% COVERAGE / ${score.precision}% ON THE PATTERN`;
    $("[data-clock]").hidden = config.mode !== "timed";
    const secs = Math.ceil(
      c.status === "ready" ? config.challengeLength : c.remaining,
    );
    $("[data-clock]").textContent =
      `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    root.dataset.score = String(score.score);
    root.dataset.challenge = c.status;
    root.dataset.remaining = c.remaining.toFixed(2);
    $("[data-start]").textContent =
      c.status === "playing"
        ? "Restart challenge"
        : `Start ${config.challengeLength}-second challenge`;
    $("[data-finish]").hidden =
      config.mode !== "timed" || c.status !== "playing";
  }
  function sync() {
    root.dataset.face = config.face;
    root.dataset.mode = config.mode;
    root.dataset.hidden = String(config.hiddenMagnet);
    root.dataset.style = config.style;
    for (const b of all("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === config.mode));
    for (const b of all("[data-face]"))
      b.setAttribute("aria-pressed", String(b.dataset.face === config.face));
    for (const el of all("[data-control]"))
      el.value = String(config[el.dataset.control]);
    for (const el of all("[data-value]"))
      el.textContent = String(config[el.dataset.value]);
    $("[data-filing-count]").textContent =
      config.density.toLocaleString() + " REAL LITTLE FILINGS";
    $("[data-hidden]").checked = config.hiddenMagnet;
    $("[data-guides]").checked = config.guides;
    $("[data-template]").value = config.template;
    const free = config.mode === "free",
      silly = config.mode === "silly";
    $("[data-pattern-label]").hidden = free;
    $("[data-start]").hidden = config.mode !== "timed";
    $("[data-next-task]").hidden = !silly;
    $("[data-check]").hidden = free || silly;
    $("[data-mode-label]").textContent = {
      free: "THE CHAIR IS YOURS",
      timed: "A SMALL TEST OF NERVE",
      template: "THE SHAPE IS A SUGGESTION",
      silly: "GOOD TASTE IS ENTIRELY OPTIONAL",
    }[config.mode];
    $("[data-task-title]").textContent = free
      ? `Give ${FACES[config.face].name} a new idea.`
      : PATTERNS[config.template].name;
    $("[data-task-copy]").textContent = free
      ? "Hair, eyebrows, a distinguished moustache, or something entirely your own. Nothing here needs to be sensible."
      : PATTERNS[config.template].instruction;
    syncMeter();
  }
  function thumbs() {
    const c = document.createElement("canvas");
    c.width = WIDTH;
    c.height = HEIGHT;
    for (const b of all("[data-face]")) {
      drawPortrait(c.getContext("2d"), { ...config, face: b.dataset.face });
      const target = b.querySelector("canvas"),
        g = target.getContext("2d");
      g.clearRect(0, 0, 136, 150);
      g.drawImage(c, 294, 132, 312, 365, 0, 0, 136, 150);
    }
  }
  function resetChallenge() {
    challenge.reset();
    lastFinished = false;
    engine?.setContinuous(false);
  }
  function apply(next) {
    const old = config;
    config = options(next);
    if (
      old.mode !== config.mode ||
      old.template !== config.template ||
      old.face !== config.face ||
      old.challengeLength !== config.challengeLength
    )
      resetChallenge();
    engine?.update(config);
    sync();
    if (old.style !== config.style) thumbs();
    scoreNow();
  }
  function change(values) {
    apply({ ...config, ...values });
    publish();
  }
  engine = createMagneticLayer($(".mht-board"), config, {
    background: drawPortrait,
    overlay: drawGuide,
    frame(s) {
      for (const k of [
        "count",
        "held",
        "placed",
        "checksum",
        "frames",
        "ticks",
        "running",
        "shaking",
      ])
        root.dataset[k] = String(s[k]);
      root.dataset.ready = "true";
      $("[data-hold]").setAttribute("aria-pressed", String(s.latched));
      $("[data-hold]").textContent = s.latched
        ? "Magnet stays down ✓"
        : "Keep magnet down";
      for (const b of all("[data-pinch],[data-hold],[data-lift]"))
        b.disabled = s.shaking;
      report({
        fps:
          s.running &&
          (s.held || s.shaking || challenge.state().status === "playing")
            ? s.fps
            : 0,
        width: s.width,
        height: s.height,
        primitives: s.count,
        frames: s.frames,
        running:
          s.running &&
          (!!s.held || s.shaking || challenge.state().status === "playing"),
        renderer: "Canvas 2D · deterministic magnetic filings",
      });
    },
    change(s) {
      if (!s.held || performance.now() - lastScore > 150) scoreNow();
    },
    tick(dt) {
      scoreTime += dt;
      if (scoreTime > 0.25) {
        scoreTime = 0;
        scoreNow();
      }
      challenge.tick(dt, score.score);
      const c = challenge.state();
      if (c.status === "finished" && !lastFinished) {
        lastFinished = true;
        engine.release();
        engine.setContinuous(false);
        say(
          `Time’s up: ${c.result}% pattern match. ${c.result >= 70 ? "A distinguished performance." : "Every face has its own charm. Try again or keep grooming."}`,
        );
      }
      syncMeter();
    },
    shake(p) {
      const s = Math.sin(p * Math.PI),
        board = $(".mht-board-wrap");
      board.style.setProperty("--shake-x", Math.sin(p * 53) * s * 8 + "px");
      board.style.setProperty("--shake-y", Math.cos(p * 41) * s * 3 + "px");
      board.style.setProperty(
        "--shake-angle",
        Math.sin(p * 39) * s * 0.8 + "deg",
      );
    },
  });
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      change({
        mode: b.dataset.mode,
        ...(b.dataset.mode === "silly" ? { template: "antennae" } : {}),
      });
    });
  for (const b of all("[data-face]"))
    on(b, "click", () => change({ face: b.dataset.face }));
  for (const input of all("[data-control]"))
    on(input, "input", () =>
      change({
        [input.dataset.control]:
          input.type === "range" ? Number(input.value) : input.value,
      }),
    );
  on($("[data-hidden]"), "change", (e) =>
    change({ hiddenMagnet: e.target.checked }),
  );
  on($("[data-guides]"), "change", (e) => change({ guides: e.target.checked }));
  on($("[data-template]"), "change", (e) =>
    change({ template: e.target.value }),
  );
  on($("[data-pinch]"), "click", () => {
    engine.loadPinch();
    say(
      "A pinch is on the magnet. Move over the glass; click Lift & leave filings to put it down.",
    );
  });
  on($("[data-hold]"), "click", () =>
    engine.setLatched(!engine.getState().latched),
  );
  on($("[data-lift]"), "click", () => {
    engine.release();
    say("Magnet lifted. Every little filing stays where you left it.");
  });
  on($("[data-shake]"), "click", () => {
    resetChallenge();
    engine.shake();
    syncMeter();
    say("A clean tray. A fresh start.");
  });
  on($("[data-start]"), "click", () => {
    engine.reset();
    challenge.start(config.challengeLength);
    lastFinished = false;
    scoreNow();
    engine.setContinuous(true);
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    say(
      "The clock is running. Gather from the tray and follow the dotted shape.",
    );
    syncMeter();
  });
  on($("[data-finish]"), "click", () => {
    scoreNow();
    challenge.finish(score.score);
    lastFinished = true;
    engine.release();
    engine.setContinuous(false);
    syncMeter();
    say(
      `Finished with ${score.score}% pattern match. Save your portrait or try again.`,
    );
  });
  on($("[data-next-task]"), "click", () => {
    const list = ["antennae", "spiral", "crown", "handlebar"],
      i = list.indexOf(config.template);
    change({ template: list[(i + 1) % list.length] });
    say(PATTERNS[config.template].instruction);
  });
  on($("[data-check]"), "click", () => {
    scoreNow();
    say(
      `${score.score}% match: ${score.coverage}% of the pattern covered; ${score.precision}% of placed filings are on it.`,
    );
  });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      resetChallenge();
      engine.reset();
      publish();
      say(`Ready for “${p.name}”.`);
    }
    e.target.value = "";
  });
  function download(content, name, type) {
    const blob =
        content instanceof Blob ? content : new Blob([content], { type }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  on($("[data-png]"), "click", async () => {
    const blob = await engine.png();
    if (blob && !disposed) {
      download(blob, "oddly-dapper-" + config.face + ".png", "image/png");
      say(
        "Your portrait is ready to keep. The magnet and pattern hints are left out.",
      );
    }
  });
  on($("[data-json]"), "click", () =>
    download(
      JSON.stringify(engine.serialize()),
      "oddly-dapper-filings.json",
      "application/json",
    ),
  );
  on($("[data-import]"), "change", async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 1800000)
        throw Error("Use a grooming JSON file smaller than 1.8 MB.");
      const text = await f.text();
      if (disposed) return;
      config = engine.load(text);
      resetChallenge();
      sync();
      thumbs();
      scoreNow();
      publish();
      say("Every filing is back in its place. Portrait restored.");
    } catch (error) {
      if (!disposed) say(error.message);
    }
    e.target.value = "";
  });
  sync();
  thumbs();
  scoreNow();
  return {
    update(input) {
      if (!disposed && !notifying) apply(input);
    },
    setRunning(v) {
      engine.setRunning(v);
    },
    replay() {
      resetChallenge();
      engine.reset();
      sync();
    },
    getState() {
      return {
        ...engine.getState(),
        config: { ...config },
        challenge: challenge.state(),
        score: { ...score },
      };
    },
    layer: engine,
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      engine.dispose();
      root.remove();
    },
  };
}
