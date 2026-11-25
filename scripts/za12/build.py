# -*- coding: utf-8 -*-
"""ZENIKO ZA12 v4 —— 按实测量测书重建，带丝印贴图（顶板 / 底面）。"""
import bpy, bmesh, math, os
from mathutils import Vector

S = 0.001
# ---- 实测尺寸（mm）
W, D = 55.6, 46.5
BASE_H, TOP_H = 3.9, 23.6
CORNER = 6.0
PLATE_W, PLATE_D, PLATE_T = 49.5, 44.0, 1.7
PLATE_PROUD = 1.5
PLATE_R = 3.0
DIAL_R, DIAL_H, DIAL_X, DIAL_Y, DIAL_TEETH = 8.0, 3.5, 12.7, 13.75, 120
WIN_W, WIN_H, WIN_X, WIN_Z, WIN_DEPTH = 26.7, 7.6, -2.8, 10.6, 1.0
SENSOR_R, SENSOR_X, SENSOR_Z = 2.3, 17.4, 10.4
SHOE_X, SHOE_W, SHOE_D = -8.1, 19.0, 17.0
USB_W, USB_H, USB_Z = 7.0, 2.8, 14.6

ROOT = r"E:/code/dshCode/Lightbox"
OUT_DIR = ROOT + "/public/assets/models"
BLEND_DIR = ROOT + "/scripts/za12"
TEX_TOP = ROOT + "/scripts/za12/tex/top.jpg"
TEX_BOTTOM = ROOT + "/scripts/za12/tex/bottom.jpg"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, color, metallic=0.0, roughness=0.5, transmission=0.0, alpha=1.0, ior=1.45):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in b.inputs: b.inputs["Transmission Weight"].default_value = transmission
    if "IOR" in b.inputs: b.inputs["IOR"].default_value = ior
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha; m.blend_method = 'BLEND'
    return m

def textured(name, image, metallic, roughness):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image, check_existing=True)
    tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m

M_SILVER = mat("ZA12_silver", (0.52, 0.53, 0.545), 1.0, 0.36)
M_PLATE  = textured("ZA12_plate", TEX_TOP, 0.35, 0.5)
M_BASE   = textured("ZA12_base_tex", TEX_BOTTOM, 0.1, 0.6)
M_BASE_SIDE = mat("ZA12_base_side", (0.012, 0.013, 0.015), 0.0, 0.6)
M_DIAL   = mat("ZA12_dial", (0.66, 0.67, 0.68), 1.0, 0.26)
M_DIFF   = mat("ZA12_diffuser", (0.80, 0.77, 0.70), 0.0, 0.55, transmission=0.3, alpha=0.95)
M_GLASS  = mat("ZA12_glass", (1.0, 0.99, 0.96), 0.0, 0.05, transmission=1.0, alpha=0.35, ior=1.5)
M_SHOE   = mat("ZA12_shoe", (0.48, 0.49, 0.50), 1.0, 0.3)
M_DARK   = mat("ZA12_dark", (0.006, 0.006, 0.008), 0.1, 0.7)
M_TUBE   = mat("ZA12_tube", (0.55, 0.53, 0.46), 0.0, 0.45, transmission=0.2, alpha=0.95)

def smooth(a=35):
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(a))

def bevel(obj, width_mm, seg=3):
    md = obj.modifiers.new("b", 'BEVEL'); md.width = width_mm*S; md.segments = seg
    md.limit_method = 'ANGLE'; md.angle_limit = math.radians(30)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=md.name)

def rounded_points(w, d, r, seg=12):
    pts, hw, hd = [], w/2 - r, d/2 - r
    for cx, cy, a0 in [(hw, hd, 0), (-hw, hd, 90), (-hw, -hd, 180), (hw, -hd, 270)]:
        for i in range(seg + 1):
            a = math.radians(a0 + i * 90.0 / seg)
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts

