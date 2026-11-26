/**
 * 三维舞台 —— 一个可复用的小型查看器。
 *
 * 全站只有一个 WebGL 上下文：每次打开详情只替换场景里的模型，
 * 关闭浮层时暂停渲染循环，不会持续占用 GPU。
 *
 * 舞台有两套主题（dark / light）：曝光、灯光、地面投影、刻度环都各调一份。
 * 切换主题只改参数（300ms 数值过渡），不重建 renderer，也不碰相机与交互。
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildModel } from "./models.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------- 主题参数 */

const THEME_TRANSITION_MS = 300;

/* 这些字段是颜色，其余按数字插值 */
const COLOR_KEYS = new Set([
  "hemiSky",
  "hemiGround",
  "keyColor",
  "rimColor",
  "fillColor",
  "accentColor",
  "bounceColor",
  "shadowColor",
  "poolColor",
  "ringColor",
]);

/**
 * 两套舞台。
 * dark  = 原来的深色舞台（曝光 / 灯光 / 地面投影与之前一致，刻度环呼吸上限对齐到 0.16）；
 * light = 浅色主题：曝光压一点、环境光提亮、key 光收力，地面投影改成
 *         中性灰低透明度，再补一层柔和的接触阴影，刻度环换成更深的金棕。
 */
const THEME_PRESETS = {
  dark: {
    exposure: 1.12,
    environmentIntensity: 1.0,
    hemiSky: 0xdfe6f2,
    hemiGround: 0x0a0a0c,
    hemiIntensity: 0.55,
    keyColor: 0xfff3e0,
    keyIntensity: 2.15,
    rimColor: 0x9fb4d8,
    rimIntensity: 1.5,
    fillColor: 0xffffff,
    fillIntensity: 0.4,
    accentColor: 0xe4cfa8,
    accentIntensity: 6,
    bounceColor: 0xfff3e2,
    bounceIntensity: 0,
    shadowColor: 0x000000,
    shadowOpacity: 0.42,
    poolColor: 0x000000,
    poolOpacity: 0,
    ringColor: 0xe4cfa8,
    ringBase: 0.115,
    ringAmp: 0.045,
  },
  light: {
    exposure: 0.99,
    environmentIntensity: 1.2,
    hemiSky: 0xfffbf4,
    hemiGround: 0xe6dfd2,
    hemiIntensity: 0.72,
    keyColor: 0xfff6ea,
    keyIntensity: 1.66,
    rimColor: 0xc9d4e6,
    rimIntensity: 1.05,
    fillColor: 0xffffff,
    fillIntensity: 0.45,
    accentColor: 0xd8b98a,
    accentIntensity: 3.2,
    bounceColor: 0xfff0dc,
    bounceIntensity: 0.5,
    shadowColor: 0x59606b,
    shadowOpacity: 0.17,
    poolColor: 0x4a505a,
    poolOpacity: 0.13,
    ringColor: 0xa8793c,
    ringBase: 0.245,
    ringAmp: 0.035,
  },
};

function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

function themeState(preset) {
  const state = {};
  for (const key of Object.keys(preset)) {
    state[key] = COLOR_KEYS.has(key) ? new THREE.Color(preset[key]) : preset[key];
  }
  return state;
}

function cloneThemeState(state) {
  const copy = {};
  for (const key of Object.keys(state)) {
    copy[key] = state[key] instanceof THREE.Color ? state[key].clone() : state[key];
  }
  return copy;
}

function lerpThemeState(from, to, t) {
  const state = {};
  for (const key of Object.keys(to)) {
    const a = from[key];
    const b = to[key];
    state[key] =
      b instanceof THREE.Color ? (a instanceof THREE.Color ? a.clone().lerp(b, t) : b.clone()) : a + (b - a) * t;
  }
  return state;
}

/* --------------------------------------------------------------- 查看器 */

