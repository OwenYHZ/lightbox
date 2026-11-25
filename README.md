# Lightbox · 器材档案

**在线预览 → https://owenyhz.github.io/lightbox/**

一个只有代码、没有素材的个人器材展示页：机身、镜头、配件。
封面是实时生成的 SVG 图元，三维预览是用 three.js 图元拼出来的模型——仓库里没有一张照片，也没有一个 `.glb`。

## 能做什么

- **五维精确筛选**：类别 / 品牌 / 卡口系统 / 形态 / 镜头配置 / 状态，同组多选取并集、跨组取交集，选项带实时命中数
- **器材状态**：现役可用 · 退役可用 · 已出售 · 故障，卡片与详情都有标记，已出售的封面会降一点饱和
- **三态主题**：浅色 / 深色 / 跟随系统，选择记在本地，切换时 SVG 封面与 WebGL 舞台一起换
- **三维详情**：拖拽旋转 / 滚轮与双指缩放 / 双击复位 / 自动旋转开关，关闭后暂停渲染循环
- **可分享的详情链接**（`#/sony-a7m4`），浏览器返回键可关闭浮层
- **键盘可用**：`Tab` 聚焦、`Esc` 关闭浮层，焦点锁在浮层内；尊重 `prefers-reduced-motion`
- **零素材、按需加载**：首屏 ~27 KB JS（gzip 9 KB），three.js 只在第一次打开详情时加载

## 筛选怎么用

顶部第一排是**类别**（全部 / 机身 / 镜头 / 配件），点「筛选」打开**精确筛选**面板：

| 想找 | 怎么选 |
| --- | --- |
| 所有机身 | 类别 = 机身 |
| 尼康 F 卡口镜头 | 类别 = 镜头 + 卡口 = 尼康 F |
| 所有 M43 器材 | 卡口 = M43（机身和镜头都会出来） |
| 尼康 Z 系统的机身和镜头 | 品牌 = 尼康 + 卡口 = 尼康 Z |
| 固定镜头旁轴 | 形态 = 旁轴 + 镜头配置 = 固定镜头 |
| 已出售的器材 | 状态 = 已出售 |

规则：**同一组内多选 = 或，不同组之间 = 且**，最后再与类别、搜索词求交集。
每组里的数字是「在当前其它条件下点它还会剩几件」，为 0 的选项会置灰。选中的条件会显示在工具栏的「已选」一行里，可以单个 × 掉。

## 主题

- 顶栏右上角的按钮切换：浅色 / 深色 / 跟随系统
- 选择存在 `localStorage["lightbox.theme"]`，首屏用内联脚本先行应用，不会闪白/闪黑
- 系统主题变化时（跟随模式）会实时响应
- 三维舞台通过 `viewer.setTheme("light" | "dark")` 同步：曝光、灯光、地面阴影、刻度环在 300ms 内插值过渡

## 数据

全部器材在 [`src/data/gear.js`](src/data/gear.js)，字段与枚举见 [`docs/gear-schema.md`](docs/gear-schema.md)。
往 `GEAR` 里加一条，列表、筛选、统计、详情、编辑器都会自动跟上。

## 维护工具

### 1. 网页版编辑器（推荐）

打开 **`/tools/gear-editor.html`**（本地 `npm run dev` 后访问 `http://localhost:5173/tools/gear-editor.html`，线上是 `https://owenyhz.github.io/lightbox/tools/gear-editor.html`）：

- 表格直接改单元格，枚举列是下拉；`tags` 用逗号，`specs` 用 `键:值;键:值`
- 新增 / 复制 / 删除 / 上下移动行
- **粘贴 Excel 区域**（TSV，自动按表头映射列）或导入 JSON / CSV
- 导出 `gear.json`、CSV，或一键复制「可直接替换 `GEAR` 数组的 JS 代码」
- 自动存到 `localStorage`，刷新不丢；顶部有校验（id 重复、必填缺失、未知枚举）
- 数据不上传，全部在浏览器里

### 2. Excel 模板

[`excel/器材清单模板.xlsx`](excel/器材清单模板.xlsx)：14 列 + 下拉校验 + 示例行 + 字段说明 + 取值表。
填好后把表发我，或者直接复制若干行贴进网页编辑器的「粘贴」里。

## 目录

```
index.html                  主站骨架（主题引导脚本 / 顶栏 / Hero / 筛选 / 网格 / 浮层）
src/
  main.js                   交互主控：主题、五维筛选、卡片、详情、路由
  data/gear.js              ★ 器材数据 + 维度枚举 + 状态定义
  lib/art.js                SVG 封面生成器（颜色走 CSS 变量，自动适配主题）
  lib/three/viewer.js       WebGL 舞台：主题预设、灯光、OrbitControls、取景
  lib/three/models.js       三维模型构建器（按 kind 返回 THREE.Group）
  styles/tokens.css         ★ 两套主题的设计变量
  styles/base.css           重置、质感、顶栏、Hero、工具栏、筛选面板
  styles/cards.css          卡片、状态标记、封面配色
  styles/detail.css         详情浮层 + 三维舞台
  tools/editor.js           器材编辑器逻辑
  tools/editor.css          编辑器样式
tools/gear-editor.html      器材编辑器页面
excel/器材清单模板.xlsx      Excel 模板
docs/gear-schema.md         数据契约
scripts/verify.mjs          无头浏览器截图自检
scripts/qa.mjs              筛选 / 主题 / 移动端回归测试
.github/workflows/deploy.yml 推 main 自动构建并发布 Pages
```

## 开发与发布

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 产物在 dist/
npm run preview   # 预览构建产物
```

推送 `main` 会触发 GitHub Actions：`npm ci` → `npm run build` → 部署到 GitHub Pages（约 40 秒）。

## 换真图 / 真模型

- **封面**：`art.js` 的 `coverArt(item)` 返回 SVG 字符串，换成 `<img>` 即可，卡片布局不用动。
- **三维**：在 `models.js` 里把对应分支换成 `GLTFLoader`，只要返回的 `THREE.Group` 原点居中、Y 轴朝上，取景、灯光、地面阴影会自动适配；查看器每次打开都会 `dispose()` 上一个模型的几何体与材质。

## 已知边界

- 三维模型是图元拼装的占位形体，不是精确还原的相机 CAD。
- 不支持 WebGL 的设备会显示提示，其余功能不受影响。
- 详情页高度固定（桌面 86vh / 移动 94svh），参数过多时右侧栏内部滚动。
- 编辑器的本地草稿优先于 `gear.js`：更新数据后如果还看到旧内容，点「载入站点数据」或「清空草稿」。
