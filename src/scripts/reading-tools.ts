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
  const content = lens.querySelector<HTMLElement>(".reading-lens-content")!;
  const sizes = [
    ...tools.querySelectorAll<HTMLInputElement>('input[name="reading-size"]'),
  ];
  const finePointer = matchMedia("(any-hover: hover) and (any-pointer: fine)");
  let enabled = false;
  let point: { x: number; y: number } | null = null;
  let source: HTMLElement | null = null;
  let sourceWidth = 0;
  let sourceText = "";
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
    source = null;
    content.replaceChildren();
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
    if (announce)
      status.textContent = enabled
        ? "Text lens on. Move over text or tab to a link. Press Escape to turn it off."
        : "Text lens off.";
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

  // Only duplicate a small text block. Never clone a page, interactive scene,
  // image, form, ID or link, and never expose duplicate content to assistive tech.
  function textAtPoint(x: number, y: number): HTMLElement | null {
    const hit = document.elementFromPoint(x, y);
    if (
      !(hit instanceof HTMLElement) ||
      hit.closest(
        '[data-reading-tools], [aria-hidden="true"], [inert], input, select, textarea, .atlas-stage',
      )
    )
      return null;
    let candidate: HTMLElement | null = hit.closest(
      "p, h1, h2, h3, h4, dt, dd, figcaption, label, button, .eyebrow, .text-link",
    );
    if (!candidate || candidate.querySelector("img, svg, canvas, input"))
      candidate = hit;
    while (
      candidate &&
      !candidate.matches("body, main, section, article, nav, header, footer")
    ) {
      const text = candidate.textContent?.trim() || "";
      if (
        text &&
        text.length < 3000 &&
        candidate.childElementCount < 30 &&
        !candidate.querySelector("img, svg, canvas, input, select, textarea")
      )
        return candidate;
      candidate = candidate.parentElement;
    }
    return null;
  }

  const textStyles = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "font-stretch",
    "font-variant",
    "font-kerning",
    "font-feature-settings",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "text-transform",
    "text-decoration",
    "text-align",
    "text-indent",
    "white-space",
    "overflow-wrap",
    "word-break",
    "hyphens",
    "direction",
    "writing-mode",
    "vertical-align",
    "display",
    "box-sizing",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-style",
    "gap",
    "flex-direction",
    "flex-wrap",
    "align-items",
    "justify-content",
  ];

  function copyText(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE)
      return document.createTextNode(node.textContent || "");
    if (!(node instanceof HTMLElement)) return document.createTextNode("");
    if (node.tagName === "BR") return document.createElement("br");
    if (node.matches("script, style, template") || node.hidden)
      return document.createTextNode("");
    const copy = document.createElement("span");
    const style = getComputedStyle(node);
    for (const property of textStyles)
      copy.style.setProperty(property, style.getPropertyValue(property));
    copy.style.color = "var(--ink)";
    copy.style.borderColor = "transparent";
    for (const child of node.childNodes) copy.append(copyText(child));
    return copy;
  }

  function renderLens() {
    frame = 0;
    if (!enabled || !point || !panel.hidden || document.hidden) {
      hideLens();
      return;
    }
    const target = textAtPoint(point.x, point.y);
    if (!target) {
      hideLens();
      return;
    }
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      hideLens();
      return;
    }
    if (
      source !== target ||
      sourceWidth !== rect.width ||
      sourceText !== target.textContent
    ) {
      source = target;
      sourceWidth = rect.width;
      sourceText = target.textContent || "";
      const copy = copyText(target) as HTMLElement;
      copy.style.width = `${rect.width}px`;
      copy.style.maxWidth = "none";
      copy.style.margin = "0";
      if (getComputedStyle(target).display === "inline")
        copy.style.display = "block";
      content.replaceChildren(copy);
    }
    const size = parseFloat(
      getComputedStyle(lens!).getPropertyValue("--lens-size"),
    );
    const radius = size / 2;
    const left = Math.max(8, Math.min(innerWidth - size - 8, point.x - radius));
    const top = Math.max(8, Math.min(innerHeight - size - 8, point.y - radius));
    lens!.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    content.style.transform = `translate(${radius - 3 + (rect.left - point.x) * 2}px, ${radius - 3 + (rect.top - point.y) * 2}px) scale(2)`;
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
        ? "Move your mouse over text to magnify it. Links still work. Press Esc to turn the lens off."
        : "The lens works with a mouse or trackpad. On a touchscreen, choose Comfortable text or pinch to zoom.";
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
