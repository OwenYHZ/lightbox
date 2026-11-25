/**
 * 三维模型 —— 全部由 three.js 基础图元拼装，没有 .glb / .gltf 文件。
 *
 * 想换成真正的相机模型时，只需要：
 *   1. 在 buildModel 里把对应分支换成 GLTFLoader 加载；
 *   2. 保证返回的 THREE.Group 以原点为中心、Y 轴朝上即可。
 * 查看器的取景、光照、地面阴影都会自动适配模型尺寸，不用改。
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildKonicaBM21 } from "./models/konica-bm21.js";
import { buildOlympus45 } from "./models/olympus-45.js";
import { buildZenikoZA12 } from "./models/zeniko-za12.js";

const TONES = {
  graphite: { body: 0x262a31, plate: 0x363b44, metalness: 0.66, roughness: 0.36 },
  silver: { body: 0xa7abb2, plate: 0xd2d5da, metalness: 0.92, roughness: 0.26 },
  black: { body: 0x121317, plate: 0x1c1e23, metalness: 0.55, roughness: 0.46 },
};

/* --------------------------------------------------------------- 小工具 */

function part(geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  return mesh;
}

function box(w, h, d, radius, material) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
}

function makeMaterials(tone, accent) {
  const t = TONES[tone] || TONES.graphite;
  const accentColor = new THREE.Color(accent || "#e4cfa8");

  return {
    body: new THREE.MeshPhysicalMaterial({
      color: t.body,
      metalness: t.metalness,
      roughness: t.roughness,
      clearcoat: 0.55,
      clearcoatRoughness: 0.38,
      envMapIntensity: 1.35,
    }),
    plate: new THREE.MeshPhysicalMaterial({
      color: t.plate,
      metalness: Math.min(0.94, t.metalness + 0.16),
      roughness: Math.max(0.26, t.roughness - 0.06),
      clearcoat: 0.28,
      envMapIntensity: 0.85,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x0e0f12,
      metalness: 0.04,
      roughness: 0.94,
    }),
    dark: new THREE.MeshPhysicalMaterial({
      color: 0x090a0d,
      metalness: 0.85,
      roughness: 0.3,
      envMapIntensity: 1.1,
    }),
    accent: new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 1.5,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x05080c,
      metalness: 0.88,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      iridescence: 0.3,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [180, 620],
      envMapIntensity: 1.3,
    }),
    /* 透明镜片：给前玉/灯罩用，靠清漆与环境反射出通透感 */
    glassClear: new THREE.MeshPhysicalMaterial({
      color: 0xe6f0f6,
      metalness: 0.06,
      roughness: 0.045,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      envMapIntensity: 2.4,
      iridescence: 0.55,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [100, 380],
    }),
    /* 中性亮银：双色机身（黑身 + 银饰板）用，避免被 tone 拉成蓝灰 */
    silver: new THREE.MeshPhysicalMaterial({
      color: 0xc3c6cb,
      metalness: 0.88,
      roughness: 0.42,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.8,
    }),
    frosted: new THREE.MeshPhysicalMaterial({
      color: 0xe8e5dc,
      metalness: 0.06,
      roughness: 0.62,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.7,
    }),
    canvas: new THREE.MeshStandardMaterial({
      color: 0x2b332e,
      metalness: 0.05,
      roughness: 0.95,
    }),
    leather: new THREE.MeshStandardMaterial({
      color: 0x2a201a,
      metalness: 0.1,
      roughness: 0.72,
    }),
  };
}

/* 用大半径球冠做镜片：正面看几乎平整，只在边缘有一点弧度，不会变成玻璃球 */
function lensCap(radius, apexZ, material) {
  const R = radius * 3.4;
  const alpha = Math.asin(Math.min(0.92, radius / R));
  const geo = new THREE.SphereGeometry(R, 64, 22, 0, Math.PI * 2, 0, alpha);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = apexZ - R;
  return mesh;
}

