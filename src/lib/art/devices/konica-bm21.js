/**
 * Konica Big Mini BM-21 —— 正视图（银色磨砂铝 + 黑色握把 + 顶部黑横条）
 *
 * 依据 realDevicePhotos/Konica Big Mini BM-21/IMG_20261125_165526.jpg 逐项量取
 * （机身外框归一化，x 0 = 左边缘，y 0 = 上边缘）：
 *   · 机身 290 × 182（宽高比 1.593）
 *   · 顶部黑条 0 → 0.269 H
 *   · 握把内缘 上 0.185 W / 中 0.158 W / 下 0.175 W（中部向内收）
 *   · 镜头圆心 (0.454 W, 0.620 H)，银斜面外径 0.395 W，黑镜筒 0.320 W
 *   · 快门盖 0.152 W × 0.199 H（横长圆角矩形）
 *   · AF 窗 0.283–0.359 W、取景窗 0.375–0.489 W、小圆窗 Ø0.045 W、闪光窗 0.566–0.704 W
 *   · 「Konica」中心 0.817 W / 0.375 H；「big mini」0.53 H；两行小字 0.645 / 0.705 H
 *   · 2 × 3 小圆点 0.77–0.87 W × 0.75–0.845 H；端盖竖缝 0.94 W
 *
 * 黑色区（握把 / 顶条 / 快门盖）用 45° 排线做块面，否则整张图会像空壳。
 * 镜圈弧形刻字用 textPath 贴真字（照片读数为 AUTO FOCUS 30mm F4.5）。
 * 只允许使用 class：line / accent / accent-fill / text。
 */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

let seq = 0;

function n(v) {
  return Math.round(v * 10) / 10;
}

function pt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return n(cx + Math.cos(a) * r) + " " + n(cy + Math.sin(a) * r);
}

/** 圆上弧段：a0 → a1，sweep=1 顺时针（屏幕坐标），0 逆时针 */
function arc(cx, cy, r, a0, a1, sweep) {
  return "M" + pt(cx, cy, r, a0) + "A" + r + " " + r + " 0 0 " + sweep + " " + pt(cx, cy, r, a1);
}

