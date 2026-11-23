/* --------------------------------------------------------------------------
   Pumpkin system
   -------------------------------------------------------------------------- */
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
  ctx.fillStyle = '#23100d';
  ctx.strokeStyle = '#2a100c';
  ctx.lineWidth = 10;
  // eyes
  if (style === 2) {
    // winking: one triangle, one happy arc
    ctx.beginPath();
    ctx.moveTo(-95, -45); ctx.lineTo(-44, -64); ctx.lineTo(-55, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(45, -18);
    ctx.quadraticCurveTo(80, -62, 111, -6);
    ctx.lineWidth = 19;
    ctx.strokeStyle = '#23100d';
    ctx.stroke();
  } else if (style === 3) {
    // angry square eyes
    ctx.beginPath();
    ctx.moveTo(-100, -50); ctx.lineTo(-48, -30); ctx.lineTo(-58, 12); ctx.lineTo(-104, -6); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(102, -50); ctx.lineTo(50, -30); ctx.lineTo(60, 12); ctx.lineTo(106, -6); ctx.closePath(); ctx.fill();
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 35, -48);
      ctx.lineTo(sx * 92, -22);
      ctx.lineTo(sx * 44, 18);
      ctx.closePath();
      ctx.fill();
    }
  }
  // nose
  ctx.beginPath();
  ctx.moveTo(-15, 20); ctx.lineTo(22, 18); ctx.lineTo(5, 52); ctx.closePath(); ctx.fill();
  // mouth
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
  if (style === 3) ctx.stroke();
  // tiny cheek cracks / freckles for personality
  ctx.strokeStyle = 'rgba(63,22,14,.7)';
  ctx.lineWidth = 3;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 120, 42);
    ctx.lineTo(sx * 148, 58);
    ctx.lineTo(sx * 126, 72);
    ctx.stroke();
  }
  ctx.restore();
}
function makePumpkinVariant(variant) {
  const baseColors = ['#e56f1d', '#f28727', '#cf591b', '#f5a23d', '#dd6d35'];
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
    const glow = ctx.createRadialGradient(0, 20, 8, 0, 40, 190);
    glow.addColorStop(0, '#fff6cd');
    glow.addColorStop(0.5, '#ffd178');
    glow.addColorStop(1, '#e77a21');
    ctx.fillStyle = glow;
    // Draw the same face as SVG path fill using temporary canvas clipped shapes
    if (style === 2) {
      ctx.beginPath();
      ctx.moveTo(-95, -45); ctx.lineTo(-44, -64); ctx.lineTo(-55, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 19;
      ctx.beginPath();
      ctx.moveTo(45, -18);
      ctx.quadraticCurveTo(80, -62, 111, -6);
      ctx.stroke();
    } else if (style === 3) {
      ctx.beginPath();
      ctx.moveTo(-100, -50); ctx.lineTo(-48, -30); ctx.lineTo(-58, 12); ctx.lineTo(-104, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(102, -50); ctx.lineTo(50, -30); ctx.lineTo(60, 12); ctx.lineTo(106, -6); ctx.closePath(); ctx.fill();
    } else {
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 35, -48); ctx.lineTo(sx * 92, -22); ctx.lineTo(sx * 44, 18); ctx.closePath(); ctx.fill();
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
  });
  const mat = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map,
    gradientMap: toonGradient,
    emissive: 0xffa24a,
    emissiveMap,
    emissiveIntensity: 1.25,
  });
  mat.name = `pumpkinMat${variant}`;
  pumpkinVariants.push(mat);
}
for (let i = 0; i < 5; i++) makePumpkinVariant(i);

const stemMat = toonMat(0x3f3522);
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
    addGlow(g, opts.glowColor || 0xff973d, size * 2.6, 0, lift + 0.2 * size, 0.4 * size, 0.2);
  }
  return g;
}

/* --------------------------------------------------------------------------
   Fountain at the heart of the roundabout
   -------------------------------------------------------------------------- */
