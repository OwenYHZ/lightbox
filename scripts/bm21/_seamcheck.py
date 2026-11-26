import numpy as np
from PIL import Image
im = Image.open(r"E:/code/dshCode/Lightbox/shots/bm21/v16-front.png").convert("RGBA")
a = np.asarray(im).astype(np.float32)
alpha = a[..., 3]; lum = a[..., :3].mean(axis=2)
ys, xs = np.where(alpha > 128)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
ppm = (x1 - x0 + 1) / 100.0
out = []
for frac in (0.05, 0.15, 0.25, 0.30, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95):
    y = int(y0 + frac * (y1 - y0))
    x = x0 + 2
    while x < x1 - 2 and lum[y, x] < 150:
        x += 1
    out.append("%d%%(Ztop%.0f):%.1f" % (frac * 100, 63 * frac, (x - x0) / ppm))
print("黑→香槟 边界 (mm from 握把端):")
print("  " + "  ".join(out))
