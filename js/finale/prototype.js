import * as THREE from 'three';
import { createFinaleCorridor } from './corridor.js?v=fin-1';
import { createFinaleCreature } from './creature.js?v=fin-1';

/**
 * Debug-only ending prototype.
 * Access: ?debug=1&ending=finale-prototype
 *
 * Phases:
 *  corridor  — scroll/WASD toward the exit door (Ch01-adjacent feel)
 *  reveal    — scripted door → exterior → turn → hold on the organism
 *
 * Does not touch chapter progression, inventory, composure, or tapes.
 */

export const FINALE_PROTOTYPE_ID = 'finale-prototype';

const clamp01 = n => Math.max(0, Math.min(1, n));
const smooth = t => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const lerp = (a, b, t) => a + (b - a) * t;

function lerpPose(a, b, t) {
  const u = smooth(t);
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    z: lerp(a.z, b.z, u),
    yaw: lerp(a.yaw, b.yaw, u),
    pitch: lerp(a.pitch ?? 0, b.pitch ?? 0, u),
  };
}

function applyPose(camera, pose) {
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, 0);
  camera.up.set(0, 1, 0);
}

/**
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {THREE.PerspectiveCamera} opts.camera
 * @param {THREE.WebGLRenderer} opts.renderer
 * @param {object} opts.director
 * @param {() => object} opts.createSceneDirector
 * @param {boolean} [opts.reduced]
 */
