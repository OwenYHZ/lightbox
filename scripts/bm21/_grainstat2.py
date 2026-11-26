import numpy as np, sys
from PIL import Image, ImageFilter
tag = sys.argv[1]
def stat(path, box):
    im = Image.open(path).convert("L").crop(box)
    a = np.asarray(im).astype(np.float64)
    bl = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float64)
    hp = a - bl
    return hp.std(), a.mean(), hp.std() / max(1e-6, a.mean()) * 100

# 平坦香槟区（避开丝印/镜圈/边缘）：正面图右侧空白带
patch_off = (700, 240, 860, 330)
patch_r = (700, 240, 860, 330)
o = stat(r"E:/code/dshCode/Lightbox/realDevicePhotos/official/bm21/bm21-front.png", patch_off)
r = stat(r"E:/code/dshCode/Lightbox/shots/bm21/%s-front.png" % tag, patch_r)
print("flat champagne patch  official σ/mean = %.1f/%.1f = %.1f%%" % o)
print("                      render   σ/mean = %.1f/%.1f = %.1f%%" % r)
