from PIL import Image
SH = r"E:/code/dshCode/Lightbox/shots/bm21/"
im = Image.open(SH + "v22-close-lens.png").convert("RGB")
w, h = im.size
c = im.crop((int(w*0.35), int(h*0.30), int(w*0.68), int(h*0.72)))
c = c.resize((c.width*2, c.height*2), Image.LANCZOS)
c.save(SH + "z_barrier.png"); print(c.size)
