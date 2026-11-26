// 求"达到目标对比度"的 token 取值（在真实背景取色上算，sRGB 空间合成）
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const l1 = Y(a), l2 = Y(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const blend = (fg, bg, a) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
function hsl(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [255 * f(0), 255 * f(8), 255 * f(4)]; }

const BG = {
  lightPage: [232, 226, 211], lightCard: [244, 241, 237], lightStage: [243, 241, 237],
  darkPage: [33, 28, 21], darkCard: [52, 43, 28], darkStage: [34, 29, 20],
  darkChip: [23, 19, 13], lightChip: [252, 250, 248],
};

function solveAlpha(h, s, l, bg, target) {
  let best = null;
  for (let a = 0.2; a <= 1.0001; a += 0.01) {
    const c = blend(hsl(h, s, l), bg, a);
    const r = ratio(c, bg);
    if (r >= target) { best = { a: Math.round(a * 100) / 100, r: Math.round(r * 100) / 100 }; break; }
  }
  return best;
}

console.log("== 需要的 alpha（target 4.5 / 3.0）==");
const rows = [
  ["light --paper-faint  (h38 s16.9 L15) on page", 38, 16.9, 15, BG.lightPage],
  ["light --paper-faint  (h38 s16.9 L15) on card", 38, 16.9, 15, BG.lightCard],
  ["dark  --paper-faint  (h38 s7.4 L90) on page", 38, 7.4, 90, BG.darkPage],
  ["dark  --paper-faint  (h38 s7.4 L90) on card", 38, 7.4, 90, BG.darkCard],
  ["light --stage-credit (h38 s6.8 L18) on stage", 38, 6.8, 18, BG.lightStage],
  ["dark  --stage-credit (h38 s7.4 L90) on stage", 38, 7.4, 90, BG.darkStage],
  ["light --stage-chip-text (h38 s18.4 L16) on chip", 38, 18.4, 16, BG.lightChip],
  ["dark  --stage-chip-text (h38 s7.4 L92) on chip", 38, 7.4, 92, BG.darkChip],
  ["light --accent-dim text (h38 s46 L31) on page", 38, 46, 31, BG.lightPage],
];
for (const [name, h, s, l, bg] of rows) {
  console.log(name + " -> a45=" + JSON.stringify(solveAlpha(h, s, l, bg, 4.5)) + " a30=" + JSON.stringify(solveAlpha(h, s, l, bg, 3.0)));
}

console.log("== 浅色 --accent 需要多深的 L（目标 4.5，按各色 h/s）==");
for (const [name, h, s] of [["amber", 38, 46], ["copper", 22, 52], ["ochre", 55, 50], ["celadon", 178, 30], ["pine", 154, 34], ["indigo", 252, 40]]) {
  let ok = null;
  for (let l = 31; l >= 20; l -= 0.5) {
    const r = ratio(hsl(h, s, l), BG.lightCard);
    if (r >= 4.5) { ok = { L: l, r: Math.round(r * 100) / 100 }; break; }
  }
  console.log("  " + name + " 当前L31=" + Math.round(ratio(hsl(h, s, 31), BG.lightCard) * 100) / 100 + " -> 需要 " + JSON.stringify(ok));
}

console.log("== 浅色实心按钮：白字(ink L98) 在顶部渐变 L 上（目标 4.5）==");
for (const [name, h, s] of [["amber", 38, 46], ["ochre", 55, 50], ["celadon", 178, 30], ["pine", 154, 34], ["indigo", 252, 40]]) {
  let ok = null;
  for (let l = 38; l >= 14; l -= 0.5) {
    const r = ratio(hsl(h, s, l), hsl(h, s * 0.2, 98));
    if (r >= 4.5) { ok = { L: l, r: Math.round(r * 100) / 100 }; break; }
  }
  console.log("  " + name + " 当前L38=" + Math.round(ratio(hsl(h, s, 38), hsl(h, s * 0.2, 98)) * 100) / 100 + " -> 顶部色需要 " + JSON.stringify(ok));
}
console.log("== 深色 --paper-faint 目标值 ==");
console.log("  推荐: hsl(var(--accent-h) var(--paper-s) 92% / 0.62)  （page/card 上分别 " + JSON.stringify([34, 29, 20].map((x) => x)) + "）");
