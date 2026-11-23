/* --------------------------------------------------------------------------
   Moat, island and bridge
   -------------------------------------------------------------------------- */
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
const waterUniforms = { uTime: { value: 0 } };
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
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main() {
      vec2 p = vWorld.xz * 1.2;
      float ripple = sin(p.x*2.2 + uTime*0.8) * 0.5 + sin(p.y*2.7 - uTime*0.62) * 0.5;
      ripple += sin((p.x+p.y)*1.35 + uTime*0.45) * 0.35;
      float sparkle = pow(max(0.0, sin(p.y*7.0 + uTime*0.9) * sin(p.x*5.0 - uTime*0.6)), 14.0);
      vec3 deep = vec3(0.030, 0.055, 0.095);
      vec3 shallow = vec3(0.10, 0.12, 0.22);
      vec3 col = mix(deep, shallow, 0.45 + ripple * 0.1);
      col += vec3(0.23, 0.20, 0.36) * sparkle * 0.45;
      gl_FragColor = vec4(col, 0.94);
    }
  `,
});
const moatWater = new THREE.Mesh(waterGeo, waterMat);
moatWater.renderOrder = 1;
moatGroup.add(moatWater);
assemble(moatWater, 3.35, 1.0, 'rise', { offset: -0.35 });

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
const castle = new THREE.Group();
castle.position.set(0, 0.18, -4.0);
park.add(castle);
const castleDetails = new THREE.Group();
castle.add(castleDetails);

const castleStone = toonMat(0x89819d, { map: stoneTex });
const castleStoneDim = toonMat(0x625d78, { map: stoneTex });
const castleStoneDark = toonMat(0x45415b, { map: stoneDarkTex });
const castleTrim = toonMat(0xa59cae);
const castleRoof = toonMat(0x4d4785, { map: roofTex });
const castleRoofDark = toonMat(0x312c5d, { map: roofTex });
const castleGold = toonMat(0xd2a160, { emissive: 0x3c230c, emissiveIntensity: 0.6 });
const ridgeRibMat = toonMat(0x8178ab);

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
  assemble(turret, 5.2 + (sx + 1) * 0.22, 1.3, 'rise', { offset: -5.5 });
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
  assemble(tower, 5.75 + (sx + 1) * 0.25, 1.5, 'rise', { offset: -7.2 });
}

// central clock tower: stone shaft, belfry, spire
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
assemble(clockTower, 6.0, 1.8, 'scaleY');

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
  addWindowPlane(belfry, archTexWarm, 0.7, 1.7, x, 11.3, 4.62, 0);
  addWindowPlane(belfry, archTexWarm, 0.7, 1.7, x, 11.3, 0.58, Math.PI);
}
addCyl(belfry, 0.32, 0.58, 0.72, 10, castleGold, 0, 10.9, 3.55, { castShadow: false });
assemble(belfry, 7.7, 1.25, 'drop', { offset: 4.5 });

// spire
const spireGroup = new THREE.Group();
castle.add(spireGroup);
gothicRoof(spireGroup, 2.5, 5.2, 0, 12.6, 2.6, castleRoof, 10);
addCyl(spireGroup, 0.06, 0.06, 2.0, 6, castleGold, 0, 18.55, 2.6, { castShadow: false });
addSphere(spireGroup, 0.23, brassBright, 0, 19.58, 2.6, { wSeg: 10, hSeg: 8, castShadow: false });
const flag = addPlane(spireGroup, 1.15, 0.62, basicMat(0xae5c8d, { side: THREE.DoubleSide, toneMapped: false }), 0.58, 19.5, 2.6);
flag.rotation.y = 0.12;
addPlane(spireGroup, 0.36, 0.36, basicMat(0xffb661, { toneMapped: false, side: THREE.DoubleSide }), 0.6, 19.5, 2.61, { rotY: 0.12 });
assemble(spireGroup, 8.6, 1.5, 'drop', { offset: 7 });

// clock faces, texture and hands
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
addPlane(clockGroup, 2.55, 2.55, clockFaceMat, 0, 11.7, 4.34, { rotY: 0 });
addGlow(clockGroup, 0xffc57b, 3.4, 0, 11.7, 4.48, 0.33);
const handPivot = new THREE.Group();
handPivot.position.set(0, 11.7, 4.49);
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
addSphere(clockGroup, 0.11, brassBright, 0, 11.7, 4.53, { wSeg: 10, hSeg: 8, castShadow: false });
addBox(clockGroup, 3.12, 0.16, 0.34, castleGold, 0, 13.0, 4.4, { castShadow: false });
addBox(clockGroup, 3.2, 0.28, 0.46, castleStoneDim, 0, 10.3, 4.35, { castShadow: false });
for (const x of [-1.28, 1.28]) {
  addCone(clockGroup, 0.22, 0.82, 4, castleGold, x, 10.78, 4.38, { castShadow: false, rotY: Math.PI / 4 });
}
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
for (let i = 0; i < castleWindows.length; i++) {
  assemblePop(castleWindows[i], 8.35 + i * 0.045, 0.5);
}

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
  g.addColorStop(0, '#4f2d62');
  g.addColorStop(1, '#251932');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(12, 12); ctx.lineTo(w - 12, 12); ctx.lineTo(w - 12, h - 70);
  ctx.lineTo(w / 2, h - 12); ctx.lineTo(12, h - 70); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#d2a160'; ctx.lineWidth = 8; ctx.stroke();
  ctx.fillStyle = '#e1b974';
  ctx.font = '700 92px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('☾', w / 2, h * 0.4);
  ctx.font = '600 45px Georgia, serif';
  ctx.fillText('NIGHT', w / 2, h * 0.62);
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
const gargoyleMat = toonMat(0x373247);
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
