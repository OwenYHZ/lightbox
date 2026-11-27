from PIL import Image
p = r"E:/code/dshCode/Lightbox/realDevicePhotos/Konica Big Mini BM-21/IMG_20261125_165552.jpg"
im = Image.open(p)
print("size", im.size)
im2 = im.copy()
im2.thumbnail((900, 1200), Image.LANCZOS)
im2.save(r"E:/code/dshCode/Lightbox/scripts/bm21/_crops/right_face.png")
print("saved", im2.size)
