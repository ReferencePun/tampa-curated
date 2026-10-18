import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect as baseExpect } from "@playwright/test";
import { bundle } from "./lab-package.mjs";
const expect = baseExpect.configure({ timeout: 20000 }),
  origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/hall-of-mirrors/",
  out = "test-results/hall-of-mirrors";
await mkdir(out, { recursive: true });
const { files } = await bundle("hall-of-mirrors"),
  types = {
    ".js": "text/javascript",
    ".html": "text/html",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
  };
const server = createServer((req, res) => {
  const key = decodeURIComponent(
    new URL(req.url, "http://local").pathname,
  ).slice(1);
  if (!files[key]) {
    res.statusCode = 404;
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    types[path.extname(key)] || "application/octet-stream",
  );
  res.end(files[key]);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const portable = `http://127.0.0.1:${server.address().port}`,
  folder = "/creative-lab/experiments/hall-of-mirrors";
const range = (locator, value) =>
  locator.evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
const browsers = [];
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await engine.launch();
    browsers.push(browser);
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
        acceptDownloads: true,
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(page.locator(".hm")).toHaveAttribute("data-ready", "true");
    await expect(page.locator("canvas")).toHaveCount(1);
    const seek = async (p) => {
        await range(page.locator("input[data-journey]"), p);
        await page.waitForTimeout(170);
      },
      settings = async () =>
        JSON.parse(
          await page.locator("[data-lab-host]").getAttribute("data-settings"),
        );
    await page.locator('[data-setting="quality"]').selectOption("medium");
    for (const version of ["parallel", "maze", "gallery"]) {
      const oldBuild = +(await page.locator(".hm").getAttribute("data-builds"));
      await page.locator("select[data-version]").selectOption(version);
      if (version !== "parallel")
        await expect
          .poll(
            async () =>
              +(await page.locator(".hm").getAttribute("data-builds")),
          )
          .toBeGreaterThan(oldBuild);
      await page.locator('[data-setting="quality"]').selectOption("medium");
      await seek(36);
      const first = await page.locator(".hm").getAttribute("data-camera"),
        firstImage = await page
          .locator("canvas")
          .evaluate((e) => e.toDataURL());
      await seek(68);
      assert.notEqual(
        await page.locator(".hm").getAttribute("data-camera"),
        first,
      );
      await seek(36);
      assert.equal(
        await page.locator(".hm").getAttribute("data-camera"),
        first,
        version + " reverse camera equality",
      );
      assert.equal(
        await page.locator("canvas").evaluate((e) => e.toDataURL()),
        firstImage,
        version + " reverse rendered image equality",
      );
      assert.ok(+(await page.locator(".hm").getAttribute("data-passes")) <= 12);
      assert.ok(+(await page.locator(".hm").getAttribute("data-depth")) <= 3);
      await page
        .locator(".hm-viewport")
        .screenshot({ path: `${out}/${name}-${version}.png` });
      if (version === "gallery") {
        await expect(page.locator(".hm-portal-note")).toBeVisible();
        await expect(page.locator(".hm-portal-note")).toContainText(
          "not a mirror",
        );
        await seek(96);
        await expect(page.locator(".hm")).toHaveAttribute(
          "data-chamber",
          "invented",
        );
        await page
          .locator(".hm-viewport")
          .screenshot({ path: `${out}/${name}-portal-chamber.png` });
        await seek(15);
        await expect(page.locator(".hm")).toHaveAttribute(
          "data-chamber",
          "hall",
        );
      }
    }
    await page.locator("select[data-version]").selectOption("parallel");
    await page.locator('[data-setting="quality"]').selectOption("medium");
    await seek(45);
    const still = await page.locator("canvas").evaluate((e) => e.toDataURL());
    await range(page.locator('[data-setting="position"]'), 0.7);
    await page.waitForTimeout(180);
    assert.notEqual(
      await page.locator("canvas").evaluate((e) => e.toDataURL()),
      still,
      "Changing camera position changes reflection pixels",
    );
    await range(page.locator('[data-setting="depth"]'), 0);
    await expect(page.locator(".hm")).toHaveAttribute("data-passes", "0");
    await range(page.locator('[data-setting="depth"]'), 4);
    assert.ok(+(await page.locator(".hm").getAttribute("data-passes")) <= 12);
    await page.locator('[data-setting="quality"]').selectOption("low");
    await expect(page.locator(".hm")).toHaveAttribute("data-resolution", "256");
    assert.ok(
      +(await page.locator(".hm").getAttribute("data-depth")) <= 1,
      "Low quality is a nonrecursive reflection",
    );
    await page.locator('[data-setting="quality"]').selectOption("high");
    await expect(page.locator(".hm")).toHaveAttribute("data-resolution", "768");
    await page.locator('[data-setting="guides"]').uncheck();
    const guidesOff = await page
      .locator("canvas")
      .evaluate((e) => e.toDataURL());
    await page.locator('[data-setting="guides"]').check();
    assert.notEqual(
      await page.locator("canvas").evaluate((e) => e.toDataURL()),
      guidesOff,
    );
    await page.locator("button[data-inspect]").click();
    const rotation = await page.locator(".hm").getAttribute("data-quaternion");
    const bounds = await page.locator(".hm-viewport").boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.8,
      bounds.y + bounds.height * 0.3,
    );
    await expect
      .poll(() => page.locator(".hm").getAttribute("data-quaternion"))
      .not.toBe(rotation);
    await page.locator("button[data-inspect]").click();
    await page.waitForTimeout(200);
    const frames = await page.locator(".hm").getAttribute("data-frames");
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(".hm").getAttribute("data-frames"),
      frames,
      "Settled view stops rendering",
    );
    await seek(0);
    await page.locator(".hm-scroll").scrollIntoViewIfNeeded();
    const b = await page.locator(".hm-scroll").boundingBox();
    await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5);
    await page.mouse.wheel(0, 400);
    await expect
      .poll(
        async () => +(await page.locator(".hm").getAttribute("data-progress")),
      )
      .toBeGreaterThan(0);
    const forward = +(await page.locator(".hm").getAttribute("data-progress"));
    await page.mouse.wheel(0, -200);
    await expect
      .poll(
        async () => +(await page.locator(".hm").getAttribute("data-progress")),
      )
      .toBeLessThan(forward);
    await page.locator(".hm-scroll").focus();
    const beforeScroll = await page
      .locator(".hm-scroll")
      .evaluate((e) => e.scrollTop);
    await page.keyboard.press("PageDown");
    await expect
      .poll(() => page.locator(".hm-scroll").evaluate((e) => e.scrollTop))
      .toBeGreaterThan(beforeScroll);
    await page.locator("[data-play]").click();
    await expect(page.locator("[data-play]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("[data-pause]").click();
    await expect(page.locator("[data-play]")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator("[data-pause]").click();
    await page.locator(".il-presets summary").click();
    await page.locator("[data-preset-name]").fill("Mirror proof");
    await page.locator("[data-save]").click();
    await page.locator("[data-reset]").click();
    await page.locator("[data-saved]").selectOption("0");
    assert.equal((await settings()).position, 0.7);
    const exportedWait = page.waitForEvent("download");
    await page.locator("[data-export-preset]").click();
    const exported = await exportedWait;
    await exported.saveAs(`${out}/${name}-preset.json`);
    const preset = JSON.parse(
      await readFile(`${out}/${name}-preset.json`, "utf8"),
    );
    assert.equal(preset.experiment, "hall-of-mirrors");
    await page.locator("[data-reset]").click();
    await page
      .locator("[data-import]")
      .setInputFiles(`${out}/${name}-preset.json`);
    await expect.poll(async () => (await settings()).position).toBe(0.7);
    const sourceWait = page.waitForEvent("download");
    await page.locator("[data-export-source]").click();
    const source = await sourceWait;
    await source.saveAs(`${out}/${name}-source.zip`);
    assert.ok((await readFile(`${out}/${name}-source.zip`)).length > 500000);
    await page.reload();
    await page.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(page.locator(".hm")).toHaveAttribute("data-ready", "true");
    assert.equal((await settings()).position, 0.7);
    // Exercise graphics context recovery on engines exposing the extension.
    const loss = await page.locator("canvas").evaluate((c) => {
      const gl = c.getContext("webgl2"),
        extension = gl?.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      window.testContextExtension = extension;
      extension.loseContext();
      return true;
    });
    if (loss) {
      await expect(page.locator(".hm")).toHaveAttribute(
        "data-ready",
        "fallback",
      );
      await page.waitForTimeout(350);
      await page.evaluate(() => window.testContextExtension.restoreContext());
      await expect(page.locator(".hm")).toHaveAttribute("data-ready", "true");
    }
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(page.locator(".hm")).toHaveCount(0);
    console.log(
      name +
        ": main scene, presets, reverse images and graphics lifecycle passed",
    );
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    phone.on("pageerror", (e) => errors.push(e.message));
    await phone.goto(url);
    await phone.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(phone.locator(".hm")).toHaveAttribute("data-ready", "true");
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.equal(
      await phone
        .locator(".hm-scroll")
        .evaluate((e) => getComputedStyle(e).touchAction),
      "pan-y",
    );
    await range(phone.locator("input[data-journey]"), 44);
    await phone
      .locator(".hm")
      .screenshot({ path: `${out}/${name}-mobile.png` });
    await phone.setViewportSize({ width: 320, height: 844 });
    await phone.evaluate(
      () => (document.documentElement.style.fontSize = "32px"),
    );
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await phone.close();
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(url);
    await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(reduced.locator("[data-lab-host]")).toHaveAttribute(
      "data-running",
      "false",
    );
    await range(reduced.locator("input[data-journey]"), 57);
    await expect
      .poll(
        async () =>
          +(await reduced.locator(".hm").getAttribute("data-progress")),
      )
      .toBeGreaterThan(56);
    await reduced.close();
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (kind === "webgl2") return null;
        return get.call(this, kind, ...args);
      };
    });
    await fallback.goto(url);
    await fallback.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(fallback.locator(".hm")).toHaveAttribute(
      "data-ready",
      "fallback",
    );
    await expect(fallback.locator(".hm-plate")).toBeVisible();
    await fallback.close();
    const plain = await browser.newPage({ javaScriptEnabled: false });
    await plain.goto(url);
    await expect(plain.locator("[data-still]")).toBeVisible();
    await plain.close();
    const standalone = await browser.newPage({
      viewport: { width: 1200, height: 1000 },
    });
    standalone.on("pageerror", (e) => errors.push(e.message));
    await standalone.goto(portable + "/example.html");
    await standalone.locator(".impossible-effect").scrollIntoViewIfNeeded();
    await expect(standalone.locator(".hm")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await range(standalone.locator("input[data-journey]"), 42);
    await standalone.locator("#pause").click();
    await expect(standalone.locator("#pause")).toHaveText("Resume");
    await standalone.evaluate(() =>
      window.dispatchEvent(new Event("pagehide")),
    );
    await expect(standalone.locator(".hm")).toHaveCount(0);
    await standalone.goto(portable + folder + "/embed-demo.html");
    await expect(standalone.locator("#status")).toContainText("bounded");
    const proof = await standalone.evaluate(() => {
      const d = window.mirrorExample,
        read = () => {
          const t = d.system.getReflectionTarget("left");
          if (!t) throw new Error("Missing live reflection target");
          const pixels = new Uint8Array(t.width * t.height * 4);
          d.renderer.readRenderTargetPixels(t, 0, 0, t.width, t.height, pixels);
          return pixels;
        },
        changed = (a, b) => a.reduce((n, x, i) => n + (x !== b[i] ? 1 : 0), 0);
      d.system.update({ depth: 4 });
      const initial = d.render(),
        a = read();
      let red = 0;
      for (let i = 0; i < a.length; i += 4)
        if (a[i] > a[i + 1] * 1.8 && a[i] > a[i + 2] * 1.5 && a[i] > 25) red++;
      d.box.position.x = 1;
      d.box.rotation.y = 0.6;
      d.render();
      const b = read();
      d.camera.position.x = 1.1;
      d.camera.lookAt(0, 1.6, -3);
      const moved = d.render(),
        c = read();
      const left = moved.views.find((v) => v.id === "left" && v.level === 1);
      d.render();
      const repeat = read();
      d.system.update({ depth: 1 });
      const simple = d.render();
      d.system.update({ depth: 0 });
      const empty = d.render();
      d.camera.position.set(0, 2, -3);
      d.camera.lookAt(-3, 2, -3);
      d.system.update({ depth: 4 });
      const facing = d.render();
      return {
        facing,
        initial,
        moved,
        red,
        objectDifference: changed(a, b),
        cameraDifference: changed(b, c),
        repeatDifference: changed(c, repeat),
        left,
        simple,
        empty,
      };
    });
    assert.ok(
      proof.red > 10,
      "Real colored scene geometry appears inside the reflection",
    );
    assert.ok(
      proof.objectDifference > 40,
      "Moving scene geometry changes the reflection pixels",
    );
    assert.ok(
      proof.cameraDifference > 40,
      "Moving viewpoint changes the reflection pixels",
    );
    assert.equal(
      proof.repeatDifference,
      0,
      "Repeated fixed camera renders are deterministic",
    );
    assert.ok(
      Math.abs(proof.left.position[0] + 7.1) < 1e-6,
      "Camera reflects precisely across x=-3",
    );
    assert.ok(
      proof.initial.passes <= 8 &&
        proof.initial.depth >= 2 &&
        proof.initial.depth <= 4,
    );
    assert.equal(
      proof.facing.depth,
      4,
      "Facing mirrors reach the requested bounded depth",
    );
    assert.ok(proof.facing.passes <= 8);
    assert.equal(proof.simple.depth, 1);
    assert.equal(proof.empty.passes, 0);
    await writeFile(
      `${out}/${name}-reflection-proof.json`,
      JSON.stringify(proof, null, 2),
    );
    await standalone.locator("#dispose").click();
    assert.equal(
      await standalone.evaluate(
        () => window.mirrorExample.system.getState().targets,
      ),
      0,
    );
    await standalone.close();
    assert.deepEqual(errors, []);
    await page.close();
    await browser.close();
    console.log(
      `${name}: actual reflection-pixel changes, bounded recursion, camera math, native scroll, presets, mobile, reduced motion, fallback, standalone export, context recovery and cleanup passed.`,
    );
  }
} finally {
  for (const browser of browsers) await browser.close();
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
