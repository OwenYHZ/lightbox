import * as THREE from "three";

/**
 * OLYMPUS M.ZUIKO DIGITAL 45mm f/1.8
 * 银色阳极氧化镜筒，Ø 1.30 × 长 1.04（长径比 ≈ 0.8），正面（+Z）朝前。
 * 从前到后：前圈 → 前银环 → 滚花对焦环（约 36%）→ 细银环 → 铭牌环 → 卡口法兰 → M43 卡口。
 */
export function buildOlympus45({ materials, helpers }) {
  const { part, box, knurlRing } = helpers;
  const m = materials;
  const group = new THREE.Group();
  const UP = [Math.PI / 2, 0, 0]; /* 圆柱轴向转到 +Z */
  const DOWN = [0, Math.PI, 0]; /* 平面朝 -Z（后端） */

  /* ---------------------------------------------------------- 前组 */
  /* 银色前圈（开口筒 + 正面环，避免端面共面） */
  const bezelShell = part(new THREE.CylinderGeometry(0.6, 0.612, 0.085, 64, 1, true), m.plate, [0, 0, 0.4825], UP);
  const bezelFace = part(new THREE.RingGeometry(0.52, 0.612, 64), m.plate, [0, 0, 0.525]);
  /* 黑色内壁 + 银色压圈 */
  const blackStep = part(new THREE.RingGeometry(0.462, 0.52, 64), m.dark, [0, 0, 0.5185]);
  const retainer = part(new THREE.RingGeometry(0.442, 0.462, 64), m.plate, [0, 0, 0.5195]);

  /* 内缩的前玉：极浅球冠，不是玻璃球 */
  const GR = 0.44;
  const RS = 1.6;
  const glassGeo = new THREE.SphereGeometry(RS, 64, 18, 0, Math.PI * 2, 0, Math.asin(GR / RS));
  const glass = part(glassGeo, m.glass, [0, 0, 0.5065 - RS], UP);

  /* 镜筒内腔（把前玉“托”住），以及前圈与镜身之间的黑色分模槽 */
  const throat = part(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 64), m.dark, [0, 0, 0.355], UP);
  const groove = part(new THREE.CylinderGeometry(0.616, 0.616, 0.018, 64, 1, true), m.dark, [0, 0, 0.4415], UP);
  group.add(bezelShell, bezelFace, blackStep, retainer, glass, throat, groove);

  /* ---------------------------------------------------------- 前银环 */
  const frontBand = part(new THREE.CylinderGeometry(0.638, 0.64, 0.093, 64), m.plate, [0, 0, 0.3965], UP);

  /* ---------------------------------------------------------- 滚花对焦环 */
  const knurlCore = part(new THREE.CylinderGeometry(0.636, 0.636, 0.37, 64), m.body, [0, 0, 0.165], UP);
  const knurl = knurlRing(0.639, 80, [0.008, 0.007, 0.336], m.dark, 0.165);

  /* ---------------------------------------------------------- 细银环 + 铭牌环 */
  const trim = part(new THREE.CylinderGeometry(0.63, 0.63, 0.048, 64), m.plate, [0, 0, -0.044], UP);
  const nameRing = part(new THREE.CylinderGeometry(0.622, 0.624, 0.198, 64), m.body, [0, 0, -0.164], UP);
  /* 铭牌环上下两道极细的刻线 */
  const grooveA = part(new THREE.TorusGeometry(0.6255, 0.0035, 8, 96), m.dark, [0, 0, -0.0655]);
  const grooveB = part(new THREE.TorusGeometry(0.6255, 0.0035, 8, 96), m.dark, [0, 0, -0.2625]);

  /* ---------------------------------------------------------- 卡口法兰 */
  const flange = part(new THREE.CylinderGeometry(0.686, 0.686, 0.148, 72), m.plate, [0, 0, -0.3265], UP);
  /* 法兰外缘的细齿（照片里那一圈很密的滚齿） */
  const flangeTeeth = knurlRing(0.6865, 112, [0.005, 0.005, 0.09], m.dark, -0.352);
  /* 红点对位标记：嵌在法兰正面的小圆片 */
  const marker = part(new THREE.CylinderGeometry(0.024, 0.024, 0.004, 32), m.accent, [0.65, 0, -0.2535], UP);

  /* ---------------------------------------------------------- M43 卡口 */
  const mount = part(new THREE.CylinderGeometry(0.556, 0.566, 0.098, 64), m.dark, [0, 0, -0.4515], UP);
  const bayonetRing = part(new THREE.RingGeometry(0.47, 0.552, 64), m.plate, [0, 0, -0.506], DOWN);
  const bayonetWall = part(new THREE.CylinderGeometry(0.552, 0.552, 0.014, 64, 1, true), m.plate, [0, 0, -0.506], UP);
  const rearWall = part(new THREE.CircleGeometry(0.47, 64), m.dark, [0, 0, -0.499], DOWN);

  const tabs = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.55;
    const tab = box(0.12, 0.034, 0.01, 0.004, m.plate);
    tab.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -0.513);
    tab.rotation.z = a;
    tabs.add(tab);
  }

  /* 电子触点：一圈小金脚，只占很小面积 */
  for (let i = 0; i < 8; i += 1) {
    const a = 0.35 + i * 0.11;
    const pin = box(0.026, 0.065, 0.012, 0.002, m.accent);
    pin.position.set(Math.cos(a) * 0.325, Math.sin(a) * 0.325, -0.5055);
    pin.rotation.z = a;
    group.add(pin);
  }

  group.add(
    frontBand,
    knurlCore,
    knurl,
    trim,
    nameRing,
    grooveA,
    grooveB,
    flange,
    flangeTeeth,
    marker,
    mount,
    bayonetRing,
    bayonetWall,
    rearWall,
    tabs
  );

  group.userData.label = "olympus-45";
  return group;
}
