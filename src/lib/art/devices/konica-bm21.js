/**
 * Konica Big Mini BM-21 —— 正面线稿（简约平面风格，不填色）
 *
 * 尺寸全部来自 docs/bm21-spec.md（bm21-analyst 的同机位单应校正量测，mm 级）：
 * 机身 100 × 63 mm，镜头 30mm f/4.5。代码里先写 mm 再换算，方便对着量测书核对：
 *   px(X) = 96 + X·2.88      （100 mm → 288）
 *   pz(Z) = 104 + Z·2.873    （63 mm → 181）
 * 正面上方只留一条 14 单位高的顶棱示意带放四个键和 LCD —— 只画轮廓，不做透视、不做明暗。
 *
 * 只用 class：line / accent / accent-fill / text（深/浅主题自动换色），
 * 线宽与留白跟 olympus-45 / zeniko-za12 一致：主轮廓 1.5、次要 1.2、细节 0.9～1。
 * 黑胶与黑窗带只铺一层极淡 45° 排线（不是填色），保证两种主题下都能读出块面。
 *
 * 量测书读数（X 从握把端 / Z 从正面顶边，单位 mm）：
 *   · 握把缝：Z0:23.4 → 腰 16.9（Z34–38）→ 底 20.9，浅 S 曲线
 *   · 黑窗带 X29.5–96 / Z2–19.2，左端圆形凸缘 Ø11.9 @(35.5, 8.2)
 *   · 窗：AF Ø5.9 @(36.4,6.8) / 取景 14.5×11.5 @(50.0,8.4) / 右圆 Ø6.0 @(62.8,7.2) / 闪光 20.8×9.7 @(80.1,7.8) 7 棱
 *   · 镜头 (48.5, 38.6)：黑圈 Ø30.3、银环 Ø34.4、前窗 14×11.3 R3、弧字基线半径 11.4、字高 2.0
 *   · 2×3 圆点 X79.1/83.9/88.5 × Z48.1/53.2，Ø1.8（前脸右下角）
 *   · 丝印：Konica X74–90 基线 Z26；big mini Z40.2；两行小字 Z43.7 / Z46.7
 *   · 右端面是黑的：正面只能看到右缘一道窄边，用双线示意
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

/** 圆角矩形 */
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

/** Catmull-Rom → 三次贝塞尔：把量测表的折线读成顺滑曲线 */
function smooth(pts) {
  let d = "M" + n(pts[0][0]) + " " + n(pts[0][1]);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d +=
      "C" + n(p1[0] + (p2[0] - p0[0]) / 6) + " " + n(p1[1] + (p2[1] - p0[1]) / 6) +
      " " + n(p2[0] - (p3[0] - p1[0]) / 6) + " " + n(p2[1] - (p3[1] - p1[1]) / 6) +
      " " + n(p2[0]) + " " + n(p2[1]);
  }
  return d;
}

