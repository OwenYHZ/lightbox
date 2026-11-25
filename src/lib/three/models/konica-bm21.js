import * as THREE from "three";

/**
 * Konica Big Mini BM-21 —— 银色磨砂铝口袋机（黑身 + 银饰板双色）。
 *
 * 依据 realDevicePhotos/Konica Big Mini BM-21/ 八张实拍：
 *   · 薄而宽的圆角机身，正面宽高比 1.593，厚度约 0.32 L
 *   · 正面银铝面板 + 左端黑色橡胶握把 + 顶部黑色横条（0.268 H）
 *   · 黑条里：AF 圆角方腔、方形取景窗、小圆窗、右侧长方形闪光灯（全部真玻璃）
 *   · 镜头在中下、略偏左：银斜面外环（无滚花）→ 深色镜筒 → 横长圆角矩形快门盖
 *   · 背面黑背板：右上一枚大圆过片盘、中间取景目镜、Konica FILM 贴字、ISO 贴纸
 *   · 顶面银板：左端快门钮、液晶窗、三枚黑塑料按钮
 *
 * 世界尺寸：宽 1.90 · 高 1.16 · 厚 0.61（含镜筒伸出约 0.72），正面朝 +Z，底面贴 y = 0。
 */

const W = 1.9;
const H = 1.16;
const D = 0.61;
const FRONT = D / 2;
const BACK = -D / 2;

const relX = (t) => (t - 0.5) * W;
/** 照片里「自上而下」的归一化高度 → 世界 y */
const topY = (t) => H * (1 - t);

const BAND_H = 0.268 * H;

