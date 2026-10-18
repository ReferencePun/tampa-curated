import { options, signedDepth, pressState } from "./model.js";
import { createGlyphMap } from "./glyphs.js";
const escape = (text) =>
  String(text).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
export function settingsJSON(settings) {
  return JSON.stringify(
    {
      schemaVersion: 1,
      experiment: "impressed-typography",
      name: "Impression",
      settings: options(settings),
    },
    null,
    2,
  );
}
export function lightingSVG(input) {
  const settings = options(input),
    glyph = createGlyphMap(settings),
    { width, height } = glyph,
    canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d"),
    image = ctx.createImageData(width, height),
    recess = settings.treatment !== "emboss";
  for (let i = 0; i < width * height; i++) {
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = 255;
    image.data[i * 4 + 3] = recess
      ? 255 - glyph.data[i * 4 + 1]
      : glyph.data[i * 4 + 1];
  }
  ctx.putImageData(image, 0, 0);
  const heightURL = canvas.toDataURL(),
    maskURL = glyph.canvas.toDataURL();
  glyph.dispose();
  canvas.width = canvas.height = 1;
  const depth = Math.abs(signedDepth(settings)),
    pressure = pressState(settings.progress).pressure,
    color =
      settings.treatment === "letterpress" ? settings.ink : settings.paper;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="title desc"><title id="title">${escape(settings.text)}</title><desc id="desc">${settings.treatment} lighting study. Embedded raster glyph height map; portable SVG diffuse lighting, not editable vector outlines. Simplified preview without GPU ray shadows or paper grain.</desc><metadata>${escape(settingsJSON(settings))}</metadata><defs><filter id="light" x="0" y="0" width="100%" height="100%" color-interpolation-filters="linearRGB"><feImage xlink:href="${heightURL}" width="${width}" height="${height}" result="height"/><feDiffuseLighting in="height" surfaceScale="${depth}" diffuseConstant="${settings.intensity * 0.82}" lighting-color="#fff" result="diffuse"><feDistantLight azimuth="${360 - settings.azimuth}" elevation="${settings.elevation}"/></feDiffuseLighting><feColorMatrix in="diffuse" type="matrix" values="1 0 0 0 .38 0 1 0 0 .38 0 0 1 0 .38 0 0 0 1 0" result="illumination"/><feComposite in="SourceGraphic" in2="illumination" operator="arithmetic" k1="1" k2="0" k3="0" k4="0"/></filter><mask id="ink"><image xlink:href="${maskURL}" width="${width}" height="${height}"/></mask></defs><g filter="url(#light)"><rect width="100%" height="100%" fill="${settings.paper}"/>${settings.treatment === "letterpress" ? `<rect width="100%" height="100%" fill="${color}" opacity="${pressure}" mask="url(#ink)"/>` : ""}</g></svg>`;
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
