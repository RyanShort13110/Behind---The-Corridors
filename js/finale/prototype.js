import * as THREE from 'three';
import { createFinaleCorridor } from './corridor.js?v=fin-5';
import { createFinaleCreature } from './creature.js?v=fin-5';

/**
 * Debug-only ending prototype with the authored organism GLB.
 * Access: ?debug=1&ending=finale-prototype
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

/** Soft biological ambience — oscillators only, no roar/stinger assets. */
function createFinaleAmbience() {
  let ctx = null;
  let master = null;
  let nodes = [];
  let started = false;

  async function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return ctx;
  }

  async function start() {
    const c = await ensure();
    if (!c || started) return;
    if (c.state === 'suspended') await c.resume().catch(() => {});
    started = true;

    const makeDrone = (freq, type, gainVal, lfoHz, lfoDepth) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = gainVal;
      lfo.frequency.value = lfoHz;
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      lfo.start();
      nodes.push(osc, lfo, gain, lfoGain);
    };

    // Deep respiration bed + quiet creak partials.
    makeDrone(38, 'sine', 0.028, 0.07, 0.012);
    makeDrone(55, 'triangle', 0.012, 0.05, 0.008);
    makeDrone(92, 'sine', 0.006, 0.11, 0.004);
  }

  function setLevel(v) {
    if (!master || !ctx) return;
    const target = Math.max(0, Math.min(1, v)) * 0.55;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.8);
  }

  function dispose() {
    for (const n of nodes) {
      try { n.stop?.(); } catch (_) { /* already stopped */ }
      try { n.disconnect?.(); } catch (_) { /* */ }
    }
    nodes = [];
    try { master?.disconnect(); } catch (_) { /* */ }
    try { ctx?.close(); } catch (_) { /* */ }
    ctx = null;
    master = null;
    started = false;
  }

  return { start, setLevel, dispose };
}

