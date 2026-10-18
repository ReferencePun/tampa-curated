import assert from "node:assert/strict";
import { mkdir, readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/spin-art/",
  out = path.resolve("test-results/spin-art");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/spin-art-");
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
      context.setDefaultTimeout(22000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/tampa-curated/");
      await page.locator("[data-concept-navigation] summary").click();
      await page
        .getByRole("navigation", { name: "Concept pages" })
        .locator('a[href="/tampa-curated/lab/spin-art/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".sa"),
        canvas = root.locator(".sa-board"),
        metric = async (k) => Number(await root.getAttribute("data-" + k));
      await expect(root).toHaveAttribute("data-ready", "true");
      assert.ok((await metric("marks")) > 1000);
      await root.locator("[data-motor]").click();
      await expect(root).toHaveAttribute("data-motor", "false");
      await root.screenshot({ path: path.join(out, name + "-studio.png") });
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
      const draw = async () => {
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox(),
          point = (x, y) => [
            r.x + ((450 + x * 280) / 900) * r.width,
            r.y + ((345 + y * 280) / 760) * r.height,
          ];
        await page.mouse.move(...point(0.25, -0.15));
        await page.mouse.down();
        await page.waitForTimeout(250);
        await page.mouse.move(...point(0.75, 0.1), { steps: 20 });
        await page.waitForTimeout(250);
        await page.mouse.up();
        await page.mouse.move(5, 5);
      };
      await root.locator("[data-clear]").click();
      await expect(root).toHaveAttribute("data-visible", "0");
      await expect(root).toHaveAttribute("data-motor", "false");
      await root.locator("[data-tool=marker]").click();
      await root.locator("[data-motor]").click();
      await draw();
      assert.ok((await metric("visible")) > 40);
      await root.locator("[data-motor]").click();
      const angle = await metric("angle"),
        marks = await metric("visible");
      await page.waitForTimeout(300);
      assert.equal(await metric("angle"), angle);
      assert.equal(await metric("visible"), marks);
      await root.locator("[data-undo]").click();
      await expect(root).toHaveAttribute("data-visible", "0");
      await root.locator("[data-redo]").click();
      assert.equal(await metric("visible"), marks);
      await canvas.focus();
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      await page.keyboard.press("Space");
      await page.keyboard.press("Escape");
      assert.ok((await metric("visible")) > marks);
      for (const style of ["splatter", "stream", "dots", "bloom"]) {
        await root.locator(`[data-tool=${style}]`).click();
        await root.locator("[data-drop]").click();
        await expect(root).toHaveAttribute("data-style", style);
      }
      await set("speed", 60);
      await set("direction", "counterclockwise");
      await root.locator("[data-motor]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect.poll(() => metric("rpm")).toBeLessThan(-50);
      await root.locator("[data-auto]").click();
      await expect(root).toHaveAttribute("data-auto", "true");
      const autoStart = await metric("marks");
      await expect.poll(() => metric("marks")).toBeGreaterThan(autoStart + 100);
      await page.locator(".il-demo-toolbar [data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const paused = await metric("marks"),
        clock = await metric("time");
      await page.waitForTimeout(300);
      assert.equal(await metric("marks"), paused);
      assert.equal(await metric("time"), clock);
      await page.locator(".il-demo-toolbar [data-pause]").click();
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect(root).toHaveAttribute("data-running", "false");
      const off = await metric("marks");
      await page.waitForTimeout(200);
      assert.equal(await metric("marks"), off);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await canvas.scrollIntoViewIfNeeded();
      await root.locator("[data-auto]").click();
      await expect(root).toHaveAttribute("data-auto", "false");
      await root.locator("[data-motor]").click();
      await expect(root).toHaveAttribute("data-motor", "false");
      await expect.poll(() => metric("wet")).toBe(0);
      const stable = await metric("marks");
      await set("palette", "electric");
      await set("paperSize", 1536);
      await set("ink", "#95c9d1");
      await set("thickness", 18);
      await set("colors", 4);
      await set("dripRate", 45);
      await set("spread", 0.9);
      await set("opacity", 0.6);
      assert.equal(await metric("marks"), stable);
      await expect(root).toHaveAttribute("data-paper-size", "1536");
      const art = path.join(out, name + "-art.json"),
        png = path.join(out, name + "-art.png"),
        svg = path.join(out, name + "-art.svg");
      await save(root.locator("[data-json]"), art);
      await save(root.locator("[data-png]"), png);
      await save(root.locator("[data-svg]"), svg);
      const document = JSON.parse(await readFile(art)),
        bytes = await readFile(png);
      assert.equal(document.marks.length, stable);
      assert.equal(bytes.readUInt32BE(16), 1536);
      assert.equal(bytes.readUInt32BE(20), 1536);
      assert.ok(
        (await readFile(svg, "utf8")).includes('clip-path="url(#disc)"'),
      );
      await root.locator("[data-clear]").click();
      await expect(root).toHaveAttribute("data-visible", "0");
      await root.locator("[data-restore]").click();
      assert.equal(await metric("marks"), stable);
      await root.locator("[data-clear]").click();
      await root.locator("[data-import]").setInputFiles(art);
      await expect(root.locator(".sa-status")).toContainText(
        "Artwork restored",
      );
      assert.equal(await metric("marks"), stable);
      assert.equal(await metric("angle"), +document.angle.toFixed(3));
      await expect(root).toHaveAttribute("data-motor", "false");
      const restored = path.join(out, name + "-restored.png");
      await save(root.locator("[data-png]"), restored);
      assert.deepEqual(
        await readFile(restored),
        bytes,
        "PNG pixels survive JSON reload and rerasterization exactly",
      );
      await root
        .locator("[data-import]")
        .setInputFiles({
          name: "invalid.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"type":"spin-art","version":99}'),
        });
      await expect(root.locator(".sa-status")).toContainText(
        "supported spin-art",
      );
      assert.equal(await metric("marks"), stable);
      for (const study of ["tide", "nocturne", "flare"]) {
        await root.locator(`[data-study=${study}]`).click();
        await expect(root).toHaveAttribute("data-motor", "false");
        assert.ok((await metric("marks")) > 1000);
      }
      for (const preset of ["fiesta", "ink", "orbit", "night", "fine"])
        await root.locator("[data-preset]").selectOption(preset);
      await set("paperSize", 768);
      await set("speed", 52);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Whirl proof");
      await page.locator(".il-presets [data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), presetFile);
      await page.locator(".il-inspector [data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(presetFile);
      await expect(root).toHaveAttribute("data-paper-size", "768");
      assert.equal(
        await page.locator("[data-setting=speed]").inputValue(),
        "52",
      );
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("[data-mount]")
        .evaluate((e) =>
          e.scrollIntoView({ behavior: "instant", block: "start" }),
        );
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-paper-size", "768");
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
          ": actual drawing, rotation/reversal/brake, five tools, keyboard, auto-pour, pause, undo/redo, exact PNG round-trip, SVG/JSON, presets and fullscreen passed.",
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
      const local = `http://127.0.0.1:${server.address().port}`;
      const portable = await browser.newPage({
        viewport: { width: 1100, height: 1000 },
      });
      portable.on("pageerror", (e) => errors.push(e.message));
      await portable.goto(local + "/example.html");
      await portable.bringToFront();
      await portable.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(portable.locator(".sa")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator(".sa [data-clear]").click();
      await expect(portable.locator(".sa")).toHaveAttribute(
        "data-visible",
        "0",
      );
      await portable.locator(".sa [data-drop]").click();
      await expect
        .poll(async () =>
          Number(await portable.locator(".sa").getAttribute("data-marks")),
        )
        .toBeGreaterThan(0);
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".sa")).toHaveCount(0);
      await portable.goto(
        local + "/creative-lab/experiments/spin-art/embed-demo.html",
      );
      await portable.locator("#pour").click();
      await expect(portable.locator("output")).toContainText("pouring");
      const proof = await portable.evaluate(async () => {
        const { createSpinArt } = await import("./engine.js");
        const c = document.createElement("canvas");
        c.style.width = "900px";
        c.style.height = "760px";
        document.body.append(c);
        const e = createSpinArt(c, {
          style: "splatter",
          colors: 4,
          speed: 65,
          dripRate: 45,
          paperSize: 2048,
        });
        e.setRunning(true);
        e.setAuto(true);
        await new Promise((r) => setTimeout(r, 900));
        const s = e.getState();
        e.setRunning(false);
        const frozen = e.getState().marks;
        await new Promise((r) => setTimeout(r, 120));
        const stable = e.getState().marks === frozen;
        e.setAuto(false);
        e.setMotor(false);
        const image = await e.png(),
          art = e.serialize();
        e.load(art);
        const preserved = e.getState().marks === s.marks;
        const bitmap = await createImageBitmap(image),
          probe = document.createElement("canvas");
        probe.width = probe.height = 2048;
        const ctx = probe.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
        bitmap.close();
        probe.width = probe.height = 1;
        e.dispose();
        const after = e.getState().frames;
        await new Promise((r) => setTimeout(r, 100));
        const clean =
          e.disposed && e.getState().frames === after && c.width === 1;
        const again = createSpinArt(c);
        again.setRunning(true);
        const reset = again.getState().marks;
        again.dispose();
        c.remove();
        return {
          frames: s.frames,
          fps: s.fps,
          marks: s.marks,
          stable,
          preserved,
          alpha,
          clean,
          reset,
        };
      });
      assert.ok(proof.marks > 500);
      assert.ok(proof.frames > 10);
      assert.ok(proof.fps > 20, JSON.stringify(proof));
      assert.equal(proof.stable, true);
      assert.equal(proof.preserved, true);
      assert.equal(proof.alpha, 0);
      assert.equal(proof.clean, true);
      assert.equal(proof.reset, 0);
      console.log(
        name +
          ": portable source, neutral embed, four-color 2048 px paint " +
          proof.fps +
          " FPS, transparent corners, clean disposal/remount passed.",
      );
      await portable.close();
      const mobile = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        mp = await mobile.newPage();
      mp.on("pageerror", (e) => errors.push(e.message));
      await mp.goto(url);
      await mp.bringToFront();
      await mp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const mr = mp.locator(".sa"),
        mc = mr.locator(".sa-board");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await expect(mr).toHaveAttribute("data-motor", "false");
      await mr.locator("[data-clear]").tap();
      await mr.locator("[data-tool=marker]").tap();
      await mc.scrollIntoViewIfNeeded();
      const rect = await mc.boundingBox();
      await mp.touchscreen.tap(
        rect.x + rect.width * 0.61,
        rect.y + rect.height * 0.45,
      );
      await expect
        .poll(async () => Number(await mr.getAttribute("data-marks")))
        .toBeGreaterThan(0);
      await mr.locator("[data-motor]").tap();
      await expect(mr).toHaveAttribute("data-motor", "true");
      await mc.evaluate((c) => {
        const r = c.getBoundingClientRect(),
          emit = (type, x, y) =>
            c.dispatchEvent(
              new PointerEvent(type, {
                pointerId: 9,
                isPrimary: true,
                pointerType: "touch",
                button: 0,
                clientX: r.x + x * r.width,
                clientY: r.y + y * r.height,
                bubbles: true,
              }),
            );
        emit("pointerdown", 0.5, 0.4);
        emit("pointermove", 0.65, 0.48);
      });
      await mp.waitForTimeout(300);
      await mc.dispatchEvent("pointerup", {
        pointerId: 9,
        pointerType: "touch",
        isPrimary: true,
      });
      await expect
        .poll(async () => Number(await mr.getAttribute("data-marks")))
        .toBeGreaterThan(20);
      await mr.locator("[data-motor]").tap();
      await mr.screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mp.setViewportSize({ width, height: 900 });
        assert.ok(
          await mp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": reduced-motion start, deliberate spin, native touch / captured drag, 320–768 px reflow and no browser exceptions passed.",
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
