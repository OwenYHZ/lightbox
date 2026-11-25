/* ==========================================================================
   Lightbox · 器材编辑器
   独立本地工具：只读写本机 localStorage，不上传任何数据。
   数据契约见 docs/gear-schema.md；草稿键 lightbox.gear-draft.v2。
   ========================================================================== */

import { GEAR } from "../data/gear.js";

/* ------------------------------------------------------------------ 常量 */

const DRAFT_KEY = "lightbox.gear-draft.v2";
const HISTORY_LIMIT = 40;
const SEQ_WIDTH = 56;
const ACTION_WIDTH = 148;
const ERROR_LIMIT = 40;

const ENUMS = {
  brand: [
    ["sony", "索尼"],
    ["nikon", "尼康"],
    ["fujifilm", "富士"],
    ["leica", "徕卡"],
    ["ricoh", "理光"],
    ["om", "奥之心"],
    ["panasonic", "松下"],
    ["sigma", "适马"],
    ["voigtlander", "福伦达"],
    ["godox", "神牛"],
    ["nisi", "耐司"],
    ["rode", "RØDE"],
    ["billingham", "白金汉"],
    ["peakdesign", "Peak Design"],
  ],
  cat: [
    ["body", "机身"],
    ["lens", "镜头"],
    ["accessory", "配件"],
  ],
  form: [
    ["mirrorless", "微单"],
    ["dslr", "单反"],
    ["rangefinder", "旁轴"],
    ["compact", "便携一体"],
    ["lens", "镜头"],
    ["tripod", "支撑"],
    ["flash", "灯光"],
    ["filter", "滤镜"],
    ["audio", "录音"],
    ["bag", "包袋"],
    ["accessory", "配件"],
  ],
  mount: [
    ["sony-e", "索尼 E"],
    ["nikon-z", "尼康 Z"],
    ["nikon-f", "尼康 F"],
    ["fuji-x", "富士 X"],
    ["leica-m", "徕卡 M"],
    ["m43", "M43"],
    ["fixed", "固定镜头"],
    ["none", "通用 / 无卡口"],
  ],
  lens: [
    ["interchangeable", "可换镜头"],
    ["fixed", "固定镜头"],
  ],
  status: [
    ["active", "现役"],
    ["retired", "退役"],
    ["sold", "已出售"],
    ["broken", "故障"],
  ],
  kind: [
    ["camera", "机身"],
    ["lens", "镜头"],
    ["tripod", "三脚架"],
    ["flash", "闪光灯"],
    ["filter", "滤镜"],
    ["audio", "录音"],
    ["bag", "包袋"],
    ["object", "物件"],
  ],
};

const COLUMNS = [
  { key: "id", en: "ID", zh: "标识", type: "text", w: 152, mono: true, req: true },
  { key: "name", en: "NAME", zh: "名称", type: "text", w: 190, req: true },
  { key: "brand", en: "BRAND", zh: "品牌", type: "enum", w: 122 },
  { key: "cat", en: "CAT", zh: "类别", type: "enum", w: 100, req: true },
  { key: "form", en: "FORM", zh: "形态", type: "enum", w: 124, req: true },
  { key: "mount", en: "MOUNT", zh: "卡口", type: "enum", w: 132, req: true },
  { key: "lens", en: "LENS", zh: "镜头", type: "enum", w: 124 },
  { key: "status", en: "STATUS", zh: "状态", type: "enum", w: 106, req: true },
  { key: "year", en: "YEAR", zh: "年份", type: "number", w: 86 },
  { key: "maker", en: "MAKER", zh: "厂商原名", type: "text", w: 126 },
  { key: "summary", en: "SUMMARY", zh: "摘要", type: "text", w: 224 },
  { key: "note", en: "NOTE", zh: "说明", type: "text", w: 268 },
  { key: "tags", en: "TAGS", zh: "标签", type: "tags", w: 184 },
  { key: "specs", en: "SPECS", zh: "参数", type: "specs", w: 268 },
];

const FIELD_KEYS = COLUMNS.map((column) => column.key);
const COL_BY_KEY = new Map(COLUMNS.map((column) => [column.key, column]));

const JS_ORDER = [
  "id",
  "name",
  "maker",
  "brand",
  "year",
  "cat",
  "kind",
  "mount",
  "form",
  "lens",
  "status",
  "summary",
  "note",
  "specs",
  "tags",
  "accent",
  "model",
];

const REQUIRED = {
  id: "id",
  name: "名称",
  cat: "类别",
  mount: "卡口",
  form: "形态",
  status: "状态",
};

const ENUM_FIELDS = ["brand", "cat", "form", "mount", "lens", "status"];

const MAKER_TO_BRAND = {
  sony: "sony",
  nikon: "nikon",
  fujifilm: "fujifilm",
  leica: "leica",
  ricoh: "ricoh",
  "om system": "om",
  om: "om",
  olympus: "om",
  panasonic: "panasonic",
  sigma: "sigma",
  "voigtländer": "voigtlander",
  voigtlander: "voigtlander",
  godox: "godox",
  nisi: "nisi",
  "røde": "rode",
  rode: "rode",
  billingham: "billingham",
  "peak design": "peakdesign",
};

const FORM_BY_KIND = {
  camera: "mirrorless",
  lens: "lens",
  tripod: "tripod",
  flash: "flash",
  filter: "filter",
  audio: "audio",
  bag: "bag",
  object: "accessory",
};

const HEADER_ALIASES = {
  id: ["id", "标识", "编号", "slug", "key"],
  name: ["name", "名称", "型号", "器材名称"],
  brand: ["brand", "品牌", "品牌 id"],
  cat: ["cat", "category", "类别", "分类"],
  form: ["form", "形态", "形式"],
  mount: ["mount", "卡口", "系统"],
  lens: ["lens", "镜头", "镜头类型"],
  status: ["status", "状态"],
  year: ["year", "年份", "入手年份", "年代"],
  maker: ["maker", "厂商", "厂商原名", "品牌原名", "制造商"],
  summary: ["summary", "摘要", "简述", "一句话摘要"],
  note: ["note", "说明", "备注", "详情"],
  tags: ["tags", "标签"],
  specs: ["specs", "参数", "规格", "参数规格"],
};

