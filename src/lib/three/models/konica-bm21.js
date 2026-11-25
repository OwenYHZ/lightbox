import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * Konica Big Mini BM-21 —— 银色磨砂铝口袋机。
 *
 * 依据 realDevicePhotos/Konica Big Mini BM-21 的实拍量取：
 *   · 薄而宽的圆角机身，面板比例约 1.63 : 1，厚度约 0.46 倍机高
 *   · 正面一整块银铝面板 + 左端黑色橡胶握把 + 顶部黑色横条
 *   · 黑条里：圆形 AF 窗、方形取景窗、小圆窗、右侧长方形闪光灯（都压亮边）
 *   · 镜头在中下、略偏左：拉丝金属外环 → 深色镜筒 → 圆角矩形快门盖（关机状态）
 *   · 背面一整块黑背板：右上一枚大圆过片盘，中间取景目镜凸起
 *   · 顶面银色盖板：左端快门钮、中间液晶窗与几枚小按钮
 *
 * 世界尺寸：宽 1.90 · 高 1.16 · 厚 0.54（含镜筒伸出约 0.73），正面朝 +Z，底面贴 y = 0。
 * 正面铝板做了极浅的凸弧（中间约鼓起 3% 机宽），这样金属才会在环境里滚出明暗，
 * 平板放在这套灯光下会整片发黑。
 */

const W = 1.9;
const H = 1.16;
const D = 0.54;
const FRONT = D / 2;
const BACK = -D / 2;

const relX = (t) => (t - 0.5) * W;
const relY = (t) => t * H;

