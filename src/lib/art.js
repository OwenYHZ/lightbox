/**
 * 封面生成器 —— 纯 SVG 图元，没有任何图片文件。
 *
 * 颜色全部走 CSS 变量（class：line / accent / accent-fill / text / grid），
 * 所以深色、浅色主题切换时封面会自动换色，不需要重新生成。
 */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

let uid = 0;

/* 稳定的字符串哈希，保证同一件器材每次渲染长得一样 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* mulberry32：轻量确定性随机 */
function makeRng(seed) {
  let s = seed;
  return function rng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(v) {
  return Math.round(v * 10) / 10;
}

function polygon(cx, cy, r, sides, rot) {
  const pts = [];
  for (let i = 0; i < sides; i += 1) {
    const a = rot + (i * Math.PI * 2) / sides;
    pts.push(round(cx + Math.cos(a) * r) + "," + round(cy + Math.sin(a) * r));
  }
  return pts.join(" ");
}

/* 一圈短刻度，用于对焦环、滤镜环之类的滚花 */
function ringTicks(cx, cy, r, count, len) {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r;
    const y1 = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a) * (r - len);
    const y2 = cy + Math.sin(a) * (r - len);
    out +=
      '<path class="line" d="M' + round(x1) + " " + round(y1) + "L" + round(x2) + " " + round(y2) + '" stroke-opacity="0.24" stroke-width="1"/>';
  }
  return out;
}

/* ------------------------------------------------------------------ 各类形状 */

function glyphCamera(rnd) {
  const r = 44 + rnd() * 6;
  const sides = 6 + Math.floor(rnd() * 3);
  const rot = rnd() * Math.PI;
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="144" y="126" width="198" height="116" rx="15" stroke-opacity="0.62" stroke-width="1.5"/>' +
    '<path d="M190 126v-19a7 7 0 0 1 7-7h42a7 7 0 0 1 7 7v19" stroke-opacity="0.42" stroke-width="1.4"/>' +
    '<rect x="210" y="92" width="36" height="8" rx="2.5" stroke-opacity="0.3"/>' +
    '<path d="M144 154h-9M342 154h9" stroke-opacity="0.3"/>' +
    '<path d="M312 126v116" stroke-opacity="0.18" stroke-dasharray="3 6"/>' +
    '<circle cx="170" cy="112" r="11" stroke-opacity="0.34"/>' +
    '<circle cx="170" cy="112" r="4" stroke-opacity="0.22"/>' +
    '<circle cx="318" cy="111" r="7.5" stroke-opacity="0.34"/>' +
    '<circle cx="243" cy="184" r="' + round(r) + '" stroke-opacity="0.52" stroke-width="1.5"/>' +
    '<circle cx="243" cy="184" r="' + round(r - 12) + '" stroke-opacity="0.28"/>' +
    '<circle cx="243" cy="184" r="' + round(r - 24) + '" stroke-opacity="0.18"/>' +
    "</g>" +
    '<polygon class="accent accent-fill" points="' + polygon(243, 184, r - 24, sides, rot) + '" stroke-opacity="0.66" fill-opacity="0.08"/>' +
    '<circle class="accent-fill" cx="' + round(243 + Math.cos(rot) * (r - 36)) + '" cy="' + round(184 + Math.sin(rot) * (r - 36)) + '" r="2.6" fill-opacity="0.7"/>' +
    '<circle class="accent" cx="243" cy="184" r="' + round(r + 12) + '" fill="none" stroke-opacity="0.24" stroke-width="1" stroke-dasharray="2 7"/>'
  );
}

