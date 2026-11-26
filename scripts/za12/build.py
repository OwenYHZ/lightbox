# -*- coding: utf-8 -*-
"""ZENIKO ZA12 v7 —— 按官方图 p1/p2/p3/p5/p6 + 实拍六视图 + R1 评审清单重建。
坐标：X 宽（右正）、Y 深（前 -D/2，后 +D/2）、Z 高（0 = 机身底面，热靴向下为负）。
尺寸：W 55 / D 47 / 总高 36（= 拨盘面 24.7 + 热靴 11.3）。
"""
import bpy, bmesh, math, os
from mathutils import Vector

S = 0.001
W, D = 55.0, 47.0
TOTAL_H = 36.0
BODY_H = 23.6
BASE_H = 4.0
BASE_INSET = 0.20
CORNER = 7.5                  # 外壳竖棱圆角（用户目测 R7–8）
FILLET = 0.12                 # 侧面→顶面直角（仅 0.12 破边）

PLATE_SINK = 0.02             # 顶盖比壳顶低 0.02（视觉齐平，避开共面 z-fighting）
PLATE_MARGIN = 1.2            # 顶盖到外壳的银边宽（四边等宽）
PLATE_W, PLATE_D = 55.0 - 2 * PLATE_MARGIN, 47.0 - 2 * PLATE_MARGIN
PLATE_R = CORNER - PLATE_MARGIN   # 与外壳同圆心收敛（贴住外壳圆角）
PLATE_GAP = 0.17

DIAL_R = 12.0                 # 拨盘 Ø24.0（外缘 ±27.2：机身内 0.3、黑顶盖外 0.9）
DIAL_X = 15.2                 # 中心距 30.4（两盘净空 6.4，容 4.4 的槽 + 两侧各 1.0）
DIAL_Y = 23.2 - DIAL_R        # 盘心 Y = +11.2（盘后缘 23.2，超顶盖 0.9、机身内 0.3）
DIAL_BACK_D = 9.5             # 盘心距机身后缘（p6 + 实拍 222313：拨盘靠后）
DIAL_TOP = 24.7               # 盘面高（滚花露出 1.4）
DIAL_H = 2.0                  # 滚花圆柱高（用户实拍 2.0）
DIAL_BOT = DIAL_TOP - DIAL_H   # 22.70：其中 0.9 在顶面下、1.1 露出
DIAL_TEETH, DIAL_TOOTH = 180, 0.22   # Ø24 下齿距 0.42

WIN_CX, WIN_CZ = -2.2, 14.5
WIN_W, WIN_H, WIN_R = 26.7, 7.6, 1.6
WIN_FRAME_W, WIN_FRAME_H, WIN_FRAME_R = 29.1, 10.0, 2.6
WIN_FRAME_D = 1.0
WIN_DEPTH = 4.6
SENSOR_X, SENSOR_Z, SENSOR_R = 17.7, 14.6, 2.5

SLOT_W, SLOT_H, SLOT_Z = 4.4, 1.7, 11.7  # 更短；槽心与盘心(+11.8)同深度

BTN_X, BTN_Z, BTN_R, BTN_OUT = -0.5, 13.8, 3.8, 0.7

SHOE_X, SHOE_Y = -8.0, 4.7    # 222234 4096 原图 25.6px/mm：脚板心 −7.5 / +4.8
SHOE_MOUNT_W, SHOE_MOUNT_D = 17.0, 16.0
SHOE_FOOT_W, SHOE_FOOT_D = 19.0, 17.0
SHOE_BOT = -(TOTAL_H - DIAL_TOP)          # -11.3

BOT_PANEL_W, BOT_PANEL_D, BOT_PANEL_R = 50.0, 41.0, 4.5   # 四周银边 2.3
USB_Z = -0.2

