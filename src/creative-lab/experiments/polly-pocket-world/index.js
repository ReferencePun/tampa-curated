import { options, PRESETS, smooth, clamp } from "./model.js";
import { WORLDS } from "./worlds.js";
import { createPocketViewer } from "./viewer.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}) {
  let settings = options(initial),
    viewer,
    active = false,
    disposed = false,
    lost = false,
    raf = 0,
    last = 0,
    clock = 0,
    frames = 0,
    publishTimer = 0,
    drag = null;
  const visual = {
      open: settings.open,
      entry: settings.enter ? 1 : 0,
      actionOne: settings.actionOne,
      actionTwo: settings.actionTwo,
      actionThree: settings.actionThree,
    },
    transitions = new Map(),
    abort = new AbortController(),
    signal = abort.signal,
    motion = matchMedia("(prefers-reduced-motion:reduce)"),
    root = document.createElement("section");
  root.className = "pw";
  root.innerHTML = `<style>${styles}</style><header class="pw-head"><div><span class="pw-kicker">22 / SMALL HOURS COLLECTION</span><h2>A world to keep.</h2><p>A whole afternoon, tucked inside a little case. Unlatch it. Look closer. Find the things that move.</p></div><svg class="pw-emblem" viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width=".8" aria-hidden="true"><rect x="8" y="12" width="64" height="56" rx="23"/><circle cx="40" cy="40" r="18"/><path d="M40 18v44M18 40h44M25 25l30 30M25 55l30-30"/><circle cx="40" cy="40" r="5"/></svg></header><div class="pw-tools"><select data-world aria-label="Miniature world">${Object.entries(
    PRESETS,
  )
    .map(([key, p]) => `<option value="${key}">${p.name}</option>`)
    .join(
      "",
    )}</select><button class="pw-open" data-open>Unlatch & open</button><button data-enter>Look inside</button><button data-tour aria-pressed="false">Auto-tour</button></div><div class="pw-stage" tabindex="0" role="group" aria-label="Pocket world. Drag to rotate. Arrow keys rotate and tilt; plus and minus zoom; Enter opens or closes the case."><canvas aria-label="An original miniature hinged playset"></canvas><img data-static src="${new URL("./assets/preview.svg", import.meta.url).href}" alt="Illustrated static preview of a miniature harbor inside a hinged case" hidden/><p class="pw-stage-note">DRAG TO TURN · TAP THE LATCH TO OPEN</p><div class="pw-view-tools"><button data-zoom="-" aria-label="Zoom out">−</button><button data-zoom="+" aria-label="Zoom in">+</button><button data-home aria-label="Reset camera">↺</button></div><div class="pw-markers"></div><div class="pw-caption"><strong data-name></strong><span data-subtitle></span></div><p class="pw-fallback" role="status" hidden></p></div><div class="pw-section"><div><label data-open-label>Open the case <output data-percent></output></label><input data-hinge type="range" min="0" max="100" step=".01"/><p>Every point on the hinge is yours to inspect.</p></div><div data-travel-label><label data-travel-label-text>Inside the miniature <output data-distance></output></label><input data-journey type="range" min="0" max="100" step=".01"/><p>Enter the world, then scrub around its little landscape.</p></div></div><section class="pw-stops"><span class="pw-kicker">THREE SMALL DISCOVERIES</span><p data-description></p><div class="pw-cards"></div></section><p class="pw-status" role="status">Open the case to reveal its hidden landscape.</p><footer class="pw-footer"><span>Original miniature design.<br>Three worlds. No pieces to lose.</span><button data-mechanism-reset>Reset the little mechanisms ↶</button></footer>`;
  host.append(root);
  const $ = (q) => root.querySelector(q),
    stage = $(".pw-stage"),
    canvas = $("canvas"),
    uid = "pocket-" + Math.random().toString(36).slice(2);
  $("[data-hinge]").id = uid;
  $("[data-open-label]").htmlFor = uid;
  $("[data-journey]").id = uid + "-journey";
  $("[data-travel-label-text]").htmlFor = uid + "-journey";
  const say = (t) => ($(".pw-status").textContent = t);
  function populate() {
    const def = WORLDS[settings.world];
    $("[data-name]").textContent = def.name;
    $("[data-subtitle]").textContent = def.subtitle;
    $("[data-description]").textContent = def.description;
    $(".pw-cards").innerHTML = def.actions
      .map(
        (a, i) =>
          `<button class="pw-card" data-action="${i}"><span>0${i + 1}</span><strong>${a.label}</strong><small>${a.description}</small></button>`,
      )
      .join("");
    $(".pw-markers").innerHTML = def.actions
      .map(
        (a, i) =>
          `<button class="pw-number" data-action="${i}" aria-label="${a.label}">${i + 1}</button>`,
      )
      .join("");
  }
  function publish() {
    clearTimeout(publishTimer);
    root.dispatchEvent(
      new CustomEvent("lab:settings", {
        bubbles: true,
        detail: { ...settings },
      }),
    );
  }
  function later() {
    clearTimeout(publishTimer);
    publishTimer = setTimeout(publish, 180);
  }
  function sync() {
    root.dataset.world = settings.world;
    root.dataset.open = visual.open.toFixed(3);
    root.dataset.enter = String(settings.enter);
    root.dataset.tour = String(settings.tour);
    $("[data-world]").value = settings.world;
    $("[data-open]").textContent =
      settings.open > 50 ? "Close the case" : "Unlatch & open";
    $("[data-open]").setAttribute("aria-expanded", settings.open > 50);
    $("[data-enter]").textContent = settings.enter
      ? "Return to the tabletop"
      : "Enter the miniature";
    $("[data-enter]").setAttribute("aria-pressed", settings.enter);
    $("[data-tour]").setAttribute("aria-pressed", settings.tour);
    $("[data-hinge]").value = visual.open;
    $("[data-percent]").textContent = Math.round(visual.open) + "%";
    $("[data-journey]").value = settings.travel;
    $("[data-journey]").disabled = !settings.enter;
    $("[data-distance]").textContent = Math.round(settings.travel) + "%";
    $(".pw-stage-note").textContent = settings.enter
      ? "INSIDE THE MINIATURE · FOLLOW ITS PATH"
      : visual.open < 40
        ? "DRAG TO TURN · TAP THE CASE TO OPEN"
        : "DRAG TO TURN · FIND THREE LITTLE MECHANISMS";
    root
      .querySelectorAll(".pw-card")
      .forEach((b) => (b.disabled = visual.open < 65 || !viewer));
  }
  function draw() {
    if (disposed || lost) return;
    const stats = viewer?.render({
      open: visual.open,
      entry: visual.entry,
      actions: [visual.actionOne, visual.actionTwo, visual.actionThree],
    });
    if (stats) {
      root.dataset.ready = "true";
      root.dataset.lid = String(stats.lidAngle);
      root.dataset.camera = JSON.stringify(stats.camera);
      root.dataset.actions = JSON.stringify([
        visual.actionOne,
        visual.actionTwo,
        visual.actionThree,
      ]);
      root.dataset.builds = stats.builds;
      root.dataset.drawCalls = stats.drawCalls;
      root.dataset.instances = stats.counts.instances;
      const projected =
        settings.hotspots && visual.open > 65 ? viewer.projected() : [];
      $(".pw-markers")
        .querySelectorAll("button")
        .forEach((b, i) => {
          const p = projected[i];
          b.hidden = !p?.visible;
          if (p) {
            b.style.left = p.x + "px";
            b.style.top = p.y + "px";
          }
        });
      frames++;
      root.dataset.frames = frames;
      report({
        fps: 0,
        width: stats.width,
        height: stats.height,
        primitives: stats.counts.instances,
        frames,
        running: active && (settings.tour || transitions.size > 0),
        renderer: "Three.js / instanced miniature geometry",
      });
    }
    sync();
  }
  function tick(now) {
    raf = 0;
    if (disposed || lost) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (active) {
      clock += dt;
      for (const [key, t] of transitions) {
        const p = clamp((clock - t.start) / t.duration);
        visual[key] = t.from + (t.to - t.from) * smooth(p);
        if (p >= 1) transitions.delete(key);
      }
      if (settings.tour) {
        if (settings.enter)
          settings.travel =
            Math.round(((settings.travel + dt * 3) % 100) * 100) / 100;
        else
          settings.rotation =
            Math.round(
              (((settings.rotation + dt * 7 + 180) % 360) - 180) * 100,
            ) / 100;
        viewer?.update(settings);
        later();
      }
    }
    draw();
    if (active && (transitions.size || settings.tour))
      raf = requestAnimationFrame(tick);
  }
  function request() {
    if (!raf && !disposed && !lost) raf = requestAnimationFrame(tick);
  }
  function animate(key, to, duration = 1.4, delay = 0) {
    if (motion.matches || !active) {
      visual[key] = to;
      transitions.delete(key);
    } else
      transitions.set(key, {
        from: visual[key],
        to,
        start: clock + delay,
        duration,
      });
  }
  function update(next, notify = false, animated = false) {
    if (disposed) return;
    const previous = settings;
    if (next.open !== undefined && next.open < 100 && previous.enter)
      next = { ...next, enter: false };
    settings = options({ ...settings, ...next });
    if (previous.world !== settings.world) populate();
    viewer?.update(settings);
    if (animated) {
      animate(
        "entry",
        settings.enter ? 1 : 0,
        1.5,
        settings.enter && visual.open < 90 ? 1.1 : 0,
      );
      animate(
        "open",
        settings.open,
        1.6,
        !settings.enter && visual.entry > 0.1 ? 0.8 : 0,
      );
      for (const key of ["actionOne", "actionTwo", "actionThree"])
        if (settings[key] !== previous[key])
          animate(
            key,
            settings[key],
            WORLDS[settings.world].actions[
              ["actionOne", "actionTwo", "actionThree"].indexOf(key)
            ].kind === "path"
              ? 3.4
              : 1.4,
          );
    } else {
      transitions.clear();
      Object.assign(visual, {
        open: settings.open,
        entry: settings.enter ? 1 : 0,
        actionOne: settings.actionOne,
        actionTwo: settings.actionTwo,
        actionThree: settings.actionThree,
      });
    }
    draw();
    if (notify) publish();
    if (transitions.size || settings.tour) request();
  }
  function wake() {
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    active = true;
    last = 0;
  }
  function toggleOpen() {
    wake();
    const closing = settings.open > 50;
    update({ open: closing ? 0 : 100, enter: false, tour: false }, true, true);
    say(
      closing
        ? "Folding the afternoon away."
        : "A tiny landscape, revealed. Try its three mechanisms.",
    );
  }
  function action(index) {
    if (visual.open < 65 || !viewer) return;
    wake();
    const key = ["actionOne", "actionTwo", "actionThree"][index];
    update({ [key]: settings[key] > 50 ? 0 : 100 }, true, true);
    say(WORLDS[settings.world].actions[index].description);
  }
  function fail(message) {
    root.dataset.ready = "fallback";
    canvas.hidden = true;
    $("[data-static]").hidden = false;
    $(".pw-fallback").hidden = false;
    $(".pw-fallback").textContent = message;
    $(".pw-markers").hidden = true;
    sync();
  }
  function init() {
    try {
      viewer = createPocketViewer(canvas, settings);
      canvas.hidden = false;
      $("[data-static]").hidden = true;
      $(".pw-fallback").hidden = true;
      $(".pw-markers").hidden = false;
      resize();
      draw();
    } catch {
      fail(
        "This browser could not start the 3D miniature. A static harbor plate is shown; the world descriptions and source remain available.",
      );
    }
  }
  function resize() {
    if (disposed || lost) return;
    viewer?.resize(stage.clientWidth, stage.clientHeight);
    draw();
  }
  populate();
  init();
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  $("[data-world]").addEventListener(
    "change",
    (e) =>
      update(
        {
          world: e.target.value,
          enter: false,
          tour: false,
          actionOne: 0,
          actionTwo: 0,
          actionThree: 0,
        },
        true,
      ),
    { signal },
  );
  $("[data-open]").addEventListener("click", toggleOpen, { signal });
  $("[data-enter]").addEventListener(
    "click",
    () => {
      wake();
      update({ enter: !settings.enter, open: 100, tour: false }, true, true);
      say(
        settings.enter
          ? "You are inside the miniature. Use the path slider or Auto-tour."
          : "Returning to the tabletop.",
      );
    },
    { signal },
  );
  $("[data-tour]").addEventListener(
    "click",
    () => {
      wake();
      update({ tour: !settings.tour }, true);
      say(settings.tour ? "A slow tour. Pause at any detail." : "Tour paused.");
    },
    { signal },
  );
  $("[data-hinge]").addEventListener(
    "input",
    (e) => update({ open: +e.target.value, enter: false, tour: false }, true),
    { signal },
  );
  $("[data-journey]").addEventListener(
    "input",
    (e) => update({ travel: +e.target.value, tour: false }, true),
    { signal },
  );
  $("[data-mechanism-reset]").addEventListener(
    "click",
    () => {
      wake();
      update({ actionOne: 0, actionTwo: 0, actionThree: 0 }, true, true);
    },
    { signal },
  );
  $("[data-home]").addEventListener(
    "click",
    () =>
      update(
        {
          rotation: -18,
          tilt: 53,
          zoom: 1,
          enter: false,
          tour: false,
          travel: 0,
        },
        true,
      ),
    { signal },
  );
  root.querySelectorAll("[data-zoom]").forEach((b) =>
    b.addEventListener(
      "click",
      () =>
        update(
          {
            zoom: clamp(
              Math.round(
                (settings.zoom + (b.dataset.zoom === "+" ? 0.15 : -0.15)) * 100,
              ) / 100,
              0.7,
              2.2,
            ),
          },
          true,
        ),
      { signal },
    ),
  );
  root.addEventListener(
    "click",
    (e) => {
      const b = e.target.closest("[data-action]");
      if (b) {
        e.stopPropagation();
        action(+b.dataset.action);
      }
    },
    { signal },
  );
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.closest("button") || e.button !== 0 || !viewer) return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        rotation: settings.rotation,
        tilt: settings.tilt,
        moved: false,
      };
      stage.setPointerCapture(e.pointerId);
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.moved ||= Math.hypot(dx, dy) > 5;
      if (!drag.moved) return;
      const rotation =
        ((((drag.rotation + dx * 0.35 + 180) % 360) + 360) % 360) - 180;
      settings = options({
        ...settings,
        rotation: Math.round(rotation * 100) / 100,
        tilt:
          Math.round(
            clamp(
              drag.tilt + (e.pointerType === "touch" ? 0 : dy * 0.12),
              25,
              78,
            ) * 10,
          ) / 10,
        tour: false,
      });
      viewer?.update(settings);
      request();
      later();
    },
    { signal },
  );
  function release(e) {
    if (!drag || drag.id !== e.pointerId) return;
    const click = !drag.moved;
    drag = null;
    if (stage.hasPointerCapture(e.pointerId))
      stage.releasePointerCapture(e.pointerId);
    if (click && settings.open < 25) {
      const r = stage.getBoundingClientRect();
      if (viewer?.pick(e.clientX - r.left, e.clientY - r.top)) toggleOpen();
    } else publish();
  }
  stage.addEventListener("pointerup", release, { signal });
  stage.addEventListener(
    "pointercancel",
    () => {
      drag = null;
    },
    { signal },
  );
  stage.addEventListener(
    "keydown",
    (e) => {
      if (e.target !== stage) return;
      const keys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "Enter",
      ];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      if (e.key === "Enter") {
        toggleOpen();
        return;
      }
      update(
        {
          rotation: clamp(
            settings.rotation +
              (e.key === "ArrowLeft" ? -8 : e.key === "ArrowRight" ? 8 : 0),
            -180,
            180,
          ),
          tilt: clamp(
            settings.tilt +
              (e.key === "ArrowUp" ? 4 : e.key === "ArrowDown" ? -4 : 0),
            25,
            78,
          ),
          zoom: clamp(
            Math.round(
              (settings.zoom +
                (["+", "="].includes(e.key) ? 0.1 : e.key === "-" ? -0.1 : 0)) *
                100,
            ) / 100,
            0.7,
            2.2,
          ),
          tour: false,
        },
        true,
      );
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      if (disposed) return;
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
      viewer?.setLost();
      viewer?.dispose();
      viewer = null;
      fail("Graphics interrupted. Waiting to reopen the miniature.");
    },
    { signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      if (disposed) return;
      lost = false;
      init();
      request();
    },
    { signal },
  );
  return {
    update(next) {
      const closingInside =
        next.open !== undefined && next.open < 100 && settings.enter;
      if (closingInside) next = { ...next, enter: false };
      if (JSON.stringify(options(next)) === JSON.stringify(settings)) return;
      update(next, closingInside);
    },
    setRunning(value) {
      active = !!value;
      last = 0;
      if (!active) {
        cancelAnimationFrame(raf);
        raf = 0;
        if (settings.tour) later();
      } else if (settings.tour || transitions.size) request();
    },
    replay() {
      update(
        {
          open: 0,
          enter: false,
          tour: false,
          travel: 0,
          actionOne: 0,
          actionTwo: 0,
          actionThree: 0,
        },
        true,
      );
    },
    getState: () => ({
      settings: { ...settings },
      visual: { ...visual },
      active,
      frames,
      disposed,
      transitions: transitions.size,
      viewer: viewer?.getState(),
    }),
    getViewer: () => viewer,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(publishTimer);
      abort.abort();
      observer.disconnect();
      viewer?.dispose();
      transitions.clear();
      root.remove();
    },
  };
}