def prism(name, w, d, z0, z1, r, material, edge_bevel=1.0, seg=12, flip_v=False):
    bm = bmesh.new()
    vs = [bm.verts.new((x*S, y*S, z0*S)) for x, y in rounded_points(w, d, r, seg)]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, (z1 - z0) * S)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    # 平面 UV（顶/底面对应整张图）
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            u = v.x / (w * S) + 0.5
            vv = v.y / (d * S) + 0.5
            if flip_v: vv = 1.0 - vv
            uv.data[li].uv = (u, vv)
    if edge_bevel: bevel(o, edge_bevel, 3)
    smooth()
    return o

def rbox(name, w, d, h, loc, radius, material, seg=4):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(loc[0]*S, loc[1]*S, loc[2]*S))
    o = bpy.context.object; o.name = name
    o.scale = (w*S, d*S, h*S)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel(o, radius, seg)
    o.data.materials.append(material)
    smooth()
    return o

def cyl(name, r, h, loc, material, verts=96, b=0.0, axis='Z'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r*S, depth=h*S,
                                        location=(loc[0]*S, loc[1]*S, loc[2]*S))
    o = bpy.context.object; o.name = name
    if axis == 'X': o.rotation_euler = (0, math.pi/2, 0)
    if axis == 'Y': o.rotation_euler = (math.pi/2, 0, 0)
    if b: bevel(o, b, 2)
    o.data.materials.append(material)
    smooth(40)
    return o

