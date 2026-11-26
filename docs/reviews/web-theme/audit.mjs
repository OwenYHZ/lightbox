
/* Lightbox · 主题系统 / 3D 加载动画 独立审核 harness（reviewer: web-reviewer）
 *
 * 只读审计：不 build、不改 src。静态服务 dist/（与线上 ff0ffd4 同一份产物：
 *   main-3QWeGcaF.js / main-C7x8p9LC.css，已与 https://owenyhz.github.io/lightbox/ 的引用哈希逐字比对）
 * 用法：node docs/reviews/web-theme/audit.mjs [a|b|c|all]
 * 产物：docs/reviews/web-theme/evidence/audit.json + 截图
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "E:\\code\\dshCode\\Lightbox";
const dist = path.join(root, "dist");
const outDir = path.join(root, "docs", "reviews", "web-theme");
const evDir = path.join(outDir, "evidence");
fs.mkdirSync(evDir, { recursive: true });

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".glb": "model/gltf-binary", ".woff2": "font/woff2" };

/* AUDIT_SRC=1 时改为"源码直出"（与 scripts/web-polish.mjs 同口径：手工按 tokens→accents→base→cards→detail 拼 CSS），
   用来评估 12 色"设计意图"；默认服务 dist/（= 线上产物）。 */
const SRC_MODE = process.env.AUDIT_SRC === "1";
const LABEL = SRC_MODE ? "src" : "dist";
const STYLE_FILES = ["tokens.css", "accents.css", "base.css", "cards.css", "detail.css"];
const styleBundle = SRC_MODE ? STYLE_FILES.map((f) => fs.readFileSync(path.join(root, "src", "styles", f), "utf8")).join("\n") : "";
const IMPORT_MAP = '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>';
const transformJs = (code) => code.replace(/^\s*import\s+"[^"]+\.css";\s*$/gm, "");
const srcRoot = path.join(root, "src");
function srcHtml() {
  return fs.readFileSync(path.join(root, "index.html"), "utf8").replace(
    '<script type="module" src="/src/main.js"></script>',
    IMPORT_MAP + '<link rel="stylesheet" href="/__styles.css" /><script type="module" src="/src/main.js"></script>'
  );
}
const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || "/").split("?")[0]);
  if (SRC_MODE) {
    if (url === "/" || url === "/index.html") { res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" }); res.end(srcHtml()); return; }
    if (url === "/__styles.css") { res.writeHead(200, { "Content-Type": MIME[".css"], "Cache-Control": "no-store" }); res.end(styleBundle); return; }
  } else if (url === "/") {
    url = "/index.html";
  }
  let file = null;
  if (SRC_MODE) {
    if (url.startsWith("/src/")) file = path.join(root, url);
    else if (url.startsWith("/node_modules/")) file = path.join(root, url);
    else if (url.startsWith("/assets/")) file = path.join(root, "public", url);
  } else {
    file = path.join(dist, url);
  }
  if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  const ext = path.extname(file);
  const body = ext === ".js" && SRC_MODE ? transformJs(fs.readFileSync(file, "utf8")) : fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(body);
});
await new Promise((r) => server.listen(4191, "127.0.0.1", r));
const base = "http://127.0.0.1:4191/";

const ACCENTS = ["amber", "copper", "wine", "rose", "plum", "indigo", "slate", "celadon", "pine", "moss", "ochre", "graphite"];
const THEMES = ["dark", "light"];
const out = { meta: { servedFrom: dist, startedAt: new Date().toISOString() }, tokens: {}, scan: {}, cardArt: {}, loader: {}, regression: {}, errors: [] };

