import { chromium } from "playwright-core";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
const dist = "E:\\code\\dshCode\\Lightbox\\dist";
const out = "E:\\code\\dshCode\\Lightbox\\shots\\pre-deploy";
fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4211, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
for (const scheme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:4211/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, "home-" + scheme + ".jpg"), type: "jpeg", quality: 80 });
  await page.goto("http://127.0.0.1:4211/#/zeniko-za12", { waitUntil: "networkidle" });
  await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(out, "za12-" + scheme + ".jpg"), type: "jpeg", quality: 80 });
  await ctx.close();
}
await browser.close();
server.close();
console.log("SHOTS_OK");
process.exit(0);
