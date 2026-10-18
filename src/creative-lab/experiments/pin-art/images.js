/** Decode a local image into a bounded brightness field. No upload or depth inference. */
export async function imageHeightMap(file) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Choose an image smaller than 20 MB.");
  if (
    !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)
  )
    throw Error("Choose a PNG, JPEG, WebP or AVIF height map.");
  const url = URL.createObjectURL(file),
    image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 32000000)
      throw Error("Choose an image below 32 million pixels.");
    const scale = Math.min(
        1,
        512 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      width = Math.max(1, Math.round(image.naturalWidth * scale)),
      height = Math.max(1, Math.round(image.naturalHeight * scale)),
      canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Image conversion needs Canvas 2D.");
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data,
      data = new Float32Array(width * height);
    for (let i = 0; i < data.length; i++)
      data[i] =
        (((0.2126 * pixels[i * 4] +
          0.7152 * pixels[i * 4 + 1] +
          0.0722 * pixels[i * 4 + 2]) /
          255) *
          pixels[i * 4 + 3]) /
        255;
    canvas.width = canvas.height = 1;
    return { width, height, data, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
