# Lightbox · 器材档案

**在线预览 → https://owenyhz.github.io/lightbox/**
**器材编辑器 → https://owenyhz.github.io/lightbox/tools/gear-editor.html**

一个只有代码、没有素材的个人器材展示页：机身、镜头、配件、转接环。
封面是实时生成的 SVG 图元，三维预览是用 three.js 图元拼出来的模型——仓库里没有一张照片，也没有一个 `.glb`。

## 能做什么

- **六维精确筛选**：类别 / 品牌 / 卡口 / 形态 / 介质 / 镜头配置 / 状态，同组多选取并集、跨组取交集，选项带实时命中数
- **胶片与数码分开**：机身有「介质」维度，镜头不参与（同一个镜头可能胶片数码都在用）
- **转接环双卡口**：转接环同时属于镜头端和机身端两个系统，选中任一端都会出现
- **器材状态**：现役可用 · 退役可用 · 已出售 · 故障，卡片与详情都有标记
- **主题**：浅色 / 深色 / 跟随系统 + **12 种主题色**，选择记在本地，切换时 SVG 封面、UI、WebGL 舞台一起变
- **三件真实设备按实拍重建**：Konica Big Mini BM-21、M.Zuiko 45mm f/1.8、ZENIKO ZA12 —— 各自的矢量封面与 three.js 模型都是独立文件（`src/lib/art/devices/`、`src/lib/three/models/`），按 `docs/device-style-guide.md` 的统一画风制作
- **三维详情**：拖拽旋转 / 滚轮与双指缩放 / 双击复位 / 自动旋转
- **可分享链接**（`#/sony-a7m4`），浏览器返回键可关闭浮层
- 键盘可用、`prefers-reduced-motion`、无 WebGL 时优雅降级

## 筛选怎么用

顶部第一排是**类别**（全部 / 机身 / 镜头 / 配件），点「筛选」打开精确筛选面板：

| 想找 | 怎么选 |
| --- | --- |
| 所有机身 | 类别 = 机身 |
| 胶片机身 | 类别 = 机身 + 介质 = 胶片 |
| 尼康 F 卡口镜头 | 类别 = 镜头 + 卡口 = 尼康 F |
| 所有 M43 器材 | 卡口 = M43 |
| 尼康 Z 系统的机身和镜头 | 品牌 = 尼康 + 卡口 = 尼康 Z |
| 固定镜头旁轴 | 形态 = 旁轴 + 镜头配置 = 固定镜头 |
| 含转接环的索尼 E 系统 | 卡口 = 索尼 E（E 口机身/镜头 + E→Z 转接环都会出现） |
| 已出售的器材 | 状态 = 已出售 |

规则：**同一组内多选 = 或，不同组之间 = 且**，再与类别、搜索词求交集。
每组里的数字是「在当前其它条件下点它还会剩几件」，为 0 的置灰。

## 主题与主题色

- 顶栏右上角按钮打开「外观」：明暗三选（浅色 / 深色 / 自动）+ 12 个主题色
- 主题色只定义色相与饱和度，明度由深浅主题各自推导，保证两种底色下都有对比度
- 存在 `localStorage`（`lightbox.theme` / `lightbox.accent`），首屏内联脚本先行应用，不闪色
- 三维舞台的金色装饰环也会跟随主题色（按当前色相生成材质颜色）

## 数据

全部器材在 [`src/data/gear.js`](src/data/gear.js)，字段与枚举见 [`docs/gear-schema.md`](docs/gear-schema.md)。
往 `GEAR` 里加一条，列表、筛选、统计、详情、编辑器都会自动跟上。

## 新增一件器材

现在**没有独立的图片/模型文件**：封面和三维模型都由 `kind` + `model` 参数在浏览器里生成。
所以新增一件器材 = 在数据里加一条记录，体积约 **850 字节**。

### 最省事的流程

1. 打开网页编辑器（本地 `npm run dev` 后 `http://localhost:5173/tools/gear-editor.html`，或线上地址）
2. 点「新增行」，填字段；`kind` 决定封面图形与三维模型（camera / lens / tripod / flash / filter / audio / bag / adapter / object）
3. 「下载 gear.json」或「复制 GEAR 代码」→ 发给我，或自己替换 `src/data/gear.js` 里的 `GEAR` 数组
4. 提交推送，Pages 自动更新

### 想让某件设备有「定制」矢量图与三维模型

按实拍照片重做一件设备，只需要两个文件 + 一个 kind：

1. `src/lib/art/devices/<id>.js` → `export function glyphXxx()`，只返回 SVG 片段，只用 `line / accent / accent-fill / text` 四个 class；
2. `src/lib/three/models/<id>.js` → `export function buildXxx({ materials, helpers, params })`，只用提供的材质，正面朝 +Z；
3. 在 `models.js` 的 `DEVICE_BUILDERS` 与 `art.js` 的 `GLYPHS` 里各加一行（现有三件已接好）；
4. 数据里把该器材的 `kind` 设成同一个 id。

口径与尺寸见 [`docs/device-style-guide.md`](docs/device-style-guide.md)，做的时候可以打开 `/tools/device-preview.html` 和已有三件并排比对。

