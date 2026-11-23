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

const SHOW_END = assembly.reduce((m, r) => Math.max(m, r.start + r.duration), 0);
const OPERATION_START = SHOW_END + 0.35;

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
    pumpkinVariants[i].emissiveIntensity = 1.15 + Math.sin(time * 1.55 + i * 1.7) * 0.14;
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
  moonGlow2.material.opacity = 0.24 + Math.sin(time * 0.6) * 0.035;
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

function animateFrame() {
  requestAnimationFrame(animateFrame);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  simulationTime += dt;

  updateAssembly(simulationTime);

  if (!operationStarted && simulationTime >= OPERATION_START) {
    operationStarted = true;
    operationTime = 0;
    nextFireworkAt = simulationTime + 1.5;
  }

  if (operationStarted) {
    operationTime += dt;
    updateFerrisWheel(dt);
    updateCarousel(operationTime, dt);
    updateObservationTower(dt);
    updateCoasterTrain(operationTime);
    updateFountain(dt, simulationTime);
    updateFireworks(dt, simulationTime);
  }

  updateGhosts(simulationTime);
  updateBats(simulationTime);
  updateMotes(simulationTime);
  updateMist(simulationTime);
  updateSky(simulationTime);
  updateFairyLights(simulationTime);
  updateClockHands();
  updatePracticalLights(simulationTime);
  updateFlickerMaterials(simulationTime);
  updateCrowdSigns(simulationTime);
  updateGroundGlow(simulationTime);

  // flags
  castleFlag.rotation.z = Math.sin(simulationTime * 1.65) * 0.04;
  castleFlag.rotation.y = 0.12 + Math.sin(simulationTime * 1.2) * 0.06;
  carouselStar.rotation.z += 0;

  controls.update();
  composer.render();

  frames++;
  if (simulationTime - fpsWindowStart > 2.0) {
    fps = frames / (simulationTime - fpsWindowStart);
    frames = 0;
    fpsWindowStart = simulationTime;
    // Gentle adaptive resolution for slower machines. It never changes the scene.
    if (!qualityReduced && simulationTime > 7.0 && fps < 34) {
      qualityReduced = true;
      const lowerPixelRatio = Math.max(1, Math.min(window.devicePixelRatio, 1.75) * 0.72);
      renderer.setPixelRatio(lowerPixelRatio);
      composer.setPixelRatio(lowerPixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
}

// The very first frame is assembled manually so a resize before the loop
// cannot show an incorrectly sized canvas.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const pr = qualityReduced
    ? Math.max(1, Math.min(window.devicePixelRatio, 1.75) * 0.72)
    : Math.min(window.devicePixelRatio, 1.75);
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('pointerdown', () => {
  renderer.domElement.style.cursor = 'grabbing';
});
window.addEventListener('pointerup', () => {
  renderer.domElement.style.cursor = 'grab';
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
  get operationStarted() { return operationStarted; },
  get fps() { return fps; },
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
    simulationTime = Math.max(simulationTime, SHOW_END + 0.05);
  },
  fastForward(seconds = 1) {
    simulationTime += seconds;
  },
  skip() {
    this.skipIntro();
  },
};

animateFrame();
