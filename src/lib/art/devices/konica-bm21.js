/**
 * Konica Big Mini BM-21 —— 正视图（银色磨砂铝机身 + 黑色橡胶握把 + 顶部操作面）
 *
 * 依据 realDevicePhotos/official/bm21/ 的五视图量取，按官方尺寸 100 × 63 × 32 mm
 * 还原真实比例：整机剪影 288 × 181 = 100 : 63；其中顶部操作面占 26（≈9 mm），
 * 正面 155（≈54 mm），与实拍照片里「正面 / 剪影 = 0.86」的比值一致。
 * 照片正面带俯角、纵向被压扁过，所以 y 读数先换算成真实高度，
 * 圆形与圆角一律按水平尺度还原，不跟着一起扁。
 *
 * 归一化读数（x 0 = 机身左缘，y 0 = 正面顶棱）：
 *   · 握把缝：上 22.8 mm → 腰 17.6 mm（0.27 H）→ 下 19.5 mm，是 S 形不是直线
 *   · 镜筒 Ø 28 mm，圆心 (0.48 W, 0.63 H)；外圈双环 + 黑筒 + 内盖 + 上下弧形刻字
 *   · 暗窗板 0.29–0.96 W × 0.03–0.30 H：AF 圆窗、取景窗、AF 受光窗、闪光窗
 *   · 丝印 Konica 基线 0.55 H；big mini 0.69 H；两行小字 0.76 / 0.83 H；6 颗凸点
 *   · 顶部：左上大圆快门钮、ON / MODE / 电源三颗药片键、LCD 窗、右端淡印
 *   · 右端盖缝在 0.95 W，到底部拐圆角
 *
 * 配色只用 class：line / accent / accent-fill / text / grid。
 * 深色主题 ink 是浅的、浅色主题是深的，所以「黑色材料」= 淡底 + 交叉排线：
 * 线越密越"厚"，配一道卷边高光就能把橡胶的曲面和分模线读出来；
 * 文字压在淡排线上，两种主题都清楚。丝印用 textLength 压窄，
 * 还原真机上「字高够、字宽窄」的印刷体。
 */

const SANS = '"Helvetica Neue", Helvetica, Arial, "Segoe UI", sans-serif';

let seq = 0;

function n(v) {
  return Math.round(v * 10) / 10;
}

function pt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return n(cx + Math.cos(a) * r) + " " + n(cy + Math.sin(a) * r);
}

/** 圆弧：a0 → a1，sweep 1 = 屏幕上顺时针 */
function arc(cx, cy, r, a0, a1, sweep) {
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return "M" + pt(cx, cy, r, a0) + "A" + r + " " + r + " 0 " + large + " " + sweep + " " + pt(cx, cy, r, a1);
}

/** 圆角矩形（挖洞用） */
function rrect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  return (
    "M" + n(x + rr) + " " + n(y) +
    "H" + n(x + w - rr) + "A" + rr + " " + rr + " 0 0 1 " + n(x + w) + " " + n(y + rr) +
    "V" + n(y + h - rr) + "A" + rr + " " + rr + " 0 0 1 " + n(x + w - rr) + " " + n(y + h) +
    "H" + n(x + rr) + "A" + rr + " " + rr + " 0 0 1 " + n(x) + " " + n(y + h - rr) +
    "V" + n(y + rr) + "A" + rr + " " + rr + " 0 0 1 " + n(x + rr) + " " + n(y) + "Z"
  );
}

function circlePath(cx, cy, r) {
  return "M" + n(cx - r) + " " + n(cy) + "A" + r + " " + r + " 0 1 0 " + n(cx + r) + " " + n(cy) +
    "A" + r + " " + r + " 0 1 0 " + n(cx - r) + " " + n(cy) + "Z";
}

