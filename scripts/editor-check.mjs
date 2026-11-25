import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const shots = path.join(root, "shots", "qa");
fs.mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4179, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

// 编辑器（构建产物）
await page.goto("http://127.0.0.1:4179/tools/gear-editor.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const rows = await page.evaluate(() => document.querySelectorAll("tbody tr").length);
const lensForm = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const lens = rows.find((r) => (r.querySelector("input")?.value || "") === "sony-2470gm2");
  if (!lens) return null;
  const selects = [...lens.querySelectorAll("select")];
  return selects.map((s) => s.value);
});
await page.screenshot({ path: path.join(shots, "editor-built.jpg"), type: "jpeg", quality: 78 });

// 返回主站链接
await page.click("text=返回 LIGHTBOX");
await page.waitForTimeout(800);
const homeUrl = page.url();
await page.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.click("text=器材编辑器");
await page.waitForTimeout(700);
const footerLinkUrl = page.url();

await browser.close();
server.close();
console.log(JSON.stringify({ errors, rows, lensForm, homeUrl, footerLinkUrl }, null, 1));
process.exit(0);
