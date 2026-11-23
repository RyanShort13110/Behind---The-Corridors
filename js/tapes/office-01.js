import { createTapeCreature, OFFICE_01_CREATURE } from './creature.js?v=bd-warm-1';

/**
 * Debug-only found-footage prototype: Office tape 01.
 * Scripted handheld pass through the existing Office mesh.
 * Does not touch Office puzzles, STEADY, dialogue, or chapter progression.
 *
 * Creature: The Waiting Thing (.glb via lazy GLTFLoader). See OFFICE_01_CREATURE.
 *
 * Timeline (~27s):
 *  0–8s     casual aisle walk with left/right looks; lights dim mid-aisle
 *  8–10s    glance in — see it looming
 * 10–11s    terror hitch (creature looks up) then break
 * 11–16s    sprint back to the elevator exit (creature vanishes)
 * 16–19s    tuck behind the elevator jamb
 * 19–24s    slow peek — empty conference room
 * 24–26s    eyes find the hall-end silhouette
 * 26–26.7s  hard camcorder zoom, then abrupt cut
 */

const DURATION = 26.7;
/** Vanish as soon as the scramble turns away from the glass. */
const VANISH_AT = 11.2;
/** Reappear at the far end of the aisle for the final frame. */
const REAPPEAR_AT = 24.6;
/** Snap zoom as soon as the look locks — no idle hold. */
const ZOOM_START = 25.95;
const ZOOM_END = 26.7;
/** Brighter than gameplay baseline until mid-aisle, then ease down. */
const LIGHT_BRIGHT = 1.38;
const LIGHT_DIM = 0.48;
const LIGHT_DIM_START = 3.6;
const LIGHT_DIM_END = 5.4;
/** Aisle-end pose facing the elevator (model faces −Z at yaw 0 → π faces +Z). */
const HALL_END_POS = { x: 0.12, y: 0, z: -48.55, yaw: Math.PI };
const CREATURE_POS = OFFICE_01_CREATURE.position;
const CREATURE_AIM_Y = OFFICE_01_CREATURE.height * 0.62;
const HALL_END_AIM = {
  x: HALL_END_POS.x,
  y: OFFICE_01_CREATURE.height * 0.72,
  z: HALL_END_POS.z,
};

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}
function smooth(t) {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpPose(a, b, t, ease = smooth) {
  const u = ease(t);
  const pose = {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    z: lerp(a.z, b.z, u),
  };
  if (a.look && b.look) {
    pose.look = {
      x: lerp(a.look.x, b.look.x, u),
      y: lerp(a.look.y, b.look.y, u),
      z: lerp(a.look.z, b.look.z, u),
    };
  }
  return pose;
}

function applyPose(camera, pose, shake) {
  camera.position.set(
    pose.x + shake.x,
    pose.y + shake.y,
    pose.z + shake.z,
  );
  if (pose.look) {
    camera.up.set(0, 1, 0);
    camera.lookAt(
      pose.look.x + shake.yaw * 0.8,
      pose.look.y + shake.pitch * 0.8,
      pose.look.z,
    );
    // Layer a little roll after lookAt (lookAt clears roll).
    camera.rotateZ(shake.roll);
  }
}

/**
 * Piecewise keyframed camera path.
 * Glass conference room sits at +X (wall ≈ 2.58); aisle forward is −Z.
 * Elevator exit jamb (peek cover): x≈±1.18, z≈2.13.
 */
function samplePath(t) {
  const creatureAim = { x: CREATURE_POS.x, y: CREATURE_AIM_Y, z: CREATURE_POS.z };
  // First peek checks the empty glass room; final hold finds the hall-end figure.
  const emptyRoomAim = { x: 4.2, y: 1.55, z: -38.8 };
  const exitAim = { x: 0.15, y: 1.45, z: 5.5 };

  // Casual look-over — registers the loom, does not plant for a long stare.
  const glanceIn = { x: 0.48, y: 1.56, z: -38.4, look: { ...creatureAim } };
  // Short terror hitch only; look-up reads here, then he breaks.
  const hitch = { x: 0.62, y: 1.53, z: -39.0, look: { ...creatureAim } };
  // Panic: eyes go to the elevator, body follows.
  const turnRun = { x: 0.28, y: 1.56, z: -38.2, look: { ...exitAim } };
  const behindJamb = {
    x: 1.02, y: 1.50, z: 1.95,
    look: { x: 2.4, y: 1.4, z: 3.2 },
  };
  const peekOut = {
    x: 0.58, y: 1.48, z: 1.55,
    look: { ...emptyRoomAim },
  };
  // Drift from the empty room down the aisle to the far silhouette.
  const noticeHall = {
    x: 0.48, y: 1.49, z: 1.42,
    look: { x: 1.2, y: 1.55, z: -44.0 },
  };
  const finalHold = {
    x: 0.42, y: 1.50, z: 1.35,
    look: { ...HALL_END_AIM },
  };

  // First aisle pass: constant forward speed, eyes wander left/right.
  if (t < 8) return sampleAisleWalk(t);
  const strollPast = sampleAisleWalk(8);
  if (t < 10) return lerpPose(strollPast, glanceIn, (t - 8) / 2);
  if (t < 10.9) return lerpPose(glanceIn, hitch, (t - 10) / 0.9);
  if (t < 11.15) return { ...hitch, look: { ...creatureAim } };
  if (t < 11.9) return lerpPose(hitch, turnRun, (t - 11.15) / 0.75);
  // One continuous scramble — linear so mid-aisle doesn't ease/slow.
  if (t < 16) return lerpPose(turnRun, behindJamb, (t - 11.9) / 4.1, clamp01);
  if (t < 18.5) return { ...behindJamb };
  if (t < 23) return lerpPose(behindJamb, peekOut, (t - 18.5) / 4.5);
  if (t < 25.2) return lerpPose(peekOut, noticeHall, (t - 23) / 2.2);
  // Quick lock onto the figure — zoom starts immediately after (no standing beat).
  if (t < ZOOM_START) return lerpPose(noticeHall, finalHold, (t - 25.2) / (ZOOM_START - 25.2));
  return { ...finalHold, look: finalHold.look };
}

function handheld(t, reduced) {
  if (reduced) return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  // Heavier bob during the scramble; quieter while peeking / final hold.
  const running = t >= 11.1 && t < 16.2 ? 2.5 : 1;
  const peeking = t >= 18.5 && t < 26 ? 0.65 : 1;
  const amp = running * peeking;
  const breath = Math.sin(t * 1.7);
  const tremor = Math.sin(t * 11.3) * 0.35 + Math.sin(t * 17.8) * 0.2;
  const sway = Math.sin(t * 2.4 + 0.7);
  return {
    x: (breath * 0.018 + tremor * 0.006 + sway * 0.012) * amp,
    y: (Math.sin(t * 2.1) * 0.014 + tremor * 0.004) * amp,
    z: Math.sin(t * 1.55 + 1.2) * 0.01 * amp,
    yaw: (breath * 0.012 + tremor * 0.008 + sway * 0.01) * amp,
    pitch: (Math.sin(t * 1.9) * 0.01 + tremor * 0.006) * amp,
    roll: (Math.sin(t * 1.35) * 0.018 + tremor * 0.01) * amp,
  };
}

/**
 * Outbound aisle stroll: body moves linearly −Z; look drifts to desks L/R.
 * t is absolute tape time in [0, 8].
 */
function sampleAisleWalk(t) {
  const u = clamp01(t / 8);
  const x = lerp(0.05, 0.22, u);
  const y = lerp(1.62, 1.60, u);
  const z = lerp(2.4, -34.8, u);
  // Look points ahead of the camera so the turn reads as glancing, not spinning.
  const ahead = z - 7.5;
  const lookFwd = { x: 0.15, y: 1.48, z: ahead };
  const lookLeft = { x: -2.6, y: 1.35, z: z - 2.2 };
  const lookRight = { x: 2.7, y: 1.4, z: z - 1.8 };
  const lookAheadGlass = { x: 0.55, y: 1.5, z: -42 };

  const lerpLook = (a, b, s) => {
    const u = smooth(s);
    return {
      x: lerp(a.x, b.x, u),
      y: lerp(a.y, b.y, u),
      z: lerp(a.z, b.z, u),
    };
  };

  let look;
  if (t < 1.6) look = lerpLook(lookFwd, lookLeft, t / 1.6);
  else if (t < 3.3) look = lerpLook(lookLeft, lookFwd, (t - 1.6) / 1.7);
  else if (t < 5.0) look = lerpLook(lookFwd, lookRight, (t - 3.3) / 1.7);
  else if (t < 6.5) look = lerpLook(lookRight, lookFwd, (t - 5.0) / 1.5);
  else look = lerpLook(lookFwd, lookAheadGlass, (t - 6.5) / 1.5);

  return { x, y, z, look };
}

/** LIGHT_BRIGHT until mid-aisle, then eases down to LIGHT_DIM. */
function sampleLightMul(t) {
  if (t < LIGHT_DIM_START) return LIGHT_BRIGHT;
  if (t < LIGHT_DIM_END) {
    return lerp(LIGHT_BRIGHT, LIGHT_DIM, smooth((t - LIGHT_DIM_START) / (LIGHT_DIM_END - LIGHT_DIM_START)));
  }
  return LIGHT_DIM;
}

function applyOfficeLightMul(lights, mul) {
  for (const entry of lights) {
    entry.light.intensity = entry.base * mul;
  }
}

/** Slow look-up — starts during the glance, finishes as he breaks and runs. */
function sampleGaze(t) {
  if (t < 9.0) return 0;
  if (t < 11.2) return smooth((t - 9.0) / 2.2);
  return 1;
}

function mountTapeChrome() {
  const overlay = document.createElement('div');
  overlay.className = 'tape-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="tape-overlay__wear"></div>
    <div class="tape-overlay__noise"></div>
    <div class="tape-overlay__chroma"></div>
    <div class="tape-overlay__scanlines"></div>
    <div class="tape-overlay__scanlines tape-overlay__scanlines--fine"></div>
    <div class="tape-overlay__tracking"></div>
    <div class="tape-overlay__flicker"></div>
    <div class="tape-overlay__vignette"></div>
    <div class="tape-overlay__hud">
      <span class="tape-overlay__rec">● REC</span>
      <span class="tape-overlay__label">TAPE / OFFICE-01</span>
      <span class="tape-overlay__timecode" data-tape-tc>00:00:00:00</span>
    </div>
    <div class="tape-overlay__footer">
      <span>DEBUG PROTOTYPE · FOUND FOOTAGE</span>
      <button type="button" class="tape-overlay__sound" data-tape-sound aria-pressed="false">SOUND: OFF</button>
    </div>
  `;
  document.getElementById('experience')?.appendChild(overlay);
  return overlay;
}

function formatTimecode(seconds) {
  const s = Math.max(0, seconds);
  const whole = Math.floor(s);
  const frames = Math.floor((s - whole) * 30);
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  const ff = String(frames).padStart(2, '0');
  return `00:${mm}:${ss}:${ff}`;
}

/**
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {THREE.PerspectiveCamera} opts.camera
 * @param {THREE.WebGLRenderer} opts.renderer
 * @param {() => object} opts.createOffice
 * @param {object} opts.director
 * @param {() => object} opts.createSceneDirector
 * @param {{ toggle: () => Promise<boolean>, enabled?: boolean }} [opts.audio] Game audio director (SOUND toggle).
 * @param {boolean} [opts.reduced]
 * @param {boolean} [opts.initialSoundOn] Match game SOUND: ON when entering from camcorder.
 */
export async function startOfficeTape01({
  scene,
  camera,
  renderer,
  createOffice,
  director,
  createSceneDirector,
  audio = null,
  reduced = false,
  initialSoundOn = false,
}) {
  const experience = document.getElementById('experience');
  experience?.classList.add('tape-mode');
  experience?.setAttribute('data-tape', 'office-01');

  // Hide normal gameplay chrome; tape HUD replaces it.
  document.getElementById('intro')?.classList.add('is-hidden');
  document.getElementById('topbar')?.classList.add('active');
  document.getElementById('bottom')?.classList.remove('active');
  document.getElementById('composure')?.classList.remove('is-active');
  document.getElementById('composure')?.setAttribute('aria-hidden', 'true');
  document.getElementById('inventory')?.setAttribute('aria-hidden', 'true');
  document.getElementById('narrative')?.classList.remove('active');
  const location = document.getElementById('location');
  if (location) location.innerHTML = 'TAPE <span class="separator">/</span> OFFICE-01';

  director.dispose();
  const tapeDirector = createSceneDirector();
  // Omit only the exterior-side chair at the creature's feet; walkable Office keeps it.
  const office = createOffice(scene, {
    keypadCode: '0000',
    omitConferenceChairs: [{ x: 5.55, z: -38.54 }],
    omitAisleClutter: true,
  });
  tapeDirector.add('office', office);
  tapeDirector.activate('office');
  // Snapshot after create — office update resets ambient each frame, so dim is re-applied after.
  const officeLights = [];
  scene.traverse(obj => {
    if (!obj.isLight) return;
    officeLights.push({ light: obj, base: obj.intensity });
  });
  applyOfficeLightMul(officeLights, LIGHT_BRIGHT);

  const creature = await createTapeCreature(OFFICE_01_CREATURE);
  scene.add(creature.root);

  const chrome = mountTapeChrome();
  const tcEl = chrome.querySelector('[data-tape-tc]');
  const soundBtn = chrome.querySelector('[data-tape-sound]');
  const syncSoundUi = (on) => {
    if (soundBtn) {
      soundBtn.textContent = `SOUND: ${on ? 'ON' : 'OFF'}`;
      soundBtn.setAttribute('aria-pressed', String(on));
    }
    const gameSound = document.getElementById('sound');
    if (gameSound) {
      gameSound.textContent = `SOUND: ${on ? 'ON' : 'OFF'}`;
      gameSound.setAttribute('aria-pressed', String(on));
    }
  };
  // Camcorder / game SOUND: ON → tape starts with sound already live.
  if (initialSoundOn && audio) {
    if (!audio.enabled && audio.toggle) await audio.toggle();
    syncSoundUi(Boolean(audio.enabled));
  } else {
    syncSoundUi(Boolean(audio?.enabled));
  }
  soundBtn?.addEventListener('click', async () => {
    let on = false;
    if (audio?.toggle) on = await audio.toggle();
    else on = soundBtn.getAttribute('aria-pressed') !== 'true';
    syncSoundUi(on);
  });

  // Tape-only lighting inspector; normal gameplay and chapter dev controls
  // remain untouched. Sliders adjust existing GLB materials/light in place.
  const inspector = document.createElement('aside');
  inspector.setAttribute('aria-label', 'Tape creature lighting controls');
  inspector.style.cssText = [
    'position:fixed', 'right:16px', 'top:76px', 'z-index:9999',
    'width:220px', 'padding:12px 14px', 'border:1px solid #4a657077',
    'background:#080e12ed', 'color:#c2d2d8', 'font:12px/1.5 monospace',
    'border-radius:5px', 'pointer-events:auto',
  ].join(';');
  const addSlider = (label, property, min, max, step) => {
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin:0 0 10px';
    const title = document.createElement('div');
    title.style.cssText = 'display:flex;justify-content:space-between';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('output');
    value.textContent = Number(creature.config[property]).toFixed(2);
    title.append(name, value);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(creature.config[property]);
    slider.style.cssText = 'display:block;width:100%;accent-color:#7897a6';
    slider.addEventListener('input', () => {
      creature.config[property] = Number(slider.value);
      value.textContent = Number(slider.value).toFixed(2);
      creature.applyShading();
    });
    row.append(title, slider);
    inspector.appendChild(row);
  };
  const inspectorTitle = document.createElement('div');
  inspectorTitle.textContent = 'WAITING THING / LIGHTING';
  inspectorTitle.style.cssText = 'font-weight:bold;letter-spacing:0.06em;margin-bottom:10px';
  inspector.appendChild(inspectorTitle);
  addSlider('DARKNESS', 'darkness', 0, 1, 0.01);
  addSlider('RIM INTENSITY', 'rimLightIntensity', 0, 3, 0.01);
  const note = document.createElement('small');
  note.textContent = 'Debug tape only · changes are not saved';
  note.style.opacity = '0.7';
  inspector.appendChild(note);
  experience?.appendChild(inspector);

  const baseFov = camera.fov;
  let elapsed = 0;
  let vanished = false;
  let reappeared = false;
  let finished = false;
  let holdFraming = false;

  creature.setGaze(0);

  // Seed camera before first paint.
  camera.rotation.order = 'YXZ';
  applyPose(camera, samplePath(0), { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 });
  camera.fov = reduced ? baseFov : baseFov - 2;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  console.info(
    '[Behind. TAPE] office-01 ready · The Waiting Thing ·',
    `mode=${OFFICE_01_CREATURE.mode} height=${OFFICE_01_CREATURE.height}m`,
  );
  console.info(
    '[Behind. TAPE] Tune OFFICE_01_CREATURE in js/tapes/creature.js (position/height/yaw).',
  );
  if (typeof window !== 'undefined') {
    // Live tweak while the tape runs, e.g.:
    // __tapeCreature.config.height = 3.2; await __tapeCreature.applyConfig();
    window.__tapeCreature = creature;
    window.__tapeCamera = camera;
    /** Freeze timeline and stare at the creature for framing checks. */
    window.__tapeHoldOnCreature = () => {
      holdFraming = true;
      elapsed = 10.7;
      finished = false;
      vanished = false;
      reappeared = false;
      creature.setWorldPose({
        x: CREATURE_POS.x, y: CREATURE_POS.y, z: CREATURE_POS.z,
        yaw: OFFICE_01_CREATURE.yaw,
      });
      creature.setGaze(0.85);
      creature.setVisible(true);
      const pose = samplePath(elapsed);
      applyPose(camera, pose, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 });
      return { t: elapsed, look: pose.look, creature: { ...OFFICE_01_CREATURE.position } };
    };
  }

  return {
    id: 'office-01',
    duration: DURATION,
    get elapsed() { return elapsed; },
    get finished() { return finished; },
    update(dt) {
      if (holdFraming) {
        const pose = samplePath(10.7);
        const shake = handheld(10.7, reduced);
        applyPose(camera, pose, {
          x: shake.x * 0.4, y: shake.y * 0.4, z: shake.z * 0.4,
          yaw: shake.yaw * 0.4, pitch: shake.pitch * 0.4, roll: shake.roll * 0.4,
        });
        creature.setVisible(true);
        creature.update(dt, camera);
        if (tcEl) tcEl.textContent = formatTimecode(10.7);
        return;
      }

      if (finished) {
        // Soft hold on final frame with residual handheld.
        const hold = samplePath(DURATION);
        const shake = handheld(elapsed, reduced);
        applyPose(camera, hold, shake);
        elapsed += dt;
        if (tcEl) tcEl.textContent = formatTimecode(Math.min(elapsed, DURATION));
        return;
      }

      elapsed += dt;
      const t = Math.min(elapsed, DURATION);

      if (!vanished && t >= VANISH_AT) {
        creature.setVisible(false);
        vanished = true;
      }

      if (vanished && !reappeared && t >= REAPPEAR_AT) {
        // Far end of the aisle, facing the elevator peek.
        creature.setWorldPose(HALL_END_POS);
        creature.setGaze(1);
        creature.setVisible(true);
        reappeared = true;
      }

      creature.setGaze(sampleGaze(t));

      const pose = samplePath(t);
      const shake = handheld(t, reduced);
      // Extra tremor on the terror hitch; scramble uses handheld amp.
      const focus = t >= 9.8 && t < 11.3 ? 1.55 : 1;
      applyPose(camera, pose, {
        x: shake.x * focus,
        y: shake.y * focus,
        z: shake.z * focus,
        yaw: shake.yaw * focus,
        pitch: shake.pitch * focus,
        roll: shake.roll * focus,
      });
      creature.update(dt, camera);
      if (typeof window !== 'undefined') {
        window.__tapeDebug = {
          t: Number(t.toFixed(2)),
          vanished,
          reappeared,
          creature: {
            x: Number(creature.root.position.x.toFixed(2)),
            y: Number(creature.root.position.y.toFixed(2)),
            z: Number(creature.root.position.z.toFixed(2)),
            height: OFFICE_01_CREATURE.height,
          },
          cam: {
            x: Number(camera.position.x.toFixed(2)),
            y: Number(camera.position.y.toFixed(2)),
            z: Number(camera.position.z.toFixed(2)),
          },
          look: pose.look,
        };
      }

      if (!reduced) {
        const fovWobble = Math.sin(t * 0.7) * 0.35 + Math.sin(t * 3.1) * 0.15;
        let fov = baseFov - 2 + fovWobble;
        // Hard consumer-camcorder zoom: ease-in, lands, hard cut (no linger).
        if (t >= ZOOM_START) {
          const u = clamp01((t - ZOOM_START) / Math.max(0.01, ZOOM_END - ZOOM_START));
          const z = u * u; // accelerate into the punch
          fov = lerp(baseFov - 2, baseFov - 15, z) + fovWobble * (1 - z) * 0.2;
        }
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }

      // Keep office ambient alive (empty-seat / lights stay idle at p≈0).
      tapeDirector.update(0.42, {
        keypadUnlocked: false,
        serviceDoorOpen: false,
        secondApproachAnomaly: false,
        emptySeatTriggered: false,
        emptySeatSteadyReady: false,
      }, dt, reduced);
      // Office update resets ambient — re-apply the aisle dim after it.
      applyOfficeLightMul(officeLights, sampleLightMul(t));

      if (tcEl) tcEl.textContent = formatTimecode(t);
      if (elapsed >= DURATION) finished = true;
    },
    dispose() {
      creature.root.removeFromParent();
      creature.dispose();
      chrome.remove();
      inspector.remove();
      if (typeof window !== 'undefined') {
        delete window.__tapeCreature;
        delete window.__tapeCamera;
        delete window.__tapeHoldOnCreature;
      }
      experience?.classList.remove('tape-mode');
      experience?.removeAttribute('data-tape');
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      tapeDirector.dispose();
    },
  };
}
