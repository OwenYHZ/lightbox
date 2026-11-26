import { chromium } from "playwright-core";
import fs from "node:fs";
const files = ["card-dark.png", "card-light.png", "preview-dark.png", "preview-light.png"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
const out = {};
for (const f of files) {
  const p = "E:\\code\\dshCode\\Lightbox\\.tmp\\bm21\\" + f;
  if (!fs.existsSync(p)) { out[f] = "missing"; continue; }
  const b64 = fs.readFileSync(p).toString("base64");
  out[f] = await page.evaluate(async (u) => {
    const img = new Image(); img.src = "data:image/png;base64," + u; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const Y = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const px = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const bucket = new Map();
    for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) {
      const q = px(x, y); const k = (q[0] >> 3) + "," + (q[1] >> 3) + "," + (q[2] >> 3);
      const e = bucket.get(k) || { n: 0, r: 0, g: 0, b: 0 }; e.n++; e.r += q[0]; e.g += q[1]; e.b += q[2]; bucket.set(k, e);
    }
    let mb = null; for (const e of bucket.values()) if (!mb || e.n > mb.n) mb = e;
    const bg = [mb.r / mb.n, mb.g / mb.n, mb.b / mb.n];
    const bgY = Y(bg);
    const cand = [];
    for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const q = px(x, y); const dl = Math.abs(Y(q) - bgY); if (dl > 0.01) cand.push([dl, q]); }
    cand.sort((a, b) => b[0] - a[0]);
    const take = Math.max(3, Math.round(cand.length * 0.004));
    const fg = [0, 0, 0]; for (let i = 0; i < take; i++) { fg[0] += cand[i][1][0]; fg[1] += cand[i][1][1]; fg[2] += cand[i][1][2]; }
    fg[0] /= take; fg[1] /= take; fg[2] /= take;
    const ratio = Math.round(((Math.max(Y(fg), bgY) + 0.05) / (Math.min(Y(fg), bgY) + 0.05)) * 100) / 100;
    return { size: [c.width, c.height], bg: bg.map(Math.round).join(","), fg: fg.map(Math.round).join(","), ratio };
  }, b64);
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
