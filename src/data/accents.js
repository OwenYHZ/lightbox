/**
 * 主题色（accent）—— 主站与器材编辑器共用一份。
 *
 * 每个色只定义色相 h 与饱和度 s，明度由各主题的 token 公式推导，
 * 这样深色/浅色下都能保证对比度，也不会出现"某个色在浅色下发灰"。
 */
export const ACCENT_KEY = "lightbox.accent";

export const ACCENTS = [
  { id: "amber", label: "琥珀", h: 38, s: 46 },
  { id: "copper", label: "赤铜", h: 22, s: 52 },
  { id: "wine", label: "酒红", h: 356, s: 52 },
  { id: "rose", label: "玫瑰", h: 332, s: 47 },
  { id: "plum", label: "绛紫", h: 300, s: 34 },
  { id: "indigo", label: "靛青", h: 252, s: 40 },
  { id: "slate", label: "雾蓝", h: 206, s: 34 },
  { id: "celadon", label: "青瓷", h: 178, s: 30 },
  { id: "pine", label: "松绿", h: 154, s: 34 },
  { id: "moss", label: "苔绿", h: 100, s: 26 },
  { id: "ochre", label: "赭黄", h: 55, s: 50 },
  { id: "graphite", label: "石墨", h: 226, s: 5 },
];

export const DEFAULT_ACCENT = "amber";

export function getAccent(id) {
  return ACCENTS.find((a) => a.id === id) || ACCENTS[0];
}

export function normalizeAccent(id) {
  return ACCENTS.some((a) => a.id === id) ? id : DEFAULT_ACCENT;
}

/** 色板里展示用的颜色（在深浅两种底上都看得清） */
export function swatchColor(accent, lightness = 62) {
  return "hsl(" + accent.h + " " + accent.s + "% " + lightness + "%)";
}

/**
 * 应用主题色。
 * @param {string} id
 * @param {{persist?: boolean, document?: Document}} options
 */
export function applyAccent(id, options = {}) {
  const { persist = true, doc = document } = options;
  const next = normalizeAccent(id);
  doc.documentElement.setAttribute("data-accent", next);
  if (persist) {
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch (error) {
      /* 隐私模式下忽略 */
    }
  }
  return next;
}

/** 首屏在样式生效前调用，避免颜色闪一下 */
export function bootAccent(doc = document) {
  let saved = DEFAULT_ACCENT;
  try {
    saved = normalizeAccent(localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT);
  } catch (error) {}
  doc.documentElement.setAttribute("data-accent", saved);
  return saved;
}