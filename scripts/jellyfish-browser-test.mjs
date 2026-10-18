import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/jellyfish-tank"),
  temp = await mkdtemp("/tmp/jellyfish-tank-");
await mkdir(out, { recursive: true });
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Jellyfish probe</title><body></body></html>",
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
        .locator('a[href="/tampa-curated/lab/jellyfish-tank/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".jt"),
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
      await root.locator('[data-mode="ambient"]').click();
      await canvas.scrollIntoViewIfNeeded();
      let before = await capture(),
        box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
      assert.equal(await capture(), before, "Ambient mode ignores the pointer");
      await root.locator('[data-mode="light"]').click();
      await canvas.scrollIntoViewIfNeeded();
      box = await canvas.boundingBox();
      before = await capture();
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
      await expect(root).toHaveAttribute("data-contact", "1");
      assert.notEqual(
        await capture(),
        before,
        "Inspection light moves while paused",
      );
      await expect(root).toHaveAttribute("data-clock", clock);
      await canvas.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-contact", "1");
      await page.keyboard.press("Escape");
      await expect(root).toHaveAttribute("data-contact", "0");
      await root.locator("[data-disturb]").click();
      await expect(root).toHaveAttribute("data-mode", "disturb");
      await expect(root).toHaveAttribute("data-wakes", "1");
      await expect(root).toHaveAttribute("data-clock", clock);
      for (const [key, value] of [
        ["count", 10],
        ["minSize", 0.8],
        ["maxSize", 1.6],
        ["tentacleLength", 1.4],
        ["palette", "orchid"],
        ["species", "lantern"],
        ["view", "open"],
        ["quality", "economy"],
        ["glow", 1.8],
        ["particles", 220],
        ["darkness", 0.65],
        ["lightColor", "#efb1cd"],
        ["zoom", 1.3],
      ]) {
        before = await capture();
        await control(key, value);
        assert.ok((await capture()) !== before, key + " affects rendering");
      }
      await expect(root).toHaveAttribute("data-count", "10");
      await control("minSize", 1.4);
      await control("maxSize", 0.4);
      await expect(root.locator('[data-control="maxSize"]')).toHaveValue("1.4");
      for (const preset of [
        "midnight",
        "orchid",
        "moon",
        "reef",
        "graphite",
        "quiet",
      ]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(
          root.locator("[data-mode][aria-pressed=true]"),
        ).toHaveCount(1);
        if (["orchid", "moon", "graphite"].includes(preset)) {
          await canvas.scrollIntoViewIfNeeded();
          await canvas.screenshot({
            path: path.join(out, name + "-" + preset + ".png"),
          });
        }
      }
      await root.locator("[data-preset]").selectOption("midnight");
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-mode", "disturb");
      box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.23, box.y + box.height * 0.3);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width * 0.45,
        box.y + box.height * 0.32,
        { steps: 16 },
      );
      await expect
        .poll(async () => Number(await root.getAttribute("data-currents")))
        .toBeGreaterThan(0);
      await page.mouse.up();
      await root.locator("[data-reset]").click();
      await page.locator('[data-setting="count"]').evaluate((e) => {
        e.value = "10";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await expect(root.locator('[data-control="count"]')).toHaveValue("10");
      await expect(root).toHaveAttribute("data-count", "10");
      await control("count", 12);
      await expect(page.locator('[data-setting="count"]')).toHaveValue("12");
      await root.locator("[data-fullscreen]").click();
      await expect(root.locator("dialog")).toBeVisible();
      assert.ok(
        await root.locator(".jt-stage").evaluate((e) => {
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
      await page.locator("[data-preset-name]").fill("Quiet aquarium");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "Quiet aquarium",
      );
      await control("count", 12);
      await page.locator("[data-saved]").selectOption("0");
      await expect(root.locator('[data-control="count"]')).toHaveValue("12");
      const zip = path.join(out, name + "-source.zip");
      await download(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".jt")).toHaveAttribute("data-ready", "true");

      await single.locator(".jt-canvas").scrollIntoViewIfNeeded();
      await single
        .locator(".jt-canvas")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/jellyfish-tank/embed-demo.html",
      );
      await expect(single.locator("canvas")).toHaveCount(3);
      await single.locator("#motion").click();
      await expect(single.locator("#motion")).toHaveText("Resume all");
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createJellyfishTank } =
          await import("./creative-lab/experiments/jellyfish-tank/engine.js");
        const c = document.createElement("canvas");
        c.tabIndex = 0;
        c.style.cssText = "width:800px;height:800px;display:block";
        document.body.append(c);
        const toy = createJellyfishTank(c);
        await new Promise((r) => setTimeout(r, 100));
        const water = c
          .getContext("2d")
          .getImageData(
            Math.round(c.width * 0.5),
            Math.round(c.height * 0.16),
            1,
            1,
          ).data;
        if (
          water[2] < 100 ||
          water[2] < water[0] * 2 ||
          water[2] < water[1] * 1.35
        )
          throw Error("Default aquarium lost its blue backlight");
        const { drawMembrane } =
          await import("./creative-lab/experiments/jellyfish-tank/membrane.js");
        const { PALETTES } =
          await import("./creative-lab/experiments/jellyfish-tank/model.js");
        const membrane = document.createElement("canvas"),
          subject = { ...toy.field.jellies[0], tilt: 0.05 };
        membrane.width = membrane.height = 1024;
        const ink = membrane.getContext("2d");
        const renderBell = () => {
          ink.resetTransform();
          ink.clearRect(0, 0, 1024, 1024);
          ink.translate(512, 512);
          ink.scale(380, 380);
          drawMembrane(ink, subject, PALETTES.abyss, PALETTES.abyss.colors[0]);
          return membrane.toDataURL();
        };
        const sideImage = renderBell(),
          pixels = ink.getImageData(0, 0, 1024, 1024).data;
        let clear = 0,
          transparentTissue = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (!pixels[i]) clear++;
          if (pixels[i] > 10 && pixels[i] < 230) transparentTissue++;
        }
        if (clear < pixels.length * 0.05 || transparentTissue < 200)
          throw Error(
            "Membrane must retain clear water and translucent tissue",
          );
        subject.tilt = 1.2;
        if (sideImage === renderBell())
          throw Error("Bell projection does not respond to viewing angle");
        const initial = toy.field.jellies.map((j) => ({
          y: j.y,
          phase: j.phase,
          tilt: j.tilt,
          tip: j.chains[0].points.at(-2),
        }));
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 1500));
        const normal = toy.getState();
        if (
          !toy.field.jellies.some(
            (j, i) =>
              Math.abs(j.y - initial[i].y) > 0.001 &&
              j.phase !== initial[i].phase &&
              j.tilt !== initial[i].tilt &&
              Math.abs(j.chains[0].points.at(-2) - initial[i].tip) > 0.0001,
          )
        )
          throw Error("No bell-driven motion and trailing deformation");
        toy.update({ ...normal.config, mode: "light" });
        const j = toy.field.jellies[0];
        toy.point(j.x / toy.field.aspect, j.y, true);
        await new Promise((r) => setTimeout(r, 350));
        const affected = toy.field.jellies.filter((j) => j.response > 0).length;
        if (affected < 1 || affected >= normal.count)
          throw Error("Light reaction not local");
        toy.update({ ...normal.config, count: 16, quality: "fine" });
        await new Promise((r) => setTimeout(r, 1400));
        const dense = toy.getState();
        toy.update({ ...normal.config, count: 16, quality: "economy" });
        await new Promise((r) => setTimeout(r, 1400));
        const economy = toy.getState();
        toy.setRunning(false);
        const paused = toy.getState(),
          pose = JSON.stringify(
            toy.field.jellies.map((j) => [j.x, j.y, ...j.chains[0].points]),
          );
        await new Promise((r) => setTimeout(r, 160));
        if (
          toy.getState().time !== paused.time ||
          JSON.stringify(
            toy.field.jellies.map((j) => [j.x, j.y, ...j.chains[0].points]),
          ) !== pose
        )
          throw Error("Pause changed pose");
        toy.update({ ...normal.config, mode: "light" });
        const img = c.toDataURL();
        toy.point(0.25, 0.6, true);
        if (c.toDataURL() === img) throw Error("Paused light unresponsive");
        toy.update({ ...normal.config, mode: "disturb" });
        toy.disturb();
        if (!toy.getState().wakes) throw Error("No wake");
        const frames = toy.getState().frames;
        toy.dispose();
        toy.dispose();
        await new Promise((r) => setTimeout(r, 100));
        if (
          toy.getState().frames !== frames ||
          c.width !== 1 ||
          toy.field.jellies.length
        )
          throw Error("Cleanup failed");
        return {
          fps: normal.fps,
          fineFps: dense.fps,
          economyFps: economy.fps,
          affected,
          filaments: dense.filaments,
        };
      });
      assert.ok(metrics.fps >= 30, JSON.stringify(metrics));
      assert.ok(metrics.fineFps >= 20, JSON.stringify(metrics));
      assert.ok(metrics.economyFps >= 30, JSON.stringify(metrics));
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
      const retina = await browser.newContext({
        viewport: { width: 1200, height: 900 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
      });
      const large = await retina.newPage();
      large.on("pageerror", (e) => errors.push(e.message));
      await large.goto(origin + "/tampa-curated/lab/jellyfish-tank/");
      await large.locator("[data-mount]").scrollIntoViewIfNeeded();
      await expect(large.locator(".jt")).toHaveAttribute("data-ready", "true");
      await large.locator('[data-control="zoom"]').evaluate((e) => {
        e.value = "1.6";
        e.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await large.locator(".jt [data-fullscreen]").click();
      await expect
        .poll(() =>
          large
            .locator(".jt-canvas")
            .evaluate(
              (c) =>
                c.width >= c.clientWidth * 1.99 &&
                c.height >= c.clientHeight * 1.99 &&
                Math.abs(c.width / c.height - c.clientWidth / c.clientHeight) <
                  0.002,
            ),
        )
        .toBe(true);
      await large
        .locator(".jt-canvas")
        .screenshot({ path: path.join(out, name + "-smooth-retina.png") });
      await retina.close();
      const reduced = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        rp = await reduced.newPage();
      rp.on("pageerror", (e) => errors.push(e.message));
      await rp.goto(origin + "/tampa-curated/lab/jellyfish-tank/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const rr = rp.locator(".jt"),
        rc = rr.locator("canvas");
      await expect(rr).toHaveAttribute("data-ready", "true");
      await rc.scrollIntoViewIfNeeded();
      clock = await rr.getAttribute("data-clock");
      await rp.waitForTimeout(180);
      assert.equal(await rr.getAttribute("data-clock"), clock);
      await rr.locator('[data-mode="light"]').tap();
      await expect(rr).toHaveAttribute("data-mode", "light");
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
      await noJS.goto(origin + "/tampa-curated/lab/jellyfish-tank/");
      assert.ok(
        await noJS
          .locator('img[src*="jellyfish-tank"]')
          .first()
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      );
      await plain.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: bell-driven motion, delayed tentacles, local light/wake, presets, quality, fullscreen, touch, reduced motion, source export, PNG and cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
