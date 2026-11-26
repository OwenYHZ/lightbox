import os
from PIL import Image
SH = r"E:/code/dshCode/Lightbox/shots/bm21/"
def crop(src, box, out, scale=2):
    im = Image.open(SH + src).convert("RGB")
    c = im.crop(box); c = c.resize((int(c.width*scale), int(c.height*scale)), Image.LANCZOS)
    c.save(SH + out); print(out, c.size)
crop("t5-bottom.png", (40, 40, 400, 170), "z_bot2.png", 2.4)
crop("t5-front.png", (0, 20, 340, 440), "z_grip.png", 1.5)