export class StageViewer {
  constructor(container, { onReady, theme } = {}) {
    this.container = container;
    this.onReady = onReady;
    this.running = false;
    this.frame = 0;
    this.model = null;
    this.clock = new THREE.Clock();

    this.theme = normalizeTheme(theme);
    const preset = THEME_PRESETS[this.theme];
    this._current = themeState(preset);
    this._themeFrom = null;
    this._themeTarget = null;
    this._themeElapsed = 0;
    this._ringBase = preset.ringBase;
    this._ringAmp = preset.ringAmp;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = preset.exposure;
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
    this.scene.environmentIntensity = preset.environmentIntensity * (this._isGlb ? 0.22 : 1);
    pmrem.dispose();

    this._setupLights(preset);
    this._setupStage(preset);

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

  _setupLights(preset) {
    const hemi = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, preset.hemiIntensity);
    this.scene.add(hemi);
    this.hemi = hemi;

    const key = new THREE.DirectionalLight(preset.keyColor, preset.keyIntensity);
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

    const rim = new THREE.DirectionalLight(preset.rimColor, preset.rimIntensity);
    rim.position.set(-5.6, 3.4, -4.2);
    this.scene.add(rim);
    this.rim = rim;

    const fill = new THREE.DirectionalLight(preset.fillColor, preset.fillIntensity);
    fill.position.set(-2.4, 1.2, 5.4);
    this.scene.add(fill);
    this.fill = fill;

    const accent = new THREE.PointLight(preset.accentColor, preset.accentIntensity, 14, 2);
    accent.position.set(1.6, 0.6, 3.4);
    this.scene.add(accent);
    this.accent = accent;

    /* 浅色主题的补光：从正面偏下打一点暖光，托住金属机身的暗部，避免发灰 */
    const bounce = new THREE.DirectionalLight(preset.bounceColor, preset.bounceIntensity);
    bounce.position.set(-2.6, 1.1, 5.2);
    this.scene.add(bounce);
    this.bounce = bounce;
  }

