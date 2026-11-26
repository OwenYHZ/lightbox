# -*- coding: utf-8 -*-
import numpy as np
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
im = Image.open(PH + "bm21-front.png").convert("RGB")
a = np.asarray(im).astype(np.float32); lum = a.mean(axis=2)

def runs(mask, lo, hi):
    out = []; s = None
    for i in range(lo, hi):
        if mask[i] and s is None: s = i
        elif not mask[i] and s is not None:
            out.append((s, i-1)); s = None
    if s is not None: out.append((s, hi-1))
    return [r for r in out if r[1]-r[0] >= 2]

print("=== dark bands per column (y 100..330, lum<160) ===")
for x in (300, 330, 360, 400, 440, 470, 500, 540, 580, 620, 660, 700, 740, 780, 820, 850):
    m = lum[:, x] < 160
    print(f"x={x}: {runs(m, 100, 330)}")

print("=== bright spans per column (y 60..560, lum>195) ===")
for x in (300, 470, 620, 700, 820):
    m = lum[:, x] > 195
    print(f"x={x}: {runs(m, 60, 560)}")

print("=== grip black band columns (y 300..320, lum<120) ===")
m = lum[310] < 120
print("row310 dark:", runs(m, 60, 900))
m = lum[100] < 160
print("row100 dark(<160):", runs(m, 60, 900))
m = lum[240] < 160
print("row240 dark(<160):", runs(m, 60, 900))
