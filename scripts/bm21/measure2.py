# -*- coding: utf-8 -*-
"""BM-21 front 图像素量测：机身 bbox、镜圈、暗条、窗口。"""
import json
import numpy as np
from PIL import Image

ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"

im = Image.open(PH + "bm21-front.png").convert("RGB")
a = np.asarray(im).astype(np.float32)
lum = a.mean(axis=2)
sat = a.max(axis=2) - a.min(axis=2)
fg = (lum < 238) | (sat > 16)

# 只保留相机主体行范围（去掉水印卡与阴影）
fg2 = fg.copy()
fg2[545:] = False
ys, xs = np.where(fg2)
print("body-ish bbox", xs.min(), xs.max(), ys.min(), ys.max())

# 找机身左右边界：在 y=380..460（机身中段）每行最外非白
for y in (200, 300, 380, 420, 460, 500):
    r = np.where(fg2[y])[0]
    r = r[(r > 40) & (r < 1000)]
    print(f"y={y}: x {r.min()}..{r.max()}")
# 上下边界：在 x=200..800 每列最上/最下
for x in (120, 200, 300, 470, 600, 760, 850):
    c = np.where(fg2[:, x])[0]
    c = c[c > 60]
    print(f"x={x}: y {c.min()}..{c.max()}")

# 暗条（charcoal）bbox：亮度 < 130 且在大区域内
dark = lum < 130
dark[:140] = False
dark[540:] = False
dark[:, :300] = False   # 排除左侧黑握把
dark[:, 870:] = False
ys2, xs2 = np.where(dark)
print("dark strip bbox x", xs2.min(), xs2.max(), "y", ys2.min(), ys2.max())

# 镜头黑圈：区域 x 320..640 y 320..540，阈值 < 95
reg = np.zeros_like(dark)
reg[300:560, 320:660] = True
lk = (lum < 95) & reg
ys3, xs3 = np.where(lk)
print("lens dark bbox x", xs3.min(), xs3.max(), "y", ys3.min(), ys3.max(),
      "w", xs3.max()-xs3.min()+1, "h", ys3.max()-ys3.min()+1,
      "cx", (xs3.min()+xs3.max())/2, "cy", (ys3.min()+ys3.max())/2)

# 握把黑区 bbox（左侧）
grip = (lum < 95)
grip[:120] = False; grip[545:] = False; grip[:, 300:] = False
ys4, xs4 = np.where(grip)
print("grip dark bbox x", xs4.min(), xs4.max(), "y", ys4.min(), ys4.max())

# 顶面小按键（MODE/ON）：亮面里的小黑椭圆，先看 y 80..130 区域
labels = (lum < 150)
print("label pixels y<140", int(labels[:140].sum()))