/**
 * 3D 文字贴花：用 Canvas 画出文字 → CanvasTexture → 透明平面。
 * 纯代码生成，不依赖字体文件或图片；调用方负责摆位。
 * @param {string} text
 * @param {{height?:number, color?:string, weight?:number, tracking?:number, opacity?:number, font?:string}} opts
 */
function label(text, opts = {}) {
  const {
    height = 0.06,
    color = "#f3f1ec",
    weight = 600,
    tracking = 0,
    opacity = 0.92,
    font = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  } = opts;

  const fontSize = 96;
  const pad = 24;
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = weight + " " + fontSize + "px " + font;
  const chars = String(text).split("");
  const width =
    chars.reduce((sum, ch) => sum + probe.measureText(ch).width, 0) + tracking * Math.max(0, chars.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width + pad * 2);
  canvas.height = Math.ceil(fontSize * 1.35 + pad * 2);
  const ctx = canvas.getContext("2d");
  ctx.font = weight + " " + fontSize + "px " + font;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  let x = pad;
  const y = canvas.height / 2;
  for (const ch of chars) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  const aspect = canvas.width / canvas.height;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(height * aspect, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity,
      side: THREE.DoubleSide,
    })
  );
  mesh.renderOrder = 2;
  mesh.userData.isLabel = true;
  return mesh;
}

/* 沿圆周撒一圈小方块（对焦环滚花） */
function knurlRing(radius, count, size, material, z) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    matrix.makeTranslation(Math.cos(a) * radius, Math.sin(a) * radius, z);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/* --------------------------------------------------------------- 机身 */

function buildCamera(params = {}) {
  const m = makeMaterials(params.tone, params.accent);
  const group = new THREE.Group();
  const W = 1.9;
  const H = 1.18;
  const D = 0.58;
  const front = D / 2;

  const body = box(W, H, D, 0.13, m.body);
  group.add(body);

  /* 顶盖 */
  const top = box(W * 0.985, 0.15, D * 0.96, 0.06, m.plate);
  top.position.y = H / 2 + 0.05;
  group.add(top);

  /* 军舰部 + 取景器 */
  const hump = box(0.58, 0.24, 0.44, 0.07, m.body);
  hump.position.set(-0.08, H / 2 + 0.21, 0);
  group.add(hump);

  const shoe = box(0.24, 0.045, 0.19, 0.02, m.dark);
  shoe.position.set(-0.08, H / 2 + 0.35, -0.01);
  group.add(shoe);

  /* 取景器眼罩（背面） */
  const eyecup = box(0.32, 0.21, 0.1, 0.05, m.rubber);
  eyecup.position.set(-0.08, H / 2 + 0.16, -D / 2 - 0.03);
  group.add(eyecup);

  /* 拨盘 */
  const dialL = part(new THREE.CylinderGeometry(0.155, 0.155, 0.055, 40), m.plate, [-0.6, H / 2 + 0.15, 0.02]);
  const dialR = part(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 40), m.plate, [0.58, H / 2 + 0.13, -0.04]);
  group.add(dialL, dialR);

  const dialTop = part(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 32), m.accent, [0.58, H / 2 + 0.16, -0.04]);
  group.add(dialTop);

  /* 快门 */
  const shutter = part(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32), m.rubber, [0.73, H / 2 + 0.16, 0.1]);
  const shutterCap = part(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 32), m.accent, [0.73, H / 2 + 0.19, 0.1]);
  group.add(shutter, shutterCap);

  /* 握把 */
  const grip = box(0.3, H * 0.9, D * 1.02, 0.11, m.rubber);
  grip.position.set(W / 2 - 0.01, -0.01, 0.015);
  group.add(grip);

  /* 卡口 + 镜筒：外筒、对焦环、前圈 */
  const mount = part(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 64), m.plate, [0, -0.02, front + 0.03], [Math.PI / 2, 0, 0]);
  const barrel = part(new THREE.CylinderGeometry(0.405, 0.395, 0.46, 64), m.body, [0, -0.02, front + 0.28], [Math.PI / 2, 0, 0]);
  const focusRing = part(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 64), m.rubber, [0, -0.02, front + 0.36], [Math.PI / 2, 0, 0]);
  const gripKnurl = knurlRing(0.426, 64, [0.012, 0.012, 0.09], m.rubber, front + 0.36);
  group.add(mount, barrel, focusRing, gripKnurl);

  /* 前组：深色内筒把前玉“压”进去，再压得很平，避免像玻璃球 */
  const frontRing = part(new THREE.CylinderGeometry(0.415, 0.4, 0.1, 64), m.dark, [0, -0.02, front + 0.53], [Math.PI / 2, 0, 0]);
  const glassGeo = new THREE.SphereGeometry(0.335, 56, 36, 0, Math.PI * 2, 0, Math.PI * 0.15);
  const glass = part(glassGeo, m.glass, [0, -0.02, front + 0.555], [Math.PI / 2, 0, 0]);
  const accentRing = part(new THREE.TorusGeometry(0.404, 0.011, 10, 80), m.accent, [0, -0.02, front + 0.585]);
  group.add(frontRing, glass, accentRing);

  /* 挂环 */
  const lugGeo = new THREE.TorusGeometry(0.055, 0.014, 10, 28);
  const lugL = part(lugGeo, m.plate, [-W / 2 - 0.01, 0.12, 0], [0, Math.PI / 2, 0]);
  const lugR = part(lugGeo, m.plate, [W / 2 + 0.01, 0.12, 0], [0, Math.PI / 2, 0]);
  group.add(lugL, lugR);

  /* 对焦辅助灯 */
  const af = part(new THREE.SphereGeometry(0.035, 20, 16), m.accent, [0.58, 0.3, front + 0.005]);
  af.material = m.accent;
  group.add(af);

  group.userData.label = "camera";
  return group;
}

