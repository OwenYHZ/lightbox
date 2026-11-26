import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = "E:\\code\\dshCode\\Lightbox";
const STYLES = ["tokens.css", "accents.css", "base.css", "cards.css", "detail.css"];
const bundle = STYLES.map((f) => fs.readFileSync(path.join(root, "src", "styles", f), "utf8")).join("\n");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary" };
const html = () => fs.readFileSync(path.join(root, "index.html"), "utf8").replace(
  '<script type="module" src="/src/main.js"></script>',
  '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><link rel="stylesheet" href="/__styles.css" /><script type="module" src="/src/main.js"></script>'
);
const noCss = (code) => code.replace(/^\s*import\s+"[^"]+\.css";\s*$/gm, "");
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (url === "/" || url === "/index.html") { res.writeHead(200, { "Content-Type": MIME[".html"] }); res.end(html()); return; }
  if (url === "/__styles.css") { res.writeHead(200, { "Content-Type": MIME[".css"] }); res.end(bundle); return; }
  let file = null;
  if (url.startsWith("/src/")) file = path.join(root, url);
  else if (url.startsWith("/node_modules/")) file = path.join(root, url);
  else if (url.startsWith("/assets/")) file = path.join(root, "public", url);
  if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
  const ext = path.extname(file);
  const body = ext === ".js" ? noCss(fs.readFileSync(file, "utf8")) : fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" }); res.end(body);
});
await new Promise((r) => server.listen(4198, "127.0.0.1", r));

const MEASURE = (titles) => {
  const sh = window.__shot; const d = sh.d, w = sh.w, h = sh.h;
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const l1 = Y(a), l2 = Y(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
  const out = [];
  for (const card of document.querySelectorAll(".card")) {
    const title = ((card.querySelector(".card__title") || {}).textContent || "").trim();
    if (titles && titles.indexOf(title) < 0) continue;
    const art = card.querySelector(".card__art");
    const r = art.getBoundingClientRect();
    const x0 = Math.max(0, Math.round(r.left)), x1 = Math.min(w - 1, Math.round(r.right));
    const y0 = Math.max(0, Math.round(r.top)), y1 = Math.min(h - 1, Math.round(r.bottom));
    if (x1 - x0 < 20 || y1 - y0 < 20) { out.push({ title, skip: "offscreen" }); continue; }
    const bucket = new Map();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = px(x, y); const k = (c[0] >> 3) + "," + (c[1] >> 3) + "," + (c[2] >> 3);
      const e = bucket.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += c[0]; e.g += c[1]; e.b += c[2]; bucket.set(k, e);
    }
    let mb = null; for (const e of bucket.values()) if (!mb || e.n > mb.n) mb = e;
    const bg = [mb.r / mb.n, mb.g / mb.n, mb.b / mb.n]; const bgY = Y(bg);
    const cand = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = px(x, y); const dl = Math.abs(Y(c) - bgY); if (dl > 0.012) cand.push([dl, c]); }
    if (cand.length < 5) { out.push({ title, skip: "noink" }); continue; }
    cand.sort((a, b) => b[0] - a[0]);
    const take = Math.max(3, Math.round(cand.length * 0.008));
    const fg = [0, 0, 0]; for (let i = 0; i < take; i++) { fg[0] += cand[i][1][0]; fg[1] += cand[i][1][1]; fg[2] += cand[i][1][2]; }
    fg[0] /= take; fg[1] /= take; fg[2] /= take;
    out.push({ title, ratio: ratio(fg, bg), fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(",") });
  }
  return out;
};

const TITLES = ["Konica Big Mini BM-21", "M.Zuiko Digital 45mm f/1.8", "ZENIKO ZA12", "Sony α7 IV"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:4198/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const out = {};
for (const theme of ["light", "dark"]) {
  await page.evaluate((t) => { window.Lightbox.setTheme(t); window.Lightbox.setAccent("amber"); }, theme);
  await page.waitForTimeout(600);
  for (const t of TITLES.slice(0, 3)) {
    await page.evaluate((title) => {
      const card = Array.from(document.querySelectorAll(".card")).find((c) => ((c.querySelector(".card__title") || {}).textContent || "").trim() === title);
      if (card) card.scrollIntoView({ block: "center" });
    }, t);
    await page.waitForTimeout(650);
    const buf = await page.screenshot({ type: "png" });
    await page.evaluate(async (u) => {
      const img = new Image(); img.src = u; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx2 = c.getContext("2d", { willReadFrequently: true }); ctx2.drawImage(img, 0, 0);
      window.__shot = { d: ctx2.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    }, "data:image/png;base64," + buf.toString("base64"));
    const m = await page.evaluate(MEASURE, [t]);
    (out[theme] = out[theme] || []).push(m[0] || { title: t, missing: true });
    if (theme === "light" || t.indexOf("ZENIKO") >= 0) await page.screenshot({ path: "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\card-" + theme + "-" + (t.indexOf("Konica") >= 0 ? "bm21" : t.indexOf("M.Zuiko") >= 0 ? "olympus45" : "zeniko") + ".jpg", type: "jpeg", quality: 84 });
  }
}
await browser.close(); server.close();
console.log(JSON.stringify(out, null, 1));
