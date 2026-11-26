const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const l1 = Y(a), l2 = Y(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
const hex2rgb = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
function hsl(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [255 * f(0), 255 * f(8), 255 * f(4)]; }
const LIGHT_PAGE = hex2rgb("#e8e2d3"), LIGHT_CARD = hex2rgb("#f4f1ed"), DARK_PAGE = hex2rgb("#211c15"), DARK_CARD = hex2rgb("#342b1c");
console.log("状态色 浅色 on page:", ["#2f8a55", "#9a6f1c", "#5d6a7d", "#b0482f"].map((c) => c + "=" + ratio(hex2rgb(c), LIGHT_PAGE)).join(" | "));
console.log("状态色 深色 on page:", ["#86d3a0", "#e3c07a", "#93a0b4", "#e0917f"].map((c) => c + "=" + ratio(hex2rgb(c), DARK_PAGE)).join(" | "));
console.log("浅色 accent 在 page 上 (target 4.5):");
for (const [n, h, s] of [["amber", 38, 46], ["ochre", 55, 50], ["celadon", 178, 30], ["pine", 154, 34], ["copper", 22, 52]]) {
  let ok = null;
  for (let l = 31; l >= 18; l -= 0.5) { const r = ratio(hsl(h, s, l), LIGHT_PAGE); if (r >= 4.5) { ok = l; break; } }
  console.log("  " + n + " 当前L31=" + ratio(hsl(h, s, 31), LIGHT_PAGE) + " 需要 L≤" + ok);
}
console.log("light accent-dim 作为 3:1 边框 (ochre h55 s50 L31 a.74):", ratio([0, 1, 2].map((i) => hsl(55, 50, 31)[i] * 0.74 + LIGHT_PAGE[i] * 0.26), LIGHT_PAGE));
for (const l of [27, 25, 24]) console.log("  ochre accent-dim L" + l + " a.8 ->", ratio([0, 1, 2].map((i) => hsl(55, 50, l)[i] * 0.8 + LIGHT_PAGE[i] * 0.2), LIGHT_PAGE));
console.log("dark accent-dim (indigo L? a.58) 文字 4.5 需 alpha(先看现状)");