/* ------------------------------------------------------------------ 工具 */

const $ = (selector, root) => (root || document).querySelector(selector);
const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

let uidSeq = 1;
const nextUid = () => uidSeq++;

const toStr = (value) => (value === null || value === undefined ? "" : String(value));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function debounce(fn, wait) {
  let timer = 0;
  return function debounced() {
    const args = arguments;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(null, args), wait);
  };
}

function normalizeToken(value) {
  return toStr(value).trim().toLowerCase().replace(/\s+/g, "");
}

/* -------------------------------------------------------------- 字段解析 */

function coerceEnum(field, value) {
  const options = ENUMS[field] || [];
  const raw = toStr(value).trim();
  if (!raw) return "";
  const token = normalizeToken(raw);
  let best = null;
  for (const pair of options) {
    const idToken = normalizeToken(pair[0]);
    const labelToken = normalizeToken(pair[1]);
    if (token === idToken || token === labelToken) return pair[0];
    const hit = token.includes(labelToken) ? labelToken.length : token.includes(idToken) ? idToken.length : 0;
    if (hit && (!best || hit > best.len)) best = { id: pair[0], len: hit };
  }
  return best ? best.id : raw;
}

function labelFor(field, value) {
  const options = ENUMS[field] || [];
  const hit = options.find((pair) => pair[0] === value);
  if (hit) return hit[1] + " · " + hit[0];
  return value ? "⚠ " + value : "未设置";
}

function splitSpec(piece) {
  const match = piece.match(/^\s*([^:：]+?)\s*[:：]\s*([\s\S]*)$/);
  if (!match) return ["", piece.trim()];
  return [match[1].trim(), match[2].trim()];
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toStr(item).trim()).filter(Boolean);
  }
  return toStr(value)
    .split(/[,，、;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatTags(tags) {
  return (tags || []).join(", ");
}

function parseSpecs(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (Array.isArray(item)) return [toStr(item[0]).trim(), toStr(item[1]).trim()];
        if (item && typeof item === "object") {
          const key = item.k !== undefined ? item.k : item.label !== undefined ? item.label : item.key;
          const val = item.v !== undefined ? item.v : item.value;
          return [toStr(key).trim(), toStr(val).trim()];
        }
        return splitSpec(toStr(item));
      })
      .filter((pair) => pair[0] || pair[1]);
  }
  return toStr(value)
    .split(/[;；\n]+/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map(splitSpec)
    .filter((pair) => pair[0] || pair[1]);
}

function formatSpecs(specs) {
  return (specs || [])
    .map((pair) => {
      const key = toStr(pair[0]).trim();
      const val = toStr(pair[1]).trim();
      return key ? key + ": " + val : val;
    })
    .filter(Boolean)
    .join("; ");
}

function normalizeData(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const data = {};
  data.id = toStr(src.id).trim();
  data.name = toStr(src.name).trim();
  data.maker = toStr(src.maker).trim();
  data.brand = coerceEnum("brand", src.brand);
  const yearRaw = toStr(src.year).trim();
  const yearNumber = Number(yearRaw);
  data.year = yearRaw === "" ? "" : Number.isFinite(yearNumber) && yearRaw !== "" ? yearNumber : yearRaw;
  data.cat = coerceEnum("cat", src.cat);
  const kindRaw = toStr(src.kind).trim();
  if (kindRaw) data.kind = coerceEnum("kind", kindRaw);
  data.mount = coerceEnum("mount", src.mount);
  data.form = coerceEnum("form", src.form);
  data.lens = coerceEnum("lens", src.lens);
  data.status = coerceEnum("status", src.status);
  data.summary = toStr(src.summary).trim();
  data.note = toStr(src.note).trim();
  data.specs = parseSpecs(src.specs);
  data.tags = parseTags(src.tags);
  if (toStr(src.accent).trim()) data.accent = toStr(src.accent).trim();
  if (src.model && typeof src.model === "object" && !Array.isArray(src.model)) {
    data.model = Object.assign({}, src.model);
  }
  return data;
}

function blankRow() {
  return normalizeData({
    id: "",
    name: "",
    maker: "",
    brand: "sony",
    year: new Date().getFullYear(),
    cat: "body",
    mount: "sony-e",
    form: "mirrorless",
    lens: "interchangeable",
    status: "active",
    summary: "",
    note: "",
    specs: [],
    tags: [],
  });
}

/* -------------------------------------------------------------- 站点推断 */

function mountFromText(text, makerKey) {
  const value = toStr(text);
  if (/索尼\s*E|E\s*卡口/i.test(value)) return "sony-e";
  if (/尼康\s*Z|Z\s*卡口/i.test(value)) return "nikon-z";
  if (/尼康\s*F|F\s*卡口/i.test(value)) return "nikon-f";
  if (/富士\s*X|X\s*卡口/i.test(value)) return "fuji-x";
  if (/徕卡\s*M|Leica\s*M|M\s*卡口/i.test(value)) return "leica-m";
  if (/M43|M4\/3|M\s*4\/3/i.test(value)) return "m43";
  if (makerKey === "sony") return "sony-e";
  if (makerKey === "nikon") return "nikon-z";
  if (makerKey === "fujifilm") return "fuji-x";
  if (makerKey === "leica") return "leica-m";
  return "";
}

