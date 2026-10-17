import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, firefox, expect } from "@playwright/test";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321";
const base = (process.env.TEST_BASE ?? "/tampa-curated").replace(/\/$/, "");
const href = (path) => `${origin}${base}/${path}`;
const directory = `test-results/mechanical-${base ? "base" : "root"}`;
mkdirSync(directory, { recursive: true });
const report = {
  base: base || "/",
  browsers: [],
  checks: [],
  conditions:
    "Local macOS; Playwright automation, not physical Safari/iOS. No CPU/network throttling.",
};
const scrollTo = (page, selector, offset = -20) =>
  page.locator(selector).evaluate(
    (element, offset) =>
      window.scrollTo({
        top: element.getBoundingClientRect().top + scrollY + offset,
        behavior: "instant",
      }),
    offset,
  );
const pause = (page) => page.waitForTimeout(450);
const capture = (page, name) =>
  page.screenshot({ path: `${directory}/${name}.png` });
const subset = process.env.TEST_BROWSER
  ? process.env.TEST_BROWSER.split(",")
  : ["chromium", "webkit", "firefox"];

for (const name of subset) {
  let browser;
  try {
    browser = await { chromium, webkit, firefox }[name].launch();
  } catch (error) {
    if (name !== "firefox") throw error;
    report.browsers.push({
      name,
      status: "unavailable",
      reason: error.message.split("Call log:")[0],
    });
    console.log(
      "Firefox could not launch in this environment; recorded as unverified.",
    );
    continue;
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo:
      name === "chromium"
        ? { dir: `${directory}/video`, size: { width: 1440, height: 900 } }
        : undefined,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const transitionEvents = [];
    Reflect.set(window, "__transitionEvents", transitionEvents);
    window.addEventListener("pagereveal", (event) => {
      if (event.viewTransition)
        event.viewTransition.ready.then(
          () =>
            transitionEvents.push({
              type: "ready",
              names: document.querySelectorAll("[data-transition-active]")
                .length,
            }),
          () => transitionEvents.push({ type: "skipped" }),
        );
    });
  });
  await page.goto(href(""));
  await page.evaluate(() => document.fonts.ready);
  const earlyScripts = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((x) => /\.js($|\?)/.test(x.name))
      .map((x) => x.name.split("/").at(-1)),
  );
  assert(
    !earlyScripts.some((x) => x.startsWith("sleeve-optics.")),
    "Optics must not load with the hero",
  );
  await capture(page, `${name}-cover`);
  await scrollTo(page, ".editorial-worktable", -420);
  await pause(page);
  const before = await page
    .locator(".editorial-worktable")
    .getAttribute("data-progress");
  await scrollTo(page, ".editorial-worktable", 250);
  await pause(page);
  const after = await page
    .locator(".editorial-worktable")
    .getAttribute("data-progress");
  assert(Number(after) > Number(before), "Worktable follows forward scroll");
  await scrollTo(page, ".editorial-worktable", -420);
  await pause(page);
  assert(
    Math.abs(
      Number(
        await page
          .locator(".editorial-worktable")
          .getAttribute("data-progress"),
      ) - Number(before),
    ) < 0.01,
    "Worktable reverses to its absolute position",
  );
  await scrollTo(page, ".editorial-worktable");
  await pause(page);
  await capture(page, `${name}-worktable`);
  await scrollTo(page, ".photographic-sleeve");
  await expect(page.locator(".photographic-sleeve")).toHaveClass(/is-ready/);
  await page.waitForTimeout(950);
  await capture(page, `${name}-sleeve-01`);
  const sleeve = page.locator(".photographic-sleeve");
  const stage = page.locator(".sleeve-stage");
  const renderer = await sleeve.getAttribute("data-renderer");
  const calibration = await stage.getAttribute("data-optics-calibration");
  const initialFrames = await stage.getAttribute("data-optics-frames");
  await page.waitForTimeout(250);
  assert.equal(
    await stage.getAttribute("data-optics-frames"),
    initialFrames,
    "No idle optical renders",
  );
  await page.getByRole("button", { name: "Next portrait" }).click();
  await expect(sleeve).toHaveAttribute("data-selected", "1");
  await expect(page.locator('[data-caption="1"]')).toBeVisible();
  await stage.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sleeve).toHaveAttribute("data-selected", "2");
  await page.locator('[data-sleeve-select="0"]').click();
  await expect(sleeve).toHaveAttribute("data-selected", "0");
  await scrollTo(page, ".sleeve-stage", -60);
  await pause(page);
  const bounds = await stage.boundingBox();
  const printWidth = await page
    .locator('[data-print="0"]')
    .evaluate((e) => e.offsetWidth);
  const start = {
    x: bounds.x + bounds.width * 0.52,
    y: bounds.y + bounds.height * 0.5,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const fraction of [0.22, 0.5, 0.8]) {
    await page.mouse.move(start.x - printWidth * 0.84 * fraction, start.y + 2, {
      steps: 8,
    });
    await page.waitForTimeout(70);
    assert.equal(
      await sleeve.getAttribute("data-selected"),
      "0",
      "Caption stays stable until release",
    );
    const alignment = await page.evaluate(() =>
      [...document.querySelectorAll("[data-print]")].every(
        (element, i) =>
          element.style.transform ===
          document.querySelector(`[data-copy="${i}"]`).style.transform,
      ),
    );
    assert(alignment, "Clear and treated copies use identical transforms");
    await capture(page, `${name}-sleeve-drag-${fraction}`);
  }
  await page.mouse.up();
  await expect(sleeve).toHaveAttribute("data-selected", "1");
  await stage.dispatchEvent("pointerdown", {
    pointerId: 73,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: start.x,
    clientY: start.y,
  });
  await stage.dispatchEvent("pointercancel", {
    pointerId: 73,
    pointerType: "touch",
    isPrimary: true,
  });
  await pause(page);
  await expect(stage).not.toHaveClass(/is-dragging/);
  assert(
    Number((await stage.getAttribute("data-texture-count")) || 0) <= 3,
    "At most three optical textures",
  );
  await page.locator('[data-caption="1"] a').click();
  await expect(page).toHaveURL(href("people/julian-reyes/"));
  await pause(page);
  const transitions = await page.evaluate(() =>
    Reflect.get(window, "__transitionEvents"),
  );
  await expect(page.locator("h1")).toContainText("Julian Reyes");
  await page.reload();
  await expect(page.locator("h1")).toContainText("Julian Reyes");
  await page.goBack();
  await expect(sleeve).toHaveAttribute("data-selected", "1");
  assert(
    (await page.evaluate(() => scrollY)) > 500,
    "Back navigation restores a meaningful scroll position",
  );
  await scrollTo(page, ".atlas-scroll-track", -16);
  await pause(page);
  const atlas = page.locator(".neighborhood-atlas");
  await expect(atlas).toHaveClass(/is-pinned/);
  await capture(page, `${name}-atlas-folded`);
  const closed = Number(await atlas.getAttribute("data-progress"));
  await scrollTo(page, ".atlas-scroll-track", 80);
  await pause(page);
  const partial = Number(await atlas.getAttribute("data-progress"));
  assert(partial > closed && partial < 1, "Partial atlas progress is visible");
  await capture(page, `${name}-atlas-partial`);
  await scrollTo(page, ".atlas-scroll-track", 430);
  await pause(page);
  assert(
    Number(await atlas.getAttribute("data-progress")) > 0.9,
    "Atlas unfolds fully",
  );
  await capture(page, `${name}-atlas-open`);
  for (let i = 0; i < 6; i++) {
    await page.locator(`[data-atlas-select="${i}"]`).click();
    await expect(page.locator(`[data-atlas-caption="${i}"]`)).toBeVisible();
    assert.equal(await page.locator("[data-atlas-board]:visible").count(), 1);
  }
  await page.locator('[data-atlas-caption="5"] a').click();
  await expect(page).toHaveURL(href("neighborhoods/water-street/"));
  await page.goBack();
  await expect(atlas).toHaveAttribute("data-selected", "5");
  await scrollTo(page, ".atlas-scroll-track", 80);
  await pause(page);
  assert(
    Math.abs(Number(await atlas.getAttribute("data-progress")) - partial) <
      0.02,
    "Atlas reverses without replay",
  );
  await page.locator('[data-motion="reduced"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(atlas).not.toHaveClass(/is-pinned/);
  await expect(sleeve).toHaveAttribute("data-renderer", "dom");
  await scrollTo(page, ".photographic-sleeve");
  await page.locator('[data-sleeve-select="4"]').click();
  await expect(sleeve).toHaveAttribute("data-selected", "4");
  await capture(page, `${name}-reduced`);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await page.locator('[data-motion="system"]').click();
  assert.deepEqual(errors, [], `${name} runtime errors`);
  report.browsers.push({
    name,
    version: browser.version(),
    renderer,
    calibration: calibration ? JSON.parse(calibration) : null,
    earlyScripts,
    transitions,
    errors,
  });
  writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await context.close();
  // A fresh context prevents stored choices from masking the system preference.
  const reducedContext = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(href(""));
  await scrollTo(reducedPage, ".neighborhood-atlas");
  await pause(reducedPage);
  assert(
    !(
      await reducedPage.locator(".neighborhood-atlas").getAttribute("class")
    ).includes("is-pinned"),
  );
  assert.equal(
    await reducedPage
      .locator(".neighborhood-atlas")
      .getAttribute("data-progress"),
    "1.000",
  );
  assert.equal(await reducedPage.locator("canvas").count(), 0);
  await reducedContext.close();
  const staticContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(href(""));
  assert.equal(
    await staticPage.locator(".sleeve-caption:visible a").count(),
    5,
  );
  assert.equal(await staticPage.locator(".atlas-caption:visible a").count(), 6);
  await scrollTo(staticPage, ".photographic-sleeve");
  await capture(staticPage, `${name}-no-js`);
  await staticPage.locator(".sleeve-caption a").first().click();
  await expect(staticPage).toHaveURL(href("people/mara-ellis/"));
  await staticContext.close();
  const fallbackContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : original.call(this, type, ...args);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto(href(""));
  await scrollTo(fallbackPage, ".photographic-sleeve");
  await fallbackPage.waitForTimeout(750);
  await expect(fallbackPage.locator(".photographic-sleeve")).toHaveAttribute(
    "data-renderer",
    "dom",
  );
  await fallbackPage.getByRole("button", { name: "Next portrait" }).click();
  await expect(fallbackPage.locator(".photographic-sleeve")).toHaveAttribute(
    "data-selected",
    "1",
  );
  await capture(fallbackPage, `${name}-no-webgl`);
  await fallbackContext.close();
  console.log(
    `${name}: scroll/reverse, partial drag, keyboard, controls, profiles, guides, history, reduced motion, no JS, no WebGL passed.`,
  );
  await browser.close();
}

