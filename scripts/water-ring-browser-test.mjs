import assert from "node:assert/strict";
import { mkdir, readFile, rm, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/waterfall-ring-toss/",
  out = path.resolve("test-results/water-ring");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/water-ring-");
let rootDir = temp;
const server = createServer(async (req, res) => {
  try {
    const f = path.resolve(
      rootDir,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!f.startsWith(rootDir + path.sep)) throw Error();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".json": "application/json",
        ".svg": "image/svg+xml",
      }[path.extname(f)] || "application/octet-stream",
    );
    res.end(await readFile(f));
  } catch {
    res.statusCode = 404;
    res.end("Missing");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
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
        .locator('a[href="/tampa-curated/lab/waterfall-ring-toss/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".wrt"),
        canvas = root.locator("canvas"),
        metric = async (k) => Number(await root.getAttribute("data-" + k));
      await expect(root).toHaveAttribute("data-ready", "true");
      const set = async (k, v) => {
        await page.locator(`[data-setting="${k}"]`).evaluate((e, v) => {
          if (e.type === "checkbox") e.checked = v;
          else e.value = String(v);
          e.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
      };
      const save = async (el, file) => {
        const d = page.waitForEvent("download");
        await el.click();
        await (await d).saveAs(file);
      };
      assert.equal(await metric("count"), 10);
      await root.locator('[data-pump="0"]').click();
      await expect(root).toHaveAttribute("data-pumps", "1");
      await expect
        .poll(() => metric("caught"), { timeout: 14000, intervals: [300] })
        .toBeGreaterThan(0);
      await expect(root.locator(".wrt-status")).toContainText("found a peg");
      await root
        .locator(".wrt-toy")
        .screenshot({ path: path.join(out, name + "-catch.png") });
      await canvas.focus();
      await page.keyboard.press("d");
      await expect(root).toHaveAttribute("data-pumps", "2");
      await page.waitForTimeout(200);
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-pumps", "4");
      await root.locator("[data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const stopped = await metric("time");
      await page.waitForTimeout(350);
      assert.equal(await metric("time"), stopped);
      await root.locator("[data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "true");
      await root.locator("[data-mode=challenge]").click();
      await expect(root).toHaveAttribute("data-mode", "challenge");
      assert.equal(
        await page.locator("[data-setting=layout]").inputValue(),
        "quartet",
      );
      await set("timer", 20);
      await root.locator('[data-pump="0"]').click();
      await expect(root.locator(".wrt-status")).toContainText(
        "Start challenge",
      );
      assert.equal(await metric("pumps"), 0);
      await root.locator("[data-start]").click();
      await expect(root).toHaveAttribute("data-challenge", "playing");
      await expect.poll(() => metric("remaining")).toBeLessThan(19.6);
      await page.locator(".il-demo-toolbar [data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const clock = await metric("remaining");
      await page.waitForTimeout(400);
      assert.equal(await metric("remaining"), clock);
      await page.locator(".il-demo-toolbar [data-pause]").click();
      // A short viewport puts the entire toy below the introductory page content.
      await page.setViewportSize({ width: 1440, height: 400 });
      // Offscreen gating pauses the same clock, without catch-up on return.
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await expect(root).toHaveAttribute("data-running", "false");
      const offscreen = await metric("remaining");
      await page.waitForTimeout(300);
      assert.equal(await metric("remaining"), offscreen);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-running", "true");
      await root.locator("[data-reset]").click();
      await expect(root).toHaveAttribute("data-challenge", "ready");
      assert.equal(await metric("remaining"), 20);
      for (const preset of [
        "reef",
        "moon",
        "practice",
        "challenge",
        "harbor",
      ]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(root).toHaveAttribute("data-ready", "true");
      }
      for (const world of ["reef", "moon", "harbor"]) {
        await root.locator(`[data-world=${world}]`).click();
        await expect(root).toHaveAttribute("data-world", world);
        if (world !== "harbor")
          await root
            .locator(".wrt-toy")
            .screenshot({ path: path.join(out, name + "-" + world + ".png") });
      }
      await set("ringCount", 24);
      await set("shape", "porthole");
      await set("strength", 1.5);
      await set("turbulence", 1);
      await set("buoyancy", 0.65);
      await expect(root).toHaveAttribute("data-count", "24");
      await root.locator("[data-free]").check();
      await expect(root.locator("[data-score]")).toHaveText("Free play");
      await root.locator("[data-free]").uncheck();
      const setup = path.join(out, name + "-setup.json");
      await save(root.locator("[data-settings]"), setup);
      const setupData = JSON.parse(await readFile(setup));
      assert.equal(setupData.settings.ringCount, 24);
      await root.locator("[data-preset]").selectOption("harbor");
      await root.locator("[data-import]").setInputFiles(setup);
      await expect(root.locator(".wrt-status")).toContainText("saved setup");
      await expect(root).toHaveAttribute("data-count", "24");
      await root.locator("[data-import]").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":9}'),
      });
      await expect(root.locator(".wrt-status")).toContainText(
        "Choose a Tideling setup",
      );
      await save(
        root.locator("[data-png]"),
        path.join(out, name + "-postcard.png"),
      );
      const png = await readFile(path.join(out, name + "-postcard.png"));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.ok(png.readUInt32BE(16) > 500);
      assert.ok(
        Math.abs(png.readUInt32BE(16) / png.readUInt32BE(20) - 1.6) < 0.01,
      );
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Water proof");
      await page.locator(".il-presets [data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), presetFile);
      await page.locator(".il-inspector [data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(presetFile);
      await expect(root).toHaveAttribute("data-count", "24");
      assert.equal(
        await page.locator("[data-setting=shape]").inputValue(),
        "porthole",
      );
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("[data-mount]")
        .evaluate((e) =>
          e.scrollIntoView({ behavior: "instant", block: "start" }),
        );
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-count", "24");
      await page.locator("[data-fullscreen]").click();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              !!document.fullscreenElement ||
              !!document.querySelector(".il-expanded"),
          ),
        )
        .toBe(true);
      if (await page.evaluate(() => !!document.fullscreenElement))
        await page.evaluate(() => document.exitFullscreen());
      else await page.locator("[data-fullscreen]").click();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              !!document.fullscreenElement ||
              !!document.querySelector(".il-expanded"),
          ),
        )
        .toBe(false);
      console.log(
        name +
          ": genuine pump/catch, both keyboard jets, pause/offscreen clocks, worlds, controls, PNG, setup import, shared presets, persistence and fullscreen passed.",
      );
      const zip = path.join(out, name + "-source.zip");
      await save(page.locator("[data-export-source]"), zip);
      const dest = path.join(temp, name);
      execFileSync("python3", [
        "-c",
        "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])",
        zip,
        dest,
      ]);
      rootDir = dest;
      const portable = await browser.newPage({
        viewport: { width: 1100, height: 1000 },
      });
      portable.on("pageerror", (e) => errors.push(e.message));
      const local = `http://127.0.0.1:${server.address().port}`;
      await portable.goto(local + "/example.html");
      await portable.bringToFront();
      await portable.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(portable.locator(".wrt")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator('.wrt [data-pump="0"]').click();
      await expect(portable.locator(".wrt")).toHaveAttribute("data-pumps", "1");
      await portable.locator(".wrt [data-world=moon]").click();
      await expect(portable.locator(".wrt")).toHaveAttribute(
        "data-world",
        "moon",
      );
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".wrt")).toHaveCount(0);
      await portable.goto(
        local + "/creative-lab/experiments/waterfall-ring-toss/embed-demo.html",
      );
      await portable.locator("#left").click();
      await expect(portable.locator("output")).toContainText("1 pumps");
      const proof = await portable.evaluate(async () => {
        const { createWaterToy } = await import("./engine.js");
        const c = document.createElement("canvas");
        c.style.width = "800px";
        c.style.height = "500px";
        document.body.append(c);
        let frames = 0,
          catches = 0;
        const toy = createWaterToy(
          c,
          { ringCount: 24 },
          {
            event(e) {
              if (e.type === "catch") catches++;
            },
            frame() {
              frames++;
            },
          },
        );
        toy.setRunning(true);
        toy.pump(0);
        toy.pump(1);
        await new Promise((r) => setTimeout(r, 700));
        const s = toy.getState();
        toy.setRunning(false);
        const count = frames,
          t = toy.getState().time;
        await new Promise((r) => setTimeout(r, 180));
        const stable = frames === count && toy.getState().time === t;
        toy.dispose();
        const f = frames;
        await new Promise((r) => setTimeout(r, 100));
        const clean = toy.disposed && frames === f && c.width === 1;
        const again = createWaterToy(c);
        again.setRunning(true);
        await new Promise((r) => setTimeout(r, 70));
        const remount = again.getState().count;
        again.dispose();
        c.remove();
        return {
          frames: s.frames,
          fps: s.fps,
          count: s.count,
          stable,
          clean,
          remount,
        };
      });
      assert.equal(proof.count, 24);
      assert.ok(proof.frames > 10);
      assert.ok(proof.fps > 20);
      assert.equal(proof.stable, true);
      assert.equal(proof.clean, true);
      assert.equal(proof.remount, 10);
      console.log(
        name +
          ": standalone export and neutral embed, 24-ring rendering " +
          proof.fps +
          " FPS, exact pause, dispose and remount passed.",
      );
      await portable.close();
      const mobile = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
        }),
        mp = await mobile.newPage();
      mp.on("pageerror", (e) => errors.push(e.message));
      await mp.goto(url);
      await mp.bringToFront();
      await mp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const mr = mp.locator(".wrt");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await mr.locator('[data-pump="0"]').tap();
      await expect(mr).toHaveAttribute("data-pumps", "1");
      await mr.locator('[data-pump="1"]').tap();
      await expect(mr).toHaveAttribute("data-pumps", "2");
      await mr.screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mp.setViewportSize({ width, height: 900 });
        assert.ok(
          await mp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "No horizontal overflow at " + width,
        );
      }
      await mp.emulateMedia({ reducedMotion: "reduce" });
      await mr.locator("[data-reset]").click();
      await expect(mr).toHaveAttribute("data-pumps", "0");
      assert.equal(
        await mr
          .locator(".wrt-toy")
          .evaluate((e) => getComputedStyle(e).animationName),
        "none",
      );
      await mr.locator('[data-pump="0"]').tap();
      await expect(mr).toHaveAttribute("data-pumps", "1");
      await expect
        .poll(async () => Number(await mr.getAttribute("data-time")))
        .toBeGreaterThan(0.3);
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": native touch pump taps, 320/390/768 px reflow, reduced-motion gameplay, no browser exceptions passed.",
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
