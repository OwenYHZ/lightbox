# -*- coding: utf-8 -*-
import numpy as np
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"

def stats(name, ycut=None, xcut=None):
    im = Image.open(PH + name).convert("RGB")
    a = np.asarray(im).astype(np.float32); lum = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    fg = (lum < 236) | (sat > 18)
    if ycut: fg[ycut:] = False
    if xcut: fg[xcut:] = False
    # 行/列投影，找主体
    rows = fg.sum(axis=1); cols = fg.sum(axis=0)
    print(name)
    nz = np.where(rows > 20)[0]
    print("  rows>20  y", nz.min(), nz.max())
    nzc = np.where(cols > 20)[0]
    print("  cols>20  x", nzc.min(), nzc.max())
    for frac in (0.1, 0.3, 0.5, 0.7, 0.9):
        y = int(nz.min() + frac * (nz.max() - nz.min()))
        r = np.where(fg[y])[0]
        print(f"  y={y}: x {r.min()}..{r.max()}  w={r.max()-r.min()+1}")

stats("bm21-back.png", ycut=560)
stats("bm21-bottom.png", ycut=500)
stats("bm21-top.png", ycut=470)
