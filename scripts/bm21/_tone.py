import numpy as np
from PIL import Image
ph = np.asarray(Image.open(r"E:/code/dshCode/Lightbox/realDevicePhotos/official/bm21/bm21-front.png").convert("RGB")).astype(float)
print("official front face samples:")
for (x, y) in ((700, 350), (760, 460), (620, 520), (300, 300), (520, 300)):
    print("   (%d,%d) =" % (x, y), [int(v) for v in ph[y, x]])
print("official strip sample:", [int(v) for v in ph[200, 700]])
print("official grip sample:", [int(v) for v in ph[350, 160]])
print("official lens ring:", [int(v) for v in ph[350, 480]])
r = np.asarray(Image.open(r"E:/code/dshCode/Lightbox/shots/bm21/v17-front.png").convert("RGBA")).astype(float)
a = r[..., 3]; ys, xs = np.where(a > 128)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
ppm = (x1 - x0) / 100.0
def S(xmm, ztop):
    px = int(x0 + (xmm + 50) * ppm); py2 = int(y0 + ztop * ppm)
    return [int(v) for v in r[py2, px, :3]]
print("render: front face", S(40, 20), S(30, 25), "strip", S(35, 56), "grip", S(-40, 25))