function inferSiteData(raw) {
  const data = normalizeData(raw);
  let filled = 0;
  const fill = (key, value) => {
    if (value && !data[key]) {
      data[key] = value;
      filled += 1;
    }
  };

  const makerKey = toStr(data.maker).trim().toLowerCase();
  fill("brand", MAKER_TO_BRAND[makerKey] || "");

  const kind = toStr(raw && raw.kind).trim();
  if (!data.cat) {
    fill("cat", kind === "camera" ? "body" : kind === "lens" ? "lens" : kind ? "accessory" : "");
  }

  const tagText = (data.tags || []).join(" ") + " " + toStr(data.name);

  if (data.cat === "body") {
    const fixedLens = /一体镜头|固定镜头|X100|GR ?III|GR3/i.test(tagText);
    fill("mount", fixedLens ? "fixed" : mountFromText(tagText, makerKey));
    fill("lens", fixedLens ? "fixed" : "interchangeable");
    fill(
      "form",
      /旁轴/.test(tagText)
        ? "rangefinder"
        : /单反/.test(tagText)
        ? "dslr"
        : /便携|口袋/.test(tagText)
        ? "compact"
        : FORM_BY_KIND[data.kind] || "mirrorless"
    );
  } else if (data.cat === "lens") {
    fill("mount", mountFromText(tagText, makerKey));
    fill("form", "lens");
  } else if (data.cat === "accessory") {
    fill("mount", "none");
    fill("form", FORM_BY_KIND[data.kind] || "accessory");
  } else {
    fill("mount", "none");
  }

  fill("status", "active");
  return { data, filled };
}

/* -------------------------------------------------------------- 导出结构 */

function inferKind(data) {
  if (data.kind) return data.kind;
  if (data.cat === "lens") return "lens";
  if (data.cat === "body") return "camera";
  if (["tripod", "flash", "filter", "audio", "bag"].includes(data.form)) return data.form;
  return "object";
}

function exportObject(data) {
  const out = {};
  out.id = toStr(data.id).trim();
  out.name = toStr(data.name).trim();
  out.maker = toStr(data.maker).trim();
  out.brand = data.brand || "";
  const year = toStr(data.year).trim();
  out.year = year === "" ? "" : Number.isFinite(Number(year)) ? Number(year) : year;
  out.cat = data.cat || "";
  out.kind = inferKind(data);
  out.mount = data.mount || "";
  out.form = data.form || "";
  out.lens = data.cat === "body" ? data.lens || "" : "";
  out.status = data.status || "";
  out.summary = toStr(data.summary).trim();
  out.note = toStr(data.note).trim();
  out.specs = (data.specs || []).map((pair) => [toStr(pair[0]), toStr(pair[1])]);
  out.tags = (data.tags || []).slice();
  if (data.accent) out.accent = data.accent;
  if (data.model && Object.keys(data.model).length) out.model = Object.assign({}, data.model);
  return out;
}

function pruneForOutput(object) {
  const optional = ["note", "lens", "accent", "model"];
  const out = {};
  JS_ORDER.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(object, key)) return;
    const value = object[key];
    if (optional.indexOf(key) >= 0) {
      if (value === "" || value === null || value === undefined) return;
      if (Array.isArray(value) && !value.length) return;
      if (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) return;
    }
    if (key === "year" && value === "") return;
    out[key] = value;
  });
  return out;
}

/* -------------------------------------------------------------- 文本格式 */

function toJsValue(value, indent) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every((item) => typeof item === "string" || typeof item === "number")) {
      return "[" + value.map((item) => JSON.stringify(item)).join(", ") + "]";
    }
    if (value.every((item) => Array.isArray(item))) {
      const inner = " ".repeat(indent + 2);
      const rows = value.map(
        (pair) => inner + "[" + pair.map((cell) => JSON.stringify(toStr(cell))).join(", ") + "],"
      );
      return "[\n" + rows.join("\n") + "\n" + " ".repeat(indent) + "]";
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    const entries = Object.keys(value).map(
      (key) => key + ": " + toJsValue(value[key], indent + 2)
    );
    return "{ " + entries.join(", ") + " }";
  }
  return JSON.stringify(value);
}

function toJsLiteral(object, indent) {
  const pad = " ".repeat(indent);
  const inner = " ".repeat(indent + 2);
  const lines = [];
  JS_ORDER.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(object, key)) return;
    lines.push(inner + key + ": " + toJsValue(object[key], indent + 2) + ",");
  });
  if (!lines.length) return "{}";
  return "{\n" + lines.join("\n") + "\n" + pad + "}";
}

function csvCell(value) {
  const text = toStr(value);
  if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

function detectDelimiter(text) {
  const firstLine = String(text)
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0) || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > 0 && tabs >= commas ? "\t" : ",";
}

function parseDelimited(text, delimiter) {
  const source = String(text).replace(/\r\n?/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows.filter((cells) => cells.some((cell) => toStr(cell).trim() !== ""));
}

function normalizeHeaderCell(cell) {
  return toStr(cell)
    .replace(/[（(][^）)]*[）)]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s:：]/g, "");
}

function mapHeader(cell) {
  const token = normalizeHeaderCell(cell);
  if (!token) return null;
  let best = null;
  for (const key of Object.keys(HEADER_ALIASES)) {
    for (const alias of HEADER_ALIASES[key]) {
      const aliasToken = normalizeHeaderCell(alias);
      if (!aliasToken) continue;
      if (token === aliasToken) return key;
      if (token.indexOf(aliasToken) >= 0 && (!best || aliasToken.length > best.len)) {
        best = { key, len: aliasToken.length };
      }
    }
  }
  return best ? best.key : null;
}

/* ------------------------------------------------------------------ 状态 */

const state = {
  rows: [],
  history: [],
  savedAt: 0,
  errorCount: 0,
  saveFailed: false,
};

const queueValidate = debounce(() => validateAndPaint(), 160);
const scheduleSave = debounce(() => saveDraft(), 380);

/* ------------------------------------------------------------------ DOM */

