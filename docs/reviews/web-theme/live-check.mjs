import { chromium } from "playwright-core";
import crypto from "node:crypto";
import fs from "node:fs";
const ev = "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence";
const ACC = ["amber", "copper", "wine", "rose", "plum", "indigo", "slate", "celadon", "pine", "moss", "ochre", "graphite"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", locale: "zh-CN" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("https://owenyhz.github.io/lightbox/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(900);
const sheets = await page.evaluate(() => Array.from(document.styleSheets).map((s) => (s.href || "").split("/").pop()));
const rows = [];
for (const a of ACC) {
  await page.evaluate((x) => window.Lightbox.setAccent(x), a);
  await page.waitForTimeout(120);
  const v = await page.evaluate(() => {
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;left:-9999px;width:8px;height:8px";
    p.style.backgroundColor = "var(--ink-1)";
    document.body.appendChild(p);
    const ink = getComputedStyle(p).backgroundColor;
    p.remove();
    return {
      attr: document.documentElement.getAttribute("data-accent"),
      h: getComputedStyle(document.documentElement).getPropertyValue("--accent-h").trim(),
      s: getComputedStyle(document.documentElement).getPropertyValue("--accent-s").trim(),
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      ink1: ink,
      body: getComputedStyle(document.body).backgroundColor,
    };
  });
  rows.push(Object.assign({ accent: a }, v));
}
/* 三色截图 + MD5（等两帧 + 600ms，确保重绘完） */
const shots = [];
for (const a of ["amber", "celadon", "wine"]) {
  await page.evaluate((x) => window.Lightbox.setAccent(x), a);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(700);
  const p = ev + "\\live-fixed-1440-light-" + a + ".jpg";
  const buf = await page.screenshot({ path: p, type: "jpeg", quality: 70 });
  shots.push({ accent: a, bytes: buf.length, md5: crypto.createHash("md5").update(buf).digest("hex").toUpperCase() });
}
console.log(JSON.stringify({ sheets, rows, shots, errs }, null, 1));
await browser.close(); process.exit(0);
