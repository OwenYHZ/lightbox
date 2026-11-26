/* ==========================================================================
   Lightbox · 交互主控
   主题 · 多维筛选 · 卡片渲染 · 详情浮层 · 路由
   ========================================================================== */

import "./styles/tokens.css";
import "./styles/accents.css";
import "./styles/base.css";
import "./styles/cards.css";
import "./styles/detail.css";

import { GEAR, CATEGORIES, CATEGORY_LABEL, DIMENSIONS, STATUS_META } from "./data/gear.js";
import { coverArt } from "./lib/art.js";
import { ACCENTS, applyAccent, bootAccent, getAccent, swatchColor } from "./data/accents.js";


/* ------------------------------------------------------------------ 工具 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "lightbox.theme";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/** 把 Tab 焦点限制在某个容器内 */
function trapFocus(container, event) {
  if (!container) return;
  const nodes = $(
    'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
    container
  ).filter((node) => node.offsetParent !== null);
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/* 加载动画至少露多久：预览出得快时也让封面描边演完，而不是闪一下 */
const STAGE_LOADER_MIN_MS = 820;
/* 减弱动效下没有描边动画，但静态封面也得停一下，否则等于看不见 */
const STAGE_LOADER_MIN_MS_REDUCED = 400;

const ICON_CUBE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 20 7v10l-8 4.2L4 17V7Z"/><path d="M4 7l8 4.2L20 7M12 11.2V21"/></svg>';
const ICON_ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M9 6h9v9"/></svg>';
const ICON_X =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const INDEX_BY_ID = new Map(GEAR.map((item, i) => [item.id, i]));
const EN_BY_CAT = new Map(CATEGORIES.map((c) => [c.id, c.en]));

/* ------------------------------------------------------------------ 状态 */

const emptyFacets = () => {
  const out = {};
  DIMENSIONS.forEach((d) => {
    out[d.id] = new Set();
  });
  return out;
};

const state = {
  cat: "all",
  query: "",
  facets: emptyFacets(),
  openId: null,
  autoRotate: !prefersReduced,
  themeMode: document.documentElement.getAttribute("data-theme-mode") || "system",
  accent: document.documentElement.getAttribute("data-accent") || "amber",
  theme: document.documentElement.getAttribute("data-theme") || "dark",
  filtersOpen: false,
};

/* ------------------------------------------------------------------ 元素 */

const el = {
  topbar: $("#topbar"),
  toolbar: $("#toolbar"),
  topbarMeta: $("#topbarMeta"),
  stats: $("#stats"),
  chips: $("#chips"),
  grid: $("#grid"),
  count: $("#count"),
  empty: $("#empty"),
  emptyReset: $("#emptyReset"),
  footStat: $("#footStat"),
  search: $("#search"),
  searchInput: $("#searchInput"),
  searchClear: $("#searchClear"),
  searchToggle: $("#searchToggle"),
  filterBtn: $("#filterBtn"),
  filterCount: $("#filterCount"),
  filters: $("#filters"),
  filtersBody: $("#filtersBody"),
  filtersReset: $("#filtersReset"),
  filtersDone: $("#filtersDone"),
  filtersCount: $("#filtersCount"),
  selbar: $("#selbar"),
  selChips: $("#selChips"),
  clearFilters: $("#clearFilters"),
  themeBtn: $("#themeBtn"),
  themeMenu: $("#themeMenu"),
  accentName: $("#accentName"),
  swatches: $("#swatches"),
  themeColor: $("#themeColor"),
  detail: $("#detail"),
  panel: $("#detailPanel"),
  close: $("#detailClose"),
  stageMount: $("#stageMount"),
  stageLoader: $("#stageLoader"),
  stageLoaderArt: $("#stageLoaderArt"),
  stageLoaderText: $("#stageLoaderText"),
  stageFallback: $("#stageFallback"),
  btnRotate: $("#btnRotate"),
  btnReset: $("#btnReset"),
  detailEyebrow: $("#detailEyebrow"),
  detailTitle: $("#detailTitle"),
  detailStatus: $("#detailStatus"),
  detailNote: $("#detailNote"),
  detailSpecs: $("#detailSpecs"),
  detailTags: $("#detailTags"),
  detailMeta: $("#detailMeta"),
  stageCredit: $("#stageCredit"),
  app: $("#app"),
};

let lastFocused = null;
let stage = null;
let stagePromise = null;
let stageLoaderShownAt = 0;
let stageLoaderTimer = 0;
let stageLoaderHideTimer = 0;
let stageLoaderFailSafe = 0;
let stageLoaderCycle = 0;
const baseTitle = document.title;

/* ------------------------------------------------------------------ 主题 */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function resolveTheme(mode) {
  return mode === "system" ? (darkQuery.matches ? "dark" : "light") : mode;
}

function syncThemeMenu() {
  $$(".theme__mode", el.themeMenu).forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.mode === state.themeMode));
  });
}

