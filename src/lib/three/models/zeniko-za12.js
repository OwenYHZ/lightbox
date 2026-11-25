import * as THREE from "three";

/**
 * ZENIKO ZA12 —— 迷你机顶手动闪光灯。
 *
 * 按 docs/reviews/zeniko-za12/r1-r2 的量取重建（基准照片 222229 正面 / 222217 顶面）：
 *   · 正面宽:高 = 2.30 : 1  → 宽 1.80 / 机身 0.78（银壳 0.69 + 黑底带 0.09）
 *   · 银拉丝铝外壳 + 黑色顶板 + 黑色底带；银色件一律 m.silver，不受 tone 影响
 *   · 黑顶板几乎盖满顶面（四周只留 ~0.08 银边），顶部两枚大号银色滚花拨盘
 *     刻度逐值排布（左 2–11，右 -1/64…FULL 与 50…1600 ISO），前半 ZENIKO 白字
 *   · 正面柔光窗用 m.glassClear（真的透）：窗内 7 条深色棱 + 银灯管 + 中灰雾面底板
 *   · 测光孔 Ø 0.153 在窗右侧；底部热靴偏左（中心 0.36 W）
 *   · 左侧电源圆钮（⏻ 丝印）、背面 USB-C
 *
 * 世界尺寸：宽 1.80 · 深 1.32 · 高 1.13（含热靴插脚），正面朝 +Z，底面贴 y = 0。
 */

/* ---------------------------------------------------------------- 尺寸 */

const W = 1.80;
const D = 1.32;

const SHOE_H = 0.15;
const SHOE_PLATE_H = 0.06;
const BASE_H = 0.09;
const SHELL_H = 0.69;

const BASE_Y = SHOE_H + SHOE_PLATE_H; // 0.21
const SHELL_Y = BASE_Y + BASE_H; // 0.30
const SHELL_TOP = SHELL_Y + SHELL_H; // 0.99
const PANEL_TOP = SHELL_TOP + 0.045; // 1.035

const DIAL_H = 0.08;
const DIAL_R = 0.342;
const DIAL_X = 0.486;
const DIAL_Z = -0.18;

/* 正面量取：柔光窗中心 (0.445 W, 0.445 H)、0.475 W × 0.29 H */
const WIN_W = 0.855;
const WIN_H = 0.226;
const WIN_X = -0.1;
const WIN_Y = SHELL_TOP - 0.445 * (SHELL_TOP - BASE_Y); // 0.643

const DEG = Math.PI / 180;

/* 刻度：沿圆周逐值排布（角度自 +X 起、向 +Z 增大） */
function ringMarks(values, radius, startDeg, height) {
  return values.map((text, i) => ({
    text,
    r: DIAL_R * radius,
    a: (startDeg + (i * 360) / values.length) * DEG,
    h: height,
  }));
}

