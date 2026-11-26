import fs from "node:fs";
const dir = "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\";
const src = JSON.parse(fs.readFileSync(dir + "audit-src-a.json", "utf8"));

const srgbToLin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * srgbToLin(c[0]) + 0.7152 * srgbToLin(c[1]) + 0.0722 * srgbToLin(c[2]);
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const over = (fg, bg) => { const a = fg[3] === undefined ? 1 : fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; };
const pc = (s) => { const m = String(s).match(/[0-9.]+/g); return m ? [Number(m[0]), Number(m[1]), Number(m[2]), m.length > 3 ? Number(m[3]) : 1] : [0, 0, 0, 1]; };
function hslToRgb(h, s, l, a) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [255 * f(0), 255 * f(8), 255 * f(4), a === undefined ? 1 : a]; }
function rgbToLab(rgb) { const f = rgb.slice(0, 3).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); let X = (f[0] * 0.4124 + f[1] * 0.3576 + f[2] * 0.1805) / 0.95047, Y = (f[0] * 0.2126 + f[1] * 0.7152 + f[2] * 0.0722), Z = (f[0] * 0.0193 + f[1] * 0.1192 + f[2] * 0.9505) / 1.08883; const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116); X = t(X); Y = t(Y); Z = t(Z); return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; }
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const SPEC = { amber: [38, 46], copper: [22, 52], wine: [352, 44], rose: [340, 40], plum: [300, 34], indigo: [252, 40], slate: [210, 26], celadon: [178, 30], pine: [154, 34], moss: [100, 26], ochre: [55, 50], graphite: [220, 10] };
const ACC = Object.keys(SPEC);

function matrix(tok, theme, accent) {
  const C = (k) => pc(tok[k]);
  const ink0 = C("--ink-0"), ink1 = C("--ink-1"), ink2 = C("--ink-2");
  const cardA = over(C("--card-a"), ink1);
  const [h, s] = SPEC[accent];
  const paperS = theme === "dark" ? s * 0.16 : s * 0.28 + 4;
  const stageBase = theme === "dark" ? hslToRgb(h, s * 0.5 + 4, 4.6) : hslToRgb(h, s * 0.4 + 6, 87.5);
  const chipBg = over(C("--stage-chip"), stageBase);
  const btnA = theme === "dark" ? hslToRgb(h, s, 84) : hslToRgb(h, s, 38);
  const btnB = theme === "dark" ? hslToRgb(h, s, 68) : hslToRgb(h, s, 28);
  const loaderLine = theme === "dark" ? hslToRgb(h, paperS, 96, 0.95) : hslToRgb(h, s * 0.5, 13, 1);
  const loaderText = theme === "dark" ? hslToRgb(h, paperS, 94, 0.6) : hslToRgb(h, s * 0.5, 15, 0.66);
  const P = (label, fg, bg, need) => { const f = over(fg, bg); const r = contrast(f, bg); return { label, ratio: Math.round(r * 100) / 100, need, fail: r < need - 0.005 }; };
  return [
    P("正文 --paper/ink-0", C("--paper"), ink0, 4.5),
    P("正文 --paper/ink-1", C("--paper"), ink1, 4.5),
    P("正文 --paper/card", C("--paper"), cardA, 4.5),
    P("次要 --paper-dim/ink-1", C("--paper-dim"), ink1, 4.5),
    P("次要 --paper-dim/card", C("--paper-dim"), cardA, 4.5),
    P("弱化 --paper-faint/ink-1", C("--paper-faint"), ink1, 4.5),
    P("弱化 --paper-faint/ink-2", C("--paper-faint"), ink2, 4.5),
    P("弱化 --paper-faint/card", C("--paper-faint"), cardA, 4.5),
    P("accent/ink-1", C("--accent"), ink1, 4.5),
    P("accent/card", C("--accent"), cardA, 4.5),
    P("accent-dim/ink-1", C("--accent-dim"), ink1, 4.5),
    P("芯片字/chip-bg", C("--chip-active-ink"), C("--chip-active-bg"), 4.5),
    P("实心按钮字/渐变亮端", C("--btn-solid-ink"), btnA, 4.5),
    P("实心按钮字/渐变暗端", C("--btn-solid-ink"), btnB, 4.5),
    P("状态 active/ink-1", C("--st-active"), ink1, 4.5),
    P("状态 retired/ink-1", C("--st-retired"), ink1, 4.5),
    P("状态 sold/ink-1", C("--st-sold"), ink1, 4.5),
    P("状态 broken/ink-1", C("--st-broken"), ink1, 4.5),
    P("舞台角标/chip底", C("--stage-chip-text"), chipBg, 4.5),
    P("舞台署名/stage底", C("--stage-credit"), stageBase, 4.5),
    P("封面线稿/card", C("--art-line"), cardA, 3),
    P("封面注记/card", C("--art-text"), cardA, 3),
    P("加载线稿/stage底", loaderLine, stageBase, 3),
    P("加载注记/stage底", loaderText, stageBase, 3),
    P("卡片描边/ink-1(信息)", C("--card-border"), ink1, 0),
    P("发丝线/ink-1(信息)", C("--hair"), ink1, 0),
  ];
}

