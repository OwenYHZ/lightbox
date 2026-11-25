/* ==========================================================================
   Lightbox · 交互主控
   ========================================================================== */

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/cards.css";
import "./styles/detail.css";

import { GEAR, CATEGORIES, CATEGORY_LABEL, STATS } from "./data/gear.js";
import { coverArt } from "./lib/art.js";

/* ------------------------------------------------------------------ 工具 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

function debounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const ICON_CUBE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 20 7v10l-8 4.2L4 17V7Z"/><path d="M4 7l8 4.2L20 7M12 11.2V21"/></svg>';
const ICON_ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M9 6h9v9"/></svg>';

const INDEX_BY_ID = new Map(GEAR.map((item, i) => [item.id, i]));
const EN_BY_CAT = new Map(CATEGORIES.map((c) => [c.id, c.en]));

/* ------------------------------------------------------------------ 状态 */

const state = {
  cat: "all",
  query: "",
  openId: null,
  autoRotate: !prefersReduced,
};

/* ------------------------------------------------------------------ 元素 */

const el = {
  topbar: $("#topbar"),
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
  detail: $("#detail"),
  panel: $("#detailPanel"),
  close: $("#detailClose"),
  stageMount: $("#stageMount"),
  stageLoader: $("#stageLoader"),
  stageLoaderText: $("#stageLoaderText"),
  stageFallback: $("#stageFallback"),
  btnRotate: $("#btnRotate"),
  btnReset: $("#btnReset"),
  detailEyebrow: $("#detailEyebrow"),
  detailTitle: $("#detailTitle"),
  detailNote: $("#detailNote"),
  detailSpecs: $("#detailSpecs"),
  detailTags: $("#detailTags"),
  detailMeta: $("#detailMeta"),
  app: $("#app"),
};

let lastFocused = null;
let stage = null;
let stagePromise = null;
const baseTitle = document.title;

/* ------------------------------------------------------------------ 首屏 */

function renderHero() {
  const total = GEAR.length;
  const items = STATS.map(
    (s) =>
      '<li class="stat"><span class="stat__num">' +
      String(s.count).padStart(2, "0") +
      '</span><span class="stat__label">' +
      s.label +
      "</span></li>"
  );
  items.push(
    '<li class="stat"><span class="stat__num">' +
      String(total).padStart(2, "0") +
      '</span><span class="stat__label">全部</span></li>'
  );
  el.stats.innerHTML = items.join("");

  el.topbarMeta.textContent = total + " ITEMS / " + new Date().getFullYear();
  el.footStat.textContent = total + " 件器材 · " + STATS.length + " 个类别";
}

function renderChips() {
  const all = [{ id: "all", label: "全部", en: "ALL", count: GEAR.length }].concat(STATS);
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
  const tags = item.tags
    .slice(0, 2)
    .map((t) => '<span class="tag">' + escapeHtml(t) + "</span>")
    .join("");

  return (
    '<article class="card" style="--i:' +
    position +
    '" data-id="' +
    item.id +
    '">' +
    '<div class="card__surface">' +
    '<div class="card__media">' +
    '<span class="card__index mono">NO.' +
    no +
    "</span>" +
    '<span class="card__badge">' +
    ICON_CUBE +
    "3D</span>" +
    '<div class="card__art">' +
    coverArt(item, INDEX_BY_ID.get(item.id)) +
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

function matches(item, query) {
  if (state.cat !== "all" && item.cat !== state.cat) return false;
  if (!query) return true;
  const haystack = [item.name, item.maker, item.summary, item.note]
    .concat(item.tags)
    .concat(item.specs.flat())
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function renderGrid() {
  const query = state.query.trim().toLowerCase();
  const list = GEAR.filter((item) => matches(item, query));

  el.grid.innerHTML = list.map((item, i) => cardMarkup(item, i)).join("");
  el.count.textContent =
    String(list.length).padStart(2, "0") + " / " + String(GEAR.length).padStart(2, "0");
  el.empty.hidden = list.length !== 0;
  el.grid.hidden = list.length === 0;

  if (list.length) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        $$(".card", el.grid).forEach((card) => card.classList.add("is-in"));
      });
    });
  }
}