ROOT = r"E:/code/dshCode/Lightbox"
OUT_DIR = ROOT + "/public/assets/models"
BLEND_DIR = ROOT + "/scripts/za12"
TEX = ROOT + "/scripts/za12/tex/"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mat(name, color, metallic=0.0, roughness=0.55, transmission=0.0, alpha=1.0, ior=1.45):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in b.inputs:
        b.inputs["Transmission Weight"].default_value = transmission
    if "IOR" in b.inputs:
        b.inputs["IOR"].default_value = ior
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND'
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


M_SILVER = mat("ZA12_silver", (0.520, 0.530, 0.540), 1.00, 0.42)
for _nm in ("Anisotropic IOR Level", "Anisotropic"):
    if _nm in M_SILVER.node_tree.nodes["Principled BSDF"].inputs:
        M_SILVER.node_tree.nodes["Principled BSDF"].inputs[_nm].default_value = 0.35
        break
M_BLACK  = mat("ZA12_black", (0.017, 0.018, 0.021), 0.15, 0.58)
M_PLASTIC = mat("ZA12_plastic", (0.014, 0.015, 0.017), 0.0, 0.60)
M_GEAR   = mat("ZA12_gear", (0.600, 0.610, 0.618), 0.80, 0.44)
M_DIAL_L = textured("ZA12_dial_L", TEX + "dial-left.jpg", 0.30, 0.44)
M_DIAL_R = textured("ZA12_dial_R", TEX + "dial-right.jpg", 0.30, 0.44)
M_PLATE  = textured("ZA12_plate", TEX + "plate.jpg", 0.05, 0.68)
M_BOTTOM = textured("ZA12_bottom_tex", TEX + "bottom-panel.jpg", 0.05, 0.60)
M_ICON   = textured("ZA12_back_icon", TEX + "back-icon.jpg", 0.30, 0.50)
M_SHOBACK = textured("ZA12_shoe_back", TEX + "shoe-back.jpg", 0.15, 0.58)
M_FRES   = mat("ZA12_fresnel", (0.720, 0.722, 0.700), 0.0, 0.42)
M_TUBE   = mat("ZA12_tube", (0.900, 0.905, 0.880), 0.0, 0.30)
_nt = M_TUBE.node_tree
_bsdf = _nt.nodes["Principled BSDF"]
if "Emission Color" in _bsdf.inputs:
    _bsdf.inputs["Emission Color"].default_value = (1.0, 0.985, 0.94, 1.0)
    _bsdf.inputs["Emission Strength"].default_value = 0.5
M_GLASS  = mat("ZA12_glass", (0.800, 0.805, 0.780), 0.0, 0.07, transmission=0.0, alpha=0.10, ior=1.45)
M_CAVITY = mat("ZA12_cavity", (0.020, 0.021, 0.018), 0.1, 0.75)
M_SENSOR = mat("ZA12_sensor", (0.008, 0.010, 0.014), 0.00, 0.62)
if "Specular IOR Level" in M_SENSOR.node_tree.nodes["Principled BSDF"].inputs:
    M_SENSOR.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.15
M_SENSRIM = mat("ZA12_sensor_rim", (0.062, 0.065, 0.068), 0.10, 0.50)
M_SLOT   = mat("ZA12_slot", (0.860, 0.865, 0.845), 0.0, 0.52)
M_POST   = mat("ZA12_post", (0.900, 0.905, 0.910), 1.0, 0.10)   # 中心连接柱：抛光金属
M_FRAME  = mat("ZA12_win_frame", (0.500, 0.510, 0.520), 1.0, 0.62)
M_SHOE   = mat("ZA12_shoe", (0.480, 0.492, 0.500), 0.88, 0.34)


def smooth(a=35):
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(a))


def bevel(obj, width_mm, seg=3, angle=30):
    md = obj.modifiers.new("b", 'BEVEL')
    md.width = width_mm * S
    md.segments = seg
    md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(angle)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=md.name)


