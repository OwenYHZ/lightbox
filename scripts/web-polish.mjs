import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/* --------------------------------------------------------------------------
   Lightbox · 网页质感打磨自证（不 build：源码直出）

   产出 shots/web-polish/
     - dark|light × amber|indigo|celadon 的 首屏 / 卡片 / 加载动画 / 详情页
     - audit-dark.jpg / audit-light.jpg：12 个 accent 的拼图
   用法：
     node scripts/web-polish.mjs           完整
     WP_QUICK=1 node scripts/web-polish.mjs 只跑 6 个组合（省时间）
   -------------------------------------------------------------------------- */

const root = "E:\\code\\dshCode\\Lightbox";
const shots = path.join(root, "shots", "web-polish");
const auditDir = path.join(shots, "audit");
fs.mkdirSync(shots, { recursive: true });
fs.mkdirSync(auditDir, { recursive: true });

const QUICK = process.env.WP_QUICK === "1";
/* 默认服务 dist/：审核以产物为准（源码直出会掩盖 CSS 分包顺序问题）
   WP_SRC=1 可切回源码直出，仅用于设计意图排查 */
const DIST = process.env.WP_SRC !== "1";
const siteRoot = DIST ? path.join(root, "dist") : root;
const EXPECT = {
  amber: [38, "46%"], copper: [22, "52%"], wine: [356, "52%"], rose: [332, "47%"],
  plum: [300, "34%"], indigo: [252, "40%"], slate: [206, "34%"], celadon: [178, "30%"],
  pine: [154, "34%"], moss: [100, "26%"], ochre: [55, "50%"], graphite: [226, "5%"],
};
const STYLE_ORDER = ["tokens.css", "accents.css", "base.css", "cards.css", "detail.css"];
const styleBundle = STYLE_ORDER.map((f) => fs.readFileSync(path.join(root, "src", "styles", f), "utf8")).join("\n");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".glb": "model/gltf-binary",
};

const IMPORT_MAP =
  '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>';

function appHtml() {
  const raw = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return raw.replace(
    '<script type="module" src="/src/main.js"></script>',
    IMPORT_MAP +
      '<link rel="stylesheet" href="/__styles.css" />' +
      '<script type="module" src="/src/main.js"></script>'
  );
}

/* 浏览器不认裸 CSS import，摘掉（样式由 /__styles.css 统一给） */
const transformJs = (code) => code.replace(/^\s*import\s+"[^"]+\.css";\s*$/gm, "");

function sheetHtml(theme, files) {
  const cells = files
    .map((f) => {
      const name = path.basename(f, ".jpg").replace(theme + "-", "").replace("-home", "");
      return '<figure><img src="/_shots/audit/' + f + '" /><figcaption>' + name + "</figcaption></figure>";
    })
    .join("");
  return (
    '<!doctype html><html><head><meta charset="utf-8" /><style>' +
    "body{margin:0;background:#0d0d10;color:#bbb;font:11px/1.4 ui-monospace,monospace;padding:14px}" +
    "h1{font-size:12px;letter-spacing:.22em;margin:0 0 12px;color:#eee}" +
    ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}" +
    "figure{margin:0;background:#000;border:1px solid #2c2c30}" +
    "img{display:block;width:100%}" +
    "figcaption{padding:5px 7px;letter-spacing:.14em}" +
    "</style></head><body><h1>LIGHTBOX · " +
    theme.toUpperCase() +
    " · ALL 12 ACCENTS</h1><div class='grid'>" +
    cells +
    "</div></body></html>"
  );
}

