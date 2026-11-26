# -*- coding: utf-8 -*-
import numpy as np
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
im = Image.open(PH + "bm21-front.png").convert("RGB")
a = np.asarray(im).astype(np.float32); lum = a.mean(axis=2)

def prof(x, y0=60, y1=560, step=4):
    print(f"--- col x={x}")
    out = []
    for y in range(y0, y1, step):
        out.append(f"{y}:{int(lum[y, x])}")
    for i in range(0, len(out), 12):
        print("  " + " ".join(out[i:i+12]))

def prof_row(y, x0=60, x1=900, step=6):
    print(f"--- row y={y}")
    out = []
    for x in range(x0, x1, step):
        out.append(f"{x}:{int(lum[y, x])}")
    for i in range(0, len(out), 14):
        print("  " + " ".join(out[i:i+14]))

prof(700)
prof(140)
prof_row(300)
prof_row(150)
prof_row(430)
