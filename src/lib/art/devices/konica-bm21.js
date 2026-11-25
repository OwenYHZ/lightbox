/**
 * Konica Big Mini BM-21 —— 正视图（银色磨砂铝 + 黑色握把 + 黑色顶条）
 *
 * 依据 realDevicePhotos/Konica Big Mini BM-21 的实拍量取：
 *   · 机身 290 × 178（宽高比 ≈ 1.63），四角 R13
 *   · 左端一条黑色橡胶握把，内缘随高度微微向右鼓出
 *   · 顶部黑色横条从握把右缘贯到右侧边缘；条内自左向右：
 *     圆形 AF 窗 · 方形取景窗（偏黄绿玻璃）· 小圆窗 · 右侧长方形闪光灯
 *   · 镜头压在面板中下、略偏左：外圈拉丝金属环 + 深色镜筒 + 圆角矩形快门盖；
 *     镜圈上半、下半各一道弧形刻字线（KONICA LENS / AUTO FOCUS 30mm F3.5）
 *   · 右侧「Konica」「big mini」字标，下方 2 × 3 小圆点
 *
 * 只允许使用 class：line / accent / accent-fill / text。
 */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function n(v) {
  return Math.round(v * 10) / 10;
}

/** 极坐标取点，供镜圈刻字弧线用 */
function arc(cx, cy, r, a0, a1) {
  const x0 = n(cx + Math.cos((a0 * Math.PI) / 180) * r);
  const y0 = n(cy + Math.sin((a0 * Math.PI) / 180) * r);
  const x1 = n(cx + Math.cos((a1 * Math.PI) / 180) * r);
  const y1 = n(cy + Math.sin((a1 * Math.PI) / 180) * r);
  return "M" + x0 + " " + y0 + "A" + r + " " + r + " 0 0 1 " + x1 + " " + y1;
}

export function glyphKonicaBM21() {
  /* 机身外框：290 × 178，视觉中心 (240, 182) */
  const L = 95;
  const R = 385;
  const T = 93;
  const B = 271;
  const bandB = 134; /* 顶部黑条下沿 */
  const grip = 152; /* 握把内缘 */

  /* 镜头 */
  const cx = 228;
  const cy = 186;
  const rOut = 51;

  /* 闪光灯灯管的细密竖线 */
  let ribs = "";
  for (let i = 0; i < 8; i += 1) {
    const x = n(304 + i * 6.6);
    ribs += '<path class="line" d="M' + x + ' 100V125" stroke-opacity="0.16" stroke-width="1"/>';
  }

  /* 右下 2 × 3 小圆点 */
  let dots = "";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      dots +=
        '<circle class="text" cx="' + (316 + col * 18) + '" cy="' + (222 + row * 12) + '" r="2.4" fill-opacity="0.24"/>';
    }
  }

  return (
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    /* ---------- 机身 ---------- */
    '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '" rx="13" stroke-opacity="0.58" stroke-width="1.5"/>' +
    /* 顶部黑条：下沿 + 右端收角（上沿与机身外框共用） */
    '<path d="M' + grip + " " + bandB + "H371A14 14 0 0 0 385 120V108" + '" stroke-opacity="0.38" stroke-width="1.2"/>' +
    /* 左端握把：内缘弧线 + 一道更浅的倒角线 */
    '<path d="M' + grip + " " + T + "Q178 200 150 " + B + '" stroke-opacity="0.42" stroke-width="1.2"/>' +
    '<path d="M150 100Q168 198 146 264" stroke-opacity="0.15" stroke-width="1"/>' +
    /* ---------- 黑条内的窗口 ---------- */
    /* 圆形 AF 窗 */
    '<circle cx="192" cy="108" r="12" stroke-opacity="0.4" stroke-width="1.2"/>' +
    '<circle cx="192" cy="108" r="6" stroke-opacity="0.26" stroke-width="1"/>' +
    /* 方形取景窗（偏黄绿玻璃） */
    '<rect x="214" y="96" width="45" height="32" rx="3" stroke-opacity="0.34" stroke-width="1.2"/>' +
    '<rect x="218" y="100" width="37" height="24" rx="2" stroke-opacity="0.3" stroke-width="1"/>' +
    '<path d="M218 112H255M228 100V124" stroke-opacity="0.12" stroke-width="1"/>' +
    /* 小圆窗 */
    '<circle cx="271" cy="106" r="4" stroke-opacity="0.3" stroke-width="1"/>' +
    /* 长方形闪光灯 */
    '<rect x="300" y="96" width="58" height="33" rx="3" stroke-opacity="0.4" stroke-width="1.2"/>' +
    '<rect x="303" y="99" width="52" height="27" rx="2" stroke-opacity="0.26" stroke-width="1"/>' +
    ribs +
    /* ---------- 镜头 ---------- */
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOut + '" stroke-opacity="0.55" stroke-width="1.5"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="42" stroke-opacity="0.34" stroke-width="1.2"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="38" stroke-opacity="0.22" stroke-width="1"/>' +
    /* 镜圈上下弧形刻字线 */
    '<path d="' + arc(cx, cy, 46.5, 203, 337) + '" stroke-opacity="0.26" stroke-width="1"/>' +
    '<path d="' + arc(cx, cy, 46.5, 23, 157) + '" stroke-opacity="0.26" stroke-width="1"/>' +
    /* 圆角矩形快门盖 */
    '<rect x="' + (cx - 25) + '" y="' + (cy - 17) + '" width="50" height="34" rx="6" stroke-opacity="0.46" stroke-width="1.2"/>' +
    '<path d="M' + (cx - 14) + " " + (cy + 10) + "L" + (cx + 16) + " " + (cy - 12) + '" stroke-opacity="0.14" stroke-width="1"/>' +
    /* 右侧面板的竖棱 */
    '<path d="M379 104V262" stroke-opacity="0.14" stroke-width="1"/>' +
    "</g>" +
    /* 唯一的强调色：镜圈里那一细环 */
    '<circle class="accent" cx="' + cx + '" cy="' + cy + '" r="40.5" fill="none" stroke-opacity="0.34" stroke-width="1"/>' +
    /* 右侧字标 */
    '<text class="text" x="332" y="158" text-anchor="middle" fill-opacity="0.42" font-family="' + MONO + '" font-size="8" letter-spacing="1.6">Konica</text>' +
    '<text class="text" x="328" y="196" text-anchor="middle" fill-opacity="0.42" font-family="' + MONO + '" font-size="7" letter-spacing="1.8">big mini</text>' +
    dots
  );
}
