import assert from "node:assert/strict";
import { mkdir, readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
import { createBoard } from "../src/creative-lab/experiments/operation-game/board.js";
import { DEFAULTS } from "../src/creative-lab/experiments/operation-game/model.js";
import { viewFor } from "../src/creative-lab/experiments/operation-game/renderer.js";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/operation-game/",
  out = path.resolve("test-results/operation-game"),
  scene = createBoard(DEFAULTS);
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/operation-game-");
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
      context.setDefaultTimeout(15000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin + "/tampa-curated/");
      await page.locator("[data-concept-navigation] summary").click();
      await page
        .getByRole("navigation", { name: "Concept pages" })
        .locator('a[href="/tampa-curated/lab/operation-game/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".op"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-audio", "uncreated");
      const set = async (k, v) =>
        page.locator(`[data-setting="${k}"]`).evaluate((e, v) => {
          if (e.type === "checkbox") e.checked = v;
          else e.value = String(v);
          e.dispatchEvent(new Event("input", { bubbles: true }));
        }, v);
      const save = async (el, file) => {
        const d = page.waitForEvent("download");
        await el.click();
        await (await d).saveAs(file);
      };
      const metric = async (k) => Number(await root.getAttribute("data-" + k));
      async function drag(
        index,
        { focus = false, fail = false, touch = false } = {},
      ) {
        const c = scene.cavities[index];
        if (focus) await root.locator(`[data-inspect="${c.id}"]`).click();
        else if (await root.locator("[data-overview]").isVisible())
          await root.locator("[data-overview]").click();
        await canvas.scrollIntoViewIfNeeded();
        const r = await canvas.boundingBox(),
          v = viewFor(scene, focus ? c.id : null),
          point = (p) => ({
            x: r.x + ((p.x * v.scale + v.x) / 900) * r.width,
            y: r.y + ((p.y * v.scale + v.y) / 720) * r.height,
          });
        const route = fail
          ? [c.start, { x: c.start.x - 110, y: c.start.y - 90 }]
          : c.path;
        if (touch) {
          await canvas.evaluate(
            (el, { route }) => {
              const first = route[0];
              el.dispatchEvent(
                new PointerEvent("pointerdown", {
                  bubbles: true,
                  pointerId: 71,
                  pointerType: "touch",
                  button: 0,
                  buttons: 1,
                  isPrimary: true,
                  clientX: first.x,
                  clientY: first.y,
                }),
              );
              for (const p of route.slice(1))
                el.dispatchEvent(
                  new PointerEvent("pointermove", {
                    bubbles: true,
                    pointerId: 71,
                    pointerType: "touch",
                    buttons: 1,
                    isPrimary: true,
                    clientX: p.x,
                    clientY: p.y,
                  }),
                );
              const end = route.at(-1);
              el.dispatchEvent(
                new PointerEvent("pointerup", {
                  bubbles: true,
                  pointerId: 71,
                  pointerType: "touch",
                  button: 0,
                  isPrimary: true,
                  clientX: end.x,
                  clientY: end.y,
                }),
              );
            },
            { route: route.map(point) },
          );
        } else {
          const first = point(route[0]);
          await page.mouse.move(first.x, first.y);
          await page.mouse.down();
          for (const p of route.slice(1)) {
            const q = point(p);
            await page.mouse.move(q.x, q.y, { steps: fail ? 1 : 8 });
          }
          await page.mouse.up();
        }
      }
      await root.screenshot({ path: path.join(out, name + "-studio.png") });
      for (let i = 0; i < 6; i++) await drag(i, { focus: i % 2 === 1 });
      await expect(root).toHaveAttribute("data-status", "complete");
      await expect(root).toHaveAttribute("data-score", "600");
      await expect(root).toHaveAttribute("data-faults", "0");
      await expect(root.locator(".op-log li")).toHaveCount(6);
      if (await root.locator("[data-overview]").isVisible())
        await root.locator("[data-overview]").click();
      await root
        .locator(".op-toy")
        .screenshot({ path: path.join(out, name + "-complete.png") });
      await root.locator("[data-reset]").click();
      await drag(0, { fail: true });
      await expect(root).toHaveAttribute("data-faults", "1");
      await expect(root.locator(".op-status")).toContainText("metal rim");
      await drag(0);
      await expect(root).toHaveAttribute("data-score", "100");
      await drag(1, { fail: true });
      await expect(root).toHaveAttribute("data-score", "75");
      await root.locator("[data-mode=precision]").click();
      for (let i = 0; i < 3; i++) await drag(0, { fail: true });
      await expect(root).toHaveAttribute("data-status", "failed");
      await expect(root).toHaveAttribute("data-successes", "0");
      await root.locator("[data-mode=timed]").click();
      await set("timer", 30);
      await expect(root).toHaveAttribute("data-status", "ready");
      await drag(0);
      await expect(root).toHaveAttribute("data-successes", "0");
      assert.equal(await metric("remaining"), 30);
      await root.locator("[data-start]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect.poll(() => metric("remaining")).toBeLessThan(29.7);
      await root.locator("[data-pause]").click();
      const time = await metric("remaining");
      await page.waitForTimeout(250);
      assert.equal(await metric("remaining"), time);
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect.poll(() => metric("remaining")).toBeLessThan(time);
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await expect(root).toHaveAttribute("data-running", "false");
      const off = await metric("remaining");
      await page.waitForTimeout(250);
      assert.equal(await metric("remaining"), off);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-running", "true");
      await root.locator("[data-mode=classic]").click();
      await root.locator("[data-inspect=cavity-0]").click();
      await canvas.focus();
      await page.keyboard.press("Space");
      for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Escape");
      await expect(root).toHaveAttribute("data-faults", "0");
      await expect(root).toHaveAttribute("data-successes", "0");
      for (const p of ["first", "precision", "rush", "odd", "afternoon"]) {
        await root.locator("[data-preset]").selectOption(p);
        await expect(root).toHaveAttribute("data-ready", "true");
      }
      await root.locator("[data-mode=silly]").click();
      const names = await root.locator(".op-object strong").allTextContents();
      await root.locator("[data-reset]").click();
      assert.notDeepEqual(
        await root.locator(".op-object strong").allTextContents(),
        names,
      );
      await set("difficulty", "expert");
      await set("tolerance", 5);
      await set("objectSize", 1.25);
      await set("objectCount", 3);
      await set("sensitivity", 0.75);
      await set("boardStyle", "blue");
      await set("sound", true);
      await expect(root).toHaveAttribute("data-audio", "uncreated");
      await root.locator("[data-sound]").click();
      await expect(root.locator("[data-sound]")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await root.locator("[data-sound]").click();
      await expect(root.locator("[data-sound]")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      const setup = path.join(out, name + "-setup.json");
      await save(root.locator("[data-save]"), setup);
      assert.equal(JSON.parse(await readFile(setup)).settings.sound, false);
      await root.locator("[data-preset]").selectOption("afternoon");
      await root.locator("[data-import]").setInputFiles(setup);
      await expect(root.locator(".op-status")).toContainText(
        "Saved setup loaded",
      );
      await expect(root).toHaveAttribute("data-count", "3");
      assert.equal(
        await page.locator("[data-setting=difficulty]").inputValue(),
        "expert",
      );
      await root
        .locator("[data-import]")
        .setInputFiles({
          name: "invalid.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"type":"wrong","version":1}'),
        });
      await expect(root.locator(".op-status")).toContainText(
        "Choose a Fine Trouble",
      );
      await save(
        root.locator("[data-log-export]"),
        path.join(out, name + "-case.json"),
      );
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("Precision proof");
      await page.locator(".il-presets [data-save]").click();
      const preset = path.join(out, name + "-preset.json");
      await save(page.locator("[data-export-preset]"), preset);
      await page.locator(".il-inspector [data-reset]").click();
      await page.locator(".il-presets [data-import]").setInputFiles(preset);
      await expect(root).toHaveAttribute("data-count", "3");
      await page.reload();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-count", "3");
      await expect(root).toHaveAttribute("data-audio", "uncreated");
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
          ": six actual extractions, fast collision, score, three-strike failure, timed/pause/offscreen behavior, keyboard, presets, local files, sound gate, persistence and fullscreen passed.",
      );
      const zip = path.join(out, name + "-source.zip");
      await save(page.locator("[data-export-source]"), zip);
      const dest = path.join(temp, name);
      execFileSync("python3", [
        "-c",
        "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])",
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
      await expect(portable.locator(".op")).toHaveAttribute(
        "data-ready",
        "true",
      );
      await portable.locator(".op [data-inspect=cavity-0]").click();
      await expect(portable.locator(".op")).toHaveAttribute(
        "data-focus",
        "cavity-0",
      );
      await portable.evaluate(() =>
        window.dispatchEvent(new Event("pagehide")),
      );
      await expect(portable.locator(".op")).toHaveCount(0);
      await portable.goto(
        local + "/creative-lab/experiments/operation-game/embed-demo.html",
      );
      await portable.locator("#focus").click();
      await expect(portable.locator("output")).toContainText("0 points");
      const proof = await portable.evaluate(async () => {
        const { createPrecisionToy } = await import("./engine.js"),
          { DEFAULTS } = await import("./model.js"),
          { createBoard } = await import("./board.js");
        const c = document.createElement("canvas");
        c.style.cssText = "width:900px;height:720px";
        document.body.append(c);
        let frames = 0,
          events = [];
        const toy = createPrecisionToy(
          c,
          { mode: "timed", timer: 30 },
          { event: (e) => events.push(e.type), frame: () => frames++ },
        );
        toy.setRunning(true);
        toy.start();
        for (const cavity of toy.model.scene.cavities) {
          toy.begin(cavity.start);
          for (const p of cavity.path.slice(1)) toy.move(p);
          toy.end();
        }
        const complete = toy.getState();
        toy.reset();
        toy.start();
        await new Promise((r) => setTimeout(r, 500));
        const fps = toy.getState().fps;
        toy.setRunning(false);
        const before = frames,
          time = toy.getState().remaining;
        await new Promise((r) => setTimeout(r, 150));
        const paused = frames === before && time === toy.getState().remaining;
        toy.dispose();
        const atEnd = frames;
        await new Promise((r) => setTimeout(r, 120));
        const clean = toy.disposed && frames === atEnd && c.width === 1;
        const next = createPrecisionToy(c);
        const count = next.getState().count;
        next.dispose();
        c.remove();
        // Render the original preview from the actual board renderer.
        const { drawBoard, drawGame, viewFor } = await import("./renderer.js"),
          { PrecisionGame } = await import("./model.js");
        const board = createBoard(DEFAULTS),
          model = new PrecisionGame(board, DEFAULTS),
          bg = document.createElement("canvas"),
          art = document.createElement("canvas");
        bg.width = art.width = 900;
        bg.height = art.height = 720;
        drawBoard(bg.getContext("2d"), board, DEFAULTS);
        drawGame(art.getContext("2d"), bg, model, viewFor(board, null), {
          visible: false,
        });
        return {
          complete,
          events,
          paused,
          clean,
          count,
          fps,
          preview: art.toDataURL("image/png"),
        };
      });
      assert.equal(proof.complete.status, "complete");
      assert.equal(proof.complete.score, 600);
      assert.equal(proof.events.filter((e) => e === "extracted").length, 6);
      assert.ok(proof.paused);
      assert.ok(proof.clean);
      assert.equal(proof.count, 6);
      assert.ok(proof.fps > 20);
      if (name === "webkit") {
        await writeFile(
          path.join(out, "board.png"),
          Buffer.from(proof.preview.split(",")[1], "base64"),
        );
        await writeFile(
          path.join(out, "preview.svg"),
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 720"><image width="900" height="720" href="${proof.preview}"/></svg>`,
        );
      }
      console.log(
        name +
          ": standalone source and neutral custom board, six real engine extractions, " +
          proof.fps +
          " FPS, exact pause, disposal and remount passed.",
      );
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
      const mr = mp.locator(".op"),
        mc = mr.locator("canvas");
      await expect(mr).toHaveAttribute("data-ready", "true");
      await mr.locator("[data-inspect=cavity-0]").tap();
      await mc.scrollIntoViewIfNeeded();
      async function touchExtract() {
        const v = viewFor(scene, "cavity-0"),
          r = await mc.boundingBox(),
          route = scene.cavities[0].path.map((p) => ({
            x: r.x + ((p.x * v.scale + v.x) / 900) * r.width,
            y: r.y + ((p.y * v.scale + v.y) / 720) * r.height,
          }));
        await mc.evaluate((el, route) => {
          const event = (type, p) =>
            el.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                pointerId: 75,
                pointerType: "touch",
                isPrimary: true,
                button: 0,
                buttons: type === "pointerup" ? 0 : 1,
                clientX: p.x,
                clientY: p.y,
              }),
            );
          event("pointerdown", route[0]);
          for (const p of route.slice(1)) event("pointermove", p);
          event("pointerup", route.at(-1));
        }, route);
      }
      await touchExtract();
      await expect(mr).toHaveAttribute("data-successes", "1");
      await expect(mr).toHaveAttribute("data-faults", "0");
      await mr
        .locator(".op-toy")
        .screenshot({ path: path.join(out, name + "-touch-closeup.png") });
      await mr.locator("[data-overview]").tap();
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
      await mr.locator("[data-reset]").tap();
      await mr.locator("[data-inspect=cavity-0]").tap();
      await mc.scrollIntoViewIfNeeded();
      await touchExtract();
      await expect(mr).toHaveAttribute("data-successes", "1");
      await mobile.close();
      assert.deepEqual(errors, []);
      console.log(
        name +
          ": touch close-up extraction, 320/390/768 px reflow, reduced-motion gameplay and no browser exceptions passed.",
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
