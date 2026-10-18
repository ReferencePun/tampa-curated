import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/kaleidoscope");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/kaleidoscope-");
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Engine lifecycle probe</title><body></body></html>",
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
        ".jpg": "image/jpeg",
        ".png": "image/png",
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
        .locator('a[href="/tampa-curated/lab/kaleidoscope/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".ks"),
        canvas = root.locator(".ks-optic");
      await expect(root).toHaveAttribute("data-ready", "true");
      await root.locator("[data-motion]").click();
      await canvas.scrollIntoViewIfNeeded();
      await root.screenshot({ path: path.join(out, name + "-studio.png") });
      const control = async (k, v) => {
          await root.locator(`[data-control="${k}"]`).evaluate((e, v) => {
            e.value = String(v);
            e.dispatchEvent(new Event("input", { bubbles: true }));
          }, v);
        },
        hash = () => canvas.evaluate((c) => c.toDataURL()),
        save = async (el, file) => {
          const wait = page.waitForEvent("download");
          await el.click();
          await (await wait).saveAs(file);
        };
      const first = await hash(),
        pan0 = await root.getAttribute("data-pan");
      let r = await canvas.boundingBox();
      await page.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.4);
      await page.mouse.down();
      await page.mouse.move(r.x + r.width * 0.72, r.y + r.height * 0.54, {
        steps: 12,
      });
      await page.mouse.up();
      assert.notEqual(await root.getAttribute("data-pan"), pan0);
      assert.notEqual(await hash(), first);
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await root.getAttribute("data-rotation"), "3");
      await page.keyboard.press("ArrowUp");
      await expect(root.locator('[data-control="zoom"]')).toHaveValue("1.15");
      const variants = [];
      for (const s of [
        "glass",
        "lines",
        "image",
        "particles",
        "toys",
        "drawing",
      ]) {
        await control("source", s);
        await canvas.scrollIntoViewIfNeeded();
        variants.push(await hash());
        await canvas.screenshot({
          path: path.join(out, name + "-" + s + ".png"),
        });
      }
      assert.equal(
        new Set(variants).size,
        6,
        "All six sources create different images",
      );
      await root.locator("[data-preset]").selectOption("draw");
      await canvas.scrollIntoViewIfNeeded();
      r = await canvas.boundingBox();
      await page.mouse.move(r.x + r.width * 0.63, r.y + r.height * 0.52);
      await page.mouse.down();
      await page.mouse.move(r.x + r.width * 0.83, r.y + r.height * 0.57, {
        steps: 45,
      });
      await page.mouse.up();
      assert.ok(Number(await root.getAttribute("data-strokes")) > 0);
      const drawn = await hash();
      await root.locator("[data-undo]").click();
      assert.notEqual(await hash(), drawn);
      await root.locator("[data-redo]").click();
      assert.equal(await hash(), drawn);
      await root.locator("[data-clear]").click();
      await expect(root).toHaveAttribute("data-strokes", "0");
      await root.locator("[data-redo]").click();
      assert.equal(await hash(), drawn);
      await canvas.screenshot({ path: path.join(out, name + "-drawing.png") });
      await root.locator("[data-preset]").selectOption("jewel");
      await root.locator("[data-shuffle]").click();
      await expect(root).toHaveAttribute("data-seed", "168");
      await expect(page.locator('[data-setting="source"]')).toHaveValue(
        "glass",
      );
      await control("source", "image");
      await expect(root.locator(".ks-photo")).toBeVisible();
      const fixture = path.join(out, "local-image.png");
      const data = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 240;
        c.height = 160;
        const g = c.getContext("2d");
        g.fillStyle = "#f0c359";
        g.fillRect(0, 0, 240, 160);
        g.fillStyle = "#185978";
        g.fillRect(110, 0, 130, 100);
        g.strokeStyle = "#c24e65";
        g.lineWidth = 12;
        g.beginPath();
        g.arc(60, 80, 45, 0, Math.PI * 2);
        g.stroke();
        return c.toDataURL().split(",")[1];
      });
      await writeFile(fixture, Buffer.from(data, "base64"));
      let choice = page.waitForEvent("filechooser");
      await root.locator(".ks-photo .ks-file").click();
      await (await choice).setFiles(fixture);
      await expect(root).toHaveAttribute("data-photo", "local-image.png");
      await canvas.scrollIntoViewIfNeeded();
      const photo = await hash();
      await control("palette", "ember");
      assert.equal(
        await hash(),
        photo,
        "Palette preserves original photo color",
      );
      const composition = path.join(out, name + "-composition.json");
      await save(root.locator("[data-save]"), composition);
      const doc = JSON.parse(await readFile(composition));
      assert.equal(doc.type, "impossible-kaleidoscope");
      assert.ok(doc.image.startsWith("data:image/jpeg"));
      assert.equal(
        doc.state.strokes.length,
        Number(await root.getAttribute("data-strokes")),
      );
      await root.locator("[data-shuffle]").evaluate((e) => e.click());
      choice = page.waitForEvent("filechooser");
      await root.locator(".ks-save .ks-file").click();
      await (await choice).setFiles(composition);
      await expect(root.locator(".ks-status")).toContainText(
        "Composition restored",
      );
      await expect(root).toHaveAttribute("data-seed", "168");
      await save(
        root.locator("[data-png]"),
        path.join(out, name + "-print.png"),
      );
      const png = await readFile(path.join(out, name + "-print.png"));
      assert.equal(png.readUInt32BE(16), 2048);
      assert.equal(png.readUInt32BE(20), 2048);
      await root.locator("[data-cinema]").click();
      await expect(root.locator(".ks-stage")).toHaveClass(/ks-cinema/);
      const full = await root.locator(".ks-stage").boundingBox();
      assert.ok(
        full.x < 2 && full.y < 2 && full.width >= 1438 && full.height >= 1148,
        "Immersive view covers the viewport",
      );
      assert.equal(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      await page.keyboard.press("Tab");
      await expect(canvas).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(root.locator(".ks-stage")).not.toHaveClass(/ks-cinema/);
      assert.notEqual(
        await page.evaluate(() => document.body.style.overflow),
        "hidden",
      );
      // Paused/hidden previews cannot consume animation time; a resumed view does.
      await control("source", "particles");
      await control("animationSpeed", 1);
      await root.locator("[data-motion]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const moving = Number(await root.getAttribute("data-time"));
      await page.waitForTimeout(200);
      assert.ok(Number(await root.getAttribute("data-time")) > moving);
      await page.locator(".il-demo-toolbar [data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      const stopped = await root.getAttribute("data-time");
      await page.waitForTimeout(200);
      assert.equal(await root.getAttribute("data-time"), stopped);
      await root.locator("[data-motion]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(180);
      const off = await root.getAttribute("data-time");
      await page.waitForTimeout(180);
      assert.equal(await root.getAttribute("data-time"), off);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await canvas.scrollIntoViewIfNeeded();
      // Shared presets and packaged code use the same manifest configuration.
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Optical study");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "Optical study",
      );
      const zip = path.join(out, name + "-source.zip");
      await save(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".ks")).toHaveAttribute("data-ready", "true");
      await single.locator(".ks [data-preset]").selectOption("herbarium");
      await expect(single.locator(".ks")).toHaveAttribute(
        "data-source",
        "lines",
      );
      await single.locator(".ks-optic").scrollIntoViewIfNeeded();
      await single
        .locator(".ks-optic")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/kaleidoscope/embed-demo.html",
      );
      await expect(single.locator("output")).toContainText(
        "10 reflected sectors",
      );
      await single.locator("#mirrors").click();
      await expect(single.locator("output")).toContainText(
        "12 reflected sectors",
      );
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createKaleidoscope } =
          await import("./creative-lab/experiments/kaleidoscope/engine.js");
        const { objectPosition } =
          await import("./creative-lab/experiments/kaleidoscope/model.js");
        const c = document.createElement("canvas"),
          p = document.createElement("canvas");
        c.style.cssText = "width:700px;height:700px;display:block";
        p.width = p.height = 320;
        p.style.cssText = "width:200px;height:200px;display:block";
        document.body.replaceChildren(c, p);
        c.tabIndex = p.tabIndex = 0;
        const e = createKaleidoscope(
          c,
          { mirrors: 16, animationSpeed: 1, rotationSpeed: 2 },
          { sourceCanvas: p },
        );
        c.scrollIntoView();
        await new Promise((r) => setTimeout(r, 100));
        e.setRunning(true);
        await new Promise((r) => setTimeout(r, 1200));
        const perf = e.getState();
        e.setRunning(false);
        const before = e.getState();
        await new Promise((r) => setTimeout(r, 180));
        const after = e.getState();
        if (before.time.source !== after.time.source)
          throw Error("Pause does not stop source clock");
        e.update({
          ...e.getState().config,
          rotationSpeed: 0,
          animationSpeed: 0,
        });
        const st = e.getSourceState(),
          o = st.objects[0],
          v = objectPosition(o, st.time.source, "glass"),
          b = p.getBoundingClientRect();
        const emit = (type, x, y) =>
          p.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              button: 0,
              isPrimary: true,
              pointerId: 9,
              pointerType: "touch",
              clientX: b.x + ((x + 1) * b.width) / 2,
              clientY: b.y + ((y + 1) * b.height) / 2,
            }),
          );
        emit("pointerdown", v.x, v.y);
        emit("pointermove", v.x + 0.12, v.y + 0.1);
        emit("pointerup", v.x + 0.12, v.y + 0.1);
        if (
          e
            .getSourceState()
            .objects.every(
              (o, i) => o.dx === st.objects[i].dx && o.dy === st.objects[i].dy,
            )
        )
          throw Error("Source drag did not move an object");
        const serialized = e.serialize();
        e.rearrange();
        e.restore(serialized);
        if (
          JSON.stringify(e.getSourceState()) !==
          JSON.stringify(serialized.state)
        )
          throw Error("State round trip differs");
        e.setRunning(true);
        await new Promise((r) => setTimeout(r, 100));
        const idle = e.getState().frames;
        await new Promise((r) => setTimeout(r, 120));
        if (idle !== e.getState().frames)
          throw Error("Zero-speed canvas continues rendering");
        const frames = e.getState().frames;
        e.dispose();
        e.dispose();
        await new Promise((r) => setTimeout(r, 100));
        if (e.getState().frames !== frames || c.width !== 1 || p.width !== 1)
          throw Error("Dispose failed");
        const again = createKaleidoscope(
          c,
          { border: "none", mirrors: 16, softness: 0 },
          {
            drawSource(cv) {
              const g = cv.getContext("2d");
              g.fillStyle = "#faf2da";
              g.fillRect(0, 0, cv.width, cv.height);
            },
          },
        );
        const still = again.exportCanvas(512),
          pixels = still.getContext("2d").getImageData(0, 0, 512, 512).data;
        for (let y = 40; y < 472; y++)
          for (let x = 40; x < 472; x++) {
            if (Math.hypot(x - 256, y - 256) > 210) continue;
            const p = (y * 512 + x) * 4;
            if (pixels[p] < 248 || pixels[p + 1] < 240 || pixels[p + 2] < 216)
              throw Error("A mirror seam leaks the dark backdrop");
          }
        again.dispose();
        return { fps: perf.fps, frames: perf.frames, width: perf.width };
      });
      console.log(name, metrics);
      assert.ok(
        metrics.fps >= 25,
        "Interactive frame rate at maximum mirror count",
      );
      await single.close();
      await page.bringToFront();
      for (const w of [320, 390, 768]) {
        await page.setViewportSize({ width: w, height: 844 });
        await expect(page.locator("body")).toBeVisible();
        assert.ok(
          await root.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          `No studio overflow at ${w}`,
        );
      }
      await root.locator("[data-preset]").selectOption("draw");
      await canvas.scrollIntoViewIfNeeded();
      await canvas.evaluate((c) => {
        const r = c.getBoundingClientRect();
        for (const [type, x, y] of [
          ["pointerdown", 0.62, 0.52],
          ["pointermove", 0.78, 0.56],
          ["pointerup", 0.78, 0.56],
        ])
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              button: 0,
              isPrimary: true,
              pointerId: 24,
              pointerType: "touch",
              clientX: r.x + r.width * x,
              clientY: r.y + r.height * y,
            }),
          );
      });
      assert.ok(Number(await root.getAttribute("data-strokes")) > 0);
      assert.equal(
        await root
          .locator(".ks-lower")
          .evaluate(
            (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
          ),
        1,
        "Narrow preview uses one column even at tablet viewport width",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await root.screenshot({ path: path.join(out, name + "-mobile.png") });
      const reduced = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        rp = await reduced.newPage();
      await rp.goto(origin + "/tampa-curated/lab/kaleidoscope/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      await expect(rp.locator(".ks")).toHaveAttribute("data-ready", "true");
      await rp.locator(".ks-optic").scrollIntoViewIfNeeded();
      await rp.waitForTimeout(200);
      const rt = await rp.locator(".ks").getAttribute("data-time");
      await rp.waitForTimeout(200);
      assert.equal(await rp.locator(".ks").getAttribute("data-time"), rt);
      await expect(rp.locator(".ks [data-motion]")).toHaveText(
        "▷ Set it moving",
      );
      await rp.locator(".ks [data-motion]").click();
      await rp.locator(".ks-optic").scrollIntoViewIfNeeded();
      await rp.waitForTimeout(250);
      assert.ok(
        Number(await rp.locator(".ks").getAttribute("data-time")) > Number(rt),
      );
      await reduced.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: six sources, optical controls, drawing/undo, local images, true object movement, touch/resizing, PNG/JSON, presets, pause, reduced motion and standalone disposal passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
