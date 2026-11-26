import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
const root = "E:\\code\\dshCode\\Lightbox";
const out = path.join(root, "scripts", "za12", "tex");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 2100, height: 1900 }, deviceScaleFactor: 1 });
await page.goto("file:///" + path.join(root, "scripts", "za12", "dials.html").replace(/\\/g, "/").replace(/ /g, "%20"));
await page.waitForTimeout(600);
for (const [sel, name] of [["#dialL", "dial-left"], ["#dialR", "dial-right"], ["#plate", "plate"], ["#backIcon", "back-icon"], ["#shoeBack", "shoe-back"], ["#bottomPanel", "bottom-panel"]]) {
  const el = await page.$(sel);
  await el.screenshot({ path: path.join(out, name + ".jpg"), type: "jpeg", quality: 88 });
}
await browser.close();
console.log("DIALS_DONE");
process.exit(0);