/**
 * 浏览器 UI 的 theme-color 跟着 accent 推导出来的底色走，
 * 这样移动端状态栏也属于同一套配色（不再是固定的米黄 / 纯黑）。
 */
/** favicon 也跟着 accent 走（标签页里也是同一套色） */
function syncFavicon() {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) return;
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue("--accent").trim();
  const bg = cs.getPropertyValue("--ink-1").trim();
  if (!accent || !bg) return;
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
    "<rect width='24' height='24' rx='6' fill='" + bg + "'/>" +
    "<circle cx='12' cy='12' r='5.4' fill='none' stroke='" + accent + "' stroke-width='1.2'/>" +
    "<circle cx='12' cy='12' r='1.6' fill='" + accent + "'/></svg>";
  link.setAttribute("href", "data:image/svg+xml," + encodeURIComponent(svg));
}

function syncThemeColor() {
  if (!el.themeColor) return;
  /* 用一个临时元素把 token 解析成真正的 rgb()，meta[theme-color] 才百分百认得 */
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:8px;height:8px";
  probe.style.backgroundColor = "var(--ink-1)";
  document.body.appendChild(probe);
  const ink = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (ink && ink !== "rgba(0, 0, 0, 0)") el.themeColor.setAttribute("content", ink);
}

function applyTheme(mode, { persist = true, animate = true } = {}) {
  const theme = resolveTheme(mode);
  const rootEl = document.documentElement;

  if (animate && !prefersReduced) {
    rootEl.classList.add("is-theme-switching");
    window.setTimeout(() => rootEl.classList.remove("is-theme-switching"), 460);
  }

  rootEl.setAttribute("data-theme", theme);
  rootEl.setAttribute("data-theme-mode", mode);
  syncThemeColor();
  syncFavicon();

  state.themeMode = mode;
  state.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      /* 隐私模式下忽略 */
    }
  }
  syncThemeMenu();
  if (stage && typeof stage.setTheme === "function") stage.setTheme(theme);
}

function renderSwatches() {
  el.swatches.innerHTML = ACCENTS.map(
    (accent) =>
      '<button class="swatch" type="button" role="radio" aria-checked="false" data-accent-id="' +
      accent.id +
      '" title="' +
      accent.label +
      '" aria-label="主题色：' +
      accent.label +
      '"><span class="swatch__dot" style="background:' +
      swatchColor(accent) +
      '"></span></button>'
  ).join("");
}

function syncAccentUI() {
  const accent = getAccent(state.accent);
  if (el.accentName) el.accentName.textContent = accent.label;
  $$(".swatch", el.swatches).forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.accentId === state.accent));
  });
}

function setAccent(id) {
  state.accent = applyAccent(id);
  syncAccentUI();
  syncThemeColor();
  syncFavicon();
}

function toggleThemeMenu(open) {
  const next = typeof open === "boolean" ? open : el.themeMenu.hidden;
  el.themeMenu.hidden = !next;
  el.themeBtn.setAttribute("aria-expanded", String(next));
  if (next) {
    const current = $('.theme__mode[aria-checked="true"]', el.themeMenu);
    if (current) current.focus();
  }
}

/* ------------------------------------------------------------------ 筛选 */

/** 某维度某选项在当前其他条件下会命中多少件 */
function mountsOf(item) {
  const list = [item.mount];
  if (item.mountTo && item.mountTo !== item.mount) list.push(item.mountTo);
  return list.filter(Boolean);
}

/** 某个维度某个选项是否命中（转接环的卡口要两端都算） */
function optionMatches(item, dimId, optId) {
  if (dimId === "mount") return mountsOf(item).includes(optId);
  return dimIdSafe(item, dimId) === optId;
}

function countFor(dimId, optId) {
  return GEAR.filter((item) => matchItem(item, dimId) && optionMatches(item, dimId, optId)).length;
}

