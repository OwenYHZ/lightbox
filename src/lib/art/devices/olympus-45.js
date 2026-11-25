/**
 * OLYMPUS M.ZUIKO DIGITAL 45mm f/1.8 —— 正面矢量图（依据 222138 正面照）。
 * 同心圆结构：外圈银环 125 / 黑前圈 105 / 环形白字 84 / 前玉 68，圆心 (240,180)。
 * 只使用 class：line / accent / accent-fill / text。
 */
let seq = 0;

export function glyphOlympus45() {
  const CX = 240;
  const CY = 180;
  const R_OUT = 125;
  const R_BLACK = 105;
  const R_GLASS = 68;
  const R_TEXT = 84;
  const id = "oly" + (seq += 1);

  const r1 = (v) => Math.round(v * 10) / 10;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (r, a) => [CX + r * Math.cos(rad(a)), CY + r * Math.sin(rad(a))];

  /* 圆弧路径（顺时针，屏幕坐标） */
  const arcPath = (r, a0, a1, sweep) => {
    const p0 = pt(r, a0);
    const p1 = pt(r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return (
      "M" + r1(p0[0]) + " " + r1(p0[1]) +
      "A" + r + " " + r + " 0 " + large + " " + (sweep === 0 ? 0 : 1) + " " +
      r1(p1[0]) + " " + r1(p1[1])
    );
  };

  /* 黑环的 45° 排线：解析求交，只保留落在 r68–r105 环带里的弦 */
  let hatch = "";
  const kMax = R_BLACK * Math.SQRT2;
  const step = 3.5 * Math.SQRT2;
  for (let k = -kMax; k <= kMax; k += step) {
    const dOut = 2 * R_BLACK * R_BLACK - k * k;
    if (dOut <= 0) continue;
    const rootOut = Math.sqrt(dOut);
    const xa = (k - rootOut) / 2;
    const xb = (k + rootOut) / 2;
    const dIn = 2 * R_GLASS * R_GLASS - k * k;
    const seg = (a, b) =>
      "M" + r1(CX + a) + " " + r1(CY + k - a) + "L" + r1(CX + b) + " " + r1(CY + k - b);
    if (dIn > 0) {
      const rootIn = Math.sqrt(dIn);
      const ia = (k - rootIn) / 2;
      const ib = (k + rootIn) / 2;
      hatch += seg(xa, ia) + seg(ib, xb);
    } else {
      hatch += seg(xa, xb);
    }
  }

  /* 环形铭文：字符串宽度 → 弧长 → 圆弧，四段顺时针排布 */
  const ringText = (text, center, extra, flip) => {
    const width = text.length * 4.8 + Math.max(0, text.length - 1) * 1.6;
    const span = ((width * (extra || 1.16)) / R_TEXT) * (180 / Math.PI);
    if (flip) {
      /* 下弧：反向走弧，字头朝内，人眼可正读 */
      return { text, d: arcPath(R_TEXT, center + span / 2, center - span / 2, 0) };
    }
    const a0 = center - span / 2;
    return { text, d: arcPath(R_TEXT, a0, a0 + span) };
  };
  const RING = [
    ringText("OLYMPUS", 255),
    ringText("M.ZUIKO DIGITAL", 0),
    ringText("45mm 1:1.8", 90, 1.16, true),
  ];

  const font =
    'font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" letter-spacing="1.6"';

  let defs = "";
  let texts = "";
  RING.forEach((item, i) => {
    const pid = id + "-r" + i;
    defs += '<path id="' + pid + '" d="' + item.d + '"/>';
    texts +=
      '<text class="text" fill-opacity="1" ' + font + ">" +
      '<textPath href="#' + pid + '" startOffset="50%" text-anchor="middle">' + item.text + "</textPath></text>";
  });

  /* 前玉上的两段反光弧（222138 下缘那道高光） */
  const glintA = arcPath(52, 68, 118);
  const glintB = arcPath(60, 155, 202);
  const dot = pt(114, 18);

  return (
    "<defs>" + defs + "</defs>" +
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    /* 外缘银环 */
    '<circle cx="' + CX + '" cy="' + CY + '" r="' + R_OUT + '" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<circle cx="' + CX + '" cy="' + CY + '" r="110" stroke-opacity="0.18" stroke-width="1"/>' +
    /* 宽黑前圈：内外缘 + 45° 排线 */
    '<circle cx="' + CX + '" cy="' + CY + '" r="' + R_BLACK + '" stroke-opacity="0.4" stroke-width="1.2"/>' +
    '<path d="' + hatch + '" stroke-opacity="0.1" stroke-width="1"/>' +
    /* 前玉：边界 + 镀膜内圈 + 反光 */
    '<circle cx="' + CX + '" cy="' + CY + '" r="' + R_GLASS + '" stroke-opacity="0.52" stroke-width="1.2"/>' +
    '<circle cx="' + CX + '" cy="' + CY + '" r="62" stroke-opacity="0.14" stroke-width="1"/>' +
    '<path d="' + glintA + '" stroke-opacity="0.22" stroke-width="1.5"/>' +
    '<path d="' + glintB + '" stroke-opacity="0.14" stroke-width="1"/>' +
    "</g>" +
    texts +
    /* ⌀37：左侧，水平正读 */
    '<text class="text" x="' + (CX - R_TEXT) + '" y="' + CY + '" fill-opacity="1" text-anchor="middle" ' +
    'font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" letter-spacing="1.6">Ø37</text>' +
    /* 红点对位标记（卡口法兰，3–4 点方向） */
    '<circle class="accent-fill" cx="' + r1(dot[0]) + '" cy="' + r1(dot[1]) + '" r="2.8" fill-opacity="0.82"/>'
  );
}
