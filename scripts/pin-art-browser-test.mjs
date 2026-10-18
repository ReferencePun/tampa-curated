import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, stat, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const url =
    (process.env.TEST_ORIGIN || "http://127.0.0.1:4321") +
    "/tampa-curated/lab/pin-art/",
  out = path.resolve("test-results/pin-art");
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
  for (const [name, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await type.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1100 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      context.setDefaultTimeout(12000);
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto(url);
      await page.locator("[data-demo]").scrollIntoViewIfNeeded();
      const root = page.locator(".pa"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      const metric = async (k) => Number(await root.getAttribute("data-" + k));
      const setting = (k) => page.locator(`[data-setting="${k}"]`);
      const set = async (k, v) => {
        await setting(k).evaluate((el, v) => {
          if (el.type === "checkbox") el.checked = !!v;
          else el.value = String(v);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(40);
      };
      const snap = async () =>
        createHash("sha256")
          .update(await canvas.evaluate((c) => c.toDataURL()))
          .digest("hex");
      const flat = async () => {
        await root.locator("[data-flat]").click();
        await canvas.scrollIntoViewIfNeeded();
        await expect
          .poll(() => metric("energy"), { timeout: 8000 })
          .toBeLessThan(0.001);
      };
      const drag = async (a, b, steps = 10) => {
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox();
        await page.mouse.move(r.x + r.width * a[0], r.y + r.height * a[1]);
        await page.mouse.down();
        await page.mouse.move(r.x + r.width * b[0], r.y + r.height * b[1], {
          steps,
        });
        await page.mouse.up();
        await page.mouse.move(r.x + 2, r.y + 2);
      };
      const save = async (selector, file) => {
        const d = page.waitForEvent("download");
        await page.locator(selector).click();
        await (await d).saveAs(file);
      };
      assert.equal(await metric("count"), 4240);
      assert.ok((await metric("energy")) > 0.04);
      assert.ok((await metric("drawCalls")) < 30);
      await root.screenshot({ path: path.join(out, name + "-orbital.png") });
      console.log(name + ": initial render");
      await set("spring", 3);
      await flat();
      const blank = await snap();
      await drag([0.33, 0.5], [0.65, 0.5], 2);
      await expect.poll(() => metric("max")).toBeGreaterThan(0.65);
      assert.notEqual(await snap(), blank);
      await page.waitForTimeout(1400);
      const held = await metric("energy");
      await page.waitForTimeout(300);
      assert.ok(
        Math.abs((await metric("energy")) - held) < 0.001,
        "Held relief remains in place after lifting",
      );
      await flat();
      console.log(name + ": held stroke");
      await root.locator("[data-hold]").uncheck();
      await root.locator("[data-direction]").selectOption("in");
      await canvas.scrollIntoViewIfNeeded();
      let r = await canvas.boundingBox();
      await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
      await page.mouse.down();
      await expect.poll(() => metric("min")).toBeLessThan(-0.5);
      await page.mouse.up();
      await expect
        .poll(() => metric("energy"), { timeout: 8000 })
        .toBeLessThan(0.001);
      await root.locator("[data-hold]").check();
      await root.locator("[data-direction]").selectOption("out");
      console.log(name + ": spring release");
      for (const shape of ["sphere", "cube", "ring", "star"]) {
        await flat();
        await root.locator('[data-mode-select="stamp"]').click();
        await root.locator("[data-shape]").selectOption(shape);
        await root.locator("[data-center]").click();
        await expect.poll(() => metric("max")).toBeGreaterThan(0.5);
      }
      await root.screenshot({ path: path.join(out, name + "-stamp.png") });
      console.log(name + ": four stamps");
      const builds = await metric("builds"),
        beforeView = await snap();
      await root.locator('[data-tool="rotate"]').click();
      await drag([0.4, 0.5], [0.65, 0.4]);
      assert.notEqual(await snap(), beforeView);
      assert.equal(await metric("builds"), builds);
      assert.notEqual(Number(await setting("rotation").inputValue()), -20);
      await set("rotation", -20);
      await set("tilt", 24);
      const beforeLight = await snap();
      await set("light", 15);
      assert.notEqual(await snap(), beforeLight);
      assert.equal(await metric("builds"), builds);
      await set("density", 128);
      assert.equal(await metric("count"), 10880);
      assert.ok((await metric("drawCalls")) < 30);
      await expect(canvas).toHaveCount(1);
      for (const material of ["brass", "graphite", "resin", "steel"])
        await set("material", material);
      await set("density", 80);
      await set("light", 135);
      await root.locator('[data-sample="palm"]').click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await root.screenshot({ path: path.join(out, name + "-palm.png") });
      await set("density", 48);
      await root.locator('[data-mode-select="wave"]').click();
      await canvas.scrollIntoViewIfNeeded();
      const phase = await metric("phase");
      await page.waitForTimeout(220);
      assert.notEqual(await metric("phase"), phase);
      await root.locator("[data-wave-play]").click();
      const stopped = await metric("phase");
      await page.waitForTimeout(200);
      assert.equal(await metric("phase"), stopped);
      await root.locator("[data-wave-play]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.locator("[data-pause]").click();
      await expect(page.locator("[data-lab-host]")).toHaveAttribute(
        "data-running",
        "false",
      );
      const frames = await metric("frames");
      await page.waitForTimeout(180);
      assert.equal(await metric("frames"), frames);
      await page.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect.poll(() => metric("phase")).not.toBe(stopped);
      await page.locator(".il-colophon").scrollIntoViewIfNeeded();
      await expect(page.locator("[data-lab-host]")).toHaveAttribute(
        "data-running",
        "false",
      );
      const offFrames = await metric("frames");
      await page.waitForTimeout(200);
      assert.equal(await metric("frames"), offFrames);
      await root.locator('[data-mode-select="image"]').click();
      console.log(name + ": wave pause and visibility");
      const png = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 90;
        c.height = 60;
        const x = c.getContext("2d"),
          g = x.createLinearGradient(0, 0, 90, 0);
        g.addColorStop(0, "#000");
        g.addColorStop(1, "#fff");
        x.fillStyle = g;
        x.fillRect(0, 0, 90, 60);
        return c.toDataURL().split(",")[1];
      });
      await root.locator("[data-image]").setInputFiles({
        name: "private-height.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await expect(root.locator("[data-image-name]")).toContainText(
        "private-height.png",
      );
      await canvas.scrollIntoViewIfNeeded();
      await expect.poll(() => metric("energy")).toBeGreaterThan(0.3);
      await root.locator("[data-invert]").check();
      const relief = path.join(out, name + "-relief.json");
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await save(".pa [data-relief]", relief);
      const doc = JSON.parse(await readFile(relief, "utf8"));
      assert.equal(doc.values.length, doc.columns * doc.rows);
      await flat();
      await root.locator("[data-load]").setInputFiles(relief);
      await expect(root.locator(".pa-status")).toContainText("restored");
      await expect.poll(() => metric("energy")).toBeGreaterThan(0.3);
      await root.locator("[data-load]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"values":[null]}'),
      });
      await expect(root.locator(".pa-status")).toContainText("unchanged");
      await expect.poll(() => metric("energy")).toBeGreaterThan(0.3);
      const photo = path.join(out, name + "-sculpture.png");
      await save(".pa [data-png]", photo);
      assert.ok((await stat(photo)).size > 15000);
      console.log(name + ": local images and relief/PNG");
      for (const preset of ["silver", "brass", "sea", "graphite"]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(root).toHaveAttribute("data-ready", "true");
      }
      await root.locator("[data-preset]").selectOption("silver");
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
        await root.locator("[data-png]").scrollIntoViewIfNeeded();
        await expect(root.locator("[data-png]")).toBeInViewport();
        if (fallback) await page.keyboard.press("Escape");
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
      }
      await set("rotation", 31);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Pin study");
      await page.locator("[data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save("[data-export-preset]", presetFile);
      await page.locator("[data-reset]").click();
      await page.locator("[data-import]").setInputFiles(presetFile);
      await expect
        .poll(async () => Number(await setting("rotation").inputValue()))
        .toBe(31);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page
        .locator("[data-mount]")
        .evaluate((el) =>
          el.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      await expect(root).toHaveAttribute("data-ready", "true", {
        timeout: 15000,
      });
      assert.equal(Number(await setting("rotation").inputValue()), 31);
      console.log(name + ": presets and fullscreen");
      const zip = path.join(out, name + "-source.zip");
      await save("[data-export-source]", zip);
      const dest = path.join(out, name + "-standalone");
      execFileSync("python3", [
        "-c",
        "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])",
        zip,
        dest,
      ]);
      rootDir = dest;
      const portable = await browser.newPage({
        viewport: { width: 1100, height: 900 },
      });
      portable.on("pageerror", (e) => errors.push(e.message));
      const host = `http://127.0.0.1:${server.address().port}`;
      await portable.goto(host + "/example.html");
      await portable.bringToFront();
      await portable.waitForTimeout(400);
      await expect(portable.locator(".pa")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator("[data-center]").click();
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".pa")).toHaveCount(0);
      await portable.goto(
        host + "/creative-lab/experiments/pin-art/embed-demo.html",
      );
      await portable.waitForFunction(() => !!window.pinExample);
      const proof = await portable.evaluate(async () => {
        const f = window.pinExample.field;
        f.setRunning(false);
        f.update({
          strength: 1,
          smoothing: 0,
          sample: "blank",
          mode: "pointer",
          autoWave: false,
        });
        f.setProcedural((x, y) => Math.tanh((x * x - y * y) / 12) * 0.8);
        const saddle = f.getState();
        f.setProcedural(() => 0);
        const flat = f.getState();
        f.setProcedural((x, y) => Math.tanh((x * x - y * y) / 12) * 0.8);
        const again = f.getState();
        const doc = f.serialize();
        f.clear();
        f.load(doc);
        const restored = f.getState();
        const xy = [1.5, -0.7],
          p = f.project(xy),
          hit = f.hit(p.x, p.y);
        f.setHeightMap({ width: 3, height: 2, data: [0, 0.5, 1, 0, 0.5, 1] });
        const map = f.getState();
        f.update({ density: 128 });
        f.clear();
        f.press([4, 0], [-4, 0]);
        const long = f.getState();
        const saved = f.snapshot();
        f.clear();
        f.restore(saved);
        const recovery = f.getState();
        f.update({ mode: "wave", autoWave: true });
        f.advance(0.5);
        const wave = f.getState();
        f.update({ autoWave: false });
        f.advance(1);
        const frozen = f.getState();
        const png = await f.exportPNG();
        window.pinExample.dispose();
        return {
          saddle,
          flat,
          again,
          restored,
          xy,
          hit,
          map,
          long,
          recovery,
          wave,
          frozen,
          png: png.size,
          disposed: f.getState().disposed,
        };
      });
      assert.deepEqual(proof.again.heights, proof.saddle.heights);
      assert.equal(proof.flat.energy, 0);
      assert.deepEqual(proof.restored.heights, proof.saddle.heights);
      assert.ok(
        Math.hypot(proof.hit[0] - proof.xy[0], proof.hit[1] - proof.xy[1]) <
          0.03,
      );
      assert.ok(
        proof.map.heights[proof.map.settings.density - 1] >
          proof.map.heights[0] + 0.8,
      );
      assert.equal(proof.long.count, 10880);
      assert.deepEqual(proof.long.heights, proof.recovery.heights);
      assert.equal(proof.frozen.phase, proof.wave.phase);
      assert.ok(proof.png > 15000 && proof.disposed);
      assert.ok(proof.long.drawCalls < 30);
      await writeFile(
        path.join(out, name + "-portable-proof.json"),
        JSON.stringify(
          {
            pins: proof.long.count,
            drawCalls: proof.long.drawCalls,
            hitError: Math.hypot(
              proof.hit[0] - proof.xy[0],
              proof.hit[1] - proof.xy[1],
            ),
            roundtrip: true,
            disposed: proof.disposed,
          },
          null,
          2,
        ),
      );
      await portable.close();
      await page.bringToFront();
      console.log(name + ": portable engine");
      await canvas.scrollIntoViewIfNeeded();
      await root.locator("[data-center]").click();
      await page.waitForTimeout(1500);
      if ((await page.locator("[data-pause]").textContent()).trim() === "Pause")
        await page.locator("[data-pause]").click();
      const energy = await metric("energy");
      await page.evaluate(() => {
        const gl = document.querySelector(".pa canvas").getContext("webgl2");
        window.contextTest = gl.getExtension("WEBGL_lose_context");
        window.contextTest.loseContext();
      });
      await expect(root).toHaveAttribute("data-ready", "fallback");
      await page.waitForTimeout(300);
      await page.evaluate(() => window.contextTest.restoreContext());
      await expect(root).toHaveAttribute("data-ready", "true");
      assert.ok(
        Math.abs((await metric("energy")) - energy) < 0.001,
        `Context restoration preserves a frozen relief: ${energy} to ${await metric("energy")}`,
      );
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await expect(root).toHaveCount(0);
      console.log(name + ": context restoration");
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      mobile.on("pageerror", (e) => errors.push(e.message));
      await mobile.goto(url);
      await mobile.bringToFront();
      await mobile.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(mobile.locator(".pa")).toHaveAttribute("data-ready", "true");
      await mobile.locator("[data-flat]").tap();
      await mobile.locator(".pa canvas").scrollIntoViewIfNeeded();
      await expect
        .poll(
          async () =>
            Number(await mobile.locator(".pa").getAttribute("data-energy")),
          { timeout: 8000 },
        )
        .toBeLessThan(0.001);
      let mb = await mobile.locator(".pa canvas").boundingBox();
      await mobile.touchscreen.tap(
        mb.x + mb.width * 0.5,
        mb.y + mb.height * 0.5,
      );
      await expect
        .poll(async () =>
          Number(await mobile.locator(".pa").getAttribute("data-max")),
        )
        .toBeGreaterThan(0.5);
      await mobile
        .locator(".pa")
        .screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mobile.setViewportSize({ width, height: 900 });
        for (const selector of ["[data-png]", "[data-relief]", "[data-load]"]) {
          const box = await mobile.locator(".pa " + selector).boundingBox();
          assert.ok(
            box.width >= 95 && box.height <= 110,
            "Export controls remain readable on narrow screens",
          );
        }
        assert.ok(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Mobile overflow",
        );
      }
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
      await reduced.bringToFront();
      await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(reduced.locator(".pa")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await reduced.locator('[data-mode-select="wave"]').click();
      const rp = await reduced.locator(".pa").getAttribute("data-phase");
      await reduced.waitForTimeout(200);
      assert.equal(await reduced.locator(".pa").getAttribute("data-phase"), rp);
      await reduced.locator("[data-flat]").click();
      await expect(reduced.locator(".pa")).toHaveAttribute(
        "data-energy",
        "0.000000",
      );
      await reduced.locator("[data-center]").click();
      assert.ok(
        Number(await reduced.locator(".pa").getAttribute("data-max")) > 0.6,
      );
      await reduced.close();
      const fallback = await browser.newPage();
      await fallback.addInitScript(() => {
        const orig = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : orig.call(this, type, ...args);
        };
      });
      await fallback.goto(url);
      await fallback.bringToFront();
      await fallback.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(fallback.locator(".pa")).toHaveAttribute(
        "data-ready",
        "fallback",
      );
      await expect(fallback.locator("[data-static]")).toBeVisible();
      await expect(fallback.locator("[data-center]")).toBeDisabled();
      await fallback.close();
      const nojs = await browser.newPage({ javaScriptEnabled: false });
      await nojs.goto(url);
      await nojs.bringToFront();
      await expect(nojs.locator("[data-still]")).toBeVisible();
      await nojs.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: signed held/transient strokes, four stamps, physical view/light/materials, 10,880 pins, waves/pause, images, relief/PNG, presets/fullscreen, standalone source, context restoration, touch, responsive layouts, reduced motion and cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await Promise.all(
    ["chromium", "webkit"]
      .filter(
        (name) => !process.env.TEST_ENGINE || process.env.TEST_ENGINE === name,
      )
      .map((name) =>
        rm(path.join(out, name + "-standalone"), {
          recursive: true,
          force: true,
        }),
      ),
  );
}
