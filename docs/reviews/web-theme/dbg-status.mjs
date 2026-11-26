const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const l1 = Y(a), l2 = Y(b); return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100; };
const hx = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const bg = hx("#e8e2d3");
for (const c of ["#2f8a55", "#256b44", "#23704a", "#9a6f1c", "#7d5a12", "#5d6a7d", "#556173", "#b0482f", "#9a3d26"]) console.log(c + " -> " + ratio(hx(c), bg));
