# 器材清单模板（Excel）

配合 `tools/gear-editor.html` 使用：填写完 Excel 后，保存为 CSV 直接导入编辑器，或把区域复制到编辑器的「粘贴 Excel 区域」里。

## 工作表

| 工作表 | 用途 |
| --- | --- |
| **器材清单** | 14 列，与 `docs/gear-schema.md` 的列顺序一致；首行冻结、已加自动筛选，前两行是示例（可覆盖） |
| **字段说明** | 每个字段是否必填、取值、含义；含 `accent` / `model` 两个可选字段 |
| **取值表** | 枚举的中英文对照，也是「器材清单」下拉验证的引用来源 |

## 填写要点

- 列的英文名：`id, name, brand, cat, form, mount, lens, status, year, maker, summary, note, tags, specs`。
- 下拉列表里是**英文 id**（如 `sony` / `body` / `sony-e`），中文对照看「取值表」；表头批注里也列出了可选值。
- `lens` 只给机身填（`interchangeable` 可换镜头 / `fixed` 固定镜头），镜头和配件留空。
- `tags` 用逗号分隔，例如 `全画幅, 微单, E 卡口`。
- `specs` 用 `键:值; 键:值`，例如 `重量:658 g; 滤镜口径:82 mm`（中文冒号、分号也认）。
- `mount`：配件填 `none`；不可换镜头的一体机填 `fixed`。
- 镜头的 `form` 取 `lens`（与 DIMENSIONS 的 form 维度一致）。
- `accent` / `model` 不在 14 列里，编辑器会原样保留已有数据；需要手写时请走 JSON 导入。

## 导入编辑器

1. 在 Excel 里「另存为 → CSV UTF-8」，然后在编辑器点「导入 CSV」；或
2. 选中整块数据（含表头）复制，在编辑器按 Ctrl/⌘ + V，选择「追加」或「替换全部」。

编辑器会识别中英文表头，也会把中文枚举标签（如「索尼」「微单」）自动转成英文 id。
