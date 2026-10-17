const tools = document.querySelector<HTMLElement>("[data-reading-tools]");
const lens = document.querySelector<HTMLElement>("[data-text-lens]");

if (tools && lens) {
  const launcher = tools.querySelector<HTMLButtonElement>(".reading-launcher")!;
  const panel = tools.querySelector<HTMLElement>(".reading-panel")!;
  const lensButton = tools.querySelector<HTMLButtonElement>(
    "[data-reading-lens]",
  )!;
  const lensState = tools.querySelector<HTMLElement>("#reading-lens-state")!;
  const indicator = tools.querySelector<HTMLElement>(
    ".reading-lens-indicator",
  )!;
  const status = tools.querySelector<HTMLElement>("[data-reading-status]")!;
  let glass: ReturnType<typeof import("./sea-glass").createSeaGlass> | null =
    null;
  let loadingGlass: Promise<void> | null = null;
  const sizes = [
    ...tools.querySelectorAll<HTMLInputElement>('input[name="reading-size"]'),
  ];
  const finePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  let enabled = false;
  let point: { x: number; y: number } | null = null;
  let frame = 0;

  function save(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Preferences still work for this page. */
    }
  }

  function hideLens() {
    lens!.hidden = true;
    glass?.clear();
  }

  function setPanel(open: boolean, restoreFocus = false) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    hideLens();
    if (open) sizes.find((input) => input.checked)?.focus();
    else if (restoreFocus) launcher.focus();
  }

  function setLens(on: boolean, announce = true) {
    enabled = on && finePointer.matches;
    lensButton.setAttribute("aria-pressed", String(enabled));
    lensState.textContent = enabled ? "On" : "Off";
    indicator.hidden = !enabled;
    save("tc-reading-lens", String(enabled));
    hideLens();
    if (enabled && !glass && !loadingGlass) {
      loadingGlass = import("./sea-glass")
        .then(({ createSeaGlass }) => {
          glass = createSeaGlass(lens!);
          schedule();
        })
        .catch(() => {
          setLens(false, false);
          status.textContent =
            "Sea glass could not load. Comfortable text is still available.";
        })
        .finally(() => {
          loadingGlass = null;
        });
    }
    if (announce)
      status.textContent = enabled
        ? "Sea glass on. Move across the page or tab to a link. Press Escape to put the glass away."
        : "Sea glass off.";
  }

  function updateSize(value: string) {
    const size = value === "original" ? "original" : "comfortable";
    document.documentElement.dataset.readingSize = size;
    sizes.forEach((input) => {
      input.checked = input.value === size;
    });
    hideLens();
    // Recalculate the atlas's measured sticky layout after text reflows.
    window.dispatchEvent(new Event("resize"));
  }

  function renderLens() {
    frame = 0;
    if (!enabled || !glass || !point || !panel.hidden || document.hidden) {
      hideLens();
      return;
    }
    const hit = document.elementFromPoint(point.x, point.y);
    if (
      !hit ||
      tools!.contains(hit) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x > innerWidth ||
      point.y > innerHeight
    ) {
      hideLens();
      return;
    }
    const width = parseFloat(
      getComputedStyle(lens!).getPropertyValue("--lens-size"),
    );
    const height = (width * 280) / 320;
    // Keep the optical center under the pointer, including at viewport edges.
    // Clamping the glass to the window would make it slide away from the target.
    const left = point.x - (width * 154) / 320;
    const top = point.y - (height * 137) / 280;
    glass.render(left, top, width, height);
    lens!.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    lens!.hidden = false;
  }

  function schedule() {
    if (enabled && !frame) frame = requestAnimationFrame(renderLens);
  }

  launcher.addEventListener("click", () => setPanel(Boolean(panel.hidden)));
  tools
    .querySelector("[data-reading-close]")
    ?.addEventListener("click", () => setPanel(false, true));
  sizes.forEach((input) =>
    input.addEventListener("change", () => {
      if (!input.checked) return;
      updateSize(input.value);
      save("tc-reading-size", input.value);
      status.textContent =
        input.value === "original"
          ? "Original magazine text size."
          : "Comfortable text size.";
    }),
  );
  lensButton.addEventListener("click", () => {
    setLens(!enabled);
    if (enabled) setPanel(false, true);
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      !panel.hidden &&
      event.target instanceof Node &&
      !tools.contains(event.target)
    )
      setPanel(false);
  });
  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") {
        point = null;
        hideLens();
        return;
      }
      point = { x: event.clientX, y: event.clientY };
      schedule();
    },
    { passive: true },
  );
  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      !target.matches(":focus-visible") ||
      tools.contains(target)
    )
      return;
    const rect = target.getBoundingClientRect();
    point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    schedule();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (enabled) setLens(false);
    if (!panel.hidden) setPanel(false, true);
  });
  document.addEventListener("pointerleave", () => {
    point = null;
    hideLens();
  });
  window.addEventListener("blur", () => {
    point = null;
    hideLens();
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", () => {
    hideLens();
    schedule();
  });
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    frame = 0;
    hideLens();
  });
  window.addEventListener("pageshow", () => {
    try {
      updateSize(localStorage.getItem("tc-reading-size") || "comfortable");
      setLens(localStorage.getItem("tc-reading-lens") === "true", false);
    } catch {
      /* Storage is optional. */
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hideLens();
  });
  function updatePointer() {
    lensButton.disabled = !finePointer.matches;
    tools!.querySelector("[data-reading-lens-help]")!.textContent =
      finePointer.matches
        ? "Move the sea glass across the page to bend and gently magnify everything underneath. Links still work. Press Esc to put it away."
        : "Sea glass works with a mouse or trackpad. On a touchscreen, choose Comfortable text or pinch to zoom.";
    if (!finePointer.matches) setLens(false, false);
  }
  finePointer.addEventListener("change", updatePointer);
  updatePointer();
  updateSize(document.documentElement.dataset.readingSize || "comfortable");
  try {
    setLens(localStorage.getItem("tc-reading-lens") === "true", false);
  } catch {
    /* Storage is optional. */
  }
  tools.hidden = false;
}

export {};
