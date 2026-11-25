import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const shots = path.join(root, "shots", "qa");
fs.mkdirSync(shots, { recursive: true });

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4177, "127.0.0.1", r));
const base = "http://127.0.0.1:4177/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const results = {};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

async function count() {
  return page.evaluate(() => document.querySelectorAll(".card").length);
}
async function pickMode(mode) {
  if (!(await page.locator("#themeMenu").isVisible())) {
    await page.click("#themeBtn");
    await page.waitForTimeout(220);
  }
  await page.click('.theme__mode[data-mode="' + mode + '"]');
  await page.waitForTimeout(650);
}

async function clearAll() {
  await closeFilters();
  const btn = page.locator("#clearFilters");
  if (await btn.isVisible()) await btn.click();
  await page.waitForTimeout(250);
}
async function openFilters() {
  if (!(await page.locator("#filters").isVisible())) {
    await page.click("#filterBtn");
    await page.waitForTimeout(320);
  }
}
async function closeFilters() {
  if (await page.locator("#filters").isVisible()) {
    await page.click("#filtersDone");
    await page.waitForTimeout(300);
  }
}
async function press(dim, opt) {
  await openFilters();
  await page.click('.fopt[data-dim="' + dim + '"][data-opt="' + opt + '"]');
  await page.waitForTimeout(260);
}

await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
results.total = await count();
results.statusPills = await page.evaluate(() => document.querySelectorAll(".card__status").length);
results.soldCards = await page.evaluate(() => document.querySelectorAll('.card[data-status="sold"]').length);

// 1) 尼康 + Z 卡口 → 3（Z f / Z6 II / 85mm）
await press("brand", "nikon");
await press("mount", "nikon-z");
results.nikonZ = await count();
results.nikonZNames = await page.evaluate(() => [...document.querySelectorAll(".card__title")].map((n) => n.textContent));
await page.screenshot({ path: path.join(shots, "filters-nikon-z.jpg"), type: "jpeg", quality: 78 });
await clearAll();

// 2) F 卡口镜头 → 2
await page.click('.chip[data-cat="lens"]');
await page.waitForTimeout(200);
await press("mount", "nikon-f");
results.fMountLens = await count();
await clearAll();

// 3) 旁轴 + 固定镜头 → 2
await press("form", "rangefinder");
await press("lens", "fixed");
results.fixedRangefinder = await count();
results.fixedRangefinderNames = await page.evaluate(() => [...document.querySelectorAll(".card__title")].map((n) => n.textContent));
await clearAll();

// 4) 已出售 → 4
await press("status", "sold");
results.sold = await count();
await clearAll();

// 5) M43 → 4
await press("mount", "m43");
results.m43 = await count();
await clearAll();
await closeFilters();

// 6) 主题：浅色
await pickMode("light");
await page.waitForTimeout(700);
results.themeLight = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  mode: document.documentElement.dataset.themeMode,
  bg: getComputedStyle(document.body).backgroundColor,
  text: getComputedStyle(document.body).color,
  stored: localStorage.getItem("lightbox.theme"),
}));
await page.screenshot({ path: path.join(shots, "light-home.jpg"), type: "jpeg", quality: 78 });

// 浅色下打开详情（顺带验证 3D 是否切换）
await page.click('.card[data-id="fuji-x100vi"] .card__hit');
await page.waitForTimeout(2600);
await page.screenshot({ path: path.join(shots, "light-detail.jpg"), type: "jpeg", quality: 78 });
results.stageTheme = await page.evaluate(() => document.documentElement.dataset.theme);
await page.keyboard.press("Escape");
await page.waitForTimeout(700);

// 7) 深色 + 跟随系统
await pickMode("dark");
results.themeDark = await page.evaluate(() => document.documentElement.dataset.theme);
await page.screenshot({ path: path.join(shots, "dark-home.jpg"), type: "jpeg", quality: 78 });

await pickMode("system");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
results.themeSystem = await page.evaluate(() => ({ mode: document.documentElement.dataset.themeMode, theme: document.documentElement.dataset.theme }));

// 8) 筛选面板全景（浅色，便于检查对比度）
await page.click("#themeBtn");
await page.waitForTimeout(150);
await page.click('.theme__mode[data-mode="light"]');
await page.waitForTimeout(400);
await openFilters();
await page.screenshot({ path: path.join(shots, "light-filters.jpg"), type: "jpeg", quality: 78 });
await closeFilters();

await ctx.close();

// 9) 移动端
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "light", locale: "zh-CN" });
const m = await mctx.newPage();
m.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
await m.goto(base, { waitUntil: "networkidle" });
await m.waitForTimeout(800);
results.mobile = await m.evaluate(() => ({ docW: document.documentElement.scrollWidth, winW: window.innerWidth, theme: document.documentElement.dataset.theme }));
await m.tap("#filterBtn");
await m.waitForTimeout(500);
await m.screenshot({ path: path.join(shots, "mobile-filters.jpg"), type: "jpeg", quality: 78 });
await m.tap('.fopt[data-dim="brand"][data-opt="nikon"]');
await m.waitForTimeout(400);
results.mobileFiltered = await m.evaluate(() => document.querySelectorAll(".card").length);
await m.screenshot({ path: path.join(shots, "mobile-filters-selected.jpg"), type: "jpeg", quality: 78 });
await mctx.close();

await browser.close();
server.close();
console.log(JSON.stringify({ errors, results }, null, 1));
process.exit(0);
