(() => {
  const parse = (c) => {
    const m = c.replace(/\s/g, "").match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const A = lum(a), B = lum(b);
    const hi = Math.max(A, B), lo = Math.min(A, B);
    return (hi + 0.05) / (lo + 0.05);
  };
  const bgOf = (el) => {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement.parentNode) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    let acc = { r: 10, g: 10, b: 10, a: 1 };
    for (let i = stack.length - 1; i >= 0; i -= 1) acc = over(stack[i], acc);
    return acc;
  };

  const fails = [];
  const rated = [];
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own.length) continue;
    const text = own.map((n) => n.textContent.trim()).join(" ").slice(0, 32);
    if (!text) continue;
    if (el.closest("[hidden]")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    let colorNode = el;
    let fg = parse(getComputedStyle(colorNode).color);
    while (fg && fg.a === 0 && colorNode.parentElement) {
      colorNode = colorNode.parentElement;
      fg = parse(getComputedStyle(colorNode).color);
    }
    if (!fg) continue;
    const bg = bgOf(el);
    const r = ratio(over(fg, bg), bg);
    const size = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    const weight = Number(cs.fontWeight) || 400;
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
    const cls = String(el.className || "").trim().split(/\s+/)[0];
    const entry = { sel: el.tagName.toLowerCase() + (cls ? "." + cls : ""), text, size, ratio: Math.round(r * 100) / 100 };
    rated.push(entry);
    if (r + 0.0005 < need) fails.push({ ...entry, need });
  }
  return { fails, scanned: rated.length, lowest: rated.sort((a, b) => a.ratio - b.ratio).slice(0, 8) };
})()
