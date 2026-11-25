# 器材数据模型（v2）

> 这是全站唯一的数据契约：`src/data/gear.js`、器材编辑器、Excel 模板都按它来。

## 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✓ | 唯一 slug，同时是详情页地址 `#/<id>` |
| `name` | ✓ | 显示名称 |
| `maker` | ✓ | 品牌原名（Sony / Nikon / Fujifilm…） |
| `brand` | ✓ | 品牌 id，用于筛选（见枚举） |
| `year` | ✓ | 年份，显示在卡片右上 |
| `cat` | ✓ | `body` 机身 / `lens` 镜头 / `accessory` 配件 |
| `kind` | ✓ | 决定封面与三维模型：`camera` `lens` `tripod` `flash` `filter` `audio` `bag` `object` |
| `mount` | ✓ | 卡口 / 系统 id（见枚举），配件用 `none` |
| `mountTo` |  | 仅转接环：机身端卡口。筛选任一卡口都能命中该转接环 |
| `form` | ✓ | 形态 id（见枚举）；镜头固定为 `lens`，转接环固定为 `adapter` |
| `medium` |  | 仅机身：`digital` 数码 / `film` 胶片 |
| `lens` |  | 仅机身：`interchangeable` 可换镜头 / `fixed` 固定镜头 |
| `status` | ✓ | `active` 现役 / `retired` 退役 / `sold` 已出售 / `broken` 故障 |
| `summary` | ✓ | 卡片上的一行摘要 |
| `note` |  | 详情页说明 |
| `specs` | ✓ | `[[标签, 数值], …]` |
| `tags` | ✓ | 小标签数组 |
| `accent` |  | 可选点缀色 |
| `model` |  | 传给三维构建器：`{ seed, tone, focal }` |

## 枚举

`brand`：`sony` 索尼 · `nikon` 尼康 · `fujifilm` 富士 · `leica` 徕卡 · `ricoh` 理光 · `om` 奥之心 · `panasonic` 松下 · `sigma` 适马 · `voigtlander` 福伦达 · `godox` 神牛 · `nisi` 耐司 · `rode` RØDE · `billingham` 白金汉 · `peakdesign` Peak Design

`mount`：`sony-e` 索尼 E · `nikon-z` 尼康 Z · `nikon-f` 尼康 F · `fuji-x` 富士 X · `leica-m` 徕卡 M · `m43` M43 · `fixed` 固定镜头 · `none` 通用 / 无卡口

`form`：`mirrorless` 微单 · `dslr` 单反 · `rangefinder` 旁轴 · `compact` 便携一体 · `lens` 镜头 · `adapter` 转接环 · `tripod` 支撑 · `flash` 灯光 · `filter` 滤镜 · `audio` 录音 · `bag` 包袋 · `accessory` 配件

`status`：`active` 现役 · `retired` 退役 · `sold` 已出售 · `broken` 故障

`medium`：`digital` 数码 · `film` 胶片（仅机身）

## 筛选语义

- **同一维度内多选 = OR**（品牌选了尼康或索尼，命中其一即可）
- **跨维度 = AND**（品牌=尼康 且 卡口=Z 卡口）
- 最后再与「类别」「搜索词」求交集

举例：

| 想找 | 选中 |
| --- | --- |
| 所有机身 | 类别=机身 |
| 尼康 F 卡口镜头 | 类别=镜头 + 卡口=尼康 F |
| 所有 M43 器材 | 卡口=M43 |
| 尼康 Z 系统的机身和镜头 | 品牌=尼康 + 卡口=尼康 Z |
| 固定镜头旁轴 | 形态=旁轴 + 镜头=固定镜头 |
| 胶片机身 | 类别=机身 + 介质=胶片 |
| 索尼 E 系统（含转接环） | 卡口=索尼 E → 同时出现 E 口机身/镜头和 E→Z 转接环 |

## 表格（Excel / 编辑器）列顺序

`id` · `name` · `brand` · `cat` · `form` · `mount` · `lens` · `status` · `year` · `maker` · `summary` · `note` · `tags` · `specs`

- `tags`：逗号分隔
- `specs`：`键:值;键:值`（中文冒号也认）
- 空值表示不设置
