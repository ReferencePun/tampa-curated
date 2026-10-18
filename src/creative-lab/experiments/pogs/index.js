import { DISCS, SLAMMERS, DEFAULTS, PRESETS } from "./catalog.js";
import { options, parseAlbum, validateStack } from "./model.js";
import { createDiscTable } from "./engine.js";
import { styles } from "./styles.js";
export function mount(host, initial = {}, report = () => {}, integration = {}) {
  let config = options(initial),
    engine,
    disposed = false,
    notifying = false,
    hostRunning = false,
    paused = false,
    view =
      config.mode === "collection"
        ? "album"
        : config.mode === "builder"
          ? "builder"
          : "table",
    album = {},
    remember = true,
    undoAlbum = null,
    builder = DISCS.slice(0, config.stackSize).map((d) => d.id),
    lastHistory = "",
    lastPhase = "",
    artURLs = new Map();
  const storageKey =
      integration.storageKey || "impossible-lab.odd-company.album.v1",
    abort = new AbortController(),
    urls = new Set(),
    root = document.createElement("section");
  root.className = "pg";
  root.setAttribute("aria-label", "Odd Company collectible disc game");
  let storageWarning = "";
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) album = parseAlbum(JSON.parse(raw));
  } catch {
    storageWarning =
      "Saved collection could not be read. This session still works; export your album to keep it.";
  }
  const ranges = [
    ["stackSize", "Stack size", 1, 16, 1],
    ["power", "Strike power", 0.15, 1, 0.05],
    ["angle", "Strike tilt · degrees", 0, 65, 1],
    ["friction", "Table friction", 0.1, 0.9, 0.05],
  ];
  root.innerHTML = `<style>${styles}</style><header class="pg-head"><div><span class="pg-kicker">30 / A SMALL CIRCLE OF FRIENDS</span><h2>Stack them high.<br><em>Make them fly.</em></h2><p>One heavy slammer. A stack of little oddities.<br>Whatever lands face up is yours to keep.</p></div><div class="pg-head-caps" aria-hidden="true"></div></header>
 <nav class="pg-modes" aria-label="Disc game mode"><button data-mode="practice">Practice</button><button data-mode="cpu">Versus CPU</button><button data-mode="collection">Collector’s album</button><button data-mode="builder">Build a stack</button></nav>
 <div data-view="table"><div class="pg-table"><div class="pg-table-top"><div class="pg-brand">ODD COMPANY<small>THE TABLETOP DISC CLUB</small></div><span>FIRST EDITIONS / SERIES 01<br>A FRIENDLY GAME FOR KEEPS</span></div><canvas tabindex="0" role="group" aria-label="Disc table. Drag the slammer toward a point on the stack and release. Or tap to aim and use Strike. Arrow keys aim, Space strikes."></canvas><div class="pg-scoreboard"><div><small>YOUR SIDE</small><output data-you>0</output></div><div><small data-middle-label>LEFT IN THE STACK</small><output data-left>8</output></div><div><small data-right-label>STRIKES</small><output data-right>0</output></div></div></div>
 <div class="pg-actions"><button class="pg-primary" data-strike>Strike the stack ↗</button><button class="pg-primary" data-collect hidden>Collect face-up discs</button><button data-new>New round</button><button data-pause aria-pressed="false">Ⅱ Pause</button></div><p class="pg-status" role="status">Drag the slammer toward the stack. Aim a little off-center for leverage.</p><div class="pg-progress-summary" data-summary hidden></div>
 <div class="pg-steps"><div><strong><b>1.</b> Line it up.</strong><p>Drag the heavy slammer toward a point on the stack. The cross marks your aim.</p></div><div><strong><b>2.</b> Let it fly.</strong><p>Longer, faster flicks strike harder. Or tap to aim and use the Strike button.</p></div><div><strong><b>3.</b> Keep the odd ones.</strong><p>Collect face-up discs. The others stack up for the next strike.</p></div></div>
 <div class="pg-aim"><span>Quick aim</span><button data-aim="-22">Left edge</button><button data-aim="0">Center</button><button data-aim="22">Right edge</button><output data-aim-value class="pg-note">12 / 0</output></div>
 <details class="pg-keys"><summary>Keyboard, touch & the rules</summary><p>Tap the mat to aim. Use Strike for the selected power, or drag from the slammer and release to use your gesture’s power. With the table focused, arrows move the aim, Shift + arrows fine-tunes, Space strikes. A miss flips nothing. You keep only face-up discs after pressing Collect. In CPU mode, turns alternate and Mica uses the same strike model. Your album keeps only your own winnings.</p></details>
 <div class="pg-view-nav"><button data-show="album">Open your album ↗</button><button data-show="builder">Build a custom stack ↗</button></div></div>
 <div data-view="album" class="pg-album" hidden><header class="pg-album-head"><h3>The first editions.</h3><output data-album-count>0 / 12</output></header><p class="pg-note">Twelve original designs. Tap a disc to inspect its reverse. Dimmed editions are still waiting for you on the table.</p><div class="pg-progress" aria-hidden="true"><i data-progress></i></div><div class="pg-album-grid"></div><div class="pg-album-actions"><button class="pg-primary" data-hunt>Play for missing editions ↗</button><button data-show="table">Back to the table</button></div><label class="pg-remember"><input type="checkbox" data-remember checked> Keep my collection on this device</label><div class="pg-save"><button data-album-save>Save album · JSON ↓</button><label class="pg-file">Load album<input type="file" data-album-import accept=".json,application/json" aria-label="Load disc collection"></label><button data-album-clear>Clear album</button><button data-album-undo hidden>Undo clear</button></div><p class="pg-note" data-album-status>Your collection stays on this device. Export a copy to take it with you.</p></div>
 <div data-view="builder" class="pg-builder" hidden><div class="pg-album-head"><h3>Your stack, your rules.</h3><output data-build-count>8 / 16</output></div><p class="pg-builder-note">Tap a design to add a copy. Tap an entry in the stack to remove it. The order runs from bottom to top; upper discs receive more of the strike.</p><div class="pg-build-grid"></div><div class="pg-section"><h3>Bottom → top</h3><small>TAP TO REMOVE</small></div><div class="pg-stack-order"></div><div class="pg-album-actions"><button class="pg-primary" data-deal>Deal this stack ↗</button><button data-reverse>Reverse order</button><button data-build-clear>Empty the stack</button><button data-show="table">Back to the table</button></div><p class="pg-builder-note" data-builder-status>Up to sixteen discs; duplicates are welcome.</p></div>
 <div class="pg-section"><h3>Choose your weight.</h3><small>A DIFFERENT KIND OF HEAVY</small></div><div class="pg-slammers"></div><p class="pg-slammer-note"></p>
 <div class="pg-section"><h3>A little technique.</h3><small>POWER ISN’T EVERYTHING</small></div><div class="pg-controls">${ranges.map(([key, label, min, max, step]) => `<label>${label}<output data-value="${key}"></output><input type="range" data-control="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}"></label>`).join("")}<label>Table surface<select data-control="surface" aria-label="Table surface"><option value="felt">Billiard felt</option><option value="wood">Warm hardwood</option><option value="linen">Collector’s linen</option></select></label><label>Collectible finish<select data-control="style" aria-label="Collectible style"><option value="mixed">Original edition finishes</option><option value="paper">Printed paper</option><option value="metal">Brushed metallic</option><option value="holo">Prismatic foil</option></select></label><label>Starting points<select data-preset aria-label="Disc game preset"><option value="">Choose a table</option>${Object.entries(
   PRESETS,
 )
   .map(([k, p]) => `<option value="${k}">${p.name}</option>`)
   .join("")}</select></label></div>
 <p class="pg-note">Tilt and an off-center hit encourage turning. Weight, power, friction and stack depth change the flight; a full extra turn can land a disc face down again. Changing power or materials affects the next shot. Changing mode or stack size deals a new round.</p><div class="pg-save"><button data-save>Save table & stack · JSON ↓</button><label class="pg-file">Load table<input type="file" data-import accept=".json,application/json" aria-label="Load disc table setup"></label></div><div class="pg-section"><h3>The round, in small victories.</h3><small>FACE UP / BANKED ONLY</small></div><ol class="pg-case"><li>A clean table and a fresh stack.</li></ol><p class="pg-note">Keep the face-up discs; try a different weight or softer strike for the others. All twelve editions and four slammers are original designs.</p>`;
  host.append(root);
  const $ = (s) => root.querySelector(s),
    all = (s) => [...root.querySelectorAll(s)],
    on = (e, t, f) => e.addEventListener(t, f, { signal: abort.signal });
  function say(t) {
    $(".pg-status").textContent = t;
  }
  function write(selector, value) {
    const e = $(selector);
    if (e.textContent !== value) e.textContent = value;
  }
  function saveAlbum() {
    if (!remember) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          type: "odd-company-album",
          version: 1,
          counts: album,
        }),
      );
    } catch {
      $("[data-album-status]").textContent =
        "This browser cannot save locally. Use Save album to keep a copy.";
    }
  }
  function publish() {
    notifying = true;
    root.dispatchEvent(
      new CustomEvent("lab:settings", { bubbles: true, detail: config }),
    );
    notifying = false;
  }
  function syncRunning() {
    engine?.setRunning(hostRunning && !paused && view === "table");
  }
  function show(next, scroll = false) {
    view = next;
    for (const e of all("[data-view]")) e.hidden = e.dataset.view !== view;
    root.dataset.view = view;
    syncRunning();
    if (next === "album") albumCards();
    if (next === "builder") builderCards();
    if (scroll)
      $(`[data-view="${next}"]`).scrollIntoView({
        behavior: "instant",
        block: "start",
      });
  }
  function resume() {
    paused = false;
    hostRunning = true;
    write("[data-pause]", "Ⅱ Pause");
    $("[data-pause]").setAttribute("aria-pressed", "false");
    root.dispatchEvent(
      new CustomEvent("lab:set-pause", { bubbles: true, detail: false }),
    );
    syncRunning();
  }
  function imageURL(id, front = true) {
    const key = id + (front ? "front" : "back");
    if (!artURLs.has(key))
      artURLs.set(
        key,
        (front ? engine.artwork.fronts : engine.artwork.backs)
          .get(id)
          .toDataURL("image/png"),
      );
    return artURLs.get(key);
  }
  function pictures() {
    artURLs.clear();
    $(".pg-head-caps").replaceChildren();
    for (const id of ["moon-moth", "sun-eater", "orbit-club"]) {
      const img = document.createElement("img");
      img.src = imageURL(id);
      img.alt = "";
      $(".pg-head-caps").append(img);
    }
    const slammers = $(".pg-slammers");
    slammers.replaceChildren();
    for (const [id, s] of Object.entries(SLAMMERS)) {
      const b = document.createElement("button");
      b.className = "pg-slammer";
      b.dataset.slammer = id;
      b.innerHTML = '<img alt=""><strong></strong><small></small>';
      b.querySelector("img").src = engine.artwork.slammers
        .get(id)
        .toDataURL("image/png");
      b.querySelector("strong").textContent = s.name;
      b.querySelector("small").textContent =
        `${s.mass.toFixed(2)} × / ${s.material}`;
      slammers.append(b);
    }
    albumCards();
    builderCards();
  }
  function card(d) {
    const b = document.createElement("button");
    b.className = "pg-card";
    const img = document.createElement("img"),
      name = document.createElement("strong"),
      small = document.createElement("small"),
      count = document.createElement("span");
    img.src = imageURL(d.id);
    img.alt = `${d.name} illustrated disc`;
    name.textContent = d.name;
    small.textContent = `${d.number} / ${d.rarity.toUpperCase()}`;
    b.append(img, name, small, count);
    return b;
  }
  function albumCards() {
    if (!engine) return;
    const grid = $(".pg-album-grid");
    grid.replaceChildren();
    for (const d of DISCS) {
      const b = card(d);
      b.dataset.album = d.id;
      b.dataset.owned = String(!!album[d.id]);
      b.dataset.back = "false";
      b.setAttribute(
        "aria-label",
        `${d.name}, ${album[d.id] || 0} collected. Inspect reverse.`,
      );
      b.querySelector("span").textContent = album[d.id]
        ? `${album[d.id]} in your album`
        : "Not collected yet";
      grid.append(b);
    }
    const n = Object.keys(album).filter((k) => album[k] > 0).length;
    write("[data-album-count]", `${n} / ${DISCS.length}`);
    $("[data-progress]").style.width = `${(n / DISCS.length) * 100}%`;
    root.dataset.collected = String(
      Object.values(album).reduce((a, b) => a + b, 0),
    );
    root.dataset.editions = String(n);
  }
  function builderCards() {
    if (!engine) return;
    const grid = $(".pg-build-grid");
    grid.replaceChildren();
    for (const d of DISCS) {
      const b = card(d);
      b.dataset.add = d.id;
      b.querySelector("span").textContent =
        `＋ ${builder.filter((id) => id === d.id).length} in stack`;
      b.setAttribute("aria-label", `Add ${d.name}`);
      grid.append(b);
    }
    const list = $(".pg-stack-order");
    list.replaceChildren();
    builder.forEach((id, i) => {
      const b = document.createElement("button");
      b.dataset.remove = String(i);
      b.textContent = `${i + 1}. ${DISCS.find((d) => d.id === id).name} ×`;
      b.setAttribute("aria-label", `Remove position ${i + 1}`);
      list.append(b);
    });
    if (!builder.length) list.textContent = "Choose a few discs above.";
    write("[data-build-count]", `${builder.length} / 16`);
    $("[data-deal]").disabled = !builder.length;
    root.dataset.builder = JSON.stringify(builder);
  }
  function stats(s) {
    for (const k of [
      "phase",
      "actor",
      "turn",
      "round",
      "left",
      "you",
      "cpu",
      "pending",
      "running",
      "frames",
    ])
      root.dataset[k] = String(s[k]);
    root.dataset.clock = s.clock.toFixed(3);
    write("[data-you]", String(s.you));
    write("[data-left]", String(s.phase === "complete" ? 0 : s.left));
    write(
      "[data-right-label]",
      config.mode === "cpu" ? "MICA / CPU" : "STRIKES",
    );
    write("[data-right]", String(config.mode === "cpu" ? s.cpu : s.turn));
    $("[data-strike]").hidden = s.phase === "result";
    $("[data-strike]").disabled = s.phase !== "ready" || s.actor !== "you";
    $("[data-collect]").hidden = s.phase !== "result";
    $("[data-collect]").disabled = s.actor !== "you";
    write(
      "[data-collect]",
      s.actor === "cpu"
        ? `Mica collects ${s.pending}…`
        : s.pending
          ? `Collect ${s.pending} ${s.pending === 1 ? "disc" : "discs"} ↙`
          : "Nothing flipped · restack ↻",
    );
    write(
      "[data-aim-value]",
      `${Math.round(s.aim.x)} / ${Math.round(s.aim.y)}`,
    );
    root.dataset.aim = JSON.stringify(s.aim);
    if (s.phase !== lastPhase) {
      lastPhase = s.phase;
      root.dataset.stateChanged = String(Date.now());
    }
    const complete = s.phase === "complete";
    $("[data-summary]").hidden = !complete;
    if (complete)
      write(
        "[data-summary]",
        config.mode === "cpu"
          ? `${s.you > s.cpu ? "Your round." : s.you < s.cpu ? "Mica wins this one." : "A friendly draw."} You kept ${s.you}; Mica kept ${s.cpu}.`
          : `All ${s.count} discs recovered in ${s.turn} ${s.turn === 1 ? "strike" : "strikes"}. Your collection is a little richer.`,
      );
    if (engine) {
      const key = JSON.stringify(engine.model.history);
      if (key !== lastHistory) {
        lastHistory = key;
        const list = $(".pg-case");
        list.replaceChildren();
        for (const h of engine.model.history) {
          const li = document.createElement("li");
          li.textContent = `${h.turn}. ${h.actor === "you" ? "You" : "Mica"} · ${h.ids.length} face-up · ${Math.round(h.power * 100)}% power`;
          list.append(li);
        }
        if (!engine.model.history.length) {
          const li = document.createElement("li");
          li.textContent = "A clean table and a fresh stack.";
          list.append(li);
        }
      }
    }
    report({
      fps: s.fps,
      width: s.width,
      height: s.height,
      primitives: s.left + 1,
      frames: s.frames,
      running: s.running,
      renderer: "Canvas 2D · projected disc trajectories",
    });
  }
  function event(e) {
    if (e.type === "strike")
      say(
        `${e.actor === "you" ? "Your" : "Mica’s"} strike · ${Math.round(e.power * 100)}% power. Watch the landing faces.`,
      );
    else if (e.type === "land")
      say(
        e.miss
          ? "A clean miss. Try the marked stack area."
          : `${e.count} ${e.count === 1 ? "disc lands" : "discs land"} face up.${e.actor === "you" ? " Collect them to bank your winnings." : ""}`,
      );
    else if (e.type === "collect") {
      if (e.actor === "you") {
        for (const id of e.ids)
          album[id] = Math.min(99999, (album[id] || 0) + 1);
        saveAlbum();
        albumCards();
      }
      say(
        e.ids.length
          ? `${e.actor === "you" ? "You keep" : "Mica keeps"} ${e.ids.length}. The others go back on the stack.`
          : "No face-up discs this time. A lighter strike can turn the tables.",
      );
    } else if (e.type === "thinking")
      say("Mica’s turn. Same slammer, same rules.");
    else if (e.type === "ready") say("Your turn. Line up another strike.");
    else if (e.type === "complete")
      say("The table is clear. Open your album to see what came home.");
  }
  function sync() {
    root.dataset.mode = config.mode;
    root.dataset.style = config.style;
    for (const b of all("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === config.mode));
    for (const b of all("[data-slammer]"))
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.slammer === config.slammer),
      );
    for (const el of all("[data-control]"))
      el.value = String(config[el.dataset.control]);
    for (const el of all("[data-value]"))
      el.textContent =
        el.dataset.value === "power"
          ? `${Math.round(config.power * 100)}%`
          : String(config[el.dataset.value]);
    write(
      ".pg-slammer-note",
      `${SLAMMERS[config.slammer].material} · ${SLAMMERS[config.slammer].note}`,
    );
    if (engine) stats(engine.getState());
  }
  function apply(input) {
    const old = config;
    config = options(input);
    engine.update(config);
    if (config.mode !== old.mode) {
      show(
        config.mode === "collection"
          ? "album"
          : config.mode === "builder"
            ? "builder"
            : "table",
      );
      say("A fresh stack. Make yourself comfortable.");
    }
    sync();
  }
  function change(next) {
    apply({ ...config, ...next });
    publish();
  }
  engine = createDiscTable($("canvas"), config, {
    frame: stats,
    event,
    interact: resume,
    artwork: () => {
      pictures();
      sync();
    },
  });
  pictures();
  show(view);
  sync();
  if (storageWarning) $("[data-album-status]").textContent = storageWarning;
  on(root, "click", (e) => {
    const b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    if (b.dataset.mode) {
      change({ mode: b.dataset.mode });
      return;
    }
    if (b.dataset.show) {
      show(b.dataset.show, true);
      return;
    }
    if (b.dataset.slammer) {
      change({ slammer: b.dataset.slammer });
      return;
    }
    if (b.dataset.aim !== undefined) {
      engine.aim({ x: Number(b.dataset.aim), y: 0 });
      return;
    }
    if (b.dataset.album) {
      const back = b.dataset.back !== "true";
      b.dataset.back = String(back);
      b.querySelector("img").src = imageURL(b.dataset.album, !back);
      b.setAttribute(
        "aria-label",
        `${DISCS.find((d) => d.id === b.dataset.album).name}, showing ${back ? "reverse" : "artwork"}. Tap to turn over.`,
      );
      return;
    }
    if (b.dataset.add) {
      if (builder.length >= 16) {
        write(
          "[data-builder-status]",
          "Sixteen is a full stack. Remove one to make room.",
        );
        return;
      }
      builder.push(b.dataset.add);
      builderCards();
      return;
    }
    if (b.dataset.remove !== undefined) {
      builder.splice(Number(b.dataset.remove), 1);
      builderCards();
      return;
    }
  });
  on($("[data-strike]"), "click", () => {
    resume();
    engine.strike();
  });
  on($("[data-collect]"), "click", () => {
    resume();
    engine.collect();
  });
  on($("[data-new]"), "click", () => {
    engine.reset(
      config.mode === "builder" && builder.length ? builder : undefined,
    );
    say("A fresh stack. Banked discs stay in your album.");
  });
  on($("[data-pause]"), "click", () => {
    if (paused) resume();
    else {
      paused = true;
      syncRunning();
      write("[data-pause]", "▶ Resume");
      $("[data-pause]").setAttribute("aria-pressed", "true");
    }
  });
  for (const el of all("[data-control]"))
    on(el, "input", () =>
      change({
        [el.dataset.control]: el.type === "range" ? Number(el.value) : el.value,
      }),
    );
  on($("[data-preset]"), "change", (e) => {
    if (PRESETS[e.target.value]) {
      apply(PRESETS[e.target.value].settings);
      publish();
    }
  });
  on($("[data-hunt]"), "click", () => {
    const missing = DISCS.filter((d) => !album[d.id]),
      order = [...missing, ...DISCS.filter((d) => album[d.id])];
    change({ mode: "collection" });
    engine.reset(
      Array.from(
        { length: config.stackSize },
        (_, i) => order[i % order.length].id,
      ),
    );
    show("table", true);
    resume();
    say("Uncollected editions go into the stack first. Bring a few home.");
  });
  on($("[data-deal]"), "click", () => {
    if (!builder.length) return;
    change({ mode: "builder", stackSize: builder.length });
    engine.reset(builder);
    show("table", true);
    resume();
    say("Your chosen order, bottom to top. Ready to strike.");
  });
  on($("[data-reverse]"), "click", () => {
    builder.reverse();
    builderCards();
  });
  on($("[data-build-clear]"), "click", () => {
    builder = [];
    builderCards();
  });
  on($("[data-remember]"), "change", (e) => {
    remember = e.target.checked;
    if (remember) saveAlbum();
    else {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      write(
        "[data-album-status]",
        "Collection is now kept only for this session. Export it before leaving.",
      );
    }
  });
  on($("[data-album-clear]"), "click", () => {
    undoAlbum = { ...album };
    album = {};
    saveAlbum();
    albumCards();
    $("[data-album-undo]").hidden = false;
    write(
      "[data-album-status]",
      "Album cleared. Undo is available until you leave this page.",
    );
  });
  on($("[data-album-undo]"), "click", () => {
    if (undoAlbum) {
      for (const [id, n] of Object.entries(undoAlbum))
        album[id] = Math.min(99999, (album[id] || 0) + n);
      undoAlbum = null;
      saveAlbum();
      albumCards();
      $("[data-album-undo]").hidden = true;
      write("[data-album-status]", "Your collection is restored.");
    }
  });
  function download(doc, name) {
    for (const u of urls) URL.revokeObjectURL(u);
    urls.clear();
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    );
    urls.add(u);
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
  }
  on($("[data-album-save]"), "click", () =>
    download(
      { type: "odd-company-album", version: 1, counts: album },
      "odd-company-album.json",
    ),
  );
  on($("[data-save]"), "click", () =>
    download(
      {
        type: "odd-company-table",
        version: 1,
        settings: config,
        stack: engine.model.original,
        builder,
      },
      "odd-company-table.json",
    ),
  );
  async function read(input, fn) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100000)
        throw Error("Choose a JSON file smaller than 100 KB.");
      const doc = JSON.parse(await file.text());
      if (!disposed) fn(doc);
    } catch (e) {
      if (!disposed) {
        say(e.message);
        write("[data-album-status]", e.message);
        write("[data-builder-status]", e.message);
      }
    } finally {
      input.value = "";
    }
  }
  on($("[data-album-import]"), "change", (e) =>
    read(e.target, (doc) => {
      album = parseAlbum(doc);
      saveAlbum();
      albumCards();
      write(
        "[data-album-status]",
        "Album loaded. Your editions are back in their sleeves.",
      );
    }),
  );
  on($("[data-import]"), "change", (e) =>
    read(e.target, (doc) => {
      if (
        doc.type !== "odd-company-table" ||
        doc.version !== 1 ||
        !doc.settings ||
        Object.keys(doc.settings).some((k) => !(k in DEFAULTS)) ||
        Object.entries(doc.settings).some(
          ([k, v]) => typeof v !== typeof DEFAULTS[k],
        )
      )
        throw Error("Choose an Odd Company table JSON file.");
      const stack = validateStack(doc.stack),
        build = validateStack(doc.builder?.length ? doc.builder : doc.stack);
      apply(doc.settings);
      builder = build;
      engine.reset(stack);
      builderCards();
      show("table");
      publish();
      say("Saved table and stack loaded. The round starts fresh.");
    }),
  );
  root.dataset.ready = "true";
  return {
    update(next) {
      if (!notifying && !disposed) apply(next);
    },
    setRunning(v) {
      hostRunning = !!v;
      syncRunning();
    },
    replay() {
      engine.reset(
        config.mode === "builder" && builder.length ? builder : undefined,
      );
    },
    getState: () => engine.getState(),
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      engine.dispose();
      for (const u of urls) URL.revokeObjectURL(u);
      artURLs.clear();
      root.remove();
    },
  };
}
