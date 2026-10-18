import { ACTIVITIES, PRESETS, options, clamp } from "./model.js";
import { createMarginWorker } from "./worker.js";
import { node, architecture } from "./drawing.js";
import { styles } from "./styles.js";
const COPY = {
  hammer: [
    "First, a place to stand.",
    "A few boards. Five small nails. A line that becomes a floor.",
    "The hammer secures each board on impact.",
  ],
  ladder: [
    "One rung beyond the margin.",
    "The next paragraph is just out of reach. Someone has gone to fetch it.",
    "Alternate hands & feet; the page opens with the climb.",
  ],
  rope: [
    "Bring a little world into view.",
    "A drawing waits below the page. The pulley lifts it into the light.",
    "A ratchet holds the load while the hands return.",
  ],
  paint: [
    "Leave the wall unfinished.",
    "The pencil knows the way. Every new line stays where it was put.",
    "The pencil point follows the actual façade contour.",
  ],
  carry: [
    "Something to hold a thought.",
    "Three lengths of timber, carried across the page, become a small frame.",
    "Carry, place, return. The structure remembers each beam.",
  ],
};
export function mount(host, initial = {}, report = () => {}) {
  let settings = options(initial),
    active = false,
    disposed = false,
    raf = 0,
    autoplay = false,
    lastTime = 0,
    frames = 0,
    publishTimer = 0,
    ignoreScroll = false;
  const abort = new AbortController(),
    signal = abort.signal,
    root = document.createElement("div");
  root.className = "mw";
  root.innerHTML = `<style>${styles}</style><header class="mw-head"><div><span class="mw-eyebrow">18 / SMALL LABOURS IN THE MARGIN</span><h2>A page is never built alone.</h2><p>Scroll inside the notebook. Five little workers make a place for the words, one small gesture at a time.</p></div><span class="mw-stamp">working drawings<br>not quite finished</span></header><div class="mw-controls"><select data-job aria-label="Activity preview"><option value="team">The whole little crew</option>${ACTIVITIES.map((id, i) => `<option value="${id}">${i + 1}. ${["Hammer & floor", "Ladder & paragraph", "Rope & picture", "Pencil & wall", "Timber & frame"][i]}</option>`).join("")}</select><button data-autoplay aria-pressed="false">Autoplay study</button><button data-rewind>Back to the beginning ↶</button><button data-finish>See the finished page</button></div><div class="mw-paper" tabindex="0" role="region" aria-label="The workers’ notebook. Scroll to build; scroll upward to undo.">${ACTIVITIES.map((id, i) => `<section class="mw-leaf" data-job-section="${id}"><div class="mw-card"><header class="mw-section-head"><span class="mw-number">0${i + 1}</span><div><h3>${COPY[id][0]}</h3><p>${COPY[id][1]}</p></div></header><div class="mw-stage" data-stage="${id}">${id === "hammer" ? '<div class="mw-output mw-divider"></div><span class="mw-note">a floor for all the things<br>we have not written yet.</span>' : id === "ladder" ? '<article class="mw-output mw-revealed"><strong>A little further up.</strong><p>Some ideas need a ladder. Leave room for the small, improbable ones; they often have the best view.</p></article>' : id === "rope" ? '<figure class="mw-output mw-picture" aria-label="An original pencil drawing of three narrow houses"></figure>' : id === "paint" ? '<div class="mw-output mw-painted"></div>' : '<aside class="mw-output mw-built"><p>Make room<br>for an<br>unfinished<br>thought.</p></aside>'}</div><footer class="mw-caption"><span>${COPY[id][2]}</span><output data-job-value="${id}">00 / 100</output></footer></div></section>`).join("")}<footer class="mw-end"><strong>And there is still room in the margins.</strong><p>Scroll back. Every small labour can be undone.</p><a href="#" data-return>Return to the first page ↑</a></footer></div><div class="mw-transport"><label for="mw-progress">The working timeline</label><output data-value>0%</output><input id="mw-progress" data-progress type="range" min="0" max="100" step="0.01" value="0" aria-label="Construction timeline"/></div><p class="mw-status" role="status">Native scrolling · reversible · no work continues when you stop.</p><div class="mw-presets" aria-label="Drawing presets">${Object.entries(
    PRESETS,
  )
    .map(([key, p]) => `<button data-preset="${key}">${p.name}</button>`)
    .join("")}</div>`;
  host.append(root);
  const $ = (q) => root.querySelector(q),
    paper = $(".mw-paper"),
    leaves = [...root.querySelectorAll(".mw-leaf")],
    workers = new Map();
  // Unique IDs allow several embedded instances without duplicate label references.
  const uid = "mw-" + Math.random().toString(36).slice(2);
  $("input[data-progress]").id = uid;
  root.querySelector('label[for="mw-progress"]').htmlFor = uid;
  const image = node("svg", { viewBox: "0 0 260 215", "aria-hidden": "true" });
  architecture(image);
  $(".mw-picture").append(image);
  for (const id of ACTIVITIES) {
    const element = $(`[data-stage="${id}"]`);
    workers.set(
      id,
      createMarginWorker({
        element,
        activity: id,
        target: element.querySelector(".mw-output"),
        settings,
        character: settings.character,
        position: settings.side,
        scale: settings.size,
      }),
    );
  }
  const maxScroll = () => Math.max(1, paper.scrollHeight - paper.clientHeight);
  function publish() {
    clearTimeout(publishTimer);
    root.dispatchEvent(
      new CustomEvent("lab:settings", {
        bubbles: true,
        detail: { ...settings },
      }),
    );
  }
  function publishSoon() {
    clearTimeout(publishTimer);
    publishTimer = setTimeout(publish, 160);
  }
  function layout() {
    const count = settings.activity === "team" ? 5 : 1,
      height = paper.clientHeight || 600;
    for (const leaf of leaves) {
      const visible =
        settings.activity === "team" ||
        leaf.dataset.jobSection === settings.activity;
      leaf.hidden = !visible;
      leaf.dataset.side = settings.side;
      leaf.style.height = `${height + settings.distance / count}px`;
      leaf.querySelector(".mw-card").style.minHeight =
        `${Math.min(height, 640)}px`;
    }
    $(".mw-end").hidden = settings.activity !== "team";
    root.style.setProperty("--mw-ink", settings.ink);
    $("[data-job]").value = settings.activity;
  }
  function render() {
    if (disposed) return;
    frames++;
    const height = paper.clientHeight || 600;
    for (const leaf of leaves) {
      if (leaf.hidden) continue;
      const id = leaf.dataset.jobSection,
        p = Math.pow(
          clamp(
            (paper.scrollTop - leaf.offsetTop) /
              Math.max(1, leaf.offsetHeight - height),
          ),
          1 / settings.speed,
        );
      workers.get(id).setProgress(p);
      $(`[data-job-value="${id}"]`).textContent =
        `${String(Math.round(p * 100)).padStart(2, "0")} / 100`;
    }
    settings.progress = clamp(paper.scrollTop / maxScroll()) * 100;
    root.dataset.progress = String(settings.progress);
    root.dataset.frames = String(frames);
    root.dataset.activity = settings.activity;
    root.dataset.ready = "true";
    $("input[data-progress]").value = String(settings.progress);
    $("[data-value]").textContent = Math.round(settings.progress) + "%";
    $("[data-autoplay]").setAttribute("aria-pressed", String(autoplay));
    $("[data-autoplay]").textContent = autoplay
      ? "Pause study"
      : "Autoplay study";
    $(".mw-status").dataset.paused = String(!active);
    $(".mw-status").textContent = autoplay
      ? "Autoplay · pause at any gesture, or take over with the scroll."
      : !active
        ? "Preview paused · the timeline and activity controls remain available."
        : "Native scrolling · reversible · no work continues when you stop.";
    report({
      fps: 0,
      width: paper.clientWidth,
      height: paper.clientHeight,
      primitives: [...workers.values()].reduce(
        (n, w) => n + w.element.querySelectorAll("path").length,
        0,
      ),
      frames,
      running: autoplay && active,
      renderer: "Articulated SVG / deterministic job tracks",
    });
  }
  function frame(t) {
    raf = 0;
    if (disposed) return;
    if (autoplay && active) {
      const dt = lastTime ? Math.min(0.05, (t - lastTime) / 1000) : 0;
      ignoreScroll = true;
      paper.scrollTop = Math.min(
        maxScroll(),
        paper.scrollTop + (maxScroll() * dt) / 36,
      );
      ignoreScroll = false;
      if (paper.scrollTop >= maxScroll() - 1) {
        autoplay = false;
        publishSoon();
      }
    }
    lastTime = t;
    render();
    if (autoplay && active) {
      raf = requestAnimationFrame(frame);
      publishSoon();
    }
  }
  function request() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }
  function stop() {
    autoplay = false;
    lastTime = 0;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function seek(value, notify = true) {
    stop();
    ignoreScroll = true;
    paper.scrollTop = (clamp(value, 0, 100) / 100) * maxScroll();
    ignoreScroll = false;
    render();
    if (notify) publish();
  }
  function update(next, notify = false) {
    if (disposed) return;
    const previous = settings;
    settings = options({ ...settings, ...next });
    stop();
    for (const w of workers.values()) w.update(settings);
    layout();
    seek(
      settings.activity !== previous.activity ? 0 : settings.progress,
      false,
    );
    if (notify) publish();
  }
  paper.addEventListener(
    "scroll",
    () => {
      if (ignoreScroll || !active) return;
      request();
      publishSoon();
    },
    { passive: true, signal },
  );
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
    paper.addEventListener(
      event,
      () => {
        if (autoplay) {
          stop();
          request();
          publishSoon();
        }
      },
      { passive: true, signal },
    );
  $("input[data-progress]").addEventListener(
    "input",
    (e) => seek(+e.target.value),
    { signal },
  );
  $("[data-job]").addEventListener(
    "change",
    (e) => update({ activity: e.target.value, progress: 0 }, true),
    { signal },
  );
  $("[data-rewind]").addEventListener("click", () => seek(0), { signal });
  $("[data-return]").addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      seek(0);
      paper.focus({ preventScroll: true });
    },
    { signal },
  );
  $("[data-finish]").addEventListener("click", () => seek(100), { signal });
  $("[data-autoplay]").addEventListener(
    "click",
    () => {
      if (autoplay) {
        stop();
        render();
        publish();
        return;
      }
      if (settings.progress > 99.9) seek(0);
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
      active = true;
      autoplay = true;
      lastTime = 0;
      request();
    },
    { signal },
  );
  root
    .querySelectorAll("[data-preset]")
    .forEach((b) =>
      b.addEventListener(
        "click",
        () =>
          update(
            {
              ...PRESETS[b.dataset.preset].settings,
              activity: settings.activity,
              progress: settings.progress,
            },
            true,
          ),
        { signal },
      ),
    );
  const resize = new ResizeObserver(() => {
    if (disposed) return;
    const progress = settings.progress;
    layout();
    ignoreScroll = true;
    paper.scrollTop = (progress / 100) * maxScroll();
    ignoreScroll = false;
    request();
  });
  resize.observe(paper);
  layout();
  seek(settings.progress, false);
  return {
    update(next) {
      if (JSON.stringify(options(next)) === JSON.stringify(settings)) return;
      update(next);
    },
    setRunning(value) {
      active = !!value;
      if (!active) stop();
      render();
    },
    replay() {
      seek(0);
    },
    getState: () => ({
      settings: { ...settings },
      active,
      autoplay,
      frames,
      disposed,
      workers: Object.fromEntries(
        [...workers].map(([k, w]) => [k, w.getState()]),
      ),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      clearTimeout(publishTimer);
      abort.abort();
      resize.disconnect();
      workers.forEach((w) => w.dispose());
      workers.clear();
      root.remove();
    },
  };
}
export { createMarginWorker } from "./worker.js";
