import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const shots = path.join(root, "shots", "qa3");
fs.mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4181, "127.0.0.1", r));
const base = "http://127.0.0.1:4181/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const results = {};
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

const count = () => page.evaluate(() => document.querySelectorAll(".card").length);
const names = () => page.evaluate(() => [...document.querySelectorAll(".card__title")].map((n) => n.textContent));
async function clearAll() {
  if (await page.locator("#filters").isVisible()) await page.click("#filtersDone");
  const btn = page.locator("#clearFilters");
  if (await btn.isVisible()) await btn.click();
  await page.waitForTimeout(220);
}
async function facet(dim, opt) {
  if (!(await page.locator("#filters").isVisible())) await page.click("#filterBtn");
  await page.waitForTimeout(280);
  await page.click('.fopt[data-dim="' + dim + '"][data-opt="' + opt + '"]');
  await page.waitForTimeout(240);
}

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
results.total = await count();

// 胶片机身
await page.click('.chip[data-cat="body"]');
await page.waitForTimeout(200);
await facet("medium", "film");
results.film = await count();
results.filmNames = await names();
await clearAll();

// 索尼 E：应包含两个转接环
await facet("mount", "sony-e");
results.sonyE = await count();
results.sonyENames = await names();
await page.screenshot({ path: path.join(shots, "adapter-filter.jpg"), type: "jpeg", quality: 78 });
await clearAll();

// 主题色
await page.click("#themeBtn");
await page.waitForTimeout(300);
results.swatchCount = await page.evaluate(() => document.querySelectorAll(".swatch").length);
await page.screenshot({ path: path.join(shots, "appearance-panel.jpg"), type: "jpeg", quality: 78 });
await page.click('.swatch[data-accent-id="celadon"]');
await page.waitForTimeout(500);
results.accent = await page.evaluate(() => ({
  attr: document.documentElement.dataset.accent,
  accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
  stored: localStorage.getItem("lightbox.accent"),
  name: document.querySelector("#accentName").textContent,
}));
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shots, "accent-celadon.jpg"), type: "jpeg", quality: 78 });

// 浅色 + 另一主题色
await page.click("#themeBtn");
await page.waitForTimeout(250);
await page.click('.theme__mode[data-mode="light"]');
await page.waitForTimeout(300);
await page.click('.swatch[data-accent-id="wine"]');
await page.waitForTimeout(600);
results.lightAccent = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  accent: document.documentElement.dataset.accent,
  accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
}));
await page.screenshot({ path: path.join(shots, "light-wine.jpg"), type: "jpeg", quality: 78 });

// 转接环详情 + 3D
await page.goto(base + "#/techart-lmea9", { waitUntil: "load" });
await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2200);
results.adapterDetail = await page.evaluate(() => ({
  title: document.querySelector("#detailTitle").textContent,
  meta: document.querySelector("#detailMeta").textContent,
  specs: [...document.querySelectorAll(".spec")].slice(0, 2).map((s) => s.textContent.trim()),
}));
await page.screenshot({ path: path.join(shots, "adapter-detail.jpg"), type: "jpeg", quality: 78 });

await ctx.close();

// 手机外观面板
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark", locale: "zh-CN" });
const m = await mctx.newPage();
await m.goto(base, { waitUntil: "networkidle" });
await m.waitForTimeout(700);
await m.tap("#themeBtn");
await m.waitForTimeout(400);
await m.screenshot({ path: path.join(shots, "mobile-appearance.jpg"), type: "jpeg", quality: 78 });
const panelBox = await m.evaluate(() => {
  const r = document.querySelector("#themeMenu").getBoundingClientRect();
  return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), docW: document.documentElement.scrollWidth };
});
await mctx.close();

await browser.close();
server.close();
console.log(JSON.stringify({ errors, results, panelBox }, null, 1));
process.exit(0);