/* --------------------------------------------------------------- 镜头 */

function buildLens(params = {}) {
  const m = makeMaterials(params.tone || "black", params.accent);
  const group = new THREE.Group();
  const focal = params.focal || 50;
  const r = 0.38 + Math.min(focal, 200) / 1600;
  const len = 0.72 + Math.min(focal, 200) / 150;
  const front = len / 2;

  /* 镜身：三段 */
  const rear = part(new THREE.CylinderGeometry(r * 1.02, r, len * 0.5, 64), m.body, [0, 0, -len * 0.22], [Math.PI / 2, 0, 0]);
  const mid = part(new THREE.CylinderGeometry(r * 1.06, r * 1.02, len * 0.34, 64), m.body, [0, 0, len * 0.12], [Math.PI / 2, 0, 0]);
  const frontBarrel = part(new THREE.CylinderGeometry(r * 1.04, r * 1.06, len * 0.22, 64, 1, true), m.body, [0, 0, front - len * 0.1], [Math.PI / 2, 0, 0]);
  group.add(rear, mid, frontBarrel);

  /* 对焦环 + 滚花 */
  const focusRing = part(new THREE.CylinderGeometry(r * 1.09, r * 1.09, len * 0.3, 64), m.rubber, [0, 0, -len * 0.02], [Math.PI / 2, 0, 0]);
  group.add(focusRing);
  group.add(knurlRing(r * 1.095, 72, [0.016, 0.016, len * 0.26], m.rubber, -len * 0.02));

  /* 光圈环（香槟金） */
  const aperture = part(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 0.03, 64), m.accent, [0, 0, len * 0.22], [Math.PI / 2, 0, 0]);
  group.add(aperture);

  /* 铭牌环 */
  const nameplate = part(new THREE.CylinderGeometry(r * 1.07, r * 1.07, 0.09, 64), m.plate, [0, 0, len * 0.33], [Math.PI / 2, 0, 0]);
  group.add(nameplate);

  /* 前组：深色内筒 + 压平的前玉 + 细金圈 */
  const innerBarrel = part(new THREE.CylinderGeometry(r * 0.92, r * 0.9, 0.12, 64), m.dark, [0, 0, front - 0.08], [Math.PI / 2, 0, 0]);
  const bezel = part(new THREE.RingGeometry(r * 0.88, r * 1.05, 64), m.body, [0, 0, front + 0.002]);
  const glass = lensCap(r * 0.86, front - 0.012, m.glass);
  const trim = part(new THREE.TorusGeometry(r * 0.9, 0.007, 10, 80), m.accent, [0, 0, front + 0.004]);
  group.add(innerBarrel, bezel, glass, trim);

  /* 后卡口 + 卡爪 */
  const mount = part(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.11, 64), m.plate, [0, 0, -len * 0.52], [Math.PI / 2, 0, 0]);
  group.add(mount);
  for (let i = 0; i < 3; i += 1) {
    const tab = box(0.12, 0.05, 0.03, 0.01, m.accent);
    const a = (i / 3) * Math.PI * 2;
    tab.position.set(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, -len * 0.58);
    group.add(tab);
  }

  group.userData.label = "lens";
  return group;
}

