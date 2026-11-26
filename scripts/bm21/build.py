# -*- coding: utf-8 -*-
"""Konica Big Mini BM-21 v4 —— 按 docs/reviews/bm21-glb/r1.md 的实测数值重建。

坐标：+X = 正面看观者右手（相机左），-X = 黑握把端；-Y = 正面；+Y = 背面；Z=0 底、62 = 机身顶。
包络：100 x 63 x 32（机身深 28 + 镜筒前凸 2.5 + 目镜后凸 1.5）。
审核坐标换算：x_rev = X + 50，y_rev = Z，z_rev = 16 - Y。
"""
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix

S = 0.001
W, H = 100.0, 62.0
FRONT_Y, BACK_YEND = -13.5, 14.5
LENS_FRONT_Y = -16.0
HW, HH = W / 2, H / 2
HD = (BACK_YEND - FRONT_Y) / 2
EDGE_BEVEL = 3.0
R_GRIP, R_LEFT = 15.5, 7.0

# ---- 正面黑握把缝线（正面看，x 随 z 变化；腰 17.8 @ z=30）
SEAM = [(0.0, -44.6), (1.0, -37.0), (2.5, -31.2), (5.3, -28.5), (7.8, -29.4),
        (12.8, -30.7), (17.8, -31.6), (24.0, -32.1), (30.0, -32.2), (34.0, -31.8),
        (38.0, -31.0), (42.8, -30.3), (47.8, -28.9), (52.8, -27.1), (56.0, -26.3),
        (58.5, -28.6), (60.2, -35.5), (61.3, -42.6), (62.0, -46.2)]

# ---- 正面暗面板 / 取景 / 闪光
STRIP_X0, STRIP_X1 = -19.2, 46.5
STRIP_Z0, STRIP_Z1 = 39.3, 52.7
VF_X0, VF_X1, VF_Z0, VF_Z1 = -8.7, 3.5, 39.9, 53.4
AF_L_X, AF_R_X, AF_Z = -14.2, 14.6, 46.2
FL_X0, FL_X1, FL_Z0, FL_Z1 = 23.6, 40.8, 41.6, 50.8

# ---- 镜头
LENS_CX, LENS_CZ = -0.6, 21.3
LENS_BEZEL_R, LENS_RING_R, LENS_INNER_R = 15.75, 14.9, 10.4
BARRIER_W, BARRIER_H = 19.4, 13.4

# ---- 顶面
SHUT_X, SHUT_Y, SHUT_R = -36.1, 5.0, 6.3
LCD_X0, LCD_X1 = -11.05, 10.25
LCD_Y0, LCD_Y1 = 1.4, 11.0
BTNS = [("OnBtn", -24.7, 8.4, 7.4, 3.4), ("ModeBtn", -27.9, 4.4, 6.0, 3.2),
        ("PwrBtn", -20.8, 4.4, 6.0, 3.2)]

# ---- 背面
EYE_X0, EYE_X1, EYE_Z0, EYE_Z1 = -9.4, 3.5, 48.9, 59.1
LAMP_X, LAMP_Z, LAMP_R = -13.8, 53.6, 1.5
DIAL_X, DIAL_Z, DIAL_R = -31.9, 45.8, 9.4
FW_X0, FW_X1, FW_Z0, FW_Z1 = -42.0, -35.3, 14.4, 33.2

# ---- 底面
SER_X0, SER_X1, SER_H = -2.1, 16.0, 4.5
BATT_X, BATT_Y, BATT_R = 41.0, 1.0, 4.25
SCREW_X = (-23.3, 23.3)

ROOT = r"E:/code/dshCode/Lightbox"
TEX = ROOT + "/scripts/bm21/tex/"
OUT_GLB = ROOT + "/public/assets/models/konica-bm21.glb"
OUT_BLEND = ROOT + "/scripts/bm21/bm21.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0


def srgb(hexstr):
    v = [int(hexstr[i:i + 2], 16) / 255.0 for i in (1, 3, 5)]
    return tuple((c / 12.92) if c <= 0.04045 else (((c + 0.055) / 1.055) ** 2.4) for c in v)