def rounded_points(w, d, r, seg=12):
    pts, hw, hd = [], w / 2 - r, d / 2 - r
    for cx, cy, a0 in [(hw, hd, 0), (-hw, hd, 90), (-hw, -hd, 180), (hw, -hd, 270)]:
        for i in range(seg + 1):
            a = math.radians(a0 + i * 90.0 / seg)
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def prism(name, w, d, z0, z1, r, material, edge_bevel=0.8, seg=12, flip_v=False, flip_u=False):
    bm = bmesh.new()
    vs = [bm.verts.new((x * S, y * S, z0 * S)) for x, y in rounded_points(w, d, r, seg)]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, (z1 - z0) * S)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    layer = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            u = v.x / (w * S) + 0.5
            vv = v.y / (d * S) + 0.5
            if flip_u:
                u = 1.0 - u
            if flip_v:
                vv = 1.0 - vv
            layer.data[li].uv = (u, vv)
    if edge_bevel:
        bevel(o, edge_bevel, 3)
    smooth()
    return o


def rbox(name, w, d, h, loc, radius, material, seg=4):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    o.scale = (w * S, d * S, h * S)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius:
        bevel(o, radius, seg)
    o.data.materials.append(material)
    smooth()
    return o


def cyl(name, r, h, loc, material, verts=96, b=0.0, axis='Z'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r * S, depth=h * S,
                                        location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    if axis == 'X':
        o.rotation_euler = (0, math.pi / 2, 0)
    if axis == 'Y':
        o.rotation_euler = (math.pi / 2, 0, 0)
    if b:
        bevel(o, b, 2)
    o.data.materials.append(material)
    smooth(40)
    return o


def washer(name, r_out, r_in, h, loc, material, seg=64, axis='-Y'):
    """圆环。axis='-Y' 朝前（传感器外圈）；axis='Z' 平躺（z 从 loc 向下 h）。"""
    bm = bmesh.new()
    to, ti, bo, bi = [], [], [], []
    for i in range(seg):
        a = i / seg * math.tau
        c, s = math.cos(a), math.sin(a)
        to.append(bm.verts.new((c * r_out * S, s * r_out * S, 0)))
        ti.append(bm.verts.new((c * r_in * S, s * r_in * S, 0)))
        bo.append(bm.verts.new((c * r_out * S, s * r_out * S, -h * S)))
        bi.append(bm.verts.new((c * r_in * S, s * r_in * S, -h * S)))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((to[i], to[j], ti[j], ti[i]))
        bm.faces.new((bo[j], bo[i], bi[i], bi[j]))
        bm.faces.new((to[j], to[i], bo[i], bo[j]))
        bm.faces.new((ti[i], ti[j], bi[j], bi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.name = name
    o.location = (loc[0] * S, loc[1] * S, loc[2] * S)
    if axis == '-Y':
        o.rotation_euler = (math.pi / 2, 0, 0)
    o.data.materials.append(material)
    smooth(40)
    return o


def flat_disc(name, r, loc, facing, material, seg=64, flip_u=True, flip_v=True):
    bpy.ops.mesh.primitive_circle_add(vertices=seg, radius=r * S, fill_type='NGON',
                                      location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    o.rotation_euler = (math.pi / 2, 0, 0) if facing == 'front' else (-math.pi / 2, 0, 0)
    me = o.data
    layer = me.uv_layers[0] if me.uv_layers else me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            u = v.x / (2 * r * S) + 0.5
            vv = v.y / (2 * r * S) + 0.5
            if facing == 'back':
                if flip_u:
                    u = 1.0 - u
                if flip_v:
                    vv = 1.0 - vv
            layer.data[li].uv = (u, vv)
    me.materials.append(material)
    return o


def frame_ring(name, w_out, h_out, r_out, w_in, h_in, r_in, y0, y1, material, seg=16, bevel_mm=0.2):
    """窗框内衬环（朝 -Y），覆盖沉台壁，用哑光面压掉全白晕光。"""
    bm = bmesh.new()
    o0 = [bm.verts.new((x * S, y0 * S, y * S)) for x, y in rounded_points(w_out, h_out, r_out, seg)]
    i0 = [bm.verts.new((x * S, y0 * S, y * S)) for x, y in rounded_points(w_in, h_in, r_in, seg)]
    o1 = [bm.verts.new((x * S, y1 * S, y * S)) for x, y in rounded_points(w_out, h_out, r_out, seg)]
    i1 = [bm.verts.new((x * S, y1 * S, y * S)) for x, y in rounded_points(w_in, h_in, r_in, seg)]
    n = len(o0)
    for k in range(n):
        k2 = (k + 1) % n
        bm.faces.new((o0[k], o0[k2], i0[k2], i0[k]))
        bm.faces.new((o1[k2], o1[k], i1[k], i1[k2]))
        bm.faces.new((o1[k], o1[k2], o0[k2], o0[k]))
        bm.faces.new((i0[k], i0[k2], i1[k2], i1[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.name = name
    o.location = (WIN_CX * S, 0.0, WIN_CZ * S)
    o.data.materials.append(material)
    if bevel_mm:
        bevel(o, bevel_mm, 2)
    smooth()
    return o


def dial(name, cx, cy, mat_gear, mat_face):
    """滚花内缩 + 外侧 1.2mm 平银边（p1：滚花在盘缘内侧一圈）。"""
    H = DIAL_TOP - DIAL_BOT
    zc = H - 0.30                 # 平边底面高
    r_kn = DIAL_R - 0.60          # 滚花外径
    bm = bmesh.new()
    n = DIAL_TEETH * 2
    bot, mid = [], []
    for i in range(n):
        a = i / n * math.tau
        rr = (r_kn - (DIAL_TOOTH if i % 2 else 0.0)) * S
        bot.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, 0.0)))
        mid.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, zc * S)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], mid[j], mid[i]))
    bm.faces.new(tuple(reversed(bot)))
    # 平银边（外径 DIAL_R）与底部环形封口
    cb, ct = [], []
    for i in range(n):
        a = i / n * math.tau
        cb.append(bm.verts.new((math.cos(a) * DIAL_R * S, math.sin(a) * DIAL_R * S, zc * S)))
        ct.append(bm.verts.new((math.cos(a) * DIAL_R * S, math.sin(a) * DIAL_R * S, H * S)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((cb[i], cb[j], ct[j], ct[i]))
        bm.faces.new((mid[j], mid[i], cb[i], cb[j]))
    bm.faces.new(tuple(ct))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.location = (cx * S, cy * S, DIAL_BOT * S)
    o.data.materials.append(mat_gear)
    o.data.materials.append(mat_face)
    layer = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            layer.data[li].uv = (v.x / (2 * DIAL_R * S) + 0.5, v.y / (2 * DIAL_R * S) + 0.5)
        if poly.normal.z > 0.9:
            poly.material_index = 1
    return o


def panel_cut(name, w, h, r, y_front, y_back, material, seg=24):
    """朝 -Y 的圆角矩形洞（用 rounded_points 保证角半径准确；rbox 的 bevel 会被薄边夹小）。"""
    o = prism(name, w, h, -(y_back - y_front), 0.001, r, material, 0.0, seg=seg)
    o.rotation_euler = (math.pi / 2, 0, 0)
    o.location = (WIN_CX * S, y_front * S, WIN_CZ * S)
    return o


def boolean_cut(target, cutter, name="cut"):
    md = target.modifiers.new(name, 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.solver = 'EXACT'
    md.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ============================================================ 机身
base = prism("Base", W - 2 * BASE_INSET, D - 2 * BASE_INSET, 0, BASE_H,
             CORNER - BASE_INSET, M_PLASTIC, 0.5)
base.data.materials.append(M_SILVER)
for poly in base.data.polygons:
    if poly.normal.z < -0.90 and abs(poly.center.z) < 0.0005:
        poly.material_index = 1

shell = prism("Shell", W, D, BASE_H, BODY_H, CORNER, M_SILVER, FILLET)

POCKET_FLOOR = BODY_H - PLATE_SINK - 1.3
# 凹槽用 prism（rounded_points，角半径精确）切：顶盖比凹槽每边大 0.03 → 装配后无缝隙无黑槽
pocket = prism("Pocket", PLATE_W - 0.06, PLATE_D - 0.06, POCKET_FLOOR, BODY_H + 1.0,
               PLATE_R - 0.03, M_CAVITY, 0.0, seg=32)
boolean_cut(shell, pocket, "pocket")

plate = prism("TopPlate", PLATE_W, PLATE_D, POCKET_FLOOR, BODY_H - PLATE_SINK,
              PLATE_R, M_PLATE, 0.30, seg=20)

# 顶面总成绕 Z 转 180°：f/stop 盘在 +X（朝正面看时的右手侧），ISO/功率盘在 −X
dial("DialLeft", DIAL_X, DIAL_Y, M_GEAR, M_DIAL_L)
dial("DialRight", -DIAL_X, DIAL_Y, M_GEAR, M_DIAL_R)
for sx in (DIAL_X, -DIAL_X):
    cyl("Post", 2.55, 0.28, (sx, DIAL_Y, DIAL_TOP - 0.08), M_POST, 40, 0.05, 'Z')

slot = prism("Slot", SLOT_W, SLOT_H, BODY_H - PLATE_SINK - 0.10, BODY_H - PLATE_SINK + 0.02,
              SLOT_H / 2, M_SLOT, 0.0, seg=12)
slot.location = (0.0, (D / 2 - SLOT_Z) * S, 0.0)

# ============================================================ 底面铭牌（沉台 + 2.3mm 银边）
bp = rbox("BottomCut", BOT_PANEL_W, BOT_PANEL_D, 0.7, (0, 0, -0.15), BOT_PANEL_R, M_CAVITY, 6)
boolean_cut(base, bp, "bottom")
prism("BottomPanel", BOT_PANEL_W, BOT_PANEL_D, -0.15, 0.30, BOT_PANEL_R, M_BOTTOM,
      0.10, seg=16, flip_v=True)

# ============================================================ 正面柔光窗
cutA = panel_cut("WinFrameCut", WIN_FRAME_W, WIN_FRAME_H, WIN_FRAME_R,
                 -D / 2 - 0.10, -D / 2 + WIN_FRAME_D, M_CAVITY, 24)
boolean_cut(shell, cutA, "winframe")
cutB = panel_cut("WinCut", WIN_W, WIN_H, WIN_R,
                 -D / 2 + WIN_FRAME_D, -D / 2 + WIN_FRAME_D + WIN_DEPTH, M_CAVITY, 24)
boolean_cut(shell, cutB, "window")

# 窗框内衬（哑光，压掉沉台壁全白晕光）
frame_ring("WinFrameLiner", WIN_FRAME_W + 0.50, WIN_FRAME_H + 0.50, WIN_FRAME_R + 0.25,
           WIN_W - 0.40, WIN_H - 0.35, WIN_R - 0.15,
           -D / 2 - 0.002, -D / 2 + WIN_FRAME_D, M_FRAME, 24, 0.16)

# 玻璃（沉台内 0.6）
rbox("WinGlass", WIN_FRAME_W - 1.5, 0.16, WIN_FRAME_H - 1.6,
     (WIN_CX, -D / 2 + 0.77, WIN_CZ), 2.0, M_GLASS, 4)
# 窗腔暗底（紧贴菲涅尔背面，形成 0.45 暗缝）
rbox("WinCavity", WIN_W - 0.2, 0.7, WIN_H - 0.2,
     (WIN_CX, -D / 2 + 1.95, WIN_CZ), WIN_R - 0.1, M_CAVITY, 4)
# 闪光管（藏于暗腔后，保证结构完整）
cyl("Tube", 1.5, 21.0, (WIN_CX, -D / 2 + 3.4, WIN_CZ), M_TUBE, 32, 0.0, 'X')

# 菲涅尔：同心环棱
FRE_W, FRE_H = 26.8, 7.70   # 略大于窗洞，盖住洞壁避免露出暗缝
PERIOD, AMP = 1.35, 0.22
FRE_Y = -D / 2 + WIN_FRAME_D + 0.5
NANG, DR, RC = 140, 0.18, 1.55
RMAX = math.hypot(FRE_W / 2, FRE_H / 2)


def _inside(hx, hz):
    if hx > FRE_W / 2 or hz > FRE_H / 2:
        return False
    cw, ch = FRE_W / 2 - RC, FRE_H / 2 - RC
    if hx > cw and hz > ch:
        return (hx - cw) ** 2 + (hz - ch) ** 2 <= RC ** 2
    return True


bm = bmesh.new()
rings = []
rr = DR * 0.5
while rr <= RMAX:
    ring = []
    frac = (rr / PERIOD) % 1.0
    tri = 1.0 - abs(frac * 2.0 - 1.0)
    if rr < 1.50:                 # 中心 1.5mm 做平，去掉正中心的暗点
        tri = 0.0
    yv = (FRE_Y - 0.05 - AMP * tri) * S
    for j in range(NANG):
        a = j / NANG * math.tau
        ring.append(bm.verts.new(((WIN_CX + math.cos(a) * rr) * S, yv,
                                  (WIN_CZ + math.sin(a) * rr) * S)))
    rings.append((ring, rr))
    rr += DR
bm.verts.ensure_lookup_table()
# 中心封口：极坐标网格从 r=0.09 起，不封口会在正视里留一个黑点
_r0 = rings[0][0]
_tri0 = 0.0
_ctr = bm.verts.new((WIN_CX * S, (FRE_Y - 0.05 - AMP * _tri0) * S, WIN_CZ * S))
for j in range(NANG):
    bm.faces.new((_ctr, _r0[j], _r0[(j + 1) % NANG]))
for k in range(len(rings) - 1):
    r0, ra = rings[k]
    r1, rb = rings[k + 1]
    rm = (ra + rb) * 0.5
    for j in range(NANG):
        j2 = (j + 1) % NANG
        am = (j + 0.5) / NANG * math.tau
        hx = abs(math.cos(am) * rm)
        hz = abs(math.sin(am) * rm)
        if not _inside(hx, hz):
            continue
        bm.faces.new((r0[j], r0[j2], r1[j2], r1[j]))
# 清掉矩形掩膜外的孤立顶点（否则包围盒/体积虚高）
_loose = [v for v in bm.verts if not v.link_faces]
if _loose:
    bmesh.ops.delete(bm, geom=_loose, context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("Fresnel"); bm.to_mesh(me); bm.free()
fre = bpy.data.objects.new("Fresnel", me); scene.collection.objects.link(fre)
fre.data.materials.append(M_FRES)
smooth(50)

# 柔光窗组件合并为单 mesh（降 draw call / 体积）
bpy.ops.object.select_all(action='DESELECT')
for _n in ("Fresnel", "Tube", "WinGlass"):
    _o = bpy.data.objects.get(_n)
    if _o:
        _o.select_set(True)
bpy.context.view_layer.objects.active = bpy.data.objects["Fresnel"]
bpy.ops.object.join()
_wa = bpy.context.active_object
_wa.name = "WindowAssembly"
_wa.data.name = "WindowAssembly"

# ============================================================ 电眼（Ø4.6 环凸 0.15 + Ø2.8 深孔）
# 外壳开 Ø5.0 沉台 0.25 深，环面＝沉台底（−23.25），玻璃再退 0.05
_sen = cyl("SensorCut", SENSOR_R, 0.60, (SENSOR_X, -D / 2 + 0.30 - 0.30, SENSOR_Z),
           M_CAVITY, 64, 0.0, 'Y')
boolean_cut(shell, _sen, "sensor")
# 环面近齐平（沉台仅 0.10），避免深孔全黑；玻璃再退 0.10
_rim = washer("SensorRim", SENSOR_R, 1.40, 0.55, (SENSOR_X, -D / 2 + 0.08, SENSOR_Z), M_SENSRIM, 48)
bevel(_rim, 0.10, 2)
cyl("SensorGlass", 1.36, 0.16, (SENSOR_X, -D / 2 + 0.26, SENSOR_Z), M_SENSOR, 48, 0.03, 'Y')
cyl("SensorHole", 1.38, 1.70, (SENSOR_X, -D / 2 + 1.19, SENSOR_Z), M_CAVITY, 48, 0.0, 'Y')

# ============================================================ 背面按键（凸 0.7）
cyl("BackButton", BTN_R, 1.20, (BTN_X, D / 2 + 0.10, BTN_Z), M_SILVER, 72, 0.28, 'Y')
flat_disc("BackIcon", 3.55, (BTN_X, D / 2 + 0.705, BTN_Z), 'back', M_ICON, 72,
          flip_u=True, flip_v=True)

# ============================================================ 热靴（单触点）
rbox("ShoeMount", SHOE_MOUNT_W, SHOE_MOUNT_D, 3.4, (SHOE_X, SHOE_Y, -1.7), 1.1, M_BLACK, 4)
rbox("ShoeFoot", SHOE_FOOT_W, SHOE_FOOT_D, 6.3, (SHOE_X, SHOE_Y, -6.55), 1.0, M_BLACK, 4)
rbox("ShoeTongue", 18.4, 16.4, 0.9, (SHOE_X, SHOE_Y, -10.15), 0.35, M_BLACK, 4)
cyl("ShoeContact", 1.5, 0.7, (SHOE_X, SHOE_Y, -10.95), M_SHOE, 32, 0.08, 'Z')
for sgn in (-1, 1):
    rbox("Rail%d" % sgn, 0.9, 14.0, 1.0, (SHOE_X + sgn * 9.75, SHOE_Y, -8.2), 0.2, M_SHOE, 3)

bpy.ops.mesh.primitive_plane_add(size=1.0, location=(SHOE_X * S, (SHOE_Y + SHOE_MOUNT_D / 2 + 0.012) * S, -1.7 * S))
lbl = bpy.context.object; lbl.name = "ShoeLabel"
lbl.data.name = "ShoeLabel"
lbl.scale = (7.2 * S, 3.0 * S, 1.0)
lbl.rotation_euler = (-math.pi / 2, 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
me = lbl.data
layer = me.uv_layers[0] if me.uv_layers else me.uv_layers.new(name="UVMap")
for poly in me.polygons:
    for li in poly.loop_indices:
        v = me.vertices[me.loops[li].vertex_index].co
        layer.data[li].uv = (1.0 - (v.x / (7.2 * S) + 0.5), v.z / (3.0 * S) + 0.5)
me.materials.append(M_SHOBACK)

# ============================================================ USB-C（右面）
uc = rbox("UsbCut", 3.6, 8.4, 4.2, (W / 2 + 0.4, USB_Z, 14.6), 1.6, M_CAVITY, 4)
boolean_cut(shell, uc, "usb")
rbox("UsbPort", 1.1, 7.0, 2.8, (W / 2 - 0.60, USB_Z, 14.6), 1.28, M_BLACK, 4)

# ============================================================ 导出
os.makedirs(OUT_DIR, exist_ok=True)
for o in list(scene.objects):
    if o.type in {'LIGHT', 'CAMERA'}:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='SELECT')
glb = os.path.join(OUT_DIR, "zeniko-za12.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=False,
                          export_apply=True, export_yup=True, export_materials='EXPORT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, "za12.blend"))

zs = []
for o in scene.objects:
    if o.type == 'MESH':
        for v in o.bound_box:
            zs.append((o.matrix_world @ Vector(v)).z)
print("GLB_BYTES", os.path.getsize(glb))
print("Z_RANGE_MM", round(min(zs) / S, 2), round(max(zs) / S, 2),
      "TOTAL", round((max(zs) - min(zs)) / S, 2))
print("OBJECTS", len(scene.objects))
