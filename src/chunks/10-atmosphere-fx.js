/* --------------------------------------------------------------------------
   Ground mist, smoke and floating atmosphere
   -------------------------------------------------------------------------- */
const mistTex = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const rr = mulberry32(8811);
  for (let i = 0; i < 48; i++) {
    const x = rr() * w;
    const y = rr() * h;
    const r = 25 + rr() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.018 + rr() * 0.045})`);
    g.addColorStop(0.6, `rgba(255,255,255,${0.01 + rr() * 0.02})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
});
const mistRoot = new THREE.Group();
mistRoot.name = 'groundMist';
park.add(mistRoot);
const mistLayers = [];
const mistPositions = [
  [-12, 0, 12, 14, 8, 0.14], [8, 0, 13, 16, 10, 0.1], [0, 0, -10, 18, 11, 0.12],
  [14, 0, -3, 12, 8, 0.1], [-15, 0, -4, 15, 9, 0.11], [5, 0, 17, 12, 7, 0.08],
  [-3, 0, 7, 13, 7, 0.06], [10, 0, 1, 10, 6, 0.07],
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
    map: mistTex, color: 0x9b84d3, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: true, toneMapped: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.position.set(Math.cos(angle) * rand(3.5, 6.1), rand(0.2, 0.55), -4.2 + Math.sin(angle) * rand(3.5, 6.1));
  sp.scale.set(rand(3.2, 5.8), rand(1.5, 2.8), 1);
  wispRoot.add(sp);
}
assemble(wispRoot, 17.65, 2.0, 'fade');

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
   Ghosts
   -------------------------------------------------------------------------- */
