/* --------------------------------------------------------------------------
   Haunted house and graveyard
   -------------------------------------------------------------------------- */
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
function makeSkull(scale = 1) {
  const g = new THREE.Group();
  const bone = toonMat(0xd8cfb8, { emissive: 0x18150f, emissiveIntensity: 0.25 });
  const dark = basicMat(0x231c2b);
  addSphere(g, 0.26, bone, 0, 0.22, 0, { wSeg: 12, hSeg: 9, sx: 1, sy: 1.08, sz: 0.92, castShadow: false });
  addBox(g, 0.28, 0.18, 0.22, bone, 0, 0.03, 0.02, { castShadow: false });
  addBox(g, 0.26, 0.06, 0.19, bone, 0, -0.05, 0.025, { castShadow: false });
  addSphere(g, 0.075, dark, -0.09, 0.22, 0.2, { wSeg: 7, hSeg: 5, sx: 1.1, sy: 1.2, castShadow: false });
  addSphere(g, 0.075, dark, 0.09, 0.22, 0.2, { wSeg: 7, hSeg: 5, sx: 1.1, sy: 1.2, castShadow: false });
  addCone(g, 0.045, 0.12, 3, dark, 0, 0.11, 0.22, { castShadow: false, rotX: -Math.PI / 2 });
  for (let i = -2; i <= 2; i++) {
    addBox(g, 0.035, 0.07, 0.03, dark, i * 0.045, -0.04, 0.195, { castShadow: false });
  }
  g.scale.setScalar(scale);
  return g;
}

const hauntedStone = toonMat(0x6d6078, { map: stoneDarkTex });
const hauntedStoneLight = toonMat(0x8b7c93);
const hauntedPlaster = toonMat(0x695a70);
const hauntedWood = toonMat(0x3b2b38);
const hauntedWoodLight = toonMat(0x5b4146);
const hauntedRoofMat = toonMat(0x7664a2, { map: roofTex, emissive: 0x100b2f, emissiveIntensity: 0.35 });
const hauntedRoofDark = toonMat(0x4f437d, { map: roofTex });

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
const hauntedSlateRidge = toonMat(0x9584bd);
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
addBox(hauntedRoof, 0.58, 0.1, 0.58, basicMat(0x171321), 2.1, 8.38, -1.0, { castShadow: false });
assembleDrop(hauntedRoof, 10.75, 1.2, { offset: 5.5 });

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
addSphere(hauntedTower, 0.09, basicMat(0x9dffd1, { toneMapped: false }), 0.28, 11.0, -0.2, { wSeg: 7, hSeg: 5, castShadow: false });
// little balcony
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU;
  addBox(hauntedTower, 0.12, 0.4, 0.12, hauntedWood, Math.cos(a) * 1.25, 6.3, Math.sin(a) * 1.25, { castShadow: false });
}
addCyl(hauntedTower, 1.35, 1.35, 0.1, 10, hauntedWood, 0, 6.52, 0, { castShadow: false });
assemble(hauntedTower, 11.1, 1.5, 'rise', { offset: -7.0 });

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
addBox(hauntedPorch, 0.24, 0.32, 0.24, basicMat(0xb8ffd3, { toneMapped: false }), 1.45, 2.16, 3.2, { castShadow: false });
addGlow(hauntedPorch, 0x8bffbe, 1.9, 1.45, 2.16, 3.4, 0.36);
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
    ctx.fillStyle = '#3b3044';
    arch(4);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (kind === 'ghost') {
      g.addColorStop(0, '#a6ffdf');
      g.addColorStop(0.5, '#214d54');
      g.addColorStop(1, '#1b2638');
    } else {
      g.addColorStop(0, '#ffdda0');
      g.addColorStop(0.6, '#8b4b2a');
      g.addColorStop(1, '#2a1b2b');
    }
    ctx.fillStyle = g;
    arch(19);
    ctx.fill();
    if (kind === 'ghost') {
      // little ghost silhouette
      ctx.fillStyle = 'rgba(235,255,248,.72)';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.52, w * 0.17, Math.PI, 0);
      ctx.lineTo(w * 0.67, h * 0.8);
      ctx.quadraticCurveTo(w * 0.57, h * 0.74, w * 0.5, h * 0.81);
      ctx.quadraticCurveTo(w * 0.43, h * 0.74, w * 0.33, h * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2d4d52';
      ctx.beginPath(); ctx.arc(w * 0.44, h * 0.5, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.56, h * 0.5, 5, 0, TAU); ctx.fill();
    }
    // mullions and cracks
    ctx.strokeStyle = 'rgba(37,25,42,.9)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.1); ctx.lineTo(w / 2, h - 22);
    ctx.moveTo(22, h * 0.64); ctx.lineTo(w - 22, h * 0.64);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,255,238,.3)';
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
  ctx.fillStyle = 'rgba(16,12,21,.96)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 15); ctx.fill();
  ctx.strokeStyle = '#967342'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = '700 50px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d5d0a1';
  ctx.fillText('HAUNTED HOUSE', w / 2, h * 0.42);
  ctx.font = '500 23px Georgia, serif';
  ctx.fillStyle = '#8fb7a0';
  ctx.fillText('ENTER IF YOU DARE', w / 2, h * 0.7);
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
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.72, toneMapped: false, depthWrite: false });
  addSphere(g, s, ghostMat, 0, 0, 0, { wSeg: 10, hSeg: 8, sy: 1.1, castShadow: false });
  addCone(g, s * 0.9, s * 1.2, 8, ghostMat, 0, -s * 0.9, 0, { castShadow: false, rotX: Math.PI });
  addSphere(g, s * 0.13, basicMat(0x302b46), -s * 0.26, s * 0.1, s * 0.9, { wSeg: 6, hSeg: 4, castShadow: false });
  addSphere(g, s * 0.13, basicMat(0x302b46), s * 0.26, s * 0.1, s * 0.9, { wSeg: 6, hSeg: 4, castShadow: false });
  addGlow(g, 0xc9f7ff, 1.1, 0, 0, 0.2, 0.2);
  hauntedDetails.add(g);
}
assemble(hauntedDetails, 12.1, 0.75, 'fade');

