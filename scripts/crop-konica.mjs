import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const src = "E:\\code\\dshCode\\Lightbox\\realDevicePhotos\\Konica Big Mini BM-21\\IMG_20261125_165526.jpg";
const out = "E:\\code\\dshCode\\Lightbox\\shots\\evidence";
fs.mkdirSync(out, { recursive: true });
const viewer = path.join(path.dirname(src), "_crop.html");
fs.writeFileSync(viewer, '<html><body style="margin:0"><img id="p" src="IMG_20261125_165526.jpg" style="display:block"></body></html>');

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 4096, height: 3072 } });
await page.goto("file:///" + viewer.replace(/\\/g, "/").replace(/ /g, "%20"), { waitUntil: "load" });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(out, "konica-lens-full.png"), clip: { x: 900, y: 900, width: 1900, height: 1900 } });
await browser.close();
fs.rmSync(viewer, { force: true });
console.log("cropped");
process.exit(0);