function send(res, type, body, status = 200) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const query = new URLSearchParams((req.url || "").split("?")[1] || "");

  if (DIST) {
    if (url === "/__sheet") {
      const theme = query.get("theme") === "light" ? "light" : "dark";
      const files = fs.readdirSync(auditDir).filter((f) => f.startsWith(theme + "-") && f.endsWith("-home.jpg")).sort();
      return send(res, MIME[".html"], sheetHtml(theme, files));
    }
    if (url.startsWith("/_shots/")) {
      const f = path.join(shots, url.slice("/_shots/".length));
      if (fs.existsSync(f)) return send(res, MIME[path.extname(f)] || "application/octet-stream", fs.readFileSync(f));
      return send(res, "text/plain", "not found", 404);
    }
    let distFile = path.join(siteRoot, url === "/" ? "index.html" : url);
    if (!distFile.startsWith(siteRoot) || !fs.existsSync(distFile) || fs.statSync(distFile).isDirectory()) {
      distFile = path.join(siteRoot, "index.html");
    }
    return send(res, MIME[path.extname(distFile)] || "application/octet-stream", fs.readFileSync(distFile));
  }

  if (url === "/" || url === "/index.html") return send(res, MIME[".html"], appHtml());
  if (url === "/__styles.css") return send(res, MIME[".css"], styleBundle);
  if (url === "/__sheet") {
    const theme = query.get("theme") === "light" ? "light" : "dark";
    const files = fs
      .readdirSync(auditDir)
      .filter((f) => f.startsWith(theme + "-") && f.endsWith("-home.jpg"))
      .sort();
    return send(res, MIME[".html"], sheetHtml(theme, files));
  }
  if (url.startsWith("/_shots/")) {
    const file = path.join(shots, url.slice("/_shots/".length));
    if (fs.existsSync(file)) return send(res, MIME[path.extname(file)] || "application/octet-stream", fs.readFileSync(file));
    return send(res, "text/plain", "not found", 404);
  }

  let file = null;
  if (url.startsWith("/assets/")) file = path.join(root, "public", url);
  else if (url.startsWith("/src/")) file = path.join(root, url);
  else if (url.startsWith("/node_modules/")) file = path.join(root, url);

  if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, "text/plain", "not found", 404);
  }
  const ext = path.extname(file);
  const body = ext === ".js" ? transformJs(fs.readFileSync(file, "utf8")) : fs.readFileSync(file);
  return send(res, MIME[ext] || "application/octet-stream", body);
});

await new Promise((r) => server.listen(4189, "127.0.0.1", r));
const base = "http://127.0.0.1:4189/";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const errors = [];
const results = { tokens: {}, checks: {}, audit: {}, contrast: {} };

/* 页面里量一次可读性：把两个 CSS 变量合成后算 WCAG 对比度 */
const CONTRAST_PROBE = `(() => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px";
  /* 主题切换会给所有元素挂 !important 过渡，读计算值会拿到过渡起点，这里禁掉 */
  probe.style.setProperty("transition", "none", "important");
  document.body.appendChild(probe);
  const rgb = (token) => {
    probe.style.backgroundColor = "var(" + token + ")";
    const c = getComputedStyle(probe).backgroundColor;
    const m = c.match(/[0-9.]+/g);
    return m ? [Number(m[0]), Number(m[1]), Number(m[2]), m.length > 3 ? Number(m[3]) : 1] : [0, 0, 0, 1];
  };
  const over = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
  const lum = (c) => {
    const f = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (fgToken, bgToken) => {
    const bg = rgb(bgToken);
    const fg = rgb(fgToken);
    const a = lum(over(fg, bg));
    const b = lum(bg);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  };
  const out = {
    paperOnInk: ratio("--paper", "--ink-1"),
    dimOnInk: ratio("--paper-dim", "--ink-1"),
    faintOnInk: ratio("--paper-faint", "--ink-1"),
    accentOnInk: ratio("--accent", "--ink-1"),
    chipInkOnChip: ratio("--chip-active-ink", "--chip-active-bg"),
    cardBorderOnCard: ratio("--card-border", "--card-a"),
  };
  probe.remove();
  return out;
})()`;

const COMBOS = [
  { theme: "dark", accent: "amber" },
  { theme: "dark", accent: "indigo" },
  { theme: "dark", accent: "celadon" },
  { theme: "light", accent: "amber" },
  { theme: "light", accent: "indigo" },
  { theme: "light", accent: "celadon" },
];

function hook(page, tag) {
  page.on("pageerror", (e) => errors.push(tag + " pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(tag + " console: " + m.text());
  });
}

const shot = (page, file, opts = {}) =>
  page.screenshot({ path: path.join(shots, file), type: "jpeg", quality: 82, ...opts });

