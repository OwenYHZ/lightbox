import numpy as np, sys
from PIL import Image, ImageFilter
tag = sys.argv[1]
def stat(path, box=None):
    im = Image.open(path).convert("L")
    if box: im = im.crop(box)
    a = np.asarray(im).astype(np.float64)
    bl = np.asarray(im.filter(ImageFilter.GaussianBlur(5))).astype(np.float64)
    hp = a - bl
    return hp.std(), a.mean(), hp.std() / max(1e-6, a.mean()) * 100
print("official front  σ/mean = %.1f / %.1f = %.1f%%" % stat(r"E:/code/dshCode/Lightbox/realDevicePhotos/official/bm21/bm21-front.png", (600, 300, 820, 500)))
print("%s front      σ/mean = %.1f / %.1f = %.1f%%" % ((tag,) + stat(r"E:/code/dshCode/Lightbox/shots/bm21/%s-front.png" % tag, (620, 300, 800, 460))))
