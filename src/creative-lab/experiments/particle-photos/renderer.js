import { vertex, fragment } from "./shaders.js";
import { grainPigment } from "./grain.js";
import { FLOW_SIZE } from "./flow.js";
import { resolvedField } from "./wake.js";
import { particlePose } from "./model.js";
export function gpuRenderer(canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("WebGL2 unavailable.");
  let program,
    buffer,
    texture,
    wakeTexture,
    flowTexture,
    vao,
    disposed = false,
    prepared;
  const shaders = [];
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    if (wakeTexture) gl.deleteTexture(wakeTexture);
    if (flowTexture) gl.deleteTexture(flowTexture);
    if (vao) gl.deleteVertexArray(vao);
    if (program) gl.deleteProgram(program);
    for (const s of shaders) gl.deleteShader(s);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
  try {
    program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const s = gl.createShader(type);
      shaders.push(s);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(program, s);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program));
    vao = gl.createVertexArray();
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [index, size, offset] of [
      [0, 2, 0],
      [1, 4, 8],
      [2, 4, 24],
    ]) {
      gl.enableVertexAttribArray(index);
      gl.vertexAttribPointer(index, size, gl.FLOAT, false, 40, offset);
      gl.vertexAttribDivisor(index, 1);
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
    for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    wakeTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, wakeTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      128,
      128,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      new Uint8Array(128 * 128),
    );
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
    for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    flowTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, flowTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, FLOW_SIZE, FLOW_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
    for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const locations = {};
    for (const name of [
      "canvasSize",
      "grid",
      "pointer",
      "view",
      "radius",
      "displacement",
      "scatter",
      "original",
      "engagement",
      "markSize",
      "contrast",
      "mode",
      "photo",
      "ink",
      "wake",
      "night",
      "uFlow",
      "layer",
    ])
      locations[name] = gl.getUniformLocation(program, name);
    return {
      backend: "GPU",
      setImage(data) {
        prepared = data;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data.sampled.attributes, gl.STATIC_DRAW);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          data.texture,
        );
      },
      draw(state, settings, view, wake) {
        if (disposed || !prepared) return;
        gl.viewport(0, 0, canvas.width, canvas.height);
        const night = settings.surface === "night";
        gl.clearColor(
          night ? 32 / 255 : 245 / 255,
          night ? 27 / 255 : 241 / 255,
          night ? 19 / 255 : 231 / 255,
          1,
        );
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(locations.photo, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, wakeTexture);
        if (wake.dirty) {
          gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            wake.size,
            wake.size,
            gl.RED,
            gl.UNSIGNED_BYTE,
            wake.data,
          );
          wake.dirty = false;
        }
        gl.uniform1i(locations.wake, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, flowTexture);
        if (wake.motion.dirty) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, wake.motion.size, wake.motion.size, gl.RGBA, gl.UNSIGNED_BYTE, wake.motion.data);
          wake.motion.dirty = false;
        }
        gl.uniform1i(locations.uFlow, 2);
        gl.uniform1i(locations.night, night ? 1 : 0);
        gl.uniform2f(locations.canvasSize, canvas.width, canvas.height);
        gl.uniform2f(
          locations.grid,
          prepared.sampled.columns,
          prepared.sampled.rows,
        );
        gl.uniform2f(locations.pointer, state.x, state.y);
        gl.uniform4fv(locations.view, view);
        for (const name of ["radius", "displacement", "markSize", "contrast"])
          gl.uniform1f(locations[name], settings[name]);
        for (const name of ["scatter", "original"])
          gl.uniform1f(locations[name], state[name]);
        gl.uniform1f(locations.engagement, state.active);
        gl.uniform1i(
          locations.mode,
          ["engraving", "scatter", "reveal"].indexOf(settings.mode),
        );
        gl.uniform3fv(
          locations.ink,
          settings.ink.match(/\w\w/g).map((v) => parseInt(v, 16) / 255),
        );
        gl.uniform1i(locations.layer, 0);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, prepared.sampled.count);
        gl.uniform1i(locations.layer, 1);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, prepared.sampled.count);
      },
      dispose,
    };
  } catch (e) {
    dispose();
    throw e;
  }
}
export function cpuRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas drawing unavailable.");
  let prepared;
  const photographicLayer = document.createElement("canvas");
  const mask = document.createElement("canvas");
  const photoContext = photographicLayer.getContext("2d");
  const maskContext = mask.getContext("2d");
  return {
    backend: "CPU",
    setImage(data) {
      prepared = data;
    },
    draw(frame, settings, view, wake) {
      if (!prepared) return;
      const { sampled, texture } = prepared,
        a = sampled.attributes;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      const night = settings.surface === "night";
      ctx.fillStyle = night ? "#201b13" : "#f5f1e7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (frame.original === 1) {
        ctx.drawImage(texture, ...view);
        return;
      }
      // Reconstruct the original in fixed image coordinates, then draw the
      // independently displaced grains over it. No moving photographic patches.
      const pw = Math.max(1, Math.ceil(view[2])), ph = Math.max(1, Math.ceil(view[3]));
      if (photographicLayer.width !== pw || photographicLayer.height !== ph) {
        photographicLayer.width = pw; photographicLayer.height = ph;
      }
      if (mask.width !== wake.size) mask.width = mask.height = wake.size;
      const pixels = maskContext.createImageData(wake.size, wake.size);
      for (let n=0; n<wake.data.length; n++) {
        pixels.data[n*4] = pixels.data[n*4+1] = pixels.data[n*4+2] = 255;
        pixels.data[n*4+3] = Math.round(wake.data[n]*(1-frame.original)+255*frame.original);
      }
      maskContext.putImageData(pixels, 0, 0);
      photoContext.globalCompositeOperation = "source-over";
      photoContext.clearRect(0, 0, pw, ph);
      photoContext.drawImage(texture, 0, 0, pw, ph);
      photoContext.globalCompositeOperation = "destination-in";
      photoContext.drawImage(mask, 0, 0, pw, ph);
      ctx.drawImage(photographicLayer, ...view);
      const cw = view[2] / sampled.columns,
        ch = view[3] / sampled.rows;
      for (let n = 0; n < sampled.count; n++) {
        const i = n * 10,
          r = a[i + 5],
          q = a[i + 6],
          dark = (night ? a[i + 2] : 1 - a[i + 2]) ** (settings.contrast * (night ? .68 : 1)),
          pose = particlePose(sampled, n, frame, settings, view, wake),
          x = pose.x + (r - .5) * cw * (night ? .30 : .66),
          y = pose.y + (q - .5) * ch * (night ? .30 : .66),
          resolve = resolvedField(wake.sample((x-view[0])/view[2], (y-view[1])/view[3])) * (1-frame.original) + frame.original;
        if (
          r >
            (night
              ? 0.08 + Math.sqrt(dark) * 1.2 + a[i + 3] * 0.25
              : 0.04 + dark * 0.94 + a[i + 3] * 0.4)
        )
          continue;
        if (resolve === 1) continue;
        const flow = wake.flow(a[i], a[i+1]);
        const bend = Math.atan2(flow[1], flow[0]+.0000001)*Math.min(Math.hypot(...flow)*14,.26);
        const angle = (night ? (r-.5)*.12+bend : a[i+4]+(r-.5)*.65) + (q-.5)*frame.scatter*5,
          scale =
            (night ? 0.82 + Math.sqrt(a[i + 2]) * 0.48 : 0.8 + dark * 1.6) *
              settings.markSize,
          w = cw * scale,
          h = ch * scale;
        ctx.setTransform(
          Math.cos(angle),
          Math.sin(angle),
          -Math.sin(angle),
          Math.cos(angle),
          x,
          y,
        );
        ctx.globalAlpha = (night ? .80 + dark * .20 : .36 + dark * .64) * (1 - resolve);
        ctx.fillStyle = night ? `rgb(${grainPigment(dark, settings.ink).join(' ')})` : settings.ink;
        ctx.beginPath();
        if (night) {
          ctx.rect(-w*.44, -h*.25, w*.88, h*.5);
        } else if (q > 0.37) {
          ctx.ellipse(0, 0, w * 0.43, h * 0.12, 0, 0, Math.PI * 2);
        } else ctx.ellipse(0, 0, w * 0.26, h * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        if (settings.mode === "scatter" && frame.scatter > .02) {
          ctx.globalAlpha = frame.scatter * .65 * (1-resolve);
          ctx.fillStyle = `rgb(${a[i+7]*255} ${a[i+8]*255} ${a[i+9]*255})`;
          ctx.fill();
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    },
    dispose() {
      prepared = null;
      photographicLayer.width = photographicLayer.height = mask.width = mask.height = 1;
    },
  };
}
