# -*- coding: utf-8 -*-
"""渲染 vs 官方图 并排对照图。用法：python make_contact.py <tag>"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
SH = ROOT + "/shots/bm21/"
TAG = sys.argv[1] if len(sys.argv) > 1 else "v1"
OUT = SH + "%s-contact.jpg" % TAG
PAIRS = [("front", "bm21-front.png"), ("top", "bm21-top.png"), ("back", "bm21-back.png"),
         ("bottom", "bm21-bottom.png"), ("quarter", "bm21-quarter.jpg")]
W = 760
F = ImageFont.truetype(r"C:/Windows/Fonts/arialbd.ttf", 22)


def load(p, w):
    im = Image.open(p).convert("RGBA")
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, (0, 0), im)
    s = w / bg.width
    return bg.resize((w, max(1, int(bg.height * s))), Image.LANCZOS)


rows = []
for mine, ref in PAIRS:
    a = load(SH + "%s-%s.png" % (TAG, mine), W)
    b = load(PH + ref, W)
    h = max(a.height, b.height)
    row = Image.new("RGB", (W * 2 + 12, h + 30), "white")
    row.paste(a, (0, 30)); row.paste(b, (W + 12, 30))
    d = ImageDraw.Draw(row)
    d.text((6, 4), "%s  (render %s)" % (mine, TAG), font=F, fill=(20, 20, 20))
    d.text((W + 18, 4), "official  %s" % ref, font=F, fill=(150, 40, 40))
    rows.append(row)

H = sum(r.height for r in rows) + 8 * (len(rows) - 1)
sheet = Image.new("RGB", (rows[0].width, H), "white")
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height + 8
sheet.save(OUT, quality=88)
print(OUT, sheet.size)