/* ---------------- 颜色工具 ---------------- */
const srgbToLin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * srgbToLin(c[0]) + 0.7152 * srgbToLin(c[1]) + 0.0722 * srgbToLin(c[2]);
const contrast = (a, b) => { const la = lum(a), lb = lum(b); const hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); };
const over = (fg, bg) => { const a = fg[3] === undefined ? 1 : fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; };
const parseColor = (s) => { const m = String(s).match(/[0-9.]+/g); if (!m) return [0, 0, 0, 1]; return [Number(m[0]), Number(m[1]), Number(m[2]), m.length > 3 ? Number(m[3]) : 1]; };
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
function rgbToLab(rgb) {
  const f = rgb.slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  let X = (f[0] * 0.4124 + f[1] * 0.3576 + f[2] * 0.1805) / 0.95047;
  let Y = (f[0] * 0.2126 + f[1] * 0.7152 + f[2] * 0.0722);
  let Z = (f[0] * 0.0193 + f[1] * 0.1192 + f[2] * 0.9505) / 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  X = t(X); Y = t(Y); Z = t(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const lch = (lab) => ({ L: lab[0], C: Math.hypot(lab[1], lab[2]), h: (Math.atan2(lab[2], lab[1]) * 180 / Math.PI + 360) % 360 });
const deltaE76 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const PAGE = (page, tag) => {
  page.on("pageerror", (e) => out.errors.push(tag + " pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") out.errors.push(tag + " console: " + m.text()); });
};

/* ---------------- 页面内探针 ---------------- */
const TOKENS = ["--ink-0", "--ink-1", "--ink-2", "--paper", "--paper-dim", "--paper-faint", "--hair", "--accent", "--accent-dim", "--accent-soft", "--card-a", "--card-b", "--card-border", "--panel-a", "--stage-chip", "--stage-chip-text", "--stage-credit", "--art-line", "--art-text", "--art-grid", "--chip-active-bg", "--chip-active-ink", "--btn-solid-ink", "--media-scrim", "--glass-2", "--st-active", "--st-sold", "--st-broken"];

const TOKEN_PROBE = (tokens) => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:8px;height:8px;transition:none!important";
  document.body.appendChild(probe);
  const res = {};
  for (const t of tokens) {
    probe.style.backgroundColor = "var(" + t + ")";
    res[t] = getComputedStyle(probe).backgroundColor;
  }
  probe.remove();
  return res;
};

async function injectShot(page, buf) {
  const url = "data:image/png;base64," + buf.toString("base64");
  await page.evaluate(async (u) => {
    const img = new Image();
    img.src = u;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    window.__shot = { d: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }, url);
}

/* 区域取色 + 全页文本对比度扫描（像素法：背景=区域众数色，前景=与背景亮度差最大的 0.8% 像素均值） */
const SCAN = () => {
  const sh = window.__shot;
  const d = sh.d, w = sh.w, h = sh.h;
  const px = (x, y) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const l1 = L(a), l2 = L(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const avgRect = (x0, y0, x1, y1) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1 | 0); y += 2) for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1 | 0); x += 2) { const c = px(x, y); r += c[0]; g += c[1]; b += c[2]; n++; }
    return [r / n, g / n, b / n];
  };
  const counts = new Map();
  for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
    const c = px(x, y); const k = (c[0] >> 3) + "," + (c[1] >> 3) + "," + (c[2] >> 3);
    const e = counts.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += c[0]; e.g += c[1]; e.b += c[2]; counts.set(k, e);
  }
  let mode = null;
  for (const e of counts.values()) if (!mode || e.n > mode.n) mode = e;
  const modeColor = [mode.r / mode.n, mode.g / mode.n, mode.b / mode.n];

  const regions = {
    topBar: avgRect(0, 0, w, 56),
    heroLeft: avgRect(w * 0.02, h * 0.18, w * 0.34, h * 0.42),
    heroRight: avgRect(w * 0.66, h * 0.18, w * 0.98, h * 0.42),
    toolbar: avgRect(0, h * 0.52, w, h * 0.60),
    grid: avgRect(0, h * 0.66, w, h * 0.78),
    bottom: avgRect(0, h * 0.86, w, h * 0.99),
    mean: avgRect(0, 0, w, h),
    mode: modeColor,
  };

  const label = (el) => {
    const cls = (el.className && typeof el.className === "string") ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + cls;
  };
  const rows = [];
  for (const el of document.body.querySelectorAll("*")) {
    let text = "";
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (el.closest('[aria-hidden="true"]') || el.closest("svg")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.2) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.bottom < 2 || r.top > h - 2 || r.right < 2 || r.left > w - 2) continue;
    const x0 = Math.max(0, Math.round(r.left)), x1 = Math.min(w - 1, Math.round(r.right));
    const y0 = Math.max(0, Math.round(r.top)), y1 = Math.min(h - 1, Math.round(r.bottom));
    if (x1 - x0 < 5 || y1 - y0 < 5) continue;
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
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = px(x, y); const dl = Math.abs(L(c) - bgL);
      if (dl > 0.012) cand.push([dl, c]);
    }
    if (cand.length < 4) continue;
    cand.sort((a, b) => b[0] - a[0]);
    const take = Math.max(3, Math.round(cand.length * 0.008));
    const fg = [0, 0, 0];
    for (let i = 0; i < take; i++) { fg[0] += cand[i][1][0]; fg[1] += cand[i][1][1]; fg[2] += cand[i][1][2]; }
    fg[0] /= take; fg[1] /= take; fg[2] /= take;
    const fontSize = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const need = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;
    rows.push({ sel: label(el), text: text.slice(0, 26), fontSize, weight, color: cs.color, ratio: Math.round(ratio(fg, bg) * 100) / 100, need, fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(",") });
  }
  return { regions, rows, size: [w, h] };
};