addGlowPool(park, 0x6ee5af, 4.0, 8.6, 6.8, 0.19, 0.8);

/* --------------------------------------------------------------------------
   Little graveyard behind the house
   -------------------------------------------------------------------------- */
const graveyardRoot = new THREE.Group();
graveyardRoot.position.set(10.5, 0, 1.85);
park.add(graveyardRoot);
const graveStone = toonMat(0x67647a, { map: stoneDarkTex });
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
addSphere(graveyardRoot, 0.18, basicMat(0xbaffd7, { toneMapped: false }), 0.2, 0.45, 0.2, { wSeg: 8, hSeg: 6, castShadow: false });
addGlow(graveyardRoot, 0x77ffd0, 1.8, 0.2, 0.5, 0.2, 0.25);
assemble(graveyardRoot, 11.5, 0.9, 'rise', { offset: -0.8 });

// a warped iron fence around the graves
const graveFence = new THREE.Group();
graveFence.position.set(10.5, 0, 1.85);
park.add(graveFence);
for (let i = 0; i < 10; i++) {
  const x = -2.4 + i * 0.55;
  addCyl(graveFence, 0.025, 0.035, 0.75, 4, toonMat(0x373047), x, 0.38, 1.75, { castShadow: false });
}
addCyl(graveFence, 0.02, 0.025, 5.2, 4, toonMat(0x373047), 0, 0.63, 1.75, { rotZ: Math.PI / 2, castShadow: false });
for (let i = 0; i < 6; i++) {
  const x = -2.5 + i * 1.0;
  addCyl(graveFence, 0.02, 0.03, 0.75, 4, toonMat(0x373047), x, 0.38, -1.65, { castShadow: false });
}
addCyl(graveFence, 0.02, 0.025, 5.2, 4, toonMat(0x373047), 0, 0.63, -1.65, { rotZ: Math.PI / 2, castShadow: false });
assemble(graveFence, 11.9, 0.7, 'fade');
