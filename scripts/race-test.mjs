import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("https://owenyhz.github.io/lightbox/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const ids = ["zeniko-za12", "konica-bm21"];
async function state() {
  return page.evaluate(() => {
    const canvas = document.querySelector("#stageMount canvas");
    const loader = document.querySelector("#stageLoader");
    const stage = window.Lightbox && window.Lightbox.getStage && window.Lightbox.getStage();
    return {
      open: document.querySelector("#detail").classList.contains("is-open"),
      canvas: !!canvas,
      ready: canvas ? canvas.classList.contains("is-ready") : null,
      loaderHidden: loader ? loader.hidden : null,
      loaderDone: loader ? loader.classList.contains("is-done") : null,
      hasModel: stage && stage.model ? stage.model.children.length : 0,
      hash: location.hash,
    };
  });
}
const log = [];
for (let round = 0; round < 6; round += 1) {
  const id = ids[round % 2];
  await page.evaluate((x) => { location.hash = "#/" + x; }, id);
  await page.waitForTimeout(round % 2 === 0 ? 500 : 1200);
  if (round % 2 === 0) {
    // 快速关闭再打开另一件
    await page.keyboard.press("Escape");
    await page.waitForTimeout(120);
    const other = ids[(round + 1) % 2];
    await page.evaluate((x) => { location.hash = "#/" + x; }, other);
    await page.waitForTimeout(1400);
  }
  log.push({ round, ...(await state()) });
}
console.log(JSON.stringify({ errors: errors.slice(0, 6), log }, null, 1));
await browser.close();
process.exit(0);
