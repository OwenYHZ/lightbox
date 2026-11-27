# -*- coding: utf-8 -*-
"""BM-21 贴图：丝印全部 RGBA 透明底（alphaMode=MASK），另出磨砂颗粒法线图。"""
import os, math, random
from PIL import Image, ImageDraw, ImageFont

ROOT = r"E:/code/dshCode/Lightbox"
OUT = ROOT + "/scripts/bm21/tex/"
os.makedirs(OUT, exist_ok=True)
F_BOLD = r"C:/Windows/Fonts/arialbd.ttf"
F_REG = r"C:/Windows/Fonts/arial.ttf"
F_VERD = r"C:/Windows/Fonts/verdanab.ttf"


def font(px, path=F_BOLD):
    return ImageFont.truetype(path, max(8, int(px)))


def fit_text(im, text, box, color, fpath=F_BOLD, stretch=1.0, anchor="left"):
    xs = sorted([box[0], box[2]]); ys = sorted([box[1], box[3]])
    x0, x1 = int(xs[0]), int(xs[1]); y0, y1 = int(ys[0]), int(ys[1])
    H = max(2, y1 - y0); W = max(2, x1 - x0)
    f = font(H * 3, fpath)
    bb = f.getbbox(text)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    tmp = Image.new("L", (tw + 8, th + 8), 0)
    ImageDraw.Draw(tmp).text((4 - bb[0], 4 - bb[1]), text, font=f, fill=255)
    nw, nh = max(1, int(tw * H / th * stretch)), H
    if nw > W:
        nw = W
    tmp = tmp.resize((nw, nh), Image.LANCZOS)
    bw = nw
    px = x1 - bw if anchor == "right" else (x0 + (W - bw) // 2 if anchor == "center" else x0)
    im.paste(Image.new("RGBA", (bw, nh), color + (255,)), (px, y0), tmp)


def canvas(wmm, hmm, ppm):
    return Image.new("RGBA", (int(wmm * ppm), int(hmm * ppm)), (0, 0, 0, 0))


# ---------------- 正面丝印（贴花平面覆盖 X 9..48, Z 1..45 → 39 x 44 mm）
def front_logo():
    ppm = 34
    im = canvas(39.0, 44.0, ppm)
    def M(x, z):
        return (int((x - 9.0) * ppm), int((45.0 - z) * ppm))
    fit_text(im, "Konica", (*M(25.4, 39.2), *M(40.5, 35.5)), (104, 103, 97), stretch=1.0)
    fit_text(im, "big mini", (*M(23.5, 27.4), *M(40.1, 23.6)), (135, 133, 125), F_VERD, stretch=1.0)
    fit_text(im, "RED EYE REDUCTION", (*M(23.3, 21.5), *M(39.7, 20.0)), (120, 118, 111), F_REG)
    fit_text(im, "AUTO FOCUS BM-21", (*M(23.3, 19.65), *M(40.0, 18.1)), (120, 118, 111), F_REG)
    d = ImageDraw.Draw(im)
    for rz in (14.9, 9.8):
        for cx in (29.1, 33.9, 38.5):
            px, py = M(cx, rz)
            r = 0.90 * ppm
            d.ellipse([px - r, py - r, px + r, py + r], fill=(150, 146, 137, 255))
            d.arc([px - r, py - r, px + r, py + r], 195, 345, fill=(96, 94, 88, 255), width=2)
    im.save(OUT + "front_logo.png")
    print("front_logo", im.size)


# ---------------- 镜圈弧字（不透明盘面：黑底白字）
def arc_text(im, cx, cy, r, text, px_size, color, top=True):
    f = font(px_size)
    adv = [(f.getbbox(ch)[2] - f.getbbox(ch)[0]) + px_size * 0.14 for ch in text]
    ang_total = sum(adv) / r
    theta = (math.radians(90) + ang_total / 2) if top else (math.radians(270) - ang_total / 2)
    step = -1 if top else 1
    for ch, w in zip(text, adv):
        dth = (w / r) * step
        ang = theta + dth / 2
        if ch != " ":
            tile = Image.new("RGBA", (int(px_size * 3), int(px_size * 3)), (0, 0, 0, 0))
            ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), ch, font=f,
                                      fill=color + (255,), anchor="mm")
            rot = (math.degrees(ang) - 90) if top else (math.degrees(ang) + 90)
            tile = tile.rotate(rot, resample=Image.BICUBIC, expand=False)
            im.alpha_composite(tile, (int(cx + math.cos(ang) * r - tile.width / 2),
                                      int(cy - math.sin(ang) * r - tile.height / 2)))
        theta += dth


