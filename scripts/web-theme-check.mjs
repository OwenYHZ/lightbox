import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/* 主题系统回归（产物口径 dist/）：
   1) 12 色 --accent-h/--accent-s 是否真的生效（硬断言）
   2) 深色基底是否还有"像黑"（LCh C* / L* / h）
   3) 深浅切换过渡帧是否还有"文字消失"（渐变色瞬切 + color 瞬切）
   4) tools/gear-editor.html 是否跟随主题色 + 明暗
   5) 12 色两两 ΔE（浅色/深色），确认不再有"几乎同色"
*/

const root = "E:\\code\\dshCode\\Lightbox";
const siteRoot = path.join(root, "dist");
const shots = path.join(root, "shots", "web-polish");
fs.mkdirSync(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(siteRoot, url === "/" ? "index.html" : url);
  if (!file.startsWith(siteRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(siteRoot, "index.html");
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4237, "127.0.0.1", r));
const base = "http://127.0.0.1:4237/";

const ACC = ["amber", "copper", "wine", "rose", "plum", "indigo", "slate", "celadon", "pine", "moss", "ochre", "graphite"];
const EXPECT = {
  amber: [38, "46%"], copper: [22, "52%"], wine: [356, "52%"], rose: [332, "47%"],
  plum: [300, "34%"], indigo: [252, "40%"], slate: [206, "34%"], celadon: [178, "30%"],
  pine: [154, "34%"], moss: [100, "26%"], ochre: [55, "50%"], graphite: [226, "5%"],
};

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const out = { ledger: {}, lch: {}, deltaE: {}, switchFrames: {}, tools: {}, errors: [] };

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
const page = await ctx.newPage();
page.on("pageerror", (e) => out.errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") out.errors.push(m.text()); });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

for (const theme of ["dark", "light"]) {
  await page.evaluate((t) => window.Lightbox.setTheme(t), theme);
  await page.waitForTimeout(520);
  for (const accent of ACC) {
    const seen = await page.evaluate((a) => {
      window.Lightbox.setAccent(a);
      const cs = getComputedStyle(document.documentElement);
      return { h: cs.getPropertyValue("--accent-h").trim(), s: cs.getPropertyValue("--accent-s").trim(), ink1: cs.getPropertyValue("--ink-1").trim() };
    }, accent);
    const want = EXPECT[accent];
    if (seen.h !== String(want[0]) || seen.s !== want[1]) {
      throw new Error("[P0-1 未修好] " + theme + "/" + accent + " 期望 " + want.join("/") + " 实际 " + seen.h + "/" + seen.s);
    }
    /* 用 canvas 把 token 颜色落成像素，再转 Lab/LCh */
    const lch = await page.evaluate((cssColor) => {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx2 = c.getContext("2d");
      ctx2.fillStyle = cssColor;
      ctx2.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx2.getImageData(0, 0, 1, 1).data;
      const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
      const R = lin(r), G = lin(g), B = lin(b);
      const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
      const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
      const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
      const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
      const fx = f(X), fy = f(Y), fz = f(Z);
      const L = 116 * fy - 16;
      const a2 = 500 * (fx - fy);
      const b2 = 200 * (fy - fz);
      let h = (Math.atan2(b2, a2) * 180) / Math.PI;
      if (h < 0) h += 360;
      return { L: Math.round(L * 10) / 10, C: Math.round(Math.hypot(a2, b2) * 10) / 10, h: Math.round(h), rgb: [r, g, b] };
    }, seen.ink1);
    out.ledger[theme + "-" + accent] = { accentH: seen.h, accentS: seen.s, ink1: seen.ink1 };
    out.lch[theme + "-" + accent] = lch;
    if (theme === "dark" && lch.C < 4.5) out.darkTooNeutral = (out.darkTooNeutral || []).concat(accent + " C*=" + lch.C);
  }
}

/* 12 色两两 ΔE（用 ink-1 的 LCh 近似） */
const toLab = (lch) => {
  const rad = (lch.h * Math.PI) / 180;
  return [lch.L, lch.C * Math.cos(rad), lch.C * Math.sin(rad)];
};
for (const theme of ["dark", "light"]) {
  const pairs = [];
  for (let i = 0; i < ACC.length; i += 1) {
    for (let j = i + 1; j < ACC.length; j += 1) {
      const A = toLab(out.lch[theme + "-" + ACC[i]]);
      const B = toLab(out.lch[theme + "-" + ACC[j]]);
      const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
      if (d < 3) pairs.push(ACC[i] + "↔" + ACC[j] + " ΔE=" + (Math.round(d * 10) / 10));
    }
  }
  out.deltaE[theme] = { tooClose: pairs };
}

/* 深浅切换：逐帧对比度（不再有"文字消失"） */
await page.evaluate(() => window.Lightbox.setTheme("dark"));
await page.waitForTimeout(600);
out.switchFrames = await page.evaluate(async () => {
  const parse = (c) => {
    const m = c.replace(/\s/g, "").match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };
  const samples = [];
  const run = async (to) => {
    const el = document.querySelector(".hero__lede");
    const body = document.body;
    const t0 = performance.now();
    window.Lightbox.setTheme(to);
    let min = 99;
    let minAt = 0;
    await new Promise((resolve) => {
      const tick = () => {
        const fg = parse(getComputedStyle(el).color);
        const bg = parse(getComputedStyle(body).backgroundColor);
        const r = ratio(fg, bg);
        const t = Math.round(performance.now() - t0);
        if (r < min) { min = r; minAt = t; }
        if (t < 700) setTimeout(tick, 20);
        else resolve();
      };
      tick();
    });
    samples.push({ to, minRatio: Math.round(min * 100) / 100, atMs: minAt });
    await new Promise((r) => setTimeout(r, 700));
  };
  await run("light");
  await run("dark");
  return samples;
});

/* tools 页：跟随浅色 + 靛青 */
{
  const tctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: "light", locale: "zh-CN" });
  const tp = await tctx.newPage();
  tp.on("pageerror", (e) => out.errors.push("tools: " + e.message));
  await tp.goto(base + "tools/gear-editor.html", { waitUntil: "networkidle" });
  await tp.evaluate(() => { localStorage.setItem("lightbox.theme", "light"); localStorage.setItem("lightbox.accent", "indigo"); });
  await tp.reload({ waitUntil: "networkidle" });
  await tp.waitForTimeout(700);
  out.tools = await tp.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    return {
      theme: document.documentElement.dataset.theme,
      accent: document.documentElement.dataset.accent,
      accentH: cs.getPropertyValue("--accent-h").trim(),
      ink0: cs.getPropertyValue("--ink-0").trim(),
      bodyBg: body.backgroundColor,
      bodyColor: body.color,
    };
  });
  await tp.screenshot({ path: path.join(shots, "tools-editor-light-indigo.jpg"), type: "jpeg", quality: 80 });
  await tctx.close();
}

await browser.close();
server.close();
fs.writeFileSync(path.join(shots, "theme-check.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({
  errors: out.errors,
  darkNeutral: out.darkTooNeutral || [],
  deltaE: out.deltaE,
  switchFrames: out.switchFrames,
  tools: out.tools,
  darkLch: Object.fromEntries(ACC.map((a) => [a, out.lch["dark-" + a]])),
}, null, 1));
