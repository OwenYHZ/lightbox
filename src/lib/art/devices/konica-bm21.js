/**
 * Konica Big Mini BM-21 —— 正面线稿（极简平面风格：只画正面，不填色、不排线、不做明暗）
 *
 * 尺寸来自 docs/bm21-spec.md（同机位单应校正量测，mm 级）+ bm21-reviewer 的实拍复核：
 * 机身 100 × 63 mm。代码里先写 mm 再换算，方便对着量测书核对：
 *   px(X) = 96 + X·2.88      （100 mm → 288）
 *   pz(Z) = 91.5 + Z·2.873   （63 mm → 181）
 *
 * 只保留能认出机型的东西：
 *   机身轮廓 / 握把 + 那条腰形分模线 / 镜筒双环 + 前窗 + 两段弧字 /
 *   黑窗带里的四个窗（AF、取景、右圆、闪光 7 棱）/ 四段丝印 / 右下 2×3 圆点 / 右端分模线。
 * 顶面（快门、按键、LCD）一律不画 —— 这是纯正面视图。
 *
 * 只用 class：line / text / accent-fill（深浅主题自动换色，不写死颜色）。
 * 线宽与留白对齐 olympus-45 / zeniko-za12：主轮廓 1.5、次要 1.2、细节 1。
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
  const pz = (mm) => n(91.5 + mm * V);

  const T = pz(0); /* 正面顶边 91.5 */
  const B = pz(63); /* 机身底 272.5 */
  const R = px(100); /* 右端 384 */

  /* 机身轮廓：左上 R6.5、左下 R5.8、右端 R1.5（量测书 §2.1） */
  const body =
    "M" + n(96 + 6.5 * U) + " " + T + "H" + n(R - 1.5 * U) +
    "A" + n(1.5 * U) + " " + n(1.5 * V) + " 0 0 1 " + R + " " + n(T + 1.5 * V) +
    "V" + n(B - 1.5 * V) + "A" + n(1.5 * U) + " " + n(1.5 * V) + " 0 0 1 " + n(R - 1.5 * U) + " " + B +
    "H" + n(96 + 5.8 * U) + "A" + n(5.8 * U) + " " + n(5.8 * V) + " 0 0 1 96 " + n(B - 5.8 * V) +
    "V" + n(T + 6.5 * V) + "A" + n(6.5 * U) + " " + n(6.5 * V) + " 0 0 1 " + n(96 + 6.5 * U) + " " + T + "Z";

  /* 握把分模线（量测书 §2.2 折线：上 23.4 → 腰 16.9 → 底 20.9） */
  const seam = smooth([
    [23.4, 0], [23.1, 2], [21.6, 6], [20.4, 10], [19.3, 14], [18.5, 18], [17.7, 22],
    [17.3, 26], [17.1, 30], [16.9, 34], [16.9, 38], [17.1, 42], [17.5, 46],
    [18.1, 50], [18.9, 54], [19.9, 58], [20.9, 63],
  ].map((p) => [px(p[0]), pz(p[1])]));

  /* 握把块：缝 + 底 + 左缘 + 顶（只用它铺一层排线，黑窗带保持素线） */
  const grip =
    seam + "H96V" + T + "H" + px(23.4) + "Z";

  /* 黑窗带：矩形 + 左端圆形凸缘 */
  const lobe = { x: px(35.5), y: pz(8.2), r: n(5.95 * U) };
  const pX0 = px(29.5 + 5.95);
  const pX1 = px(96);
  const pY0 = pz(2);
  const pY1 = pz(19.2);
  const panel =
    "M" + pX0 + " " + pY0 + "H" + n(pX1 - 8) + "A8 8 0 0 1 " + pX1 + " " + n(pY0 + 8) +
    "V" + n(pY1 - 8) + "A8 8 0 0 1 " + n(pX1 - 8) + " " + pY1 + "H" + pX0 +
    "A" + lobe.r + " " + lobe.r + " 0 0 1 " + pX0 + " " + pY0 + "Z";

  /* 四个窗 */
  const af = { x: px(36.4), y: pz(6.8), r: n(2.95 * U) };
  const vf = { x: px(50) - n(9.15 * U), y: pz(8.7) - n(5.95 * V), w: n(18.3 * U), h: n(11.9 * V) };
  const rf = { x: px(62.8), y: pz(7.2), r: n(3 * U) };
  const fl = { x: px(69.7), y: pz(2.9), w: n(20.8 * U), h: n(9.7 * V) };

  /* 闪光窗 7 条竖棱 */
  let ribs = "";
  for (let i = 0; i < 7; i += 1) {
    const cx = px(80.1) + n((i - 3) * 2.3 * U);
    ribs +=
      '<path d="M' + n(cx) + " " + n(fl.y + n(0.9 * V)) + "V" + n(fl.y + fl.h - n(0.9 * V)) +
      '" stroke-opacity="0.3" stroke-width="1"/>';
  }

  /* 镜筒 */
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
      dots += '<circle cx="' + px(x) + '" cy="' + pz(z) + '" r="' + n(0.9 * U) +
        '" stroke-opacity="0.46" stroke-width="1" fill="none"/>';
    });
  });

  return (
    "<defs>" +
    /* 唯一的一层排线：只给橡胶握把，间距与 ZA12 顶板那层同档 */
    '<pattern id="' + id + '-h" width="3.7" height="3.7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<path class="line" d="M0 0V3.7" stroke-opacity="0.11" stroke-width="1"/>' +
    "</pattern>" +
    '<clipPath id="' + id + '-c"><path d="' + body + '"/></clipPath>' +
    '<path id="' + id + '-ta" d="' + arc(kx, ky, n(10.4 * U), 208, 332, 1) + '"/>' +
    '<path id="' + id + '-ba" d="' + arc(kx, ky, n(12.4 * U), 156, 24, 0) + '"/>' +
    "</defs>" +

    /* ---------- 机身 + 握把（握把铺一层最淡排线 = 橡胶） ---------- */
    '<g clip-path="url(#' + id + '-c)"><path d="' + grip + '" fill="url(#' + id + '-h)" stroke="none"/></g>' +
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="' + body + '" stroke-opacity="0.6" stroke-width="1.5"/>' +
    '<path d="' + seam + '" stroke-opacity="0.6" stroke-width="1.4"/>' +

    /* ---------- 黑窗带 + 四个窗 ---------- */
    '<path d="' + panel + '" stroke-opacity="0.55" stroke-width="1.2"/>' +
    /* AF 圆窗 */
    '<circle cx="' + af.x + '" cy="' + af.y + '" r="' + af.r + '" stroke-opacity="0.55" stroke-width="1.2"/>' +
    '<circle cx="' + af.x + '" cy="' + af.y + '" r="' + n(2.45 * U) + '" stroke-opacity="0.26" stroke-width="1"/>' +
    /* 取景窗：外框 + 玻璃 */
    '<path d="' + rrect(vf.x, vf.y, vf.w, vf.h, 2.4) + '" stroke-opacity="0.55" stroke-width="1.2"/>' +
    '<path d="' + rrect(px(50) - n(5.6 * U), pz(8.7) - n(4.4 * V), n(11.2 * U), n(8.8 * V), 1.2) +
    '" stroke-opacity="0.3" stroke-width="1"/>' +
    /* 右圆窗 */
    '<circle cx="' + rf.x + '" cy="' + rf.y + '" r="' + rf.r + '" stroke-opacity="0.5" stroke-width="1.2"/>' +
    '<circle cx="' + rf.x + '" cy="' + rf.y + '" r="' + n(2.2 * U) + '" stroke-opacity="0.24" stroke-width="1"/>' +
    /* 闪光窗 + 棱条 */
    '<path d="' + rrect(fl.x, fl.y, fl.w, fl.h, n(1.6 * U)) + '" stroke-opacity="0.55" stroke-width="1.2"/>' +
    ribs +

    /* ---------- 右端分模线（X≈96.4，上下随 R1.5 弯一下） ---------- */
    '<path d="M' + px(96.4) + " " + pz(6) + "V" + pz(57) +
    "M" + px(96.4) + " " + pz(6) + "C" + px(96.4) + " " + pz(2.4) + " " + px(97.4) + " " + pz(1.5) + " " + px(99) + " " + pz(1.5) +
    "M" + px(96.4) + " " + pz(57) + "C" + px(96.4) + " " + pz(60.6) + " " + px(97.4) + " " + pz(61.5) + " " + px(99) + " " + pz(61.5) +
    '" stroke-opacity="0.55" stroke-width="1"/>' +

    /* ---------- 镜筒：银环 + 黑圈 + 前窗 ---------- */
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kSilver + '" stroke-opacity="0.45" stroke-width="1"/>' +
    '<circle cx="' + kx + '" cy="' + ky + '" r="' + kBlack + '" stroke-opacity="0.6" stroke-width="1.5"/>' +
    '<path d="' + rrect(kx - kCovW, ky - kCovH, kCovW * 2, kCovH * 2, n(3 * U)) + '" stroke-opacity="0.42" stroke-width="1.2"/>' +
    '<path d="M' + n(kx - kCovW + n(2.4 * U)) + " " + n(ky + kCovH * 0.7) + "L" + n(kx + kCovW - n(2.4 * U)) + " " +
    n(ky - kCovH * 0.6) + '" stroke-opacity="0.2" stroke-width="1"/>' +

    /* ---------- 右下 2×3 圆点 ---------- */
    dots +
    "</g>" +

    /* ---------- 镜圈两段弧字 ---------- */
    '<text class="text" fill-opacity="0.62" font-family="' + SANS + '" font-size="8" font-weight="500" letter-spacing="0.1">' +
    '<textPath href="#' + id + '-ta" startOffset="50%" text-anchor="middle">KONICA LENS</textPath></text>' +
    '<text class="text" fill-opacity="0.55" font-family="' + SANS + '" font-size="5.4" font-weight="500">' +
    '<textPath href="#' + id + '-ba" startOffset="50%" text-anchor="middle">AUTO FOCUS 30mm F4.5</textPath></text>' +

    /* ---------- 丝印（textLength 压到量测书宽度） ---------- */
    '<text class="text" x="' + px(82) + '" y="' + pz(26) + '" text-anchor="middle" textLength="' + n(16 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.62" font-family="' + SANS +
    '" font-size="18.6" font-weight="700">Konica</text>' +
    '<text class="text" x="' + px(81.5) + '" y="' + pz(40.2) + '" text-anchor="middle" textLength="' + n(17 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.56" font-family="' + SANS +
    '" font-size="15" font-weight="700">big mini</text>' +
    '<text class="text" x="' + px(81.8) + '" y="' + pz(43.7) + '" text-anchor="middle" textLength="' + n(16.5 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.3" font-family="' + SANS +
    '" font-size="7.4" font-weight="500" letter-spacing="0.1">RED EYE REDUCTION</text>' +
    '<text class="text" x="' + px(82) + '" y="' + pz(46.7) + '" text-anchor="middle" textLength="' + n(17 * U) +
    '" lengthAdjust="spacingAndGlyphs" fill-opacity="0.3" font-family="' + SANS +
    '" font-size="7.6" font-weight="500" letter-spacing="0.1">AUTO FOCUS <tspan font-style="italic" font-weight="700" font-size="8.2">BM-21</tspan></text>' +

    /* ---------- 唯一的强调色：镜圈上的对位点 ---------- */
    '<circle class="accent-fill" cx="' + n(kx + kBlack * 0.62) + '" cy="' + n(ky + kBlack * 0.72) +
    '" r="2.4" fill-opacity="0.7"/>'
  );
}