export function buildKonicaBM21({ materials, helpers }) {
  const { part, box, label } = helpers;
  const m = materials;
  const group = new THREE.Group();
  const UP = [Math.PI / 2, 0, 0];

  /* 矩形窗框：四根细梁，中间是空的，玻璃与扩散片才能露出来 */
  function rectFrame(w, h, beam, depth, material) {
    const ring = new THREE.Group();
    const top = box(w, beam, depth, beam * 0.3, material);
    top.position.y = h / 2 - beam / 2;
    const bottom = box(w, beam, depth, beam * 0.3, material);
    bottom.position.y = -h / 2 + beam / 2;
    const left = box(beam, h - beam * 2, depth, beam * 0.3, material);
    left.position.x = -w / 2 + beam / 2;
    const right = box(beam, h - beam * 2, depth, beam * 0.3, material);
    right.position.x = w / 2 - beam / 2;
    ring.add(top, bottom, left, right);
    return ring;
  }
  const FLAT = [-Math.PI / 2, 0, 0];

  /* ------------------------------------------------------------ 机身 */
  const body = box(W, H, D, 0.12, m.body);
  body.position.y = H / 2;
  group.add(body);

  /* 左端黑色握把：包住左棱，正反面都比铝面板厚一点 */
  const grip = box(0.36, H * 1.004, D * 1.02, 0.11, m.rubber);
  grip.position.set(-W / 2 + 0.17, H / 2, 0);
  group.add(grip);

  /* 背面整块黑色背板 */
  const backPanel = box(W * 0.984, H * 0.984, 0.04, 0.1, m.rubber);
  backPanel.position.set(0, H / 2, BACK + 0.005);
  group.add(backPanel);

  /* ------------------------------------------------------------ 顶部黑条 */
  const band = box(W * 0.99, BAND_H, 0.16, 0.085, m.rubber);
  band.position.set(0, H - BAND_H / 2, FRONT - 0.07);
  group.add(band);

  /* 顶面银色盖板：前面那条银边正好露在黑条上沿 */
  const topPlate = box(W * 0.992, 0.04, D * 0.97, 0.014, m.silver);
  topPlate.position.set(0, H - 0.016, -0.01);
  group.add(topPlate);

  const winZ = FRONT + 0.012;

  /* 圆形 AF 窗：圆角方腔 + 一片真玻璃 */
  const afCavity = box(0.211, 0.2, 0.024, 0.05, m.dark);
  afCavity.position.set(relX(0.373), topY(0.129), winZ - 0.006);
  const afGlass = part(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 32), m.glassClear, [
    relX(0.373),
    topY(0.129),
    winZ + 0.014,
  ], UP);
  group.add(afCavity, afGlass);

  /* 方形取景窗：黑色一体腔 + 内凹玻璃（不加银梁） */
  const vfFrame = rectFrame(0.285, 0.2, 0.017, 0.022, m.dark);
  vfFrame.position.set(relX(0.505), topY(0.129), winZ - 0.005);
  const vfDiffuser = box(0.251, 0.168, 0.008, 0.008, m.frosted);
  vfDiffuser.position.set(relX(0.505), topY(0.129), winZ - 0.012);
  const vfGlass = box(0.256, 0.173, 0.012, 0.01, m.glassClear);
  vfGlass.position.set(relX(0.505), topY(0.129), winZ + 0.002);
  group.add(vfFrame, vfDiffuser, vfGlass);

  /* 取景窗右边的小圆窗 */
  const pinhole = part(new THREE.CylinderGeometry(0.057, 0.057, 0.014, 28), m.dark, [
    relX(0.61),
    topY(0.129),
    winZ + 0.002,
  ], UP);
  const pinGlass = part(new THREE.CylinderGeometry(0.044, 0.044, 0.01, 28), m.glassClear, [
    relX(0.61),
    topY(0.129),
    winZ + 0.009,
  ], UP);
  group.add(pinhole, pinGlass);

  /* 长方形闪光灯：黑框 + 通透灯面 + 浅色竖向棱条 */
  const flFrame = rectFrame(0.418, 0.2, 0.016, 0.022, m.dark);
  flFrame.position.set(relX(0.81), topY(0.129), winZ - 0.005);
  const flDiffuser = box(0.384, 0.168, 0.008, 0.008, m.frosted);
  flDiffuser.position.set(relX(0.81), topY(0.129), winZ - 0.012);
  const flGlass = box(0.389, 0.173, 0.012, 0.01, m.glassClear);
  flGlass.position.set(relX(0.81), topY(0.129), winZ + 0.001);
  group.add(flFrame, flDiffuser, flGlass);
  /* 灯管棱：细暗槽，夹在扩散片与玻璃之间 */
  for (let i = 0; i < 9; i += 1) {
    const rib = box(0.005, 0.15, 0.004, 0.0014, m.dark);
    rib.position.set(relX(0.81) - 0.152 + i * 0.038, topY(0.129), winZ - 0.007);
    group.add(rib);
  }

  /* ------------------------------------------------------------ 镜头 */
  const lens = new THREE.Group();
  lens.position.set(relX(0.454), topY(0.62), 0);

  /* 银斜面外环（前小后大 = 一圈倒角，光滑无滚花） */
  lens.add(part(new THREE.CylinderGeometry(0.338, 0.356, 0.06, 64), m.silver, [0, 0, FRONT + 0.03], UP));
  /* 外缘一道 0.006 暗槽 */
  lens.add(part(new THREE.TorusGeometry(0.353, 0.006, 8, 72), m.dark, [0, 0, FRONT + 0.061]));
  /* 深色镜筒 */
  lens.add(part(new THREE.CylinderGeometry(0.304, 0.304, 0.05, 64), m.dark, [0, 0, FRONT + 0.08], UP));
  /* 横长圆角矩形快门盖（照片 0.152 W × 0.199 H） */
  const coverRim = box(0.302, 0.242, 0.008, 0.05, m.silver);
  coverRim.position.set(0, 0, FRONT + 0.1);
  lens.add(coverRim);
  const cover = box(0.29, 0.23, 0.018, 0.045, m.rubber);
  cover.position.set(0, 0, FRONT + 0.107);
  lens.add(cover);

  /* 镜圈黑环上的两段刻字：用切线方向的平面贴字近似弧排 */
  const ringTop = label("KONICA LENS", { height: 0.038, color: "#d9dde2", weight: 600, tracking: 1.2, opacity: 0.85 });
  ringTop.position.set(0, 0.235, FRONT + 0.109);
  lens.add(ringTop);
  const ringBottom = label("AUTO FOCUS 30mm F4.5", { height: 0.03, color: "#d9dde2", weight: 500, tracking: 0.8, opacity: 0.8 });
  ringBottom.position.set(0, -0.24, FRONT + 0.109);
  lens.add(ringBottom);

  group.add(lens);

  /* ------------------------------------------------------------ 正面字标 */
  const konica = label("Konica", { height: 0.094, color: "#1a1a1a", weight: 700, tracking: 2, opacity: 0.9 });
  konica.position.set(0.602, 0.725, FRONT + 0.004);
  group.add(konica);

  const bigMini = label("big mini", { height: 0.078, color: "#1a1a1a", weight: 600, tracking: 2, opacity: 0.85 });
  bigMini.position.set(0.575, 0.551, FRONT + 0.004);
  group.add(bigMini);

  const redEye = label("RED EYE REDUCTION", { height: 0.026, color: "#232323", weight: 500, tracking: 1.4, opacity: 0.8 });
  redEye.position.set(0.585, 0.412, FRONT + 0.004);
  group.add(redEye);

  const afLine = label("AUTO FOCUS BM-21", { height: 0.026, color: "#232323", weight: 500, tracking: 1.4, opacity: 0.8 });
  afLine.position.set(0.585, 0.342, FRONT + 0.004);
  group.add(afLine);

  /* 2 × 3 小圆点 */
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const dot = part(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16), m.dark, [
        0.513 + col * 0.095,
        0.261 - row * 0.046,
        FRONT + 0.002,
      ], UP);
      group.add(dot);
    }
  }

  /* ------------------------------------------------------------ 背面 */
  const dial = new THREE.Group();
  dial.position.set(relX(0.755), topY(0.27), BACK);
  dial.add(part(new THREE.CylinderGeometry(0.225, 0.232, 0.05, 48), m.dark, [0, 0, -0.022], UP));
  dial.add(part(new THREE.TorusGeometry(0.226, 0.008, 8, 48), m.rubber, [0, 0, -0.03]));
  dial.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 24), m.dark, [0, 0, -0.052], UP));
  group.add(dial);

  /* 取景目镜（宽 0.23） */
  const eyeBump = box(0.23, 0.17, 0.05, 0.04, m.rubber);
  eyeBump.position.set(relX(0.5), topY(0.21), BACK - 0.02);
  const eyeWin = box(0.13, 0.1, 0.012, 0.01, m.dark);
  eyeWin.position.set(relX(0.5), topY(0.21), BACK - 0.048);
  group.add(eyeBump, eyeWin);

  const eyeLed = part(new THREE.CylinderGeometry(0.026, 0.026, 0.014, 20), m.dark, [
    relX(0.585),
    topY(0.21),
    BACK - 0.036,
  ], UP);
  group.add(eyeLed);

  /* 背面 Konica FILM 贴字（黑面浅字） */
  const film = label("Konica FILM", { height: 0.05, color: "#cfd3d8", weight: 600, tracking: 1.6, opacity: 0.9 });
  film.position.set(0.095, topY(0.85), BACK - 0.03);
  film.rotation.y = Math.PI;
  group.add(film);

  /* ISO 贴纸（深绿） */
  const sticker = box(0.06, 0.09, 0.01, 0.008, m.canvas);
  sticker.position.set(relX(0.9), topY(0.35), BACK - 0.026);
  group.add(sticker);

  /* ------------------------------------------------------------ 顶面 */
  const shutter = part(new THREE.CylinderGeometry(0.132, 0.14, 0.05, 40), m.rubber, [-0.62, H + 0.018, 0.0]);
  const shutterRing = part(new THREE.TorusGeometry(0.142, 0.008, 8, 40), m.silver, [-0.62, H + 0.006, 0.0], [Math.PI / 2, 0, 0]);
  group.add(shutter, shutterRing);

  const lcdFrame = box(0.34, 0.028, 0.19, 0.02, m.dark);
  lcdFrame.position.set(0.02, H + 0.008, -0.03);
  const lcd = box(0.29, 0.022, 0.15, 0.014, m.glass);
  lcd.position.set(0.02, H + 0.018, -0.03);
  group.add(lcdFrame, lcd);

  /* 三枚黑色塑料按钮 + 顶面小字 */
  const btnDefs = [
    { x: 0.3, w: 0.085, name: "MODE", h: 0.018 },
    { x: 0.44, w: 0.085, name: "ON", h: 0.022 },
    { x: 0.58, w: 0.1, name: "SELECT SET", h: 0.014 },
  ];
  btnDefs.forEach((b) => {
    const btn = box(b.w, 0.03, 0.062, 0.026, m.rubber);
    btn.position.set(b.x, H + 0.012, -0.03);
    group.add(btn);
    const t = label(b.name, { height: b.h, color: "#232323", weight: 600, tracking: 1, opacity: 0.75 });
    t.position.set(b.x, H + 0.028, -0.105);
    t.rotation.x = -Math.PI / 2;
    group.add(t);
  });

  /* ------------------------------------------------------------ 两侧挂绳耳 */
  const lugGeo = new THREE.TorusGeometry(0.04, 0.011, 8, 20);
  const lugR = part(lugGeo, m.silver, [W / 2 + 0.006, 0.94, 0], [0, Math.PI / 2, 0]);
  const lugL = part(lugGeo, m.silver, [-W / 2 - 0.006, 0.94, 0], [0, Math.PI / 2, 0]);
  group.add(lugL, lugR);

  group.userData.label = "konica-bm21";
  return group;
}
