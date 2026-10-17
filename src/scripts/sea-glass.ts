/** Refract the live page, without screenshots, duplicated DOM, or a text cutout.
 * SVG source filters work in WebKit as well as Chromium (unlike URL backdrop
 * filters). Only intersecting, bounded page sections are filtered; the long
 * atlas scroll track is split down to its visible sticky reader.
 */
const NS = "http://www.w3.org/2000/svg";
const WIDTH = 320;
const HEIGHT = 280;
const STRENGTH = 80;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs))
    element.setAttribute(key, value);
  return element;
}

function displacement(shape: string) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fill(new Path2D(shape));
  const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const distance = new Float32Array(WIDTH * HEIGHT);
  // Distance to the worn outline gives both a soft optical edge and its normal.
  for (let i = 0; i < distance.length; i++)
    distance[i] = pixels.data[i * 4 + 3] > 200 ? 1000 : 0;
  for (let y = 1; y < HEIGHT - 1; y++)
    for (let x = 1; x < WIDTH - 1; x++) {
      const i = y * WIDTH + x;
      distance[i] = Math.min(
        distance[i],
        distance[i - 1] + 1,
        distance[i - WIDTH] + 1,
        distance[i - WIDTH - 1] + Math.SQRT2,
        distance[i - WIDTH + 1] + Math.SQRT2,
      );
    }
  for (let y = HEIGHT - 2; y > 0; y--)
    for (let x = WIDTH - 2; x > 0; x--) {
      const i = y * WIDTH + x;
      distance[i] = Math.min(
        distance[i],
        distance[i + 1] + 1,
        distance[i + WIDTH] + 1,
        distance[i + WIDTH + 1] + Math.SQRT2,
        distance[i + WIDTH - 1] + Math.SQRT2,
      );
    }
  for (let y = 1; y < HEIGHT - 1; y++)
    for (let x = 1; x < WIDTH - 1; x++) {
      const i = y * WIDTH + x;
      const edge = distance[i];
      if (!edge) {
        pixels.data[i * 4 + 3] = 0;
        continue;
      }
      const t = Math.min(1, edge / 24);
      const body = t * t * (3 - 2 * t);
      const nx = (distance[i + 1] - distance[i - 1]) / 2;
      const ny = (distance[i + WIDTH] - distance[i - WIDTH]) / 2;
      const rim = Math.sin(Math.min(1, edge / 23) * Math.PI) * 11;
      // A broad readable center, uneven thickness, and a stronger rolled edge.
      // Sampling pulls inward gradually instead of cutting to a scaled copy.
      const dx =
        (-(x - 154) * 0.28 + Math.sin(y / 34 + x / 90) * 4) * body + nx * rim;
      const dy =
        (-(y - 137) * 0.28 + Math.sin(x / 42 - y / 80) * 3) * body + ny * rim;
      pixels.data[i * 4] = Math.round(255 * (0.5 + dx / STRENGTH));
      pixels.data[i * 4 + 1] = Math.round(255 * (0.5 + dy / STRENGTH));
      pixels.data[i * 4 + 2] = 128;
    }
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL();
}

type Surface = {
  filter: SVGFilterElement;
  image: SVGFEImageElement;
  bend: SVGFEDisplacementMapElement;
  bendY: SVGFEDisplacementMapElement;
  smooth: SVGFEGaussianBlurElement;
  previous: string;
  priority: string;
};

