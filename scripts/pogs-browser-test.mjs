import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/pogs");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/pogs-");
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
        .locator('a[href="/tampa-curated/lab/pogs/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".pg"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-collected", "0");
      const metric = async (k) => Number(await root.getAttribute("data-" + k)),
        set = async (k, v) =>
          page.locator(`[data-setting="${k}"]`).evaluate((e, v) => {
            e.value = String(v);
            e.dispatchEvent(new Event("input", { bubbles: true }));
          }, v),
        save = async (el, file) => {
          const d = page.waitForEvent("download");
          await el.click();
          await (await d).saveAs(file);
        };
      await root.screenshot({ path: path.join(out, name + "-studio.png") });
      async function flick() {
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox(),
          p = (x, y) => [
            r.x + (x / 1000) * r.width,
            r.y + (y / 680) * r.height,
          ];
        await page.mouse.move(...p(500, 490.6));
        await page.mouse.down();
        await page.mouse.move(...p(512, 290), { steps: 15 });
        await page.mouse.up();
      }
      await flick();
      await expect(root).toHaveAttribute("data-phase", "flight");
      await expect(root).toHaveAttribute("data-turn", "1");
      const scrollBeforeSecondStrike = await page.evaluate(() => scrollY);
      await page.keyboard.press("Space");
      assert.equal(await metric("turn"), 1);
      assert.equal(
        await page.evaluate(() => scrollY),
        scrollBeforeSecondStrike,
      );
      await page.waitForTimeout(180);
      await canvas.screenshot({ path: path.join(out, name + "-flight.png") });
      await expect(root).toHaveAttribute("data-phase", "result");
      const pending = await metric("pending");
      assert.ok(pending > 0, "Flick produces actual face-up discs");
      assert.equal(await metric("you"), 0);
      assert.equal(await metric("collected"), 0);
      await root
        .locator(".pg-table")
        .screenshot({ path: path.join(out, name + "-landing.png") });
      await root.locator("[data-collect]").click();
      await expect(root).toHaveAttribute(
        "data-phase",
        pending === 8 ? "complete" : "ready",
      );
      assert.equal(await metric("you"), pending);
      assert.equal(await metric("collected"), pending);
      assert.equal(await metric("left"), 8 - pending);
      await root.locator("[data-new]").click();
      await canvas.scrollIntoViewIfNeeded();
      let rect = await canvas.boundingBox();
      await page.mouse.click(
        rect.x + 0.76 * rect.width,
        rect.y + 0.62 * rect.height,
      );
      await canvas.focus();
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-phase", "result");
      assert.equal(await metric("pending"), 0);
      await root.locator("[data-collect]").click();
      await expect(root).toHaveAttribute("data-phase", "ready");
      assert.equal(await metric("you"), 0);
      assert.equal(await metric("left"), 8);
      await root.locator('[data-aim="22"]').click();
      await root.locator("[data-strike]").click();
      await root.locator("[data-pause]").click();
      await expect(root).toHaveAttribute("data-running", "false");
      const frozen = await metric("clock");
      await page.waitForTimeout(250);
      assert.equal(await metric("clock"), frozen);
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-phase", "result");
      await root.locator("[data-collect]").click();
      await expect(root).toHaveAttribute(
        "data-phase",
        (await metric("left")) === 0 ? "complete" : /ready|complete/,
      );
      await root.locator("[data-new]").click();
      await root.locator("[data-strike]").click();
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect(root).toHaveAttribute("data-running", "false");
      const off = await metric("clock");
      await page.waitForTimeout(200);
      assert.equal(await metric("clock"), off);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-phase", "result");
      // Merely viewing the album never banks pending results.
      const beforeAlbum = await metric("collected");
      await root.locator("[data-show=album]").click();
      await expect(root).toHaveAttribute("data-view", "album");
      await expect(root).toHaveAttribute("data-running", "false");
      assert.equal(await metric("collected"), beforeAlbum);
      await expect(root.locator("[data-album]")).toHaveCount(12);
      await root.locator("[data-album=moon-moth]").click();
      await expect(root.locator("[data-album=moon-moth]")).toHaveAttribute(
        "data-back",
        "true",
      );
      await root
        .locator(".pg-album")
        .screenshot({ path: path.join(out, name + "-album.png") });
      const albumFile = path.join(out, name + "-album.json");
      await save(root.locator("[data-album-save]"), albumFile);
      const album = JSON.parse(await readFile(albumFile));
      assert.equal(
        Object.values(album.counts).reduce((a, b) => a + b, 0),
        beforeAlbum,
      );
      await root.locator("[data-album-clear]").click();
      await expect(root).toHaveAttribute("data-collected", "0");
      await root.locator("[data-album-undo]").click();
      await expect(root).toHaveAttribute("data-collected", String(beforeAlbum));
      await root.locator("[data-album-import]").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          '{"type":"odd-company-album","version":1,"counts":{"unknown":2}}',
        ),
      });
      await expect(root.locator("[data-album-status]")).toContainText(
        "invalid",
      );
      assert.equal(await metric("collected"), beforeAlbum);
      const chooseAlbum = page.waitForEvent("filechooser");
      await root.locator(".pg-album .pg-file").click();
      await (await chooseAlbum).setFiles(albumFile);
      await expect(root.locator("[data-album-status]")).toContainText(
        "Album loaded",
      );
      await page.reload();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-ready", "true");
      assert.equal(await metric("collected"), beforeAlbum);
      // A real CPU turn: player misses, then the computer strikes and banks through the same state machine.
      await root.locator("[data-mode=cpu]").click();
      await set("stackSize", 8);
      await canvas.scrollIntoViewIfNeeded();
      rect = await canvas.boundingBox();
      await page.mouse.click(
        rect.x + 0.8 * rect.width,
        rect.y + 0.6 * rect.height,
      );
      await root.locator("[data-strike]").click();
      await expect(root).toHaveAttribute("data-phase", "result");
      await root.locator("[data-collect]").click();
      await expect(root).toHaveAttribute("data-actor", "cpu");
      await expect(root).toHaveAttribute("data-actor", "you", {
        timeout: 15000,
      });
      await expect(root).toHaveAttribute("data-phase", "ready");
      assert.ok((await metric("cpu")) > 0);
      assert.equal(await metric("you"), 0);
      assert.equal(await metric("collected"), beforeAlbum);
      // Builder preserves duplicates and order in saved/dealt stacks.
      await root.locator("[data-mode=builder]").click();
      await expect(root).toHaveAttribute("data-view", "builder");
      await root.locator("[data-build-clear]").click();
      await expect(root.locator("[data-deal]")).toBeDisabled();
      for (const id of ["sun-eater", "moon-moth", "moon-moth", "observatory"])
        await root.locator(`[data-add=${id}]`).click();
      await root.locator("[data-reverse]").click();
      assert.deepEqual(JSON.parse(await root.getAttribute("data-builder")), [
        "observatory",
        "moon-moth",
        "moon-moth",
        "sun-eater",
      ]);
      await root.locator("[data-deal]").click();
      await expect(root).toHaveAttribute("data-left", "4");
      await expect(root).toHaveAttribute("data-view", "table");
      for (const id of ["steel", "wood", "enamel", "brass"]) {
        await root.locator(`[data-slammer=${id}]`).click();
        assert.equal(
          await page.locator("[data-setting=slammer]").inputValue(),
          id,
        );
      }
      await set("surface", "linen");
      await set("style", "holo");
      await set("power", 0.5);
      await set("angle", 45);
      await set("friction", 0.3);
      const setupFile = path.join(out, name + "-table.json");
      await save(root.locator("[data-save]"), setupFile);
      const setup = JSON.parse(await readFile(setupFile));
      assert.deepEqual(setup.stack, [
        "observatory",
        "moon-moth",
        "moon-moth",
        "sun-eater",
      ]);
      for (const preset of ["club", "duel", "foil", "heavy", "gentle"])
        await root.locator("[data-preset]").selectOption(preset);
      await root.locator("[data-import]").setInputFiles(setupFile);
      await expect(root.locator(".pg-status")).toContainText(
        "Saved table and stack loaded",
      );
      await expect(root).toHaveAttribute("data-left", "4");
      assert.equal(
        await page.locator("[data-setting=style]").inputValue(),
        "holo",
      );
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Odd company proof");
      await page.locator(".il-presets [data-save]").click();
      const presetFile = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), presetFile);
      await page.locator(".il-inspector [data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(presetFile);
      await expect(root).toHaveAttribute("data-mode", "builder");
      await expect(root).toHaveAttribute("data-style", "holo");
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
      console.log(
        name +
          ": actual flick, miss, keyboard, bank-only album, pause/offscreen, CPU turn, duplicate custom stack, finishes, settings, local files, presets and fullscreen passed.",
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
      const local = `http://127.0.0.1:${server.address().port}`,
        portable = await browser.newPage({
          viewport: { width: 1100, height: 1000 },
        });
      portable.on("pageerror", (e) => errors.push(e.message));
      await portable.goto(local + "/example.html");
      await portable.bringToFront();
      await portable.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(portable.locator(".pg")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator(".pg [data-mode=practice]").click();
      await portable.locator(".pg [data-strike]").click();
      await expect(portable.locator(".pg")).toHaveAttribute(
        "data-phase",
        "result",
      );
      await portable.locator(".pg [data-collect]").click();
      await expect
        .poll(async () =>
          Number(await portable.locator(".pg").getAttribute("data-you")),
        )
        .toBeGreaterThan(0);
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".pg")).toHaveCount(0);
      await portable.goto(
        local + "/creative-lab/experiments/pogs/embed-demo.html",
      );
      await portable.locator("#strike").click();
      await expect(portable.locator("output")).toContainText("result");
      await portable.locator("#collect").click();
      await expect(portable.locator("output")).not.toContainText("0 collected");
      const proof = await portable.evaluate(async () => {
        const { createDiscTable } = await import("./engine.js"),
          { DiscGame } = await import("./model.js"),
          { DEFAULTS } = await import("./catalog.js"),
          { tableBackground, drawTable } = await import("./renderer.js"),
          { createArtwork } = await import("./art.js");
        const c = document.createElement("canvas");
        c.style.cssText = "width:1000px;height:680px";
        document.body.append(c);
        let frames = 0;
        const toy = createDiscTable(
          c,
          { stackSize: 16 },
          { frame: () => frames++ },
        );
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 80));
        const idle = frames;
        await new Promise((r) => setTimeout(r, 180));
        const rest = frames === idle;
        toy.strike({ x: 12, y: 0, power: 0.8 });
        await new Promise((r) => setTimeout(r, 480));
        const fps = toy.getState().fps;
        toy.setRunning(false);
        const f = frames,
          t = toy.getState().clock;
        await new Promise((r) => setTimeout(r, 150));
        const paused = f === frames && toy.getState().clock === t;
        toy.dispose();
        const stopped = frames;
        await new Promise((r) => setTimeout(r, 100));
        const clean =
          toy.disposed &&
          frames === stopped &&
          c.width === 1 &&
          toy.artwork.fronts.size === 0;
        const again = createDiscTable(c);
        const remount = again.getState().left;
        again.dispose();
        c.remove();
        const bg = document.createElement("canvas"),
          art = createArtwork(),
          image = document.createElement("canvas");
        bg.width = image.width = 1000;
        bg.height = image.height = 680;
        tableBackground(bg.getContext("2d"), DEFAULTS);
        const g = new DiscGame({ ...DEFAULTS, stackSize: 12 });
        g.strike({ x: 18, y: 0, power: 0.7 });
        g.advance(3);
        drawTable(image.getContext("2d"), bg, g, art);
        const preview = image.toDataURL("image/png");
        art.dispose();
        return { rest, paused, clean, remount, fps, preview };
      });
      assert.ok(proof.rest);
      assert.ok(proof.paused);
      assert.ok(proof.clean);
      assert.equal(proof.remount, 8);
      assert.ok(proof.fps > 20);
      if (name === "webkit") {
        await writeFile(
          path.join(out, "preview.svg"),
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 680"><image width="1000" height="680" href="${proof.preview}"/></svg>`,
        );
        await writeFile(
          path.join(out, "preview.png"),
          Buffer.from(proof.preview.split(",")[1], "base64"),
        );
      }
      console.log(
        name +
          ": exported UI, custom-art neutral table, 16-disc animation " +
          proof.fps +
          " FPS, idle sleep, exact pause, disposal and remount passed.",
      );
      await portable.close();
      const mobile = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
        }),
        mp = await mobile.newPage();
      mp.on("pageerror", (e) => errors.push(e.message));
      await mp.goto(origin + "/tampa-curated/");
      await mp.bringToFront();
      await mp.locator("[data-concept-navigation] summary").tap();
      await mp
        .locator('[data-concept-navigation] a[href="/tampa-curated/lab/pogs/"]')
        .tap();
      await mp.locator("[data-mount]").scrollIntoViewIfNeeded();
      const mr = mp.locator(".pg"),
        mc = mr.locator("canvas");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await mc.scrollIntoViewIfNeeded();
      async function touchFlick() {
        await mc.evaluate((el) => {
          const r = el.getBoundingClientRect(),
            event = (type, x, y, time) =>
              el.dispatchEvent(
                new PointerEvent(type, {
                  bubbles: true,
                  pointerId: 71,
                  pointerType: "touch",
                  isPrimary: true,
                  button: 0,
                  buttons: type === "pointerup" ? 0 : 1,
                  clientX: r.x + (x / 1000) * r.width,
                  clientY: r.y + (y / 680) * r.height,
                  timeStamp: time,
                }),
              );
          event("pointerdown", 500, 490, 0);
          for (let i = 1; i <= 10; i++)
            event("pointermove", 500 + 1.2 * i, 490 - 20 * i, i * 16);
          event("pointerup", 512, 290, 176);
        });
      }
      await touchFlick();
      await expect(mr).toHaveAttribute("data-phase", "result");
      await mr.locator("[data-collect]").tap();
      await expect
        .poll(async () => Number(await mr.getAttribute("data-collected")))
        .toBeGreaterThan(0);
      await mr.screenshot({ path: path.join(out, name + "-mobile.png") });
      for (const width of [320, 390, 768]) {
        await mp.setViewportSize({ width, height: 900 });
        assert.ok(
          await mp.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "No overflow at " + width,
        );
      }
      await mp.emulateMedia({ reducedMotion: "reduce" });
      await mr.locator("[data-new]").tap();
      await mc.scrollIntoViewIfNeeded();
      await touchFlick();
      await expect(mr).toHaveAttribute("data-phase", "result", {
        timeout: 1200,
      });
      await mr.locator("[data-collect]").tap();
      await expect(mr).toHaveAttribute("data-phase", /ready|complete/, {
        timeout: 1200,
      });
      await mr.locator("[data-mode=collection]").tap();
      await expect(mr).toHaveAttribute("data-view", "album");
      await mr.locator("[data-hunt]").tap();
      await expect(mr).toHaveAttribute("data-view", "table");
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": mobile Concepts navigation, touch flick and bank, 320/390/768 reflow, collection hunt and reduced-motion results passed.",
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