/**
 * @param {object} opts
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

  // —— Loading veil ——
  const loadNote = document.createElement('p');
  loadNote.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:80', 'display:grid', 'place-items:center',
    'margin:0', 'background:#080e12', 'color:#9aadb4',
    'font:14px/1.5 "IBM Plex Mono", monospace',
  ].join(';');
  loadNote.textContent = 'Loading organism…';
  document.body.appendChild(loadNote);

  // —— World ——
  const corridor = createFinaleCorridor();
  scene.add(corridor.world);

  const exterior = new THREE.Group();
  exterior.name = 'Finale exterior';
  scene.add(exterior);

  // Desolate uneven terrain (displaced ring + soft dunes).
  const groundGeo = new THREE.CircleGeometry(110, 64);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // circle is in XY before rotate
    const r = Math.hypot(x, y);
    const h = Math.sin(x * 0.09) * 0.35 + Math.cos(y * 0.07) * 0.28
      + Math.sin(r * 0.15) * 0.2;
    pos.setZ(i, h);
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3a3c38, roughness: 0.97, metalness: 0.02, flatShading: true,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI * 0.5;
  ground.position.y = 0;
  exterior.add(ground);

  // No sky mesh — a BackSide sphere was reading as a pale half-dome in frame.
  // Flat background + fog is enough for the desolate exterior.

  const hemi = new THREE.HemisphereLight(0x7a8890, 0x1a1512, 0.5);
  exterior.add(hemi);
  const fill = new THREE.DirectionalLight(0xb0bcb6, 0.28);
  fill.position.set(-18, 22, -30);
  exterior.add(fill);
  const organismKey = new THREE.PointLight(0xc4b49a, 1.8, 55, 2);
  exterior.add(organismKey);
  const rimCool = new THREE.PointLight(0x6a7a82, 0.55, 40, 2);
  exterior.add(rimCool);

  let creature;
  try {
    creature = await createFinaleCreature({
      onProgress: (msg) => { loadNote.textContent = msg; },
    });
  } catch (err) {
    loadNote.textContent = `Organism failed to load: ${err.message}`;
    throw err;
  }
  loadNote.remove();

  // Align −Z entrance with the corridor exit plane (visual handoff only).
  // Hidden during the hall so the aisle stays straight institutional walls —
  // the GLB entrance tunnel was reading as curved "ribs" down the corridor.
  const exitDoorWorldZ = corridor.exitZ;
  const ORGANISM_EXTERIOR_SCALE = 3.15;
  // Seat orifice onto the deep facade plug so flesh wraps the building face.
  creature.placeEntranceAt(exitDoorWorldZ - 4.5, 0, ORGANISM_EXTERIOR_SCALE);
  exterior.add(creature.root);
  creature.root.visible = false;
  creature.setStabilizeExit(true);

  function syncOrganismLights() {
    const entrance = creature.getEntranceWorldPosition();
    const s = creature.root.scale.x;
    organismKey.position.set(entrance.x, 8 + 4 * s, entrance.z + 8 * s);
    organismKey.distance = 40 + 25 * s;
    rimCool.position.set(entrance.x + 10 * s, 5 + 3 * s, entrance.z - 12 * s);
    rimCool.distance = 35 + 20 * s;
  }
  syncOrganismLights();

  // Doorway occlusion veil — hides the geometry seam during exit.
  const maskGeo = new THREE.PlaneGeometry(4.2, 3.6);
  const maskMat = new THREE.MeshBasicMaterial({
    color: 0x050708, transparent: true, opacity: 1, depthWrite: false,
  });
  const doorMask = new THREE.Mesh(maskGeo, maskMat);
  doorMask.position.set(0, 1.55, exitDoorWorldZ - 0.05);
  doorMask.visible = false;
  scene.add(doorMask);

  // Solid black beyond the exit so a closed/open peek never shows the GLB.
  const voidGeo = new THREE.PlaneGeometry(5.2, 4.2);
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x010303 });
  const exitVoid = new THREE.Mesh(voidGeo, voidMat);
  exitVoid.position.set(0, 1.7, exitDoorWorldZ - 0.4);
  scene.add(exitVoid);

  scene.background = new THREE.Color(0x0a1214);
  scene.fog = new THREE.FogExp2(0x0a1214, 0.048);
  const fogBase = { corridor: 0.048, exterior: 0.01 };
  let fogMul = 1;
  const ambient = new THREE.HemisphereLight(0x8ca6a0, 0x131915, 0.85);
  scene.add(ambient);

  const ambience = createFinaleAmbience();

  // —— HUD ——
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
  document.body.appendChild(prompt);
  const setPrompt = (text, show = true) => {
    prompt.textContent = text;
    prompt.style.opacity = show ? '1' : '0';
  };
  setPrompt('SCROLL UP TOWARD THE EXIT', true);

  // Fade to black overlay
  const fadeEl = document.createElement('div');
  fadeEl.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:70', 'background:#000',
    'opacity:0', 'pointer-events:none', 'transition:opacity 2.4s ease',
  ].join(';');
  document.body.appendChild(fadeEl);

  // —— Debug panel ——
  const dbg = document.createElement('aside');
  dbg.setAttribute('aria-label', 'Finale prototype controls');
  dbg.style.cssText = [
    'position:fixed', 'right:14px', 'top:72px', 'z-index:90',
    'width:230px', 'padding:12px 14px', 'border:1px solid #4a657077',
    'background:#080e12ed', 'color:#c2d2d8', 'font:12px/1.45 monospace',
    'border-radius:5px', 'pointer-events:auto',
  ].join(';');
  dbg.innerHTML = `
    <div style="margin-bottom:8px;letter-spacing:0.08em">FINALE PROTO</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      <button type="button" data-f="skip">SKIP TO REVEAL</button>
      <button type="button" data-f="pause">PAUSE</button>
      <button type="button" data-f="hold">HOLD SHOT</button>
      <button type="button" data-f="restart">RESTART</button>
    </div>
    <label>Breath intensity <input data-f="breathI" type="range" min="0" max="200" value="100"></label>
    <label>Breath speed <input data-f="breathS" type="range" min="25" max="250" value="100"></label>
    <label>Fog <input data-f="fog" type="range" min="20" max="200" value="100"></label>
    <label>Reveal speed <input data-f="revealS" type="range" min="40" max="220" value="100"></label>
    <p data-f="status" style="margin:8px 0 0;opacity:0.75">corridor</p>
  `;
  dbg.querySelectorAll('label').forEach((el) => {
    el.style.cssText = 'display:block;margin:6px 0;font-size:11px';
  });
  dbg.querySelectorAll('button').forEach((el) => {
    el.style.cssText = 'font:11px monospace;padding:4px 7px;cursor:pointer;background:#152028;color:#c2d2d8;border:1px solid #4a657055';
  });
  dbg.querySelectorAll('input[type=range]').forEach((el) => {
    el.style.cssText = 'width:100%;accent-color:#7a9aa4';
  });
  document.body.appendChild(dbg);
  const statusEl = dbg.querySelector('[data-f=status]');

  // —— State ——
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let phase = 'corridor'; // corridor | reveal | hold | fade
  let progress = 0;
  let revealT = 0;
  let finished = false;
  let paused = false;
  let revealSpeed = 1;
  let forceHold = false;
  const eyeY = 1.7;

  const REVEAL = {
    doorDur: 2.6,
    walkDur: 10.5,
    turnDur: 12.5,
    holdDur: 10.0,
    fadeDur: 3.0,
  };

  // Entrance faces −Z; walk out continuing −Z, then turn to face +Z.
  // Pull-back distances scale with the exterior organism so the shell fills frame.
  const S = ORGANISM_EXTERIOR_SCALE;
  const poseDoor = { x: 0, y: eyeY, z: exitDoorWorldZ + 1.85, yaw: 0, pitch: 0 };
  const poseThreshold = { x: 0, y: eyeY, z: exitDoorWorldZ - 1.2, yaw: 0.04, pitch: 0.02 };
  const poseOutside = {
    x: 0.5 * S, y: eyeY + 0.15, z: exitDoorWorldZ - (9 + 4 * S),
    yaw: 0.2, pitch: 0.04,
  };
  const poseReveal = {
    x: -3.2 * S, y: eyeY + 0.6 * S, z: exitDoorWorldZ - (18 + 8 * S),
    yaw: Math.PI * 0.96, pitch: 0.08,
  };

  function revealOrganism() {
    creature.root.visible = true;
    creature.placeEntranceAt(exitDoorWorldZ - 4.5, 0, ORGANISM_EXTERIOR_SCALE);
    syncOrganismLights();
    exitVoid.visible = false;
  }

  function setPhase(next) {
    phase = next;
    if (statusEl) statusEl.textContent = next;
  }

  function beginReveal({ skipWalk = false } = {}) {
    setPhase('reveal');
    revealT = skipWalk ? REVEAL.doorDur + REVEAL.walkDur * 0.85 : 0;
    setPrompt('', false);
    document.getElementById('bottom')?.classList.remove('active');
    scene.background = new THREE.Color(0x161e24);
    if (scene.fog) scene.fog.color.set(0x161e24);
    doorMask.visible = true;
    revealOrganism();
    ambience.start().then(() => ambience.setLevel(0.15));
    creature.setStabilizeExit(true);
    console.info('[Behind. FINALE] Reveal sequence started.');
  }

  function tryOpenExit() {
    if (phase !== 'corridor') return;
    if (progress < 0.82) {
      setPrompt('COME CLOSER TO THE DOOR', true);
      return;
    }
    beginReveal();
  }

  function restartSequence() {
    fadeEl.style.opacity = '0';
    finished = false;
    forceHold = false;
    paused = false;
    progress = 0;
    revealT = 0;
    doorMask.visible = false;
    maskMat.opacity = 1;
    corridor.exitDoor.rotation.y = 0;
    creature.root.visible = false;
    creature.setStabilizeExit(true);
    exitVoid.visible = true;
    ambience.setLevel(0);
    scene.background = new THREE.Color(0x0a1214);
    if (scene.fog) {
      scene.fog.color.set(0x0a1214);
      scene.fog.density = fogBase.corridor * fogMul;
    }
    document.getElementById('bottom')?.classList.add('active');
    setPhase('corridor');
    setPrompt('SCROLL UP TOWARD THE EXIT', true);
    camera.position.set(0, eyeY, corridor.cameraZForProgress(0));
    camera.rotation.set(0, 0, 0);
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

  let scrollAccum = 0;
  function onWheel(event) {
    if (phase !== 'corridor') return;
    // Match main game: scroll up (negative deltaY) advances; scroll down retreats.
    scrollAccum += -event.deltaY;
  }
  const keys = { fwd: false, back: false };
  function onWalkKey(event, down) {
    if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.fwd = down;
    if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.back = down;
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', e => onWalkKey(e, true));
  window.addEventListener('keyup', e => onWalkKey(e, false));

  dbg.querySelector('[data-f=skip]')?.addEventListener('click', () => {
    progress = 1;
    beginReveal({ skipWalk: true });
  });
  dbg.querySelector('[data-f=pause]')?.addEventListener('click', (ev) => {
    paused = !paused;
    ev.currentTarget.textContent = paused ? 'RESUME' : 'PAUSE';
  });
  dbg.querySelector('[data-f=hold]')?.addEventListener('click', () => {
    forceHold = true;
    setPhase('reveal');
    revealT = REVEAL.doorDur + REVEAL.walkDur + REVEAL.turnDur + 0.5;
    doorMask.visible = false;
    corridor.exitDoor.rotation.y = 1.35;
    revealOrganism();
    creature.setStabilizeExit(false);
    ambience.start().then(() => ambience.setLevel(0.7));
    scene.background = new THREE.Color(0x161e24);
    if (scene.fog) {
      scene.fog.color.set(0x161e24);
      scene.fog.density = fogBase.exterior * fogMul;
    }
    applyPose(camera, poseReveal);
  });
  dbg.querySelector('[data-f=restart]')?.addEventListener('click', restartSequence);
  dbg.querySelector('[data-f=breathI]')?.addEventListener('input', (ev) => {
    creature.setBreathIntensity(Number(ev.target.value) / 100);
  });
  dbg.querySelector('[data-f=breathS]')?.addEventListener('input', (ev) => {
    creature.setBreathSpeed(Number(ev.target.value) / 100);
  });
  dbg.querySelector('[data-f=fog]')?.addEventListener('input', (ev) => {
    fogMul = Number(ev.target.value) / 100;
    if (scene.fog) {
      const base = phase === 'corridor' ? fogBase.corridor : fogBase.exterior;
      scene.fog.density = base * fogMul;
    }
  });
  dbg.querySelector('[data-f=revealS]')?.addEventListener('input', (ev) => {
    revealSpeed = Number(ev.target.value) / 100;
  });

  camera.position.set(0, eyeY, corridor.cameraZForProgress(0));
  camera.rotation.set(0, 0, 0);
  if (scene.fog) scene.fog.density = fogBase.corridor * fogMul;

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

    if (progress > 0.8) setPrompt('CLICK THE DOOR  ·  OR PRESS E', true);
    else if (progress > 0.15) setPrompt('KEEP MOVING', true);

    creature.update(dt, reduced);
  }

  function updateReveal(dt) {
    if (!paused) revealT += dt * revealSpeed;
    const t = revealT;
    const doorEnd = REVEAL.doorDur;
    const walkEnd = doorEnd + REVEAL.walkDur;
    const turnEnd = walkEnd + REVEAL.turnDur;
    const holdEnd = turnEnd + REVEAL.holdDur;

    const doorU = smooth(clamp01(t / doorEnd));
    corridor.exitDoor.rotation.y = doorU * 1.35;

    // Occlusion mask dissolves as we clear the threshold.
    if (t < doorEnd) {
      maskMat.opacity = 1;
      doorMask.visible = true;
    } else if (t < walkEnd) {
      const u = (t - doorEnd) / REVEAL.walkDur;
      maskMat.opacity = 1 - smooth(clamp01(u * 1.6));
      doorMask.visible = maskMat.opacity > 0.02;
    } else {
      doorMask.visible = false;
      maskMat.opacity = 0;
    }

    let pose;
    if (t < doorEnd) {
      pose = lerpPose(poseDoor, poseThreshold, doorU);
      ambience.setLevel(0.15 + doorU * 0.1);
    } else if (t < walkEnd) {
      const u = (t - doorEnd) / REVEAL.walkDur;
      pose = lerpPose(poseThreshold, poseOutside, u);
      if (scene.fog) scene.fog.density = lerp(fogBase.corridor, fogBase.exterior, smooth(u)) * fogMul;
      ambience.setLevel(0.25 + u * 0.25);
      if (u > 0.35) creature.setStabilizeExit(false);
    } else if (t < turnEnd) {
      const u = (t - walkEnd) / REVEAL.turnDur;
      pose = lerpPose(poseOutside, poseReveal, u);
      if (scene.fog) scene.fog.density = fogBase.exterior * fogMul;
      organismKey.intensity = lerp(1.6, 2.5, smooth(u));
      ambience.setLevel(0.5 + u * 0.35);
      creature.setStabilizeExit(false);
    } else {
      pose = { ...poseReveal };
      const holdT = t - turnEnd;
      pose.x += Math.sin(holdT * 0.12) * 0.1;
      pose.y += Math.sin(holdT * 0.09) * 0.04;
      ambience.setLevel(0.85);
      creature.setStabilizeExit(false);
      if (!forceHold && holdT > REVEAL.holdDur) {
        setPhase('fade');
        fadeEl.style.opacity = '1';
        finished = true;
      }
    }

    applyPose(camera, pose);
    creature.update(dt, reduced);
    organismKey.intensity = 2.15 + Math.sin(t * 0.45) * 0.2;
  }

  function updateFade(dt) {
    creature.update(dt, reduced);
    ambience.setLevel(Math.max(0, 0.85 - revealT * 0.01));
  }

  function update(dt) {
    if (phase === 'corridor') updateCorridor(dt);
    else if (phase === 'reveal' || phase === 'hold') updateReveal(dt);
    else if (phase === 'fade') updateFade(dt);
  }

  function dispose() {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('wheel', onWheel);
    prompt.remove();
    fadeEl.remove();
    dbg.remove();
    loadNote.remove();
    doorMask.removeFromParent();
    maskGeo.dispose();
    maskMat.dispose();
    exitVoid.removeFromParent();
    voidGeo.dispose();
    voidMat.dispose();
    corridor.dispose();
    creature.dispose();
    ambience.dispose();
    groundGeo.dispose();
    groundMat.dispose();
    hemi.dispose?.();
    fill.dispose?.();
    organismKey.dispose?.();
    rimCool.dispose?.();
    ambient.dispose?.();
    exterior.removeFromParent();
    scene.remove(ambient);
    experience?.removeAttribute('data-ending');
    localDirector.dispose?.();
  }

  console.info(
    '[Behind. FINALE] GLB prototype ready. Scroll to the door, click / E to exit. Dev panel: SKIP / HOLD / breath knobs.',
  );

  return {
    get phase() { return phase; },
    get finished() { return finished; },
    get revealTime() { return revealT; },
    update,
    dispose,
    restart: restartSequence,
  };
}
