/* --------------------------------------------------------------------------
   Ferris wheel
   -------------------------------------------------------------------------- */
const ferrisRoot = new THREE.Group();
ferrisRoot.position.set(11.4, 0, -9.3);
park.add(ferrisRoot);

const ferrisIron = toonMat(0xcac3da, { emissive: 0x171127, emissiveIntensity: 0.28 });
const ferrisIronDark = toonMat(0x665f80);
const ferrisGold = toonMat(0xd5ab69, { emissive: 0x3c240b, emissiveIntensity: 0.4 });
const ferrisPlatformMat = toonMat(0x4d4864);
const cabinColors = [0xff7a69, 0xffce67, 0x6fe1cf, 0xb394ff, 0xff84ba, 0x80b8ff, 0xffa45c, 0x7de3ae];

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
// wheel glows / fairy bulbs
const ferrisBulbCount = 72;
const ferrisBulbGeo = new THREE.BufferGeometry();
const fp = new Float32Array(ferrisBulbCount * 3);
const fc = new Float32Array(ferrisBulbCount * 3);
const fs = new Float32Array(ferrisBulbCount);
const fph = new Float32Array(ferrisBulbCount);
const ferrisPalette = [new THREE.Color(0xffc45d), new THREE.Color(0xff7fb3), new THREE.Color(0x7fffe0), new THREE.Color(0xb49aff)];
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
assemblePop(rimGroup, 10.0, 1.15);

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
  pivot.userData.baseZ = 0;
  pivot.userData.isCabin = true;
  pivot.userData.cabin = true;
  ferrisCabins.push(pivot);
  assembleDrop(pivot, 10.6 + i * 0.115, 0.7);
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
towerRoot.position.set(16.0, 0, -1.8);
park.add(towerRoot);

const towerStone = toonMat(0x756e8a, { map: stoneTex });
const towerDark = toonMat(0x433d5d);
const towerGold = toonMat(0xcba263, { emissive: 0x3e290d, emissiveIntensity: 0.6 });
const towerGlow = basicMat(0x7dffe6, { toneMapped: false });
const towerGlowWarm = basicMat(0xffc56d, { toneMapped: false });
const towerFloorMat = toonMat(0x4b4261, { map: stoneDarkTex });

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
addGlowPool(park, 0x64e5cf, 3.4, 16.0, -1.8, 0.18, 0.9);
