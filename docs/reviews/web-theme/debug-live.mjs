import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: "light" });
const page = await ctx.newPage();
await page.goto("https://owenyhz.github.io/lightbox/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const out = [];
  let idx = 0;
  for (const sh of document.styleSheets) {
    let rules = [];
    try { rules = Array.from(sh.cssRules); } catch (e) { continue; }
    for (const r of rules) {
      if (r.cssText && r.cssText.indexOf("--accent-h") >= 0) out.push({ order: idx++, href: (sh.href || "").split("/").pop(), sel: r.selectorText || r.cssText.slice(0, 40) });
    }
  }
  return { sheets: Array.from(document.styleSheets).map((s) => (s.href || "").split("/").pop()), out };
});
console.log(JSON.stringify(info, null, 1));
for (const a of ["amber", "indigo", "celadon", "graphite", "wine"]) {
  await page.evaluate((x) => window.Lightbox.setAccent(x), a);
  await page.waitForTimeout(80);
  const v = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-accent"),
    h: getComputedStyle(document.documentElement).getPropertyValue("--accent-h").trim(),
    s: getComputedStyle(document.documentElement).getPropertyValue("--accent-s").trim(),
    accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    ink0: getComputedStyle(document.documentElement).getPropertyValue("--ink-0").trim(),
  }));
  console.log("LIVE " + a + " -> " + JSON.stringify(v));
}
// 截图 3 个 accent 对比（同主题浅色）
for (const a of ["amber", "indigo", "celadon"]) {
  await page.evaluate((x) => window.Lightbox.setAccent(x), a);
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/reviews/web-theme/evidence/live-1440-light-" + a + ".jpg", type: "jpeg", quality: 70 });
}
await browser.close(); process.exit(0);
