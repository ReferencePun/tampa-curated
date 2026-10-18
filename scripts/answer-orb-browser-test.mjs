import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect } from "@playwright/test";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  out = path.resolve("test-results/answer-orb");
await mkdir(out, { recursive: true });
const temp = await mkdtemp("/tmp/answer-orb-");
await writeFile(
  path.join(temp, "probe.html"),
  "<!doctype html><html><title>Orb engine probe</title><body></body></html>",
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
        .locator('a[href="/tampa-curated/lab/magic-8-ball/"]')
        .click();
      await page.locator("[data-mount]").scrollIntoViewIfNeeded();
      const root = page.locator(".mo"),
        canvas = root.locator("canvas");
      await expect(root).toHaveAttribute("data-ready", "true");
      await expect(root).toHaveAttribute("data-phase", "ready");
      await expect(root).toHaveAttribute("data-audio-state", "uncreated");
      const control = async (k, v) =>
          root.locator(`[data-control="${k}"]`).evaluate((e, v) => {
            if (e.type === "checkbox") e.checked = v;
            else e.value = String(v);
            e.dispatchEvent(new Event("input", { bubbles: true }));
          }, v),
        save = async (el, file) => {
          const d = page.waitForEvent("download");
          await el.click();
          await (await d).saveAs(file);
        },
        answer = () => root.locator("[data-answer]").textContent();
      await root.screenshot({ path: path.join(out, name + "-studio.png") });
      await control("revealSpeed", 2);
      await root
        .locator("[data-question]")
        .fill("Should I begin the little project?");
      await root.locator("[data-shake]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-phase", "shaking");
      await page.waitForTimeout(250);
      await canvas.screenshot({ path: path.join(out, name + "-shake.png") });
      await expect(root).toHaveAttribute("data-phase", "rising");
      await canvas.screenshot({ path: path.join(out, name + "-rising.png") });
      await expect(root).toHaveAttribute("data-phase", "answered");
      await expect(root.locator("[data-asked]")).toContainText(
        "Should I begin the little project?",
      );
      await expect(root.locator(".mo-history li")).toHaveCount(1);
      const first = await answer();
      await root.screenshot({ path: path.join(out, name + "-answered.png") });
      // Real back-and-forth input creates energy and exactly one cast on release.
      let r = await canvas.boundingBox();
      const pt = (x, y) => [r.x + r.width * x, r.y + r.height * y];
      await page.mouse.move(...pt(0.5, 0.46));
      await page.mouse.down();
      for (const x of [0.62, 0.38, 0.64, 0.4])
        await page.mouse.move(...pt(x, 0.46), { steps: 4 });
      assert.ok(Number(await root.getAttribute("data-charge")) > 1);
      await page.mouse.up();
      await expect(root).toHaveAttribute("data-cast", "2");
      await expect(root).toHaveAttribute("data-phase", "answered");
      assert.notEqual(await answer(), first);
      // The answer appears in ordinary HTML, including safe literal user text.
      for (const mode of ["classic", "absurd", "creative"]) {
        await control("answerSet", mode);
        await root
          .locator("[data-question]")
          .fill("<img src=x> My private question");
        await root.locator("[data-again]").click();
        await canvas.scrollIntoViewIfNeeded();
        await expect(root).toHaveAttribute("data-phase", "answered");
        await expect(root.locator("[data-answer-label]")).toHaveText(
          {
            classic: "Yes / no / perhaps",
            absurd: "Beautifully absurd",
            creative: "Creative provocations",
          }[mode],
        );
        assert.ok((await answer()).length > 3);
        assert.equal(await root.locator("[data-asked] img").count(), 0);
        await expect(root.locator("[data-asked]")).toContainText("<img src=x>");
      }
      assert.equal(
        await page.evaluate(() =>
          JSON.stringify({ ...localStorage }).includes("My private question"),
        ),
        false,
        "Questions are not persisted in shared settings",
      );
      await save(
        root.locator("[data-print]"),
        path.join(out, name + "-answer.png"),
      );
      const png = await readFile(path.join(out, name + "-answer.png"));
      assert.equal(png.readUInt32BE(16), 1600);
      assert.equal(png.readUInt32BE(20), 1216);
      await save(
        root.locator("[data-notebook]"),
        path.join(out, name + "-notebook.json"),
      );
      const note = JSON.parse(
        await readFile(path.join(out, name + "-notebook.json")),
      );
      assert.equal(note.type, "murmur-notebook");
      assert.equal(note.answers.length, 5);
      assert.ok(note.answers[0].question.includes("My private question"));
      await root.locator("[data-copy]").click();
      await expect(root.locator(".mo-status")).toHaveText(
        /Answer copied|Select the answer/,
      );
      // Interrupted reveals do not enter history; pause holds both clock and pose.
      await root.locator("[data-again]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await root.locator("[data-pause]").click();
      const frozen = await root.getAttribute("data-clock"),
        phase = await root.getAttribute("data-phase");
      await page.waitForTimeout(250);
      assert.equal(await root.getAttribute("data-clock"), frozen);
      assert.equal(await root.getAttribute("data-phase"), phase);
      await root.locator("[data-again]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-phase", "answered");
      await expect(root.locator(".mo-history li")).toHaveCount(6);
      const saved = JSON.parse(
        await readFile(path.join(out, name + "-notebook.json")),
      );
      assert.equal(saved.answers.length, 5);
      await root.locator("[data-sound]").click();
      await expect(root).toHaveAttribute("data-sound", "true");
      await expect(root).toHaveAttribute("data-audio-state", "running");
      await root.locator("[data-again]").click();
      await canvas.scrollIntoViewIfNeeded();
      await expect(root).toHaveAttribute("data-phase", "answered");
      await root.locator("[data-sound]").click();
      await expect(root).toHaveAttribute("data-sound", "false");
      await root.locator("[data-clear-history]").click();
      await expect(root.locator(".mo-history li")).toHaveCount(0);
      await root.locator("[data-reset]").click();
      await expect(root).toHaveAttribute("data-phase", "ready");
      await expect(root).toHaveAttribute("data-cast", "0");
      await expect(root.locator("[data-question]")).toHaveValue("");
      await expect(root.locator("[data-print]")).toBeDisabled();
      // Every supplied preset reaches the same shared inspector.
      for (const preset of ["tide", "velvet", "brass", "absurd", "studio"]) {
        await root.locator("[data-preset]").selectOption(preset);
        const k = await root.locator('[data-control="color"]').inputValue();
        await expect(page.locator('[data-setting="color"]')).toHaveValue(k);
        await canvas.scrollIntoViewIfNeeded();
        assert.ok(await canvas.evaluate((c) => c.width > 0));
      }
      await canvas.focus();
      const scroll = await page.evaluate(() => scrollY);
      await page.keyboard.press("Space");
      await expect(root).toHaveAttribute("data-cast", "1");
      assert.equal(await page.evaluate(() => scrollY), scroll);
      await expect(root).toHaveAttribute("data-phase", "answered");
      await page.locator(".il-demo-toolbar [data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      const sharedPause = await root.getAttribute("data-clock");
      await page.waitForTimeout(200);
      assert.equal(await root.getAttribute("data-clock"), sharedPause);
      await root.locator("[data-pause]").click();
      await canvas.scrollIntoViewIfNeeded();
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(160);
      const off = await root.getAttribute("data-clock");
      await page.waitForTimeout(180);
      assert.equal(await root.getAttribute("data-clock"), off);
      await page.setViewportSize({ width: 1440, height: 1150 });
      await page.locator(".il-presets summary").click();
      await page.locator("[data-preset-name]").fill("My quiet vessel");
      await page.locator(".il-presets [data-save]").click();
      await expect(page.locator("[data-saved] option").last()).toHaveText(
        "My quiet vessel",
      );
      const zip = path.join(out, name + "-source.zip");
      await save(page.locator("[data-export-source]"), zip);
      execFileSync("python3", ["-m", "zipfile", "-e", zip, temp]);
      const single = await context.newPage();
      single.on("pageerror", (e) => errors.push(e.message));
      await single.goto(standaloneOrigin + "/example.html");
      await single.locator(".impossible-effect").scrollIntoViewIfNeeded();
      await expect(single.locator(".mo")).toHaveAttribute("data-ready", "true");
      await single.locator(".mo [data-again]").click();
      await single.locator(".mo-canvas").scrollIntoViewIfNeeded();
      await expect(single.locator(".mo")).toHaveAttribute(
        "data-phase",
        "answered",
      );
      await single
        .locator(".mo-canvas")
        .screenshot({ path: path.join(out, name + "-standalone.png") });
      await single.goto(
        standaloneOrigin +
          "/creative-lab/experiments/magic-8-ball/embed-demo.html",
      );
      await single.locator("#ask").click();
      await single.locator("canvas").scrollIntoViewIfNeeded();
      await expect(single.locator("output")).toHaveText(
        /Choose one thing|Try a small change|Save something/,
      );
      await single.goto(standaloneOrigin + "/probe.html");
      const metrics = await single.evaluate(async () => {
        const { createAnswerOrb } =
          await import("./creative-lab/experiments/magic-8-ball/engine.js");
        const c = document.createElement("canvas");
        c.style.cssText = "width:900px;aspect-ratio:1000/760;display:block";
        c.tabIndex = 0;
        document.body.append(c);
        let completed = 0,
          casts = 0;
        const toy = createAnswerOrb(
          c,
          { autoShake: true, interval: 8, revealSpeed: 2 },
          {
            shake() {
              casts++;
            },
            answer() {
              completed++;
            },
          },
        );
        c.scrollIntoView();
        await new Promise((r) => setTimeout(r, 100));
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 1000));
        const perf = toy.getState();
        toy.setRunning(false);
        const stopped = toy.getState();
        await new Promise((r) => setTimeout(r, 100));
        if (toy.getState().clock !== stopped.clock)
          throw Error("Pause advanced clock");
        toy.motion.idle = 8;
        toy.setRunning(true);
        await new Promise((r) => setTimeout(r, 100));
        if (casts !== 1 || toy.getState().phase === "ready")
          throw Error("Auto shake did not trigger");
        toy.motion.idle = 50;
        await new Promise((r) => setTimeout(r, 100));
        if (casts !== 1) throw Error("Auto shake interrupted an active answer");
        toy.motion.time = 4.79;
        await new Promise((r) => setTimeout(r, 100));
        if (completed !== 1 || casts !== 1)
          throw Error("Automatic shake wait was not restarted after reveal");
        toy.setRunning(false);
        // Finish nine cast envelopes without waiting through their wall-clock duration.
        toy.update({ ...toy.getState().config, autoShake: false });
        for (let i = 0; i < 9; i++) {
          toy.shake("Q " + i);
          toy.motion.time = 4.79;
          toy.setRunning(true);
          await new Promise((r) => setTimeout(r, 60));
          toy.setRunning(false);
        }
        if (toy.getState().history.length !== 6)
          throw Error("Notebook is not bounded");
        const before = toy.getState().cast;
        const r = c.getBoundingClientRect();
        c.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            button: 0,
            pointerId: 9,
            pointerType: "touch",
            clientX: r.x + r.width * 0.5,
            clientY: r.y + r.height * 0.45,
          }),
        );
        c.dispatchEvent(
          new PointerEvent("pointercancel", { bubbles: true, pointerId: 9 }),
        );
        if (toy.getState().cast !== before)
          throw Error("Canceled gesture cast an answer");
        const frames = toy.getState().frames;
        toy.dispose();
        toy.dispose();
        await new Promise((r) => setTimeout(r, 120));
        if (toy.getState().frames !== frames || c.width !== 1)
          throw Error("Disposed orb kept rendering");
        const again = createAnswerOrb(c);
        again.dispose();
        return {
          fps: perf.fps,
          frames: perf.frames,
          width: perf.width,
          completed,
        };
      });
      assert.ok(metrics.fps >= 25);
      console.log(name, metrics);
      await single.close();
      await page.bringToFront();
      for (const w of [320, 390, 768]) {
        await page.setViewportSize({ width: w, height: 844 });
        assert.ok(
          await root.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          `No overflow at ${w}`,
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await canvas.scrollIntoViewIfNeeded();
      const castBefore = Number(await root.getAttribute("data-cast"));
      await canvas.evaluate((c) => {
        const r = c.getBoundingClientRect();
        for (const [type, x] of [
          ["pointerdown", 0.5],
          ["pointermove", 0.65],
          ["pointermove", 0.36],
          ["pointerup", 0.5],
        ])
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              button: 0,
              isPrimary: true,
              pointerId: 22,
              pointerType: "touch",
              clientX: r.x + r.width * x,
              clientY: r.y + r.height * 0.45,
            }),
          );
      });
      await expect(root).toHaveAttribute("data-cast", String(castBefore + 1));
      await expect(root).toHaveAttribute("data-phase", "answered");
      await root.screenshot({ path: path.join(out, name + "-mobile.png") });
      const reduced = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        rp = await reduced.newPage();
      await rp.goto(origin + "/tampa-curated/lab/magic-8-ball/");
      await rp.locator("[data-mount]").scrollIntoViewIfNeeded();
      await expect(rp.locator(".mo")).toHaveAttribute("data-ready", "true");
      await rp.locator(".mo-canvas").scrollIntoViewIfNeeded();
      const rt = await rp.locator(".mo").getAttribute("data-clock");
      await rp.waitForTimeout(200);
      assert.equal(await rp.locator(".mo").getAttribute("data-clock"), rt);
      await rp.locator(".mo [data-again]").click();
      await expect(rp.locator(".mo")).toHaveAttribute("data-phase", "answered");
      await expect(rp.locator(".mo-history li")).toHaveCount(1);
      await expect(rp.locator(".mo")).toHaveAttribute(
        "data-audio-state",
        "uncreated",
      );
      await reduced.close();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: four voices, drag/tap/keyboard/touch, staged reveal, pause/offscreen, explicit sound, privacy, presets, PNG/notebook, standalone/custom data, auto-shake, reduced motion and disposal passed.`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((r) => server.close(r));
  await rm(temp, { recursive: true, force: true });
}
