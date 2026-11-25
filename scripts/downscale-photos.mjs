import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const base = "E:\\code\\dshCode\\Lightbox\\realDevicePhotos";
const out = path.join(base, "_small");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--allow-file-access-from-files"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let count = 0;

for (const folder of fs.readdirSync(base)) {
  if (folder.startsWith("_")) continue;
  const srcDir = path.join(base, folder);
  if (!fs.statSync(srcDir).isDirectory()) continue;
  const dstDir = path.join(out, folder);
  fs.mkdirSync(dstDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.(jpe?g|png)$/i.test(file)) continue;
    const htmlPath = path.join(srcDir, "_viewer.html");
    fs.writeFileSync(htmlPath, '<html><body style="margin:0;background:#000;display:grid;place-items:center;height:100vh"><img id="p" src="' + file + '" style="max-width:1280px;max-height:960px"></body></html>');
    await page.goto("file:///" + htmlPath.replace(/\\/g, "/").replace(/ /g, "%20"), { waitUntil: "load" });
    await page.waitForFunction(() => { const i = document.getElementById("p"); return i && i.complete && i.naturalWidth > 0; }, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(120);
    const el = await page.$("#p");
    if (el) await el.screenshot({ path: path.join(dstDir, file.replace(/\.(jpe?g|png)$/i, ".jpg")), type: "jpeg", quality: 82 });
    count += 1;
    fs.rmSync(htmlPath, { force: true });
  }
}
await browser.close();
console.log("downscaled:", count);
process.exit(0);