// Layout captures at the requested desktop/tablet/mobile dimensions.
if (subset.includes("chromium")) {
  const browser = await chromium.launch();
  for (const [width, height] of [
    [1440, 900],
    [1536, 960],
    [768, 1024],
    [390, 844],
    [375, 667],
    [844, 390],
    [720, 450],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 800,
    });
    const page = await context.newPage();
    await page.goto(href(""));
    await page.evaluate(() => document.fonts.ready);
    for (const [key, selector] of [
      ["worktable", ".editorial-worktable"],
      ["sleeve", ".photographic-sleeve"],
      ["atlas", ".neighborhood-atlas"],
      ["list", ".list-teaser"],
    ]) {
      await scrollTo(page, selector);
      await pause(page);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width} ${key} horizontal overflow`,
      );
      await capture(page, `${key}-${width}x${height}`);
    }
    if (height < 620) {
      assert(
        !(
          await page.locator(".neighborhood-atlas").getAttribute("class")
        ).includes("is-pinned"),
      );
      await page.locator(".atlas-toggle").click();
      await expect(page.locator(".atlas-toggle")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await page.locator('[data-atlas-select="3"]').click();
      await expect(page.locator('[data-atlas-caption="3"]')).toBeVisible();
      await page.locator(".atlas-toggle").click();
      await expect(page.locator(".atlas-toggle")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    }
    await context.close();
  }
  await browser.close();
}
report.checks.push(
  "Responsive layouts; absolute scroll/reverse; continuous sleeve overlap; stable captions; controls; keyboard; pointercancel; history; system/user reduced motion; no-JS links; no-WebGL controls; bounded textures; idle renderer stop.",
);
writeFileSync(`${directory}/report.json`, JSON.stringify(report, null, 2));
console.log(`Saved report and captures to ${directory}`);
