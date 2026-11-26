import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto("https://owenyhz.github.io/lightbox/#/zeniko-za12", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3500);
const s = await page.evaluate(() => {
  const d = document.querySelector("#detail");
  const mount = document.querySelector("#stageMount");
  const loader = document.querySelector("#stageLoader");
  return {
    detailClasses: d ? d.className : null,
    detailHidden: d ? d.hidden : null,
    mountOuter: mount ? mount.outerHTML.slice(0, 160) : null,
    loaderClasses: loader ? loader.className : null,
    loaderHidden: loader ? loader.hidden : null,
    lb: window.Lightbox ? Object.keys(window.Lightbox) : null,
    hasStage: !!(window.Lightbox && window.Lightbox.getStage && window.Lightbox.getStage()),
    title: document.title,
  };
});
console.log(JSON.stringify({ s, errors }, null, 1));
await browser.close();
process.exit(0);