### 如果你想用真实图片 / 真实模型

那才会产生体积：

| 素材 | 单件典型体积 | 说明 |
| --- | --- | --- |
| 照片（WebP/JPEG，1600px） | 150–400 KB | 需要新增 `assets/` 目录并改 `art.js` |
| GLB 模型（中等精度，压缩后） | 2–8 MB | 需要新增 `assets/models/` 并改 `models.js` |

按 100 件器材 + 每件一张图 ≈ 30 MB；100 件 + 每件一个 GLB ≈ 500 MB，那时确实建议另开一个仓库/对象存储放模型（GitHub Pages 单站点上限 1 GB）。

## 存储与体积

| 项目 | 体积 | 是否进 Git |
| --- | --- | --- |
| 线上站点 `dist/`（全部页面与资源） | **666 KB** | 否（CI 构建） |
| three.js 运行时 chunk（最大单文件） | 519 KB（gzip 133 KB） | 否 |
| 主站 JS + CSS | 29 + 37 KB | 否 |
| 编辑器 JS + CSS + 页面 | 27 + 14 + 7 KB | 否 |
| 源码 `src/` | 223 KB | 是 |
| 数据 `gear.js`（28 件） | 23 KB（≈ 850 B/件） | 是 |
| Excel 模板 | 13 KB | 是 |
| 文档（README + schema） | 9 KB | 是 |
| Git 仓库（.git） | 约 330 KB | — |
| `node_modules`（本地依赖，不提交） | 69 MB | 否 |
| 每件器材的图片 / 模型 | **0 B（代码生成）** | — |

GitHub Pages 限制：发布站点 ≤ 1 GB，单文件 ≤ 100 MB，仓库建议 ≤ 1 GB，月流量软限制 100 GB。
以现在 666 KB 的体积，放几千件器材都不会触发任何限制——除非你开始塞真实照片和 GLB。

## 目录

```
index.html                  主站骨架
src/
  main.js                   交互主控：主题、主题色、六维筛选、卡片、详情、路由
  data/gear.js              ★ 器材数据 + 维度枚举 + 状态定义
  data/accents.js           12 种主题色（主站与编辑器共用）
  lib/art.js                SVG 封面生成器（颜色走 CSS 变量）
  lib/art/devices/*.js      三件真实设备的矢量封面（konica-bm21 / olympus-45 / zeniko-za12）
  lib/three/viewer.js       WebGL 舞台：主题预设、灯光、取景、转接环视角
  lib/three/models.js       三维模型构建器（含 adapter + 设备注册表）
  lib/three/models/*.js     三件真实设备的三维模型（与 art/devices 一一对应）
  styles/tokens.css         ★ 两套明暗主题的设计变量
  styles/accents.css        主题色的色相/饱和度
  styles/base.css           重置、质感、顶栏、外观面板、筛选对话框
  styles/cards.css          卡片、状态、封面配色
  styles/detail.css         详情浮层 + 三维舞台
  tools/editor.js|css       器材编辑器
tools/gear-editor.html      器材编辑器页面
tools/device-preview.html   三件真实设备并排预览（深浅主题 + SVG/3D 对照）
excel/器材清单模板.xlsx      Excel 模板
docs/gear-schema.md         数据契约
docs/device-style-guide.md  矢量封面与三维模型的统一风格契约
scripts/qa.mjs             筛选/主题回归测试
scripts/qa-v3.mjs          介质/转接环/主题色回归测试
scripts/verify.mjs         截图自检
.github/workflows/deploy.yml 推 main 自动构建并发布 Pages
```

## 开发与发布

```bash
npm install
npm run dev       # http://localhost:5173（不会自动打开浏览器）
npm run build     # 产物在 dist/
npm run preview   # 预览构建产物
```

`vite.config.js` 里固定了 `open: false`、`host: 127.0.0.1`——任何验证都走后台服务 + 无头浏览器，不会弹窗口。

推送 `main` 触发 GitHub Actions：`npm ci` → `npm run build` → 部署 Pages（约 40 秒）。

## 换真图 / 真模型

- **封面**：`art.js` 的 `coverArt(item)` 返回 SVG 字符串，换成 `<img>` 即可，卡片布局不用动。
- **三维**：在 `models.js` 里把对应分支换成 `GLTFLoader`，只要返回的 `THREE.Group` 原点居中、Y 轴朝上，取景、灯光、阴影会自动适配。

## 已知边界

- 三维模型是图元拼装的占位形体，不是精确还原的 CAD。
- 「介质」只作用于机身；镜头不区分胶片/数码。
- 转接环按 `mount` 与 `mountTo` 两端参与卡口筛选。
- 支持的 WebGL 设备才会有三维预览，其余显示提示文字。


## ZA12 模型对比口径

- 官方 p1（顶视特写）↔ `shots/za12/top-p1.png`（俯视、正面朝上）
- 实拍 222217（顶视）↔ `shots/za12/top.png`
- 实拍 222313（左前 3/4）↔ `shots/za12/detail/compare-222313-vs-model.png`
- 审核报告：`docs/reviews/za12-glb/r1..r5.md`