/* 指定元素区域的极值/背景对比（用于封面线稿、加载线稿） */
const ELEM_CONTRAST = (sels) => {
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
    if (x1 - x0 < 4 || y1 - y0 < 4) { res[sel] = { skip: true }; continue; }
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
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const c = px(x, y); const dl = Math.abs(L(c) - bgL);
      if (dl > 0.01) cand.push([dl, c]);
    }
    if (cand.length < 4) { res[sel] = { skip: true, bg: bg.map(Math.round).join(",") }; continue; }
    cand.sort((a, b) => b[0] - a[0]);
    const take = Math.max(3, Math.round(cand.length * 0.006));
    const fg = [0, 0, 0];
    for (let i = 0; i < take; i++) { fg[0] += cand[i][1][0]; fg[1] += cand[i][1][1]; fg[2] += cand[i][1][2]; }
    fg[0] /= take; fg[1] /= take; fg[2] /= take;
    res[sel] = { ratio: Math.round(ratio(fg, bg) * 100) / 100, fg: fg.map(Math.round).join(","), bg: bg.map(Math.round).join(","), box: [x0, y0, x1, y1] };
  }
  return res;
};

/* ---------------- 加载动画探针 ---------------- */
const INSTALL_PROBE = () => {
  const l = document.getElementById("stageLoader");
  window.__probe = { t0: performance.now(), openAt: null, marks: [] };
  const snap = () => {
    const cs = getComputedStyle(l);
    window.__probe.marks.push({ t: performance.now(), hidden: l.hidden, opacity: Math.round(parseFloat(cs.opacity) * 100) / 100, done: l.classList.contains("is-done") });
  };
  const mo = new MutationObserver(snap);
  mo.observe(l, { attributes: true, attributeFilter: ["class", "style", "hidden"] });
  let n = 0;
  const loop = () => { if (n++ < 400) { snap(); requestAnimationFrame(loop); } };
  requestAnimationFrame(loop);
};
const RESET_PROBE = () => {
  const l = document.getElementById("stageLoader");
  const t = performance.now();
  window.__probe.openAt = t;
  window.__probe.marks.length = 0;
  window.__probe.marks.push({ t: t, hidden: l.hidden, opacity: Math.round(parseFloat(getComputedStyle(l).opacity) * 100) / 100, done: l.classList.contains("is-done") });
};
const ANALYZE_PROBE = () => {
  const p = window.__probe;
  const marks = p.marks;
  const rel = (t) => Math.round(t - p.openAt);
  const after = marks.filter((m) => m.t >= p.openAt);
  const firstDone = after.find((m) => m.done);
  const firstHidden = after.find((m) => m.hidden);
  const samples = [];
  for (const ms of [40, 120, 300, 500, 700, 830, 900, 1000, 1200, 1500, 2000, 3000, 4200, 4600]) {
    const m = after.filter((x) => x.t - p.openAt <= ms).pop();
    if (m) samples.push({ at: ms, o: m.opacity, done: m.done, hidden: m.hidden });
  }
  return { fadeStartMs: firstDone ? rel(firstDone.t) : null, hiddenMs: firstHidden ? rel(firstHidden.t) : null, samples, strokeNodes: document.querySelectorAll("#stageLoaderArt [style*='--len']").length };
};

