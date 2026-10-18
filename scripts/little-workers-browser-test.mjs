import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium, webkit, expect as baseExpect } from "@playwright/test";
import { bundle } from "./lab-package.mjs";
const expect = baseExpect.configure({ timeout: 20000 }),
  origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321",
  url = origin + "/tampa-curated/lab/little-workers/",
  out = "test-results/little-workers";
await mkdir(out, { recursive: true });
const { files } = await bundle("little-workers"),
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
  folder = "/creative-lab/experiments/little-workers";
const setRange = (loc, value) =>
  loc.evaluate((e, v) => {
    e.value = v;
    e.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ]) {
    if (process.env.TEST_ENGINE && process.env.TEST_ENGINE !== name) continue;
    const browser = await engine.launch(),
      page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
        acceptDownloads: true,
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(page.locator(".mw")).toHaveAttribute("data-ready", "true");
    await expect(page.locator(".margin-worker-drawing")).toHaveCount(5);
    await expect(page.locator("canvas")).toHaveCount(0);
    const seek = (v) => setRange(page.locator("input[data-progress]"), v),
      settings = async () =>
        JSON.parse(
          await page.locator("[data-lab-host]").getAttribute("data-settings"),
        );
    for (const job of ["hammer", "ladder", "rope", "paint", "carry"]) {
      await page.locator("select[data-job]").selectOption(job);
      await seek(37);
      const figure = page.locator(
        `[data-stage="${job}"] .margin-worker-drawing`,
      );
      const before = await figure.innerHTML();
      await seek(79);
      assert.notEqual(
        await figure.innerHTML(),
        before,
        job + " changes with progress",
      );
      await seek(37);
      assert.equal(await figure.innerHTML(), before, job + " reverses exactly");
      await page.waitForTimeout(220);
      const frames = await page.locator(".mw").getAttribute("data-frames");
      await page.waitForTimeout(180);
      assert.equal(
        await page.locator(".mw").getAttribute("data-frames"),
        frames,
        "Held scroll schedules no frames",
      );
      await seek(100);
      await expect(figure).toHaveAttribute("data-progress", "1");
      await page.locator("[data-finish]").click();
      await expect(
        page.locator(`.mw-leaf[data-job-section="${job}"] output`),
      ).toHaveText("100 / 100");
      await seek(53);
      await page
        .locator(".mw")
        .screenshot({ path: `${out}/${name}-${job}.png` });
    }
    // Explicitly check the DOM outputs, not just illustrated figures.
    await page.locator("select[data-job]").selectOption("hammer");
    await seek(0);
    assert.match(
      await page.locator(".mw-divider").getAttribute("style"),
      /100%/,
    );
    await seek(100);
    assert.match(
      await page.locator(".mw-divider").getAttribute("style"),
      /inset\(0px 0% 0px 0px\)/,
    );
    await page.locator("select[data-job]").selectOption("rope");
    await seek(0);
    const y0 = await page
      .locator(".mw-picture")
      .evaluate((e) => getComputedStyle(e).transform);
    await seek(100);
    const y1 = await page
      .locator(".mw-picture")
      .evaluate((e) => getComputedStyle(e).transform);
    assert.notEqual(y0, y1);
    assert.ok(
      (await page
        .locator(".mw-picture")
        .evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m42)) <
        -100,
    );
    await page.locator("select[data-job]").selectOption("ladder");
    await seek(65);
    await page.locator('[data-setting="side"]').selectOption("right");
    await expect(
      page.locator('[data-stage="ladder"] .margin-worker-drawing>g'),
    ).toHaveAttribute("transform", "translate(760 0) scale(-1 1)");
    await page.locator('button[data-preset="graphite"]').click();
    assert.equal((await settings()).character, "coat");
    assert.equal((await settings()).ink, "#59564f");
    await page.locator(".il-presets summary").click();
    await page.locator("[data-preset-name]").fill("Worker study");
    await page.locator("[data-save]").click();
    await page.locator("[data-reset]").click();
    await page.locator("[data-saved]").selectOption("0");
    assert.equal((await settings()).ink, "#59564f");
    const exportWait = page.waitForEvent("download");
    await page.locator("[data-export-preset]").click();
    const exported = await exportWait;
    await exported.saveAs(`${out}/${name}-preset.json`);
    const saved = JSON.parse(
      await readFile(`${out}/${name}-preset.json`, "utf8"),
    );
    assert.equal(saved.experiment, "little-workers");
    await page.locator("select[data-job]").selectOption("team");
    await seek(0);
    await page.locator(".mw-paper").scrollIntoViewIfNeeded();
    const bounds = await page.locator(".mw-paper").boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.7,
      bounds.y + bounds.height * 0.5,
    );
    await page.mouse.wheel(0, 390);
    await expect
      .poll(() => page.locator(".mw").getAttribute("data-progress"))
      .not.toBe("0");
    const forward = +(await page.locator(".mw").getAttribute("data-progress"));
    await page.mouse.wheel(0, -220);
    await expect
      .poll(
        async () => +(await page.locator(".mw").getAttribute("data-progress")),
      )
      .toBeLessThan(forward);
    await page.locator(".mw-paper").focus();
    const oldScroll = await page
      .locator(".mw-paper")
      .evaluate((e) => e.scrollTop);
    await page.keyboard.press("PageDown");
    await expect
      .poll(() => page.locator(".mw-paper").evaluate((e) => e.scrollTop))
      .toBeGreaterThan(oldScroll);
    await page.locator("[data-autoplay]").click();
    await expect(page.locator("[data-autoplay]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const start = +(await page.locator(".mw").getAttribute("data-progress"));
    await expect
      .poll(
        async () => +(await page.locator(".mw").getAttribute("data-progress")),
      )
      .toBeGreaterThan(start);
    await page.locator("[data-pause]").click();
    await expect(page.locator("[data-autoplay]")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.locator("[data-pause]").click();
    await page.locator('[data-setting="speed"]').evaluate((e) => {
      e.value = ".5";
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.locator("[data-finish]").click();
    await expect(
      page.locator('[data-stage="carry"] .margin-worker-drawing'),
    ).toHaveAttribute("data-progress", "1");
    const downloadWait = page.waitForEvent("download");
    await page.locator("[data-export-source]").click();
    const download = await downloadWait;
    await download.saveAs(`${out}/${name}-source.zip`);
    assert.ok((await readFile(`${out}/${name}-source.zip`)).length > 15000);
    console.log(name + ": desktop interactions passed");
    await page.reload();
    await page.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(page.locator(".mw")).toHaveAttribute("data-ready", "true");
    assert.equal((await settings()).speed, 0.5);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect(page.locator(".mw")).toHaveCount(0);
    // Narrow touch surfaces retain native scrolling and interactive links.
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    phone.on("pageerror", (e) => errors.push(e.message));
    await phone.goto(url);
    await phone.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(phone.locator(".mw")).toHaveAttribute("data-ready", "true");
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.equal(
      await phone
        .locator(".mw-paper")
        .evaluate((e) => getComputedStyle(e).touchAction),
      "pan-y",
    );
    assert.equal(
      await phone
        .locator(".margin-worker-drawing")
        .first()
        .evaluate((e) => getComputedStyle(e).pointerEvents),
      "none",
    );
    assert.ok(
      await phone.locator(".mw-paper").evaluate((e) => {
        const event = new Event("touchmove", {
          bubbles: true,
          cancelable: true,
        });
        e.dispatchEvent(event);
        return !event.defaultPrevented;
      }),
    );
    if (name === "chromium") {
      const cdp = await phone.context().newCDPSession(phone);
      const b = await phone.locator(".mw-paper").boundingBox();
      const x = b.x + b.width / 2,
        y = Math.min(730, b.y + b.height * 0.65);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 6; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: y - i * 35 }],
        });
        await phone.waitForTimeout(25);
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(() => phone.locator(".mw-paper").evaluate((e) => e.scrollTop))
        .toBeGreaterThan(0);
    }
    await phone.locator("select[data-job]").selectOption("paint");
    await setRange(phone.locator("input[data-progress]"), 61);
    await phone
      .locator(".mw")
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
    console.log(name + ": mobile passed");
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(url);
    await reduced.locator("[data-demo]").scrollIntoViewIfNeeded();
    await expect(reduced.locator("[data-lab-host]")).toHaveAttribute(
      "data-running",
      "false",
    );
    await reduced.locator("[data-finish]").click();
    await expect(
      reduced.locator('[data-stage="carry"] .margin-worker-drawing'),
    ).toHaveAttribute("data-progress", "1");
    await reduced.close();
    console.log(name + ": reduced motion passed");
    const plain = await browser.newPage({ javaScriptEnabled: false });
    await plain.goto(url);
    await expect(plain.locator("[data-still]")).toBeVisible();
    await plain.close();
    console.log(name + ": no-JS passed");
    const standalone = await browser.newPage({
      viewport: { width: 1280, height: 1100 },
    });
    standalone.on("pageerror", (e) => errors.push(e.message));
    await standalone.goto(portable + "/example.html");
    await standalone.locator(".impossible-effect").scrollIntoViewIfNeeded();
    await expect(standalone.locator(".mw")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await standalone.locator("select[data-job]").selectOption("carry");
    await setRange(standalone.locator("input[data-progress]"), 100);
    await expect(
      standalone.locator('[data-stage="carry"] .margin-worker-drawing'),
    ).toHaveAttribute("data-progress", "1");
    console.log(name + ": standalone passed");
    await standalone.goto(portable + folder + "/embed-demo.html");
    await expect(standalone.locator(".margin-worker-drawing")).toHaveCount(1);
    await standalone.evaluate(() => scrollTo(0, 1000));
    await expect
      .poll(
        async () =>
          +(await standalone
            .locator(".margin-worker-drawing")
            .getAttribute("data-progress")),
      )
      .toBeGreaterThan(0);
    await standalone.locator("#detach").click();
    await expect(standalone.locator(".margin-worker-drawing")).toHaveCount(0);
    assert.equal(
      await standalone.locator(".divider").evaluate((e) => e.style.cssText),
      "",
    );
    assert.equal(
      await standalone
        .locator(".divider")
        .evaluate((e) => getComputedStyle(e).clipPath),
      "none",
    );
    await standalone.close();
    assert.deepEqual(errors, []);
    await page.close();
    await browser.close();
    console.log(
      `${name}: all five activities, exact reverse drawings, frozen poses, HTML outputs, native wheel and keyboard, mobile touch surface, settings/presets, reduced motion, local restore, standalone source and document attachment, and disposal passed.`,
    );
  }
} finally {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}
