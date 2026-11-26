# -*- coding: utf-8 -*-
import os
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
OUT = ROOT + "/scripts/bm21/_crops/"
def crop(name, box, out, scale=2):
    im = Image.open(PH + name).convert("RGB")
    c = im.crop(box); c = c.resize((int(c.width*scale), int(c.height*scale)), Image.LANCZOS)
    c.save(OUT + out); print(out, c.size)
crop("bm21-top.png", (330, 60, 720, 320), "t_bigcircle.png", 2.6)
crop("bm21-quarter.jpg", (300, 30, 1400, 480), "q_topface.png", 1.15)
crop("bm21-front.png", (60, 60, 400, 230), "f_shutterzone.png", 3.0)
