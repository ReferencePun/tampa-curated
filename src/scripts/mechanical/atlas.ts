import { clamp, motion, reducedMotion, type Scene } from "./settings";
import { scrollProgress } from "./progress";
import { measureBook } from "./atlas-book";
import { atlasFrame } from "./atlas-sequence";

export function init(root: HTMLElement): Scene {
  const boards = [...root.querySelectorAll<HTMLElement>("[data-atlas-board]")];
  const captions = [
    ...root.querySelectorAll<HTMLElement>("[data-atlas-caption]"),
  ];
  const selectors = [
    ...root.querySelectorAll<HTMLAnchorElement>("[data-atlas-select]"),
  ];
  const toggle = root.querySelector<HTMLButtonElement>(".atlas-toggle")!;
  const hint = root.querySelector<HTMLElement>(".atlas-scroll-hint")!;
  const announcement = root.querySelector<HTMLElement>(
    "[data-atlas-announcement]",
  )!;
  const stage = root.querySelector<HTMLElement>(".atlas-stage")!;
  const track = root.querySelector<HTMLElement>(".atlas-scroll-track")!;
  const reader = root.querySelector<HTMLElement>(".atlas-sticky")!;
  const controls = root.querySelector<HTMLElement>(".atlas-page-controls")!;
  const previous = root.querySelector<HTMLButtonElement>("[data-atlas-prev]")!;
  const next = root.querySelector<HTMLButtonElement>("[data-atlas-next]")!;
  const contents = root.querySelector<HTMLSelectElement>(
    "[data-atlas-contents]",
  )!;
  const counter = root.querySelector<HTMLElement>("[data-atlas-counter]")!;
  const note = root.querySelector<HTMLElement>("[data-atlas-reader-note]")!;
  const reduced = reducedMotion();
  let saved = 0;
  try {
    saved = Number(sessionStorage.getItem("tc-neighborhood") || 0);
  } catch {
    /* Storage is optional. */
  }
  const candidate = Number(root.dataset.selected ?? saved);
  let selected = Number.isInteger(candidate)
    ? clamp(candidate, 0, boards.length - 1)
    : 0;
  let open = root.dataset.open !== "false",
    progress = 1,
    frame = 0,
    resizeFrame = 0,
    configureFrame = 0;
  let pinned = false,
    disposeScroll = () => {},
    drawBook = (_progress: number) => {};
  const hashIndex = captions.findIndex(
    (caption) => `#${caption.id}` === location.hash,
  );
  let direct = hashIndex >= 0;
  if (direct) selected = hashIndex;
  const events = new AbortController();
  const number = (value: number) => String(value).padStart(2, "0");
  root.style.setProperty("--atlas-spread-count", String(boards.length));

  function apply(p: number) {
    progress = p;
    drawBook(p);
    root.dataset.progress = p.toFixed(3);
    if (pinned) open = p >= 0.5;
    root.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = `${open ? "Close" : "Open"} atlas <span aria-hidden="true">${open ? "↙" : "↗"}</span>`;
  }
  function measure() {
    drawBook = measureBook(boards[selected], stage);
    stage.classList.add("is-projected");
    apply(progress);
  }
  function select(index: number, announce = true) {
    selected = index;
    root.dataset.selected = String(index);
    try {
      sessionStorage.setItem("tc-neighborhood", String(index));
    } catch {
      /* Storage is optional. */
    }
    boards.forEach((board, i) => {
      board.hidden = i !== index;
      board.style.display = i === index ? "block" : "";
    });
    captions.forEach((caption, i) => {
      caption.hidden = i !== index;
    });
    selectors.forEach((selector, i) =>
      selector.setAttribute("aria-current", String(i === index)),
    );
    contents.value = String(index);
    counter.textContent = `${number(index + 1)} / ${number(boards.length)}`;
    // aria-disabled retains focus on the control when a reader reaches an end.
    previous.setAttribute("aria-disabled", String(index === 0));
    next.setAttribute("aria-disabled", String(index === boards.length - 1));
    const name = captions[index].querySelector("h3")!.textContent!;
    const imageNote =
      captions[index].querySelector(".atlas-image-note")!.textContent!;
    stage.setAttribute(
      "aria-label",
      `Pop-up atlas, spread ${index + 1} of ${boards.length}: ${name}. ${imageNote} Schematic scenery, not a geographic map.`,
    );
    measure();
    if (announce)
      announcement.textContent = `Spread ${index + 1} of ${boards.length}: ${name}.`;
  }
  function sequence(value: number) {
    const current = atlasFrame(value, boards.length);
    root.dataset.atlasScroll = value.toFixed(4);
    if (selected !== current.index) {
      // Place the newly selected board in its closed pose before it can paint.
      progress = current.openness;
      select(current.index);
    }
    apply(current.openness);
  }
  function goTo(index: number, phase = 0.5) {
    if (!Number.isInteger(index) || index < 0 || index >= boards.length) return;
    cancelAnimationFrame(frame);
    if (pinned) {
      // Stay just inside the requested chapter when closing; pixel rounding
      // must not select the previous spread at an exact chapter boundary.
      const fraction = (index + Math.max(0.001, phase)) / boards.length;
      const top = track.getBoundingClientRect().top + scrollY;
      window.scrollTo({
        top: top - 16 + (track.offsetHeight - innerHeight) * fraction,
        behavior: "instant",
      });
      sequence(fraction);
    } else {
      select(index);
    }
  }
  function configure() {
    disposeScroll();
    disposeScroll = () => {};
    cancelAnimationFrame(frame);
    // Short windows and enlarged text use the same six spreads with buttons;
    // pin only when the complete reader fits without cutting off its controls.
    const eligible = !reduced && !direct && innerHeight >= 620;
    root.classList.toggle("is-pinned", eligible);
    pinned =
      eligible && reader.getBoundingClientRect().height <= innerHeight - 32;
    root.classList.toggle("is-pinned", pinned);
    toggle.hidden = reduced || pinned;
    hint.hidden = !pinned;
    hint.textContent = `SCROLL THROUGH ${boards.length} SPREADS ↓`;
    note.textContent = pinned
      ? "Scroll to turn the pages · illustrative scenes, sample guides"
      : "Browse with the arrows · illustrative scenes, sample guides";
    measure();
    if (pinned) disposeScroll = scrollProgress(track, sequence, true);
    else apply(reduced || open ? 1 : 0);
  }
  selectors.forEach((selector, i) =>
    selector.addEventListener(
      "click",
      (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        goTo(i);
      },
      { signal: events.signal },
    ),
  );
  previous.addEventListener("click", () => goTo(selected - 1), {
    signal: events.signal,
  });
  next.addEventListener("click", () => goTo(selected + 1), {
    signal: events.signal,
  });
  contents.addEventListener("change", () => goTo(Number(contents.value)), {
    signal: events.signal,
  });
  stage.addEventListener(
    "keydown",
    (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      const target =
        event.key === "ArrowLeft"
          ? selected - 1
          : event.key === "ArrowRight"
            ? selected + 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? boards.length - 1
                : null;
      if (target === null) return;
      event.preventDefault();
      goTo(target);
    },
    { signal: events.signal },
  );
  toggle.addEventListener(
    "click",
    () => {
      if (pinned) {
        goTo(selected, open ? 0 : 0.5);
        return;
      }
      open = !open;
      cancelAnimationFrame(frame);
      const start = performance.now(),
        from = progress,
        to = open ? 1 : 0;
      apply(progress);
      const step = (now: number) => {
        const t = clamp((now - start) / motion.foldMs);
        apply(from + (to - from) * (1 - (1 - t) ** 3));
        if (t < 1 && !document.hidden) frame = requestAnimationFrame(step);
      };
      if (reduced) apply(1);
      else frame = requestAnimationFrame(step);
    },
    { signal: events.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        if (!pinned) apply(open ? 1 : 0);
      }
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "hashchange",
    () => {
      const index = captions.findIndex(
        (caption) => `#${caption.id}` === location.hash,
      );
      if (index < 0) return;
      direct = true;
      select(index);
      open = true;
      configure();
      stage.scrollIntoView({ block: "start", behavior: "instant" });
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "resize",
    () => {
      cancelAnimationFrame(configureFrame);
      configureFrame = requestAnimationFrame(configure);
    },
    { signal: events.signal },
  );
  select(selected, false);
  root.classList.add("is-ready");
  controls.hidden = false;
  note.hidden = false;
  stage.tabIndex = 0;
  stage.setAttribute("aria-describedby", "atlas-key-help");
  configure();
  const resize = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  });
  resize.observe(stage);
  return {
    dispose() {
      events.abort();
      disposeScroll();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      cancelAnimationFrame(configureFrame);
      resize.disconnect();
    },
  };
}
