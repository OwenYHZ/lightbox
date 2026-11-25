import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const root = "E:\\code\\dshCode\\Lightbox";
const shots = path.join(root, "shots", "compare");
fs.mkdirSync(shots, { recursive: true });

const vite = spawn("D:\\Program Files\\nodejs\\node.exe", ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5195", "--strictPort"], {
  cwd: root,
  env: { ...process.env, TEMP: path.join(root, ".tmp"), TMP: path.join(root, ".tmp") },
  stdio: "ignore",
});

async function waitUp(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    const ok = await new Promise((res) => {
      const req = http.get(url, (r) => { r.resume(); res(r.statusCode === 200); });
      req.on("error", () => res(false));
      req.setTimeout(1500, () => { req.destroy(); res(false); });
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const up = await waitUp("http://127.0.0.1:5195/tools/device-compare.html");
console.log("dev server:", up);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("response", (r) => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });

for (const id of ["konica-bm21", "olympus-45", "zeniko-za12"]) {
  await page.goto("http://127.0.0.1:5195/tools/device-compare.html?d=" + id, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(shots, id + ".jpg"), type: "jpeg", quality: 80 });
}
const status = await page.evaluate(() => ({ photos: document.querySelectorAll(".cmp-thumb").length }));
await browser.close();
vite.kill();
console.log(JSON.stringify({ errors: errors.slice(0, 6), status }));
process.exit(0);
