/**
 * ZENIKO ZA12 —— 迷你机顶手动闪光灯（正视图，按 222229 正面量取）
 *
 * 比例：机身 262 × 114 = 2.30 : 1（照片 915 × 398 px）
 *   银壳 : 黑底带 = 0.89 : 0.11 H
 *   柔光窗 0.475 W × 0.29 H，贴左侧，窗内是带棱纹的通透柔光片
 *   测光孔 Ø 0.085 W，中心 (0.809 W, 0.452 H)
 *   热靴偏左：0.191 – 0.530 W（中心 0.36 W）
 *   两拨盘 Ø 0.38 W，中心 0.230 / 0.738 W，只从机身上沿露出帽
 *
 * 只允许使用 class：line / accent / accent-fill / text。
 */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function n(v) {
  return Math.round(v * 10) / 10;
}

/* 一枚拨盘从机身上沿露出来的帽：圆角顶 + 一圈刻度数字 + 细滚花 */
function dialCap(cx, half, top, edgeY, nums) {
  const x0 = n(cx - half);
  const x1 = n(cx + half);
  let ticks = "";
  for (let i = 0; i < 6; i += 1) {
    const x = n(x0 + 14 + i * 14);
    ticks += '<path class="line" d="M' + x + " " + n(top + 11) + "V" + n(edgeY - 2.5) + '" stroke-opacity="0.16" stroke-width="1"/>';
  }
  /* 只留 3 个代表值，480px 卡面上读得出来 */
  let marks = "";
  for (let i = 0; i < nums.length; i += 1) {
    marks +=
      '<text class="text" x="' + n(cx - 30 + i * 30) + '" y="' + n(top + 7.5) + '" fill-opacity="0.5" font-family="' + MONO +
      '" font-size="4.2" text-anchor="middle">' + nums[i] + "</text>";
  }
  return (
    '<path class="line" d="M' + x0 + " " + edgeY + "V" + n(top + 8) + "A8 8 0 0 1 " + n(x0 + 8) + " " + top +
    "H" + n(x1 - 8) + "A8 8 0 0 1 " + x1 + " " + n(top + 8) + "V" + edgeY + '" stroke-opacity="0.5" stroke-width="1.5"/>' +
    '<path class="line" d="M' + n(x0 + 4) + " " + edgeY + "V" + n(top + 11) + "A5 5 0 0 1 " + n(x0 + 9) + " " + n(top + 6) +
    "H" + n(x1 - 9) + "A5 5 0 0 1 " + n(x1 - 4) + " " + n(top + 11) + "V" + edgeY + '" stroke-opacity="0.18" stroke-width="1"/>' +
    ticks +
    marks
  );
}

export function glyphZenikoZA12() {
  /* 机身外框：262 × 114，视觉中心仍是 (240, 182) */
  const L = 109;
  const R = 371;
  const T = 115;
  const B = 229;
  const seam = 216; // 银壳 / 黑底带分模线（黑带 0.114 H）
  const capTop = 98; // 拨盘帽顶（露出 0.15 H）

  /* 柔光窗：0.475 W × 0.29 H */
  const winX = 163;
  const winW = 125;
  const winY = 149;
  const winH = 33;

  let ribs = "";
  for (let i = 0; i < 6; i += 1) {
    const x = n(winX + 10 + i * 21);
    ribs += '<path class="line" d="M' + x + " " + n(winY + 4) + "V" + n(winY + winH - 4) + '" stroke-opacity="0.15" stroke-width="1"/>';
  }

  /* 黑底带上的 45° 排线（间距 4，剪到机身圆角内） */
  let hatch = "";
  for (let x = 96; x <= 384; x += 4) {
    hatch += '<path class="line" d="M' + x + " " + B + "L" + n(x + 13) + " " + seam + '" stroke-opacity="0.14" stroke-width="1"/>';
  }

  return (
    '<defs><clipPath id="za12-band"><rect x="' + L + '" y="' + seam + '" width="' + (R - L) + '" height="' + (B - seam) + '" rx="8"/></clipPath></defs>' +
    '<g class="line" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
    /* 顶部两拨盘露头（先画，帽底被机身轮廓压住） */
    dialCap(169, 50, capTop, T, ["2", "5.6", "11"]) +
    dialCap(302, 50, capTop, T, ["-1/64", "-1/8", "FULL"]) +
    /* 机身 */
    '<rect x="' + L + '" y="' + T + '" width="' + (R - L) + '" height="' + (B - T) + '" rx="16" stroke-opacity="0.58" stroke-width="1.5"/>' +
    /* 黑底带：排线 + 分模线 */
    '<g clip-path="url(#za12-band)">' + hatch + "</g>" +
    '<path class="line" d="M' + n(L + 8) + " " + seam + "H" + n(R - 8) + '" stroke-opacity="0.32" stroke-width="1.2"/>' +
    /* 柔光窗：黑框 + 窗面 + 竖向棱纹 */
    '<rect x="' + (winX - 5) + '" y="' + (winY - 5) + '" width="' + (winW + 10) + '" height="' + (winH + 10) +
    '" rx="10" stroke-opacity="0.34" stroke-width="1.2"/>' +
    '<rect x="' + winX + '" y="' + winY + '" width="' + winW + '" height="' + winH + '" rx="6" stroke-opacity="0.46" stroke-width="1.2"/>' +
    ribs +
    /* 测光孔 */
    '<circle class="text" cx="321" cy="166" r="11" fill-opacity="0.34"/>' +
    /* 热靴：偏左，底板 + 插脚 */
    '<path class="line" d="M146 ' + B + "V" + (B + 9) + "H261V" + B + '" stroke-opacity="0.32" stroke-width="1.2"/>' +
    '<rect x="159" y="' + (B + 9) + '" width="89" height="22" rx="3" stroke-opacity="0.44" stroke-width="1.2"/>' +
    '<path class="line" d="M163 ' + (B + 18) + "H244" + '" stroke-opacity="0.16" stroke-width="1"/>' +
    "</g>" +
    /* 柔光窗内圈的一线暖光：唯一的强调色 */
    '<rect class="accent" x="' + (winX + 5) + '" y="' + (winY + 5) + '" width="' + (winW - 10) + '" height="' + (winH - 10) +
    '" rx="4" fill="none" stroke-opacity="0.38" stroke-width="1"/>' +
    /* 型号：印在黑底带上（实物位置） */
    '<text class="text" x="203" y="226" fill-opacity="0.46" font-family="' + MONO +
    '" font-size="6" letter-spacing="1.4" text-anchor="middle">ZA12</text>'
  );
}