/* --------------------------------------------------------------- 三脚架 */

function buildTripod(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();
  const legLength = 1.34;
  const tilt = 0.3;

  /* 云台：底座 + 球头 + 快装板 */
  const headBase = box(0.4, 0.18, 0.4, 0.05, m.plate);
  headBase.position.y = 1.32;
  group.add(headBase);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.135, 40, 28), m.body);
  ball.position.y = 1.45;
  group.add(ball);

  const collar = part(new THREE.TorusGeometry(0.142, 0.016, 14, 48), m.accent, [0, 1.41, 0], [Math.PI / 2, 0, 0]);
  group.add(collar);

  const plate = box(0.22, 0.045, 0.22, 0.015, m.accent);
  plate.position.y = 1.585;
  group.add(plate);

  const knob = part(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 24), m.dark, [0.25, 1.3, 0.04], [0, 0, Math.PI / 2]);
  const knob2 = part(new THREE.CylinderGeometry(0.038, 0.038, 0.1, 24), m.accent, [0.04, 1.3, 0.24], [Math.PI / 2, 0, 0]);
  group.add(knob, knob2);

  /* 中轴 */
  const column = part(new THREE.CylinderGeometry(0.058, 0.058, 0.42, 32), m.body, [0, 1.1, 0]);
  group.add(column);

  /* 三脚：以顶部为支点向外张开 */
  const legGeo = new THREE.CylinderGeometry(0.03, 0.038, legLength, 20);
  legGeo.translate(0, -legLength / 2, 0);
  const footGeo = new THREE.SphereGeometry(0.055, 20, 16);

  for (let i = 0; i < 3; i += 1) {
    const pivot = new THREE.Group();
    pivot.position.y = 0.92;
    pivot.rotation.y = (i / 3) * Math.PI * 2;

    const leg = new THREE.Mesh(legGeo, m.body);
    leg.rotation.z = tilt;
    pivot.add(leg);

    const foot = new THREE.Mesh(footGeo, m.rubber);
    foot.position.set(Math.sin(tilt) * legLength, -Math.cos(tilt) * legLength, 0);
    pivot.add(foot);

    group.add(pivot);
  }

  /* 中轴挂钩 */
  const hook = part(new THREE.TorusGeometry(0.045, 0.012, 8, 20), m.accent, [0, 0.82, 0], [Math.PI / 2, 0, 0]);
  group.add(hook);

  group.userData.label = "tripod";
  return group;
}

/* --------------------------------------------------------------- 闪光灯 */