export function createSeaGlass(lens: HTMLElement) {
  const path = lens.querySelector<SVGPathElement>("[data-glass-outline]")!;
  const map = displacement(path.getAttribute("d")!);
  const definitions = svg("svg", {
    width: "1",
    height: "1",
    "aria-hidden": "true",
    "data-glass-filters": "",
  });
  definitions.style.cssText =
    "position:absolute;left:0;top:0;pointer-events:none;overflow:hidden";
  const defs = svg("defs", {});
  definitions.append(defs);
  document.body.append(definitions);
  const surfaces = new Map<HTMLElement, Surface>();
  let nextId = 0;

  function remove(element: HTMLElement, surface: Surface) {
    if (surface.previous)
      element.style.setProperty("filter", surface.previous, surface.priority);
    else element.style.removeProperty("filter");
    delete element.dataset.seaGlassSurface;
    surface.filter.remove();
    surfaces.delete(element);
  }

  function clear() {
    for (const [element, surface] of surfaces) remove(element, surface);
  }

  function render(left: number, top: number, width: number, height: number) {
    const roots: HTMLElement[] = [];
    function visit(element: HTMLElement) {
      const rect = element.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        rect.right < left ||
        rect.left > left + width ||
        rect.bottom < top ||
        rect.top > top + height
      )
        return;
      // Do not rasterize a full document or a seven-screen scroll track.
      const split =
        element.matches(".page-shell, main") ||
        rect.height > Math.max(innerHeight * 1.25, 1000);
      const children = [...element.children].filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          !child.matches("script, style, [hidden]"),
      );
      if (split && children.length) children.forEach(visit);
      else roots.push(element);
    }
    const shell = document.querySelector<HTMLElement>(".page-shell");
    if (shell) visit(shell);
    for (const [element, surface] of surfaces)
      if (!roots.includes(element)) remove(element, surface);
    for (const element of roots) {
      const rect = element.getBoundingClientRect();
      let surface = surfaces.get(element);
      if (!surface) {
        const id = `tc-sea-glass-${++nextId}`;
        const filter = svg("filter", {
          id,
          filterUnits: "objectBoundingBox",
          x: "-10%",
          y: "-10%",
          width: "120%",
          height: "120%",
          primitiveUnits: "objectBoundingBox",
          "color-interpolation-filters": "sRGB",
        });
        const image = svg("feImage", {
          href: map,
          preserveAspectRatio: "none",
          result: "glass-map",
        });
        const bend = svg("feDisplacementMap", {
          in: "SourceGraphic",
          in2: "field",
          xChannelSelector: "R",
          yChannelSelector: "B",
          result: "bent-x",
        });
        const bendY = svg("feDisplacementMap", {
          in: "bent-x",
          in2: "field",
          xChannelSelector: "B",
          yChannelSelector: "G",
          result: "bent",
        });
        const smooth = svg("feGaussianBlur", {
          in: "glass-map",
          result: "smooth-map",
        });
        filter.append(
          svg("feFlood", {
            "flood-color": "rgb(50%,50%,50%)",
            result: "neutral",
          }),
          image,
          smooth,
          svg("feComposite", {
            in: "smooth-map",
            in2: "neutral",
            operator: "over",
            result: "field",
          }),
          bend,
          bendY,
          svg("feComposite", {
            in: "SourceGraphic",
            in2: "glass-map",
            operator: "out",
            result: "outside",
          }),
          svg("feComposite", {
            in: "bent",
            in2: "glass-map",
            operator: "in",
            result: "inside",
          }),
        );
        const merge = svg("feMerge", {});
        merge.append(
          svg("feMergeNode", { in: "outside" }),
          svg("feMergeNode", { in: "inside" }),
        );
        filter.append(merge);
        defs.append(filter);
        surface = {
          filter,
          image,
          bend,
          bendY,
          smooth,
          previous: element.style.getPropertyValue("filter"),
          priority: element.style.getPropertyPriority("filter"),
        };
        const existing = getComputedStyle(element).filter;
        element.style.filter = `${existing === "none" ? "" : existing} url(#${id})`;
        element.dataset.seaGlassSurface = "";
        surfaces.set(element, surface);
      }
      // Normalized primitive coordinates avoid WebKit's scrolled HTML offset
      // bug. Separate axes keep optical strength independent of section shape.
      surface.image.setAttribute("x", String((left - rect.left) / rect.width));
      surface.image.setAttribute("y", String((top - rect.top) / rect.height));
      surface.image.setAttribute("width", String(width / rect.width));
      surface.image.setAttribute("height", String(height / rect.height));
      // Only the patch beneath the shard needs expensive blur/resampling.
      // Keep a sampling margin so the rolled edge never reads clipped pixels.
      for (const primitive of [surface.smooth, surface.bend, surface.bendY]) {
        primitive.setAttribute(
          "x",
          String((left - rect.left - 48) / rect.width),
        );
        primitive.setAttribute(
          "y",
          String((top - rect.top - 48) / rect.height),
        );
        primitive.setAttribute("width", String((width + 96) / rect.width));
        primitive.setAttribute("height", String((height + 96) / rect.height));
      }
      surface.smooth.setAttribute(
        "stdDeviation",
        `${1.2 / rect.width} ${1.2 / rect.height}`,
      );
      surface.bend.setAttribute(
        "scale",
        String((STRENGTH * width) / WIDTH / rect.width),
      );
      surface.bendY.setAttribute(
        "scale",
        String((STRENGTH * width) / WIDTH / rect.height),
      );
    }
  }
  return { render, clear };
}
