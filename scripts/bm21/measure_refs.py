# -*- coding: utf-8 -*-
"""BM-21 参考图像素量测（自用，最终以 docs/bm21-spec.md 为准）。"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = r"E:/code/dshCode/Lightbox"
PH = ROOT + "/realDevicePhotos/official/bm21/"
OUT = ROOT + "/scripts/bm21/_crops/"
os.makedirs(OUT, exist_ok=True)

def load(name):
    im = Image.open(PH + name).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    return im, a

def fg_mask(a, thr=246):
    # 背景近白；前景 = 明显暗于白
    m = (a.min(axis=2) < thr - 8) | (a.max(axis=2) < thr)
    # 更稳的判据：亮度 / 饱和度
    lum = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    return (lum < 240) | (sat > 14)

def report(name, maxy=None):
    im, a = load(name)
    m = fg_mask(a)
    if maxy:
        m[maxy:] = False
    ys, xs = np.where(m)
    print(f"--- {name} {im.size}")
    print(f"  fg bbox x[{xs.min()},{xs.max()}] y[{ys.min()},{ys.max()}]  w={xs.max()-xs.min()+1} h={ys.max()-ys.min()+1}")
    return im, a, m

def scans(name, rows, cols=None, maxy=None):
    im, a, m = load(name)[0], load(name)[1], None
    im, a = load(name)
    m = fg_mask(a)
    if maxy: m[maxy:] = False
    print(f"--- scans {name}")
    for y in rows:
        xs = np.where(m[y])[0]
        if len(xs):
            print(f"  row y={y}: x[{xs.min()}..{xs.max()}] w={xs.max()-xs.min()+1}")
        else:
            print(f"  row y={y}: empty")

def crops(name, boxes, scale=3):
    im, _ = load(name)
    base = os.path.splitext(name)[0]
    for i, b in enumerate(boxes):
        c = im.crop(b)
        c = c.resize((c.width*scale, c.height*scale), Image.LANCZOS)
        p = OUT + f"{base}_c{i}.png"
        c.save(p)
        print("  crop", p, c.size, "src", b)

if __name__ == "__main__":
    for n in ("bm21-front.png","bm21-top.png","bm21-back.png","bm21-bottom.png"):
        report(n, maxy=560 if n!="bm21-top.png" else 500)
    print()
    scans("bm21-front.png", [200, 300, 400, 500], maxy=560)
    scans("bm21-top.png", [100, 200, 300, 400], maxy=500)
