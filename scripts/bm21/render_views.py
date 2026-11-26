# -*- coding: utf-8 -*-
"""BM-21 多视角渲染：8 视角 + 4 特写（Cycles CPU）。"""
import bpy, math, os, json
from mathutils import Vector

ROOT = r"E:/code/dshCode/Lightbox"
BLEND = ROOT + "/scripts/bm21/bm21.blend"
OUT = ROOT + "/shots/bm21"
os.makedirs(OUT, exist_ok=True)

SAMPLES = int(os.environ.get("BM21_SAMPLES", "64"))
TAG = os.environ.get("BM21_TAG", "v17")
ONLY = [v for v in os.environ.get("BM21_VIEWS", "").split(",") if v]
W = int(os.environ.get("BM21_RES", "900"))

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
scene.cycles.max_bounces = 8
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'

world = bpy.data.worlds.new("W") if not scene.world else scene.world
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.93, 0.93, 0.94, 1.0)
bg.inputs[1].default_value = 1.15

for o in list(scene.objects):
    if o.type == 'LIGHT':
        bpy.data.objects.remove(o, do_unlink=True)


def area(name, loc, size, power, target=(0, 0, 31.5)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = power; d.size = size
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o)
    o.location = (loc[0] * 0.001, loc[1] * 0.001, loc[2] * 0.001)
    dv = Vector((target[0] * 0.001, target[1] * 0.001, target[2] * 0.001)) - o.location
    o.rotation_euler = dv.to_track_quat('-Z', 'Y').to_euler()
    return o


area("Front", (0, -520, 260), 620, 262)
area("Key", (-320, -420, 420), 420, 340)
area("Fill", (380, -300, 120), 360, 110)
area("Top", (60, -120, 520), 380, 130)
area("Rim", (40, 480, 300), 320, 170)
area("Bottom", (0, 0, -420), 400, 70, (0, 0, 0))

R = math.radians


def ortho_cam(name, loc, rot, scale):
    cd = bpy.data.cameras.new(name); cd.type = 'ORTHO'; cd.ortho_scale = scale * 0.001
    cd.clip_start = 0.001; cd.clip_end = 10.0
    o = bpy.data.objects.new(name, cd); scene.collection.objects.link(o)
    o.location = (loc[0] * 0.001, loc[1] * 0.001, loc[2] * 0.001)
    o.rotation_euler = rot
    return o


def persp_cam(name, loc, target, lens=95):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.001; cd.clip_end = 10.0
    o = bpy.data.objects.new(name, cd); scene.collection.objects.link(o)
    o.location = (loc[0] * 0.001, loc[1] * 0.001, loc[2] * 0.001)
    dv = Vector((target[0] * 0.001, target[1] * 0.001, target[2] * 0.001)) - o.location
    o.rotation_euler = dv.to_track_quat('-Z', 'Y').to_euler()
    return o


D = 600
VIEWS = [
    ("front", ortho_cam("C_f", (0, -D, 31.5), (R(90), 0, 0), 118), 900, 700),
    ("back", ortho_cam("C_b", (0, D, 31.5), (R(90), 0, R(180)), 118), 900, 700),
    ("left", ortho_cam("C_l", (D, 0, 31.5), (R(90), 0, R(90)), 118), 900, 700),
    ("right", ortho_cam("C_r", (-D, 0, 31.5), (R(90), 0, R(-90)), 118), 900, 700),
    ("top", ortho_cam("C_t", (0, 0, 400), (0, 0, R(180)), 118), 900, 420),
    ("bottom", ortho_cam("C_bo", (0, 0, -400), (R(180), 0, 0), 118), 900, 420),
    ("quarter-fl", persp_cam("C_qfl", (-150, -215, 160), (0, 0, 30)), 900, 700),
    ("quarter-br", persp_cam("C_qbr", (150, 215, 160), (0, 0, 30)), 900, 700),
    # ---- 特写
    ("close-lens", ortho_cam("C_cl", (-1.5, -300, 24.4), (R(90), 0, 0), 40), 1200, 1200),
    ("close-top", ortho_cam("C_ct", (-14, 1, 300), (0, 0, R(180)), 62), 1200, 1000),
    ("close-grip", ortho_cam("C_cg", (-26, -300, 33), (R(90), 0, 0), 52), 1200, 1200),
    ("close-bottom", ortho_cam("C_cb", (6, 0, -300), (R(180), 0, 0), 74), 1200, 820),
]

res = {}
for name, cam, rw, rh in VIEWS:
    if ONLY and name not in ONLY:
        continue
    scene.camera = cam
    sc = W / float(rw)
    scene.render.resolution_x = int(rw * sc)
    scene.render.resolution_y = int(rh * sc)
    scene.render.filepath = os.path.join(OUT, "%s-%s.png" % (TAG, name))
    bpy.ops.render.render(write_still=True)
    res[name] = scene.render.filepath
    print("rendered", name)

print("HEADLESS " + json.dumps({"tag": TAG, "renders": len(res)}))