import * as THREE from "three";

/**
 * OLYMPUS M.ZUIKO DIGITAL 45mm f/1.8
 * 银色镜筒 Ø 1.30 × 长 1.04（长径比 0.8），正面（+Z）朝前。
 * 正面比例按 222138：前圈外 0.600 / 黑前圈 0.515 / 前玉 0.335（=0.547 R）。
 * 前玉用 glassClear（真透明），后面压一段深色内筒 + 第二片镀膜镜片，透出来是黑的。
 */
export function buildOlympus45({ materials, helpers }) {
  const { part, box, knurlRing, label } = helpers;
  const m = materials;
  const group = new THREE.Group();
  const UP = [Math.PI / 2, 0, 0]; /* 圆柱轴向转到 +Z */
  const DOWN = [0, Math.PI, 0]; /* 平面朝 -Z（后端） */

  /* ---------------------------------------------------------- 前组（222138 正面比例） */
  const bezelShell = part(new THREE.CylinderGeometry(0.588, 0.6, 0.085, 64, 1, true), m.silver, [0, 0, 0.4825], UP);
  const bezelFace = part(new THREE.RingGeometry(0.515, 0.6, 64), m.silver, [0, 0, 0.525]);
  const blackStep = part(new THREE.RingGeometry(0.335, 0.515, 64), m.dark, [0, 0, 0.5185]);
  const retainer = part(new THREE.RingGeometry(0.322, 0.335, 64), m.silver, [0, 0, 0.5195]);

  /* 前玉：通透玻璃（浅球冠，暖琥珀镀膜） */
  const GR = 0.335;
  const RS = 1.6;
  const frontGlassMat = m.glassClear.clone();
  frontGlassMat.color.set(0xffe6c4); /* 暖琥珀镀膜 */
  frontGlassMat.opacity = 0.3;
  frontGlassMat.envMapIntensity = 2.5;
  frontGlassMat.iridescence = 0.3;
  frontGlassMat.roughness = 0.05;
  const glassGeo = new THREE.SphereGeometry(RS, 64, 18, 0, Math.PI * 2, 0, Math.asin(GR / RS));
  const glass = part(glassGeo, frontGlassMat, [0, 0, 0.5065 - RS], UP);

  /* 前玉后面再加一层 0.10 暖色镀膜盘，制造镀膜的暖反光 */
  const coatMat = m.glassClear.clone();
  coatMat.color.set(0xffc48a);
  coatMat.opacity = 0.22;
  coatMat.metalness = 0.2;
  coatMat.roughness = 0.45;
  coatMat.clearcoat = 0;
  coatMat.iridescence = 0;
  coatMat.envMapIntensity = 1.2;
  const warmCoat = part(new THREE.CircleGeometry(0.29, 64), coatMat, [0, 0, 0.478]);

  /* 玻璃后面：哑光深色内筒（半径 ≈ 0.9 前玉，深 0.16） */
  const innerTube = part(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 64), m.rubber, [0, 0, 0.365], UP);
  /* 第二片深色镀膜镜片，压在内筒前面 */
  const innerRS = 1.2;
  const innerGeo = new THREE.SphereGeometry(innerRS, 48, 14, 0, Math.PI * 2, 0, Math.asin(0.24 / innerRS));
  const innerGlass = part(innerGeo, m.dark, [0, 0, 0.476 - innerRS], UP);

  /* 前玉下缘的一道暖色反光 */
  const glintMat = m.accent.clone();
  glintMat.transparent = true;
  glintMat.opacity = 0.18;
  glintMat.depthWrite = false;
  const glint = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 8, 64, Math.PI * 0.55), glintMat);
  glint.position.z = 0.492;
  glint.rotation.z = Math.PI * 0.73;

  /* 前圈与镜身之间的黑色分模槽 */
  const groove = part(new THREE.CylinderGeometry(0.606, 0.606, 0.018, 64, 1, true), m.dark, [0, 0, 0.4415], UP);
  group.add(bezelShell, bezelFace, blackStep, retainer, glass, warmCoat, innerTube, innerGlass, glint, groove);

  /* ---------------------------------------------------------- 前银环（比滚花环小一圈） */
  const frontBand = part(new THREE.CylinderGeometry(0.624, 0.626, 0.093, 64, 1, true), m.silver, [0, 0, 0.3965], UP);

  /* ---------------------------------------------------------- 滚花对焦环（约 36% 长） */
  const knurlCore = part(new THREE.CylinderGeometry(0.636, 0.636, 0.37, 64), m.silver, [0, 0, 0.165], UP);
  const knurl = knurlRing(0.639, 80, [0.008, 0.007, 0.336], m.dark, 0.165);

  /* ---------------------------------------------------------- 细银环 + 铭牌环 */
  const trim = part(new THREE.CylinderGeometry(0.628, 0.628, 0.048, 64), m.silver, [0, 0, -0.044], UP);
  const nameRing = part(new THREE.CylinderGeometry(0.62, 0.622, 0.198, 64), m.silver, [0, 0, -0.164], UP);
  const grooveA = part(new THREE.TorusGeometry(0.6235, 0.0035, 8, 96), m.dark, [0, 0, -0.0655]);
  const grooveB = part(new THREE.TorusGeometry(0.6235, 0.0035, 8, 96), m.dark, [0, 0, -0.2625]);

  /* ---------------------------------------------------------- 卡口法兰 */
  const flange = part(new THREE.CylinderGeometry(0.686, 0.686, 0.148, 72), m.silver, [0, 0, -0.3265], UP);
  const flangeTeeth = knurlRing(0.6865, 112, [0.005, 0.005, 0.09], m.dark, -0.352);

  /* 红点对位标记：法兰正面，3–4 点方向 */
  const markerAngle = (-12 * Math.PI) / 180;
  const marker = part(
    new THREE.CylinderGeometry(0.024, 0.024, 0.004, 32),
    m.accent,
    [Math.cos(markerAngle) * 0.645, Math.sin(markerAngle) * 0.645, -0.2535],
    UP
  );

  /* ---------------------------------------------------------- M43 卡口 */
  const mount = part(new THREE.CylinderGeometry(0.556, 0.566, 0.098, 64), m.dark, [0, 0, -0.4515], UP);
  const bayonetRing = part(new THREE.RingGeometry(0.47, 0.552, 64), m.silver, [0, 0, -0.506], DOWN);
  const bayonetWall = part(new THREE.CylinderGeometry(0.552, 0.552, 0.014, 64, 1, true), m.silver, [0, 0, -0.506], UP);
  const rearWall = part(new THREE.CircleGeometry(0.47, 64), m.dark, [0, 0, -0.497], DOWN);
  const rearGlass = part(new THREE.CircleGeometry(0.3, 64), m.glassClear, [0, 0, -0.5035], DOWN);

  const tabs = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.55;
    const tab = box(0.12, 0.034, 0.01, 0.004, m.silver);
    tab.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, -0.513);
    tab.rotation.z = a;
    tabs.add(tab);
  }

  /* 电子触点：10 枚金脚 */
  for (let i = 0; i < 10; i += 1) {
    const a = 0.3 + (i / 9) * 0.95;
    const pin = box(0.026, 0.065, 0.012, 0.002, m.accent);
    pin.position.set(Math.cos(a) * 0.325, Math.sin(a) * 0.325, -0.5055);
    pin.rotation.z = a;
    group.add(pin);
  }

  /* 卡口法兰背面的 4 颗十字螺丝 */
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.42;
    const x = Math.cos(a) * 0.62;
    const y = Math.sin(a) * 0.62;
    const head = part(new THREE.CylinderGeometry(0.013, 0.013, 0.006, 20), m.silver, [x, y, -0.4035], UP);
    const slotA = box(0.02, 0.0028, 0.0018, 0.0006, m.dark);
    slotA.position.set(x, y, -0.4068);
    slotA.rotation.z = a;
    const slotB = box(0.02, 0.0028, 0.0018, 0.0006, m.dark);
    slotB.position.set(x, y, -0.4068);
    slotB.rotation.z = a + Math.PI / 2;
    group.add(head, slotA, slotB);
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
    rearGlass,
    tabs
  );

  /* ---------------------------------------------------------- 文字贴花 */
  /* onArc=true：沿圆周（字头朝外）；false：水平正读（下弧 / 左侧） */
  const ringLabel = (text, deg, height, onArc) => {
    const a = (deg * Math.PI) / 180;
    const t = label(text, { height, color: "#ece9e1", weight: 600, tracking: 1.4, opacity: 0.92 });
    t.position.set(Math.cos(a) * 0.425, Math.sin(a) * 0.425, 0.5205);
    if (onArc) {
      t.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(
          new THREE.Vector3(Math.sin(a), -Math.cos(a), 0),
          new THREE.Vector3(Math.cos(a), Math.sin(a), 0),
          new THREE.Vector3(0, 0, 1)
        )
      );
    }
    return t;
  };

  const sideLabel = (text, deg, radius, z, height, color, opacity) => {
    const a = (deg * Math.PI) / 180;
    const t = label(text, { height, color, weight: 600, tracking: 1.2, opacity });
    t.position.set(Math.cos(a) * radius, Math.sin(a) * radius, z);
    t.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(
        new THREE.Vector3(-Math.sin(a), Math.cos(a), 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(Math.cos(a), Math.sin(a), 0)
      )
    );
    return t;
  };

  group.add(
    ringLabel("OLYMPUS", 95, 0.05, true),
    ringLabel("M.ZUIKO DIGITAL", 0, 0.046, true),
    ringLabel("45mm 1:1.8", 270, 0.05, false),
    ringLabel("Ø37", 175, 0.05, false),
    sideLabel("OLYMPUS DIGITAL", 62, 0.626, -0.164, 0.042, "#23272b", 0.82),
    sideLabel("45mm 1:1.8 MSC", 18, 0.626, -0.164, 0.042, "#23272b", 0.82),
    sideLabel("0.5m/1.64ft - ∞", 32, 0.6905, -0.283, 0.03, "#23272b", 0.78)
  );

  group.userData.label = "olympus-45";
  return group;
}
