import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, expect } from "@playwright/test";

const base = process.env.TEST_BASE ?? "/tampa-curated";
const url = `${process.env.TEST_ORIGIN || "http://127.0.0.1:4321"}${base}/`;
const dir = "test-results/atlas-fix";
mkdirSync(dir, { recursive: true });
const report = [];
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const atlas = page.locator(".neighborhood-atlas");
  await atlas.evaluate((e) =>
    scrollTo({
      top: e.getBoundingClientRect().top + scrollY - 16,
      behavior: "instant",
    }),
  );
  await expect(atlas).toHaveClass(/is-ready/);
  await expect(atlas).toHaveClass(/is-pinned/);
  const scrollSpread = async (index, phase = 0.5) => {
    await page.locator(".atlas-scroll-track").evaluate(
      (track, { index, phase }) => {
        scrollTo({
          top:
            track.getBoundingClientRect().top +
            scrollY -
            16 +
            ((track.offsetHeight - innerHeight) * (index + phase)) / 6,
          behavior: "instant",
        });
      },
      { index, phase },
    );
    await expect(atlas).toHaveAttribute("data-selected", String(index));
  };
  await scrollSpread(0);
  await expect
    .poll(async () => Number(await atlas.getAttribute("data-progress")))
    .toBeGreaterThan(0.99);
  const paperPose = () =>
    page.locator(".atlas-board:not([hidden])").evaluate((board) => ({
      transforms: [...board.querySelectorAll(".atlas-spine, .atlas-surface-front")]
        .map((plane) => getComputedStyle(plane).transform),
      backVisibility: [...board.querySelectorAll(".atlas-surface-back")]
        .map((plane) => getComputedStyle(plane).visibility),
    }));
  const openPaper = await paperPose();
  assert.deepEqual(openPaper.backVisibility, ["hidden", "hidden"]);
  await page.screenshot({ path: `${dir}/${name}-open.png` });

  // Measure painted pixels, not just CSS matrices: WebKit reported correct
  // bounding boxes even while its screenshot flattened the photo to a strip.
  const probe = await page.addStyleTag({
    content:
      ".atlas-photo{background:#ff00ff!important}.atlas-photo>*{visibility:hidden!important}",
  });
  const png = await page.locator(".atlas-stage").screenshot();
  const painted = await page.evaluate(
    async (data) => {
      const image = new Image();
      image.src = data;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0,
        minY = Infinity,
        maxY = -Infinity;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (pixels[i] > 200 && pixels[i + 1] < 90 && pixels[i + 2] > 180) {
            count++;
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      return { count, height: maxY - minY + 1 };
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  await probe.evaluate((e) => e.remove());
  assert(
    painted.height > 130 && painted.count > 18000,
    `${name}: photograph must paint as an upright plane, not a flattened strip (${JSON.stringify(painted)})`,
  );

  // The pages and camera must stay still through every chapter. Only the
  // pop-up pieces fold, and they must stay clear of captions and controls.
  for (let index = 0; index < 6; index++) {
    const popUpPoses = [];
    for (const [phase, progress] of [
      [0.001, 0],
      [0.11, 0.5],
      [0.22, 1],
      [0.5, 1],
      [0.89, index === 5 ? 1 : 0.5],
      [0.999, index === 5 ? 1 : 0],
    ]) {
      await scrollSpread(index, phase);
      await expect(
        page.locator(`[data-atlas-caption="${index}"]`),
      ).toBeVisible();
      assert.equal(await page.locator("[data-atlas-board]:visible").count(), 1);
      await expect
        .poll(async () => Number(await atlas.getAttribute("data-progress")))
        .toBeCloseTo(progress, 1);
      assert.deepEqual(
        await paperPose(),
        openPaper,
        `${name}: book must remain open and stationary at chapter ${index}, phase ${phase}`,
      );
      await expect(atlas).toHaveAttribute("data-open", "true");
      if (phase < 0.5)
        popUpPoses.push(await page.locator(".atlas-board:not([hidden])")
          .evaluate((board) => [
            ".atlas-hinge-sign .atlas-pop-face",
            ".atlas-hinge-photo .atlas-pop-face",
          ].map((selector) => getComputedStyle(board.querySelector(selector)).transform)));
      const escaped = await page.locator(".atlas-stage").evaluate((stage) => {
        const bounds = stage.getBoundingClientRect();
        return [
          ...stage.querySelectorAll(
            ".atlas-board:not([hidden]) .atlas-surface,.atlas-board:not([hidden]) .atlas-pop-face",
          ),
        ]
          .filter((e) => getComputedStyle(e).visibility === "visible")
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.left < bounds.left - 2 ||
              r.top < bounds.top - 2 ||
              r.right > bounds.right + 2 ||
              r.bottom > bounds.bottom + 2
            );
          })
          .map((e) => e.className);
      });
      assert.deepEqual(
        escaped,
        [],
        `${name}: ${index} at ${progress} escapes stage`,
      );
      if (index === 0)
        await page.screenshot({ path: `${dir}/${name}-fold-${progress}.png` });
    }
    for (let side = 0; side < 2; side++)
      assert.equal(
        new Set(popUpPoses.map((pose) => pose[side])).size,
        3,
        `${name}: chapter ${index}, side ${side} must rise through flat, halfway and upright poses`,
      );
  }
  // Reversing the native scroll visits the same six scenes in reverse.
  for (let index = 5; index >= 0; index--) {
    await scrollSpread(index);
    await expect(atlas).toHaveAttribute("data-progress", "1.000");
    assert.deepEqual(await paperPose(), openPaper);
    await expect(page.locator("[data-atlas-counter]")).toHaveText(
      `0${index + 1} / 06`,
    );
  }
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(atlas).toHaveAttribute("data-selected", "1");
  await page.getByRole("button", { name: "Previous spread" }).click();
  await expect(atlas).toHaveAttribute("data-selected", "0");
  await page.locator(".atlas-stage").focus();
  await page.keyboard.press("End");
  await expect(atlas).toHaveAttribute("data-selected", "5");
  await page.keyboard.press("Home");
  await expect(atlas).toHaveAttribute("data-selected", "0");
  await page.getByLabel("Jump to a spread").selectOption("3");
  await expect(atlas).toHaveAttribute("data-selected", "3");
  await page.getByRole("link", { name: "Continue below" }).click();
  await expect
    .poll(() =>
      page
        .locator(".list-teaser")
        .evaluate((el) => el.getBoundingClientRect().top),
    )
    .toBeLessThan(150);

  for (const [width, height] of [
    [594, 650],
    [390, 844],
    [320, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(atlas).toHaveClass(/is-pinned/);
    for (let index = 0; index < 6; index++) await scrollSpread(index);
    const fits = await page.locator(".atlas-sticky").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    });
    assert(fits, `${name}: the complete book reader fits ${width}×${height}`);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({ path: `${dir}/${name}-${width}-scrolling.png` });
  }
  // Short windows keep manual controls instead of pinning an oversized reader.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(atlas).not.toHaveClass(/is-pinned/);
  await page.getByRole("button", { name: "Close atlas" }).click();
  await expect(atlas).toHaveAttribute("data-progress", "0.000");
  await page.getByRole("button", { name: "Open atlas" }).click();
  await expect(atlas).toHaveAttribute("data-progress", "1.000");
  await page.getByRole("button", { name: "Reduced", exact: true }).click();
  await expect(atlas).toHaveAttribute("data-progress", "1.000");
  await expect(page.locator(".atlas-toggle")).toBeHidden();
  await page.locator('[data-atlas-select="3"]').click();
  await page.locator('[data-atlas-caption="3"] .text-link').click();
  await expect(page).toHaveURL(`${url}neighborhoods/downtown/`);
  await page.goBack();
  await expect(atlas).toHaveAttribute("data-selected", "3");
  assert.deepEqual(errors, []);
  report.push({
    browser: name,
    paintedPhoto: painted,
    neighborhoods: 6,
    popUpStates: 6,
    stationaryOpenPages: true,
    widths: [1440, 594, 390, 320, 844],
    errors,
  });
  await context.close();
  await browser.close();
  console.log(
    `${name}: six sequential pop-ups with stationary open pages, reverse scrolling, visible 3D photo, fold containment, page controls, keyboard, exit, phone layouts, reduced motion and history passed.`,
  );
}
writeFileSync(`${dir}/regression.json`, JSON.stringify(report, null, 2));
