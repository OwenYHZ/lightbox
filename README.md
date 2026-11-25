# Lightbox · 器材档案

**在线预览 → https://owenyhz.github.io/lightbox/**

一个只有代码、没有素材的个人器材展示页：机身、镜头、配件。
卡片封面是**实时生成的 SVG 图元**，点击后的三维预览是**用 three.js 图元拼出来的模型**——仓库里没有一张照片，也没有一个 `.glb`。

- 深色玻璃拟态 + 香槟金点缀的视觉体系，一套设计变量（`src/styles/tokens.css`）控制全站气质
- 卡片网格、类别筛选、即时搜索、空状态、详情浮层
- 三维详情：拖拽旋转 / 滚轮与双指缩放 / 双击复位 / 自动旋转开关
- 移动端为底部抽屉式详情，三维舞台在上、参数在下
- 可分享的详情链接（`#/sony-a7m4`），浏览器返回键可以关掉浮层
- 键盘可用：`Tab` 聚焦、`Esc` 关闭、焦点锁在浮层内；尊重 `prefers-reduced-motion`
- 首屏 30 KB JS（gzip 11.5 KB），three.js 只在第一次打开详情时才按需加载

## 快速开始

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 产物在 dist/，纯静态，丢到任何静态托管即可
npm run preview   # 本地预览构建产物
```

## 目录结构

```
index.html                 页面骨架（顶栏 / Hero / 工具栏 / 网格 / 浮层）
src/
  main.js                  交互主控：渲染、筛选、搜索、路由、浮层
  data/gear.js             ★ 全部器材数据（唯一数据源）
  lib/art.js               SVG 封面生成器（按 kind 画技术图纸）
  lib/three/viewer.js      WebGL 舞台：渲染器、灯光、OrbitControls、取景
  lib/three/models.js      ★ 三维模型构建器（按 kind 返回 THREE.Group）
  styles/
    tokens.css             设计变量：色板、字体、圆角、缓动、留白
    base.css               重置、质感层、顶栏、Hero、工具栏、页脚
    cards.css              卡片
    detail.css             详情浮层 + 三维舞台
scripts/verify.mjs         无头浏览器截图自检（可选，需要本机 Chrome）
```

## 加一件器材

只改 `src/data/gear.js`，往 `GEAR` 里加一条：

```js
{
  id: "my-camera",              // 唯一 id，也是详情页地址 #/my-camera
  name: "Sony α7C II",
  maker: "Sony",
  year: 2023,
  cat: "body",                  // body | lens | accessory（决定筛选分组）
  kind: "camera",               // 封面与三维模型的形状类型
  summary: "3300 万像素 · 全画幅 · 514 g",
  note: "一句话说明这件东西为什么在柜子里。",
  specs: [["传感器", "3300 万像素 全画幅"], ["重量", "514 g"]],
  tags: ["全画幅", "轻便"],
  model: { seed: 3, tone: "graphite" },  // 可选：微调比例与配色
}
```

`cat` 决定筛选分组；`kind` 决定封面长什么样、三维模型怎么拼。可用的 `kind`：
`camera`（机身）、`lens`（镜头）、`tripod`（三脚架）、`flash`（闪光灯）、
`filter`（滤镜）、`audio`（无线麦）、`bag`（包）、`object`（通用小物）。

类别本身在同一个文件的 `CATEGORIES` 里，加一个类别只需要加一行。

## 换封面图

`src/lib/art.js` 的 `coverArt(item, index)` 返回一段 SVG 字符串。
想换成真实照片，只要把它换成 `<img src="...">`，卡片布局不需要任何改动：

```js
// 例：在 main.js 的 cardMarkup 里
'<div class="card__art"><img src="' + item.photo + '" alt=""></div>'
```

现在每张封面都是按 `kind` 画的技术图纸：细线轮廓、极淡网格、香槟金点缀、左下角注记。
随机细节由器材 id 的哈希决定，所以同一件器材每次渲染都长得一样。

## 换三维模型

`src/lib/three/models.js` 里每个构建器都返回一个 `THREE.Group`。换成真实模型：

```js
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
export function loadRealCamera(url) {
  const group = new THREE.Group();
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    // 把模型摆正、缩放到 1~2 个单位大小
    group.add(model);
  });
  return group;
}
```

只要返回的 Group 以原点为中心、Y 轴朝上，查看器的自动取景、灯光、地面投影都会自动适配。
查看器每次打开都会 `dispose()` 上一个模型的几何体与材质，不会累积显存。

模型参数通过 `item.model` 传入，比如镜头的 `focal` 会改变镜筒长度与口径：

```js
const focal = params.focal || 50;
const r = 0.38 + Math.min(focal, 200) / 1600;
const len = 0.72 + Math.min(focal, 200) / 150;
```

## 设计系统

`src/styles/tokens.css` 一个文件定义全部气质：

| 变量 | 作用 |
| --- | --- |
| `--ink-0 … --ink-3` | 近黑背景层次 |
| `--paper / --dim / --faint` | 三级文字 |
| `--accent` | 香槟金点缀 |
| `--font-sans / --display / --mono` | 正文 / 衬线装饰 / 技术标注 |
| `--r-xl … --r-sm` | 圆角梯度 |
| `--ease / --ease-spring` | 缓动曲线 |
| `--pad / --maxw` | 留白与版心 |

改 `--accent` 一处，卡片光斑、3D 金圈、按钮态、选中态会一起变。

## 部署

`npm run build` 之后把 `dist/` 整个目录上传即可（Vercel / Netlify / GitHub Pages / 任意静态服务器）。
`vite.config.js` 里 `base: "./"` 使用相对路径，所以放在子目录（如 `user.github.io/lightbox/`）也能直接用。

## 可选：截图自检

```bash
npm run build
node scripts/verify.mjs   # 需要本机安装 Chrome，截图输出到 shots/check/
```

## 已知边界

- 三维模型是图元拼装的占位形体，不是精确还原的相机 CAD。
- 移动端若浏览器不支持 WebGL，舞台会显示提示文字，其余功能不受影响。
- 详情页的高度是固定的（桌面 86vh / 移动 94svh），参数过多时右侧栏内部滚动。
