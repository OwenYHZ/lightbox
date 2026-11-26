import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const dist = "E:\\code\\dshCode\\Lightbox\\dist";
const ev = "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".glb": "model/gltf-binary" };
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.join(dist, url);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(4195, "127.0.0.1", r));
const base = "http://127.0.0.1:4195/";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const out = {};

const ELEM = (sels) => {
  const sh = window.__shot; const d = sh.d, w = sh.w, h = sh.h;
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const l1 = L(a), l2 = L(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const res = {};
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) { res[sel] = null; continue; }
    const r = el.getBoundingClientRect();
    const x0 = Math.max(0, Math.round(r.left)), x1 = Math.min(w - 1, Math.round(r.right));
    const y0 = Math.max(0, Math.round(r.top)), y1 = Math.min(h - 1, Math.round(r.bottom));
    if (x1 - x0 < 6 || y1 - y0 < 6) { res[sel] = { skip: true }; continue; }
    const bucket = new Map();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = px(x, y); const k = (c[0] >> 3) + "," + (c[1] >> 3) + "," + (c[2] >> 3);
      const e = bucket.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += c[0]; e.g += c[1]; e.b += c[2]; bucket.set(k, e);
    }
    let mb = null;
    for (const e of bucket.values()) if (!mb || e.n > mb.n) mb = e;
    const bg = [mb.r / mb.n, mb.g / mb.n, mb.b / mb.n];
    const bgL = L(bg);
    const cand = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = px(x, y); const dl = Math.abs(L(c) - bgL); if (dl > 0.01) cand.push([dl, c]); }
    if (cand.length < 5) { res[sel] = { skip: true, bg: bg.map(Math.round).join(",") }; continue; }
    cand.sort((a, b) => b[0] - a[0]);
    const take = Math.max(3, Math.round(cand.length * 0.008));
    const fg = [0, 0, 0];
    for (let i = 0; i < take; i++) { fg[0] += cand[i][1][0]; fg[1] += cand[i][1][1]; fg[2] += cand[i][1][2]; }
    fg[0] /= take; fg[1] /= take; fg[2] /= take;
    res[sel] = { ratio: Math.round(ratio(fg, bg) * 100) / 100, fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(",") };
  }
  return res;
};

async function inject(page, buf) {
  const url = "data:image/png;base64," + buf.toString("base64");
  await page.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    window.__shot = { d: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }, url);
}

for (const theme of ["dark", "light"]) {
  for (const reduce of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme, locale: "zh-CN", reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate((t) => window.Lightbox.setTheme(t), theme);
    await page.waitForTimeout(400);
    /* 人为把 viewer 模块请求延后 1.8s，保证抓到加载动画中段 */
    await page.route("**/viewer-*.js", async (route) => { await new Promise((r) => setTimeout(r, 1800)); try { await route.continue(); } catch (e) {} });
    await page.evaluate(() => { void window.Lightbox.open("zeniko-za12"); });
    await page.waitForTimeout(650);
    const buf = await page.screenshot({ type: "png" });
    await inject(page, buf);
    const m = await page.evaluate(ELEM, [".stage__loader-art", "#stageLoader .stage__loader-foot", ".stage__hint", ".stage__tools"]);
    const state = await page.evaluate(() => {
      const art = document.getElementById("stageLoaderArt");
      const first = art.querySelector("[style*='--len']");
      const l = document.getElementById("stageLoader");
      return {
        svg: Boolean(art.querySelector("svg.cover")), lenNodes: art.querySelectorAll("[style*='--len']").length,
        dashoffset: first ? getComputedStyle(first).strokeDashoffset : null,
        anim: first ? getComputedStyle(first).animationName : null,
        loaderOpacity: getComputedStyle(l).opacity,
        text: document.getElementById("stageLoaderText").textContent,
      };
    });
    const key = theme + (reduce ? "/reduced" : "/normal");
    out[key] = { measure: m, state };
    await page.screenshot({ path: path.join(ev, "loader-" + theme + (reduce ? "-reduced" : "") + ".jpg"), type: "jpeg", quality: 78 });
    await page.screenshot({ path: path.join(ev, "loader-" + theme + (reduce ? "-reduced" : "") + "-art.png"), type: "jpeg", quality: 90, clip: { x: 300, y: 120, width: 700, height: 520 } });
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
