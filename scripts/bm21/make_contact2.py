# -*- coding: utf-8 -*-
"""BM-21 多视角对照拼图：8 视角 + 4 特写。用法 python make_contact2.py <tag>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
UP = ROOT + "/realDevicePhotos/Konica Big Mini BM-21/"
SH = ROOT + "/shots/bm21/"
TAG = sys.argv[1] if len(sys.argv) > 1 else "v17"
F = ImageFont.truetype(r"C:/Windows/Fonts/arialbd.ttf", 24)
FS = ImageFont.truetype(r"C:/Windows/Fonts/arial.ttf", 18)


def load_rgba(p, w):
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, (0, 0), im)
    s = w / bg.width
    return bg.resize((w, max(1, int(bg.height * s))), Image.LANCZOS)


def load_crop(p, box, w):
    im = Image.open(p).convert("RGB")
    c = im.crop(box)
    s = w / c.width
    return c.resize((w, max(1, int(c.height * s))), Image.LANCZOS)


def sheet(rows, out, cols_w=760):
    tiles = []
    for title, a, b in rows:
        h = max(a.height, b.height)
        tile = Image.new("RGB", (cols_w * 2 + 14, h + 34), "white")
        tile.paste(a, (0, 34)); tile.paste(b, (cols_w + 14, 34))
        d = ImageDraw.Draw(tile)
        d.text((6, 6), title, font=F, fill=(20, 20, 20))
        d.text((cols_w + 20, 10), "official / user photo", font=FS, fill=(150, 40, 40))
        tiles.append(tile)
    H = sum(t.height for t in tiles) + 10 * (len(tiles) - 1)
    S = Image.new("RGB", (tiles[0].width, H), "white")
    y = 0
    for t in tiles:
        S.paste(t, (0, y)); y += t.height + 10
    S.save(out, quality=88)
    print(out, S.size)


rows = []
for name, ref, crop in (("front", PH + "bm21-front.png", None),
                        ("back", PH + "bm21-back.png", None),
                        ("left", UP + "IMG_20261125_165515.jpg", None),
                        ("right", UP + "IMG_20261125_165644.jpg", None),
                        ("top", PH + "bm21-top.png", None),
                        ("bottom", PH + "bm21-bottom.png", None),
                        ("quarter-fl", PH + "bm21-quarter.jpg", None),
                        ("quarter-br", UP + "IMG_20261125_165716.jpg", None)):
    p = SH + "%s-%s.png" % (TAG, name)
    if not os.path.exists(p):
        continue
    a = load_rgba(p, 760)
    b = load_crop(ref, (0, 0, Image.open(ref).width, Image.open(ref).height), 760) if crop is None else load_crop(ref, crop, 760)
    rows.append(("render %s  —  %s" % (TAG, name), a, b))
sheet(rows, SH + "%s-sheet-views.jpg" % TAG)

crows = []
for name, ref, crop in (("close-lens", PH + "bm21-front.png", (250, 200, 690, 640)),
                        ("close-top", PH + "bm21-top.png", (280, 290, 780, 480)),
                        ("close-grip", PH + "bm21-front.png", (55, 110, 395, 570)),
                        ("close-bottom", PH + "bm21-bottom.png", (240, 245, 780, 500))):
    p = SH + "%s-%s.png" % (TAG, name)
    if not os.path.exists(p):
        continue
    a = load_rgba(p, 760)
    b = load_crop(ref, crop, 760)
    crows.append(("close-up %s" % name, a, b))
sheet(crows, SH + "%s-sheet-closeups.jpg" % TAG)
