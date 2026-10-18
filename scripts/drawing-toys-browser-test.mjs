import assert from "node:assert/strict";
import { mkdir, readFile, stat, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/drawing-toys/",
  out = path.resolve("test-results/drawing-toys");
await mkdir(out, { recursive: true });
let rootDir = out;
const server = createServer(async (req, res) => {
  try {
    const file = path.resolve(
      rootDir,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!file.startsWith(rootDir + path.sep)) throw Error();
    await stat(file);
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
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
      const root = page.locator(".dt"),
        canvas = page.locator(".dt canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      const set = async (k, v) => {
        await page.locator(`[data-setting="${k}"]`).evaluate((el, v) => {
          if (el.type === "checkbox") el.checked = !!v;
          else el.value = String(v);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(45);
      };
      const cursor = async () =>
          JSON.parse(await root.getAttribute("data-cursor")),
        count = async () => +(await root.getAttribute("data-events")),
        snap = async () =>
          createHash("sha256")
            .update(await canvas.evaluate((c) => c.toDataURL()))
            .digest("hex");
      const drag = async (a, b, steps = 12) => {
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox();
        await page.mouse.move(r.x + r.width * a[0], r.y + r.height * a[1]);
        await page.mouse.down();
        await page.mouse.move(r.x + r.width * b[0], r.y + r.height * b[1], {
          steps,
        });
        await page.mouse.up();
      };
      await expect(root).toHaveAttribute("data-events", "0");
      await root.screenshot({ path: path.join(out, name + "-blank.png") });
      const c0 = await cursor();
      await drag([0.7, 0.5], [0.8, 0.35]);
      const c1 = await cursor();
      assert.ok(Math.abs(c1[0] - c0[0] - 0.1) < 0.01);
      assert.ok(Math.abs(c1[1] - c0[1] + 0.15) < 0.01);
      await drag([0.15, 0.8], [0.2, 0.8]);
      const c2 = await cursor();
      assert.ok(
        Math.abs(c2[0] - c1[0] - 0.05) < 0.01,
        "Repressing screen continues the original line",
      );
      for (const axis of ["x", "y"]) {
        const before = await cursor();
        const dial = page.locator(`[data-dial="${axis}"]`);
        await dial.scrollIntoViewIfNeeded();
        const r = await dial.boundingBox();
        await page.mouse.move(r.x + r.width / 2, r.y + 8);
        await page.mouse.down();
        await page.mouse.move(r.x + r.width - 8, r.y + r.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
        const after = await cursor();
        assert.notEqual(
          after[axis === "x" ? 0 : 1],
          before[axis === "x" ? 0 : 1],
        );
        assert.equal(
          after[axis === "x" ? 1 : 0],
          before[axis === "x" ? 1 : 0],
          "One knob changes one axis only",
        );
      }
      await canvas.focus();
      const preKey = await cursor();
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(230);
      await page.keyboard.up("ArrowRight");
      assert.ok((await cursor())[0] > preKey[0]);
      const drawn = await count();
      await page.locator("button[data-undo]").click();
      assert.ok((await count()) < drawn);
      await page.locator("button[data-redo]").click();
      assert.equal(await count(), drawn);
      await page.locator('[data-example="skyline"]').click();
      await canvas.screenshot({
        path: path.join(out, name + "-dial-drawing.png"),
      });
      const skyline = await snap();
      await page.locator("[data-replay-progress]").evaluate((el) => {
        el.value = "350";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const partial = await snap();
      assert.notEqual(partial, skyline);
      await page.locator("[data-replay-progress]").evaluate((el) => {
        el.value = "800";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.value = "350";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      assert.equal(
        await snap(),
        partial,
        "Reverse scrub reconstructs identical pixels",
      );
      await set("replaySpeed", 3);
      await page.locator("[data-play]").click();
      await page.waitForTimeout(240);
      assert.ok(+(await root.getAttribute("data-progress")) > 0.35);
      await page.locator("[data-pause]").click();
      const frozen = await root.getAttribute("data-progress");
      await page.waitForTimeout(180);
      assert.equal(await root.getAttribute("data-progress"), frozen);
      await page.locator("[data-play]").click();
      await page.locator("[data-replay-progress]").evaluate((el) => {
        el.value = "1000";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await page.locator("[data-erase]").click();
      await page.waitForTimeout(220);
      await expect(root).toHaveAttribute("data-erasing", "true");
      assert.notEqual(
        await page.locator(".dt-shell").evaluate((el) => el.style.transform),
        "translate(0px,0px) rotate(0deg)",
      );
      await expect(root).toHaveAttribute("data-events", "0", { timeout: 5000 });
      await page.locator("button[data-undo]").click();
      assert.ok((await count()) > 20);
      const grip = page.locator("[data-shake-grip]");
      await grip.scrollIntoViewIfNeeded();
      const gripBox = await grip.boundingBox();
      await page.mouse.move(
        gripBox.x + gripBox.width / 2,
        gripBox.y + gripBox.height / 2,
      );
      await page.mouse.down();
      for (const dx of [60, -60, 60, -60])
        await page.mouse.move(
          gripBox.x + gripBox.width / 2 + dx,
          gripBox.y + gripBox.height / 2,
          { steps: 2 },
        );
      await page.mouse.up();
      await expect(root).toHaveAttribute("data-events", "0", { timeout: 5000 });
      await page.locator("button[data-undo]").click();
      const dialCount = await count();
      await page.locator('[data-toy="magnetic"]').click();
      await expect(root).toHaveAttribute("data-events", "0");
      await drag([0.1, 0.2], [0.8, 0.3], 20);
      await drag([0.2, 0.7], [0.75, 0.65], 20);
      const marks = await count();
      assert.ok(marks >= 2);
      await page.locator('[data-stamp="star"]').click();
      await canvas.click({ position: { x: 120, y: 100 } });
      assert.equal(await count(), marks + 1);
      await page.locator('[data-stamp="star"]').click();
      const stamp = page.locator('[data-stamp="circle"]');
      await stamp.scrollIntoViewIfNeeded();
      let r = await stamp.boundingBox(),
        b = await canvas.boundingBox();
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.65, b.y + b.height * 0.55, {
        steps: 15,
      });
      await page.mouse.up();
      assert.equal(await count(), marks + 2);
      await root.screenshot({ path: path.join(out, name + "-magnetic.png") });
      const ink = await snap();
      const inkPixels = await canvas.evaluate((c) =>
        Array.from(
          c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
        ),
      );
      const inkDimensions = await canvas.evaluate((c) => [c.width, c.height]);
      await page.locator("input[data-eraser]").evaluate((el) => {
        el.value = "450";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      assert.notEqual(await snap(), ink);
      await page.locator("button[data-undo]").click();
      const restored = await canvas.evaluate((c) => ({
        pixels: Array.from(
          c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
        ),
        dimensions: [c.width, c.height],
      }));
      assert.deepEqual(restored.dimensions, inkDimensions);
      let differences = 0,
        maxDifference = 0;
      for (let i = 0; i < restored.pixels.length; i++)
        if (restored.pixels[i] !== inkPixels[i]) {
          differences++;
          maxDifference = Math.max(
            maxDifference,
            Math.abs(restored.pixels[i] - inkPixels[i]),
          );
        }
      // WebKit's shadow rasterizer can round a few antialiased edge channels by 1–2 values after rebuilding a canvas.
      assert.ok(
        maxDifference <= 2 && differences < restored.pixels.length * 0.0001,
        "Undo restores the same magnetic artwork within edge rasterization tolerance",
      );
      await page.locator("button[data-redo]").click();
      await page.locator("input[data-eraser]").evaluate((el) => {
        el.value = "1000";
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await page.locator("button[data-undo]").click();
      await page.locator('[data-example="boat"]').click();
      await page.locator("[data-stylus]").selectOption("eraser");
      const beforeErase = await snap();
      await drag([0.1, 0.68], [0.9, 0.68]);
      assert.notEqual(await snap(), beforeErase);
      await page.locator("button[data-undo]").click();
      await page.locator('[data-toy="dial"]').click();
      assert.equal(
        await count(),
        dialCount,
        "Separate drawings survive switching toys",
      );
      await page.locator('[data-toy="magnetic"]').click();
      const pngPromise = page.waitForEvent("download");
      await page.locator("[data-png]").click();
      const pngPath = path.join(out, name + ".png");
      await (await pngPromise).saveAs(pngPath);
      assert.equal((await readFile(pngPath)).readUInt32BE(16), 1600);
      const jsonPromise = page.waitForEvent("download");
      await page.locator("[data-json]").click();
      const jsonPath = path.join(out, name + "-drawing.json");
      await (await jsonPromise).saveAs(jsonPath);
      const doc = JSON.parse(await readFile(jsonPath));
      assert.equal(doc.mode, "magnetic");
      const savedCount = await count();
      await set("eraseBehavior", "instant");
      await page.locator("[data-sweep]").click();
      assert.equal(await count(), 0);
      await page.locator("[data-import-drawing]").setInputFiles(jsonPath);
      await expect.poll(count).toBe(savedCount);
      await page.locator("[data-import-drawing]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"points":[[0,0],[3,1]]}'),
      });
      await expect(page.locator(".dt-status")).toContainText(
        "Drawing unchanged",
      );
      assert.equal(await count(), savedCount);
      await page.locator("[data-import-drawing]").setInputFiles({
        name: "triangle.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          '{"points":[[0.2,0.8],[0.5,0.2],[0.8,0.8],[0.2,0.8]]}',
        ),
      });
      await expect.poll(count).toBe(3);
      await set("boardSize", "square");
      assert.ok(
        Math.abs(
          (await canvas.boundingBox()).height /
            (await canvas.boundingBox()).width -
            0.9,
        ) < 0.01,
      );
      await set("boardSize", "classic");
      for (const fallback of [false, true]) {
        if (fallback)
          await page.locator("[data-demo-shell]").evaluate((el) =>
            Object.defineProperty(el, "requestFullscreen", {
              value: undefined,
              configurable: true,
            }),
          );
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
        assert.ok(
          await page
            .locator("[data-demo]")
            .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        );
        await page.locator("[data-json]").scrollIntoViewIfNeeded();
        await expect(page.locator("[data-json]")).toBeInViewport();
        if (fallback) await page.keyboard.press("Escape");
        else await page.locator("[data-fullscreen]").click();
      }
      await page.locator("[data-recipe]").selectOption("seaside");
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("A quiet drawing");
      await page.locator("[data-save]").click();
      await page.locator("[data-reset]").click();
      await page.locator("[data-saved]").selectOption("0");
      await expect(root).toHaveAttribute("data-mode", "magnetic");
      await expect(root).toHaveAttribute("data-frame", "seafoam");
      const sourcePromise = page.waitForEvent("download");
      await page.locator("[data-export-source]").click();
      const zip = path.join(out, name + "-source.zip");
      await (await sourcePromise).saveAs(zip);
      const dest = path.join(out, name + "-standalone");
      execFileSync("python3", [
        "-c",
        "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])",
        zip,
        dest,
      ]);
      rootDir = dest;
      const portable = await browser.newPage();
      portable.on("pageerror", (e) => errors.push(e.message));
      const host = `http://127.0.0.1:${server.address().port}`;
      await portable.goto(host + "/example.html");
      await expect(portable.locator(".dt")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator('[data-example="boat"]').click();
      await expect(portable.locator(".dt")).toHaveAttribute(
        "data-events",
        "13",
      );
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator("canvas")).toHaveCount(0);
      await portable.goto(
        host + "/creative-lab/experiments/drawing-toys/embed-demo.html",
      );
      await portable.waitForFunction(() => !!window.drawingExample);
      await portable.locator("#extend").click();
      const n = await portable.evaluate(
        () => window.drawingExample.drawing.state().events.length,
      );
      await portable.locator("#undo").click();
      assert.equal(
        await portable.evaluate(
          () => window.drawingExample.drawing.state().events.length,
        ),
        n - 1,
      );
      // Pixel tests exercise the same independent renderer used by the workbench.
      const pixels = await portable.evaluate(async () => {
        const { createDrawing, DEFAULTS } = await import("./model.js"),
          { createRenderer } = await import("./renderer.js");
        const c = document.createElement("canvas"),
          r = createRenderer(c),
          d = createDrawing("magnetic"),
          settings = { ...DEFAULTS, mode: "magnetic" };
        r.resize(500, 340, 1);
        const sample = () =>
          Array.from(c.getContext("2d").getImageData(0, 0, 500, 340).data);
        r.render(d.state(), settings);
        const blank = sample();
        d.begin();
        d.stroke([0.05, 0.5], [0.95, 0.5], 8);
        d.commit();
        r.render(d.state(), settings);
        const ink = sample();
        d.begin();
        d.wipe(0, 0.45);
        d.commit();
        r.render(d.state(), settings);
        const erased = sample();
        const at = (data, x) => data[(170 * 500 + x) * 4];
        const result = {
          leftBlank: at(blank, 100),
          leftInk: at(ink, 100),
          leftErased: at(erased, 100),
          rightInk: at(ink, 400),
          rightErased: at(erased, 400),
        };
        r.render(d.state(), settings, { progress: 0.45 });
        const first = c.toDataURL();
        r.render(d.state(), settings, { progress: 0.85 });
        r.render(d.state(), settings, { progress: 0.45 });
        result.reverse = first === c.toDataURL();
        r.dispose();
        d.dispose();
        return result;
      });
      assert.ok(pixels.leftInk < pixels.leftBlank - 20);
      assert.equal(pixels.leftErased, pixels.leftBlank);
      assert.equal(pixels.rightErased, pixels.rightInk);
      assert.equal(pixels.reverse, true);
      await portable.close();
      await page.locator("[data-demo]").scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
      const idle = await root.getAttribute("data-frames");
      await page.waitForTimeout(180);
      assert.equal(
        await root.getAttribute("data-frames"),
        idle,
        "No idle animation",
      );
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await expect(page.locator(".dt")).toHaveCount(0);
      await context.close();
      const phone = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      await phone.goto(url);
      await phone.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(phone.locator(".dt")).toHaveAttribute("data-ready", "true");
      await phone.locator('[data-toy="magnetic"]').tap();
      await phone.locator('[data-stamp="star"]').tap();
      await phone.locator(".dt canvas").tap({ position: { x: 100, y: 80 } });
      await expect(phone.locator(".dt")).toHaveAttribute("data-events", "1");
      // Real touch taps in both engines; Chromium additionally supports a native dragged touch sequence.
      await phone.locator('[data-stamp="star"]').tap();
      await phone.locator(".dt canvas").scrollIntoViewIfNeeded();
      if (name === "chromium") {
        const session = await phone.context().newCDPSession(phone),
          r = await phone.locator(".dt canvas").boundingBox();
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: r.x + 25, y: r.y + 35 }],
        });
        for (let i = 1; i <= 8; i++)
          await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: r.x + 25 + i * 15, y: r.y + 35 + i * 4 }],
          });
        await session.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.ok(
          +(await phone.locator(".dt").getAttribute("data-events")) > 5,
        );
        await session.detach();
      } else {
        await phone.locator(".dt canvas").tap({ position: { x: 150, y: 60 } });
        await expect(phone.locator(".dt")).toHaveAttribute("data-events", "2");
      }
      await phone.locator('[data-example="boat"]').tap();
      for (const width of [390, 320, 768]) {
        await phone.setViewportSize({ width, height: 900 });
        assert.ok(
          await phone.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `Mobile overflow ${width}`,
        );
      }
      await phone.setViewportSize({ width: 390, height: 844 });
      await phone
        .locator(".dt-shell")
        .screenshot({ path: path.join(out, name + "-mobile.png") });
      await phone.close();
      const reduced = await browser.newPage({ reducedMotion: "reduce" });
      await reduced.goto(url);
      await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
      await reduced.locator('[data-example="boat"]').click();
      await reduced.locator("[data-erase]").click();
      await expect(reduced.locator(".dt")).toHaveAttribute("data-events", "0");
      await expect(reduced.locator(".dt")).toHaveAttribute(
        "data-erasing",
        "false",
      );
      await reduced.close();
      const plain = await browser.newPage({ javaScriptEnabled: false });
      await plain.goto(url);
      await expect(plain.locator("[data-still]")).toBeVisible();
      await plain.close();
      assert.deepEqual(errors, []);
      console.log(
        `${name}: continuous knobs/screen/keyboard, magnetic strokes/stamps/partial wipes, reversible replay, undo/redo, PNG/JSON/presets, fullscreen, standalone source, resize/touch/reduced motion and disposal passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await Promise.all(
    ["chromium", "webkit"].map((name) =>
      rm(path.join(out, name + "-standalone"), {
        recursive: true,
        force: true,
      }),
    ),
  );
}
