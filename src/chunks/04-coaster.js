/* --------------------------------------------------------------------------
   Roller coaster
   -------------------------------------------------------------------------- */
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
const coasterRailMat = toonMat(0xff8d54, { emissive: 0xff5b25, emissiveIntensity: 0.34 });
const coasterTieMat = toonMat(0x5b4b6a);
const coasterSpineMat = toonMat(0x6de5d7, { emissive: 0x1b7f78, emissiveIntensity: 0.3 });
const coasterSteelMat = toonMat(0x625878);
const coasterGlowMat = basicMat(0xffb05e, { toneMapped: false });

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
const stationWood = toonMat(0x513c44);
const stationRoofMat = toonMat(0x3b2e54, { map: roofTex });
const stationGold = toonMat(0xc69858, { emissive: 0x3a240d, emissiveIntensity: 0.5 });
addBox(coasterStation, 4.4, 0.55, 3.0, toonMat(0x363145), -14.7, 0.28, 0.8, { castShadow: false });
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
  ctx.fillStyle = 'rgba(28,18,38,.94)';
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 12); ctx.fill();
  ctx.strokeStyle = '#dbb06b'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '700 48px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd791';
  ctx.fillText('NIGHT COASTER', w / 2, h / 2 + 2);
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
const carColors = [0xff8a4f, 0x9b70e8, 0x62d8c9];
const coasterCars = [];
for (let i = 0; i < 3; i++) {
  const car = new THREE.Group();
  const color = carColors[i % carColors.length];
  const carMat = toonMat(color, { emissive: color, emissiveIntensity: 0.1 });
  const carDark = toonMat(0x362a45);
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
  // tiny ghost passenger
  addSphere(car, 0.22, basicMat(0xe5eeff, { transparent: true, opacity: 0.86, toneMapped: false }), 0, 0.88, -0.05, { wSeg: 10, hSeg: 8, sy: 1.2, castShadow: false });
  addSphere(car, 0.055, basicMat(0x2c2342), -0.07, 0.91, 0.16, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(car, 0.055, basicMat(0x2c2342), 0.07, 0.91, 0.16, { wSeg: 6, hSeg: 4, castShadow: false });
  car.visible = true;
  coasterTrain.add(car);
  coasterCars.push(car);
}
assemblePop(coasterTrain, 12.55, 0.9);
addGlowPool(park, 0xff9b58, 4.4, -14.6, 1.0, 0.22, 0.85);

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
