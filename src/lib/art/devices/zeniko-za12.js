/**
 * ZENIKO ZA12 —— 迷你机顶手动闪光灯（正视图）
 *
 * 依据 realDevicePhotos/ZENIKO ZA12 的实拍：
 *   · 银拉丝铝外壳 + 黑色顶板 / 黑色底带，四角圆润的扁方盒
 *   · 顶部两枚大号银色滚花拨盘（左 f/stop，右 ISO / 快门），从机身上沿露出边缘
 *   · 正面是一条横向柔光窗，右边一枚测光孔
 *   · 底部黑色热靴，插脚比机身窄、前后长
 *
 * 只允许使用 class：line / accent / accent-fill / text。
 */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function n(v) {
  return Math.round(v * 10) / 10;
}

/* 一枚拨盘从机身上沿露出来的帽：圆角顶 + 细滚花 + 一道内侧倒角线 */
function dialCap(cx, half, top, edgeY) {
  const x0 = n(cx - half);
  const x1 = n(cx + half);
  let ticks = "";
  for (let i = 0; i < 6; i += 1) {
    const x = n(x0 + 12 + i * 12);
    ticks +=
      '<path class="line" d="M' + x + " " + n(top + 9) + "V" + n(edgeY - 3) + '" stroke-opacity="0.16" stroke-width="1"/>';
  }
  return (
    '<path class="line" d="M' + x0 + " " + edgeY + "V" + n(top + 8) + "A8 8 0 0 1 " + n(x0 + 8) + " " + top +
    "H" + n(x1 - 8) + "A8 8 0 0 1 " + x1 + " " + n(top + 8) + "V" + edgeY + '" stroke-opacity="0.5" stroke-width="1.5"/>' +
    '<path class="line" d="M' + n(x0 + 4) + " " + edgeY + "V" + n(top + 12) + "A5 5 0 0 1 " + n(x0 + 9) + " " + n(top + 7) +
    "H" + n(x1 - 9) + "A5 5 0 0 1 " + n(x1 - 4) + " " + n(top + 12) + "V" + edgeY + '" stroke-opacity="0.16" stroke-width="1"/>' +
    ticks
  );
}

export function glyphZenikoZA12() {
  /* 机身：宽 262 / 高 131（约 60 × 30mm 的扁盒），视觉中心仍是 (240, 182) */
  const L = 109;
  const R = 371;
  const T = 115;
  const B = 246;
  const seam = 220; // 银壳与黑色底带的分模线
  const capTop = 87; // 拨盘帽顶

  /* 正面柔光窗 + 测光孔 */
  const winX = 167;
  const winW = 131;
  const winY = 147;
  const winH = 28;

  let ribs = "";
  for (let i = 0; i < 5; i += 1) {
    const x = n(winX + 21 + i * 20);
    ribs +=
      '<path class="line" d="M' + x + " " + n(winY + 5) + "V" + n(winY + winH - 5) + '" stroke-opacity="0.14" stroke-width="1"/>';
  }

  return (
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    /* 顶部两拨盘露头（画在机身之前，帽底被机身轮廓压住） */
    dialCap(179, 41, capTop, T) +
    dialCap(301, 41, capTop, T) +
    /* 机身 */
    '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '" rx="17" stroke-opacity="0.58" stroke-width="1.5"/>' +
    /* 黑色底带分模线 */
    '<path class="line" d="M' + (L + 8) + " " + seam + "H" + (R - 8) + '" stroke-opacity="0.3" stroke-width="1.2"/>' +
    /* 柔光窗：外框 + 窗面 + 竖向细纹 */
    '<rect x="' + (winX - 5) + '" y="' + (winY - 5) + '" width="' + (winW + 10) + '" height="' + (winH + 10) +
    '" rx="10" stroke-opacity="0.3" stroke-width="1.2"/>' +
    '<rect x="' + winX + '" y="' + winY + '" width="' + winW + '" height="' + winH + '" rx="7" stroke-opacity="0.44" stroke-width="1.2"/>' +
    ribs +
    /* 测光孔 */
    '<circle class="text" cx="330" cy="' + n(winY + winH / 2) + '" r="5.5" fill-opacity="0.35"/>' +
    /* 热靴：底板 + 插脚 */
    '<path class="line" d="M190 ' + B + "V" + (B + 9) + "H290V" + B + '" stroke-opacity="0.3" stroke-width="1.2"/>' +
    '<rect x="215" y="' + (B + 9) + '" width="50" height="23" rx="3" stroke-opacity="0.42" stroke-width="1.2"/>' +
    '<path class="line" d="M219 ' + (B + 16) + "H261" + '" stroke-opacity="0.16" stroke-width="1"/>' +
    "</g>" +
    /* 柔光窗内圈的一线暖光：唯一的强调色 */
    '<rect class="accent" x="' + (winX + 5) + '" y="' + (winY + 5) + '" width="' + (winW - 10) + '" height="' + (winH - 10) +
    '" rx="5" fill="none" stroke-opacity="0.4" stroke-width="1"/>' +
    /* 型号 */
    '<text class="text" x="240" y="301" fill-opacity="0.4" font-family="' + MONO + '" font-size="7" letter-spacing="1.8" text-anchor="middle">ZA12</text>'
  );
}
