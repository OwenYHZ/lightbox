import numpy as np
from PIL import Image
im = Image.open(r"E:/code/dshCode/Lightbox/shots/bm21/v16-front.png").convert("RGBA")
a = np.asarray(im).astype(np.float32)
alpha = a[..., 3]
lum = a[..., :3].mean(axis=2)
# 机体 bbox：alpha>128
ys, xs = np.where(alpha > 128)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
ppm = (x1 - x0 + 1) / 100.0
print("body px x[%d,%d] y[%d,%d] ppm=%.2f" % (x0, x1, y0, y1, ppm))
cx = (x0 + x1) // 2
res = []
for frac in (0.05, 0.15, 0.25, 0.35, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.95):
    y = int(y0 + frac * (y1 - y0))
    x = cx
    while x > x0 and lum[y, x] > 120:
        x -= 1
    mm = (x - x0) / ppm
    res.append("Ztop%.0f:%.1f" % (63 * frac if False else 0, mm))
print("first_dark_mm per row(frac from top):",
      ["%.0f%%:%.1f" % (f * 100, float(r.split(':')[1])) for f, r in zip((0.05,0.15,0.25,0.35,0.45,0.5,0.55,0.65,0.75,0.85,0.95), res)])
