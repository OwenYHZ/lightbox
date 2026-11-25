import * as THREE from "three";

/**
 * ZENIKO ZA12 —— 迷你机顶手动闪光灯。
 *
 * 依据 realDevicePhotos/ZENIKO ZA12 的实拍：银拉丝铝外壳 + 黑色顶板 / 黑色底带，
 * 四角圆润的扁方盒；顶部两枚大号银色滚花拨盘（左 f/stop、右 ISO 与快门双刻度圈），
 * 两拨盘之间一枚奶白色小胶囊窗；正面横置柔光窗 + 右侧测光孔；左侧电源键、右侧 USB-C；
 * 底部黑色热靴（插脚前后长、左右窄，带滑轨与中央触点）。
 *
 * 世界尺寸：宽 1.80 · 深 1.00 · 高 1.33（含热靴插脚），正面朝 +Z，底面贴 y = 0。
 * 强调色只用在一处：两枚拨盘轴心的铜色小轴。
 */

/* ---------------------------------------------------------------- 尺寸 */

const W = 1.80; // 机身宽
const D = 1.00; // 机身厚
const SHELL_H = 0.78; // 银色外壳高
const BASE_H = 0.13; // 黑色底带高
const SHOE_H = 0.15; // 热靴插脚高
const SHOE_PLATE_H = 0.06; // 热靴底板高

const BASE_Y = SHOE_H + SHOE_PLATE_H; // 0.21
const SHELL_Y = BASE_Y + BASE_H; // 0.34
const TOP_Y = SHELL_Y + SHELL_H; // 1.12（外壳顶面）
const PANEL_TOP = TOP_Y + 0.03; // 1.15（黑色顶板面）
const DIAL_H = 0.155;

/* 拨盘：略偏机身后半，左右各留一掌宽的银边 */
const DIAL_Z = -0.06;
const DIAL_X = 0.42;
const DIAL_R = 0.28;

