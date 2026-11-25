import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const shots = path.join(root, "shots", "check");
fs.mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4176, "127.0.0.1", r));
const base = "http://127.0.0.1:4176/";
console.log("server up");

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await desktop.newPage();
page.on("pageerror", (e) => errors.push(String(e.message)));
await page.goto(base, { waitUntil: "load" });
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(shots, "home.jpg"), type: "jpeg", quality: 76 });
console.log("home done");

for (const id of ["sony-a7m4", "sigma-85art", "pd-tripod", "nisi-nd1000"]) {
  await page.goto(base + "#/" + id, { waitUntil: "load" });
  await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(shots, id + ".jpg"), type: "jpeg", quality: 76 });
  console.log(id, "done");
}
await desktop.close();

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark", locale: "zh-CN" });
const m = await mobile.newPage();
m.on("pageerror", (e) => errors.push(String(e.message)));
await m.goto(base, { waitUntil: "load" });
await m.waitForTimeout(1800);
await m.screenshot({ path: path.join(shots, "mobile-home.jpg"), type: "jpeg", quality: 76 });
await m.goto(base + "#/nikon-zf", { waitUntil: "load" });
await m.waitForTimeout(3500);
await m.screenshot({ path: path.join(shots, "mobile-modal.jpg"), type: "jpeg", quality: 76 });
console.log("mobile done");
await mobile.close();

await browser.close();
server.close();
console.log(JSON.stringify({ errors }));
process.exit(0);
