import { createTapeCreature, OFFICE_01_CREATURE } from './creature.js?v=silhouette-3';

/**
 * Debug-only found-footage prototype: Office tape 01.
 * Scripted handheld pass through the existing Office mesh.
 * Does not touch Office puzzles, STEADY, dialogue, or chapter progression.
 *
 * Creature: The Waiting Thing (.glb via lazy GLTFLoader). See OFFICE_01_CREATURE.
 *
 * Timeline (~28s):
 *  0–7s    aisle walk toward the glass conference room
 *  7–13s   settle on the creature through the glass
 * 13–16s   scramble back up the aisle (creature vanishes while running)
 * 16–18s   tuck behind the near glass corner
 * 18–23s   peek out — empty room
 * 23–28s   linger / hold
 */

const DURATION = 28;
/** Vanish as soon as the scramble turns away from the glass. */
const VANISH_AT = 13.35;
const CREATURE_POS = OFFICE_01_CREATURE.position;
const CREATURE_AIM_Y = OFFICE_01_CREATURE.height * 0.62;

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
function lerpPose(a, b, t) {
  const u = smooth(t);
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
 * Near glass corner for the peek: ~x=1.0, z=-34.6 (aisle-side of the jamb).
 */
function samplePath(t) {
  const creatureAim = { x: CREATURE_POS.x, y: CREATURE_AIM_Y, z: CREATURE_POS.z };
  const emptyRoomAim = { x: 4.6, y: 1.55, z: -39.2 };
  const retreatAim = { x: 0.2, y: 1.4, z: -28.0 };

  const aisleStart = { x: 0.05, y: 1.62, z: 2.4, look: { x: 0.1, y: 1.5, z: -8 } };
  const aisleMid = { x: 0.12, y: 1.64, z: -18.0, look: { x: 0.2, y: 1.5, z: -28 } };
  const approach = { x: 0.65, y: 1.58, z: -37.2, look: { x: 2.2, y: 1.7, z: -39.0 } };
  const onCreature = { x: 1.05, y: 1.52, z: -39.4, look: { ...creatureAim } };
  // Panic run back toward the entrance, eyes off the glass.
  const midRun = { x: 0.55, y: 1.58, z: -36.2, look: { ...retreatAim } };
  // Tucked just past the near glass corner — mostly covered.
  const behindCorner = {
    x: 0.72, y: 1.50, z: -34.55,
    look: { x: -0.6, y: 1.35, z: -32.5 },
  };
  // Lean out from the jamb to re-check the room.
  const peekOut = {
    x: 1.18, y: 1.48, z: -35.15,
    look: { ...emptyRoomAim },
  };
  const linger = {
    x: 1.28, y: 1.50, z: -35.45,
    look: { x: 4.3, y: 1.35, z: -40.0 },
  };

  if (t < 4) return lerpPose(aisleStart, aisleMid, t / 4);
  if (t < 7.5) return lerpPose(aisleMid, approach, (t - 4) / 3.5);
  if (t < 10) return lerpPose(approach, onCreature, (t - 7.5) / 2.5);
  if (t < 13) return { ...onCreature, look: { ...creatureAim } };
  if (t < 14.6) return lerpPose(onCreature, midRun, (t - 13) / 1.6);
  if (t < 16.4) return lerpPose(midRun, behindCorner, (t - 14.6) / 1.8);
  if (t < 18.2) return { ...behindCorner };
  if (t < 21.5) return lerpPose(behindCorner, peekOut, (t - 18.2) / 3.3);
  if (t < 24.5) return lerpPose(peekOut, linger, (t - 21.5) / 3);
  return { ...linger, look: linger.look };
}

function handheld(t, reduced) {
  if (reduced) return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  // Heavier bob during the scramble; quieter while peeking.
  const running = t >= 13 && t < 16.6 ? 2.4 : 1;
  const peeking = t >= 18.2 && t < 22 ? 0.7 : 1;
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

function mountTapeChrome() {
  const overlay = document.createElement('div');
  overlay.className = 'tape-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="tape-overlay__scanlines"></div>
    <div class="tape-overlay__vignette"></div>
    <div class="tape-overlay__hud">
      <span class="tape-overlay__rec">● REC</span>
      <span class="tape-overlay__label">TAPE / OFFICE-01</span>
      <span class="tape-overlay__timecode" data-tape-tc>00:00:00:00</span>
    </div>
    <div class="tape-overlay__footer">DEBUG PROTOTYPE · FOUND FOOTAGE</div>
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
 * @param {boolean} [opts.reduced]
 */
export async function startOfficeTape01({
  scene,
  camera,
  renderer,
  createOffice,
  director,
  createSceneDirector,
  reduced = false,
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
  });
  tapeDirector.add('office', office);
  tapeDirector.activate('office');

  const creature = await createTapeCreature(OFFICE_01_CREATURE);
  scene.add(creature.root);

  const chrome = mountTapeChrome();
  const tcEl = chrome.querySelector('[data-tape-tc]');

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
  let finished = false;
  let holdFraming = false;

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
      elapsed = 11.2;
      finished = false;
      vanished = false;
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
        const pose = samplePath(11.2);
        const shake = handheld(11.2, reduced);
        applyPose(camera, pose, {
          x: shake.x * 0.4, y: shake.y * 0.4, z: shake.z * 0.4,
          yaw: shake.yaw * 0.4, pitch: shake.pitch * 0.4, roll: shake.roll * 0.4,
        });
        creature.setVisible(true);
        creature.update(dt, camera);
        if (tcEl) tcEl.textContent = formatTimecode(11.2);
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

      const pose = samplePath(t);
      const shake = handheld(t, reduced);
      // Extra tremor while locked on the figure; scramble uses handheld amp.
      const focus = t >= 10 && t < 13.2 ? 1.35 : 1;
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
          creature: { ...OFFICE_01_CREATURE.position, height: OFFICE_01_CREATURE.height },
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
        camera.fov = baseFov - 2 + fovWobble;
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