export function buildZenikoZA12({ materials, helpers }) {
  const { part, box, knurlRing } = helpers;
  const group = new THREE.Group();

  /* ------------------------------------------------------------ 机身 */

  /* 银色外壳：一整块拉丝铝，四角圆润 */
  const shell = box(W, SHELL_H, D, 0.1, materials.plate);
  shell.position.y = SHELL_Y + SHELL_H / 2;
  group.add(shell);

  /* 黑色底带：收到外壳底面轮廓上，只留一道接缝 */
  const base = box(W * 0.9, BASE_H, D * 0.8, 0.055, materials.rubber);
  base.position.y = BASE_Y + BASE_H / 2;
  group.add(base);

  /* 黑色顶板：内收一圈露出银边，比外壳顶面高 0.03 */
  const panel = box(W * 0.81, 0.12, D * 0.72, 0.07, materials.dark);
  panel.position.y = PANEL_TOP - 0.06;
  group.add(panel);

  /* 两拨盘之间的奶白色胶囊窗（唯一一处强调色） */
  const pill = box(0.17, 0.035, 0.05, 0.017, materials.accent);
  pill.position.set(0, PANEL_TOP + 0.012, DIAL_Z + 0.07);
  group.add(pill);

  /* ------------------------------------------------------------ 拨盘 */

  function addDial(x, rings) {
    const yBase = PANEL_TOP - 0.01;
    const yTop = yBase + DIAL_H;

    /* 圆柱本体 */
    group.add(
      part(new THREE.CylinderGeometry(DIAL_R, DIAL_R * 1.004, DIAL_H, 48), materials.plate, [
        x,
        yBase + DIAL_H / 2,
        DIAL_Z,
      ])
    );

    /* 滚花：knurlRing 默认绕 Z 轴排一圈，转 90° 立起来就是绕 Y 轴 */
    const teeth = knurlRing(DIAL_R + 0.002, 92, [0.01, 0.01, DIAL_H * 0.78], materials.plate, 0);
    teeth.rotation.x = Math.PI / 2;
    teeth.position.set(x, yBase + DIAL_H * 0.5, DIAL_Z);
    group.add(teeth);

    /* 顶面：一圈倒角 + 刻度凹槽 + 铜色中心轴 */
    group.add(
      part(new THREE.CylinderGeometry(DIAL_R * 0.985, DIAL_R * 0.985, 0.022, 48), materials.plate, [
        x,
        yTop + 0.004,
        DIAL_Z,
      ])
    );
    const grooveY = yTop + 0.017;
    group.add(
      part(new THREE.TorusGeometry(DIAL_R * 0.93, 0.007, 10, 56), materials.plate, [x, grooveY, DIAL_Z], [Math.PI / 2, 0, 0])
    );
    /* 左拨盘一圈 f/stop 刻度，右拨盘 ISO + 快门两圈 */
    for (let i = 0; i < rings; i += 1) {
      const rr = DIAL_R * (rings === 1 ? 0.74 : i === 0 ? 0.82 : 0.56);
      group.add(part(new THREE.TorusGeometry(rr, 0.0055, 8, 48), materials.dark, [x, grooveY, DIAL_Z], [Math.PI / 2, 0, 0]));
    }
    /* 中心轴 + 一字槽 */
    group.add(part(new THREE.CylinderGeometry(DIAL_R * 0.26, DIAL_R * 0.26, 0.018, 32), materials.plate, [x, yTop + 0.02, DIAL_Z]));
    const slot = box(DIAL_R * 0.34, 0.008, 0.012, 0.004, materials.dark);
    slot.position.set(x, yTop + 0.03, DIAL_Z);
    group.add(slot);

    /* 顶板上的一圈圆形凹槽 */
    group.add(
      part(new THREE.TorusGeometry(DIAL_R * 1.09, 0.008, 10, 56), materials.dark, [x, PANEL_TOP + 0.004, DIAL_Z], [Math.PI / 2, 0, 0])
    );
  }

  addDial(-DIAL_X, 1); // 左：f/stop
  addDial(DIAL_X, 2); // 右：ISO / 快门

  /* ------------------------------------------------------------ 正面 */

  const winY = SHELL_Y + SHELL_H * 0.55;
  const winW = 0.9;
  const winH = 0.21;
  const front = D / 2;

  /* 黑色灯窗框（外）→ 略高的浅色柔光面（内），形成一圈深色边框 */
  const bezel = box(winW + 0.05, winH + 0.05, 0.02, 0.05, materials.dark);
  bezel.position.set(-0.05, winY, front - 0.005);
  const diffuser = box(winW, winH, 0.022, 0.03, materials.frosted);
  diffuser.position.set(-0.05, winY, front + 0.0005);
  group.add(bezel, diffuser);

  /* 测光孔 */
  group.add(
    part(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 28), materials.dark, [0.6, winY, front - 0.006], [Math.PI / 2, 0, 0])
  );

  /* ------------------------------------------------------------ 两侧 */

  /* 左：电源键（圆钮 + 一圈暗槽） */
  const sideY = SHELL_Y + SHELL_H * 0.55;
  group.add(
    part(new THREE.TorusGeometry(0.15, 0.008, 12, 44), materials.dark, [-W / 2 + 0.001, sideY, 0], [0, Math.PI / 2, 0])
  );
  group.add(
    part(new THREE.CylinderGeometry(0.142, 0.146, 0.03, 36), materials.plate, [-W / 2 + 0.008, sideY, 0], [0, 0, Math.PI / 2])
  );

  /* 右：USB-C 口 */
  const usb = box(0.02, 0.075, 0.23, 0.01, materials.rubber);
  usb.position.set(W / 2 - 0.006, sideY, -0.02);
  group.add(usb);

  /* ------------------------------------------------------------ 热靴 */

  const shoePlate = box(0.78, SHOE_PLATE_H, 0.7, 0.028, materials.dark);
  shoePlate.position.y = SHOE_H + SHOE_PLATE_H / 2;
  group.add(shoePlate);

  const foot = box(0.34, SHOE_H, 0.5, 0.018, materials.rubber);
  foot.position.y = SHOE_H / 2;
  group.add(foot);

  /* 两侧滑轨（靠底板一侧） */
  for (const sx of [-1, 1]) {
    const rail = box(0.045, 0.06, 0.5, 0.012, materials.rubber);
    rail.position.set(sx * 0.175, 0.105, 0);
    group.add(rail);
  }

  /* 中央触点 */
  group.add(part(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), materials.plate, [0, 0.004, 0]));

  group.userData.label = "zeniko-za12";
  return group;
}