export function glyphKonicaBM21() {
  const id = "kbm" + (seq += 1);

  /* 机身外框 */
  const L = 95;
  const R = 385;
  const T = 90;
  const B = 272;
  const bandB = 139; /* 顶条下沿 = 0.269 H */
  const gTop = 149; /* 握把内缘 0.185 W */
  const gBot = 146; /* 0.175 W */

  /* 镜头 */
  const cx = 227;
  const cy = 203;
  const rOut = 57; /* 0.395 W */
  const rBar = 46; /* 0.320 W */

  /* 黑区排线 */
  const gripFill =
    "M106 " + T + "H" + gTop + "Q" + (gTop - 8) + " 181 " + gBot + " " + B + "H108A13 13 0 0 1 95 259V103A13 13 0 0 1 106 " + T + "Z";
  const bandFill =
    "M" + gTop + " " + T + "H372A13 13 0 0 1 385 103V126A13 13 0 0 1 372 " + bandB + "H" + gTop + "Z" +
    /* 四个窗口挖成洞，排线不穿进窗里 */
    "M188 96h30v24h-30Z" +
    "M221 93h41v31h-41Z" +
    "M272 97a8 8 0 1 0 0.01 0Z" +
    "M299 94h62v29h-62Z";
  const coverX = cx - 22;
  const coverY = cy - 18;
  const coverW = 44;
  const coverH = 36;

  /* 闪光灯灯管细棱 */
  let ribs = "";
  for (let i = 0; i < 7; i += 1) {
    const x = n(306 + i * 7.6);
    ribs += '<path class="line" d="M' + x + " 99V118" + '" stroke-opacity="0.18" stroke-width="1"/>';
  }

  /* 2 × 3 小圆点 */
  let dots = "";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      dots +=
        '<circle class="text" cx="' + n(318 + col * 14.5) + '" cy="' + (227 + row * 13) + '" r="2.2" fill-opacity="0.24"/>';
    }
  }

  return (
    /* ---------- 黑区排线（45°、间距 3.5） ---------- */
    '<defs>' +
    '<pattern id="' + id + '-h" width="3.5" height="3.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<path class="line" d="M0 0V3.5" stroke-opacity="0.13" stroke-width="1"/>' +
    "</pattern>" +
    '<path id="' + id + '-ta" d="' + arc(cx, cy, 41, 203, 337, 1) + '"/>' +
    '<path id="' + id + '-ba" d="' + arc(cx, cy, 41, 157, 23, 0) + '"/>' +
    "</defs>" +
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    /* 三块黑区先铺排线 */
    '<path d="' + gripFill + '" fill="url(#' + id + '-h)" stroke="none"/>' +
    '<path d="' + bandFill + '" fill="url(#' + id + '-h)" fill-rule="evenodd" stroke="none"/>' +
    '<rect x="' + coverX + '" y="' + coverY + '" width="' + coverW + '" height="' + coverH +
    '" rx="8" fill="url(#' + id + '-h)" stroke="none"/>' +
    /* ---------- 机身 ---------- */
    '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '" rx="13" stroke-opacity="0.58" stroke-width="1.5"/>' +
    /* 顶条下沿 + 右端收角 */
    '<path d="M' + gTop + " " + bandB + "H372A13 13 0 0 0 385 126V103" + '" stroke-opacity="0.38" stroke-width="1.2"/>' +
    /* 握把内缘 + 倒角线 */
    '<path d="M' + gTop + " " + T + "Q" + (gTop - 8) + " 181 " + gBot + " " + B + '" stroke-opacity="0.42" stroke-width="1.2"/>' +
    '<path d="M150 96Q143 186 147 266" stroke-opacity="0.15" stroke-width="1"/>' +
    /* ---------- 黑条内的窗口 ---------- */
    /* AF 窗：圆角方腔 + 内圆 */
    '<rect x="187" y="95" width="32" height="26" rx="5" stroke-opacity="0.4" stroke-width="1.2"/>' +
    '<circle cx="203" cy="108" r="8" stroke-opacity="0.26" stroke-width="1"/>' +
    /* 取景窗（偏黄绿玻璃） */
    '<rect x="220" y="92" width="43" height="33" rx="2.5" stroke-opacity="0.34" stroke-width="1.2"/>' +
    '<rect x="224" y="96" width="35" height="25" rx="1.5" stroke-opacity="0.3" stroke-width="1"/>' +
    '<path d="M224 108.5H259M241.5 96V121" stroke-opacity="0.12" stroke-width="1"/>' +
    /* 小圆窗 */
    '<circle cx="272" cy="105" r="8.5" stroke-opacity="0.3" stroke-width="1"/>' +
    /* 闪光窗 */
    '<rect x="298" y="93" width="64" height="31" rx="2.5" stroke-opacity="0.4" stroke-width="1.2"/>' +
    '<rect x="302" y="96.5" width="56" height="24" rx="1.5" stroke-opacity="0.26" stroke-width="1"/>' +
    ribs +
    /* ---------- 镜头 ---------- */
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOut + '" stroke-opacity="0.55" stroke-width="1.5"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="52" stroke-opacity="0.2" stroke-width="1"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rBar + '" stroke-opacity="0.36" stroke-width="1.2"/>' +
    /* 快门盖（横长圆角矩形） */
    '<rect x="' + coverX + '" y="' + coverY + '" width="' + coverW + '" height="' + coverH + '" rx="8" stroke-opacity="0.46" stroke-width="1.2"/>' +
    '<path d="M' + (coverX + 9) + " " + (coverY + 26) + "L" + (coverX + 35) + " " + (coverY + 11) + '" stroke-opacity="0.14" stroke-width="1"/>' +
    /* 端盖竖缝 */
    '<path d="M368 143V263" stroke-opacity="0.14" stroke-width="1"/>' +
    "</g>" +
    /* ---------- 镜圈弧形刻字 ---------- */
    '<text class="text" fill-opacity="0.55" font-family="' + MONO + '" font-size="6.5" letter-spacing="0.6">' +
    '<textPath href="#' + id + '-ta" startOffset="50%" text-anchor="middle">KONICA LENS</textPath>' +
    "</text>" +
    '<text class="text" fill-opacity="0.55" font-family="' + MONO + '" font-size="6.5" letter-spacing="0.6">' +
    '<textPath href="#' + id + '-ba" startOffset="50%" text-anchor="middle">AUTO FOCUS 30mm F4.5</textPath>' +
    "</text>" +
    /* ---------- 右侧字标 ---------- */
    '<text class="text" x="332" y="163" text-anchor="middle" fill-opacity="0.5" font-family="' + MONO + '" font-size="14" letter-spacing="1.2">Konica</text>' +
    '<text class="text" x="328" y="190" text-anchor="middle" fill-opacity="0.5" font-family="' + MONO + '" font-size="12" letter-spacing="1.4">big mini</text>' +
    '<text class="text" x="330" y="205" text-anchor="middle" fill-opacity="0.34" font-family="' + MONO + '" font-size="6" letter-spacing="0.7">RED EYE REDUCTION</text>' +
    '<text class="text" x="330" y="212" text-anchor="middle" fill-opacity="0.34" font-family="' + MONO + '" font-size="6" letter-spacing="0.7">AUTO FOCUS BM-21</text>' +
    dots
  );
}
