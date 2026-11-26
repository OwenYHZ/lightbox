# -*- coding: utf-8 -*-
"""BM-21 逐张对照：左官方/实拍，右渲染，同物理宽度。python make_compare.py <tag>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
UP = ROOT + "/realDevicePhotos/Konica Big Mini BM-21/"
SH = ROOT + "/shots/bm21/"
OUT = SH + "compare/"
TAG = sys.argv[1] if len(sys.argv) > 1 else "v17"
os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype(r"C:/Windows/Fonts/arialbd.ttf", 22)
FS = ImageFont.truetype(r"C:/Windows/Fonts/arial.ttf", 17)
W = 760

# 官方图标定：body x0/x1 像素、px/mm、机身中心像素
CAL = {
    "front": ("bm21-front.png", 88, 872, 7.84, 351),
    "back": ("bm21-back.png", 104, 899, 7.95, 300),
    "top": ("bm21-top.png", 29, 995, 9.66, 285),
    "bottom": ("bm21-bottom.png", 0, 1011, 10.11, 340),
}


def render_alpha_bbox(p):
    im = Image.open(p).convert("RGBA")
    a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 40)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def fit(p, box=None, w=W):
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, (0, 0), im)
    if box:
        bg = bg.crop(box)
    s = w / bg.width
    return bg.resize((w, max(1, int(bg.height * s))), Image.LANCZOS)


def pair(name, left_img, right_img, note=""):
    h = max(left_img.height, right_img.height)
    tile = Image.new("RGB", (W * 2 + 12, h + 40), "white")
    tile.paste(left_img, (0, 40)); tile.paste(right_img, (W + 12, 40))
    d = ImageDraw.Draw(tile)
    d.text((6, 6), "%s  —  %s" % (TAG, name), font=F, fill=(20, 20, 20))
    d.text((6, 26), "official / user photo", font=FS, fill=(150, 40, 40))
    d.text((W + 18, 26), "render %s" % TAG, font=FS, fill=(30, 90, 40))
    if note:
        d.text((6, h + 22), note, font=FS, fill=(60, 60, 60))
    tile.save(OUT + "cmp-%s.png" % name)
    print("cmp-%s.png" % name, tile.size)


# ---------- 8 视角
for name in ("front", "back", "top", "bottom"):
    ref, x0, x1, ppm, cy = CAL[name]
    lw = int((x1 - x0))
    left = fit(PH + ref, (x0 - 6, max(0, cy - int(lw * 0.55)), x1 + 6, cy + int(lw * 0.55)))
    right = fit(SH + "%s-%s.png" % (TAG, name), render_alpha_bbox(SH + "%s-%s.png" % (TAG, name)))
    pair(name, left, right)

LEFT_SRC = {"left": UP + "IMG_20261125_165515.jpg", "right": UP + "IMG_20261125_165644.jpg",
            "quarter-fl": PH + "bm21-quarter.jpg", "quarter-br": UP + "IMG_20261125_165716.jpg"}
CROPS = {"left": (420, 620, 2650, 3450), "right": (420, 620, 2650, 3450),
         "quarter-fl": (300, 60, 2650, 1400), "quarter-br": (500, 400, 3600, 2800)}
for name, src in LEFT_SRC.items():
    p = SH + "%s-%s.png" % (TAG, name)
    if not os.path.exists(p):
        continue
    left = fit(src, CROPS[name])
    right = fit(p, render_alpha_bbox(p))
    pair(name, left, right, note="官方/实拍为透视机位，右侧为固定机位（非严格同尺度）")

# ---------- 4 特写（同物理宽度：先按 mm 裁官方，再统一缩放到 760）
DET = {
    "close-lens": (PH + "bm21-front.png", 7.84, 468, 395, 46),
    "close-top": (PH + "bm21-top.png", 9.66, 377, 291, 62),
    "close-grip": (PH + "bm21-front.png", 7.84, 276, 342, 58),
    "close-bottom": (PH + "bm21-bottom.png", 10.11, 566, 340, 74),
}
for name, (src, ppm, cx, cy, mm) in DET.items():
    p = SH + "%s-%s.png" % (TAG, name)
    if not os.path.exists(p):
        continue
    half = mm / 2.0 * ppm
    box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
    left = fit(src, box)
    right = fit(p, render_alpha_bbox(p))
    pair(name, left, right, note="detail %s — 同物理宽度 %.0f mm" % (name.replace("close-", ""), mm))