/** 维度取值的显示名 */
function optionLabel(dimId, value) {
  const dim = DIMENSIONS.find((d) => d.id === dimId);
  const opt = dim && dim.options.find((o) => o.id === value);
  return (opt && opt.label) || value || "";
}

/**
 * @param {object} item
 * @param {string|null} exceptDim 计算 facet 计数时，忽略该维度自身的选择
 */
function matchItem(item, exceptDim = null) {
  if (state.cat !== "all" && item.cat !== state.cat) return false;

  const query = state.query.trim().toLowerCase();
  if (query) {
    const haystack = [item.name, item.maker, item.summary, item.note]
      .concat(item.tags || [])
      .concat((item.specs || []).flat())
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  for (const dim of DIMENSIONS) {
    if (dim.id === exceptDim) continue;
    const selected = state.facets[dim.id];
    if (!selected.size) continue;
    /* 转接环同时属于两个卡口，任一端被选中都算命中 */
    if (dim.id === "mount") {
      if (!mountsOf(item).some((mount) => selected.has(mount))) return false;
      continue;
    }
    if (!selected.has(dimIdSafe(item, dim.id))) return false;
  }
  return true;
}

/* item 上缺失的维度（例如镜头的 form 是 null）当成空值处理 */
function dimIdSafe(item, dimId) {
  return item[dimId] ?? null;
}

function activeFacetCount() {
  return DIMENSIONS.reduce((sum, dim) => sum + state.facets[dim.id].size, 0);
}

function buildFiltersPanel() {
  el.filtersBody.innerHTML = DIMENSIONS.map(
    (dim) =>
      '<div class="facet" data-dim="' +
      dim.id +
      '">' +
      '<p class="facet__label">' +
      dim.label +
      (dim.hint ? '<span class="facet__hint">' + dim.hint + "</span>" : "") +
      '<br /><span style="opacity:.55">' +
      dim.en +
      "</span></p>" +
      '<div class="facet__opts">' +
      dim.options
        .map(
          (opt) =>
            '<button class="fopt" type="button" data-dim="' +
            dim.id +
            '" data-opt="' +
            opt.id +
            '" aria-pressed="false">' +
            escapeHtml(opt.label) +
            '<span class="fopt__n">0</span></button>'
        )
        .join("") +
      "</div></div>"
  ).join("");
}

function updateFacetUI() {
  DIMENSIONS.forEach((dim) => {
    dim.options.forEach((opt) => {
      const btn = $('.fopt[data-dim="' + dim.id + '"][data-opt="' + opt.id + '"]', el.filtersBody);
      if (!btn) return;
      const pressed = state.facets[dim.id].has(opt.id);
      const count = countFor(dim.id, opt.id);
      btn.setAttribute("aria-pressed", String(pressed));
      btn.disabled = !pressed && count === 0;
      const n = $(".fopt__n", btn);
      if (n) n.textContent = String(count);
    });
  });
}

function syncFilterButton() {
  const active = activeFacetCount();
  el.filterCount.hidden = active === 0;
  el.filterCount.textContent = String(active);
  const results = GEAR.filter((item) => matchItem(item)).length;
  el.filtersCount.textContent = String(results);
}

function renderSelChips() {
  const entries = [];
  DIMENSIONS.forEach((dim) => {
    state.facets[dim.id].forEach((id) => {
      const opt = dim.options.find((o) => o.id === id);
      if (opt) entries.push({ dim, id, opt });
    });
  });

  el.selbar.hidden = entries.length === 0;
  el.selChips.innerHTML = entries
    .map(
      (entry) =>
        '<button class="selchip" type="button" data-dim="' +
        entry.dim.id +
        '" data-opt="' +
        entry.id +
        '" aria-label="移除筛选：' +
        escapeHtml(entry.dim.label + " " + entry.opt.label) +
        '">' +
        escapeHtml(entry.dim.label) +
        " · " +
        escapeHtml(entry.opt.label) +
        ICON_X +
        "</button>"
    )
    .join("");
}

function toggleFacet(dimId, optId) {
  const set = state.facets[dimId];
  if (!set) return;
  if (set.has(optId)) set.delete(optId);
  else set.add(optId);
  updateFacetUI();
  renderSelChips();
  renderGrid();
  syncFilterButton();
}

function clearAllFilters({ keepQuery = false } = {}) {
  state.cat = "all";
  state.facets = emptyFacets();
  if (!keepQuery) {
    state.query = "";
    el.searchInput.value = "";
    el.searchClear.hidden = true;
  }
  $$(".chip", el.chips).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === "all")));
  updateFacetUI();
  renderSelChips();
  renderGrid();
  syncFilterButton();
}

