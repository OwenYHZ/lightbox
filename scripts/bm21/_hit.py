import bpy, json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"E:/code/dshCode/Lightbox/scripts/bm21/bm21.blend")
S = 0.001
hits = []
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    ws = [o.matrix_world @ Vector(c) for c in o.bound_box]
    xs = [w.x/S for w in ws]; ys = [w.y/S for w in ws]; zs = [w.z/S for w in ws]
    # 底面附近且在 X -20..0
    if zs[0] < 1.5 and xs[0] < 0 and xs[1] > -20:
        hits.append((o.name, [round(min(xs),1), round(max(xs),1)], [round(min(ys),1), round(max(ys),1)], [round(min(zs),1), round(max(zs),1)]))
print("HITS", json.dumps(hits, ensure_ascii=False))
zs_all = []
for o in bpy.context.scene.objects:
    if o.type != 'MESH':
        continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        zs_all.append(round(w.z/S, 2))
print("ZMIN objs:", sorted(zs_all)[:6])