/* ---------------- 由 token 精确推导对比度矩阵 ---------------- */
function hslToRgb(h, s, l, a) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4), a === undefined ? 1 : a];
}

function matrixFor(tok, theme, accent, accentSpec) {
  const C = (k) => parseColor(tok[k]);
  const ink0 = C("--ink-0"), ink1 = C("--ink-1"), ink2 = C("--ink-2");
  const cardA = over(C("--card-a"), ink1);
  const h = accentSpec.h, s = accentSpec.s;
  const paperS = theme === "dark" ? s * 0.16 : s * 0.28 + 4;
  const stageBase = theme === "dark" ? hslToRgb(h, s * 0.5 + 4, 4.6) : hslToRgb(h, s * 0.4 + 6, 87.5);
  const stageChipBg = over(C("--stage-chip"), stageBase);
  const btnLocal = theme === "dark" ? hslToRgb(h, s, 84) : hslToRgb(h, s, 38);
  const btnFar = theme === "dark" ? hslToRgb(h, s, 68) : hslToRgb(h, s, 28);
  const loaderLine = theme === "dark" ? hslToRgb(h, paperS, 96, 0.95) : hslToRgb(h, s * 0.5, 13, 1);
  const loaderText = theme === "dark" ? hslToRgb(h, paperS, 94, 0.6) : hslToRgb(h, s * 0.5, 15, 0.66);

  const pairs = [
    ["正文 --paper on --ink-0", C("--paper"), ink0, 4.5],
    ["正文 --paper on --ink-1", C("--paper"), ink1, 4.5],
    ["正文 --paper on --card-a", C("--paper"), cardA, 4.5],
    ["次要 --paper-dim on --ink-1", C("--paper-dim"), ink1, 4.5],
    ["次要 --paper-dim on --card-a", C("--paper-dim"), cardA, 4.5],
    ["弱化 --paper-faint on --ink-1", C("--paper-faint"), ink1, 4.5],
    ["弱化 --paper-faint on --ink-2", C("--paper-faint"), ink2, 4.5],
    ["弱化 --paper-faint on --card-a", C("--paper-faint"), cardA, 4.5],
    ["accent 文字 on --ink-1", C("--accent"), ink1, 4.5],
    ["accent 文字 on --card-a", C("--accent"), cardA, 4.5],
    ["accent-dim 文字 on --ink-1", C("--accent-dim"), ink1, 4.5],
    ["芯片字 --chip-active-ink on --chip-active-bg", C("--chip-active-ink"), C("--chip-active-bg"), 4.5],
    ["实心按钮字 on 渐变亮端", C("--btn-solid-ink"), btnLocal, 4.5],
    ["实心按钮字 on 渐变暗端", C("--btn-solid-ink"), btnFar, 4.5],
    ["状态 --st-active on --ink-1", C("--st-active"), ink1, 4.5],
    ["状态 --st-retired on --ink-1", C("--st-retired"), ink1, 4.5],
    ["状态 --st-sold on --ink-1", C("--st-sold"), ink1, 4.5],
    ["状态 --st-broken on --ink-1", C("--st-broken"), ink1, 4.5],
    ["舞台角标 --stage-chip-text on 芯片底", C("--stage-chip-text"), stageChipBg, 4.5],
    ["舞台署名 --stage-credit on 舞台底", C("--stage-credit"), stageBase, 4.5],
    ["封面线稿 --art-line on --card-a", C("--art-line"), cardA, 3],
    ["封面注记 --art-text on --card-a", C("--art-text"), cardA, 3],
    ["加载线稿(覆盖值) on 舞台底", over(loaderLine, stageBase), stageBase, 3],
    ["加载注记(覆盖值) on 舞台底", over(loaderText, stageBase), stageBase, 3],
    ["卡片描边 --card-border on --ink-1(信息)", C("--card-border"), ink1, 0],
    ["发丝线 --hair on --ink-1(信息)", C("--hair"), ink1, 0],
  ];
  return pairs.map((p) => { const r = contrast(p[1], p[2]); return { label: p[0], ratio: Math.round(r * 100) / 100, need: p[3], fail: p[3] > 0 && r < p[3] - 0.005 }; });
}

