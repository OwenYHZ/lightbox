from PIL import Image
SH = r"E:/code/dshCode/Lightbox/shots/bm21/"
def crop(src, box, out, scale=2):
    im = Image.open(SH + src).convert("RGB")
    c = im.crop(box); c = c.resize((int(c.width*scale), int(c.height*scale)), Image.LANCZOS)
    c.save(SH + out); print(out, c.size)
crop("t5-top.png", (40, 80, 480, 230), "z_topprint.png", 2.4)
crop("t5-front.png", (420, 180, 700, 420), "z_frontprint.png", 2.0)
