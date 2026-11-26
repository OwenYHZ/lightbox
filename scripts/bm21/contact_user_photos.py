# -*- coding: utf-8 -*-
import glob, os
from PIL import Image
ROOT = r"E:/code/dshCode/Lightbox"
src = sorted(glob.glob(ROOT + "/realDevicePhotos/Konica Big Mini BM-21/*.jpg"))
OUT = ROOT + "/scripts/bm21/_crops/"
os.makedirs(OUT, exist_ok=True)
print(len(src))
tiles = []
for p in src:
    im = Image.open(p)
    print(os.path.basename(p), im.size)
    im.thumbnail((360, 360), Image.LANCZOS)
    tiles.append((os.path.basename(p), im))
cols = 4
rows = (len(tiles) + cols - 1) // cols
W, H = 370, 390
sheet = Image.new("RGB", (cols * W, rows * H), "white")
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(tiles):
    x, y = (i % cols) * W, (i // cols) * H
    sheet.paste(im, (x + 5, y + 5))
    d.text((x + 5, y + 365), n[-13:], fill="black")
sheet.save(OUT + "userphotos_sheet.jpg", quality=88)
print("sheet", sheet.size)