function buildFlash(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();

  const body = box(0.62, 0.92, 0.46, 0.09, m.body);
  body.position.y = 0.62;
  group.add(body);

  const seam = box(0.63, 0.02, 0.47, 0.008, m.dark);
  seam.position.y = 0.78;
  group.add(seam);

  const head = box(0.46, 0.34, 0.42, 0.08, m.plate);
  head.position.y = 1.2;
  group.add(head);

  const tube = part(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 40), m.glass, [0, 1.3, 0]);
  group.add(tube);

  const trim = part(new THREE.TorusGeometry(0.135, 0.012, 10, 48), m.accent, [0, 1.3, 0.13]);
  group.add(trim);

  /* 电池仓 */
  const battery = box(0.5, 0.16, 0.4, 0.05, m.rubber);
  battery.position.y = 0.24;
  group.add(battery);

  const latch = box(0.14, 0.06, 0.05, 0.02, m.accent);
  latch.position.set(0, 0.24, 0.22);
  group.add(latch);

  /* 支架座 */
  const foot = part(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 32), m.plate, [0, 0.08, 0]);
  group.add(foot);

  group.userData.label = "flash";
  return group;
}

/* --------------------------------------------------------------- 滤镜 */

function buildFilter(params = {}) {
  const m = makeMaterials(params.tone || "black", params.accent);
  const group = new THREE.Group();
  const r = 0.62;

  const ring = part(new THREE.TorusGeometry(r, 0.075, 24, 96), m.body);
  group.add(ring);

  /* 外圈滚花：一圈沿圆周排布的小方块 */
  group.add(knurlRing(r + 0.062, 96, [0.018, 0.018, 0.13], m.body, 0));

  const glass = part(new THREE.CircleGeometry(r - 0.04, 96), m.glass, [0, 0, 0]);
  group.add(glass);

  const rim = part(new THREE.TorusGeometry(r - 0.03, 0.008, 10, 96), m.accent);
  group.add(rim);

  group.rotation.x = -0.12;
  group.userData.label = "filter";
  return group;
}

/* --------------------------------------------------------------- 无线麦 */

function buildAudio(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();

  const rx = box(0.52, 0.3, 0.18, 0.05, m.body);
  rx.position.set(0, 0.42, 0);
  group.add(rx);

  const rxScreen = box(0.3, 0.1, 0.02, 0.01, m.dark);
  rxScreen.position.set(-0.06, 0.45, 0.095);
  group.add(rxScreen);

  const dot = part(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 20), m.accent, [0.19, 0.45, 0.095], [Math.PI / 2, 0, 0]);
  group.add(dot);

  const txGeo = new RoundedBoxGeometry(0.17, 0.36, 0.13, 3, 0.045);
  for (let i = 0; i < 2; i += 1) {
    const tx = new THREE.Mesh(txGeo, m.body);
    tx.position.set(-0.3 + i * 0.28, 1.0, 0.02);
    group.add(tx);
    const grill = part(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 24), m.dark, [tx.position.x, 1.14, 0.035]);
    group.add(grill);
    const clip = box(0.05, 0.16, 0.02, 0.008, m.plate);
    clip.position.set(tx.position.x, 1.02, -0.075);
    group.add(clip);
  }

  group.userData.label = "audio";
  return group;
}

/* --------------------------------------------------------------- 摄影包 */

function buildBag(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();

  const body = box(1.0, 0.66, 0.46, 0.12, m.canvas);
  body.position.y = 0.42;
  group.add(body);

  const flap = box(1.02, 0.2, 0.48, 0.09, m.canvas);
  flap.position.set(0, 0.72, 0.01);
  group.add(flap);

  const trim = box(1.03, 0.035, 0.49, 0.015, m.leather);
  trim.position.set(0, 0.63, 0.01);
  group.add(trim);

  const handle = part(new THREE.TorusGeometry(0.12, 0.018, 10, 32, Math.PI), m.leather, [0, 0.82, 0]);
  group.add(handle);

  const buckle = box(0.1, 0.09, 0.04, 0.015, m.accent);
  buckle.position.set(0, 0.6, 0.24);
  group.add(buckle);

  group.userData.label = "bag";
  return group;
}