/* ---------------------------------------------------------------- 主流程 */
for (const combo of COMBOS) {
  const tag = combo.theme + "-" + combo.accent;
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: combo.theme,
    locale: "zh-CN",
  });
  const page = await ctx.newPage();
  hook(page, tag);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  await page.evaluate(
    ([theme, accent]) => {
      window.Lightbox.setTheme(theme);
      window.Lightbox.setAccent(accent);
    },
    [combo.theme, combo.accent]
  );
  await page.waitForTimeout(750);

  results.tokens[tag] = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const pick = (n) => cs.getPropertyValue(n).trim();
    return {
      accent: document.documentElement.dataset.accent,
      theme: document.documentElement.dataset.theme,
      ink0: pick("--ink-0"),
      ink1: pick("--ink-1"),
      paper: pick("--paper"),
      cardBorder: pick("--card-border"),
      pageBg: pick("--page-bg").slice(0, 64),
      metaThemeColor: document.getElementById("themeColor").getAttribute("content"),
    };
  });

  await shot(page, tag + "-home.jpg");

  await page.evaluate(() => window.scrollTo(0, 780));
  await page.waitForTimeout(650);
  await shot(page, tag + "-cards.jpg");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  /* --- 加载动画：把 viewer 模块的请求人为延后 1.4s，
         这样一定能抓到封面描边画到一半的样子（真实冷启动也是这个状态） --- */
  await page.route("**/lib/three/viewer.js", async (route) => {
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await route.continue();
    } catch (error) {
      /* 页面可能已经关掉 */
    }
  });
  await page.evaluate(() => {
    void window.Lightbox.open("zeniko-za12");
  });
  await page.waitForTimeout(380);
  await shot(page, tag + "-loader.jpg");
  results.checks[tag] = await page.evaluate(() => {
    const loader = document.getElementById("stageLoader");
    const art = document.getElementById("stageLoaderArt");
    const stage = document.getElementById("stage").getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(stage.left + stage.width / 2), Math.round(stage.top + stage.height / 2));
    return {
      loaderOpacityWhileLoading: getComputedStyle(loader).opacity,
      loaderPointerEvents: getComputedStyle(loader).pointerEvents,
      artSvg: Boolean(art.querySelector("svg.cover")),
      drawnNodes: art.querySelectorAll('[style*="--len"]').length,
      hitIsCanvas: Boolean(hit && hit.tagName === "CANVAS"),
      hitTag: hit ? hit.tagName : null,
      loaderText: document.getElementById("stageLoaderText").textContent,
    };
  });
  await page.waitForTimeout(560);
  await shot(page, tag + "-loader-b.jpg");

  await page.unroute("**/lib/three/viewer.js");
  await page
    .waitForFunction(
      () => {
        const c = document.querySelector("#stageMount canvas");
        return c && c.classList.contains("is-ready");
      },
      { timeout: 60000 }
    )
    .catch(() => {});
  await page.waitForTimeout(1600);
  await shot(page, tag + "-detail.jpg");
  results.checks[tag].loaderDoneOpacity = await page.evaluate(
    () => getComputedStyle(document.getElementById("stageLoader")).opacity
  );
  results.checks[tag].hitAfterReady = await page.evaluate(() => {
    const stage = document.getElementById("stage").getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(stage.left + stage.width / 2), Math.round(stage.top + stage.height / 2));
    return hit ? hit.tagName : null;
  });

  /* 切换器材：加载动画必须重置（新的 SVG、重新描边、重新露出） */
  const before = await page.evaluate(() => document.querySelectorAll("#stageLoaderArt [style*='--len']").length);
  await page.evaluate(() => {
    void window.Lightbox.open("konica-bm21");
  });
  await page.waitForTimeout(120);
  results.checks[tag].resetOnSwitch = await page.evaluate((prevCount) => {
    const art = document.getElementById("stageLoaderArt");
    const first = art.querySelector('[style*="--len"]');
    return {
      prevDrawnNodes: prevCount,
      drawnNodes: art.querySelectorAll('[style*="--len"]').length,
      animation: first ? getComputedStyle(first).animationName : null,
      loaderOpacity: getComputedStyle(document.getElementById("stageLoader")).opacity,
      svgReplaced: Boolean(art.querySelector("svg.cover")),
    };
  }, before);
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await ctx.close();
}

