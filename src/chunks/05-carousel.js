/* --------------------------------------------------------------------------
   Carousel
   -------------------------------------------------------------------------- */
const carouselRoot = new THREE.Group();
carouselRoot.name = 'carousel';
carouselRoot.position.set(-10.2, 0, 7.0);
park.add(carouselRoot);

const carouselGold = toonMat(0xe1b56a, { emissive: 0x4c2c0c, emissiveIntensity: 0.55 });
const carouselStone = toonMat(0x776d8b, { map: stoneTex });
const carouselCream = toonMat(0xf0dfbd);
const carouselPink = toonMat(0xf4a0c1);
const carouselTeal = toonMat(0x74d9cb);
const carouselWood = toonMat(0x563b4c);

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
  addBox(carouselBase, 1.7 - i * 0.15, 0.16, 0.34, carouselStone, -4.55 - i * 0.35, 0.08 + i * 0.16, 8.25, { castShadow: false });
}
addGlowPool(park, 0xff83ba, 5.3, -10.2, 7.0, 0.27, 0.9);
assemble(carouselBase, 11.05, 0.85, 'rise', { offset: -1.2 });

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
assemblePop(carouselDeckGroup, 11.3, 0.9);

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
assemble(carouselCoreGroup, 11.52, 0.9, 'scaleY');

// poles and horses
const carouselPoleGroup = new THREE.Group();
carouselSpin.add(carouselPoleGroup);
const carouselHorseGroup = new THREE.Group();
carouselSpin.add(carouselHorseGroup);
const horsePalette = [
  [0xf4e6cd, 0xe3b56b, 0xc75f81],
  [0xf2d8ca, 0x7dcfc3, 0x9d69cb],
  [0xe9d6ef, 0xe8b36b, 0x6491cf],
  [0xf5e4c8, 0xd97d9e, 0x65b6a4],
  [0xf1e2f0, 0x88c7e9, 0xe1a34f],
  [0xf3e5cf, 0x9f88da, 0xd36f6b],
];
const carouselHorses = [];
for (let i = 0; i < 6; i++) {
  const a = i / 6 * TAU + 0.35;
  const px = Math.cos(a) * 2.46;
  const pz = Math.sin(a) * 2.46;
  // brass pole
  addCyl(carouselPoleGroup, 0.045, 0.045, 3.4, 8, carouselGold, px, 2.4, pz, { castShadow: false });
  addCone(carouselPoleGroup, 0.12, 0.35, 6, carouselGold, px, 4.15, pz, { castShadow: false });
  const [bodyColor, saddleColor, accentColor] = horsePalette[i];
  const bodyMat = toonMat(bodyColor);
  const saddleMat = toonMat(saddleColor);
  const accentMat = toonMat(accentColor);
  const maneMat = toonMat(0x4b334d);
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
  horse.userData.bobPhase = rand(0, TAU);
  horse.userData.baseY = 0.92;
  horse.visible = false;
  carouselHorses.push(horse);
  assemblePop(horse, 11.72 + i * 0.11, 0.65);
}
assemble(carouselPoleGroup, 11.55, 0.8, 'fade');

// canopy
const carouselCanopyGroup = new THREE.Group();
carouselSpin.add(carouselCanopyGroup);
const stripeTex = canvasTexture(1024, 512, (ctx, w, h) => {
  const stripes = 20;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 3 === 0 ? '#f0b4cd' : i % 3 === 1 ? '#f2dfb4' : '#7ad7cd';
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
  ctx.fillStyle = '#4b2f56';
  ctx.fillRect(0, 0, w, h * 0.7);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const x = i / n * w;
    ctx.fillStyle = i % 2 ? '#e4bc7b' : '#7b4b83';
    ctx.fillRect(x, 0, w / n / 2, h * 0.68);
    ctx.fillStyle = '#f9e6ae';
    ctx.beginPath();
    ctx.arc(x + w / n / 2, h * 0.67, w / n * 0.27, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#3d2947';
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
const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2 });
const carouselStar = new THREE.Mesh(starGeo, basicMat(0xffd582, { toneMapped: false }));
carouselStar.position.set(0, 6.8, 0);
carouselStar.rotation.z = 0.1;
carouselCanopyGroup.add(carouselStar);
addGlow(carouselCanopyGroup, 0xffd586, 4.2, 0, 6.7, 0, 0.35);
assembleDrop(carouselCanopyGroup, 12.35, 1.1, { offset: 5 });

// canopy fairy lights (points around the rim)
const carouselLightCount = 36;
const clp = new Float32Array(carouselLightCount * 3);
const clc = new Float32Array(carouselLightCount * 3);
const cls = new Float32Array(carouselLightCount);
const clphase = new Float32Array(carouselLightCount);
const carouselLightPalette = [new THREE.Color(0xffd37c), new THREE.Color(0xff87b6), new THREE.Color(0x8effe6)];
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
const carouselSignGroup = new THREE.Group();
carouselRoot.add(carouselSignGroup);
for (const z of [9.3, 9.95]) {
  addBox(carouselSignGroup, 0.18, 1.75, 0.18, carouselWood, -4.2, 0.92, z);
  addSphere(carouselSignGroup, 0.11, brassBright, -4.2, 1.85, z, { wSeg: 8, hSeg: 6, castShadow: false });
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
  ctx.fillText('·  MIDNIGHT RIDE  ·', w / 2, h * 0.73);
});
addPlane(carouselSignGroup, 2.4, 0.75, new THREE.MeshBasicMaterial({ map: carouselSignTex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), -4.2, 1.35, 9.62, { rotY: Math.PI / 2 });
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