def lens_face():
    SZ = 1200
    ppm = SZ / 30.0
    im = Image.new("RGBA", (SZ, SZ), (17, 17, 19, 255))
    d = ImageDraw.Draw(im, "RGBA")
    cx = cy = SZ / 2
    for r, c in ((15.0, (30, 30, 33)), (14.55, (16, 16, 18)),
                 (13.9, (23, 23, 26)), (13.6, (12, 12, 14))):
        rr = r * ppm
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=c + (255,))
    arc_text(im, cx, cy, 12.55 * ppm, "KONICA LENS", int(1.85 * ppm), (238, 238, 232), top=True)
    arc_text(im, cx, cy, 12.40 * ppm, "AUTO FOCUS 30mm F4.5", int(1.80 * ppm), (238, 238, 232), top=False)
    r_in = 10.2 * ppm
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], fill=(20, 20, 22, 255))
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=(48, 48, 52, 255), width=4)
    im.save(OUT + "lens_face.png")
    print("lens_face", im.size)


# ---------------- 顶面丝印：三行块（覆盖 X 7..47, Y -6..14）
def top_print():
    ppm = 34
    im = canvas(40.0, 20.0, ppm)
    def M(x, y):
        return (int((x - 7.0) * ppm), int((y + 6.0) * ppm))
    # 三行块：x 24.9..41.5，总高 4.9（big mini / RED EYE / AUTO FOCUS）
    fit_text(im, "big mini", (*M(24.9, 6.0), *M(41.5, 3.3)), (168, 164, 153), F_VERD)
    fit_text(im, "RED EYE REDUCTION", (*M(24.9, 9.5), *M(41.5, 8.3)), (176, 172, 161), F_REG)
    fit_text(im, "AUTO FOCUS BM-21", (*M(24.9, 7.9), *M(41.5, 6.6)), (176, 172, 161), F_REG)
    im.save(OUT + "top_print.png")
    print("top_print", im.size)


def back_print():
    ppm = 40
    im = canvas(24.0, 8.0, ppm)
    fit_text(im, "Konica FILM", (int(0.6 * ppm), int(1.6 * ppm), int(21.0 * ppm), int(5.6 * ppm)),
             (238, 238, 236))
    im.save(OUT + "back_print.png")
    print("back_print", im.size)


def bottom_print():
    ppm = 34
    im = canvas(58.0, 24.0, ppm)
    def M(x, y):
        return (int((x + 34.0) * ppm), int((y + 12.0) * ppm))
    fit_text(im, "CE", (*M(-15.9, -2.2), *M(-6.5, 2.6)), (150, 146, 136), F_REG)
    fit_text(im, "KONICA CORPORATION", (*M(-3.0, 7.7), *M(20.0, 5.3)), (116, 114, 106), F_REG)
    im.save(OUT + "bottom_print.png")
    print("bottom_print", im.size)


def serial():
    ppm = 44
    im = canvas(18.1, 4.5, ppm)
    d = ImageDraw.Draw(im)
    d.text((im.width / 2, im.height / 2 + 1), "B0035423", font=font(im.height * 0.72),
           fill=(236, 236, 232, 255), anchor="mm")
    im.save(OUT + "serial.png")
    print("serial", im.size)