/* ---------------------------------------------------------------- 减弱动效 */
if (!QUICK) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    reducedMotion: "reduce",
    locale: "zh-CN",
  });
  const page = await ctx.newPage();
  hook(page, "reduced");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.route("**/lib/three/viewer.js", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await route.continue();
    } catch (error) {}
  });
  await page.evaluate(() => {
    void window.Lightbox.open("zeniko-za12");
  });
  await page.waitForTimeout(500);
  results.checks["reduced-motion"] = await page.evaluate(() => {
    const art = document.getElementById("stageLoaderArt");
    const first = art.querySelector(".cover .line > *");
    return {
      artOpacity: getComputedStyle(art).opacity,
      svgPresent: Boolean(art.querySelector("svg.cover")),
      firstDashoffset: first ? getComputedStyle(first).strokeDashoffset : null,
      firstAnimation: first ? getComputedStyle(first).animationName : null,
      scanDisplay: getComputedStyle(art, "::after").display,
      loaderPointerEvents: getComputedStyle(document.getElementById("stageLoader")).pointerEvents,
    };
  });
  await shot(page, "reduced-motion-loader.jpg");
  await ctx.close();
}

/* ---------------------------------------------------------------- 12 色审计 */
const ACCENTS = ["amber", "copper", "wine", "rose", "plum", "indigo", "slate", "celadon", "pine", "moss", "ochre", "graphite"];
if (!QUICK) {
  const ctx = await browser.newContext({ viewport: { width: 1120, height: 760 }, colorScheme: "dark", locale: "zh-CN" });
  const page = await ctx.newPage();
  hook(page, "audit");
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  for (const theme of ["dark", "light"]) {
    await page.evaluate((t) => window.Lightbox.setTheme(t), theme);
    for (const accent of ACCENTS) {
      await page.evaluate((a) => window.Lightbox.setAccent(a), accent);
      await page.waitForTimeout(560);
      await page.screenshot({ path: path.join(auditDir, theme + "-" + accent + "-home.jpg"), type: "jpeg", quality: 74 });
      const seen = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return { h: cs.getPropertyValue("--accent-h").trim(), s: cs.getPropertyValue("--accent-s").trim() };
      });
      const want = EXPECT[accent];
      if (!want || seen.h !== String(want[0]) || seen.s !== want[1]) {
        throw new Error(
          "[accent 未生效] " + theme + "/" + accent + " 期望 --accent-h=" + (want && want[0]) +
            " --accent-s=" + (want && want[1]) + "，实际 " + seen.h + " / " + seen.s +
            (DIST ? "（请检查 dist 里 accents.css 是否进包/是否被 :root 压掉）" : "")
        );
      }

      results.audit[theme + "-" + accent] = await page.evaluate((probeSrc) => {
        const cs = getComputedStyle(document.documentElement);
        const contrast = eval(probeSrc);
        return {
          ink0: cs.getPropertyValue("--ink-0").trim(),
          ink1: cs.getPropertyValue("--ink-1").trim(),
          paper: cs.getPropertyValue("--paper").trim(),
          contrast,
        };
      }, CONTRAST_PROBE);
    }
  }
  await ctx.close();

  /* tools 页是否跟随主站主题（P1-6）：浅色 + 靛青 */
  {
    const tctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: "light", locale: "zh-CN" });
    const tp = await tctx.newPage();
    hook(tp, "tools");
    await tp.goto(base + "tools/gear-editor.html", { waitUntil: "networkidle" });
    await tp.evaluate(() => {
      localStorage.setItem("lightbox.theme", "light");
      localStorage.setItem("lightbox.accent", "indigo");
    });
    await tp.reload({ waitUntil: "networkidle" });
    await tp.waitForTimeout(600);
    results.tools = await tp.evaluate(() => {
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

  const sheetCtx = await browser.newContext({ viewport: { width: 1400, height: 1080 } });
  for (const theme of ["dark", "light"]) {
    const p = await sheetCtx.newPage();
    await p.goto(base + "__sheet?theme=" + theme, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(shots, "audit-" + theme + ".jpg"), type: "jpeg", quality: 80, fullPage: true });
    await p.close();
  }
  await sheetCtx.close();
}

await browser.close();
server.close();
console.log(JSON.stringify({ errors, results }, null, 1));
process.exit(0);