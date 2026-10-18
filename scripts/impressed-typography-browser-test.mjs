import assert from "node:assert/strict";
import { chromium, webkit, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  base = "/tampa-curated",
  url = origin + base + "/lab/impressed-typography/",
  out = path.resolve("test-results/impressed-typography");
await mkdir(out, { recursive: true });
const unpack = (file, dir) =>
  execFileSync("python3", [
    "-c",
    "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])",
    file,
    dir,
  ]);
let rootDir = out;
const server = createServer(async (req, res) => {
  try {
    const p = path.resolve(
      rootDir,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!p.startsWith(rootDir + path.sep)) throw Error();
    await stat(p);
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      }[path.extname(p)] || "application/octet-stream",
    );
    res.end(await readFile(p));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1100 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(url);
      await page.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(page.locator(".it")).toHaveAttribute("data-ready", "true");
      const field = (k) => page.locator(`[data-setting="${k}"]`);
      const set = async (k, v) => {
        await field(k).evaluate((el, value) => {
          el.value = String(value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(50);
      };
      const canvas = page.locator(".it canvas"),
        snapshot = () => canvas.evaluate((c) => c.toDataURL());
      const download = async (selector, file) => {
        const p = page.waitForEvent("download");
        await page.locator(selector).click();
        const d = await p;
        await d.saveAs(path.join(out, file));
        return path.join(out, file);
      };
      await page
        .locator(".it")
        .screenshot({ path: path.join(out, `${name}-bench.png`) });
      const emboss = await snapshot();
      await page.locator('[data-type="deboss"]').click();
      assert.notEqual(await snapshot(), emboss);
      assert.ok(+(await page.locator(".it").getAttribute("data-depth")) < 0);
      await page.locator('[data-type="letterpress"]').click();
      const ink = await snapshot();
      assert.notEqual(ink, emboss);
      await page.locator("[data-preset]").selectOption("blind");
      const first = await snapshot();
      await set("azimuth", 320);
      assert.notEqual(
        await snapshot(),
        first,
        "Light changes the shaded surface",
      );
      await set("azimuth", 140);
      assert.equal(await snapshot(), first, "Lighting is deterministic");
      await set("progress", 0);
      const flat = await snapshot();
      await field("text").fill("OTHER LETTERS");
      assert.equal(
        await snapshot(),
        flat,
        "At zero pressure there is no glyph relief or ink",
      );
      await set("progress", 50);
      assert.ok(+(await page.locator(".it").getAttribute("data-pressure")) > 0);
      const halfway = await snapshot();
      await set("progress", 100);
      assert.notEqual(await snapshot(), halfway);
      await set("progress", 50);
      assert.equal(
        await snapshot(),
        halfway,
        "Reverse scrubbing restores exact intermediate pixels",
      );
      await expect(page.locator(".it-plate")).toBeVisible();
      await set("progress", 100);
      await expect(page.locator(".it-plate")).toBeHidden();
      for (const font of ["serif", "sans", "mono"]) {
        await field("font").selectOption(font);
        await page
          .locator("[data-text]")
          .fill(
            "Printmaking — lines, light & paper.\nA long line can wrap gracefully without losing the words.",
          );
        await page.waitForTimeout(160);
        await expect(page.locator("[data-readable]")).toContainText(
          "without losing",
        );
        assert.ok(await snapshot());
      }
      await page.locator("[data-text]").fill("<script>alert(1)</script>");
      await page.waitForTimeout(160);
      await expect(page.locator("[data-readable]")).toHaveText(
        "<script>alert(1)</script>",
      );
      assert.equal(await page.locator(".it script").count(), 0);
      await page.locator("[data-preset]").selectOption("press");
      await page
        .locator(".it-sheet")
        .screenshot({ path: path.join(out, `${name}-letterpress.png`) });
      for (const material of [
        "cotton",
        "handmade",
        "recycled",
        "charcoal",
        "archive",
        "plaster",
      ]) {
        await field("material").selectOption(material);
        assert.equal(
          await page.locator("[data-stock]").textContent(),
          {
            cotton: "IVORY COTTON",
            handmade: "HANDMADE RAG",
            recycled: "RECYCLED STOCK",
            charcoal: "CHARCOAL PAPER",
            archive: "ARCHIVAL PAPER",
            plaster: "PAINTED PLASTER",
          }[material],
        );
      }
      await page.locator("[data-preset]").selectOption("blind");
      const builds = await page.locator(".it").getAttribute("data-builds");
      const bounds = await canvas.boundingBox();
      await page.mouse.move(
        bounds.x + bounds.width * 0.15,
        bounds.y + bounds.height * 0.2,
      );
      await page.waitForTimeout(240);
      assert.equal(
        await page.locator(".it").getAttribute("data-builds"),
        builds,
        "Pointer does not rebuild glyph texture",
      );
      await page.locator(".it-sheet").focus();
      const angle = +(await field("azimuth").inputValue());
      await page.keyboard.press("ArrowRight");
      assert.equal(+(await field("azimuth").inputValue()), (angle + 5) % 360);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      const frames = await page.locator(".it").getAttribute("data-frames");
      await page.waitForTimeout(200);
      assert.equal(
        await page.locator(".it").getAttribute("data-frames"),
        frames,
        "No perpetual idle loop",
      );
      await page.locator("button[data-contrast]").click();
      const contrast = await snapshot();
      await set("azimuth", 20);
      assert.equal(
        await snapshot(),
        contrast,
        "Readable proof is independent of lighting",
      );
      await page.locator("button[data-contrast]").click();
      await page.locator("[data-flat]").click();
      await page.locator("[data-play]").click();
      await page.waitForTimeout(550);
      assert.ok(+(await page.locator(".it").getAttribute("data-progress")) > 0);
      await page.locator("[data-pause]").click();
      const paused = await page.locator(".it").getAttribute("data-progress");
      await page.waitForTimeout(200);
      assert.equal(
        await page.locator(".it").getAttribute("data-progress"),
        paused,
      );
      await page.locator("[data-pause]").click();
      await set("progress", 100);
      const png = await download("[data-png]", `${name}-proof.png`);
      assert.equal((await readFile(png)).subarray(1, 4).toString(), "PNG");
      const svg = await download("[data-svg]", `${name}-lighting.svg`),
        svgText = await readFile(svg, "utf8");
      assert.ok(
        svgText.includes("feDiffuseLighting") &&
          svgText.includes("data:image/png;base64"),
      );
      const svgPixels = await page.evaluate(async (source) => {
        const blob = new Blob([source], { type: "image/svg+xml" }),
          url = URL.createObjectURL(blob),
          img = new Image();
        try {
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          const output = document.createElement("canvas");
          output.width = 1200;
          output.height = 800;
          const ctx = output.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(150, 180, 900, 450).data;
          let lo = 255,
            hi = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            lo = Math.min(lo, pixels[i]);
            hi = Math.max(hi, pixels[i]);
          }
          return { lo, hi };
        } finally {
          URL.revokeObjectURL(url);
        }
      }, svgText);
      assert.ok(
        svgPixels.hi - svgPixels.lo > 25,
        "The exported SVG actually renders letter relief",
      );

      const json = await download("[data-json]", `${name}-settings.json`);
      assert.equal(
        JSON.parse(await readFile(json, "utf8")).settings.progress,
        100,
      );
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Paper proof");
      await page.locator("[data-save]").click();
      await page.locator("[data-reset]").click();
      await page.locator("[data-import]").setInputFiles(json);
      await expect
        .poll(async () => +(await field("azimuth").inputValue()))
        .toBe(20);
      await page.reload();
      await page.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(page.locator(".it")).toHaveAttribute("data-ready", "true");
      assert.equal(+(await field("azimuth").inputValue()), 20);
      const zip = await download("[data-export-source]", `${name}-source.zip`),
        dest = path.join(out, name + "-standalone");
      unpack(zip, dest);
      rootDir = dest;
      const portableOrigin = `http://127.0.0.1:${server.address().port}`;
      const portable = await browser.newPage();
      portable.on("pageerror", (e) => errors.push(e.message));
      await portable.goto(portableOrigin + "/example.html");
      await expect(portable.locator(".it")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator("#pause").click();
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator("canvas")).toHaveCount(0);
      await portable.goto(
        portableOrigin +
          "/creative-lab/experiments/impressed-typography/embed-demo.html",
      );
      await expect(portable.locator("canvas")).toBeVisible();
      await portable.waitForFunction(() => !!window.impressionExample);
      const physical = await portable.evaluate(() => {
        const { effect } = window.impressionExample,
          c = document.querySelector("canvas"),
          gl = c.getContext("webgl");
        effect.update({
          text: "H",
          font: "sans",
          weight: 700,
          size: 220,
          spacing: 0,
          roughness: 0,
          depth: 5,
          progress: 100,
          azimuth: 180,
          elevation: 45,
          intensity: 1,
          paper: "#aaaaaa",
          highlight: 0,
          shadow: 1,
        });
        effect.resize(800);
        function measure(treatment) {
          effect.update({ treatment });
          const data = new Uint8Array(c.width * c.height * 4);
          gl.readPixels(
            0,
            0,
            c.width,
            c.height,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data,
          );
          return data;
        }
        const a = measure("emboss"),
          b = measure("deboss"),
          g = effect.getGlyph();
        let positive = 0,
          negative = 0,
          count = 0;
        for (let y = 20; y < g.height - 20; y++)
          for (let x = 20; x < g.width - 20; x++) {
            const i = (y * g.width + x) * 4,
              dx = g.data[i + 5] - g.data[i - 3];
            if (dx < 60 || g.data[i + 1] < 20 || g.data[i + 1] > 230) continue;
            const px = Math.floor((x / g.width) * c.width),
              py = c.height - 1 - Math.floor((y / g.height) * c.height),
              index = (py * c.width + px) * 4;
            positive += a[index];
            negative += b[index];
            count++;
          }
        effect.update({ progress: 0 });
        const zero = effect.getState().depth;
        return {
          raised: positive / count,
          recessed: negative / count,
          count,
          zero,
        };
      });
      assert.ok(physical.count > 50);
      assert.ok(
        physical.raised > physical.recessed + 5,
        JSON.stringify(physical),
      );
      assert.ok(physical.zero === 0);
      await writeFile(
        path.join(out, name + "-lighting-proof.json"),
        JSON.stringify(physical, null, 2),
      );
      await portable.locator("#dispose").click();
      assert.ok(
        await portable.evaluate(
          () => window.impressionExample.effect.getState().disposed,
        ),
      );
      await portable.close();
      // Graphics context recovery and disposal.
      await page.evaluate(() => {
        const gl = document.querySelector(".it canvas").getContext("webgl");
        window.testLoss = gl.getExtension("WEBGL_lose_context");
        window.testLoss?.loseContext();
      });
      await expect(page.locator(".it")).toHaveAttribute(
        "data-ready",
        "fallback",
      );
      await page.waitForTimeout(250);
      await page.evaluate(() => window.testLoss.restoreContext());
      await expect(page.locator(".it")).toHaveAttribute("data-ready", "true");
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await expect(page.locator(".it")).toHaveCount(0);
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      mobile.on("pageerror", (e) => errors.push(e.message));
      await mobile.goto(url);
      await mobile.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(mobile.locator(".it")).toHaveAttribute("data-ready", "true");
      await mobile
        .locator(".it")
        .screenshot({ path: path.join(out, `${name}-mobile.png`) });
      for (const width of [320, 390, 768]) {
        await mobile.setViewportSize({ width, height: 900 });
        assert.ok(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "No mobile overflow",
        );
      }
      assert.equal(
        await mobile
          .locator(".it-sheet")
          .evaluate((el) => getComputedStyle(el).touchAction),
        "pan-y",
      );
      await mobile.locator(".it-sheet").dispatchEvent("pointermove", {
        pointerType: "touch",
        buttons: 1,
        clientX: 140,
        clientY: 300,
      });
      await mobile.evaluate(
        () => (document.documentElement.style.fontSize = "28px"),
      );
      assert.ok(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await mobile.close();
      const reduced = await browser.newPage({ reducedMotion: "reduce" });
      await reduced.goto(url);
      await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(reduced.locator("[data-lab-host]")).toHaveAttribute(
        "data-running",
        "false",
      );
      await reduced.locator("input[data-progress]").evaluate((el) => {
        el.value = 50;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      assert.ok(
        +(await reduced.locator(".it").getAttribute("data-pressure")) > 0,
      );
      await reduced.close();
      const fallback = await browser.newPage();
      await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl" ? null : original.call(this, type, ...args);
        };
      });
      await fallback.goto(url);
      await fallback.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(fallback.locator(".it")).toHaveAttribute(
        "data-ready",
        "fallback",
      );
      await expect(fallback.locator(".it-fallback")).toContainText("MATTER");
      await fallback.close();
      const nojs = await browser.newPage({ javaScriptEnabled: false });
      await nojs.goto(url);
      await expect(nojs.locator("[data-still]")).toBeVisible();
      await nojs.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: physical edge-light reversal, three treatments, six materials, typography, deterministic press, idle/pause, PNG/SVG/JSON, presets, standalone source, touch/reduced-motion, fallback and graphics cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
}
