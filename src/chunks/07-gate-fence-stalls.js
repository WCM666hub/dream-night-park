/* --------------------------------------------------------------------------
   Perimeter fence
   -------------------------------------------------------------------------- */
const fenceIronMat = toonMat(0x3d3653);
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
const gateRoot = new THREE.Group();
gateRoot.name = 'entranceGate';
park.add(gateRoot);
const gateStone = toonMat(0x817792, { map: stoneTex });
const gateStoneDark = toonMat(0x4a405e, { map: stoneDarkTex });
const gateGold = toonMat(0xd4a661, { emissive: 0x45280b, emissiveIntensity: 0.5 });
const gateIron = toonMat(0x37314a);

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
  ctx.fillStyle = 'rgba(21,13,30,.97)';
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 22); ctx.fill();
  ctx.strokeStyle = '#b58a50'; ctx.lineWidth = 8; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,225,160,.3)'; ctx.lineWidth = 2; ctx.strokeRect(19, 19, w - 38, h - 38);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#b78649');
  grad.addColorStop(0.5, '#fff0bd');
  grad.addColorStop(1, '#b78649');
  ctx.fillStyle = grad;
  ctx.font = '700 98px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('HALLOWEEN NIGHT', w / 2, h * 0.46);
  ctx.font = '500 30px Georgia, serif';
  ctx.fillStyle = '#bb95b9';
  ctx.fillText('THE PARK IS OPEN  ·  ALL NIGHT LONG', w / 2, h * 0.77);
});
addBox(gateRoot, 5.4, 1.45, 0.16, gateStoneDark, 0, 4.22, 18.88, { castShadow: false });
addPlane(gateRoot, 5.15, 1.22, new THREE.MeshBasicMaterial({ map: gateSignTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 0, 4.22, 18.98);
addGlow(gateRoot, 0xffd598, 4.0, 0, 4.2, 19.04, 0.22);
assemble(gateRoot, 12.25, 1.15, 'drop', { offset: 5.0 });

/* --------------------------------------------------------------------------
   Ticket booth
   -------------------------------------------------------------------------- */
const ticketRoot = new THREE.Group();
ticketRoot.name = 'ticketBooth';
ticketRoot.position.set(4.15, 0, 16.15);
ticketRoot.rotation.y = -Math.PI / 2;
park.add(ticketRoot);

const ticketBoothWood = toonMat(0x5a3e4d);
const ticketBoothDark = toonMat(0x33253b);
const ticketBoothCream = toonMat(0xe4c995);
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
assemble(ticketRoot, 12.75, 0.9, 'rise', { offset: -1.4 });

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
    addSphere(root, 0.38, toonMat(0x252228), 0.85, 1.25, 0.82, { wSeg: 12, hSeg: 8, sy: 0.72, castShadow: false });
    addCyl(root, 0.36, 0.28, 0.16, 12, basicMat(0x8effc2, { toneMapped: false }), 0.85, 1.47, 0.82, { castShadow: false });
    addGlow(root, 0x7bffc1, 1.8, 0.85, 1.5, 0.86, 0.32);
  }
  assemble(root, 13.05 + (x < 0 ? 0 : 0.35), 0.9, 'rise', { offset: -1.5 });
  return root;
}

makeFoodStall(-4.4, 15.35, Math.PI / 2 + 0.08, 'CANDY', 'SWEETS & SPELLS', '#f0a6c0', '#c896e9', 'candy');
makeFoodStall(7.0, 15.4, -Math.PI / 2 - 0.12, 'HOT COCOA', 'WARM YOUR BONES', '#d99261', '#8b5cae', 'cocoa');
// little candy cart by the roundabout
const candyCart = new THREE.Group();
candyCart.position.set(-4.95, 0, 11.45);
candyCart.rotation.y = 0.45;
park.add(candyCart);
addBox(candyCart, 1.25, 0.75, 0.9, toonMat(0x763d50), 0, 0.6, 0, { castShadow: true });
for (const sx of [-1, 1]) {
  addCyl(candyCart, 0.28, 0.28, 0.08, 12, carouselGold, sx * 0.66, 0.33, 0, { rotZ: Math.PI / 2, castShadow: false });
  addCyl(candyCart, 0.028, 0.028, 1.7, 5, carouselGold, sx * 0.58, 1.32, 0, { castShadow: false });
}
const candyUmbrella = addCone(candyCart, 1.04, 0.55, 12, toonMat(0xd8a6c7), 0, 2.28, 0, { castShadow: true });
addSphere(candyCart, 0.11, basicMat(0xffbe71, { toneMapped: false }), 0, 2.63, 0, { wSeg: 8, hSeg: 6, castShadow: false });
addGlow(candyCart, 0xffb36a, 1.8, 0, 1.2, 0, 0.24);
assemblePop(candyCart, 13.5, 0.8);

/* --------------------------------------------------------------------------
   Benches
   -------------------------------------------------------------------------- */
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
const lampRoot = new THREE.Group();
lampRoot.name = 'lampPosts';
park.add(lampRoot);
const lampPositions = [
  [-2.7, 17.8], [2.7, 17.8], [-2.7, 15.2], [2.7, 15.2],
  [-2.7, 11.2], [4.8, 8.2], [-4.7, 8.0], [5.1, 9.7],
  [-10.8, 12.7], [-12.9, 11.0], [12.1, 10.9], [13.5, 7.6],
  [-12.9, 0.5], [12.6, -5.4],
];
const lampIron = toonMat(0x343047);
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