/* ------------------------------------------------------------------ 详情 */

function fillDetail(item) {
  const no = String(INDEX_BY_ID.get(item.id) + 1).padStart(2, "0");
  el.detailEyebrow.textContent =
    (CATEGORY_LABEL[item.cat] || "") + " / " + (EN_BY_CAT.get(item.cat) || "") + " · NO." + no;
  el.detailTitle.textContent = item.name;
  el.detailNote.textContent = item.note;
  el.detailSpecs.innerHTML = item.specs
    .map(
      (spec) =>
        '<div class="spec"><dt>' +
        escapeHtml(spec[0]) +
        "</dt><dd>" +
        escapeHtml(spec[1]) +
        "</dd></div>"
    )
    .join("");
  el.detailTags.innerHTML = item.tags
    .map((tag) => '<span class="tag">' + escapeHtml(tag) + "</span>")
    .join("");
  el.detailMeta.textContent =
    item.maker + " · " + item.year + " · " + String(item.kind).toUpperCase() + " MODEL";
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
          onReady: () => el.stageLoader.classList.add("is-done"),
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

  const viewer = await ensureStage();
  if (viewer && state.openId === item.id) {
    await nextFrame();
    viewer.show(item.kind, Object.assign({}, item.model, { accent: item.accent }));
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

  const hide = () => {
    if (!state.openId) {
      el.detail.hidden = true;
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
  if (location.hash !== hash) {
    history.pushState({ lightbox: true }, "", hash);
  }
}

function clearHash() {
  if (!location.hash) return;
  if (history.state && history.state.lightbox) {
    history.back();
  } else {
    history.replaceState(null, "", location.pathname + location.search);
  }
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
  /* 滚动态 */
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
    if (history.state && history.state.lightbox) history.replaceState(null, "", location.pathname + location.search);
  });

  /* 类别筛选 */
  el.chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const cat = chip.dataset.cat;
    if (cat === state.cat) return;
    state.cat = cat;
    $$(".chip", el.chips).forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    renderGrid();
  });

  /* 搜索 */
  const applyQuery = debounce(() => renderGrid(), 110);
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
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.search.classList.contains("is-open")) {
      el.search.classList.remove("is-open");
      el.searchToggle.setAttribute("aria-expanded", "false");
    }
  });

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

  /* 详情：关闭 / 工具按钮 */
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

  el.emptyReset.addEventListener("click", () => {
    state.cat = "all";
    state.query = "";
    el.searchInput.value = "";
    el.searchClear.hidden = true;
    $$(".chip", el.chips).forEach((c) =>
      c.setAttribute("aria-pressed", String(c.dataset.cat === "all"))
    );
    renderGrid();
  });

  /* 键盘：Esc 关闭 + 焦点锁在浮层内 */
  document.addEventListener("keydown", (event) => {
    if (!state.openId) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDetail();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = $$(
      'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      el.panel
    ).filter((node) => node.offsetParent !== null || node === el.close);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* 浏览器前进/后退、以及手动改地址栏里的 hash */
  window.addEventListener("popstate", route);
  window.addEventListener("hashchange", route);

  /* 标签页不可见时省电 */
  document.addEventListener("visibilitychange", () => {
    if (!stage) return;
    if (document.hidden) stage.stop();
    else if (state.openId) stage.start();
  });

  /* 移动端横竖屏切换时重新取景 */
  window.addEventListener("resize", debounce(() => {
    if (!stage) return;
    stage.resize();
    if (state.openId) stage.reset();
  }, 220));
}

/* ------------------------------------------------------------------ 启动 */

async function boot() {
  renderHero();
  renderChips();
  renderGrid();
  bindEvents();
  route();
}

boot();

/* 供未来扩展用：window.Lightbox.gear 能拿到全部数据 */
window.Lightbox = { gear: GEAR, categories: CATEGORIES, open: (id) => openDetail(GEAR.find((g) => g.id === id)) };
