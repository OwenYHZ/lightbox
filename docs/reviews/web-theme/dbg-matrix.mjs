import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("E:\\code\\dshCode\\Lightbox\\docs\\reviews\\web-theme\\evidence\\audit-src-a.json", "utf8"));
const t = d.tokens["src/light/amber"];
console.log("paper-faint raw =", t["--paper-faint"], "| paper-dim =", t["--paper-dim"], "| ink-1 =", t["--ink-1"], "| accent =", t["--accent"]);
for (const row of t.matrix) console.log(row.ratio + "\t" + row.need + "\t" + (row.fail ? "FAIL" : "ok") + "\t" + row.label);