export function glyphKonicaBM21() {
  const id = "kbm" + (seq += 1);
  const OY = 13; /* 整体下移，让剪影中心落在 (240, 182) */

  /* ---------------- 骨架：剪影 288 × 181 = 100 : 63 ---------------- */
  const L = 96;
  const R = 384;
  const TOP = 78; /* 顶面后缘 */
  const T = 104; /* 正面顶棱 */
  const B = 259; /* 机身底 */

  /* 镜头 */
  const kx = 234.5;
  const ky = 206.7;
  const kR = 40; /* 黑筒半径（Ø 28 mm） */
  const kR2 = 45; /* 第二道环 */
  const kCovW = 23.5; /* 内盖半宽 */
  const kCovH = 17; /* 内盖半高 */

  /* 暗窗板 */
  const pX0 = 179.3;
  const pX1 = 373.5;
  const pY0 = 108.3;
  const pY1 = 152.4;
  const pR = 22; /* 左端半圆半径 */

  /* 窗板内的窗口 */
  const afWin = { x: 195.1, y: 125.3, r: 12.9 };
  const vf = { x: 214.6, y: 110.2, w: 37.7, h: 36.8, r: 2.6 };
  const afRx = { x: 265.1, y: 124.5, r: 9 };
  const fl = { x: 302.9, y: 112.1, w: 46.5, h: 31.8, r: 3 };

  /* 机身外轮廓：左端圆角大、右端略小 */
  const body =
    "M114 " + TOP + "H372Q" + R + " " + TOP + " " + R + " " + (TOP + 12) +
    "V" + (B - 12) + "Q" + R + " " + B + " " + (R - 12) + " " + B +
    "H114Q" + L + " " + B + " " + L + " " + (B - 18) +
    "V" + (TOP + 18) + "Q" + L + " " + TOP + " 114 " + TOP + "Z";

  /* 握把缝（S 形，照片量取后换算） */
  const seamFwd =
    "M161.7 " + T +
    "C151.7 130.5 146.1 157.1 146.6 182.8" +
    "C147.2 210.2 152.5 239.3 158.5 " + B;
  const seamTail =
    "C144.5 239.3 139.2 210.2 138.6 182.8" +
    "C138.1 157.1 143.7 130.5 153.7 " + T;
  const seamBack = "M150.5 " + B + seamTail;

  /* 橡胶件：包住左端再翻到顶面 */
  const grip =
    seamFwd + "H114Q" + L + " " + B + " " + L + " " + (B - 18) +
    "V" + (TOP + 18) + "Q" + L + " " + TOP + " 114 " + TOP +
    "H159C165 86 165.5 95 161.7 " + T + "Z";

  /* 卷边阴影带（缝内侧一圈更密的排线）+ 模压凸筋 */
  const gripShade = seamFwd + "L150.5 " + B + seamTail + "Z";
  const rib = "M138.6 146.8C131.6 168.2 128.2 192.2 129.1 213.6C129.9 231.6 132.6 245.3 137 254.8";

  /* ---------------- 窗板挖洞 ---------------- */
  const holes =
    rrect(vf.x, vf.y, vf.w, vf.h, vf.r) +
    circlePath(afWin.x, afWin.y, afWin.r) +
    circlePath(afRx.x, afRx.y, afRx.r) +
    rrect(fl.x, fl.y, fl.w, fl.h, fl.r) +
    circlePath(201.6, 140, 2.9) +
    circlePath(252.6, 141.2, 3.2);

  const panelShape =
    "M" + n(pX0 + pR) + " " + pY0 +
    "H" + n(pX1 - 9) + "A9 9 0 0 1 " + pX1 + " " + n(pY0 + 9) +
    "V" + n(pY1 - 9) + "A9 9 0 0 1 " + n(pX1 - 9) + " " + pY1 +
    "H" + n(pX0 + pR) + "A" + pR + " " + pR + " 0 0 1 " + n(pX0 + pR) + " " + pY0 + "Z";

  /* 闪光窗棱条（略微收拢，像真机的菲涅耳纹） */
  let ribs = "";
  for (let i = 0; i < 9; i += 1) {
    const f = i / 8 - 0.5;
    const x = n(fl.x + 5.2 + i * 4.6);
    const inset = n(Math.abs(f) * 1.6);
    ribs +=
      '<path class="line" d="M' + x + " " + n(fl.y + 2.4 + inset) + "V" + n(fl.y + fl.h - 2.4 - inset) +
      '" stroke-opacity="0.3" stroke-width="0.85"/>';
  }

  /* 2 × 3 凸点 */
  let dots = "";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const dx = n(314.4 + col * 14.3);
      const dy = n(234.6 + row * 10.9);
      dots +=
        '<circle class="line" cx="' + dx + '" cy="' + dy + '" r="2.5" stroke-opacity="0.34" stroke-width="0.85" fill="none"/>' +
        '<path class="line" d="' + arc(dx, dy, 1.7, 196, 276, 1) + '" stroke-opacity="0.3" stroke-width="0.8"/>';
    }
  }

  /* 药片键 */
  const pill = (x, y, w, h, label, fs) =>
    '<rect class="line" x="' + n(x) + '" y="' + n(y) + '" width="' + n(w) + '" height="' + n(h) +
    '" rx="' + n(h / 2) + '" stroke-opacity="0.5" stroke-width="1" fill="none"/>' +
    (label
      ? '<text class="text" x="' + n(x + w / 2) + '" y="' + n(y + h / 2 + fs * 0.35) + '" text-anchor="middle" fill-opacity="0.62"' +
        ' font-family="' + SANS + '" font-size="' + fs + '" font-weight="600">' + label + "</text>"
      : "");

  /* 排线图案 */
  const pat = (name, pitch, op, w, angle) =>
    '<pattern id="' + id + "-" + name + '" width="' + pitch + '" height="' + pitch +
    '" patternUnits="userSpaceOnUse" patternTransform="rotate(' + angle + ')">' +
    '<path class="line" d="M0 0V' + pitch + '" stroke-opacity="' + op + '" stroke-width="' + w + '"/>' +
    "</pattern>";

  const art =
    "<defs>" +
    pat("g1", 2, 0.26, 1, 45) + /* 橡胶：一道 45° */
    pat("g2", 3.2, 0.16, 1, -45) + /* 橡胶：交叉 45° */
    pat("p1", 1.6, 0.32, 1, 45) + /* 窗板：最密，读起来最"硬" */
    pat("p2", 2.8, 0.2, 1, -45) +
    pat("b1", 1.6, 0.24, 0.9, 45) + /* 镜筒 */
    pat("c1", 1.8, 0.13, 0.9, -45) + /* 镜内盖：反向，才分得出层次 */
    pat("a1", 4.6, 0.05, 0.8, 90) + /* 铝：竖向拉丝，极淡 */
    '<clipPath id="' + id + '-clip"><path d="' + body + '"/></clipPath>' +
    '<clipPath id="' + id + '-gclip"><path d="' + grip + '"/></clipPath>' +
    '<path id="' + id + '-ta" d="' + arc(kx, ky, 26.8, 203, 337, 1) + '"/>' +
    '<path id="' + id + '-ba" d="' + arc(kx, ky, 34.4, 161, 19, 0) + '"/>' +
    "</defs>" +

    /* ================= 机身 + 顶面 ================= */
    '<g clip-path="url(#' + id + '-clip)">' +
    '<path d="' + body + '" fill="url(#' + id + '-a1)" stroke="none"/>' +
    /* 顶面压暗一点点，分界才立得住 */
    '<rect x="' + L + '" y="' + TOP + '" width="' + (R - L) + '" height="' + (T - TOP) +
    '" fill="url(#' + id + '-p1)" stroke="none" opacity="0.16"/>' +
    "</g>" +

    /* ================= 握把块面 ================= */
    '<g clip-path="url(#' + id + '-gclip)">' +
    '<path class="text" d="' + grip + '" fill-opacity="0.3" stroke="none"/>' +
    '<path d="' + grip + '" fill="url(#' + id + '-g1)" stroke="none"/>' +
    '<path d="' + grip + '" fill="url(#' + id + '-g2)" stroke="none"/>' +
    /* 橡胶是卷的：沿缝叠加几道宽窄递减的软影，越靠缝越暗，就是圆柱的转折 */
    '<path d="' + seamFwd + '" stroke-width="46" stroke-opacity="0.03" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="34" stroke-opacity="0.035" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="24" stroke-opacity="0.04" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="16" stroke-opacity="0.05" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="10" stroke-opacity="0.06" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="6" stroke-opacity="0.08" stroke-linecap="butt"/>' +
    '<path d="' + seamFwd + '" stroke-width="3" stroke-opacity="0.12" stroke-linecap="butt"/>' +
    "</g>" +

    /* ================= 窗板块面 ================= */
    '<path d="' + panelShape + holes + '" fill="url(#' + id + '-p1)" fill-rule="evenodd" stroke="none"/>' +
    '<path d="' + panelShape + holes + '" fill="url(#' + id + '-p2)" fill-rule="evenodd" stroke="none"/>' +

    /* ================= 镜筒黑底（先铺，细部压上面） ================= */
    '<path d="' + circlePath(kx, ky, kR) + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, 8.6) +
    '" fill="url(#' + id + '-b1)" fill-rule="evenodd" stroke="none"/>' +
    '<path d="' + circlePath(kx, ky, kR) + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, 8.6) +
    '" fill="url(#' + id + '-p1)" fill-rule="evenodd" stroke="none" opacity="0.55"/>' +
    '<path class="text" d="' + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, 8.6) + '" fill-opacity="0.1" stroke="none"/>' +
    '<path d="' + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, 8.6) + '" fill="url(#' + id + '-c1)" stroke="none"/>' +

    /* ================= 细部 ================= */
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +

    /* --- 顶面 / 正面分界：暗线 + 亮线 --- */
    '<path d="M' + L + " " + T + "H" + R + '" stroke-opacity="0.55" stroke-width="1.3"/>' +
    '<path d="M' + (L + 3) + " " + (T + 2.6) + "H" + (R - 3) + '" stroke-opacity="0.13" stroke-width="1"/>' +

    /* --- 握把缝：橡胶边（亮）+ 内侧分模线（暗）+ 卷边收口 + 凸筋 --- */
    '<path d="' + seamFwd + '" stroke-opacity="0.8" stroke-width="1.8"/>' +
    '<path d="M' + (161.7 + 2.4) + " " + T +
    "C" + (151.7 + 2.4) + " 130.5 " + (146.1 + 2.4) + " 157.1 " + (146.6 + 2.4) + " 182.8" +
    "C" + (147.2 + 2.4) + " 210.2 " + (152.5 + 2.4) + " 239.3 " + (158.5 + 2.4) + " " + B + '" stroke-opacity="0.18" stroke-width="0.9"/>' +
    '<path d="' + seamBack + '" stroke-opacity="0.32" stroke-width="1.1"/>' +
    '<path d="' + rib + '" stroke-opacity="0.3" stroke-width="1.15"/>' +
    '<path d="M140.6 148.4C133.6 169.4 130.2 192.2 131.1 213.6C131.9 231.8 134.6 244.4 139 253.4" stroke-opacity="0.13" stroke-width="0.9"/>' +
    /* 左端外沿反光 */
    '<path d="M100.4 110C98.8 148 98.8 194 100.2 232C100.8 249 103 258 108 262" stroke-opacity="0.16" stroke-width="1.3"/>' +
    /* 橡胶翻上顶面的那道边 */
    '<path d="M159 ' + TOP + "C165 86 165.5 95 161.7 " + T + '" stroke-opacity="0.55" stroke-width="1.3"/>' +

    /* --- 顶面：快门钮 / 药片键 / LCD / 小孔 --- */
    '<ellipse cx="140" cy="90.8" rx="20.6" ry="9.6" stroke-opacity="0.7" stroke-width="1.4"/>' +
    '<path d="M119.4 90.8A20.6 9.6 0 0 1 160.6 90.8" stroke-opacity="0.5" stroke-width="1.6"/>' +
    '<path d="M122.4 87.6C125 82.4 131.6 79.6 140 79.6C148.4 79.6 155 82.4 157.6 87.6" stroke-opacity="0.45" stroke-width="1.1"/>' +
    '<ellipse cx="140.6" cy="91.6" rx="14.4" ry="5.6" stroke-opacity="0.18" stroke-width="0.9"/>' +
    /* LCD：粗框当黑边，里面才是屏 */
    '<path d="' + rrect(204.4, 78.4, 60.8, 14, 3) + '" stroke-opacity="0.55" stroke-width="2.4"/>' +
    '<path d="' + rrect(207.6, 81.2, 54.4, 8.4, 1.4) + '" stroke-opacity="0.26" stroke-width="0.9"/>' +
    '<circle cx="277" cy="84.2" r="2.9" stroke-opacity="0.38" stroke-width="1"/>' +

    /* --- 窗板外框（下面压一道软阴影） --- */
    '<path d="' + panelShape + '" transform="translate(0 2.4)" stroke-opacity="0.1" stroke-width="3"/>' +
    '<path d="' + panelShape + '" stroke-opacity="0.58" stroke-width="1.3"/>' +
    '<path d="' + panelShape + '" transform="translate(0 -1.2)" stroke-opacity="0.1" stroke-width="0.9"/>' +

    /* --- AF 圆窗 --- */
    '<circle cx="' + afWin.x + '" cy="' + afWin.y + '" r="' + afWin.r + '" stroke-opacity="0.62" stroke-width="1.3"/>' +
    '<circle cx="' + afWin.x + '" cy="' + afWin.y + '" r="' + (afWin.r - 4.2) + '" stroke-opacity="0.32" stroke-width="1"/>' +
    '<path d="' + arc(afWin.x, afWin.y, afWin.r - 2, 200, 296, 1) + '" stroke-opacity="0.38" stroke-width="1.1"/>' +
    '<circle class="text" cx="' + afWin.x + '" cy="' + afWin.y + '" r="' + (afWin.r - 6.8) + '" fill-opacity="0.06"/>' +

    /* --- 取景窗：外框 + 金属内框 + 玻璃 --- */
    '<path d="' + rrect(vf.x, vf.y, vf.w, vf.h, vf.r) + '" stroke-opacity="0.66" stroke-width="1.4"/>' +
    '<path d="' + rrect(vf.x + 2.6, vf.y + 2.6, vf.w - 5.2, vf.h - 5.2, 1.2) + '" stroke-opacity="0.3" stroke-width="1"/>' +
    '<path d="' + rrect(vf.x + 5.2, vf.y + 5.2, vf.w - 10.4, vf.h - 10.4, 0.8) + '" stroke-opacity="0.48" stroke-width="1.3"/>' +
    '<path d="M' + n(vf.x + 7) + " " + n(vf.y + 8.4) + "H" + n(vf.x + vf.w - 7) + '" stroke-opacity="0.16" stroke-width="0.9"/>' +
    '<path d="M' + n(vf.x + 7.4) + " " + n(vf.y + vf.h - 10) + "L" + n(vf.x + 12.6) + " " + n(vf.y + 8.4) + '" stroke-opacity="0.3" stroke-width="1.1"/>' +
    '<path d="M' + n(vf.x + 17) + " " + n(vf.y + vf.h - 7.4) + "L" + n(vf.x + vf.w - 7.6) + " " + n(vf.y + 12.6) + '" stroke-opacity="0.12" stroke-width="0.9"/>' +

    /* --- AF 受光窗 --- */
    '<circle cx="' + afRx.x + '" cy="' + afRx.y + '" r="' + afRx.r + '" stroke-opacity="0.56" stroke-width="1.2"/>' +
    '<circle cx="' + afRx.x + '" cy="' + afRx.y + '" r="' + (afRx.r - 3.2) + '" stroke-opacity="0.26" stroke-width="0.9"/>' +
    '<path d="' + arc(afRx.x, afRx.y, afRx.r - 1.4, 205, 285, 1) + '" stroke-opacity="0.32" stroke-width="0.9"/>' +

    /* --- 窗板上的两点 + 细槽 --- */
    '<circle cx="201.6" cy="140" r="2.9" stroke-opacity="0.28" stroke-width="0.85"/>' +
    '<circle cx="252.6" cy="141.2" r="3.2" stroke-opacity="0.28" stroke-width="0.85"/>' +
    '<path d="' + rrect(351.4, 135.8, 17, 3.6, 1.8) + '" stroke-opacity="0.3" stroke-width="1"/>' +
    '<path d="' + rrect(352.6, 136.8, 14.6, 1.8, 0.9) + '" stroke-opacity="0.18" stroke-width="0.8"/>' +

    /* --- 闪光窗 --- */
    '<path d="' + rrect(fl.x - 5.4, fl.y - 4.6, fl.w + 10.8, fl.h + 9.2, 4.4) + '" stroke-opacity="0.5" stroke-width="1.5"/>' +
    '<path d="' + rrect(fl.x - 3, fl.y - 2.6, fl.w + 6, fl.h + 5.2, 3.4) + '" stroke-opacity="0.2" stroke-width="1"/>' +
    '<path d="' + rrect(fl.x, fl.y, fl.w, fl.h, fl.r) + '" stroke-opacity="0.6" stroke-width="1.25"/>' +
    ribs +
    '<path d="M' + n(fl.x + 3) + " " + n(fl.y + 5.6) + "H" + n(fl.x + fl.w - 3) + '" stroke-opacity="0.24" stroke-width="0.9"/>' +
    '<path d="M' + n(fl.x + 3) + " " + n(fl.y + fl.h - 5.6) + "H" + n(fl.x + fl.w - 3) + '" stroke-opacity="0.14" stroke-width="0.9"/>' +

    /* --- 右端盖缝 --- */
    '<path d="M367 ' + (pY1 + 0.2) + "V" + (B - 18) + "C367 " + (B - 9) + " 372 " + (B - 3) + " 380 " + (B - 3) + '" stroke-opacity="0.28" stroke-width="1"/>' +
    '<path d="M368.6 ' + (pY1 + 4) + "V" + (B - 19) + "C368.6 " + (B - 12) + " 372.6 " + (B - 6) + " 379 " + (B - 6) + '" stroke-opacity="0.1" stroke-width="0.9"/>' +

    /* --- 镜头：双环（筒口倒角 + 外圈安装环） --- */
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + (kR + 2.4) + '" stroke-opacity="0.12" stroke-width="1.8"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kR2 + '" stroke-opacity="0.38" stroke-width="1"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + (kR2 - 1.5) + '" stroke-opacity="0.16" stroke-width="0.85"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + (kR + 1.4) + '" stroke-opacity="0.46" stroke-width="1"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kR + '" stroke-opacity="0.84" stroke-width="1.6"/>' +
    '<path d="' + arc(kx, ky, kR - 2.6, 198, 342, 1) + '" stroke-opacity="0.16" stroke-width="1"/>' +

    /* --- 镜头：内盖（凹槽 + 叶片缝） --- */
    '<path d="' + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, 8.6) + '" stroke-opacity="0.46" stroke-width="1.15"/>' +
    '<path d="' + rrect(kx - kCovW + 2.6, ky - kCovH + 2.4, kCovW * 2 - 5.2, kCovH * 2 - 4.8, 6.2) + '" stroke-opacity="0.16" stroke-width="0.9"/>' +
    '<path d="M' + n(kx - 16.4) + " " + n(ky + 13.4) + "L" + n(kx + 18.6) + " " + n(ky - 12.2) + '" stroke-opacity="0.2" stroke-width="0.9"/>' +

    /* --- 筒口高光 --- */
    '<path d="' + arc(kx, ky, kR2 - 2.6, 202, 256, 1) + '" stroke-opacity="0.32" stroke-width="1.6"/>' +
    '<path d="' + arc(kx, ky, kR - 1, 286, 336, 1) + '" stroke-opacity="0.24" stroke-width="1.2"/>' +
    "</g>" +

    /* ================= 镜圈刻字 ================= */
    '<text class="text" fill-opacity="0.88" font-family="' + SANS + '" font-size="7" font-weight="500" letter-spacing="0.22">' +
    '<textPath href="#' + id + '-ta" startOffset="50%" text-anchor="middle">KONICA LENS</textPath></text>' +
    '<text class="text" fill-opacity="0.8" font-family="' + SANS + '" font-size="5" font-weight="500" letter-spacing="0.06">' +
    '<textPath href="#' + id + '-ba" startOffset="50%" text-anchor="middle">AUTO FOCUS 30mm F4.5</textPath></text>' +

    /* ================= 丝印 ================= */
    '<text class="text" x="332" y="174.9" text-anchor="middle" textLength="55.6" lengthAdjust="spacingAndGlyphs"' +
    ' fill-opacity="0.78" font-family="' + SANS + '" font-size="18.4" font-weight="700" letter-spacing="0.2">Konica</text>' +
    '<text class="text" x="327" y="209.8" text-anchor="middle" textLength="52" lengthAdjust="spacingAndGlyphs"' +
    ' fill-opacity="0.72" font-family="' + SANS + '" font-size="15.6" font-weight="700" letter-spacing="0.2">big mini</text>' +
    '<text class="text" x="328.4" y="221.4" text-anchor="middle" textLength="49.4" lengthAdjust="spacingAndGlyphs"' +
    ' fill-opacity="0.5" font-family="' + SANS + '" font-size="9.4" font-weight="500" letter-spacing="0.1">RED EYE REDUCTION</text>' +
    '<text class="text" x="327" y="231.5" text-anchor="middle" textLength="52.4" lengthAdjust="spacingAndGlyphs"' +
    ' fill-opacity="0.5" font-family="' + SANS + '" font-size="8.6" font-weight="500" letter-spacing="0.1">AUTO FOCUS <tspan font-style="italic" font-weight="700" font-size="9.4">BM-21</tspan></text>' +
    dots +

    /* ================= 顶部按键 + 淡印 ================= */
    pill(172.4, 83.2, 20.6, 5, "ON", 3.1) +
    pill(169.4, 89.8, 22.2, 5, "MODE", 2.9) +
    '<path class="line" d="' + rrect(194.8, 89.6, 8.6, 5, 2.5) + '" stroke-opacity="0.5" stroke-width="1" fill="none"/>' +
    '<path class="line" d="M198.3 91V92.9" stroke-opacity="0.5" stroke-width="0.8"/>' +
    '<circle class="line" cx="198.3" cy="92.9" r="1.5" stroke-opacity="0.42" stroke-width="0.8" fill="none"/>' +
    '<text class="text" x="331" y="84.4" text-anchor="middle" fill-opacity="0.2" font-family="' + SANS +
    '" font-size="2.9" font-weight="600" letter-spacing="0.5">KONICA</text>' +
    '<text class="text" x="331" y="89.2" text-anchor="middle" fill-opacity="0.2" font-family="' + SANS +
    '" font-size="2.9" font-weight="600" letter-spacing="0.4">BIG MINI BM-21</text>' +

    /* ================= 唯一的强调色：LCD 与灯管 ================= */
    '<rect class="accent-fill" x="209" y="82.2" width="51.6" height="6.4" rx="1.2" fill-opacity="0.14"/>' +
    '<path class="accent" d="M' + n(fl.x + 4) + " " + n(fl.y + 9.2) + "H" + n(fl.x + fl.w - 4) + '" stroke-opacity="0.34" stroke-width="1"/>' +

    /* ================= 外轮廓（最后压一遍） ================= */
    '<path class="line" d="' + body + '" stroke-opacity="0.86" stroke-width="1.7" fill="none"/>' +
    '<path class="line" d="M107 ' + (B - 3) + "H373" + '" stroke-opacity="0.1" stroke-width="1"/>';

  return '<g transform="translate(0 ' + OY + ')">' + art + "</g>";
}
