import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit, expect } from "@playwright/test";

const base = process.env.TEST_BASE ?? "/tampa-curated";
const href = (path) =>
  `${process.env.TEST_ORIGIN || "http://127.0.0.1:4321"}${base}/${path}`;
const output = "test-results/readability";
await mkdir(output, { recursive: true });
const routes = [
  "",
  "issues/001/",
  "guides/a-first-look/",
  "stories/the-city-now/",
  "people/mara-ellis/",
  "about/",
  "the-list/",
  "credits/",
  "photo-journal/",
];

for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const launcher = page.getByRole("button", { name: /^Reading/ });
  const lens = page.locator("[data-text-lens]");
  await page.goto(href("issues/001/"));
  await page.evaluate(() => document.fonts.ready);
  const body = page.locator(".editors-letter p").first();
  assert.equal(
    await body.evaluate((el) => getComputedStyle(el).fontSize),
    "19px",
  );
  assert.equal(
    await page
      .locator(".reading-note")
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize),
    "16px",
  );
  await launcher.click();
  await expect(
    page.getByRole("radio", { name: "Comfortable", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Original", exact: true }).check();
  assert.equal(
    await body.evaluate((el) => getComputedStyle(el).fontSize),
    "15px",
  );
  await page.getByRole("button", { name: "Sea glass Off" }).click();
  await expect(page.locator("#reading-panel")).toBeHidden();
  await page.locator(".editors-letter").scrollIntoViewIfNeeded();
  const rect = await body.boundingBox();
  await page.mouse.move(rect.x + 140, rect.y + 40);
  await expect(lens).toBeVisible();
  const lensInfo = await lens.evaluate((el) => ({
    pointer: getComputedStyle(el).pointerEvents,
    hidden: el.getAttribute("aria-hidden"),
    inert: el.inert,
    text: el.textContent.trim(),
    interactiveCopies: el.querySelectorAll(
      "a, button, input, img, canvas, script",
    ).length,
  }));
  assert.equal(lensInfo.text, "", "The glass contains no duplicated page text");
  assert.equal(lensInfo.pointer, "none");
  assert.equal(lensInfo.hidden, "true");
  assert.equal(lensInfo.inert, true);
  assert.equal(lensInfo.interactiveCopies, 0);
  await expect(page.locator(".editors-letter")).toHaveAttribute(
    "data-sea-glass-surface",
    "",
  );
  await page.screenshot({ path: `${output}/${name}-lens.png` });
  // The actual link underneath the lens remains clickable, and both settings
  // persist across full page navigation and a reload.
  const guides = page
    .getByRole("navigation", { name: "Explore the edition" })
    .getByRole("link", { name: "Reading guides" });
  await guides.scrollIntoViewIfNeeded();
  await guides.focus();
  // WebKit follows macOS's default: Option-Tab includes links in tab order.
  await page.keyboard.press(name === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
  await page.keyboard.press(name === "webkit" ? "Alt+Tab" : "Tab");
  await expect(guides).toBeFocused();
  await expect(lens).toBeVisible();
  await expect(page.locator("[data-sea-glass-surface]")).not.toHaveCount(0);
  await guides.hover();
  await expect(lens).toBeVisible();
  await guides.click();
  await expect(page).toHaveURL(href("guides/"));
  await page.reload();
  assert.equal(
    await page.locator("html").getAttribute("data-reading-size"),
    "original",
  );
  await expect(launcher).toContainText("Glass on");
  await page.keyboard.press("Escape");
  await expect(lens).toBeHidden();
  await expect(page.locator(".reading-lens-indicator")).toBeHidden();
  await launcher.click();
  await page.getByRole("radio", { name: "Comfortable", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(launcher).toBeFocused();

  let checks = 0;
  for (const width of [1440, 768, 594, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(href(route));
      await page.evaluate(() => document.fonts.ready);
      for (const size of [16, 32]) {
        // Exercise 200% text-only enlargement as well as viewport reflow.
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = `${size}px`;
        }, size);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${name}: overflow at ${width}px /${route}, text ${size / 16}×`,
        );
        if (!route) {
          for (const selector of [".hero-name", ".hero-editorial", ".engraved-copy"]) {
            assert.ok(
              await page.locator(selector).evaluateAll((elements) => elements.every(el => {
                const copy = el.getBoundingClientRect();
                const cover = (el.closest('.clockwork-hero-inner') || el.parentElement).getBoundingClientRect();
                return copy.top >= cover.top - 1 && copy.bottom <= cover.bottom + 1;
              })),
              `${name}: editorial text is clipped at ${width}px, text ${size / 16}×`,
            );
          }
        }
        checks++;
      }
      if (route === "issues/001/" && width === 390) {
        await page.screenshot({ path: `${output}/${name}-200-percent.png` });
        await launcher.click();
        assert.ok(
          await page
            .locator("#reading-panel")
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          "Preferences reflow with enlarged text",
        );
        await page.keyboard.press("Escape");
      }
    }
  }
  await page.setViewportSize({ width: 594, height: 800 });
  await page.goto(href("issues/001/"));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${output}/${name}-comfortable.png` });

  const touch = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await touch.newPage();
  await touchPage.goto(href("issues/001/"));
  await touchPage.getByRole("button", { name: "Reading", exact: true }).click();
  await expect(
    touchPage.getByRole("button", { name: "Sea glass Off" }),
  ).toBeDisabled();
  await expect(touchPage.locator("[data-reading-lens-help]")).toContainText(
    "pinch to zoom",
  );
  await touch.close();

  const staticContext = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(href("issues/001/"));
  assert.equal(
    await staticPage
      .locator(".editors-letter p")
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize),
    "19px",
  );
  await expect(staticPage.locator("[data-reading-tools]")).toBeHidden();
  await staticContext.close();
  assert.deepEqual(errors, []);
  console.log(
    `${name}: ${checks} responsive/enlarged text checks; original/comfortable preferences; live sea-glass refraction; click through; persistence; Escape/focus; touch; no JavaScript.`,
  );
  await browser.close();
}
