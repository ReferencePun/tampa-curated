import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, rm, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
import { FilingsField } from "../src/creative-lab/experiments/magnetic-hair-toy/model.js";
import { patternSamples } from "../src/creative-lab/experiments/magnetic-hair-toy/challenges.js";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/magnetic-hair-toy/",
  out = path.resolve("test-results/magnetic-hair");
await mkdir(out, { recursive: true });
const template = new FilingsField({ mode: "template", template: "handlebar" }),
  points = patternSamples("handlebar", "milo");
points.forEach((p, j) => {
  for (let k = 0; k < 7; k++) {
    const i = j * 7 + k;
    template.x[i] = p[0] + (k % 3) - 1;
    template.y[i] = p[1] + Math.floor(k / 3) - 1;
  }
});
const example = path.join(out, "pattern.json");
await writeFile(example, JSON.stringify(template.serialize()));
template.dispose();
const temp = await mkdtemp("/tmp/magnetic-hair-");
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
  for (const [name, engine] of [
    ["webkit", webkit],
    ["chromium", chromium],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1150 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      context.setDefaultTimeout(16000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/tampa-curated/");
      await page.locator("[data-concept-navigation] summary").click();
      await page
        .getByRole("navigation", { name: "Concept pages" })
        .locator('a[href="/tampa-curated/lab/magnetic-hair-toy/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".mht"),
        canvas = root.locator(".mht-board");
      await expect(root).toHaveAttribute("data-ready", "true");
      const metric = async (k) => Number(await root.getAttribute("data-" + k));
      const set = async (k, v) => {
        await page.locator(`[data-setting="${k}"]`).evaluate((e, v) => {
          if (e.type === "checkbox") e.checked = v;
          else e.value = String(v);
          e.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(40);
      };
      const drag = async (a, b, steps = 20) => {
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox(),
          at = (p) => [
            r.x + (p[0] / 900) * r.width,
            r.y + (p[1] / 760) * r.height,
          ];
        await page.mouse.move(...at(a));
        await page.mouse.down();
        await page.waitForTimeout(180);
        await page.mouse.move(...at(b), { steps });
        await page.waitForTimeout(650);
        await page.mouse.up();
        await page.mouse.move(8, 8);
      };
      const save = async (locator, file) => {
        const d = page.waitForEvent("download");
        await locator.click();
        await (await d).saveAs(file);
      };
      assert.equal(await metric("count"), 3800);
      await page.waitForTimeout(150);
      const idle = await metric("frames");
      await page.waitForTimeout(300);
      assert.equal(
        await metric("frames"),
        idle,
        "Idle toy has no continuous RAF",
      );
      await drag([450, 675], [450, 380]);
      assert.ok((await metric("placed")) > 200);
      await expect.poll(() => metric("held")).toBe(0);
      const dropped = await metric("checksum");
      await page.waitForTimeout(500);
      assert.equal(await metric("checksum"), dropped);
      await root.locator("[data-face=cleo]").click();
      assert.equal(
        await metric("checksum"),
        dropped,
        "Changing face preserves filings",
      );
      await root.locator("[data-face=cosmo]").click();
      await expect(root).toHaveAttribute("data-face", "cosmo");
      await set("hiddenMagnet", true);
      await expect(root).toHaveAttribute("data-hidden", "true");
      await set("hiddenMagnet", false);
      await set("density", 7000);
      assert.equal(await metric("count"), 7000);
      assert.ok((await metric("placed")) > 200);
      await root.locator("[data-shake]").click();
      await expect(root).toHaveAttribute("data-shaking", "false");
      assert.equal(await metric("placed"), 0);
      await drag([400, 675], [560, 255], 2);
      assert.ok(
        (await metric("placed")) > 100,
        "A fast drag carries actual grains",
      );
      await root.locator("[data-shake]").click();
      await expect(root).toHaveAttribute("data-shaking", "false");
      await root.locator("[data-pinch]").click();
      await canvas.scrollIntoViewIfNeeded();
      const r = await canvas.boundingBox();
      await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.24, {
        steps: 12,
      });
      await page.waitForTimeout(650);
      await root.locator("[data-lift]").click();
      assert.ok((await metric("placed")) > 100);
      await expect(root.locator("[data-hold]")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await canvas.focus();
      await page.keyboard.press("p");
      await page.keyboard.press("Shift+ArrowRight");
      await page.keyboard.press("Shift+ArrowUp");
      await page.waitForTimeout(400);
      await page.keyboard.press("Space");
      await expect.poll(() => metric("held")).toBe(0);
      await page.keyboard.press("Escape");
      console.log(
        name +
          ": real drag/fast pickup, release retention, density, three faces, latch and keyboard",
      );
      await root.locator("[data-import]").setInputFiles(example);
      await expect(root).toHaveAttribute("data-mode", "template");
      await expect.poll(() => metric("score")).toBeGreaterThan(85);
      await root.locator("[data-check]").click();
      await expect(root.locator(".mht-status")).toContainText("match");
      await root.screenshot({ path: path.join(out, name + "-portrait.png") });
      const artwork = path.join(out, name + "-artwork.json");
      await save(root.locator("[data-json]"), artwork);
      const before = await metric("checksum");
      await root.locator("[data-shake]").click();
      await expect(root).toHaveAttribute("data-shaking", "false");
      await root.locator("[data-import]").setInputFiles(artwork);
      await expect(root.locator(".mht-status")).toContainText(
        "Portrait restored",
      );
      assert.ok(Math.abs((await metric("checksum")) - before) < 2);
      const invalid = Buffer.from(
        JSON.stringify({
          version: 1,
          width: 900,
          height: 760,
          particles: [[2, 3, 0]],
        }),
      );
      await root.locator("[data-import]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: invalid,
      });
      await expect(root.locator(".mht-status")).toContainText("version 1");
      assert.ok(Math.abs((await metric("checksum")) - before) < 2);
      const png = path.join(out, name + "-portrait.png-export.png");
      await save(root.locator("[data-png]"), png);
      const bytes = await readFile(png);
      assert.equal(bytes.readUInt32BE(16), 1800);
      assert.equal(bytes.readUInt32BE(20), 1520);
      await root.locator("[data-mode=timed]").click();
      await set("challengeLength", 20);
      await root.locator("[data-start]").click();
      await expect(root).toHaveAttribute("data-challenge", "playing");
      await expect.poll(() => metric("remaining")).toBeLessThan(19.5);
      await page.locator("[data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const pause = await metric("remaining");
      await page.waitForTimeout(500);
      assert.equal(await metric("remaining"), pause);
      await page.locator("[data-pause]").click();
      await root.locator("[data-finish]").click();
      await expect(root).toHaveAttribute("data-challenge", "finished");
      await root.locator("[data-mode=silly]").click();
      const title = await root.locator("[data-task-title]").textContent();
      await root.locator("[data-next-task]").click();
      assert.notEqual(
        await root.locator("[data-task-title]").textContent(),
        title,
      );
      for (const preset of ["barber", "botanist", "cosmic"]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(root).toHaveAttribute("data-ready", "true");
      }
      await root.locator("[data-preset]").selectOption("barber");
      await set("radius", 47);
      await set("style", "blueprint");
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Magnet proof");
      await page.locator(".il-presets [data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), presetFile);
      await page.locator("[data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(presetFile);
      await expect(root).toHaveAttribute("data-style", "blueprint");
      assert.equal(
        Number(await page.locator("[data-setting=radius]").inputValue()),
        47,
      );
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("[data-mount]")
        .evaluate((e) =>
          e.scrollIntoView({ behavior: "instant", block: "start" }),
        );
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-style", "blueprint");
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
          ": scoring, clocks/pause, PNG and JSON, validation, presets and fullscreen",
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
        viewport: { width: 1050, height: 1000 },
      });
      portable.on("pageerror", (e) => errors.push(e.message));
      const local = `http://127.0.0.1:${server.address().port}`;
      await portable.goto(local + "/example.html");
      await portable.bringToFront();
      await portable.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(portable.locator(".mht")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator(".mht [data-face=cosmo]").click();
      await expect(portable.locator(".mht")).toHaveAttribute(
        "data-face",
        "cosmo",
      );
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".mht")).toHaveCount(0);
      await portable.goto(
        local + "/creative-lab/experiments/magnetic-hair-toy/embed-demo.html",
      );
      await portable.locator("canvas").scrollIntoViewIfNeeded();
      await portable.locator("#pinch").click();
      await expect(portable.locator("#status")).not.toHaveText(
        "0 filings on the magnet.",
      );
      const proof = await portable.evaluate(async () => {
        const { createMagneticLayer } = await import("./engine.js");
        const c = document.createElement("canvas");
        c.style.width = "600px";
        c.style.height = "506px";
        document.body.append(c);
        let frames = 0;
        const layer = createMagneticLayer(
          c,
          { density: 7000 },
          {
            frame() {
              frames++;
            },
            background(g) {
              g.fillStyle = "#e0d5bb";
              g.fillRect(0, 0, 900, 760);
            },
          },
        );
        layer.setRunning(true);
        layer.move(450, 675, false);
        layer.engage();
        layer.move(400, 250);
        await new Promise((r) => setTimeout(r, 500));
        layer.release();
        const state = layer.getState(),
          doc = layer.serialize();
        layer.reset();
        layer.load(doc);
        const restored = layer.getState();
        layer.setRunning(false);
        const paused = frames;
        await new Promise((r) => setTimeout(r, 120));
        const stable = frames === paused;
        layer.dispose();
        const released = layer.field.count;
        const again = createMagneticLayer(c);
        again.setRunning(true);
        const count = again.getState().count;
        again.dispose();
        c.remove();
        return {
          placed: state.placed,
          held: state.held,
          frames,
          restored: Math.abs(state.checksum - restored.checksum) < 2,
          stable,
          released,
          count,
        };
      });
      assert.ok(proof.placed > 100);
      assert.equal(proof.held, 0);
      assert.ok(proof.frames > 5);
      assert.equal(proof.restored, true);
      assert.equal(proof.stable, true);
      assert.equal(proof.released, 0);
      assert.equal(proof.count, 3800);
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
      const mr = mp.locator(".mht"),
        mc = mr.locator(".mht-board");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await mc.scrollIntoViewIfNeeded();
      await mc.evaluate((c) => {
        const r = c.getBoundingClientRect();
        const emit = (type, x, y) =>
          c.dispatchEvent(
            new PointerEvent(type, {
              pointerId: 9,
              isPrimary: true,
              pointerType: "touch",
              button: 0,
              clientX: r.x + (x / 900) * r.width,
              clientY: r.y + (y / 760) * r.height,
              bubbles: true,
            }),
          );
        emit("pointerdown", 450, 675);
        for (let i = 1; i <= 20; i++) emit("pointermove", 450, 675 - i * 15);
      });
      await mp.waitForTimeout(700);
      await mc.dispatchEvent("pointerup", {
        pointerId: 9,
        isPrimary: true,
        pointerType: "touch",
      });
      await expect
        .poll(async () => Number(await mr.getAttribute("data-placed")))
        .toBeGreaterThan(100);
      await mr.screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mp.setViewportSize({ width, height: 900 });
        assert.ok(
          await mp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await mp.emulateMedia({ reducedMotion: "reduce" });
      await mr.locator("[data-shake]").click();
      await expect(mr).toHaveAttribute("data-shaking", "false");
      await expect(mr).toHaveAttribute("data-placed", "0");
      await mr.locator("[data-pinch]").click();
      await mc.evaluate((c) => {
        const r = c.getBoundingClientRect();
        c.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 4,
            isPrimary: true,
            pointerType: "mouse",
            clientX: r.x + r.width * 0.5,
            clientY: r.y + r.height * 0.4,
            bubbles: true,
          }),
        );
      });
      await mr.locator("[data-lift]").click();
      await expect
        .poll(async () => Number(await mr.getAttribute("data-placed")))
        .toBeGreaterThan(100);
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": standalone export, independent layer, 7,000-particle interaction, cleanup/remount, touch, reflow and reduced motion passed.",
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