function openFilters() {
  if (state.filtersOpen) return;
  state.filtersOpen = true;
  document.body.classList.add("is-locked");
  updateFacetUI();
  syncFilterButton();
  el.filters.hidden = false;
  el.filterBtn.setAttribute("aria-expanded", "true");
  const first = $(".fopt:not(:disabled)", el.filtersBody);
  if (first) first.focus({ preventScroll: true });
}

function closeFilters({ restoreFocus = true } = {}) {
  if (!state.filtersOpen) return;
  state.filtersOpen = false;
  el.filters.hidden = true;
  document.body.classList.remove("is-locked");
  el.filterBtn.setAttribute("aria-expanded", "false");
  if (restoreFocus) el.filterBtn.focus({ preventScroll: true });
}

/* ------------------------------------------------------------------ 首屏 */

function renderHero() {
  const body = GEAR.filter((g) => g.cat === "body").length;
  const lens = GEAR.filter((g) => g.cat === "lens").length;
  const acc = GEAR.filter((g) => g.cat === "accessory").length;

  const rows = [
    [body, "机身"],
    [lens, "镜头"],
    [acc, "配件"],
    [GEAR.length, "全部"],
  ];
  el.stats.innerHTML = rows
    .map(
      (row, i) =>
        '<li class="stat"><span class="stat__num">' +
        String(row[0]).padStart(2, "0") +
        '</span><span class="stat__label">' +
        row[1] +
        "</span></li>"
    )
    .join("");

  el.topbarMeta.textContent = GEAR.length + " ITEMS / " + new Date().getFullYear();
  el.footStat.textContent = GEAR.length + " 件器材 · " + DIMENSIONS.length + " 个筛选维度";
}

function renderChips() {
  const all = [{ id: "all", label: "全部", count: GEAR.length }].concat(
    CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
      id: c.id,
      label: c.label,
      count: GEAR.filter((g) => g.cat === c.id).length,
    }))
  );

  el.chips.innerHTML = all
    .map(
      (c) =>
        '<button class="chip" type="button" data-cat="' +
        c.id +
        '" aria-pressed="' +
        (state.cat === c.id) +
        '">' +
        c.label +
        '<span class="chip__count">' +
        String(c.count).padStart(2, "0") +
        "</span></button>"
    )
    .join("");
}

/* ------------------------------------------------------------------ 卡片 */

function cardMarkup(item, position) {
  const no = String(INDEX_BY_ID.get(item.id) + 1).padStart(2, "0");
  const label = CATEGORY_LABEL[item.cat] || "";
  const en = EN_BY_CAT.get(item.cat) || "";
  const status = STATUS_META[item.status] || { short: "", label: "" };
  const tags = (item.tags || [])
    .slice(0, 2)
    .map((t) => '<span class="tag">' + escapeHtml(t) + "</span>")
    .join("");

  return (
    '<article class="card" style="--i:' +
    position +
    '" data-id="' +
    item.id +
    '" data-status="' +
    (item.status || "") +
    '">' +
    '<div class="card__surface">' +
    '<div class="card__media">' +
    '<span class="card__index mono">NO.' +
    no +
    "</span>" +
    '<span class="card__status" data-status="' +
    (item.status || "") +
    '"><i></i>' +
    escapeHtml(status.short) +
    "</span>" +
    '<span class="card__badge">' +
    ICON_CUBE +
    "3D</span>" +
    '<div class="card__art">' +
    coverArt(item) +
    "</div>" +
    '<span class="card__sheen" aria-hidden="true"></span>' +
    "</div>" +
    '<div class="card__body">' +
    '<p class="card__eyebrow"><span>' +
    label +
    " / " +
    en +
    "</span><span>" +
    item.year +
    "</span></p>" +
    '<h3 class="card__title">' +
    escapeHtml(item.name) +
    "</h3>" +
    '<p class="card__summary">' +
    escapeHtml(item.summary) +
    "</p>" +
    '<div class="card__foot">' +
    '<div class="card__tags">' +
    tags +
    "</div>" +
    '<span class="card__cue">查看' +
    ICON_ARROW +
    "</span>" +
    "</div></div></div>" +
    '<button class="card__hit" type="button" data-open="' +
    item.id +
    '" aria-label="查看 ' +
    escapeHtml(item.name) +
    ' 的三维详情" aria-haspopup="dialog"></button>' +
    "</article>"
  );
}

