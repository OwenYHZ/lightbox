import "../styles/tokens.css";
import "../styles/accents.css";
import { GEAR } from "../data/gear.js";
import { coverArt } from "../lib/art.js";
import { StageViewer } from "../lib/three/viewer.js";

const DEVICES = {
  "konica-bm21": {
    label: "Konica BM-21",
    folder: "Konica Big Mini BM-21",
    photos: ["165526", "165455", "165515", "165536", "165552", "165644", "165658", "165716"],
  },
  "olympus-45": {
    label: "Olympus 45mm",
    folder: "OLYMPUS M.ZUIKO DIGITAL 45mm f1.8",
    photos: ["222129", "222116", "222134", "222122", "222138", "222142"],
  },
  "zeniko-za12": {
    label: "Zeniko ZA12",
    folder: "ZENIKO ZA12",
    photos: ["222217", "222229", "222234", "222242", "222248", "222256", "222313", "222330"],
  },
};

const params = new URLSearchParams(location.search);
const initial = DEVICES[params.get("d")] ? params.get("d") : "konica-bm21";

const tabs = document.getElementById("tabs");
const svgHost = document.getElementById("svgHost");
const stageHost = document.getElementById("stageHost");
const photoHost = document.getElementById("photoHost");
const rail = document.getElementById("rail");
const detailLink = document.getElementById("detailLink");

let stage = null;
let current = initial;

tabs.innerHTML = Object.entries(DEVICES)
  .map(([id, d]) => '<button class="cmp-tab" type="button" data-id="' + id + '">' + d.label + "</button>")
  .join("");

const photoUrl = (device, file) =>
  "/realDevicePhotos/" + encodeURIComponent(device.folder) + "/IMG_20261125_" + file + ".jpg";

function render(id) {
  current = id;
  const device = DEVICES[id];
  const item = GEAR.find((g) => g.id === id);
  [...tabs.children].forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === id)));

  svgHost.innerHTML = item ? coverArt(item) : "";
  detailLink.href = "../index.html#/" + id;

  rail.innerHTML = device.photos
    .map(
      (file, i) =>
        '<button class="cmp-thumb" type="button" data-file="' +
        file +
        '" aria-current="' +
        (i === 0) +
        '"><img src="' +
        photoUrl(device, file) +
        '" alt="" loading="lazy"></button>'
    )
    .join("");
  setPhoto(device.photos[0]);

  if (stage) { stage.dispose(); stage = null; }
  stageHost.innerHTML = "";
  stage = new StageViewer(stageHost, { theme: document.documentElement.dataset.theme });
  stage.show(item.kind, Object.assign({}, item.model));
  stage.setAutoRotate(false);

  history.replaceState(null, "", "?d=" + id);
}

function setPhoto(file) {
  const device = DEVICES[current];
  photoHost.innerHTML = '<img src="' + photoUrl(device, file) + '" alt="">';
  [...rail.children].forEach((b) => b.setAttribute("aria-current", String(b.dataset.file === file)));
}

tabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".cmp-tab");
  if (tab) render(tab.dataset.id);
});
rail.addEventListener("click", (e) => {
  const thumb = e.target.closest(".cmp-thumb");
  if (thumb) setPhoto(thumb.dataset.file);
});

const THEMES = ["dark", "light"];
document.getElementById("themeBtn").addEventListener("click", () => {
  const next = THEMES[(THEMES.indexOf(document.documentElement.dataset.theme) + 1) % 2];
  document.documentElement.dataset.theme = next;
  document.documentElement.dataset.themeMode = next;
  if (stage) stage.setTheme(next);
});

render(initial);
window.__compare = { render, get stage() { return stage; } };
