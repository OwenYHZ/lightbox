/**
 * OLYMPUS M.ZUIKO DIGITAL 45mm f/1.8 —— 矢量正面图。
 * 依据 realDevicePhotos 里的实拍：银色矮胖镜筒（长径比 ≈ 0.8）、宽滚花对焦环、
 * 铭牌环、加宽的卡口法兰、后端 M43 卡口；红点对位标记。
 * 只使用 class：line / accent / accent-fill / text。
 */
export function glyphOlympus45() {
  const CY = 182;
  const FRONT_X = 190;

  /* 从前到后各段的轮廓半径：前圈 / 前银环 / 滚花环 / 细银环 / 铭牌环 / 卡口法兰 / M43 卡口 */
  const BANDS = [
    { x: 190, ry: 78 },
    { x: 203, ry: 80 },
    { x: 222, ry: 82 },
    { x: 261, ry: 80 },
    { x: 266, ry: 80 },
    { x: 292, ry: 86 },
    { x: 310, ry: 70 }
  ];
  const END_X = 323;

  /* 上下轮廓：台阶式过渡，一段线交代一个分模面 */
  let top = "M" + FRONT_X + " " + (CY - BANDS[0].ry);
  for (let i = 1; i < BANDS.length; i += 1) {
    top += "H" + BANDS[i].x + "V" + (CY - BANDS[i].ry);
  }
  top += "H" + END_X;

  let bottom = "V" + (CY + BANDS[BANDS.length - 1].ry);
  for (let i = BANDS.length - 1; i >= 1; i -= 1) {
    bottom += "V" + (CY + BANDS[i].ry) + "H" + BANDS[i].x;
  }
  bottom += "V" + (CY + BANDS[0].ry) + "H" + FRONT_X;

  /* 段与段之间的竖向分模线：[x, 半径, 透明度] */
  const SEAMS = [
    [203, 80, 0.3],
    [222, 82, 0.32],
    [261, 82, 0.3],
    [266, 80, 0.22],
    [292, 86, 0.5],
    [310, 86, 0.42],
  ];

  let seams = "";
  for (const [x, r, o] of SEAMS) {
    seams +=
      '<path d="M' + x + " " + (CY - r) + "V" + (CY + r) + '" stroke-opacity="' + o + '"/>';
  }

  /* 滚花：等距竖线，只画 16 根，够读不糊 */
  let knurl = "";
  for (let i = 0; i < 16; i += 1) {
    const x = 225 + (i * 33) / 15;
    knurl +=
      '<path d="M' + Math.round(x * 10) / 10 + " " + (CY - 74) + "V" + (CY + 74) +
      '" stroke-opacity="0.16" stroke-width="1"/>';
  }

  const font =
    'font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="6.2" letter-spacing="0.6" text-anchor="middle"';

  return (
    '<g transform="translate(240 182) scale(1.35) translate(-240 -182)">' +
    /* 前口的虚线光环，和 glyphLens 保持同一套“取景”语言 */
    '<ellipse class="accent" cx="' + FRONT_X + '" cy="' + CY + '" rx="46" ry="92" fill="none" stroke-opacity="0.16" stroke-dasharray="2 8"/>' +
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="' + top + 'a6 70 0 0 1 0 140' + bottom + '" stroke-opacity="0.58" stroke-width="1.5"/>' +
    seams +
    knurl +
    /* 前口：外圈 / 黑色内壁 / 压圈 / 镜片 */
    '<ellipse cx="' + FRONT_X + '" cy="' + CY + '" rx="24" ry="78" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<ellipse cx="' + FRONT_X + '" cy="' + CY + '" rx="18" ry="61" stroke-opacity="0.38" stroke-width="1.2"/>' +
    '<ellipse cx="' + FRONT_X + '" cy="' + CY + '" rx="11" ry="39" stroke-opacity="0.22" stroke-width="1"/>' +
    "</g>" +
    /* 铭牌环：两行小字（镜筒横放，字沿圆周方向，所以旋转 90°） */
    '<text class="text" x="279" y="' + CY + '" transform="rotate(-90 279 ' + CY + ')" fill-opacity="0.5" ' + font + ">OLYMPUS DIGITAL 45mm 1:1.8 MSC</text>" +
    '<text class="text" x="301" y="' + CY + '" transform="rotate(-90 301 ' + CY + ')" fill-opacity="0.46" ' + font + ">0.5m/1.64ft-&#8734;</text>" +
    /* 红点对位标记 */
    '<circle class="accent-fill" cx="301" cy="244" r="3" fill-opacity="0.78"/>' +
    '<circle class="accent" cx="301" cy="244" r="6.4" fill="none" stroke-opacity="0.34"/>'
    + '</g>'
  );
}
