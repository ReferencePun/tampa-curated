import {
  DEFAULTS,
  PRESETS,
  options,
  createTransport,
  readReel,
  shiftScene,
} from "./model.js";
import { REELS } from "./reels.js";
import { createSceneRenderer } from "./renderer.js";
import { createClickAudio } from "./audio.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}, integration = {}) {
  let config = options({ ...DEFAULTS, ...initial }),
    custom = integration.reel
      ? readReel(integration.reel, { allowExternal: true })
      : null;
  if (custom) config.reel = "custom";
  if (config.reel === "custom" && !custom) config.reel = "atlas";
  let reel = custom || REELS[config.reel],
    disposed = false,
    running = false,
    notifying = false,
    raf = 0,
    last = 0,
    elapsed = 0,
    frames = 0,
    pan = 0,
    soundArmed = false,
    importVersion = 0;
  const transport = createTransport(reel.scenes.length),
    audio = createClickAudio(),
    abort = new AbortController(),
    motion = matchMedia("(prefers-reduced-motion: reduce)"),
    root = document.createElement("section");
  root.className = "rv";
  root.setAttribute("aria-label", "Elsewhere pocket reel viewer");
  root.innerHTML = `<style>${styles}</style><header class="rv-head"><div><span class="rv-kicker">25 / A POCKET-SIZED DEPARTURE</span><h2>A little way to get away.</h2><p>Slide in a reel. Pull the lever. Find yourself somewhere else.</p></div><div class="rv-edition">ELSEWHERE<br>OPTICAL TOYS<br>—<br>No. 025</div></header>
 <div class="rv-modebar"><nav class="rv-tabs" aria-label="Viewer mode"><button data-mode="standard">The viewer</button><button data-mode="stereo">Two-eye depth</button><button data-mode="exploded">Inspect the reel</button></nav><button data-insert>Pull out reel ↑</button></div>
 <div class="rv-stage" tabindex="0" role="group" aria-label="Reel viewer. Left and right arrow keys change the scene; swipe horizontally across either eyepiece."><div class="rv-reel"><div class="rv-reel-title">ELSEWHERE<small data-disc-name></small></div><div data-slots></div></div><div class="rv-shell"><i class="rv-screw" aria-hidden="true"></i><i class="rv-screw" aria-hidden="true"></i><div class="rv-brand">Elsewhere<span>A LITTLE WINDOW ON THE WORLD</span></div><div class="rv-eyes"><div class="rv-eye"><canvas data-eye="left" role="img" aria-label="Left eyepiece"></canvas></div><div class="rv-eye"><canvas data-eye="right" role="img" aria-label="Right eyepiece"></canvas></div><i class="rv-nose" aria-hidden="true"></i></div><button class="rv-lever" data-next aria-label="Pull the lever to advance one scene" title="Pull to advance">↓</button><div class="rv-shell-foot"><span>POCKET PICTURE<br>THEATRE</span><output class="rv-counter" aria-label="Current frame" data-counter>01 / 06</output><span>MADE FOR<br>WANDERING</span></div></div><div class="rv-inspection"><canvas data-inspect role="img" aria-label="Selected reel frame enlarged"></canvas><p>Each window belongs to the same reel. Select one to look closer.</p><button data-return>Back to the eyepiece ↙</button></div></div>
 <div class="rv-caption" aria-live="polite"><small data-kind></small><h3 data-title></h3><p data-caption></p></div>
 <div class="rv-transport"><button data-prev aria-label="Previous scene">← Previous</button><button data-next class="rv-primary">Next little world →</button><button data-play aria-pressed="false">Autoplay ▷</button><button data-sound aria-pressed="false">Enable click sound</button></div><p class="rv-guide" data-guide></p>
 <div class="rv-controls"><label>Depth strength <output data-depth-out></output><input data-control="depth" type="range" min="0" max="1" step=".05" aria-label="Stereo depth strength"></label><label>Look closer <output data-zoom-out></output><input data-control="zoom" type="range" min=".8" max="1.5" step=".05" aria-label="Viewer zoom"></label><label>Reel window spacing <output data-spacing-out></output><input data-control="spacing" type="range" min=".7" max="1.2" step=".05" aria-label="Reel frame spacing"></label><label>Scene order<select data-control="order"><option value="forward">Around the reel →</option><option value="reverse">Around the reel ←</option></select></label><label>Scene transition<select data-control="transition"><option value="shutter">Mechanical shutter</option><option value="dissolve">Fade through darkness</option><option value="instant">Instant / no motion</option></select></label><label>Toy finish<select data-control="palette"><option value="vermilion">Faded vermilion</option><option value="seafoam">Seafoam green</option><option value="cream">Old cream</option><option value="midnight">Midnight blue</option></select></label></div>
 <div class="rv-section-title"><h3>The reel drawer</h3><small>THREE LITTLE COLLECTIONS</small></div><div class="rv-reels">${Object.entries(
   REELS,
 )
   .map(
     ([id, r], i) =>
       `<button class="rv-reel-card" data-reel="${id}"><small>REEL 0${i + 1} / ${r.scenes.length} SCENES</small><strong>${r.title}</strong><small>${id === "photos" ? "PHOTOGRAPHS" : id === "atlas" ? "ILLUSTRATED PLACES" : "MINIATURE WORLDS"}</small></button>`,
   )
   .join("")}</div>
 <div class="rv-section-title"><h3 data-reel-title></h3><small data-reel-count></small></div><div class="rv-strip" aria-label="Scenes on the current reel"></div><div class="rv-reorder"><button data-earlier>Move scene earlier ←</button><button data-later>Move scene later →</button></div>
 <div class="rv-imports"><label class="rv-file">Make a reel from my photos<input data-photos type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Select local photographs for a custom reel"></label><label class="rv-file">Load a saved reel<input data-import type="file" accept="application/json,.json" aria-label="Import reel JSON"></label><button data-save>Save this reel · JSON ↓</button><button data-settings>Save viewer settings ↓</button><label class="rv-file">Load viewer settings<input data-import-settings type="file" accept="application/json,.json" aria-label="Import viewer settings"></label><select data-preset aria-label="Viewer preset"><option value="">Try a viewer preset</option>${Object.entries(
   PRESETS,
 )
   .map(([id, p]) => `<option value="${id}">${p.name}</option>`)
   .join(
     "",
   )}</select></div><p class="rv-status" role="status">A little atlas is already in the slot. Pull the lever to begin.</p><p class="rv-footnote">Photos stay on your device. Save your custom reel before leaving; Lab presets keep settings, not personal images. Illustrated places are imaginary. This is an original toy design.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, type, fn) =>
      el.addEventListener(type, fn, { signal: abort.signal });
  const say = (s) => ($(".rv-status").textContent = s);
  const renderer = createSceneRenderer(() => {
    if (!disposed) {
      drawThumbnails();
      draw();
    }
  });
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function change(values) {
    apply({ ...config, ...values });
    publish();
  }
  function sync() {
    const s = transport.state(),
      scene = reel.scenes[s.index];
    root.dataset.mode = config.mode;
    root.dataset.palette = config.palette;
    root.dataset.inserted = String(s.inserted);
    root.dataset.scene = String(s.index);
    root.dataset.reel = config.reel;
    root.dataset.count = String(s.count);
    root.dataset.playing = String(config.autoplay);
    root.dataset.audio = audio.state;
    root.dataset.running = String(running);
    root.style.setProperty(
      "--reel-angle",
      `${(-s.rotation * 360) / s.count}deg`,
    );
    $("[data-counter]").textContent =
      `${String(s.index + 1).padStart(2, "0")} / ${String(s.count).padStart(2, "0")}`;
    $("[data-title]").textContent = scene.title;
    $("[data-caption]").textContent = scene.caption;
    $("[data-kind]").textContent =
      scene.kind === "photo"
        ? "PHOTOGRAPH / A SINGLE FLAT RECORD"
        : scene.kind === "stereo-pair"
          ? "STEREO PAIR / SEPARATE LEFT & RIGHT PHOTOGRAPHS"
          : scene.kind === "world"
            ? "A TINY DIMENSIONAL DIORAMA"
            : "AN ILLUSTRATED PLACE / LAYERED PERSPECTIVE";
    $("[data-insert]").textContent = s.inserted
      ? "Pull out reel ↑"
      : "Insert reel ↓";
    $("[data-play]").textContent = config.autoplay
      ? "Pause autoplay Ⅱ"
      : "Autoplay ▷";
    $("[data-play]").setAttribute("aria-pressed", String(config.autoplay));
    $("[data-sound]").textContent = soundArmed
      ? "Mute click sound"
      : "Enable click sound";
    $("[data-sound]").setAttribute("aria-pressed", String(soundArmed));
    for (const b of all("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === config.mode));
    for (const b of all("[data-reel]"))
      b.setAttribute("aria-pressed", String(b.dataset.reel === config.reel));
    for (const b of all("[data-index]"))
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.index) === s.index),
      );
    for (const b of all("[data-next],[data-prev]")) b.disabled = !s.inserted;
    $("[data-earlier]").disabled = s.index === 0;
    $("[data-later]").disabled = s.index === s.count - 1;
    for (const input of all("[data-control]"))
      input.value = String(config[input.dataset.control]);
    $("[data-depth-out]").textContent = Math.round(config.depth * 100) + "%";
    $("[data-zoom-out]").textContent = config.zoom.toFixed(2) + "×";
    $("[data-spacing-out]").textContent =
      Math.round(config.spacing * 100) + "%";
    $("[data-guide]").textContent =
      config.mode === "stereo"
        ? scene.kind === "photo"
          ? "This is a flat photograph; stereo does not invent missing depth. Choose an illustrated reel or import a true stereo pair."
          : "Parallel left/right views use different viewpoints. On an ordinary screen they remain a binocular pair; use a compatible parallel-view stereoscope to fuse them. Lower depth for a gentler effect."
        : config.mode === "exploded"
          ? "Two windows per scene: a left view and a right view. Inspect any frame, then slip the reel back into the viewer."
          : "Pull the side lever, use the arrow keys, or swipe across an eyepiece. A new little world with every click.";
    for (const c of all("[data-eye]"))
      c.setAttribute(
        "aria-label",
        `${c.dataset.eye} eyepiece: ${scene.title}. ${scene.caption}`,
      );
  }
  function buildReel() {
    const slot = $("[data-slots]"),
      strip = $(".rv-strip");
    slot.replaceChildren();
    strip.replaceChildren();
    $("[data-disc-name]").textContent = reel.title;
    $("[data-reel-title]").textContent = reel.title;
    $("[data-reel-count]").textContent = `${reel.scenes.length} LITTLE WINDOWS`;
    reel.scenes.forEach((scene, i) => {
      for (let eye = 0; eye < 2; eye++) {
        const b = document.createElement("button");
        b.className = "rv-frame";
        b.dataset.index = String(i);
        b.dataset.eyeIndex = String(eye);
        b.setAttribute(
          "aria-label",
          `${eye ? "Right" : "Left"} reel frame ${i + 1}: ${scene.title}`,
        );
        b.append(document.createElement("canvas"));
        slot.append(b);
        on(b, "click", () => select(i));
      }
      const b = document.createElement("button");
      b.className = "rv-slide";
      b.dataset.index = String(i);
      const c = document.createElement("canvas"),
        label = document.createElement("span");
      label.textContent = `${String(i + 1).padStart(2, "0")} / ${scene.title}`;
      b.append(c, label);
      strip.append(b);
      on(b, "click", () => select(i));
      renderer.preload(scene);
    });
    positionSlots();
    drawThumbnails();
  }
  function positionSlots() {
    const count = reel.scenes.length * 2;
    all(".rv-frame").forEach((b, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2,
        r = 36 * config.spacing;
      b.style.left = 50 + Math.cos(a) * r + "%";
      b.style.top = 50 + Math.sin(a) * r + "%";
      b.style.setProperty("--frame-angle", `${(a * 180) / Math.PI + 90}deg`);
      const scale = Math.min(1, 14 / count);
      b.style.width = 42 * scale + "px";
      b.style.height = 33 * scale + "px";
    });
  }
  function drawThumbnails() {
    for (const b of all("[data-index]")) {
      renderer.render(
        b.querySelector("canvas"),
        reel.scenes[Number(b.dataset.index)],
        { eye: b.dataset.eyeIndex === "1" ? 0.2 : -0.2, dpr: 1 },
      );
    }
  }
  function draw() {
    if (disposed) return;
    const s = transport.state(),
      scene = reel.scenes[s.phase < 0.5 ? s.from : s.index];
    for (const c of all("[data-eye]"))
      renderer.render(c, scene, {
        eye:
          config.mode === "stereo"
            ? (c.dataset.eye === "left" ? -1 : 1) * config.depth * 0.32
            : 0,
        pan,
        zoom: config.zoom,
        phase: s.phase,
        transition: config.transition,
        inserted: s.inserted,
        dpr: devicePixelRatio || 1,
      });
    if (config.mode === "exploded")
      renderer.render($("[data-inspect]"), reel.scenes[s.index], {
        zoom: 1,
        dpr: devicePixelRatio || 1,
      });
    $(".rv-shell").style.setProperty(
      "--lever-y",
      `${s.phase < 1 ? Math.sin(Math.PI * s.phase) * 10 : 0}px`,
    );
    frames++;
    root.dataset.frames = String(frames);
    root.dataset.phase = s.phase.toFixed(3);
    root.dataset.ready = "true";
    const c = $("[data-eye]");
    report({
      fps: running && needsFrames() ? 60 : 0,
      width: c.width * 2,
      height: c.height,
      primitives: reel.scenes.length,
      frames,
      running: running && needsFrames(),
      renderer: "Canvas 2D · shared perspective geometry / off-axis stereo",
    });
  }
  function needsFrames() {
    return (
      transport.state().phase < 1 ||
      (config.autoplay && transport.state().inserted && !motion.matches)
    );
  }
  function wake() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (running && !disposed && !document.hidden && needsFrames())
      raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (!running || disposed || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    transport.tick(dt);
    if (config.autoplay && transport.state().inserted && !motion.matches) {
      elapsed += dt;
      if (elapsed >= config.interval) {
        elapsed = 0;
        advance(1, false);
      }
    }
    draw();
    if (needsFrames() && !raf) raf = requestAnimationFrame(tick);
  }
  function select(i) {
    if (!transport.state().inserted) {
      transport.insert(true);
      say("Reel inserted.");
    }
    transport.select(
      i,
      running && !motion.matches && config.transition !== "instant",
    );
    elapsed = 0;
    sync();
    draw();
    wake();
    integration.onSceneChange?.(
      reel.scenes[transport.state().index],
      transport.state().index,
    );
  }
  function advance(dir, manual = true) {
    if (!transport.state().inserted) return;
    transport.advance(
      dir,
      config.order === "reverse",
      running && !motion.matches && config.transition !== "instant",
    );
    if (manual && soundArmed) audio.click();
    elapsed = 0;
    sync();
    draw();
    if (manual) wake();
    integration.onSceneChange?.(
      reel.scenes[transport.state().index],
      transport.state().index,
    );
  }
  function apply(input) {
    const next = options(input),
      changed = next.reel !== config.reel;
    if (next.reel === "custom" && !custom) {
      next.reel = "atlas";
      say(
        "Load your custom reel again. Personal images are not stored in Lab presets.",
      );
    }
    config = next;
    if (!config.clickSound && soundArmed) {
      audio.mute();
      soundArmed = false;
    }
    if (changed) {
      reel = config.reel === "custom" ? custom : REELS[config.reel];
      transport.reset(reel.scenes.length);
      elapsed = 0;
      pan = 0;
      renderer.clear();
      buildReel();
    }
    if (motion.matches && config.autoplay)
      say(
        "Reduced motion is enabled. Autoplay stays still; advance scenes with the buttons.",
      );
    positionSlots();
    sync();
    draw();
    wake();
  }
  function loadReel(data, allowExternal = false) {
    const valid = readReel(data, { allowExternal });
    custom = valid;
    config = { ...config, reel: "custom", autoplay: false };
    reel = custom;
    transport.reset(reel.scenes.length);
    elapsed = 0;
    renderer.clear();
    buildReel();
    sync();
    draw();
    wake();
    publish();
    say(
      `Loaded “${reel.title}”: ${reel.scenes.length} scenes, kept on this device.`,
    );
  }
  for (const b of all("[data-mode]"))
    on(b, "click", () => {
      change({ mode: b.dataset.mode });
      drawThumbnails();
    });
  on($("[data-return]"), "click", () => {
    transport.insert(true);
    change({ mode: "standard" });
  });
  for (const b of all("[data-next]")) on(b, "click", () => advance(1));
  on($("[data-prev]"), "click", () => advance(-1));
  on($("[data-insert]"), "click", () => {
    transport.insert(!transport.state().inserted);
    sync();
    draw();
    wake();
    say(
      transport.state().inserted
        ? "Reel seated. The next little world is ready."
        : "Reel removed. Select a collection below or insert it again.",
    );
  });
  on($("[data-play]"), "click", () => {
    change({ autoplay: !config.autoplay });
    if (config.autoplay)
      root.dispatchEvent(
        new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
      );
  });
  on($("[data-sound]"), "click", async () => {
    if (soundArmed) {
      audio.mute();
      soundArmed = false;
      change({ clickSound: false });
    } else {
      soundArmed = await audio.enable();
      if (disposed) {
        audio.dispose();
        return;
      }
      change({ clickSound: soundArmed });
      if (soundArmed) audio.click();
      say(
        soundArmed
          ? "Quiet mechanical clicks enabled. Use this button to mute."
          : "Audio is unavailable in this browser. The viewer works silently.",
      );
    }
    sync();
  });
  for (const input of all("[data-control]"))
    on(input, "input", () => {
      const k = input.dataset.control;
      change({
        [k]: input.type === "range" ? Number(input.value) : input.value,
      });
      if (k === "spacing") drawThumbnails();
    });
  for (const b of all("[data-reel]"))
    on(b, "click", () => {
      change({ reel: b.dataset.reel });
      say(`Inserted “${reel.title}”.`);
    });
  on($(".rv-stage"), "keydown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      advance(e.key === "ArrowRight" ? 1 : -1);
    }
    if (e.key === "Escape") e.target.blur();
  });
  for (const canvas of all("[data-eye]")) {
    let down = null;
    on(canvas, "pointerdown", (e) => {
      if (e.isPrimary && e.button === 0) {
        down = { x: e.clientX, y: e.clientY };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* The pointer may already have been cancelled by a native gesture. */
        }
      }
    });
    on(canvas, "pointerup", (e) => {
      if (down) {
        const dx = e.clientX - down.x,
          dy = e.clientY - down.y;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.4)
          advance(dx < 0 ? 1 : -1);
        down = null;
      }
    });
    on(canvas, "pointercancel", () => (down = null));
    on(canvas, "lostpointercapture", () => (down = null));
    on(canvas, "pointermove", (e) => {
      if (e.pointerType === "mouse" && !motion.matches && !down) {
        const b = canvas.getBoundingClientRect();
        pan = ((e.clientX - b.left) / b.width - 0.5) * 0.18;
        draw();
      }
    });
    on(canvas, "pointerleave", () => {
      pan = 0;
      draw();
    });
  }
  for (const [selector, delta] of [
    ["[data-earlier]", -1],
    ["[data-later]", 1],
  ])
    on($(selector), "click", () => {
      const moved = shiftScene(reel, transport.state().index, delta);
      loadReel(moved.reel, true);
      select(moved.index);
      say(
        "Scene order changed. Save this custom reel to keep the arrangement.",
      );
    });
  function download(data, name, type) {
    const url = URL.createObjectURL(new Blob([data], { type })),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function serializableReel() {
    const result = structuredClone(reel);
    for (const scene of result.scenes)
      for (const key of ["src", "left", "right"])
        if (scene[key] && !scene[key].startsWith("data:")) {
          const response = await fetch(scene[key], { signal: abort.signal });
          if (!response.ok) throw Error("Could not read the image for export.");
          const blob = await response.blob();
          scene[key] = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
        }
    return result;
  }
  on($("[data-save]"), "click", async () => {
    try {
      const result = await serializableReel();
      if (!disposed) {
        download(
          JSON.stringify(result, null, 2),
          "elsewhere-reel.json",
          "application/json",
        );
        say("Reel saved with embedded images and scene order.");
      }
    } catch (e) {
      if (!disposed) say(`Could not save this reel: ${e.message}`);
    }
  });
  on($("[data-settings]"), "click", () =>
    download(
      JSON.stringify({ version: 1, viewer: config }, null, 2),
      "elsewhere-settings.json",
      "application/json",
    ),
  );
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      change(p.settings);
      drawThumbnails();
      say(`Applied “${p.name}”.`);
    }
    e.target.value = "";
  });
  on($("[data-import-settings]"), "change", async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 100000) throw Error("Settings file is too large.");
      const data = JSON.parse(await f.text());
      if (data.version !== 1 || !data.viewer)
        throw Error("Use a saved viewer settings file.");
      if (!disposed) {
        change(data.viewer);
        drawThumbnails();
        say(
          "Viewer settings restored. Sound still requires the enable button.",
        );
      }
    } catch (err) {
      say(err.message);
    }
    e.target.value = "";
  });
  on($("[data-import]"), "change", async (e) => {
    const token = ++importVersion;
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 50000000) throw Error("Use a reel smaller than 50 MB.");
      const text = await f.text();
      if (!disposed && token === importVersion) loadReel(text);
    } catch (err) {
      if (!disposed) say(err.message);
    }
    e.target.value = "";
  });
  async function imageData(file) {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 18000000
    )
      throw Error(
        "Choose PNG, JPEG or WebP photographs smaller than 18 MB each.",
      );
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#eee7d8";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.88);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  on($("[data-photos]"), "change", async (e) => {
    const token = ++importVersion;
    try {
      const files = [...e.target.files];
      if (!files.length) return;
      if (files.length > 24)
        throw Error("Choose up to 24 photographs for one reel.");
      say("Making your reel locally…");
      const scenes = [];
      for (const [i, file] of files.entries()) {
        const src = await imageData(file);
        if (disposed || token !== importVersion) return;
        scenes.push({
          id: `photo-${i}`,
          kind: "photo",
          title: file.name.replace(/\.[^.]+$/, ""),
          caption: "Your photograph · processed locally",
          src,
        });
      }
      loadReel({
        version: 1,
        id: "personal",
        title: "My little collection",
        scenes,
      });
    } catch (err) {
      if (!disposed) say(err.message);
    }
    e.target.value = "";
  });
  const resize = new ResizeObserver(() => {
    if (!disposed) {
      drawThumbnails();
      draw();
    }
  });
  resize.observe($(".rv-stage"));
  on(document, "visibilitychange", () => {
    if (document.hidden) {
      audio.mute();
      soundArmed = false;
      sync();
    }
    wake();
  });
  on(motion, "change", () => {
    if (motion.matches) transport.tick(2);
    sync();
    draw();
    wake();
  });
  buildReel();
  sync();
  draw();
  return {
    update(input) {
      if (!disposed && !notifying) apply(input);
    },
    setRunning(value) {
      running = !!value;
      if (!running) {
        cancelAnimationFrame(raf);
        raf = 0;
        audio.mute();
        soundArmed = false;
      }
      sync();
      draw();
      wake();
    },
    replay() {
      transport.reset(reel.scenes.length);
      elapsed = 0;
      sync();
      draw();
      wake();
    },
    loadReel(data) {
      loadReel(data, true);
    },
    getState() {
      return {
        ...transport.state(),
        settings: { ...config },
        reel: structuredClone(reel),
        running,
        audio: audio.state,
        frames,
      };
    },
    exportReel: serializableReel,
    dispose() {
      if (disposed) return;
      disposed = true;
      importVersion++;
      abort.abort();
      cancelAnimationFrame(raf);
      resize.disconnect();
      renderer.dispose();
      audio.dispose();
      root.remove();
    },
  };
}
