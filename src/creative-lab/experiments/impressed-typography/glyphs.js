import { FONTS, bevelMap } from "./model.js";
export function createGlyphMap(settings, width = 1200, height = 800) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas text rendering is unavailable.");
  const scale = width / 1200,
    maxWidth = width * 0.8,
    maxHeight = height * 0.66;
  let size = settings.size * scale,
    spacing = settings.spacing * scale,
    lines;
  const measure = (text) =>
    ctx.measureText(text).width +
    Math.max(0, Array.from(text).length - 1) * spacing;
  function layout() {
    ctx.font = `${settings.weight} ${size}px ${FONTS[settings.font]}`;
    const result = [];
    for (const paragraph of settings.text.replace(/\r/g, "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/(\s+)/)) {
        if (measure(line + word) <= maxWidth) {
          line += word;
          continue;
        }
        if (line.trim()) {
          result.push(line.trimEnd());
          line = "";
        }
        for (const char of Array.from(word)) {
          if (measure(line + char) > maxWidth && line) {
            result.push(line);
            line = "";
          }
          line += char;
        }
      }
      result.push(line.trimEnd());
    }
    return result;
  }
  for (let i = 0; i < 30; i++) {
    lines = layout();
    if (lines.length * size * 1.12 <= maxHeight) break;
    size *= 0.88;
    spacing *= 0.88;
  }
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const placements = [];
  lines.forEach((line, i) => {
    const x = (width - measure(line)) / 2,
      y = height / 2 + (i - (lines.length - 1) / 2) * size * 1.12;
    placements.push({ text: line, x, y });
    if (Math.abs(spacing) < 0.001) ctx.fillText(line, x, y);
    else {
      let cursor = x;
      for (const char of Array.from(line)) {
        ctx.fillText(char, cursor, y);
        cursor += ctx.measureText(char).width + spacing;
      }
    }
  });
  const rgba = ctx.getImageData(0, 0, width, height).data,
    alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  const data = bevelMap(alpha, width, height, Math.max(2, size * 0.026));
  return {
    width,
    height,
    data,
    alpha,
    canvas,
    layout: {
      size,
      spacing,
      lines: placements,
      font: FONTS[settings.font],
      weight: settings.weight,
    },
    dispose() {
      canvas.width = canvas.height = 1;
    },
  };
}
