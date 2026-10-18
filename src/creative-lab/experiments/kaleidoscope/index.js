import {
  SOURCES,
  PALETTES,
  PRESETS,
  options,
  validateDocument,
} from "./model.js";
import { createKaleidoscope } from "./engine.js";
import { styles } from "./styles.js";
const sampleURL = new URL("./assets/palms.jpg", import.meta.url).href;
export function mount(host, initial = {}, report = () => {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    hostRunning = false,
    paused = false,
    uploadToken = 0,
    cinema = false,
    previousOverflow = "",
    photoName = "Palms / Brandon Burridge";
  const root = document.createElement("section"),
    abort = new AbortController(),
    urls = new Set();
  root.className = "ks";
  root.setAttribute("aria-label", "Kaleidoscope optical studio");
  const ranges = [
    ["mirrors", "Mirror pairs", 3, 16, 1],
    ["rotation", "Tube rotation · °", 0, 360, 1],
    ["zoom", "Optical zoom", 0.6, 2.4, 0.05],
    ["rotationSpeed", "Rotation · ° / sec", -6, 6, 0.1],
    ["animationSpeed", "Source motion", 0, 2, 0.05],
    ["softness", "Edge softness", 0, 1, 0.01],
  ];
  const select = (key, label, values) =>
    `<label>${label}<select data-control="${key}" aria-label="${label}">${Object.entries(
      values,
    )
      .map(([v, l]) => `<option value="${v}">${l}</option>`)
      .join("")}</select></label>`;
  root.innerHTML = `<style>${styles}</style><header class="ks-head"><div><span class="ks-kicker">31 / AN INSTRUMENT FOR WONDER</span><h2>A little world.<br><em>Infinitely reflected.</em></h2></div><p>Turn the tube. Stir the fragments.<br>Find a pattern that has never<br>quite existed before.</p></header>
 <div class="ks-stage"><div class="ks-stage-top"><span>KALEIDOSCOPE <b>— No. 031</b></span><span data-optical-label>14 REFLECTED SECTORS</span></div><canvas class="ks-optic" tabindex="0" role="group" aria-label="Interactive kaleidoscope. Drag to stir the source, drag the rim to rotate, or select drawing mode. Arrow keys rotate and zoom; Shift and arrows move the source."></canvas><div class="ks-stage-bottom"><span data-source-label>CUT GLASS / JEWEL BOX</span><span>DRAG TO STIR<br>TURN THE OUTER RING</span></div><button class="ks-exit" data-exit>Exit immersive view ×</button></div>
 <div class="ks-actions"><button class="ks-primary" data-motion>Ⅱ Hold this moment</button><button data-center>Recenter</button><button data-cinema>Immersive view ↗</button><button data-png>Save a print ↓</button></div><p class="ks-status" role="status">Drag the view to move the source. Every fragment has a family of reflections.</p>
 <div class="ks-lower"><aside class="ks-chamber"><h3>The source chamber.</h3><canvas class="ks-source" width="320" height="320" tabindex="0" role="group" aria-label="Unmirrored source chamber. Drag a fragment to rearrange it. In drawing mode, draw directly here."></canvas><p data-chamber-help>These are the real fragments behind the reflection. Drag one to change its place.</p><button data-shuffle>Rearrange the fragments ↗</button><p class="ks-note">One source. Many reflections.</p></aside><div><div class="ks-section"><h3>Change the way you look.</h3><small>THE OPTICAL BENCH</small></div><div class="ks-controls">${select("source", "Source material", SOURCES)}<label>Starting points<select data-preset aria-label="Kaleidoscope preset"><option value="">Choose a study</option>${Object.entries(
   PRESETS,
 )
   .map(([k, v]) => `<option value="${k}">${v.name}</option>`)
   .join(
     "",
   )}</select></label>${ranges.map(([k, l, min, max, step]) => `<label>${l}<output data-value="${k}"></output><input type="range" data-control="${k}" aria-label="${l}" min="${min}" max="${max}" step="${step}"></label>`).join("")}${select("palette", "Color palette", Object.fromEntries(Object.entries(PALETTES).map(([k, v]) => [k, v.name])))}${select("interaction", "Pointer action", { stir: "Stir the source", rotate: "Rotate the tube", off: "Look only" })}${select("border", "Instrument finish", { brass: "Aged brass", graphite: "Graphite", ivory: "Ivory", none: "Unframed disc" })}</div>
 <div class="ks-photo" hidden><label class="ks-file">Choose a photograph<input type="file" data-photo accept="image/png,image/jpeg,image/webp,image/avif,image/gif" aria-label="Choose a local photograph"></label> <button data-sample>Use the sample</button><p data-photo-name>Palms / Brandon Burridge</p><p class="ks-note">Your image stays in this browser. PNG, JPEG, WebP, AVIF or GIF (one frame), up to 20 MB. Photos fill a square chamber; their edges mirror outward. Palette changes do not recolor your photo.</p></div>
 <div class="ks-ink-tools" hidden><div class="ks-controls"><label>Drawing ink<input type="color" data-control="ink" aria-label="Drawing ink"></label><label>Stroke width<output data-value="brush"></output><input type="range" data-control="brush" aria-label="Stroke width" min="1" max="18" step="1"></label></div><div class="ks-strip"><button data-undo>Undo stroke</button><button data-redo>Redo stroke</button><button data-clear>Clear drawing</button></div><p class="ks-note">Draw in either the view or the chamber. Pause motion for precise marks. A single stroke becomes a many-sided ornament.</p></div></div></div>
 <footer class="ks-footer"><p class="ks-note">Keep a fleeting arrangement.<br>Print a 2048 px image, or save a composition with its drawing, photograph and exact moment.</p><div class="ks-save"><button data-save>Save composition · JSON ↓</button><label class="ks-file">Load composition<input type="file" data-load accept=".json,application/json" aria-label="Load kaleidoscope composition"></label></div></footer>
 <details><summary>How to look · keyboard, drawing & photographs</summary><p>Drag inside the disc to move the source. Drag the metal rim to turn the tube, or choose Rotate the tube. In the source chamber, drag a glass fragment, bead, botanical sprig or toy. In drawing mode, use either canvas to draw; a seam crossing begins a new segment so lines do not jump across the source. Undo reverses one segment. Hold this moment stops both rotations and source motion while keeping all controls active.</p><p>With a canvas focused, Left / Right rotate, Up / Down zoom, and Shift + arrows move the source. All settings are also available as ordinary form controls. Look only disables pointer drawing and dragging. The Immersive view can be exited with Escape. Reduced motion starts still; choose Set it moving to opt into animation.</p><p>The sample photograph is by <a href="https://unsplash.com/photos/4wesDlSBq2o" target="_blank" rel="noopener">Brandon Burridge on Unsplash</a>. All fragments, drawings and toy forms are original. Image conversion, drawing and exports happen locally; nothing is uploaded.</p></details>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (el, t, f) => el.addEventListener(t, f, { signal: abort.signal });
  const say = (t) => ($(".ks-status").textContent = t);
  function sync() {
    root.dataset.source = config.source;
    for (const el of all("[data-control]"))
      el.value = String(config[el.dataset.control]);
    for (const el of all("[data-value]"))
      el.textContent = String(config[el.dataset.value]);
    $("[data-optical-label]").textContent =
      `${config.mirrors * 2} REFLECTED SECTORS`;
    $("[data-source-label]").textContent =
      `${SOURCES[config.source]} / ${config.source === "image" ? "ORIGINAL COLOR" : PALETTES[config.palette].name}`;
    $(".ks-photo").hidden = config.source !== "image";
    $(".ks-ink-tools").hidden = config.source !== "drawing";
    $("[data-shuffle]").hidden = ["image", "drawing"].includes(config.source);
    $("[data-chamber-help]").textContent =
      config.source === "drawing"
        ? "Make a mark here, or in the view. The mirrors draw with you."
        : config.source === "image"
          ? "An ordinary photograph, rearranged by mirrors. Drag the view to explore another detail."
          : "These are the real fragments behind the reflection. Drag one to change its place.";
  }
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function apply(v, p = true) {
    config = options({ ...config, ...v });
    engine?.update(config);
    sync();
    if (p) publish();
  }
  function syncMotion() {
    engine?.setRunning(hostRunning && !paused);
    const moving = hostRunning && !paused;
    $("[data-motion]").textContent = moving
      ? "Ⅱ Hold this moment"
      : "▷ Set it moving";
    $("[data-motion]").setAttribute("aria-pressed", String(!moving));
  }
  function resume() {
    paused = false;
    hostRunning = true;
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    syncMotion();
  }
  engine = createKaleidoscope($(".ks-optic"), config, {
    sourceCanvas: $(".ks-source"),
    frame(s) {
      root.dataset.frames = String(s.frames);
      root.dataset.strokes = String(s.strokes);
      root.dataset.seed = String(s.seed);
      root.dataset.time = String(s.time.source);
      root.dataset.pan = JSON.stringify(s.pan);
      root.dataset.rotation = String(s.config.rotation);
      $("[data-undo]").disabled = !s.undo;
      $("[data-redo]").disabled = !s.redo;
      report(s);
    },
    change(next) {
      config = next;
      sync();
      publish();
    },
  });
  async function decode(src) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    await img.decode();
    if (img.width * img.height > 32_000_000)
      throw Error("Please use an image smaller than 32 megapixels.");
    return img;
  }
  async function loadPhoto(file) {
    const token = ++uploadToken;
    let url;
    try {
      if (
        file &&
        (file.size > 20 * 1024 * 1024 ||
          !/^image\/(png|jpeg|webp|avif|gif)$/.test(file.type))
      )
        throw Error(
          "Choose a PNG, JPEG, WebP, AVIF or GIF smaller than 20 MB.",
        );
      url = file ? URL.createObjectURL(file) : sampleURL;
      if (file) urls.add(url);
      if (file || config.source === "image")
        say("Opening the source photograph…");
      const img = await decode(url);
      if (disposed || token !== uploadToken) return;
      engine.setImage(img);
      photoName = file ? file.name : "Palms / Brandon Burridge";
      $("[data-photo-name]").textContent = photoName;
      root.dataset.photo = photoName;
      if (file || config.source === "image")
        say(
          file
            ? "Photograph loaded locally. Drag the view to find a new symmetry."
            : "Sample photograph ready.",
        );
    } catch (e) {
      if (!disposed && token === uploadToken) say(e.message);
    } finally {
      if (file && url) {
        URL.revokeObjectURL(url);
        urls.delete(url);
      }
    }
  }
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
    }, 1500);
  }
  on(root, "input", (e) => {
    const k = e.target.dataset.control;
    if (k)
      apply({
        [k]: ["source", "palette", "interaction", "border", "ink"].includes(k)
          ? e.target.value
          : Number(e.target.value),
      });
  });
  on($("[data-preset]"), "change", (e) => {
    const p = PRESETS[e.target.value];
    if (!p) return;
    apply(p.settings);
    engine.replay();
    say(
      `${p.name.replace(/^\d+ · /, "")}. Explore it with a drag, or hold this moment.`,
    );
  });
  on($("[data-motion]"), "click", () => {
    if (!hostRunning || paused) resume();
    else {
      paused = true;
      syncMotion();
    }
    say(
      paused
        ? "Held still. You can keep turning, drawing and rearranging."
        : "The chamber is moving.",
    );
  });
  on($("[data-center]"), "click", () => {
    engine.center();
    say("The source is centered again.");
  });
  on($("[data-shuffle]"), "click", () => {
    engine.rearrange();
    say("A fresh arrangement of the same small wonders.");
  });
  for (const k of ["undo", "redo", "clear"])
    on($(`[data-${k}]`), "click", () => {
      engine[k]();
      say(
        k === "clear"
          ? "Drawing cleared. Redo can restore it."
          : `${k === "undo" ? "Undid" : "Restored"} a drawing segment.`,
      );
    });
  on($("[data-photo]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await loadPhoto(file);
    e.target.value = "";
  });
  on($("[data-sample]"), "click", () => loadPhoto(null));
  on($("[data-png]"), "click", () => {
    engine.exportCanvas().toBlob((blob) => {
      if (blob && !disposed) {
        download(blob, "kaleidoscope-print.png");
        say("Saved a 2048 × 2048 pixel print.");
      }
    }, "image/png");
  });
  on($("[data-save]"), "click", () => {
    download(
      new Blob([JSON.stringify(engine.serialize())], {
        type: "application/json",
      }),
      "kaleidoscope-composition.json",
    );
    say("Saved this exact arrangement, drawing, image and moment.");
  });
  on($("[data-load]"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = ++uploadToken;
    try {
      if (file.size > 9_000_000)
        throw Error("Composition files must be smaller than 9 MB.");
      const raw = JSON.parse(await file.text()),
        doc = validateDocument(raw),
        img = doc.image ? await decode(doc.image) : null;
      if (disposed || token !== uploadToken) return;
      paused = true;
      syncMotion();
      engine.restore(raw, img);
      config = doc.config;
      sync();
      publish();
      root.dataset.photo = doc.image ? "Saved photograph" : photoName;
      $("[data-photo-name]").textContent = root.dataset.photo;
      say(
        "Composition restored at its saved moment. Set it moving when you are ready.",
      );
    } catch (err) {
      if (!disposed) say(`Could not load: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  });
  const cinemaDialog = document.createElement("dialog");
  cinemaDialog.className = "ks-immersive";
  cinemaDialog.setAttribute("aria-label", "Immersive kaleidoscope");
  root.append(cinemaDialog);
  on(cinemaDialog, "cancel", (e) => {
    e.preventDefault();
    exitCinema();
  });
  function exitCinema() {
    if (!cinema) return;
    cinema = false;
    $(".ks-stage").classList.remove("ks-cinema");
    cinemaDialog.close();
    root.insertBefore($(".ks-stage"), $(".ks-actions"));
    document.body.style.overflow = previousOverflow;
    $("[data-cinema]").focus({ preventScroll: true });
  }
  on($("[data-cinema]"), "click", () => {
    cinema = true;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    $(".ks-stage").classList.add("ks-cinema");
    cinemaDialog.append($(".ks-stage"));
    cinemaDialog.showModal();
    $("[data-exit]").focus({ preventScroll: true });
  });
  on($("[data-exit]"), "click", exitCinema);
  on(document, "keydown", (e) => {
    if (!cinema) return;
    if (e.key === "Escape") {
      e.preventDefault();
      exitCinema();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (document.activeElement === $("[data-exit]")) $(".ks-optic").focus();
      else $("[data-exit]").focus();
    }
  });
  sync();
  loadPhoto(null);
  root.dataset.ready = "true";
  return {
    update(v) {
      if (notifying || disposed) return;
      apply(v, false);
    },
    setRunning(v) {
      hostRunning = !!v;
      syncMotion();
    },
    replay() {
      engine.replay();
    },
    serialize: () => engine.serialize(),
    getState: () => engine.getState(),
    dispose() {
      if (disposed) return;
      exitCinema();
      disposed = true;
      uploadToken++;
      abort.abort();
      engine.dispose();
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      root.remove();
    },
  };
}
