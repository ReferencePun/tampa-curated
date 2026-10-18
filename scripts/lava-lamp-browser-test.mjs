import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/lava-lamp"),
  temp = await mkdtemp("/tmp/lava-lamp-");
await mkdir(out, { recursive: true });
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Wax probe</title><body></body></html>",
);
const server = createServer(async (req, res) => {
  try {
    const file = path.resolve(
      temp,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!file.startsWith(temp + path.sep)) throw Error();
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end("Missing");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const standaloneOrigin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [name, launcher] of [
    ["webkit", webkit],
    ["chromium", chromium],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await launcher.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1150 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      context.setDefaultTimeout(18000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/tampa-curated/");
      await page.locator("[data-concept-navigation] summary").click();
      await page
        .getByRole("navigation", { name: "Concept pages" })
        .locator('a[href="/tampa-curated/lab/lava-lamp/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".ll"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute(
        "data-backend",
        "WebGL2 metaball field",
      );
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect
        .poll(async () => Number(await root.getAttribute("data-clock")))
        .toBeGreaterThan(0);
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      let clock = await root.getAttribute("data-clock");
      await page.waitForTimeout(180);
      assert.equal(await root.getAttribute("data-clock"), clock);
      const capture = () => canvas.evaluate((c) => c.toDataURL()),
        control = async (k, v) =>
          root.locator(`[data-control="${k}"]`).evaluate((e, v) => {
            e.value = String(v);
            e.dispatchEvent(new Event("input", { bubbles: true }));
          }, v);
      let before = await capture();
      await root.locator("[data-forward]").click();
      assert.ok(
        Number(await root.getAttribute("data-clock")) > Number(clock) + 29,
      );
      assert.notEqual(await capture(), before);
      await canvas.scrollIntoViewIfNeeded();
      await canvas.screenshot({ path: path.join(out, name + "-thermal.png") });
      for (const [key, value] of [
        ["merge", 1.8],
        ["viscosity", 1.8],
        ["height", 0.8],
        ["glow", 0.3],
        ["opacity", 0.8],
        ["ambient", 0],
        ["base", "ceramic"],
        ["palette", "orchid"],
        ["blobs", 20],
      ]) {
        before = await capture();
        await control(key, value);
        assert.notEqual(
          await capture(),
          before,
          `${key} changes the rendered field or shell`,
        );
      }
      await expect(root).toHaveAttribute("data-parcels", "20");
      for (const mode of ["ambient", "column", "classic"]) {
        before = await capture();
        await root.locator(`[data-mode="${mode}"]`).click();
        assert.notEqual(await capture(), before);
        await expect(root).toHaveAttribute("data-mode", mode);
        if (mode === "ambient")
          await expect(root.locator('[data-control="base"]')).toBeDisabled();
      }
      for (const preset of [
        "ember",
        "orchid",
        "lagoon",
        "ambient",
        "pearl",
        "neon",
      ]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(
          root.locator("[data-mode][aria-pressed=true]"),
        ).toHaveCount(1);
      }
      await root.locator("[data-preset]").selectOption("ember");
      await page.locator('[data-setting="blobs"]').evaluate((e) => {
        e.value = "18";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(root.locator('[data-control="blobs"]')).toHaveValue("18");
      await expect(root).toHaveAttribute("data-parcels", "18");
      await control("blobs", 12);
      await expect(page.locator('[data-setting="blobs"]')).toHaveValue("12");
      await root.locator("[data-fullscreen]").click();
      await expect(root.locator("dialog")).toBeVisible();
      assert.ok(
        await root.locator(".ll-stage").evaluate((e) => {
          const r = e.getBoundingClientRect();
          return r.width >= innerWidth - 2 && r.height >= innerHeight - 2;
        }),
      );
      await page.keyboard.press("Escape");
      await expect(root.locator("dialog")).not.toBeVisible();
      await expect(root.locator("[data-fullscreen]")).toBeFocused();
      await root.locator("[data-reset]").click();
      await expect(root).toHaveAttribute("data-clock", "0");
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => Number(await root.getAttribute("data-clock")))
        .toBeGreaterThan(0);
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(180);
      clock = await root.getAttribute("data-clock");
      await page.waitForTimeout(180);
      assert.equal(await root.getAttribute("data-clock"), clock);
      await page.setViewportSize({ width: 1440, height: 1150 });
      const download = async (el, file) => {
        const d = page.waitForEvent("download");
        await el.click();
        await (await d).saveAs(file);
      };
      await download(
        root.locator("[data-print]"),
        path.join(out, name + "-wax.png"),
      );
      const png = await readFile(path.join(out, name + "-wax.png"));
      assert.equal(png.readUInt32BE(16), 1800);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Slow warmth");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "Slow warmth",
      );
      const zip = path.join(out, name + "-source.zip");
      await download(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".ll")).toHaveAttribute("data-ready", "true");
      await single.locator(".ll [data-forward]").click();
      await single.locator(".ll-canvas").scrollIntoViewIfNeeded();
      await single
        .locator(".ll-canvas")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/lava-lamp/embed-demo.html",
      );
      await expect(single.locator("canvas")).toHaveCount(3);
      await single.locator("#motion").click();
      await expect(single.locator("#motion")).toHaveText("Resume all");
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createLavaLamp } =
            await import("./creative-lab/experiments/lava-lamp/engine.js"),
          { createWaxRenderer } =
            await import("./creative-lab/experiments/lava-lamp/field-renderer.js"),
          { WaxField, DEFAULTS } =
            await import("./creative-lab/experiments/lava-lamp/model.js");
        const c = document.createElement("canvas");
        c.style.cssText = "width:800px;aspect-ratio:10/9;display:block";
        document.body.append(c);
        const toy = createLavaLamp(c);
        await new Promise((r) => setTimeout(r, 100));
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 1100));
        const normal = toy.getState();
        toy.update({ ...normal.config, mode: "ambient", blobs: 24 });
        await new Promise((r) => setTimeout(r, 1100));
        const dense = toy.getState();
        toy.setRunning(false);
        const paused = toy.getState();
        await new Promise((r) => setTimeout(r, 130));
        if (toy.getState().time !== paused.time)
          throw Error("Pause advanced time");
        toy.warmup(30);
        if (toy.getState().time < paused.time + 29)
          throw Error("Warmup did not advance");
        const frames = toy.getState().frames;
        toy.dispose();
        toy.dispose();
        await new Promise((r) => setTimeout(r, 100));
        if (toy.getState().frames !== frames || c.width !== 1)
          throw Error("Disposed engine continued rendering");
        // Both backends must fill a connected neck, then expose liquid when kernels split.
        const pixels = [];
        for (const forceFallback of [false, true]) {
          const renderer = createWaxRenderer({ forceFallback }),
            field = new WaxField(),
            q = (x) => ({
              x,
              y: 1.2,
              rx: 0.24,
              ry: 0.28,
              angle: 0,
              temperature: 0.6,
            });
          field.parcels = [q(-0.16), q(0.16)];
          const read = () => {
            const s = renderer.draw(field, DEFAULTS, 128, 256),
              view = document.createElement("canvas");
            view.width = 128;
            view.height = 256;
            const ctx = view.getContext("2d");
            ctx.drawImage(s, 0, 0, 128, 256);
            return ctx.getImageData(64, 128, 1, 1).data[0];
          };
          const joined = read();
          field.parcels = [q(-0.38), q(0.38)];
          const separated = read();
          if (joined < separated + 50)
            throw Error("No genuine field neck in " + renderer.backend);
          pixels.push({ backend: renderer.backend, joined, separated });
          if (!forceFallback) {
            const s = renderer.draw(field, DEFAULTS, 128, 256),
              gl = s.getContext("webgl2"),
              extension = gl.getExtension("WEBGL_lose_context");
            if (extension) {
              extension.loseContext();
              await new Promise((r) => setTimeout(r, 150));
              if (!renderer.lost) throw Error("Context loss not handled");
              extension.restoreContext();
              await new Promise((r) => setTimeout(r, 350));
              if (renderer.lost) throw Error("Context restoration failed");
              field.parcels = [q(-0.16), q(0.16)];
              if (read() < joined - 10) throw Error("Restored shader is blank");
            }
          }
          renderer.dispose();
        }
        const fallback = createLavaLamp(c, {}, {}, { forceFallback: true });
        fallback.setRunning(true);
        await new Promise((r) => setTimeout(r, 600));
        const cpu = fallback.getState();
        fallback.dispose();
        return {
          fps: Math.round(normal.fps),
          ambientFps: Math.round(dense.fps),
          fallbackFrames: cpu.frames,
          pixels,
        };
      });
      assert.ok(metrics.fps >= 25);
      assert.ok(metrics.ambientFps >= 20);
      assert.ok(metrics.fallbackFrames >= 3);
      console.log(name, metrics);
      await single.close();
      await page.bringToFront();
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await canvas.scrollIntoViewIfNeeded();
        assert.ok(
          await root.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          `No overflow at ${width}`,
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await root.screenshot({ path: path.join(out, name + "-mobile.png") });
      const reduced = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        rp = await reduced.newPage();
      rp.on("pageerror", (e) => errors.push(e.message));
      await rp.goto(origin + "/tampa-curated/lab/lava-lamp/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const rr = rp.locator(".ll"),
        rc = rr.locator("canvas");
      await expect(rr).toHaveAttribute("data-ready", "true");
      await rc.scrollIntoViewIfNeeded();
      clock = await rr.getAttribute("data-clock");
      await rp.waitForTimeout(180);
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rr.locator('[data-mode="column"]').tap();
      await expect(rr).toHaveAttribute("data-mode", "column");
      await rr.locator("[data-forward]").tap();
      assert.ok(Number(await rr.getAttribute("data-clock")) >= 29);
      clock = await rr.getAttribute("data-clock");
      await rp.waitForTimeout(180);
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rr.locator("[data-pause]").tap();
      await rc.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => Number(await rr.getAttribute("data-clock")))
        .toBeGreaterThan(Number(clock));
      await reduced.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: thermal motion, controls, three modes, palettes, fullscreen, pause, touch, reduced motion, CPU/GPU neck topology, context restoration, standalone package, PNG and cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