const dom = {
  stats: $("#edStats"),
  loadSite: $("#btnLoadSite"),
  undo: $("#btnUndo"),
  clearDraft: $("#btnClearDraft"),
  addRow: $("#btnAddRow"),
  paste: $("#btnPaste"),
  importJson: $("#btnImportJson"),
  importCsv: $("#btnImportCsv"),
  fileJson: $("#fileJson"),
  fileCsv: $("#fileCsv"),
  exportJson: $("#btnExportJson"),
  copyJs: $("#btnCopyJs"),
  exportCsv: $("#btnExportCsv"),
  errors: $("#edErrors"),
  errorCount: $("#edErrorCount"),
  errorHint: $("#edErrorHint"),
  errorList: $("#edErrorList"),
  table: $("#gearTable"),
  gridCols: $("#gridCols"),
  gridHead: $("#gridHead"),
  gridBody: $("#gridBody"),
  saved: $("#edSaved"),
  pasteModal: $("#pasteModal"),
  pasteText: $("#pasteText"),
  pasteMode: $("#pasteMode"),
  pasteInfo: $("#pasteInfo"),
  pasteCancel: $("#btnPasteCancel"),
  pasteApply: $("#btnPasteApply"),
  codeModal: $("#codeModal"),
  codeOut: $("#codeOut"),
  codeCopy: $("#btnCodeCopy"),
  codeDownload: $("#btnCodeDownload"),
  codeClose: $("#btnCodeClose"),
  toast: $("#toast"),
};

/* ---------------------------------------------------------------- 表格渲染 */

function buildGrid() {
  dom.gridCols.textContent = "";
  dom.gridHead.textContent = "";
  let total = SEQ_WIDTH;

  const seqCol = document.createElement("col");
  seqCol.style.width = SEQ_WIDTH + "px";
  dom.gridCols.appendChild(seqCol);

  const seqTh = node("th", "col-seq");
  seqTh.appendChild(node("span", "th-en", "#"));
  seqTh.appendChild(node("span", "th-zh", "序号"));
  dom.gridHead.appendChild(seqTh);

  COLUMNS.forEach((column) => {
    const colEl = document.createElement("col");
    colEl.style.width = column.w + "px";
    dom.gridCols.appendChild(colEl);
    total += column.w;

    const th = node("th");
    th.appendChild(node("span", "th-en", column.en));
    th.appendChild(node("span", "th-zh", column.zh + (column.req ? " *" : "")));
    th.title = column.zh + " · " + column.key + (column.req ? "（必填）" : "");
    dom.gridHead.appendChild(th);
  });

  const actionCol = document.createElement("col");
  actionCol.style.width = ACTION_WIDTH + "px";
  dom.gridCols.appendChild(actionCol);
  total += ACTION_WIDTH;

  const actionTh = node("th", "col-actions");
  actionTh.appendChild(node("span", "th-en", "ACTIONS"));
  actionTh.appendChild(node("span", "th-zh", "行操作"));
  dom.gridHead.appendChild(actionTh);

  dom.table.style.width = total + "px";
}

function buildCell(column, data, index) {
  const aria = "第 " + (index + 1) + " 行 " + column.en;

  if (column.type === "enum") {
    const select = node("select", "cell-select");
    select.dataset.field = column.key;
    select.setAttribute("aria-label", aria);
    select.appendChild(new Option("—", ""));
    const current = toStr(data[column.key]).trim();
    const options = ENUMS[column.key] || [];
    let known = false;
    options.forEach((pair) => {
      const option = new Option(pair[1], pair[0]);
      if (pair[0] === current) {
        option.selected = true;
        known = true;
      }
      select.appendChild(option);
    });
    if (current && !known) {
      const option = new Option("⚠ " + current, current);
      option.selected = true;
      select.appendChild(option);
      select.classList.add("is-invalid");
    }
    select.value = current;
    select.title = labelFor(column.key, current);
    return select;
  }

  const input = node("input", "cell-input");
  input.type = "text";
  input.dataset.field = column.key;
  input.setAttribute("aria-label", aria);

  if (column.type === "tags") {
    input.value = formatTags(data.tags);
    input.placeholder = "标签, 标签";
    input.classList.add("mono");
  } else if (column.type === "specs") {
    input.value = formatSpecs(data.specs);
    input.placeholder = "键:值; 键:值";
    input.classList.add("mono");
  } else if (column.key === "year") {
    input.value = toStr(data.year);
    input.placeholder = "2024";
    input.inputMode = "numeric";
    input.classList.add("mono");
  } else {
    input.value = toStr(data[column.key]);
    if (column.mono) input.classList.add("mono");
  }
  return input;
}

function buildRow(row, index) {
  const tr = node("tr");
  tr.dataset.index = String(index);
  tr.dataset.uid = String(row.uid);

  const seqCell = node("td", "col-seq");
  seqCell.appendChild(node("span", "seq mono", String(index + 1)));
  tr.appendChild(seqCell);

  COLUMNS.forEach((column) => {
    const td = node("td");
    td.dataset.col = column.key;
    td.appendChild(buildCell(column, row.data, index));
    tr.appendChild(td);
  });

  const actionsCell = node("td", "col-actions");
  const actions = node("div", "row-actions");
  [
    ["up", "↑", "上移"],
    ["down", "↓", "下移"],
    ["dup", "⧉", "复制行"],
    ["del", "✕", "删除行"],
  ].forEach(([act, glyph, label]) => {
    const button = node("button", "row-btn", glyph);
    button.type = "button";
    button.dataset.act = act;
    button.title = label;
    button.setAttribute("aria-label", "第 " + (index + 1) + " 行 " + label);
    actions.appendChild(button);
  });
  actionsCell.appendChild(actions);
  tr.appendChild(actionsCell);

  return tr;
}

