import { webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("test-results/spin-art", { recursive: true });
const browser = await webkit.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1150 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto("http://127.0.0.1:4321/tampa-curated/lab/spin-art/");
  await page.locator("[data-mount]").scrollIntoViewIfNeeded();
  await page.locator(".sa[data-ready=true]").waitFor();
  for (const id of ["flare", "tide", "nocturne"]) {
    await page.locator(`[data-study=${id}]`).click();
    await page.locator(".sa-board").scrollIntoViewIfNeeded();
    await page
      .locator(".sa-board")
      .screenshot({ path: `test-results/spin-art/paint-${id}.png` });
  }
} finally {
  await browser.close();
}
