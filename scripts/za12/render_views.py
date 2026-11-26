# -*- coding: utf-8 -*-
"""渲染 ZA12 六视图（米制单位）。"""
import bpy, math, os
from mathutils import Vector

OUT = r"E:/code/dshCode/Lightbox/shots/za12"
os.makedirs(OUT, exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.cycles.transmission_bounces = 8
scene.render.resolution_x = 760
scene.render.resolution_y = 760
scene.render.film_transparent = False
scene.view_settings.look = 'AgX - Medium High Contrast'

world = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new("W")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.55, 0.55, 0.57, 1.0)
bg.inputs[1].default_value = 1.0

for o in list(scene.objects):
    if o.type in {'LIGHT', 'CAMERA'}:
        bpy.data.objects.remove(o, do_unlink=True)

def area(name, loc, rot, energy, size):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = energy
    d.size = size
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = rot
    scene.collection.objects.link(o)

area("key",  (-0.16, -0.22, 0.26), (math.radians(52), 0, math.radians(-32)), 3.0, 0.24)
area("fill", (0.22, -0.16, 0.12),  (math.radians(70), 0, math.radians(58)), 0.7, 0.26)
area("rim",  (0.06, 0.24, 0.18),   (math.radians(115), 0, math.radians(168)), 0.9, 0.2)

cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 0.098

TARGET = Vector((0, 0, 0.018))
views = {
    "front":  ((0, -0.3, 0.018), (math.pi/2, 0, 0)),
    "back":   ((0,  0.3, 0.018), (math.pi/2, 0, math.pi)),
    "left":   ((-0.3, 0, 0.018), (math.pi/2, 0, -math.pi/2)),
    "right":  ((0.3, 0, 0.018),  (math.pi/2, 0, math.pi/2)),
    "top":    ((0, 0, 0.3),      (0, 0, 0)),
    "top-p1": ((0, 0, 0.3),      (0, 0, math.pi)),
    "bottom": ((0, 0, -0.3),     (math.pi, 0, 0)),
}
for name, (loc, rot) in views.items():
    cam.location = loc
    cam.rotation_euler = rot
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)

cam_data.type = 'PERSP'
cam_data.lens = 85
cam.location = (0.12, -0.17, 0.095)
cam.rotation_euler = (TARGET - Vector(cam.location)).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = os.path.join(OUT, "hero.png")
bpy.ops.render.render(write_still=True)
print("RENDER_DONE")
