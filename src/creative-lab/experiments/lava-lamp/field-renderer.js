import { PALETTES, sampleField, clamp } from "./model.js";
const rgb = (hex) =>
  [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16) / 255);
const vertex = `#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform vec4 blobs[24];uniform vec4 shapes[24];uniform int count;
uniform vec3 wax;uniform vec3 hot;uniform vec3 liquid;uniform float merge;uniform float glow;uniform float opacity;uniform float time;uniform float halfWidth;
void main(){
 vec2 p=vec2((uv.x-.5)*halfWidth*2.,uv.y*2.4);float f=0.;vec2 grad=vec2(0.);float heat=0.;float softness=2.7-merge*.42;
 for(int i=0;i<24;i++){if(i>=count)break;vec2 d=p-blobs[i].xy;float cs=cos(shapes[i].x),sn=sin(shapes[i].x);vec2 q=vec2(d.x*cs+d.y*sn,-d.x*sn+d.y*cs)/blobs[i].zw;float v=2.8*exp(-softness*dot(q,q));f+=v;heat+=v*shapes[i].y;grad+=v*(-2.*softness)*vec2(q.x*cs/blobs[i].z-q.y*sn/blobs[i].w,q.x*sn/blobs[i].z+q.y*cs/blobs[i].w);}
 float edge=smoothstep(.91,1.09,f);float temperature=heat/max(.0001,f);vec3 normal=normalize(vec3(-grad*.038/max(1.,f),1.));
 float diffuse=.56+.44*max(0.,dot(normal,normalize(vec3(-.6,.6,1.))));float spec=pow(max(0.,dot(normal,normalize(vec3(-.45,.6,1.)))),22.);
 float interior=1.-exp(-max(0.,f-1.)*.63);vec3 pigment=mix(wax*.62,hot,.15+interior*.29+temperature*.14);pigment*=diffuse; pigment+=hot*(.055*spec+.14*glow*interior);
 vec3 water=liquid*(.15+opacity*.43)+hot*.022*pow(1.-uv.y,3.);float halo=exp(-abs(f-1.)*2.3)*.042+min(f,.9)*.036;water+=wax*halo*glow;
 vec3 result=mix(water,pigment,edge);result+=hot*.016*glow*exp(-uv.y*12.);
 color=vec4(result,1.);
}`;
/** Independent field renderer. No lamp geometry or page UI; WebGL2 with CPU fallback. */
export function createWaxRenderer({ forceFallback = false } = {}) {
  const canvas = document.createElement("canvas");
  let gl = forceFallback
      ? null
      : canvas.getContext("webgl2", {
          alpha: false,
          antialias: false,
          preserveDrawingBuffer: true,
          powerPreference: "low-power",
        }),
    program,
    buffer,
    locations,
    ctx,
    disposed = false,
    lost = false;
  function init() {
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw Error(message);
      }
      return s;
    };
    const vs = shader(gl.VERTEX_SHADER, vertex),
      fs = shader(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program));
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    locations = Object.fromEntries(
      [
        "blobs",
        "shapes",
        "count",
        "wax",
        "hot",
        "liquid",
        "merge",
        "glow",
        "opacity",
        "time",
        "halfWidth",
      ].map((k) => [k, gl.getUniformLocation(program, k)]),
    );
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  }
  let surface = canvas;
  try {
    if (gl) init();
  } catch {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    gl = null;
    surface = document.createElement("canvas");
  }
  if (!gl) ctx = surface.getContext("2d");
  const onLost = (e) => {
      e.preventDefault();
      lost = true;
    },
    onRestored = () => {
      if (!disposed) {
        lost = false;
        init();
      }
    };
  if (gl) {
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
  }
  const positions = new Float32Array(96),
    shapes = new Float32Array(96);
  function draw(field, c, width = 400, height = 800) {
    if (disposed || lost) return surface;
    const w = gl
        ? Math.min(700, Math.round(width))
        : Math.min(160, Math.round(width)),
      h = gl
        ? Math.min(1100, Math.round(height))
        : Math.min(360, Math.round(height));
    if (surface.width !== w || surface.height !== h) {
      surface.width = w;
      surface.height = h;
    }
    const pal = PALETTES[c.palette],
      half = c.mode === "ambient" ? 0.72 : 0.58;
    if (gl) {
      gl.viewport(0, 0, w, h);
      gl.useProgram(program);
      positions.fill(0);
      shapes.fill(0);
      field.parcels.forEach((p, i) => {
        positions.set([p.x, p.y, p.rx, p.ry], i * 4);
        shapes.set([p.angle, p.temperature, 0, 0], i * 4);
      });
      gl.uniform4fv(locations.blobs, positions);
      gl.uniform4fv(locations.shapes, shapes);
      gl.uniform1i(locations.count, field.parcels.length);
      for (const k of ["wax", "hot", "liquid"])
        gl.uniform3fv(locations[k], rgb(pal[k]));
      for (const k of ["merge", "glow", "opacity"])
        gl.uniform1f(locations[k], c[k]);
      gl.uniform1f(locations.time, field.time);
      gl.uniform1f(locations.halfWidth, half);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
      const image = ctx.createImageData(w, h),
        wax = rgb(pal.wax),
        hot = rgb(pal.hot),
        liquid = rgb(pal.liquid);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const s = sampleField(
              (x / w - 0.5) * half * 2,
              (1 - y / h) * 2.4,
              field.parcels,
              c.merge,
            ),
            edge = clamp((s.density - 0.91) / 0.18, 0, 1),
            interior = 1 - Math.exp(-Math.max(0, s.density - 1) * 0.63),
            nx = (-s.gx * 0.038) / Math.max(1, s.density),
            ny = (-s.gy * 0.038) / Math.max(1, s.density),
            len = Math.hypot(nx, ny, 1),
            diff =
              0.56 + 0.44 * Math.max(0, (-nx * 0.46 + ny * 0.46 + 0.76) / len);
          for (let k = 0; k < 3; k++) {
            const heat = 0.15 + interior * 0.29 + s.temperature * 0.14,
              pigment =
                (wax[k] * 0.62 * (1 - heat) + hot[k] * heat) * diff +
                hot[k] * 0.14 * c.glow * interior,
              water =
                liquid[k] * (0.15 + c.opacity * 0.43) +
                wax[k] * Math.min(s.density, 0.9) * 0.036 * c.glow;
            image.data[(y * w + x) * 4 + k] = clamp(
              (water * (1 - edge) + pigment * edge) * 255,
              0,
              255,
            );
          }
          image.data[(y * w + x) * 4 + 3] = 255;
        }
      ctx.putImageData(image, 0, 0);
    }
    return surface;
  }
  return {
    draw,
    get backend() {
      return gl ? "WebGL2 metaball field" : "Canvas implicit-field fallback";
    },
    get lost() {
      return lost;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (gl) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      surface.width = surface.height = canvas.width = canvas.height = 1;
    },
  };
}
