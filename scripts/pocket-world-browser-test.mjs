import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium, webkit, expect } from "@playwright/test";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/polly-pocket-world/",
  out = path.resolve("test-results/pocket-world");
await mkdir(out, { recursive: true });
let rootDir = out;
const server = createServer(async (req, res) => {
  try {
    const p = path.resolve(
      rootDir,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!p.startsWith(rootDir + path.sep)) throw Error();
    await stat(p);
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
      }[path.extname(p)] || "application/octet-stream",
    );
    res.end(await readFile(p));
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
      await expect(page.locator(".pw")).toHaveAttribute("data-ready", "true");
      const root = page.locator(".pw"),
        field = (k) => page.locator(`[data-setting="${k}"]`),
        canvas = page.locator(".pw canvas"),
        snap = async () =>
          createHash("sha256")
            .update(await canvas.evaluate((c) => c.toDataURL()))
            .digest("hex");
      const set = async (k, v) => {
        await field(k).evaluate((el, value) => {
          el.value = String(value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(60);
      };
      const state = async () =>
        JSON.parse(await root.getAttribute("data-actions"));
      await expect(root).toHaveAttribute("data-open", "0.000");
      await expect(page.locator(".pw-card").first()).toBeDisabled();
      await page
        .locator(".pw")
        .screenshot({ path: path.join(out, name + "-closed.png") });
      await page.locator("button[data-open]").click();
      await page.waitForTimeout(450);
      assert.ok(
        +(await root.getAttribute("data-open")) > 0 &&
          +(await root.getAttribute("data-open")) < 100,
        "Real intermediate hinge animation",
      );
      await expect(root).toHaveAttribute("data-open", "100.000", {
        timeout: 7000,
      });
      assert.ok(+(await root.getAttribute("data-lid")) < -2);
      await expect(page.locator(".pw-card").first()).toBeEnabled();
      assert.ok((await page.locator(".pw-number:visible").count()) > 0);
      await set("open", 40);
      const partial = await snap(),
        angle = await root.getAttribute("data-lid");
      await set("open", 80);
      assert.notEqual(await snap(), partial);
      await set("open", 40);
      assert.equal(
        await snap(),
        partial,
        "Identical pixels at a reversed hinge position",
      );
      assert.equal(await root.getAttribute("data-lid"), angle);
      await set("open", 100);
      const worldImages = [];
      for (const world of ["beach", "city", "garden"]) {
        await page.locator("select[data-world]").selectOption(world);
        await set("open", 100);
        await expect(root).toHaveAttribute("data-world", world);
        worldImages.push(await snap());
        await page
          .locator(".pw-stage")
          .screenshot({ path: path.join(out, `${name}-${world}.png`) });
        for (let index = 0; index < 3; index++) {
          const key = ["actionOne", "actionTwo", "actionThree"][index];
          const before = await snap();
          await page.evaluate((index) => {
            window.mechanismSamples = [];
            window.mechanismObserver = new MutationObserver(() =>
              window.mechanismSamples.push(
                JSON.parse(document.querySelector(".pw").dataset.actions)[
                  index
                ],
              ),
            );
            window.mechanismObserver.observe(document.querySelector(".pw"), {
              attributes: true,
              attributeFilter: ["data-actions"],
            });
          }, index);
          await page.locator(".pw-card").nth(index).click();
          await page.waitForTimeout(260);
          const samples = await page.evaluate(() => {
            window.mechanismObserver.disconnect();
            return window.mechanismSamples;
          });
          assert.ok(
            samples.some((v) => v > 0 && v < 100),
            `${world} mechanism ${index} renders intermediate states: ${samples}`,
          );
          await set(key, 37);
          const half = await snap();
          assert.notEqual(
            half,
            before,
            `${world} mechanism ${index}: intermediate geometry differs from its starting pose`,
          );
          await set(key, 90);
          assert.notEqual(await snap(), half);
          await set(key, 37);
          assert.equal(
            await snap(),
            half,
            "Mechanism reverse scrubbing is deterministic",
          );
          await set(key, 0);
        }
      }
      assert.equal(new Set(worldImages).size, 3, "Distinct world geometry");
      await page.locator("select[data-world]").selectOption("beach");
      await set("open", 100);
      const marker = page.locator(".pw-number:visible").first();
      await marker.click();
      await page.waitForTimeout(180);
      assert.ok(
        (await state()).some((v) => v > 0),
        "Projected hotspot operates geometry",
      );
      await set("actionOne", 0);
      await set("actionTwo", 0);
      await set("actionThree", 0);
      const cameraBefore = await root.getAttribute("data-camera");
      await page.locator('[data-zoom="+"]').click();
      assert.notEqual(await root.getAttribute("data-camera"), cameraBefore);
      await page.locator("[data-home]").click();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width * 0.85,
        box.y + box.height * 0.62,
        { steps: 8 },
      );
      await page.mouse.up();
      await page.waitForTimeout(220);
      assert.ok(
        Math.abs(+(await field("rotation").inputValue()) + 18) > 5,
        "Dragging rotates the toy",
      );
      await page.locator(".pw-stage").focus();
      const rotation = +(await field("rotation").inputValue());
      await page.keyboard.press("ArrowRight");
      assert.equal(
        +(await field("rotation").inputValue()),
        Math.min(180, rotation + 8),
      );
      await page.locator("[data-home]").click();
      await field("hotspots").uncheck();
      await expect(page.locator(".pw-number:visible")).toHaveCount(0);
      await expect(page.locator(".pw-card").first()).toBeEnabled();
      await field("hotspots").check();
      const builds = +(await root.getAttribute("data-builds"));
      await field("palette").selectOption("mineral");
      assert.ok(+(await root.getAttribute("data-builds")) > builds);
      const mineral = await snap();
      await field("palette").selectOption("sorbet");
      assert.notEqual(await snap(), mineral);
      await field("palette").selectOption("original");
      const density = +(await root.getAttribute("data-instances"));
      await set("density", 3);
      assert.ok(+(await root.getAttribute("data-instances")) > density);
      await set("density", 2);
      await page.locator("button[data-enter]").click();
      await page.waitForTimeout(250);
      assert.notEqual(await root.getAttribute("data-camera"), cameraBefore);
      await expect(root).toHaveAttribute("data-enter", "true");
      await page.waitForTimeout(1600);
      const inside = await root.getAttribute("data-camera");
      await set("travel", 35);
      assert.notEqual(await root.getAttribute("data-camera"), inside);
      await page
        .locator(".pw-stage")
        .screenshot({ path: path.join(out, name + "-inside.png") });
      await set("open", 50);
      await expect(root).toHaveAttribute("data-enter", "false");
      await expect(field("enter")).not.toBeChecked();
      await set("open", 100);
      await page.locator("[data-home]").click();
      await page.locator("button[data-tour]").click();
      await page.waitForTimeout(400);
      const runningCamera = await snap();
      await page.waitForTimeout(240);
      assert.notEqual(await snap(), runningCamera);
      await page.locator("[data-pause]").click();
      const frames = await root.getAttribute("data-frames");
      await page.waitForTimeout(220);
      assert.equal(
        await root.getAttribute("data-frames"),
        frames,
        "Pause stops tour work",
      );
      await page.locator("button[data-tour]").click();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      const idle = await root.getAttribute("data-frames");
      await page.waitForTimeout(200);
      assert.equal(await root.getAttribute("data-frames"), idle, "No idle RAF");
      // The full-height toy UI must remain reachable in native and fallback fullscreen.
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
        const fits = await page
          .locator("[data-demo]")
          .evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
        assert.ok(
          fits,
          "Fullscreen does not clip the mechanism controls inside a hidden overflow area",
        );
        await page.locator("[data-mechanism-reset]").click();
        await expect(page.locator("[data-mechanism-reset]")).toBeInViewport();
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
      await set("rotation", 24);
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("A pocket afternoon");
      await page.locator("[data-save]").click();
      const exported = page.waitForEvent("download");
      await page.locator("[data-export-preset]").click();
      const json = path.join(out, name + "-preset.json");
      await (await exported).saveAs(json);
      await page.locator("[data-reset]").click();
      await page.locator("[data-import]").setInputFiles(json);
      await expect
        .poll(async () => +(await field("rotation").inputValue()))
        .toBe(24);
      await page.reload();
      await page.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-ready", "true");
      assert.equal(+(await field("rotation").inputValue()), 24);
      const source = page.waitForEvent("download");
      await page.locator("[data-export-source]").click();
      const zip = path.join(out, name + "-source.zip");
      await (await source).saveAs(zip);
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
      await expect(portable.locator(".pw")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator("button[data-open]").click();
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator("canvas")).toHaveCount(0);
      await portable.goto(
        host + "/creative-lab/experiments/polly-pocket-world/embed-demo.html",
      );
      await portable.waitForFunction(() => !!window.pocketExample);
      const custom = await portable.evaluate(() => {
        const v = window.pocketExample.viewer;
        const before = v.getState();
        v.update({ actionOne: 70, rotation: 35 });
        v.render();
        const toy = v.getToy(),
          first = toy.mechanisms.get("box").target.rotation.x;
        v.update({ actionOne: 0 });
        v.render();
        v.update({ actionOne: 70 });
        v.render();
        return {
          world: before.world,
          first,
          reverse: toy.mechanisms.get("box").target.rotation.x,
          instances: before.counts.instances,
          drawCalls: v.getState().drawCalls,
        };
      });
      assert.equal(custom.world, "workshop");
      assert.ok(custom.instances > 40 && custom.drawCalls < 250);
      assert.equal(custom.first, custom.reverse);
      assert.ok(custom.first < -0.5);
      await writeFile(
        path.join(out, name + "-portable-proof.json"),
        JSON.stringify(custom, null, 2),
      );
      await portable.locator("#dispose").click();
      assert.ok(
        await portable.evaluate(
          () => window.pocketExample.viewer.getState().disposed,
        ),
      );
      await portable.close();
      await page.evaluate(() => {
        const gl = document.querySelector(".pw canvas").getContext("webgl2");
        window.contextTest = gl.getExtension("WEBGL_lose_context");
        window.contextTest.loseContext();
      });
      await expect(root).toHaveAttribute("data-ready", "fallback");
      await page.waitForTimeout(300);
      await page.evaluate(() => window.contextTest.restoreContext());
      await expect(root).toHaveAttribute("data-ready", "true");
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      await expect(page.locator(".pw")).toHaveCount(0);
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      mobile.on("pageerror", (e) => errors.push(e.message));
      await mobile.goto(url);
      await mobile.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(mobile.locator(".pw")).toHaveAttribute("data-ready", "true");
      await mobile.locator('[data-setting="open"]').evaluate((el) => {
        el.value = 100;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await mobile
        .locator(".pw")
        .screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mobile.setViewportSize({ width, height: 900 });
        assert.ok(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Mobile overflow",
        );
      }
      assert.equal(
        await mobile
          .locator(".pw-stage")
          .evaluate((el) => getComputedStyle(el).touchAction),
        "pan-y",
      );
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
      await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(reduced.locator("[data-lab-host]")).toHaveAttribute(
        "data-running",
        "false",
      );
      await reduced.locator("button[data-open]").click();
      await expect(reduced.locator(".pw")).toHaveAttribute(
        "data-open",
        "100.000",
      );
      await reduced.locator(".pw-card").first().click();
      assert.equal(
        JSON.parse(
          await reduced.locator(".pw").getAttribute("data-actions"),
        )[0],
        100,
      );
      await reduced.close();
      const fallback = await browser.newPage();
      await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === "webgl2" ? null : original.call(this, type, ...args);
        };
      });
      await fallback.goto(url);
      await fallback.locator("[data-demo]").scrollIntoViewIfNeeded();
      await expect(fallback.locator(".pw")).toHaveAttribute(
        "data-ready",
        "fallback",
      );
      await expect(fallback.locator("[data-static]")).toBeVisible();
      await expect(fallback.locator(".pw-card").first()).toBeDisabled();
      await fallback.close();
      const nojs = await browser.newPage({ javaScriptEnabled: false });
      await nojs.goto(url);
      await expect(nojs.locator("[data-still]")).toBeVisible();
      await nojs.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: three worlds, nine moving mechanisms, reversible hinge, occluded hotspots, drag/zoom, entry/tour/pause, presets, custom standalone source, mobile, reduced motion, fallback and context cleanup passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  // Keep screenshots and ZIP evidence, but do not leave duplicate runtime sources
  // inside Astro's broad TypeScript include glob after standalone verification.
  await Promise.all(
    ["chromium", "webkit"].map((name) =>
      rm(path.join(out, name + "-standalone"), {
        recursive: true,
        force: true,
      }),
    ),
  );
}