function renderRows() {
  dom.gridBody.textContent = "";
  const fragment = document.createDocumentFragment();
  state.rows.forEach((row, index) => fragment.appendChild(buildRow(row, index)));
  dom.gridBody.appendChild(fragment);
  validateAndPaint();
  updateHistoryUi();
  scheduleSave();
}

/* ------------------------------------------------------------------ 校验 */

function validateRows() {
  const errors = [];
  const byRow = new Map();
  const add = (index, field, message) => {
    errors.push({ index, field, message });
    if (!byRow.has(index)) byRow.set(index, new Set());
    byRow.get(index).add(field);
  };

  const idSeen = new Map();
  state.rows.forEach((row, index) => {
    const id = toStr(row.data.id).trim();
    if (!id) return;
    const key = id.toLowerCase();
    if (!idSeen.has(key)) idSeen.set(key, []);
    idSeen.get(key).push(index);
  });

  state.rows.forEach((row, index) => {
    const data = row.data;
    Object.keys(REQUIRED).forEach((field) => {
      if (!toStr(data[field]).trim()) add(index, field, REQUIRED[field] + " 必填");
    });
    ENUM_FIELDS.forEach((field) => {
      const value = toStr(data[field]).trim();
      if (!value) return;
      const options = ENUMS[field] || [];
      if (!options.some((pair) => pair[0] === value)) {
        add(index, field, "未知 " + field + " 值：" + value);
      }
    });
    const year = toStr(data.year).trim();
    if (year && !/^\d{4}$/.test(year)) add(index, "year", "年份应为 4 位数字");
    const id = toStr(data.id).trim();
    if (id && (idSeen.get(id.toLowerCase()) || []).length > 1) add(index, "id", "id 重复：" + id);
  });

  return { errors, byRow };
}

function paintRows(byRow) {
  $$("tr", dom.gridBody).forEach((tr) => {
    const index = Number(tr.dataset.index);
    const fields = byRow.get(index);
    tr.classList.toggle("row--error", Boolean(fields));
    $$("[data-field]", tr).forEach((field) => {
      field.classList.toggle("is-invalid", Boolean(fields && fields.has(field.dataset.field)));
    });
    const seq = $(".seq", tr);
    if (seq) seq.classList.toggle("seq--error", Boolean(fields));
  });
}

function paintErrors(errors) {
  dom.errorList.textContent = "";
  const count = errors.length;
  dom.errors.classList.toggle("is-bad", count > 0);
  dom.errors.classList.toggle("is-ok", count === 0);

  if (!count) {
    dom.errorCount.textContent = "校验通过";
    dom.errorHint.textContent = "无错误 · 可安全导出 · 共 " + state.rows.length + " 行";
    return;
  }

  dom.errorCount.textContent = count + " 项待修";
  dom.errorHint.textContent = "点击条目跳到对应单元格";

  errors.slice(0, ERROR_LIMIT).forEach((error) => {
    const item = node("li");
    const button = node("button", "err-item");
    button.type = "button";
    button.dataset.index = String(error.index);
    button.dataset.field = error.field;
    const row = state.rows[error.index];
    const label = row && toStr(row.data.id).trim() ? toStr(row.data.id).trim() : "第 " + (error.index + 1) + " 行";
    button.appendChild(node("span", "err-item__row mono", "#" + (error.index + 1) + " " + label));
    button.appendChild(node("span", "err-item__msg", error.message));
    item.appendChild(button);
    dom.errorList.appendChild(item);
  });

  if (count > ERROR_LIMIT) {
    dom.errorList.appendChild(node("li", "err-more", "还有 " + (count - ERROR_LIMIT) + " 项…"));
  }
}

function paintStats() {
  const counts = { body: 0, lens: 0, accessory: 0, active: 0, sold: 0 };
  state.rows.forEach((row) => {
    const data = row.data;
    if (counts[data.cat] !== undefined) counts[data.cat] += 1;
    if (data.status === "active") counts.active += 1;
    if (data.status === "sold") counts.sold += 1;
  });

  dom.stats.textContent = "";
  const items = [
    ["共", state.rows.length, "件"],
    ["机身", counts.body, ""],
    ["镜头", counts.lens, ""],
    ["配件", counts.accessory, ""],
    ["现役", counts.active, ""],
    ["已出售", counts.sold, ""],
  ];

  items.forEach((item, index) => {
    if (index) dom.stats.appendChild(node("span", "stats__dot", "·"));
    const wrap = node("span", "stats__item");
    wrap.appendChild(node("span", "stats__label", item[0]));
    wrap.appendChild(node("b", "stats__value", String(item[1])));
    if (item[2]) wrap.appendChild(node("span", "stats__unit", item[2]));
    dom.stats.appendChild(wrap);
  });

  const bad = state.errorCount;
  const chip = node("span", "stats__chip " + (bad ? "is-bad" : "is-ok"));
  chip.textContent = bad ? "⚠ 校验 " + bad + " 项" : "✓ 校验通过";
  dom.stats.appendChild(chip);
}

function validateAndPaint() {
  const result = validateRows();
  state.errorCount = result.errors.length;
  paintRows(result.byRow);
  paintErrors(result.errors);
  paintStats();
  return result;
}

/* ---------------------------------------------------------------- 行操作 */

function focusCell(index, field) {
  const tr = dom.gridBody.querySelector('tr[data-index="' + index + '"]');
  if (!tr) return;
  const target = tr.querySelector('[data-field="' + field + '"]') || tr;
  if (target.focus) target.focus({ preventScroll: true });

  const wrap = dom.table.parentElement;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const cellRect = target.getBoundingClientRect();
  const leftGuard = SEQ_WIDTH + 10;
  const rightGuard = ACTION_WIDTH + 10;

  if (cellRect.left < wrapRect.left + leftGuard) {
    wrap.scrollLeft -= wrapRect.left + leftGuard - cellRect.left;
  } else if (cellRect.right > wrapRect.right - rightGuard) {
    wrap.scrollLeft += cellRect.right - (wrapRect.right - rightGuard);
  }
  if (cellRect.top < wrapRect.top + 44) {
    wrap.scrollTop -= wrapRect.top + 44 - cellRect.top + 6;
  } else if (cellRect.bottom > wrapRect.bottom) {
    wrap.scrollTop += cellRect.bottom - wrapRect.bottom + 6;
  }

  if (target.select && target.tagName === "INPUT") target.select();
}

