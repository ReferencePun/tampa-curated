import { evaluate, options, clamp } from "./model.js";
import { node, scene } from "./drawing.js";
/** Attach an inert SVG actor to a reserved illustration area. No wheel/touch interception. */
export function createMarginWorker({
  element,
  activity = "hammer",
  target = null,
  character = "draughtsman",
  position = "left",
  scale = 1,
  settings = {},
  scrollTrigger = null,
  scrollRoot = null,
  sequence = { start: 0, end: 1 },
  onOutput,
} = {}) {
  if (!(element instanceof Element))
    throw new TypeError("An attachment element is required");
  let config = options({ ...settings, character, side: position, size: scale }),
    progress = 0,
    state,
    disposed = false,
    raf = 0;
  const oldPosition = element.style.position,
    oldTargetStyle = target?.getAttribute("style"),
    abort = new AbortController();
  if (getComputedStyle(element).position === "static")
    element.style.position = "relative";
  const svg = node("svg", {
    viewBox: "0 0 760 430",
    "aria-hidden": "true",
    class: "margin-worker-drawing",
  });
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    overflow: "visible",
  });
  element.append(svg);
  function setProgress(value, force = false) {
    if (disposed) return;
    const nextProgress = clamp(value);
    if (!force && state && nextProgress === progress) return;
    progress = nextProgress;
    state = evaluate(
      activity,
      clamp((progress - sequence.start) / (sequence.end - sequence.start || 1)),
      config,
    );
    scene(svg, state, config);
    if (target) {
      target.dataset.workerProgress = String(state.progress);
      if (activity === "hammer")
        target.style.clipPath = `inset(0 ${(1 - state.output.divider) * 100}% 0 0)`;
      if (activity === "ladder")
        target.style.clipPath = `inset(${(1 - state.output.reveal) * 100}% 0 0 0)`;
      if (activity === "rope")
        target.style.transform = `translateY(${(-state.output.lift / 430) * element.clientHeight}px)`;
      if (activity === "paint")
        target.style.setProperty("--drawn", `${state.progress * 100}%`);
      if (activity === "carry")
        target.style.clipPath = `inset(${(1 - clamp(state.output.structure / 3)) * 100}% 0 0 0)`;
    }
    onOutput?.(state.output, state);
  }
  function scroll() {
    if (raf || disposed) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const trigger = scrollTrigger || element,
        r = trigger.getBoundingClientRect(),
        bounds = scrollRoot?.getBoundingClientRect(),
        height = scrollRoot?.clientHeight || innerHeight,
        top = r.top - (bounds?.top || 0);
      setProgress((height * 0.7 - top) / (r.height + height * 0.4));
    });
  }
  if (scrollTrigger) {
    (scrollRoot || window).addEventListener("scroll", scroll, {
      passive: true,
      signal: abort.signal,
    });
    window.addEventListener("resize", scroll, { signal: abort.signal });
    scroll();
  }
  const resize = new ResizeObserver(() => {
    if (scrollTrigger) scroll();
    else setProgress(progress, true);
  });
  resize.observe(element);
  setProgress(0);
  return {
    setProgress,
    update(next) {
      config = options({ ...config, ...next });
      setProgress(progress, true);
    },
    getState: () => state,
    element: svg,
    dispose() {
      if (disposed) return;
      disposed = true;
      abort.abort();
      resize.disconnect();
      cancelAnimationFrame(raf);
      svg.remove();
      element.style.position = oldPosition;
      if (target) {
        if (oldTargetStyle === null) target.removeAttribute("style");
        else target.setAttribute("style", oldTargetStyle);
        delete target.dataset.workerProgress;
      }
    },
  };
}
