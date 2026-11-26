import { chromium } from "playwright-core";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
const dist = "E:\\code\\dshCode\\Lightbox\\dist";
const out = "E:\\code\\dshCode\\Lightbox\\shots\\za12";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(dist, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4201, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 }, colorScheme: "dark" });
await page.goto("http://127.0.0.1:4201/#/zeniko-za12", { waitUntil: "networkidle" });
await page.waitForSelector("#stageMount canvas.is-ready", { timeout: 40000 }).catch(() => {});
await page.waitForTimeout(2500);
const stage = await page.$("#stage");
await stage.screenshot({ path: path.join(out, "spin-a.png") });
const rotA = await page.evaluate(() => window.Lightbox.getStage().model.rotation.y);
await page.waitForTimeout(1800);
await stage.screenshot({ path: path.join(out, "spin-b.png") });
const rotB = await page.evaluate(() => window.Lightbox.getStage().model.rotation.y);
const px = await page.evaluate(() => {
  const c = document.querySelector("#stageMount canvas");
  const g = document.createElement("canvas");
  g.width = c.width; g.height = c.height;
  g.getContext("2d").drawImage(c, 0, 0);
  const d = g.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let max = 0, sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
    if (l > max) max = l; sum += l; n += 1;
  }
  return { max: +max.toFixed(3), mean: +(sum / n).toFixed(3) };
});
console.log(JSON.stringify({ rotA: +rotA.toFixed(3), rotB: +rotB.toFixed(3), delta: +(rotB - rotA).toFixed(3), px }));
await browser.close();
server.close();
process.exit(0);
