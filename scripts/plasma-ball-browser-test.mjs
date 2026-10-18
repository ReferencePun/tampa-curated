import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/plasma-ball"),
  temp = await mkdtemp("/tmp/plasma-ball-");
await mkdir(out, { recursive: true });
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Field probe</title><body></body></html>",
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
        .locator('a[href="/tampa-curated/lab/plasma-ball/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".pb"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await expect(root).toHaveAttribute("data-paths", "108");
      const control = async (k, v) =>
          root.locator(`[data-control="${k}"]`).evaluate((e, v) => {
            if (e.type === "checkbox") e.checked = v;
            else e.value = String(v);
            e.dispatchEvent(new Event("input", { bubbles: true }));
          }, v),
        number = async (k) => Number(await root.getAttribute("data-" + k));
      let rect = await canvas.boundingBox();
      await page.mouse.move(
        rect.x + rect.width * 0.7,
        rect.y + rect.height * 0.3,
      );
      await expect.poll(() => number("contact")).toBeGreaterThan(0.9);
      await expect.poll(() => number("distance")).toBeLessThan(0.15);
      await page.mouse.down();
      await expect(root).toHaveAttribute("data-pressed", "true");
      await page.waitForTimeout(200);
      await canvas.screenshot({ path: path.join(out, name + "-contact.png") });
      await page.mouse.up();
      await page.mouse.move(5, 5);
      await expect.poll(() => number("contact")).toBeLessThan(0.01);
      await expect.poll(() => number("distance")).toBeGreaterThan(0.5);
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      let clock = await root.getAttribute("data-clock");
      await page.waitForTimeout(150);
      assert.equal(await root.getAttribute("data-clock"), clock);
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => number("contact")).toBeGreaterThan(0.9);
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-pressed", "true");
      await page.keyboard.press("Escape");
      await expect(root).toHaveAttribute("data-contact", "0");
      assert.equal(await root.getAttribute("data-clock"), clock);
      // Every optical control changes actual rendered pixels, while the clock is held.
      const capture = () => canvas.evaluate((c) => c.toDataURL());
      for (const [key, value] of [
        ["glow", 0.4],
        ["reflection", 0],
        ["darkness", 0.7],
        ["coreSize", 0.13],
        ["sphereSize", 0.8],
        ["palette", "ember"],
        ["filaments", 60],
        ["branching", 4],
      ]) {
        const before = await capture();
        await control(key, value);
        assert.notEqual(await capture(), before, `${key} changes rendering`);
      }
      await expect(root).toHaveAttribute("data-paths", "300");
      for (const p of ["classic", "touch", "ambient", "ember", "silver"]) {
        await root.locator("[data-preset]").selectOption(p);
        await expect(
          root.locator("[data-mode][aria-pressed=true]"),
        ).toHaveCount(1);
      }
      await root.locator("[data-reset]").click();
      await expect(root).toHaveAttribute("data-mode", "classic");
      await expect(root).toHaveAttribute("data-paths", "108");
      // Inspector and studio share one validated settings object.
      await page.locator('[data-setting="filaments"]').evaluate((e) => {
        e.value = "44";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(root.locator('[data-control="filaments"]')).toHaveValue(
        "44",
      );
      await expect(root).toHaveAttribute("data-paths", "132");
      await control("filaments", 36);
      await expect(page.locator('[data-setting="filaments"]')).toHaveValue(
        "36",
      );
      await root.locator("[data-fullscreen]").click();
      await expect(root.locator("dialog")).toBeVisible();
      assert.ok(
        await root.locator(".pb-stage").evaluate((e) => {
          const r = e.getBoundingClientRect();
          return r.width >= innerWidth - 2 && r.height >= innerHeight - 2;
        }),
      );
      await page.keyboard.press("Tab");
      await expect(root.locator("[data-exit]")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(root.locator("dialog")).not.toBeVisible();
      await expect(root.locator("[data-fullscreen]")).toBeFocused();
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      assert.ok((await number("clock")) > 0);
      await control("idle", false);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(1400);
      clock = await root.getAttribute("data-clock");
      await page.waitForTimeout(200);
      assert.equal(
        await root.getAttribute("data-clock"),
        clock,
        "Idle-off sleeps",
      );
      await control("idle", true);
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(200);
      clock = await root.getAttribute("data-clock");
      await page.waitForTimeout(180);
      assert.equal(
        await root.getAttribute("data-clock"),
        clock,
        "Offscreen suspends",
      );
      await page.setViewportSize({ width: 1440, height: 1150 });
      const download = async (el, file) => {
        const d = page.waitForEvent("download");
        await el.click();
        await (await d).saveAs(file);
      };
      await download(
        root.locator("[data-print]"),
        path.join(out, name + "-current.png"),
      );
      const png = await readFile(path.join(out, name + "-current.png"));
      assert.equal(png.readUInt32BE(16), 1800);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Quiet electricity");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "Quiet electricity",
      );
      const zip = path.join(out, name + "-source.zip");
      await download(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".pb")).toHaveAttribute("data-ready", "true");
      await single.locator(".pb-canvas").scrollIntoViewIfNeeded();
      await single.waitForTimeout(200);
      await single
        .locator(".pb-canvas")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/plasma-ball/embed-demo.html",
      );
      await expect(single.locator("canvas")).toHaveCount(3);
      await single.locator("#widget").scrollIntoViewIfNeeded();
      await single.locator("#motion").click();
      await expect(single.locator("#motion")).toHaveText("Resume all");
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createPlasmaBall } =
          await import("./creative-lab/experiments/plasma-ball/engine.js");
        const c = document.createElement("canvas");
        c.style.cssText = "width:800px;aspect-ratio:10/9;display:block";
        document.body.append(c);
        const toy = createPlasmaBall(c);
        await new Promise((r) => setTimeout(r, 100));
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 1100));
        const normal = toy.getState();
        toy.update({ ...normal.config, filaments: 80, branching: 4 });
        await new Promise((r) => setTimeout(r, 1100));
        const dense = toy.getState();
        toy.setRunning(false);
        const paused = toy.getState();
        await new Promise((r) => setTimeout(r, 120));
        if (toy.getState().time !== paused.time)
          throw Error("Time advanced while paused");
        toy.point(0.5, -0.2, true);
        if (toy.getState().meanContactDistance > 0.15)
          throw Error("Programmatic contact not registered");
        toy.release();
        // Cancelled touch removes the force and capture without starting another loop.
        const r = c.getBoundingClientRect();
        c.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 9,
            pointerType: "touch",
            button: 0,
            clientX: r.x + r.width * 0.6,
            clientY: r.y + r.height * 0.35,
          }),
        );
        c.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: 9,
            pointerType: "touch",
          }),
        );
        if (toy.getState().contact.amount !== 0)
          throw Error("Cancelled touch remained active");
        const frames = toy.getState().frames;
        toy.dispose();
        toy.dispose();
        await new Promise((r) => setTimeout(r, 100));
        if (toy.getState().frames !== frames || c.width !== 1)
          throw Error("Disposed effect continued drawing");
        const second = createPlasmaBall(c);
        second.dispose();
        return {
          normalFps: normal.fps,
          denseFps: dense.fps,
          densePaths: dense.paths,
          width: normal.width,
        };
      });
      assert.ok(metrics.normalFps >= 25);
      assert.ok(metrics.denseFps >= 22);
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
      await canvas.scrollIntoViewIfNeeded();
      await root.screenshot({ path: path.join(out, name + "-mobile.png") });
      const reduced = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        rp = await reduced.newPage();
      rp.on("pageerror", (e) => errors.push(e.message));
      await rp.goto(origin + "/tampa-curated/lab/plasma-ball/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const rr = rp.locator(".pb"),
        rc = rr.locator("canvas");
      await expect(rr).toHaveAttribute("data-ready", "true");
      await rc.scrollIntoViewIfNeeded();
      clock = await rr.getAttribute("data-clock");
      await rp.waitForTimeout(180);
      assert.equal(await rr.getAttribute("data-clock"), clock);
      rect = await rc.boundingBox();
      await rp.touchscreen.tap(
        rect.x + rect.width * 0.6,
        rect.y + rect.height * 0.35,
      );
      await expect(rr).toHaveAttribute("data-contact", "0");
      await rc.evaluate((c) => {
        const r = c.getBoundingClientRect();
        for (const [type, x] of [
          ["pointerdown", 0.6],
          ["pointermove", 0.72],
        ])
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              button: 0,
              isPrimary: true,
              pointerId: 22,
              pointerType: "touch",
              clientX: r.x + r.width * x,
              clientY: r.y + r.height * 0.35,
            }),
          );
      });
      await expect(rr).toHaveAttribute("data-pressed", "true");
      await expect
        .poll(async () => Number(await rr.getAttribute("data-distance")))
        .toBeLessThan(0.15);
      await rc.evaluate((c) =>
        c.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: 22,
            pointerType: "touch",
          }),
        ),
      );
      await expect(rr).toHaveAttribute("data-contact", "0");
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rr.locator("[data-pause]").click();
      await rc.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => Number(await rr.getAttribute("data-clock")))
        .toBeGreaterThan(0);
      await reduced.close();
      const nojs = await browser.newContext({ javaScriptEnabled: false });
      const np = await nojs.newPage();
      await np.goto(origin + "/tampa-curated/lab/plasma-ball/");
      const preview = np.locator('img[src*="plasma-ball/plate"]');
      if (await preview.count())
        assert.ok(await preview.evaluate((e) => e.naturalWidth >= 900));
      await nojs.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: attraction/release, modes, optics, keyboard/touch, fullscreen, idle/offscreen pause, resize, presets, PNG, standalone export and cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
