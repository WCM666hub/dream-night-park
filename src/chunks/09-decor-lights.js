/* --------------------------------------------------------------------------
   Festoon lights, bunting and park signage
   -------------------------------------------------------------------------- */
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
const flagColors = [new THREE.Color(0xe87742), new THREE.Color(0x8d5cba), new THREE.Color(0x4fc6b8), new THREE.Color(0xe9c17a), new THREE.Color(0xff8fb5)];
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
    const c = new THREE.Color(i % 4 === 0 ? 0xff9fc4 : i % 4 === 1 ? 0xffd284 : i % 4 === 2 ? 0x8fffe9 : 0xffb36e);
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
const posterRoot = new THREE.Group();
posterRoot.name = 'attractionPosters';
park.add(posterRoot);
function makePosterTexture(type) {
  return canvasTexture(512, 720, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (type === 0) {
      grad.addColorStop(0, '#241740');
      grad.addColorStop(0.55, '#5b2b59');
      grad.addColorStop(1, '#ba633b');
    } else if (type === 1) {
      grad.addColorStop(0, '#141933');
      grad.addColorStop(0.6, '#283a5d');
      grad.addColorStop(1, '#6b415e');
    } else {
      grad.addColorStop(0, '#2d1731');
      grad.addColorStop(0.65, '#58365b');
      grad.addColorStop(1, '#b56b46');
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
      // haunted house silhouette
      ctx.fillStyle = '#171222';
      ctx.beginPath();
      ctx.moveTo(90, 520); ctx.lineTo(90, 420); ctx.lineTo(140, 300); ctx.lineTo(198, 380);
      ctx.lineTo(255, 390); ctx.lineTo(300, 310); ctx.lineTo(352, 388); ctx.lineTo(400, 400);
      ctx.lineTo(440, 325); ctx.lineTo(440, 520); ctx.closePath(); ctx.fill();
      ctx.fillRect(150, 420, 25, 100); ctx.fillRect(340, 390, 22, 130);
      ctx.fillStyle = '#f2b55e';
      for (const [x, y] of [[170, 418], [363, 440], [250, 470]]) ctx.fillRect(x, y, 24, 38);
      ctx.fillStyle = '#dfd2b5';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(160 + i * 96, 565, 26, 0, TAU); ctx.fill();
        ctx.fillStyle = '#241a2e';
        ctx.beginPath(); ctx.arc(152 + i * 96, 561, 5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(168 + i * 96, 561, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#dfd2b5';
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
      // pumpkin and candy motif
      ctx.fillStyle = '#f08a37';
      ctx.beginPath(); ctx.ellipse(w / 2, 385, 142, 118, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(102,34,17,.45)';
      ctx.lineWidth = 5;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.ellipse(w / 2, 385, 142, 118, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#352014';
      ctx.beginPath(); ctx.moveTo(175, 350); ctx.lineTo(235, 326); ctx.lineTo(225, 382); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(337, 350); ctx.lineTo(277, 326); ctx.lineTo(287, 382); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(196, 424); ctx.lineTo(240, 458); ctx.lineTo(286, 424); ctx.lineTo(320, 460); ctx.lineTo(306, 400); ctx.lineTo(206, 400); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#538550'; ctx.fillRect(246, 232, 18, 48);
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
    ctx.fillText(type === 0 ? 'FESTIVAL OF FEAR' : type === 1 ? 'RIDE THE NIGHT' : 'SWEETS & SPELLS', w / 2, h - 105);
  });
}
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
  addPlane(g, 1.2, 1.7, new THREE.MeshBasicMaterial({ map: makePosterTexture(type), toneMapped: false }), 0, 1.0, 0.11);
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
  ctx.fillStyle = 'rgba(20,14,26,.96)';
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 14); ctx.fill();
  ctx.strokeStyle = '#cfaa70'; ctx.lineWidth = 5; ctx.stroke();
  ctx.font = '700 49px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d8d0a2';
  ctx.fillText('THE MIDNIGHT MENAGERIE', w / 2, h * 0.4);
  ctx.font = '500 24px Georgia, serif';
  ctx.fillStyle = '#c699c9';
  ctx.fillText('CURIOSITIES  ·  OMENS  ·  SWEET THINGS', w / 2, h * 0.7);
});
addBox(marqueeGroup, 2.2, 0.72, 0.12, toonMat(0x3e2b35), 0, 2.1, 0, { castShadow: false });
addPlane(marqueeGroup, 2.05, 0.58, new THREE.MeshBasicMaterial({ map: marqueeTex, transparent: true, toneMapped: false, side: THREE.DoubleSide }), 0, 2.1, 0.07);
assemble(marqueeGroup, 15.2, 0.7, 'drop', { offset: 2.2 });

/* --------------------------------------------------------------------------
   Warm practical lights inside the park
   -------------------------------------------------------------------------- */
const practicalLightDefinitions = [
  { color: 0xffa65a, intensity: 85, distance: 19, pos: [0, 4.3, 4.4], start: 8.9, flicker: 0.04 },
  { color: 0xffa258, intensity: 60, distance: 14, pos: [0, 3.2, 9.5], start: 14.25, flicker: 0.03 },
  { color: 0xff7ba9, intensity: 48, distance: 11, pos: [-10.2, 4.4, 7.0], start: 12.4, flicker: 0.05 },
  { color: 0x64ffe0, intensity: 52, distance: 15, pos: [11.4, 9.2, -8.2], start: 11.5, flicker: 0.03 },
  { color: 0x70ffb2, intensity: 40, distance: 10, pos: [8.6, 2.7, 7.4], start: 12.2, flicker: 0.18 },
  { color: 0xffad62, intensity: 35, distance: 9, pos: [3.2, 2.7, 16.2], start: 13.15, flicker: 0.05 },
  { color: 0x9b86ff, intensity: 36, distance: 11, pos: [-16.2, 7.5, 15.0], start: 13.9, flicker: 0.04 },
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
addGlowPool(warmPools, 0xff9d50, 3.1, 0.5, 4.2, 0.2, 1.0);
addGlowPool(warmPools, 0xffb05d, 2.6, 4.1, 16.0, 0.18, 0.8);
addGlowPool(warmPools, 0xffa155, 2.2, -4.3, 15.2, 0.16, 0.8);
addGlowPool(warmPools, 0xff83b7, 3.8, -10.2, 7.1, 0.15, 0.9);
addGlowPool(warmPools, 0x67ffd8, 3.4, 10.9, -7.7, 0.14, 0.9);
addGlowPool(warmPools, 0x7bffc3, 3.0, 8.4, 6.7, 0.12, 0.8);
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