/* --------------------------------------------------------------- 转接环 */

function buildAdapter(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();
  const R = 0.48;

  /* 机身端法兰（略小，和镜头端形成台阶） */
  const rear = part(new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.08, 64), m.plate, [0, 0, -0.15], [Math.PI / 2, 0, 0]);
  /* 中间主体 + 滚花 */
  const body = part(new THREE.CylinderGeometry(R, R, 0.22, 64), m.body, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const knurl = knurlRing(R * 1.004, 80, [0.014, 0.014, 0.17], m.rubber, 0);
  /* 镜头端法兰 */
  const front = part(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 0.09, 64), m.plate, [0, 0, 0.13], [Math.PI / 2, 0, 0]);
  /* 通光孔：两端都比法兰面短，避免共面闪烁 */
  const bore = part(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.26, 64), m.dark, [0, 0, -0.01], [Math.PI / 2, 0, 0]);
  group.add(rear, body, knurl, front, bore);

  /* 香槟金细环 */
  group.add(part(new THREE.TorusGeometry(R * 0.985, 0.01, 10, 80), m.accent, [0, 0, 0.177]));

  /* 卡口爪（金属，不是金色） */
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const tab = box(0.11, 0.042, 0.05, 0.012, m.plate);
    tab.position.set(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8, 0.181);
    tab.rotation.z = a;
    group.add(tab);
  }

  /* 释放按钮 + 锁销 */
  const button = box(0.13, 0.085, 0.05, 0.014, m.rubber);
  button.position.set(0.14, R * 0.99, 0.02);
  const pin = part(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 20), m.accent, [R * 1.02, -0.18, 0], [0, 0, Math.PI / 2]);
  group.add(button, pin);

  group.userData.label = "adapter";
  return group;
}

/* --------------------------------------------------------------- 通用小物 */

function buildObject(params = {}) {
  const m = makeMaterials(params.tone || "graphite", params.accent);
  const group = new THREE.Group();

  const base = box(0.78, 0.14, 0.78, 0.05, m.plate);
  base.position.y = 0.07;
  group.add(base);

  const block = box(0.56, 0.56, 0.56, 0.1, m.body);
  block.position.y = 0.42;
  group.add(block);

  const ring = part(new THREE.TorusGeometry(0.17, 0.028, 16, 64), m.accent, [0, 0.42, 0.29]);
  group.add(ring);

  const knob = part(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 28), m.accent, [0, 0.42, 0.36], [Math.PI / 2, 0, 0]);
  group.add(knob);

  const cap = box(0.3, 0.04, 0.3, 0.02, m.accent);
  cap.position.y = 0.71;
  group.add(cap);

  group.userData.label = "object";
  return group;
}

/* --------------------------------------------------------------- 出口 */

export const MODEL_BUILDERS = {
  camera: buildCamera,
  adapter: buildAdapter,
  lens: buildLens,
  tripod: buildTripod,
  flash: buildFlash,
  filter: buildFilter,
  audio: buildAudio,
  bag: buildBag,
  object: buildObject,
};

/** 按真实照片定制的设备模型（各自的文件，互不干扰） */
const DEVICE_BUILDERS = {
  "konica-bm21": buildKonicaBM21,
  "olympus-45": buildOlympus45,
  "zeniko-za12": buildZenikoZA12,
};

export function buildModel(kind, params = {}) {
  const device = DEVICE_BUILDERS[kind];
  let group;
  if (device) {
    const materials = makeMaterials(params.tone, params.accent);
    group = device({ materials, helpers: { part, box, knurlRing, label }, params, THREE });
  } else {
    const builder = MODEL_BUILDERS[kind] || buildObject;
    group = builder(params);
  }
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  return group;
}
