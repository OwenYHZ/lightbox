import { defineConfig } from "vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// 主站 + 可选的本地器材编辑器（tools/gear-editor.html）
const input = { main: here("./index.html") };
if (existsSync(here("./tools/gear-editor.html"))) {
  input.editor = here("./tools/gear-editor.html");
}

// 相对 base：构建产物可以放在任意子路径、也可以用任意静态服务器托管。
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    cssTarget: "chrome100",
    assetsInlineLimit: 2048,
    rollupOptions: { input },
  },
  server: { port: 5173, open: true },
});
