import { createTapeCreature, OFFICE_01_CREATURE } from './creature.js?v=tape-chair-1';

/**
 * Debug-only found-footage prototype: Office tape 01.
 * Scripted handheld pass through the existing Office mesh.
 * Does not touch Office puzzles, STEADY, dialogue, or chapter progression.
 *
 * Creature: The Waiting Thing (.glb via lazy GLTFLoader). See OFFICE_01_CREATURE.
 *
 * Timeline (~26s):
 *  0–7s   aisle walk toward the glass conference room
 *  7–13s  settle on the creature through the glass
 * 13–17s  look away down the aisle
 * 17s     creature vanishes while off-screen
 * 17–22s  look back at the empty room
 * 22–26s  linger / hold
 */

const DURATION = 26;
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
 * look: world-space aim point (preferred) — yaw/pitch are fallbacks only.
 * Glass conference room sits at +X; aisle forward is -Z.
 */
function samplePath(t) {
  const creatureAim = { x: CREATURE_POS.x, y: CREATURE_AIM_Y, z: CREATURE_POS.z };
  const aisleAim = { x: -0.4, y: 1.45, z: -48.5 };
  const aisleStart = { x: 0.05, y: 1.62, z: 2.4, look: { x: 0.1, y: 1.5, z: -8 } };
  const aisleMid = { x: 0.12, y: 1.64, z: -18.0, look: { x: 0.2, y: 1.5, z: -28 } };
  const approach = { x: 0.65, y: 1.58, z: -37.2, look: { x: 2.2, y: 1.7, z: -39.0 } };
  const onCreature = { x: 1.05, y: 1.52, z: -39.4, look: { ...creatureAim } };
  const lookAway = { x: 0.85, y: 1.56, z: -38.4, look: { ...aisleAim } };
  const lookBack = { x: 1.15, y: 1.50, z: -39.6, look: { ...creatureAim } };
  const linger = { x: 1.00, y: 1.54, z: -39.1, look: { x: 4.2, y: 1.4, z: -40.5 } };

  if (t < 4) return lerpPose(aisleStart, aisleMid, t / 4);
  if (t < 7.5) return lerpPose(aisleMid, approach, (t - 4) / 3.5);
  if (t < 10) return lerpPose(approach, onCreature, (t - 7.5) / 2.5);
  if (t < 13) return { ...onCreature, look: { ...creatureAim } };
  if (t < 16.5) return lerpPose(onCreature, lookAway, (t - 13) / 3.5);
  if (t < 17.4) return { ...lookAway, look: { ...aisleAim } };
  if (t < 21) return lerpPose(lookAway, lookBack, (t - 17.4) / 3.6);
  if (t < 24) return lerpPose(lookBack, linger, (t - 21) / 3);
  return { ...linger, look: linger.look };
}

function handheld(t, reduced) {
  if (reduced) return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  const breath = Math.sin(t * 1.7);
  const tremor = Math.sin(t * 11.3) * 0.35 + Math.sin(t * 17.8) * 0.2;
  const sway = Math.sin(t * 2.4 + 0.7);
  return {
    x: breath * 0.018 + tremor * 0.006 + sway * 0.012,
    y: Math.sin(t * 2.1) * 0.014 + tremor * 0.004,
    z: Math.sin(t * 1.55 + 1.2) * 0.01,
    yaw: breath * 0.012 + tremor * 0.008 + sway * 0.01,
    pitch: Math.sin(t * 1.9) * 0.01 + tremor * 0.006,
    roll: Math.sin(t * 1.35) * 0.018 + tremor * 0.01,
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

      if (!vanished && t >= 17.05) {
        creature.setVisible(false);
        vanished = true;
      }

      const pose = samplePath(t);
      const shake = handheld(t, reduced);
      // Slight extra tremor while locked on the figure.
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
      experience?.classList.remove('tape-mode');
      experience?.removeAttribute('data-tape');
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      tapeDirector.dispose();
    },
  };
}