const fountainRoot = new THREE.Group();
fountainRoot.name = 'pumpkinFountain';
fountainRoot.position.set(0, 0, 10.2);
park.add(fountainRoot);
const fountainStone = toonMat(0x8e839f, { map: stoneTex });
const fountainStoneDark = toonMat(0x5d526f, { map: stoneDarkTex });
const fountainGold = toonMat(0xd3a868, { emissive: 0x3f260c, emissiveIntensity: 0.4 });
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
  color: 0x38658c, transparent: true, opacity: 0.72, toneMapped: true, depthWrite: false,
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
const scareWood = toonMat(0x4d3a35);
addBox(scarecrow, 0.14, 2.25, 0.14, scareWood, 0, 1.25, 0, { castShadow: false });
addBox(scarecrow, 1.55, 0.13, 0.13, scareWood, 0, 1.72, 0.0, { castShadow: false });
const scareBody = addCone(scarecrow, 0.46, 1.25, 8, toonMat(0x5b4a44), 0, 1.18, 0, { castShadow: false });
const scareHeadPumpkin = createPumpkin(0.34, 2, { glow: true });
scareHeadPumpkin.position.set(0, 2.18, 0);
scarecrow.add(scareHeadPumpkin);
addCone(scarecrow, 0.48, 0.3, 8, toonMat(0x3a2d30), 0, 2.62, 0, { castShadow: false });
addCyl(scarecrow, 0.24, 0.28, 0.28, 8, toonMat(0x3a2d30), 0, 2.48, 0, { castShadow: false });
for (const sx of [-1, 1]) {
  const sleeve = addCone(scarecrow, 0.13, 0.46, 6, toonMat(0x6b5650), sx * 0.7, 1.63, 0, { rotZ: sx * Math.PI / 2, castShadow: false });
  addBox(scarecrow, 0.07, 0.16, 0.07, toonMat(0xd4b475), sx * 1.0, 1.72, 0, { castShadow: false });
}
assemblePop(scarecrow, 14.8, 0.8);
addGlowPool(park, 0xff9a46, 4.8, 4.9, 9.35, 0.18, 1);

