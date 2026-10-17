import { clamp } from "./settings";
import { settleProgress } from "../motion/settle";

/** Cached geometry and a short settle after input; no idle animation. */
export function scrollProgress(
  root: HTMLElement,
  apply: (progress: number) => void,
  pinned = false,
) {
  let top = 0,
    height = 1,
    viewport = innerHeight,
    frame = 0,
    visible = false,
    disposed = false;
  let current: number | undefined, painted: number | undefined, last = 0;
  const draw = (time: number) => {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    const target = pinned
        ? clamp((scrollY - top + 16) / Math.max(1, height - viewport))
        : clamp(
            (scrollY + viewport * 0.85 - top) /
              (viewport * 0.9 + height * 0.25),
          );
    current = settleProgress(current, target, last ? time - last : 16);
    last = time;
    if (current !== painted) {
      apply(current);
      painted = current;
    }
    if (current !== target) request();
    else last = 0;
  };
  const request = () => {
    if (!frame && !disposed && visible) frame = requestAnimationFrame(draw);
  };
  const measure = () => {
    top = root.getBoundingClientRect().top + scrollY;
    height = root.offsetHeight;
    viewport = innerHeight;
    request();
  };
  const visibility = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        measure();
        request();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        current = undefined;
        last = 0;
      }
    },
    { rootMargin: "100px" },
  );
  const resize = new ResizeObserver(measure);
  resize.observe(root);
  // Earlier content can change this section's document offset after images/fonts load.
  resize.observe(document.querySelector("main")!);
  visibility.observe(root);
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  const visibilityChange = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    current = undefined;
    last = 0;
    if (!document.hidden) request();
  };
  document.addEventListener("visibilitychange", visibilityChange);
  document.fonts.ready.then(() => {
    if (!disposed) measure();
  });
  measure();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    visibility.disconnect();
    window.removeEventListener("scroll", request);
    window.removeEventListener("resize", measure);
    document.removeEventListener("visibilitychange", visibilityChange);
  };
}
