import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, expect } from "@playwright/test";
const origin = `${process.env.TEST_ORIGIN || "http://127.0.0.1:4321"}${process.env.TEST_BASE ?? "/tampa-curated"}/`;
const output = "test-results/sea-glass";
mkdirSync(output, { recursive: true });
const report = [];

// Compare rendered pixels with the decorative glass layer hidden: changes
// must come from the actual page, not an opaque overlay or a cloned cutout.
async function compare(page, before, after, region) {
  return page.evaluate(
    async ({ before, after, region }) => {
      async function pixels(data) {
        const image = new Image();
        image.src = data;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        return {
          data: ctx.getImageData(0, 0, image.width, image.height).data,
          width: image.width,
          height: image.height,
        };
      }
      const a = await pixels(before),
        b = await pixels(after);
      let inside = 0,
        outside = 0,
        inkBefore = 0,
        inkAfter = 0,
        insideCount = 0,
        outsideCount = 0;
      for (let y = 0; y < a.height; y++)
        for (let x = 0; x < a.width; x++) {
          const i = (y * a.width + x) * 4;
          const changed =
            Math.max(
              ...[0, 1, 2].map((c) => Math.abs(a.data[i + c] - b.data[i + c])),
            ) > 30;
          const within =
            x > region.x &&
            x < region.x + region.width &&
            y > region.y &&
            y < region.y + region.height;
          if (within) {
            if (Math.max(a.data[i], a.data[i + 1], a.data[i + 2]) < 120)
              inkBefore++;
            if (Math.max(b.data[i], b.data[i + 1], b.data[i + 2]) < 120)
              inkAfter++;
            insideCount++;
            if (changed) inside++;
          } else {
            outsideCount++;
            if (changed) outside++;
          }
        }
      return {
        inside: inside / insideCount,
        outside: outside / outsideCount,
        retainedInk: inkAfter / Math.max(1, inkBefore),
      };
    },
    {
      before: `data:image/png;base64,${before.toString("base64")}`,
      after: `data:image/png;base64,${after.toString("base64")}`,
      region,
    },
  );
}
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".cover-main img")).toBeVisible();
  await page.locator(".cover-main img").evaluate((img) => img.decode());
  const count = await page.locator(".page-shell *").count();
  await page.getByRole("button", { name: /^Reading/ }).click();
  await page.getByRole("button", { name: "Sea glass Off" }).click();
  for (const [x, y] of [
    [6, 6],
    [1434, 6],
    [6, 990],
  ]) {
    await page.mouse.move(x, y);
    await expect(page.locator("[data-text-lens]")).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Glass at viewport edges must not create horizontal scrolling",
    );
  }
  await page.mouse.move(580, 510);
  await expect(page.locator("[data-text-lens]")).toBeVisible();
  await expect(page.locator("[data-sea-glass-surface]")).not.toHaveCount(0);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${output}/${name}-photo.png` });
  assert.equal(
    await page.locator(".page-shell *").count(),
    count,
    "No copied page elements",
  );
  const glassBounds = await page.locator("[data-text-lens]").boundingBox();
  const hiddenArt = await page.addStyleTag({
    content: ".reading-lens{visibility:hidden!important}",
  });
  const warped = await page.screenshot();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-sea-glass-surface]")).toHaveCount(0);
  const clear = await page.screenshot({ path: `${output}/${name}-clear.png` });
  writeFileSync(`${output}/${name}-warped.png`, warped);
  const photo = await compare(page, clear, warped, glassBounds);
  assert(
    photo.inside > 0.08,
    `${name}: photo must visibly refract: ${JSON.stringify(photo)}`,
  );
  assert(
    photo.outside < 0.015,
    `${name}: refraction stays local: ${JSON.stringify(photo)}`,
  );
  await hiddenArt.evaluate((e) => e.remove());

  await page.goto(`${origin}issues/001/`);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: /^Reading/ }).click();
  await page.getByRole("button", { name: "Sea glass Off" }).click();
  await page.locator(".editors-letter").scrollIntoViewIfNeeded();
  const paragraph = await page
    .locator(".editors-letter p")
    .first()
    .boundingBox();
  await page.mouse.move(paragraph.x + 200, paragraph.y + 36);
  await expect(page.locator("[data-text-lens]")).toBeVisible();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${output}/${name}-text.png` });
  const textBounds = await page.locator("[data-text-lens]").boundingBox();
  const art = await page.addStyleTag({
    content: ".reading-lens{visibility:hidden!important}",
  });
  const bentText = await page.screenshot();
  await page.keyboard.press("Escape");
  const clearText = await page.screenshot();
  const text = await compare(page, clearText, bentText, textBounds);
  assert(
    text.retainedInk > 0.6,
    `${name}: refracted text must remain painted: ${JSON.stringify(text)}`,
  );
  assert(
    text.inside > 0.025,
    `${name}: live text must bend: ${JSON.stringify(text)}`,
  );
  assert(
    text.outside < 0.015,
    `${name}: text beyond the glass stays intact: ${JSON.stringify(text)}`,
  );
  await art.evaluate((e) => e.remove());

  await page.goto(origin);
  await page.getByRole("button", { name: /^Reading/ }).click();
  await page.getByRole("button", { name: "Sea glass Off" }).click();
  const atlas = page.locator(".neighborhood-atlas");
  await atlas.scrollIntoViewIfNeeded();
  await expect(atlas).toHaveClass(/is-ready/);
  // The same live glass follows scrolling through every moving pop-up spread.
  for (let index = 0; index < 6; index++) {
    await page.locator(".atlas-scroll-track").evaluate(
      (e, index) =>
        scrollTo({
          top:
            e.getBoundingClientRect().top +
            scrollY -
            16 +
            ((e.offsetHeight - innerHeight) * (index + 0.5)) / 6,
          behavior: "instant",
        }),
      index,
    );
    await expect(atlas).toHaveAttribute("data-selected", String(index));
    const r = await page.locator(".atlas-stage").boundingBox();
    await page.mouse.move(r.x + r.width * 0.55, r.y + r.height * 0.5);
    await expect(page.locator("[data-text-lens]")).toBeVisible();
    const heights = await page
      .locator("[data-sea-glass-surface]")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().height));
    assert(
      heights.length > 0 && Math.max(...heights) < 1251,
      "Never filter the full seven-screen track",
    );
  }
  await page.screenshot({ path: `${output}/${name}-atlas.png` });
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-sea-glass-surface]")).toHaveCount(0);
  await expect(page.locator("[data-glass-filters] filter")).toHaveCount(0);
  assert.deepEqual(errors, []);
  report.push({
    name,
    photo,
    text,
    checks:
      "live pixels, local bounds, no cloned content, six moving atlas spreads, cleanup, no runtime errors",
  });
  console.log(name, report.at(-1));
  await browser.close();
}
writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
