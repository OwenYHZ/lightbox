import { chromium } from "playwright-core";
import fs from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
async function crop(src, x, y, w, h, scale, out) {
  const b64 = fs.readFileSync(src).toString("base64");
  const png = await page.evaluate(async ([u, x, y, w, h, s]) => {
    const img = new Image(); img.src = "data:image/png;base64," + u; await img.decode();
    const c = document.createElement("canvas"); c.width = w * s; c.height = h * s;
    const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
    return c.toDataURL("image/png").split(",")[1];
  }, [b64, x, y, w, h, scale]);
  fs.writeFileSync(out, Buffer.from(png, "base64"));
}
/* 站上 307px 卡宽（card-light-bm21.jpg 是 1440 宽的整页截图，卡 art 区约 307×230） */
await crop("E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\card-light-bm21.jpg", 105, 480, 320, 250, 3, "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\zoom-307px-bm21.png");
await crop("E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\card-light-bm21.jpg", 690, 480, 320, 250, 3, "E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\zoom-307px-zeniko.png");
await browser.close();
console.log("ok");
