import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const out = "E:\\code\\dshCode\\Lightbox\\shots\\live";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
let ok = false;
for (let i = 0; i < 3 && !ok; i++) {
  try {
    await page.goto("https://owenyhz.github.io/lightbox/#/zeniko-za12", { waitUntil: "domcontentloaded", timeout: 60000 });
    ok = true;
  } catch (e) { await page.waitForTimeout(3000); }
}
await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4200);
const overlay = await page.evaluate(() => Array.from(document.querySelectorAll("#stageMount [class]")).filter((n) => /load|skeleton|cover/i.test(n.className)).map((n) => ({ cls: String(n.className), opacity: getComputedStyle(n).opacity, display: getComputedStyle(n).display })));
await page.screenshot({ path: path.join(out, "za12-live-tuned.jpg"), type: "jpeg", quality: 82 });
console.log(JSON.stringify({ loaded: ok, errors: errors.slice(0, 5), overlay }));
await browser.close();
process.exit(0);
