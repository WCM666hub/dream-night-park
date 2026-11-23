/* ==========================================================================
   HALLOWEEN NIGHT PARK — a procedural, animated miniature diorama
   Built with Three.js. Every model, texture and effect is generated in code.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* --------------------------------------------------------------------------
   Deterministic randomness
   -------------------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry32(0x1A11DEE);
const rand = (a = 0, b = 1) => a + R() * (b - a);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

/* --------------------------------------------------------------------------
   Palette
   -------------------------------------------------------------------------- */
const C = {
  ink: 0x0b0718,
  outline: 0x100a20,
  skyTop: 0x050914,
  skyMid: 0x17133d,
  skyHorizon: 0x482052,
  fog: 0x4a3167,
  moon: 0xf6e9cf,
  grassDark: 0x17252e,
  grass: 0x21313a,
  stone: 0x77738e,
  stoneLight: 0x9c95ae,
  stoneMid: 0x5d5977,
  stoneDark: 0x3b3752,
  stoneDeep: 0x252138,
  gold: 0xc99755,
  goldBright: 0xf1c57a,
  roof: 0x2e2a5c,
  roofLight: 0x464079,
  wood: 0x543d42,
  woodDark: 0x32262f,
  pumpkin: 0xf47b25,
  pumpkinDeep: 0xc34b1b,
  amber: 0xffb34e,
  teal: 0x5de8d0,
  pink: 0xff6fae,
  violet: 0xa778ff,
  blue: 0x5a8cff,
  ghost: 0xd9e8ff,
  green: 0x78ffb0,
  blood: 0x8e334f,
  cream: 0xf2dfb8,
  black: 0x0a0911,
};

/* --------------------------------------------------------------------------
   Renderer / scene / camera
   -------------------------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(C.fog, 0.0065);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.25, 420);
camera.position.set(39.0, 27.0, 43.0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.1, 0.0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.85;
controls.minDistance = 30;
controls.maxDistance = 80;
controls.minPolarAngle = 0.08;
controls.maxPolarAngle = Math.PI * 0.485;
controls.autoRotate = false;
controls.enableZoom = false;
controls.update();

// Smooth dolly: the wheel adjusts a target distance and the camera eases
// toward it, instead of jumping between steps.
let targetCameraDistance = camera.position.distanceTo(controls.target);
const BASE_CAMERA_DISTANCE = targetCameraDistance;
function fitCameraForAspect() {
  const aspect = Math.max(0.25, window.innerWidth / window.innerHeight);
  let fov = 42;
  let desiredDistance = BASE_CAMERA_DISTANCE;
  if (aspect < 1.25) {
    const narrow = 1.25 - aspect;
    fov = Math.min(64, 42 + narrow * 23);
    const hFov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * aspect);
    desiredDistance = Math.max(BASE_CAMERA_DISTANCE, 78 / (2 * Math.tan(hFov / 2)));
  }
  camera.fov = fov;
  camera.updateProjectionMatrix();
  controls.maxDistance = Math.max(80, desiredDistance * 1.24);
  targetCameraDistance = clamp(desiredDistance, controls.minDistance, controls.maxDistance);
  const direction = camera.position.clone().sub(controls.target).normalize();
  camera.position.copy(controls.target).addScaledVector(direction, targetCameraDistance);
  controls.update();
}
fitCameraForAspect();
let coasterRidePhase = 'off';
const wheelZoomHandler = (event) => {
  event.preventDefault();
  if (coasterRidePhase !== 'off') return;
  const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 360 : event.deltaY;
  const factor = Math.exp(delta * 0.0011);
  targetCameraDistance = clamp(targetCameraDistance * factor, controls.minDistance, controls.maxDistance);
};
renderer.domElement.addEventListener('wheel', wheelZoomHandler, { passive: false });

function easeCameraDistance(dt) {
  const offset = camera.position.clone().sub(controls.target);
  const current = offset.length();
  if (Math.abs(current - targetCameraDistance) < 0.008) {
    if (current !== targetCameraDistance) {
      offset.setLength(targetCameraDistance);
      camera.position.copy(controls.target).add(offset);
    }
    return;
  }
  const next = lerp(current, targetCameraDistance, 1 - Math.exp(-9.5 * dt));
  offset.setLength(next);
  camera.position.copy(controls.target).add(offset);
}

renderer.domElement.style.cursor = 'grab';
renderer.domElement.addEventListener('pointerdown', () => { renderer.domElement.style.cursor = 'grabbing'; });
window.addEventListener('pointerup', () => { renderer.domElement.style.cursor = 'grab'; });

/* --------------------------------------------------------------------------
   Render passes
   -------------------------------------------------------------------------- */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.44,
  0.5,
  0.84
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* --------------------------------------------------------------------------
   Small helpers
   -------------------------------------------------------------------------- */
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

function canvasTexture(w, h, draw, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (opts.clamp !== false) {
    tex.wrapS = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  }
  return tex;
}

function makeGlowTexture(size = 256, power = 2.0) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const a = Math.pow(1 - t, power);
      g.addColorStop(t, `rgba(255,255,255,${a.toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}
const glowTex = makeGlowTexture(256, 2.2);
const softGlowTex = makeGlowTexture(512, 3.0);

function makeNoiseTexture(size, base, variance, count, seed) {
  const rr = mulberry32(seed);
  return canvasTexture(size, size, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < count; i++) {
      const x = rr() * w;
      const y = rr() * h;
      const r = 1 + rr() * 5;
      const a = 0.015 + rr() * variance;
      const bright = rr() > 0.45;
      ctx.fillStyle = bright ? `rgba(255,245,225,${a})` : `rgba(0,0,0,${a * 0.9})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  });
}

const toonSteps = new Uint8Array([42, 108, 176, 232, 255]);
const toonGradient = new THREE.DataTexture(toonSteps, toonSteps.length, 1, THREE.RedFormat);
toonGradient.minFilter = THREE.NearestFilter;
toonGradient.magFilter = THREE.NearestFilter;
toonGradient.generateMipmaps = false;
toonGradient.needsUpdate = true;

function toonMat(hex, opts = {}) {
  const m = new THREE.MeshToonMaterial({
    color: hex,
    gradientMap: toonGradient,
    map: opts.map || null,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite !== false,
    alphaTest: opts.alphaTest ?? 0,
  });
  if (opts.emissiveMap) m.emissiveMap = opts.emissiveMap;
  return m;
}

function basicMat(hex, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color: hex,
    map: opts.map || null,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    blending: opts.blending || THREE.NormalBlending,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
    toneMapped: opts.toneMapped === false ? false : true,
    fog: opts.fog !== false,
    alphaTest: opts.alphaTest ?? 0,
  });
}

function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, rt, rb, h, seg, material, x = 0, y = 0, z = 0, opts = {}) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, seg, opts.segH || 1, opts.openEnded || false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, radius, material, x = 0, y = 0, z = 0, opts = {}) {
  const geo = new THREE.SphereGeometry(radius, opts.wSeg || 18, opts.hSeg || 12);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(opts.sx || 1, opts.sy || 1, opts.sz || 1);
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  parent.add(mesh);
  return mesh;
}

function addCone(parent, radius, h, seg, material, x = 0, y = 0, z = 0, opts = {}) {
  const geo = new THREE.ConeGeometry(radius, h, seg, opts.hSeg || 1, opts.openEnded || false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (opts.rotX) mesh.rotation.x = opts.rotX;
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  if (opts.rotZ) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = opts.castShadow !== false;
  mesh.receiveShadow = opts.receiveShadow !== false;
  parent.add(mesh);
  return mesh;
}

function addPlane(parent, w, h, material, x = 0, y = 0, z = 0, opts = {}) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  if (opts.rotX !== undefined) mesh.rotation.x = opts.rotX;
  if (opts.rotY !== undefined) mesh.rotation.y = opts.rotY;
  if (opts.rotZ !== undefined) mesh.rotation.z = opts.rotZ;
  mesh.castShadow = !!opts.castShadow;
  mesh.receiveShadow = !!opts.receiveShadow;
  parent.add(mesh);
  return mesh;
}

const glowSprites = [];
function addGlow(parent, color, size, x, y, z, opacity = 0.65, tex = glowTex) {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(size, size, 1);
  parent.add(sprite);
  glowSprites.push({ sprite, base: opacity, phase: rand(0, TAU) });
  return sprite;
}

function addOutline(mesh, scale = 1.028) {
  const mat = new THREE.MeshBasicMaterial({
    color: C.outline,
    side: THREE.BackSide,
    toneMapped: false,
  });
  const outline = new THREE.Mesh(mesh.geometry, mat);
  outline.scale.copy(mesh.scale).multiplyScalar(scale);
  outline.position.copy(mesh.position);
  outline.rotation.copy(mesh.rotation);
  outline.renderOrder = -1;
  outline.castShadow = false;
  outline.receiveShadow = false;
  mesh.parent.add(outline);
  return outline;
}

function addGlowPool(parent, color, radius, x, z, opacity = 0.34, stretch = 1) {
  const mat = new THREE.MeshBasicMaterial({
    map: softGlowTex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2 * stretch), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.12, z);
  parent.add(mesh);
  return mesh;
}

/* --------------------------------------------------------------------------
   Assembly timeline
   -------------------------------------------------------------------------- */
function setObjectOpacity(material, value) {
  if (!material) return;
  material.opacity = value;
  if (material.uniforms && material.uniforms.uOpacity) {
    material.uniforms.uOpacity.value = value;
  }
}
function getObjectOpacity(material) {
  if (!material) return 1;
  if (material.uniforms && material.uniforms.uOpacity) return material.uniforms.uOpacity.value;
  return material.opacity ?? 1;
}
const assembly = [];
let assemblyPhase = 'atmosphere';
let currentTheme = 'fairy';
const themePartGroups = [];
const themeExcludedRoots = [];
const Eases = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c = 1.5;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  // A gentler overshoot for large architectural pieces: they lock into
  // place with a soft 2% settle rather than a bouncy cartoon pop.
  outBackSoft: (t) => {
    const c = 0.9;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outElastic: (t) => {
    const c = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
  },
};

function assemble(obj, start, duration = 1.0, mode = 'rise', opts = {}) {
  if (!obj) return obj;
  const record = {
    obj,
    phase: assemblyPhase,
    start,
    duration: Math.max(0.01, duration),
    mode,
    opts,
    done: false,
    basePos: obj.position.clone(),
    baseScale: obj.scale.clone(),
    baseRot: obj.rotation.clone(),
    materials: [],
    drawRanges: [],
    lightBase: obj.isLight ? obj.intensity : 0,
  };
  obj.visible = false;

  if (mode === 'fade') {
    const seenMaterials = new Set();
    obj.traverse((child) => {
      if (!child.isMesh && !child.isPoints && !child.isLine && !child.isSprite) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (!m || seenMaterials.has(m)) continue;
        seenMaterials.add(m);
        m.transparent = true;
        const base = getObjectOpacity(m);
        record.materials.push({ m, base });
        setObjectOpacity(m, 0);
      }
    });
  }
  if (mode === 'reveal') {
    obj.traverse((child) => {
      if (child.isMesh && child.geometry && child.geometry.index) {
        const count = child.geometry.index.count;
        record.drawRanges.push({ geom: child.geometry, count });
        child.geometry.setDrawRange(0, 0);
      }
    });
  }
  if (mode === 'pathReveal') {
    const count = obj.geometry.index ? obj.geometry.index.count : obj.geometry.attributes.position.count;
    record.drawRanges.push({ geom: obj.geometry, count });
    obj.geometry.setDrawRange(0, 0);
  }
  if (mode === 'grow') {
    obj.scale.set(
      record.baseScale.x * 0.001,
      record.baseScale.y * 0.001,
      record.baseScale.z * 0.001
    );
  }
  if (mode === 'scaleY') {
    obj.scale.y = 0.001;
    obj.position.y = record.basePos.y;
  }
  if (mode === 'rise' || mode === 'riseSlow' || mode === 'drop') {
    obj.position.y += opts.offset ?? (mode === 'drop' ? 7 : -3.5);
  }
  assembly.push(record);
  return obj;
}

function assembleRise(obj, start, duration = 1.0, opts = {}) {
  return assemble(obj, start, duration, 'rise', { offset: -4.5, ...opts });
}
function assembleDrop(obj, start, duration = 1.0, opts = {}) {
  return assemble(obj, start, duration, 'drop', { offset: 7, ...opts });
}
function assemblePop(obj, start, duration = 0.85, opts = {}) {
  return assemble(obj, start, duration, 'grow', opts);
}

function updateAssembly(time) {
  for (const rec of assembly) {
    if (rec.done) continue;
    const raw = (time - rec.start) / rec.duration;
    if (raw <= 0) {
      if (rec.mode === 'light') rec.obj.intensity = 0;
      continue;
    }
    const p = clamp(raw, 0, 1);
    rec.obj.visible = true;

    switch (rec.mode) {
      case 'rise':
      case 'riseSlow': {
        const e = Eases.outBackSoft(p);
        rec.obj.position.y = lerp(rec.basePos.y + (rec.opts.offset ?? -3.5), rec.basePos.y, e);
        break;
      }
      case 'drop': {
        const e = Eases.outBackSoft(p);
        rec.obj.position.y = lerp(rec.basePos.y + (rec.opts.offset ?? 7), rec.basePos.y, e);
        break;
      }
      case 'grow': {
        const e = Eases.outBack(p);
        rec.obj.scale.set(rec.baseScale.x * e, rec.baseScale.y * e, rec.baseScale.z * e);
        break;
      }
      case 'pop': {
        const e = Eases.outBack(p);
        rec.obj.scale.set(rec.baseScale.x * e, rec.baseScale.y * e, rec.baseScale.z * e);
        break;
      }
      case 'scaleY': {
        const e = Eases.outBackSoft(p);
        rec.obj.scale.y = rec.baseScale.y * Math.max(0.001, e);
        break;
      }
      case 'scaleXZ': {
        const e = Eases.outBackSoft(p);
        rec.obj.scale.x = rec.baseScale.x * Math.max(0.001, e);
        rec.obj.scale.z = rec.baseScale.z * Math.max(0.001, e);
        break;
      }
      case 'slide': {
        const e = Eases.outCubic(p);
        const dir = rec.opts.dir || new THREE.Vector3(1, 0, 0);
        rec.obj.position.copy(rec.basePos).addScaledVector(dir, 1 - e);
        break;
      }
      case 'spin': {
        const e = Eases.outCubic(p);
        rec.obj.rotation.y = rec.baseRot.y + (1 - e) * Math.PI * 1.7;
        rec.obj.scale.setScalar(Math.max(0.001, e));
        break;
      }
      case 'fade': {
        const e = Eases.inOutCubic(p);
        for (const item of rec.materials) setObjectOpacity(item.m, item.base * e);
        break;
      }
      case 'reveal':
      case 'pathReveal': {
        const e = Eases.inOutCubic(p);
        for (const item of rec.drawRanges) {
          item.geom.setDrawRange(0, Math.floor(item.count * e));
        }
        break;
      }
      case 'light': {
        rec.obj.intensity = rec.lightBase * Eases.outCubic(p);
        break;
      }
      case 'swing': {
        const e = Eases.outBack(p);
        rec.obj.rotation.z = rec.baseRot.z + (1 - e) * (rec.opts.angle ?? 0.5);
        rec.obj.rotation.x = rec.baseRot.x + (1 - e) * (rec.opts.angleX ?? 0);
        break;
      }
      default:
        break;
    }

    if (rec.opts.spin && rec.mode !== 'spin') {
      const se = Eases.outBackSoft(p);
      rec.obj.rotation.y = rec.baseRot.y + (1 - se) * rec.opts.spin;
    }

    if (p >= 1) {
      rec.done = true;
      rec.obj.position.copy(rec.basePos);
      rec.obj.scale.copy(rec.baseScale);
      rec.obj.rotation.copy(rec.baseRot);
      if (rec.mode === 'reveal' || rec.mode === 'pathReveal') {
        for (const item of rec.drawRanges) item.geom.setDrawRange(0, item.count);
      }
      if (rec.mode === 'fade') {
        for (const item of rec.materials) {
          setObjectOpacity(item.m, item.base);
          if (item.base >= 0.999) item.m.transparent = false;
        }
      }
      if (rec.mode === 'light') rec.obj.intensity = rec.lightBase;
    }
  }
}

/* --------------------------------------------------------------------------
   Shared generated textures
   -------------------------------------------------------------------------- */
const cobbleTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#665078';
  ctx.fillRect(0, 0, w, h);
  const rr = mulberry32(941);
  const rows = 7;
  const cols = 6;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 ? -w / cols / 2 : 0;
    for (let c = -1; c < cols + 1; c++) {
      const x = c * (w / cols) + offset + rr() * 6;
      const y = r * ch + rr() * 3;
      const pw = w / cols - 6 - rr() * 5;
      const ph = ch - 6 - rr() * 4;
      const l = 68 + Math.floor(rr() * 17);
      ctx.fillStyle = `hsl(${286 + rr() * 44}, ${22 + rr() * 16}%, ${l}%)`;
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + pw, y, x + pw, y + ph, radius);
      ctx.arcTo(x + pw, y + ph, x, y + ph, radius);
      ctx.arcTo(x, y + ph, x, y, radius);
      ctx.arcTo(x, y, x + pw, y, radius);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(76,52,102,.52)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,235,255,.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,223,249,${rr() * 0.07})`;
    ctx.fillRect(rr() * w, rr() * h, rr() * 3 + 1, rr() * 3 + 1);
  }
}, { repeat: [1, 1] });

const stoneTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#b7a8cf';
  ctx.fillRect(0, 0, w, h);
  const rr = mulberry32(452);
  const rowH = 44;
  const blockW = 92;
  for (let y = 0, row = 0; y < h; y += rowH, row++) {
    const offset = row % 2 ? -blockW / 2 : 0;
    for (let x = offset; x < w; x += blockW) {
      const l = 74 + rr() * 13;
      ctx.fillStyle = `hsl(${274 + rr() * 32}, ${20 + rr() * 14}%, ${l}%)`;
      ctx.fillRect(x + 2, y + 2, blockW - 4, rowH - 4);
      ctx.fillStyle = `rgba(91,69,117,${0.14 + rr() * 0.16})`;
      ctx.fillRect(x, y + rowH - 5, blockW, 5);
      ctx.fillRect(x + blockW - 4, y, 4, rowH);
      ctx.fillStyle = 'rgba(255,250,255,.2)';
      ctx.fillRect(x + 2, y + 2, blockW - 4, 2);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = `rgba(119,89,150,${rr() * 0.12})`;
        ctx.fillRect(x + rr() * blockW, y + rr() * rowH, rr() * 9 + 2, rr() * 2 + 1);
      }
    }
  }
}, { repeat: [2, 2] });

const stoneDarkTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#7d6a99';
  ctx.fillRect(0, 0, w, h);
  const rr = mulberry32(761);
  for (let y = 0; y < h; y += 58) {
    for (let x = (y / 58) % 2 ? -34 : 0; x < w; x += 72) {
      const l = 56 + rr() * 11;
      ctx.fillStyle = `hsl(${272 + rr() * 28}, 24%, ${l}%)`;
      ctx.fillRect(x + 2, y + 2, 68, 54);
      ctx.strokeStyle = 'rgba(86,62,112,.45)';
      ctx.strokeRect(x, y, 71, 57);
    }
  }
}, { repeat: [2, 2] });

const roofTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#9b609b';
  ctx.fillRect(0, 0, w, h);
  const rr = mulberry32(332);
  const rowH = 28;
  const tileW = 38;
  for (let y = 0; y < h; y += rowH) {
    for (let x = (y / rowH) % 2 ? -tileW / 2 : 0; x < w; x += tileW) {
      const l = 58 + rr() * 14;
      ctx.fillStyle = `hsl(${286 + rr() * 58}, ${44 + rr() * 18}%, ${l}%)`;
      ctx.beginPath();
      ctx.moveTo(x + 1, y + rowH - 2);
      ctx.lineTo(x + 1, y + 7);
      ctx.quadraticCurveTo(x + tileW / 2, y - 2, x + tileW - 1, y + 7);
      ctx.lineTo(x + tileW - 1, y + rowH - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,54,118,.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,255,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + rowH - 5);
      ctx.lineTo(x + 4, y + 8);
      ctx.stroke();
    }
  }
}, { repeat: [3, 3] });

const groundTex = canvasTexture(1024, 1024, (ctx, w, h) => {
  const rr = mulberry32(8912);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#4d3e73');
  grad.addColorStop(0.5, '#5e4c84');
  grad.addColorStop(1, '#443865');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const r = 10 + rr() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rr() > 0.5;
    g.addColorStop(0, dark ? 'rgba(35,24,58,.16)' : 'rgba(170,138,208,.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 12000; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const v = rr();
    if (v > 0.76) ctx.fillStyle = `rgba(255,211,245,${0.03 + rr() * 0.09})`;
    else if (v > 0.36) ctx.fillStyle = `rgba(49,32,78,${0.03 + rr() * 0.1})`;
    else ctx.fillStyle = `rgba(164,174,236,${0.03 + rr() * 0.1})`;
    ctx.fillRect(x, y, 1 + rr() * 3, 1 + rr() * 3);
  }
  for (let i = 0; i < 1800; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const len = 2 + rr() * 6;
    ctx.strokeStyle = `rgba(${150 + rr() * 40},${120 + rr() * 40},${190 + rr() * 35},${0.14 + rr() * 0.18})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + rr() * 3 - 1.5, y - len / 2, x + rr() * 3 - 1.5, y - len);
    ctx.stroke();
  }
});

/* --------------------------------------------------------------------------
   World roots
   -------------------------------------------------------------------------- */
const park = new THREE.Group();
park.name = 'DreamNightPark';
scene.add(park);

/* --------------------------------------------------------------------------
   Sky, stars, moon
   -------------------------------------------------------------------------- */
const skyGroup = new THREE.Group();
scene.add(skyGroup);

const moonDirection = new THREE.Vector3(-0.75, 0.24, -0.62).normalize();
const skyUniforms = {
  uTime: { value: 0 },
  uMoonDir: { value: moonDirection.clone() },
  uTop: { value: new THREE.Color(0x160c38) },
  uMid: { value: new THREE.Color(0x4a2c6b) },
  uHorizon: { value: new THREE.Color(0xaa6693) },
  uNebula: { value: 1.0 },
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */`
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vWorld;
    uniform float uTime;
    uniform vec3 uMoonDir;
    uniform vec3 uTop;
    uniform vec3 uMid;
    uniform vec3 uHorizon;
    uniform float uNebula;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 d = normalize(vWorld);
      float y = d.y;
      float up = clamp(y, 0.0, 1.0);
      vec3 col = mix(uHorizon, uMid, smoothstep(-0.32, 0.16, y));
      col = mix(col, uTop, smoothstep(0.12, 0.88, up));

      // broad nebula veils, visible even in the backdrop below the horizon
      float neb = fbm(d.xz * 2.55 + vec2(d.y * 1.35, uTime * 0.0032));
      float neb2 = fbm(d.xz * 6.1 - vec2(d.y * 2.1, uTime * 0.0051));
      col += vec3(0.115, 0.042, 0.145) * pow(neb, 1.7) * 0.95 * uNebula;
      col += vec3(0.025, 0.052, 0.135) * pow(neb2, 2.2) * 0.8 * uNebula;
      col += vec3(0.065, 0.015, 0.083) * pow(fbm(d.xy * 3.4 + vec2(4.2, y * 2.0)), 2.0) * 0.7 * uNebula;

      // rose haze band behind the horizon
      float haze = exp(-pow((y + 0.12) * 2.7, 2.0));
      col += vec3(0.185, 0.062, 0.145) * haze * 0.34 * uNebula;

      // pearly lunar atmosphere
      float md = max(dot(d, uMoonDir), 0.0);
      col += vec3(0.44, 0.32, 0.46) * pow(md, 26.0) * 0.52 * uNebula;
      col += vec3(0.10, 0.11, 0.21) * pow(md, 5.0) * 0.2 * uNebula;

      // tiny solar dust / distant galaxy shimmer
      float dust = fbm(d.xz * 18.0 + d.y * 3.0);
      col += vec3(0.026, 0.022, 0.036) * smoothstep(0.62, 0.82, dust) * 0.8 * uNebula;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(210, 40, 24), skyMat);
skyDome.renderOrder = -100;
skyGroup.add(skyDome);

// Stars
const starCount = 2200;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
const starColor = new Float32Array(starCount * 3);
const starSize = new Float32Array(starCount);
const starPhase = new Float32Array(starCount);
const starPalette = [new THREE.Color(0xffeaf9), new THREE.Color(0xd4c3ff), new THREE.Color(0xffc7e5), new THREE.Color(0xc1e2ff), new THREE.Color(0xffe6b0)];
for (let i = 0; i < starCount; i++) {
  const theta = rand(0, TAU);
  const dirY = rand(-0.42, 1.0);
  const phi = Math.acos(dirY);
  const r = rand(128, 168);
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.cos(phi) + 4;
  starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  const col = pick(starPalette);
  const b = rand(0.65, 1.7);
  starColor[i * 3] = col.r * b;
  starColor[i * 3 + 1] = col.g * b;
  starColor[i * 3 + 2] = col.b * b;
  starSize[i] = R() > 0.88 ? rand(3.2, 5.6) : rand(0.65, 1.7);
  starPhase[i] = rand(0, TAU);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColor, 3));
starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
const starMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
  transparent: true,
  depthWrite: false,
  vertexColors: false,
  blending: THREE.AdditiveBlending,
  fog: false,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSize;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * (560.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = 0.48 + 0.52 * (0.5 + 0.5 * sin(uTime * 1.2 + aPhase * 5.0));
      vSize = aSize;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    varying float vSize;
    uniform float uOpacity;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float core = smoothstep(0.5, 0.02, d);
      float crossX = smoothstep(0.09, 0.0, abs(p.x)) * smoothstep(0.5, 0.0, abs(p.y));
      float crossY = smoothstep(0.09, 0.0, abs(p.y)) * smoothstep(0.5, 0.0, abs(p.x));
      float flare = (crossX + crossY) * smoothstep(2.5, 3.6, vSize) * 0.32;
      float alpha = (core + flare) * vAlpha * uOpacity;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(vColor * (1.0 + flare * 1.4), alpha);
    }
  `,
});
const stars = new THREE.Points(starGeo, starMat);
starMat.transparent = true;
skyGroup.add(stars);
assemble(stars, 0.9, 2.6, 'fade');

// A couple of distant nebula / cloud veils
function makeCloudTexture(seed) {
  const rr = mulberry32(seed);
  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) {
      const x = w * 0.14 + rr() * w * 0.72;
      const y = h * 0.25 + rr() * h * 0.5;
      const r = 24 + rr() * 84;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.035 + rr() * 0.065})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'destination-in';
    const maskX = ctx.createLinearGradient(0, 0, w, 0);
    maskX.addColorStop(0, 'rgba(255,255,255,0)');
    maskX.addColorStop(0.18, 'rgba(255,255,255,.85)');
    maskX.addColorStop(0.5, 'rgba(255,255,255,1)');
    maskX.addColorStop(0.82, 'rgba(255,255,255,.85)');
    maskX.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = maskX;
    ctx.fillRect(0, 0, w, h);
    const maskY = ctx.createLinearGradient(0, 0, 0, h);
    maskY.addColorStop(0, 'rgba(255,255,255,0)');
    maskY.addColorStop(0.22, 'rgba(255,255,255,.8)');
    maskY.addColorStop(0.5, 'rgba(255,255,255,1)');
    maskY.addColorStop(0.78, 'rgba(255,255,255,.8)');
    maskY.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = maskY;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
const cloudTexA = makeCloudTexture(5551);
const cloudTexB = makeCloudTexture(5552);
const cloudGroup = new THREE.Group();
skyGroup.add(cloudGroup);
for (let i = 0; i < 6; i++) {
  const mat = new THREE.SpriteMaterial({
    map: i % 2 ? cloudTexA : cloudTexB,
    color: i % 3 === 0 ? 0xd7a0de : 0x9c91dd,
    transparent: true,
    opacity: rand(0.22, 0.38),
    blending: THREE.NormalBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  const angle = rand(-2.4, 0.6);
  const r = rand(75, 105);
  s.position.set(Math.cos(angle) * r, rand(18, 38), Math.sin(angle) * r);
  s.scale.set(rand(30, 60), rand(9, 17), 1);
  s.material.rotation = rand(-0.2, 0.2);
  s.userData = { baseX: s.position.x, speed: rand(0.02, 0.06), phase: rand(0, TAU) };
  cloudGroup.add(s);
}
assemble(cloudGroup, 18.4, 3.0, 'fade');
// low veils drifting across the moon
for (const [x, y, z, sx, sy, op, col] of [
  [-52, 15.0, -33, 30, 8.5, 0.24, 0xf1b8db],
  [-41, 8.6, -31, 25, 6.5, 0.16, 0xb9a8ee],
  [-55, 21.5, -45, 36, 10, 0.13, 0xd9b9f2],
]) {
  const mat = new THREE.SpriteMaterial({
    map: cloudTexA, color: col, transparent: true, opacity: op,
    blending: THREE.NormalBlending, depthWrite: false, fog: false, toneMapped: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.position.set(x, y, z);
  sp.scale.set(sx, sy, 1);
  sp.userData = { baseX: x, speed: rand(0.015, 0.035), phase: rand(0, TAU) };
  cloudGroup.add(sp);
}

// Moon
const moonTex = canvasTexture(512, 512, (ctx, w, h) => {
  const rr = mulberry32(1077);
  const g = ctx.createRadialGradient(w * 0.38, h * 0.34, 8, w / 2, h / 2, w / 2);
  g.addColorStop(0, '#fff9ff');
  g.addColorStop(0.55, '#f6e4ff');
  g.addColorStop(0.86, '#dcc6ee');
  g.addColorStop(1, '#b49bd3');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 2, 0, TAU);
  ctx.fill();
  // softer maria / craters
  for (let i = 0; i < 36; i++) {
    const a = rr() * TAU;
    const rad = Math.sqrt(rr()) * w * 0.4;
    const x = w / 2 + Math.cos(a) * rad;
    const y = h / 2 + Math.sin(a) * rad;
    const r = 5 + rr() * 26;
    const dark = rr() > 0.35;
    const grd = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    grd.addColorStop(0, dark ? 'rgba(142,108,170,.26)' : 'rgba(255,247,255,.3)');
    grd.addColorStop(1, 'rgba(166,132,190,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 850; i++) {
    const a = rr() * TAU;
    const rad = Math.sqrt(rr()) * w * 0.48;
    const x = w / 2 + Math.cos(a) * rad;
    const y = h / 2 + Math.sin(a) * rad;
    ctx.fillStyle = `rgba(142,116,166,${rr() * 0.11})`;
    ctx.fillRect(x, y, 1 + rr() * 3, 1 + rr() * 3);
  }
  // edge shadow
  const edge = ctx.createRadialGradient(w / 2, h / 2, w * 0.34, w / 2, h / 2, w / 2);
  edge.addColorStop(0, 'rgba(30,22,32,0)');
  edge.addColorStop(0.9, 'rgba(30,22,32,.08)');
  edge.addColorStop(1, 'rgba(22,16,26,.3)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2, 0, TAU);
  ctx.fill();
});
const moonGroup = new THREE.Group();
const moonPos = new THREE.Vector3(-49, 12.5, -38);
moonGroup.position.copy(moonPos);
const moonGlow1 = new THREE.Sprite(new THREE.SpriteMaterial({
  map: softGlowTex, color: 0xbfa2ff, transparent: true, opacity: 0.18,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
}));
moonGlow1.scale.set(30, 30, 1);
moonGroup.add(moonGlow1);
const moonGlow2 = new THREE.Sprite(new THREE.SpriteMaterial({
  map: softGlowTex, color: 0xffd9ee, transparent: true, opacity: 0.18,
  blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
}));
moonGlow2.scale.set(12, 12, 1);
moonGroup.add(moonGlow2);
const moonMesh = new THREE.Mesh(
  new THREE.SphereGeometry(5.3, 40, 28),
  new THREE.MeshBasicMaterial({ map: moonTex, color: 0xe7d4f4, fog: false, toneMapped: true })
);
moonGroup.add(moonMesh);
// soft, stylised rays that make the moonlight feel volumetric
const moonRayTex = canvasTexture(768, 768, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rr = mulberry32(4207);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const angle = Math.PI * (0.18 + rr() * 0.64);
    const length = w * (0.22 + rr() * 0.25);
    const width = 5 + rr() * 22;
    const alpha = 0.03 + rr() * 0.055;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(w * 0.08, 0, length, 0);
    grad.addColorStop(0, `rgba(255,214,241,0)`);
    grad.addColorStop(0.18, `rgba(233,205,255,${alpha})`);
    grad.addColorStop(0.72, `rgba(184,205,255,${alpha * 0.62})`);
    grad.addColorStop(1, 'rgba(216,173,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(w * 0.07, -width * 0.22);
    ctx.lineTo(length, -width);
    ctx.lineTo(length, width);
    ctx.lineTo(w * 0.07, width * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
});
const moonRays = new THREE.Sprite(new THREE.SpriteMaterial({
  map: moonRayTex,
  color: 0xe0c4ff,
  transparent: true,
  opacity: 0.72,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
  toneMapped: false,
}));
moonRays.scale.set(64, 64, 1);
moonRays.material.rotation = -0.12;
moonGroup.add(moonRays);
assemble(moonGroup, 17.1, 2.3, 'rise', { offset: -18 });
skyGroup.add(moonGroup);

// a dark, soft moon halo on the ground of the sky
const skyHalo = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshBasicMaterial({
    map: softGlowTex, color: 0x5b356b, transparent: true, opacity: 0.17,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  })
);
skyHalo.position.copy(moonPos).multiplyScalar(0.92);
skyHalo.lookAt(0, 0, 0);
skyGroup.add(skyHalo);
assemble(skyHalo, 17.1, 2.3, 'fade');

/* --------------------------------------------------------------------------
   Lighting
   -------------------------------------------------------------------------- */
const hemi = new THREE.HemisphereLight(0xb6a4ff, 0x2a1b3e, 1.02);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0xffdff4, 2.15);
moonLight.position.set(-31, 37, -11);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -27;
moonLight.shadow.camera.right = 27;
moonLight.shadow.camera.top = 30;
moonLight.shadow.camera.bottom = -27;
moonLight.shadow.camera.near = 1;
moonLight.shadow.camera.far = 90;
moonLight.shadow.bias = -0.0006;
moonLight.shadow.normalBias = 0.035;
moonLight.target.position.set(0, 0, 0);
scene.add(moonLight, moonLight.target);

const warmFill = new THREE.DirectionalLight(0xffb9db, 0.35);
warmFill.position.set(26, 16, 26);
warmFill.castShadow = false;
warmFill.target.position.set(0, 2, 0);
scene.add(warmFill, warmFill.target);

const rimLight = new THREE.DirectionalLight(0x9bc9ff, 0.9);
rimLight.position.set(12, 20, -34);
rimLight.castShadow = false;
scene.add(rimLight);

const accentLights = [];
function addAccentLight(color, intensity, distance, x, y, z, flicker = 0) {
  const light = new THREE.PointLight(color, 0, distance, 1.6);
  light.position.set(x, y, z);
  light.userData.baseIntensity = intensity;
  light.userData.flicker = flicker;
  light.userData.phase = rand(0, TAU);
  scene.add(light);
  accentLights.push(light);
  return light;
}

/* --------------------------------------------------------------------------
   Park base and terrain
   -------------------------------------------------------------------------- */
assemblyPhase = 'ground';
const baseGroup = new THREE.Group();
park.add(baseGroup);

const baseStone = toonMat(0x564778);
const baseStoneDark = toonMat(0x392d59);
const baseStoneLight = toonMat(0x806fa6);
const brassMat = toonMat(0xc49755, { emissive: 0x3a240c, emissiveIntensity: 0.4 });
const brassBright = toonMat(0xe3b973, { emissive: 0x5c3a12, emissiveIntensity: 0.55 });

const plinthBottom = addBox(baseGroup, 42.0, 1.0, 42.0, baseStoneDark, 0, -1.75, 0);
const plinthMid = addBox(baseGroup, 41.3, 0.72, 41.3, baseStone, 0, -0.89, 0);
const plinthTop = addBox(baseGroup, 40.45, 0.34, 40.45, baseStoneLight, 0, -0.36, 0);
assemble(plinthBottom, 0.05, 0.75, 'grow');
assemble(plinthMid, 0.22, 0.8, 'grow');
assemble(plinthTop, 0.42, 0.85, 'grow');

// brass trim around the base
const trimGroup = new THREE.Group();
baseGroup.add(trimGroup);
for (const side of [-1, 1]) {
  addBox(trimGroup, 41.38, 0.09, 0.23, brassMat, 0, -0.55, side * 20.66, { castShadow: false });
  addBox(trimGroup, 0.23, 0.09, 41.38, brassMat, side * 20.66, -0.55, 0, { castShadow: false });
  addBox(trimGroup, 40.5, 0.055, 0.32, brassMat, 0, -0.16, side * 20.24, { castShadow: false });
  addBox(trimGroup, 0.32, 0.055, 40.5, brassMat, side * 20.24, -0.16, 0, { castShadow: false });
}
// base corner ornaments
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) {
    addBox(trimGroup, 0.42, 1.5, 0.42, brassMat, sx * 20.42, -0.8, sz * 20.42);
    addSphere(trimGroup, 0.33, brassBright, sx * 20.42, 0.02, sz * 20.42, { wSeg: 12, hSeg: 8 });
    addCone(trimGroup, 0.35, 0.65, 4, brassMat, sx * 20.42, 0.55, sz * 20.42, { rotY: Math.PI / 4 });
  }
}
// base side pilasters and recessed gothic panels
const baseDetail = new THREE.Group();
baseGroup.add(baseDetail);
const basePanelMat = toonMat(0x2b2740);
for (const side of [-1, 1]) {
  for (let i = -3; i <= 3; i++) {
    const x = i * 5.2;
    addBox(baseDetail, 0.38, 0.7, 0.16, basePanelMat, x, -0.95, side * 20.67, { castShadow: false });
    addBox(baseDetail, 0.05, 0.5, 0.18, brassMat, x - 0.14, -0.94, side * 20.7, { castShadow: false });
    addBox(baseDetail, 0.05, 0.5, 0.18, brassMat, x + 0.14, -0.94, side * 20.7, { castShadow: false });
    addBox(baseDetail, 0.3, 0.06, 0.18, brassMat, x, -0.63, side * 20.71, { castShadow: false });
  }
}
for (const side of [-1, 1]) {
  for (let i = -3; i <= 3; i++) {
    const z = i * 5.2;
    addBox(baseDetail, 0.16, 0.7, 0.38, basePanelMat, side * 20.67, -0.95, z, { castShadow: false });
    addBox(baseDetail, 0.18, 0.5, 0.05, brassMat, side * 20.7, -0.94, z - 0.14, { castShadow: false });
    addBox(baseDetail, 0.18, 0.5, 0.05, brassMat, side * 20.7, -0.94, z + 0.14, { castShadow: false });
    addBox(baseDetail, 0.18, 0.06, 0.3, brassMat, side * 20.71, -0.63, z, { castShadow: false });
  }
}
assemble(baseDetail, 0.65, 0.9, 'fade');

// front plaque
const plaqueTex = canvasTexture(1024, 180, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const grd = ctx.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, '#8b6230');
  grd.addColorStop(0.16, '#e6bc76');
  grd.addColorStop(0.5, '#fff0bb');
  grd.addColorStop(0.84, '#e6bc76');
  grd.addColorStop(1, '#8b6230');
  ctx.fillStyle = 'rgba(20,14,30,.92)';
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 16);
  ctx.fill();
  ctx.strokeStyle = grd;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,188,118,.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(18, 18, w - 36, h - 36, 12);
  ctx.stroke();
  ctx.font = '700 74px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = grd;
  ctx.shadowColor = 'rgba(255,171,74,.64)';
  ctx.shadowBlur = 18;
  ctx.fillText('DREAM NIGHT', w / 2, h / 2 - 3);
  ctx.shadowBlur = 0;
  ctx.font = '500 21px Georgia, serif';
  ctx.fillStyle = '#c9a56d';
  ctx.fillText('A LITTLE WORLD OF WONDER  ·  WHERE WISHES BLOOM', w / 2, h - 32);
});
const plaque = addBox(baseGroup, 11.6, 1.72, 0.12, brassMat, 0, -0.82, 20.77, { castShadow: false });
const plaqueFace = addPlane(baseGroup, 11.0, 1.45, basicMat(0xffffff, { map: plaqueTex, transparent: true, toneMapped: false }), 0, -0.82, 20.84, { rotY: 0 });
assemble(plaque, 0.85, 0.8, 'grow');
assemble(plaqueFace, 0.95, 0.8, 'grow');

// terrain surface
const terrainMat = toonMat(0xc9bfe0, { map: groundTex });
const terrain = addBox(park, 40.0, 0.18, 40.0, terrainMat, 0, -0.06, 0, { castShadow: false, receiveShadow: true });
// The box top is at y=0.03. The sides are mostly hidden by the plinth.
assemble(terrain, 0.42, 1.1, 'fade');

const groundShade = addPlane(
  park, 40, 40,
  basicMat(0x1a2730, { map: groundTex, transparent: true, opacity: 0.22, toneMapped: false, depthWrite: false }),
  0, 0.036, 0, { rotX: -Math.PI / 2, receiveShadow: true }
);
assemble(groundShade, 0.45, 1.0, 'fade');

// hidden little place for an invisible plinth under the castle island
/* --------------------------------------------------------------------------
   Pathways
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const pathGroup = new THREE.Group();
park.add(pathGroup);

const curbMat = toonMat(0x8a74a5);
const pathMat = toonMat(0xe6d9f3, { map: cobbleTex });
const plazaMat = toonMat(0xeadcf6, { map: cobbleTex.clone() });
plazaMat.map.wrapS = plazaMat.map.wrapT = THREE.RepeatWrapping;
plazaMat.map.repeat.set(4, 4);
plazaMat.map.needsUpdate = true;

function ribbonGeometry(points, width, y = 0.075, segments = 96) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.35
  );
  const positions = [];
  const uvs = [];
  const indices = [];
  let dist = 0;
  let prev = null;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    if (prev) dist += p.distanceTo(prev);
    prev = p.clone();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const l = p.clone().addScaledVector(side, width / 2);
    const r = p.clone().addScaledVector(side, -width / 2);
    positions.push(l.x, y, l.z, r.x, y, r.z);
    const v = dist / 2.3;
    uvs.push(0, v, 1, v);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, length: dist };
}

function addPath(points, width, start, opts = {}) {
  const group = new THREE.Group();
  pathGroup.add(group);
  const border = new THREE.Mesh(
    ribbonGeometry(points, width + 0.38, 0.055, opts.segments || 96).geo,
    curbMat
  );
  border.receiveShadow = true;
  border.castShadow = false;
  group.add(border);
  const surface = new THREE.Mesh(
    ribbonGeometry(points, width, 0.082, opts.segments || 96).geo,
    opts.material || pathMat
  );
  surface.receiveShadow = true;
  group.add(surface);
  assemble(border, start, opts.duration || 0.85, 'pathReveal');
  assemble(surface, start + 0.12, opts.duration || 0.85, 'pathReveal');
  return group;
}

// Boulevard from the entrance gate to the central roundabout
addPath([[0, 19.9], [0, 18.3], [0, 16.4], [0, 14.2]], 3.8, 1.45, { duration: 1.25 });
// Castle terrace / forecourt
const forecourtGroup = new THREE.Group();
pathGroup.add(forecourtGroup);
const terraceBorder = addBox(forecourtGroup, 11.9, 0.09, 4.55, curbMat, 0, 0.055, 4.55, { castShadow: false });
const terrace = addBox(forecourtGroup, 11.45, 0.06, 4.15, plazaMat, 0, 0.085, 4.55, { castShadow: false, receiveShadow: true });
assemble(terraceBorder, 1.9, 0.75, 'scaleXZ');
assemble(terrace, 2.02, 0.75, 'scaleXZ');
// Roundabout
const roundaboutGroup = new THREE.Group();
pathGroup.add(roundaboutGroup);
const roundBorder = addCyl(roundaboutGroup, 4.2, 4.2, 0.09, 64, curbMat, 0, 0.055, 10.2, { castShadow: false });
const roundPlaza = addCyl(roundaboutGroup, 3.98, 3.98, 0.055, 64, plazaMat, 0, 0.09, 10.2, { castShadow: false });
assemble(roundBorder, 2.2, 0.85, 'scaleXZ');
assemble(roundPlaza, 2.3, 0.85, 'scaleXZ');

// Side promenades
addPath([[-4.15, 11.35], [-6.2, 12.8], [-9.8, 14.4], [-13.7, 13.4], [-15.9, 10.5], [-16.4, 6.4], [-15.7, 2.9], [-14.7, 1.35]], 2.35, 3.4, { duration: 1.1 });
addPath([[4.15, 11.75], [7.1, 12.25], [10.3, 11.65], [12.95, 9.7], [13.95, 6.7], [13.85, 2.8], [13.25, -1.1], [12.7, -4.6], [12.35, -6.85]], 2.35, 3.55, { duration: 1.2 });
// spurs
addPath([[-4.2, 10.65], [-4.55, 9.6], [-4.9, 8.3]], 2.05, 4.35, { duration: 0.65 });
addPath([[7.1, 12.25], [6.65, 10.35], [6.9, 8.8]], 1.9, 4.5, { duration: 0.65 });
addPath([[-13.7, 13.4], [-14.25, 13.55], [-14.7, 13.8]], 1.8, 4.65, { duration: 0.65 });
addPath([[12.95, 9.7], [14.35, 10.2], [15.1, 10.9]], 1.6, 4.75, { duration: 0.55 });
addPath([[-13.7, 13.4], [-12.25, 12.15], [-11.6, 11.4]], 1.6, 4.8, { duration: 0.55 });

// A small queue / entry pad near the ticket booth
addPath([[2.45, 17.45], [2.85, 16.55], [2.5, 15.65]], 1.5, 4.95, { duration: 0.55 });

/* --------------------------------------------------------------------------
   Moat, island and bridge
   -------------------------------------------------------------------------- */
assemblyPhase = 'ground';
const moatGroup = new THREE.Group();
park.add(moatGroup);

const islandTopMat = toonMat(0x3a354d, { map: stoneDarkTex });
const island = addBox(moatGroup, 11.75, 0.42, 11.75, islandTopMat, 0, 0.12, -4.5, { castShadow: false, receiveShadow: true });
assemble(island, 3.2, 0.8, 'rise', { offset: -1.7 });

// stone kerb around the island
const kerbMat = toonMat(0x67627b);
for (const side of [-1, 1]) {
  addBox(moatGroup, 12.05, 0.18, 0.32, kerbMat, 0, 0.36, -4.5 + side * 5.88, { castShadow: false });
  addBox(moatGroup, 0.32, 0.18, 12.05, kerbMat, side * 5.88, 0.36, -4.5, { castShadow: false });
}

// water surface built from four quads
function quadGeo(x1, z1, x2, z2, y) {
  const g = new THREE.BufferGeometry();
  const p = [
    x1, y, z1,
    x2, y, z1,
    x2, y, z2,
    x1, y, z2,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}
const waterGeos = [
  quadGeo(-7.3, -11.8, 7.3, -10.4, -0.06),
  quadGeo(-7.3, 1.4, 7.3, 2.8, -0.06),
  quadGeo(-7.3, -10.4, -5.9, 1.4, -0.06),
  quadGeo(5.9, -10.4, 7.3, 1.4, -0.06),
];
const waterGeo = mergeGeometries(waterGeos);
const waterUniforms = {
  uTime: { value: 0 },
  uDeep: { value: new THREE.Color(0x18204a) },
  uShallow: { value: new THREE.Color(0x5c3a7a) },
  uSparkle: { value: new THREE.Color(0x9e75c7) },
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */`
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vWorld;
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uSparkle;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main() {
      vec2 p = vWorld.xz * 1.2;
      float ripple = sin(p.x*2.2 + uTime*0.8) * 0.5 + sin(p.y*2.7 - uTime*0.62) * 0.5;
      ripple += sin((p.x+p.y)*1.35 + uTime*0.45) * 0.35;
      float sparkle = pow(max(0.0, sin(p.y*7.0 + uTime*0.9) * sin(p.x*5.0 - uTime*0.6)), 14.0);
      vec3 col = mix(uDeep, uShallow, 0.45 + ripple * 0.1);
      col += uSparkle * sparkle * 0.6;
      gl_FragColor = vec4(col, 0.92);
    }
  `,
});
const moatWater = new THREE.Mesh(waterGeo, waterMat);
moatWater.renderOrder = 1;
moatGroup.add(moatWater);
assemble(moatWater, 3.35, 1.0, 'rise', { offset: -0.35 });

// soft colour blooms on the water — a painterly stand-in for light reflections
const moatGlowRoot = new THREE.Group();
moatGroup.add(moatGlowRoot);
const reflectionPlane = (x, z, sx, sz, color, opacity) => {
  const mat = new THREE.MeshBasicMaterial({
    map: softGlowTex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, -0.035, z);
  mesh.renderOrder = 2;
  moatGlowRoot.add(mesh);
};
reflectionPlane(3.8, -2.8, 3.4, 1.25, 0xffae64, 0.2);
reflectionPlane(-4.6, -7.1, 2.6, 1.0, 0x8d8cff, 0.17);
reflectionPlane(1.8, 2.1, 2.2, 0.8, 0x9dffe5, 0.12);
assemble(moatGlowRoot, 4.0, 0.9, 'fade');

// outer and inner moat walls
const moatWallMat = toonMat(0x3a354b, { map: stoneDarkTex });
const wallH = 0.52;
for (const side of [-1, 1]) {
  const zOuter = -4.5 + side * 7.3;
  const zInner = -4.5 + side * 5.9;
  addBox(moatGroup, 14.6, wallH, 0.34, moatWallMat, 0, -0.12, zOuter, { receiveShadow: true });
  addBox(moatGroup, 11.8, wallH, 0.28, moatWallMat, 0, -0.04, zInner, { receiveShadow: true });
  const xOuter = side * 7.3;
  const xInner = side * 5.9;
  addBox(moatGroup, 0.34, wallH, 11.4, moatWallMat, xOuter, -0.12, -4.5, { receiveShadow: true });
  addBox(moatGroup, 0.28, wallH, 11.8, moatWallMat, xInner, -0.04, -4.5, { receiveShadow: true });
}
// little rocks around the moat
const rockMat = toonMat(0x4c475e);
for (let i = 0; i < 16; i++) {
  const t = i / 16 * TAU;
  const x = Math.cos(t) * rand(6.2, 7.0);
  const z = -4.5 + Math.sin(t) * rand(6.2, 7.0);
  const rock = addSphere(moatGroup, rand(0.14, 0.3), rockMat, x, rand(-0.05, 0.12), z, {
    wSeg: 7, hSeg: 5, sx: rand(1.1, 1.8), sy: rand(0.45, 0.8), sz: rand(0.8, 1.4), castShadow: false,
  });
  rock.rotation.y = rand(0, TAU);
}
const padMat = toonMat(0x2d5e4d, { emissive: 0x0d241b, emissiveIntensity: 0.3 });
for (let i = 0; i < 9; i++) {
  const t = rand(0, TAU);
  const rr = rand(6.3, 6.9);
  addCyl(moatGroup, rand(0.14, 0.25), rand(0.14, 0.25), 0.015, 12, padMat, Math.cos(t) * rr, -0.035, -4.5 + Math.sin(t) * rr, { castShadow: false });
}

// bridge
assemblyPhase = 'roads';
const bridgeGroup = new THREE.Group();
moatGroup.add(bridgeGroup);
const bridgeWood = toonMat(0x5a4340);
const bridgeWoodDark = toonMat(0x3b2c31);
const bridgeStone = toonMat(0x6a647c);
const bridgeZStart = 1.62;
const bridgeZEnd = 3.5;
for (let i = 0; i < 11; i++) {
  const t = i / 10;
  const z = lerp(bridgeZStart, bridgeZEnd, t);
  const y = 0.28 + Math.sin(t * Math.PI) * 0.12;
  addBox(bridgeGroup, 2.65, 0.11, 0.22, i % 2 ? bridgeWood : bridgeWoodDark, 0, y, z, { castShadow: false });
}
for (const sx of [-1, 1]) {
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const z = lerp(bridgeZStart - 0.12, bridgeZEnd + 0.1, t);
    const y0 = 0.29 + Math.sin(t * Math.PI) * 0.12;
    addBox(bridgeGroup, 0.12, 0.55, 0.12, bridgeStone, sx * 1.26, y0 + 0.27, z, { castShadow: false });
    addSphere(bridgeGroup, 0.1, brassMat, sx * 1.26, y0 + 0.56, z, { wSeg: 8, hSeg: 6, castShadow: false });
  }
  addBox(bridgeGroup, 0.14, 0.08, 1.95, brassMat, sx * 1.26, 0.94, 2.56, { castShadow: false });
}
for (const bz of [bridgeZStart - 0.3, bridgeZEnd + 0.25]) {
  for (const sx of [-1, 1]) {
    addCyl(bridgeGroup, 0.08, 0.13, 0.95, 8, brassMat, sx * 1.55, 0.66, bz, { castShadow: false });
    addBox(bridgeGroup, 0.34, 0.42, 0.34, basicMat(0xffc66a, { toneMapped: false }), sx * 1.55, 1.22, bz, { castShadow: false });
    addCone(bridgeGroup, 0.26, 0.28, 4, brassBright, sx * 1.55, 1.57, bz, { castShadow: false, rotY: Math.PI / 4 });
    addGlow(bridgeGroup, 0xffb45e, 1.4, sx * 1.55, 1.2, bz, 0.4);
  }
}
assembleDrop(bridgeGroup, 4.05, 0.8);

for (const p of [[-6.6, 1.0], [6.5, -1.8], [-6.5, -7.4], [6.4, -8.6]]) {
  addSphere(moatGroup, 0.09, basicMat(0xffc985, { toneMapped: false }), p[0], 0.12, p[1], { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(moatGroup, 0xffb454, 0.85, p[0], 0.24, p[1], 0.4);
}

/* --------------------------------------------------------------------------
   Gothic castle
   -------------------------------------------------------------------------- */
assemblyPhase = 'castle';
const castle = new THREE.Group();
castle.position.set(0, 0.18, -4.0);
park.add(castle);
const castleDetails = new THREE.Group();
castle.add(castleDetails);

const castleStone = toonMat(0xf0e8ff, { map: stoneTex });
const castleStoneDim = toonMat(0xd8caef, { map: stoneTex });
const castleStoneDark = toonMat(0xbcaadc, { map: stoneDarkTex });
const castleTrim = toonMat(0xfff0d2);
const castleRoof = toonMat(0xffe4f4, { map: roofTex, emissive: 0x5b294f, emissiveIntensity: 0.32 });
const castleRoofDark = toonMat(0xa9d6ff, { map: roofTex, emissive: 0x23435e, emissiveIntensity: 0.28 });
const castleGold = toonMat(0xf1c878, { emissive: 0x5a3b12, emissiveIntensity: 0.55 });
const ridgeRibMat = toonMat(0xf8d58f);

function gothicRoof(parent, radius, height, x, y, z, material = castleRoof, sides = 8) {
  const roof = addCone(parent, radius, height, sides, material, x, y + height / 2, z, { castShadow: true, rotY: Math.PI / sides });
  for (let i = 0; i < sides; i += 2) {
    const a = (i / sides) * TAU;
    const rib = addCyl(parent, 0.035, 0.045, height * 0.97, 5, ridgeRibMat,
      x + Math.cos(a) * radius * 0.24, y + height * 0.5, z + Math.sin(a) * radius * 0.24,
      { castShadow: false });
    rib.rotation.z = Math.cos(a) * 0.42;
    rib.rotation.x = -Math.sin(a) * 0.42;
  }
  return roof;
}

function crenellations(parent, width, depth, y, x = 0, z = 0, mat = castleStone, size = 0.38) {
  const countX = Math.max(2, Math.floor(width / 0.85));
  const countZ = Math.max(2, Math.floor(depth / 0.85));
  for (let i = 0; i < countX; i++) {
    const px = x - width / 2 + 0.4 + (i / (countX - 1)) * (width - 0.8);
    addBox(parent, size, size * 1.1, 0.28, mat, px, y + size * 0.5, z - depth / 2, { castShadow: false });
    addBox(parent, size, size * 1.1, 0.28, mat, px, y + size * 0.5, z + depth / 2, { castShadow: false });
  }
  for (let i = 1; i < countZ - 1; i++) {
    const pz = z - depth / 2 + 0.4 + (i / (countZ - 1)) * (depth - 0.8);
    addBox(parent, 0.28, size * 1.1, size, mat, x - width / 2, y + size * 0.5, pz, { castShadow: false });
    addBox(parent, 0.28, size * 1.1, size, mat, x + width / 2, y + size * 0.5, pz, { castShadow: false });
  }
}

// Foundation platform / island keep base
const castleFoundation = new THREE.Group();
castle.add(castleFoundation);
addBox(castleFoundation, 10.3, 0.35, 7.7, castleStoneDark, 0, 0.24, -0.85, { receiveShadow: true });
addBox(castleFoundation, 11.0, 0.22, 8.35, castleStoneDim, 0, 0.1, -0.85, { receiveShadow: true });
for (let i = 0; i < 3; i++) {
  addBox(castleFoundation, 2.9 - i * 0.3, 0.13, 0.38, castleStone, 0, 0.12 + i * 0.12, 4.25 + i * 0.34, { receiveShadow: true });
}
assemble(castleFoundation, 4.2, 0.9, 'rise', { offset: -1.1 });

// main keep
const keepGroup = new THREE.Group();
castle.add(keepGroup);
const keepW = 8.0, keepD = 5.2, keepH = 6.8;
const keep = addBox(keepGroup, keepW, keepH, keepD, castleStone, 0, 0.42 + keepH / 2, -2.0);
addOutline(keep, 1.015);
for (let i = 0; i < 3; i++) {
  addBox(keepGroup, keepW + 0.16, 0.13, keepD + 0.16, castleStoneDim, 0, 1.55 + i * 1.85, -2.0, { castShadow: false });
}
for (const sx of [-1, 1]) {
  for (const x of [sx * 3.25, sx * 2.7]) {
    addBox(keepGroup, 0.32, 6.2, 0.28, castleStoneDim, x, 3.5, 0.63, { castShadow: false });
    addBox(keepGroup, 0.42, 0.18, 0.38, castleTrim, x, 1.0, 0.63, { castShadow: false });
  }
}
crenellations(keepGroup, keepW, keepD, 7.25, 0, -2.0, castleStone, 0.4);
const keepRoof = addCyl(keepGroup, 0, 3.2, 3.2, 4, castleRoofDark, 0, 9.05, -2.0, { rotY: Math.PI / 4, castShadow: true });
keepRoof.scale.set(1.25, 1, 0.77);
addBox(keepGroup, 0.13, 5.2, 0.13, castleGold, 0, 10.4, -2.0, { castShadow: false });
addSphere(keepGroup, 0.14, brassBright, 0, 11.0, -2.0, { wSeg: 8, hSeg: 6, castShadow: false });
for (const x of [-2.5, 2.45]) {
  addCyl(keepGroup, 0.28, 0.36, 2.5, 8, castleStoneDim, x, 9.0, -3.25, { castShadow: false });
  gothicRoof(keepGroup, 0.55, 1.6, x, 10.25, -3.25, castleRoof, 8);
}
assemble(keepGroup, 4.75, 1.6, 'scaleY');

// back turrets
for (const sx of [-1, 1]) {
  const turret = new THREE.Group();
  castle.add(turret);
  turret.position.set(sx * 4.55, 0, -6.0);
  addCyl(turret, 0.78, 0.9, 7.4, 12, castleStone, 0, 4.15, 0);
  for (let i = 0; i < 4; i++) {
    addBox(turret, 0.65, 0.16, 0.65, castleStoneDim, Math.cos(i / 4 * TAU) * 0.93, 7.9 + (i % 2) * 0.26, Math.sin(i / 4 * TAU) * 0.93, { castShadow: false });
  }
  gothicRoof(turret, 1.2, 3.6, 0, 8.2, 0, castleRoof, 10);
  addCyl(turret, 0.035, 0.035, 1.2, 5, castleGold, 0, 12.35, 0, { castShadow: false });
  addGlow(turret, 0xffb062, 2.0, 0, 5.8, 0.7, 0.18);
  assemble(turret, 5.2 + (sx + 1) * 0.22, 1.3, 'rise', { offset: -5.5, spin: sx * 0.18 });
}

// gatehouse central mass
const gatehouse = new THREE.Group();
castle.add(gatehouse);
const gateW = 7.1, gateH = 4.6, gateD = 3.0;
addBox(gatehouse, gateW, gateH, gateD, castleStone, 0, 0.42 + gateH / 2, 2.85);
crenellations(gatehouse, gateW, gateD, 4.45, 0, 2.85, castleStone, 0.32);
for (const x of [-3.0, -2.25, 2.25, 3.0]) {
  addBox(gatehouse, 0.3, gateH * 0.8, 0.26, castleStoneDim, x, 2.4, 4.38, { castShadow: false });
  addCone(gatehouse, 0.28, 1.15, 6, castleStoneDim, x, 6.1, 4.38, { castShadow: false, rotY: Math.PI / 6 });
}
for (const x of [-2.65, 2.65]) {
  addBox(gatehouse, 0.42, 0.6, 0.4, castleStoneDim, x, 5.1, 4.25, { castShadow: false });
  addCone(gatehouse, 0.19, 0.75, 5, castleGold, x, 5.8, 4.25, { castShadow: false });
}
assemble(gatehouse, 5.45, 1.4, 'scaleY');

// front corner towers (round)
for (const sx of [-1, 1]) {
  const tower = new THREE.Group();
  castle.add(tower);
  tower.position.set(sx * 4.35, 0, 2.85);
  addCyl(tower, 1.05, 1.28, 8.3, 12, castleStone, 0, 4.55, 0);
  for (let i = 0; i < 3; i++) {
    addCyl(tower, 1.23 - i * 0.03, 1.28 - i * 0.03, 0.15, 12, castleStoneDim, 0, 1.5 + i * 2.25, 0, { castShadow: false });
  }
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    addBox(tower, 0.32, 0.44, 0.5, castleStoneDim, Math.cos(a) * 1.03, 8.7, Math.sin(a) * 1.03, { rotY: -a, castShadow: false });
  }
  addCyl(tower, 1.32, 1.32, 0.28, 12, castleStoneDim, 0, 8.85, 0, { castShadow: false });
  gothicRoof(tower, 1.42, 4.25, 0, 9.0, 0, castleRoof, 12);
  addCyl(tower, 0.035, 0.035, 1.1, 5, castleGold, 0, 13.65, 0, { castShadow: false });
  addSphere(tower, 0.14, brassBright, 0, 14.22, 0, { wSeg: 8, hSeg: 6, castShadow: false });
  assemble(tower, 5.75 + (sx + 1) * 0.25, 1.5, 'rise', { offset: -7.2, spin: sx * 0.22 });
}

// central clock tower: stone shaft, belfry, spire
assemblyPhase = 'clock';
const clockTower = new THREE.Group();
castle.add(clockTower);
const towerBaseY = 0.42;
const shaftH = 9.4;
const shaft = addBox(clockTower, 3.2, shaftH, 3.0, castleStone, 0, towerBaseY + shaftH / 2, 2.6);
addOutline(shaft, 1.018);
addBox(clockTower, 3.5, 0.22, 3.3, castleStoneDim, 0, towerBaseY + shaftH - 0.12, 2.6, { castShadow: false });
for (const x of [-1.42, 1.42]) {
  addBox(clockTower, 0.34, shaftH - 0.7, 0.32, castleStoneDim, x, towerBaseY + shaftH / 2, 4.02, { castShadow: false });
  addCone(clockTower, 0.25, 1.0, 5, castleStoneDim, x, towerBaseY + shaftH + 0.35, 4.02, { castShadow: false, rotY: Math.PI / 5 });
}
addBox(clockTower, 3.0, 0.2, 0.28, castleTrim, 0, towerBaseY + 3.1, 4.05, { castShadow: false });
addBox(clockTower, 3.0, 0.2, 0.28, castleTrim, 0, towerBaseY + 6.15, 4.05, { castShadow: false });
assemble(clockTower, 6.0, 1.8, 'scaleY', { spin: 0.06 });

// belfry
const belfry = new THREE.Group();
castle.add(belfry);
addBox(belfry, 4.25, 2.7, 4.0, castleStone, 0, 11.25, 2.6);
crenellations(belfry, 4.25, 4.0, 12.55, 0, 2.6, castleStoneDim, 0.34);
for (const side of [-1, 1]) {
  addBox(belfry, 0.46, 2.2, 0.28, castleStoneDim, side * 1.2, 11.2, 4.6, { castShadow: false });
  addBox(belfry, 0.46, 2.2, 0.28, castleStoneDim, side * 1.2, 11.2, 0.6, { castShadow: false });
}

// window texture for warm openings
const archTexWarm = canvasTexture(256, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const outline = (pad) => {
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, h * 0.42);
    ctx.quadraticCurveTo(w / 2, h * 0.06, w - pad, h * 0.42);
    ctx.lineTo(w - pad, h - pad);
    ctx.closePath();
  };
  ctx.fillStyle = '#4b455e';
  outline(8);
  ctx.fill();
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#ffdd9a');
  grd.addColorStop(0.5, '#ff9e3d');
  grd.addColorStop(1, '#5d2037');
  ctx.fillStyle = grd;
  outline(34);
  ctx.fill();
  ctx.strokeStyle = 'rgba(23,17,37,.85)';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.12);
  ctx.lineTo(w / 2, h - 40);
  ctx.moveTo(38, h * 0.65);
  ctx.lineTo(w - 38, h * 0.65);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,245,219,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
});
const castleWindows = [];
function addWindowPlane(parent, texture, w, h, x, y, z, rotY = 0, opacity = 1) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, toneMapped: false,
    side: THREE.DoubleSide, opacity, depthWrite: false,
  });
  const plane = addPlane(parent, w, h, mat, x, y, z, { rotY });
  plane.castShadow = false;
  castleWindows.push(plane);
  return plane;
}
for (const x of [-0.78, 0.78]) {
  addWindowPlane(belfry, archTexWarm, 0.7, 1.7, x, 11.3, 0.58, Math.PI);
}
for (const side of [-1, 1]) {
  addWindowPlane(belfry, archTexWarm, 0.7, 1.7, side * 2.13, 11.3, 2.6, side * Math.PI / 2);
}
addCyl(belfry, 0.32, 0.58, 0.72, 10, castleGold, 0, 10.9, 3.55, { castShadow: false });
assemble(belfry, 7.7, 1.25, 'drop', { offset: 4.5, spin: 0.08 });

// spire
const spireGroup = new THREE.Group();
castle.add(spireGroup);
gothicRoof(spireGroup, 2.5, 5.2, 0, 12.6, 2.6, castleRoof, 10);
addCyl(spireGroup, 0.06, 0.06, 2.0, 6, castleGold, 0, 18.25, 2.6, { castShadow: false });
addSphere(spireGroup, 0.23, brassBright, 0, 19.28, 2.6, { wSeg: 10, hSeg: 8, castShadow: false });
const flag = addPlane(spireGroup, 1.35, 0.7, basicMat(0xae5c8d, { side: THREE.DoubleSide, toneMapped: false }), 0.7, 18.92, 2.6);
flag.rotation.y = 0.12;
addPlane(spireGroup, 0.4, 0.4, basicMat(0xffb661, { toneMapped: false, side: THREE.DoubleSide }), 0.73, 18.92, 2.61, { rotY: 0.12 });

// gilded collar and crockets make the main spire read as carved stonework
const spireCollar = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.055, 6, 48), castleGold);
spireCollar.rotation.x = Math.PI / 2;
spireCollar.position.set(0, 12.66, 2.6);
spireCollar.castShadow = false;
spireGroup.add(spireCollar);
for (let level = 0; level < 4; level++) {
  const y = 13.5 + level * 0.93;
  const radius = 2.5 * (1 - (y - 12.6) / 5.2) + 0.06;
  for (let side = 0; side < 4; side++) {
    const a = side / 4 * TAU;
    const crocket = addCone(spireGroup, 0.075, 0.28, 4, castleGold,
      Math.cos(a) * radius, y, 2.6 + Math.sin(a) * radius, { castShadow: false });
    crocket.rotation.z = -Math.cos(a) * 0.55;
    crocket.rotation.x = Math.sin(a) * 0.55;
  }
}
assemble(spireGroup, 8.6, 1.5, 'drop', { offset: 7, spin: 0.12 });

// slender corner pinnacles frame the keep roof and enrich the skyline
assemblyPhase = 'castle';
const castlePinnacles = new THREE.Group();
castle.add(castlePinnacles);
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const x = sx * 3.52;
  const z = -2.0 + sz * 2.05;
  addBox(castlePinnacles, 0.56, 0.42, 0.56, castleStoneDim, x, 7.42, z, { castShadow: false });
  addCyl(castlePinnacles, 0.2, 0.3, 0.98, 6, castleStone, x, 8.12, z);
  addCyl(castlePinnacles, 0.36, 0.36, 0.1, 6, castleGold, x, 8.66, z, { castShadow: false });
  gothicRoof(castlePinnacles, 0.43, 2.3, x, 8.72, z, castleRoof, 8);
  addCyl(castlePinnacles, 0.023, 0.023, 0.72, 4, castleGold, x, 11.18, z, { castShadow: false });
  addSphere(castlePinnacles, 0.095, brassBright, x, 11.56, z, { wSeg: 8, hSeg: 6, castShadow: false });
}
assembleDrop(castlePinnacles, 8.35, 1.1, { spin: 0.16 });

// clock faces, texture and hands
assemblyPhase = 'clock';
const clockGroup = new THREE.Group();
castle.add(clockGroup);
const clockTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = w * 0.475;
  const rim = ctx.createRadialGradient(cx, cy, R * 0.76, cx, cy, R);
  rim.addColorStop(0, '#c59b5e');
  rim.addColorStop(0.7, '#f4cf8b');
  rim.addColorStop(1, '#7b562e');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#271f36';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.82, 0, TAU);
  ctx.fill();
  const face = ctx.createRadialGradient(cx - 20, cy - 24, 12, cx, cy, R * 0.78);
  face.addColorStop(0, '#fff0c8');
  face.addColorStop(0.72, '#f1ce92');
  face.addColorStop(1, '#c79859');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.73, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#65503f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.64, 0, TAU);
  ctx.stroke();
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  ctx.font = '600 42px Georgia, serif';
  ctx.fillStyle = '#3d2e2b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU - Math.PI / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * R * 0.54, cy + Math.sin(a) * R * 0.54);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(numerals[i], 0, 0);
    ctx.restore();
    const a2 = (i + 0.5) / 12 * TAU - Math.PI / 2;
    ctx.strokeStyle = '#685246';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a2) * R * 0.62, cy + Math.sin(a2) * R * 0.62);
    ctx.lineTo(cx + Math.cos(a2) * R * 0.66, cy + Math.sin(a2) * R * 0.66);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(78,57,48,.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.18, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#9c763f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.79, 0, TAU);
  ctx.stroke();
});
const clockFaceMat = new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false, transparent: true });
// The mechanical clock sits proud of the belfry's front face.
addBox(clockGroup, 2.92, 2.92, 0.16, castleStoneDim, 0, 11.7, 4.5, { castShadow: false });
addPlane(clockGroup, 2.55, 2.55, clockFaceMat, 0, 11.7, 4.61, { rotY: 0 });
const clockRing = new THREE.Mesh(new THREE.TorusGeometry(1.39, 0.08, 8, 56), castleGold);
clockRing.position.set(0, 11.7, 4.66);
clockGroup.add(clockRing);
const clockRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.026, 6, 56), brassBright);
clockRing2.position.set(0, 11.7, 4.68);
clockGroup.add(clockRing2);
addGlow(clockGroup, 0xffc57b, 3.4, 0, 11.7, 4.73, 0.3);
const handPivot = new THREE.Group();
handPivot.position.set(0, 11.7, 4.72);
clockGroup.add(handPivot);
const handMat = new THREE.MeshBasicMaterial({ color: 0x302024 });
function makeClockHand(w, len, colorMat) {
  const pivot = new THREE.Group();
  const hand = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.05), colorMat);
  hand.position.y = len / 2 - 0.04;
  pivot.add(hand);
  handPivot.add(pivot);
  return pivot;
}
const hourPivot = makeClockHand(0.14, 0.86, handMat);
const minutePivot = makeClockHand(0.09, 1.06, handMat);
const secondPivot = makeClockHand(0.032, 1.05, new THREE.MeshBasicMaterial({ color: 0xd6a95f }));
addSphere(clockGroup, 0.1, brassBright, 0, 11.7, 4.75, { wSeg: 10, hSeg: 8, castShadow: false });
addBox(clockGroup, 3.12, 0.16, 0.34, castleGold, 0, 13.0, 4.4, { castShadow: false });
addBox(clockGroup, 3.2, 0.28, 0.46, castleStoneDim, 0, 10.3, 4.35, { castShadow: false });
for (const x of [-1.28, 1.28]) {
  addCone(clockGroup, 0.22, 0.82, 4, castleGold, x, 10.78, 4.38, { castShadow: false, rotY: Math.PI / 4 });
}

// exposed clock movement: a brass gear train and swinging pendulum behind glass
addBox(clockGroup, 1.86, 1.5, 0.16, castleStoneDim, 0, 9.43, 4.4, { castShadow: false });
addBox(clockGroup, 1.62, 1.26, 0.04, basicMat(0x141322, { transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }), 0, 9.43, 4.49, { castShadow: false });
addBox(clockGroup, 1.72, 0.06, 0.09, castleGold, 0, 10.08, 4.5, { castShadow: false });
addBox(clockGroup, 1.72, 0.06, 0.09, castleGold, 0, 8.79, 4.5, { castShadow: false });
for (const sx of [-1, 1]) {
  addBox(clockGroup, 0.06, 1.34, 0.09, castleGold, sx * 0.86, 9.43, 4.5, { castShadow: false });
}
function makeClockGear(radius, teeth, x, y, z) {
  const gear = new THREE.Group();
  gear.position.set(x, y, z);
  clockGroup.add(gear);
  addCyl(gear, radius, radius, 0.055, Math.max(12, teeth), castleGold, 0, 0, 0, { rotX: Math.PI / 2, castShadow: false });
  for (let i = 0; i < teeth; i++) {
    const a = i / teeth * TAU;
    addBox(gear, radius * 0.2, radius * 0.14, 0.065, castleGold,
      Math.cos(a) * radius * 1.06, Math.sin(a) * radius * 1.06, 0, { rotZ: a, castShadow: false });
  }
  addSphere(gear, radius * 0.23, brassBright, 0, 0, 0.045, { wSeg: 8, hSeg: 6, castShadow: false });
  return gear;
}
const clockGearA = makeClockGear(0.26, 12, -0.31, 9.46, 4.55);
const clockGearB = makeClockGear(0.17, 10, 0.28, 9.28, 4.55);
const clockPendulum = new THREE.Group();
clockPendulum.position.set(0.5, 9.94, 4.55);
clockGroup.add(clockPendulum);
addCyl(clockPendulum, 0.018, 0.018, 0.64, 4, brassMat, 0, -0.32, 0, { castShadow: false });
addBox(clockPendulum, 0.24, 0.02, 0.02, brassMat, 0, -0.62, 0.015, { castShadow: false });
addSphere(clockPendulum, 0.075, brassBright, 0, -0.65, 0.02, { wSeg: 8, hSeg: 6, castShadow: false });
assemble(clockGroup, 8.1, 1.0, 'pop');

// large rose window
const warmWindowTex = canvasTexture(160, 320, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const arch = (pad) => {
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, h * 0.38);
    ctx.quadraticCurveTo(w / 2, h * 0.04, w - pad, h * 0.38);
    ctx.lineTo(w - pad, h - pad);
    ctx.closePath();
  };
  ctx.fillStyle = '#514b65';
  arch(4);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ffe2a8');
  g.addColorStop(0.38, '#ffb257');
  g.addColorStop(1, '#7f3e4c');
  ctx.fillStyle = g;
  arch(18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(36,27,49,.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.15);
  ctx.lineTo(w / 2, h - 24);
  ctx.moveTo(22, h * 0.62);
  ctx.lineTo(w - 22, h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,231,.34)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(54,39,56,.45)';
  ctx.fillRect(w * 0.34, h * 0.52, w * 0.32, 2);
  ctx.fillRect(w * 0.5 - 1, h * 0.45, 2, h * 0.35);
});
const tealWindowTex = canvasTexture(160, 320, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const arch = (pad) => {
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, h * 0.38);
    ctx.quadraticCurveTo(w / 2, h * 0.04, w - pad, h * 0.38);
    ctx.lineTo(w - pad, h - pad);
    ctx.closePath();
  };
  ctx.fillStyle = '#4e4d69';
  arch(4);
  ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#c7fff2');
  g.addColorStop(0.45, '#61e1ce');
  g.addColorStop(1, '#3c5f9c');
  ctx.fillStyle = g;
  arch(18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(27,31,54,.9)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.15);
  ctx.lineTo(w / 2, h - 24);
  ctx.moveTo(22, h * 0.62);
  ctx.lineTo(w - 22, h * 0.62);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(228,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
});
// Rich jewel-glass lancets for the castle's side chapels and tower niches.
const stainedGlassTex = canvasTexture(256, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const arch = (pad) => {
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(pad, h * 0.38);
    ctx.quadraticCurveTo(w / 2, h * 0.025, w - pad, h * 0.38);
    ctx.lineTo(w - pad, h - pad);
    ctx.closePath();
  };
  ctx.fillStyle = '#292138';
  arch(3);
  ctx.fill();
  ctx.save();
  arch(21);
  ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2b2550');
  bg.addColorStop(0.55, '#130f24');
  bg.addColorStop(1, '#35213b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const jewels = ['#ff7358', '#ffd05d', '#61ddc9', '#8b74e8', '#ff79b7', '#72b9ff', '#fff0b3'];
  const cols = 4;
  const rows = 9;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = 22 + c * (w - 44) / cols;
      const y = 22 + r * (h - 44) / rows;
      const cw = (w - 44) / cols;
      const ch = (h - 44) / rows;
      ctx.globalAlpha = 0.7 + (c + r) % 2 * 0.22;
      ctx.fillStyle = jewels[(c * 3 + r * 2) % jewels.length];
      ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#fff9e2';
      ctx.beginPath();
      ctx.moveTo(x + 3, y + ch - 3);
      ctx.lineTo(x + cw - 3, y + 3);
      ctx.lineTo(x + cw * 0.62, y + 3);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // central devotion medallion
  const cx = w / 2;
  const cy = h * 0.44;
  ctx.fillStyle = '#ffdf93';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#614173';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.105, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd78a';
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.035, 0, TAU); ctx.fill();
  // lead came
  ctx.strokeStyle = 'rgba(28,20,36,.92)';
  ctx.lineWidth = 5;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath(); ctx.moveTo(22 + c * (w - 44) / cols, 22); ctx.lineTo(22 + c * (w - 44) / cols, h - 22); ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath(); ctx.moveTo(22, 22 + r * (h - 44) / rows); ctx.lineTo(w - 22, 22 + r * (h - 44) / rows); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,238,190,.30)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 16); ctx.lineTo(w / 2, h - 18);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#cda364';
  ctx.lineWidth = 8;
  arch(16);
  ctx.stroke();
  ctx.strokeStyle = '#241b31';
  ctx.lineWidth = 4;
  arch(6);
  ctx.stroke();
  ctx.fillStyle = '#d5ad69';
  ctx.beginPath();
  ctx.moveTo(w / 2, 2);
  ctx.lineTo(w / 2 + 20, 22);
  ctx.lineTo(w / 2, 42);
  ctx.lineTo(w / 2 - 20, 22);
  ctx.closePath();
  ctx.fill();
});

const roseTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = w * 0.46;
  ctx.fillStyle = '#4a445c';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.84, 0, TAU); ctx.clip();
  const cols = ['#ff8058', '#ffc657', '#55d9c1', '#8b6cff', '#ff76b4', '#ffe8af'];
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, i / 16 * TAU, (i + 1.1) / 16 * TAU);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(42,32,52,.82)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
  }
  for (let r = 1; r <= 2; r++) {
    ctx.beginPath(); ctx.arc(cx, cy, R * r / 3, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#c59b5e';
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.92, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(255,246,213,.9)';
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, TAU); ctx.fill();
});
const roseMat = new THREE.MeshBasicMaterial({ map: roseTex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false });
addPlane(clockGroup, 2.15, 2.15, roseMat, 0, 7.55, 4.38, { rotY: 0 });
addGlow(clockGroup, 0xffd9a0, 3.0, 0, 7.55, 4.48, 0.22);

// window placements
assemblyPhase = 'castle';
const windowGroup = new THREE.Group();
castle.add(windowGroup);
for (const [x, y, z, tex, w, h] of [
  [-2.7, 3.2, 4.43, warmWindowTex, 1.05, 2.0],
  [2.7, 3.2, 4.43, warmWindowTex, 1.05, 2.0],
  [-2.25, 1.9, 4.43, tealWindowTex, 0.76, 1.45],
  [2.25, 1.9, 4.43, tealWindowTex, 0.76, 1.45],
]) {
  addWindowPlane(windowGroup, tex, w, h, x, y, z, 0, 0.94);
}
for (const side of [-1, 1]) {
  addWindowPlane(windowGroup, tealWindowTex, 0.6, 1.4, side * 1.16, 6.3, 4.43, 0, 0.86);
  addWindowPlane(windowGroup, warmWindowTex, 0.7, 1.6, side * 4.35, 6.4, 3.89, 0, 0.9);
}
for (const sx of [-1, 1]) {
  const facade = new THREE.Group();
  windowGroup.add(facade);
  facade.position.set(sx * 4.03, 0, -2.0);
  facade.rotation.y = sx * Math.PI / 2;
  addWindowPlane(facade, warmWindowTex, 0.82, 1.9, 0, 3.5, 0, 0, 0.9);
  addWindowPlane(facade, tealWindowTex, 0.7, 1.65, 0, 6.0, 0, 0, 0.82);
}
for (const y of [3.3, 5.2, 7.1]) {
  addWindowPlane(windowGroup, warmWindowTex, 0.66, 1.55, 0, y, 4.43, 0, 0.9);
}
for (const sx of [-1, 1]) {
  const facade = new THREE.Group();
  windowGroup.add(facade);
  facade.position.set(sx * 1.61, 0, 2.6);
  facade.rotation.y = sx * Math.PI / 2;
  addWindowPlane(facade, tealWindowTex, 0.56, 1.25, 0, 8.7, 0, 0, 0.8);
}
// back facade details so the castle still reads from the reverse side
const keepBack = new THREE.Group();
windowGroup.add(keepBack);
keepBack.position.set(0, 0, -4.64);
keepBack.rotation.y = Math.PI;
for (const x of [-2.1, 2.1]) {
  addWindowPlane(keepBack, warmWindowTex, 0.8, 1.9, x, 3.55, 0, 0, 0.82);
  addWindowPlane(keepBack, tealWindowTex, 0.64, 1.55, x, 5.95, 0, 0, 0.75);
}
addWindowPlane(keepBack, tealWindowTex, 0.6, 1.4, 0, 3.4, 0, 0, 0.7);

// Additional stained-glass lancets around the gatehouse, towers and upper keep.
for (const [x, y, z, rotY, w, h] of [
  [-2.18, 3.42, 4.405, 0, 0.62, 1.62],
  [2.18, 3.42, 4.405, 0, 0.62, 1.62],
  [-4.35, 5.8, 4.085, 0, 0.56, 1.46],
  [4.35, 5.8, 4.085, 0, 0.56, 1.46],
  [-5.58, 6.25, 2.85, -Math.PI / 2, 0.5, 1.34],
  [5.58, 6.25, 2.85, Math.PI / 2, 0.5, 1.34],
  [-2.75, 6.55, 0.65, 0, 0.58, 1.56],
  [2.75, 6.55, 0.65, 0, 0.58, 1.56],
]) {
  addWindowPlane(windowGroup, stainedGlassTex, w, h, x, y, z, rotY, 0.94);
}
// a second rose window gives the reverse elevation the same jewel-like focus
addWindowPlane(keepBack, roseTex, 1.75, 1.75, 0, 5.35, 0.02, 0, 0.94);

for (let i = 0; i < castleWindows.length; i++) {
  const win = castleWindows[i];
  assemblyPhase = win.parent === belfry ? 'clock' : 'castle';
  assemblePop(win, 8.35 + i * 0.045, 0.5);
}
assemblyPhase = 'castle';

// grand entrance portal
const entranceGroup = new THREE.Group();
castle.add(entranceGroup);
addBox(entranceGroup, 3.5, 3.9, 0.2, castleStoneDim, 0, 2.55, 4.38, { castShadow: false });
const entranceTex = canvasTexture(512, 800, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#514a61';
  ctx.beginPath();
  ctx.moveTo(20, h - 20);
  ctx.lineTo(20, h * 0.4);
  ctx.quadraticCurveTo(w / 2, h * 0.03, w - 20, h * 0.4);
  ctx.lineTo(w - 20, h - 20);
  ctx.closePath();
  ctx.fill();
  const door = (pad) => {
    ctx.beginPath();
    ctx.moveTo(pad, h - 40);
    ctx.lineTo(pad, h * 0.42);
    ctx.quadraticCurveTo(w / 2, h * 0.1, w - pad, h * 0.42);
    ctx.lineTo(w - pad, h - 40);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(0, h * 0.1, 0, h);
  g.addColorStop(0, '#f5c376');
  g.addColorStop(0.38, '#7c3950');
  g.addColorStop(1, '#241628');
  ctx.fillStyle = g;
  door(64);
  ctx.fill();
  ctx.strokeStyle = 'rgba(31,20,29,.8)';
  ctx.lineWidth = 8;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(64 + i * (w - 128) / 6, h * 0.34);
    ctx.lineTo(64 + i * (w - 128) / 6, h - 42);
    ctx.stroke();
  }
  ctx.strokeStyle = '#b2874f';
  ctx.lineWidth = 5;
  for (const yy of [h * 0.58, h * 0.78]) {
    ctx.beginPath();
    ctx.moveTo(80, yy);
    ctx.quadraticCurveTo(w / 2, yy - 8, w - 80, yy);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,214,148,.8)';
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(90 + i * (w - 180) / 9, h * 0.87, 3, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#c7a265';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(44, h - 26);
  ctx.lineTo(44, h * 0.4);
  ctx.quadraticCurveTo(w / 2, h * 0.055, w - 44, h * 0.4);
  ctx.lineTo(w - 44, h - 26);
  ctx.stroke();
  ctx.fillStyle = '#d2a160';
  ctx.beginPath();
  ctx.moveTo(w / 2, h * 0.03);
  ctx.lineTo(w / 2 + 28, h * 0.13);
  ctx.lineTo(w / 2, h * 0.21);
  ctx.lineTo(w / 2 - 28, h * 0.13);
  ctx.closePath();
  ctx.fill();
});
addPlane(entranceGroup, 2.85, 3.35, new THREE.MeshBasicMaterial({
  map: entranceTex, transparent: true, toneMapped: false, depthWrite: false,
}), 0, 1.96, 4.49);
addGlowPool(entranceGroup, 0xffa84f, 2.6, 0, 5.7, 0.26, 1.3);
addGlow(entranceGroup, 0xffb15b, 3.6, 0, 2.3, 4.6, 0.35);
for (let i = 0; i < 7; i++) {
  const a = Math.PI * (0.12 + i / 9);
  addSphere(entranceGroup, 0.09, brassMat, Math.cos(a) * 1.55, 3.0 + Math.sin(a) * 1.3, 4.51, { wSeg: 6, hSeg: 4, castShadow: false });
}
for (const sx of [-1, 1]) {
  addCyl(entranceGroup, 0.05, 0.08, 0.75, 6, brassMat, sx * 1.75, 2.35, 4.5, { castShadow: false });
  addSphere(entranceGroup, 0.13, basicMat(0xffc45d, { toneMapped: false }), sx * 1.75, 2.78, 4.55, { wSeg: 8, hSeg: 6, castShadow: false });
  addGlow(entranceGroup, 0xffa646, 1.2, sx * 1.75, 2.8, 4.62, 0.55);
}
for (let i = -2; i <= 2; i++) {
  addBox(entranceGroup, 0.055, 1.65, 0.06, toonMat(0x2a2435), i * 0.48, 2.55, 4.53, { castShadow: false });
}
addBox(entranceGroup, 2.3, 0.06, 0.06, toonMat(0x2a2435), 0, 3.05, 4.53, { castShadow: false });
assemble(entranceGroup, 8.65, 0.8, 'fade');

// banners on the keep face
const bannerTex = canvasTexture(256, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#9b5f92');
  g.addColorStop(1, '#5a3b7d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(12, 12); ctx.lineTo(w - 12, 12); ctx.lineTo(w - 12, h - 70);
  ctx.lineTo(w / 2, h - 12); ctx.lineTo(12, h - 70); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd28c'; ctx.lineWidth = 8; ctx.stroke();
  ctx.fillStyle = '#ffe6a8';
  ctx.font = '700 92px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('★', w / 2, h * 0.4);
  ctx.font = '600 45px Georgia, serif';
  ctx.fillText('DREAM', w / 2, h * 0.62);
});
const bannerGroup = new THREE.Group();
castle.add(bannerGroup);
for (const sx of [-1, 1]) {
  const b = addPlane(bannerGroup, 1.2, 2.4, new THREE.MeshBasicMaterial({
    map: bannerTex, transparent: true, side: THREE.DoubleSide, toneMapped: false,
  }), sx * 2.1, 5.3, 4.44);
  b.rotation.z = sx * 0.015;
}
assemble(bannerGroup, 9.15, 0.75, 'drop', { offset: 3 });

// hanging lanterns + gargoyle silhouettes
for (const sx of [-1, 1]) {
  addCyl(castleDetails, 0.02, 0.02, 0.6, 4, castleGold, sx * 3.15, 4.9, 4.32, { castShadow: false });
  addBox(castleDetails, 0.26, 0.35, 0.26, basicMat(0xffbe5e, { toneMapped: false }), sx * 3.15, 4.5, 4.32, { castShadow: false });
  addGlow(castleDetails, 0xffa54e, 1.1, sx * 3.15, 4.5, 4.5, 0.42);
}
const gargoyleMat = toonMat(0xd8c2a2, { emissive: 0x2a1e17, emissiveIntensity: 0.15 });
for (const sx of [-1, 1]) {
  addBox(castleDetails, 0.32, 0.25, 0.55, gargoyleMat, sx * 3.3, 5.6, 4.1, { castShadow: false });
  addCone(castleDetails, 0.16, 0.5, 4, gargoyleMat, sx * 3.3, 5.42, 4.25, { castShadow: false, rotX: Math.PI });
}
assemble(castleDetails, 9.2, 0.7, 'fade');

// castle accent light spills
const castleGlowGroup = new THREE.Group();
castle.add(castleGlowGroup);
addGlowPool(castleGlowGroup, 0xffa34d, 4.5, 0, 5.5, 0.27, 1.15);
addGlow(castleGlowGroup, 0xffb15b, 7.5, 0, 2.7, 4.4, 0.2);
assemble(castleGlowGroup, 8.9, 0.9, 'fade');

// keep the flag reference for the animation loop
const castleFlag = flag;

/* --------------------------------------------------------------------------
   Ferris wheel
   -------------------------------------------------------------------------- */
assemblyPhase = 'ferris';
const ferrisRoot = new THREE.Group();
ferrisRoot.name = 'ferrisWheel';
ferrisRoot.position.set(11.4, 0, -9.3);
park.add(ferrisRoot);

const ferrisIron = toonMat(0xfff0e4, { emissive: 0x584277, emissiveIntensity: 0.24 });
const ferrisIronDark = toonMat(0xc5aee3);
const ferrisGold = toonMat(0xf5ce88, { emissive: 0x6c4617, emissiveIntensity: 0.45 });
const ferrisPlatformMat = toonMat(0x8b73ae);
const cabinColors = [0xffb4d4, 0xffdda1, 0xb9ddff, 0xd6bbff, 0xffc7e8, 0xaee7e2, 0xffe6b8, 0xc9b8ff];

function rodBetween(parent, a, b, radius, material, seg = 7, xScale = 1) {
  const av = new THREE.Vector3(...a);
  const bv = new THREE.Vector3(...b);
  const dir = bv.clone().sub(av);
  const len = dir.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, seg, 1, false),
    material
  );
  mesh.position.copy(av).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// base pad and ticket queue
const ferrisBase = new THREE.Group();
ferrisRoot.add(ferrisBase);
addCyl(ferrisBase, 3.6, 3.9, 0.28, 24, ferrisPlatformMat, 0, 0.16, 0, { castShadow: false });
addCyl(ferrisBase, 2.9, 3.1, 0.12, 24, toonMat(0x343047), 0, 0.34, 0, { castShadow: false });
for (const z of [-2.05, 2.05]) {
  for (const x of [-5.0, 5.0]) {
    addBox(ferrisBase, 1.15, 0.45, 1.15, toonMat(0x6f6984), x, 0.36, z);
    addBox(ferrisBase, 0.65, 0.22, 0.65, ferrisGold, x, 0.65, z, { castShadow: false });
  }
}
assemble(ferrisBase, 8.9, 0.8, 'rise', { offset: -1.4 });

// steel support pyramid, front and back
const ferrisSupport = new THREE.Group();
ferrisRoot.add(ferrisSupport);
const hubY = 8.7;
for (const z of [-2.05, 2.05]) {
  rodBetween(ferrisSupport, [-5.0, 0.52, z], [0, hubY, z], 0.16, ferrisIron, 7);
  rodBetween(ferrisSupport, [5.0, 0.52, z], [0, hubY, z], 0.16, ferrisIron, 7);
  rodBetween(ferrisSupport, [-3.3, 2.5, z], [3.3, 5.9, z], 0.085, ferrisIronDark, 6);
  rodBetween(ferrisSupport, [3.3, 2.5, z], [-3.3, 5.9, z], 0.085, ferrisIronDark, 6);
  rodBetween(ferrisSupport, [-2.0, 4.4, z], [2.0, 4.4, z], 0.1, ferrisIron, 6);
}
for (const x of [-2.6, 2.6]) {
  rodBetween(ferrisSupport, [x, 4.3, -2.05], [x, 4.3, 2.05], 0.09, ferrisIronDark, 6);
}
for (const z of [-2.05, 2.05]) {
  for (const sx of [-1, 1]) {
    addSphere(ferrisSupport, 0.15, ferrisGold, sx * 5.0, 0.54, z, { wSeg: 8, hSeg: 6, castShadow: false });
  }
}
// little maintenance ladder up one leg
for (let i = 0; i < 10; i++) {
  addBox(ferrisSupport, 0.44, 0.045, 0.045, ferrisIronDark, -4.2 + i * 0.4, 0.9 + i * 0.67, 2.13, { castShadow: false });
}
assembleDrop(ferrisSupport, 9.18, 1.25);

// axle and hub
const ferrisAxle = new THREE.Group();
ferrisRoot.add(ferrisAxle);
const axle = addCyl(ferrisAxle, 0.32, 0.32, 2.7, 14, ferrisIron, 0, hubY, 0, { rotX: Math.PI / 2, castShadow: true });
addCyl(ferrisAxle, 0.7, 0.7, 0.22, 16, ferrisGold, 0, hubY, 1.18, { rotX: Math.PI / 2, castShadow: false });
addCyl(ferrisAxle, 0.7, 0.7, 0.22, 16, ferrisGold, 0, hubY, -1.18, { rotX: Math.PI / 2, castShadow: false });
// decorative stationary hub rosettes and bolt rings
for (const z of [1.32, -1.32]) {
  const rosette = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.032, 6, 36), ferrisGold);
  rosette.position.set(0, hubY, z);
  rosette.castShadow = false;
  ferrisAxle.add(rosette);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU;
    addSphere(ferrisAxle, 0.045, ferrisGold,
      Math.cos(a) * 0.4, hubY + Math.sin(a) * 0.4, z, { wSeg: 6, hSeg: 4, castShadow: false });
  }
  addSphere(ferrisAxle, 0.13, brassBright, 0, hubY, z + 0.02, { wSeg: 8, hSeg: 6, castShadow: false });
}
addGlow(ferrisAxle, 0xffcf70, 3.2, 0, hubY, 0.7, 0.35);
assemblePop(ferrisAxle, 9.7, 0.8);

// rotating wheel
const ferrisSpin = new THREE.Group();
ferrisSpin.position.set(0, hubY, 0);
ferrisRoot.add(ferrisSpin);
const FERRIS_R = 6.1;
const rimGroup = new THREE.Group();
ferrisSpin.add(rimGroup);
for (const z of [-0.55, 0.55]) {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(FERRIS_R, 0.075, 7, 96), ferrisIron);
  rim.position.z = z;
  rim.castShadow = true;
  rimGroup.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(FERRIS_R * 0.55, 0.042, 6, 64), ferrisIronDark);
  rim2.position.z = z;
  rim2.castShadow = false;
  rimGroup.add(rim2);
}
// spokes and cross rods
const spokeCount = 16;
for (let i = 0; i < spokeCount; i++) {
  const a = i / spokeCount * TAU;
  const ex = Math.cos(a) * FERRIS_R;
  const ey = Math.sin(a) * FERRIS_R;
  for (const z of [-0.55, 0.55]) {
    rodBetween(rimGroup, [Math.cos(a) * 0.48, Math.sin(a) * 0.48, z], [ex, ey, z], 0.035, ferrisIronDark, 5);
    const diagAngle = a + Math.PI / spokeCount * 0.42;
    if (i % 2 === 0) {
      rodBetween(rimGroup, [Math.cos(diagAngle) * 1.4, Math.sin(diagAngle) * 1.4, z], [ex, ey, z], 0.026, ferrisIronDark, 4);
    }
  }
  const cross = addCyl(rimGroup, 0.026, 0.026, 1.1, 5, ferrisIronDark, ex, ey, 0, { rotX: Math.PI / 2, castShadow: false });
}
// riveted junction plates and alternating lattice braces
for (let i = 0; i < spokeCount; i++) {
  const a = i / spokeCount * TAU;
  const ex = Math.cos(a) * FERRIS_R;
  const ey = Math.sin(a) * FERRIS_R;
  for (const z of [-0.55, 0.55]) {
    addBox(rimGroup, 0.12, 0.18, 0.085, ferrisGold,
      ex * 0.985, ey * 0.985, z, { rotZ: a, castShadow: false });
    if (i % 2 === 0) {
      const a2 = (i + 1) / spokeCount * TAU;
      rodBetween(rimGroup,
        [Math.cos(a) * FERRIS_R * 0.55, Math.sin(a) * FERRIS_R * 0.55, z],
        [Math.cos(a2) * FERRIS_R * 0.985, Math.sin(a2) * FERRIS_R * 0.985, z],
        0.02, ferrisIronDark, 4);
    }
  }
}
for (const z of [-0.55, 0.55]) {
  const trimRing = new THREE.Mesh(new THREE.TorusGeometry(FERRIS_R * 0.9, 0.022, 6, 80), ferrisGold);
  trimRing.position.z = z;
  trimRing.castShadow = false;
  rimGroup.add(trimRing);
}
// wheel glows / fairy bulbs
const ferrisBulbCount = 72;
const ferrisBulbGeo = new THREE.BufferGeometry();
const fp = new Float32Array(ferrisBulbCount * 3);
const fc = new Float32Array(ferrisBulbCount * 3);
const fs = new Float32Array(ferrisBulbCount);
const fph = new Float32Array(ferrisBulbCount);
const ferrisPalette = [new THREE.Color(0xffe0a0), new THREE.Color(0xff9ccc), new THREE.Color(0xa8dcff), new THREE.Color(0xc7acff)];
for (let i = 0; i < ferrisBulbCount; i++) {
  const a = i / ferrisBulbCount * TAU;
  const rr = i % 3 === 0 ? FERRIS_R * 0.55 : FERRIS_R;
  fp[i * 3] = Math.cos(a) * rr;
  fp[i * 3 + 1] = Math.sin(a) * rr;
  fp[i * 3 + 2] = (i % 2 ? 1 : -1) * 0.58;
  const col = ferrisPalette[i % ferrisPalette.length];
  fc[i * 3] = col.r * 1.3; fc[i * 3 + 1] = col.g * 1.3; fc[i * 3 + 2] = col.b * 1.3;
  fs[i] = i % 3 === 0 ? 8.0 : 11.0;
  fph[i] = rand(0, TAU);
}
ferrisBulbGeo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
ferrisBulbGeo.setAttribute('aColor', new THREE.BufferAttribute(fc, 3));
ferrisBulbGeo.setAttribute('aSize', new THREE.BufferAttribute(fs, 1));
ferrisBulbGeo.setAttribute('aPhase', new THREE.BufferAttribute(fph, 1));
const ferrisBulbMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (34.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = 0.5 + 0.5 * sin(uTime * 2.4 + aPhase);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uOpacity;
    void main(){
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p);
      float core = smoothstep(0.5, 0.08, d);
      float halo = smoothstep(0.5, 0.0, d) * 0.35;
      vec3 col = vColor * (0.8 + core * 1.6);
      gl_FragColor = vec4(col, (core + halo) * vAlpha * uOpacity);
    }
  `,
});
const ferrisBulbs = new THREE.Points(ferrisBulbGeo, ferrisBulbMat);
rimGroup.add(ferrisBulbs);
assemblePop(rimGroup, 10.0, 1.15, { spin: -0.32 });

// cabins (they hang below their pivots and counter-rotate in the animation loop)
const ferrisCabins = [];
const cabinCount = 12;
for (let i = 0; i < cabinCount; i++) {
  const a = i / cabinCount * TAU - Math.PI / 2;
  const pivot = new THREE.Group();
  pivot.position.set(Math.cos(a) * FERRIS_R, Math.sin(a) * FERRIS_R, 0);
  ferrisSpin.add(pivot);
  const color = cabinColors[i % cabinColors.length];
  const cabinMat = toonMat(color, { emissive: color, emissiveIntensity: 0.08 });
  const cabinDark = toonMat(0x3d3352);
  rodBetween(pivot, [0, -0.1, 0], [0, -0.55, 0], 0.045, ferrisIron, 5);
  // roof
  addCone(pivot, 0.5, 0.3, 8, ferrisGold, 0, -0.52, 0, { castShadow: false });
  addCyl(pivot, 0.48, 0.48, 0.16, 8, cabinMat, 0, -0.7, 0, { castShadow: true });
  addBox(pivot, 0.7, 0.55, 0.64, cabinMat, 0, -1.0, 0);
  addBox(pivot, 0.72, 0.18, 0.66, cabinDark, 0, -1.25, 0, { castShadow: false });
  // window (two glowing panes)
  for (const sx of [-1, 1]) {
    addBox(pivot, 0.22, 0.28, 0.02, basicMat(i % 3 === 0 ? 0xffe3a2 : 0x7df8df, { toneMapped: false }), sx * 0.16, -0.97, 0.335, { castShadow: false });
    addBox(pivot, 0.02, 0.28, 0.22, basicMat(0xffd696, { toneMapped: false }), sx * 0.36, -0.97, 0, { castShadow: false });
  }
  addGlow(pivot, color, 1.5, 0, -1.0, 0.35, 0.22);
  // structural A-frame hanger, roof ribs and gilt trim
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rodBetween(pivot, [0, -0.08, 0], [sx * 0.34, -0.63, sz * 0.21], 0.021, ferrisIron, 4);
    }
  }
  addBox(pivot, 0.74, 0.045, 0.045, ferrisIron, 0, -0.08, 0, { castShadow: false });
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * TAU;
    rodBetween(pivot, [0, -0.38, 0], [Math.cos(a) * 0.4, -0.65, Math.sin(a) * 0.4], 0.016, ferrisGold, 4);
  }
  addSphere(pivot, 0.06, ferrisGold, 0, -0.35, 0, { wSeg: 6, hSeg: 4, castShadow: false });
  addCyl(pivot, 0.51, 0.51, 0.04, 8, ferrisGold, 0, -0.66, 0, { castShadow: false });
  // gold mullions over the glowing front panes
  for (const y of [-0.82, -1.14]) {
    addBox(pivot, 0.62, 0.028, 0.032, ferrisGold, 0, y, 0.345, { castShadow: false });
  }
  for (const x of [-0.29, 0, 0.29]) {
    addBox(pivot, 0.026, 0.33, 0.032, ferrisGold, x, -0.97, 0.345, { castShadow: false });
  }
  // side grab rails and a recessed rear door
  for (const sx of [-1, 1]) {
    addBox(pivot, 0.032, 0.34, 0.032, ferrisGold, sx * 0.355, -0.96, 0, { castShadow: false });
    addBox(pivot, 0.032, 0.032, 0.54, ferrisGold, sx * 0.355, -0.8, 0, { castShadow: false });
  }
  addBox(pivot, 0.44, 0.42, 0.025, cabinDark, 0, -0.98, -0.338, { castShadow: false });
  addSphere(pivot, 0.035, ferrisGold, 0.14, -0.98, -0.355, { wSeg: 6, hSeg: 4, castShadow: false });
  addBox(pivot, 0.7, 0.035, 0.035, ferrisGold, 0, -1.17, 0.32, { castShadow: false });
  addBox(pivot, 0.035, 0.035, 0.54, ferrisGold, 0.35, -1.17, 0, { castShadow: false });
  addBox(pivot, 0.035, 0.035, 0.54, ferrisGold, -0.35, -1.17, 0, { castShadow: false });
  pivot.userData.baseZ = 0;
  pivot.userData.isCabin = true;
  pivot.userData.cabin = true;
  pivot.userData.cabinMat = cabinMat;
  pivot.userData.cabinDark = cabinDark;
  ferrisCabins.push(pivot);
  assembleDrop(pivot, 10.6 + i * 0.115, 0.7, { spin: (i % 2 ? 1 : -1) * 0.24 });
}

// an entrance arch beneath the wheel
const ferrisEntry = new THREE.Group();
ferrisRoot.add(ferrisEntry);
for (const sx of [-1, 1]) {
  addBox(ferrisEntry, 0.32, 2.25, 0.32, ferrisGold, sx * 1.45, 1.13, 3.05, { castShadow: false });
  addSphere(ferrisEntry, 0.14, brassBright, sx * 1.45, 2.33, 3.05, { wSeg: 8, hSeg: 6, castShadow: false });
}
addBox(ferrisEntry, 3.05, 0.18, 0.24, ferrisGold, 0, 2.25, 3.05, { castShadow: false });
const ferrisSignTex = canvasTexture(512, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(22,15,34,.9)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 14); ctx.fill();
  ctx.strokeStyle = '#d9b170'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '700 56px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd28b';
  ctx.fillText('FERRIS WHEEL', w / 2, h / 2);
});
addPlane(ferrisEntry, 2.7, 0.68, new THREE.MeshBasicMaterial({ map: ferrisSignTex, transparent: true, toneMapped: false }), 0, 2.08, 3.18);
for (let i = 0; i < 12; i++) {
  const a = i / 12 * Math.PI;
  addSphere(ferrisEntry, 0.07, basicMat(i % 2 ? 0xffd486 : 0xff88b8, { toneMapped: false }), Math.cos(a) * 1.45, 1.9, 3.16, { wSeg: 6, hSeg: 4, castShadow: false });
}
assemble(ferrisEntry, 11.55, 0.7, 'drop', { offset: 3 });
addGlowPool(park, 0xff8ebb, 4.8, 11.4, -8.6, 0.24, 0.75);

/* --------------------------------------------------------------------------
   Observation tower
   -------------------------------------------------------------------------- */
const towerRoot = new THREE.Group();
towerRoot.name = 'observationTower';
towerRoot.position.set(-16.2, 0, 15.0);
towerRoot.scale.setScalar(0.9);
park.add(towerRoot);

const towerStone = toonMat(0xefe3fa, { map: stoneTex });
const towerDark = toonMat(0xac8fc9);
const towerGold = toonMat(0xf0c77f, { emissive: 0x5e4015, emissiveIntensity: 0.6 });
const towerGlow = basicMat(0xffc4e6, { toneMapped: false });
const towerGlowWarm = basicMat(0xffd68f, { toneMapped: false });
const towerFloorMat = toonMat(0xc8b4e0, { map: stoneDarkTex });

// base pavilion
const obsBase = new THREE.Group();
towerRoot.add(obsBase);
addCyl(obsBase, 2.15, 2.35, 0.5, 8, towerStone, 0, 0.28, 0, { castShadow: true });
addCyl(obsBase, 1.7, 1.95, 0.9, 8, towerDark, 0, 0.95, 0);
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + Math.PI / 8;
  // pointed arches as dark little windows on the base
  if (i % 2 === 0) {
    addBox(obsBase, 0.3, 0.9, 0.1, towerGold, Math.cos(a) * 1.78, 1.15, Math.sin(a) * 1.78, { rotY: -a + Math.PI / 2, castShadow: false });
  }
  addBox(obsBase, 0.2, 1.55, 0.2, towerGold, Math.cos(a) * 2.35, 0.85, Math.sin(a) * 2.35, { rotY: -a, castShadow: false });
}
addCyl(obsBase, 2.45, 2.45, 0.12, 8, towerGold, 0, 1.57, 0, { castShadow: false });
assemble(obsBase, 11.72, 0.9, 'rise', { offset: -1.8 });

// central shaft and support cage
const obsShaft = new THREE.Group();
towerRoot.add(obsShaft);
const deckY = 12.1;
addCyl(obsShaft, 0.58, 0.78, 10.55, 12, towerStone, 0, 6.8, 0);
addCyl(obsShaft, 0.82, 0.82, 0.18, 12, towerGold, 0, 7.05, 0, { castShadow: false });
addCyl(obsShaft, 0.82, 0.82, 0.18, 12, towerGold, 0, 9.5, 0, { castShadow: false });
for (let i = 0; i < 4; i++) {
  const a = i / 4 * TAU + Math.PI / 4;
  const x = Math.cos(a);
  const z = Math.sin(a);
  const foot = [x * 2.1, 1.62, z * 2.1];
  const top = [x * 0.72, deckY - 0.45, z * 0.72];
  rodBetween(obsShaft, foot, top, 0.095, towerGold, 6);
  const foot2 = [x * 1.7, 1.62, z * 1.7];
  const top2 = [x * 0.35, deckY - 0.45, z * 0.35];
  rodBetween(obsShaft, foot2, top2, 0.06, towerDark, 5);
  for (let yy = 3.2; yy < 11.2; yy += 2.5) {
    const t = (yy - 1.62) / (deckY - 2.07);
    rodBetween(obsShaft, [Math.cos(a - 0.35) * (1.5 - t * 1.15), yy, Math.sin(a - 0.35) * (1.5 - t * 1.15)], [Math.cos(a + 0.35) * (1.5 - t * 1.15), yy + 1.0, Math.sin(a + 0.35) * (1.5 - t * 1.15)], 0.035, towerDark, 4);
  }
}
// big clock-ish light bands
for (const y of [4.7, 8.7, 11.0]) {
  addCyl(obsShaft, 0.8 - (y - 4.7) * 0.018, 0.8 - (y - 4.7) * 0.018, 0.13, 12, towerGold, 0, y, 0, { castShadow: false });
}
// glowing window slits
for (let i = 0; i < 3; i++) {
  addBox(obsShaft, 0.16, 1.2, 0.16, i === 1 ? towerGlow : towerGlowWarm, 0.61, 6.2 + i * 1.8, 0.18, { castShadow: false });
}
assemble(obsShaft, 12.02, 1.35, 'scaleY');

// elevator car on the side (animated)
const elevator = new THREE.Group();
towerRoot.add(elevator);
addBox(elevator, 0.8, 1.05, 0.8, towerDark, 0, 0, 0, { castShadow: false });
addBox(elevator, 0.66, 0.75, 0.03, basicMat(0x96ffdf, { toneMapped: false, transparent: true, opacity: 0.65 }), 0, 0.03, 0.41, { castShadow: false });
addBox(elevator, 0.03, 0.75, 0.5, basicMat(0x96ffdf, { toneMapped: false, transparent: true, opacity: 0.45 }), 0.41, 0.03, 0, { castShadow: false });
addCyl(elevator, 0.03, 0.03, 0.38, 4, towerGold, 0, 0.7, 0, { castShadow: false });
addGlow(elevator, 0x66ffce, 1.5, 0, 0, 0, 0.35);
elevator.position.set(-1.35, 3.0, 0.25);
elevator.visible = false;
assemblePop(elevator, 13.4, 0.75);

// top platform, rotating observatory, roof
const obsTop = new THREE.Group();
towerRoot.add(obsTop);
addCyl(obsTop, 2.75, 2.25, 0.35, 12, towerFloorMat, 0, deckY, 0, { castShadow: false });
addCyl(obsTop, 2.85, 2.85, 0.12, 12, towerGold, 0, deckY + 0.2, 0, { castShadow: false });
assemble(obsTop, 12.65, 0.85, 'drop', { offset: 3.2 });

const obsRot = new THREE.Group();
towerRoot.add(obsRot);
const obsRotBaseY = deckY + 0.3;
obsRot.position.y = 0;
for (let i = 0; i < 10; i++) {
  const a = i / 10 * TAU;
  addBox(obsRot, 0.07, 0.8, 0.07, towerGold, Math.cos(a) * 2.52, obsRotBaseY + 0.55, Math.sin(a) * 2.52, { castShadow: false });
  addBox(obsRot, 0.34, 0.07, 0.34, towerGold, Math.cos(a) * 2.52, obsRotBaseY + 0.98, Math.sin(a) * 2.52, { castShadow: false });
  if (i % 2 === 0) {
    const glass = addBox(obsRot, 0.04, 0.55, 0.34, basicMat(0x87f4e2, { transparent: true, opacity: 0.25, toneMapped: false }), Math.cos(a) * 2.52, obsRotBaseY + 0.55, Math.sin(a) * 2.52, { castShadow: false });
    glass.rotation.y = -a;
  }
}
addCyl(obsRot, 2.6, 2.6, 0.1, 12, towerGold, 0, obsRotBaseY + 0.05, 0, { castShadow: false });
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU;
  const x = Math.cos(a) * 1.65;
  const z = Math.sin(a) * 1.65;
  addBox(obsRot, 0.62, 0.16, 0.44, toonMat(0x6a5362), x, obsRotBaseY + 0.36, z, { rotY: -a, castShadow: false });
  addBox(obsRot, 0.62, 0.5, 0.12, toonMat(0x6a5362), x, obsRotBaseY + 0.63, z, { rotY: -a, castShadow: false });
  addBox(obsRot, 0.1, 0.28, 0.1, towerGold, x - Math.cos(a) * 0.2, obsRotBaseY + 0.38, z - Math.sin(a) * 0.2, { castShadow: false });
  addSphere(obsRot, 0.1, basicMat(i % 2 ? 0xffd386 : 0x7df8df, { toneMapped: false }), Math.cos(a + 0.35) * 2.3, obsRotBaseY + 1.1, Math.sin(a + 0.35) * 2.3, { wSeg: 6, hSeg: 4, castShadow: false });
}
// canopy
addCyl(obsRot, 0.5, 3.1, 1.72, 12, castleRoof, 0, obsRotBaseY + 2.0, 0, { castShadow: true });
addCyl(obsRot, 0.7, 0.7, 0.28, 12, towerGold, 0, obsRotBaseY + 1.18, 0, { castShadow: false });
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU;
  rodBetween(obsRot, [0, obsRotBaseY + 3.78, 0], [Math.cos(a) * 3.12, obsRotBaseY + 1.95, Math.sin(a) * 3.12], 0.036, towerGold, 4);
}
addCyl(obsRot, 0.045, 0.045, 2.8, 6, towerGold, 0, obsRotBaseY + 4.5, 0, { castShadow: false });
addSphere(obsRot, 0.16, brassBright, 0, obsRotBaseY + 5.95, 0, { wSeg: 8, hSeg: 6, castShadow: false });
addGlow(obsRot, 0xffc878, 4.5, 0, obsRotBaseY + 1.0, 0, 0.22);
assemblePop(obsRot, 13.55, 1.2);

// warm light spilling from the elevator tower base
addGlowPool(park, 0x64e5cf, 3.4, -16.2, 15.0, 0.2, 0.9);

/* --------------------------------------------------------------------------
   Roller coaster
   -------------------------------------------------------------------------- */
assemblyPhase = 'coaster';
const coasterRoot = new THREE.Group();
coasterRoot.name = 'nightCoaster';
park.add(coasterRoot);

const coasterPts = [
  new THREE.Vector3(-14.6, 2.0, 1.0),
  new THREE.Vector3(-17.1, 2.6, -1.8),
  new THREE.Vector3(-17.35, 5.8, -6.4),
  new THREE.Vector3(-14.9, 8.2, -11.0),
  new THREE.Vector3(-10.4, 9.7, -14.2),
  new THREE.Vector3(-5.7, 8.2, -15.4),
  new THREE.Vector3(-4.8, 6.0, -12.8),
  new THREE.Vector3(-8.3, 4.1, -9.8),
  new THREE.Vector3(-11.9, 2.6, -6.2),
  new THREE.Vector3(-14.4, 2.1, -3.2),
];
const coasterCurve = new THREE.CatmullRomCurve3(coasterPts, true, 'catmullrom', 0.3);
const coasterLength = coasterCurve.getLength();
const coasterSideOffset = 0.34;
const coasterRailMat = toonMat(0xffca86, { emissive: 0x9b5a22, emissiveIntensity: 0.4 });
const coasterTieMat = toonMat(0xa68bc7);
const coasterSpineMat = toonMat(0xa6ddff, { emissive: 0x3a7595, emissiveIntensity: 0.35 });
const coasterSteelMat = toonMat(0xe7d5f5);
const coasterGlowMat = basicMat(0xffd89a, { toneMapped: false });

// Build the two rail curves from the main track
const railSamples = 220;
const frameSide = [];
const frameUp = [];
const railPointArrays = [[], []];
for (let i = 0; i < railSamples; i++) {
  const u = i / railSamples;
  const p = coasterCurve.getPointAt(u);
  const tan = coasterCurve.getTangentAt(u).normalize();
  const side = new THREE.Vector3().crossVectors(UP, tan).normalize();
  const up = new THREE.Vector3().crossVectors(tan, side).normalize();
  frameSide.push(side);
  frameUp.push(up);
  railPointArrays[0].push(p.clone().addScaledVector(side, coasterSideOffset));
  railPointArrays[1].push(p.clone().addScaledVector(side, -coasterSideOffset));
}
const railCurves = railPointArrays.map((arr) => new THREE.CatmullRomCurve3(arr, true, 'catmullrom', 0.3));
const coastTrackGroup = new THREE.Group();
coasterRoot.add(coastTrackGroup);
for (const rc of railCurves) {
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(rc, railSamples, 0.065, 6, true),
    coasterRailMat
  );
  tube.castShadow = true;
  tube.receiveShadow = false;
  coastTrackGroup.add(tube);
}
const spineCurve = new THREE.CatmullRomCurve3(
  Array.from({ length: railSamples }, (_, i) => coasterCurve.getPointAt(i / railSamples)),
  true,
  'catmullrom',
  0.3
);
const spine = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, railSamples, 0.035, 5, true), coasterSpineMat);
spine.castShadow = false;
coastTrackGroup.add(spine);

// Cross ties merged into one geometry
const tieGeos = [];
const tieCount = 116;
for (let i = 0; i < tieCount; i++) {
  const u = i / tieCount;
  const p = coasterCurve.getPointAt(u);
  const tan = coasterCurve.getTangentAt(u).normalize();
  const side = new THREE.Vector3().crossVectors(UP, tan).normalize();
  const up = new THREE.Vector3().crossVectors(tan, side).normalize();
  const m = new THREE.Matrix4().makeBasis(side, up, tan);
  m.setPosition(p);
  const g = new THREE.BoxGeometry(coasterSideOffset * 2 + 0.16, 0.055, 0.16);
  g.applyMatrix4(m);
  tieGeos.push(g);
}
const ties = new THREE.Mesh(mergeGeometries(tieGeos), coasterTieMat);
ties.castShadow = false;
coastTrackGroup.add(ties);
assemble(coastTrackGroup, 10.25, 2.15, 'reveal');

// supports placed along the loop
const coasterSupports = new THREE.Group();
coasterRoot.add(coasterSupports);
const supportSampleCount = 26;
for (let i = 0; i < supportSampleCount; i++) {
  const u = (i + 0.25) / supportSampleCount;
  const p = coasterCurve.getPointAt(u);
  const tan = coasterCurve.getTangentAt(u).normalize();
  const side = new THREE.Vector3().crossVectors(UP, tan).normalize();
  const geos = [];
  const poleH = Math.max(0.5, p.y - 0.23);
  const pole = new THREE.CylinderGeometry(0.075, 0.12, poleH, 7);
  pole.translate(p.x, poleH / 2, p.z);
  geos.push(pole);
  const foot = new THREE.BoxGeometry(0.78, 0.22, 0.78);
  foot.translate(p.x, 0.11, p.z);
  geos.push(foot);
  const plate = new THREE.BoxGeometry(0.5, 0.08, 0.5);
  plate.translate(p.x, poleH, p.z);
  geos.push(plate);
  // two slim diagonal outriggers at taller supports
  if (p.y > 4.5) {
    for (const sign of [-1, 1]) {
      const a = new THREE.Vector3(p.x + side.x * 0.55, 0.35, p.z + side.z * 0.55);
      const b = new THREE.Vector3(p.x, poleH * 0.86, p.z);
      const dir = b.clone().sub(a);
      const len = dir.length();
      const g = new THREE.CylinderGeometry(0.035, 0.04, len, 5);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
      const mat = new THREE.Matrix4().makeRotationFromQuaternion(q);
      mat.setPosition(a);
      g.applyMatrix4(mat);
      geos.push(g);
    }
  }
  const merged = mergeGeometries(geos);
  const support = new THREE.Mesh(merged, coasterSteelMat);
  support.castShadow = true;
  support.position.set(0, 0, 0);
  coasterSupports.add(support);
  assembleRise(support, 9.65 + i * 0.055, 0.7);
}
// little warning lights along the track
const trackMarkerPositions = [];
for (let i = 0; i < 16; i++) {
  const p = coasterCurve.getPointAt(i / 16);
  trackMarkerPositions.push(p.x, p.y + 0.18, p.z);
}
const trackMarkerGeo = new THREE.BufferGeometry();
trackMarkerGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackMarkerPositions, 3));
const trackMarkers = new THREE.Points(trackMarkerGeo, new THREE.PointsMaterial({
  color: 0xffc178, size: 0.22, sizeAttenuation: true, transparent: true,
  opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, map: glowTex,
  alphaTest: 0.05, toneMapped: false,
}));
coasterRoot.add(trackMarkers);
assemble(trackMarkers, 12.1, 0.6, 'fade');

// Station: a gothic timber pavilion over the boarding curve
const stationPoint = coasterCurve.getPointAt(0.0);
const coasterStation = new THREE.Group();
coasterRoot.add(coasterStation);
const stationWood = toonMat(0xb68ba6);
const stationRoofMat = toonMat(0xcbb4e8, { map: roofTex });
const stationGold = toonMat(0xf2cc87, { emissive: 0x634117, emissiveIntensity: 0.55 });
addBox(coasterStation, 4.4, 0.55, 3.0, toonMat(0xa78cc4), -14.7, 0.28, 0.8, { castShadow: false });
for (const x of [-16.3, -13.1]) {
  for (const z of [-0.5, 2.1]) {
    addBox(coasterStation, 0.25, 3.8, 0.25, stationWood, x, 2.2, z);
    addCone(coasterStation, 0.2, 0.65, 4, stationGold, x, 4.4, z, { castShadow: false, rotY: Math.PI / 4 });
  }
}
addBox(coasterStation, 3.6, 0.28, 2.9, stationRoofMat, -14.7, 4.15, 0.8, { rotZ: 0.045, castShadow: true });
addCone(coasterStation, 0.32, 1.1, 4, stationGold, -14.7, 4.8, 0.8, { rotY: Math.PI / 4, castShadow: false });
for (const z of [-0.5, 2.1]) {
  addBox(coasterStation, 3.65, 0.1, 0.2, stationGold, -14.7, 3.92, z, { castShadow: false });
}
// little glowing lamps under the canopy
for (const x of [-15.9, -13.5]) {
  addCyl(coasterStation, 0.04, 0.04, 0.65, 4, stationGold, x, 3.55, 2.05, { castShadow: false });
  addSphere(coasterStation, 0.14, basicMat(0xffc26e, { toneMapped: false }), x, 3.2, 2.05, { wSeg: 7, hSeg: 5, castShadow: false });
  addGlow(coasterStation, 0xffa852, 1.25, x, 3.2, 2.2, 0.42);
}
const coasterSignTex = canvasTexture(512, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(81,46,100,.94)';
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 12); ctx.fill();
  ctx.strokeStyle = '#ffd18c'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '700 42px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1c9';
  ctx.fillText('STARLIGHT COASTER', w / 2, h / 2 + 2);
});
const coasterSign = addPlane(coasterStation, 3.15, 0.76, new THREE.MeshBasicMaterial({
  map: coasterSignTex, transparent: true, toneMapped: false,
}), -14.7, 3.72, 2.23);
// steps toward the boarding platform
for (let i = 0; i < 3; i++) {
  addBox(coasterStation, 2.0 - i * 0.3, 0.14, 0.3, toonMat(0x6f6480), -14.7, 0.26 + i * 0.14, 2.7 + i * 0.3, { castShadow: false });
}
assemble(coasterStation, 9.35, 0.9, 'drop', { offset: 4.5 });

// Queue railing
const coasterQueue = new THREE.Group();
coasterRoot.add(coasterQueue);
for (let i = 0; i < 5; i++) {
  addCyl(coasterQueue, 0.035, 0.045, 0.7, 5, stationGold, -16.5 + i * 0.55, 0.45, 2.9, { castShadow: false });
  addCyl(coasterQueue, 0.03, 0.035, 0.7, 5, stationGold, -16.5 + i * 0.55, 0.45, 3.7, { castShadow: false });
}
addCyl(coasterQueue, 0.025, 0.025, 2.25, 5, stationGold, -15.4, 0.75, 2.9, { rotZ: Math.PI / 2, castShadow: false });
addCyl(coasterQueue, 0.025, 0.025, 2.25, 5, stationGold, -15.4, 0.75, 3.7, { rotZ: Math.PI / 2, castShadow: false });
assemble(coasterQueue, 9.7, 0.7, 'fade');

// Train
const coasterTrain = new THREE.Group();
coasterRoot.add(coasterTrain);
const carColors = [0xffb0d5, 0xc7a6ff, 0xaad8ff];
const coasterCars = [];
for (let i = 0; i < 3; i++) {
  const car = new THREE.Group();
  const color = carColors[i % carColors.length];
  const carMat = toonMat(color, { emissive: color, emissiveIntensity: 0.1 });
  const carDark = toonMat(0x8c6ea1);
  addBox(car, 1.05, 0.55, 1.5, carMat, 0, 0.36, 0);
  addBox(car, 1.1, 0.18, 1.55, carDark, 0, 0.65, 0, { castShadow: false });
  // curved seat back
  addBox(car, 0.9, 0.55, 0.12, carDark, 0, 0.76, 0.44, { castShadow: false });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(car, 0.16, 0.16, 0.1, 10, carDark, sx * 0.55, 0.18, sz * 0.44, { rotZ: Math.PI / 2, castShadow: false });
    }
  }
  // headlights / eyes
  addSphere(car, 0.08, basicMat(0xffdf8a, { toneMapped: false }), -0.27, 0.48, 0.77, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(car, 0.08, basicMat(0xffdf8a, { toneMapped: false }), 0.27, 0.48, 0.77, { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(car, color, 1.2, 0, 0.6, 0, 0.3);
  // tiny wishing-star passenger
  addSphere(car, 0.22, basicMat(0xffd7f3, { transparent: true, opacity: 0.8, toneMapped: false }), 0, 0.88, -0.05, { wSeg: 10, hSeg: 8, sy: 1.2, castShadow: false });
  addGlow(car, 0xffc9eb, 0.8, 0, 0.9, 0.12, 0.28);
  addSphere(car, 0.055, basicMat(0xfff0b0), -0.07, 0.91, 0.16, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(car, 0.055, basicMat(0xfff0b0), 0.07, 0.91, 0.16, { wSeg: 6, hSeg: 4, castShadow: false });
  car.visible = true;
  coasterTrain.add(car);
  coasterCars.push(car);
}
assemblePop(coasterTrain, 12.55, 0.9);
addGlowPool(park, 0xffc9a0, 4.4, -14.6, 1.0, 0.22, 0.85);

// Invisible, generous click target wrapped around the coaster so boarding the
// ride stays easy even after the track is compressed at the end of the intro.
const coasterPickProxy = new THREE.Mesh(
  new THREE.TubeGeometry(coasterCurve, 90, 2.35, 8, true),
  new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
);
coasterPickProxy.name = 'coasterPickProxy';
coasterRoot.add(coasterPickProxy);

// expose a helper used by the animation loop
function updateCoasterTrain(time) {
  const base = 0.23 + time * 1.75 / coasterLength;
  for (let i = 0; i < coasterCars.length; i++) {
    const u = ((base - i * 1.72 / coasterLength) % 1 + 1) % 1;
    const p = coasterCurve.getPointAt(u);
    const tan = coasterCurve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(UP, tan).normalize();
    const up = new THREE.Vector3().crossVectors(tan, right).normalize();
    const m = new THREE.Matrix4().makeBasis(right, up, tan);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    coasterCars[i].position.copy(p).addScaledVector(up, 0.13);
    coasterCars[i].quaternion.copy(q);
  }
}

updateCoasterTrain(0);

/* --------------------------------------------------------------------------
   First-person coaster ride
   -------------------------------------------------------------------------- */
const RIDE_FOV = 68;
const RIDE_EYE_HEIGHT = 1.08;
const RIDE_START_U = 0.09;
const RIDE_LOOK_AHEAD = 1.65;
const rideSaved = {
  pos: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  target: new THREE.Vector3(),
  fov: 42,
  distance: 63,
};
const rideExitFrom = {
  pos: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
  fov: 42,
};
const ridePosePosition = new THREE.Vector3();
const ridePoseQuaternion = new THREE.Quaternion();
const rideRight = new THREE.Vector3();
const rideUp = new THREE.Vector3();
const rideBack = new THREE.Vector3();
const rideBasis = new THREE.Matrix4();
const coasterRideForward = new THREE.Vector3();
const rideLookDirection = new THREE.Vector3();
const rideAheadPoint = new THREE.Vector3();
let coasterRideBlend = 0;
let coasterRideU = 0;
let coasterRideDistance = 0;
let coasterRideSpeed = 0;
let coasterRideReadyAt = 13.5;

function smootherstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function updateRidePose(point, forward) {
  // The camera looks down local -Z, so the basis is built with the
  // track tangent pointing out of the back of the camera.
  rideRight.crossVectors(forward, UP);
  if (rideRight.lengthSq() < 0.0001) rideRight.set(1, 0, 0);
  rideRight.normalize();
  rideUp.crossVectors(rideRight, forward).normalize();
  rideBack.copy(forward).negate();
  rideBasis.makeBasis(rideRight, rideUp, rideBack);
  ridePoseQuaternion.setFromRotationMatrix(rideBasis);
  ridePosePosition.copy(point).addScaledVector(rideUp, RIDE_EYE_HEIGHT);
}

function enterCoasterRide() {
  if (coasterRidePhase !== 'off' || simulationTime < coasterRideReadyAt) return false;
  rideSaved.pos.copy(camera.position);
  rideSaved.quat.copy(camera.quaternion);
  rideSaved.target.copy(controls.target);
  rideSaved.fov = camera.fov;
  rideSaved.distance = targetCameraDistance;
  coasterRidePhase = 'entering';
  coasterRideBlend = 0;
  coasterRideU = RIDE_START_U;
  coasterRideDistance = 0;
  coasterRideSpeed = 4.8;
  rideAheadPoint.copy(coasterCurve.getPointAt((RIDE_START_U + RIDE_LOOK_AHEAD / coasterLength) % 1));
  coasterRideForward.copy(rideAheadPoint)
    .sub(coasterCurve.getPointAt(RIDE_START_U))
    .normalize()
    .lerp(coasterCurve.getTangentAt(RIDE_START_U), 0.3)
    .normalize();
  controls.enabled = false;
  coasterTrain.visible = false;
  return true;
}

function exitCoasterRide() {
  if (coasterRidePhase === 'off' || coasterRidePhase === 'exiting') return false;
  rideExitFrom.pos.copy(camera.position);
  rideExitFrom.quat.copy(camera.quaternion);
  rideExitFrom.fov = camera.fov;
  coasterRideBlend = 0;
  coasterRidePhase = 'exiting';
  return true;
}

function finishCoasterRide() {
  camera.position.copy(rideSaved.pos);
  camera.quaternion.copy(rideSaved.quat);
  camera.fov = rideSaved.fov;
  camera.updateProjectionMatrix();
  controls.target.copy(rideSaved.target);
  targetCameraDistance = rideSaved.distance;
  controls.enabled = true;
  coasterTrain.visible = true;
  coasterRidePhase = 'off';
  controls.update();
}

function updateCoasterRide(dt) {
  if (coasterRidePhase === 'off') return;

  if (coasterRidePhase === 'exiting') {
    coasterRideBlend = Math.min(1, coasterRideBlend + dt / 1.15);
    const blend = smootherstep01(coasterRideBlend);
    camera.position.lerpVectors(rideExitFrom.pos, rideSaved.pos, blend);
    camera.quaternion.slerpQuaternions(rideExitFrom.quat, rideSaved.quat, blend);
    camera.fov = lerp(rideExitFrom.fov, rideSaved.fov, blend);
    camera.updateProjectionMatrix();
    if (coasterRideBlend >= 1) finishCoasterRide();
    return;
  }

  if (coasterRidePhase === 'riding') {
    const tangent = coasterCurve.getTangentAt(coasterRideU).normalize();
    const point = coasterCurve.getPointAt(coasterRideU);
    const slope = tangent.y;
    const heightNorm = clamp((point.y - 2.0) / 8.0, 0, 1);
    let targetSpeed = 4.9 + Math.max(0, -slope) * 4.8 - Math.max(0, slope) * 1.5 + heightNorm * 0.3;
    const lapProgress = coasterRideDistance / coasterLength;
    if (lapProgress > 0.9) {
      targetSpeed *= lerp(1, 0.58, clamp((lapProgress - 0.9) / 0.1, 0, 1));
    }
    targetSpeed = clamp(targetSpeed, 3.5, 9.0);
    coasterRideSpeed += (targetSpeed - coasterRideSpeed) * (1 - Math.exp(-2.3 * dt));
    coasterRideDistance += coasterRideSpeed * dt;
    coasterRideU = (RIDE_START_U + coasterRideDistance / coasterLength) % 1;
  }

  const point = coasterCurve.getPointAt(coasterRideU);
  const tangent = coasterCurve.getTangentAt(coasterRideU).normalize();
  const aheadU = (coasterRideU + RIDE_LOOK_AHEAD / coasterLength) % 1;
  rideAheadPoint.copy(coasterCurve.getPointAt(aheadU));
  rideLookDirection.copy(rideAheadPoint).sub(point).normalize().lerp(tangent, 0.3).normalize();
  if (coasterRidePhase === 'riding') {
    coasterRideForward.lerp(rideLookDirection, 1 - Math.exp(-8.0 * dt)).normalize();
  } else {
    coasterRideForward.copy(rideLookDirection);
  }
  updateRidePose(point, coasterRideForward);

  if (coasterRidePhase === 'entering') {
    coasterRideBlend = Math.min(1, coasterRideBlend + dt / 1.2);
    const blend = smootherstep01(coasterRideBlend);
    camera.position.lerpVectors(rideSaved.pos, ridePosePosition, blend);
    camera.quaternion.slerpQuaternions(rideSaved.quat, ridePoseQuaternion, blend);
    camera.fov = lerp(rideSaved.fov, RIDE_FOV, blend);
    camera.updateProjectionMatrix();
    if (coasterRideBlend >= 1) coasterRidePhase = 'riding';
    return;
  }

  camera.position.copy(ridePosePosition);
  camera.quaternion.copy(ridePoseQuaternion);
  if (Math.abs(camera.fov - RIDE_FOV) > 0.001) {
    camera.fov = RIDE_FOV;
    camera.updateProjectionMatrix();
  }
  if (coasterRideDistance >= coasterLength * 0.996) exitCoasterRide();
}

/* --------------------------------------------------------------------------
   Carousel
   -------------------------------------------------------------------------- */
assemblyPhase = 'carousel';
const carouselRoot = new THREE.Group();
carouselRoot.name = 'carousel';
carouselRoot.position.set(-10.2, 0, 7.0);
park.add(carouselRoot);

const carouselGold = toonMat(0xf3cd87, { emissive: 0x6a4819, emissiveIntensity: 0.55 });
const carouselStone = toonMat(0xe9dcf5, { map: stoneTex });
const carouselCream = toonMat(0xfff0cf);
const carouselPink = toonMat(0xffb8d6);
const carouselTeal = toonMat(0xa6e0e7);
const carouselWood = toonMat(0x9c6b86);

// static stone podium
const carouselBase = new THREE.Group();
carouselRoot.add(carouselBase);
addCyl(carouselBase, 4.3, 4.5, 0.58, 36, carouselStone, 0, 0.29, 0, { castShadow: false });
addCyl(carouselBase, 4.02, 4.06, 0.17, 36, carouselGold, 0, 0.67, 0, { castShadow: false });
for (let i = 0; i < 20; i++) {
  const a = i / 20 * TAU;
  addSphere(carouselBase, 0.1, brassBright, Math.cos(a) * 4.12, 0.69, Math.sin(a) * 4.12, { wSeg: 6, hSeg: 4, castShadow: false });
}
// entry steps on the path side
for (let i = 0; i < 3; i++) {
  addBox(carouselBase, 0.34, 0.16, 1.7 - i * 0.15, carouselStone, 4.25 + i * 0.35, 0.08 + i * 0.16, 1.25, { castShadow: false });
}
// gilt pilasters and medallions articulate the stone podium
for (let i = 0; i < 12; i++) {
  const a = i / 12 * TAU;
  addBox(carouselBase, 0.11, 0.44, 0.11, carouselGold,
    Math.cos(a) * 4.31, 0.45, Math.sin(a) * 4.31, { rotY: -a, castShadow: false });
  addSphere(carouselBase, 0.06, brassBright,
    Math.cos(a) * 4.31, 0.68, Math.sin(a) * 4.31, { wSeg: 6, hSeg: 4, castShadow: false });
  if (i % 2 === 0) {
    addBox(carouselBase, 0.13, 0.13, 0.05, carouselGold,
      Math.cos(a + 0.26) * 4.32, 0.32, Math.sin(a + 0.26) * 4.32, { rotY: -a, rotZ: Math.PI / 4, castShadow: false });
  }
}
addGlowPool(park, 0xff83ba, 5.3, -10.2, 7.0, 0.27, 0.9);
assemble(carouselBase, 11.05, 0.85, 'rise', { offset: -1.2, spin: 0.04 });

// rotating group
const carouselSpin = new THREE.Group();
carouselSpin.position.set(0, 0, 0);
carouselRoot.add(carouselSpin);

const carouselDeckGroup = new THREE.Group();
carouselSpin.add(carouselDeckGroup);
const carouselFloorTex = canvasTexture(1024, 1024, (ctx, w, h) => {
  const cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#3a2a4c';
  ctx.fillRect(0, 0, w, h);
  const wedges = 20;
  for (let i = 0; i < wedges; i++) {
    const a0 = i / wedges * TAU;
    const a1 = (i + 1) / wedges * TAU;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, w * 0.5, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#69517a' : '#e0bd82';
    ctx.fill();
  }
  // concentric ornamental rings
  for (const [r, color, lw] of [
    [w * 0.47, '#e8c683', 16],
    [w * 0.38, '#523c64', 12],
    [w * 0.3, '#f1dba2', 8],
    [w * 0.19, '#6d4b7a', 12],
    [w * 0.1, '#f3d18e', 8],
  ]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }
  // little decorative diamonds and star flowers
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * TAU;
    const r = w * 0.425;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a);
    ctx.fillStyle = '#422f52';
    ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(20, 0); ctx.lineTo(0, 22); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd995';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // center medallion
  const med = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.16);
  med.addColorStop(0, '#ffe7b5');
  med.addColorStop(0.5, '#c69458');
  med.addColorStop(1, '#4b315d');
  ctx.fillStyle = med;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.155, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f4d398';
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.12, 0, TAU); ctx.stroke();
  ctx.font = '700 62px Georgia, serif';
  ctx.fillStyle = '#4b2a47';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('☾', cx, cy + 3);
});
const carouselFloorMat = toonMat(0xffffff, { map: carouselFloorTex });
const carouselDeck = addCyl(carouselDeckGroup, 3.83, 3.83, 0.24, 36, carouselFloorMat, 0, 0.86, 0, { castShadow: true });
const carouselDeckTrim = addCyl(carouselDeckGroup, 3.9, 3.9, 0.14, 36, carouselGold, 0, 0.72, 0, { castShadow: false });
// painted apron panels hide the raw deck edge and add another layer of ornament
const carouselApronTex = canvasTexture(1024, 192, (ctx, w, h) => {
  ctx.fillStyle = '#382542';
  ctx.fillRect(0, 0, w, h);
  const panels = 16;
  for (let i = 0; i < panels; i++) {
    const x = i / panels * w;
    const pw = w / panels;
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, i % 2 ? '#70455f' : '#4d385f');
    grd.addColorStop(1, i % 2 ? '#3a243f' : '#2a1d3c');
    ctx.fillStyle = grd;
    ctx.fillRect(x + 3, 8, pw - 6, h - 16);
    ctx.strokeStyle = i % 3 === 0 ? '#e7c47d' : '#b28b57';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 8, 13, pw - 16, h - 26);
    ctx.fillStyle = '#f4d899';
    ctx.font = '700 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i % 2 ? '☾' : '★', x + pw / 2, h * 0.48);
    ctx.fillStyle = 'rgba(255,225,170,.55)';
    ctx.beginPath();
    ctx.arc(x + pw / 2, h * 0.82, 4, 0, TAU);
    ctx.fill();
  }
  const top = ctx.createLinearGradient(0, 0, 0, h);
  top.addColorStop(0, 'rgba(255,225,160,.28)');
  top.addColorStop(0.15, 'rgba(255,225,160,0)');
  top.addColorStop(0.85, 'rgba(0,0,0,0)');
  top.addColorStop(1, 'rgba(0,0,0,.3)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
});
const carouselApron = new THREE.Mesh(
  new THREE.CylinderGeometry(3.87, 3.87, 0.21, 36, 1, true),
  toonMat(0xffffff, { map: carouselApronTex, emissive: 0x201124, emissiveIntensity: 0.22 })
);
carouselApron.position.y = 0.85;
carouselApron.castShadow = false;
carouselDeckGroup.add(carouselApron);
// two painted perimeter benches fill the spaces between the horses
for (const [angle, backMat] of [[0.873, carouselPink], [4.015, carouselTeal]]) {
  const bench = new THREE.Group();
  bench.position.set(Math.cos(angle) * 3.06, 0.98, Math.sin(angle) * 3.06);
  bench.rotation.y = -angle - Math.PI / 2;
  carouselDeckGroup.add(bench);
  addBox(bench, 1.14, 0.11, 0.42, carouselWood, 0, 0.03, 0, { castShadow: false });
  addBox(bench, 1.14, 0.48, 0.07, backMat, 0, 0.33, -0.19, { castShadow: false });
  addBox(bench, 1.18, 0.06, 0.09, carouselGold, 0, 0.58, -0.19, { castShadow: false });
  addBox(bench, 1.02, 0.05, 0.18, carouselGold, 0, 0.01, 0.27, { castShadow: false });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(bench, 0.06, 0.22, 0.06, carouselWood, sx * 0.42, 0.12, sz * 0.13, { castShadow: false });
    }
    addBox(bench, 0.05, 0.05, 0.35, carouselGold, sx * 0.48, 0.32, 0, { castShadow: false });
  }
}
assemblePop(carouselDeckGroup, 11.3, 0.9, { spin: 0.12 });

// central gilded column and mirror drum
const carouselCoreGroup = new THREE.Group();
carouselSpin.add(carouselCoreGroup);
addCyl(carouselCoreGroup, 0.68, 0.9, 1.1, 16, carouselGold, 0, 1.4, 0, { castShadow: true });
addCyl(carouselCoreGroup, 0.48, 0.6, 2.18, 16, carouselCream, 0, 3.0, 0, { castShadow: true });
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU;
  addBox(carouselCoreGroup, 0.28, 1.55, 0.06, i % 2 ? carouselPink : carouselTeal, Math.cos(a) * 0.62, 2.9, Math.sin(a) * 0.62, { rotY: -a + Math.PI / 2, castShadow: false });
}
addCyl(carouselCoreGroup, 0.95, 0.95, 0.16, 16, carouselGold, 0, 4.15, 0, { castShadow: false });
addSphere(carouselCoreGroup, 0.34, basicMat(0xffcf82, { toneMapped: false }), 0, 4.3, 0, { wSeg: 12, hSeg: 8, castShadow: false });
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + Math.PI / 8;
  addSphere(carouselCoreGroup, 0.057, brassBright,
    Math.cos(a) * 0.64, 3.95, Math.sin(a) * 0.64, { wSeg: 6, hSeg: 4, castShadow: false });
  addCyl(carouselCoreGroup, 0.026, 0.026, 0.5, 6, carouselGold,
    Math.cos(a) * 0.69, 2.65, Math.sin(a) * 0.69, { castShadow: false });
}
assemble(carouselCoreGroup, 11.52, 0.9, 'scaleY', { spin: 0.14 });

// poles and horses
const carouselPoleGroup = new THREE.Group();
carouselSpin.add(carouselPoleGroup);
const carouselHorseGroup = new THREE.Group();
carouselSpin.add(carouselHorseGroup);
const horsePalette = [
  [0xfff1e0, 0xf0c47c, 0xf19ac4],
  [0xf7e3f3, 0x9edcd8, 0xb799e8],
  [0xffeef7, 0xffd18a, 0x9dc4f2],
  [0xfff5e4, 0xffaacb, 0x9bd7d2],
  [0xf8eaff, 0xafd8ff, 0xffd695],
  [0xfff1e8, 0xc9b0ff, 0xffaec8],
];
const carouselHorses = [];
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU + 0.35;
  const px = Math.cos(a) * 2.46;
  const pz = Math.sin(a) * 2.46;
  // brass pole
  addCyl(carouselPoleGroup, 0.045, 0.045, 3.4, 8, carouselGold, px, 2.4, pz, { castShadow: false });
  addCyl(carouselPoleGroup, 0.13, 0.15, 0.08, 8, carouselGold, px, 0.99, pz, { castShadow: false });
  addCyl(carouselPoleGroup, 0.083, 0.083, 0.07, 8, carouselGold, px, 1.04, pz, { castShadow: false });
  addCyl(carouselPoleGroup, 0.083, 0.083, 0.07, 8, carouselGold, px, 3.54, pz, { castShadow: false });
  addCone(carouselPoleGroup, 0.12, 0.35, 6, carouselGold, px, 4.15, pz, { castShadow: false });
  addSphere(carouselPoleGroup, 0.085, brassBright, px, 4.38, pz, { wSeg: 6, hSeg: 4, castShadow: false });
  const [bodyColor, saddleColor, accentColor] = horsePalette[i];
  const bodyMat = toonMat(bodyColor);
  const saddleMat = toonMat(saddleColor);
  const accentMat = toonMat(accentColor);
  const maneMat = toonMat(0xd99ad6, { emissive: 0x6a3b69, emissiveIntensity: 0.35 });
  const horse = new THREE.Group();
  horse.position.set(px, 0.92, pz);
  horse.rotation.y = -a;
  carouselHorseGroup.add(horse);
  const body = addSphere(horse, 0.55, bodyMat, 0, 0.38, 0, { wSeg: 12, hSeg: 9, sx: 0.66, sy: 0.68, sz: 1.2 });
  addSphere(horse, 0.34, bodyMat, 0, 0.92, 0.6, { wSeg: 10, hSeg: 8, sx: 0.65, sy: 0.84, sz: 1.1 });
  addBox(horse, 0.3, 0.52, 0.27, bodyMat, 0, 0.95, 0.42, { rotX: -0.45, castShadow: false });
  addSphere(horse, 0.24, bodyMat, 0, 1.27, 0.74, { wSeg: 10, hSeg: 8, sx: 0.7, sy: 0.75, sz: 1.2 });
  addBox(horse, 0.2, 0.18, 0.32, bodyMat, 0, 1.17, 0.98, { castShadow: false });
  addCone(horse, 0.065, 0.25, 5, bodyMat, -0.11, 1.48, 0.6, { castShadow: false });
  addCone(horse, 0.065, 0.25, 5, bodyMat, 0.11, 1.48, 0.6, { castShadow: false });
  // mane and tail
  addBox(horse, 0.08, 0.55, 0.3, maneMat, 0, 1.2, 0.48, { rotX: -0.4, castShadow: false });
  addCone(horse, 0.12, 0.65, 5, maneMat, 0, 0.52, -0.66, { rotX: Math.PI * 0.65, castShadow: false });
  // four legs
  for (const lx of [-0.22, 0.22]) {
    for (const lz of [-0.36, 0.36]) {
      addCyl(horse, 0.055, 0.085, 0.5, 6, bodyMat, lx, 0.12, lz, { castShadow: false });
    }
  }
  // saddle and blanket
  addBox(horse, 0.72, 0.1, 0.6, saddleMat, 0, 0.67, -0.04, { castShadow: false });
  addBox(horse, 0.52, 0.18, 0.45, accentMat, 0, 0.74, -0.06, { castShadow: false });
  // eyes and tiny golden bridle
  addSphere(horse, 0.035, basicMat(0x2a1d31), -0.14, 1.29, 0.86, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(horse, 0.035, basicMat(0x2a1d31), 0.14, 1.29, 0.86, { wSeg: 6, hSeg: 4, castShadow: false });
  addBox(horse, 0.25, 0.04, 0.05, carouselGold, 0, 1.18, 1.14, { castShadow: false });
  // layered mane, cheek straps, stirrups and gilded harness details
  for (let m = 0; m < 3; m++) {
    addCone(horse, 0.045, 0.2, 4, maneMat,
      0, 1.4 - m * 0.16, 0.52 + m * 0.045, { castShadow: false, rotX: -0.42 });
  }
  for (const sx of [-1, 1]) {
    addBox(horse, 0.022, 0.3, 0.022, carouselGold, sx * 0.13, 1.18, 1.02, { rotZ: sx * 0.13, castShadow: false });
    addBox(horse, 0.024, 0.24, 0.024, maneMat, sx * 0.39, 0.46, 0.03, { castShadow: false });
    addBox(horse, 0.09, 0.03, 0.1, carouselGold, sx * 0.39, 0.32, 0.03, { castShadow: false });
    addCyl(horse, 0.055, 0.06, 0.06, 6, carouselGold, sx * 0.38, 0.72, -0.02, { castShadow: false });
    addBox(horse, 0.12, 0.12, 0.04, accentMat, sx * 0.29, 0.54, -0.01, { rotY: 0.18, castShadow: false });
  }
  addBox(horse, 0.44, 0.032, 0.032, carouselGold, 0, 0.61, 0.33, { castShadow: false });
  addCyl(horse, 0.045, 0.055, 0.16, 6, carouselGold, 0, 0.83, 0.23, { rotX: -0.5, castShadow: false });
  addSphere(horse, 0.055, carouselGold, 0, 0.78, 0.31, { wSeg: 6, hSeg: 4, castShadow: false });
  for (const [lx, lz] of [[-0.22, -0.36], [0.22, -0.36], [-0.22, 0.36], [0.22, 0.36]]) {
    addCyl(horse, 0.062, 0.062, 0.055, 6, carouselGold, lx, 0.25, lz, { castShadow: false });
  }
  addCone(horse, 0.18, 0.3, 6, accentMat, 0, 0.47, -0.66, { castShadow: false, rotX: Math.PI * 0.62 });
  // unicorn horn and tiny flower crown
  addCone(horse, 0.045, 0.34, 6, carouselGold, 0, 1.62, 0.9, { castShadow: false, rotX: -0.32 });
  addGlow(horse, 0xffe3aa, 0.85, 0, 1.6, 0.92, 0.32);
  for (let f = 0; f < 3; f++) {
    addSphere(horse, 0.035, basicMat([0xffb4dc, 0xc5a8ff, 0xffe3a4][f], { toneMapped: false }), -0.1 + f * 0.1, 1.55, 0.72, { wSeg: 5, hSeg: 4, castShadow: false });
  }
  horse.userData.bobPhase = rand(0, TAU);
  horse.userData.baseY = 0.92;
  horse.visible = false;
  carouselHorses.push(horse);
  assemblePop(horse, 11.72 + i * 0.11, 0.65, { spin: (i % 2 ? 1 : -1) * 0.22 });
}
assemble(carouselPoleGroup, 11.55, 0.8, 'fade');

// canopy
const carouselCanopyGroup = new THREE.Group();
carouselSpin.add(carouselCanopyGroup);
const stripeTex = canvasTexture(1024, 512, (ctx, w, h) => {
  const stripes = 20;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 3 === 0 ? '#ffabd5' : i % 3 === 1 ? '#ffe2a5' : '#9ecfff';
    ctx.fillRect(i * w / stripes, 0, w / stripes + 1, h);
    ctx.fillStyle = 'rgba(54,34,72,.15)';
    ctx.fillRect(i * w / stripes, 0, 2, h);
  }
  // radial bands following cone UVs
  ctx.fillStyle = 'rgba(80,50,94,.12)';
  ctx.fillRect(0, 0, w, h * 0.2);
  ctx.fillStyle = 'rgba(255,240,190,.18)';
  ctx.fillRect(0, h * 0.38, w, 12);
  ctx.fillRect(0, h * 0.76, w, 6);
});
const canopyMat = toonMat(0xffffff, { map: stripeTex, emissive: 0x2e1526, emissiveIntensity: 0.25 });
const canopy = addCone(carouselCanopyGroup, 4.45, 2.1, 40, canopyMat, 0, 5.2, 0, { castShadow: true, openEnded: true });
// gold ribs under canopy
for (let i = 0; i < 10; i++) {
  const a = i / 10 * TAU;
  rodBetween(carouselCanopyGroup, [0, 6.23, 0], [Math.cos(a) * 4.35, 4.16, Math.sin(a) * 4.35], 0.032, carouselGold, 5);
}
// scalloped valance drum
const fasciaTex = canvasTexture(1024, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#73508c';
  ctx.fillRect(0, 0, w, h * 0.7);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x = i / n * w;
    ctx.fillStyle = i % 2 ? '#ffe2a8' : '#b78cdc';
    ctx.fillRect(x, 0, w / n / 2, h * 0.68);
    ctx.fillStyle = '#fff3cf';
    ctx.beginPath();
    ctx.arc(x + w / n / 2, h * 0.67, w / n * 0.27, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#a17ac4';
    ctx.beginPath();
    ctx.arc(x + w / n / 2, h * 0.67, w / n * 0.17, 0, Math.PI);
    ctx.fill();
  }
  // little painted panels
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) / 8 * w;
    ctx.fillStyle = '#e9d7b2';
    ctx.font = '42px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i % 2 ? '★' : '☾', x, h * 0.3);
  }
});
const fascia = new THREE.Mesh(
  new THREE.CylinderGeometry(4.3, 4.3, 0.85, 40, 1, true),
  new THREE.MeshBasicMaterial({ map: fasciaTex, transparent: true, side: THREE.DoubleSide, toneMapped: false })
);
fascia.position.y = 4.0;
fascia.castShadow = false;
carouselCanopyGroup.add(fascia);
// top finial star
const starShape = new THREE.Shape();
for (let i = 0; i < 10; i++) {
  const r = i % 2 === 0 ? 0.55 : 0.23;
  const a = i / 10 * TAU - Math.PI / 2;
  const x = Math.cos(a) * r;
  const y = Math.sin(a) * r;
  if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
}
starShape.closePath();
const carouselStarGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2 });
const carouselStar = new THREE.Mesh(carouselStarGeo, basicMat(0xffd582, { toneMapped: false }));
carouselStar.position.set(0, 6.8, 0);
carouselStar.rotation.z = 0.1;
carouselCanopyGroup.add(carouselStar);
addGlow(carouselCanopyGroup, 0xffd586, 4.2, 0, 6.7, 0, 0.35);
// gilded edge, rosettes and hanging pendants around the valance
const canopyTrim = new THREE.Mesh(new THREE.TorusGeometry(4.31, 0.035, 6, 60), carouselGold);
canopyTrim.rotation.x = Math.PI / 2;
canopyTrim.position.y = 3.59;
canopyTrim.castShadow = false;
carouselCanopyGroup.add(canopyTrim);
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + Math.PI / 8;
  addSphere(carouselCanopyGroup, 0.075, carouselGold,
    Math.cos(a) * 4.34, 4.05, Math.sin(a) * 4.34, { wSeg: 6, hSeg: 4, castShadow: false });
  addCone(carouselCanopyGroup, 0.055, 0.2, 5, carouselGold,
    Math.cos(a) * 4.23, 3.45, Math.sin(a) * 4.23, { rotX: Math.PI, castShadow: false });
}
assembleDrop(carouselCanopyGroup, 12.35, 1.1, { offset: 5, spin: 0.2 });

// canopy fairy lights (points around the rim)
assemblyPhase = 'lights';
const carouselLightCount = 36;
const clp = new Float32Array(carouselLightCount * 3);
const clc = new Float32Array(carouselLightCount * 3);
const cls = new Float32Array(carouselLightCount);
const clphase = new Float32Array(carouselLightCount);
const carouselLightPalette = [new THREE.Color(0xffe3a0), new THREE.Color(0xffa6d6), new THREE.Color(0xaad4ff)];
for (let i = 0; i < carouselLightCount; i++) {
  const a = i / carouselLightCount * TAU;
  clp[i * 3] = Math.cos(a) * 4.25;
  clp[i * 3 + 1] = 3.95 + (i % 2) * 0.22;
  clp[i * 3 + 2] = Math.sin(a) * 4.25;
  const col = carouselLightPalette[i % 3];
  clc[i * 3] = col.r; clc[i * 3 + 1] = col.g; clc[i * 3 + 2] = col.b;
  cls[i] = i % 3 === 0 ? 2.8 : 1.6;
  clphase[i] = rand(0, TAU);
}
const carouselLightGeo = new THREE.BufferGeometry();
carouselLightGeo.setAttribute('position', new THREE.BufferAttribute(clp, 3));
carouselLightGeo.setAttribute('aColor', new THREE.BufferAttribute(clc, 3));
carouselLightGeo.setAttribute('aSize', new THREE.BufferAttribute(cls, 1));
carouselLightGeo.setAttribute('aPhase', new THREE.BufferAttribute(clphase, 1));
const carouselLightMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (36.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = 0.55 + 0.45 * sin(uTime * 3.0 + aPhase);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uOpacity;
    void main(){
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vColor * (1.0 + a * 1.2), a * vAlpha * uOpacity);
    }
  `,
});
const carouselLights = new THREE.Points(carouselLightGeo, carouselLightMat);
carouselSpin.add(carouselLights);
assemble(carouselLights, 12.95, 0.8, 'fade');

// hanging gold lanterns around the rim
const carouselLanternGroup = new THREE.Group();
carouselSpin.add(carouselLanternGroup);
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU;
  addCyl(carouselLanternGroup, 0.015, 0.015, 0.45, 4, carouselGold, Math.cos(a) * 3.7, 3.7, Math.sin(a) * 3.7, { castShadow: false });
  addBox(carouselLanternGroup, 0.22, 0.25, 0.22, basicMat(0xffd48d, { toneMapped: false }), Math.cos(a) * 3.7, 3.43, Math.sin(a) * 3.7, { castShadow: false });
  addGlow(carouselLanternGroup, 0xffc06e, 1.05, Math.cos(a) * 3.7, 3.42, Math.sin(a) * 3.7, 0.4);
}
assemble(carouselLanternGroup, 12.9, 0.7, 'fade');

// entrance sign
assemblyPhase = 'carousel';
const carouselSignGroup = new THREE.Group();
carouselRoot.add(carouselSignGroup);
for (const z of [0.9, 1.55]) {
  addBox(carouselSignGroup, 0.18, 1.75, 0.18, carouselWood, 5.3, 0.92, z);
  addSphere(carouselSignGroup, 0.11, brassBright, 5.3, 1.85, z, { wSeg: 8, hSeg: 6, castShadow: false });
}
const carouselSignTex = canvasTexture(512, 160, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(31,20,43,.95)';
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 18); ctx.fill();
  ctx.strokeStyle = '#dcb576'; ctx.lineWidth = 5; ctx.stroke();
  ctx.font = '700 57px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffdf9b';
  ctx.fillText('CAROUSEL', w / 2, h * 0.45);
  ctx.font = '500 22px Georgia, serif';
  ctx.fillStyle = '#cba6d5';
  ctx.fillText('·  WISH UPON A STAR  ·', w / 2, h * 0.73);
});
addPlane(carouselSignGroup, 2.4, 0.75, new THREE.MeshBasicMaterial({ map: carouselSignTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 5.3, 1.35, 1.22, { rotY: Math.PI / 2 });
assemble(carouselSignGroup, 12.7, 0.7, 'drop', { offset: 2.5 });

// Carousel animation helper
function updateCarousel(time, dt) {
  carouselSpin.rotation.y += dt * 0.2;
  for (const horse of carouselHorses) {
    horse.position.y = horse.userData.baseY + Math.sin(time * 2.1 + horse.userData.bobPhase) * 0.18;
    horse.rotation.x = Math.sin(time * 1.4 + horse.userData.bobPhase) * 0.035;
  }
  carouselStar.rotation.y += dt * 0.9;
  carouselLightMat.uniforms.uTime.value = time;
}

/* --------------------------------------------------------------------------
   Haunted house and graveyard
   -------------------------------------------------------------------------- */
assemblyPhase = 'haunted';
const hauntedRoot = new THREE.Group();
hauntedRoot.name = 'hauntedHouse';
hauntedRoot.position.set(8.6, 0, 5.8);
park.add(hauntedRoot);

function gableRoofGeo(width, depth, height) {
  const s = new THREE.Shape();
  s.moveTo(-depth / 2, 0);
  s.lineTo(depth / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-width / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}
// Fairy-tale finial: every old "skull" ornament is now a rose-gold wishing star.
const wishingStarShape = new THREE.Shape();
for (let i = 0; i < 10; i++) {
  const a = -Math.PI / 2 + i * Math.PI / 5;
  const r = i % 2 === 0 ? 0.34 : 0.145;
  const x = Math.cos(a) * r;
  const y = Math.sin(a) * r;
  if (i === 0) wishingStarShape.moveTo(x, y);
  else wishingStarShape.lineTo(x, y);
}
wishingStarShape.closePath();
const wishingStarGeo = new THREE.ExtrudeGeometry(wishingStarShape, {
  depth: 0.075, bevelEnabled: true, bevelSegments: 2,
  bevelSize: 0.025, bevelThickness: 0.022, steps: 1, curveSegments: 3,
});
wishingStarGeo.center();
const wishingStarMat = toonMat(0xffe7ae, { emissive: 0xa36a22, emissiveIntensity: 0.95 });
const wishingStarHaloMat = new THREE.MeshBasicMaterial({
  color: 0xffb8e6, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
});
function makeSkull(scale = 1) {
  const g = new THREE.Group();
  const fairyPart = new THREE.Group();
  const star = new THREE.Mesh(wishingStarGeo, wishingStarMat);
  star.position.set(0, 0.18, 0);
  star.castShadow = false;
  fairyPart.add(star);
  const halo = new THREE.Mesh(wishingStarGeo, wishingStarHaloMat);
  halo.position.set(0, 0.18, -0.045);
  halo.scale.setScalar(1.22);
  fairyPart.add(halo);
  addSphere(fairyPart, 0.065, basicMat(0xfff6cc, { toneMapped: false }), 0, 0.18, 0.085, { wSeg: 8, hSeg: 6, castShadow: false });
  addGlow(fairyPart, 0xffd18a, 1.15, 0, 0.18, 0.16, 0.42);

  const halloweenPart = new THREE.Group();
  const bone = toonMat(0xd8cfb8, { emissive: 0x18150f, emissiveIntensity: 0.25 });
  const boneDark = basicMat(0x231c2b);
  bone.userData.themeLockColor = true;
  boneDark.userData.themeLockColor = true;
  addSphere(halloweenPart, 0.26, bone, 0, 0.22, 0, { wSeg: 12, hSeg: 9, sx: 1, sy: 1.08, sz: 0.92, castShadow: false });
  addBox(halloweenPart, 0.28, 0.18, 0.22, bone, 0, 0.03, 0.02, { castShadow: false });
  addBox(halloweenPart, 0.26, 0.06, 0.19, bone, 0, -0.05, 0.025, { castShadow: false });
  addSphere(halloweenPart, 0.075, boneDark, -0.09, 0.22, 0.2, { wSeg: 7, hSeg: 5, sx: 1.1, sy: 1.2, castShadow: false });
  addSphere(halloweenPart, 0.075, boneDark, 0.09, 0.22, 0.2, { wSeg: 7, hSeg: 5, sx: 1.1, sy: 1.2, castShadow: false });
  addCone(halloweenPart, 0.045, 0.12, 3, boneDark, 0, 0.11, 0.22, { castShadow: false, rotX: -Math.PI / 2 });
  for (let i = -2; i <= 2; i++) {
    addBox(halloweenPart, 0.035, 0.07, 0.03, boneDark, i * 0.045, -0.04, 0.195, { castShadow: false });
  }
  addGlow(halloweenPart, 0xb9ffd4, 0.9, 0, 0.2, 0.15, 0.2);

  fairyPart.visible = currentTheme === 'fairy';
  halloweenPart.visible = currentTheme === 'halloween';
  g.add(fairyPart, halloweenPart);
  g.scale.setScalar(scale);
  themePartGroups.push({ fairy: fairyPart, halloween: halloweenPart });
  themeExcludedRoots.push(g);
  return g;
}

// A fairy crown of wishing stars floats over the castle's tallest spire.
assemblyPhase = 'castle';
const castleCrownGroup = new THREE.Group();
castleCrownGroup.name = 'castleWishingCrown';
park.add(castleCrownGroup);
themeExcludedRoots.push(castleCrownGroup);
{
  // The main spire tip sits around world y=19.5 above the castle island.
  const bigStar = new THREE.Mesh(wishingStarGeo, wishingStarMat);
  bigStar.position.set(0, 20.35, -1.4);
  bigStar.scale.setScalar(1.7);
  bigStar.rotation.z = 0.1;
  castleCrownGroup.add(bigStar);
  addGlow(castleCrownGroup, 0xffd894, 5.2, 0, 20.4, -1.4, 0.34);
  for (const [x, y, z, s] of [
    [-3.1, 17.6, -0.1, 0.65], [3.4, 16.9, 0.4, 0.55],
    [-1.7, 18.2, 1.9, 0.46], [2.2, 17.8, -2.8, 0.42],
  ]) {
    const star = new THREE.Mesh(wishingStarGeo, wishingStarMat);
    star.position.set(x, y, z);
    star.scale.setScalar(s);
    star.rotation.set(0.1, 0.4, 0.08);
    castleCrownGroup.add(star);
    addGlow(castleCrownGroup, 0xffc4e8, 1.2, x, y, z, 0.26);
  }
}
assembleDrop(castleCrownGroup, 8.9, 1.15, { offset: 3.6, spin: 0.35 });
assemblyPhase = 'haunted';

const hauntedStone = toonMat(0xf4e3f3, { map: stoneDarkTex });
const hauntedStoneLight = toonMat(0xfff1fa);
const hauntedPlaster = toonMat(0xffd9ef);
const hauntedWood = toonMat(0xb988ad);
const hauntedWoodLight = toonMat(0xe1b8d2);
const hauntedRoofMat = toonMat(0xffe1f1, { map: roofTex, emissive: 0x6a2f58, emissiveIntensity: 0.4 });
const hauntedRoofDark = toonMat(0xaed7ff, { map: roofTex, emissive: 0x2a4c6e, emissiveIntensity: 0.36 });

// foundation
const hauntedFoundation = new THREE.Group();
hauntedRoot.add(hauntedFoundation);
addBox(hauntedFoundation, 6.3, 0.5, 4.9, hauntedStone, 0, 0.25, 0.0, { castShadow: false, receiveShadow: true });
for (let i = 0; i < 3; i++) {
  addBox(hauntedFoundation, 2.4 - i * 0.22, 0.14, 0.34, hauntedStoneLight, 0.25, 0.08 + i * 0.14, 2.55 + i * 0.34, { castShadow: false });
}
assemble(hauntedFoundation, 9.95, 0.8, 'rise', { offset: -1.0 });

// crooked main walls
const hauntedWalls = new THREE.Group();
hauntedRoot.add(hauntedWalls);
hauntedWalls.rotation.z = 0.018;
const mainBlock = addBox(hauntedWalls, 5.5, 2.8, 4.0, hauntedPlaster, 0, 1.95, -0.05);
addOutline(mainBlock, 1.012);
addBox(hauntedWalls, 4.95, 2.1, 3.5, hauntedStone, 0.08, 4.35, -0.3);
addBox(hauntedWalls, 5.3, 0.22, 3.8, hauntedWood, 0, 3.25, -0.06, { castShadow: false });
addBox(hauntedWalls, 5.2, 0.16, 3.6, hauntedWood, 0, 5.36, -0.24, { castShadow: false });
// crooked timber frame details
for (const x of [-2.3, 2.3]) {
  addBox(hauntedWalls, 0.16, 2.4, 0.16, hauntedWood, x, 2.0, 1.96, { castShadow: false });
  addBox(hauntedWalls, 0.16, 1.9, 0.16, hauntedWood, -x * 0.92, 4.5, 1.58, { castShadow: false });
}
addBox(hauntedWalls, 4.95, 0.11, 0.11, hauntedWood, 0, 1.25, 1.98, { castShadow: false });
addBox(hauntedWalls, 4.5, 0.1, 0.1, hauntedWood, 0, 4.0, 1.6, { castShadow: false });
// slanted beams
const beam1 = addBox(hauntedWalls, 0.12, 3.1, 0.1, hauntedWood, -1.1, 2.2, 2.0, { castShadow: false });
beam1.rotation.z = 0.62;
const beam2 = addBox(hauntedWalls, 0.12, 3.1, 0.1, hauntedWood, 1.15, 2.2, 2.0, { castShadow: false });
beam2.rotation.z = -0.62;
// front gable
const gable = new THREE.Mesh(gableRoofGeo(5.4, 3.6, 2.0), hauntedStone);
gable.position.set(0, 5.45, -0.3);
gable.castShadow = true;
hauntedWalls.add(gable);
addBox(hauntedWalls, 0.16, 2.0, 0.18, hauntedWood, 0, 6.25, 1.48, { castShadow: false });
assemble(hauntedWalls, 10.2, 1.25, 'scaleY');

// roof shapes
const hauntedRoof = new THREE.Group();
hauntedRoot.add(hauntedRoof);
const mainRoof = new THREE.Mesh(gableRoofGeo(5.9, 4.2, 2.45), hauntedRoofMat);
mainRoof.position.set(0, 5.35, -0.24);
mainRoof.castShadow = true;
hauntedRoof.add(mainRoof);
// roof shingle bands
for (let i = 0; i < 4; i++) {
  const y = 5.7 + i * 0.48;
  const dz = 1.45 - i * 0.28;
  addBox(hauntedRoof, 5.96, 0.09, 0.14, hauntedRoofDark, 0, y, -0.24 + dz, { castShadow: false });
  addBox(hauntedRoof, 5.96, 0.09, 0.14, hauntedRoofDark, 0, y, -0.24 - dz, { castShadow: false });
}
const hauntedSlateRidge = toonMat(0xffe6b4);
addBox(hauntedRoof, 6.0, 0.14, 0.18, hauntedSlateRidge, 0, 7.77, -0.24, { castShadow: false });
// front dormer
const dormer = new THREE.Group();
hauntedRoof.add(dormer);
dormer.position.set(-1.2, 6.1, 1.35);
addBox(dormer, 1.1, 0.9, 0.8, hauntedStone, 0, 0.45, 0);
const dormerRoof = new THREE.Mesh(gableRoofGeo(1.3, 1.15, 0.8), hauntedRoofDark);
dormerRoof.position.set(0, 0.87, 0);
dormerRoof.castShadow = false;
dormer.add(dormerRoof);
// crooked chimney
addBox(hauntedRoof, 0.7, 2.0, 0.7, hauntedStone, 2.1, 7.2, -1.0, { castShadow: true });
addBox(hauntedRoof, 0.85, 0.22, 0.85, hauntedStoneLight, 2.1, 8.23, -1.0, { castShadow: false });
addBox(hauntedRoof, 0.58, 0.1, 0.58, basicMat(0xffd7ee), 2.1, 8.38, -1.0, { castShadow: false });
assembleDrop(hauntedRoof, 10.75, 1.2, { offset: 5.5, spin: 0.06 });

// witch-hat tower on the left
const hauntedTower = new THREE.Group();
hauntedRoot.add(hauntedTower);
hauntedTower.position.set(-2.78, 0, -0.55);
const hTower = addCyl(hauntedTower, 1.05, 1.25, 6.9, 10, hauntedStone, 0, 3.55, 0);
addOutline(hTower, 1.02);
for (let i = 0; i < 3; i++) {
  addCyl(hauntedTower, 1.1 + i * 0.02, 1.2 + i * 0.02, 0.12, 10, hauntedWood, 0, 1.2 + i * 2.2, 0, { castShadow: false });
}
const hat = addCone(hauntedTower, 1.5, 3.5, 10, hauntedRoofDark, 0.12, 8.45, -0.1, { castShadow: true, rotZ: 0.06 });
addCyl(hauntedTower, 0.03, 0.03, 1.2, 4, brassMat, 0.28, 10.4, -0.2, { castShadow: false });
addSphere(hauntedTower, 0.09, basicMat(0xffe3a2, { toneMapped: false }), 0.28, 11.0, -0.2, { wSeg: 7, hSeg: 5, castShadow: false });
// little balcony
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU;
  addBox(hauntedTower, 0.12, 0.4, 0.12, hauntedWood, Math.cos(a) * 1.25, 6.3, Math.sin(a) * 1.25, { castShadow: false });
}
addCyl(hauntedTower, 1.35, 1.35, 0.1, 10, hauntedWood, 0, 6.52, 0, { castShadow: false });
assemble(hauntedTower, 11.1, 1.5, 'rise', { offset: -7.0, spin: -0.14 });

// chimney smoke source marker (actual particles are added with atmosphere)
const hauntedChimneyTop = new THREE.Vector3(2.1, 8.5, -1.0).applyMatrix4(new THREE.Matrix4().makeTranslation(8.6, 0, 5.8));

// porch
const hauntedPorch = new THREE.Group();
hauntedRoot.add(hauntedPorch);
addBox(hauntedPorch, 3.3, 0.28, 1.65, hauntedWoodLight, 0.25, 0.55, 2.4, { castShadow: false });
for (let i = 0; i < 3; i++) {
  addBox(hauntedPorch, 2.5 - i * 0.25, 0.12, 0.28, hauntedWood, 0.25, 0.18 + i * 0.12, 3.3 + i * 0.25, { castShadow: false });
}
for (const [x, tilt] of [[-1.1, 0.045], [1.65, -0.07]]) {
  const post = addBox(hauntedPorch, 0.18, 2.35, 0.18, hauntedWood, x, 1.7, 3.1, { castShadow: true });
  post.rotation.z = tilt;
  addCone(hauntedPorch, 0.15, 0.45, 4, hauntedWood, x, 2.95, 3.1, { castShadow: false, rotY: Math.PI / 4 });
}
// sagging porch roof
const porchRoof = addBox(hauntedPorch, 3.5, 0.22, 1.9, hauntedRoofDark, 0.25, 3.0, 2.45, { castShadow: true, rotZ: 0.05 });
addBox(hauntedPorch, 3.2, 0.1, 0.16, hauntedWood, 0.25, 2.79, 1.52, { castShadow: false });
// broken railing
for (let i = 0; i < 5; i++) {
  if (i === 2) continue;
  addBox(hauntedPorch, 0.08, 0.65, 0.08, hauntedWoodLight, -1.1 + i * 0.7, 0.95, 3.28, { castShadow: false });
}
addBox(hauntedPorch, 2.7, 0.08, 0.1, hauntedWood, 0.2, 1.22, 3.28, { castShadow: false, rotZ: -0.03 });
// crooked lantern
addBox(hauntedPorch, 0.06, 0.4, 0.06, brassMat, 1.45, 2.4, 3.2, { castShadow: false });
addBox(hauntedPorch, 0.24, 0.32, 0.24, basicMat(0xffd7f0, { toneMapped: false }), 1.45, 2.16, 3.2, { castShadow: false });
addGlow(hauntedPorch, 0xffa8dd, 1.9, 1.45, 2.16, 3.4, 0.36);
assemble(hauntedPorch, 11.35, 1.0, 'drop', { offset: 2.7 });

// door
const hauntedDoorGroup = new THREE.Group();
hauntedRoot.add(hauntedDoorGroup);
addBox(hauntedDoorGroup, 1.15, 2.15, 0.16, hauntedWood, 0.2, 1.55, 2.02, { castShadow: false });
addCone(hauntedDoorGroup, 0.2, 0.5, 6, hauntedStoneLight, 0.55, 2.6, 2.06, { castShadow: false });
for (let i = 0; i < 4; i++) {
  addBox(hauntedDoorGroup, 0.04, 1.6, 0.03, hauntedWoodLight, -0.1 + i * 0.22, 1.5, 2.13, { castShadow: false });
}
addSphere(hauntedDoorGroup, 0.06, brassBright, 0.5, 1.45, 2.14, { wSeg: 6, hSeg: 4, castShadow: false });
assemble(hauntedDoorGroup, 11.6, 0.7, 'pop');

// glowing windows
function hauntedWindowTexture(kind = 'ghost') {
  return canvasTexture(256, 384, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const arch = (pad) => {
      ctx.beginPath();
      ctx.moveTo(pad, h - pad);
      ctx.lineTo(pad, h * 0.36);
      ctx.quadraticCurveTo(w / 2, h * 0.02, w - pad, h * 0.36);
      ctx.lineTo(w - pad, h - pad);
      ctx.closePath();
    };
    ctx.fillStyle = '#d9b6d6';
    arch(4);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (kind === 'ghost') {
      g.addColorStop(0, '#ffe8ff');
      g.addColorStop(0.5, '#c476ae');
      g.addColorStop(1, '#5e3a78');
    } else {
      g.addColorStop(0, '#fff1bd');
      g.addColorStop(0.6, '#ffb58c');
      g.addColorStop(1, '#7a4368');
    }
    ctx.fillStyle = g;
    arch(19);
    ctx.fill();
    // A little wishing star glows in every cottage window.
    const starX = w * 0.5;
    const starY = h * 0.50;
    ctx.fillStyle = 'rgba(255,248,224,.94)';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? w * 0.15 : w * 0.065;
      const px = starX + Math.cos(a) * r;
      const py = starY + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,232,255,.8)';
    for (const [sx, sy, sr] of [[0.28, 0.3, 3], [0.72, 0.27, 2.4], [0.7, 0.66, 2.2], [0.3, 0.68, 2.7]]) {
      ctx.beginPath(); ctx.arc(w * sx, h * sy, sr, 0, TAU); ctx.fill();
    }
    // rose-gold mullions
    ctx.strokeStyle = 'rgba(126,75,112,.82)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w / 2, h - 22);
    ctx.moveTo(22, h * 0.64); ctx.lineTo(w - 22, h * 0.64);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,238,196,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.37, h * 0.13); ctx.lineTo(w * 0.44, h * 0.38); ctx.lineTo(w * 0.37, h * 0.54);
    ctx.stroke();
  });
}
const ghostWindowTex = hauntedWindowTexture('ghost');
const amberWindowTex = hauntedWindowTexture('amber');
const hauntedWindowMats = [];
function addHauntedWindow(parent, tex, w, h, x, y, z, rotY = 0) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
  });
  hauntedWindowMats.push(mat);
  return addPlane(parent, w, h, mat, x, y, z, { rotY });
}
const hauntedWindows = [];
hauntedWindows.push(addHauntedWindow(hauntedRoot, amberWindowTex, 1.05, 1.9, -1.15, 2.35, 1.98));
hauntedWindows.push(addHauntedWindow(hauntedRoot, ghostWindowTex, 0.95, 1.75, 1.15, 2.3, 1.98));
hauntedWindows.push(addHauntedWindow(hauntedRoot, ghostWindowTex, 0.85, 1.5, -1.15, 4.55, 1.53));
hauntedWindows.push(addHauntedWindow(hauntedRoot, amberWindowTex, 0.8, 1.42, 1.18, 4.55, 1.51));
const sideWindow = new THREE.Group();
hauntedWindows.push(addHauntedWindow(sideWindow, ghostWindowTex, 0.9, 1.65, 0, 2.4, 0));
sideWindow.position.set(2.77, 0, 0.25);
sideWindow.rotation.y = Math.PI / 2;
hauntedRoot.add(sideWindow);
hauntedWindows.push(addHauntedWindow(hauntedRoot, ghostWindowTex, 0.75, 1.5, -2.78, 4.5, 1.04));
// dormer tiny window
const dormerWindow = addHauntedWindow(hauntedRoof, amberWindowTex, 0.48, 0.7, -1.2, 6.3, 1.77);
hauntedWindows.push(dormerWindow);
for (let i = 0; i < hauntedWindows.length; i++) {
  assemblePop(hauntedWindows[i], 11.7 + i * 0.055, 0.5);
}
// boarded window at ground floor (not glowing)
for (const [x, y] of [[-1.1, 1.2], [1.15, 1.15]]) {
  addBox(hauntedRoot, 1.15, 0.2, 0.12, hauntedWoodLight, x, y, 2.06, { castShadow: false, rotZ: -0.08 });
  addBox(hauntedRoot, 1.1, 0.18, 0.11, hauntedWood, x, y + 0.28, 2.06, { castShadow: false, rotZ: 0.06 });
}

// hanging sign over the door
const hauntedSignGroup = new THREE.Group();
hauntedRoot.add(hauntedSignGroup);
addBox(hauntedSignGroup, 2.7, 0.12, 0.14, hauntedWood, 0.25, 3.18, 2.9, { castShadow: false });
for (const x of [-0.95, 1.45]) {
  addCyl(hauntedSignGroup, 0.018, 0.018, 0.5, 4, brassMat, x, 2.94, 2.9, { castShadow: false });
}
const hhSignTex = canvasTexture(512, 192, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(75,37,79,.94)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 15); ctx.fill();
  ctx.strokeStyle = '#ffd68e'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '700 42px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffecc0';
  ctx.fillText('SUGARPLUM COTTAGE', w / 2, h * 0.42);
  ctx.font = '500 23px Georgia, serif';
  ctx.fillStyle = '#ffc5e9';
  ctx.fillText('SWEET DREAMS AWAIT', w / 2, h * 0.7);
});
addPlane(hauntedSignGroup, 2.55, 0.95, new THREE.MeshBasicMaterial({ map: hhSignTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }), 0.25, 2.38, 2.96);
const ghostSign = makeSkull(0.7);
ghostSign.position.set(-1.7, 3.18, 2.95);
hauntedSignGroup.add(ghostSign);
assemble(hauntedSignGroup, 12.0, 0.7, 'drop', { offset: 3 });

const hauntedDetails = new THREE.Group();
hauntedRoot.add(hauntedDetails);
// skulls on gate posts
for (const sx of [-1, 1]) {
  addBox(hauntedDetails, 0.45, 1.25, 0.45, hauntedStone, 0.25 + sx * 2.6, 0.72, 3.25, { castShadow: false });
  const sk = makeSkull(0.8);
  sk.position.set(0.25 + sx * 2.6, 1.45, 3.25);
  sk.rotation.y = sx * 0.25;
  hauntedDetails.add(sk);
}
// pumpkins on porch
for (let i = 0; i < 3; i++) {
  const p = new THREE.Group();
  p.position.set(-0.9 + i * 0.7, 0.72, 2.8);
  hauntedDetails.add(p);
  addSphere(p, 0.26, basicMat(0xff9b4b, { toneMapped: false }), 0, 0.18, 0, { wSeg: 10, hSeg: 8, castShadow: false });
  addCyl(p, 0.03, 0.04, 0.15, 5, toonMat(0x3b3a20), 0, 0.4, 0, { castShadow: false });
  addGlow(p, 0xff8e3a, 1.1, 0, 0.2, 0.1, 0.35);
}
// decorative ghost dolls near the porch
for (const [x, y, z, s] of [[-1.9, 2.1, 2.4, 0.38], [2.1, 3.0, 2.45, 0.32]]) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffd4ee, transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false });
  addSphere(g, s, ghostMat, 0, 0, 0, { wSeg: 10, hSeg: 8, sy: 1.1, castShadow: false });
  addCone(g, s * 0.9, s * 1.2, 8, ghostMat, 0, -s * 0.9, 0, { castShadow: false, rotX: Math.PI });
  addSphere(g, s * 0.13, basicMat(0x8d5f9b), -s * 0.26, s * 0.1, s * 0.9, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(g, s * 0.13, basicMat(0x8d5f9b), s * 0.26, s * 0.1, s * 0.9, { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(g, 0xffc6ea, 1.1, 0, 0, 0.2, 0.2);
  hauntedDetails.add(g);
}
assemble(hauntedDetails, 12.1, 0.75, 'fade');

// Fine haunted-house dressing: crooked shutters, cobwebs, a skull weathervane,
// porch rocker, hanging cage and an extra tower window.
const hauntedExtras = new THREE.Group();
hauntedRoot.add(hauntedExtras);
for (let i = 0; i < 4; i++) {
  const [x, y, z, w, h] = [
    [-1.15, 2.35, 1.98, 1.05, 1.9],
    [1.15, 2.3, 1.98, 0.95, 1.75],
    [-1.15, 4.55, 1.53, 0.85, 1.5],
    [1.18, 4.55, 1.51, 0.8, 1.42],
  ][i];
  addBox(hauntedExtras, 0.065, h + 0.18, 0.1, hauntedWood, x - w / 2 - 0.065, y, z + 0.045, { castShadow: false });
  addBox(hauntedExtras, 0.065, h + 0.18, 0.1, hauntedWood, x + w / 2 + 0.065, y, z + 0.045, { castShadow: false });
  addBox(hauntedExtras, w + 0.25, 0.08, 0.12, hauntedWoodLight, x, y + h / 2 + 0.06, z + 0.05, { castShadow: false });
  addBox(hauntedExtras, w + 0.28, 0.07, 0.16, hauntedWood, x, y - h / 2 - 0.045, z + 0.06, { castShadow: false });
  for (const sx of [-1, 1]) {
    if (i === 3 && sx === 1) continue;
    const shutter = addBox(hauntedExtras, 0.23, h * 0.84, 0.055, hauntedWoodLight,
      x + sx * (w / 2 + 0.26), y, z + 0.035, { rotZ: sx * (i % 2 ? 0.045 : -0.035), castShadow: false });
    for (let s = -1; s <= 1; s++) {
      addBox(hauntedExtras, 0.18, 0.022, 0.028, hauntedWood,
        x + sx * (w / 2 + 0.26), y + s * h * 0.23, z + 0.067, { rotZ: shutter.rotation.z, castShadow: false });
    }
    addSphere(hauntedExtras, 0.035, brassMat, x + sx * (w / 2 + 0.26), y - h * 0.35, z + 0.07, { wSeg: 6, hSeg: 4, castShadow: false });
  }
}

// corner cobwebs
const cobwebTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.12;
  const cy = h * 0.12;
  ctx.strokeStyle = 'rgba(221,232,235,.68)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 0.52;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * w * 0.9, cy + Math.sin(a) * h * 0.9);
    ctx.stroke();
  }
  for (let r = 1; r <= 5; r++) {
    const radius = r * w * 0.085;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 0.52);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(28,22,31,.85)';
  ctx.beginPath();
  ctx.arc(cx + w * 0.21, cy + h * 0.22, 3.2, 0, TAU);
  ctx.fill();
});
const cobwebMat = new THREE.MeshBasicMaterial({
  map: cobwebTex, transparent: true, opacity: 0.55, depthWrite: false,
  side: THREE.DoubleSide, toneMapped: false, visible: false,
});
for (const [x, y, rotate] of [[-2.55, 5.06, 0.14], [2.55, 4.92, -0.1], [-1.4, 2.9, 0.08]]) {
  const web = addPlane(hauntedExtras, 1.05, 1.05, cobwebMat, x, y, 2.025, { rotZ: rotate });
  web.castShadow = false;
}

// skull-topped weathervane above the witch-hat tower
addCyl(hauntedExtras, 0.018, 0.024, 0.95, 5, brassMat, -2.5, 11.35, -0.75, { castShadow: false });
addBox(hauntedExtras, 0.84, 0.035, 0.035, brassMat, -2.5, 11.62, -0.75, { castShadow: false });
addCone(hauntedExtras, 0.1, 0.34, 4, brassMat, -2.0, 11.62, -0.75, { rotZ: -Math.PI / 2, castShadow: false });
addCone(hauntedExtras, 0.075, 0.22, 4, brassMat, -2.95, 11.62, -0.75, { rotZ: Math.PI / 2, castShadow: false });
const vaneSkull = makeSkull(0.27);
vaneSkull.position.set(-2.5, 11.8, -0.75);
vaneSkull.rotation.y = 0.3;
hauntedExtras.add(vaneSkull);

// sagging, exposed rafter ends at the front eaves
for (const [x, y, z, rz] of [[-2.2, 5.42, 1.82, 0.16], [-0.75, 5.37, 1.9, -0.1], [0.95, 5.39, 1.87, 0.13], [2.25, 5.44, 1.8, -0.17]]) {
  addBox(hauntedExtras, 0.15, 0.055, 0.6, hauntedWood, x, y, z, { rotX: -0.15, rotZ: rz, castShadow: false });
}

// crooked porch rocking chair
const porchChair = new THREE.Group();
porchChair.position.set(1.28, 0.7, 2.62);
porchChair.rotation.y = -0.45;
hauntedExtras.add(porchChair);
addBox(porchChair, 0.52, 0.065, 0.4, hauntedWood, 0, 0.25, 0, { castShadow: false });
addBox(porchChair, 0.48, 0.46, 0.06, hauntedWoodLight, 0, 0.49, -0.18, { rotX: -0.08, castShadow: false });
for (const sx of [-1, 1]) {
  addBox(porchChair, 0.045, 0.27, 0.045, hauntedWood, sx * 0.21, 0.1, 0.15, { castShadow: false });
  addBox(porchChair, 0.045, 0.27, 0.045, hauntedWood, sx * 0.21, 0.1, -0.15, { castShadow: false });
  addBox(porchChair, 0.045, 0.045, 0.44, hauntedWoodLight, sx * 0.27, 0.38, 0, { castShadow: false });
  addBox(porchChair, 0.055, 0.035, 0.64, hauntedWood, sx * 0.22, -0.01, 0, { rotX: 0.05, castShadow: false });
}

// hanging iron cage with a little skull
addCyl(hauntedExtras, 0.012, 0.012, 0.34, 4, brassMat, -1.72, 2.82, 2.9, { castShadow: false });
addCyl(hauntedExtras, 0.18, 0.18, 0.025, 10, brassMat, -1.72, 2.65, 2.9, { castShadow: false });
addCyl(hauntedExtras, 0.18, 0.18, 0.025, 10, brassMat, -1.72, 2.37, 2.9, { castShadow: false });
for (let i = 0; i < 5; i++) {
  const a = i / 5 * TAU;
  addBox(hauntedExtras, 0.012, 0.28, 0.012, brassMat,
    -1.72 + Math.cos(a) * 0.15, 2.51, 2.9 + Math.sin(a) * 0.15, { castShadow: false });
}
const cageSkull = makeSkull(0.2);
cageSkull.position.set(-1.72, 2.5, 2.9);
cageSkull.rotation.y = Math.PI;
hauntedExtras.add(cageSkull);
addGlow(hauntedExtras, 0xffc58a, 1.15, -1.72, 2.56, 3.05, 0.23);

// one extra high window on the leaning tower
addHauntedWindow(hauntedExtras, ghostWindowTex, 0.52, 1.12, -2.78, 4.8, 0.54, 0);

// a second vane on the main gable reads clearly from the park's central path
addCyl(hauntedExtras, 0.016, 0.021, 0.72, 5, brassMat, 1.35, 7.86, -0.24, { castShadow: false });
addBox(hauntedExtras, 0.66, 0.03, 0.03, brassMat, 1.35, 8.08, -0.24, { castShadow: false });
addCone(hauntedExtras, 0.085, 0.28, 4, brassMat, 1.76, 8.08, -0.24, { rotZ: -Math.PI / 2, castShadow: false });
addCone(hauntedExtras, 0.055, 0.16, 4, brassMat, 1.0, 8.08, -0.24, { rotZ: Math.PI / 2, castShadow: false });
const gableSkull = makeSkull(0.2);
gableSkull.position.set(1.35, 8.23, -0.24);
gableSkull.rotation.y = -0.5;
hauntedExtras.add(gableSkull);

assemble(hauntedExtras, 12.25, 0.85, 'fade');

addGlowPool(park, 0xffb8e0, 4.0, 8.6, 6.8, 0.19, 0.8);

/* --------------------------------------------------------------------------
   Little graveyard behind the house
   -------------------------------------------------------------------------- */
const graveyardRoot = new THREE.Group();
graveyardRoot.position.set(10.5, 0, 1.85);
park.add(graveyardRoot);
const graveStone = toonMat(0xd8e4ff, { map: stoneDarkTex, emissive: 0x5b4b8e, emissiveIntensity: 0.5 });
graveyardRoot.add(new THREE.Group());
for (let i = 0; i < 6; i++) {
  const x = -1.9 + (i % 3) * 1.85 + rand(-0.12, 0.12);
  const z = -0.8 + Math.floor(i / 3) * 1.65 + rand(-0.08, 0.08);
  const h = rand(0.75, 1.2);
  const tomb = addBox(graveyardRoot, rand(0.55, 0.8), h, 0.18, graveStone, x, h / 2, z, { castShadow: false });
  tomb.rotation.z = rand(-0.06, 0.06);
  if (i % 3 === 0) {
    addBox(graveyardRoot, 0.16, h * 0.8, 0.18, graveStone, x, h / 2 + 0.08, z, { castShadow: false });
    addBox(graveyardRoot, 0.56, 0.14, 0.18, graveStone, x, h * 0.68, z, { castShadow: false });
  } else {
    addCyl(graveyardRoot, 0.36, 0.36, 0.18, 12, graveStone, x, h, z, { rotX: Math.PI / 2, castShadow: false });
  }
}
addSphere(graveyardRoot, 0.18, basicMat(0xffd39a, { toneMapped: false }), 0.2, 0.45, 0.2, { wSeg: 8, hSeg: 6, castShadow: false });
addGlow(graveyardRoot, 0xffb8e4, 1.8, 0.2, 0.5, 0.2, 0.25);
assemble(graveyardRoot, 11.5, 0.9, 'rise', { offset: -0.8 });

// a warped iron fence around the graves
const graveFence = new THREE.Group();
graveFence.position.set(10.5, 0, 1.85);
park.add(graveFence);
for (let i = 0; i < 10; i++) {
  const x = -2.4 + i * 0.55;
  addCyl(graveFence, 0.025, 0.035, 0.75, 4, toonMat(0xd8b9e8), x, 0.38, 1.75, { castShadow: false });
}
addCyl(graveFence, 0.02, 0.025, 5.2, 4, toonMat(0xd8b9e8), 0, 0.63, 1.75, { rotZ: Math.PI / 2, castShadow: false });
for (let i = 0; i < 6; i++) {
  const x = -2.5 + i * 1.0;
  addCyl(graveFence, 0.02, 0.03, 0.75, 4, toonMat(0xd8b9e8), x, 0.38, -1.65, { castShadow: false });
}
addCyl(graveFence, 0.02, 0.025, 5.2, 4, toonMat(0xd8b9e8), 0, 0.63, -1.65, { rotZ: Math.PI / 2, castShadow: false });
assemble(graveFence, 11.9, 0.7, 'fade');

/* --------------------------------------------------------------------------
   Perimeter fence
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const fenceIronMat = toonMat(0xd8b98c, { emissive: 0x3b2814, emissiveIntensity: 0.25 });
const fenceStoneMat = toonMat(0x5e5671, { map: stoneDarkTex });
const fenceLampPositions = [];

function buildFenceSegment(x1, z1, x2, z2, start, withGate = false) {
  const group = new THREE.Group();
  park.add(group);
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const ironGeos = [];
  const stoneGeos = [];
  // lower and upper iron rails
  for (const yy of [0.34, 1.13]) {
    const rail = new THREE.BoxGeometry(len, 0.07, 0.07);
    rail.rotateY(-angle);
    rail.translate((x1 + x2) / 2, yy, (z1 + z2) / 2);
    ironGeos.push(rail);
  }
  // pickets
  const step = 0.48;
  const count = Math.floor(len / step);
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const px = lerp(x1, x2, t);
    const pz = lerp(z1, z2, t);
    const bar = new THREE.BoxGeometry(0.042, 1.17, 0.042);
    bar.translate(px, 0.73, pz);
    ironGeos.push(bar);
    const spike = new THREE.ConeGeometry(0.075, 0.22, 4);
    spike.rotateY(Math.PI / 4);
    spike.translate(px, 1.39, pz);
    ironGeos.push(spike);
  }
  // stone pillars along the fence
  const postCount = Math.max(1, Math.round(len / 5.0));
  for (let i = 0; i <= postCount; i++) {
    const t = i / postCount;
    const px = lerp(x1, x2, t);
    const pz = lerp(z1, z2, t);
    const body = new THREE.BoxGeometry(0.46, 1.55, 0.46);
    body.translate(px, 0.79, pz);
    stoneGeos.push(body);
    const base = new THREE.BoxGeometry(0.62, 0.18, 0.62);
    base.translate(px, 0.1, pz);
    stoneGeos.push(base);
    const cap = new THREE.ConeGeometry(0.38, 0.46, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(px, 1.78, pz);
    stoneGeos.push(cap);
    if (i % 2 === 0) {
      fenceLampPositions.push([px, 2.18, pz]);
    }
  }
  const iron = new THREE.Mesh(mergeGeometries(ironGeos), fenceIronMat);
  iron.castShadow = true;
  iron.receiveShadow = false;
  group.add(iron);
  const stone = new THREE.Mesh(mergeGeometries(stoneGeos), fenceStoneMat);
  stone.castShadow = false;
  stone.receiveShadow = true;
  group.add(stone);
  assemble(group, start, 0.8, 'fade');
  return group;
}

buildFenceSegment(-19.1, -19.1, 19.1, -19.1, 2.3);
buildFenceSegment(-19.1, 19.1, -3.05, 19.1, 2.42);
buildFenceSegment(3.05, 19.1, 19.1, 19.1, 2.52);
buildFenceSegment(-19.1, -19.1, -19.1, 19.1, 2.62);
buildFenceSegment(19.1, -19.1, 19.1, 19.1, 2.75);

// pumpkin lamps along the perimeter
assemblyPhase = 'lights';
const fenceLampGroup = new THREE.Group();
park.add(fenceLampGroup);
for (let i = 0; i < fenceLampPositions.length; i++) {
  const [x, y, z] = fenceLampPositions[i];
  addSphere(fenceLampGroup, 0.15, basicMat(0xffab54, { toneMapped: false }), x, y, z, { wSeg: 8, hSeg: 6, castShadow: false });
  addGlow(fenceLampGroup, 0xff9b3f, 1.2, x, y, z, 0.38);
}
assemble(fenceLampGroup, 2.9, 0.9, 'fade');

/* --------------------------------------------------------------------------
   Entrance gate
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const gateRoot = new THREE.Group();
gateRoot.name = 'entranceGate';
park.add(gateRoot);
const gateStone = toonMat(0xefe2f8, { map: stoneTex });
const gateStoneDark = toonMat(0xc8b0e2, { map: stoneDarkTex });
const gateGold = toonMat(0xf4cb85, { emissive: 0x684516, emissiveIntensity: 0.55 });
const gateIron = toonMat(0xd8b47e, { emissive: 0x3a2611, emissiveIntensity: 0.25 });

for (const sx of [-1, 1]) {
  addBox(gateRoot, 1.0, 0.32, 1.0, gateStoneDark, sx * 2.85, 0.16, 18.88, { castShadow: false });
  addBox(gateRoot, 0.72, 2.8, 0.72, gateStone, sx * 2.85, 1.75, 18.88);
  addBox(gateRoot, 0.82, 0.15, 0.82, gateStoneDark, sx * 2.85, 3.13, 18.88, { castShadow: false });
  addBox(gateRoot, 0.82, 0.15, 0.82, gateGold, sx * 2.85, 0.42, 18.88, { castShadow: false });
  for (let i = 0; i < 2; i++) {
    addCone(gateRoot, 0.16, 0.65, 4, gateStoneDark, sx * 2.85, 3.55 + i * 0.45, 18.88, { castShadow: false, rotY: Math.PI / 4 });
  }
  addSphere(gateRoot, 0.24, basicMat(0xffa44e, { toneMapped: false }), sx * 2.85, 3.35, 18.88, { wSeg: 9, hSeg: 7, castShadow: false });
  addGlow(gateRoot, 0xff9a3d, 1.75, sx * 2.85, 3.4, 18.95, 0.42);
  // lantern hanging from each pillar
  addCyl(gateRoot, 0.02, 0.02, 0.55, 4, gateGold, sx * 1.95, 2.3, 18.88, { castShadow: false });
  addBox(gateRoot, 0.3, 0.4, 0.3, basicMat(0xffc066, { toneMapped: false }), sx * 1.95, 1.86, 18.88, { castShadow: false });
  addCone(gateRoot, 0.25, 0.24, 4, gateGold, sx * 1.95, 2.18, 18.88, { castShadow: false, rotY: Math.PI / 4 });
  addGlow(gateRoot, 0xffaa54, 1.45, sx * 1.95, 1.86, 18.95, 0.4);
  // side banner pole
  addCyl(gateRoot, 0.03, 0.03, 1.6, 5, gateIron, sx * 3.55, 2.75, 18.88, { castShadow: false });
}

// pointed iron arch
const gateArchCurve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(-2.85, 3.42, 18.88),
  new THREE.Vector3(0, 5.25, 18.88),
  new THREE.Vector3(2.85, 3.42, 18.88)
);
const gateArch = new THREE.Mesh(new THREE.TubeGeometry(gateArchCurve, 44, 0.085, 6, false), gateIron);
gateRoot.add(gateArch);
const gateArch2 = new THREE.Mesh(new THREE.TubeGeometry(gateArchCurve, 44, 0.032, 5, false), gateGold);
gateArch2.position.y = 0.17;
gateArch2.scale.set(0.86, 0.86, 1);
gateArch2.position.x = 0;
gateArch2.position.z = 0;
gateRoot.add(gateArch2);
for (let i = 0; i < 14; i++) {
  const p = gateArchCurve.getPoint(i / 13);
  addSphere(gateRoot, 0.08, basicMat(i % 2 ? 0xffb65f : 0xf0d5a0, { toneMapped: false }), p.x, p.y + 0.12, p.z + 0.04, { wSeg: 6, hSeg: 4, castShadow: false });
}
const gateSignTex = canvasTexture(1024, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(64,31,74,.96)';
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 22); ctx.fill();
  ctx.strokeStyle = '#f1c77c'; ctx.lineWidth = 8; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,235,.45)'; ctx.lineWidth = 2; ctx.strokeRect(19, 19, w - 38, h - 38);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#e0b56e');
  grad.addColorStop(0.34, '#fff5d6');
  grad.addColorStop(0.7, '#ffc7e9');
  grad.addColorStop(1, '#c7b0ff');
  ctx.fillStyle = grad;
  ctx.font = '700 100px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('DREAM NIGHT', w / 2, h * 0.46);
  ctx.font = '500 30px Georgia, serif';
  ctx.fillStyle = '#ffd6ef';
  ctx.fillText('WHERE WISHES TAKE FLIGHT', w / 2, h * 0.77);
});
addBox(gateRoot, 5.4, 1.45, 0.16, gateStoneDark, 0, 4.22, 18.88, { castShadow: false });
addPlane(gateRoot, 5.15, 1.22, new THREE.MeshBasicMaterial({ map: gateSignTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 0, 4.22, 18.98);
addGlow(gateRoot, 0xffd598, 4.0, 0, 4.2, 19.04, 0.22);
assemble(gateRoot, 12.25, 1.15, 'drop', { offset: 5.0 });

/* --------------------------------------------------------------------------
   Ticket booth
   -------------------------------------------------------------------------- */
assemblyPhase = 'pumpkins';
const ticketRoot = new THREE.Group();
ticketRoot.name = 'ticketBooth';
ticketRoot.position.set(4.15, 0, 16.15);
ticketRoot.rotation.y = 0.16;
park.add(ticketRoot);

const ticketBoothWood = toonMat(0xa97ea2);
const ticketBoothDark = toonMat(0x7c5b8d);
const ticketBoothCream = toonMat(0xffe7c1);
const ticketBoothGlow = basicMat(0xffb45e, { toneMapped: false });
addBox(ticketRoot, 2.5, 0.24, 2.15, toonMat(0x4b405c), 0, 0.12, 0, { castShadow: false });
addBox(ticketRoot, 2.25, 1.75, 1.75, ticketBoothWood, 0, 1.0, -0.05, { castShadow: true });
addBox(ticketRoot, 2.4, 0.18, 1.9, ticketBoothCream, 0, 1.92, -0.05, { castShadow: false });
// warm window and counter
addBox(ticketRoot, 1.65, 0.9, 0.08, ticketBoothGlow, 0, 1.28, 0.84, { castShadow: false });
addBox(ticketRoot, 1.8, 0.13, 0.38, ticketBoothWood, 0, 0.8, 0.95, { castShadow: false });
for (let i = 0; i < 4; i++) {
  addBox(ticketRoot, 0.045, 0.8, 0.05, ticketBoothDark, -0.62 + i * 0.42, 1.29, 0.9, { castShadow: false });
}
// side decoration
for (const sx of [-1, 1]) {
  addBox(ticketRoot, 0.18, 1.55, 0.18, ticketBoothDark, sx * 1.15, 1.1, 0.9, { castShadow: false });
  addSphere(ticketRoot, 0.08, ticketBoothGlow, sx * 1.15, 1.98, 0.9, { wSeg: 6, hSeg: 4, castShadow: false });
}
// pointed canopy roof
const ticketRoof = new THREE.Mesh(gableRoofGeo(2.7, 2.25, 0.95), hauntedRoofDark);
ticketRoof.position.set(0, 2.0, -0.05);
ticketRoof.castShadow = true;
ticketRoot.add(ticketRoof);
addBox(ticketRoot, 2.9, 0.13, 0.16, gateGold, 0, 2.6, 0.28, { castShadow: false });
const ticketPumpkin = new THREE.Group();
ticketPumpkin.position.set(0, 2.6, 0);
ticketRoot.add(ticketPumpkin);
addSphere(ticketPumpkin, 0.28, basicMat(0xffa653, { toneMapped: false }), 0, 0.22, 0, { wSeg: 12, hSeg: 9, sy: 0.9, castShadow: false });
addCyl(ticketPumpkin, 0.035, 0.05, 0.2, 5, toonMat(0x3b3a20), 0, 0.47, 0, { castShadow: false });
addGlow(ticketPumpkin, 0xff993c, 1.9, 0, 0.28, 0.05, 0.45);
// tickets sign
const ticketSignTex = canvasTexture(512, 180, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(25,17,34,.96)';
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 16); ctx.fill();
  ctx.strokeStyle = '#d7ad6e'; ctx.lineWidth = 5; ctx.stroke();
  ctx.font = '700 67px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd998';
  ctx.fillText('TICKETS', w / 2, h * 0.45);
  ctx.font = '500 23px Georgia, serif';
  ctx.fillStyle = '#c9a9d1';
  ctx.fillText('ADMIT ONE  ·  AFTER DARK', w / 2, h * 0.74);
});
const ticketSign = addPlane(ticketRoot, 1.75, 0.64, new THREE.MeshBasicMaterial({ map: ticketSignTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 0, 2.05, 0.98);
addGlow(ticketRoot, 0xffc06c, 2.2, 0, 2.1, 1.05, 0.22);
// queue posts
for (let i = 0; i < 4; i++) {
  addCyl(ticketRoot, 0.035, 0.045, 0.7, 5, gateGold, -1.3 + i * 0.85, 0.37, 1.45, { castShadow: false });
  addSphere(ticketRoot, 0.07, brassBright, -1.3 + i * 0.85, 0.76, 1.45, { wSeg: 6, hSeg: 4, castShadow: false });
}
assemble(ticketRoot, 12.75, 0.9, 'rise', { offset: -1.4, spin: 0.14 });

/* --------------------------------------------------------------------------
   Food stalls
   -------------------------------------------------------------------------- */
function makeFoodStall(x, z, rotY, title, subtitle, color1, color2, kind = 'candy') {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = rotY;
  park.add(root);
  const wood = toonMat(0x543c43);
  const cream = toonMat(0xe3c99b);
  const dark = toonMat(0x332538);
  addBox(root, 2.7, 0.22, 2.05, dark, 0, 0.11, 0, { castShadow: false });
  addBox(root, 2.35, 1.55, 1.65, wood, 0, 1.0, -0.1, { castShadow: true });
  addBox(root, 2.15, 0.65, 0.08, basicMat(0xffa453, { toneMapped: false }), 0, 1.31, 0.78, { castShadow: false });
  addBox(root, 2.35, 0.12, 0.4, cream, 0, 0.89, 0.9, { castShadow: false });
  // little shelves and treats inside
  for (let i = 0; i < 6; i++) {
    const cc = i % 3 === 0 ? 0xffd276 : i % 3 === 1 ? 0xff83ac : 0x84e3ce;
    addSphere(root, 0.07, basicMat(cc, { toneMapped: false }), -0.66 + i * 0.26, 1.08 + (i % 2) * 0.08, 0.83, { wSeg: 6, hSeg: 4, castShadow: false });
  }
  for (const sx of [-1, 1]) {
    addBox(root, 0.14, 2.0, 0.14, cream, sx * 1.27, 1.12, 0.78, { castShadow: false });
    addCone(root, 0.11, 0.35, 4, brassMat, sx * 1.27, 2.3, 0.78, { castShadow: false, rotY: Math.PI / 4 });
  }
  // striped awning
  const awningTex = canvasTexture(512, 256, (ctx, w, h) => {
    const n = 12;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? color1 : color2;
      ctx.fillRect(i * w / n, 0, w / n + 1, h);
    }
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = 'rgba(36,21,45,.18)';
      ctx.fillRect(i * w / n, 0, 3, h);
    }
    ctx.fillStyle = 'rgba(255,247,219,.16)';
    ctx.fillRect(0, h * 0.5, w, 3);
  });
  const awningMat = toonMat(0xffffff, { map: awningTex, emissive: 0x27131f, emissiveIntensity: 0.25 });
  const awning = new THREE.Mesh(gableRoofGeo(2.95, 2.3, 0.8), awningMat);
  awning.position.set(0, 2.1, -0.02);
  awning.rotation.x = 0.1;
  awning.castShadow = true;
  root.add(awning);
  for (let i = 0; i < 7; i++) {
    addSphere(root, 0.06, basicMat(i % 2 ? 0xffd88f : 0xff9abd, { toneMapped: false }), -1.12 + i * 0.38, 2.08, 1.1, { wSeg: 6, hSeg: 4, castShadow: false });
  }
  const signTex = canvasTexture(768, 192, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(20,13,28,.96)';
    ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 17); ctx.fill();
    ctx.strokeStyle = '#e0b16f'; ctx.lineWidth = 6; ctx.stroke();
    ctx.font = '700 66px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe0a0';
    ctx.fillText(title, w / 2, h * 0.44);
    ctx.font = '500 24px Georgia, serif';
    ctx.fillStyle = '#bea0c9';
    ctx.fillText(subtitle, w / 2, h * 0.73);
  });
  addPlane(root, 2.25, 0.58, new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 0, 1.81, 1.0);
  addGlow(root, 0xffb366, 2.7, 0, 1.6, 0.9, 0.23);
  // main decorative item by stall type
  if (kind === 'candy') {
    for (let i = 0; i < 3; i++) {
      const jar = new THREE.Group();
      jar.position.set(-0.7 + i * 0.7, 1.32, 0.88);
      root.add(jar);
      addCyl(jar, 0.16, 0.18, 0.32, 10, basicMat([0xffc8da, 0xa7f3d8, 0xffe6a7][i], { transparent: true, opacity: 0.62, toneMapped: false }), 0, 0.16, 0, { castShadow: false });
      addCyl(jar, 0.12, 0.12, 0.05, 10, brassMat, 0, 0.35, 0, { castShadow: false });
      addSphere(jar, 0.045, basicMat(0xfff0c5, { toneMapped: false }), 0, 0.2, 0, { wSeg: 5, hSeg: 4, castShadow: false });
    }
  } else {
    // steaming cauldron
    addSphere(root, 0.38, toonMat(0x8e6ba6), 0.85, 1.25, 0.82, { wSeg: 12, hSeg: 8, sy: 0.72, castShadow: false });
    addCyl(root, 0.36, 0.28, 0.16, 12, basicMat(0xffd49a, { toneMapped: false }), 0.85, 1.47, 0.82, { castShadow: false });
    addGlow(root, 0xffc98a, 1.8, 0.85, 1.5, 0.86, 0.32);
  }
  assemble(root, 13.05 + (x < 0 ? 0 : 0.35), 0.9, 'rise', { offset: -1.5, spin: x < 0 ? -0.12 : 0.12 });
  return root;
}

makeFoodStall(-4.4, 15.35, Math.PI / 2 + 0.08, 'CANDY', 'SWEETS & WISHES', '#ffc2de', '#d3b8ff', 'candy');
makeFoodStall(7.0, 15.4, -0.38, 'HOT COCOA', 'COZY & SWEET', '#f2c9a0', '#b9a0e8', 'cocoa');
// little candy cart by the roundabout
const candyCart = new THREE.Group();
candyCart.position.set(-4.95, 0, 11.45);
candyCart.rotation.y = 0.45;
park.add(candyCart);
addBox(candyCart, 1.25, 0.75, 0.9, toonMat(0xc992b0), 0, 0.6, 0, { castShadow: true });
for (const sx of [-1, 1]) {
  addCyl(candyCart, 0.28, 0.28, 0.08, 12, carouselGold, sx * 0.66, 0.33, 0, { rotZ: Math.PI / 2, castShadow: false });
  addCyl(candyCart, 0.028, 0.028, 1.7, 5, carouselGold, sx * 0.58, 1.32, 0, { castShadow: false });
}
const candyUmbrella = addCone(candyCart, 1.04, 0.55, 12, toonMat(0xd8a6c7), 0, 2.28, 0, { castShadow: true });
addSphere(candyCart, 0.11, basicMat(0xffbe71, { toneMapped: false }), 0, 2.63, 0, { wSeg: 8, hSeg: 6, castShadow: false });
addGlow(candyCart, 0xffb36a, 1.8, 0, 1.2, 0, 0.24);
assemblePop(candyCart, 13.5, 0.8, { spin: 0.22 });

/* --------------------------------------------------------------------------
   Benches
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const benchGroup = new THREE.Group();
park.add(benchGroup);
function makeBench(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  benchGroup.add(g);
  const wood = toonMat(0x694c4d);
  const iron = toonMat(0x393247);
  for (let i = 0; i < 4; i++) {
    addBox(g, 1.9, 0.09, 0.12, wood, 0, 0.55, -0.19 + i * 0.18, { castShadow: false });
  }
  for (let i = 0; i < 3; i++) {
    addBox(g, 1.9, 0.12, 0.09, wood, 0, 0.91 + i * 0.16, -0.3, { castShadow: false });
  }
  for (const sx of [-1, 1]) {
    addBox(g, 0.08, 0.62, 0.5, iron, sx * 0.81, 0.31, 0, { castShadow: false });
    addBox(g, 0.08, 0.55, 0.08, iron, sx * 0.81, 0.84, -0.32, { castShadow: false });
    addCyl(g, 0.22, 0.22, 0.06, 12, iron, sx * 0.81, 0.62, -0.03, { rotZ: Math.PI / 2, castShadow: false });
  }
}
makeBench(-2.85, 13.5, Math.PI / 2);
makeBench(2.85, 13.45, -Math.PI / 2);
makeBench(3.5, 8.0, Math.PI * 0.9);
addGlowPool(park, 0xffc27c, 1.5, -2.85, 13.5, 0.1, 0.9);
assemble(benchGroup, 14.2, 0.8, 'fade');

/* --------------------------------------------------------------------------
   Gothic lamp posts
   -------------------------------------------------------------------------- */
assemblyPhase = 'lights';
const lampRoot = new THREE.Group();
lampRoot.name = 'lampPosts';
park.add(lampRoot);
const lampPositions = [
  [-2.7, 17.8], [2.7, 17.8], [-2.7, 15.2], [2.7, 15.2],
  [-2.7, 11.2], [4.8, 8.2], [-4.7, 8.0], [5.1, 9.7],
  [-10.8, 12.7], [-12.9, 11.0], [12.1, 10.9], [13.5, 7.6],
  [-12.9, 0.5], [12.6, -5.4],
];
const lampIron = toonMat(0xe1c08d, { emissive: 0x3d2811, emissiveIntensity: 0.3 });
const lampGlowMat = basicMat(0xffc164, { toneMapped: false });
const lampGlassMat = new THREE.MeshBasicMaterial({ color: 0xffb75d, transparent: true, opacity: 0.38, toneMapped: false, depthWrite: false });
const lampGlowGroup = new THREE.Group();
lampRoot.add(lampGlowGroup);
for (let i = 0; i < lampPositions.length; i++) {
  const [x, z] = lampPositions[i];
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  lampRoot.add(g);
  addCyl(g, 0.26, 0.32, 0.22, 8, lampIron, 0, 0.11, 0, { castShadow: false });
  addCyl(g, 0.09, 0.13, 2.35, 7, lampIron, 0, 1.28, 0, { castShadow: true });
  addCyl(g, 0.23, 0.17, 0.16, 8, gateGold, 0, 2.45, 0, { castShadow: false });
  for (let j = 0; j < 4; j++) {
    const a = j / 4 * TAU + Math.PI / 4;
    addBox(g, 0.04, 0.58, 0.04, gateGold, Math.cos(a) * 0.23, 2.76, Math.sin(a) * 0.23, { castShadow: false });
  }
  addBox(g, 0.43, 0.54, 0.43, lampGlassMat, 0, 2.76, 0, { castShadow: false });
  addSphere(g, 0.16, lampGlowMat, 0, 2.78, 0, { wSeg: 8, hSeg: 6, castShadow: false });
  addCone(g, 0.35, 0.32, 4, gateGold, 0, 3.2, 0, { castShadow: false, rotY: Math.PI / 4 });
  addCone(g, 0.24, 0.24, 4, lampIron, 0, 3.47, 0, { castShadow: false, rotY: Math.PI / 4 });
  addSphere(g, 0.08, brassBright, 0, 3.65, 0, { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(g, 0xffab55, 1.8, 0, 2.78, 0, 0.4);
  addGlowPool(lampGlowGroup, 0xffa955, 1.7, x, z, 0.13, 1);
  assemble(g, 14.55 + i * 0.075, 0.6, 'rise', { offset: -1.2 });
}
assemble(lampGlowGroup, 15.0, 0.9, 'fade');

/* --------------------------------------------------------------------------
   Directional signs and small details
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const pointerGroup = new THREE.Group();
park.add(pointerGroup);
function directionSign(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  pointerGroup.add(g);
  addCyl(g, 0.07, 0.1, 2.0, 6, gateGold, 0, 1.0, 0, { castShadow: false });
  addCone(g, 0.14, 0.4, 5, gateGold, 0, 2.12, 0, { castShadow: false });
  const labels = [
    ['CASTLE', 1.72, 0.2],
    ['CAROUSEL', 1.33, -0.3],
    ['FERRIS', 0.94, 0.35],
  ];
  for (let i = 0; i < labels.length; i++) {
    const [text, y, dir] = labels[i];
    const tex = canvasTexture(384, 96, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(34,24,42,.95)';
      ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 10); ctx.fill();
      ctx.strokeStyle = '#be975b'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '700 36px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f4d99d'; ctx.fillText(text, w / 2, h / 2);
    });
    const board = addPlane(g, 1.15, 0.3, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), dir * 0.55, y, 0);
    board.rotation.y = dir > 0 ? 0 : Math.PI;
  }
  // tiny crow
  addSphere(g, 0.1, toonMat(0x1e1a29), 0, 2.0, 0.02, { wSeg: 8, hSeg: 6, sx: 1.2, castShadow: false });
  addCone(g, 0.05, 0.18, 4, toonMat(0x1e1a29), 0.12, 2.0, 0.02, { rotZ: -Math.PI / 2, castShadow: false });
}
directionSign(2.6, 12.4, -0.35);
directionSign(-2.7, 12.35, 0.28);

// small spur from the east promenade towards the cocoa stand
addPath([[4.15, 11.75], [5.1, 12.75], [5.75, 13.9]], 1.4, 4.9, { duration: 0.5 });
assemble(pointerGroup, 14.4, 0.9, 'fade');

/* --------------------------------------------------------------------------
   Pumpkin system
   -------------------------------------------------------------------------- */
assemblyPhase = 'pumpkins';
const pumpkinGeos = [];
for (let variant = 0; variant < 2; variant++) {
  const geo = new THREE.SphereGeometry(1, 42, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const lat = Math.acos(clamp(y, -1, 1));
    const lobe = 1 + (0.07 + variant * 0.012) * Math.cos(theta * 10) * Math.sin(lat);
    pos.setX(i, x * lobe);
    pos.setZ(i, z * lobe);
    pos.setY(i, y * 0.78);
  }
  geo.computeVertexNormals();
  pumpkinGeos.push(geo);
}
const pumpkinVariants = [];
function paintPumpkinFace(ctx, w, h, style) {
  const cx = w * 0.25;
  const cy = h * 0.53;
  const scaled = w / 512;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scaled, scaled);
  ctx.shadowColor = 'rgba(255,220,151,.95)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(255,244,214,.9)';
  ctx.strokeStyle = 'rgba(255,226,166,.95)';
  ctx.lineWidth = 7;
  // enchanted lantern cut-out: a softly glowing star/flower, never a face
  const starPoints = style === 2 ? 4 : style === 3 ? 6 : 5;
  const outer = style === 3 ? 92 : 106;
  const inner = style === 1 ? 36 : 44;
  ctx.beginPath();
  for (let i = 0; i < starPoints * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / starPoints;
    const r = i % 2 === 0 ? outer : inner;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  for (const [sx, sy, sr] of [[-145, -70, 8], [148, -55, 6], [-122, 96, 6], [130, 106, 9], [0, -142, 5]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,213,150,.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 8, 150, -0.2, Math.PI + 0.2);
  ctx.stroke();
  ctx.restore();
}
function makePumpkinVariant(variant) {
  const baseColors = ['#f1b66e', '#f5c18c', '#e8a4b6', '#ffd18f', '#f3b2cd'];
  const base = baseColors[variant % baseColors.length];
  const style = variant % 4;
  const map = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // ribbed shading. 10 vertical cream/dark bands aligned with the UV wrap.
    for (let i = 0; i < 10; i++) {
      const x = i / 10 * w;
      const grad = ctx.createLinearGradient(x, 0, x + w / 10, 0);
      grad.addColorStop(0, 'rgba(83,27,9,.35)');
      grad.addColorStop(0.28, 'rgba(255,173,70,.2)');
      grad.addColorStop(0.6, 'rgba(255,200,110,.08)');
      grad.addColorStop(1, 'rgba(83,27,9,.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w / 10 + 1, h);
    }
    const rr = mulberry32(760 + variant);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rr() > 0.5 ? `rgba(255,210,130,${rr() * 0.07})` : `rgba(87,26,9,${rr() * 0.08})`;
      ctx.fillRect(rr() * w, rr() * h, 1 + rr() * 3, 1 + rr() * 2);
    }
    // dark base at poles
    const top = ctx.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, 'rgba(54,18,9,.7)');
    top.addColorStop(0.18, 'rgba(54,18,9,0)');
    top.addColorStop(0.8, 'rgba(54,18,9,0)');
    top.addColorStop(1, 'rgba(54,18,9,.75)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h);
    paintPumpkinFace(ctx, w, h, style);
  });
  const emissiveMap = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    const cx = w * 0.25;
    const cy = h * 0.53;
    ctx.translate(cx, cy);
    ctx.scale(w / 512, w / 512);
    const glow = ctx.createRadialGradient(0, 8, 10, 0, 30, 235);
    glow.addColorStop(0, '#fff7d6');
    glow.addColorStop(0.38, '#ffd48f');
    glow.addColorStop(0.76, '#eaa0ca');
    glow.addColorStop(1, '#7c4b8e');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(0, 8, 230, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    // luminous wishing-star mark
    ctx.fillStyle = '#fff7db';
    const points = style === 2 ? 4 : style === 3 ? 6 : 5;
    const outer = style === 3 ? 92 : 106;
    const inner = style === 1 ? 36 : 44;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / points;
      const r = i % 2 === 0 ? outer : inner;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map,
    gradientMap: toonGradient,
    emissive: 0xffc777,
    emissiveMap,
    emissiveIntensity: 1.5,
  });
  mat.name = `pumpkinMat${variant}`;
  pumpkinVariants.push(mat);
}
for (let i = 0; i < 5; i++) makePumpkinVariant(i);

// Alternate jack-o'-lantern faces for the preserved Halloween palette.
const pumpkinThemeData = [];
function drawJackOLanternFace(ctx, w, h, style, glow = false) {
  const cx = w * 0.25;
  const cy = h * 0.53;
  const s = w / 512;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  if (glow) {
    const g = ctx.createRadialGradient(0, 30, 6, 0, 30, 180);
    g.addColorStop(0, 'rgba(255,245,194,.95)');
    g.addColorStop(0.45, 'rgba(255,159,55,.8)');
    g.addColorStop(1, 'rgba(170,48,8,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-220, -160, 440, 380);
    ctx.fillStyle = '#ffd37c';
  } else {
    ctx.fillStyle = '#25100c';
  }
  ctx.strokeStyle = glow ? '#ffd37c' : '#2a100c';
  ctx.lineWidth = 8;
  // slanted eyes
  if (style === 2) {
    ctx.beginPath();
    ctx.moveTo(-95, -45); ctx.lineTo(-44, -64); ctx.lineTo(-55, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, -18);
    ctx.quadraticCurveTo(80, -62, 111, -6);
    ctx.lineWidth = 18;
    ctx.strokeStyle = glow ? '#ffd37c' : '#2a100c';
    ctx.stroke();
  } else if (style === 3) {
    ctx.beginPath();
    ctx.moveTo(-100, -50); ctx.lineTo(-48, -30); ctx.lineTo(-58, 12); ctx.lineTo(-104, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(102, -50); ctx.lineTo(50, -30); ctx.lineTo(60, 12); ctx.lineTo(106, -6); ctx.closePath(); ctx.fill();
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 35, -48); ctx.lineTo(sx * 92, -22); ctx.lineTo(sx * 44, 18);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(-15, 20); ctx.lineTo(22, 18); ctx.lineTo(5, 52); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  if (style === 1) {
    ctx.moveTo(-100, 68); ctx.lineTo(-62, 54); ctx.lineTo(-25, 78); ctx.lineTo(12, 54);
    ctx.lineTo(48, 78); ctx.lineTo(90, 54); ctx.lineTo(104, 82);
    ctx.lineTo(49, 132); ctx.lineTo(-14, 132); ctx.lineTo(-88, 100); ctx.closePath();
  } else if (style === 3) {
    ctx.moveTo(-88, 88); ctx.quadraticCurveTo(-20, 150, 72, 82);
    ctx.quadraticCurveTo(-10, 108, -88, 88);
  } else {
    ctx.moveTo(-86, 70); ctx.lineTo(-44, 98); ctx.lineTo(-2, 66); ctx.lineTo(38, 100);
    ctx.lineTo(84, 70); ctx.lineTo(92, 116); ctx.lineTo(12, 136); ctx.lineTo(-75, 120); ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}
for (let variant = 0; variant < pumpkinVariants.length; variant++) {
  const baseColors = ['#e56f1d', '#f28727', '#cf591b', '#f5a23d', '#dd6d35'];
  const base = baseColors[variant % baseColors.length];
  const style = variant % 4;
  const halloweenMap = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) {
      const x = i / 10 * w;
      const grad = ctx.createLinearGradient(x, 0, x + w / 10, 0);
      grad.addColorStop(0, 'rgba(83,27,9,.35)');
      grad.addColorStop(0.28, 'rgba(255,173,70,.2)');
      grad.addColorStop(0.6, 'rgba(255,200,110,.08)');
      grad.addColorStop(1, 'rgba(83,27,9,.35)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w / 10 + 1, h);
    }
    const rr = mulberry32(760 + variant);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = rr() > 0.5 ? `rgba(255,210,130,${rr() * 0.07})` : `rgba(87,26,9,${rr() * 0.08})`;
      ctx.fillRect(rr() * w, rr() * h, 1 + rr() * 3, 1 + rr() * 2);
    }
    drawJackOLanternFace(ctx, w, h, style, false);
  });
  const halloweenEmissive = canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    drawJackOLanternFace(ctx, w, h, style, true);
  });
  const mat = pumpkinVariants[variant];
  mat.userData.themeLockColor = true;
  pumpkinThemeData.push({
    mat,
    fairyMap: mat.map,
    fairyEmissive: mat.emissiveMap,
    fairyEmissiveColor: mat.emissive.getHex(),
    halloweenMap,
    halloweenEmissive,
    halloweenEmissiveColor: 0xff9b45,
  });
}

const stemMat = toonMat(0x6d6a45);
function createPumpkin(size = 1, variant = 0, opts = {}) {
  const g = new THREE.Group();
  const lift = 0.78 * size;
  const body = new THREE.Mesh(pumpkinGeos[variant % pumpkinGeos.length], pumpkinVariants[variant % pumpkinVariants.length]);
  body.position.y = lift;
  body.scale.setScalar(size);
  body.castShadow = size > 0.45;
  body.receiveShadow = false;
  g.add(body);
  const stem = addCyl(g, 0.038 * size, 0.065 * size, 0.28 * size, 5, stemMat, 0.02 * size, lift + 0.78 * size + 0.12 * size, 0, { castShadow: false });
  stem.rotation.z = -0.16;
  if (opts.leaf !== false && size > 0.35) {
    const leaf = addSphere(g, 0.11 * size, toonMat(0x3c573d), 0.18 * size, lift + 0.65 * size, 0.03, { wSeg: 6, hSeg: 4, sx: 1.6, sy: 0.25, sz: 0.8, castShadow: false });
    leaf.rotation.z = 0.3;
  }
  if (opts.glow !== false) {
    addGlow(g, opts.glowColor || 0xffc879, size * 3.1, 0, lift + 0.2 * size, 0.4 * size, 0.32);
  }
  return g;
}

/* --------------------------------------------------------------------------
   Fountain at the heart of the roundabout
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
const fountainRoot = new THREE.Group();
fountainRoot.name = 'pumpkinFountain';
fountainRoot.position.set(0, 0, 10.2);
park.add(fountainRoot);
const fountainStone = toonMat(0xf0e2fb, { map: stoneTex });
const fountainStoneDark = toonMat(0xc4addd, { map: stoneDarkTex });
const fountainGold = toonMat(0xf3c982, { emissive: 0x674115, emissiveIntensity: 0.45 });
const fountainBase = new THREE.Group();
fountainRoot.add(fountainBase);
addCyl(fountainBase, 2.05, 2.2, 0.54, 30, fountainStone, 0, 0.3, 0, { castShadow: false });
addCyl(fountainBase, 2.12, 2.12, 0.12, 30, fountainStoneDark, 0, 0.6, 0, { castShadow: false });
addCyl(fountainBase, 1.78, 1.95, 0.18, 30, fountainStone, 0, 0.54, 0, { castShadow: false });
for (let i = 0; i < 18; i++) {
  const a = i / 18 * TAU;
  addSphere(fountainBase, 0.1, brassMat, Math.cos(a) * 1.96, 0.63, Math.sin(a) * 1.96, { wSeg: 6, hSeg: 4, castShadow: false });
}
// water surface
const fountainWater = addCyl(fountainBase, 1.7, 1.7, 0.035, 32, new THREE.MeshBasicMaterial({
  color: 0x86bfe8, transparent: true, opacity: 0.72, toneMapped: true, depthWrite: false,
}), 0, 0.56, 0, { castShadow: false });
const fountainJetGroup = new THREE.Group();
fountainBase.add(fountainJetGroup);
addCyl(fountainJetGroup, 0.29, 0.4, 0.8, 14, fountainStone, 0, 0.98, 0, { castShadow: false });
addCyl(fountainJetGroup, 0.85, 1.12, 0.22, 18, fountainStone, 0, 1.35, 0, { castShadow: false });
addCyl(fountainJetGroup, 0.18, 0.26, 1.05, 12, fountainGold, 0, 1.9, 0, { castShadow: false });
addCyl(fountainJetGroup, 0.58, 0.68, 0.12, 16, fountainGold, 0, 1.78, 0, { castShadow: false });
addGlow(fountainJetGroup, 0xffbf70, 3.2, 0, 1.35, 0, 0.42);
const fountainPumpkin = createPumpkin(0.82, 1, { glow: false });
fountainPumpkin.position.set(0, 2.32, 0);
fountainPumpkin.rotation.y = 0.03;
fountainJetGroup.add(fountainPumpkin);
addGlow(fountainJetGroup, 0xffad4e, 4.4, 0, 2.35, 0.15, 0.38);
// arcs of enchanted water
const waterArcMat = new THREE.MeshBasicMaterial({
  color: 0x96d8ff, transparent: true, opacity: 0.42,
  blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
});
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU + 0.2;
  const start = new THREE.Vector3(Math.cos(a) * 0.5, 2.15, Math.sin(a) * 0.5);
  const mid = new THREE.Vector3(Math.cos(a) * 1.0, 2.35, Math.sin(a) * 1.0);
  const end = new THREE.Vector3(Math.cos(a) * 1.45, 0.7, Math.sin(a) * 1.45);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const arc = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.022, 5, false), waterArcMat);
  fountainJetGroup.add(arc);
}
addGlow(fountainJetGroup, 0x9fdcff, 2.8, 0, 1.2, 0.4, 0.24);
assemble(fountainBase, 13.55, 1.1, 'rise', { offset: -1.4 });
assemble(fountainJetGroup, 13.82, 0.9, 'drop', { offset: 2.0 });

// fountain particles (simple ballistic droplets)
const fountainDropCount = 150;
const fountainDropPositions = new Float32Array(fountainDropCount * 3);
const fountainDropVel = [];
const fountainDropLife = new Float32Array(fountainDropCount);
const fountainDropState = new Float32Array(fountainDropCount);
for (let i = 0; i < fountainDropCount; i++) {
  fountainDropPositions[i * 3] = 0;
  fountainDropPositions[i * 3 + 1] = -10;
  fountainDropPositions[i * 3 + 2] = 0;
  fountainDropState[i] = rand(0, 1);
}
const fountainDropGeo = new THREE.BufferGeometry();
fountainDropGeo.setAttribute('position', new THREE.BufferAttribute(fountainDropPositions, 3));
const fountainDropMat = new THREE.PointsMaterial({
  color: 0xa8dcff,
  size: 0.12,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  map: glowTex,
  alphaTest: 0.05,
  toneMapped: false,
});
const fountainDrops = new THREE.Points(fountainDropGeo, fountainDropMat);
fountainDrops.position.set(0, 1.75, 0);
fountainDrops.visible = false;
fountainRoot.add(fountainDrops);
assemble(fountainDrops, 14.2, 0.7, 'fade');
function resetFountainDrop(i) {
  const angle = rand(0, TAU);
  const speed = rand(0.2, 0.62);
  fountainDropPositions[i * 3] = Math.cos(angle) * rand(0, 0.12);
  fountainDropPositions[i * 3 + 1] = 0.3;
  fountainDropPositions[i * 3 + 2] = Math.sin(angle) * rand(0, 0.12);
  fountainDropVel[i] = {
    x: Math.cos(angle) * speed,
    y: rand(0.9, 1.8),
    z: Math.sin(angle) * speed,
  };
  fountainDropLife[i] = rand(0, 1);
}
function updateFountain(dt, time) {
  for (let i = 0; i < fountainDropCount; i++) {
    fountainDropLife[i] -= dt * rand(0.8, 1.1);
    const v = fountainDropVel[i];
    if (!v || fountainDropLife[i] <= 0) {
      resetFountainDrop(i);
      continue;
    }
    v.y -= 3.4 * dt;
    fountainDropPositions[i * 3] += v.x * dt;
    fountainDropPositions[i * 3 + 1] += v.y * dt;
    fountainDropPositions[i * 3 + 2] += v.z * dt;
  }
  fountainDropGeo.attributes.position.needsUpdate = true;
  fountainDropMat.opacity = 0.55 + Math.sin(time * 2.0) * 0.1;
}
for (let i = 0; i < fountainDropCount; i++) resetFountainDrop(i);

/* --------------------------------------------------------------------------
   Pumpkin plaza arrangement
   -------------------------------------------------------------------------- */
assemblyPhase = 'pumpkins';
const pumpkinGroup = new THREE.Group();
park.add(pumpkinGroup);
const pumpkinPlacements = [];
// ring around the fountain
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + 0.2;
  pumpkinPlacements.push({
    x: Math.cos(a) * 2.72,
    z: 10.2 + Math.sin(a) * 2.72,
    s: rand(0.26, 0.48),
    rot: -a + Math.PI,
    v: i % 5,
    d: 14.25 + i * 0.035,
  });
}
// little pumpkin display and scarecrow
const displayPositions = [
  [4.45, 9.6, 0.58], [5.05, 9.25, 0.85], [5.62, 9.62, 0.48], [4.85, 8.75, 0.36], [5.75, 8.88, 0.3],
];
for (const [x, z, s] of displayPositions) {
  pumpkinPlacements.push({ x, z, s, rot: 0.7 + rand(-0.4, 0.4), v: Math.floor(rand(0, 5)), d: 14.45 });
}
// carousel-side cluster
for (const [x, z, s] of [[-4.9, 6.0, 0.35], [-5.4, 6.35, 0.48], [-5.8, 5.9, 0.26], [-6.1, 10.3, 0.3]]) {
  pumpkinPlacements.push({ x, z, s, rot: rand(0, TAU), v: Math.floor(rand(0, 5)), d: 14.5 });
}
// castle terrace pumpkins
for (const [x, z, s] of [[-4.85, 4.0, 0.32], [4.85, 4.0, 0.32], [-4.65, 5.8, 0.26], [4.65, 5.8, 0.26]]) {
  pumpkinPlacements.push({ x, z, s, rot: Math.PI, v: Math.floor(rand(0, 5)), d: 14.55 });
}
// gate and ticket side pumpkins
for (const [x, z, s] of [[-2.25, 18.45, 0.33], [2.25, 18.45, 0.33], [-3.9, 17.7, 0.25], [5.1, 17.7, 0.25], [2.75, 16.9, 0.2]]) {
  pumpkinPlacements.push({ x, z, s, rot: rand(-0.5, 0.5), v: Math.floor(rand(0, 5)), d: 14.3 });
}
// haunted front and graveyard edge
for (const [x, z, s] of [[7.85, 9.9, 0.28], [9.6, 9.9, 0.35], [10.9, 12.4, 0.24]]) {
  pumpkinPlacements.push({ x, z, s, rot: rand(-0.4, 0.4), v: Math.floor(rand(0, 5)), d: 14.4 });
}
// coaster station / ferris queue / tower entrance
for (const [x, z, s] of [[-13.2, 1.4, 0.38], [-12.2, 0.4, 0.24], [11.7, -5.9, 0.28], [10.5, -6.3, 0.2], [-14.4, 13.3, 0.28], [-15.6, 12.65, 0.34]]) {
  pumpkinPlacements.push({ x, z, s, rot: rand(0, TAU), v: Math.floor(rand(0, 5)), d: 14.35 });
}
// a few small pumpkins dotted near the paths
for (let i = 0; i < 8; i++) {
  const side = i % 2 ? 1 : -1;
  const z = 12.0 + (i % 4) * 1.2;
  const x = side * (3.15 + rand(0, 0.8));
  pumpkinPlacements.push({ x, z, s: rand(0.13, 0.2), rot: rand(0, TAU), v: Math.floor(rand(0, 5)), d: 14.6, glow: false });
}
// around the flowerbeds / gate corners
for (let i = 0; i < 6; i++) {
  pumpkinPlacements.push({
    x: rand(-12, -8), z: 17.4 + rand(-0.35, 0.35), s: rand(0.18, 0.34),
    rot: rand(0, TAU), v: i % 5, d: 14.66,
  });
}
for (let i = 0; i < 30; i++) {
  const p = pumpkinPlacements[i];
  const pumpkin = createPumpkin(p.s, p.v, { glow: p.glow !== false });
  pumpkin.position.set(p.x, 0.055, p.z);
  pumpkin.rotation.y = p.rot;
  pumpkinGroup.add(pumpkin);
  assemblePop(pumpkin, p.d + i * 0.015, 0.55);
}

// giant pumpkin display pumpkin
const giantPumpkin = createPumpkin(1.28, 4, { glow: true });
giantPumpkin.position.set(-4.15, 0.05, 7.65);
giantPumpkin.rotation.y = 0.15;
pumpkinGroup.add(giantPumpkin);
assemblePop(giantPumpkin, 14.95, 0.9);

// scarecrow guarding the pumpkin patch
const scarecrow = new THREE.Group();
scarecrow.position.set(5.35, 0, 8.25);
scarecrow.rotation.y = 0.15;
pumpkinGroup.add(scarecrow);
const scareWood = toonMat(0x9f7d8e);
addBox(scarecrow, 0.14, 2.25, 0.14, scareWood, 0, 1.25, 0, { castShadow: false });
addBox(scarecrow, 1.55, 0.13, 0.13, scareWood, 0, 1.72, 0.0, { castShadow: false });
const scareBody = addCone(scarecrow, 0.46, 1.25, 8, toonMat(0xc799b5), 0, 1.18, 0, { castShadow: false });
const scareHeadPumpkin = createPumpkin(0.34, 2, { glow: true });
scareHeadPumpkin.position.set(0, 2.18, 0);
scarecrow.add(scareHeadPumpkin);
addCone(scarecrow, 0.48, 0.3, 8, toonMat(0x9d7bc4), 0, 2.62, 0, { castShadow: false });
addCyl(scarecrow, 0.24, 0.28, 0.28, 8, toonMat(0x9d7bc4), 0, 2.48, 0, { castShadow: false });
for (const sx of [-1, 1]) {
  const sleeve = addCone(scarecrow, 0.13, 0.46, 6, toonMat(0xd8aecb), sx * 0.7, 1.63, 0, { rotZ: sx * Math.PI / 2, castShadow: false });
  addBox(scarecrow, 0.07, 0.16, 0.07, toonMat(0xffdda0), sx * 1.0, 1.72, 0, { castShadow: false });
}
for (let i = 0; i < 5; i++) {
  addSphere(scarecrow, 0.055, basicMat([0xffb4dc, 0xc6a5ff, 0xffe1a0][i % 3], { toneMapped: false }), -0.32 + i * 0.16, 2.47 + (i % 2) * 0.08, 0.33, { wSeg: 5, hSeg: 4, castShadow: false });
  addGlow(scarecrow, 0xffc6ea, 0.7, -0.32 + i * 0.16, 2.5, 0.34, 0.18);
}
assemblePop(scarecrow, 14.8, 0.8);
addGlowPool(park, 0xffb8e0, 4.8, 4.9, 9.35, 0.2, 1);

/* --------------------------------------------------------------------------
   Trees
   -------------------------------------------------------------------------- */
assemblyPhase = 'roads';
function makeDeadTree(x, z, scale, seed, start) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  park.add(g);
  const rr = mulberry32(seed);
  const geos = [];
  const branch = (start, dir, len, rad, depth) => {
    const end = start.clone().addScaledVector(dir, len);
    const geometry = new THREE.CylinderGeometry(rad * 0.58, rad, len, depth > 2 ? 6 : 4, 1);
    geometry.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
    m.setPosition(start);
    geometry.applyMatrix4(m);
    geos.push(geometry);
    if (depth <= 0) return;
    const kids = depth === 3 ? 2 : (rr() > 0.4 ? 2 : 1);
    for (let i = 0; i < kids; i++) {
      const newDir = dir.clone();
      const angle = rr() * TAU;
      const bend = (0.36 + rr() * 0.5) * (depth === 2 ? 1 : 0.9);
      newDir.x += Math.cos(angle) * bend;
      newDir.z += Math.sin(angle) * bend;
      newDir.y *= 0.86;
      newDir.normalize();
      branch(end, newDir, len * (0.55 + rr() * 0.18), rad * (0.55 + rr() * 0.12), depth - 1);
    }
  };
  const rootDir = new THREE.Vector3(rand2(rr, -0.2, 0.2), 1, rand2(rr, -0.2, 0.2)).normalize();
  branch(new THREE.Vector3(), rootDir, rand2(rr, 2.1, 3.0), rand2(rr, 0.18, 0.3), 3);
  // exposed roots
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + rr();
    const d = new THREE.Vector3(Math.cos(a), -0.18, Math.sin(a)).normalize();
    branch(new THREE.Vector3(0, 0.02, 0), d, rand2(rr, 0.55, 0.9), 0.075, 0);
  }
  const treeMat = toonMat(0x8f6f9d);
  const treeMesh = new THREE.Mesh(mergeGeometries(geos), treeMat);
  treeMesh.castShadow = true;
  treeMesh.receiveShadow = false;
  treeMesh.scale.setScalar(scale);
  g.add(treeMesh);
  // sparse glowing leaves at some branch tips
  const leafMat = toonMat(0xffb4dc, { emissive: 0x8f3d72, emissiveIntensity: 0.7 });
  const blossomMat = toonMat(0xd3b4ff, { emissive: 0x61419c, emissiveIntensity: 0.75 });
  for (let i = 0; i < 11; i++) {
    const leaf = addSphere(g, rand2(rr, 0.25, 0.5), i % 3 === 0 ? blossomMat : leafMat, rand2(rr, -1.3, 1.3) * scale, rand2(rr, 1.9, 3.8) * scale, rand2(rr, -1.3, 1.3) * scale, {
      wSeg: 6, hSeg: 4, sx: 1.25, sy: 0.6, castShadow: false,
    });
  }
  if (seed % 2 === 0) {
    addSphere(g, 0.13, basicMat(0xffe3a4, { toneMapped: false }), 0.7 * scale, 2.5 * scale, 0.2 * scale, { wSeg: 7, hSeg: 5, castShadow: false });
    addGlow(g, 0xffc3e9, 1.3, 0.7 * scale, 2.5 * scale, 0.2 * scale, 0.35);
  }
  assemble(g, start, 1.2, 'rise', { offset: -2.4 });
  return g;
}
function rand2(rr, a, b) { return a + rr() * (b - a); }

const deadTreePositions = [
  [-17.7, 17.2, 0.95, 11, 14.35],
  [-18.2, 8.6, 1.1, 12, 14.45],
  [17.6, 4.0, 0.9, 13, 14.5],
  [15.2, -14.9, 1.1, 14, 14.55],
  [-4.0, -16.8, 0.85, 15, 14.6],
  [-16.4, -9.4, 1.0, 16, 14.65],
  [9.1, 17.55, 0.85, 17, 14.7],
  [17.3, 15.7, 0.8, 18, 14.75],
];
for (const [x, z, s, seed, st] of deadTreePositions) makeDeadTree(x, z, s, seed, st);

function makeEvergreen(x, z, scale, seed, start) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  park.add(g);
  const rr = mulberry32(seed);
  const trunk = addCyl(g, 0.15, 0.22, 2.8, 7, toonMat(0x8b729d), 0, 1.4, 0, { castShadow: true });
  const leafColors = [0x6b8f9a, 0x7d73a8, 0x8f6f9e];
  for (let i = 0; i < 4; i++) {
    const y = 1.2 + i * 0.9;
    const radius = (1.7 - i * 0.32) * scale;
    const cone = addCone(g, radius, 1.55, 8, toonMat(leafColors[i % 3]), 0, y * scale + 0.55, 0, { castShadow: false, rotY: rr() });
  }
  for (let i = 0; i < 7; i++) {
    const a = rr() * TAU;
    const rad = rand2(rr, 0.2, 1.2) * scale;
    const y = rand2(rr, 1.0, 4.2) * scale;
    addSphere(g, 0.13, basicMat(rr() > 0.5 ? 0xffe3a4 : 0xc9b4ff, { toneMapped: false }), Math.cos(a) * rad, y, Math.sin(a) * rad, { wSeg: 6, hSeg: 4, castShadow: false });
    addGlow(g, 0xffc3e9, 0.8, Math.cos(a) * rad, y, Math.sin(a) * rad, 0.24);
  }
  assemble(g, start, 1.1, 'rise', { offset: -2.8 });
}
makeEvergreen(-12.9, 17.4, 0.8, 21, 14.4);
makeEvergreen(12.4, 16.5, 0.7, 22, 14.5);
makeEvergreen(16.3, 8.4, 0.8, 23, 14.55);
makeEvergreen(-18.1, -5.2, 0.72, 24, 14.6);
makeEvergreen(9.7, -16.8, 0.65, 25, 14.65);

/* --------------------------------------------------------------------------
   Flower beds and bushes
   -------------------------------------------------------------------------- */
const flowerBedThemeMaterials = [];
function makeFlowerBed(cx, cz, w, d, start) {
  const g = new THREE.Group();
  park.add(g);
  const borderMat = toonMat(0xb49bc9);
  const soil = addBox(g, w, 0.22, d, toonMat(0x4b3a61), cx, 0.12, cz, { castShadow: false });
  addBox(g, w + 0.27, 0.3, 0.22, borderMat, cx, 0.2, cz - d / 2, { castShadow: false });
  addBox(g, w + 0.27, 0.3, 0.22, borderMat, cx, 0.2, cz + d / 2, { castShadow: false });
  addBox(g, 0.22, 0.3, d + 0.27, borderMat, cx - w / 2, 0.2, cz, { castShadow: false });
  addBox(g, 0.22, 0.3, d + 0.27, borderMat, cx + w / 2, 0.2, cz, { castShadow: false });
  const geos = [];
  const rr = mulberry32(Math.floor(cx * 71 + cz * 33 + 17));
  const colors = [new THREE.Color(0xd6a8ff), new THREE.Color(0xffb6dd), new THREE.Color(0xffe39a), new THREE.Color(0xff9bcf), new THREE.Color(0xb4dbff)];
  for (let i = 0; i < 52; i++) {
    const px = cx + rand2(rr, -w / 2 + 0.3, w / 2 - 0.3);
    const pz = cz + rand2(rr, -d / 2 + 0.22, d / 2 - 0.22);
    const col = colors[Math.floor(rr() * colors.length)];
    const stem = new THREE.CylinderGeometry(0.012, 0.018, rand2(rr, 0.2, 0.4), 4);
    const stemColor = new THREE.Color(0x4f7b6f);
    const cGeo = new Float32Array(stem.attributes.position.count * 3);
    for (let j = 0; j < stem.attributes.position.count; j++) { cGeo[j * 3] = stemColor.r; cGeo[j * 3 + 1] = stemColor.g; cGeo[j * 3 + 2] = stemColor.b; }
    stem.setAttribute('color', new THREE.BufferAttribute(cGeo, 3));
    stem.translate(px, 0.34, pz);
    geos.push(stem);
    const bloom = new THREE.SphereGeometry(rand2(rr, 0.055, 0.095), 6, 4);
    const bColor = new Float32Array(bloom.attributes.position.count * 3);
    for (let j = 0; j < bloom.attributes.position.count; j++) { bColor[j * 3] = col.r; bColor[j * 3 + 1] = col.g; bColor[j * 3 + 2] = col.b; }
    bloom.setAttribute('color', new THREE.BufferAttribute(bColor, 3));
    bloom.translate(px, 0.5 + rr() * 0.08, pz);
    geos.push(bloom);
    if (rr() > 0.7) {
      const leaf = new THREE.SphereGeometry(0.08, 5, 4);
      const lc = new THREE.Float32BufferAttribute(Array.from({ length: leaf.attributes.position.count * 3 }, (_, idx) => idx % 3 === 1 ? 0.3 : 0.14), 3);
      leaf.setAttribute('color', lc);
      leaf.scale(1.4, 0.24, 0.8);
      leaf.translate(px + rand2(rr, -0.12, 0.12), 0.3, pz + rand2(rr, -0.12, 0.12));
      geos.push(leaf);
    }
  }
  const plantMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  flowerBedThemeMaterials.push(plantMat);
  const plants = new THREE.Mesh(mergeGeometries(geos), plantMat);
  plants.castShadow = false;
  g.add(plants);
  assemble(g, start, 0.85, 'fade');
}
makeFlowerBed(-9.8, 17.3, 3.2, 1.25, 15.05);
makeFlowerBed(10.95, 17.25, 2.9, 1.25, 15.1);
makeFlowerBed(5.7, -17.1, 3.2, 1.2, 15.15);
makeFlowerBed(-16.5, -16.2, 2.5, 1.2, 15.2);
// flower pots on the terrace corners
for (const [x, z] of [[-5.0, 4.4], [5.0, 4.4], [-5.0, 6.2], [5.0, 6.2]]) {
  const pot = new THREE.Group();
  park.add(pot);
  addCyl(pot, 0.32, 0.26, 0.42, 8, toonMat(0xb597ca), x, 0.21, z, { castShadow: false });
  addSphere(pot, 0.38, toonMat(0x547a70), x, 0.47, z, { wSeg: 8, hSeg: 6, sx: 1, sy: 0.55, castShadow: false });
  for (let i = 0; i < 5; i++) {
    addSphere(pot, 0.08, basicMat(i % 2 ? 0xffc2e6 : 0xd2b3ff, { toneMapped: false }), x + rand(-0.22, 0.22), 0.56 + rand(0, 0.12), z + rand(-0.22, 0.22), { wSeg: 5, hSeg: 4, castShadow: false });
  }
  assemblePop(pot, 15.3, 0.55);
}

// low bushes
const bushGroup = new THREE.Group();
park.add(bushGroup);
const bushMat = toonMat(0x4d746c);
const bushMatPurple = toonMat(0x775b91);
const bushPositions = [
  [-4.0, 14.5], [-4.7, 14.5], [-6.2, 11.9], [6.0, 9.1], [6.6, 9.1],
  [13.5, 14.7], [14.2, 14.9], [-13.9, 15.6],
  [14.9, -6.9], [8.2, -16.0], [-8.6, -14.3], [-2.2, 17.4], [2.2, 17.4],
  [-12.4, 15.2], [12.2, 12.9], [11.8, 13.5], [-15.8, 8.2],
];
for (let i = 0; i < bushPositions.length; i++) {
  const [x, z] = bushPositions[i];
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  bushGroup.add(b);
  const mat = i % 3 === 0 ? bushMatPurple : bushMat;
  const blobs = 2 + (i % 3);
  for (let j = 0; j < blobs; j++) {
    addSphere(b, rand(0.18, 0.35), mat, rand(-0.28, 0.28), rand(0.1, 0.28), rand(-0.28, 0.28), {
      wSeg: 7, hSeg: 5, sy: rand(0.6, 0.9), castShadow: false,
    });
  }
  if (i % 4 === 0) {
    addSphere(b, 0.075, basicMat(0xffc2e8, { toneMapped: false }), 0.15, 0.38, 0.1, { wSeg: 5, hSeg: 4, castShadow: false });
  }
  assemblePop(b, 15.18 + i * 0.025, 0.55);
}

/* --------------------------------------------------------------------------
   Grass tufts, small stones and mushrooms
   -------------------------------------------------------------------------- */
const grassGroup = new THREE.Group();
park.add(grassGroup);
const grassGeos = [];
const grassMat = new THREE.MeshToonMaterial({ color: 0x4c7774, gradientMap: toonGradient });
const gr = mulberry32(9931);
for (let i = 0; i < 300; i++) {
  let x, z;
  const zone = gr();
  if (zone < 0.45) {
    x = (gr() > 0.5 ? 1 : -1) * rand2(gr, 16.4, 19.0);
    z = rand2(gr, -19.0, 19.0);
  } else if (zone < 0.8) {
    x = rand2(gr, -19.0, 19.0);
    z = (gr() > 0.5 ? 1 : -1) * rand2(gr, 16.4, 19.0);
  } else {
    x = rand2(gr, -12.0, 12.0);
    z = rand2(gr, -17.6, -13.8);
  }
  const blades = 3;
  for (let j = 0; j < blades; j++) {
    const g = new THREE.ConeGeometry(0.035, rand2(gr, 0.26, 0.52), 3);
    g.translate(0, 0.2, 0);
    g.rotateZ(rand2(gr, -0.25, 0.25));
    g.rotateY(rand2(gr, 0, TAU));
    g.translate(x + rand2(gr, -0.1, 0.1), 0, z + rand2(gr, -0.1, 0.1));
    grassGeos.push(g);
  }
}
const grassMesh = new THREE.Mesh(mergeGeometries(grassGeos), grassMat);
grassMesh.castShadow = false;
grassGroup.add(grassMesh);
assemble(grassGroup, 15.4, 1.0, 'fade');

const stonePebbleMat = toonMat(0x9a8ab4);
for (let i = 0; i < 25; i++) {
  const a = rand(0, TAU);
  const r = rand(4.2, 18.5);
  addSphere(park, rand(0.05, 0.15), stonePebbleMat, Math.cos(a) * r, rand(0.02, 0.08), Math.sin(a) * r, {
    wSeg: 5, hSeg: 4, sx: rand(1, 2.2), sy: 0.4, sz: rand(0.8, 1.6), castShadow: false,
  });
}

/* --------------------------------------------------------------------------
   Festoon lights, bunting and park signage
   -------------------------------------------------------------------------- */
assemblyPhase = 'lights';
const festoonRoot = new THREE.Group();
festoonRoot.name = 'festoonLights';
park.add(festoonRoot);

const festoonLines = [
  { a: [-2.7, 2.88, 17.8], b: [2.7, 2.88, 17.8], sag: 0.5, n: 13, bunting: true },
  { a: [-2.7, 2.88, 15.2], b: [2.7, 2.88, 15.2], sag: 0.55, n: 13, bunting: true },
  { a: [-2.7, 2.88, 16.55], b: [2.7, 2.88, 13.65], sag: 0.75, n: 10, bunting: false },
  { a: [-3.15, 3.35, 18.85], b: [2.7, 2.88, 17.8], sag: 0.65, n: 9, bunting: true },
  { a: [3.15, 3.35, 18.85], b: [4.15, 2.55, 16.15], sag: 0.65, n: 8, bunting: false },
  { a: [-4.7, 2.85, 8.0], b: [4.8, 2.85, 8.2], sag: 0.95, n: 17, bunting: false },
  { a: [12.1, 2.85, 10.9], b: [13.5, 2.85, 7.6], sag: 0.55, n: 9, bunting: false },
  { a: [-10.8, 2.85, 12.7], b: [-12.9, 2.85, 11.0], sag: 0.55, n: 8, bunting: true },
  { a: [-4.92, 2.4, 8.0], b: [-2.7, 2.88, 11.2], sag: 0.7, n: 9, bunting: false },
];
const wirePoints = [];
const bulbPositions = [];
const bulbColors = [];
const bulbSizes = [];
const bulbPhases = [];
const flagColors = [new THREE.Color(0xffa5ca), new THREE.Color(0xc4a0ff), new THREE.Color(0x8fd7ff), new THREE.Color(0xffe09a), new THREE.Color(0xffc4e3)];
function catenaryPoint(a, b, sag, t, out) {
  out.set(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t) - sag * 4 * t * (1 - t),
    lerp(a[2], b[2], t)
  );
  return out;
}
const flagGroup = new THREE.Group();
festoonRoot.add(flagGroup);
const flagGeos = [];
let bulbCounter = 0;
for (const line of festoonLines) {
  const steps = 18;
  const prev = new THREE.Vector3();
  const curr = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    catenaryPoint(line.a, line.b, line.sag, t, curr);
    if (i > 0) {
      wirePoints.push(prev.x, prev.y, prev.z, curr.x, curr.y, curr.z);
    }
    if (i > 0 && i < steps) {
      // bulbs between wire sample points
    }
    prev.copy(curr);
  }
  // bulbs and bunting are spaced along the wire
  for (let i = 1; i < line.n; i++) {
    const t = i / line.n;
    const pos = catenaryPoint(line.a, line.b, line.sag, t, new THREE.Vector3());
    bulbPositions.push(pos.x, pos.y - 0.08, pos.z);
    const c = new THREE.Color(i % 4 === 0 ? 0xffa6d6 : i % 4 === 1 ? 0xffe09a : i % 4 === 2 ? 0x9ed4ff : 0xd8b8ff);
    const b = 1.2 + R() * 0.4;
    bulbColors.push(c.r * b, c.g * b, c.b * b);
    bulbSizes.push(2.3 + R() * 1.4);
    bulbPhases.push(R() * TAU);
    bulbCounter++;
    if (line.bunting && i > 1 && i < line.n - 1) {
      const p = catenaryPoint(line.a, line.b, line.sag, t, new THREE.Vector3());
      const next = catenaryPoint(line.a, line.b, line.sag, Math.min(1, t + 0.04), new THREE.Vector3());
      const dx = next.x - p.x;
      const dz = next.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const width = 0.28;
      const drop = 0.44;
      const p1 = new THREE.Vector3(p.x - ux * width / 2, p.y - 0.04, p.z - uz * width / 2);
      const p2 = new THREE.Vector3(p.x + ux * width / 2, p.y - 0.04, p.z + uz * width / 2);
      const p3 = new THREE.Vector3(p.x + (R() - 0.5) * 0.06, p.y - drop, p.z + (R() - 0.5) * 0.06);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z], 3));
      g.setIndex([0, 1, 2]);
      g.computeVertexNormals();
      const col = flagColors[(i + Math.floor(t * 10)) % flagColors.length];
      const colors = new Float32Array([col.r, col.g, col.b, col.r, col.g, col.b, col.r * 0.75, col.g * 0.75, col.b * 0.75]);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      flagGeos.push(g);
    }
  }
}
const wireGeo = new THREE.BufferGeometry();
wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePoints, 3));
const festoonWires = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x171121, transparent: true, opacity: 0.9 }));
festoonRoot.add(festoonWires);
if (flagGeos.length > 0) {
  const flags = new THREE.Mesh(
    mergeGeometries(flagGeos),
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false })
  );
  flagGroup.add(flags);
}
const bulbGeo = new THREE.BufferGeometry();
bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbPositions, 3));
bulbGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(bulbColors, 3));
bulbGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(bulbSizes, 1));
bulbGeo.setAttribute('aPhase', new THREE.Float32BufferAttribute(bulbPhases, 1));
const festoonBulbMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (75.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = 0.55 + 0.45 * sin(uTime * 2.0 + aPhase);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uOpacity;
    void main(){
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float core = smoothstep(0.5, 0.08, d);
      float halo = smoothstep(0.5, 0.0, d) * 0.38;
      gl_FragColor = vec4(vColor + vec3(core * 0.4), (core + halo) * vAlpha * uOpacity);
    }
  `,
});
const festoonBulbs = new THREE.Points(bulbGeo, festoonBulbMat);
festoonRoot.add(festoonBulbs);
assemble(festoonRoot, 15.65, 1.15, 'fade');
const festoonLightCount = bulbCounter;

/* --------------------------------------------------------------------------
   Vintage attraction posters
   -------------------------------------------------------------------------- */
assemblyPhase = 'pumpkins';
const posterRoot = new THREE.Group();
posterRoot.name = 'attractionPosters';
park.add(posterRoot);
function makePosterTexture(type) {
  return canvasTexture(512, 720, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (type === 0) {
      grad.addColorStop(0, '#342148');
      grad.addColorStop(0.55, '#76518e');
      grad.addColorStop(1, '#d995b7');
    } else if (type === 1) {
      grad.addColorStop(0, '#192347');
      grad.addColorStop(0.6, '#435e92');
      grad.addColorStop(1, '#c4a1d0');
    } else {
      grad.addColorStop(0, '#3f2452');
      grad.addColorStop(0.65, '#76528d');
      grad.addColorStop(1, '#dca1bd');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // ornate border
    ctx.strokeStyle = 'rgba(235,196,132,.8)';
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = 'rgba(235,196,132,.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);
    // stars and moon
    const rr = mulberry32(552 + type * 9);
    ctx.fillStyle = 'rgba(255,240,196,.8)';
    for (let i = 0; i < 50; i++) {
      const x = rr() * w;
      const y = rr() * h * 0.6;
      ctx.beginPath(); ctx.arc(x, y, rr() * 2 + 1, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#ffe9b5';
    ctx.beginPath(); ctx.arc(w * 0.75, h * 0.19, 70, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(70,38,68,.22)';
    ctx.beginPath(); ctx.arc(w * 0.75 - 22, h * 0.19 - 12, 15, 0, TAU); ctx.fill();
    if (type === 0) {
      // dreamy pastel castle silhouette
      ctx.fillStyle = '#79548f';
      ctx.beginPath();
      ctx.moveTo(80, 510); ctx.lineTo(80, 390); ctx.lineTo(130, 300); ctx.lineTo(176, 384);
      ctx.lineTo(220, 360); ctx.lineTo(270, 250); ctx.lineTo(322, 360); ctx.lineTo(380, 382);
      ctx.lineTo(432, 300); ctx.lineTo(432, 510); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd9a0';
      for (const [x, y, w, h] of [[120, 410, 22, 42], [218, 330, 24, 48], [300, 390, 22, 42], [366, 420, 20, 36]]) ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffb6da';
      for (const [x, y] of [[150, 565], [250, 590], [350, 568]]) {
        for (let p = 0; p < 5; p++) {
          const a = p / 5 * TAU;
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 16, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = '#ffe6a6';
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffb6da';
      }
    } else if (type === 1) {
      // Ferris wheel silhouette
      ctx.strokeStyle = '#f0c98b';
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(w / 2, 325, 158, 0, TAU); ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        ctx.beginPath(); ctx.moveTo(w / 2, 325); ctx.lineTo(w / 2 + Math.cos(a) * 158, 325 + Math.sin(a) * 158); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        ctx.fillStyle = i % 2 ? '#ffb9d0' : '#f9d77f';
        ctx.beginPath();
        ctx.arc(w / 2 + Math.cos(a) * 158, 325 + Math.sin(a) * 158, 12, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#dfb988';
      ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(w / 2, 325); ctx.lineTo(120, 600); ctx.moveTo(w / 2, 325); ctx.lineTo(390, 600); ctx.stroke();
    } else {
      // giant enchanted flower and glowing wishes
      const fy = 405;
      for (let p = 0; p < 8; p++) {
        const a = p / 8 * TAU;
        ctx.fillStyle = p % 2 ? '#ffb5dc' : '#cdb4ff';
        ctx.beginPath();
        ctx.ellipse(w / 2 + Math.cos(a) * 88, fy + Math.sin(a) * 88, 62, 38, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe29b';
      ctx.beginPath(); ctx.arc(w / 2, fy, 58, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath(); ctx.arc(w / 2 - 14, fy - 12, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = '#78a58b';
      ctx.fillRect(w / 2 - 9, fy + 40, 18, 160);
      ctx.fillStyle = '#9ad9b1';
      ctx.beginPath(); ctx.ellipse(w / 2 - 52, fy + 138, 46, 18, -0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2 + 52, fy + 170, 46, 18, 0.5, 0, TAU); ctx.fill();
    }
    // title band
    ctx.fillStyle = 'rgba(21,13,30,.94)';
    ctx.fillRect(38, h - 158, w - 76, 102);
    ctx.strokeStyle = '#d9b277'; ctx.lineWidth = 4;
    ctx.strokeRect(38, h - 158, w - 76, 102);
    ctx.fillStyle = '#f2d99c';
    ctx.font = '700 45px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type === 0 ? 'FESTIVAL OF WONDER' : type === 1 ? 'RIDE THE STARLIGHT' : 'SWEETS & WISHES', w / 2, h - 105);
  });
}
const posterThemeMaterials = [];
function addPosterBoard(x, z, rotY, type) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  posterRoot.add(g);
  const wood = toonMat(0x5c4140);
  addBox(g, 0.12, 1.9, 0.12, wood, -0.62, 0.95, 0, { castShadow: false });
  addBox(g, 0.12, 1.9, 0.12, wood, 0.62, 0.95, 0, { castShadow: false });
  addBox(g, 1.45, 1.98, 0.1, toonMat(0x382b35), 0, 1.0, 0, { castShadow: false });
  addBox(g, 1.32, 1.85, 0.05, toonMat(0xd4b77a), 0, 1.0, 0.07, { castShadow: false });
  const posterMat = new THREE.MeshBasicMaterial({ map: makePosterTexture(type), toneMapped: false });
  addPlane(g, 1.2, 1.7, posterMat, 0, 1.0, 0.11);
  posterThemeMaterials.push({ mat: posterMat, type });
  addGlow(g, 0xffc37e, 1.8, 0, 1.0, 0.22, 0.16);
  assemble(g, 15.1, 0.7, 'drop', { offset: 2.5 });
}
addPosterBoard(-6.65, 17.55, 0.22, 0);
addPosterBoard(5.95, 9.95, -0.58, 1);
addPosterBoard(10.35, -5.7, -0.9, 2);

// a hand-painted marquee for the haunted house neighbor
const marqueeGroup = new THREE.Group();
marqueeGroup.position.set(5.75, 0, 18.25);
marqueeGroup.rotation.y = 0.05;
park.add(marqueeGroup);
for (const x of [-1.0, 1.0]) addBox(marqueeGroup, 0.1, 2.3, 0.1, toonMat(0x3e2b35), x, 1.15, 0, { castShadow: false });
const marqueeTex = canvasTexture(768, 192, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(72,36,83,.95)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 14); ctx.fill();
  ctx.strokeStyle = '#ffd493'; ctx.lineWidth = 5; ctx.stroke();
  ctx.font = '700 49px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff0c6';
  ctx.fillText('THE DREAM MENAGERIE', w / 2, h * 0.4);
  ctx.font = '500 24px Georgia, serif';
  ctx.fillStyle = '#ffc3e5';
  ctx.fillText('WONDERS  ·  WISHES  ·  SWEET THINGS', w / 2, h * 0.7);
});
addBox(marqueeGroup, 2.2, 0.72, 0.12, toonMat(0x3e2b35), 0, 2.1, 0, { castShadow: false });
addPlane(marqueeGroup, 2.05, 0.58, new THREE.MeshBasicMaterial({ map: marqueeTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }), 0, 2.1, 0.07);
assemble(marqueeGroup, 15.2, 0.7, 'drop', { offset: 2.2 });

/* --------------------------------------------------------------------------
   Warm practical lights inside the park
   -------------------------------------------------------------------------- */
assemblyPhase = 'lights';
const practicalLightDefinitions = [
  { color: 0xffbe72, intensity: 10, distance: 14, pos: [0, 3.8, 4.6], start: 8.9, flicker: 0.055 },
  { color: 0xffd08e, intensity: 8, distance: 10, pos: [0, 2.2, 9.4], start: 14.25, flicker: 0.06 },
  { color: 0xffa0d8, intensity: 3.0, distance: 8, pos: [-10.2, 2.2, 8.5], start: 12.4, flicker: 0.05 },
  { color: 0xa6d8ff, intensity: 3.5, distance: 11, pos: [11.4, 2.2, -7.4], start: 11.5, flicker: 0.03 },
  { color: 0xd8b0ff, intensity: 3.0, distance: 8, pos: [8.6, 2.0, 8.1], start: 12.2, flicker: 0.06 },
  { color: 0xffc078, intensity: 5, distance: 8, pos: [3.2, 2.2, 16.2], start: 13.15, flicker: 0.07 },
  { color: 0xbaa4ff, intensity: 3.0, distance: 9, pos: [-16.2, 5.8, 15.0], start: 13.9, flicker: 0.04 },
  { color: 0xffb8e0, intensity: 6, distance: 7, pos: [4.9, 1.35, 9.15], start: 14.35, flicker: 0.09 },
  { color: 0xffcf90, intensity: 5, distance: 6.5, pos: [0, 1.25, 18.2], start: 13.35, flicker: 0.1 },
];
const practicalLights = [];
for (const def of practicalLightDefinitions) {
  const light = addAccentLight(def.color, def.intensity, def.distance, def.pos[0], def.pos[1], def.pos[2]);
  light.intensity = def.intensity;
  light.userData.flicker = def.flicker;
  light.userData.baseIntensity = def.intensity;
  light.userData.start = def.start;
  light.userData.phase = rand(0, TAU);
  practicalLights.push(light);
  assemble(light, def.start, 1.15, 'light');
}

// extra warm spill patches on the paving
const warmPools = new THREE.Group();
park.add(warmPools);
addGlowPool(warmPools, 0xffc47c, 3.4, 0.5, 4.2, 0.28, 1.0);
addGlowPool(warmPools, 0xffd69a, 4.2, 0.0, 10.15, 0.22, 1.05);
addGlowPool(warmPools, 0xffb9e2, 2.5, 4.8, 9.2, 0.2, 0.9);
addGlowPool(warmPools, 0xffd39a, 2.8, 4.1, 16.0, 0.2, 0.8);
addGlowPool(warmPools, 0xffb0dc, 2.4, -4.3, 15.2, 0.18, 0.8);
addGlowPool(warmPools, 0xff9ed6, 3.8, -10.2, 7.1, 0.15, 0.9);
addGlowPool(warmPools, 0xa8d8ff, 3.4, 10.9, -7.7, 0.14, 0.9);
addGlowPool(warmPools, 0xc9b4ff, 3.0, 8.4, 6.7, 0.12, 0.8);
assemble(warmPools, 13.3, 1.2, 'fade');

// a small sign above the ticket window made of individual bulbs
const bulbSignGroup = new THREE.Group();
bulbSignGroup.position.set(4.15, 0, 16.15);
bulbSignGroup.rotation.y = 0.16;
park.add(bulbSignGroup);
for (let i = 0; i < 16; i++) {
  const t = i / 15;
  addSphere(bulbSignGroup, 0.045, basicMat(i % 2 ? 0xffc56d : 0xff91ba, { toneMapped: false }), -0.9 + t * 1.8, 2.76 - Math.sin(t * Math.PI) * 0.18, 1.06, { wSeg: 5, hSeg: 4, castShadow: false });
}
assemble(bulbSignGroup, 13.2, 0.8, 'fade');

/* --------------------------------------------------------------------------
   Ground mist, smoke and floating atmosphere
   -------------------------------------------------------------------------- */
assemblyPhase = 'atmosphere';
const mistTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const rr = mulberry32(8811);
  for (let i = 0; i < 48; i++) {
    const x = w * 0.1 + rr() * w * 0.8;
    const y = h * 0.1 + rr() * h * 0.8;
    const r = 25 + rr() * 105;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.018 + rr() * 0.045})`);
    g.addColorStop(0.6, `rgba(255,255,255,${0.01 + rr() * 0.02})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'destination-in';
  const maskX = ctx.createLinearGradient(0, 0, w, 0);
  maskX.addColorStop(0, 'rgba(255,255,255,0)');
  maskX.addColorStop(0.15, 'rgba(255,255,255,.85)');
  maskX.addColorStop(0.5, 'rgba(255,255,255,1)');
  maskX.addColorStop(0.85, 'rgba(255,255,255,.85)');
  maskX.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = maskX;
  ctx.fillRect(0, 0, w, h);
  const maskY = ctx.createLinearGradient(0, 0, 0, h);
  maskY.addColorStop(0, 'rgba(255,255,255,0)');
  maskY.addColorStop(0.15, 'rgba(255,255,255,.85)');
  maskY.addColorStop(0.5, 'rgba(255,255,255,1)');
  maskY.addColorStop(0.85, 'rgba(255,255,255,.85)');
  maskY.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = maskY;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
});
// A denser puff texture for the new volumetric fog layers.
const fogPuffTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const rr = mulberry32(18377);
  for (let i = 0; i < 28; i++) {
    const x = w * 0.22 + rr() * w * 0.56;
    const y = h * 0.22 + rr() * h * 0.56;
    const r = 35 + rr() * 125;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const alpha = 0.035 + rr() * 0.075;
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.7})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // soften the square texture boundary
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.64, 'rgba(255,255,255,.95)');
  mask.addColorStop(0.9, 'rgba(255,255,255,.25)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
});

const mistRoot = new THREE.Group();
mistRoot.name = 'groundMist';
park.add(mistRoot);
const mistLayers = [];
const mistPositions = [
  [-12, 0, 12, 14, 8, 0.13], [8, 0, 13, 16, 10, 0.09], [0, 0, -10, 18, 11, 0.115],
  [14, 0, -3, 12, 8, 0.09], [-15, 0, -4, 15, 9, 0.1], [5, 0, 17, 12, 7, 0.07],
  [-3, 0, 7, 13, 7, 0.055], [10, 0, 1, 10, 6, 0.065],
];
for (let i = 0; i < mistPositions.length; i++) {
  const [x, y, z, w, h, op] = mistPositions[i];
  const mat = new THREE.MeshBasicMaterial({
    map: mistTex,
    color: i % 3 === 0 ? 0x9a7dd6 : i % 3 === 1 ? 0x6883c9 : 0xb17ea1,
    transparent: true,
    opacity: op,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rand(0, TAU);
  mesh.position.set(x, 0.22 + i * 0.012, z);
  mistRoot.add(mesh);
  mistLayers.push({ mesh, baseX: x, baseZ: z, phase: rand(0, TAU), speed: rand(0.02, 0.06), baseOpacity: op });
}
assemble(mistRoot, 17.4, 2.4, 'fade');

// lower ground-hugging wisps around the moat
const wispRoot = new THREE.Group();
park.add(wispRoot);
for (let i = 0; i < 12; i++) {
  const angle = i / 12 * TAU;
  const mat = new THREE.SpriteMaterial({
    map: mistTex, color: 0x9d80e0, transparent: true, opacity: 0.13,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: true, toneMapped: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.position.set(Math.cos(angle) * rand(3.5, 6.1), rand(0.2, 0.55), -4.2 + Math.sin(angle) * rand(3.5, 6.1));
  sp.scale.set(rand(3.2, 5.8), rand(1.5, 2.8), 1);
  wispRoot.add(sp);
}
assemble(wispRoot, 17.65, 2.0, 'fade');

/* --------------------------------------------------------------------------
   Layered purple mist hugging the castle
   -------------------------------------------------------------------------- */
const castleMistRoot = new THREE.Group();
castleMistRoot.name = 'castleMist';
park.add(castleMistRoot);
const castleMistSprites = [];
for (let i = 0; i < 22; i++) {
  const angle = i / 22 * TAU + rand(-0.35, 0.35);
  const radius = rand(3.6, 9.2);
  const y = rand(0.7, 6.8);
  const additive = i % 4 === 0;
  const mat = new THREE.SpriteMaterial({
    map: fogPuffTex,
    color: additive ? 0xb68cff : (i % 2 ? 0x8b5ddd : 0xa173e2),
    transparent: true,
    opacity: additive ? rand(0.14, 0.26) : rand(0.3, 0.46),
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: true,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(Math.cos(angle) * radius, y, -4.0 + Math.sin(angle) * radius);
  sprite.scale.set(rand(4.0, 8.4), rand(2.5, 5.0), 1);
  sprite.material.rotation = rand(0, TAU);
  castleMistRoot.add(sprite);
  castleMistSprites.push({
    sprite,
    baseAngle: angle,
    baseRadius: radius,
    baseY: y,
    phase: rand(0, TAU),
    speed: rand(0.035, 0.08) * (i % 2 ? 1 : -1),
    baseOpacity: mat.opacity,
    additive,
  });
}
// wide, low banks of purple fog wrapping the castle island
const castleFogBanks = [];
for (let i = 0; i < 5; i++) {
  const mat = new THREE.MeshBasicMaterial({
    map: fogPuffTex,
    color: i % 2 ? 0x7c4fc7 : 0x9669da,
    transparent: true,
    opacity: rand(0.22, 0.32),
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rand(11, 17), rand(8, 13)), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rand(0, TAU);
  mesh.position.set(rand(-3, 3), 0.28 + i * 0.09, -4.0 + rand(-3, 3));
  castleMistRoot.add(mesh);
  castleFogBanks.push({ mesh, phase: rand(0, TAU), spin: rand(-0.00018, 0.00018), baseOpacity: mat.opacity });
}
// saturated violet wisps that catch the eye around the illuminated facade
const castleHazeSprites = [];
for (const [x, y, z, sx, sy, op] of [
  [6.2, 2.4, 1.4, 8.2, 4.2, 0.24],
  [-5.7, 2.8, 2.0, 8.8, 4.6, 0.22],
  [1.0, 4.8, 2.0, 6.4, 3.6, 0.17],
  [7.2, 1.1, -4.6, 8.2, 3.5, 0.19],
  [-3.6, 5.4, -2.5, 7.0, 4.0, 0.16],
  [0.4, 3.2, 5.4, 13.0, 5.4, 0.18],
  [-6.3, 2.5, 5.0, 10.0, 4.4, 0.15],
  [7.5, 3.0, 3.4, 9.0, 4.0, 0.13],
]) {
  const mat = new THREE.SpriteMaterial({
    map: fogPuffTex, color: 0xb389ff, transparent: true, opacity: op,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true, toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(sx, sy, 1);
  sprite.material.rotation = rand(0, TAU);
  castleMistRoot.add(sprite);
  castleHazeSprites.push({ sprite, bx: x, by: y, bz: z, phase: rand(0, TAU) });
}
assemble(castleMistRoot, 17.15, 2.2, 'fade');

/* --------------------------------------------------------------------------
   Thick, slowly rolling ground fog
   -------------------------------------------------------------------------- */
const groundFogRoot = new THREE.Group();
groundFogRoot.name = 'groundFog';
park.add(groundFogRoot);
const groundFogSystems = [];
function makeGroundFog(count, size, color, opacity, yMin, yMax, seed) {
  const rr = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const data = [];
  for (let i = 0; i < count; i++) {
    const angle = rr() * TAU;
    const radius = 3 + rr() * 15.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 1.2;
    const y = yMin + rr() * (yMax - yMin);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    data.push({
      bx: x, bz: z, by: y,
      driftX: rr() * 0.045 + 0.015,
      driftZ: rr() * 0.035 + 0.01,
      phase: rr() * TAU,
      bob: rr() * 0.1 + 0.02,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: fogPuffTex,
    color,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
    fog: true,
    toneMapped: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  groundFogRoot.add(points);
  groundFogSystems.push({ points, data, positions, geo, baseOpacity: opacity });
}
makeGroundFog(32, 4.8, 0x7655b9, 0.14, 0.25, 0.85, 8841);
makeGroundFog(42, 2.3, 0x9b7bde, 0.18, 0.35, 1.35, 8842);
makeGroundFog(26, 7.2, 0x60468f, 0.11, 0.15, 0.55, 8843);
const groundFogSheets = [];
for (const [x, z, w, h, op, color] of [
  [0.5, 6.2, 16, 10, 0.24, 0x956edf],
  [-9.5, 10.5, 13, 8, 0.2, 0x815ac7],
  [9.2, 3.8, 12, 8, 0.19, 0x9f78e0],
]) {
  const mat = new THREE.MeshBasicMaterial({
    map: fogPuffTex, color, transparent: true, opacity: op,
    depthWrite: false, side: THREE.DoubleSide, fog: true, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rand(0, TAU);
  mesh.position.set(x, 0.43, z);
  groundFogRoot.add(mesh);
  groundFogSheets.push({ mesh, phase: rand(0, TAU), spin: rand(-0.0003, 0.0003), baseOpacity: op });
}
assemble(groundFogRoot, 17.3, 2.3, 'fade');

/* --------------------------------------------------------------------------
   Volumetric moonlight shafts
   -------------------------------------------------------------------------- */
const moonBeamRoot = new THREE.Group();
moonBeamRoot.name = 'moonVolumetricShafts';
park.add(moonBeamRoot);
const moonBeamUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
const moonBeamMat = new THREE.ShaderMaterial({
  uniforms: moonBeamUniforms,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    varying vec2 vUv;
    varying vec3 vWorld;
    void main(){
      vUv = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    uniform float uOpacity;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p); vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
    }
    void main(){
      float sideFade = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
      float endFade = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
      float wisps = noise(vWorld.xz * 0.65 + vec2(vWorld.y * 0.2, uTime * 0.035));
      wisps = smoothstep(0.23, 0.9, wisps);
      float alpha = sideFade * endFade * (0.018 + wisps * 0.075) * uOpacity;
      vec3 col = mix(vec3(0.43, 0.56, 1.0), vec3(0.78, 0.87, 1.0), wisps);
      gl_FragColor = vec4(col, alpha);
    }
  `,
});
function addMoonBeam(apex, base, width, roll, beamWidthScale = 1) {
  const start = new THREE.Vector3(...apex);
  const end = new THREE.Vector3(...base);
  const dir = start.clone().sub(end);
  const length = dir.length();
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const axis = dir.normalize();
  const holder = new THREE.Group();
  holder.position.copy(mid);
  holder.quaternion.setFromUnitVectors(UP, axis);
  const geo = new THREE.PlaneGeometry(width, length, 1, 20);
  // taper the shaft toward its source by moving the top vertices inward
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + length / 2) / length;
    pos.setX(i, pos.getX(i) * (0.28 + 0.72 * (1 - t)) * beamWidthScale);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, moonBeamMat);
  mesh.rotation.y = roll;
  mesh.renderOrder = 4;
  holder.add(mesh);
  moonBeamRoot.add(holder);
}
addMoonBeam([-29, 25, -26], [2.0, 0.2, 3.0], 8.5, 0.2);
addMoonBeam([-29, 25, -26], [-1.0, 0.2, 1.0], 5.5, 1.05);
addMoonBeam([-31, 27, -23], [-7.0, 0.2, -4.5], 7.0, 2.1);
addMoonBeam([-27, 22, -20], [7.0, 0.2, -2.0], 4.0, 0.7);
// a few tiny motes suspended in the shafts
const beamDustCount = 50;
const beamDustPos = new Float32Array(beamDustCount * 3);
for (let i = 0; i < beamDustCount; i++) {
  const t = rand(0.1, 0.9);
  const x = lerp(-25, 2, t) + rand(-4, 4);
  const y = lerp(20, 1.0, t) + rand(-1.5, 1.5);
  const z = lerp(-22, 2, t) + rand(-3, 3);
  beamDustPos[i * 3] = x;
  beamDustPos[i * 3 + 1] = y;
  beamDustPos[i * 3 + 2] = z;
}
const beamDustGeo = new THREE.BufferGeometry();
beamDustGeo.setAttribute('position', new THREE.BufferAttribute(beamDustPos, 3));
const beamDustMat = new THREE.PointsMaterial({
  color: 0xbcd7ff, size: 0.16, transparent: true, opacity: 0.55,
  map: glowTex, depthWrite: false, blending: THREE.AdditiveBlending,
  sizeAttenuation: true, toneMapped: false,
});
const beamDust = new THREE.Points(beamDustGeo, beamDustMat);
moonBeamRoot.add(beamDust);
assemble(moonBeamRoot, 17.05, 2.0, 'fade');
// mark these animated fog meshes so static merging never touches them
mistLayers.forEach((layer) => layer.mesh.userData.noMerge = true);
wispRoot.children.forEach((s) => { s.userData.noMerge = true; });

// chimney smoke
const smokeRoot = new THREE.Group();
smokeRoot.name = 'chimneySmoke';
smokeRoot.visible = false;
park.add(smokeRoot);
const smokeCount = 24;
const smokePos = new Float32Array(smokeCount * 3);
const smokeSeed = new Float32Array(smokeCount);
for (let i = 0; i < smokeCount; i++) {
  smokePos[i * 3] = 10.7 + rand(-0.2, 0.2);
  smokePos[i * 3 + 1] = 8.5 + rand(0, 3.4);
  smokePos[i * 3 + 2] = 4.8 + rand(-0.2, 0.2);
  smokeSeed[i] = rand(0, 1);
}
const smokeGeo = new THREE.BufferGeometry();
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
const smokeMat = new THREE.PointsMaterial({
  map: mistTex, color: 0x8f85b9, size: 1.05, transparent: true, opacity: 0.2,
  depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true, toneMapped: false,
});
const smokePuffs = new THREE.Points(smokeGeo, smokeMat);
smokeRoot.add(smokePuffs);
assemble(smokeRoot, 12.2, 1.2, 'fade');

// floating magic motes
const moteRoot = new THREE.Group();
moteRoot.name = 'magicMotes';
park.add(moteRoot);
const moteCount = 280;
const motePositions = new Float32Array(moteCount * 3);
const moteColors = new Float32Array(moteCount * 3);
const moteSizes = new Float32Array(moteCount);
const motePhases = new Float32Array(moteCount);
const moteData = [];
const motePalette = [new THREE.Color(0xffc46d), new THREE.Color(0xb58bff), new THREE.Color(0x7effd8), new THREE.Color(0xff8cba)];
for (let i = 0; i < moteCount; i++) {
  const angle = rand(0, TAU);
  const radius = rand(1.2, 11.5);
  const data = {
    bx: Math.cos(angle) * radius,
    by: rand(0.2, 7.2),
    bz: rand(-10.5, 6.5),
    r: radius,
    angle,
    speed: rand(0.04, 0.15) * (R() > 0.5 ? 1 : -1),
    rise: rand(0.12, 0.4),
    phase: rand(0, TAU),
  };
  moteData.push(data);
  motePositions[i * 3] = data.bx;
  motePositions[i * 3 + 1] = data.by;
  motePositions[i * 3 + 2] = data.bz;
  const col = pick(motePalette);
  const b = rand(0.8, 1.8);
  moteColors[i * 3] = col.r * b;
  moteColors[i * 3 + 1] = col.g * b;
  moteColors[i * 3 + 2] = col.b * b;
  moteSizes[i] = rand(0.55, 1.65);
  motePhases[i] = rand(0, TAU);
}
const moteGeo = new THREE.BufferGeometry();
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
moteGeo.setAttribute('aColor', new THREE.BufferAttribute(moteColors, 3));
moteGeo.setAttribute('aSize', new THREE.BufferAttribute(moteSizes, 1));
moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(motePhases, 1));
const moteMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (78.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = 0.38 + 0.62 * (0.5 + 0.5 * sin(uTime * 1.8 + aPhase * 3.2));
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uOpacity;
    void main(){
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p);
      float core = smoothstep(0.5, 0.02, d);
      gl_FragColor = vec4(vColor * (1.0 + core * 0.8), core * vAlpha * uOpacity);
    }
  `,
});
const motes = new THREE.Points(moteGeo, moteMat);
motes.frustumCulled = false;
moteRoot.add(motes);
assemble(moteRoot, 17.85, 2.1, 'fade');

/* --------------------------------------------------------------------------
   Fairy-tale dream layer: sky lanterns, glowing flowers, starlight dust
   -------------------------------------------------------------------------- */
const dreamLayerRoot = new THREE.Group();
dreamLayerRoot.name = 'dreamLayer';
park.add(dreamLayerRoot);

// --- glowing flower heads + stems -----------------------------------------
const flowerPetalGeos = [];
for (let i = 0; i < 5; i++) {
  const a = i / 5 * TAU;
  const petal = new THREE.SphereGeometry(0.23, 7, 5);
  petal.scale(1.5, 0.26, 0.62);
  petal.rotateY(a);
  petal.translate(Math.cos(a) * 0.23, 0, Math.sin(a) * 0.23);
  flowerPetalGeos.push(petal);
}
const flowerCenterGeo = new THREE.SphereGeometry(0.1, 8, 6);
flowerCenterGeo.translate(0, 0.035, 0);
const flowerHeadGeo = mergeGeometries([...flowerPetalGeos, flowerCenterGeo]);
const flowerHeadMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const stemGeo = new THREE.CylinderGeometry(0.016, 0.026, 1, 5);
stemGeo.translate(0, 0.5, 0);
const flowerStemMat = new THREE.MeshToonMaterial({ color: 0x5d8f80, emissive: 0x1d3b35, emissiveIntensity: 0.35, gradientMap: toonGradient });
const flowerCount = 96;
const flowerHeads = new THREE.InstancedMesh(flowerHeadGeo, flowerHeadMat, flowerCount);
const flowerStems = new THREE.InstancedMesh(stemGeo, flowerStemMat, flowerCount);
flowerHeads.castShadow = false;
flowerStems.castShadow = false;
const flowerPalette = [new THREE.Color(0xffa8d8), new THREE.Color(0xc6a5ff), new THREE.Color(0xa8d8ff), new THREE.Color(0xffe1a0), new THREE.Color(0xffc2e8)];
const flowerGlowPositions = new Float32Array(flowerCount * 3);
const flowerGlowColors = new Float32Array(flowerCount * 3);
const flowerClusters = [
  [-9.8, 17.3, 1.8], [10.95, 17.25, 1.6], [5.7, -17.1, 1.8], [-16.5, -16.2, 1.4],
  [-4.0, 13.8, 1.45], [4.2, 13.6, 1.35], [-10.4, 7.3, 1.55], [10.9, -6.7, 1.6],
  [8.8, 7.2, 1.35], [-15.9, 10.6, 1.4], [14.0, -2.2, 1.35], [-3.0, -14.4, 1.45],
  [13.1, 11.9, 1.3], [-13.0, 11.6, 1.3], [11.9, 7.0, 1.2], [-12.2, -6.8, 1.25],
  [10.5, 2.1, 1.25], [7.4, 4.1, 1.0],
];
const flowerDummy = new THREE.Object3D();
const flowerRng = mulberry32(8821);
for (let i = 0; i < flowerCount; i++) {
  const cluster = flowerClusters[i % flowerClusters.length];
  const a = flowerRng() * TAU;
  const r = Math.sqrt(flowerRng()) * cluster[2];
  const x = cluster[0] + Math.cos(a) * r;
  const z = cluster[1] + Math.sin(a) * r;
  const h = rand2(flowerRng, 0.28, 0.68);
  flowerDummy.position.set(x, 0, z);
  flowerDummy.rotation.set(0, flowerRng() * TAU, 0);
  flowerDummy.scale.set(1, h, 1);
  flowerDummy.updateMatrix();
  flowerStems.setMatrixAt(i, flowerDummy.matrix);
  const size = rand2(flowerRng, 0.78, 1.45);
  flowerDummy.position.set(x, h + 0.04, z);
  flowerDummy.rotation.set(rand2(flowerRng, -0.22, 0.22), flowerRng() * TAU, rand2(flowerRng, -0.22, 0.22));
  flowerDummy.scale.set(size, size * rand2(flowerRng, 0.55, 0.8), size);
  flowerDummy.updateMatrix();
  flowerHeads.setMatrixAt(i, flowerDummy.matrix);
  const col = flowerPalette[i % flowerPalette.length];
  flowerHeads.setColorAt(i, col);
  flowerGlowPositions[i * 3] = x;
  flowerGlowPositions[i * 3 + 1] = h + 0.1;
  flowerGlowPositions[i * 3 + 2] = z;
  flowerGlowColors[i * 3] = col.r * 1.15;
  flowerGlowColors[i * 3 + 1] = col.g * 1.15;
  flowerGlowColors[i * 3 + 2] = col.b * 1.15;
}
flowerHeads.instanceMatrix.needsUpdate = true;
flowerStems.instanceMatrix.needsUpdate = true;
if (flowerHeads.instanceColor) flowerHeads.instanceColor.needsUpdate = true;
const flowerGlowGeo = new THREE.BufferGeometry();
flowerGlowGeo.setAttribute('position', new THREE.BufferAttribute(flowerGlowPositions, 3));
flowerGlowGeo.setAttribute('color', new THREE.BufferAttribute(flowerGlowColors, 3));
const flowerGlowMat = new THREE.PointsMaterial({
  map: softGlowTex, size: 0.62, vertexColors: true, transparent: true, opacity: 0.33,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false,
});
const flowerGlows = new THREE.Points(flowerGlowGeo, flowerGlowMat);
dreamLayerRoot.add(flowerHeads, flowerStems, flowerGlows);
assemble(dreamLayerRoot, 17.95, 1.5, 'fade');

// --- floating sky lanterns -------------------------------------------------
const skyLanternCount = 24;
const skyLanternBodyParts = [];
const lanternBody = new THREE.CylinderGeometry(0.23, 0.16, 0.52, 8, 1, false);
lanternBody.translate(0, 0.26, 0);
const lanternTop = new THREE.CylinderGeometry(0.1, 0.2, 0.09, 8);
lanternTop.translate(0, 0.56, 0);
const lanternBottom = new THREE.CylinderGeometry(0.16, 0.07, 0.08, 8);
lanternBottom.translate(0, -0.02, 0);
skyLanternBodyParts.push(lanternBody, lanternTop, lanternBottom);
const skyLanternBodyGeo = mergeGeometries(skyLanternBodyParts);
const lanternUpperRim = new THREE.TorusGeometry(0.19, 0.017, 5, 16);
lanternUpperRim.rotateX(Math.PI / 2);
lanternUpperRim.translate(0, 0.54, 0);
const lanternLowerRim = new THREE.TorusGeometry(0.155, 0.014, 5, 16);
lanternLowerRim.rotateX(Math.PI / 2);
lanternLowerRim.translate(0, 0.02, 0);
const skyLanternRimGeo = mergeGeometries([lanternUpperRim, lanternLowerRim]);
const skyLanternBodyMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.94 });
const skyLanternRimMat = new THREE.MeshBasicMaterial({ color: 0xffd18a, toneMapped: false, transparent: true, opacity: 0.96 });
const skyLanternGlowGeo = new THREE.BufferGeometry();
const skyLanternGlowPos = new Float32Array(skyLanternCount * 3);
const skyLanternGlowCol = new Float32Array(skyLanternCount * 3);
const skyLanternColors = [new THREE.Color(0xffcf99), new THREE.Color(0xffaed6), new THREE.Color(0xffe5b8), new THREE.Color(0xcab0ff)];
const skyLanternData = [];
for (let i = 0; i < skyLanternCount; i++) {
  const a = rand(0, TAU);
  const radius = rand(8, 20);
  const baseX = Math.cos(a) * radius;
  const baseZ = Math.sin(a) * radius * 0.8;
  const baseY = rand(7.5, 22);
  const col = skyLanternColors[i % skyLanternColors.length];
  skyLanternData.push({
    baseX, baseZ, baseY, speed: rand(0.2, 0.58), sway: rand(0.35, 1.1),
    phase: rand(0, TAU), scale: rand(0.8, 1.35), color: col,
  });
  skyLanternGlowPos[i * 3] = baseX;
  skyLanternGlowPos[i * 3 + 1] = baseY + 0.3;
  skyLanternGlowPos[i * 3 + 2] = baseZ;
  skyLanternGlowCol[i * 3] = col.r;
  skyLanternGlowCol[i * 3 + 1] = col.g;
  skyLanternGlowCol[i * 3 + 2] = col.b;
}
skyLanternGlowGeo.setAttribute('position', new THREE.BufferAttribute(skyLanternGlowPos, 3));
skyLanternGlowGeo.setAttribute('color', new THREE.BufferAttribute(skyLanternGlowCol, 3));
const skyLanternGlowMat = new THREE.PointsMaterial({
  map: softGlowTex, size: 0.72, vertexColors: true, transparent: true, opacity: 0.36,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false,
});
const skyLanternBodyMesh = new THREE.InstancedMesh(skyLanternBodyGeo, skyLanternBodyMat, skyLanternCount);
const skyLanternRimMesh = new THREE.InstancedMesh(skyLanternRimGeo, skyLanternRimMat, skyLanternCount);
skyLanternBodyMesh.frustumCulled = false;
skyLanternRimMesh.frustumCulled = false;
skyLanternBodyMesh.castShadow = false;
skyLanternRimMesh.castShadow = false;
for (let i = 0; i < skyLanternCount; i++) {
  skyLanternBodyMesh.setColorAt(i, skyLanternData[i].color);
}
if (skyLanternBodyMesh.instanceColor) skyLanternBodyMesh.instanceColor.needsUpdate = true;
const skyLanternGlowPoints = new THREE.Points(skyLanternGlowGeo, skyLanternGlowMat);
skyLanternGlowPoints.frustumCulled = false;
const skyLanternRoot = new THREE.Group();
skyLanternRoot.name = 'skyLanterns';
skyLanternRoot.add(skyLanternBodyMesh, skyLanternRimMesh, skyLanternGlowPoints);
park.add(skyLanternRoot);
assemble(skyLanternRoot, 18.08, 1.8, 'fade');

// --- extra fairy starlight and drifting dream dust ------------------------
const wishStarTex = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const halo = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  halo.addColorStop(0, 'rgba(255,255,255,.95)');
  halo.addColorStop(0.22, 'rgba(255,232,250,.7)');
  halo.addColorStop(1, 'rgba(255,190,240,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff8e6';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? w * 0.27 : w * 0.09;
    const px = w / 2 + Math.cos(a) * r;
    const py = h / 2 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
});
const wishStarCount = 96;
const wishStarPositions = new Float32Array(wishStarCount * 3);
const wishStarColors = new Float32Array(wishStarCount * 3);
const wishStarPalette = [new THREE.Color(0xffe9fb), new THREE.Color(0xffc1e4), new THREE.Color(0xc8b9ff), new THREE.Color(0xb4e0ff), new THREE.Color(0xffe0a5)];
for (let i = 0; i < wishStarCount; i++) {
  const a = rand(0, TAU);
  const radius = rand(5, 20);
  wishStarPositions[i * 3] = Math.cos(a) * radius;
  wishStarPositions[i * 3 + 1] = rand(2.5, 17);
  wishStarPositions[i * 3 + 2] = Math.sin(a) * radius;
  const col = wishStarPalette[i % wishStarPalette.length];
  wishStarColors[i * 3] = col.r;
  wishStarColors[i * 3 + 1] = col.g;
  wishStarColors[i * 3 + 2] = col.b;
}
const wishStarGeo = new THREE.BufferGeometry();
wishStarGeo.setAttribute('position', new THREE.BufferAttribute(wishStarPositions, 3));
wishStarGeo.setAttribute('color', new THREE.BufferAttribute(wishStarColors, 3));
const wishStarMat = new THREE.PointsMaterial({
  map: wishStarTex, size: 0.42, vertexColors: true, transparent: true, opacity: 0.55,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false,
});
const wishStars = new THREE.Points(wishStarGeo, wishStarMat);
wishStars.frustumCulled = false;

const bokehTex = canvasTexture(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,.9)');
  g.addColorStop(0.25, 'rgba(255,208,244,.55)');
  g.addColorStop(0.7, 'rgba(195,164,255,.16)');
  g.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, TAU); ctx.fill();
});
const dreamDustCount = 130;
const dreamDustPositions = new Float32Array(dreamDustCount * 3);
const dreamDustColors = new Float32Array(dreamDustCount * 3);
const dreamDustData = [];
const dreamDustPalette = [new THREE.Color(0xffc6e9), new THREE.Color(0xd2bcff), new THREE.Color(0xb6ddff), new THREE.Color(0xffe1a7), new THREE.Color(0xffe9fb)];
for (let i = 0; i < dreamDustCount; i++) {
  const a = rand(0, TAU);
  const r = rand(3, 18);
  const data = {
    x: Math.cos(a) * r, y: rand(0.6, 12.5), z: Math.sin(a) * r,
    phase: rand(0, TAU), drift: rand(0.25, 0.75), swirl: rand(0.2, 0.8),
  };
  dreamDustData.push(data);
  dreamDustPositions[i * 3] = data.x;
  dreamDustPositions[i * 3 + 1] = data.y;
  dreamDustPositions[i * 3 + 2] = data.z;
  const col = dreamDustPalette[i % dreamDustPalette.length];
  const b = rand(0.8, 1.3);
  dreamDustColors[i * 3] = col.r * b;
  dreamDustColors[i * 3 + 1] = col.g * b;
  dreamDustColors[i * 3 + 2] = col.b * b;
}
const dreamDustGeo = new THREE.BufferGeometry();
dreamDustGeo.setAttribute('position', new THREE.BufferAttribute(dreamDustPositions, 3));
dreamDustGeo.setAttribute('color', new THREE.BufferAttribute(dreamDustColors, 3));
const dreamDustMat = new THREE.PointsMaterial({
  map: bokehTex, size: 0.34, vertexColors: true, transparent: true, opacity: 0.34,
  blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false,
});
const dreamDust = new THREE.Points(dreamDustGeo, dreamDustMat);
dreamDust.frustumCulled = false;
const starlightRoot = new THREE.Group();
starlightRoot.name = 'starlightDust';
starlightRoot.add(wishStars, dreamDust);
park.add(starlightRoot);
assemble(starlightRoot, 18.15, 1.7, 'fade');

let lanternElapsed = 0;
const lanternDummy = new THREE.Object3D();
function updateDreamLayer(time, dt) {
  // Lanterns rise gently and reset far overhead.
  if (skyLanternRoot.visible && skyLanternBodyMat.opacity > 0.01) {
    lanternElapsed += Math.min(dt, 0.05);
    const glowAttr = skyLanternGlowGeo.attributes.position;
    for (let i = 0; i < skyLanternCount; i++) {
      const d = skyLanternData[i];
      let y = d.baseY + lanternElapsed * d.speed;
      if (y > 28) {
        d.baseX = rand(-20, 20);
        d.baseZ = rand(-16, 16);
        d.baseY = rand(5, 8.5);
        d.speed = rand(0.2, 0.58);
        d.phase = rand(0, TAU);
        y = d.baseY + lanternElapsed * d.speed;
      }
      const x = d.baseX + Math.sin(lanternElapsed * 0.32 + d.phase) * d.sway;
      const z = d.baseZ + Math.cos(lanternElapsed * 0.27 + d.phase) * d.sway * 0.7;
      lanternDummy.position.set(x, y, z);
      lanternDummy.rotation.set(
        Math.sin(lanternElapsed * 0.5 + d.phase) * 0.06,
        lanternElapsed * 0.18 + d.phase,
        Math.cos(lanternElapsed * 0.4 + d.phase) * 0.05
      );
      lanternDummy.scale.setScalar(d.scale);
      lanternDummy.updateMatrix();
      skyLanternBodyMesh.setMatrixAt(i, lanternDummy.matrix);
      skyLanternRimMesh.setMatrixAt(i, lanternDummy.matrix);
      glowAttr.setXYZ(i, x, y + 0.3, z);
    }
    skyLanternBodyMesh.instanceMatrix.needsUpdate = true;
    skyLanternRimMesh.instanceMatrix.needsUpdate = true;
    glowAttr.needsUpdate = true;
  }
  // Slow dream dust drift.
  const dustAttr = dreamDustGeo.attributes.position;
  for (let i = 0; i < dreamDustCount; i++) {
    const d = dreamDustData[i];
    dustAttr.setX(i, d.x + Math.sin(time * d.drift + d.phase) * 0.42);
    dustAttr.setY(i, d.y + Math.sin(time * d.swirl + d.phase * 1.7) * 0.34);
    dustAttr.setZ(i, d.z + Math.cos(time * d.drift * 0.8 + d.phase) * 0.42);
  }
  dustAttr.needsUpdate = true;
}
updateDreamLayer(0, 0);

/* --------------------------------------------------------------------------
   Ghosts
   -------------------------------------------------------------------------- */
const ghostLayer = new THREE.Group();
ghostLayer.name = 'ghosts';
park.add(ghostLayer);
const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd9f3, transparent: true, opacity: 0.63, depthWrite: false,
  blending: THREE.AdditiveBlending, toneMapped: false,
});
const ghostEyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8, toneMapped: false });
const ghostCheekMat = new THREE.MeshBasicMaterial({ color: 0xc9b4ff, transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
const ghostHalloweenMaterial = new THREE.MeshBasicMaterial({
  color: 0xdcedff, transparent: true, opacity: 0.72, depthWrite: false,
  blending: THREE.NormalBlending, toneMapped: false,
});
const ghostHalloweenEyeMat = new THREE.MeshBasicMaterial({ color: 0x273247, toneMapped: false });
const ghostHalloweenCheekMat = new THREE.MeshBasicMaterial({ color: 0xa8c8e7, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false });
ghostHalloweenMaterial.userData.themeLockColor = true;
ghostHalloweenEyeMat.userData.themeLockColor = true;
ghostHalloweenCheekMat.userData.themeLockColor = true;
function makeGhost(scale = 1) {
  const g = new THREE.Group();
  const fairyPart = new THREE.Group();
  addSphere(fairyPart, 0.36, ghostMaterial, 0, 0.55, 0, { wSeg: 14, hSeg: 10, sy: 1.15, castShadow: false });
  addSphere(fairyPart, 0.22, ghostMaterial, 0, 0.92, 0.02, { wSeg: 10, hSeg: 8, sy: 0.9, castShadow: false });
  for (const sx of [-1, 1]) {
    addSphere(fairyPart, 0.26, ghostCheekMat, sx * 0.3, 0.63, -0.03, {
      wSeg: 8, hSeg: 6, sx: 1.35, sy: 1.15, sz: 0.16, castShadow: false,
    });
  }
  addSphere(fairyPart, 0.075, ghostEyeMat, 0, 1.16, 0.02, { wSeg: 8, hSeg: 6, castShadow: false });
  addSphere(fairyPart, 0.04, ghostEyeMat, -0.07, 1.1, 0.13, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(fairyPart, 0.04, ghostEyeMat, 0.07, 1.1, 0.13, { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(fairyPart, 0xffc8ee, 2.6, 0, 0.68, 0, 0.29);

  const halloweenPart = new THREE.Group();
  const profile = [
    [0.01, 0.0], [0.24, 0.02], [0.34, 0.15], [0.43, 0.38], [0.41, 0.65],
    [0.33, 0.82], [0.22, 0.94], [0.1, 1.02], [0.01, 1.04],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bodyGeo = new THREE.LatheGeometry(profile, 16);
  const body = new THREE.Mesh(bodyGeo, ghostHalloweenMaterial);
  body.position.y = 0.02;
  body.castShadow = false;
  halloweenPart.add(body);
  addSphere(halloweenPart, 0.13, ghostHalloweenMaterial, -0.32, 0.55, 0.14, { wSeg: 7, hSeg: 5, sx: 1.3, sy: 0.7, sz: 0.7, castShadow: false });
  addSphere(halloweenPart, 0.13, ghostHalloweenMaterial, 0.32, 0.55, 0.14, { wSeg: 7, hSeg: 5, sx: 1.3, sy: 0.7, sz: 0.7, castShadow: false });
  for (const [px, py, pz] of [[-0.22, 0.39, 0.02], [0.15, 0.36, 0.02], [0.32, 0.42, 0.02]]) {
    addSphere(halloweenPart, 0.12, ghostHalloweenMaterial, px, py, pz, { wSeg: 6, hSeg: 4, sy: 0.7, castShadow: false });
  }
  addSphere(halloweenPart, 0.055, ghostHalloweenEyeMat, -0.115, 0.85, 0.25, { wSeg: 6, hSeg: 4, sx: 0.7, sy: 1.2, castShadow: false });
  addSphere(halloweenPart, 0.055, ghostHalloweenEyeMat, 0.115, 0.85, 0.25, { wSeg: 6, hSeg: 4, sx: 0.7, sy: 1.2, castShadow: false });
  addSphere(halloweenPart, 0.08, ghostHalloweenEyeMat, 0, 0.7, 0.25, { wSeg: 6, hSeg: 4, sx: 1, sy: 0.65, castShadow: false });
  addSphere(halloweenPart, 0.07, ghostHalloweenCheekMat, -0.21, 0.72, 0.2, { wSeg: 6, hSeg: 4, sx: 0.9, sy: 0.55, castShadow: false });
  addSphere(halloweenPart, 0.07, ghostHalloweenCheekMat, 0.21, 0.72, 0.2, { wSeg: 6, hSeg: 4, sx: 0.9, sy: 0.55, castShadow: false });
  addGlow(halloweenPart, 0xbcd6ff, 2.6, 0, 0.7, 0, 0.29);

  fairyPart.visible = currentTheme === 'fairy';
  halloweenPart.visible = currentTheme === 'halloween';
  g.add(fairyPart, halloweenPart);
  g.scale.setScalar(scale);
  g.visible = true;
  themePartGroups.push({ fairy: fairyPart, halloween: halloweenPart });
  themeExcludedRoots.push(g);
  return g;
}
const ghostAnchors = [
  { x: 0, z: -2, y: 8.1, rx: 4.8, rz: 4.0, speed: 0.13, phase: 0, scale: 1.25 },
  { x: 0, z: 0, y: 10.8, rx: 3.1, rz: 4.4, speed: -0.1, phase: 2.1, scale: 0.92 },
  { x: 8.6, z: 5.8, y: 5.5, rx: 2.8, rz: 2.2, speed: 0.18, phase: 4.0, scale: 0.82 },
  { x: -8, z: 8, y: 4.0, rx: 3.1, rz: 2.5, speed: -0.14, phase: 1.2, scale: 0.75 },
  { x: 11.4, z: -8.8, y: 9.2, rx: 2.3, rz: 1.9, speed: 0.12, phase: 3.3, scale: 0.8 },
];
const ghostActors = [];
for (const anchor of ghostAnchors) {
  const ghost = makeGhost(anchor.scale);
  ghost.position.set(anchor.x, anchor.y, anchor.z);
  ghostLayer.add(ghost);
  ghostActors.push({ ghost, anchor });
}
assemble(ghostLayer, 17.9, 2.0, 'fade');

/* --------------------------------------------------------------------------
   Bats
   -------------------------------------------------------------------------- */
const batLayer = new THREE.Group();
batLayer.name = 'bats';
park.add(batLayer);
const batBodyMat = new THREE.MeshBasicMaterial({ color: 0xffd6ee, toneMapped: false });
const batWingMat = new THREE.MeshBasicMaterial({
  color: 0xffb7e4, side: THREE.DoubleSide, toneMapped: false,
  transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false,
});
const batEyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, toneMapped: false });
const batHalloweenBodyMat = new THREE.MeshBasicMaterial({ color: 0x171222, toneMapped: true });
const batHalloweenWingMat = new THREE.MeshBasicMaterial({ color: 0x1a1428, side: THREE.DoubleSide, toneMapped: true });
const batHalloweenEyeMat = new THREE.MeshBasicMaterial({ color: 0xffb56a, toneMapped: false });
batHalloweenBodyMat.userData.themeLockColor = true;
batHalloweenWingMat.userData.themeLockColor = true;
batHalloweenEyeMat.userData.themeLockColor = true;
function makeBat(scale = 1) {
  const g = new THREE.Group();
  const fairyPart = new THREE.Group();
  addSphere(fairyPart, 0.14, batBodyMat, 0, 0, 0, { wSeg: 8, hSeg: 6, sx: 0.6, sy: 0.8, sz: 1.15, castShadow: false });
  addCone(fairyPart, 0.028, 0.22, 4, batBodyMat, -0.06, 0.16, 0.08, { castShadow: false, rotZ: 0.38 });
  addCone(fairyPart, 0.028, 0.22, 4, batBodyMat, 0.06, 0.16, 0.08, { castShadow: false, rotZ: -0.38 });
  addSphere(fairyPart, 0.026, batEyeMat, -0.05, 0.035, 0.13, { wSeg: 5, hSeg: 4, castShadow: false });
  addSphere(fairyPart, 0.026, batEyeMat, 0.05, 0.035, 0.13, { wSeg: 5, hSeg: 4, castShadow: false });
  const fairyWingGeo = new THREE.SphereGeometry(0.3, 8, 5);
  fairyWingGeo.scale(1.5, 0.95, 0.12);
  fairyWingGeo.translate(0.31, 0.03, 0);
  const fairyWingL = new THREE.Mesh(fairyWingGeo, batWingMat);
  fairyWingL.position.x = 0.02;
  const fairyWingR = new THREE.Mesh(fairyWingGeo, batWingMat);
  fairyWingR.scale.x = -1;
  fairyWingR.position.x = -0.02;
  fairyPart.add(fairyWingL, fairyWingR);
  addGlow(fairyPart, 0xffc3e9, 1.35, 0, 0, 0, 0.3);

  const halloweenPart = new THREE.Group();
  addSphere(halloweenPart, 0.16, batHalloweenBodyMat, 0, 0, 0, { wSeg: 8, hSeg: 6, sx: 0.7, sy: 0.8, sz: 1.2, castShadow: false });
  addCone(halloweenPart, 0.07, 0.2, 4, batHalloweenBodyMat, -0.08, 0.14, 0.05, { castShadow: false, rotZ: 0.3 });
  addCone(halloweenPart, 0.07, 0.2, 4, batHalloweenBodyMat, 0.08, 0.14, 0.05, { castShadow: false, rotZ: -0.3 });
  addSphere(halloweenPart, 0.027, batHalloweenEyeMat, -0.055, 0.035, 0.14, { wSeg: 5, hSeg: 4, castShadow: false });
  addSphere(halloweenPart, 0.027, batHalloweenEyeMat, 0.055, 0.035, 0.14, { wSeg: 5, hSeg: 4, castShadow: false });
  const batWingGeo = new THREE.BufferGeometry();
  batWingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0.56, 0.12, -0.02, 0.34, -0.22, 0.03,
    0.34, -0.22, 0.03, 0.24, 0.06, -0.02, 0, 0, 0,
  ], 3));
  batWingGeo.setIndex([0, 1, 2, 3, 4, 0]);
  batWingGeo.computeVertexNormals();
  const batWingL = new THREE.Mesh(batWingGeo, batHalloweenWingMat);
  batWingL.position.x = 0.02;
  const batWingR = new THREE.Mesh(batWingGeo, batHalloweenWingMat);
  batWingR.scale.x = -1;
  batWingR.position.x = -0.02;
  halloweenPart.add(batWingL, batWingR);

  fairyPart.visible = currentTheme === 'fairy';
  halloweenPart.visible = currentTheme === 'halloween';
  g.add(fairyPart, halloweenPart);
  g.scale.setScalar(scale);
  g.userData.wingPairs = [
    [fairyWingL, fairyWingR],
    [batWingL, batWingR],
  ];
  g.userData.phase = rand(0, TAU);
  g.userData.baseScale = scale;
  themePartGroups.push({ fairy: fairyPart, halloween: halloweenPart });
  themeExcludedRoots.push(g);
  return g;
}
const batActors = [];
for (let i = 0; i < 9; i++) {
  const scale = rand(0.65, 1.15);
  const bat = makeBat(scale);
  batLayer.add(bat);
  batActors.push({
    bat,
    cx: rand(-11, 12), cz: rand(-12, 8), cy: rand(8.5, 17.0),
    rx: rand(5, 13), rz: rand(4, 10), speed: rand(0.09, 0.2) * (i % 2 ? 1 : -1),
    phase: rand(0, TAU), flap: rand(3.2, 5.4),
  });
}
batLayer.visible = false;
assemble(batLayer, 18.2, 1.8, 'fade');

/* --------------------------------------------------------------------------
   Fireworks
   -------------------------------------------------------------------------- */
const FW_MAX = 2200;
const fwPositions = new Float32Array(FW_MAX * 3);
const fwColors = new Float32Array(FW_MAX * 3);
const fwSizes = new Float32Array(FW_MAX);
const fwAlphas = new Float32Array(FW_MAX);
const fwVel = new Float32Array(FW_MAX * 3);
const fwLife = new Float32Array(FW_MAX);
const fwMaxLife = new Float32Array(FW_MAX);
let fwCursor = 0;
for (let i = 0; i < FW_MAX; i++) {
  fwPositions[i * 3 + 1] = -100;
}
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPositions, 3));
fwGeo.setAttribute('aColor', new THREE.BufferAttribute(fwColors, 3));
fwGeo.setAttribute('aSize', new THREE.BufferAttribute(fwSizes, 1));
fwGeo.setAttribute('aAlpha', new THREE.BufferAttribute(fwAlphas, 1));
const fwMat = new THREE.ShaderMaterial({
  uniforms: { uPixelRatio: { value: Math.min(devicePixelRatio, 2) } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aAlpha;
    uniform float uPixelRatio;
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (650.0 / max(1.0, -mv.z));
      vColor = aColor;
      vAlpha = aAlpha;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    void main(){
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p);
      float core = smoothstep(0.5, 0.0, d);
      float halo = smoothstep(0.5, 0.1, d) * 0.28;
      gl_FragColor = vec4(vColor * (0.75 + core * 0.8), (core + halo) * vAlpha);
    }
  `,
});
const fireworkPoints = new THREE.Points(fwGeo, fwMat);
fireworkPoints.frustumCulled = false;
// Fireworks are composited after the main bloom pass so their sparks stay
// crisp and never smear into bloom blocks.
const fireworkScene = new THREE.Scene();
fwMat.depthTest = false;
fireworkScene.add(fireworkPoints);
const fwThemeColors = {
  purple: 0xc7a4ff,
  orange: 0xffa0cf,
  gold: 0xffe2a1,
  blue: 0x9ed8ff,
};
const fireworkFlashes = [];
function addFireworkFlash(pos, color) {
  const mat = new THREE.SpriteMaterial({
    map: softGlowTex, color, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    fog: false, toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(3.4);
  fireworkScene.add(sprite);
  fireworkFlashes.push({ sprite, life: 0.42, maxLife: 0.42, baseScale: 3.4 });
}

const fireworkRockets = [];
const fwBurstPalette = [fwThemeColors.purple, fwThemeColors.orange, fwThemeColors.gold, fwThemeColors.blue];
const fwTrailColors = [0xfff4d8, 0xffdca8, 0xffb8df, 0xe6d4ff, 0xc3e7ff];
const fwNdcWorld = new THREE.Vector3();
const fwParticleColor = new THREE.Color();

function fireworkWorldFromNdc(nx, ny, distance) {
  fwNdcWorld.set(nx, ny, 0.5).unproject(camera);
  fwNdcWorld.sub(camera.position).normalize();
  return camera.position.clone().addScaledVector(fwNdcWorld, distance);
}

function emitFireworkParticle(pos, vel, color, size, life) {
  const idx = fwCursor;
  fwCursor = (fwCursor + 1) % FW_MAX;
  fwPositions[idx * 3] = pos.x;
  fwPositions[idx * 3 + 1] = pos.y;
  fwPositions[idx * 3 + 2] = pos.z;
  fwVel[idx * 3] = vel.x;
  fwVel[idx * 3 + 1] = vel.y;
  fwVel[idx * 3 + 2] = vel.z;
  fwParticleColor.set(color);
  const b = rand(1.05, 1.65);
  fwColors[idx * 3] = fwParticleColor.r * b;
  fwColors[idx * 3 + 1] = fwParticleColor.g * b;
  fwColors[idx * 3 + 2] = fwParticleColor.b * b;
  fwSizes[idx] = size;
  fwAlphas[idx] = 1;
  fwLife[idx] = life;
  fwMaxLife[idx] = life;
}

function emitRocketTrail(rocket) {
  const jitter = new THREE.Vector3(rand(-0.24, 0.24), rand(-0.2, 0.2), rand(-0.24, 0.24));
  const pos = rocket.sprite.position.clone().add(jitter);
  const vel = new THREE.Vector3(rand(-0.34, 0.34), rand(-0.5, 0.1), rand(-0.34, 0.34));
  const gold = R() > 0.2;
  const color = gold ? pick(fwTrailColors) : pick(fwBurstPalette);
  emitFireworkParticle(pos, vel, color, rand(0.36, 0.82), rand(0.48, 0.98));
  if (R() > 0.68) {
    const spark = rocket.sprite.position.clone().add(new THREE.Vector3(rand(-0.5, 0.5), rand(-0.35, 0.25), rand(-0.5, 0.5)));
    emitFireworkParticle(spark, new THREE.Vector3(rand(-0.8, 0.8), rand(-0.7, 0.2), rand(-0.8, 0.8)), 0xffd6ef, rand(0.22, 0.44), rand(0.3, 0.65));
  }
}

function launchFireworkAtNdc(nx, ny, delay = 0) {
  if (fireworkRockets.length >= 9) return null;
  const skyX = clamp(nx, -0.92, 0.92);
  const skyY = clamp(ny, -0.18, 0.96);
  const target = fireworkWorldFromNdc(skyX, skyY, rand(72, 98));
  const launchX = clamp(skyX + rand(-0.07, 0.07), -0.96, 0.96);
  const launchY = Math.max(-0.04, skyY - rand(0.28, 0.46));
  const start = fireworkWorldFromNdc(launchX, launchY, rand(60, 84));
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softGlowTex, color: 0xfff0c0, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    fog: false, toneMapped: false,
  }));
  sprite.position.copy(start);
  sprite.scale.setScalar(1.25);
  sprite.visible = delay <= 0;
  fireworkScene.add(sprite);
  const rocket = {
    start,
    target,
    sprite,
    elapsed: 0,
    duration: 0.9 + Math.max(0.14, skyY - launchY) * 0.42 + rand(0, 0.14),
    delay,
    trailAccum: 0,
    sway: rand(-0.46, 0.46),
    swayPhase: rand(0, TAU),
  };
  fireworkRockets.push(rocket);
  return rocket;
}

function explodeFirework(center) {
  addFireworkFlash(center, 0xfff0fb);
  const order = fwBurstPalette.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  const ringStyle = R() < 0.4;
  const view = camera.position.clone().sub(center).normalize();
  const ringU = new THREE.Vector3().crossVectors(view, UP);
  if (ringU.lengthSq() < 0.0001) ringU.set(1, 0, 0);
  ringU.normalize();
  const ringV = new THREE.Vector3().crossVectors(view, ringU).normalize();
  const layers = [
    { color: order[0], speed: 4.4, count: 46, size: [0.5, 1.0], life: [1.4, 2.1] },
    { color: order[1], speed: 5.4, count: 40, size: [0.42, 0.86], life: [1.25, 1.9] },
    { color: order[2], speed: 3.4, count: 34, size: [0.65, 1.2], life: [1.6, 2.35] },
    { color: order[3], speed: 2.45, count: 28, size: [0.85, 1.5], life: [1.7, 2.5] },
  ];
  const dir = new THREE.Vector3();
  for (const layer of layers) {
    for (let j = 0; j < layer.count; j++) {
      if (ringStyle) {
        const angle = rand(0, TAU);
        dir.copy(ringU).multiplyScalar(Math.cos(angle))
          .addScaledVector(ringV, Math.sin(angle));
        dir.addScaledVector(view, rand(-0.16, 0.16)).normalize();
      } else {
        const theta = rand(0, TAU);
        const phi = Math.acos(rand(-0.92, 1));
        dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      }
      const speed = layer.speed * rand(0.75, 1.16);
      const vel = dir.multiplyScalar(speed);
      if (!ringStyle) vel.y += speed * 0.1;
      emitFireworkParticle(center, vel, layer.color, rand(layer.size[0], layer.size[1]), rand(layer.life[0], layer.life[1]));
    }
  }
  // fine golden crackle layer
  for (let j = 0; j < 44; j++) {
    const theta = rand(0, TAU);
    const phi = Math.acos(rand(-0.85, 1));
    const speed = rand(1.4, 3.6);
    const vel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed,
      Math.sin(phi) * Math.sin(theta) * speed
    );
    emitFireworkParticle(center, vel, fwThemeColors.gold, rand(0.2, 0.42), rand(0.8, 1.7));
  }
  // bright core stars
  for (let j = 0; j < 13; j++) {
    const theta = rand(0, TAU);
    const speed = rand(0.5, 1.7);
    const vel = new THREE.Vector3(Math.cos(theta) * speed, rand(-0.45, 0.7), Math.sin(theta) * speed);
    emitFireworkParticle(center, vel, j % 3 === 0 ? 0xfff7df : fwThemeColors.gold, rand(0.9, 1.7), rand(0.9, 1.5));
  }
}

function spawnFirework(delay = 0) {
  const nx = rand(-0.84, 0.84);
  const side = Math.abs(nx) > 0.44;
  const ny = rand(side ? 0.43 : 0.58, side ? 0.84 : 0.92);
  return launchFireworkAtNdc(nx, ny, delay);
}
function updateFireworks(dt, time) {
  for (let i = 0; i < FW_MAX; i++) {
    if (fwLife[i] <= 0) continue;
    fwLife[i] -= dt;
    const t = fwLife[i] / fwMaxLife[i];
    if (fwLife[i] <= 0) {
      fwPositions[i * 3 + 1] = -100;
      fwAlphas[i] = 0;
      continue;
    }
    fwVel[i * 3 + 1] -= dt * 1.85;
    fwVel[i * 3] *= 1 - dt * 0.16;
    fwVel[i * 3 + 2] *= 1 - dt * 0.16;
    fwPositions[i * 3] += fwVel[i * 3] * dt;
    fwPositions[i * 3 + 1] += fwVel[i * 3 + 1] * dt;
    fwPositions[i * 3 + 2] += fwVel[i * 3 + 2] * dt;
    fwAlphas[i] = Math.min(1, t * 1.8) * (0.7 + 0.3 * Math.sin(time * 24 + i * 1.7));
  }
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.aAlpha.needsUpdate = true;
  fwGeo.attributes.aColor.needsUpdate = true;
  fwGeo.attributes.aSize.needsUpdate = true;

  for (let i = fireworkFlashes.length - 1; i >= 0; i--) {
    const f = fireworkFlashes[i];
    f.life -= dt;
    if (f.life <= 0) {
      fireworkScene.remove(f.sprite);
      f.sprite.material.dispose();
      fireworkFlashes.splice(i, 1);
      continue;
    }
    const p = f.life / f.maxLife;
    f.sprite.material.opacity = p * 0.8;
    f.sprite.scale.setScalar(f.baseScale + (1 - p) * 3.6);
  }

  for (let i = fireworkRockets.length - 1; i >= 0; i--) {
    const rocket = fireworkRockets[i];
    if (rocket.delay > 0) {
      rocket.delay -= dt;
      if (rocket.delay > 0) continue;
      rocket.sprite.visible = true;
    }
    rocket.elapsed += dt;
    const t = Math.min(1, rocket.elapsed / rocket.duration);
    const e = 1 - Math.pow(1 - t, 3);
    rocket.sprite.position.lerpVectors(rocket.start, rocket.target, e);
    rocket.sprite.position.x += Math.sin(t * Math.PI) * rocket.sway;
    rocket.sprite.position.y += Math.sin(t * Math.PI) * 0.55;
    rocket.sprite.scale.setScalar(1.25 + Math.sin(t * Math.PI) * 0.24);
    rocket.sprite.material.opacity = 0.9;
    rocket.trailAccum += dt;
    while (rocket.trailAccum >= 0.012) {
      rocket.trailAccum -= 0.012;
      emitRocketTrail(rocket);
    }
    if (t >= 1) {
      fireworkScene.remove(rocket.sprite);
      rocket.sprite.material.dispose();
      fireworkRockets.splice(i, 1);
      explodeFirework(rocket.target);
    }
  }

  if (operationStarted && time > nextFireworkAt) {
    spawnFirework();
    if (R() < 0.36) spawnFirework(rand(0.28, 0.85));
    nextFireworkAt = time + rand(2.8, 5.2);
  }
}

/* --------------------------------------------------------------------------
   Ambient ghost / bat / mote animation helpers
   -------------------------------------------------------------------------- */
function updateGhosts(time) {
  for (const actor of ghostActors) {
    const a = actor.anchor;
    const t = time * a.speed + a.phase;
    const gx = a.x + Math.cos(t) * a.rx;
    const gz = a.z + Math.sin(t * 0.86 + a.phase) * a.rz;
    const gy = a.y + Math.sin(time * 1.2 + a.phase) * 0.55;
    actor.ghost.position.set(gx, gy, gz);
    const angle = Math.atan2(camera.position.x - gx, camera.position.z - gz);
    actor.ghost.rotation.y = angle + Math.sin(time * 0.7 + a.phase) * 0.2;
    actor.ghost.position.y += Math.sin(time * 2.1 + a.phase) * 0.08;
  }
}
function updateBats(time) {
  for (const actor of batActors) {
    const t = time * actor.speed + actor.phase;
    const x = actor.cx + Math.cos(t) * actor.rx;
    const z = actor.cz + Math.sin(t) * actor.rz;
    const y = actor.cy + Math.sin(time * 1.4 + actor.phase * 2) * 1.1;
    actor.bat.position.set(x, y, z);
    actor.bat.rotation.y = -t + Math.PI * 0.5;
    actor.bat.rotation.z = Math.sin(time * 1.7 + actor.phase) * 0.25;
    const flap = Math.sin(time * actor.flap + actor.phase) * 0.8;
    for (const [wingL, wingR] of actor.bat.userData.wingPairs || []) {
      wingL.rotation.z = flap;
      wingR.rotation.z = -flap;
    }
  }
}
function updateMotes(time) {
  const pos = moteGeo.attributes.position;
  for (let i = 0; i < moteCount; i++) {
    const d = moteData[i];
    const a = d.angle + time * d.speed;
    const radius = d.r + Math.sin(time * 0.4 + d.phase) * 0.45;
    const y = ((d.by + time * d.rise + Math.sin(time * 0.8 + d.phase) * 0.3) % 8.4);
    pos.setXYZ(i, d.bx + Math.cos(a) * radius * 0.12, 0.2 + y, d.bz + Math.sin(a) * radius * 0.12);
  }
  pos.needsUpdate = true;
  moteMat.uniforms.uTime.value = time;
}
function updateMist(time) {
  for (const layer of mistLayers) {
    layer.mesh.position.x = layer.baseX + Math.sin(time * layer.speed + layer.phase) * 1.6;
    layer.mesh.position.z = layer.baseZ + Math.cos(time * layer.speed * 0.7 + layer.phase) * 1.2;
    layer.mesh.rotation.z += 0.00022;
    layer.mesh.material.opacity = layer.baseOpacity * (0.8 + Math.sin(time * 0.23 + layer.phase) * 0.2);
  }
  wispRoot.children.forEach((s, i) => {
    s.position.x += Math.sin(time * 0.2 + i) * 0.0008;
    s.material.opacity = 0.11 + Math.sin(time * 0.5 + i) * 0.03;
  });
  for (const cloud of castleMistSprites) {
    const angle = cloud.baseAngle + time * cloud.speed;
    const radius = cloud.baseRadius + Math.sin(time * 0.17 + cloud.phase) * 0.45;
    cloud.sprite.position.x = Math.cos(angle) * radius;
    cloud.sprite.position.z = -4.0 + Math.sin(angle) * radius;
    cloud.sprite.position.y = cloud.baseY + Math.sin(time * 0.35 + cloud.phase) * 0.38;
    cloud.sprite.material.rotation = cloud.phase + time * 0.045;
  }
  for (const bank of castleFogBanks) {
    bank.mesh.rotation.z += bank.spin;
    bank.mesh.position.x += Math.sin(time * 0.05 + bank.phase) * 0.0009;
    bank.mesh.position.z += Math.cos(time * 0.04 + bank.phase) * 0.0007;
  }
  for (const haze of castleHazeSprites) {
    haze.sprite.position.x = haze.bx + Math.sin(time * 0.18 + haze.phase) * 0.55;
    haze.sprite.position.y = haze.by + Math.sin(time * 0.33 + haze.phase) * 0.35;
    haze.sprite.position.z = haze.bz + Math.cos(time * 0.15 + haze.phase) * 0.45;
    haze.sprite.material.rotation = haze.phase + time * 0.035;
  }
  for (const sheet of groundFogSheets) {
    sheet.mesh.rotation.z += sheet.spin;
    sheet.mesh.position.x += Math.sin(time * 0.06 + sheet.phase) * 0.0011;
    sheet.mesh.position.z += Math.cos(time * 0.05 + sheet.phase) * 0.0009;
  }
  for (const system of groundFogSystems) {
    const pos = system.geo.attributes.position;
    for (let i = 0; i < system.data.length; i++) {
      const d = system.data[i];
      pos.setXYZ(
        i,
        d.bx + Math.sin(time * d.driftX + d.phase) * 1.8,
        d.by + Math.sin(time * 0.22 + d.phase) * d.bob,
        d.bz + Math.cos(time * d.driftZ + d.phase) * 1.5
      );
    }
    pos.needsUpdate = true;
  }
  moonBeamUniforms.uTime.value = time;
  moonBeamRoot.rotation.y = Math.sin(time * 0.02) * 0.04;
  if (smokeRoot.visible) {
    const pos = smokeGeo.attributes.position;
    for (let i = 0; i < smokeCount; i++) {
      let y = pos.getY(i) + 0.0016 + smokeSeed[i] * 0.002;
      if (y > 13.2) y = 8.5;
      pos.setY(i, y);
      pos.setX(i, 10.7 + Math.sin(time * 0.7 + i) * 0.3);
      pos.setZ(i, 4.8 + Math.cos(time * 0.55 + i * 1.3) * 0.25);
    }
    pos.needsUpdate = true;
  }
}

/* --------------------------------------------------------------------------
   Open-work iron gate leaves at the entrance
   -------------------------------------------------------------------------- */
for (const sx of [-1, 1]) {
  const leaf = new THREE.Group();
  leaf.position.set(sx * 2.86, 0, 18.85);
  leaf.rotation.y = -sx * 0.78;
  gateRoot.add(leaf);
  const d = -sx;
  for (let i = 0; i <= 6; i++) {
    const lx = d * (0.08 + i * 0.2);
    addCyl(leaf, 0.035, 0.045, 1.85 + (i % 2) * 0.2, 5, gateIron,
      lx, 1.05 + (i % 2) * 0.1, 0, { castShadow: false });
    addCone(leaf, 0.09, 0.28, 4, gateGold, lx, 1.83 + (i % 2) * 0.1, 0, { castShadow: false });
  }
  for (const y of [0.35, 1.9]) {
    addBox(leaf, 1.38, 0.07, 0.07, gateIron, d * 0.68, y, 0, { castShadow: false });
  }
  rodBetween(leaf, [d * 0.08, 0.38, 0], [d * 1.3, 1.88, 0], 0.035, gateGold, 5);
  rodBetween(leaf, [d * 0.08, 1.88, 0], [d * 1.3, 0.38, 0], 0.035, gateGold, 5);
  addSphere(leaf, 0.095, brassBright, d * 1.3, 1.94, 0, { wSeg: 6, hSeg: 4, castShadow: false });
}

/* --------------------------------------------------------------------------
   Neon accents
   -------------------------------------------------------------------------- */
assemblyPhase = 'lights';
const neonRoot = new THREE.Group();
neonRoot.name = 'neonSigns';
park.add(neonRoot);
function makeNeonTexture(text, color, sub = '') {
  return canvasTexture(768, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 700 120px Georgia, serif';
    ctx.shadowColor = color;
    ctx.shadowBlur = 34;
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h * 0.45);
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = 'italic 700 114px Georgia, serif';
    ctx.fillText(text, w / 2, h * 0.45);
    if (sub) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.font = '500 30px Georgia, serif';
      ctx.fillStyle = color;
      ctx.fillText(sub, w / 2, h * 0.79);
    }
  });
}
function addNeonBoard(text, color, sub, x, y, z, w, h, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  neonRoot.add(g);
  addBox(g, w + 0.2, h + 0.2, 0.12, toonMat(0x211729), 0, 0, 0, { castShadow: false });
  const tex = makeNeonTexture(text, color, sub);
  const plane = addPlane(g, w, h, new THREE.MeshBasicMaterial({
    map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
  }), 0, 0, 0.08);
  const glow = addGlow(g, color, Math.max(w, h) * 2.5, 0, 0, 0.2, 0.28);
  g.userData.flickerPhase = rand(0, TAU);
  g.userData.labelMat = plane.material;
  neonSignGroups.push(g);
  return g;
}
const neonSignGroups = [];
addNeonBoard('WISH!', '#ffb0df', 'MAKE A WISH', 6.45, 4.9, 7.96, 2.0, 0.7, 0);
// mount the sign on short dark iron brackets so it reads as part of the park
for (const sx of [-1, 1]) {
  addCyl(neonRoot, 0.035, 0.04, 1.2, 5, gateIron, 6.45 + sx * 1.0, 4.0, 7.86, { castShadow: false });
}
assemble(neonRoot, 12.3, 0.9, 'fade');

/* --------------------------------------------------------------------------
   A couple of decorative clusters were modelled outside their parent's
   assembly group. Fold them back in so the empty plinth really starts empty.
   -------------------------------------------------------------------------- */
assemblyPhase = 'ground';
assemblePop(trimGroup, 0.18, 0.75);

const moatDetails = new THREE.Group();
moatDetails.name = 'moatDetails';
moatGroup.add(moatDetails);
{
  const registered = new Set(assembly.map((record) => record.obj));
  for (const child of [...moatGroup.children]) {
    if ((child.isMesh || child.isSprite) && !registered.has(child)) {
      moatDetails.add(child);
    }
  }
}
assemblyPhase = 'ground';
assemble(moatDetails, 3.3, 0.85, 'fade');

const hauntedBoards = new THREE.Group();
hauntedBoards.name = 'hauntedBoards';
hauntedRoot.add(hauntedBoards);
{
  const registered = new Set(assembly.map((record) => record.obj));
  for (const child of [...hauntedRoot.children]) {
    if (child.isMesh && !registered.has(child)) {
      hauntedBoards.add(child);
    }
  }
}
assemblyPhase = 'haunted';
assemblePop(hauntedBoards, 11.75, 0.6);

/* --------------------------------------------------------------------------
   Anything that was added directly to the park (soft ground glows, pebbles)
   gets folded into one late reveal so the empty plinth really starts empty.
   -------------------------------------------------------------------------- */
const strayParkDetails = new THREE.Group();
park.add(strayParkDetails);
for (const child of [...park.children]) {
  if (child.isMesh) {
    strayParkDetails.add(child);
  }
}
assemblyPhase = 'roads';
assemble(strayParkDetails, 14.0, 1.0, 'fade');

/* --------------------------------------------------------------------------
   Final animation loop
   -------------------------------------------------------------------------- */
const clock = new THREE.Clock();
let simulationTime = 0;
let operationTime = 0;
let operationStarted = false;
let nextFireworkAt = Infinity;
let frames = 0;
let fpsWindowStart = 0;
let fps = 0;
let qualityReduced = false;

// Final choreography for the build: each major layer owns a short window, and
// the next layer begins while the previous one's last trinkets are settling.
const ASSEMBLY_SCHEDULE = {
  ground: { start: 0.10, span: 1.55, maxDuration: 1.30 },
  roads: { start: 2.15, span: 2.45, maxDuration: 1.25 },
  castle: { start: 4.35, span: 1.90, maxDuration: 1.55 },
  clock: { start: 6.15, span: 1.45, maxDuration: 1.70 },
  ferris: { start: 7.75, span: 2.00, maxDuration: 1.35 },
  coaster: { start: 9.70, span: 1.85, maxDuration: 1.75 },
  carousel: { start: 11.60, span: 1.55, maxDuration: 1.15 },
  haunted: { start: 13.20, span: 1.70, maxDuration: 1.50 },
  pumpkins: { start: 14.90, span: 1.20, maxDuration: 1.00 },
  lights: { start: 16.00, span: 1.85, maxDuration: 1.25 },
  atmosphere: { start: 17.80, span: 2.20, maxDuration: 2.55 },
};

function retimeAssembly() {
  const byPhase = new Map();
  for (const rec of assembly) {
    if (!byPhase.has(rec.phase)) byPhase.set(rec.phase, []);
    byPhase.get(rec.phase).push(rec);
  }
  for (const [phase, cfg] of Object.entries(ASSEMBLY_SCHEDULE)) {
    const records = byPhase.get(phase);
    if (!records || records.length === 0) continue;
    records.sort((a, b) => a.start - b.start);
    const first = records[0].start;
    const last = records[records.length - 1].start;
    const range = last - first;
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      const progress = range > 0.0001
        ? (rec.start - first) / range
        : (records.length > 1 ? i / (records.length - 1) : 0);
      rec.start = cfg.start + progress * cfg.span;
      rec.duration = clamp(rec.duration, 0.35, cfg.maxDuration);
    }
  }
  const coasterRecords = byPhase.get('coaster') || [];
  const coasterEnd = coasterRecords.reduce((m, r) => Math.max(m, r.start + r.duration), 0);
  coasterRideReadyAt = Math.max(coasterEnd, ASSEMBLY_SCHEDULE.coaster.start + 1.0) + 0.15;
}
retimeAssembly();

const SHOW_END = assembly.reduce((m, r) => Math.max(m, r.start + r.duration), 0);
const OPERATION_START = SHOW_END + 0.35;

/* --------------------------------------------------------------------------
   Dual theme system — the original Halloween night and the dreamy fairy tale.
   The button in the top-right corner switches every material, sign, sky and
   decorative layer without touching the choreography or any interaction.
   -------------------------------------------------------------------------- */
const themeTextureEntries = [];
const themeColorEntries = [];
const explicitThemeMats = new Set();

function addThemeTexture(mat, fairyMap, halloweenMap) {
  if (!mat || !fairyMap || !halloweenMap) return;
  themeTextureEntries.push({ mat, fairyMap, halloweenMap });
}
function addThemeColor(mat, halloweenHex) {
  if (!mat || !mat.color || explicitThemeMats.has(mat)) return;
  explicitThemeMats.add(mat);
  themeColorEntries.push({
    mat,
    fairyColor: mat.color.clone(),
    halloweenColor: new THREE.Color(halloweenHex),
  });
}
function makeHalloweenColor(color) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  const h = hsl.h * 360;
  const s = hsl.s;
  const l = hsl.l;
  let nh = h, ns = s, nl = l;
  if (l < 0.12) {
    ns = Math.min(0.55, s * 0.85);
    nl = Math.max(0.035, l * 0.82);
  } else if (h >= 20 && h <= 65) {
    nh = 27 + (h - 20) * 0.22;
    ns = Math.min(1, s * 1.04 + 0.04);
    nl = Math.min(0.46, l * 0.68);
  } else if (h > 65 && h < 160) {
    nh = 138;
    ns = Math.min(0.55, s * 0.78);
    nl = Math.min(0.3, l * 0.55);
  } else if (h >= 160 && h < 225) {
    nh = 235;
    ns = Math.min(0.55, s * 0.82);
    nl = Math.min(0.3, l * 0.5);
  } else if (h >= 225 && h < 330) {
    nh = 288;
    ns = Math.min(0.68, s * 0.94 + 0.04);
    nl = Math.min(0.34, l * 0.48);
  } else {
    nh = 318;
    ns = Math.min(0.72, s * 0.9);
    nl = Math.min(0.37, l * 0.55);
  }
  return new THREE.Color().setHSL(nh / 360, ns, nl);
}

// Original Halloween palette for the major architectural layers.
addThemeColor(baseStone, 0x3a3652);
addThemeColor(baseStoneDark, 0x262237);
addThemeColor(baseStoneLight, 0x5f5976);
addThemeColor(basePanelMat, 0x2b2740);
addThemeColor(brassMat, 0xc49755);
addThemeColor(brassBright, 0xe3b973);
addThemeColor(terrainMat, 0x8f8ca4);
addThemeColor(pathMat, 0x8e879f);
addThemeColor(plazaMat, 0x8b849c);
addThemeColor(curbMat, 0x2c2940);
addThemeColor(castleStone, 0x89819d);
addThemeColor(castleStoneDim, 0x625d78);
addThemeColor(castleStoneDark, 0x45415b);
addThemeColor(castleTrim, 0xa59cae);
addThemeColor(castleRoof, 0x8f86d8);
addThemeColor(castleRoofDark, 0x7167b5);
addThemeColor(castleGold, 0xd2a160);
addThemeColor(ridgeRibMat, 0x8178ab);
addThemeColor(gargoyleMat, 0x373247);
addThemeColor(hauntedStone, 0x493f58);
addThemeColor(hauntedStoneLight, 0x6d6078);
addThemeColor(hauntedPlaster, 0x5b4d64);
addThemeColor(hauntedWood, 0x352731);
addThemeColor(hauntedWoodLight, 0x513c46);
addThemeColor(hauntedRoofMat, 0x493b70);
addThemeColor(hauntedRoofDark, 0x352a59);
addThemeColor(hauntedSlateRidge, 0x6e5d8f);
addThemeColor(ferrisIron, 0xcac3da);
addThemeColor(ferrisIronDark, 0x665f80);
addThemeColor(ferrisGold, 0xd5ab69);
addThemeColor(ferrisPlatformMat, 0x4d4864);
addThemeColor(carouselGold, 0xe1b56a);
addThemeColor(carouselStone, 0x776d8b);
addThemeColor(carouselCream, 0xf0dfbd);
addThemeColor(carouselPink, 0xf4a0c1);
addThemeColor(carouselTeal, 0x74d9cb);
addThemeColor(carouselWood, 0x563b4c);
addThemeColor(coasterRailMat, 0xff8d54);
addThemeColor(coasterTieMat, 0x5b4b6a);
addThemeColor(coasterSpineMat, 0x6de5d7);
addThemeColor(coasterSteelMat, 0x625878);
addThemeColor(stationWood, 0x513c44);
addThemeColor(stationRoofMat, 0x3b2e54);
addThemeColor(stationGold, 0xc69858);
addThemeColor(towerStone, 0x756e8a);
addThemeColor(towerDark, 0x433d5d);
addThemeColor(towerGold, 0xcba263);
addThemeColor(towerFloorMat, 0x4b4261);
addThemeColor(fountainStone, 0x8e839f);
addThemeColor(fountainStoneDark, 0x5d526f);
addThemeColor(fountainGold, 0xd3a868);
addThemeColor(fenceIronMat, 0x3d3653);
addThemeColor(gateStone, 0x817792);
addThemeColor(gateStoneDark, 0x4a405e);
addThemeColor(gateGold, 0xd4a661);
addThemeColor(gateIron, 0x37314a);
addThemeColor(lampIron, 0x343047);
addThemeColor(ticketBoothWood, 0x5a3e4d);
addThemeColor(ticketBoothDark, 0x33253b);
addThemeColor(ticketBoothCream, 0xe4c995);
addThemeColor(bushMat, 0x33463f);
addThemeColor(bushMatPurple, 0x4b3658);
addThemeColor(grassMat, 0x2c4438);
addThemeColor(stonePebbleMat, 0x5b556b);
addThemeColor(stemMat, 0x3f3522);
addThemeColor(graveStone, 0x67647a);
for (const plantMat of flowerBedThemeMaterials) addThemeColor(plantMat, 0x563d68);

const halloweenCabinColors = [0xff7a69, 0xffce67, 0x6fe1cf, 0xb394ff, 0xff84ba, 0x80b8ff, 0xffa45c, 0x7de3ae];
for (let i = 0; i < ferrisCabins.length; i++) {
  const cabin = ferrisCabins[i];
  if (cabin.userData.cabinMat) addThemeColor(cabin.userData.cabinMat, halloweenCabinColors[i % halloweenCabinColors.length]);
  if (cabin.userData.cabinDark) addThemeColor(cabin.userData.cabinDark, 0x3d3352);
}

// Everything else made of toon material gets a coherent dark-violet grade.
const fallbackThemeMats = new Set();
park.traverse((object) => {
  if (!object.isMesh && !object.isInstancedMesh) return;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const mat of materials) {
    if (!mat || !mat.color) continue;
    if (fallbackThemeMats.has(mat) || explicitThemeMats.has(mat) || mat.userData.themeLockColor) continue;
    if (!(mat.isMeshToonMaterial || mat.isMeshStandardMaterial)) continue;
    if (mat.transparent) continue;
    fallbackThemeMats.add(mat);
    themeColorEntries.push({
      mat,
      fairyColor: mat.color.clone(),
      halloweenColor: makeHalloweenColor(mat.color),
    });
  }
});

// --- dual sign artwork ------------------------------------------------------
function makeHalloweenBoard(w, h, title, subtitle, titleSize, subtitleSize) {
  return canvasTexture(w, h, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(18,10,25,.97)';
    ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 16); ctx.fill();
    ctx.strokeStyle = '#b88a4f'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,223,164,.24)'; ctx.lineWidth = 2; ctx.strokeRect(16, 16, w - 32, h - 32);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#a97b48');
    grad.addColorStop(0.45, '#ffeec1');
    grad.addColorStop(1, '#a97b48');
    ctx.fillStyle = grad;
    ctx.font = `700 ${titleSize}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(title, w / 2, h * 0.45);
    if (subtitle) {
      ctx.font = `500 ${subtitleSize}px Georgia, serif`;
      ctx.fillStyle = '#b79bc8';
      ctx.fillText(subtitle, w / 2, h * 0.77);
    }
  });
}
function makeHalloweenBanner() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b2450');
    g.addColorStop(1, '#170f23');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(12, 12); ctx.lineTo(w - 12, 12); ctx.lineTo(w - 12, h - 70);
    ctx.lineTo(w / 2, h - 12); ctx.lineTo(12, h - 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c99758'; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = '#e3bd78';
    ctx.font = '700 96px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☾', w / 2, h * 0.4);
    ctx.font = '600 44px Georgia, serif';
    ctx.fillText('NIGHT', w / 2, h * 0.62);
  });
}
function makeHalloweenPoster(type) {
  return canvasTexture(512, 720, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#171020');
    g.addColorStop(0.6, '#3b1c42');
    g.addColorStop(1, '#8c472d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(235,196,132,.7)'; ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#ffe3a2';
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.2, 72, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(60,30,60,.35)';
    ctx.beginPath(); ctx.arc(w * 0.72 - 24, h * 0.2 - 12, 16, 0, TAU); ctx.fill();
    const rr = mulberry32(881 + type);
    ctx.fillStyle = 'rgba(255,239,198,.8)';
    for (let i = 0; i < 55; i++) {
      ctx.beginPath(); ctx.arc(rr() * w, rr() * h * 0.55, rr() * 2 + 1, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(21,13,30,.94)';
    ctx.fillRect(38, h - 158, w - 76, 102);
    ctx.strokeStyle = '#d9b277'; ctx.lineWidth = 4;
    ctx.strokeRect(38, h - 158, w - 76, 102);
    ctx.fillStyle = '#f0d49a';
    ctx.font = '700 43px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(type === 0 ? 'FESTIVAL OF FEAR' : type === 1 ? 'RIDE THE NIGHT' : 'SWEETS & SPELLS', w / 2, h - 105);
  });
}
function makeHalloweenWindow(kind) {
  return canvasTexture(256, 384, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const arch = (pad) => {
      ctx.beginPath();
      ctx.moveTo(pad, h - pad); ctx.lineTo(pad, h * 0.36);
      ctx.quadraticCurveTo(w / 2, h * 0.02, w - pad, h * 0.36);
      ctx.lineTo(w - pad, h - pad); ctx.closePath();
    };
    ctx.fillStyle = '#241b2e'; arch(4); ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, kind === 'ghost' ? '#a9ffe1' : '#ffdda0');
    g.addColorStop(0.55, kind === 'ghost' ? '#22505a' : '#8c4a2a');
    g.addColorStop(1, '#1a1524');
    ctx.fillStyle = g; arch(17); ctx.fill();
    ctx.fillStyle = 'rgba(238,255,249,.8)';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, w * 0.17, Math.PI, 0);
    ctx.lineTo(w * 0.67, h * 0.78);
    ctx.quadraticCurveTo(w * 0.57, h * 0.72, w * 0.5, h * 0.8);
    ctx.quadraticCurveTo(w * 0.43, h * 0.72, w * 0.33, h * 0.78);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26363c';
    ctx.beginPath(); ctx.arc(w * 0.44, h * 0.48, 5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.56, h * 0.48, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(35,24,42,.9)'; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w / 2, h - 22);
    ctx.moveTo(22, h * 0.63); ctx.lineTo(w - 22, h * 0.63);
    ctx.stroke();
  });
}
function materialsUsingMap(map) {
  const found = [];
  scene.traverse((object) => {
    if (!object.material) return;
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    for (const mat of mats) if (mat && mat.map === map) found.push(mat);
  });
  return found;
}

const halloweenPlaqueTex = makeHalloweenBoard(1024, 180, 'HALLOWEEN NIGHT', 'THE PARK IS OPEN  ·  ALL NIGHT LONG', 73, 21);
const halloweenGateSignTex = makeHalloweenBoard(1024, 256, 'HALLOWEEN NIGHT', 'WHERE NIGHTMARES COME OUT TO PLAY', 89, 27);
const halloweenCottageSignTex = makeHalloweenBoard(512, 192, 'HAUNTED HOUSE', 'ENTER IF YOU DARE', 47, 22);
const halloweenMarqueeTex = makeHalloweenBoard(768, 192, 'THE MIDNIGHT MENAGERIE', 'CURIOSITIES  ·  OMENS  ·  SWEET THINGS', 45, 22);
const halloweenCoasterSignTex = makeHalloweenBoard(512, 128, 'NIGHT COASTER', '', 48, 20);
const halloweenBannerTex = makeHalloweenBanner();
const halloweenGhostWindowTex = makeHalloweenWindow('ghost');
const halloweenAmberWindowTex = makeHalloweenWindow('amber');
const halloweenNeonTex = makeNeonTexture('BOO!', '#ff79b5', 'HAPPY HAUNTING');

addThemeTexture(plaqueFace.material, plaqueFace.material.map, halloweenPlaqueTex);
for (const mat of materialsUsingMap(gateSignTex)) addThemeTexture(mat, mat.map, halloweenGateSignTex);
for (const mat of materialsUsingMap(hhSignTex)) addThemeTexture(mat, mat.map, halloweenCottageSignTex);
for (const mat of materialsUsingMap(bannerTex)) addThemeTexture(mat, mat.map, halloweenBannerTex);
for (const mat of materialsUsingMap(marqueeTex)) addThemeTexture(mat, mat.map, halloweenMarqueeTex);
for (const mat of materialsUsingMap(coasterSignTex)) addThemeTexture(mat, mat.map, halloweenCoasterSignTex);
for (const group of neonSignGroups) {
  const mat = group.userData.labelMat;
  if (mat) addThemeTexture(mat, mat.map, halloweenNeonTex);
}
const halloweenPosterTextures = [makeHalloweenPoster(0), makeHalloweenPoster(1), makeHalloweenPoster(2)];
for (const entry of posterThemeMaterials) {
  addThemeTexture(entry.mat, entry.mat.map, halloweenPosterTextures[entry.type]);
}
for (const mat of hauntedWindowMats) {
  if (mat.map === ghostWindowTex) addThemeTexture(mat, mat.map, halloweenGhostWindowTex);
  else if (mat.map === amberWindowTex) addThemeTexture(mat, mat.map, halloweenAmberWindowTex);
}

// --- theme atmosphere data --------------------------------------------------
const fairyStarColors = new Float32Array(starColor);
const halloweenStarColors = new Float32Array(starCount * 3);
{
  const palette = [new THREE.Color(0xfff6e4), new THREE.Color(0xbfd2ff), new THREE.Color(0xf5c7ff), new THREE.Color(0xffd8a8)];
  const rr = mulberry32(7701);
  for (let i = 0; i < starCount; i++) {
    const col = palette[i % palette.length];
    const b = 0.65 + rr() * 1.35;
    halloweenStarColors[i * 3] = col.r * b;
    halloweenStarColors[i * 3 + 1] = col.g * b;
    halloweenStarColors[i * 3 + 2] = col.b * b;
  }
}
const cloudThemeData = cloudGroup.children.map((sprite, index) => ({
  mat: sprite.material,
  fairyColor: sprite.material.color.clone(),
  fairyOpacity: sprite.material.opacity,
  index,
}));
const halloweenCloudPalette = [0x5b477d, 0x3b3058, 0x6e5288, 0x463861];
const practicalThemeData = practicalLights.map((light) => ({ light, fairyColor: light.color.clone() }));
const halloweenPracticalColors = [0xff8a33, 0xff7c24, 0xff7ba9, 0x64ffe0, 0x70ffb2, 0xff8d38, 0x9b86ff, 0xff8527, 0xff6f1d];
const mistThemeEntries = [];
function trackMist(mat, halloweenHex) {
  if (!mat || !mat.color) return;
  mistThemeEntries.push({ mat, fairyColor: mat.color.clone(), halloweenColor: new THREE.Color(halloweenHex) });
}
for (let i = 0; i < mistLayers.length; i++) trackMist(mistLayers[i].mesh.material, [0x5a3c85, 0x3f2c63, 0x6b477f][i % 3]);
for (const sprite of wispRoot.children) trackMist(sprite.material, 0x62408f);
for (const item of castleMistSprites) trackMist(item.sprite.material, item.additive ? 0x8a56b6 : 0x4b2f6f);
for (const system of groundFogSystems) trackMist(system.points.material, 0x4a3368);
for (const sheet of groundFogSheets) trackMist(sheet.mesh.material, 0x5e3c80);
const bloomTheme = {
  fairy: { strength: 0.44, radius: 0.5, threshold: 0.84, exposure: 0.92 },
  halloween: { strength: 0.78, radius: 0.62, threshold: 0.66, exposure: 0.92 },
};

const fairyFwColors = { purple: 0xc7a4ff, orange: 0xffa0cf, gold: 0xffe2a1, blue: 0x9ed8ff };
const halloweenFwColors = { purple: 0xb78cff, orange: 0xff8b3d, gold: 0xffd363, blue: 0x6cc8ff };
const fairyFwBurst = Object.values(fairyFwColors);
const halloweenFwBurst = Object.values(halloweenFwColors);
const fairyFwTrail = [0xfff4d8, 0xffdca8, 0xffb8df, 0xe6d4ff, 0xc3e7ff];
const halloweenFwTrail = [0xfff0c8, 0xffd88a, 0xffb45e, 0xf4dcff, 0xccecff];

const themeRootRecords = [dreamLayerRoot, skyLanternRoot, starlightRoot, castleCrownGroup].map((root) => ({
  root,
  record: assembly.find((record) => record.obj === root),
  fairyOnly: true,
}));
function enforceThemeVisibility() {
  for (const entry of themeRootRecords) {
    const started = !entry.record || simulationTime >= entry.record.start;
    entry.root.visible = currentTheme === 'fairy' && started;
  }
}

function applyTheme(mode, persist = true) {
  currentTheme = mode === 'halloween' ? 'halloween' : 'fairy';
  const fairy = currentTheme === 'fairy';
  for (const entry of themeColorEntries) {
    entry.mat.color.copy(fairy ? entry.fairyColor : entry.halloweenColor);
  }
  for (const entry of themeTextureEntries) {
    entry.mat.map = fairy ? entry.fairyMap : entry.halloweenMap;
    entry.mat.needsUpdate = true;
  }
  for (const entry of pumpkinThemeData) {
    entry.mat.map = fairy ? entry.fairyMap : entry.halloweenMap;
    entry.mat.emissiveMap = fairy ? entry.fairyEmissive : entry.halloweenEmissive;
    entry.mat.emissive.setHex(fairy ? entry.fairyEmissiveColor : entry.halloweenEmissiveColor);
    entry.mat.needsUpdate = true;
  }
  for (const part of themePartGroups) {
    part.fairy.visible = fairy;
    part.halloween.visible = !fairy;
  }
  cobwebMat.visible = !fairy;
  for (const entry of mistThemeEntries) {
    entry.mat.color.copy(fairy ? entry.fairyColor : entry.halloweenColor);
  }
  for (const entry of practicalThemeData) {
    entry.light.color.setHex(fairy ? entry.fairyColor.getHex() : halloweenPracticalColors[practicalThemeData.indexOf(entry) % halloweenPracticalColors.length]);
  }
  for (const entry of cloudThemeData) {
    if (fairy) {
      entry.mat.color.copy(entry.fairyColor);
      entry.mat.opacity = entry.fairyOpacity;
    } else {
      entry.mat.color.setHex(halloweenCloudPalette[entry.index % halloweenCloudPalette.length]);
      entry.mat.opacity = entry.fairyOpacity * 0.88;
    }
  }
  const skyColors = fairy
    ? { top: 0x160c38, mid: 0x4a2c6b, horizon: 0xaa6693 }
    : { top: 0x02040e, mid: 0x0b0a28, horizon: 0x261435 };
  skyUniforms.uTop.value.setHex(skyColors.top);
  skyUniforms.uMid.value.setHex(skyColors.mid);
  skyUniforms.uHorizon.value.setHex(skyColors.horizon);
  skyUniforms.uNebula.value = fairy ? 1.0 : 0.42;
  starGeo.attributes.aColor.array.set(fairy ? fairyStarColors : halloweenStarColors);
  starGeo.attributes.aColor.needsUpdate = true;
  scene.fog.color.setHex(fairy ? 0x4a3167 : 0x21163d);
  scene.fog.density = fairy ? 0.0065 : 0.0078;
  if (fairy) {
    moonMesh.material.color.setHex(0xe7d4f4);
    moonGlow1.material.color.setHex(0xbfa2ff);
    moonGlow1.material.opacity = 0.18;
    moonGlow2.material.color.setHex(0xffd9ee);
    moonGlow2.material.opacity = 0.18;
    moonRays.material.color.setHex(0xe0c4ff);
    moonRays.material.opacity = 0.72;
    skyHalo.material.color.setHex(0x5b356b);
    skyHalo.material.opacity = 0.17;
    hemi.color.setHex(0xb6a4ff); hemi.groundColor.setHex(0x2a1b3e); hemi.intensity = 1.02;
    moonLight.color.setHex(0xffdff4); moonLight.intensity = 2.15;
    warmFill.color.setHex(0xffb9db); warmFill.intensity = 0.35;
    rimLight.color.setHex(0x9bc9ff); rimLight.intensity = 0.9;
    waterUniforms.uDeep.value.setHex(0x18204a);
    waterUniforms.uShallow.value.setHex(0x5c3a7a);
    waterUniforms.uSparkle.value.setHex(0x9e75c7);
  } else {
    moonMesh.material.color.setHex(0xbac8dd);
    moonGlow1.material.color.setHex(0x7899ff);
    moonGlow1.material.opacity = 0.14;
    moonGlow2.material.color.setHex(0xdbeaff);
    moonGlow2.material.opacity = 0.15;
    moonRays.material.color.setHex(0xa8c6ff);
    moonRays.material.opacity = 0.66;
    skyHalo.material.color.setHex(0x26315d);
    skyHalo.material.opacity = 0.13;
    hemi.color.setHex(0x778cff); hemi.groundColor.setHex(0x171126); hemi.intensity = 1.0;
    moonLight.color.setHex(0xd5e5ff); moonLight.intensity = 2.65;
    warmFill.color.setHex(0x9bacff); warmFill.intensity = 0.28;
    rimLight.color.setHex(0x897dff); rimLight.intensity = 1.3;
    waterUniforms.uDeep.value.setHex(0x08131f);
    waterUniforms.uShallow.value.setHex(0x1b2b4b);
    waterUniforms.uSparkle.value.setHex(0x5a769c);
  }
  Object.assign(fwThemeColors, fairy ? fairyFwColors : halloweenFwColors);
  fwBurstPalette.length = 0;
  fwBurstPalette.push(...(fairy ? fairyFwBurst : halloweenFwBurst));
  fwTrailColors.length = 0;
  fwTrailColors.push(...(fairy ? fairyFwTrail : halloweenFwTrail));
  const bloom = fairy ? bloomTheme.fairy : bloomTheme.halloween;
  bloomPass.strength = bloom.strength;
  bloomPass.radius = bloom.radius;
  bloomPass.threshold = bloom.threshold;
  renderer.toneMappingExposure = bloom.exposure;
  enforceThemeVisibility();
  document.body.dataset.theme = currentTheme;
  const themeButton = document.getElementById('theme-toggle');
  if (themeButton) {
    themeButton.setAttribute('aria-pressed', String(!fairy));
    themeButton.setAttribute('aria-label', fairy ? '当前童话夜，点击切换到万圣夜' : '当前万圣夜，点击切换到童话夜');
    themeButton.setAttribute('title', fairy ? '切换到万圣夜' : '切换到梦幻童话夜');
    const icon = themeButton.querySelector('.theme-icon');
    const label = themeButton.querySelector('.theme-label');
    if (icon) icon.textContent = fairy ? '✦' : '☾';
    if (label) label.textContent = fairy ? '童话夜' : '万圣夜';
  }
  if (persist) {
    try { localStorage.setItem('dreamNightParkTheme', currentTheme); } catch (e) { /* file:// storage may be unavailable */ }
  }
}

const themeToggleButton = document.getElementById('theme-toggle');
if (themeToggleButton) {
  themeToggleButton.addEventListener('pointerdown', (event) => event.stopPropagation());
  themeToggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyTheme(currentTheme === 'fairy' ? 'halloween' : 'fairy');
  });
}
let initialTheme = 'fairy';
try {
  const stored = localStorage.getItem('dreamNightParkTheme');
  if (stored === 'halloween' || stored === 'fairy') initialTheme = stored;
} catch (e) { /* keep fairy default */ }
applyTheme(initialTheme, false);

function updateFerrisWheel(dt) {
  const speed = 0.082 * clamp(operationTime / 3.2, 0, 1);
  ferrisSpin.rotation.z -= dt * speed;
  for (const cabin of ferrisCabins) {
    cabin.rotation.z = -ferrisSpin.rotation.z;
  }
}
function updateObservationTower(dt) {
  obsRot.rotation.y += dt * 0.14;
  const cycle = (Math.sin(operationTime * 0.23 - 0.8) * 0.5 + 0.5);
  elevator.position.y = 2.2 + cycle * 8.3;
  elevator.rotation.y = Math.sin(operationTime * 0.23) * 0.08;
}
function updateClockHands() {
  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  hourPivot.rotation.z = -(hours / 12) * TAU;
  minutePivot.rotation.z = -(minutes / 60) * TAU;
  secondPivot.rotation.z = -(seconds / 60) * TAU;
  clockGearA.rotation.z = seconds * 0.62;
  clockGearB.rotation.z = -seconds * 0.94;
  clockPendulum.rotation.z = Math.sin(seconds * 1.45) * 0.16;
}
function updatePracticalLights(time) {
  if (!operationStarted) return;
  for (const light of practicalLights) {
    const f = light.userData.flicker || 0;
    const phase = light.userData.phase || 0;
    const hauntedFlicker = light.color.getHex() === 0x70ffb2
      ? (Math.sin(time * 13.0 + phase) > 0.65 ? -0.35 : 0)
      : 0;
    light.intensity = light.userData.baseIntensity * (1 + Math.sin(time * 2.2 + phase) * f + hauntedFlicker);
  }
}
function updateFlickerMaterials(time) {
  for (let i = 0; i < hauntedWindowMats.length; i++) {
    const m = hauntedWindowMats[i];
    const phase = i * 2.73;
    const flicker = (Math.sin(time * 9.0 + phase) > 0.84) ? 0.38 : 1.0;
    m.opacity = 0.9 * flicker;
  }
  for (let i = 0; i < pumpkinVariants.length; i++) {
    pumpkinVariants[i].emissiveIntensity = 1.45 + Math.sin(time * 1.55 + i * 1.7) * 0.18;
  }
  for (let i = 0; i < neonSignGroups.length; i++) {
    const group = neonSignGroups[i];
    const flicker = 0.82 + 0.18 * Math.sin(time * 2.8 + group.userData.flickerPhase);
    group.traverse((child) => {
      if (child.isMesh && child.material && child.material.transparent) {
        child.material.opacity = flicker;
      }
    });
  }
}
function updateCrowdSigns(time) {
  // slow, soft flicker for the small marquee bulbs
  if (bulbSignGroup) {
    bulbSignGroup.children.forEach((s, i) => {
      if (s.isMesh) s.scale.setScalar(0.85 + Math.sin(time * 3.0 + i) * 0.15);
    });
  }
}
function updateSky(time) {
  skyUniforms.uTime.value = time;
  starMat.uniforms.uTime.value = time;
  cloudGroup.children.forEach((s) => {
    s.position.x = s.userData.baseX + Math.sin(time * s.userData.speed + s.userData.phase) * 7.5;
  });
  moonGlow2.material.opacity = 0.14 + Math.sin(time * 0.6) * 0.025;
  moonRays.material.rotation = -0.12 + Math.sin(time * 0.035) * 0.06;
  moonRays.material.opacity = 0.66 + Math.sin(time * 0.32) * 0.06;
}
function updateFairyLights(time) {
  ferrisBulbMat.uniforms.uTime.value = time;
  carouselLightMat.uniforms.uTime.value = time;
  festoonBulbMat.uniforms.uTime.value = time;
  moteMat.uniforms.uTime.value = time;
}
function updateGroundGlow(time) {
  glowSprites.forEach((g) => {
    g.sprite.material.opacity = g.base * (0.88 + Math.sin(time * 1.5 + g.phase) * 0.12);
  });
}

/* --------------------------------------------------------------------------
   Static geometry compression.
   Once the build is complete, hundreds of small architectural pieces no
   longer need to be separate draw calls. They are baked, by material, into a
   handful of large meshes. Anything that will move afterwards is preserved.
   -------------------------------------------------------------------------- */
const staticMergeExclusions = new Set([
  ferrisSpin,
  carouselSpin,
  obsRot,
  elevator,
  coasterTrain,
  ghostLayer,
  batLayer,
  castleFlag,
  handPivot,
  clockGearA,
  clockGearB,
  clockPendulum,
  bulbSignGroup,
  ...mistLayers.map((layer) => layer.mesh),
  ...themeExcludedRoots,
]);
let staticCompressed = false;

function mergeSubtreeMeshes(root, options = {}) {
  const exclude = options.exclude || null;
  const skipTransparent = options.skipTransparent !== false;
  root.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const meshes = [];

  function walk(object) {
    if (object !== root && exclude && exclude.has(object)) return;
    if (object.isMesh && !object.isSkinnedMesh && !object.isInstancedMesh && object.visible) {
      const geometry = object.geometry;
      const material = object.material;
      if (geometry && material && !Array.isArray(material) && !material.isShaderMaterial &&
          material.visible !== false && (!skipTransparent || !material.transparent) &&
          Object.keys(geometry.morphAttributes || {}).length === 0 &&
          geometry.attributes.position) {
        const attrs = Object.entries(geometry.attributes)
          .map(([name, attr]) => `${name}:${attr.itemSize}:${attr.normalized ? 1 : 0}`)
          .sort()
          .join('|');
        const key = [
          material.uuid,
          geometry.index ? 'indexed' : 'nonindexed',
          attrs,
          object.castShadow ? 'c1' : 'c0',
          object.receiveShadow ? 'r1' : 'r0',
          object.renderOrder || 0,
        ].join('|');
        let bucket = buckets.get(key);
        if (!bucket) {
          bucket = {
            material,
            castShadow: object.castShadow,
            receiveShadow: object.receiveShadow,
            renderOrder: object.renderOrder || 0,
            entries: [],
          };
          buckets.set(key, bucket);
        }
        const relative = new THREE.Matrix4().multiplyMatrices(rootInverse, object.matrixWorld);
        const cloned = geometry.clone();
        cloned.applyMatrix4(relative);
        bucket.entries.push({ object, geometry: cloned });
        meshes.push(object);
      }
    }
    for (const child of object.children) walk(child);
  }
  walk(root);

  let mergedCount = 0;
  for (const bucket of buckets.values()) {
    if (bucket.entries.length < 2) continue;
    const mergedGeometry = mergeGeometries(bucket.entries.map((entry) => entry.geometry), false);
    if (!mergedGeometry) continue;
    mergedGeometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(mergedGeometry, bucket.material);
    mesh.castShadow = bucket.castShadow;
    mesh.receiveShadow = bucket.receiveShadow;
    mesh.renderOrder = bucket.renderOrder;
    mesh.name = 'merged-static';
    root.add(mesh);
    for (const entry of bucket.entries) {
      if (entry.object.parent) entry.object.parent.remove(entry.object);
    }
    mergedCount += bucket.entries.length;
  }
  return mergedCount;
}

function compressStaticGeometry() {
  if (staticCompressed) return false;
  const start = performance.now();
  let count = 0;
  count += mergeSubtreeMeshes(park, { exclude: staticMergeExclusions, skipTransparent: true });
  // Merge static parts inside the moving rides as well, without losing pivots.
  count += mergeSubtreeMeshes(rimGroup, { skipTransparent: false });
  for (const cabin of ferrisCabins) count += mergeSubtreeMeshes(cabin, { skipTransparent: false });
  count += mergeSubtreeMeshes(carouselPoleGroup, { skipTransparent: false });
  count += mergeSubtreeMeshes(carouselDeckGroup, { skipTransparent: false });
  count += mergeSubtreeMeshes(carouselCoreGroup, { skipTransparent: false });
  count += mergeSubtreeMeshes(carouselLanternGroup, { skipTransparent: false });
  count += mergeSubtreeMeshes(carouselCanopyGroup, { exclude: new Set([carouselStar]), skipTransparent: false });
  for (const horse of carouselHorses) count += mergeSubtreeMeshes(horse, { skipTransparent: false });
  count += mergeSubtreeMeshes(obsRot, { skipTransparent: false });
  count += mergeSubtreeMeshes(elevator, { skipTransparent: false });
  count += mergeSubtreeMeshes(clockGearA, { skipTransparent: false });
  count += mergeSubtreeMeshes(clockGearB, { skipTransparent: false });
  count += mergeSubtreeMeshes(clockPendulum, { skipTransparent: false });
  for (const car of coasterCars) count += mergeSubtreeMeshes(car, { skipTransparent: false });
  staticCompressed = true;
  fpsWindowStart = performance.now();
  return { mergedMeshes: count, ms: +(performance.now() - start).toFixed(1) };
}

let lastRealFrame = performance.now();
let realFpsFrames = 0;
let realFpsWindowStart = performance.now();
let realFps = 0;

function updateWorld(dt, render = true) {
  updateAssembly(simulationTime);
  enforceThemeVisibility();

  if (!operationStarted && simulationTime >= OPERATION_START) {
    operationStarted = true;
    operationTime = 0;
    nextFireworkAt = simulationTime + 0.9;
    compressStaticGeometry();
  }

  if (operationStarted) {
    operationTime += dt;
    updateFerrisWheel(dt);
    updateCarousel(operationTime, dt);
    updateObservationTower(dt);
    updateCoasterTrain(operationTime);
    updateFountain(dt, simulationTime);
  }
  updateFireworks(dt, simulationTime);

  updateGhosts(simulationTime);
  updateBats(simulationTime);
  updateDreamLayer(simulationTime, dt);
  updateMotes(simulationTime);
  updateMist(simulationTime);
  updateSky(simulationTime);
  updateFairyLights(simulationTime);
  waterUniforms.uTime.value = simulationTime;
  updateClockHands();
  updatePracticalLights(simulationTime);
  updateFlickerMaterials(simulationTime);
  updateCrowdSigns(simulationTime);
  updateGroundGlow(simulationTime);

  // flags
  castleFlag.rotation.z = Math.sin(simulationTime * 1.65) * 0.04;
  castleFlag.rotation.y = 0.12 + Math.sin(simulationTime * 1.2) * 0.06;

  if (coasterRidePhase !== 'off') updateCoasterRide(dt);

  if (render) {
    if (coasterRidePhase === 'off') {
      controls.update();
      easeCameraDistance(dt);
    }
    renderComposition();
  }
}

function renderComposition() {
  composer.render();
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(fireworkScene, camera);
  renderer.autoClear = true;
}

let paused = false;

function animateFrame() {
  requestAnimationFrame(animateFrame);
  if (paused) {
    if (coasterRidePhase === 'off') controls.update();
    renderComposition();
    return;
  }
  const rawDt = clock.getDelta();
  const visualDt = Math.min(rawDt, 0.05);
  // The construction timeline follows wall-clock time; slow background tabs
  // simply show fewer frames instead of slowing the show down.
  simulationTime += Math.min(rawDt, 1.0);

  updateWorld(visualDt, true);

  const now = performance.now();
  realFpsFrames++;
  if (now - realFpsWindowStart > 2500) {
    realFps = realFpsFrames * 1000 / (now - realFpsWindowStart);
    fps = realFps;
    realFpsFrames = 0;
    realFpsWindowStart = now;
    // Adaptive resolution only when the page is genuinely in the foreground.
    // Very low rates are more likely background-tab throttling than a hot GPU.
    if (!qualityReduced && document.hasFocus() && simulationTime > 8 && getComputedQualityFps() < 31 && getComputedQualityFps() > 5) {
      qualityReduced = true;
      const lowerPixelRatio = Math.max(1, Math.min(window.devicePixelRatio, 1.25));
      renderer.setPixelRatio(lowerPixelRatio);
      composer.setPixelRatio(lowerPixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    } else if (qualityReduced && document.hasFocus() && getComputedQualityFps() > 46) {
      qualityReduced = false;
      const restoredPixelRatio = Math.min(window.devicePixelRatio, 1.5);
      renderer.setPixelRatio(restoredPixelRatio);
      composer.setPixelRatio(restoredPixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  lastRealFrame = now;
}
function getComputedQualityFps() {
  return realFps;
}

// The very first frame is assembled manually so a resize before the loop
// cannot show an incorrectly sized canvas.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const pr = qualityReduced
    ? Math.max(1, Math.min(window.devicePixelRatio, 1.25))
    : Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (coasterRidePhase === 'off') fitCameraForAspect();
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('pointerdown', () => {
  renderer.domElement.style.cursor = 'grabbing';
});
window.addEventListener('pointerup', () => {
  renderer.domElement.style.cursor = 'grab';
});

// A clean click in the open sky launches a firework toward the clicked spot.
const fwClickRaycaster = new THREE.Raycaster();
const fwClickNdc = new THREE.Vector2();
function isVisibleObject(object) {
  let node = object;
  while (node) {
    if (!node.visible) return false;
    node = node.parent;
  }
  return true;
}
function isNodeWithin(object, root) {
  let node = object;
  while (node) {
    if (node === root) return true;
    node = node.parent;
  }
  return false;
}
function isOpaqueObject(object) {
  if (!object.isMesh) return false;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  return materials.some((mat) => mat && mat.visible !== false && !mat.transparent);
}
let fwPointerStart = null;
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  fwPointerStart = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    pointerId: event.pointerId,
  };
});
window.addEventListener('pointerup', (event) => {
  const start = fwPointerStart;
  fwPointerStart = null;
  if (!start || start.pointerId !== event.pointerId) return;
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
  if (moved > 8 || performance.now() - start.time > 850) return;
  if (coasterRidePhase !== 'off') {
    if (coasterRidePhase !== 'exiting') exitCoasterRide();
    return;
  }
  const ndcX = event.clientX / window.innerWidth * 2 - 1;
  const ndcY = -(event.clientY / window.innerHeight) * 2 + 1;
  fwClickNdc.set(ndcX, ndcY);
  fwClickRaycaster.setFromCamera(fwClickNdc, camera);
  const hits = fwClickRaycaster.intersectObject(park, true);
  for (const hit of hits) {
    if (!isVisibleObject(hit.object)) continue;
    if (isNodeWithin(hit.object, coasterRoot)) {
      enterCoasterRide();
      return;
    }
    if (isOpaqueObject(hit.object)) return;
  }
  if (ndcY < -0.2) return;
  launchFireworkAtNdc(ndcX, ndcY);
});
window.addEventListener('pointercancel', () => {
  fwPointerStart = null;
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && coasterRidePhase !== 'off') {
    event.preventDefault();
    if (coasterRidePhase !== 'exiting') exitCoasterRide();
    return;
  }
  if (!event.repeat && (event.key === 'r' || event.key === 'R') && !event.ctrlKey && !event.metaKey && !event.altKey && coasterRidePhase === 'off') {
    enterCoasterRide();
  }
});

// Debug hook (not visible in the page). It is useful for automated visual tests
// and has no effect on normal playback.
window.__PARK_DEBUG__ = {
  scene,
  camera,
  renderer,
  composer,
  controls,
  assembly,
  updateAssembly,
  get time() { return simulationTime; },
  get theme() { return currentTheme; },
  setTheme(mode) { applyTheme(mode, false); },
  get operationStarted() { return operationStarted; },
  get showEnd() { return SHOW_END; },
  get operationStart() { return OPERATION_START; },
  get phaseStarts() {
    return Object.fromEntries(Object.entries(ASSEMBLY_SCHEDULE).map(([key, value]) => [key, value.start]));
  },
  get fps() { return fps; },
  get realFps() { return realFps; },
  get compressed() { return staticCompressed; },
  skipIntro() {
    assembly.forEach((rec) => {
      rec.done = true;
      rec.obj.visible = true;
      rec.obj.position.copy(rec.basePos);
      rec.obj.scale.copy(rec.baseScale);
      rec.obj.rotation.copy(rec.baseRot);
      if (rec.drawRanges) rec.drawRanges.forEach((d) => d.geom.setDrawRange(0, d.count));
      if (rec.materials) rec.materials.forEach((item) => setObjectOpacity(item.m, item.base));
      if (rec.mode === 'light') rec.obj.intensity = rec.lightBase;
    });
    simulationTime = Math.max(simulationTime, OPERATION_START + 0.05);
    if (!operationStarted) {
      operationStarted = true;
      operationTime = 0.001;
      nextFireworkAt = simulationTime + 0.5;
    }
    compressStaticGeometry();
  },
  fastForward(seconds = 1) {
    simulationTime += seconds;
  },
  seek(seconds) {
    simulationTime = seconds;
    updateWorld(0.016, true);
  },
  tick(seconds = 0.05, render = true) {
    simulationTime += seconds;
    updateWorld(seconds, render);
  },
  get rockets() { return fireworkRockets.length; },
  get rocketCount() { return fireworkRockets.length; },
  get ridePhase() { return coasterRidePhase; },
  get ride() {
    return {
      phase: coasterRidePhase,
      u: +coasterRideU.toFixed(4),
      distance: +coasterRideDistance.toFixed(2),
      speed: +coasterRideSpeed.toFixed(2),
      fov: +camera.fov.toFixed(2),
    };
  },
  get coasterLength() { return coasterLength; },
  enterRide() {
    return enterCoasterRide();
  },
  exitRide() {
    return exitCoasterRide();
  },
  coasterScreenPoint(u = 0.02) {
    const v = coasterCurve.getPointAt(clamp(u, 0, 1)).clone().project(camera);
    return {
      x: v.x, y: v.y,
      screenX: (v.x + 1) * 0.5 * window.innerWidth,
      screenY: (1 - v.y) * 0.5 * window.innerHeight,
    };
  },
  trainScreenPoint() {
    const p = coasterCars[0].getWorldPosition(new THREE.Vector3()).project(camera);
    return {
      x: p.x, y: p.y,
      screenX: (p.x + 1) * 0.5 * window.innerWidth,
      screenY: (1 - p.y) * 0.5 * window.innerHeight,
    };
  },
  coasterClickableSpots(count = 24) {
    const spots = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      v.copy(coasterCurve.getPointAt(u)).project(camera);
      if (Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) continue;
      fwClickNdc.set(v.x, v.y);
      fwClickRaycaster.setFromCamera(fwClickNdc, camera);
      const hits = fwClickRaycaster.intersectObject(park, true);
      const first = hits.find((hit) => isVisibleObject(hit.object));
      if (first && isNodeWithin(first.object, coasterRoot)) {
        spots.push({
          u: +u.toFixed(3),
          screenX: (v.x + 1) * 0.5 * window.innerWidth,
          screenY: (1 - v.y) * 0.5 * window.innerHeight,
        });
      }
    }
    return spots;
  },
  firework() {
    spawnFirework();
  },
  fireworkAt(nx, ny) {
    return launchFireworkAtNdc(nx, ny);
  },
  compress() {
    return compressStaticGeometry();
  },
  pause() {
    paused = true;
  },
  resume() {
    paused = false;
    clock.getDelta();
  },
  syncCameraZoom() {
    targetCameraDistance = camera.position.distanceTo(controls.target);
  },
  skip() {
    this.skipIntro();
  },
};

animateFrame();


