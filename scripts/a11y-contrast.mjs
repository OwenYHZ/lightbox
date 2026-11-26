import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/* 元素级对比度体检（WCAG AA：正文 4.5 / 大字 3）
   口径：computed color（含 alpha）沿祖先链合成到最近的不透明背景色。
   服务 dist/（产物口径），12 色 × 深浅，逐色给出不达标清单与最低 8 名。 */

const root = "E:\\code\\dshCode\\Lightbox";
const siteRoot = path.join(root, "dist");
const shots = path.join(root, "shots", "web-polish");
const SCAN = fs.readFileSync(path.join(root, "scripts", "lib", "contrast-scan.js"), "utf8");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(siteRoot, url === "/" ? "index.html" : url);
  if (!file.startsWith(siteRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(siteRoot, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4229, "127.0.0.1", r));
const base = "http://127.0.0.1:4229/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const ACC = ["amber", "copper", "wine", "rose", "plum", "indigo", "slate", "celadon", "pine", "moss", "ochre", "graphite"];
const report = {};

for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, locale: "zh-CN" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", theme, e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  for (const accent of ACC) {
    await page.evaluate(([t, a]) => { window.Lightbox.setTheme(t); window.Lightbox.setAccent(a); }, [theme, accent]);
    await page.waitForTimeout(560);
    const home = await page.evaluate(SCAN);
    await page.evaluate(() => { void window.Lightbox.open("zeniko-za12"); });
    await page.waitForTimeout(480);
    const detail = await page.evaluate(SCAN);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(240);
    report[theme + "-" + accent] = {
      homeFails: home.fails,
      detailFails: detail.fails,
      measured: home.scanned + detail.scanned,
      lowest: home.lowest.concat(detail.lowest).sort((a, b) => a.ratio - b.ratio).slice(0, 8),
    };
  }
  await ctx.close();
}

const keys = Object.keys(report);
const total = keys.reduce((n, k) => n + report[k].homeFails.length + report[k].detailFails.length, 0);
const bySel = {};
for (const k of keys) {
  for (const f of report[k].homeFails.concat(report[k].detailFails)) {
    bySel[f.sel] = bySel[f.sel] || { sel: f.sel, count: 0, worst: 99, text: f.text, size: f.size };
    bySel[f.sel].count += 1;
    bySel[f.sel].worst = Math.min(bySel[f.sel].worst, f.ratio);
  }
}
const worstOverall = keys.flatMap((k) => report[k].lowest).sort((a, b) => a.ratio - b.ratio).slice(0, 8);
fs.writeFileSync(path.join(shots, "a11y-report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ combos: keys.length, totalFailElements: total, bySel: Object.values(bySel), worstOverall }, null, 1));

await browser.close();
server.close();