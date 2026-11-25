/**
 * 三维舞台 —— 一个可复用的小型查看器。
 *
 * 全站只有一个 WebGL 上下文：每次打开详情只替换场景里的模型，
 * 关闭浮层时暂停渲染循环，不会持续占用 GPU。
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildModel } from "./models.js";

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export class StageViewer {
  constructor(container, { onReady } = {}) {
    this.container = container;
    this.onReady = onReady;
    this.running = false;
    this.frame = 0;
    this.model = null;
    this.clock = new THREE.Clock();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer = renderer;

    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    container.appendChild(canvas);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(3.2, 2.2, 4.4);

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.envMap = envRT.texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 1.0;
    pmrem.dispose();

    this._setupLights();
    this._setupStage();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.6;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = 0.16;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.autoRotate = !REDUCED_MOTION;
    this.controls.autoRotateSpeed = 0.85;

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(container);

    this._onDoubleClick = () => this.reset();
    canvas.addEventListener("dblclick", this._onDoubleClick);

    this.resize();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xdfe6f2, 0x0a0a0c, 0.55);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff3e0, 2.15);
    key.position.set(4.2, 6.4, 4.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 22;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.radius = 4;
    key.shadow.bias = -0.0012;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    this.key = key;

    const rim = new THREE.DirectionalLight(0x9fb4d8, 1.5);
    rim.position.set(-5.6, 3.4, -4.2);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-2.4, 1.2, 5.4);
    this.scene.add(fill);

    const accent = new THREE.PointLight(0xe4cfa8, 6, 14, 2);
    accent.position.set(1.6, 0.6, 3.4);
    this.scene.add(accent);
  }

  _setupStage() {
    /* 接影地面 */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 72),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    /* 微弱的环形刻度盘，给舞台一点秩序感 */
    const ringGeom = new THREE.RingGeometry(2.55, 2.57, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe4cfa8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    this.scene.add(ring);
    this.ring = ring;
  }

  /**
   * 载入一个新模型。
   * @param {string} kind 机型类型（见 models.js 的 MODEL_BUILDERS）
   * @param {object} params 传给构建器的参数
   */
  show(kind, params = {}) {
    this.clear();

    const model = buildModel(kind, params);

    /* 把模型摆平：底部落在 y=0，水平方向居中 */
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;
    model.position.y += 0.002;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(model);
    this.model = model;

    /* 取景：按包围球自动退到合适的距离 */
    const radius = Math.max(size.length() * 0.5, 0.6);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = radius / Math.sin(fov / 2);
    const fitW = radius / Math.sin(Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = Math.max(fitH, fitW) * 0.92;

    this.home = {
      target: new THREE.Vector3(0, size.y * 0.46, 0),
      position: new THREE.Vector3(dist * 0.52, size.y * 0.46 + radius * 0.62, dist * 0.82),
      ringRadius: Math.max(size.x, size.z) * 1.35 + 0.4,
    };

    this.controls.minDistance = radius * 0.9;
    this.controls.maxDistance = dist * 3.2;
    this.ground.position.y = 0;
    this.ring.scale.setScalar(this.home.ringRadius / 2.56);

    this.reset(true);
    this.start();

    requestAnimationFrame(() => {
      const canvas = this.renderer.domElement;
      canvas.classList.add("is-ready");
      if (typeof this.onReady === "function") this.onReady();
    });
  }

  reset(immediate = false) {
    if (!this.home) return;
    const { position, target } = this.home;
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    if (!immediate) this.controls.update();
    this.camera.lookAt(target);
  }

  clear() {
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.isMesh || child.isInstancedMesh) {
          if (child.geometry) child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => mat && mat.dispose());
        }
      });
      this.model = null;
    }
    this.renderer.domElement.classList.remove("is-ready");
  }

  setAutoRotate(on) {
    this.controls.autoRotate = on && !REDUCED_MOTION;
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this._w && h === this._h) return;
    this._w = w;
    this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._tick();
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  _tick = () => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this._tick);
    const t = this.clock.getElapsedTime();

    /* 极轻微的呼吸感：模型自己几乎察觉不到地转一点点 */
    if (this.model && !this.controls.autoRotate) {
      this.model.rotation.y = Math.sin(t * 0.32) * 0.035;
    } else if (this.model) {
      this.model.rotation.y = 0;
    }

    if (this.ring) {
      this.ring.material.opacity = 0.1 + Math.sin(t * 0.6) * 0.045;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.stop();
    this._ro?.disconnect();
    this.renderer.domElement.removeEventListener("dblclick", this._onDoubleClick);
    this.clear();
    this.controls.dispose();
    this.scene.environment = null;
    this.envMap?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.renderer = null;
  }
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch (e) {
    return false;
  }
}