function renderGrid() {
  const list = GEAR.filter((item) => matchItem(item));

  el.grid.innerHTML = list.map((item, i) => cardMarkup(item, i)).join("");
  el.count.textContent =
    String(list.length).padStart(2, "0") + " / " + String(GEAR.length).padStart(2, "0");
  el.empty.hidden = list.length !== 0;
  el.grid.hidden = list.length === 0;
  el.filtersCount.textContent = String(list.length);

  if (list.length) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        $$(".card", el.grid).forEach((card) => card.classList.add("is-in"));
      });
    });
  }
}

/* ------------------------------------------------------------------ 详情 */

/**
 * 三维舞台的加载动画：把该器材的封面 SVG 塞进 loader，
 * 逐条量出路径长度交给 CSS 做 stroke-dashoffset 描边动画。
 * 每次打开 / 切换器材都重新注入（等于天然重置动画）。
 */
function mountStageLoaderArt(item) {
  const host = el.stageLoaderArt;
  if (!host) return 0;

  const cycle = (stageLoaderCycle += 1);
  cancelStageLoaderWatch();

  /* 换器材时"立刻"回到可见状态：直接杀掉过渡，不然会顺着淡出倒着淡回来 */
  if (el.stageLoader) {
    window.clearTimeout(stageLoaderHideTimer);
    window.clearTimeout(stageLoaderFailSafe);
    el.stageLoader.hidden = false;
    el.stageLoader.style.setProperty("transition", "none", "important");
    el.stageLoader.classList.remove("is-done");
    void el.stageLoader.offsetWidth;
    requestAnimationFrame(() => {
      if (el.stageLoader) el.stageLoader.style.removeProperty("transition");
    });
    /* 兜底：只在真的失败/卡住时（viewer chunk 首次约 1MB，冷启动可达十几秒）
       才允许挡到 24s；正常路径由 markStageLoaderReady() 收起，避免"动画完就空白" */
    stageLoaderFailSafe = window.setTimeout(() => {
      if (cycle !== stageLoaderCycle || !el.stageLoader) return;
      if (el.stageLoader.classList.contains("is-done")) return;
      el.stageLoader.classList.add("is-done");
      scheduleStageLoaderHide();
    }, 24000);
  }

  stageLoaderShownAt = performance.now();
  host.innerHTML = coverArt(item);
  if (prefersReduced) return cycle;

  let shapes = [];
  try {
    shapes = Array.from(
      host.querySelectorAll(".cover .line, .cover .line > *, .cover .accent, .cover .accent > *")
    ).filter((node) => typeof node.getTotalLength === "function");
  } catch (error) {
    return cycle;
  }
  /* 元素多的时候把错开总时长压在 0.42s 内，避免密密麻麻的刻度把动画拖成两秒 */
  const step = Math.min(18, 420 / Math.max(shapes.length, 1));
  shapes.forEach((node, i) => {
    let len = 0;
    try {
      len = node.getTotalLength();
    } catch (error) {
      len = 0;
    }
    if (!Number.isFinite(len) || len <= 0) return;
    node.style.setProperty("--len", len.toFixed(1));
    node.style.setProperty("--d", Math.round(i * step) + "ms");
  });
  return cycle;
}

/** 场景就绪（viewer 的 onReady）后收尾：动画没演完就等一会儿，演完了立刻淡出交给 canvas */
function markStageLoaderReady() {
  if (!el.stageLoader) return;
  window.clearTimeout(stageLoaderFailSafe);
  const cycle = stageLoaderCycle;
  const minVisible = prefersReduced ? STAGE_LOADER_MIN_MS_REDUCED : STAGE_LOADER_MIN_MS;
  const wait = Math.max(0, minVisible - (performance.now() - stageLoaderShownAt));
  window.clearTimeout(stageLoaderTimer);
  const finish = () => {
    if (cycle !== stageLoaderCycle || !el.stageLoader) return;
    el.stageLoader.classList.add("is-done");
    scheduleStageLoaderHide();
  };
  if (wait <= 0) {
    finish();
    return;
  }
  stageLoaderTimer = window.setTimeout(finish, wait);
}