export function buildKonicaBM21({ materials, helpers }) {
  const { part, box, knurlRing } = helpers;
  const m = materials;
  const group = new THREE.Group();
  const UP = [Math.PI / 2, 0, 0];

  /* 矩形窗框：四根细梁拼一圈，玻璃压在框里 */
  function rectFrame(w, h, beam, depth, material) {
    const ring = new THREE.Group();
    const top = box(w, beam, depth, beam * 0.32, material);
    top.position.y = h / 2 - beam / 2;
    const bottom = box(w, beam, depth, beam * 0.32, material);
    bottom.position.y = -h / 2 + beam / 2;
    const left = box(beam, h - beam * 2, depth, beam * 0.32, material);
    left.position.x = -w / 2 + beam / 2;
    const right = box(beam, h - beam * 2, depth, beam * 0.32, material);
    right.position.x = w / 2 - beam / 2;
    ring.add(top, bottom, left, right);
    return ring;
  }

  /* ------------------------------------------------------------ 机身 */
  const body = box(W, H, D, 0.12, m.body);
  body.position.y = H / 2;
  group.add(body);

  /* 正面铝面板：极浅凸弧，让拉丝金属在环境光里滚出明暗 */
  const panelGeo = new RoundedBoxGeometry(W * 0.985, H * 0.985, 0.2, 8, 0.095);
  const frontPanel = new THREE.Mesh(panelGeo, m.body);
  frontPanel.position.set(0, H / 2, FRONT - 0.094);
  group.add(frontPanel);


  /* 左端黑色握把：包住左棱，正反面都比铝面板厚一点 */
  const grip = box(0.36, H * 1.004, D * 1.03, 0.11, m.rubber);
  grip.position.set(-W / 2 + 0.17, H / 2, 0);
  group.add(grip);

  /* 背面整块黑色背板 */
  const backPanel = box(W * 0.984, H * 0.984, 0.04, 0.1, m.rubber);
  backPanel.position.set(0, H / 2, BACK + 0.005);
  group.add(backPanel);

  /* ------------------------------------------------------------ 顶部黑条 */
  const band = box(W * 0.99, 0.27, 0.15, 0.085, m.rubber);
  band.position.set(0, H - 0.14, FRONT - 0.045);
  group.add(band);

  /* 顶面银色盖板：前面那条银边正好露在黑条上沿 */
  const topPlate = box(W * 0.992, 0.04, D * 0.97, 0.014, m.plate);
  topPlate.position.set(0, H - 0.016, -0.008);
  group.add(topPlate);

  const winZ = FRONT + 0.036; /* 窗面基准平面（黑条正面 0.285） */

  /* 圆形 AF 窗 */
  const afCup = part(new THREE.CylinderGeometry(0.082, 0.086, 0.022, 40), m.dark, [relX(0.334), relY(0.916), winZ], UP);
  const afGlass = part(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 32), m.glass, [relX(0.334), relY(0.916), winZ + 0.008], UP);
  const afRim = part(new THREE.TorusGeometry(0.086, 0.008, 8, 40), m.plate, [relX(0.334), relY(0.916), winZ + 0.006]);
  group.add(afCup, afGlass, afRim);

  /* 方形取景窗：亮边压框 + 内凹玻璃 */
  const vf = rectFrame(0.3, 0.215, 0.03, 0.026, m.plate);
  vf.position.set(relX(0.488), relY(0.893), winZ);
  const vfGlass = box(0.232, 0.148, 0.014, 0.012, m.glass);
  vfGlass.position.set(relX(0.488), relY(0.893), winZ - 0.002);
  group.add(vf, vfGlass);

  /* 取景窗右边的小圆窗 */
  const pinhole = part(
    new THREE.CylinderGeometry(0.03, 0.03, 0.016, 24),
    m.dark,
    [relX(0.607), relY(0.927), winZ + 0.004],
    UP
  );
  group.add(pinhole);

  /* 长方形闪光灯：亮边框 + 玻璃灯面 + 几道竖向灯管棱 */
  const fl = rectFrame(0.4, 0.235, 0.028, 0.026, m.plate);
  fl.position.set(relX(0.79), relY(0.907), winZ);
  const flGlass = box(0.345, 0.18, 0.014, 0.012, m.glass);
  flGlass.position.set(relX(0.79), relY(0.907), winZ - 0.004);
  group.add(fl, flGlass);
  for (let i = 0; i < 5; i += 1) {
    const rib = box(0.008, 0.155, 0.01, 0.003, m.dark);
    rib.position.set(relX(0.79) - 0.132 + i * 0.066, relY(0.907), winZ + 0.004);
    group.add(rib);
  }

  /* ------------------------------------------------------------ 镜头 */
  const lens = new THREE.Group();
  lens.position.set(relX(0.459), relY(0.522), 0);

  /* 三段：拉丝金属外环 → 深色镜筒 → 玻璃 + 圆角矩形快门盖 */
  lens.add(part(new THREE.CylinderGeometry(0.306, 0.334, 0.06, 64), m.plate, [0, 0, FRONT + 0.06], UP));
  lens.add(part(new THREE.CylinderGeometry(0.272, 0.276, 0.06, 64), m.dark, [0, 0, FRONT + 0.105], UP));
  lens.add(part(new THREE.CylinderGeometry(0.258, 0.258, 0.016, 64), m.glass, [0, 0, FRONT + 0.135], UP));

  const cover = box(0.335, 0.235, 0.02, 0.05, m.rubber);
  cover.position.set(0, 0, FRONT + 0.148);
  lens.add(cover);

  /* 镜圈外缘的一圈机加工滚花 */
  lens.add(knurlRing(0.336, 72, [0.008, 0.008, 0.05], m.plate, FRONT + 0.06));

  /* 唯一的强调色：亮环与镜筒之间那一细环 */
  lens.add(part(new THREE.TorusGeometry(0.298, 0.006, 10, 72), m.accent, [0, 0, FRONT + 0.082]));

  group.add(lens);

  /* ------------------------------------------------------------ 背面 */
  /* 右上大圆过片盘 */
  const dial = new THREE.Group();
  dial.position.set(relX(0.755), relY(0.73), BACK);
  dial.add(part(new THREE.CylinderGeometry(0.225, 0.232, 0.05, 48), m.dark, [0, 0, -0.022], UP));
  dial.add(part(new THREE.TorusGeometry(0.226, 0.008, 8, 48), m.rubber, [0, 0, -0.03]));
  dial.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 24), m.dark, [0, 0, -0.052], UP));
  group.add(dial);

  /* 取景目镜凸起 */
  const eyeBump = box(0.4, 0.23, 0.06, 0.05, m.rubber);
  eyeBump.position.set(relX(0.5), relY(0.79), BACK - 0.025);
  const eyeWin = box(0.155, 0.105, 0.014, 0.012, m.glass);
  eyeWin.position.set(relX(0.5), relY(0.79), BACK - 0.058);
  group.add(eyeBump, eyeWin);

  const eyeLed = part(
    new THREE.CylinderGeometry(0.026, 0.026, 0.014, 20),
    m.dark,
    [relX(0.585), relY(0.79), BACK - 0.046],
    UP
  );
  group.add(eyeLed);

  /* ------------------------------------------------------------ 顶面 */
  const topY = H;
  const shutter = part(new THREE.CylinderGeometry(0.132, 0.14, 0.055, 40), m.rubber, [-0.62, topY + 0.02, 0.0]);
  const shutterRing = part(new THREE.TorusGeometry(0.142, 0.009, 8, 40), m.plate, [-0.62, topY + 0.006, 0.0], [Math.PI / 2, 0, 0]);
  const shutterKnurl = knurlRing(0.142, 32, [0.012, 0.02, 0.012], m.rubber, 0);
  shutterKnurl.rotation.x = Math.PI / 2;
  shutterKnurl.position.set(-0.62, topY + 0.018, 0);
  group.add(shutter, shutterRing, shutterKnurl);

  const lcdFrame = box(0.34, 0.028, 0.19, 0.02, m.dark);
  lcdFrame.position.set(0.02, topY + 0.008, -0.03);
  const lcd = box(0.29, 0.022, 0.15, 0.014, m.glass);
  lcd.position.set(0.02, topY + 0.018, -0.03);
  group.add(lcdFrame, lcd);

  [-0.14, 0.06, 0.26].forEach((x, i) => {
    const btn = box(i === 2 ? 0.1 : 0.085, 0.03, 0.062, 0.026, i === 2 ? m.rubber : m.plate);
    btn.position.set(0.44 + x, topY + 0.012, -0.03);
    group.add(btn);
  });

  const rearCap = box(0.22, 0.02, 0.24, 0.01, m.rubber);
  rearCap.position.set(0.82, topY + 0.006, BACK + 0.12);
  group.add(rearCap);

  /* ------------------------------------------------------------ 两侧挂绳耳 */
  const lugGeo = new THREE.TorusGeometry(0.04, 0.011, 8, 20);
  const lugR = part(lugGeo, m.plate, [W / 2 + 0.006, 0.94, 0], [0, Math.PI / 2, 0]);
  const lugL = part(lugGeo, m.plate, [-W / 2 - 0.006, 0.94, 0], [0, Math.PI / 2, 0]);
  group.add(lugL, lugR);

  group.userData.label = "konica-bm21";
  return group;
}
