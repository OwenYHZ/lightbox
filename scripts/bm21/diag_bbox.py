import bpy, json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"E:/code/dshCode/Lightbox/scripts/bm21/bm21.blend")
S = 0.001
rows = {}
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
    rows[o.name] = {"x": [round(min(w.x for w in ws)/S,2), round(max(w.x for w in ws)/S,2)],
                    "y": [round(min(w.y for w in ws)/S,2), round(max(w.y for w in ws)/S,2)],
                    "z": [round(min(w.z for w in ws)/S,2), round(max(w.z for w in ws)/S,2)]}
bysort = {
 "ymin": sorted(rows, key=lambda k: rows[k]["y"][0])[:4],
 "ymax": sorted(rows, key=lambda k: -rows[k]["y"][1])[:4],
 "zmin": sorted(rows, key=lambda k: rows[k]["z"][0])[:4],
 "zmax": sorted(rows, key=lambda k: -rows[k]["z"][1])[:4],
}
out = {"names": {k: [(n, rows[n]) for n in v] for k, v in bysort.items()}}
open(r"E:/code/dshCode/Lightbox/scripts/bm21/_bbox.json","w",encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=1))
print("HEADLESS " + json.dumps({"n": len(rows)}))
