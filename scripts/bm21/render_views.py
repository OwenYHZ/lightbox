# -*- coding: utf-8 -*-
"""BM-21 六视图 Cycles CPU 渲染（front/top/back/bottom/quarter/side）。"""
import bpy, math, os, json, sys
from mathutils import Vector

ROOT = r"E:/code/dshCode/Lightbox"
BLEND = ROOT + "/scripts/bm21/bm21.blend"
OUT = ROOT + "/shots/bm21"
os.makedirs(OUT, exist_ok=True)

SAMPLES = int(os.environ.get("BM21_SAMPLES", "96"))
TAG = os.environ.get("BM21_TAG", "v1")
RES = int(os.environ.get("BM21_RES", "1000") or 0)

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene

# ---------------- 渲染设置
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
scene.cycles.max_bounces = 8
scene.cycles.transmission_bounces = 8
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.render.film_transparent = True
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0.0

# ---------------- 世界（白背景）
world = bpy.data.worlds.new("W") if not scene.world else scene.world
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.93, 0.93, 0.94, 1.0)
bg.inputs[1].default_value = 0.80

# ---------------- 灯光（柔和棚拍）
def area(name, loc, size, power, target=(0, 0, 31.5), color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = power
    d.size = size
    d.color = color
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = (loc[0] * 0.001, loc[1] * 0.001, loc[2] * 0.001)
    dirv = Vector((target[0] * 0.001, target[1] * 0.001, target[2] * 0.001)) - o.location
    o.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()
    return o

for o in list(scene.objects):
    if o.type == 'LIGHT':
        bpy.data.objects.remove(o, do_unlink=True)
area("Key", (-320, -420, 420), 420, 250)
area("Fill", (380, -300, 120), 360, 85)
area("Top", (60, -120, 520), 380, 105)
area("Rim", (40, 480, 300), 320, 130)

# ---------------- 相机
def make_cam(name, loc, rot, ortho=None, lens=70):
    cd = bpy.data.cameras.new(name)
    if ortho:
        cd.type = 'ORTHO'
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    o = bpy.data.objects.new(name, cd)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    return o

R = math.radians
DIST = 600
views = {}
views["front"] = (make_cam("C_front", (0, -DIST * 0.001, 31.5 * 0.001), (R(90), 0, 0), ortho=0.118), 1000, 700)
views["top"] = (make_cam("C_top", (0, 0, 400 * 0.001), (0, 0, R(180)), ortho=0.118), 1000, 420)
views["back"] = (make_cam("C_back", (0, DIST * 0.001, 31.5 * 0.001), (R(90), 0, R(180)), ortho=0.118), 1000, 700)
views["bottom"] = (make_cam("C_bottom", (0, 0, -400 * 0.001), (R(180), 0, 0), ortho=0.118), 1000, 420)
views["side"] = (make_cam("C_side", (DIST * 0.001, 0, 31.5 * 0.001), (R(90), 0, R(90)), ortho=0.118), 1000, 700)
qc = make_cam("C_quarter", (-158 * 0.001, -228 * 0.001, 168 * 0.001), (0, 0, 0), lens=95)
tgt = Vector((0.0, 0.0, 31.5 * 0.001))
qc.rotation_euler = (tgt - qc.location).to_track_quat('-Z', 'Y').to_euler()
views["quarter"] = (qc, 1000, 700)

ONLY = [v for v in os.environ.get("BM21_VIEWS", "").split(",") if v]
results = {}
for name, (cam, rw, rh) in views.items():
    if ONLY and name not in ONLY:
        continue
    if RES:
        sc = RES / float(rw)
        rw, rh = int(rw * sc), int(rh * sc)
    scene.camera = cam
    scene.render.resolution_x = rw
    scene.render.resolution_y = rh
    scene.render.filepath = os.path.join(OUT, "%s-%s.png" % (TAG, name))
    bpy.ops.render.render(write_still=True)
    results[name] = scene.render.filepath
    print("rendered", name)

print("HEADLESS " + json.dumps({"renders": results}))