const out = { matrix: {}, palette: {}, indistinct: {} };
for (const theme of ["dark", "light"]) {
  for (const accent of ACC) {
    const key = "src/" + theme + "/" + accent;
    const tok = src.tokens[key];
    out.matrix[key] = matrix(tok, theme, accent);
  }
}
/* 调色板：base/mode 与 mean 的 Lab + 与 amber 的 ΔE + 两两 ΔE */
for (const theme of ["dark", "light"]) {
  const list = [];
  for (const accent of ACC) {
    const r = src.scan["src/" + theme + "/" + accent].regions;
    list.push({ accent, mode: r.mode, mean: r.mean, hero: r.heroLeft });
  }
  const ref = rgbToLab(list[0].mean.rgb);
  out.palette[theme] = list.map((x) => ({
    accent: x.accent, modeHex: x.mode.hex, modeL: x.mode.L, modeC: x.mode.C, modeH: x.mode.h,
    meanHex: x.mean.hex, meanL: x.mean.L, meanC: x.mean.C, meanH: x.mean.h,
    heroC: x.hero.C, heroH: x.hero.h,
    dE_mean_vs_amber: Math.round(dE(rgbToLab(x.mean.rgb), ref) * 10) / 10,
  }));
  const pairs = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = dE(rgbToLab(list[i].mode.rgb), rgbToLab(list[j].mode.rgb));
    const dm = dE(rgbToLab(list[i].mean.rgb), rgbToLab(list[j].mean.rgb));
    if (Math.min(d, dm) < 3) pairs.push({ a: list[i].accent, b: list[j].accent, dE_mode: Math.round(d * 10) / 10, dE_mean: Math.round(dm * 10) / 10 });
  }
  out.indistinct[theme] = pairs;
  console.log("== " + theme + " palette (mean) ==");
  for (const p of out.palette[theme]) console.log(p.accent + " mode=" + p.modeHex + " L" + p.modeL + " C" + p.modeC + " h" + p.modeH + " | mean=" + p.meanHex + " L" + p.meanL + " C" + p.meanC + " h" + p.meanH + " | dE_vs_amber=" + p.dE_mean_vs_amber);
  console.log("indistinct pairs (dE<3):", JSON.stringify(pairs));
}
console.log("== matrix fails per accent ==");
for (const key of Object.keys(out.matrix)) {
  const f = out.matrix[key].filter((x) => x.fail);
  console.log(key + " fails=" + f.length + " :: " + f.map((x) => x.label + "@" + x.ratio).join(", "));
}
fs.writeFileSync(dir + "token-matrix.json", JSON.stringify(out, null, 1));
console.log("WROTE token-matrix.json");
