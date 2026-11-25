import "../styles/tokens.css";
import "../styles/accents.css";
import { GEAR } from "../data/gear.js";
import { coverArt } from "../lib/art.js";
import { StageViewer } from "../lib/three/viewer.js";

const ids = ["konica-bm21", "olympus-45", "zeniko-za12"];
const items = ids.map((id) => GEAR.find((g) => g.id === id)).filter(Boolean);
const grid = document.getElementById("grid");

grid.innerHTML = items
  .map(
    (item) =>
      '<article class="pv-card" data-id="' +
      item.id +
      '">' +
      '<div class="pv-head"><span class="pv-name">' +
      item.name +
      '</span><span class="pv-kind mono">' +
      String(item.kind).toUpperCase() +
      "</span></div>" +
      '<div class="pv-svg">' +
      coverArt(item) +
      "</div>" +
      '<div class="pv-stage" id="stage-' +
      item.id +
      '"></div>' +
      '<p class="pv-meta mono">' +
      item.cat +
      " · " +
      item.mount +
      " · " +
      (item.model && item.model.tone ? item.model.tone : "graphite") +
      "</p>" +
      "</article>"
  )
  .join("");

const stages = items.map((item) => {
  const host = document.getElementById("stage-" + item.id);
  const stage = new StageViewer(host, { theme: document.documentElement.dataset.theme, onReady: () => {} });
  stage.show(item.kind, Object.assign({}, item.model));
  stage.setAutoRotate(false);
  return stage;
});

const THEMES = ["light", "dark"];
let themeIndex = 1;
document.getElementById("themeBtn").addEventListener("click", () => {
  themeIndex = (themeIndex + 1) % THEMES.length;
  const theme = THEMES[themeIndex];
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeMode = theme;
  stages.forEach((s) => s.setTheme(theme));
});

const ACCENTS = ["amber", "celadon", "wine"];
let accentIndex = 0;
document.getElementById("accentBtn").addEventListener("click", () => {
  accentIndex = (accentIndex + 1) % ACCENTS.length;
  document.documentElement.dataset.accent = ACCENTS[accentIndex];
});

window.__preview = { items, stages };