function glyphLens(rnd) {
  const w = 250;
  const h = 74 + rnd() * 8;
  const left = 240 - w / 2;
  const top = 182 - h / 2;
  const focus = left + w * 0.46;
  let knurl = "";
  for (let i = 0; i < 26; i += 1) {
    const x = left + w * 0.2 + i * 3.4;
    knurl +=
      '<path class="line" d="M' + round(x) + " " + round(top + h * 0.22) + "v" + round(h * 0.56) + '" stroke-opacity="0.16" stroke-width="1"/>';
  }
  return (
    '<g class="line" fill="none" stroke-linecap="round">' +
    '<rect x="' + round(left) + '" y="' + round(top) + '" width="' + w + '" height="' + round(h) + '" rx="9" stroke-opacity="0.58" stroke-width="1.5"/>' +
    knurl +
    '<path d="M' + round(focus + 96) + " " + round(top) + "v" + round(h) + '" stroke-opacity="0.3"/>' +
    '<path d="M' + round(focus + 106) + " " + round(top) + "v" + round(h) + '" stroke-opacity="0.3"/>' +
    '<path d="M' + round(left + w * 0.2) + " " + round(top) + "v" + round(h) + '" stroke-opacity="0.26"/>' +
    '<ellipse cx="' + round(left + 3) + '" cy="182" rx="10" ry="' + round(h / 2) + '" stroke-opacity="0.52"/>' +
    '<ellipse cx="' + round(left + w - 6) + '" cy="182" rx="7" ry="' + round(h / 2 - 4) + '" stroke-opacity="0.32"/>' +
    '<path d="M' + round(left + w * 0.62) + " " + round(top - 13) + 'h34" stroke-opacity="0.26"/>' +
    '<path d="M' + round(left + w * 0.62) + " " + round(top - 19) + 'h34" stroke-opacity="0.16"/>' +
    "</g>" +
    '<ellipse class="accent" cx="' + round(left + 3) + '" cy="182" rx="5" ry="' + round(h / 2 - 12) + '" fill="none" stroke-opacity="0.45"/>' +
    '<circle class="accent" cx="' + round(left + 3) + '" cy="182" r="' + round(h / 2 + 10) + '" fill="none" stroke-opacity="0.22" stroke-dasharray="2 7"/>' +
    '<text class="text" x="' + round(focus + 52) + '" y="' + round(top + h + 24) + '" fill-opacity="0.38" font-family="' + MONO + '" font-size="8" letter-spacing="1.6" text-anchor="middle">FOCUS</text>'
  );
}

function glyphTripod(rnd) {
  const cx = 240;
  const headY = 120;
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="' + (cx - 26) + '" y="' + (headY - 22) + '" width="52" height="16" rx="5" stroke-opacity="0.36"/>' +
    '<rect x="' + (cx - 22) + '" y="' + headY + '" width="44" height="20" rx="5" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<circle cx="' + (cx - 34) + '" cy="' + (headY + 10) + '" r="6" stroke-opacity="0.42"/>' +
    '<path d="M' + cx + " " + (headY + 20) + 'v26" stroke-opacity="0.52"/>' +
    '<path d="M' + (cx - 4) + " " + (headY + 46) + "L" + (cx - 64) + ' 286" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<path d="M' + (cx + 4) + " " + (headY + 46) + "L" + (cx + 64) + ' 286" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<path d="M' + cx + " " + (headY + 46) + 'v216" stroke-opacity="0.52" stroke-width="1.5"/>' +
    '<path d="M' + (cx - 52) + ' 220h104" stroke-opacity="0.18" stroke-dasharray="3 6"/>' +
    '<path d="M' + (cx - 34) + ' 246h68" stroke-opacity="0.14" stroke-dasharray="3 6"/>' +
    '<circle cx="' + (cx - 64) + '" cy="286" r="4" stroke-opacity="0.46"/>' +
    '<circle cx="' + (cx + 64) + '" cy="286" r="4" stroke-opacity="0.46"/>' +
    '<circle cx="' + cx + '" cy="286" r="4" stroke-opacity="0.46"/>' +
    "</g>" +
    '<circle class="accent" cx="' + cx + '" cy="' + (headY + 10) + '" r="' + (58 + rnd() * 6) + '" fill="none" stroke-opacity="0.2" stroke-dasharray="2 8"/>'
  );
}

