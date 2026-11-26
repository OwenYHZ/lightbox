# -*- coding: utf-8 -*-
import os
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
P = ROOT + "/realDevicePhotos/Konica Big Mini BM-21/"
OUT = ROOT + "/scripts/bm21/_crops/"
def crop(name, box, out, scale=1.0):
    im = Image.open(P + name).convert("RGB")
    c = im.crop(box); c = c.resize((max(1,int(c.width*scale)), max(1,int(c.height*scale))), Image.LANCZOS)
    c.save(OUT + out); print(out, c.size)
crop("IMG_20261125_165658.jpg", (900, 500, 3100, 2200), "u_front34.png", 0.6)
crop("IMG_20261125_165716.jpg", (700, 400, 3700, 2500), "u_back34.png", 0.55)