export function buildZenikoZA12({ materials, helpers }) {
  const { part, box, knurlRing, label } = helpers;
  const m = materials;
  const silver = m.silver;

  /* 机身：深灰金属（照片 222229 大面积 ≈ #3b3e41），只有拨盘/顶缘/字是银的 */
  const shellMat = m.body.clone();
  shellMat.color.setHex(0x3a3d40);
  shellMat.metalness = 0.72;
  shellMat.roughness = 0.5;
  shellMat.envMapIntensity = 0.55;
  const group = new THREE.Group();

  /* ------------------------------------------------------------ 机身 */

  /* 银壳：四角圆润的一整块拉丝铝 */
  const shell = box(W, SHELL_H, D, 0.07, shellMat);
  shell.position.y = SHELL_Y + SHELL_H / 2;
  group.add(shell);

  /* 黑色底带：比外壳略收一点，接缝处干净 */
  const base = box(W * 0.955, BASE_H, D * 0.925, 0.02, m.rubber);
  base.position.y = BASE_Y + BASE_H / 2;
  group.add(base);

  /* 黑色顶板：四周只留一圈银边，比壳顶高 0.03 */
  const panel = box(W * 0.92, 0.05, D * 0.875, 0.06, m.dark);
  panel.position.y = PANEL_TOP - 0.025;
  group.add(panel);

  /* 顶板四周一圈很窄的银饰边（面积很小，只作分色） */
  const trim = box(W * 0.947, 0.016, D * 0.902, 0.05, silver);
  trim.position.y = PANEL_TOP - 0.048;
  group.add(trim);

  /* 顶板上的 ZENIKO 丝印（黑面浅字） */
  const brand = label("ZENIKO", { height: 0.13, color: "#dfe3e6", weight: 500, tracking: 6, opacity: 0.95 });
  brand.rotation.x = -Math.PI / 2;
  brand.position.set(0, PANEL_TOP + 0.003, 0.34);
  group.add(brand);

  /* 两拨盘之间的深色小槽（模式拨杆） */
  const slotBar = box(0.15, 0.022, 0.05, 0.008, m.rubber);
  slotBar.position.set(0, PANEL_TOP + 0.001, DIAL_Z);
  group.add(slotBar);

  /* ------------------------------------------------------------ 拨盘 */

  function addDial(x, rings, marks, note) {
    const yBase = PANEL_TOP - 0.01;
    const yTop = yBase + DIAL_H;

    /* 本体（上口略收） */
    group.add(
      part(new THREE.CylinderGeometry(DIAL_R * 0.995, DIAL_R, DIAL_H, 56), silver, [x, yBase + DIAL_H / 2, DIAL_Z])
    );

    /* 滚花：knurlRing 绕 Z 排一圈，转 90° 立起来就是绕 Y 轴 */
    const teeth = knurlRing(DIAL_R + 0.0015, 112, [0.009, 0.009, DIAL_H * 0.72], silver, 0);
    teeth.rotation.x = Math.PI / 2;
    teeth.position.set(x, yBase + DIAL_H * 0.5, DIAL_Z);
    group.add(teeth);

    /* 顶面 + 倒角环 */
    group.add(
      part(new THREE.CylinderGeometry(DIAL_R * 0.985, DIAL_R * 0.985, 0.018, 56), silver, [x, yTop + 0.003, DIAL_Z])
    );
    group.add(
      part(new THREE.TorusGeometry(DIAL_R * 0.93, 0.005, 8, 56), silver, [x, yTop + 0.011, DIAL_Z], [Math.PI / 2, 0, 0])
    );

    /* 刻度凹槽：左盘一圈 f/stop，右盘外圈快门 / 内圈 ISO */
    for (let i = 0; i < rings; i += 1) {
      const rr = DIAL_R * (rings === 1 ? 0.78 : i === 0 ? 0.82 : 0.55);
      group.add(
        part(new THREE.TorusGeometry(rr, 0.0055, 6, 48), m.dark, [x, yTop + 0.011, DIAL_Z], [Math.PI / 2, 0, 0])
      );
    }

    /* 中心轴 + 一字槽 */
    group.add(part(new THREE.CylinderGeometry(DIAL_R * 0.24, DIAL_R * 0.24, 0.014, 32), silver, [x, yTop + 0.016, DIAL_Z]));
    const slot = box(DIAL_R * 0.32, 0.007, 0.011, 0.003, m.dark);
    slot.position.set(x, yTop + 0.024, DIAL_Z);
    group.add(slot);

    /* 逐值刻度：每个刻度值单独一张贴图，绕圆心立起来、字头朝外 */
    for (const mk of marks) {
      const t = label(mk.text, { height: mk.h, color: "#1e2124", weight: 600, tracking: 0.5, opacity: 0.92 });
      t.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
      t.position.set(mk.r, 0, 0);
      const pivot = new THREE.Group();
      pivot.position.set(x, yTop + 0.019, DIAL_Z);
      pivot.rotation.y = -mk.a;
      pivot.add(t);
      group.add(pivot);
    }

    /* 盘面注记（如 f/stop），正着读 */
    if (note) {
      const t = label(note, { height: 0.03, color: "#1e2124", weight: 600, tracking: 1, opacity: 0.9 });
      t.rotation.x = -Math.PI / 2;
      t.position.set(x, yTop + 0.019, DIAL_Z + 0.205);
      group.add(t);
    }
  }

  /* 左：f/stop 单圈；右：外圈快门 + 内圈 ISO 双圈 */
  addDial(-DIAL_X, 1, ringMarks(["2", "2.8", "4", "5.6", "8", "11"], 0.84, -108, 0.04), "f/stop");
  addDial(
    DIAL_X,
    2,
    ringMarks(["-1/64", "-1/32", "-1/16", "-1/8", "-1/4", "-1/2", "FULL"], 0.86, -122, 0.034).concat(
      ringMarks(["50", "100", "200", "400", "800", "1600"], 0.52, -100, 0.03)
    ),
    "ISO"
  );

  /* ------------------------------------------------------------ 正面柔光窗 */

  const front = D / 2;
  const winZ = front;

  /* 窗内偏暗：黑腔 + 暗灰灯管 + 中灰棱 */
  const tubeMat = m.frosted.clone();
  tubeMat.color.setHex(0x5c5d57);
  tubeMat.roughness = 0.95;
  tubeMat.envMapIntensity = 0.12;
  tubeMat.transparent = true;
  tubeMat.opacity = 0.85;

  /* 窗内腔体（哑光近黑，避免金属腔把环境反射成灰面） */
  const cavity = box(WIN_W + 0.01, WIN_H + 0.01, 0.02, 0.03, m.rubber);
  cavity.position.set(WIN_X, WIN_Y, winZ + 0.005);
  group.add(cavity);

  /* 外框：四条窄边围出真的开口，不是一块实心贴片 */
  const frameT = box(WIN_W + 0.05, 0.025, 0.03, 0.008, m.dark);
  frameT.position.set(WIN_X, WIN_Y + WIN_H / 2 + 0.0125, winZ + 0.015);
  const frameB = box(WIN_W + 0.05, 0.025, 0.03, 0.008, m.dark);
  frameB.position.set(WIN_X, WIN_Y - WIN_H / 2 - 0.0125, winZ + 0.015);
  const frameL = box(0.025, WIN_H, 0.03, 0.008, m.dark);
  frameL.position.set(WIN_X - WIN_W / 2 - 0.0125, WIN_Y, winZ + 0.015);
  const frameR = box(0.025, WIN_H, 0.03, 0.008, m.dark);
  frameR.position.set(WIN_X + WIN_W / 2 + 0.0125, WIN_Y, winZ + 0.015);
  group.add(frameT, frameB, frameL, frameR);

  /* 灯管（哑光浅灰）+ 7 条棱（哑光中灰），都在玻璃后面 */
  const ribMat = m.frosted.clone();
  ribMat.color.setHex(0x4a4e52);
  ribMat.roughness = 0.95;
  ribMat.envMapIntensity = 0.15;

  group.add(
    part(new THREE.CylinderGeometry(0.014, 0.014, 0.6, 24), tubeMat, [WIN_X, WIN_Y, winZ + 0.014], [0, 0, Math.PI / 2])
  );
  for (let i = 0; i < 7; i += 1) {
    const rib = box(0.006, WIN_H * 0.88, 0.01, 0.003, ribMat);
    rib.position.set(WIN_X - WIN_W / 2 + 0.062 + i * ((WIN_W - 0.124) / 6), WIN_Y, winZ + 0.023);
    group.add(rib);
  }

  /* 玻璃：真半透明（opacity 0.32） */
  const glassMat = m.glassClear.clone();
  glassMat.color.setHex(0x8d979c);
  glassMat.envMapIntensity = 0.35;
  glassMat.clearcoat = 0.35;
  glassMat.roughness = 0.12;
  glassMat.opacity = 0.22;
  const glass = box(WIN_W, WIN_H, 0.016, 0.02, glassMat);
  glass.position.set(WIN_X, WIN_Y, winZ + 0.041);
  group.add(glass);

  /* 测光孔（Ø 0.085 W） */
  group.add(
    part(new THREE.CylinderGeometry(0.0765, 0.0765, 0.02, 32), m.dark, [0.556, 0.638, winZ + 0.004], [Math.PI / 2, 0, 0])
  );

  /* ------------------------------------------------------------ 两侧 */

  /* 左侧电源圆钮 + ⏻ 丝印 */
  const sideY = 0.62;
  group.add(
    part(new THREE.TorusGeometry(0.15, 0.008, 10, 48), m.dark, [-W / 2 - 0.001, sideY, 0.03], [0, Math.PI / 2, 0])
  );
  group.add(
    part(new THREE.CylinderGeometry(0.142, 0.146, 0.03, 40), shellMat, [-W / 2 + 0.008, sideY, 0.03], [0, 0, Math.PI / 2])
  );
  const power = label("⏻", { height: 0.06, color: "#33373c", weight: 500, opacity: 0.85 });
  power.rotation.y = -Math.PI / 2;
  power.position.set(-W / 2 - 0.0085, sideY, 0.03);
  group.add(power);

  /* 背面 USB-C */
  const usb = box(0.22, 0.075, 0.02, 0.01, m.rubber);
  usb.position.set(0.3, 0.6, -front + 0.008);
  group.add(usb);

  /* ------------------------------------------------------------ 热靴（偏左） */

  const SHOE_X = -0.25;

  const shoePlate = box(0.79, SHOE_PLATE_H, 0.45, 0.02, m.dark);
  shoePlate.position.set(SHOE_X, SHOE_H + SHOE_PLATE_H / 2, 0);
  group.add(shoePlate);

  const foot = box(0.61, SHOE_H, 0.4, 0.015, m.rubber);
  foot.position.set(SHOE_X, SHOE_H / 2, 0);
  group.add(foot);

  for (const sx of [-1, 1]) {
    const rail = box(0.03, 0.06, 0.4, 0.008, m.rubber);
    rail.position.set(SHOE_X + sx * 0.305, 0.105, 0);
    group.add(rail);
  }

  group.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 24), silver, [SHOE_X, 0.006, 0]));

  /* 底带上的 ZA12（黑面浅字） */
  const stamp = label("ZA12", { height: 0.035, color: "#c9cdd1", weight: 600, tracking: 2, opacity: 0.9 });
  stamp.position.set(SHOE_X, BASE_Y + BASE_H * 0.5, D * 0.925 * 0.5 + 0.003);
  group.add(stamp);

  group.userData.label = "zeniko-za12";
  return group;
}
