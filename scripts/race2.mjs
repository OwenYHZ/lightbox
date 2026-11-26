import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("https://owenyhz.github.io/lightbox/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);

async function openCard(title) {
  await page.click('text=' + title);
  await page.waitForTimeout(300);
}
async function closeCard() {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}
async function snap(tag) {
  return page.evaluate((t) => {
    const mount = document.querySelector("#stageMount");
    const canvas = mount.querySelector("canvas");
    const loader = document.querySelector("#stageLoader");
    const stage = window.Lightbox && window.Lightbox.getStage && window.Lightbox.getStage();
    return {
      tag: t,
      canvas: !!canvas,
      ready: canvas ? canvas.classList.contains("is-ready") : null,
      mountHTML: mount.innerHTML.slice(0, 60),
      loaderHidden: loader.hidden,
      loaderDone: loader.classList.contains("is-done"),
      hasStage: !!stage,
      modelChildren: stage && stage.model ? stage.model.children.length : 0,
      canvasSize: canvas ? canvas.width + "x" + canvas.height : null,
    };
  }, tag);
}
const out = [];
await openCard("ZENIKO ZA12");
out.push(await snap("open ZA12 after 300ms"));
await page.waitForTimeout(2500);
out.push(await snap("ZA12 after 2.8s"));
await closeCard();
await openCard("Konica Big Mini BM-21");
await page.waitForTimeout(2500);
out.push(await snap("BM21 after 2.5s (fast reopen)"));
console.log(JSON.stringify({ errors: errors.slice(0, 6), out }, null, 1));
await browser.close();
process.exit(0);
