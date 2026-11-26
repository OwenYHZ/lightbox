import numpy as np
from PIL import Image
import glob, os
for p in sorted(glob.glob(r"E:/code/dshCode/Lightbox/scripts/bm21/tex/*.png")):
    im = Image.open(p)
    a = np.asarray(im)
    print("%-22s %-5s %s alpha[min,max]=%s  rgb@corner=%s" % (
        os.path.basename(p), im.mode, im.size,
        (int(a[...,3].min()), int(a[...,3].max())) if a.ndim == 3 and a.shape[2] == 4 else "n/a",
        a[0,0].tolist()))
