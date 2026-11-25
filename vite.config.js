import { defineConfig } from "vite";

// 相对 base：构建产物可以放在任意子路径、也可以用任意静态服务器托管。
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    cssTarget: "chrome100",
    assetsInlineLimit: 2048,
  },
  server: { port: 5173, open: true },
});
