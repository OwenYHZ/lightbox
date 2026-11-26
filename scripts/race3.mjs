import { chromium } from "playwright-core";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("https://owenyhz.github.io/lightbox/#/zeniko-za12", { waitUntil: "domcontentloaded", timeout: 60000 });
for (let i = 0; i < 8; i += 1) {
  await page.waitForTimeout(700);
  const s = await page.evaluate(() => {
    const mount = document.querySelector("#stageMount");
    const c = mount ? mount.querySelector("canvas") : null;
    return { t: performance.now() | 0, canvas: !!c, ready: c ? c.classList.contains("is-ready") : null, html: mount ? mount.innerHTML.length : -1, w: c ? c.width : 0 };
  });
  console.log(JSON.stringify(s));
  if (s.ready) break;
}
console.log("errors:", JSON.stringify(errors.slice(0, 5)));
await browser.close();
process.exit(0);
