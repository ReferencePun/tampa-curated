import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/sea-anemone-field"),
  temp = await mkdtemp("/tmp/sea-anemone-field-");
await mkdir(out, { recursive: true });
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Anemone probe</title><body></body></html>",
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
        .locator('a[href="/tampa-curated/lab/sea-anemone-field/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".af"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
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
      await canvas.scrollIntoViewIfNeeded();
      let before = await capture(),
        box = await canvas.boundingBox();
      await page.mouse.move(
        box.x + box.width * 0.55,
        box.y + box.height * 0.55,
      );
      await expect(root).toHaveAttribute("data-contact", "1");
      assert.notEqual(
        await capture(),
        before,
        "Pointer changes actual paused geometry",
      );
      await expect(root).toHaveAttribute("data-clock", clock);
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-contact", "1");
      await page.keyboard.press("Escape");
      await expect(root).toHaveAttribute("data-contact", "0");
      for (const mode of ["avoid", "ripple", "mixed", "attract"]) {
        await root.locator(`[data-mode="${mode}"]`).click();
        await expect(root).toHaveAttribute("data-mode", mode);
      }
      await root.locator('[data-mode="mixed"]').click();
      for (const key of ["attraction", "avoidance", "ripple"])
        await expect(root.locator(`[data-control="${key}"]`)).toBeEnabled();
      for (const [key, value] of [
        ["density", 90],
        ["tendrils", 42],
        ["length", 1.3],
        ["palette", "lilac"],
        ["material", "satin"],
        ["glow", 1.2],
        ["background", "#233a3a"],
      ]) {
        before = await capture();
        await control(key, value);
        assert.notEqual(await capture(), before, key + " changes artwork");
      }
      await expect(root).toHaveAttribute("data-tendrils", String(90 * 42));
      await root.locator('[data-control="transparent"]').check();
      assert.ok(
        await canvas.evaluate((c) =>
          c
            .getContext("2d")
            .getImageData(0, 0, c.width, c.height)
            .data.some((v, i) => i % 4 === 3 && v === 0),
        ),
        "Transparent substrate exports clear pixels",
      );
      await root.locator('[data-control="transparent"]').uncheck();
      for (const preset of [
        "lagoon",
        "coral",
        "lilac",
        "graphite",
        "alien",
        "quiet",
      ]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(
          root.locator("[data-mode][aria-pressed=true]"),
        ).toHaveCount(1);
        if (["coral", "graphite", "alien"].includes(preset)) {
          await canvas.scrollIntoViewIfNeeded();
          await canvas.screenshot({
            path: path.join(out, name + "-" + preset + ".png"),
          });
        }
      }
      await root.locator("[data-preset]").selectOption("lagoon");
      await page.locator('[data-setting="density"]').evaluate((e) => {
        e.value = "80";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(root.locator('[data-control="density"]')).toHaveValue("80");
      await expect(root).toHaveAttribute("data-colonies", "80");
      await control("density", 64);
      await expect(page.locator('[data-setting="density"]')).toHaveValue("64");
      await root.locator("[data-fullscreen]").click();
      await expect(root.locator("dialog")).toBeVisible();
      assert.ok(
        await root.locator(".af-stage").evaluate((e) => {
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
        path.join(out, name + "-garden.png"),
      );
      const png = await readFile(path.join(out, name + "-garden.png"));
      assert.equal(png.readUInt32BE(16), 1800);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Living tide");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "Living tide",
      );
      await control("density", 96);
      await page.locator("[data-saved]").selectOption("0");
      await expect(root.locator('[data-control="density"]')).toHaveValue("64");
      const zip = path.join(out, name + "-source.zip");
      await download(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".af")).toHaveAttribute("data-ready", "true");

      await single.locator(".af-canvas").scrollIntoViewIfNeeded();
      await single
        .locator(".af-canvas")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/sea-anemone-field/embed-demo.html",
      );
      await expect(single.locator("canvas")).toHaveCount(3);
      await single.locator("#motion").click();
      await expect(single.locator("#motion")).toHaveText("Resume all");
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createAnemoneField } =
          await import("./creative-lab/experiments/sea-anemone-field/engine.js");
        const c = document.createElement("canvas");
        c.tabIndex = 0;
        c.style.cssText = "width:800px;height:640px;display:block";
        document.body.append(c);
        const toy = createAnemoneField(c);
        await new Promise((r) => setTimeout(r, 120));
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 1500));
        const normal = toy.getState();
        toy.point(0.55, 0.55, true);
        await new Promise((r) => setTimeout(r, 300));
        const moved = toy.field.colonies.filter(
          (r) => Math.hypot(r.dx, r.dy) > 0.001,
        ).length;
        if (moved < 1 || moved >= normal.colonies)
          throw Error("Reaction is not local");
        toy.update({ ...normal.config, density: 140, tendrils: 48 });
        await new Promise((r) => setTimeout(r, 1800));
        const dense = toy.getState();
        toy.setRunning(false);
        const paused = toy.getState();
        await new Promise((r) => setTimeout(r, 130));
        if (toy.getState().time !== paused.time) throw Error("Pause advanced");
        const a = c.toDataURL();
        toy.point(0.25, 0.6, true);
        if (c.toDataURL() === a) throw Error("Static input unresponsive");
        toy.release();
        const frames = toy.getState().frames;
        toy.dispose();
        toy.dispose();
        await new Promise((r) => setTimeout(r, 100));
        if (
          toy.getState().frames !== frames ||
          c.width !== 1 ||
          toy.field.paths.length
        )
          throw Error("Resource cleanup failed");
        return {
          fps: normal.fps,
          maxDensityFps: dense.fps,
          moved,
          tendrils: dense.tendrils,
        };
      });
      assert.ok(metrics.fps >= 25, JSON.stringify(metrics));
      assert.ok(metrics.maxDensityFps >= 12, JSON.stringify(metrics));
      assert.equal(metrics.tendrils, 6720);
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
      await rp.goto(origin + "/tampa-curated/lab/sea-anemone-field/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const rr = rp.locator(".af"),
        rc = rr.locator("canvas");
      await expect(rr).toHaveAttribute("data-ready", "true");
      await rc.scrollIntoViewIfNeeded();
      clock = await rr.getAttribute("data-clock");
      await rp.waitForTimeout(180);
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rr.locator('[data-mode="avoid"]').tap();
      await expect(rr).toHaveAttribute("data-mode", "avoid");
      await rc.scrollIntoViewIfNeeded();
      await rc.evaluate((c) => {
        const r = c.getBoundingClientRect();
        for (const [type, x] of [
          ["pointerdown", 0.45],
          ["pointermove", 0.65],
        ])
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 7,
              pointerType: "touch",
              isPrimary: true,
              button: 0,
              clientX: r.left + r.width * x,
              clientY: r.top + r.height * 0.55,
            }),
          );
      });
      await expect(rr).toHaveAttribute("data-contact", "1");
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rc.dispatchEvent("pointercancel", {
        pointerId: 7,
        pointerType: "touch",
      });
      await expect(rr).toHaveAttribute("data-contact", "0");
      await rr.locator("[data-fullscreen]").tap();
      await expect(rr.locator("dialog")).toBeVisible();
      await rr.locator("[data-exit]").tap();
      await expect(rr.locator("dialog")).not.toBeVisible();
      await rr.locator("[data-pause]").tap();
      await rc.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => Number(await rr.getAttribute("data-clock")))
        .toBeGreaterThan(Number(clock));
      await reduced.close();
      const plain = await browser.newContext({ javaScriptEnabled: false });
      const noJS = await plain.newPage();
      await noJS.goto(origin + "/tampa-curated/lab/sea-anemone-field/");
      assert.ok(
        await noJS
          .locator('img[src*="sea-anemone-field"]')
          .first()
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      );
      await plain.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: local pointer response, modes, palettes, fullscreen, pause, touch, reduced motion, standalone source, PNG, performance and cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
