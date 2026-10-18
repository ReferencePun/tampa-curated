import { createRenderer } from "./renderer.js";
import { boardHeight } from "./model.js";
export async function pngFor(state, config, progress = 1) {
  const canvas = document.createElement("canvas"),
    renderer = createRenderer(canvas);
  renderer.resize(1600, (1600 * boardHeight(config.boardSize)) / 1000, 1);
  renderer.render(state, config, { progress });
  try {
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(Error("PNG export is unavailable.")),
        "image/png",
      ),
    );
  } finally {
    renderer.dispose();
  }
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  return () => URL.revokeObjectURL(url);
}
