/**
 * 双主题舞台预览 —— 只用于自检，不参与主站构建。
 *
 * 参数：
 *   ?mode=single|split   单舞台 / 左右深浅对比（默认 split）
 *   &model=camera|lens|filter
 *   &theme=dark|light    single 模式下的主题（默认 dark）
 *   &rotate=1            打开自动旋转（默认关闭，方便截图对比）
 */

import { StageViewer } from "../lib/three/viewer.js";

/* ?tone=graphite|silver|black 可以换一个机身色调，做材质自检 */
const toneParam = new URLSearchParams(location.search).get("tone");

function withTone(params) {
  return toneParam ? { ...params, tone: toneParam } : params;
}

const MODELS = {
  camera: { kind: "camera", params: withTone({ tone: "silver" }) },
  lens: { kind: "lens", params: withTone({ focal: 85 }) },
  filter: { kind: "filter", params: withTone({ seed: 77 }) },
};

const THEME_LABEL = { dark: "DARK", light: "LIGHT" };

const query = new URLSearchParams(location.search);
const mode = query.get("mode") === "single" ? "single" : "split";
const initialModel = MODELS[query.get("model")] ? query.get("model") : "camera";
const requestedTheme = query.get("theme");
const initialTheme = requestedTheme === "light" ? "light" : "dark";
const autoRotate = query.get("rotate") === "1";

const el = {
  stages: document.getElementById("stages"),
  status: document.getElementById("status"),
  modelBtns: document.getElementById("modelBtns"),
  themeBtns: document.getElementById("themeBtns"),
};

const state = { mode, model: initialModel, theme: initialTheme };
const panes = [];

function syncControls() {
  el.modelBtns.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.model === state.model);
  });
  el.themeBtns.querySelectorAll("button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.theme === state.theme);
  });
  const labels = panes.map((pane) => THEME_LABEL[pane.themeName]).join(" / ");
  el.status.textContent = `${state.model} · ${mode} · ${labels}`;
}

function setPageTheme(theme) {
  document.documentElement.dataset.pageTheme = theme;
}

function makePane(themeName) {
  const pane = document.createElement("section");
  pane.className = `pane pane--${themeName}`;
  pane.dataset.theme = themeName;

  const mount = document.createElement("div");
  mount.className = "mount";

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = THEME_LABEL[themeName];

  pane.append(mount, tag);
  el.stages.append(pane);

  const viewer = new StageViewer(mount, {
    theme: themeName,
    onReady: () => pane.classList.add("is-ready"),
  });
  viewer.setAutoRotate(autoRotate);

  const entry = { root: pane, mount, tag, viewer, themeName };
  panes.push(entry);
  return entry;
}

function showModel(name) {
  state.model = name;
  const model = MODELS[name] || MODELS.camera;
  panes.forEach((entry) => entry.viewer.show(model.kind, model.params));
  syncControls();
}

function setTheme(name) {
  state.theme = name;
  panes.forEach((entry) => {
    entry.themeName = name;
    entry.root.classList.remove("pane--dark", "pane--light");
    entry.root.classList.add(`pane--${name}`);
    entry.tag.textContent = THEME_LABEL[name];
    entry.viewer.setTheme(name);
  });
  setPageTheme(name);
  syncControls();
}

el.stages.dataset.mode = mode;

if (mode === "single") {
  makePane(initialTheme);
  setPageTheme(initialTheme);
} else {
  /* 左深右浅，同一个模型，方便一眼比对比度 */
  makePane("dark");
  makePane("light");
  setPageTheme("dark");
}

showModel(initialModel);
syncControls();

el.modelBtns.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-model]");
  if (btn) showModel(btn.dataset.model);
});

el.themeBtns.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-theme]");
  if (btn) setTheme(btn.dataset.theme);
});

/* 自检脚本（playwright）用的把手 */
window.__preview = { panes, state, showModel, setTheme, query };