/** 淡出（0.32s）结束后把浮层真正移出布局：opacity:0 + hidden，双保险 */
function scheduleStageLoaderHide() {
  window.clearTimeout(stageLoaderHideTimer);
  stageLoaderHideTimer = window.setTimeout(() => {
    if (el.stageLoader) el.stageLoader.hidden = true;
  }, 360);
}

function cancelStageLoaderWatch() {
  window.clearTimeout(stageLoaderTimer);
  window.clearTimeout(stageLoaderHideTimer);
  window.clearTimeout(stageLoaderFailSafe);
  stageLoaderTimer = 0;
  stageLoaderHideTimer = 0;
  stageLoaderFailSafe = 0;
}

function fillDetail(item) {
  const no = String(INDEX_BY_ID.get(item.id) + 1).padStart(2, "0");
  const status = STATUS_META[item.status] || { label: item.status || "" };
  el.detailEyebrow.textContent =
    (CATEGORY_LABEL[item.cat] || "") + " / " + (EN_BY_CAT.get(item.cat) || "") + " · NO." + no;
  el.detailTitle.textContent = item.name;
  el.detailStatus.innerHTML =
    '<span class="status-badge" data-status="' +
    (item.status || "") +
    '"><i></i>' +
    escapeHtml(status.label) +
    "</span>";
  el.detailNote.textContent = item.note || "";
  el.detailSpecs.innerHTML = (item.specs || [])
    .map(
      (spec) =>
        '<div class="spec"><dt>' +
        escapeHtml(spec[0]) +
        "</dt><dd>" +
        escapeHtml(spec[1]) +
        "</dd></div>"
    )
    .join("");
  el.detailTags.innerHTML = (item.tags || [])
    .map((tag) => '<span class="tag">' + escapeHtml(tag) + "</span>")
    .join("");
  const metaBits = [item.maker, item.year];
  if (item.cat === "body" && item.medium) metaBits.push(item.medium === "film" ? "FILM" : "DIGITAL");
  if (item.mountTo) metaBits.push(optionLabel("mount", item.mount) + " → " + optionLabel("mount", item.mountTo));
  metaBits.push(String(item.kind).toUpperCase() + " MODEL");
  el.detailMeta.textContent = metaBits.join(" · ");
  if (el.stageCredit) {
    el.stageCredit.textContent = item.glb ? "BLENDER · GLB MODEL" : "THREE.JS · PRIMITIVE MODEL";
  }
  if (el.stageLoaderText) {
    el.stageLoaderText.textContent = item.glb ? "正在载入几何模型…" : "正在搭建三维场景…";
  }
  el.stageFallback.innerHTML = "";
}

function syncRotateButton() {
  el.btnRotate.setAttribute("aria-pressed", String(state.autoRotate));
}

function showStageFallback(message) {
  el.stageFallback.hidden = false;
  el.stageFallback.textContent =
    message || "这台设备暂时没有可用的 WebGL，三维预览没能启动。";
  el.stageLoader.classList.add("is-done");
}

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch (error) {
    return false;
  }
}


/* 三维 chunk 约 1MB：首屏空闲后先把它拉下来，点开时基本命中缓存 */
let stageWarmed = false;
function warmStageChunk() {
  if (stageWarmed) return;
  stageWarmed = true;
  import("./lib/three/viewer.js").catch(() => {});
}

async function ensureStage() {
  if (stage) return stage;
  if (!webglAvailable()) {
    showStageFallback();
    return null;
  }
  if (!stagePromise) {
    stagePromise = import("./lib/three/viewer.js")
      .then(({ StageViewer }) => {
        stage = new StageViewer(el.stageMount, {
          theme: state.theme,
          onReady: () => markStageLoaderReady(),
        });
        return stage;
      })
      .catch((error) => {
        console.error("[lightbox] 三维场景加载失败", error);
        showStageFallback();
        return null;
      });
  }
  return stagePromise;
}

