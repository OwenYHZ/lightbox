import fs from "node:fs";
const dir = "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\";
const load = (f) => JSON.parse(fs.readFileSync(dir + f, "utf8"));
const src = load("audit-src-a.json");
const distA = load("audit-dist-a.json");
const b = load("audit-b.json");
const c = load("audit-c.json");

console.log("== SRC 12x2 palette ==");
for (const key of Object.keys(src.scan)) {
  const s = src.scan[key];
  const r = s.regions;
  const worst = s.worst.slice(0, 3).map((w) => w.sel + " " + w.fontSize + "px " + w.ratio).join(" | ");
  const m = src.tokens[key].matrix.filter((x) => x.fail).map((x) => x.label.split(" ")[0] + "@" + x.ratio);
  console.log(key + " base=" + r.mode.hex + " L" + r.mode.L + " C" + r.mode.C + " h" + r.mode.h + " | heroL=" + r.heroLeft.hex + " C" + r.heroLeft.C + " h" + r.heroLeft.h + " | meanL=" + r.mean.L + " C" + r.mean.C + " h" + r.mean.h);
  console.log("   textFails=" + s.failCount + "/" + s.textCount + " min=" + s.allMin + " :: " + worst);
  console.log("   tokenFails(" + m.length + "): " + m.join(", "));
}
console.log("== cardArt min ratio (src) ==");
const ca = {};
for (const key of Object.keys(src.cardArt)) {
  const vals = Object.values(src.cardArt[key]).filter((v) => v && v.ratio).map((v) => v.ratio);
  ca[key] = Math.min.apply(null, vals);
}
console.log(JSON.stringify(ca));
console.log("== DIST palette (live) ==");
for (const key of Object.keys(distA.scan)) {
  const s = distA.scan[key];
  console.log(key + " base=" + s.regions.mode.hex + " C" + s.regions.mode.C + " h" + s.regions.mode.h + " textFails=" + s.failCount + " min=" + s.allMin);
}
console.log("== loader ==");
console.log(JSON.stringify({
  cold: { fadeStart: b.loader.coldStart.fadeStartMs, hidden: b.loader.coldStart.hiddenMs, strokeNodes: b.loader.coldStart.strokeNodes, probe: b.loader.coldStart.styleProbe, hit: b.loader.coldStart.hitAtCenter },
  switch: b.loader.switchReset.at140ms,
  warmSamples: b.loader.warmRebuild.samples.filter((s) => s.at >= 1200),
  failsafe: { fade: b.loader.failsafe.fadeStartMs, hidden: b.loader.failsafe.hiddenMs, state: b.loader.failsafe.state },
  reduced: b.loader.reduced,
}, null, 1));
console.log("== regression ==");
console.log(JSON.stringify({
  themeSwitch: { shift: c.regression.themeSwitch.layoutShift, seq: c.regression.themeSwitch.luminanceSeq, dir: c.regression.themeSwitch.transitionDurationApplied, meta: c.regression.themeSwitch.metaThemeColor, ink1: c.regression.themeSwitch.ink1, before: c.regression.themeSwitch.rectsBefore, after: c.regression.themeSwitch.rectsAfter },
  accentSwitch: c.regression.accentSwitch,
  detailTokens: c.regression.detailTokens,
  detailLight: c.regression.detailLight,
  editor: c.regression.editorPage,
  errors: c.errors,
}, null, 1));
