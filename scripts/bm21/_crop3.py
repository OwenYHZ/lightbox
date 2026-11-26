from PIL import Image
SH = r"E:/code/dshCode/Lightbox/shots/bm21/"
im = Image.open(SH + "v9-bottom.png").convert("RGB")
c = im.crop((40, 60, 470, 220)); c = c.resize((int(c.width*2.2), int(c.height*2.2)), Image.LANCZOS)
c.save(SH + "z_bot3.png"); print(c.size)
