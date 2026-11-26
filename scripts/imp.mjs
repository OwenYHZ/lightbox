import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const reqs = [];
page.on("request", (r) => { if (/viewer/.test(r.url())) reqs.push(r.url().split("/").pop()); });
page.on("requestfailed", (r) => reqs.push("FAIL " + r.url().split("/").pop() + " " + (r.failure() && r.failure().errorText)));
await page.goto("https://owenyhz.github.io/lightbox/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(500);
const t0 = Date.now();
const res = await page.evaluate(async () => {
  const t = performance.now();
  try {
    const m = await import("/lightbox/assets/viewer-1IGwqes_.js");
    return { ok: true, ms: Math.round(performance.now() - t), keys: Object.keys(m).slice(0, 5) };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t), err: String(e).slice(0, 200) };
  }
});
console.log(JSON.stringify({ res, totalMs: Date.now() - t0, reqs: reqs.slice(0, 6) }));
await browser.close();
process.exit(0);