export function glyphKonicaBM21() {
  const id = "kbm" + (seq += 1);

  /* ---------------- 标定 ---------------- */
  const U = 2.88; /* mm → 横向单位 */
  const V = 181 / 63; /* mm → 纵向单位 */
  const px = (mm) => n(96 + mm * U);
  const pz = (mm) => n(104 + mm * V);

  const T = pz(0); /* 正面顶棱 104 */
  const B = pz(63); /* 机身底 285 */
  const R = px(100); /* 右端 384 */
  const TOP = T - 14; /* 顶棱示意带的上沿 90 */

  /* 机身轮廓：左上 R6.5 / 左下 R5.8 / 右端 R1.5（量测书 §2.1） */
  const body =
    "M" + n(96 + 6.5 * U) + " " + T + "H" + n(R - 1.5 * U) +
    "A" + n(1.5 * U) + " " + n(1.5 * V) + " 0 0 1 " + R + " " + n(T + 1.5 * V) +
    "V" + n(B - 1.5 * V) + "A" + n(1.5 * U) + " " + n(1.5 * V) + " 0 0 1 " + n(R - 1.5 * U) + " " + B +
    "H" + n(96 + 5.8 * U) + "A" + n(5.8 * U) + " " + n(5.8 * V) + " 0 0 1 96 " + n(B - 5.8 * V) +
    "V" + n(T + 6.5 * V) + "A" + n(6.5 * U) + " " + n(6.5 * V) + " 0 0 1 " + n(96 + 6.5 * U) + " " + T + "Z";

  /* 顶棱示意带：一条窄带，只交代顶面按键的轮廓 */
  const cap =
    "M96 " + TOP + "H" + n(R - 5 * U) +
    "A" + n(5 * U) + " " + n(6) + " 0 0 1 " + R + " " + n(TOP + 6) + "V" + T + "H96Z";

  /* 握把缝（量测书 §2.2 折线） */
  const seamPts = [
    [23.4, 0], [23.1, 2], [21.6, 6], [20.4, 10], [19.3, 14], [18.5, 18], [17.7, 22],
    [17.3, 26], [17.1, 30], [16.9, 34], [16.9, 38], [17.1, 42], [17.5, 46],
    [18.1, 50], [18.9, 54], [19.9, 58], [20.9, 63],
  ].map((p) => [px(p[0]), pz(p[1])]);
  const seam = smooth(seamPts);

  /* 握把：缝 + 底 + 左缘 + 顶，闭合成块 */
  const grip =
    seam + "H" + n(96 + 5.8 * U) + "A" + n(5.8 * U) + " " + n(5.8 * V) + " 0 0 1 96 " + n(B - 5.8 * V) +
    "V" + n(TOP + 6) + "A" + n(5 * U) + " 6 0 0 1 " + n(96 + 5 * U) + " " + TOP +
    "H" + px(21.5) + "V" + T + "Z";

  /* 模压凸筋（橡胶上那道线，平行于缝） */
  const rib = smooth([[20.6, 8], [18.9, 20], [17.9, 32], [17.5, 43], [18.1, 54], [19.4, 62]]
    .map((p) => [px(p[0]), pz(p[1])]));

  /* 黑窗带：矩形 + 左端圆形凸缘 */
  const lobe = { x: px(35.5), y: pz(8.2), r: n(5.95 * U) };
  const x0 = px(29.5 + 5.95);
  const x1 = px(96);
  const y0 = pz(2);
  const y1 = pz(19.2);
  const panel =
    "M" + x0 + " " + y0 + "H" + n(x1 - 8) + "A8 8 0 0 1 " + x1 + " " + n(y0 + 8) +
    "V" + n(y1 - 8) + "A8 8 0 0 1 " + n(x1 - 8) + " " + y1 + "H" + x0 +
    "A" + lobe.r + " " + lobe.r + " 0 0 1 " + x0 + " " + y0 + "Z";

  /* 四个窗 */
  const af = { x: px(36.4), y: pz(6.8), r: n(2.95 * U) };
  const vf = { x: px(50) - n(7.25 * U), y: pz(8.4) - n(5.75 * V), w: n(14.5 * U), h: n(11.5 * V) };
  const rf = { x: px(62.8), y: pz(7.2), r: n(3 * U) };
  const fl = { x: px(69.7), y: pz(2.9), w: n(20.8 * U), h: n(9.7 * V) };
  const slot = { x: px(70.3), y: pz(12.8), w: n(19.5 * U), h: n(1.2 * V) };
  const d1 = { x: px(34.5), y: pz(15.8), r: n(0.75 * U) };
  const d2 = { x: px(61.2), y: pz(15.0), r: n(0.75 * U) };

  /* 闪光窗 7 条竖棱（棱宽 1.1 / 间距 2.3） */
  let ribs = "";
  for (let i = 0; i < 7; i += 1) {
    const cx = px(80.1) + n((i - 3) * 2.3 * U);
    ribs +=
      '<path class="line" d="M' + n(cx) + " " + n(fl.y + n(0.7 * V)) + "V" + n(fl.y + fl.h - n(0.7 * V)) +
      '" stroke-opacity="0.28" stroke-width="0.85"/>';
  }

  /* 镜头 */
  const kx = px(48.5);
  const ky = pz(38.6);
  const kBlack = n(15.15 * U);
  const kSilver = n(17.2 * U);
  const kCovW = n(7 * U);
  const kCovH = n(5.65 * V);

  /* 2 × 3 圆点 */
  let dots = "";
  [48.1, 53.2].forEach((z) => {
    [79.1, 83.9, 88.5].forEach((x) => {
      dots +=
        '<circle class="line" cx="' + px(x) + '" cy="' + pz(z) + '" r="' + n(0.9 * U) +
        '" stroke-opacity="0.42" stroke-width="0.9" fill="none"/>';
    });
  });

  /* 顶面按键（只画轮廓，不做透视） */
  const btn = (cx, cy, w, h, label, fs) =>
    '<rect class="line" x="' + n(cx - w / 2) + '" y="' + n(cy - h / 2) + '" width="' + n(w) + '" height="' + n(h) +
    '" rx="' + n(h / 2) + '" stroke-opacity="0.5" stroke-width="1" fill="none"/>' +
    (label
      ? '<text class="text" x="' + n(cx) + '" y="' + n(cy + fs * 0.35) + '" text-anchor="middle" fill-opacity="0.55"' +
        ' font-family="' + SANS + '" font-size="' + fs + '" font-weight="600">' + label + "</text>"
      : "");

  const lcd = { x: px(49.1) - n(10.9 * U), y: n(TOP + 3.4), w: n(21.8 * U), h: n(8.4) };

  return (
    "<defs>" +
    /* 唯一的一层排线：黑胶 / 黑窗带共用，极淡，只用来区分块面 */
    '<pattern id="' + id + '-h" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<path class="line" d="M0 0V3" stroke-opacity="0.16" stroke-width="1"/>' +
    "</pattern>" +
    '<pattern id="' + id + '-k" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<path class="line" d="M0 0V2.4" stroke-opacity="0.2" stroke-width="1"/>' +
    "</pattern>" +
    '<clipPath id="' + id + '-g"><path d="' + grip + '"/></clipPath>' +
    '<path id="' + id + '-ta" d="' + arc(kx, ky, n(10.4 * U), 208, 332, 1) + '"/>' +
    '<path id="' + id + '-ba" d="' + arc(kx, ky, n(12.4 * U), 156, 24, 0) + '"/>' +
    "</defs>" +

    /* ---------- 黑胶握把：排线 + 缝 + 凸筋 ---------- */
    '<g clip-path="url(#' + id + '-g)"><path d="' + grip + '" fill="url(#' + id + '-h)" stroke="none"/></g>' +
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="' + seam + '" stroke-opacity="0.72" stroke-width="1.5"/>' +
    '<path d="' + rib + '" stroke-opacity="0.34" stroke-width="1.1"/>' +
    "</g>" +

    /* ---------- 黑窗带：排线 + 外框 ---------- */
    '<path d="' + panel + '" fill="url(#' + id + '-k)" stroke="none"/>' +
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="' + panel + '" stroke-opacity="0.58" stroke-width="1.2"/>' +

    /* AF 圆窗 */
    '<circle cx="' + af.x + '" cy="' + af.y + '" r="' + af.r + '" stroke-opacity="0.62" stroke-width="1.2"/>' +
    '<circle cx="' + af.x + '" cy="' + af.y + '" r="' + n(2.45 * U) + '" stroke-opacity="0.32" stroke-width="1"/>' +
    '<path d="M' + n(af.x - n(2.45 * U)) + " " + af.y + "H" + n(af.x + n(2.45 * U)) + '" stroke-opacity="0.24" stroke-width="0.9"/>' +

    /* 取景窗：外框 + 内框 + 一道斜反光 */
    '<path d="' + rrect(vf.x, vf.y, vf.w, vf.h, 2.2) + '" stroke-opacity="0.62" stroke-width="1.2"/>' +
    '<path d="' + rrect(vf.x + n(0.7 * U), vf.y + n(0.7 * V), vf.w - n(1.4 * U), vf.h - n(1.4 * V), 1.4) +
    '" stroke-opacity="0.34" stroke-width="1"/>' +
    '<path d="M' + n(vf.x + n(2.4 * U)) + " " + n(vf.y + vf.h - n(2.2 * V)) + "L" + n(vf.x + n(4.6 * U)) + " " +
    n(vf.y + n(2.2 * V)) + '" stroke-opacity="0.26" stroke-width="1"/>' +

    /* 右圆窗 */
    '<circle cx="' + rf.x + '" cy="' + rf.y + '" r="' + rf.r + '" stroke-opacity="0.56" stroke-width="1.2"/>' +
    '<circle cx="' + rf.x + '" cy="' + rf.y + '" r="' + n(2.2 * U) + '" stroke-opacity="0.26" stroke-width="0.9"/>' +

    /* 窗带上的两颗凹点 + 闪光窗下长槽 */
    '<circle cx="' + d1.x + '" cy="' + d1.y + '" r="' + d1.r + '" stroke-opacity="0.32" stroke-width="0.9"/>' +
    '<circle cx="' + d2.x + '" cy="' + d2.y + '" r="' + d2.r + '" stroke-opacity="0.32" stroke-width="0.9"/>' +
    '<path d="' + rrect(slot.x, slot.y, slot.w, slot.h, n(0.6 * V)) + '" stroke-opacity="0.3" stroke-width="0.9"/>' +

    /* 闪光窗 */
    '<path d="' + rrect(fl.x, fl.y, fl.w, fl.h, n(1.6 * U)) + '" stroke-opacity="0.6" stroke-width="1.2"/>' +
    ribs +

    /* ---------- 右端面：黑的，正面只见一道窄边 ---------- */
    '<path d="M' + n(R - 3.2) + " " + n(T + 3) + "V" + n(B - 3) + '" stroke-opacity="0.3" stroke-width="1"/>' +
    '<path d="M' + n(R - 1.4) + " " + n(T + 4) + "V" + n(B - 4) + '" stroke-opacity="0.16" stroke-width="0.9"/>' +

    /* ---------- 镜头：银环 + 黑圈（先铺最淡排线） + 前窗 ---------- */
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kBlack + '" fill="url(#' + id + '-h)" stroke="none"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kSilver + '" stroke-opacity="0.42" stroke-width="1"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + n(15.8 * U) + '" stroke-opacity="0.2" stroke-width="0.9"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kBlack + '" stroke-opacity="0.66" stroke-width="1.5"/>' +
    '<path d="' + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, n(3 * U)) + '" stroke-opacity="0.46" stroke-width="1.15"/>' +
    '<path d="M' + n(kx - kCovW + n(2.4 * U)) + " " + n(ky + kCovH * 0.7) + "L" + n(kx + kCovW - n(2.4 * U)) + " " +
    n(ky - kCovH * 0.6) + '" stroke-opacity="0.2" stroke-width="0.9"/>' +
    '<path d="' + arc(kx, ky, n(15.8 * U), 202, 254, 1) + '" stroke-opacity="0.28" stroke-width="1.4"/>' +
    "</g>" +

    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kBlack + '" class="line" fill="none" stroke-opacity="0.66" stroke-width="1.5"/>' +

    /* ---------- 镜圈刻字 ---------- */
    '<text class="text" fill-opacity="0.9" font-family="' + SANS + '" font-size="8" font-weight="500" letter-spacing="0.1">' +
    '<textPath href="#' + id + '-ta" startOffset="50%" text-anchor="middle">KONICA LENS</textPath></text>' +
    '<text class="text" fill-opacity="0.82" font-family="' + SANS + '" font-size="5.4" font-weight="500">' +
    '<textPath href="#' + id + '-ba" startOffset="50%" text-anchor="middle">AUTO FOCUS 30mm F4.5</textPath></text>' +

    /* ---------- 丝印 ---------- */
    '<text class="text" x="' + px(82) + '" y="' + pz(26) + '" text-anchor="middle" textLength="' + n(16 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.8" font-family="' + SANS +
    '" font-size="18.6" font-weight="700">Konica</text>' +
    '<text class="text" x="' + px(81.5) + '" y="' + pz(40.2) + '" text-anchor="middle" textLength="' + n(17 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.74" font-family="' + SANS +
    '" font-size="15" font-weight="700">big mini</text>' +
    '<text class="text" x="' + px(81.8) + '" y="' + pz(43.7) + '" text-anchor="middle" textLength="' + n(16.5 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.52" font-family="' + SANS +
    '" font-size="7.4" font-weight="500" letter-spacing="0.1">RED EYE REDUCTION</text>' +
    '<text class="text" x="' + px(82) + '" y="' + pz(46.7) + '" text-anchor="middle" textLength="' + n(17 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.52" font-family="' + SANS +
    '" font-size="7.6" font-weight="500" letter-spacing="0.1">AUTO FOCUS <tspan font-style="italic" font-weight="700" font-size="8.2">BM-21</tspan></text>' +
    dots +

    /* ---------- 顶棱示意带：四钮 + LCD ---------- */
    '<path class="line" d="' + cap + '" stroke-opacity="0.5" stroke-width="1.3" fill="none"/>' +
    '<g clip-path="url(#' + id + '-g)"><rect x="96" y="' + TOP + '" width="' + n(R - 96) + '" height="' + n(14) +
    '" fill="url(#' + id + '-h)" stroke="none"/></g>' +
    '<path class="line" d="M' + n(96 + 1) + " " + (T - 1.5) + "H" + n(R - 1) + '" stroke-opacity="0.14" stroke-width="1"/>' +
    /* 大圆快门钮：只画露出的一半，不做透视 */
    '<path class="line" d="M' + n(px(14.4) - n(6.6 * U)) + " " + n(T - 2) + "A" + n(6.6 * U) + " " + n(9) +
    " 0 0 1 " + n(px(14.4) + n(6.6 * U)) + " " + n(T - 2) + '" stroke-opacity="0.62" stroke-width="1.4" fill="none"/>' +
    btn(px(25.4), n(TOP + 3.6), n(6.3 * U), 6, "MODE", 2.9) +
    btn(px(32.7) + 4, n(TOP + 3.4), n(6 * U), 6, "", 0) +
    btn(px(28.3), n(TOP + 9.4), n(8.3 * U), 6, "ON", 3.1) +
    '<path class="line" d="M' + n(px(35.4)) + " " + n(TOP + 2.6) + "V" + n(TOP + 4.2) + '" stroke-opacity="0.5" stroke-width="0.8"/>' +
    '<circle class="line" cx="' + n(px(35.4)) + '" cy="' + n(TOP + 4.2) + '" r="1.4" stroke-opacity="0.42" stroke-width="0.8" fill="none"/>' +
    '<path class="line" d="' + rrect(lcd.x, lcd.y, lcd.w, lcd.h, 2.2) + '" stroke-opacity="0.55" stroke-width="1.3" fill="none"/>' +
    '<path class="line" d="' + rrect(lcd.x + 2, lcd.y + 2, lcd.w - 4, lcd.h - 4, 1.4) + '" stroke-opacity="0.26" stroke-width="0.9" fill="none"/>' +

    /* ---------- 唯一的强调色：LCD 屏的一点微光 ---------- */
    '<rect class="accent-fill" x="' + n(lcd.x + 2) + '" y="' + n(lcd.y + 2) + '" width="' + n(lcd.w - 4) +
    '" height="' + n(lcd.h - 4) + '" rx="1.4" fill-opacity="0.1"/>' +

    /* ---------- 机身轮廓压在最上 ---------- */
    '<path class="line" d="' + body + '" stroke-opacity="0.8" stroke-width="1.5" fill="none"/>'
  );
}
