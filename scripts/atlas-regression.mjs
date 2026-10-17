import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, webkit, expect } from "@playwright/test";

const base = process.env.TEST_BASE ?? "/tampa-curated";
const siteUrl = `${process.env.TEST_ORIGIN || "http://127.0.0.1:4321"}${base}/`;
const url = `${siteUrl}${process.env.TEST_PAGE ? process.env.TEST_PAGE+'/' : ''}`;
const dir = `test-results/atlas-fix${process.env.TEST_PAGE ? `-${process.env.TEST_PAGE}` : ""}`;
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

  const assertContained = async (label) => {
    const escaped = await page.locator(".atlas-stage").evaluate((stage) => {
      const bounds = stage.getBoundingClientRect();
      return [...stage.querySelectorAll(
        ".atlas-board:not([hidden]) .atlas-surface, .atlas-board:not([hidden]) .atlas-pop-face",
      )].filter((e) => getComputedStyle(e).visibility === "visible")
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.left < bounds.left - 2 || r.top < bounds.top - 2 ||
            r.right > bounds.right + 2 || r.bottom > bounds.bottom + 2;
        }).map((e) => ({className: e.className, role: e.closest('[data-atlas-role]').dataset.atlasRole,
          leaf:e.closest('.atlas-leaf').className, rect:e.getBoundingClientRect().toJSON(), bounds:bounds.toJSON()}));
    });
    assert.deepEqual(escaped, [], `${name}: ${label} escapes stage`);
  };
  const scrollTurn = async (index, phase) => {
    const position = index + 0.7 + phase * 0.5;
    await scrollSpread(Math.floor(position), position % 1);
    await expect(atlas).toHaveAttribute("data-page-turn", /\d/);
    await expect.poll(async () => Number(await atlas.getAttribute("data-page-turn")))
      .toBeCloseTo(phase, 2);
  };
  const leafGeometry = async () => page.locator(".atlas-stage").evaluate((stage) => {
    const point = (selector, edge) => {
      const face = stage.querySelector(selector);
      const matrix = new DOMMatrix(getComputedStyle(face).transform);
      const p = matrix.transformPoint({x: face.offsetWidth * edge, y: face.offsetHeight / 2});
      return {x: p.x / p.w, y: p.y / p.w};
    };
    return {
      hinge: point('[data-atlas-role="departing"] .atlas-leaf-right > .atlas-surface-front', 0),
      outgoing: point('[data-atlas-role="departing"] .atlas-leaf-right > .atlas-surface-front', 1),
      incoming: point('[data-atlas-role="arriving"] .atlas-leaf-left > .atlas-surface-front', 0),
      oldFront: getComputedStyle(stage.querySelector('[data-atlas-role="departing"] .atlas-leaf-right > .atlas-surface-front')).visibility,
      newFront: getComputedStyle(stage.querySelector('[data-atlas-role="arriving"] .atlas-leaf-left > .atlas-surface-front')).visibility,
      covers: [...stage.querySelectorAll('.atlas-board:not([hidden]) .atlas-surface-back')]
        .map((e) => getComputedStyle(e).visibility),
    };
  });
  // Five actual page turns connect the six existing scenes. Check the moving
  // sheet's edge in screen space, both sides, and the underlying open pages.
  // Stay more than a device pixel inside the turn at both ends. WebKit rounds
  // scroll offsets, so subpixel targets can land on the stationary boundary.
  const turnSamples = [0.005, 0.1, 0.25, 0.5, 0.75, 0.9, 0.995];
  for (let index = 0; index < 6; index++) {
    await scrollSpread(index);
    await expect(atlas).toHaveAttribute("data-progress", "1.000");
    await expect(atlas).toHaveAttribute("data-page-turn", "");
    assert.equal(await page.locator('[data-atlas-board]:visible').count(), 1);
    assert.deepEqual(await paperPose(), openPaper);
    await assertContained(`spread ${index}`);
    if (index === 5) break;
    let previousX = Infinity;
    for (const t of turnSamples) {
      await scrollTurn(index, t);
      assert.equal(await page.locator('[data-atlas-board]:visible').count(), 2);
      assert.equal(await page.locator('[data-atlas-caption]:visible').count(), 1);
      await expect(atlas).toHaveAttribute("data-open", "true");
      const geometry = await leafGeometry();
      const relativeX = geometry.outgoing.x - geometry.hinge.x;
      // Perspective briefly enlarges the near edge as it first lifts. Once
      // upright, it must cross the spine and settle on the left-hand stack.
      if (t >= 0.25 && t <= 0.9)
        assert(relativeX < previousX, `${name}: turn ${index} at ${t}, page edge ${relativeX} must travel left from ${previousX}`);
      previousX = relativeX;
      assert(Math.hypot(geometry.incoming.x - geometry.outgoing.x,
        geometry.incoming.y - geometry.outgoing.y) < 8,
        `${name}: two sides of the turning sheet must stay joined`);
      assert(geometry.covers.every((visibility) => visibility === "hidden"),
        `${name}: exterior covers must not appear during a page turn`);
      if (t === 0.1) {
        assert(relativeX > 200);
        assert.equal(geometry.oldFront, "visible");
        assert.equal(geometry.newFront, "hidden");
      }
      if (t === 0.9) {
        assert(relativeX < -200);
        assert.equal(geometry.oldFront, "hidden");
        assert.equal(geometry.newFront, "visible");
      }
      await assertContained(`turn ${index} at ${t}`);
      if (index === 0)
        await page.screenshot({path: `${dir}/${name}-page-turn-${t}.png`});
    }
  }
  // Scrolling upward moves the same sheet back from left to right.
  for (let index = 4; index >= 0; index--) {
    let previousX = -Infinity;
    for (const t of [0.9, 0.5, 0.1]) {
      await scrollTurn(index, t);
      const geometry = await leafGeometry();
      const relativeX = geometry.outgoing.x - geometry.hinge.x;
      assert(relativeX > previousX, `${name}: reverse page edge moves right`);
      previousX = relativeX;
    }
    await scrollSpread(index);
    await expect(atlas).toHaveAttribute("data-progress", "1.000");
    await expect(page.locator("[data-atlas-counter]")).toHaveText(`0${index + 1} / 06`);
  }
  // Paint probes catch compositor/stacking failures that matrices alone miss:
  // the outgoing front and incoming reverse must each occlude the sheet below.
  const paperProbe = await page.addStyleTag({content: `
    .atlas-pop-face,.atlas-pop-back,.atlas-spine,.atlas-surface>*{visibility:hidden!important}
    [data-atlas-role="departing"] .atlas-leaf-right>.atlas-surface-front{background:#ff00ff!important}
    [data-atlas-role="arriving"] .atlas-leaf-left>.atlas-surface-front{background:#00ffff!important}
    [data-atlas-role="arriving"] .atlas-leaf-right>.atlas-surface-front{background:#00ff00!important}
    [data-atlas-role="departing"] .atlas-leaf-left>.atlas-surface-front{background:#ffff00!important}
  `});
  const paintedTurns = [];
  for (const t of [0.25, 0.75]) {
    await scrollTurn(0, t);
    const screenshot = await page.locator('.atlas-stage').screenshot();
    const colors = await page.evaluate(async (data) => {
      const img = new Image(); img.src = data; await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      const counts = {front:0, reverse:0, underneath:0, left:0};
      for (let i = 0; i < pixels.length; i += 4) {
        const [r,g,b] = pixels.slice(i, i+3);
        if (r > 220 && g < 40 && b > 220) counts.front++;
        if (r < 40 && g > 220 && b > 220) counts.reverse++;
        if (r < 40 && g > 220 && b < 40) counts.underneath++;
        if (r > 220 && g > 220 && b < 40) counts.left++;
      }
      return counts;
    }, `data:image/png;base64,${screenshot.toString('base64')}`);
    assert(colors.underneath > 1000 && colors.left > 1000,
      `${name}: open pages must remain painted below the turning sheet`);
    assert(colors[t < 0.5 ? 'front' : 'reverse'] > 5000,
      `${name}: the turning sheet must paint above the pages underneath`);
    assert.equal(colors[t < 0.5 ? 'reverse' : 'front'], 0,
      `${name}: the opposite face must not paint through the sheet`);
    paintedTurns.push({t, colors});
  }
  await paperProbe.evaluate((e) => e.remove());
  await scrollSpread(0);
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
    for (let index = 0; index < 6; index++) {
      await scrollSpread(index);
      await assertContained(`${width}px spread ${index}`);
      if (index < 5) for (const t of [0.1, 0.5, 0.9]) {
        await scrollTurn(index, t);
        await assertContained(`${width}px turn ${index} at ${t}`);
      }
    }
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
  await page.getByRole("button", { name: "Previous spread" }).click();
  await expect(atlas).toHaveAttribute("data-page-turn", /\d/);
  await expect(atlas).toHaveAttribute("data-selected", "4");
  await expect(atlas).toHaveAttribute("data-page-turn", "");
  await page.getByRole("button", { name: "Next spread" }).click();
  await expect(atlas).toHaveAttribute("data-page-turn", /\d/);
  await expect(atlas).toHaveAttribute("data-selected", "5");
  await expect(atlas).toHaveAttribute("data-page-turn", "");
  await page.getByRole("button", { name: "Reduced", exact: true }).click();
  await expect(atlas).toHaveAttribute("data-progress", "1.000");
  await expect(page.locator(".atlas-toggle")).toBeHidden();
  await page.locator('[data-atlas-select="3"]').click();
  await page.locator('[data-atlas-caption="3"] .text-link').click();
  await expect(page).toHaveURL(`${siteUrl}neighborhoods/downtown/`);
  await page.goBack();
  await expect(atlas).toHaveAttribute("data-selected", "3");
  assert.deepEqual(errors, []);
  report.push({
    browser: name,
    paintedPhoto: painted,
    neighborhoods: 6,
    pageTurns: 5,
    turnSamples,
    rightToLeft: true,
    paintedTurns,
    widths: [1440, 594, 390, 320, 844],
    errors,
  });
  await context.close();
  await browser.close();
  console.log(
    `${name}: five right-to-left page turns through six pop-up scenes, reverse scrolling, visible 3D photo, fold containment, page controls, keyboard, exit, phone layouts, reduced motion and history passed.`,
  );
}
writeFileSync(`${dir}/regression.json`, JSON.stringify(report, null, 2));
