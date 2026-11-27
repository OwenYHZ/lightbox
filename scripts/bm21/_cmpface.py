from PIL import Image, ImageFont, ImageDraw
import numpy as np
ROOT = r"E:/code/dshCode/Lightbox"
SH = ROOT + "/shots/bm21/"
ph = Image.open(ROOT + "/realDevicePhotos/Konica Big Mini BM-21/IMG_20261125_165552.jpg").convert("RGB")
b = ph.crop((900, 760, 2450, 3800))
r = Image.open(SH + "v25-close-left.png").convert("RGBA")
a = np.asarray(r)[..., 3]; ys, xs = np.where(a > 40)
r = r.crop((int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1))
bg = Image.new("RGB", r.size, "white"); bg.paste(r, (0,0), r)
W = 700
def fit(im, w=W):
    s = w / im.width
    return im.resize((w, max(1, int(im.height*s))), Image.LANCZOS)
b2, r2 = fit(b), fit(bg)
H = max(b2.height, r2.height)
tile = Image.new("RGB", (W*2+12, H+44), "white")
tile.paste(b2, (0, 44)); tile.paste(r2, (W+12, 44))
d = ImageDraw.Draw(tile)
F = ImageFont.truetype(r"C:/Windows/Fonts/arialbd.ttf", 24)
FS = ImageFont.truetype(r"C:/Windows/Fonts/arial.ttf", 18)
d.text((6, 6), "v25 — +X 香槟端面（左=实拍 IMG_165552 / 右=渲染 close-left）", font=F, fill=(20,20,20))
d.text((6, 26), "physical width 28 mm (depth) — both scaled to 700 px", font=FS, fill=(90,90,90))
tile.save(SH + "compare/cmp-right-face.png", quality=90)
print("saved", tile.size, "render face px", bg.size)
