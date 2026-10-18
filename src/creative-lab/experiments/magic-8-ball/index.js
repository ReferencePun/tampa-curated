import { ANSWER_SETS, PRESETS } from "./answers.js";
import { options } from "./motion.js";
import { createAnswerOrb } from "./engine.js";
import { createOrbAudio } from "./audio.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    hostRunning = false,
    paused = false,
    current = null,
    historyKey = "",
    soundBusy = false;
  const root = document.createElement("section"),
    abort = new AbortController(),
    audio = createOrbAudio(),
    urls = new Set();
  root.className = "mo";
  root.setAttribute("aria-label", "Murmur magic answer orb");
  const ranges = [
    ["intensity", "Shake intensity", 0.3, 2, 0.05],
    ["opacity", "Liquid opacity", 0.1, 0.95, 0.05],
    ["revealSpeed", "Reveal speed", 0.5, 2, 0.05],
    ["lightAngle", "Light direction · °", 0, 360, 1],
    ["lighting", "Light intensity", 0.4, 1.8, 0.05],
    ["interval", "Auto-shake interval · seconds", 8, 30, 1],
  ];
  root.innerHTML = `<style>${styles}</style><header class="mo-head"><div><span class="mo-kicker">32 / THE QUESTION VESSEL</span><h2>Some things need<br><em>a little shake.</em></h2></div><p>Meet Murmur. A pocket of liquid,<br>a little uncertainty, and a thought<br>waiting to float to the surface.</p></header>
 <form class="mo-ask"><label>Your question <span class="mo-note">· or keep it to yourself</span><input type="text" maxlength="180" data-question placeholder="What’s on your mind?" aria-label="Your question" autocomplete="off"></label><button class="mo-primary" type="submit" data-shake>Ask the orb ↗</button></form>
 <div class="mo-theater"><div class="mo-topline"><span>M U R M U R <b> / No. 032</b></span><span data-mode-label>POETIC & MYSTERIOUS</span></div><canvas class="mo-canvas" tabindex="0" role="group" aria-label="Murmur answer orb. Tap to shake, drag back and forth then release, or press Space or Enter."></canvas><div class="mo-progress" aria-hidden="true"><i></i></div><div class="mo-bottomline"><span>TAP, OR SHAKE & RELEASE</span><span data-energy>SMALL MOVEMENTS. STRANGE POSSIBILITIES.</span></div></div>
 <div class="mo-answer" aria-live="polite" aria-atomic="true"><div><span class="mo-label" data-answer-label>THE ORB IS LISTENING</span><blockquote data-answer>Keep a question in mind.</blockquote><p data-asked></p></div><button data-copy disabled>Copy the answer</button></div><p class="mo-status" role="status">Tap the orb, or move it back and forth and let go.</p>
 <div class="mo-actions"><button data-again class="mo-primary">Shake again ↻</button><button data-pause aria-pressed="false">Ⅱ Pause</button><button data-sound aria-pressed="false">Sound off</button><button data-print disabled>Keep this answer · PNG ↓</button><button data-reset>Start over</button></div>
 <div class="mo-settings-head"><h3>Set the mood.</h3><small>THE ORB HAS MANY PERSONALITIES</small></div><div class="mo-controls"><label>Answer set<select data-control="answerSet" aria-label="Answer set">${Object.entries(
   ANSWER_SETS,
 )
   .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
   .join(
     "",
   )}</select></label><label>Starting points<select data-preset aria-label="Orb preset"><option value="">Choose a vessel</option>${Object.entries(
   PRESETS,
 )
   .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
   .join(
     "",
   )}</select></label><label>Glass color<input type="color" data-control="color" aria-label="Glass color"></label>${ranges.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}<label>Answer sequence seed<input type="number" data-control="seed" aria-label="Answer sequence seed" min="1" max="9999" step="1"></label></div><div class="mo-auto"><label><input type="checkbox" data-control="autoShake"> Let the orb ask itself</label><button data-seed>A new sequence ↗</button></div><p class="mo-note" data-set-note></p><p class="mo-note">A toy of chance. The question stays in this tab; it does not change the answer sequence. The same seed and choices repeat the same answers. Sound starts off.</p>
 <section class="mo-notebook"><div class="mo-notebook-head"><h3>Things the orb has said.</h3><button data-clear-history disabled>Clear notebook</button></div><p class="mo-note" data-empty>No ripples yet. The last six answers will rest here.</p><ol class="mo-history"></ol><div class="mo-export-row"><button data-notebook disabled>Save notebook · JSON ↓</button></div><p class="mo-note">This notebook lives only in this tab. Saving it includes your questions and answers. The Lab’s saved presets contain settings only.</p></section>
 <details><summary>How Murmur works · gestures, sequences & quiet</summary><p>A tap gives a gentle shake. Drag back and forth across the orb, then release, to add energy. On a focused orb, Space or Enter asks again. You can interrupt a reveal with another shake; only answers that finish surfacing enter the notebook. Reduced motion reveals an answer immediately without the shaking.</p><p>Each answer set is an original collection. A seeded shuffle bag visits every answer once before starting a new cycle, without repeating the previous answer. Switch sets for a different character; changing the seed restarts the sequence for future questions. Questions are never sent to a service or used to infer a response.</p><p>Pause holds the liquid and reveal exactly where they are and silences active sound. Offscreen previews and hidden tabs also rest. Auto-shake waits for a complete answer, then counts the selected interval; it pauses with the orb. Sound is synthesized locally and requires the Sound button. Start over clears this session and returns to the seed’s first answer.</p></details>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal });
  const say = (t) => ($(".mo-status").textContent = t);
  function sync() {
    for (const e of all("[data-control]")) {
      const v = config[e.dataset.control];
      if (e.type === "checkbox") e.checked = v;
      else e.value = String(v);
    }
    for (const e of all("[data-value]"))
      e.textContent = String(config[e.dataset.value]);
    $("[data-mode-label]").textContent = ANSWER_SETS[config.answerSet].name;
    $("[data-set-note]").textContent =
      ANSWER_SETS[config.answerSet].description;
    root.dataset.mode = config.answerSet;
  }
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function apply(next, p = true) {
    config = options({ ...config, ...next });
    if (!ANSWER_SETS[config.answerSet]) config.answerSet = "poetic";
    engine?.update(config);
    sync();
    if (p) publish();
  }
  function syncRunning() {
    engine?.setRunning(hostRunning && !paused);
    $("[data-pause]").textContent =
      hostRunning && !paused ? "Ⅱ Pause" : "▷ Resume";
    $("[data-pause]").setAttribute(
      "aria-pressed",
      String(!hostRunning || paused),
    );
  }
  function resume() {
    paused = false;
    hostRunning = true;
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    syncRunning();
  }
  function resetResult() {
    current = null;
    $("[data-answer-label]").textContent = "THE ORB IS LISTENING";
    $("[data-answer]").textContent = "Keep a question in mind.";
    $("[data-asked]").textContent = "";
    $("[data-print]").disabled = $("[data-copy]").disabled = true;
  }
  function history(s) {
    const key = s.history.map((a) => a.cast).join(",");
    if (key === historyKey) return;
    historyKey = key;
    $(".mo-history").replaceChildren();
    for (const a of s.history) {
      const li = document.createElement("li"),
        small = document.createElement("small"),
        p = document.createElement("p"),
        strong = document.createElement("strong");
      small.textContent = `${String(a.cast).padStart(2, "0")} / ${a.setName}`;
      p.textContent = a.question || "An unspoken question";
      strong.textContent = a.text;
      li.append(small, p, strong);
      $(".mo-history").append(li);
    }
    $("[data-empty]").hidden = s.history.length > 0;
    $("[data-clear-history]").disabled = $("[data-notebook]").disabled =
      s.history.length === 0;
  }
  engine = createAnswerOrb($(".mo-canvas"), config, {
    question: () => $("[data-question]").value,
    interact: resume,
    frame(s) {
      root.dataset.phase = s.phase;
      root.dataset.cast = String(s.cast);
      root.dataset.frames = String(s.frames);
      root.dataset.clock = String(s.clock);
      root.dataset.seed = String(s.seed);
      root.dataset.charge = String(s.charge);
      root.dataset.sound = String(audio.enabled);
      root.dataset.audioState = audio.state;
      $(".mo-progress i").style.transform =
        `scaleX(${s.phase === "ready" ? 0 : s.progress})`;
      if (s.charge > 0)
        $("[data-energy]").textContent =
          `SHAKE ENERGY / ${Math.round(s.charge * 100)}%`;
      else
        $("[data-energy]").textContent =
          "SMALL MOVEMENTS. STRANGE POSSIBILITIES.";
      history(s);
      report(s);
    },
    shake() {
      current = null;
      $("[data-answer-label]").textContent = "SOMETHING IS STIRRING";
      $("[data-answer]").textContent = "Let it come to you.";
      $("[data-asked]").textContent = "";
      $("[data-print]").disabled = $("[data-copy]").disabled = true;
      say("The question disappears into the liquid. Give it a moment.");
      audio.play("shake");
    },
    phase(phase) {
      if (phase === "submerged") say("Somewhere in the deep…");
      if (phase === "rising") say("An answer is floating to the surface.");
    },
    answer(a) {
      current = a;
      $("[data-answer-label]").textContent = a.setName;
      $("[data-answer]").textContent = a.text;
      $("[data-asked]").textContent = a.question
        ? `You asked: ${a.question}`
        : "For the question you kept to yourself.";
      $("[data-print]").disabled = $("[data-copy]").disabled = false;
      say("There it is. Keep the thought, or give the orb another shake.");
      audio.play("answer");
    },
    quiet: () => audio.quiet(),
  });
  function ask() {
    resume();
    engine.shake($("[data-question]").value);
  }
  on($(".mo-ask"), "submit", (e) => {
    e.preventDefault();
    ask();
  });
  on($("[data-again]"), "click", ask);
  on(root, "input", (e) => {
    const k = e.target.dataset.control;
    if (!k) return;
    if (k === "seed" && !e.target.validity.valid) return;
    apply({
      [k]:
        e.target.type === "checkbox"
          ? e.target.checked
          : ["color", "answerSet"].includes(k)
            ? e.target.value
            : Number(e.target.value),
    });
    if (k === "autoShake" && config.autoShake) {
      resume();
      say(
        `The orb will shake itself ${config.interval} seconds after each settled answer.`,
      );
    }
  });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      apply(p.settings);
      say("A different mood, ready for the next question.");
    }
  });
  on($("[data-pause]"), "click", () => {
    if (!hostRunning || paused) resume();
    else {
      paused = true;
      syncRunning();
    }
    say(
      paused
        ? "Held in the liquid. Resume to continue."
        : "The liquid is moving again.",
    );
  });
  on($("[data-sound]"), "click", async () => {
    if (soundBusy) return;
    if (audio.enabled) {
      audio.mute();
      $("[data-sound]").textContent = "Sound off";
      $("[data-sound]").setAttribute("aria-pressed", "false");
      say("Sound muted.");
    } else {
      soundBusy = true;
      $("[data-sound]").disabled = true;
      const enabled = await audio.enable();
      if (disposed) return;
      $("[data-sound]").disabled = false;
      soundBusy = false;
      $("[data-sound]").textContent = enabled
        ? "Sound on · mute"
        : "Sound unavailable";
      $("[data-sound]").setAttribute("aria-pressed", String(enabled));
      say(
        enabled
          ? "Soft liquid and bell sounds are enabled."
          : "Sound is unavailable here; the orb still works.",
      );
    }
    root.dataset.sound = String(audio.enabled);
    root.dataset.audioState = audio.state;
  });
  on($("[data-reset]"), "click", () => {
    audio.quiet();
    historyKey = "reset";
    engine.replay();
    resetResult();
    $("[data-question]").value = "";
    say("A clear vessel. The same seed begins again.");
  });
  on($("[data-clear-history]"), "click", () => {
    historyKey = "clear";
    engine.clearHistory();
    say("Notebook cleared from this tab.");
  });
  on($("[data-seed]"), "click", () => {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    const seed = (n[0] % 9999) + 1;
    apply({ seed: seed === config.seed ? (seed % 9999) + 1 : seed });
    say("A new answer sequence, waiting for your next question.");
  });
  function download(blob, name) {
    if (disposed) return;
    const url = URL.createObjectURL(blob);
    urls.add(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
    }, 1200);
  }
  on($("[data-print]"), "click", () =>
    engine.exportCanvas(1600).toBlob((b) => {
      if (b && !disposed) {
        download(b, "murmur-answer.png");
        say("A picture of this answer, saved.");
      }
    }, "image/png"),
  );
  on($("[data-notebook]"), "click", () => {
    const s = engine.getState();
    download(
      new Blob(
        [
          JSON.stringify(
            {
              type: "murmur-notebook",
              version: 1,
              seed: config.seed,
              answers: s.history,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "murmur-notebook.json",
    );
    say("Saved the notebook, including your questions.");
  });
  on($("[data-copy]"), "click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.text);
      if (!disposed) say("Answer copied.");
    } catch {
      if (!disposed) say("Select the answer below the orb to copy it.");
    }
  });
  sync();
  root.dataset.ready = "true";
  root.dataset.sound = "false";
  root.dataset.audioState = "uncreated";
  return {
    update(values) {
      if (!notifying && !disposed) apply(values, false);
    },
    setRunning(v) {
      hostRunning = !!v;
      syncRunning();
    },
    replay() {
      audio.quiet();
      historyKey = "reset";
      engine.replay();
      resetResult();
    },
    getState: () => engine.getState(),
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      audio.dispose();
      engine.dispose();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      root.remove();
    },
  };
}