async function openDetail(item, { push = true } = {}) {
  if (!item) return;
  if (state.openId === item.id) return;
  closeFilters({ restoreFocus: false });
  toggleThemeMenu(false);

  state.openId = item.id;
  lastFocused = document.activeElement;
  fillDetail(item);

  el.detail.hidden = false;
  document.body.classList.add("is-locked");
  el.app.inert = true;
  if (el.topbar) el.topbar.inert = true;

  await nextFrame();
  el.detail.classList.add("is-open");
  el.close.focus({ preventScroll: true });

  /* 面板开始出现时同时启动封面描边动画，正好覆盖三维场景的构建时间 */
  mountStageLoaderArt(item);

  const viewer = await ensureStage();
  if (viewer && state.openId === item.id) {
    await nextFrame();
    if (typeof viewer.setTheme === "function") viewer.setTheme(state.theme);
    viewer.show(
      item.kind,
      Object.assign({}, item.model, {
        accent: item.accent || swatchColor(getAccent(state.accent), 66),
        glb: item.glb,
      })
    );
    viewer.setAutoRotate(state.autoRotate);
    syncRotateButton();
  }

  if (push) pushHash(item.id);
  document.title = item.name + " · Lightbox";
}

function closeDetail({ fromRoute = false } = {}) {
  if (!state.openId) return;
  state.openId = null;

  el.detail.classList.remove("is-open");
  document.body.classList.remove("is-locked");
  el.app.inert = false;
  if (el.topbar) el.topbar.inert = false;
  document.title = baseTitle;

  if (stage) stage.stop();

  cancelStageLoaderWatch();
  stageLoaderShownAt = 0;

  const hide = () => {
    if (!state.openId) {
      el.detail.hidden = true;
      el.stageLoader.hidden = false;
      el.stageLoader.classList.remove("is-done");
      el.stageMount.querySelectorAll("canvas").forEach((c) => c.classList.remove("is-ready"));
    }
  };
  window.setTimeout(hide, prefersReduced ? 0 : 460);

  if (lastFocused && typeof lastFocused.focus === "function") {
    lastFocused.focus({ preventScroll: true });
  }
  if (!fromRoute) clearHash();
}

/* ------------------------------------------------------------------ 路由 */

function pushHash(id) {
  const hash = "#/" + id;
  if (location.hash !== hash) history.pushState({ lightbox: true }, "", hash);
}

function clearHash() {
  if (!location.hash) return;
  if (history.state && history.state.lightbox) history.back();
  else history.replaceState(null, "", location.pathname + location.search);
}

function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (id) {
    const item = GEAR.find((g) => g.id === id);
    if (item) {
      if (state.openId !== id) openDetail(item, { push: false });
      return;
    }
  }
  if (state.openId) closeDetail({ fromRoute: true });
}

/* ------------------------------------------------------------------ 事件 */

