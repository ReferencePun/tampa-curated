import assert from "node:assert/strict";
import { mkdir, readFile, rm, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const url =
    (process.env.TEST_ORIGIN || "http://127.0.0.1:4321") +
    "/tampa-curated/lab/view-master/",
  out = path.resolve("test-results/reel-viewer");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/reel-viewer-");
let rootDir = temp;
const server = createServer(async (req, res) => {
  try {
    const file = path.resolve(
      rootDir,
      "." + decodeURIComponent(new URL(req.url, "http://test").pathname),
    );
    if (!file.startsWith(rootDir + path.sep)) throw Error();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
        ".jpg": "image/jpeg",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
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
          viewport: { width: 1440, height: 1100 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      context.setDefaultTimeout(15000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".rv");
      await expect(root).toHaveAttribute("data-ready", "true");
      const set = async (k, v) => {
        await page.locator(`[data-setting="${k}"]`).evaluate((e, v) => {
          if (e.type === "checkbox") e.checked = v;
          else e.value = String(v);
          e.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
        await page.waitForTimeout(60);
      };
      const snap = async (side = "left") =>
        root.locator(`[data-eye="${side}"]`).evaluate((c) => c.toDataURL());
      const save = async (loc, file) => {
        const d = page.waitForEvent("download");
        await loc.click();
        await (await d).saveAs(file);
      };
      assert.equal(await root.getAttribute("data-audio"), "uncreated");
      await set("transition", "instant");
      await root.locator("[data-eye=left]").scrollIntoViewIfNeeded();
      const first = await snap();
      assert.equal(first, await snap("right"));
      await root.locator(".rv-lever").click();
      await expect(root).toHaveAttribute("data-scene", "1");
      assert.notEqual(await snap(), first);
      await root.locator("[data-prev]").click();
      await expect(root).toHaveAttribute("data-scene", "0");
      await root.locator("[data-prev]").click();
      await expect(root).toHaveAttribute("data-scene", "5");
      await root.locator("[data-insert]").click();
      await expect(root).toHaveAttribute("data-inserted", "false");
      await expect(root.locator(".rv-lever")).toBeDisabled();
      assert.notEqual(await snap(), first);
      await root.locator("[data-insert]").click();
      await root.locator("[data-mode=stereo]").click();
      await set("depth", 0.8);
      assert.notEqual(await snap(), await snap("right"));
      await set("depth", 0);
      assert.equal(await snap(), await snap("right"));
      await set("depth", 0.55);
      await root.locator("[data-mode=exploded]").click();
      await expect(root.locator("[data-inspect]")).toBeVisible();
      await expect(root.locator(".rv-frame")).toHaveCount(12);
      await root.locator('.rv-frame[data-index="2"]').first().click();
      await expect(root).toHaveAttribute("data-scene", "2");
      await root.screenshot({ path: path.join(out, name + "-reel.png") });
      await root.locator("[data-return]").click();
      await root.locator(".rv-stage").focus();
      await page.keyboard.press("ArrowRight");
      await expect(root).toHaveAttribute("data-scene", "3");
      await root.locator("[data-reel=miniatures]").click();
      await expect(root).toHaveAttribute("data-scene", "0");
      const worlds = new Set();
      for (let i = 0; i < 6; i++) {
        await root.locator(".rv-slide").nth(i).click();
        worlds.add(await snap());
      }
      assert.equal(worlds.size, 6);
      await root.locator(".rv-slide").first().click();
      const originalTitle = await root.locator("[data-title]").textContent();
      await root.locator("[data-later]").click();
      await expect(root).toHaveAttribute("data-reel", "custom");
      await expect(root).toHaveAttribute("data-scene", "1");
      assert.equal(
        await root.locator("[data-title]").textContent(),
        originalTitle,
      );
      const reelFile = path.join(out, name + "-reel.json");
      await save(root.locator("[data-save]"), reelFile);
      const data = JSON.parse(await readFile(reelFile, "utf8"));
      assert.equal(data.scenes[1].title, originalTitle);
      await root.locator("[data-reel=atlas]").click();
      await root.locator("[data-import]").setInputFiles(reelFile);
      await expect(root).toHaveAttribute("data-reel", "custom");
      console.log(
        name +
          ": navigation, real scene changes, stereo, reel inspection and order",
      );
      await root.locator("[data-reel=photos]").click();
      await root.locator("[data-eye=left]").scrollIntoViewIfNeeded();
      await expect(root.locator("[data-eye=left]")).toHaveAttribute(
        "data-image-ready",
        "true",
      );
      await root.locator("[data-mode=stereo]").click();
      assert.equal(await snap(), await snap("right"));
      await root
        .locator("[data-photos]")
        .setInputFiles([
          "src/creative-lab/experiments/view-master/assets/palms.jpg",
          "src/creative-lab/experiments/view-master/assets/facade.jpg",
        ]);
      await expect(root).toHaveAttribute("data-reel", "custom");
      await expect(root).toHaveAttribute("data-count", "2");
      await expect(root.locator("[data-eye=left]")).toHaveAttribute(
        "data-image-ready",
        "true",
      );
      const privateFile = path.join(out, name + "-private.json");
      await save(root.locator("[data-save]"), privateFile);
      const privateReel = JSON.parse(await readFile(privateFile, "utf8"));
      assert.ok(
        privateReel.scenes.every((s) =>
          s.src.startsWith("data:image/jpeg;base64,"),
        ),
      );
      await root.locator("[data-reel=atlas]").click();
      await root.locator("[data-import]").setInputFiles(privateFile);
      await expect(root).toHaveAttribute("data-count", "2");
      await root.locator("[data-import]").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            version: 1,
            scenes: [
              { kind: "photo", src: "https://invalid.example/tracker.jpg" },
            ],
          }),
        ),
      });
      await expect(root.locator(".rv-status")).toContainText("embedded PNG");
      await expect(root).toHaveAttribute("data-count", "2");
      await root.locator("[data-sound]").click();
      await expect(root).toHaveAttribute("data-audio", "running");
      await root.locator("[data-sound]").click();
      await expect(root.locator("[data-sound]")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      for (const preset of ["classic", "stereo", "archive"]) {
        await root.locator("[data-preset]").selectOption(preset);
        await expect(root).toHaveAttribute("data-ready", "true");
      }
      await root.locator("[data-preset]").selectOption("classic");
      await set("transition", "instant");
      await set("interval", 2);
      await root.locator("[data-play]").click();
      await expect
        .poll(() => root.getAttribute("data-scene"), { timeout: 6000 })
        .not.toBe("0");
      await page.locator("[data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const frozen = await root.getAttribute("data-scene");
      await page.waitForTimeout(2200);
      assert.equal(await root.getAttribute("data-scene"), frozen);
      await page.locator("[data-pause]").click();
      await set("autoplay", false);
      await set("palette", "seafoam");
      await set("zoom", 1.15);
      const settingsFile = path.join(out, name + "-settings.json");
      await save(root.locator("[data-settings]"), settingsFile);
      await set("palette", "cream");
      await root.locator("[data-import-settings]").setInputFiles(settingsFile);
      await expect(root).toHaveAttribute("data-palette", "seafoam");
      // Shared preset persistence and fullscreen use the common Lab architecture.
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Reel proof");
      await page.locator(".il-presets [data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), presetFile);
      await page.locator("[data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(presetFile);
      await expect(root).toHaveAttribute("data-palette", "seafoam");
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
      await set("palette", "vermilion");
      await root.locator("[data-mode=standard]").click();
      await root.screenshot({ path: path.join(out, name + "-viewer.png") });
      console.log(
        name +
          ": local photographs, portable JSON, sound gating, pause, presets and fullscreen",
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
      const origin = `http://127.0.0.1:${server.address().port}`;
      await portable.goto(origin + "/example.html");
      await portable.bringToFront();
      await portable.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(portable.locator(".rv")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator(".rv [data-next]").last().click();
      await expect(portable.locator(".rv")).toHaveAttribute("data-scene", "1");
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".rv")).toHaveCount(0);
      await portable.goto(
        origin + "/creative-lab/experiments/view-master/embed-demo.html",
      );
      await portable.locator("#toy").scrollIntoViewIfNeeded();
      await expect(portable.locator(".rv")).toHaveAttribute("data-count", "2");
      await portable.locator(".rv [data-next]").last().click();
      await expect(portable.locator("#caption")).toContainText("harbour");
      // Direct component cleanup, true photo pairs, and sound settings cannot unlock audio.
      const proof = await portable.evaluate(async () => {
        const { mount } = await import("./index.js");
        const host = document.createElement("div");
        host.style.width = "800px";
        document.body.append(host);
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const g = c.getContext("2d");
        g.fillStyle = "red";
        g.fillRect(0, 0, 16, 16);
        const left = c.toDataURL();
        g.fillStyle = "blue";
        g.fillRect(0, 0, 16, 16);
        const right = c.toDataURL();
        const a = mount(host, { mode: "stereo", clickSound: true }, () => {}, {
          reel: {
            version: 1,
            title: "Pair",
            scenes: [{ kind: "stereo-pair", left, right, title: "Two images" }],
          },
        });
        a.setRunning(true);
        await new Promise((r) => setTimeout(r, 150));
        const before = a.getState();
        const imgs = [...host.querySelectorAll("[data-eye]")].map((c) =>
          c.toDataURL(),
        );
        a.dispose();
        const removed = host.children.length;
        const b = mount(host);
        b.setRunning(true);
        const remounted = host.querySelectorAll(".rv").length;
        b.dispose();
        host.remove();
        return {
          audio: before.audio,
          different: imgs[0] !== imgs[1],
          removed,
          remounted,
        };
      });
      assert.deepEqual(proof, {
        audio: "uncreated",
        different: true,
        removed: 0,
        remounted: 1,
      });
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
      const mr = mp.locator(".rv");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await mr.locator("[data-eye=left]").scrollIntoViewIfNeeded();
      await mr.locator("[data-eye=left]").evaluate((c) => {
        const r = c.getBoundingClientRect();
        c.dispatchEvent(
          new PointerEvent("pointerdown", {
            pointerId: 9,
            isPrimary: true,
            pointerType: "touch",
            button: 0,
            clientX: r.x + r.width * 0.8,
            clientY: r.y + 30,
            bubbles: true,
          }),
        );
        c.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: 9,
            isPrimary: true,
            pointerType: "touch",
            button: 0,
            clientX: r.x + r.width * 0.1,
            clientY: r.y + 30,
            bubbles: true,
          }),
        );
      });
      await expect(mr).toHaveAttribute("data-scene", "1");
      await expect(mr).toHaveAttribute("data-phase", "1.000");
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
      await mr.locator("[data-play]").click();
      const reduced = await mr.getAttribute("data-scene");
      await mp.waitForTimeout(2200);
      assert.equal(await mr.getAttribute("data-scene"), reduced);
      await mr.locator("[data-next]").last().click();
      await expect(mr).toHaveAttribute("data-phase", "1.000");
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": standalone source, stereo pairs, cleanup/remount, touch, resizing and reduced motion passed.",
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