def mat(name, color, metallic=0.0, roughness=0.55, transmission=0.0, ior=1.45, bump=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in b.inputs:
        b.inputs["Transmission Weight"].default_value = transmission
    if "IOR" in b.inputs:
        b.inputs["IOR"].default_value = ior
    if bump:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(TEX + bump, check_existing=True)
        tex.interpolation = 'Linear'
        tex.extension = 'REPEAT'
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.55
        nt.links.new(tex.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def textured_alpha(name, image, metallic, roughness):
    """透明丝印贴花材质（alphaMode=MASK）。"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image, check_existing=True)
    tex.interpolation = 'Linear'
    tex.extension = 'CLIP'
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    for attr, val in (("blend_method", 'CLIP'), ("alpha_cutoff", 0.35),
                      ("surface_render_method", 'DITHERED')):
        if hasattr(m, attr):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    return m


def textured_opaque(name, image, metallic, roughness):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image, check_existing=True)
    tex.interpolation = 'Cubic'
    tex.extension = 'EXTEND'
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m


# ============================================================ 材质
M_CHAMP = mat("BM21_champagne", srgb("#d9d2c4"), 0.70, 0.55, bump="grain_normal.png")
M_CHAMP_BRIGHT = mat("BM21_champagne_edge", srgb("#e6e0d3"), 0.70, 0.42, bump="grain_normal.png")
M_BLACK = mat("BM21_black_matte", srgb("#1b1b1d"), 0.05, 0.66, bump="grain_normal.png")
M_BLACK_SOFT = mat("BM21_black_soft", srgb("#232327"), 0.0, 0.72, bump="grain_normal.png")
M_CHARCOAL = mat("BM21_charcoal", srgb("#2a2a2d"), 0.12, 0.60, bump="grain_normal.png")
M_RING = mat("BM21_lens_ring", srgb("#121214"), 0.15, 0.25)
M_RING_MATTE = mat("BM21_lens_ring_matte", srgb("#1d1d20"), 0.10, 0.38)
M_BARRIER = mat("BM21_barrier", srgb("#2f2f34"), 0.18, 0.26)
M_LENSGLASS = mat("BM21_lensglass", srgb("#2b2b30"), 0.0, 0.16, transmission=0.12, ior=1.6)
M_GLASS = mat("BM21_glass", srgb("#9a9da0"), 0.0, 0.05, transmission=1.0, ior=1.5)
M_LCD = mat("BM21_lcd", srgb("#8b9188"), 0.0, 0.16, transmission=0.25, ior=1.5)
M_FLASH = mat("BM21_flash", srgb("#b7b9b2"), 0.0, 0.44, transmission=0.18, ior=1.5)
M_DARKGREY = mat("BM21_btn_grey", srgb("#3a3a3d"), 0.0, 0.42)
M_WHITE_PAINT = mat("BM21_white_paint", srgb("#eceae2"), 0.0, 0.5)

# ---- 丝印贴花（透明底 + MASK）
M_FRONT_LOGO = textured_alpha("BM21_front_logo", TEX + "front_logo.png", 0.70, 0.55)
M_TOP_PRINT = textured_alpha("BM21_top_print", TEX + "top_print.png", 0.70, 0.55)
M_BOTTOM_PRINT = textured_alpha("BM21_bottom_print", TEX + "bottom_print.png", 0.70, 0.55)
M_BACK_PRINT = textured_alpha("BM21_back_print", TEX + "back_print.png", 0.05, 0.66)
M_SERIAL = textured_alpha("BM21_serial", TEX + "serial.png", 0.10, 0.50)
M_BTN_ON = textured_alpha("BM21_btn_on", TEX + "btn_on.png", 0.0, 0.42)
M_BTN_MODE = textured_alpha("BM21_btn_mode", TEX + "btn_mode.png", 0.0, 0.42)
M_BTN_PWR = textured_alpha("BM21_btn_pwr", TEX + "btn_pwr.png", 0.0, 0.42)
M_SELECTSET = textured_alpha("BM21_selectset", TEX + "selectset.png", 0.70, 0.55)
M_LENS_FACE = textured_opaque("BM21_lens_face", TEX + "lens_face.png", 0.12, 0.26)


# ============================================================ 工具
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


def box_uv(obj, scale_mm=7.0):
    me = obj.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    lay = me.uv_layers[0]
    for poly in me.polygons:
        n = poly.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            x, y, z = co.x / S, co.y / S, co.z / S
            if az >= ax and az >= ay:
                u, v = x, y
            elif ax >= ay:
                u, v = y, z
            else:
                u, v = x, z
            lay.data[li].uv = (u / scale_mm, v / scale_mm)


def arc(cx, cz, r, a0, a1, seg):
    return [(cx + math.cos(math.radians(a0 + (a1 - a0) * i / seg)) * r,
             cz + math.sin(math.radians(a0 + (a1 - a0) * i / seg)) * r) for i in range(seg + 1)]


def dedupe(pts, eps=1e-6):
    out = []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) > eps or abs(p[1] - out[-1][1]) > eps:
            out.append(p)
    if len(out) > 2 and abs(out[0][0] - out[-1][0]) < eps and abs(out[0][1] - out[-1][1]) < eps:
        out.pop()
    return out


def prof_full(hw, hh, r_tr, r_tl, r_bl, r_br, seg=12):
    pts = [(-hw + r_bl, -hh)]
    pts += arc(hw - r_br, -hh + r_br, r_br, -90, 0, seg)
    pts += arc(hw - r_tr, hh - r_tr, r_tr, 0, 90, seg)
    pts += arc(-hw + r_tl, hh - r_tl, r_tl, 90, 180, seg)
    pts += arc(-hw + r_bl, -hh + r_bl, r_bl, 180, 270, seg)
    return dedupe(pts)


def prof_right(xc, hw, hh, r_tr, r_br, seg=12):
    pts = [(xc, -hh)]
    pts += arc(hw - r_br, -hh + r_br, r_br, -90, 0, seg)
    pts += arc(hw - r_tr, hh - r_tr, r_tr, 0, 90, seg)
    pts.append((xc, hh))
    return dedupe(pts)


def offset_profile(pts, d):
    n = len(pts); out = []
    for i in range(n):
        p0 = Vector(pts[(i - 1) % n]); p1 = Vector(pts[i]); p2 = Vector(pts[(i + 1) % n])
        t0 = (p1 - p0).normalized(); t1 = (p2 - p1).normalized()
        n0 = Vector((t0.y, -t0.x)); n1 = Vector((t1.y, -t1.x))
        nm = (n0 + n1)
        if nm.length < 1e-6:
            nm = n1
        nm.normalize()
        sc = 1.0 / max(0.35, nm.dot(n1))
        out.append((p1.x + nm.x * d * sc, p1.y + nm.y * d * sc))
    return out


def prism_y(name, pts, y0, y1, material, bev=0.0, seg=3, sa=35, uv=True):
    bm = bmesh.new()
    vs = [bm.verts.new((x * S, y0 * S, z * S)) for x, z in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, (y1 - y0) * S, 0)), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    if bev:
        bevel(o, bev, seg)
    if uv:
        box_uv(o)
    smooth(sa)
    return o


def rbox(name, w, d, h, loc, radius, material, seg=4, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    o.scale = (w * S, d * S, h * S)
    if rot:
        o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if radius:
        bevel(o, radius, seg)
    o.data.materials.append(material)
    box_uv(o)
    smooth()
    return o


def cyl(name, r, h, loc, material, verts=96, b=0.0, axis='Y', seg=3):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r * S, depth=h * S,
                                        location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    if axis == 'Y':
        o.rotation_euler = (math.pi / 2, 0, 0)
    elif axis == 'X':
        o.rotation_euler = (0, math.pi / 2, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    if b:
        bevel(o, b, seg)
    o.data.materials.append(material)
    box_uv(o)
    smooth(40)
    return o


def cone(name, r_rear, r_front, h, loc, material, verts=96, axis='Y'):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r_rear * S, radius2=r_front * S,
                                    depth=h * S, location=(loc[0] * S, loc[1] * S, loc[2] * S))
    o = bpy.context.object; o.name = name; o.data.name = name
    if axis == 'Y':
        o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    o.data.materials.append(material)
    box_uv(o)
    smooth(40)
    return o


def rounded_local(x0, x1, z0, z1, r, seg=10):
    hw, hh = (x1 - x0) / 2, (z1 - z0) / 2
    pts = prof_full(hw, hh, r, r, r, r, seg)
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    return [(x + cx, z + cz) for x, z in pts]


def rounded_tube(name, x0, x1, z0, z1, r_out, wall, y0, y1, material, seg=14, r_in=None):
    outer = rounded_local(x0, x1, z0, z1, r_out, seg)
    rin = max(0.4, (r_in if r_in is not None else r_out) - wall)
    inner = rounded_local(x0 + wall, x1 - wall, z0 + wall, z1 - wall, rin, seg)
    n = min(len(outer), len(inner))
    bm = bmesh.new()
    of = [bm.verts.new((p[0] * S, y0 * S, p[1] * S)) for p in outer[:n]]
    ob = [bm.verts.new((p[0] * S, y1 * S, p[1] * S)) for p in outer[:n]]
    inf = [bm.verts.new((p[0] * S, y0 * S, p[1] * S)) for p in inner[:n]]
    ib = [bm.verts.new((p[0] * S, y1 * S, p[1] * S)) for p in inner[:n]]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((of[i], of[j], inf[j], inf[i]))
        bm.faces.new((ob[j], ob[i], ib[i], ib[j]))
        bm.faces.new((of[j], of[i], ob[i], ob[j]))
        bm.faces.new((inf[i], inf[j], ib[j], ib[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    bevel(o, 0.3, 2)
    box_uv(o)
    smooth(30)
    return o


def decal_plane(name, axis, cval, a0, a1, b0, b1, material, flip_u=False, flip_v=False, push=0.04):
    if axis in ('Y-', 'Y+'):
        c = cval - push if axis == 'Y-' else cval + push
        pts = [(a0, c, b0), (a1, c, b0), (a1, c, b1), (a0, c, b1)]
    else:
        c = cval + push if axis == 'Z+' else cval - push
        pts = [(a0, b0, c), (a1, b0, c), (a1, b1, c), (a0, b1, c)]
    if axis in ('Y+', 'Z-'):
        pts = list(reversed(pts))
    bm = bmesh.new()
    vs = [bm.verts.new((p[0] * S, p[1] * S, p[2] * S)) for p in pts]
    bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    layer = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if axis in ('Y-', 'Y+'):
                u = (co.x / S - a0) / (a1 - a0); v = (co.z / S - b0) / (b1 - b0)
            else:
                u = (co.x / S - a0) / (a1 - a0); v = (co.y / S - b0) / (b1 - b0)
            if flip_u:
                u = 1.0 - u
            if flip_v:
                v = 1.0 - v
            layer.data[li].uv = (u, v)
    return o


def ring_decal(name, cx, cz, r_in, r_out, y, material, seg=160, tex_r=15.0):
    bm = bmesh.new()
    outer, inner = [], []
    for i in range(seg):
        a = i / seg * math.tau
        ca, sa = math.cos(a), math.sin(a)
        outer.append(bm.verts.new(((cx + ca * r_out) * S, y * S, (cz + sa * r_out) * S)))
        inner.append(bm.verts.new(((cx + ca * r_in) * S, y * S, (cz + sa * r_in) * S)))
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((outer[i], outer[j], inner[j], inner[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    layer = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            layer.data[li].uv = ((co.x / S - cx) / (2 * tex_r) + 0.5, (co.z / S - cz) / (2 * tex_r) + 0.5)
    return o


def boolean_cut(target, cutter):
    md = target.modifiers.new("cut", 'BOOLEAN')
    md.operation = 'DIFFERENCE'; md.solver = 'EXACT'; md.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


# ============================================================ 机身
def lift(pts, dz=HH):
    return [(x, z + dz) for x, z in pts]


def outline_left(z):
    """机身正面轮廓在左端（-X）的边界 x。"""
    if z < R_GRIP:
        return -HW + R_GRIP - math.sqrt(max(0.0, R_GRIP ** 2 - (R_GRIP - z) ** 2))
    if z > H - R_GRIP:
        return -HW + R_GRIP - math.sqrt(max(0.0, R_GRIP ** 2 - (z - (H - R_GRIP)) ** 2))
    return -HW


def seam_clamped(z):
    return max(_seam_interp(z), outline_left(z) + 0.5)


def grip_profile():
    """黑握把：-X 端 + 腰形缝线（正面 x(z)），自下沿缝线上行，再由左端圆弧闭合。"""
    pts = []
    z = 0.0
    while z < H:
        pts.append((seam_clamped(z), z))
        z += 0.6
    pts.append((seam_clamped(H), H))
    pts += arc(-HW + R_GRIP, H - R_GRIP, R_GRIP, 90, 180, 14)      # 左上圆角
    pts += arc(-HW + R_GRIP, R_GRIP, R_GRIP, 180, 270, 14)         # 左下圆角
    return dedupe(pts)


_SEAM = sorted(SEAM, key=lambda p: p[0])


def _seam_interp(z):
    if z <= _SEAM[0][0]:
        return _SEAM[0][1]
    if z >= _SEAM[-1][0]:
        return _SEAM[-1][1]
    for i in range(len(_SEAM) - 1):
        z0, x0 = _SEAM[i]
        z1, x1 = _SEAM[i + 1]
        if z0 <= z <= z1:
            t = (z - z0) / max(1e-6, z1 - z0)
            return x0 + (x1 - x0) * t
    return _SEAM[-1][1]


shell = prism_y("Shell", lift(prof_right(-30.0, HW, HH, R_LEFT, R_LEFT)),
                FRONT_Y, 10.6, M_CHAMP, EDGE_BEVEL, 4)
back = prism_y("BackCover", lift(offset_profile(prof_full(HW, HH, R_GRIP, R_LEFT, R_LEFT, R_GRIP), 0.05)),
               10.0, BACK_YEND, M_BLACK, EDGE_BEVEL, 4)
_gp = grip_profile()
print("HEADLESS " + json.dumps({"grip_pts": len(_gp), "grip_bbox": [round(min(p[0] for p in _gp), 2), round(max(p[0] for p in _gp), 2),
      round(min(p[1] for p in _gp), 2), round(max(p[1] for p in _gp), 2)],
      "grip_head": [[round(a, 1), round(b, 1)] for a, b in _gp[:6]],
      "grip_tail": [[round(a, 1), round(b, 1)] for a, b in _gp[-6:]]}))
grip = prism_y("Grip", _gp, FRONT_Y - 0.16, BACK_YEND + 0.16, M_BLACK_SOFT, 0.5, 2)

# ============================================================ 正面：暗面板 / 取景 / AF / 闪光
strip = prism_y("FrontStrip", rounded_local(STRIP_X0, STRIP_X1, STRIP_Z0, STRIP_Z1, 3.2),
                FRONT_Y - 0.32, FRONT_Y + 0.6, M_CHARCOAL, 0.30, 3)
# 取景窗：框 + 深色玻璃 + 内亮片
rounded_tube("FinderHousing", VF_X0, VF_X1, VF_Z0, VF_Z1, 1.9, 1.3,
             FRONT_Y - 2.25, FRONT_Y + 0.4, M_CHARCOAL, 14)
prism_y("FinderWindow",
        rounded_local(VF_X0 + 1.35, VF_X1 - 1.35, VF_Z0 + 1.35, VF_Z1 - 1.35, 0.7),
        FRONT_Y - 2.06, FRONT_Y - 1.92, M_GLASS, 0.16, 2)
prism_y("FinderInner",
        rounded_local(VF_X0 + 2.1, VF_X1 - 2.1, VF_Z0 + 2.2, VF_Z1 - 2.2, 0.55),
        FRONT_Y - 1.70, FRONT_Y - 1.56, M_WHITE_PAINT, 0.12, 2)
rbox("FinderTopStep", (VF_X1 - VF_X0) - 1.8, 0.8, 0.6,
     ((VF_X0 + VF_X1) / 2, FRONT_Y - 1.15, VF_Z1 - 0.5), 0.28, M_BLACK_SOFT, 3)
# AF 窗（左：灯；右：测距）
for nm, cx, rr in (("AfLamp", AF_L_X, 3.0), ("AfSensor", AF_R_X, 3.2)):
    cyl(nm + "Rim", rr + 0.55, 0.38, (cx, FRONT_Y - 0.50, AF_Z), M_BLACK_SOFT, 64, 0.13, 'Y')
    cyl(nm + "Lens", rr, 0.46, (cx, FRONT_Y - 0.52, AF_Z), M_LENSGLASS, 64, 0.24, 'Y')
# 闪光窗
prism_y("FlashFrame", rounded_local(FL_X0, FL_X1, FL_Z0, FL_Z1, 1.3),
        FRONT_Y - 0.28, FRONT_Y + 0.4, M_BLACK, 0.20, 2)
prism_y("FlashGlass", rounded_local(FL_X0 + 0.85, FL_X1 - 0.85, FL_Z0 + 0.85, FL_Z1 - 0.85, 0.9),
        FRONT_Y - 0.52, FRONT_Y - 0.14, M_FLASH, 0.14, 2)
_NF = 9
for i in range(_NF):
    t = (i + 0.5) / _NF
    x = (FL_X0 + 0.85) + t * ((FL_X1 - 0.85) - (FL_X0 + 0.85))
    rbox("FlashRib%d" % i, 0.85, 0.40, (FL_Z1 - FL_Z0) - 1.8, (x, FRONT_Y - 0.58, (FL_Z0 + FL_Z1) / 2),
         0.22, M_FLASH, 2)
rbox("StripSlot", 3.0, 0.45, 2.0, (43.2, FRONT_Y - 0.40, 46.0), 0.8, M_BLACK_SOFT, 3)
for i, (dx, dz) in enumerate(((-17.4, 41.2), (19.6, 41.4), (19.6, 43.2))):
    cyl("StripDot%d" % i, 0.70, 0.30, (dx, FRONT_Y - 0.40, dz), M_BLACK_SOFT, 24, 0.09, 'Y')

# ============================================================ 镜头筒（前凸 2.5）
cone("LensBezel", 16.2, LENS_BEZEL_R, 1.25, (LENS_CX, FRONT_Y - 0.62, LENS_CZ), M_CHAMP_BRIGHT, 128, 'Y')
bevel(bpy.data.objects["LensBezel"], 0.28, 3)
cyl("LensBarrel", LENS_RING_R, 1.9, (LENS_CX, FRONT_Y - 1.55, LENS_CZ), M_RING, 128, 0.0, 'Y')
bevel(bpy.data.objects["LensBarrel"], 0.55, 4)
cyl("LensWell", LENS_INNER_R + 0.4, 1.5, (LENS_CX, FRONT_Y - 1.1, LENS_CZ), M_RING_MATTE, 96, 0.0, 'Y')
ring_decal("LensRingText", LENS_CX, LENS_CZ, LENS_INNER_R + 0.08, LENS_RING_R - 0.22,
           LENS_FRONT_Y - 0.03, M_LENS_FACE, 168, 15.0)
prism_y("LensBarrier",
        rounded_local(LENS_CX - BARRIER_W / 2, LENS_CX + BARRIER_W / 2,
                      LENS_CZ - BARRIER_H / 2, LENS_CZ + BARRIER_H / 2, 2.3),
        LENS_FRONT_Y + 0.42, LENS_FRONT_Y + 1.30, M_BARRIER, 1.0, 4)
slit = rbox("BarrierSlit", 20.0, 0.26, 1.0, (LENS_CX, LENS_FRONT_Y + 0.52, LENS_CZ + 0.1),
            0.0, M_BLACK, 2, rot=(0, -math.radians(31), 0))

# ============================================================ 顶面（z=62）
cyl("ShutterRing", 7.6, 0.55, (SHUT_X, SHUT_Y, H + 0.12), M_CHAMP, 96, 0.25, 'Z')
cyl("ShutterBtn", SHUT_R, 0.90, (SHUT_X, SHUT_Y, H + 0.48), M_DARKGREY, 96, 0.38, 'Z')
# LCD：与顶面齐平（框 62.0，玻璃再降 0.15）
rbox("LcdFrame", LCD_X1 - LCD_X0 + 2.3, LCD_Y1 - LCD_Y0 + 1.6, 0.30,
     ((LCD_X0 + LCD_X1) / 2, (LCD_Y0 + LCD_Y1) / 2, H - 0.06), 1.2, M_BLACK, 4)
rbox("LcdGlass", LCD_X1 - LCD_X0, LCD_Y1 - LCD_Y0, 0.26,
     ((LCD_X0 + LCD_X1) / 2, (LCD_Y0 + LCD_Y1) / 2, H - 0.17), 0.8, M_LCD, 4)
for nm, bx, by, bw, bd in BTNS:
    rbox(nm, bw, bd, 0.90, (bx, by, H + 0.42), 1.4, M_DARKGREY, 4)
# C:AF 指示（空心环 Ø4.4 + 实心点 Ø2.5）
_ring_o, _ring_i = 2.2, 1.35
bm = bmesh.new()
_o, _i = [], []
for k in range(64):
    a = k / 64 * math.tau
    _o.append(bm.verts.new((((14.7 + math.cos(a) * _ring_o)) * S, 5.0 * S, (H + 0.02 + math.sin(a) * _ring_o * 0) * S)))
    _i.append(bm.verts.new((((14.7 + math.cos(a) * _ring_i)) * S, 5.0 * S, (H + 0.02 + math.sin(a) * _ring_i * 0) * S)))
for k in range(64):
    k2 = (k + 1) % 64
    bm.faces.new((_o[k], _o[k2], _i[k2], _i[k]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
_me = bpy.data.meshes.new("CafRing"); bm.to_mesh(_me); bm.free()
_caf = bpy.data.objects.new("CafRing", _me); scene.collection.objects.link(_caf)
_caf.data.materials.append(M_BLACK_SOFT)
_caf.location = (0, 0, 0)
cyl("CafDot", 1.25, 0.22, (13.6, 5.0, H + 0.02), M_BLACK_SOFT, 32, 0.06, 'Z')

# ============================================================ 背面
rbox("EyePiece", EYE_X1 - EYE_X0, 1.55, EYE_Z1 - EYE_Z0,
     ((EYE_X0 + EYE_X1) / 2, BACK_YEND + 0.72, (EYE_Z0 + EYE_Z1) / 2), 1.5, M_BLACK, 5)
rbox("EyeGlass", EYE_X1 - EYE_X0 - 3.2, 0.36, EYE_Z1 - EYE_Z0 - 3.6,
     ((EYE_X0 + EYE_X1) / 2, BACK_YEND + 1.46, (EYE_Z0 + EYE_Z1) / 2), 0.9, M_LENSGLASS, 3)
rbox("EyeInner", EYE_X1 - EYE_X0 - 5.2, 0.20, EYE_Z1 - EYE_Z0 - 5.2,
     ((EYE_X0 + EYE_X1) / 2, BACK_YEND + 1.32, (EYE_Z0 + EYE_Z1) / 2), 0.6, M_WHITE_PAINT, 2)
cyl("BackLamp", LAMP_R, 0.8, (LAMP_X, BACK_YEND + 0.28, LAMP_Z), M_CHARCOAL, 48, 0.18, 'Y')
cyl("BackDial", DIAL_R, 0.95, (DIAL_X, BACK_YEND + 0.16, DIAL_Z), M_CHARCOAL, 96, 0.36, 'Y')
cyl("BackDialRim", DIAL_R + 0.7, 0.40, (DIAL_X, BACK_YEND + 0.01, DIAL_Z), M_BLACK, 96, 0.10, 'Y')
# 竖条检片窗
rbox("FilmWinFrame", (FW_X1 - FW_X0) + 2.2, 0.62, (FW_Z1 - FW_Z0) + 2.2,
     ((FW_X0 + FW_X1) / 2, BACK_YEND + 0.22, (FW_Z0 + FW_Z1) / 2), 1.1, M_BLACK_SOFT, 4)
rbox("FilmWinGlass", FW_X1 - FW_X0, 0.46, FW_Z1 - FW_Z0,
     ((FW_X0 + FW_X1) / 2, BACK_YEND + 0.38, (FW_Z0 + FW_Z1) / 2), 0.9, M_LCD, 3)

# ============================================================ 底面
rbox("SerialPlate", SER_X1 - SER_X0, SER_H, 0.20, ((SER_X0 + SER_X1) / 2, 0.0, -0.08), 0.7, M_BLACK, 3)
cyl("BatteryCover", BATT_R, 0.20, (BATT_X, BATT_Y, -0.08), M_BLACK, 96, 0.09, 'Z')
rbox("BattSlot", 3.0, 0.7, 0.12, (BATT_X, BATT_Y, -0.12), 0.28, M_BLACK_SOFT, 2)
for i, sx in enumerate(SCREW_X):
    cyl("Screw%d" % i, 1.35, 0.18, (sx, 0.0, -0.07), M_DARKGREY, 32, 0.05, 'Z')

# ============================================================ 侧面件（+X 端：锁盘/窗/点/导轨）
cyl("SideDialRing", 6.8, 0.5, (49.9, 1.0, 24.0), M_CHAMP_BRIGHT, 64, 0.12, 'X')
cyl("SideDialIn", 5.2, 0.45, (49.95, 1.0, 24.0), M_CHARCOAL, 64, 0.1, 'X')
rbox("SideWin", 0.35, 6.0, 5.0, (49.86, -4.0, 30.0), 0.5, M_BLACK_SOFT, 3)
cyl("SideDot", 1.0, 0.3, (49.9, -4.0, 22.0), M_BLACK, 24, 0.05, 'X')
rbox("DoorSeam", 0.5, 0.5, 30.0, (49.68, 6.0, 26.0), 0.2, M_BLACK_SOFT, 2)
rbox("DoorLatch", 1.1, 8.0, 2.8, (49.2, -2.0, 38.0), 0.45, M_BLACK_SOFT, 3)

# ============================================================ 丝印贴花
decal_plane("FrontPrint", 'Y-', FRONT_Y, 9.0, 48.0, 1.0, 45.0, M_FRONT_LOGO)
decal_plane("TopPrint", 'Z+', H, 7.0, 47.0, -6.0, 14.0, M_TOP_PRINT, flip_u=True, flip_v=True)
decal_plane("BackPrint", 'Y+', BACK_YEND, -14.0, 9.5, 2.4, 8.4, M_BACK_PRINT, flip_u=True)
decal_plane("BottomPrint", 'Z-', 0.0, -34.0, 12.0, -12.0, 12.0, M_BOTTOM_PRINT, flip_v=True)
decal_plane("SerialText", 'Z-', -0.18, SER_X0, SER_X1, -SER_H / 2, SER_H / 2, M_SERIAL, flip_v=True)
decal_plane("SelectSet", 'Z+', H, -25.4, -11.0, -2.4, 0.6, M_SELECTSET, flip_u=True, flip_v=True)
for _nm, _mt, _cx, _cy, _w, _d in (("OnLbl", M_BTN_ON, -24.7, 8.4, 7.0, 3.1),
                                  ("ModeLbl", M_BTN_MODE, -27.9, 4.4, 5.6, 2.9),
                                  ("PwrLbl", M_BTN_PWR, -20.8, 4.4, 5.6, 2.9)):
    decal_plane(_nm, 'Z+', H + 0.87, _cx - _w / 2, _cx + _w / 2, _cy - _d / 2, _cy + _d / 2, _mt,
                flip_u=True, flip_v=True, push=0.03)

# ============================================================ 包络归一
xs, ys, zs = [], [], []
for o in scene.objects:
    if o.type != 'MESH':
        continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        xs.append(w.x); ys.append(w.y); zs.append(w.z)
bbox0 = {"x": [min(xs) / S, max(xs) / S], "y": [min(ys) / S, max(ys) / S], "z": [min(zs) / S, max(zs) / S]}
print("HEADLESS " + json.dumps({"pre_bbox": {k: [round(a, 2) for a in v] for k, v in bbox0.items()}}))

_sx = 100.0 / (bbox0["x"][1] - bbox0["x"][0])
_sy = 32.0 / (bbox0["y"][1] - bbox0["y"][0])
_sz = 63.0 / (bbox0["z"][1] - bbox0["z"][0])
_cx = (bbox0["x"][0] + bbox0["x"][1]) / 2
_cy = (bbox0["y"][0] + bbox0["y"][1]) / 2
_zmin = bbox0["z"][0]
Mn = (Matrix.Diagonal((_sx, _sy, _sz, 1.0))
      @ Matrix.Translation((-_cx * S, -_cy * S, -_zmin * S)))
for o in scene.objects:
    o.matrix_world = Mn @ o.matrix_world

xs, ys, zs = [], [], []
for o in scene.objects:
    if o.type != 'MESH':
        continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        xs.append(w.x); ys.append(w.y); zs.append(w.z)
bbox = {"x": [min(xs) / S, max(xs) / S], "y": [min(ys) / S, max(ys) / S], "z": [min(zs) / S, max(zs) / S]}
size = {k: round(v[1] - v[0], 2) for k, v in bbox.items()}
tris = sum(len(o.data.loop_triangles) if o.data.loop_triangles else 0 for o in scene.objects if o.type == 'MESH')
print("HEADLESS " + json.dumps({"bbox_mm": {k: [round(a, 2) for a in v] for k, v in bbox.items()},
                                "size_mm": size, "objects": len(scene.objects)}))

os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=False,
                          export_apply=True, export_yup=True, export_image_format='AUTO')
# ---- GLB 后处理：丝印贴花 alphaMode 改 MASK（BLEND 在网页里会排序出错）
def patch_glb_alpha(path, names, cutoff=0.35):
    import struct
    b = open(path, 'rb').read()
    magic, ver, length = struct.unpack('<III', b[:12])
    off, chunks = 12, []
    while off < length:
        ln, ty = struct.unpack('<II', b[off:off + 8]); off += 8
        chunks.append([ty, b[off:off + ln]]); off += ln
    js = json.loads(chunks[0][1].decode('utf-8'))
    n = 0
    for m in js.get('materials', []):
        if m.get('name') in names:
            m['alphaMode'] = 'MASK'
            m['alphaCutoff'] = cutoff
            n += 1
    raw = json.dumps(js, separators=(',', ':')).encode('utf-8')
    raw += b' ' * ((4 - len(raw) % 4) % 4)
    chunks[0][1] = raw
    total = 12 + sum(8 + len(c[1]) for c in chunks)
    out = bytearray(struct.pack('<III', magic, ver, total))
    for ty, data in chunks:
        out += struct.pack('<II', len(data), ty) + data
    open(path, 'wb').write(bytes(out))
    return n


_n = patch_glb_alpha(OUT_GLB, {"BM21_front_logo", "BM21_top_print", "BM21_back_print",
                              "BM21_bottom_print", "BM21_serial", "BM21_selectset",
                              "BM21_btn_on", "BM21_btn_mode", "BM21_btn_pwr"})
print("HEADLESS " + json.dumps({"saved": OUT_BLEND, "glb": OUT_GLB, "mask_materials": _n}))