function glyphFlash(rnd) {
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="200" y="150" width="80" height="112" rx="13" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<path d="M200 190h80M200 236h80" stroke-opacity="0.24"/>' +
    '<rect x="196" y="106" width="88" height="46" rx="11" stroke-opacity="0.52"/>' +
    '<rect x="208" y="94" width="64" height="16" rx="6" stroke-opacity="0.4"/>' +
    '<circle class="accent" cx="240" cy="102" r="4.5" fill="none" stroke-opacity="0.6"/>' +
    '<circle cx="214" cy="129" r="3" stroke-opacity="0.32"/>' +
    '<path d="M218 262h44" stroke-opacity="0.32"/>' +
    '<path d="M228 262v14h24v-14" stroke-opacity="0.32"/>' +
    "</g>" +
    '<path class="accent" d="M296 112l24-14M302 132l28-4M296 152l24 6" fill="none" stroke-opacity="0.4"/>' +
    '<circle class="accent" cx="240" cy="148" r="' + (86 + rnd() * 8) + '" fill="none" stroke-opacity="0.18" stroke-dasharray="2 8"/>'
  );
}

function glyphFilter(rnd) {
  const cx = 240;
  const cy = 176;
  const r = 58;
  return (
    '<g class="line" fill="none" stroke-linecap="round">' +
    '<rect x="' + (cx - 74) + '" y="' + (cy - 74) + '" width="148" height="148" rx="9" stroke-opacity="0.52" stroke-width="1.5" transform="rotate(-6 ' + cx + " " + cy + ')"/>' +
    ringTicks(cx, cy, r + 12, 40, 6) +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-opacity="0.48" stroke-width="1.5"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 16) + '" stroke-opacity="0.24"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 34) + '" stroke-opacity="0.16"/>' +
    "</g>" +
    '<path class="accent" d="M' + (cx - r + 10) + " " + (cy - r + 26) + "a" + (r - 10) + " " + (r - 10) + " 0 0 1 " + (r * 0.9) + ' -14" fill="none" stroke-opacity="0.5"/>' +
    '<text class="text" x="' + cx + '" y="' + (cy + 4) + '" fill-opacity="0.38" font-family="' + MONO + '" font-size="13" letter-spacing="2" text-anchor="middle">ND</text>' +
    '<text class="accent-fill" x="' + cx + '" y="' + (cy + 20) + '" fill-opacity="0.5" font-family="' + MONO + '" font-size="8" letter-spacing="1.8" text-anchor="middle">1000</text>'
  );
}

function glyphAudio() {
  const y = 128;
  const h = 108;
  let grill = "";
  for (let i = 0; i < 4; i += 1) {
    grill +=
      '<circle class="text" cx="' + (206 + i * 10) + '" cy="' + (y + 22) + '" r="2.2" fill-opacity="0.28"/>';
  }
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="196" y="' + y + '" width="40" height="' + h + '" rx="12" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<rect x="250" y="' + (y + 14) + '" width="40" height="' + (h - 14) + '" rx="12" stroke-opacity="0.42"/>' +
    '<rect x="304" y="' + (y + 6) + '" width="40" height="' + (h - 6) + '" rx="12" stroke-opacity="0.42"/>' +
    grill +
    '<path d="M206 190h20" stroke-opacity="0.3"/>' +
    '<path d="M216 236v18M270 250v14M324 242v16" stroke-opacity="0.28"/>' +
    "</g>" +
    '<circle class="accent" cx="216" cy="' + (y + 74) + '" r="4" fill="none" stroke-opacity="0.6"/>' +
    '<circle cx="270" cy="' + (y + 52) + '" r="3" class="line" fill="none" stroke-opacity="0.34"/>' +
    '<circle cx="324" cy="' + (y + 44) + '" r="3" class="line" fill="none" stroke-opacity="0.34"/>' +
    '<path class="accent" d="M118 182c18-14 34 14 52 0s34 14 52 0" fill="none" stroke-opacity="0.3"/>'
  );
}

function glyphBag() {
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M182 158h116a10 10 0 0 1 10 10v76a14 14 0 0 1-14 14H186a14 14 0 0 1-14-14v-76a10 10 0 0 1 10-10Z" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<path d="M172 158c0-26 22-40 68-40s68 14 68 40" stroke-opacity="0.34"/>' +
    '<path d="M172 186h136" stroke-opacity="0.3"/>' +
    '<path d="M240 146v40" stroke-opacity="0.2" stroke-dasharray="3 5"/>' +
    '<path d="M188 204h22M270 204h22" stroke-opacity="0.22" stroke-dasharray="2 5"/>' +
    '<path d="M192 232h96" stroke-opacity="0.16" stroke-dasharray="2 6"/>' +
    "</g>" +
    '<rect class="accent" x="222" y="196" width="36" height="18" rx="4" fill="none" stroke-opacity="0.55"/>'
  );
}

