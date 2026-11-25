# 设备矢量图 / 三维模型 统一风格契约（v1）

> 三个真实设备：Konica Big Mini BM-21、OLYMPUS 45mm f/1.8、ZENIKO ZA12。
> 目标：放进同一个页面时，**看不出是三个人做的**。

## 一、SVG 封面（480 × 360）

### 必须遵守
- 只使用这 5 个 class 上色，**不要写任何颜色值**：
  - `line`（主线，`--art-line`）、`accent`（描边强调色）、`accent-fill`（填充强调色）、`text`（文字/点）、`grid`（保留给背景）
- 线宽：主轮廓 `stroke-width="1.5"`、`stroke-opacity="0.58"`；次级结构 `1.2 / 0.38`；细节 `1 / 0.22`。
- 圆角/直角一律 `stroke-linejoin="round"`、`stroke-linecap="round"`、`fill="none"`。
- 构图：**正视图**，视觉中心 (240, 182)，整幅不超过 300 × 210。设备水平放置，不画透视、不画投影。
- 强调色最多用在 1–2 处（品牌条、红点、拨盘刻度圈），面积占比 ≤ 8%。
- 允许 1–2 处 `<text class="text" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="7" letter-spacing="1.2">` 的小字（型号/刻度），不要大段文字。
- 函数签名：`export function glyphXxx() { return '<svg 片段字符串>'; }`（**不要**包 `<svg>`，只返回内容；外层由 art.js 提供）。
- 画面里不要出现：阴影、渐变、滤镜、外链字体、位图。

### 参考笔触
现有 `glyphLens` / `glyphCamera` 就是基准：几何概括、留白多、只有必要的分模线与刻度。宁可少画，不要糊成一团。

## 二、three.js 模型

### 签名
```js
export function buildXxx({ materials, helpers, params }) {
  const { part, box, knurlRing } = helpers;
  const group = new THREE.Group();
  // ...
  return group;
}
```
- `materials` 由主程序传入，可用键：`body`（主色金属）、`plate`（更亮的金属）、`rubber`（哑光黑胶）、`dark`（深色内腔）、`accent`（主题强调色金属）、`glass`（镜片/闪灯玻璃）、`canvas`、`leather`。
- `helpers.part(geometry, material, position?, rotation?)`、`helpers.box(w,h,d,radius,material)`、`helpers.knurlRing(radius,count,[w,h,d],material,z)`。
- 可以自己 `import * as THREE from "three"`；**不要再造新的材质**（除非必要），不要贴图、不要外链资源。

### 尺寸与朝向
- 整体宽度 1.6–2.0，高度 1.0–1.4，深度 0.5–0.9（单位即世界单位）。
- X 居中、Z 居中；底面贴近 y = 0（查看器会自动把 min.y 归零，但别让模型内部偏移）。
- **正面朝 +Z**；默认相机在右前上方，看到的是正面 3/4。
- 圆柱轴向 Z 时用 `[Math.PI / 2, 0, 0]` 旋转。
- 面数预算 < 40k 三角形；主圆柱 48–64 段足够。

### 质感
- 机身用 `body`，装饰/顶盖用 `plate`，握把与滚花用 `rubber`，内腔与镜筒内壁用 `dark`，镜片用 `glass`。
- 强调色只做 1–2 个细节（红点、装饰环、拨盘刻度圈）。
- 不要在模型里写死颜色，不要用 `MeshBasicMaterial`。

## 三、验收
1. `node --check` 通过；
2. 预览页 `/tools/device-preview.html` 三件并排，深浅两主题各截一张；
3. 卡片封面与详情三维在视觉上属于同一套：线宽一致、留白一致、强调色克制、3D 比例协调。
