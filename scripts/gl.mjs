import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const logs = [];
page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 120)));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await page.goto("https://owenyhz.github.io/lightbox/#/zeniko-za12", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
const r = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = window.WebGLRenderingContext ? (c.getContext("webgl2") || c.getContext("webgl")) : null;
  const fb = document.querySelector("#stageFallback");
  return {
    hasWebGLRenderingContext: !!window.WebGLRenderingContext,
    gl: !!gl,
    fallback: fb ? { hidden: fb.hidden, display: getComputedStyle(fb).display, cls: fb.className } : null,
    title: document.title,
    hasStage: !!(window.Lightbox && window.Lightbox.getStage && window.Lightbox.getStage()),
  };
});
console.log(JSON.stringify({ r, logs: logs.slice(-10) }, null, 1));
await browser.close();
process.exit(0);
