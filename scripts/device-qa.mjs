import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const shots = path.join(root, "shots", "devices");
fs.mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4185, "127.0.0.1", r));
const base = "http://127.0.0.1:4185/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

// 预览页：三件并排
await page.goto(base + "tools/device-preview.html", { waitUntil: "networkidle" });
await page.waitForTimeout(2600);
await page.screenshot({ path: path.join(shots, "preview-dark.jpg"), type: "jpeg", quality: 80 });
await page.click("#themeBtn");
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(shots, "preview-light.jpg"), type: "jpeg", quality: 80 });

// 卡片 + 详情
const ids = ["konica-bm21", "olympus-45", "zeniko-za12"];
for (const id of ids) {
  await page.goto(base + "#/" + id, { waitUntil: "load" });
  await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2400);
  await page.screenshot({ path: path.join(shots, "detail-" + id + ".jpg"), type: "jpeg", quality: 80 });
}

// 首页卡片区域（三件相邻）
await page.goto(base, { waitUntil: "load" });
await page.waitForTimeout(900);
await page.fill("#searchInput", "");
await page.waitForTimeout(500);
await page.evaluate((id) => {
  const el = document.querySelector('.card[data-id="' + id + '"]');
  if (el) el.scrollIntoView({ block: "center" });
}, ids[0]);
await page.waitForTimeout(700);
const cardShot = await page.evaluate((ids) => {
  const first = document.querySelector('.card[data-id="' + ids[0] + '"]');
  if (!first) return null;
  const r = first.getBoundingClientRect();
  const y = Math.max(0, r.y - 90);
  return { x: Math.max(0, r.x - 12), y, width: Math.min(1400, r.width * 3 + 40), height: Math.min(880 - y, r.height + 110) };
}, ids);
if (cardShot) await page.screenshot({ path: path.join(shots, "cards-row.jpg"), type: "jpeg", quality: 80, clip: cardShot });

const count = await page.evaluate(() => document.querySelectorAll(".card").length);
await browser.close();
server.close();
console.log(JSON.stringify({ errors, count }));
process.exit(0);
