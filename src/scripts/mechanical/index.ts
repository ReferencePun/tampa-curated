import { reducedMotion, type Scene } from "./settings";

let teardown = () => {};
function boot() {
  teardown();
  const scenes = new Map<HTMLElement, Scene>();
  const pending = new Set<HTMLElement>();
  const roots = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
  const preference = document.querySelector<HTMLElement>(".motion-preference")!;
  const controls = [
    ...preference.querySelectorAll<HTMLButtonElement>("[data-motion]"),
  ];
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let disposed = false;
  let generation = 0;
  const loaders = {
    worktable: () => import("./worktable"),
    sleeve: () => import("./sleeve"),
    atlas: () => import("./atlas"),
  };
  async function enhance(root: HTMLElement) {
    if (pending.has(root) || scenes.has(root)) return;
    pending.add(root);
    const current = generation;
    try {
      const key = root.dataset.scene as keyof typeof loaders;
      const module = await loaders[key]();
      if (!disposed && current === generation) {
        scenes.set(root, module.init(root));
        root.dataset.motionState = reducedMotion() ? "reduced" : "system";
      }
    } catch (error) {
      console.warn(
        "Editorial enhancement unavailable; retaining the static edition.",
        error,
      );
    } finally {
      pending.delete(root);
    }
  }
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          void enhance(entry.target as HTMLElement);
        }
      }),
    { rootMargin: "400px" },
  );
  roots.forEach((root) => observer.observe(root));
  const updateButtons = () =>
    controls.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(
          button.dataset.motion ===
            (document.documentElement.dataset.motion || "system"),
        ),
      ),
    );
  const reset = () => {
    generation++;
    pending.clear();
    const initialized = [...scenes.keys()];
    scenes.forEach((scene) => scene.dispose());
    scenes.clear();
    roots.forEach((root) => {
      if (initialized.includes(root)) void enhance(root);
      else observer.observe(root);
    });
    updateButtons();
  };
  controls.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        document.documentElement.dataset.motion = button.dataset.motion;
        try {
          localStorage.setItem("tc-motion", button.dataset.motion!);
        } catch {
          /* Private storage can be unavailable. */
        }
        reset();
      },
      { signal: events.signal },
    ),
  );
  media.addEventListener("change", reset, { signal: events.signal });
  updateButtons();
  preference.hidden = false;
  teardown = () => {
    disposed = true;
    generation++;
    observer.disconnect();
    events.abort();
    scenes.forEach((scene) => scene.dispose());
    scenes.clear();
  };
}
boot();
window.addEventListener("pagehide", () => teardown());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) boot();
});