const ghostLayer = new THREE.Group();
ghostLayer.name = 'ghosts';
park.add(ghostLayer);
const ghostMaterial = new THREE.MeshBasicMaterial({
  color: 0xdcedff, transparent: true, opacity: 0.72, depthWrite: false,
  blending: THREE.NormalBlending, toneMapped: false,
});
const ghostEyeMat = new THREE.MeshBasicMaterial({ color: 0x273247, toneMapped: false });
const ghostCheekMat = new THREE.MeshBasicMaterial({ color: 0xa8c8e7, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false });
function makeGhost(scale = 1) {
  const g = new THREE.Group();
  const profile = [
    [0.01, 0.0], [0.24, 0.02], [0.34, 0.15], [0.43, 0.38], [0.41, 0.65],
    [0.33, 0.82], [0.22, 0.94], [0.1, 1.02], [0.01, 1.04],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bodyGeo = new THREE.LatheGeometry(profile, 16);
  const body = new THREE.Mesh(bodyGeo, ghostMaterial);
  body.position.y = 0.02;
  body.castShadow = false;
  g.add(body);
  // little ghost arms
  addSphere(g, 0.13, ghostMaterial, -0.32, 0.55, 0.14, { wSeg: 7, hSeg: 5, sx: 1.3, sy: 0.7, sz: 0.7, castShadow: false });
  addSphere(g, 0.13, ghostMaterial, 0.32, 0.55, 0.14, { wSeg: 7, hSeg: 5, sx: 1.3, sy: 0.7, sz: 0.7, castShadow: false });
  // wavy tail blobs
  for (const [px, py, pz] of [[-0.22, 0.39, 0.02], [0.15, 0.36, 0.02], [0.32, 0.42, 0.02]]) {
    addSphere(g, 0.12, ghostMaterial, px, py, pz, { wSeg: 6, hSeg: 4, sy: 0.7, castShadow: false });
  }
  // face
  addSphere(g, 0.055, ghostEyeMat, -0.115, 0.85, 0.25, { wSeg: 6, hSeg: 4, sx: 0.7, sy: 1.2, castShadow: false });
  addSphere(g, 0.055, ghostEyeMat, 0.115, 0.85, 0.25, { wSeg: 6, hSeg: 4, sx: 0.7, sy: 1.2, castShadow: false });
  addSphere(g, 0.08, ghostEyeMat, 0, 0.7, 0.25, { wSeg: 6, hSeg: 4, sx: 1, sy: 0.65, castShadow: false });
  addSphere(g, 0.07, ghostCheekMat, -0.21, 0.72, 0.2, { wSeg: 6, hSeg: 4, sx: 0.9, sy: 0.55, castShadow: false });
  addSphere(g, 0.07, ghostCheekMat, 0.21, 0.72, 0.2, { wSeg: 6, hSeg: 4, sx: 0.9, sy: 0.55, castShadow: false });
  addGlow(g, 0xbcd6ff, 2.6, 0, 0.7, 0, 0.29);
  g.scale.setScalar(scale);
  g.visible = true;
  return g;
}
const ghostAnchors = [
  { x: 0, z: -2, y: 7.8, rx: 4.5, rz: 3.8, speed: 0.13, phase: 0, scale: 1.0 },
  { x: 0, z: 0, y: 10.4, rx: 2.8, rz: 4.2, speed: -0.1, phase: 2.1, scale: 0.76 },
  { x: 8.6, z: 5.8, y: 5.3, rx: 2.8, rz: 2.2, speed: 0.18, phase: 4.0, scale: 0.66 },
  { x: -8, z: 8, y: 3.7, rx: 3.0, rz: 2.4, speed: -0.14, phase: 1.2, scale: 0.58 },
  { x: 11.4, z: -8.8, y: 8.8, rx: 2.2, rz: 1.8, speed: 0.12, phase: 3.3, scale: 0.63 },
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
const batBodyMat = new THREE.MeshBasicMaterial({ color: 0x171222, toneMapped: true });
const batWingMat = new THREE.MeshBasicMaterial({ color: 0x1a1428, side: THREE.DoubleSide, toneMapped: true });
const batEyeMat = new THREE.MeshBasicMaterial({ color: 0xffb56a, toneMapped: false });
function makeBat(scale = 1) {
  const g = new THREE.Group();
  addSphere(g, 0.16, batBodyMat, 0, 0, 0, { wSeg: 8, hSeg: 6, sx: 0.7, sy: 0.8, sz: 1.2, castShadow: false });
  addCone(g, 0.07, 0.2, 4, batBodyMat, -0.08, 0.14, 0.05, { castShadow: false, rotZ: 0.3 });
  addCone(g, 0.07, 0.2, 4, batBodyMat, 0.08, 0.14, 0.05, { castShadow: false, rotZ: -0.3 });
  addSphere(g, 0.027, batEyeMat, -0.055, 0.035, 0.14, { wSeg: 5, hSeg: 4, castShadow: false });
  addSphere(g, 0.027, batEyeMat, 0.055, 0.035, 0.14, { wSeg: 5, hSeg: 4, castShadow: false });
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0.56, 0.12, -0.02, 0.34, -0.22, 0.03,
    0.34, -0.22, 0.03, 0.24, 0.06, -0.02, 0, 0, 0,
  ], 3));
  wingGeo.setIndex([0, 1, 2, 3, 4, 0]);
  wingGeo.computeVertexNormals();
  const wingL = new THREE.Mesh(wingGeo, batWingMat);
  wingL.position.x = 0.02;
  const wingR = new THREE.Mesh(wingGeo, batWingMat);
  wingR.scale.x = -1;
  wingR.position.x = -0.02;
  g.add(wingL, wingR);
  g.scale.setScalar(scale);
  g.userData.wingL = wingL;
  g.userData.wingR = wingR;
  g.userData.phase = rand(0, TAU);
  g.userData.baseScale = scale;
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
    rx: rand(5, 13), rz: rand(4, 10), speed: rand(0.16, 0.35) * (i % 2 ? 1 : -1),
    phase: rand(0, TAU), flap: rand(6, 10),
  });
}
batLayer.visible = false;
assemble(batLayer, 18.2, 1.8, 'fade');

/* --------------------------------------------------------------------------
   Fireworks
   -------------------------------------------------------------------------- */