  _setupStage(preset) {
    /* 接影地面 */
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 72),
      new THREE.ShadowMaterial({ color: preset.shadowColor, opacity: preset.shadowOpacity })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    /* 柔和的接触阴影（浅色主题才可见），让投影边缘不至于硬得像剪纸 */
    const poolMat = new THREE.MeshBasicMaterial({
      map: StageViewer._contactShadowTexture(),
      color: preset.poolColor,
      transparent: true,
      opacity: preset.poolOpacity,
      depthWrite: false,
      toneMapped: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 64), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.0015;
    pool.renderOrder = 1;
    this.scene.add(pool);
    this.pool = pool;

    /* 微弱的环形刻度盘，给舞台一点秩序感 */
    const ringGeom = new THREE.RingGeometry(2.55, 2.57, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: preset.ringColor,
      transparent: true,
      opacity: preset.ringBase,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    ring.renderOrder = 2;
    this.scene.add(ring);
    this.ring = ring;
  }

  /* 一张径向渐隐的白图，只当 alpha 蒙版用 */
  static _contactShadowTexture() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.42, "rgba(255,255,255,0.62)");
    gradient.addColorStop(0.72, "rgba(255,255,255,0.2)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * 把一份主题状态写进 renderer / 灯光 / 地面 / 刻度环。
   * 过渡过程中每帧调用，所以这里只做赋值，不重建任何东西。
   */
  _applyThemeState(state) {
    if (!this.renderer) return;
    this.renderer.toneMappingExposure = state.exposure;
    this.scene.environmentIntensity = state.environmentIntensity;

    if (this.hemi) {
      this.hemi.color.copy(state.hemiSky);
      this.hemi.groundColor.copy(state.hemiGround);
      this.hemi.intensity = state.hemiIntensity;
    }
    if (this.key) {
      this.key.color.copy(state.keyColor);
      this.key.intensity = state.keyIntensity;
    }
    if (this.rim) {
      this.rim.color.copy(state.rimColor);
      this.rim.intensity = state.rimIntensity;
    }
    if (this.fill) {
      this.fill.color.copy(state.fillColor);
      this.fill.intensity = state.fillIntensity;
    }
    if (this.accent) {
      this.accent.color.copy(state.accentColor);
      this.accent.intensity = state.accentIntensity;
    }
    if (this.bounce) {
      this.bounce.color.copy(state.bounceColor);
      this.bounce.intensity = state.bounceIntensity;
    }
    if (this.ground) {
      this.ground.material.color.copy(state.shadowColor);
      this.ground.material.opacity = state.shadowOpacity;
    }
    if (this.pool) {
      this.pool.material.color.copy(state.poolColor);
      this.pool.material.opacity = state.poolOpacity;
      this.pool.visible = state.poolOpacity > 0.001;
    }
    if (this.ring) {
      this.ring.material.color.copy(state.ringColor);
      this.ring.material.opacity = state.ringBase;
    }

    this._ringBase = state.ringBase;
    this._ringAmp = state.ringAmp;
  }

  /**
   * 切换主题。运行中做 300ms 渐变；暂停时直接落位（关掉浮层再切主题也不会漏）。
   * @param {"dark"|"light"} theme
   */
  setTheme(theme) {
    const name = normalizeTheme(theme);
    if (name === this.theme && !this._themeTarget) return this;
    this.theme = name;

    const target = themeState(THEME_PRESETS[name]);
    if (!this.renderer || !this.running || REDUCED_MOTION) {
      this._current = target;
      this._themeFrom = null;
      this._themeTarget = null;
      this._applyThemeState(target);
      return this;
    }

    this._themeFrom = cloneThemeState(this._current);
    this._themeTarget = target;
    this._themeElapsed = 0;
    return this;
  }

  _advanceTheme(dt) {
    if (!this._themeTarget) return;
    const duration = THEME_TRANSITION_MS / 1000;
    this._themeElapsed = Math.min(duration, this._themeElapsed + dt);
    const k = this._themeElapsed / duration;
    const eased = k * k * (3 - 2 * k);
    const state = lerpThemeState(this._themeFrom, this._themeTarget, eased);
    this._applyThemeState(state);
    this._current = state;
    if (k >= 1) {
      this._current = this._themeTarget;
      this._themeFrom = null;
      this._themeTarget = null;
    }
  }

  /**
   * 载入一个新模型。
   * @param {string} kind 机型类型（见 models.js 的 MODEL_BUILDERS）
   * @param {object} params 传给构建器的参数
   */
  async show(kind, params = {}) {
    const token = (this._showToken = (this._showToken || 0) + 1);
    this.clear();

    let model;
    if (params.glb) {
      try {
        model = await this._loadGLB(params.glb);
        if (token !== this._showToken) {
          this._disposeObject(model);
          return;
        }
      } catch (error) {
        console.warn("[lightbox] GLB 加载失败，回退到图元模型", error);
        model = buildModel(kind, params);
      }
    } else {
      model = buildModel(kind, params);
    }
    if (token !== this._showToken) {
      this._disposeObject(model);
      return;
    }
    this._install(model, params);
  }

  _loadGLB(url) {
    if (!this._gltfLoader) this._gltfLoader = new GLTFLoader();
    const loader = this._gltfLoader;
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!scene) {
            reject(new Error("GLB 中没有场景"));
            return;
          }
          scene.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = true;
            child.receiveShadow = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (!mat) return;
              if ("envMapIntensity" in mat) mat.envMapIntensity = 0.35;
              /* GLB 多为真实 PBR 材质：把金属的粗糙度抬一点，避免镜面高光整片过曝 */
              if (typeof mat.metalness === "number" && mat.metalness > 0.5) {
                mat.roughness = Math.max(mat.roughness, 0.52);
              }
              mat.needsUpdate = true;
            });
          });
          resolve(scene);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  _disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (child.isMesh || child.isInstancedMesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      }
    });
  }

  _install(model, params = {}) {
    /* GLB 的真实 PBR 材质对强光更敏感，单独用一套灯光强度 */
    const isGlb = Boolean(params.glb);
    this._isGlb = isGlb;
    if (this.key) this.key.intensity = isGlb ? 0.6 : 2.15;
    if (this.rimLight) this.rimLight.intensity = isGlb ? 0.5 : 1.5;
    if (this.fillLight) this.fillLight.intensity = isGlb ? 0.3 : 0.4;
    if (this.scene) {
      const baseEnv = (this._current && this._current.environmentIntensity) || 1;
      this.scene.environmentIntensity = baseEnv * (isGlb ? 0.22 : 1);
    }

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
    /* 不再假设模型是「1 单位」量级：GLB 可能是 55mm 的真实尺寸 */
    const radius = Math.max(size.length() * 0.5, 1e-5);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitH = radius / Math.sin(fov / 2);
    const fitW = radius / Math.sin(Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = Math.max(fitH, fitW) * (params.glb ? 1.08 : 0.92);

    /* 薄片类模型（转接环）可以要求更斜的默认视角，避免正对镜头像一张饼 */
    const azimuth = Number.isFinite(params.azimuth) ? params.azimuth : 0.52;
    const elevation = Number.isFinite(params.elevation) ? params.elevation : 0.62;
    const targetY = size.y * 0.46;
    const offset = new THREE.Vector3(dist * azimuth, radius * elevation, dist * 0.82)
      .normalize()
      .multiplyScalar(dist);

    this.home = {
      target: new THREE.Vector3(0, targetY, 0),
      position: new THREE.Vector3(offset.x, targetY + offset.y, offset.z),
      ringRadius: Math.max(size.x, size.z) * 1.35 + Math.max(radius * 0.25, 1e-4),
    };

    /* 自适应近远裁面：GLB 可能是真实尺寸（毫米级），不能写死 0.1 */
    this.camera.near = Math.max(dist / 200, 0.0005);
    this.camera.far = Math.max(dist * 60, 10);
    this.camera.updateProjectionMatrix();

    this.controls.minDistance = radius * 0.9;
    this.controls.maxDistance = dist * 3.2;

    /* 阴影视锥跟着模型尺寸走，否则小模型只有几个像素的阴影 */
    if (this.key) {
      const sc = this.key.shadow.camera;
      const half = radius * 3.2;
      sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
      sc.near = Math.max(radius * 0.2, 1e-4);
      sc.far = radius * 40;
      sc.updateProjectionMatrix();
      this.key.position.set(radius * 4.2, radius * 6.4, radius * 4.6);
    }
    this.ground.position.y = 0;
    this.ring.scale.setScalar(this.home.ringRadius / 2.56);
    if (this.pool) {
      this.pool.scale.setScalar(Math.max(size.x, size.z) * 0.82 + Math.max(radius * 0.3, 1e-4));
    }

    this.reset(true);
    this.start();

    requestAnimationFrame(() => {
      const canvas = this.renderer.domElement;
      canvas.classList.add("is-ready");
      if (typeof this.onReady === "function") this.onReady();
    });
  }

  debugSnapshot() {
    if (!this.model) return { model: false };
    const box = new THREE.Box3().setFromObject(this.model);
    return {
      model: true,
      children: this.model.children.length,
      boxMin: box.min.toArray().map((n) => +n.toFixed(4)),
      boxMax: box.max.toArray().map((n) => +n.toFixed(4)),
      camera: this.camera.position.toArray().map((n) => +n.toFixed(4)),
      target: this.controls.target.toArray().map((n) => +n.toFixed(4)),
      near: this.camera.near,
      far: this.camera.far,
      home: this.home ? this.home.position.toArray().map((n) => +n.toFixed(4)) : null,
      visible: this.model.visible,
    };
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
          mats.forEach((mat) => {
            if (!mat) return;
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
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
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;

    this._advanceTheme(dt);

    /* 极轻微的呼吸感：模型自己几乎察觉不到地转一点点 */
    if (this.model && !this.controls.autoRotate) {
      this.model.rotation.y = Math.sin(t * 0.32) * 0.035;
    } else if (this.model) {
      this.model.rotation.y = 0;
    }

    if (this.ring) {
      this.ring.material.opacity = this._ringBase + Math.sin(t * 0.6) * this._ringAmp;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.stop();
    this._ro?.disconnect();
    this.renderer.domElement.removeEventListener("dblclick", this._onDoubleClick);
    this.clear();
    if (this.pool) {
      this.pool.geometry.dispose();
      this.pool.material.map?.dispose();
      this.pool.material.dispose();
      this.pool = null;
    }
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
