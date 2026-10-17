import { clamp, motion, reducedMotion, type Scene } from "./settings";
import { scrollProgress } from "./progress";
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
  const desktop = matchMedia("(min-width: 1100px) and (min-height: 760px)");
  const reduced = reducedMotion();
  let saved = 0;
  try {
    saved = Number(sessionStorage.getItem("tc-neighborhood") || 0);
  } catch {
    /* Storage is optional. */
  }
  let selected = clamp(
      Number(root.dataset.selected ?? saved),
      0,
      boards.length - 1,
    ),
    open = root.dataset.open !== "false",
    progress = 1,
    frame = 0;
  const hashIndex = captions.findIndex(
    (caption) => `#${caption.id}` === location.hash,
  );
  let direct = hashIndex >= 0;
  if (direct) selected = hashIndex;
  let disposeScroll = () => {};
  const events = new AbortController();
  const apply = (p: number) => {
    progress = p;
    boards.forEach((board) => {
      board.style.setProperty("--fold", `${(1 - p) * motion.foldAngle}deg`);
      board.style.setProperty(
        "--rise",
        `${motion.riseClosed + p * (motion.riseOpen - motion.riseClosed)}deg`,
      );
    });
    root.dataset.progress = p.toFixed(3);
  };
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
    selectors.forEach((selector, i) => {
      selector.setAttribute("aria-current", String(i === index));
    });
    const name = captions[index].querySelector("h3")!.textContent!;
    stage.setAttribute(
      "aria-label",
      `Paper atlas of ${name}. Schematic street grid with illustrative photography, architecture, and palms; not a geographic map.`,
    );
    if (announce) announcement.textContent = `${name} guide selected.`;
  }
  function configure() {
    disposeScroll();
    cancelAnimationFrame(frame);
    const pinned = desktop.matches && !reduced && !direct;
    root.classList.toggle("is-pinned", pinned);
    toggle.hidden = pinned || reduced;
    hint.hidden = !pinned;
    if (pinned) disposeScroll = scrollProgress(root, apply, true);
    else apply(reduced || open ? 1 : 0);
    toggle.setAttribute("aria-expanded", String(reduced || open));
  }
  selectors.forEach((selector, i) =>
    selector.addEventListener(
      "click",
      (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        select(i);
      },
      { signal: events.signal },
    ),
  );
  toggle.addEventListener(
    "click",
    () => {
      open = !open;
      root.dataset.open = String(open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.innerHTML = `${open ? "Close" : "Open"} atlas <span aria-hidden="true">${open ? "↙" : "↗"}</span>`;
      cancelAnimationFrame(frame);
      const start = performance.now(),
        from = progress,
        to = open ? 1 : 0;
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
        if (!desktop.matches) apply(open ? 1 : 0);
      }
    },
    { signal: events.signal },
  );
  desktop.addEventListener("change", configure, { signal: events.signal });
  window.addEventListener(
    "hashchange",
    () => {
      const index = captions.findIndex(
        (caption) => `#${caption.id}` === location.hash,
      );
      if (index >= 0) {
        direct = true;
        select(index);
        configure();
        captions[index].scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      }
    },
    { signal: events.signal },
  );
  select(selected, false);
  root.classList.add("is-ready");
  configure();
  return {
    dispose() {
      events.abort();
      disposeScroll();
      cancelAnimationFrame(frame);
    },
  };
}