function pushHistory(label) {
  state.history.push({
    label,
    at: Date.now(),
    rows: state.rows.map((row) => clone(row.data)),
  });
  while (state.history.length > HISTORY_LIMIT) state.history.shift();
  updateHistoryUi();
}

function updateHistoryUi() {
  dom.undo.disabled = state.history.length === 0;
  const last = state.history[state.history.length - 1];
  dom.undo.title = last ? "恢复「" + last.label + "」之前的状态" : "没有可恢复的步骤";
}

function undo() {
  const snapshot = state.history.pop();
  if (!snapshot) {
    showToast("没有可恢复的步骤", "warn");
    return;
  }
  state.rows = snapshot.rows.map((data) => ({ uid: nextUid(), data: normalizeData(data) }));
  renderRows();
  showToast("已恢复「" + snapshot.label + "」之前的状态", "ok");
}

function addRow() {
  pushHistory("新增行");
  state.rows.push({ uid: nextUid(), data: blankRow() });
  renderRows();
  focusCell(state.rows.length - 1, "id");
  showToast("已新增一行 · 从 id 开始填", "ok");
}

function duplicateRow(index) {
  const source = state.rows[index];
  if (!source) return;
  pushHistory("复制行");
  const data = normalizeData(clone(source.data));
  data.id = uniqueId(data.id || "row");
  state.rows.splice(index + 1, 0, { uid: nextUid(), data });
  renderRows();
  focusCell(index + 1, "id");
  showToast("已复制第 " + (index + 1) + " 行", "ok");
}

function uniqueId(base) {
  const taken = new Set(state.rows.map((row) => toStr(row.data.id).trim().toLowerCase()));
  let candidate = base + "-copy";
  let counter = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = base + "-copy" + counter;
    counter += 1;
  }
  return candidate;
}

function deleteRow(index) {
  const row = state.rows[index];
  if (!row) return;
  pushHistory("删除行");
  state.rows.splice(index, 1);
  renderRows();
  const label = toStr(row.data.name) || toStr(row.data.id) || "第 " + (index + 1) + " 行";
  showToast("已删除「" + label + "」· 可点「恢复」撤销", "ok");
}

function moveRow(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.rows.length) return;
  pushHistory("移动行");
  const row = state.rows.splice(index, 1)[0];
  state.rows.splice(target, 0, row);
  renderRows();
  focusCell(target, "id");
}

/* ------------------------------------------------------------ 站点 / 草稿 */

function siteRows() {
  const list = Array.isArray(GEAR) ? GEAR : [];
  let filledTotal = 0;
  const rows = list.map((raw) => {
    const result = inferSiteData(raw);
    filledTotal += result.filled;
    return { uid: nextUid(), data: result.data };
  });
  return { rows, filledTotal };
}

function loadSiteData() {
  pushHistory("载入站点数据");
  const result = siteRows();
  state.rows = result.rows;
  renderRows();
  showToast(
    "已载入站点数据 " + result.rows.length + " 件" +
      (result.filledTotal ? " · 自动推断 " + result.filledTotal + " 个缺失字段" : ""),
    "ok"
  );
}

function clearDraft() {
  pushHistory("清空草稿");
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    /* 忽略：隐私模式下可能不可用 */
  }
  const result = siteRows();
  state.rows = result.rows;
  renderRows();
  showToast("草稿已清空 · 已重新载入站点数据 " + result.rows.length + " 件", "ok");
}

function readDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function saveDraft() {
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        v: 2,
        savedAt: new Date().toISOString(),
        rows: state.rows.map((row) => row.data),
      })
    );
    state.savedAt = Date.now();
    state.saveFailed = false;
    updateSavedLabel();
  } catch (err) {
    if (!state.saveFailed) {
      state.saveFailed = true;
      showToast("本地自动保存失败：" + err.message, "warn");
    }
  }
}

function updateSavedLabel(savedAt) {
  if (savedAt) state.savedAt = new Date(savedAt).getTime() || 0;
  if (!state.savedAt) {
    dom.saved.textContent = "尚未保存";
    return;
  }
  const time = new Date(state.savedAt).toLocaleTimeString("zh-CN", { hour12: false });
  dom.saved.textContent = "已自动保存 " + time;
}

/* -------------------------------------------------------------- 导入导出 */

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function buildJson() {
  const list = state.rows.map((row) => pruneForOutput(exportObject(row.data)));
  return JSON.stringify(list, null, 2) + "\n";
}

function buildCsv() {
  const lines = [FIELD_KEYS.join(",")];
  state.rows.forEach((row) => {
    const data = exportObject(row.data);
    lines.push(
      FIELD_KEYS.map((key) => {
        if (key === "tags") return csvCell((data.tags || []).join(", "));
        if (key === "specs") {
          return csvCell((data.specs || []).map((pair) => pair[0] + ": " + pair[1]).join("; "));
        }
        const value = data[key];
        return csvCell(value === undefined || value === null ? "" : value);
      }).join(",")
    );
  });
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

function buildJsSnippet() {
  const stamp = new Date().toLocaleString("zh-CN", { hour12: false });
  const items = state.rows.map((row) => pruneForOutput(exportObject(row.data)));
  const body = items.map((item) => "  " + toJsLiteral(item, 2)).join(",\n");
  return (
    "/* Lightbox · 器材清单（由 tools/gear-editor.html 生成 · " + stamp + "）\n" +
    "   直接替换 src/data/gear.js 里的 GEAR 数组声明即可。 */\n" +
    "export const GEAR = [\n" +
    (body ? body : "") +
    (body ? "\n" : "") +
    "];\n"
  );
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    /* 回退到 execCommand */
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "readonly");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (err) {
    ok = false;
  }
  area.remove();
  return ok;
}