function glyphObject() {
  return (
    '<g class="line" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="196" y="126" width="88" height="88" rx="14" stroke-opacity="0.58" stroke-width="1.5"/>' +
    '<rect x="212" y="142" width="56" height="56" rx="9" stroke-opacity="0.28"/>' +
    '<path d="M240 126v-12M240 226v12M196 170h-12M284 170h12" stroke-opacity="0.32"/>' +
    '<path d="M212 214a56 56 0 0 1 56-56" stroke-opacity="0.2"/>' +
    "</g>" +
    '<circle class="accent" cx="240" cy="170" r="13" fill="none" stroke-opacity="0.6"/>' +
    '<circle class="accent-fill" cx="240" cy="170" r="4" fill-opacity="0.55"/>' +
    '<rect class="line" x="252" y="234" width="46" height="12" rx="6" fill="none" stroke-opacity="0.26"/>'
  );
}

const GLYPHS = {
  camera: glyphCamera,
  lens: glyphLens,
  tripod: glyphTripod,
  flash: glyphFlash,
  filter: glyphFilter,
  audio: glyphAudio,
  bag: glyphBag,
  object: glyphObject,
};

/* ------------------------------------------------------------------ 对外接口 */

/**
 * @param {object} item  器材对象（见 src/data/gear.js）
 * @returns {string} 完整 SVG 字符串
 */
export function coverArt(item) {
  const id = "art" + (uid += 1);
  const rnd = makeRng(hash(item.id || "seed"));
  const glyph = (GLYPHS[item.kind] || glyphObject)(rnd, item.accent);
  const cat = String(item.cat || "gear").toUpperCase();

  return (
    '<svg class="cover" viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="presentation" focusable="false">' +
    "<defs>" +
    '<pattern id="' + id + '-p" width="30" height="30" patternUnits="userSpaceOnUse">' +
    '<path class="grid" d="M30 0H0V30" fill="none" stroke-opacity="0.5" stroke-width="1"/>' +
    "</pattern>" +
    '<radialGradient id="' + id + '-m" cx="50%" cy="46%" r="58%">' +
    '<stop offset="0" stop-color="#ffffff"/>' +
    '<stop offset="1" stop-color="#000000"/>' +
    "</radialGradient>" +
    '<mask id="' + id + '-mk"><rect width="480" height="360" fill="url(#' + id + '-m)"/></mask>' +
    "</defs>" +
    '<rect width="480" height="360" fill="url(#' + id + '-p)" mask="url(#' + id + '-mk)"/>' +
    /* 四角标记 */
    '<g class="line" fill="none" stroke-opacity="0.2" stroke-width="1">' +
    '<path d="M26 38V26h12M442 26h12v12M454 322v12h-12M38 334H26v-12"/>' +
    "</g>" +
    /* 左侧标尺 */
    '<g class="line" stroke-opacity="0.16" stroke-width="1">' +
    '<path d="M20 96h6M20 112h10M20 128h6M20 144h6M20 160h10M20 176h6M20 192h6M20 208h10M20 224h6M20 240h6M20 256h10M20 272h6"/>' +
    "</g>" +
    /* 主图形：整体放大一点点，让画面更饱满 */
    '<g transform="translate(240 182) scale(1.08) translate(-240 -182)">' + glyph + "</g>" +
    /* 底部注记 */
    '<text class="text" x="34" y="332" fill-opacity="0.34" font-family="' + MONO + '" font-size="7.5" letter-spacing="1.7">' + escapeText(cat) + " — PRIMITIVE STUDY</text>" +
    '<text class="accent-fill" x="446" y="332" text-anchor="end" fill-opacity="0.4" font-family="' + MONO + '" font-size="7.5" letter-spacing="1.7">' + escapeText(String(item.year || "")) + "</text>" +
    "</svg>"
  );
}

function escapeText(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