const FW_MAX = 960;
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
      gl_PointSize = aSize * uPixelRatio * (420.0 / max(1.0, -mv.z));
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
      gl_FragColor = vec4(vColor * (1.3 + core * 1.8), core * vAlpha);
    }
  `,
});
const fireworkPoints = new THREE.Points(fwGeo, fwMat);
fireworkPoints.frustumCulled = false;
scene.add(fireworkPoints);
const fireworkFlashes = [];
const fwPalettes = [
  [0xffc46c, 0xff7aa9, 0xffe7b2],
  [0x73ffe1, 0xa092ff, 0xe5fff8],
  [0xffa45f, 0xff5f79, 0xffe09b],
  [0xb78dff, 0x67d4ff, 0xf6e7ff],
];
let nextFireworkAt = 22.8;
function addFireworkFlash(pos, color) {
  const mat = new THREE.SpriteMaterial({
    map: softGlowTex, color, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.setScalar(4.5);
  scene.add(sprite);
  fireworkFlashes.push({ sprite, life: 0.46, maxLife: 0.46 });
}
function spawnFirework() {
  const center = new THREE.Vector3(rand(-14, 14), rand(13.5, 22.5), rand(-24, 3));
  const palette = pick(fwPalettes);
  addFireworkFlash(center, palette[0]);
  const count = 145;
  const gravity = rand(1.8, 2.7);
  for (let n = 0; n < 3; n++) {
    const c = new THREE.Color(palette[n % palette.length]);
    const speedBase = 2.4 + n * 1.6;
    const sub = n === 2 ? 46 : 62;
    for (let j = 0; j < sub; j++) {
      const idx = fwCursor;
      fwCursor = (fwCursor + 1) % FW_MAX;
      const u = rand(0, 1);
      const theta = rand(0, TAU);
      const phi = Math.acos(rand(-0.65, 1));
      const speed = speedBase + rand(-0.8, 1.4);
      fwPositions[idx * 3] = center.x;
      fwPositions[idx * 3 + 1] = center.y;
      fwPositions[idx * 3 + 2] = center.z;
      fwVel[idx * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      fwVel[idx * 3 + 1] = Math.cos(phi) * speed * 0.9 + speed * 0.18;
      fwVel[idx * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      const b = rand(0.8, 2.2);
      fwColors[idx * 3] = c.r * b;
      fwColors[idx * 3 + 1] = c.g * b;
      fwColors[idx * 3 + 2] = c.b * b;
      fwSizes[idx] = rand(0.25, 0.65);
      fwAlphas[idx] = 0.9;
      fwLife[idx] = rand(1.5, 2.5);
      fwMaxLife[idx] = fwLife[idx];
    }
  }
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.aColor.needsUpdate = true;
  fwGeo.attributes.aSize.needsUpdate = true;
  fwGeo.attributes.aAlpha.needsUpdate = true;
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
    fwVel[i * 3 + 1] -= dt * 1.9;
    fwVel[i * 3] *= (1 - dt * 0.15);
    fwVel[i * 3 + 2] *= (1 - dt * 0.15);
    fwPositions[i * 3] += fwVel[i * 3] * dt;
    fwPositions[i * 3 + 1] += fwVel[i * 3 + 1] * dt;
    fwPositions[i * 3 + 2] += fwVel[i * 3 + 2] * dt;
    fwAlphas[i] = clamp(t * 1.4, 0, 1) * (0.65 + 0.35 * Math.sin(time * 22 + i));
  }
  fwGeo.attributes.position.needsUpdate = true;
  fwGeo.attributes.aAlpha.needsUpdate = true;
  for (let i = fireworkFlashes.length - 1; i >= 0; i--) {
    const f = fireworkFlashes[i];
    f.life -= dt;
    if (f.life <= 0) {
      scene.remove(f.sprite);
      f.sprite.material.dispose();
      fireworkFlashes.splice(i, 1);
      continue;
    }
    const p = f.life / f.maxLife;
    f.sprite.material.opacity = p * 0.8;
    f.sprite.scale.setScalar(4.5 + (1 - p) * 3.5);
  }
  if (time > nextFireworkAt) {
    spawnFirework();
    nextFireworkAt = time + rand(3.6, 7.5);
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
    actor.bat.userData.wingL.rotation.z = flap;
    actor.bat.userData.wingR.rotation.z = -flap;
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
    s.material.opacity = 0.12 + Math.sin(time * 0.5 + i) * 0.04;
  });
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