/* ---------------------------------------------------------------- 粘贴 */

function analyzePaste() {
  const text = dom.pasteText.value.replace(/^\ufeff/, "");
  if (!text.trim()) return null;
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (!rows.length) return null;

  const mode = dom.pasteMode.value;
  let headerMode = false;
  if (mode === "header") headerMode = true;
  else if (mode === "auto") {
    headerMode = rows[0].map(mapHeader).filter(Boolean).length >= 3;
  }

  let mapping = null;
  let dataRows = rows;
  if (headerMode) {
    mapping = rows[0].map(mapHeader);
    dataRows = rows.slice(1);
  }

  const records = dataRows.map((cells) => {
    const record = {};
    cells.forEach((cell, index) => {
      const key = headerMode ? mapping[index] : FIELD_KEYS[index];
      if (key && toStr(cell) !== "") record[key] = cell;
    });
    return record;
  });

  return { delimiter, headerMode, mapping, rows, records };
}

function updatePasteInfo() {
  const info = analyzePaste();
  if (!info) {
    dom.pasteInfo.textContent = "0 行";
    return;
  }
  const kind = info.delimiter === "\t" ? "TSV" : "CSV";
  const mode = info.headerMode ? "表头映射" : "固定列序";
  const cols = info.rows[0] ? info.rows[0].length : 0;
  dom.pasteInfo.textContent = kind + " · " + mode + " · " + info.records.length + " 行 × " + cols + " 列";
}

function openPasteModal(text) {
  if (typeof text === "string") dom.pasteText.value = text;
  dom.pasteModal.hidden = false;
  window.requestAnimationFrame(() => dom.pasteModal.classList.add("is-open"));
  updatePasteInfo();
  window.setTimeout(() => dom.pasteText.focus(), 60);
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  window.setTimeout(() => {
    if (!modal.classList.contains("is-open")) modal.hidden = true;
  }, 180);
}

function openCodeModal(snippet) {
  dom.codeOut.textContent = snippet;
  dom.codeModal.hidden = false;
  window.requestAnimationFrame(() => dom.codeModal.classList.add("is-open"));
}

function applyPaste() {
  const info = analyzePaste();
  if (!info || !info.records.length) {
    showToast("没有可解析的行，先粘贴 Excel 区域", "warn");
    return;
  }
  const checked = document.querySelector('input[name="pasteApply"]:checked');
  const replace = checked && checked.value === "replace";
  pushHistory(replace ? "粘贴（替换）" : "粘贴（追加）");
  const incoming = info.records.map((record) => ({ uid: nextUid(), data: normalizeData(record) }));
  state.rows = replace ? incoming : state.rows.concat(incoming);
  renderRows();
  dom.pasteText.value = "";
  closeModal(dom.pasteModal);
  showToast("已粘贴 " + incoming.length + " 行 · " + (replace ? "替换全部" : "追加"), "ok");
}

/* ---------------------------------------------------------------- 导入 */

function importRecords(records, sourceLabel) {
  if (!records.length) {
    showToast(sourceLabel + " 里没有可导入的行", "warn");
    return;
  }
  pushHistory(sourceLabel);
  state.rows = records.map((record) => ({ uid: nextUid(), data: normalizeData(record) }));
  renderRows();
  showToast("已导入 " + records.length + " 件（替换当前列表）· 可点「恢复」撤销", "ok");
}

async function handleJsonFile(file) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && (parsed.gear || parsed.rows || parsed.items);
    if (!Array.isArray(list)) throw new Error("没有找到器材数组");
    importRecords(list, "导入 JSON");
  } catch (err) {
    showToast("JSON 解析失败：" + err.message, "bad");
  }
}

async function handleCsvFile(file) {
  try {
    const text = (await file.text()).replace(/^\ufeff/, "");
    const rows = parseDelimited(text, detectDelimiter(text));
    if (!rows.length) throw new Error("文件为空");
    const mapping = rows[0].map(mapHeader);
    const hasHeader = mapping.filter(Boolean).length >= 3;
    const bodyRows = hasHeader ? rows.slice(1) : rows;
    const records = bodyRows.map((cells) => {
      const record = {};
      cells.forEach((cell, index) => {
        const key = hasHeader ? mapping[index] : FIELD_KEYS[index];
        if (key && toStr(cell) !== "") record[key] = cell;
      });
      return record;
    });
    importRecords(records, "导入 CSV");
  } catch (err) {
    showToast("CSV 解析失败：" + err.message, "bad");
  }
}

/* ------------------------------------------------------------------ Toast */

let toastTimer = 0;
function showToast(message, tone) {
  dom.toast.textContent = message;
  dom.toast.className = "toast is-visible" + (tone ? " toast--" + tone : "");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    dom.toast.className = "toast";
  }, 3400);
}

/* ------------------------------------------------------------------ 事件 */

const onCellInput = (event) => {
  const target = event.target;
  if (!target || !target.dataset || !target.dataset.field) return;
  const tr = target.closest("tr");
  if (!tr || tr.dataset.index === undefined) return;
  const index = Number(tr.dataset.index);
  const row = state.rows[index];
  if (!row) return;
  const field = target.dataset.field;
  const column = COL_BY_KEY.get(field);
  if (!column) return;

  if (column.type === "tags") row.data.tags = parseTags(target.value);
  else if (column.type === "specs") row.data.specs = parseSpecs(target.value);
  else row.data[field] = target.value;

  if (field === "cat") {
    const formSelect = tr.querySelector('[data-field="form"]');
    const nextCat = target.value;
    let nextForm = "";
    if (nextCat === "lens" && (!row.data.form || row.data.form === "accessory")) nextForm = "lens";
    else if (nextCat === "accessory" && row.data.form === "lens") nextForm = "accessory";
    if (nextForm) {
      row.data.form = nextForm;
      if (formSelect) {
        formSelect.value = nextForm;
        formSelect.title = labelFor("form", nextForm);
      }
    }
  }

  queueValidate();
  scheduleSave();
};

