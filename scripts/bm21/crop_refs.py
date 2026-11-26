# -*- coding: utf-8 -*-
import os
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
OUT = ROOT + "/scripts/bm21/_crops/"
os.makedirs(OUT, exist_ok=True)
def crop(name, box, out, scale=2):
    im = Image.open(PH + name).convert("RGB")
    c = im.crop(box)
    c = c.resize((int(c.width*scale), int(c.height*scale)), Image.LANCZOS)
    c.save(OUT + out)
    print(out, c.size)
crop("bm21-front.png", (330, 260, 640, 545), "front_lens.png", 2.2)
crop("bm21-front.png", (60, 70, 900, 300), "front_topstrip.png", 1.6)
crop("bm21-front.png", (600, 260, 900, 560), "front_righttext.png", 2.2)
crop("bm21-top.png", (20, 90, 560, 500), "top_left.png", 1.6)
crop("bm21-top.png", (500, 90, 1024, 500), "top_right.png", 1.6)
crop("bm21-back.png", (380, 90, 900, 400), "back_detail.png", 1.8)
crop("bm21-bottom.png", (200, 240, 900, 530), "bottom_detail.png", 1.5)
crop("bm21-quarter.jpg", (600, 60, 1500, 700), "q_lens.png", 1.2)
crop("bm21-quarter.jpg", (200, 100, 900, 900), "q_grip.png", 1.2)