function bindEvents() {
  const onScroll = () => {
    el.topbar.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 品牌：回到顶部 */
  const brand = $(".brand");
  brand.addEventListener("click", (event) => {
    event.preventDefault();
    if (state.openId) closeDetail();
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    if (history.state && history.state.lightbox) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  });

  /* 类别 */
  el.chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    if (chip.dataset.cat === state.cat) return;
    state.cat = chip.dataset.cat;
    $$(".chip", el.chips).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    renderGrid();
    syncFilterButton();
  });

  /* 搜索 */
  const applyQuery = debounce(() => {
    renderGrid();
    syncFilterButton();
  }, 110);
  el.searchInput.addEventListener("input", () => {
    state.query = el.searchInput.value;
    el.searchClear.hidden = !state.query;
    applyQuery();
  });
  el.searchClear.addEventListener("click", () => {
    el.searchInput.value = "";
    state.query = "";
    el.searchClear.hidden = true;
    el.searchInput.focus();
    renderGrid();
    syncFilterButton();
    if (window.innerWidth <= 900) {
      el.search.classList.remove("is-open");
      el.searchToggle.setAttribute("aria-expanded", "false");
    }
  });
  el.searchToggle.addEventListener("click", () => {
    const open = el.search.classList.toggle("is-open");
    el.searchToggle.setAttribute("aria-expanded", String(open));
    if (open) el.searchInput.focus();
  });

  /* 精确筛选面板 */
  el.filterBtn.addEventListener("click", () => {
    if (state.filtersOpen) closeFilters();
    else openFilters();
  });
  el.filters.addEventListener("click", (event) => {
    if (event.target.closest("[data-filters-close]")) {
      closeFilters();
      return;
    }
    const opt = event.target.closest(".fopt");
    if (opt) toggleFacet(opt.dataset.dim, opt.dataset.opt);
  });
  el.filtersReset.addEventListener("click", () => {
    state.facets = emptyFacets();
    updateFacetUI();
    renderSelChips();
    renderGrid();
    syncFilterButton();
  });
  el.filtersDone.addEventListener("click", () => closeFilters());

  /* 已选条件 */
  el.selChips.addEventListener("click", (event) => {
    const chip = event.target.closest(".selchip");
    if (!chip) return;
    toggleFacet(chip.dataset.dim, chip.dataset.opt);
  });
  el.clearFilters.addEventListener("click", () => clearAllFilters());
  el.emptyReset.addEventListener("click", () => clearAllFilters());

  /* 卡片点击 / 悬停光斑 */
  el.grid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open]");
    if (!trigger) return;
    const item = GEAR.find((g) => g.id === trigger.dataset.open);
    if (item) openDetail(item);
  });

  let pointerFrame = 0;
  el.grid.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const card = event.target.closest(".card");
    if (!card || pointerFrame) return;
    const x = event.clientX;
    const y = event.clientY;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", x - rect.left + "px");
      card.style.setProperty("--my", y - rect.top + "px");
    });
  });

  /* 主题 */
  el.themeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleThemeMenu();
  });
  el.themeMenu.addEventListener("click", (event) => {
    const opt = event.target.closest(".theme__mode");
    if (!opt) return;
    applyTheme(opt.dataset.mode);
  });
  el.swatches.addEventListener("click", (event) => {
    const swatch = event.target.closest(".swatch");
    if (!swatch) return;
    setAccent(swatch.dataset.accentId);
  });
  document.addEventListener("click", (event) => {
    if (!el.themeMenu.hidden && !event.target.closest(".theme")) toggleThemeMenu(false);
  });
  darkQuery.addEventListener("change", () => {
    if (state.themeMode === "system") applyTheme("system", { persist: false });
  });

  /* 详情 */
  el.detail.addEventListener("click", (event) => {
    if (event.target.closest("[data-close]")) closeDetail();
  });
  el.close.addEventListener("click", () => closeDetail());
  el.btnRotate.addEventListener("click", () => {
    state.autoRotate = !state.autoRotate;
    if (stage) stage.setAutoRotate(state.autoRotate);
    syncRotateButton();
  });
  el.btnReset.addEventListener("click", () => stage && stage.reset());

  /* 键盘 */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!el.themeMenu.hidden) {
        toggleThemeMenu(false);
        el.themeBtn.focus();
        return;
      }
      if (state.filtersOpen) {
        closeFilters();
        return;
      }
      if (el.search.classList.contains("is-open")) {
        el.search.classList.remove("is-open");
        el.searchToggle.setAttribute("aria-expanded", "false");
        return;
      }
      if (state.openId) {
        event.preventDefault();
        closeDetail();
      }
      return;
    }

    if (event.key !== "Tab") return;
    if (state.filtersOpen) {
      trapFocus($(".filters__panel", el.filters), event);
      return;
    }
    if (state.openId) trapFocus(el.panel, event);
  });

  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);

  document.addEventListener("visibilitychange", () => {
    if (!stage) return;
    if (document.hidden) stage.stop();
    else if (state.openId) stage.start();
  });

  window.addEventListener(
    "resize",
    debounce(() => {
      if (state.filtersOpen) closeFilters({ restoreFocus: false });
      if (!stage) return;
      stage.resize();
      if (state.openId) stage.reset();
    }, 220)
  );
}

/* ------------------------------------------------------------------ 启动 */

function boot() {
  renderHero();
  renderChips();
  buildFiltersPanel();
  renderGrid();
  renderSelChips();
  syncFilterButton();
  syncThemeMenu();
  state.accent = bootAccent();
  syncThemeColor();
  syncFavicon();
  renderSwatches();
  syncAccentUI();
  bindEvents();
  route();
if ("requestIdleCallback" in window) requestIdleCallback(warmStageChunk, { timeout: 2500 });
else window.setTimeout(warmStageChunk, 900);



}

boot();

window.Lightbox = {
  gear: GEAR,
  dimensions: DIMENSIONS,
  open: (id) => openDetail(GEAR.find((g) => g.id === id)),
  setTheme: (mode) => applyTheme(mode),
  setAccent: (id) => setAccent(id),
  getStage: () => stage,
  state,
};