export async function startFinalePrototype({
  scene,
  camera,
  renderer,
  director,
  createSceneDirector,
  reduced = false,
}) {
  const experience = document.getElementById('experience');
  experience?.classList.add('is-playing');
  experience?.classList.remove('tape-mode');
  experience?.setAttribute('data-ending', FINALE_PROTOTYPE_ID);

  document.getElementById('intro')?.classList.add('is-hidden');
  document.getElementById('topbar')?.classList.add('active');
  document.getElementById('bottom')?.classList.add('active');
  document.getElementById('composure')?.classList.remove('is-active');
  document.getElementById('composure')?.setAttribute('aria-hidden', 'true');
  document.getElementById('inventory')?.setAttribute('aria-hidden', 'true');
  document.getElementById('narrative')?.classList.remove('active');
  const location = document.getElementById('location');
  if (location) location.innerHTML = 'NORTH WING <span class="separator">/</span> LEVEL 13';

  director?.dispose?.();
  const localDirector = createSceneDirector();

  // —— World ——
  const corridor = createFinaleCorridor();
  scene.add(corridor.world);

  const exterior = new THREE.Group();
  exterior.name = 'Finale exterior';
  scene.add(exterior);

  // Ashen ground plane (extends around the organism).
  const groundGeo = new THREE.CircleGeometry(80, 48);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2a2e2c, roughness: 0.96, metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = -0.02;
  exterior.add(ground);

  // Soft featureless sky dome (inside-out).
  const skyGeo = new THREE.SphereGeometry(90, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({
    color: 0x1a2228, side: THREE.BackSide, fog: false,
  });
  exterior.add(new THREE.Mesh(skyGeo, skyMat));

  const hemi = new THREE.HemisphereLight(0x6a7a82, 0x1a1512, 0.55);
  exterior.add(hemi);
  const fill = new THREE.DirectionalLight(0xb8c4c0, 0.35);
  fill.position.set(-12, 18, -20);
  exterior.add(fill);
  const organismKey = new THREE.PointLight(0xc4b49a, 1.6, 45, 2);
  organismKey.position.set(0, 10, 6);
  exterior.add(organismKey);

  const creature = createFinaleCreature({ scale: 1 });
  // Beyond the corridor exit (−Z). Opening is on local −Z; rotate so it faces
  // the hall (+Z) and the player walks out through it.
  const organismZ = corridor.exitZ - 12.5;
  creature.root.position.set(0, 0, organismZ);
  creature.root.rotation.y = Math.PI;
  exterior.add(creature.root);
  organismKey.position.set(0, 10, organismZ + 4);

  // Hide exterior mass while still inside the corridor (fog + doorway framing).
  creature.root.visible = true;

  scene.background = new THREE.Color(0x0a1214);
  scene.fog = new THREE.FogExp2(0x0a1214, 0.048);
  const ambient = new THREE.HemisphereLight(0x8ca6a0, 0x131915, 0.85);
  scene.add(ambient);

  // —— HUD prompt ——
  const prompt = document.createElement('p');
  prompt.className = 'finale-prompt';
  prompt.setAttribute('aria-live', 'polite');
  prompt.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:72px', 'transform:translateX(-50%)',
    'z-index:40', 'margin:0', 'padding:10px 16px',
    'border:1px solid #4a657055', 'background:#080e12cc',
    'color:#c2d2d8', 'font:13px/1.4 "IBM Plex Mono", monospace',
    'letter-spacing:0.04em', 'pointer-events:none', 'opacity:0',
    'transition:opacity 0.45s ease',
  ].join(';');
  prompt.textContent = 'SCROLL TOWARD THE EXIT';
  document.body.appendChild(prompt);
  const setPrompt = (text, show = true) => {
    prompt.textContent = text;
    prompt.style.opacity = show ? '1' : '0';
  };
  setPrompt('SCROLL TOWARD THE EXIT', true);

  // —— Interaction (exit door) ——
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let phase = 'corridor'; // corridor | reveal
  let progress = 0;
  let revealT = 0;
  let doorOpen = 0; // 0–1
  let finished = false;
  const eyeY = 1.7;

  const REVEAL = {
    doorDur: 2.4,
    walkDur: 9.5,
    turnDur: 11.0,
    holdDur: 18.0,
  };
  const revealTotal = REVEAL.doorDur + REVEAL.walkDur + REVEAL.turnDur + REVEAL.holdDur;

  // Poses for scripted reveal (yaw 0 looks −Z; π looks +Z back at the organism).
  const exitDoorWorldZ = corridor.exitZ;
  const poseDoor = { x: 0, y: eyeY, z: exitDoorWorldZ + 1.8, yaw: 0, pitch: 0 };
  const poseOutside = { x: 0.2, y: eyeY, z: exitDoorWorldZ - 8.5, yaw: 0.12, pitch: 0.03 };
  const poseReveal = {
    x: -2.4, y: eyeY + 0.35, z: exitDoorWorldZ - 18.5,
    yaw: Math.PI * 0.94, pitch: 0.08,
  };

  function tryOpenExit() {
    if (phase !== 'corridor') return;
    if (progress < 0.82) {
      setPrompt('COME CLOSER TO THE DOOR', true);
      return;
    }
    phase = 'reveal';
    revealT = 0;
    setPrompt('…', false);
    document.getElementById('bottom')?.classList.remove('active');
    // Soften fog for exterior readability.
    if (scene.fog) scene.fog.density = 0.018;
    scene.background = new THREE.Color(0x141c22);
    console.info('[Behind. FINALE] Reveal sequence started.');
  }

  function onPointerDown(event) {
    if (phase !== 'corridor' || !renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(corridor.exitHit, true);
    if (hits.length) tryOpenExit();
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    if (phase === 'corridor' && (event.code === 'KeyE' || event.code === 'Enter')) {
      tryOpenExit();
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  // Scroll / walk keys drive corridor progress (isolated from main scroll trigger).
  let scrollAccum = 0;
  function onWheel(event) {
    if (phase !== 'corridor') return;
    scrollAccum += event.deltaY;
  }
  const keys = { fwd: false, back: false };
  function onWalkKey(event, down) {
    if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.fwd = down;
    if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.back = down;
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', e => onWalkKey(e, true));
  window.addEventListener('keyup', e => onWalkKey(e, false));

  // Initial camera
  camera.position.set(0, eyeY, corridor.cameraZForProgress(0));
  camera.rotation.set(0, 0, 0);

  function updateCorridor(dt) {
    const walk = (keys.fwd ? 1 : 0) + (keys.back ? -1 : 0);
    if (walk !== 0) progress += walk * 0.22 * dt;
    if (Math.abs(scrollAccum) > 0) {
      progress += scrollAccum * 0.00035;
      scrollAccum = 0;
    }
    progress = clamp01(progress);
    const z = corridor.cameraZForProgress(progress);
    camera.position.set(
      reduced ? 0 : Math.sin(progress * 18) * 0.02,
      eyeY + (reduced ? 0 : Math.sin(progress * 40) * 0.01),
      z,
    );
    camera.rotation.set(
      reduced ? 0 : Math.sin(progress * 5) * 0.008,
      reduced ? 0 : Math.sin(progress * 4) * 0.01,
      0,
    );

    if (progress > 0.8) {
      setPrompt('CLICK THE DOOR  ·  OR PRESS E', true);
    } else if (progress > 0.15) {
      setPrompt('KEEP MOVING', true);
    }

    // Keep organism breathing even while inside (felt as faint wrongness, not visible).
    creature.update(dt, reduced);
  }

  function updateReveal(dt) {
    revealT += dt;
    const t = revealT;

    // Door swing
    const doorU = smooth(clamp01(t / REVEAL.doorDur));
    doorOpen = doorU;
    corridor.exitDoor.rotation.y = doorU * 1.35;

    let pose;
    if (t < REVEAL.doorDur) {
      pose = { ...poseDoor, yaw: lerp(0, 0.08, doorU) };
    } else if (t < REVEAL.doorDur + REVEAL.walkDur) {
      const u = (t - REVEAL.doorDur) / REVEAL.walkDur;
      pose = lerpPose(poseDoor, poseOutside, u);
      // Fog lifts as we leave the threshold.
      if (scene.fog) scene.fog.density = lerp(0.048, 0.014, smooth(u));
    } else if (t < REVEAL.doorDur + REVEAL.walkDur + REVEAL.turnDur) {
      const u = (t - REVEAL.doorDur - REVEAL.walkDur) / REVEAL.turnDur;
      pose = lerpPose(poseOutside, poseReveal, u);
      if (scene.fog) scene.fog.density = lerp(0.014, 0.011, smooth(u));
      organismKey.intensity = lerp(1.6, 2.4, smooth(u));
    } else {
      pose = { ...poseReveal };
      // Slow drift — still, not idle-dead.
      const holdT = t - REVEAL.doorDur - REVEAL.walkDur - REVEAL.turnDur;
      pose.x += Math.sin(holdT * 0.15) * 0.08;
      pose.y += Math.sin(holdT * 0.12) * 0.03;
      if (holdT > 2 && holdT < 8) setPrompt('…', false);
      if (holdT > REVEAL.holdDur) {
        finished = true;
        setPrompt('FINALE PROTOTYPE  ·  END OF SEQUENCE', true);
      }
    }

    applyPose(camera, pose);
    creature.update(dt, reduced);

    // Subtle terrain / organism key pulse
    organismKey.intensity = 2.1 + Math.sin(t * 0.55) * 0.25;
  }

  function update(dt) {
    if (phase === 'corridor') updateCorridor(dt);
    else updateReveal(dt);
  }

  function dispose() {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('wheel', onWheel);
    prompt.remove();
    corridor.dispose();
    creature.dispose();
    groundGeo.dispose();
    groundMat.dispose();
    skyGeo.dispose();
    skyMat.dispose();
    hemi.dispose?.();
    fill.dispose?.();
    organismKey.dispose?.();
    ambient.dispose?.();
    exterior.removeFromParent();
    scene.remove(ambient);
    experience?.removeAttribute('data-ending');
    localDirector.dispose?.();
  }

  console.info(
    '[Behind. FINALE] Prototype ready. Scroll to the door, then click it or press E.',
  );

  return {
    get phase() { return phase; },
    get finished() { return finished; },
    get revealTime() { return revealT; },
    get revealTotal() { return revealTotal; },
    update,
    dispose,
  };
}