const onCellBlur = (event) => {
  const target = event.target;
  if (!target || !target.dataset || !target.dataset.field) return;
  const tr = target.closest("tr");
  if (!tr || tr.dataset.index === undefined) return;
  const row = state.rows[Number(tr.dataset.index)];
  if (!row) return;
  const field = target.dataset.field;
  if (field === "tags") target.value = formatTags(row.data.tags);
  else if (field === "specs") target.value = formatSpecs(row.data.specs);
  else if (field === "year") target.value = toStr(row.data.year);
};

const onGridClick = (event) => {
  const button = event.target.closest("[data-act]");
  if (!button) return;
  const tr = button.closest("tr");
  if (!tr) return;
  const index = Number(tr.dataset.index);
  const act = button.dataset.act;
  if (act === "up") moveRow(index, -1);
  else if (act === "down") moveRow(index, 1);
  else if (act === "dup") duplicateRow(index);
  else if (act === "del") deleteRow(index);
};

function bindEvents() {
  dom.gridBody.addEventListener("input", onCellInput);
  dom.gridBody.addEventListener("change", onCellInput);
  dom.gridBody.addEventListener("focusout", onCellBlur, true);
  dom.gridBody.addEventListener("click", onGridClick);

  dom.addRow.addEventListener("click", addRow);
  dom.loadSite.addEventListener("click", loadSiteData);
  dom.undo.addEventListener("click", undo);
  dom.clearDraft.addEventListener("click", clearDraft);

  dom.paste.addEventListener("click", () => openPasteModal(""));
  dom.pasteText.addEventListener("input", debounce(updatePasteInfo, 120));
  dom.pasteMode.addEventListener("change", updatePasteInfo);
  dom.pasteCancel.addEventListener("click", () => closeModal(dom.pasteModal));
  dom.pasteApply.addEventListener("click", applyPaste);

  dom.importJson.addEventListener("click", () => dom.fileJson.click());
  dom.importCsv.addEventListener("click", () => dom.fileCsv.click());
  dom.fileJson.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) handleJsonFile(file);
    event.target.value = "";
  });
  dom.fileCsv.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) handleCsvFile(file);
    event.target.value = "";
  });

  dom.exportJson.addEventListener("click", () => {
    downloadFile("gear.json", buildJson(), "application/json;charset=utf-8");
    showToast("已下载 gear.json · " + state.rows.length + " 件", "ok");
  });

  dom.exportCsv.addEventListener("click", () => {
    downloadFile("器材清单.csv", buildCsv(), "text/csv;charset=utf-8");
    showToast("已下载 CSV · " + state.rows.length + " 行", "ok");
  });

  dom.copyJs.addEventListener("click", async () => {
    const snippet = buildJsSnippet();
    openCodeModal(snippet);
    const ok = await copyText(snippet);
    showToast(ok ? "已复制 GEAR 代码 · 可直接替换 src/data/gear.js 的数组" : "代码已生成，请手动复制", ok ? "ok" : "warn");
  });

  dom.codeCopy.addEventListener("click", async () => {
    const ok = await copyText(dom.codeOut.textContent);
    showToast(ok ? "已复制到剪贴板" : "复制失败，请手动选择", ok ? "ok" : "warn");
  });

  dom.codeDownload.addEventListener("click", () => {
    downloadFile("gear.generated.js", dom.codeOut.textContent, "text/javascript;charset=utf-8");
    showToast("已下载 gear.generated.js", "ok");
  });

  dom.codeClose.addEventListener("click", () => closeModal(dom.codeModal));

  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close]")) closeModal(modal);
    });
  });

  dom.errorList.addEventListener("click", (event) => {
    const button = event.target.closest(".err-item");
    if (!button) return;
    focusCell(Number(button.dataset.index), button.dataset.field);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $$(".modal").forEach((modal) => {
        if (!modal.hidden) closeModal(modal);
      });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      const active = document.activeElement;
      if (active && active.matches("input, textarea, select")) return;
      event.preventDefault();
      undo();
    }
  });

  window.addEventListener("paste", (event) => {
    const active = document.activeElement;
    if (active && active.closest && active.closest(".modal")) return;
    if (active && active.matches("input, textarea, select")) return;
    const text = event.clipboardData && event.clipboardData.getData("text/plain");
    if (!text || !text.trim()) return;
    event.preventDefault();
    openPasteModal(text);
  });

  window.addEventListener("pagehide", () => saveDraft());
}

/* ------------------------------------------------------------------ 启动 */

function boot() {
  buildGrid();
  bindEvents();

  const draft = readDraft();
  if (draft && draft.rows.length) {
    state.rows = draft.rows.map((data) => ({ uid: nextUid(), data: normalizeData(data) }));
    renderRows();
    updateSavedLabel(draft.savedAt);
    showToast("已从本地草稿恢复 " + state.rows.length + " 件", "ok");
  } else {
    const result = siteRows();
    state.rows = result.rows;
    renderRows();
    if (result.filledTotal) {
      showToast(
        "已载入站点数据 " + result.rows.length + " 件 · 自动推断 " + result.filledTotal + " 个缺失字段",
        "ok"
      );
    }
  }
}

window.__gearEditor = {
  snapshot: () => ({
    rows: state.rows.length,
    errors: validateRows().errors.length,
    history: state.history.length,
    rowsData: state.rows.map((row) => row.data),
  }),
  validate: () => validateRows(),
};

boot();
