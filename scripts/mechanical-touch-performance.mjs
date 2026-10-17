import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const b = await chromium.launch();
const context = await b.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const p = await context.newPage();
await p.goto("http://127.0.0.1:4321/tampa-curated/");
await p
  .locator(".sleeve-stage")
  .evaluate((e) =>
    scrollTo({
      top: e.getBoundingClientRect().top + scrollY - 80,
      behavior: "instant",
    }),
  );
await p.waitForTimeout(800);
const cdp = await context.newCDPSession(p);
let y = await p.evaluate(() => scrollY);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: 190, y: 430 }],
});
for (let n = 1; n <= 12; n++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 190, y: 430 - n * 15 }],
  });
  await p.waitForTimeout(16);
}
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await p.waitForTimeout(400);
const verticalDelta = (await p.evaluate(() => scrollY)) - y;
if (verticalDelta < 100) throw Error("Vertical touch did not scroll");
await p
  .locator(".sleeve-stage")
  .evaluate((e) =>
    scrollTo({
      top: e.getBoundingClientRect().top + scrollY - 80,
      behavior: "instant",
    }),
  );
await p.waitForTimeout(200);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: 290, y: 260 }],
});
for (let n = 1; n <= 12; n++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 290 - n * 17, y: 260 }],
  });
  await p.waitForTimeout(16);
}
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await p.waitForTimeout(450);
const touchSelection = await p
  .locator(".photographic-sleeve")
  .getAttribute("data-selected");
if (touchSelection !== "1") throw Error("Swipe did not select next portrait");
await p.screenshot({
  path: "test-results/mechanical-base/touch-swipe-390.png",
});
await cdp.send("Input.synthesizePinchGesture", {
  x: 195,
  y: 260,
  scaleFactor: 1.5,
  relativeSpeed: 400,
  gestureSourceType: "touch",
});
await p.waitForTimeout(250);
const pinchScale = await p.evaluate(() => visualViewport.scale);
if (pinchScale <= 1) throw Error("Pinch zoom did not work");
await context.close();
const desktop = await b.newContext({ viewport: { width: 1440, height: 900 } });
const d = await desktop.newPage();
await d.goto("http://127.0.0.1:4321/tampa-curated/");
await d
  .locator(".neighborhood-atlas")
  .evaluate((e) => scrollTo({ top: e.offsetTop - 20, behavior: "instant" }));
await d.waitForTimeout(1000);
const perf = await d.evaluate(async () => {
  let frames = [],
    longTasks = [];
  let obs = new PerformanceObserver((list) =>
    longTasks.push(
      ...list
        .getEntries()
        .map((e) => ({ start: e.startTime, duration: e.duration })),
    ),
  );
  obs.observe({ type: "longtask" });
  const root = document.querySelector(".neighborhood-atlas"),
    top = root.getBoundingClientRect().top + scrollY;
  let prev = 0;
  const started = performance.now();
  for (let i = 0; i < 180; i++) {
    let t = await new Promise((r) => requestAnimationFrame(r));
    if (prev) frames.push(t - prev);
    prev = t;
    scrollTo({
      top: top + Math.sin((i / 179) * Math.PI) * 880,
      behavior: "instant",
    });
  }
  obs.disconnect();
  frames.sort((a, b) => a - b);
  return {
    samples: frames.length,
    medianMs: frames[Math.floor(frames.length * 0.5)],
    p95Ms: frames[Math.floor(frames.length * 0.95)],
    worstMs: Math.max(...frames),
    over25ms: frames.filter((f) => f > 25).length,
    longTasks: longTasks.filter((t) => t.start >= started),
  };
});
await d
  .locator(".photographic-sleeve")
  .evaluate((e) => scrollTo({ top: e.offsetTop - 20, behavior: "instant" }));
await d.waitForTimeout(950);
let renderer = await d
  .locator(".photographic-sleeve")
  .getAttribute("data-renderer");
let frameCount = await d
  .locator(".sleeve-stage")
  .getAttribute("data-optics-frames");
if (renderer === "webgl") {
  await d
    .locator("canvas")
    .evaluate((e) =>
      e.getContext("webgl").getExtension("WEBGL_lose_context").loseContext(),
    );
  await expect(d.locator(".photographic-sleeve")).toHaveAttribute(
    "data-renderer",
    "dom",
  );
  await expect(d.locator("canvas")).toHaveCount(0);
}
await d.getByRole("button", { name: "Next portrait" }).click();
await expect(d.locator(".photographic-sleeve")).toHaveAttribute(
  "data-selected",
  "1",
);
const result = {
  conditions:
    "Playwright Chromium 156 headless, local macOS arm64, 1440x900, no CPU/network throttling. Cadence is automation evidence, not physical-device FPS.",
  touch: { verticalDelta, touchSelection, pinchScale },
  atlasScroll: perf,
  contextLossFallback:
    renderer === "webgl" ? "passed" : "not exercised; DOM fallback selected",
  rendererBeforeLoss: renderer,
  frameCount,
};
writeFileSync(
  "test-results/mechanical-base/performance.json",
  JSON.stringify(result, null, 2),
);
console.log(result);
await b.close();
