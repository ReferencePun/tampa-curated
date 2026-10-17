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
  await expect(page.getByRole("button", { name: "Open atlas" })).toBeVisible();
  await page.getByRole("button", { name: "Open atlas" }).click();
  await expect
    .poll(async () => Number(await atlas.getAttribute("data-progress")))
    .toBeGreaterThan(0.99);
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

  // Select every coordinated scene and inspect the full folding path. Paper
  // must stay inside its stage, so no leaf can cross captions or the selector.
  const top = await atlas.evaluate(
    (e) => e.getBoundingClientRect().top + scrollY,
  );
  const travel = await atlas.evaluate((e) => e.offsetHeight - innerHeight);
  for (let index = 0; index < 6; index++) {
    await page.locator(`[data-atlas-select="${index}"]`).click();
    await expect(page.locator(`[data-atlas-caption="${index}"]`)).toBeVisible();
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: "instant" }),
        top - 16 + travel * progress,
      );
      await expect
        .poll(async () => Number(await atlas.getAttribute("data-progress")))
        .toBeCloseTo(progress, 1);
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
  }
  await page.getByRole("button", { name: "Close atlas" }).click();
  await expect
    .poll(async () => Number(await atlas.getAttribute("data-progress")))
    .toBeLessThan(0.01);
  await page.screenshot({ path: `${dir}/${name}-closed.png` });
  for (const [width, height] of [
    [594, 650],
    [390, 844],
    [375, 667],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(atlas).not.toHaveClass(/is-pinned/);
    await page.getByRole("button", { name: "Open atlas" }).click();
    await expect(atlas).toHaveAttribute("data-progress", "1.000");
    await page
      .locator(".atlas-stage")
      .screenshot({ path: `${dir}/${name}-${width}-open.png` });
    // Reversing during the fold must settle at the latest requested state.
    await page.getByRole("button", { name: "Close atlas" }).click();
    await page.getByRole("button", { name: "Open atlas" }).click();
    await expect(atlas).toHaveAttribute("data-progress", "1.000");
    await page.getByRole("button", { name: "Close atlas" }).click();
    await expect(atlas).toHaveAttribute("data-progress", "0.000");
    await page
      .locator(".atlas-stage")
      .screenshot({ path: `${dir}/${name}-${width}-closed.png` });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
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
    foldStates: 5,
    widths: [1440, 594, 390, 375, 844],
    errors,
  });
  await context.close();
  await browser.close();
  console.log(
    `${name}: visible 3D photo, cover controls, fold containment, all neighborhoods, interruption, resize, reduced motion and history passed.`,
  );
}
writeFileSync(`${dir}/regression.json`, JSON.stringify(report, null, 2));
