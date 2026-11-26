import numpy as np, sys
from PIL import Image
tag = sys.argv[1] if len(sys.argv) > 1 else "v18"
r = np.asarray(Image.open(r"E:/code/dshCode/Lightbox/shots/bm21/%s-front.png" % tag).convert("RGBA")).astype(float)
a = r[..., 3]; ys, xs = np.where(a > 128)
x0, x1, y0 = xs.min(), xs.max(), ys.min()
ppm = (x1 - x0) / 100.0
def S(xmm, ztop):
    return [int(v) for v in r[int(y0 + ztop * ppm), int(x0 + (xmm + 50) * ppm), :3]]
print(tag, "front face", S(40, 20), S(30, 25), "| grip", S(-40, 25), "| ring", S(-1.5 - 12, 24.4 + 4))
f = np.asarray(Image.open(r"E:/code/dshCode/Lightbox/shots/bm21/%s-close-lens.png" % tag).convert("RGBA")).astype(float)
print("close-lens center px:", [int(v) for v in f[f.shape[0]//2, f.shape[1]//2, :3]])
