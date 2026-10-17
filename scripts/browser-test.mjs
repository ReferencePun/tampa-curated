import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4321";
const base = (process.env.TEST_BASE || "").replace(/\/$/, "");
const href = (path) => `${origin}${base}/${path}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().startsWith(origin))
    errors.push(`${response.status()} ${response.url()}`);
});
await mkdir("test-results", { recursive: true });
const pages = [
  "",
  "home2/",
  "home3/",
  "unfinished-city/",
  "experiments/",
  "experiments/cabinet/",
  "experiments/tracing-city/",
  "experiments/notebook/",
  "the-list/",
  "search/",
  "stories/the-city-now/",
  "people/mara-ellis/",
  "neighborhoods/ybor-city/",
  "places/palmetto-table/",
  "about/",
  "issues/",
  "issues/001/",
  "guides/",
  "guides/a-first-look/",
  "guides/after-dark/",
  "guides/creative-tampa/",
  "photo-journal/",
];
for (const width of [1600, 1440, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const route of pages) {
    await page.goto(href(route));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `Horizontal overflow ${width}px /${route}`);
    const broken = await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs
          .filter((img) => img.complete && !img.naturalWidth)
          .map((img) => img.src),
      );
    assert.deepEqual(broken, [], `Broken images ${route}`);
    if (!route || route === "home2/" || route === "home3/") {
      const illustrated = route === "home2/" || route === "home3/";
      assert.equal(await page.locator("body.engraved").count(), illustrated ? 1 : 0, "Each homepage keeps its own visual edition");
      assert.equal(await page.locator(".cover").count(), illustrated ? 0 : 1, "The original cover belongs to Home");
      assert.equal(await page.locator("[data-machine]").count(), illustrated ? 5 : 0, "Clockwork scenes belong to the illustrated editions");
      assert.equal(await page.locator(".tampa-fieldnotes").count(), illustrated ? 1 : 0, "Tampa studies stay on the illustrated editions");
      const coverTextFits = await page
        .locator(illustrated ? ".hero-editorial" : ".cover-main-copy .cover-label")
        .evaluate((el) => {
          const cover = el.closest(".clockwork-hero-inner, .cover-main");
          return (
            !!cover &&
            el.getBoundingClientRect().bottom <=
              cover.getBoundingClientRect().bottom + 1
          );
        });
      assert.equal(coverTextFits, true, `Hero introduction clipped at ${width}px`);
      await page.locator("img").evaluateAll((imgs) =>
        Promise.all(
          imgs.map(async (img) => {
            img.loading = "eager";
            await img.decode();
          }),
        ),
      );
      await page.screenshot({
        path: `test-results/${illustrated ? route.slice(0, -1) : "home"}-${width}.png`,
        fullPage: true,
      });
    }
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(href(""));
const toggle = page.getByRole("button", { name: "Menu" });
await toggle.click();
assert.equal(await toggle.getAttribute("aria-expanded"), "true");
assert.equal(
  await page.getByRole("navigation", { name: "Mobile navigation" }).isVisible(),
  true,
);
await page.keyboard.press("Escape");
assert.equal(await toggle.getAttribute("aria-expanded"), "false");
assert.equal(
  await toggle.evaluate((el) => el === document.activeElement),
  true,
);
await toggle.click();
await page
  .getByRole("navigation", { name: "Mobile navigation" })
  .getByRole("link", { name: "05 The List" })
  .click();
await page.waitForURL(href("the-list/"));
const places = page.locator("[data-place]:visible");
assert.equal(await places.count(), 8);
await page.getByLabel("CATEGORY", { exact: true }).selectOption("Coffee");
assert.equal(await places.count(), 1);
assert.match(await places.first().innerText(), /Stillwater Coffee/i);
await page
  .getByLabel("NEIGHBORHOOD", { exact: true })
  .selectOption("ybor-city");
assert.equal(await places.count(), 0);
assert.equal(await page.locator("#empty-places").isVisible(), true);
await page.getByRole("button", { name: "Clear all filters" }).click();
await page.waitForTimeout(20);
assert.equal(await places.count(), 8);
await page.getByLabel("FIND A PLACE").fill("palmetto");
assert.equal(await places.count(), 1);
await page.reload();
assert.equal(await places.count(), 1);
assert.equal(await page.getByLabel("FIND A PLACE").inputValue(), "palmetto");
await page.goto(href("the-list/?category=Shopping"));
assert.equal(await places.count(), 1);
assert.match(await places.first().innerText(), /Common Form/i);
await page.goto(href("the-list/?neighborhood=ybor-city"));
assert.equal(await places.count(), 2);
await page.goto(href("search/?q=ybor"));
assert.ok((await page.locator("[data-search]:visible").count()) > 0);
await page.getByLabel("SEARCH THE PUBLICATION").fill("NoSuchTampaPlaceXYZ");
assert.equal(await page.locator("[data-search]:visible").count(), 0);
assert.equal(await page.locator("#search-empty").isVisible(), true);
await page.getByRole("button", { name: "Show the full index" }).click();
assert.equal(await page.locator("[data-search]:visible").count(), 32);
await page.getByLabel("SEARCH THE PUBLICATION").fill("Mara Ellis");
await page.getByRole("button", { name: "Search", exact: true }).click();
assert.ok(await page.getByRole("link", { name: "Mara Ellis ↗" }).isVisible());
await page.reload();
assert.equal(
  await page.getByLabel("SEARCH THE PUBLICATION").inputValue(),
  "Mara Ellis",
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto(href(""));
assert.equal(
  await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  ),
  "auto",
);
const noJS = await browser.newContext({
  javaScriptEnabled: false,
  viewport: { width: 390, height: 844 },
});
const staticPage = await noJS.newPage();
await staticPage.goto(href("the-list/"));
assert.equal(await staticPage.locator("[data-place]").count(), 8);
assert.equal(await staticPage.locator("noscript").isVisible(), true);
await noJS.close();
assert.deepEqual(errors, [], `Browser errors:\n${errors.join("\n")}`);
console.log(
  `Passed: ${pages.length * 4} responsive page checks; 12 homepage screenshots; menu and Escape/focus; category + neighborhood + name filtering; empty/reset and URL persistence; search; reduced motion; no-JS directory. Base: ${base || "/"}.`,
);
await browser.close();