def endface_prints():
    """端面丝印：竖排（照片里 OPEN▷ / BATT▼ 从下往上读），透明底。"""
    im = canvas(7.0, 5.0, 44)          # BATT（竖排 7 高 x 5 宽）
    d = ImageDraw.Draw(im)
    tmp = canvas(14.0, 3.0, 44)
    ImageDraw.Draw(tmp).text((0.6 * 44, 1.5 * 44), "BATT", font=font(2.2 * 44),
                             fill=(72, 72, 70, 255), anchor="lm")
    ImageDraw.Draw(tmp).polygon([(9.6 * 44, 0.7 * 44), (11.0 * 44, 0.7 * 44), (10.3 * 44, 2.2 * 44)],
                                fill=(72, 72, 70, 255))
    im.paste(tmp.rotate(90, expand=True), (0, 0))
    im.save(OUT + "batt_print.png")
    im = canvas(6.2, 5.0, 44)          # OPEN▷
    tmp = canvas(12.0, 3.4, 44)
    ImageDraw.Draw(tmp).text((0.5 * 44, 1.7 * 44), "OPEN", font=font(2.0 * 44),
                             fill=(72, 72, 70, 255), anchor="lm")
    ImageDraw.Draw(tmp).polygon([(8.6 * 44, 0.9 * 44), (10.6 * 44, 1.7 * 44), (8.6 * 44, 2.5 * 44)],
                                fill=(72, 72, 70, 255))
    im.paste(tmp.rotate(90, expand=True), (0, 0))
    im.save(OUT + "open_print.png")
    print("endface prints ok")


def buttons():
    for name, txt, w, h in (("on", "ON", 7.4, 3.4), ("mode", "MODE", 6.0, 3.2), ("pwr", "I/O", 6.0, 3.2)):
        ppm = 44
        im = canvas(w, h, ppm)
        ImageDraw.Draw(im).text((im.width / 2, im.height / 2 + 1), txt,
                                font=font(im.height * 0.62), fill=(240, 240, 238, 255), anchor="mm")
        im.save(OUT + "btn_%s.png" % name)
    ppm = 44
    im = canvas(14.0, 3.0, ppm)
    ImageDraw.Draw(im).text((im.width / 2, im.height / 2), "SELECT SET",
                            font=font(1.8 * ppm, F_REG), fill=(176, 172, 161, 255), anchor="mm")
    im.save(OUT + "selectset.png")
    print("buttons ok")


# ---------------- 磨砂颗粒法线（可平铺，细噪声）
def grain(size=512, strength=0.26):
    """可平铺（FFT 合成的整数频率噪声）磨砂颗粒法线图。"""
    import numpy as np
    rng = np.random.default_rng(21)
    n = size
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(n)[None, :]
    fr = np.sqrt(fx * fx + fy * fy)
    fr[0, 0] = 1e-6
    amp = (1.0 / fr) ** 1.15
    amp[0, 0] = 0.0
    amp[fr > 0.28] = 0.0              # 高频截止 → 颗粒尺度约 0.3-0.5mm（UV 7mm）
    phase = rng.random((n, n)) * 2 * np.pi
    spec = amp * np.exp(1j * phase)
    h = np.real(np.fft.ifft2(spec))
    h = (h - h.min()) / (h.max() - h.min())
    gy, gx = np.gradient(h)
    nx = -gx * strength * 20.0
    ny = -gy * strength * 20.0
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    img = np.zeros((n, n, 3), dtype=np.uint8)
    img[..., 0] = ((nx / ln * 0.5 + 0.5) * 255).astype(np.uint8)
    img[..., 1] = ((ny / ln * 0.5 + 0.5) * 255).astype(np.uint8)
    img[..., 2] = ((nz / ln * 0.5 + 0.5) * 255).astype(np.uint8)
    Image.fromarray(img, "RGB").save(OUT + "grain_normal.png")
    print("grain_normal tileable", (n, n))


if __name__ == "__main__":
    front_logo(); lens_face(); top_print(); back_print(); bottom_print(); serial(); buttons(); endface_prints(); grain()
    print("textures done")