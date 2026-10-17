import { clamp } from "./settings";

/** Cached document geometry; one frame per scroll event, no idle animation. */
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
  const draw = () => {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    apply(
      pinned
        ? clamp((scrollY - top + 16) / Math.max(1, height - viewport))
        : clamp(
            (scrollY + viewport * 0.85 - top) /
              (viewport * 0.9 + height * 0.25),
          ),
    );
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
  document.addEventListener("visibilitychange", request);
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
    document.removeEventListener("visibilitychange", request);
  };
}