const ACCENT_SPEC = { amber: [38, 46], copper: [22, 52], wine: [352, 44], rose: [340, 40], plum: [300, 34], indigo: [252, 40], slate: [210, 26], celadon: [178, 30], pine: [154, 34], moss: [100, 26], ochre: [55, 50], graphite: [220, 10] };

/* ---------------- A. 12 色 × 2 主题 ---------------- */
async function runPartA(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  PAGE(page, "A");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  for (const theme of THEMES) {
    await page.evaluate((t) => window.Lightbox.setTheme(t), theme);
    await page.waitForTimeout(800);
    for (const accent of ACCENTS) {
      const tag = LABEL + "/" + theme + "/" + accent;
      await page.evaluate((a) => window.Lightbox.setAccent(a), accent);
      await page.waitForTimeout(680);
      const tok = await page.evaluate(TOKEN_PROBE, TOKENS);
      const buf = await page.screenshot({ type: "png" });
      await injectShot(page, buf);
      const scan = await page.evaluate(SCAN);
      const regions = {};
      for (const k of Object.keys(scan.regions)) {
        const v = scan.regions[k];
        const lc = lch(rgbToLab(v));
        regions[k] = { rgb: v.map((x) => Math.round(x)), hex: hex(v), L: Math.round(lc.L * 10) / 10, C: Math.round(lc.C * 10) / 10, h: Math.round(lc.h) };
      }
      const fails = scan.rows.filter((r) => r.ratio < r.need - 0.01).sort((a, b) => a.ratio - b.ratio);
      out.scan[tag] = { regions, textCount: scan.rows.length, failCount: fails.length, worst: fails.slice(0, 10), allMin: Math.min.apply(null, scan.rows.map((r) => r.ratio)) };

      await page.evaluate(() => window.scrollTo(0, 640));
      await page.waitForTimeout(600);
      const buf2 = await page.screenshot({ type: "png" });
      await injectShot(page, buf2);
      out.cardArt[tag] = await page.evaluate(ELEM_CONTRAST, [".card .card__art", ".card:nth-child(2) .card__art", ".card:nth-child(3) .card__art"]);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(420);
      await page.screenshot({ path: path.join(evDir, "home-" + LABEL + "-" + theme + "-" + accent + ".jpg"), type: "jpeg", quality: 72 });
      const matrix = matrixFor(tok, theme, accent, { h: ACCENT_SPEC[accent][0], s: ACCENT_SPEC[accent][1] });
      out.tokens[tag] = Object.assign({}, tok, { matrix });
      console.log("[A] " + tag + " textFails=" + fails.length + " minRatio=" + out.scan[tag].allMin + " base=" + regions.mode.hex + " L" + regions.mode.L + " C" + regions.mode.C + " h" + regions.mode.h);
    }
  }
  await ctx.close();
}

