# BM-21 v24 · 多视角 + 特写差异清单（终版）

**GLB**：`public/assets/models/konica-bm21.glb` — 2.59 MB / **23:49:09** / 82 mesh / bbox **100.00 × 32.00 × 63.00 mm**
**渲染批**：`shots/bm21/v24-*`（12 张，Cycles CPU 56 spp + OIDN，白底透明合成）
**并排对照**：`shots/bm21/compare/cmp-*.png`（左官方/实拍，右渲染，同物理宽度）

## 1. 12 张交付
| # | 文件 | 机位 | 对照 |
|---|---|---|---|
| 1 | v24-front.png | 正交 −Y | cmp-front.png |
| 2 | v24-back.png | 正交 +Y | cmp-back.png |
| 3 | v24-left.png | 正交 +X 端面 | cmp-left.png（实拍 165515）|
| 4 | v24-right.png | 正交 −X 端面 | cmp-right.png（实拍 165644）|
| 5 | v24-top.png | 正交 +Z（前棱朝上）| cmp-top.png |
| 6 | v24-bottom.png | 正交 −Z | cmp-bottom.png |
| 7 | v24-quarter-fl.png | 透视 前-左-上 | cmp-quarter-fl.png |
| 8 | v24-quarter-br.png | 透视 后-右-上 | cmp-quarter-br.png（实拍 165716）|
| 9 | v24-close-lens.png | 特写 40 mm（22.5 px/mm ≈4×）| cmp-close-lens.png |
| 10 | v24-close-top.png | 特写 62 mm（16.1 px/mm）| cmp-close-top.png |
| 11 | v24-close-grip.png | 特写 52 mm（19.2 px/mm）| cmp-close-grip.png |
| 12 | v24-close-bottom.png | 特写 74 mm（13.5 px/mm）| cmp-close-bottom.png |

## 2. r8 项状态
| 项 | 处理 | 复测 |
|---|---|---|
| **P0 ② 颗粒过强** | `grain()` 强度 1.0 → **0.26**（FFT 整数频率可平铺噪声、7 mm UV 不变）| 平坦香槟区（blur5 高通）σ/mean：**渲染 12.7% vs 官方 14.4%**（v22 为 24%）；尺度 0.09–0.13 mm 未变 |
| P1 ④ 凸筋读不出 | 凸起 0.12 → **0.30**、两侧 0.15 倒角、材质提亮到 **#5a5d66**（比黑胶亮 25%）| close-grip 可见隆起与亮/暗边 |
| P1 ⑤-a 前窗过亮 | 底色 #232325 → **#141416**、rough 0.40 → **0.45** | 窗心亮度明显压到与镜圈同档 |
| P1 ⑤-b 对角分缝 | 不再用浮片：改为 **布尔刻槽**（14×1.6 刀，31°，切 0.12 深）进盖板本体 | 特写下仍不明显（见 §4-1）|
| P2 银环 Ø33.6 | 锥面外径 17.2 → **17.62**（Ø35.2 再被 0.28 倒角吃掉 ≈0.4）| 有效外径 ≈34.1 |
| P2 三脚孔 | 中心 X43.0（=reviewer 93.0）、Ø7.5 沉台深 1.7、Ø6.4 孔深 3.6 | ✓ |

## 3. 逐视角残余差异（Δ 单位 mm）
### front
| # | 差异 | 渲染 | 官方 | Δ |
|---|---|---|---|---|
| F1 | 前脸中值亮度 | 0.79（201/255）| 0.84（214/255）| −0.05 |
| F2 | 色相（B−R）| +17 | +5 | 偏暖，底材 #ddd7cb + metal .68 决定 |
| F3 | 高宽比 | 0.63（正交真值）| 视觉 0.55 | **透视差，不可消除** |
| F4 | 握把腰线 | 17.2–21.3 | 17.8–22.9 | ≤1 ✓ |
| F5 | 握把黑度 | 70–77 | 84–90 | −14 |
| F6 | 取景窗 | 单层暗玻璃 | 亮玻璃+塑料壳+内部亮块 | 结构未做 |

### back / left / right / top / bottom / quarter
| # | 差异 | Δ |
|---|---|---|
| B5 | RearEndCap 与 Shell 同色接缝 | 缝 0.12（应 ≤0.05）|
| L2 | 电池门凹井 | 缺 0.5 凹陷 |
| R1/R2 | −X 端三节铰链分节、端面圆顶 R8 | 缺分节；R 差 1.5 |
| T1 | 顶面黑肩 6.9/8.1/8.6 | ✓（目标 3.2–7.9）|
| T4 | I/O 应为电源符号 | 字形差（P2）|
| U1 | 三脚孔单件 Ø16 + 沉台 + 深孔 | ✓ |
| U5 | 螺丝缺十字槽 + Ø4.6 collar | 结构未做 |
| U6 | CE 缺 10.6×6 冲压凹框 | 未做 |
| Q1–Q3 | 包绕形态/镜筒过渡/顶部 45° 斜面 | ✓ |

## 4. 诚实边界（不可消除 / 未做）
1. **盖板对角分缝**：布尔槽已在盖板本体上（0.12 深），但 22.5 px/mm 特写下与盖板同色、同法线方向，仍读不出——需要给槽内单独材质（深 + 高粗糙）或把盖板拆两片留 0.9 缝。
2. **官方图为俯视透视**：正交渲染必然比照片"更高"，竖向特征整体差 3–8 mm；这是投影差，不是模型差。
3. **字形**：Konica / big mini / 顶面三行用 Arial Bold / Verdana Bold 按实测外框水平压缩拟合，笔画与原字标差 5–10%。
4. **未做的结构细节**：取景窗玻璃层次、AF 窗亮环、三节铰链分节、OPEN◁ 丝印、螺丝十字槽+collar、CE 冲压凹框、LCD 分段显示与 "AUTO DATE"、三键 0.2 凹窝、快门 0.15 浅碟。

## 5. 复现
```
python scripts/bm21/make_textures.py
blender -b -P scripts/bm21/build.py
blender -b -P scripts/bm21/render_views.py   # BM21_TAG=v24
python scripts/bm21/make_compare.py v24
```