/* --------------------------------------------------------------------------
   Trees
   -------------------------------------------------------------------------- */
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
  const treeMat = toonMat(0x3a2f3e);
  const treeMesh = new THREE.Mesh(mergeGeometries(geos), treeMat);
  treeMesh.castShadow = true;
  treeMesh.receiveShadow = false;
  treeMesh.scale.setScalar(scale);
  g.add(treeMesh);
  // sparse glowing leaves at some branch tips
  const leafMat = toonMat(0x5d3d68, { emissive: 0x21122b, emissiveIntensity: 0.3 });
  for (let i = 0; i < 5; i++) {
    const leaf = addSphere(g, rand2(rr, 0.22, 0.42), leafMat, rand2(rr, -1.2, 1.2) * scale, rand2(rr, 2.1, 3.4) * scale, rand2(rr, -1.2, 1.2) * scale, {
      wSeg: 6, hSeg: 4, sx: 1.2, sy: 0.55, castShadow: false,
    });
  }
  if (seed % 2 === 0) {
    addSphere(g, 0.13, basicMat(0xffb35c, { toneMapped: false }), 0.7 * scale, 2.5 * scale, 0.2 * scale, { wSeg: 7, hSeg: 5, castShadow: false });
    addGlow(g, 0xffa14a, 1.3, 0.7 * scale, 2.5 * scale, 0.2 * scale, 0.35);
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
  const trunk = addCyl(g, 0.15, 0.22, 2.8, 7, toonMat(0x3b2d35), 0, 1.4, 0, { castShadow: true });
  const leafColors = [0x2e4151, 0x343653, 0x3f365e];
  for (let i = 0; i < 4; i++) {
    const y = 1.2 + i * 0.9;
    const radius = (1.7 - i * 0.32) * scale;
    const cone = addCone(g, radius, 1.55, 8, toonMat(leafColors[i % 3]), 0, y * scale + 0.55, 0, { castShadow: false, rotY: rr() });
  }
  for (let i = 0; i < 7; i++) {
    const a = rr() * TAU;
    const rad = rand2(rr, 0.2, 1.2) * scale;
    const y = rand2(rr, 1.0, 4.2) * scale;
    addSphere(g, 0.13, basicMat(rr() > 0.5 ? 0xffc565 : 0x9affd8, { toneMapped: false }), Math.cos(a) * rad, y, Math.sin(a) * rad, { wSeg: 6, hSeg: 4, castShadow: false });
    addGlow(g, 0xffb45f, 0.8, Math.cos(a) * rad, y, Math.sin(a) * rad, 0.24);
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
function makeFlowerBed(cx, cz, w, d, start) {
  const g = new THREE.Group();
  park.add(g);
  const borderMat = toonMat(0x6d627b);
  const soil = addBox(g, w, 0.22, d, toonMat(0x2b222f), cx, 0.12, cz, { castShadow: false });
  addBox(g, w + 0.27, 0.3, 0.22, borderMat, cx, 0.2, cz - d / 2, { castShadow: false });
  addBox(g, w + 0.27, 0.3, 0.22, borderMat, cx, 0.2, cz + d / 2, { castShadow: false });
  addBox(g, 0.22, 0.3, d + 0.27, borderMat, cx - w / 2, 0.2, cz, { castShadow: false });
  addBox(g, 0.22, 0.3, d + 0.27, borderMat, cx + w / 2, 0.2, cz, { castShadow: false });
  const geos = [];
  const rr = mulberry32(Math.floor(cx * 71 + cz * 33 + 17));
  const colors = [new THREE.Color(0xa563ff), new THREE.Color(0xff8760), new THREE.Color(0xffc765), new THREE.Color(0xee86c7), new THREE.Color(0x8bb9ff)];
  for (let i = 0; i < 52; i++) {
    const px = cx + rand2(rr, -w / 2 + 0.3, w / 2 - 0.3);
    const pz = cz + rand2(rr, -d / 2 + 0.22, d / 2 - 0.22);
    const col = colors[Math.floor(rr() * colors.length)];
    const stem = new THREE.CylinderGeometry(0.012, 0.018, rand2(rr, 0.2, 0.4), 4);
    const stemColor = new THREE.Color(0x304c36);
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
  const plantMat = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient });
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
  addCyl(pot, 0.32, 0.26, 0.42, 8, toonMat(0x63526c), x, 0.21, z, { castShadow: false });
  addSphere(pot, 0.38, toonMat(0x3f5642), x, 0.47, z, { wSeg: 8, hSeg: 6, sx: 1, sy: 0.55, castShadow: false });
  for (let i = 0; i < 5; i++) {
    addSphere(pot, 0.08, basicMat(i % 2 ? 0xff9b7e : 0xb17cff, { toneMapped: false }), x + rand(-0.22, 0.22), 0.56 + rand(0, 0.12), z + rand(-0.22, 0.22), { wSeg: 5, hSeg: 4, castShadow: false });
  }
  assemblePop(pot, 15.3, 0.55);
}

// low bushes
const bushGroup = new THREE.Group();
park.add(bushGroup);
const bushMat = toonMat(0x33463f);
const bushMatPurple = toonMat(0x4b3658);
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
    addSphere(b, 0.075, basicMat(0xffb077, { toneMapped: false }), 0.15, 0.38, 0.1, { wSeg: 5, hSeg: 4, castShadow: false });
  }
  assemblePop(b, 15.18 + i * 0.025, 0.55);
}

/* --------------------------------------------------------------------------
   Grass tufts, small stones and mushrooms
   -------------------------------------------------------------------------- */
const grassGroup = new THREE.Group();
park.add(grassGroup);
const grassGeos = [];
const grassMat = new THREE.MeshToonMaterial({ color: 0x2c4438, gradientMap: toonGradient });
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

const stonePebbleMat = toonMat(0x5b556b);
for (let i = 0; i < 25; i++) {
  const a = rand(0, TAU);
  const r = rand(4.2, 18.5);
  addSphere(park, rand(0.05, 0.15), stonePebbleMat, Math.cos(a) * r, rand(0.02, 0.08), Math.sin(a) * r, {
    wSeg: 5, hSeg: 4, sx: rand(1, 2.2), sy: 0.4, sz: rand(0.8, 1.6), castShadow: false,
  });
}