/* ---------------- B. 加载动画 ---------------- */
async function runPartB(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
  const page = await ctx.newPage();
  PAGE(page, "B1");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(INSTALL_PROBE);
  await page.evaluate(() => { window.__probe.openAt = performance.now(); void window.Lightbox.open("zeniko-za12"); });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(evDir, "loader-mid-dark.jpg"), type: "jpeg", quality: 80 });
  await page.waitForTimeout(4200);
  out.loader.coldStart = await page.evaluate(ANALYZE_PROBE);
  out.loader.coldStart.styleProbe = await page.evaluate(() => {
    const art = document.getElementById("stageLoaderArt");
    const first = art.querySelector("[style*='--len']");
    const l = document.getElementById("stageLoader");
    const bar = document.querySelector(".stage__loader-bar");
    return {
      transition: getComputedStyle(l).transition,
      pointerEvents: getComputedStyle(l).pointerEvents,
      hidden: l.hidden,
      svg: Boolean(art.querySelector("svg.cover")),
      lenNodes: art.querySelectorAll("[style*='--len']").length,
      firstDasharray: first ? getComputedStyle(first).strokeDasharray : null,
      firstDashoffset: first ? getComputedStyle(first).strokeDashoffset : null,
      animName: first ? getComputedStyle(first).animationName : null,
      animDur: first ? getComputedStyle(first).animationDuration : null,
      barAnim: bar ? getComputedStyle(bar, "::after").animationName : null,
    };
  });
  out.loader.coldStart.hitAtCenter = await page.evaluate(() => {
    const s = document.getElementById("stage").getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(s.left + s.width / 2), Math.round(s.top + s.height / 2));
    return hit ? hit.tagName + "." + (hit.className || "") : null;
  });

  await page.evaluate(RESET_PROBE);
  await page.evaluate(() => { void window.Lightbox.open("konica-bm21"); });
  await page.waitForTimeout(140);
  const switchSnap = await page.evaluate(() => {
    const art = document.getElementById("stageLoaderArt");
    const first = art.querySelector("[style*='--len']");
    const l = document.getElementById("stageLoader");
    return {
      loaderOpacity: Math.round(parseFloat(getComputedStyle(l).opacity) * 100) / 100,
      loaderHidden: l.hidden,
      svgReplaced: Boolean(art.querySelector("svg.cover")),
      lenNodes: art.querySelectorAll("[style*='--len']").length,
      dashoffset: first ? getComputedStyle(first).strokeDashoffset : null,
      animName: first ? getComputedStyle(first).animationName : null,
      text: (document.getElementById("stageLoaderText") || {}).textContent,
    };
  });
  await page.waitForTimeout(3400);
  out.loader.switchReset = { at140ms: switchSnap, timing: await page.evaluate(ANALYZE_PROBE) };
  await page.evaluate(RESET_PROBE);
  await page.evaluate(() => { void window.Lightbox.open("olympus-45"); });
  await page.waitForTimeout(3600);
  out.loader.warmRebuild = await page.evaluate(ANALYZE_PROBE);
  await page.keyboard.press("Escape");
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
  const p2 = await ctx2.newPage();
  PAGE(p2, "B3");
  await p2.route("**/*.glb", () => new Promise(() => {}));
  await p2.goto(base, { waitUntil: "networkidle" });
  await p2.waitForTimeout(700);
  await p2.evaluate(INSTALL_PROBE);
  await p2.evaluate(() => { window.__probe.openAt = performance.now(); void window.Lightbox.open("zeniko-za12"); });
  await p2.waitForTimeout(5400);
  out.loader.failsafe = await p2.evaluate(ANALYZE_PROBE);
  out.loader.failsafe.state = await p2.evaluate(() => {
    const l = document.getElementById("stageLoader");
    const sr = document.getElementById("stage").getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(sr.left + sr.width / 2), Math.round(sr.top + sr.height / 2));
    return {
      hidden: l.hidden,
      opacity: getComputedStyle(l).opacity,
      pointerEvents: getComputedStyle(l).pointerEvents,
      hitAtCenter: hit ? hit.tagName + "." + (hit.className || "") : null,
      fallbackVisible: !document.getElementById("stageFallback").hidden,
      fallbackText: document.getElementById("stageFallback").textContent.slice(0, 60),
    };
  });
  await p2.screenshot({ path: path.join(evDir, "failsafe-glb-hang.jpg"), type: "jpeg", quality: 76 });
  await ctx2.close();

  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN", reducedMotion: "reduce" });
  const p3 = await ctx3.newPage();
  PAGE(p3, "B4");
  await p3.goto(base, { waitUntil: "networkidle" });
  await p3.waitForTimeout(700);
  await p3.evaluate(() => { void window.Lightbox.open("zeniko-za12"); });
  await p3.waitForTimeout(320);
  out.loader.reduced = await p3.evaluate(() => {
    const art = document.getElementById("stageLoaderArt");
    const line = art.querySelector(".cover .line");
    const leaf = line ? line.querySelector("*") : null;
    const l = document.getElementById("stageLoader");
    return {
      svg: Boolean(art.querySelector("svg.cover")),
      artOpacity: getComputedStyle(art).opacity,
      artAnimation: getComputedStyle(art).animationName,
      lenNodes: art.querySelectorAll("[style*='--len']").length,
      lineDasharray: line ? getComputedStyle(line).strokeDasharray : null,
      lineAnim: line ? getComputedStyle(line).animationName : null,
      leafDashoffset: leaf ? getComputedStyle(leaf).strokeDashoffset : null,
      scanDisplay: getComputedStyle(art, "::after").display,
      barAnim: getComputedStyle(document.querySelector(".stage__loader-bar"), "::after").animationName,
      loaderPointerEvents: getComputedStyle(l).pointerEvents,
      loaderOpacity: getComputedStyle(l).opacity,
      artHeight: Math.round(art.getBoundingClientRect().height),
    };
  });
  await p3.screenshot({ path: path.join(evDir, "loader-reduced-motion.jpg"), type: "jpeg", quality: 80 });
  await p3.waitForTimeout(1400);
  out.loader.reduced.afterReady = await p3.evaluate(() => ({ hidden: document.getElementById("stageLoader").hidden, opacity: getComputedStyle(document.getElementById("stageLoader")).opacity }));
  await ctx3.close();
}