def dial(name, cx, cy, r, h, teeth, depth, material):
    bm = bmesh.new(); n = teeth * 2
    bot, top = [], []
    for i in range(n):
        a = i / n * math.tau
        rr = (r - (depth if i % 2 else 0.0)) * S
        bot.append(bm.verts.new((math.cos(a)*rr, math.sin(a)*rr, 0)))
        top.append(bm.verts.new((math.cos(a)*rr, math.sin(a)*rr, h*S)))
    for i in range(n):
        j = (i+1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bm.faces.new(tuple(reversed(bot))); bm.faces.new(tuple(top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.location = (cx*S, cy*S, (TOP_H + PLATE_PROUD - 0.3) * S)
    o.data.materials.append(material)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bevel(o, 0.18, 2); smooth(30)
    return o

# ---- 机身
base = prism("Base", W, D, 0, BASE_H, CORNER, M_BASE_SIDE, 0.8, flip_v=True)
base.data.materials.append(M_BASE)
for poly in base.data.polygons:
    if poly.normal.z < -0.5:
        poly.material_index = 1
silver = prism("Body", W, D, BASE_H, TOP_H, CORNER, M_SILVER, 1.1)
rim = prism("PlateRim", PLATE_W + 2.6, PLATE_D + 2.6, TOP_H - 0.2, TOP_H + 0.35, PLATE_R + 0.6, M_SILVER, 0.35)
plate = prism("TopPlate", PLATE_W, PLATE_D, TOP_H - 0.1, TOP_H + PLATE_PROUD, PLATE_R, M_PLATE, 0.45)

# ---- 拨盘
for name, cx in (("DialLeft", -DIAL_X), ("DialRight", DIAL_X)):
    dial(name, cx, DIAL_Y, DIAL_R, DIAL_H, DIAL_TEETH, 0.26, M_DIAL)
    rbox(name + "_slot", DIAL_R * 0.95, 0.8, 0.2,
         (cx, DIAL_Y, TOP_H + PLATE_PROUD + DIAL_H - 0.12), 0.3, M_DARK, 3)

# ---- 正面窗（凹槽）
cutter = rbox("WinCut", WIN_W, 5.0, WIN_H, (WIN_X, -D/2 + 0.8, WIN_Z), 1.6, M_DARK, 4)
bpy.context.view_layer.objects.active = silver
md = silver.modifiers.new("cut", 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter
bpy.ops.object.modifier_apply(modifier=md.name)
bpy.data.objects.remove(cutter, do_unlink=True)

rbox("Cavity", WIN_W - 0.4, 1.2, WIN_H - 0.4, (WIN_X, -D/2 + 1.3, WIN_Z), 1.5, M_DARK, 3)
rbox("Diffuser", WIN_W - 2.4, 0.6, WIN_H - 2.4, (WIN_X, -D/2 + 1.8, WIN_Z), 1.2, M_DIFF, 3)
cyl("Tube", 2.0, WIN_W - 10.0, (WIN_X, -D/2 + 2.1, WIN_Z), M_TUBE, 40, 0.12, 'X')
for i in range(9):
    x = WIN_X - (WIN_W - 7.0)/2 + i * (WIN_W - 7.0)/8.0
    rbox("Rib%d" % i, 0.42, 0.45, WIN_H - 3.0, (x, -D/2 + 2.4, WIN_Z), 0.1, M_SILVER, 2)
rbox("WinGlass", WIN_W - 1.8, 0.3, WIN_H - 1.8, (WIN_X, -D/2 + 0.6, WIN_Z), 1.4, M_GLASS, 3)

# ---- 传感器
cyl("SensorHole", SENSOR_R, 1.0, (SENSOR_X, -D/2 + 0.45, SENSOR_Z), M_DARK, 40, 0.12, 'Y')
cyl("SensorRim", SENSOR_R + 0.45, 0.35, (SENSOR_X, -D/2 + 0.18, SENSOR_Z), M_SILVER, 40, 0.08, 'Y')

# ---- 热靴（左偏）
rbox("ShoePlate", 30.0, 22.0, 1.2, (SHOE_X, 0, -0.6), 0.5, M_DARK, 3)
rbox("ShoeFoot", SHOE_W, SHOE_D, 4.2, (SHOE_X, 0, -3.3), 0.45, M_DARK, 3)
rbox("ShoeRailL", 1.3, SHOE_D + 4.0, 0.9, (SHOE_X - SHOE_W/2 + 0.65, 0, -2.0), 0.15, M_SHOE, 2)
rbox("ShoeRailR", 1.3, SHOE_D + 4.0, 0.9, (SHOE_X + SHOE_W/2 - 0.65, 0, -2.0), 0.15, M_SHOE, 2)
cyl("ShoeContact", 1.3, 0.6, (SHOE_X, 0, -5.5), M_SHOE, 24, 0.06, 'Z')

# ---- USB-C（右面）
uc = rbox("UsbCut", 3.4, USB_W, USB_H, (W/2, 0, USB_Z), 1.2, M_DARK, 4)
md2 = silver.modifiers.new("usb", 'BOOLEAN'); md2.operation = 'DIFFERENCE'; md2.object = uc
bpy.ops.object.modifier_apply(modifier=md2.name)
bpy.data.objects.remove(uc, do_unlink=True)
rbox("UsbPort", 1.6, USB_W - 0.8, USB_H - 0.6, (W/2 - 0.35, 0, USB_Z), 1.1, M_DARK, 4)

# ---- 背面电源图标（几何）
bpy.ops.mesh.primitive_torus_add(major_radius=3.0*S, minor_radius=0.35*S,
  location=(0, (D/2 + 0.05) * S, 18.0 * S), rotation=(math.pi/2, 0, 0))
ring = bpy.context.object; ring.name = "PowerRing"; ring.data.materials.append(M_DARK); smooth(40)
rbox("PowerBar", 0.6, 0.25, 3.2, (0, D/2 + 0.05, 19.9), 0.1, M_DARK, 2)

# ---- 导出
bpy.ops.object.select_all(action='SELECT')
glb = os.path.join(OUT_DIR, "zeniko-za12.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False,
                          export_apply=True, export_yup=True, export_materials='EXPORT',
                          export_image_format='AUTO')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, "za12.blend"))
print("GLB_BYTES", os.path.getsize(glb))
