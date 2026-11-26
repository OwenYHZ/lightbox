import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const dist = "E:\\code\\dshCode\\Lightbox\\dist";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".glb": "model/gltf-binary" };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.join(dist, url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(4192, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE-ERR " + m.text().slice(0, 120)); });
page.on("pageerror", (e) => console.log("PAGEERR " + e.message.slice(0, 120)));
await page.goto("http://127.0.0.1:4192/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
console.log(JSON.stringify(await page.evaluate(() => ({
  lightbox: typeof window.Lightbox,
  methods: window.Lightbox ? Object.keys(window.Lightbox) : null,
  sheets: Array.from(document.styleSheets).map((s) => s.href),
  accentAttr: document.documentElement.getAttribute("data-accent"),
  accentH: getComputedStyle(document.documentElement).getPropertyValue("--accent-h").trim(),
  accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
}))));
for (const a of ["amber", "indigo", "celadon", "graphite"]) {
  await page.evaluate((x) => window.Lightbox.setAccent(x), a);
  await page.waitForTimeout(120);
  console.log(a + " -> " + JSON.stringify(await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-accent"),
    h: getComputedStyle(document.documentElement).getPropertyValue("--accent-h").trim(),
    s: getComputedStyle(document.documentElement).getPropertyValue("--accent-s").trim(),
    ink1: getComputedStyle(document.documentElement).getPropertyValue("--ink-1").trim(),
    ruleMatches: (() => { try { return Array.from(document.styleSheets).reduce((acc, sh) => { try { return acc + Array.from(sh.cssRules).filter((r) => (r.selectorText || "").indexOf("data-accent") >= 0).length; } catch (e) { return acc; } }, 0); } catch (e) { return "err"; } })(),
  }))));
}
await browser.close(); server.close(); process.exit(0);