/* ---------------- C. 回归 ---------------- */
async function runPartC(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", locale: "zh-CN" });
  const page = await ctx.newPage();
  PAGE(page, "C");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => { window.Lightbox.setTheme("dark"); window.Lightbox.setAccent("amber"); });
  await page.waitForTimeout(900);

  const RECTS = () => {
    const sels = [".topbar", ".hero__title", ".hero__lede", ".toolbar", ".card", ".sitefoot"];
    const o = {};
    for (const s of sels) { const e = document.querySelector(s); if (!e) { o[s] = null; continue; } const r = e.getBoundingClientRect(); o[s] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }
    o.scrollH = document.documentElement.scrollHeight;
    return o;
  };
  const MEAN = () => {
    const sh = window.__shot; const d = sh.d;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 160) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  };

  await page.evaluate(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    } catch (e) {}
  });
  const before = await page.evaluate(RECTS);
  const seq = [];
  const t0 = Date.now();
  await page.evaluate(() => window.Lightbox.setTheme("light"));
  for (const at of [0, 90, 260, 520]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const buf = await page.screenshot({ type: "png" });
    await injectShot(page, buf);
    seq.push({ at: Date.now() - t0, mean: await page.evaluate(MEAN) });
  }
  await page.waitForTimeout(700);
  const afterDarkToLight = await page.evaluate(RECTS);
  out.regression.themeSwitch = {
    rectsBefore: before, rectsAfter: afterDarkToLight,
    layoutShift: await page.evaluate(() => Math.round(window.__cls * 10000) / 10000),
    luminanceSeq: seq.map((s) => ({ at: s.at, mean: s.mean, Y: Math.round((0.2126 * s.mean[0] + 0.7152 * s.mean[1] + 0.0722 * s.mean[2]) * 10) / 10 })),
    transitionDurationApplied: await page.evaluate(() => {
      const root = document.documentElement;
      root.classList.add("is-theme-switching");
      const btn = document.querySelector(".theme__btn");
      const dur = btn ? getComputedStyle(btn).transitionDuration : null;
      root.classList.remove("is-theme-switching");
      return dur;
    }),
    metaThemeColor: await page.evaluate(() => document.getElementById("themeColor").content),
    ink1: await page.evaluate(() => { const p = document.createElement("div"); p.style.cssText = "position:fixed;left:-9999px;width:8px;height:8px"; p.style.backgroundColor = "var(--ink-1)"; document.body.appendChild(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; }),
  };
  await page.screenshot({ path: path.join(evDir, "switch-light-amber.jpg"), type: "jpeg", quality: 76 });

  const beforeAcc = await page.evaluate(RECTS);
  await page.evaluate(() => { window.__cls = 0; });
  await page.evaluate(() => window.Lightbox.setAccent("indigo"));
  await page.waitForTimeout(16);
  const at16 = await page.evaluate(() => ({ accent: document.documentElement.dataset.accent, switching: document.documentElement.classList.contains("is-theme-switching") }));
  await page.waitForTimeout(700);
  const afterAcc = await page.evaluate(RECTS);
  out.regression.accentSwitch = {
    rectsBefore: beforeAcc, rectsAfter: afterAcc, at16ms: at16,
    layoutShift: await page.evaluate(() => Math.round(window.__cls * 10000) / 10000),
  };
  await page.screenshot({ path: path.join(evDir, "switch-light-indigo.jpg"), type: "jpeg", quality: 76 });

  await page.evaluate(() => { void window.Lightbox.open("zeniko-za12"); });
  await page.waitForTimeout(900);
  const detailBuf = await page.screenshot({ type: "png" });
  await injectShot(page, detailBuf);
  out.regression.detailLight = await page.evaluate(ELEM_CONTRAST, [".stage__loader-art", ".stage__hint", ".spec dd", ".tag", "#detailNote"]);
  out.regression.detailTokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const loader = document.querySelector(".stage__loader-art");
    const card = document.querySelector(".card__art");
    const probe = (v) => { const p = document.createElement("div"); p.style.cssText = "position:fixed;left:-9999px;width:8px;height:8px"; p.style.backgroundColor = v; document.body.appendChild(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; };
    return {
      artLineRoot: cs.getPropertyValue("--art-line").trim(),
      artLineLoader: loader ? getComputedStyle(loader).getPropertyValue("--art-line").trim() : null,
      artTextLoader: loader ? getComputedStyle(loader).getPropertyValue("--art-text").trim() : null,
      artLineCard: card ? getComputedStyle(card).getPropertyValue("--art-line").trim() : null,
      cardA: probe("var(--card-a)"),
      stageChipText: cs.getPropertyValue("--stage-chip-text").trim(),
      stageHintColor: document.querySelector(".stage__hint") ? getComputedStyle(document.querySelector(".stage__hint")).color : null,
    };
  });
  await page.screenshot({ path: path.join(evDir, "detail-light-indigo.jpg"), type: "jpeg", quality: 78 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await page.evaluate(() => window.Lightbox.setTheme("dark"));
  await page.waitForTimeout(800);
  await page.evaluate(() => { void window.Lightbox.open("zeniko-za12"); });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(evDir, "detail-dark-indigo.jpg"), type: "jpeg", quality: 78 });
  await ctx.close();

  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: "light", locale: "zh-CN" });
  const p2 = await ctx2.newPage();
  PAGE(p2, "C-editor");
  await p2.addInitScript(() => {
    try { localStorage.setItem("lightbox.theme", "light"); localStorage.setItem("lightbox.accent", "indigo"); } catch (e) {}
  });
  await p2.goto(base + "tools/gear-editor.html", { waitUntil: "networkidle" });
  await p2.waitForTimeout(900);
  out.regression.editorPage = await p2.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.getAttribute("data-theme"),
      accentAttr: document.documentElement.getAttribute("data-accent"),
      ink1: cs.getPropertyValue("--ink-1").trim(),
      paper: cs.getPropertyValue("--paper").trim(),
      bg: getComputedStyle(document.body).backgroundColor,
      accent: cs.getPropertyValue("--accent").trim(),
      colorScheme: cs.colorScheme,
    };
  });
  await p2.screenshot({ path: path.join(evDir, "editor-light-indigo.jpg"), type: "jpeg", quality: 72 });
  await ctx2.close();
}

/* ---------------- main ---------------- */
const part = (process.argv[2] || "all").toLowerCase();
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
try {
  if (part === "a" || part === "all") await runPartA(browser);
  if (part === "b" || part === "all") await runPartB(browser);
  if (part === "c" || part === "all") await runPartC(browser);
} catch (e) {
  out.fatal = String((e && e.stack) || e);
}
await browser.close();
server.close();
fs.writeFileSync(path.join(evDir, "audit-" + part + ".json"), JSON.stringify(out, null, 1));
console.log("WROTE " + path.join(evDir, "audit-" + part + ".json"));
if (out.fatal) console.log("FATAL " + out.fatal);
process.exit(0);

