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
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(4196, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4196/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const probe = await page.evaluate(async () => {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const num = (s) => s.match(/[0-9.]+/g).map(Number);
  const ratio = (a, b) => { const l1 = Y(a), l2 = Y(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  const sample = () => {
    const lede = document.querySelector(".hero__lede");
    const bgProbe = document.createElement("div");
    bgProbe.style.cssText = "position:fixed;left:-9999px;width:8px;height:8px;transition:none!important";
    bgProbe.style.backgroundColor = "var(--ink-1)";
    document.body.appendChild(bgProbe);
    const bg = num(getComputedStyle(bgProbe).backgroundColor).slice(0, 3);
    bgProbe.remove();
    const fg = num(getComputedStyle(lede).color).slice(0, 3);
    return { t: Math.round(performance.now()), fg: fg.join(","), bg: bg.join(","), ratio: ratio(fg, bg), theme: document.documentElement.dataset.theme, switching: document.documentElement.classList.contains("is-theme-switching") };
  };
  const out = { darkToLight: [], lightToDark: [] };
  window.Lightbox.setTheme("dark");
  await new Promise((r) => setTimeout(r, 700));
  window.Lightbox.setTheme("light");
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) { out.darkToLight.push(sample()); await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => setTimeout(r, 40)); }
  await new Promise((r) => setTimeout(r, 600));
  window.Lightbox.setTheme("dark");
  for (let i = 0; i < 10; i++) { out.lightToDark.push(sample()); await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => setTimeout(r, 40)); }
  return out;
});
console.log(JSON.stringify(probe, null, 1));
await browser.close(); server.close(); process.exit(0);
