import bpy, json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"E:/code/dshCode/Lightbox/scripts/bm21/bm21.blend")
S = 0.001
dg = bpy.context.evaluated_depsgraph_get()
scene = bpy.context.scene
lines = []
for x_mm in range(-24, 26, 2):
    row = []
    for y_mm in (0,):
        org = Vector((x_mm * S, y_mm * S, -0.3))
        hit, loc, nrm, idx, obj, mat = scene.ray_cast(dg, org, Vector((0, 0, 1)))
        row.append("%d:%s@%.2f" % (x_mm, (obj.name[:12] if hit else "-"), (loc.z/S if hit else 0)))
    lines.append(" ".join(row))
open(r"E:/code/dshCode/Lightbox/scripts/bm21/_ray.txt", "w").write("\n".join(lines))
print("HEADLESS ok")
