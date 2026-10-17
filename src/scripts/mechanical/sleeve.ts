import { clamp, motion, reducedMotion, type Scene } from "./settings";
import {
  printGeometry,
  type SleeveGeometry,
  type PrintGeometry,
} from "./sleeve-model";
import type { Optics } from "./sleeve-optics";

export function init(root: HTMLElement): Scene {
  const stage = root.querySelector<HTMLElement>(".sleeve-stage")!;
  const originals = [...root.querySelectorAll<HTMLElement>("[data-print]")];
  const copies = [...root.querySelectorAll<HTMLElement>("[data-copy]")];
  const images = originals.map((p) =>
    p.querySelector<HTMLImageElement>("img")!,
  );
  const captions = [...root.querySelectorAll<HTMLElement>("[data-caption]")];
  const selectors = [
    ...root.querySelectorAll<HTMLAnchorElement>("[data-sleeve-select]"),
  ];
  const prev = root.querySelector<HTMLButtonElement>("[data-sleeve-prev]")!;
  const next = root.querySelector<HTMLButtonElement>("[data-sleeve-next]")!;
  const counter = root.querySelector<HTMLElement>(".sleeve-counter")!;
  const wheel = root.querySelector<SVGElement>(".wheel-a")!;
  const travel = root.querySelector<HTMLElement>(".sleeve-travel")!;
  const announcement = root.querySelector<HTMLElement>(
    "[data-sleeve-announcement]",
  )!;
  const rendererLabel = root.querySelector<HTMLElement>(
    ".sleeve-renderer span",
  )!;
  const front = root.querySelector<HTMLElement>(".sleeve-front")!;
  const events = new AbortController();
  const reduced = reducedMotion();
  let saved = 0;
  try {
    saved = Number(sessionStorage.getItem("tc-portrait") || 0);
  } catch {
    /* Storage is optional. */
  }
  let selected = clamp(
      Number(root.dataset.selected ?? saved),
      0,
      originals.length - 1,
    ),
    position = selected;
  const hashIndex = captions.findIndex(
    (caption) => `#${caption.id}` === location.hash,
  );
  if (hashIndex >= 0) selected = position = hashIndex;
  let geometry: SleeveGeometry,
    prints: PrintGeometry[] = [],
    frame = 0,
    drawFrame = 0,
    disposed = false,
    visible = false;
  let optics: Optics | undefined,
    attemptedOptics = false,
    opticsLoading = false;
  let pointer:
    | {
        id: number;
        x: number;
        y: number;
        start: number;
        lastX: number;
        lastTime: number;
        velocity: number;
        dragging: boolean;
      }
    | undefined;
  let suppressClickUntil = 0;
  const setRenderer = (kind: string, reason?: string) => {
    root.dataset.renderer = kind;
    root.dataset.rendererReason = reason || "";
    rendererLabel.textContent =
      kind === "webgl" ? "optical sleeve" : "print overlay";
  };
  function draw() {
    drawFrame = 0;
    if (disposed || !geometry) return;
    prints = originals.map((_, i) =>
      printGeometry(i, position, geometry, reduced),
    );
    prints.forEach((print, i) => {
      const transform = `translate(${print.cx - print.width / 2}px, ${print.cy - print.height / 2}px) perspective(${motion.perspective}px) rotateY(${print.angle}deg) scale(${print.scale})`;
      for (const element of [originals[i], copies[i]]) {
        element.style.transform = transform;
        element.style.zIndex = String(
          10 - Math.round(Math.abs(print.distance) * 3),
        );
        element.style.visibility =
          Math.abs(print.distance) > 1.8 ? "hidden" : "visible";
      }
      originals[i].setAttribute("aria-hidden", String(i !== selected));
    });
    if (!reduced) wheel.style.transform = `rotate(${position * 220}deg)`;
    else wheel.style.removeProperty("transform");
    travel.textContent = String(Math.round((position + 1) * 100)).padStart(
      3,
      "0",
    );
    root.dataset.position = position.toFixed(4);
    if (visible && !document.hidden)
      optics?.draw(prints, geometry, pointer?.dragging ? pointer.velocity : 0);
  }
  const requestDraw = () => {
    if (!drawFrame && !disposed) drawFrame = requestAnimationFrame(draw);
  };
  function measure() {
    const width = stage.clientWidth,
      height = stage.clientHeight;
    const printWidth = Math.min(390, width * 0.7, (height * 0.84) / 1.26);
    const css = getComputedStyle(front);
    geometry = {
      width,
      height,
      printWidth,
      printHeight: printWidth * 1.26,
      step: printWidth * motion.sleeveStep,
      left: parseFloat(css.left),
      right: width - parseFloat(css.right),
      top: parseFloat(css.top),
      bottom: height - parseFloat(css.bottom),
    };
    [...originals, ...copies].forEach((print) => {
      print.style.width = `${geometry.printWidth}px`;
      print.style.height = `${geometry.printHeight}px`;
      print.style.left = "0";
      print.style.top = "0";
    });
    optics?.resize(geometry);
    requestDraw();
  }
  function commit(index: number, announce = true) {
    selected = index;
    root.dataset.selected = String(index);
    try {
      sessionStorage.setItem("tc-portrait", String(index));
    } catch {
      /* Storage is optional. */
    }
    captions.forEach((caption, i) => {
      caption.hidden = i !== index;
    });
    selectors.forEach((selector, i) =>
      selector.setAttribute("aria-current", String(i === index)),
    );
    prev.disabled = index === 0;
    next.disabled = index === originals.length - 1;
    counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(originals.length).padStart(2, "0")}`;
    const name = captions[index].querySelector("h3")!.textContent;
    if (announce)
      announcement.textContent = `${name}, portrait ${index + 1} of ${originals.length}.`;
    void optics?.syncTextures(images, index).then(requestDraw);
    originals.forEach((print, i) =>
      print.setAttribute("aria-hidden", String(i !== index)),
    );
  }
  function settle(index: number, animate = true) {
    const destination = clamp(index, 0, originals.length - 1);
    cancelAnimationFrame(frame);
    if (reduced || !animate || document.hidden) {
      position = destination;
      commit(destination);
      draw();
      return;
    }
    const from = position,
      start = performance.now();
    const step = (now: number) => {
      const t = clamp((now - start) / motion.settleMs);
      position = from + (destination - from) * (1 - (1 - t) ** 3);
      draw();
      if (t < 1 && !disposed && visible && !document.hidden)
        frame = requestAnimationFrame(step);
      else {
        position = destination;
        commit(destination);
        draw();
        frame = 0;
      }
    };
    frame = requestAnimationFrame(step);
  }
  prev.addEventListener("click", () => settle(Math.round(position) - 1), {
    signal: events.signal,
  });
  next.addEventListener("click", () => settle(Math.round(position) + 1), {
    signal: events.signal,
  });
  selectors.forEach((selector, i) =>
    selector.addEventListener(
      "click",
      (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
          return;
        event.preventDefault();
        settle(i);
      },
      { signal: events.signal },
    ),
  );
  stage.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target !== stage ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const destination =
        event.key === "ArrowLeft"
          ? Math.round(position) - 1
          : event.key === "ArrowRight"
            ? Math.round(position) + 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? originals.length - 1
                : null;
      if (destination !== null) {
        event.preventDefault();
        settle(destination);
      }
    },
    { signal: events.signal },
  );
  stage.addEventListener(
    "pointerdown",
    (event) => {
      if (!event.isPrimary || event.button !== 0 || pointer) return;
      cancelAnimationFrame(frame);
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: position,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
        dragging: false,
      };
    },
    { signal: events.signal },
  );
  stage.addEventListener(
    "pointermove",
    (event) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x,
        dy = event.clientY - pointer.y;
      if (!pointer.dragging) {
        if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) {
          pointer = undefined;
          settle(Math.round(position));
          return;
        }
        if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        pointer.dragging = true;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add("is-dragging");
      }
      pointer.velocity =
        -(event.clientX - pointer.lastX) /
        Math.max(8, event.timeStamp - pointer.lastTime) /
        geometry.step;
      pointer.lastX = event.clientX;
      pointer.lastTime = event.timeStamp;
      position = clamp(
        pointer.start - dx / geometry.step,
        0,
        originals.length - 1,
      );
      // Retain only the current and adjacent textures, even during a long drag.
      if (Math.abs(position - selected) > 0.7)
        void optics
          ?.syncTextures(images, Math.round(position))
          .then(requestDraw);
      requestDraw();
    },
    { signal: events.signal },
  );
  function release(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dragging = pointer.dragging;
    const velocity =
      event.type === "pointercancel" || event.timeStamp - pointer.lastTime > 100
        ? 0
        : pointer.velocity;
    pointer = undefined;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture(event.pointerId))
      stage.releasePointerCapture(event.pointerId);
    if (dragging) {
      suppressClickUntil = performance.now() + 500;
      settle(
        Math.round(
          position +
            clamp(
              velocity * motion.momentumMs,
              -motion.maxMomentum,
              motion.maxMomentum,
            ),
        ),
      );
    } else settle(Math.round(position));
  }
  window.addEventListener("pointerup", release, { signal: events.signal });
  stage.addEventListener("pointercancel", release, { signal: events.signal });
  stage.addEventListener(
    "click",
    (event) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true, signal: events.signal },
  );
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  async function enhanceOptics() {
    if (
      reduced ||
      attemptedOptics ||
      opticsLoading ||
      disposed ||
      !visible ||
      document.hidden
    )
      return;
    opticsLoading = true;
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
      deviceMemory?: number;
    };
    if (
      nav.connection?.saveData ||
      (nav.deviceMemory && nav.deviceMemory < 4)
    ) {
      attemptedOptics = true;
      opticsLoading = false;
      setRenderer("dom", "device-budget");
      return;
    }
    try {
      const { createOptics } = await import("./sleeve-optics");
      if (disposed || !visible || document.hidden) return;
      attemptedOptics = true;
      const instance = await createOptics(stage, images, selected, geometry, {
        signal: events.signal,
        valid: () => !disposed && visible && !document.hidden,
        onFallback: (reason) => {
          optics?.dispose();
          optics = undefined;
          setRenderer("dom", reason);
        },
      });
      if (disposed || !visible || document.hidden) {
        instance?.dispose();
        return;
      }
      if (instance) {
        optics = instance;
        setRenderer("webgl");
        requestDraw();
      } else setRenderer("dom", "capability-or-measured-budget");
    } catch {
      setRenderer("dom", "unavailable");
    } finally {
      opticsLoading = false;
    }
  }
  const visibility = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      requestDraw();
      void enhanceOptics();
    } else {
      cancelAnimationFrame(frame);
      pointer = undefined;
      position = Math.round(position);
      commit(position, false);
      draw();
    }
  });
  visibility.observe(stage);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        cancelAnimationFrame(drawFrame);
        drawFrame = 0;
        pointer = undefined;
        position = Math.round(position);
        commit(position, false);
      } else {
        requestDraw();
        void enhanceOptics();
      }
    },
    { signal: events.signal },
  );
  images.forEach((image) =>
    image.addEventListener("load", requestDraw, { signal: events.signal }),
  );
  window.addEventListener(
    "hashchange",
    () => {
      const index = captions.findIndex(
        (caption) => `#${caption.id}` === location.hash,
      );
      if (index >= 0) {
        settle(index, false);
        captions[index].scrollIntoView({
          block: "center",
          behavior: "instant",
        });
      }
    },
    { signal: events.signal },
  );
  document.fonts.ready.then(() => {
    if (!disposed) measure();
  });
  commit(selected, false);
  measure();
  draw();
  root.querySelector<HTMLElement>(".sleeve-controls")!.hidden = false;
  root.querySelector<HTMLElement>(".sleeve-renderer")!.hidden = false;
  root.classList.add("is-ready");
  setRenderer("dom", reduced ? "reduced-motion" : "pending-near-viewport");
  stage.tabIndex = 0;
  stage.setAttribute(
    "aria-label",
    "Portrait viewer. Use arrow keys, previous, next, or the portrait index to choose a profile.",
  );
  return {
    dispose() {
      disposed = true;
      events.abort();
      resize.disconnect();
      visibility.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(drawFrame);
      optics?.dispose();
      stage.classList.remove("is-dragging");
      setRenderer("dom", "suspended");
    },
  };
}
