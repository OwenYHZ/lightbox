# BM-21 建模板 · 用户要求（2026-11-26）

## 实物参数（官方/用户提供）
- 1994 年 · 135 胶片便携机 · **155 g** · **100 × 63 × 32 mm**
- 镜头 **30mm f/4.5**（镜圈丝印：上弧 `KONICA LENS`，下弧 `AUTO FOCUS 30mm F4.5`）
- 5 种闪光模式 · 支持 DX 编码 · **1 × CR2 锂电池**
- **颜色：淡香槟色磨砂**（不是银白，也不是暖金；高光偏冷、底色偏暖）

## 参考图（`realDevicePhotos/official/bm21/`）
| 文件 | 内容 |
| --- | --- |
| bm21-front.png | 正面（无闪光灯，镜头盖关闭；顶部按键、取景窗、AF 窗、闪光窗、Konica / big mini 丝印、2×3 圆点） |
| bm21-top.png | 顶面俯视（快门、MODE/ON/SELECT SET、LCD、镜头筒顶端、背面顶缘） |
| bm21-back.png | 背面（黑后盖、取景目镜凸起、大圆盘、竖条窗、`Konica FILM`） |
| bm21-bottom.png | 底面（`CE`、`B0035423` 序列号铭牌、`KONICA CORPORATION`、两颗螺丝、电池仓圆盖） |
| bm21-quarter.jpg | 左前 3/4 高分辨率（2961×1415，判断形体/材质/倒角的最佳图） |
| 另有用户昨日实拍：`realDevicePhotos/Konica Big Mini BM-21/`（右侧面等） |

## 硬要求（用户原话要点）
1. **严格测绘**：以 100×63×32mm 为基准，逐件尺寸/位置用像素标定，写进 `docs/bm21-spec.md`。
2. **淡香槟色磨砂**：哑光阳极氧化质感，roughness 0.5–0.6、metallic 0.6–0.8，底色偏香槟（约 #d9d2c4 ± ），不要镜面。
3. **反复修改**：看-改-看-改，每轮出六视图对照。
4. **矢量图同步细化**：`src/lib/art/devices/konica-bm21.js` 目前的线条图要按新照片重画（比例/丝印/圆点/镜头环字）。
5. 之前那版图元模型（`src/lib/three/models/konica-bm21.js`）不可用，GLB 上线后作为回退保留即可。

## 交付
- `public/assets/models/konica-bm21.glb`（真实尺寸 100×63×32mm，米制）
- `docs/bm21-spec.md`（量测书）
- `shots/bm21/`（六视图 + 对照图）
- 审核报告 `docs/reviews/bm21-glb/rN.md`
