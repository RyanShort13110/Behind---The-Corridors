import { createBlackDragonTapeAudio } from './black-dragon-audio.js?v=cam-7';
import { createTapeCreature, OFFICE_01_CREATURE } from './creature.js?v=bd-warm-1';

/**
 * Debug-only found-footage prototype: Black Dragon apartment tape 01.
 * Scripted handheld pass through the existing black memory-home mesh.
 * Does not touch chapter progression, STEADY, inventory, or Office tapes.
 *
 * Timeline (~38s):
 *  0–22s   frantic search / escape through the dark apartment
 * 22–27s   first rapid polite knocks → snap to door → frozen fear
 * 27–32s   second knock burst → shake → turn and run
 * 32–38s   sprint deeper into the apartment → hard cut
 *
 * The Waiting Thing stands outside the living-room window (silhouette only).
 */

/** Tunable tape knobs (also exposed live via __tapeBlackDragon). */
export const BLACK_DRAGON_01 = {
  duration: 38,
  knockA: 22.0,
  knockB: 27.55,
  /** First door burst — fewer, a touch slower. */
  knockACount: 5,
  knockAInterval: 0.155,
  /** Second door burst — same rapid pattern as before. */
  knockCount: 7,
  /** ~4–5× faster than a polite ~0.28s knock spacing. */
  knockInterval: 0.092,
  knockLevel: 0.36,
  /** Multiply memory-home lights (lower = darker). */
  darkness: 0.38,
  fogDensity: 0.028,
  eyeHeight: 1.52,
};

const DOOR = { x: 0, y: 1.15, z: -11.28 };

/** Outside the left window (glass ≈ x=-3.1, z=-3.6); faces into the room (+X). */
const WINDOW_CREATURE = {
  ...OFFICE_01_CREATURE,
  // Outside the pane — far enough that a back rim can't sit on the header.
  position: { x: -5.15, y: 0, z: -3.58 },
  height: 2.95,
  yaw: Math.PI * 0.5,
  // Office-style cool outline rim, but local −Z is "behind" for this yaw
  // (local +Z was landing on the window trim and lighting the room).
  rimLightLocal: { x: 0.05, y: 2.3, z: -1.5 },
  rimLightIntensity: 0.72,
  rimLightColor: 0x4a6570,
  rimLightDistance: 2.6,
  darkness: 0.92,
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
  const u = ease(clamp01(t));
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
      pose.look.x + shake.yaw * 0.85,
      pose.look.y + shake.pitch * 0.85,
      pose.look.z,
    );
    camera.rotateZ(shake.roll);
  }
}

/**
 * Piecewise handheld path through the black memory apartment.
 * Living room aisle along −Z; front door at z ≈ −11.28.
 */
function samplePath(t, cfg) {
  const y = cfg.eyeHeight;
  const doorAim = { x: DOOR.x, y: 1.25, z: DOOR.z };

  // Mid-action: already moving near the couch / lamp side.
  const p0 = { x: 0.85, y, z: -2.4, look: { x: 2.2, y: 1.35, z: -3.6 } };
  const p1 = { x: 0.15, y, z: -3.8, look: { x: -2.4, y: 1.45, z: -3.5 } };
  const p2 = { x: -0.55, y, z: -4.2, look: { x: -2.9, y: 1.55, z: -3.6 } };
  // Whip toward hallway, then abort.
  const p3 = { x: -0.1, y, z: -5.6, look: { x: 0.1, y: 1.4, z: -10.5 } };
  const p4 = { x: 0.2, y, z: -7.4, look: { x: 0.05, y: 1.3, z: -11.0 } };
  const p5 = { x: 0.35, y, z: -6.1, look: { x: 1.8, y: 1.2, z: -3.0 } };
  // Double back — second clear look at the window (creature appears here).
  const p6 = { x: -0.9, y, z: -4.8, look: { x: -2.9, y: 1.4, z: -3.55 } };
  const p7 = { x: -0.2, y, z: -2.8, look: { x: 2.4, y: 1.35, z: -2.5 } };
  const p8 = { x: 0.55, y, z: -5.0, look: { x: 0.2, y: 1.35, z: -9.5 } };
  // Moving hall-ward — first knock snaps eyes to the door and locks them there.
  const approach = { x: 0.12, y, z: -7.0, look: { x: 0.35, y: 1.3, z: -9.2 } };
  const freezeDoor = { x: 0.08, y: y - 0.01, z: -7.15, look: { ...doorAim } };
  // Second knock: violent shake in place, then whip away and run.
  const startle = { x: 0.2, y: y + 0.05, z: -6.7, look: { x: 0.1, y: 1.45, z: -11.05 } };
  const turnFlee = { x: 0.45, y, z: -5.6, look: { x: 1.4, y: 1.25, z: -2.2 } };
  const fleeA = { x: 0.75, y, z: -3.8, look: { x: 1.7, y: 1.25, z: -0.8 } };
  const fleeB = { x: 1.15, y: y + 0.06, z: -1.9, look: { x: 2.1, y: 1.15, z: 0.4 } };

  if (t < 3.2) return lerpPose(p0, p1, t / 3.2, clamp01);
  if (t < 6.0) return lerpPose(p1, p2, (t - 3.2) / 2.8, clamp01);
  if (t < 9.0) return lerpPose(p2, p3, (t - 6.0) / 3.0, clamp01);
  if (t < 11.5) return lerpPose(p3, p4, (t - 9.0) / 2.5, clamp01);
  if (t < 13.5) return lerpPose(p4, p5, (t - 11.5) / 2.0);
  if (t < 16.2) return lerpPose(p5, p6, (t - 13.5) / 2.7, clamp01);
  if (t < 18.8) return lerpPose(p6, p7, (t - 16.2) / 2.6, clamp01);
  if (t < 21.4) return lerpPose(p7, p8, (t - 18.8) / 2.6, clamp01);
  if (t < cfg.knockA) return lerpPose(p8, approach, (t - 21.4) / Math.max(0.01, cfg.knockA - 21.4), clamp01);

  // Knock A: quick look at the door, then frozen fear until the second burst.
  if (t < cfg.knockA + 0.45) {
    return lerpPose(approach, freezeDoor, (t - cfg.knockA) / 0.45);
  }
  if (t < cfg.knockB) return { ...freezeDoor, look: { ...doorAim } };

  // Knock B: hold on the door through the knocks, then shake and break.
  if (t < cfg.knockB + 0.5) return { ...freezeDoor, look: { ...doorAim } };
  if (t < cfg.knockB + 1.15) return lerpPose(freezeDoor, startle, (t - (cfg.knockB + 0.5)) / 0.65);
  if (t < cfg.knockB + 1.85) return lerpPose(startle, turnFlee, (t - (cfg.knockB + 1.15)) / 0.7);
  if (t < 33.4) return lerpPose(turnFlee, fleeA, (t - (cfg.knockB + 1.85)) / Math.max(0.01, 33.4 - (cfg.knockB + 1.85)), clamp01);
  if (t < cfg.duration) return lerpPose(fleeA, fleeB, (t - 33.4) / Math.max(0.01, cfg.duration - 33.4), clamp01);
  return { ...fleeB };
}

function pathMode(t, cfg) {
  if (t < cfg.knockA) return 'search';
  if (t < cfg.knockA + 0.45) return 'snap';
  if (t < cfg.knockB) return 'freeze';
  if (t < cfg.knockB + 0.5) return 'stare';
  if (t < cfg.knockB + 1.15) return 'startle';
  return 'flee';
}

/** True when the handheld look is aimed at the left living-room window. */
function isLookingAtWindow(pose) {
  const L = pose?.look;
  if (!L) return false;
  return L.x < -2.0 && L.z < -2.6 && L.z > -4.8;
}

function handheld(t, mode, reduced) {
  if (reduced) return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  const frozen = mode === 'freeze' || mode === 'stare';
  const amp =
    mode === 'search' ? 1.15
      : mode === 'snap' ? 0.7
        : frozen ? 1.65
          : mode === 'startle' ? 3.1
            : 2.35;
  const breath = Math.sin(t * 1.55);
  const tremor = Math.sin(t * 13.1) * 0.32 + Math.sin(t * 19.4) * 0.18;
  const sway = Math.sin(t * 2.15 + 0.4);
  const dread = Math.sin(t * 0.7) * 0.4 + Math.sin(t * 3.1) * 0.2;
  // Frozen on the door: scared human holding still — lean + shaky stare must read.
  // Look deltas are world-space on the aim point, so they need more throw than walk sway.
  if (frozen) {
    const hitch = Math.sin(t * 0.95) * 0.55 + Math.sin(t * 4.6) * 0.2;
    return {
      x: (sway * 0.038 + breath * 0.022 + hitch * 0.018 + tremor * 0.008) * amp,
      y: (breath * 0.028 + Math.sin(t * 2.35) * 0.016 + tremor * 0.006) * amp,
      z: (Math.sin(t * 1.7 + 0.9) * 0.014 + hitch * 0.01) * amp,
      yaw: (sway * 0.085 + hitch * 0.07 + tremor * 0.028 + dread * 0.04) * amp,
      pitch: (breath * 0.055 + hitch * 0.045 + tremor * 0.022 + Math.sin(t * 1.85) * 0.03) * amp,
      roll: (sway * 0.045 + tremor * 0.02 + Math.sin(t * 1.25) * 0.03) * amp,
    };
  }
  return {
    x: (breath * 0.014 + tremor * 0.005 + sway * 0.01 + dread * 0.006) * amp,
    y: (Math.sin(t * 2.35) * 0.012 + tremor * 0.004 + dread * 0.004) * amp,
    z: Math.sin(t * 1.7 + 0.9) * 0.008 * amp,
    yaw: (breath * 0.01 + tremor * 0.007 + sway * 0.008 + dread * 0.01) * amp,
    pitch: (Math.sin(t * 1.85) * 0.008 + tremor * 0.005 + dread * 0.006) * amp,
    roll: (Math.sin(t * 1.25) * 0.014 + tremor * 0.008) * amp,
  };
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
      <span class="tape-overlay__label">TAPE / BLACK-DRAGON-01</span>
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

function dimApartmentLights(home, darkness) {
  const mul = Math.max(0.08, Math.min(1, darkness));
  home.room?.traverse?.(obj => {
    if (!obj.isLight) return;
    if (obj.userData._tapeBaseIntensity == null) {
      obj.userData._tapeBaseIntensity = obj.intensity;
    }
    obj.intensity = obj.userData._tapeBaseIntensity * mul;
  });
}

/**
 * @param {object} opts
 * @param {import('three').Scene} opts.scene
 * @param {import('three').PerspectiveCamera} opts.camera
 * @param {import('three').WebGLRenderer} opts.renderer
 * @param {() => object} opts.createMemoryBlack
 * @param {object} opts.director
 * @param {() => object} opts.createSceneDirector
 * @param {boolean} [opts.reduced]
 * @param {boolean} [opts.initialSoundOn] Match game SOUND: ON when entering from camcorder.
 */
export async function startBlackDragonTape01({
  scene,
  camera,
  renderer,
  createMemoryBlack,
  director,
  createSceneDirector,
  reduced = false,
  initialSoundOn = false,
}) {
  const cfg = { ...BLACK_DRAGON_01 };
  const experience = document.getElementById('experience');
  experience?.classList.add('tape-mode');
  experience?.setAttribute('data-tape', 'black-dragon-01');

  document.getElementById('intro')?.classList.add('is-hidden');
  document.getElementById('topbar')?.classList.add('active');
  document.getElementById('bottom')?.classList.remove('active');
  document.getElementById('composure')?.classList.remove('is-active');
  document.getElementById('composure')?.setAttribute('aria-hidden', 'true');
  document.getElementById('inventory')?.setAttribute('aria-hidden', 'true');
  document.getElementById('narrative')?.classList.remove('active');
  const location = document.getElementById('location');
  if (location) location.innerHTML = 'TAPE <span class="separator">/</span> BLACK-DRAGON-01';

  director.dispose();
  const tapeDirector = createSceneDirector();
  const home = createMemoryBlack(scene);
  // Force living-room phase (hide staging foyer).
  home.syncPhase({
    phase: 'memory',
    dragonTaken: false,
    remoteMoved: true,
  });
  dimApartmentLights(home, cfg.darkness);
  if (scene.fog) {
    scene.fog.density = cfg.fogDensity;
    scene.fog.color?.setHex?.(0x121820);
  }
  scene.background?.setHex?.(0x121820);

  tapeDirector.add('memory-black', {
    update(progress, state, dt, red) {
      home.update(progress, {
        phase: 'memory',
        dragonTaken: false,
        remoteMoved: true,
      }, dt, red);
      // syncPhase resets fog; keep the tape's darker read.
      if (scene.fog) {
        scene.fog.density = cfg.fogDensity;
        scene.fog.color?.setHex?.(0x121820);
      }
      scene.background?.setHex?.(0x121820);
    },
    reset() { home.reset?.(); },
    dispose() { home.dispose?.(); },
  });
  tapeDirector.activate('memory-black');

  // Waiting Thing outside the window — GLB loads here at boot (not on reveal).
  // Hidden until armed just before the second glance; GPU warmed so show isn't a hitch.
  const creature = await createTapeCreature(WINDOW_CREATURE);
  creature.setGaze(0.35);
  scene.add(creature.root);
  creature.setVisible(false);
  let windowLooking = false;
  let windowVisits = 0;
  let creatureRevealed = false;
  /** Seconds: arm silhouette while looking away (p5), before the p6 window pan. */
  const CREATURE_ARM_AT = 12.5;

  const audio = createBlackDragonTapeAudio({
    knockLevel: cfg.knockLevel,
    knockInterval: cfg.knockInterval,
    knockCount: cfg.knockCount,
  });
  const chrome = mountTapeChrome();
  const tcEl = chrome.querySelector('[data-tape-tc]');
  const soundBtn = chrome.querySelector('[data-tape-sound]');
  const syncSoundUi = (on) => {
    if (!soundBtn) return;
    soundBtn.textContent = `SOUND: ${on ? 'ON' : 'OFF'}`;
    soundBtn.setAttribute('aria-pressed', String(on));
  };
  if (initialSoundOn) {
    await audio.setEnabled(true);
    syncSoundUi(true);
  } else {
    syncSoundUi(false);
  }
  soundBtn?.addEventListener('click', async () => {
    const on = await audio.setEnabled(!audio.enabled);
    syncSoundUi(on);
  });

  // Debug inspector — playback / darkness / knock only.
  const inspector = document.createElement('aside');
  inspector.setAttribute('aria-label', 'Black Dragon tape controls');
  inspector.style.cssText = [
    'position:fixed', 'right:16px', 'top:76px', 'z-index:9999',
    'width:230px', 'padding:12px 14px', 'border:1px solid #4a657077',
    'background:#080e12ed', 'color:#c2d2d8', 'font:12px/1.5 monospace',
    'border-radius:5px', 'pointer-events:auto',
  ].join(';');
  const title = document.createElement('div');
  title.textContent = 'BLACK-DRAGON-01 / TAPE';
  title.style.cssText = 'font-weight:bold;letter-spacing:0.06em;margin-bottom:10px';
  inspector.appendChild(title);

  const addSlider = (label, get, set, min, max, step) => {
    const row = document.createElement('label');
    row.style.cssText = 'display:block;margin:0 0 10px';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('output');
    value.textContent = Number(get()).toFixed(2);
    head.append(name, value);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(get());
    slider.style.cssText = 'display:block;width:100%;accent-color:#7897a6';
    slider.addEventListener('input', () => {
      set(Number(slider.value));
      value.textContent = Number(slider.value).toFixed(2);
    });
    row.append(head, slider);
    inspector.appendChild(row);
  };

  let paused = false;
  let playbackRate = 1;
  addSlider('DARKNESS', () => cfg.darkness, v => {
    cfg.darkness = v;
    dimApartmentLights(home, cfg.darkness);
  }, 0.12, 1, 0.01);
  addSlider('KNOCK LEVEL', () => audio.config.knockLevel, v => {
    audio.config.knockLevel = v;
    cfg.knockLevel = v;
  }, 0.05, 0.6, 0.01);
  addSlider('KNOCK SPEED', () => audio.config.knockInterval, v => {
    audio.config.knockInterval = v;
    cfg.knockInterval = v;
  }, 0.04, 0.16, 0.002);
  addSlider('PLAYBACK', () => playbackRate, v => { playbackRate = v; }, 0.25, 1.5, 0.05);

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.textContent = 'PAUSE';
  pauseBtn.style.cssText = 'margin-top:4px;width:100%;padding:6px;background:#132028;border:1px solid #4a6570;color:#c2d2d8;cursor:pointer';
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'RESUME' : 'PAUSE';
    void audio.unlock();
  });
  inspector.appendChild(pauseBtn);
  const note = document.createElement('small');
  note.textContent = 'Debug tape only · apartment geometry reused';
  note.style.cssText = 'display:block;margin-top:10px;opacity:0.7';
  inspector.appendChild(note);
  experience?.appendChild(inspector);

  const baseFov = camera.fov;
  let elapsed = 0;
  let finished = false;
  let knockAPlayed = false;
  let knockBPlayed = false;
  let gaspPlayed = false;
  let footSide = 1;
  let footAccum = 0;
  let lastPose = samplePath(0, cfg);

  camera.rotation.order = 'YXZ';
  applyPose(camera, lastPose, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 });
  camera.fov = reduced ? baseFov : baseFov - 1.5;
  camera.updateProjectionMatrix();
  // First-draw hitch lives here at boot (under tape chrome), not mid-pan at the window.
  creature.warmGpu(renderer, scene, camera);
  creature.setVisible(false);
  renderer.render(scene, camera);

  console.info('[Behind. TAPE] black-dragon-01 ready · memory-home black variant');
  console.info('[Behind. TAPE] Tune via __tapeBlackDragon.cfg / inspector sliders.');

  if (typeof window !== 'undefined') {
    window.__tapeBlackDragon = {
      cfg,
      audio,
      creature,
      windowCreature: { ...WINDOW_CREATURE.position, height: WINDOW_CREATURE.height, yaw: WINDOW_CREATURE.yaw },
      seek(t) {
        elapsed = Math.max(0, Number(t) || 0);
        finished = false;
        knockAPlayed = elapsed >= cfg.knockA;
        knockBPlayed = elapsed >= cfg.knockB;
        gaspPlayed = elapsed >= cfg.knockB + 0.5;
        // Approximate window-visit state after a seek (2nd glance begins ~14.5s).
        windowLooking = isLookingAtWindow(samplePath(elapsed, cfg));
        windowVisits = elapsed >= 14.5 ? 2 : (elapsed >= 2.5 ? 1 : 0);
        creatureRevealed = windowVisits >= 2;
        creature.setVisible(creatureRevealed || elapsed >= CREATURE_ARM_AT);
      },
      pause: () => { paused = true; },
      resume: () => { paused = false; void audio.unlock(); },
    };
    window.__tapeCamera = camera;
    window.__tapeCreature = creature;
  }

  return {
    id: 'black-dragon-01',
    duration: cfg.duration,
    get elapsed() { return elapsed; },
    get finished() { return finished; },
    update(dt) {
      void audio.unlock();
      if (paused) {
        if (tcEl) tcEl.textContent = formatTimecode(elapsed);
        return;
      }

      if (finished) {
        elapsed += dt * playbackRate;
        if (tcEl) tcEl.textContent = formatTimecode(Math.min(elapsed, cfg.duration));
        return;
      }

      elapsed += dt * playbackRate;
      const t = Math.min(elapsed, cfg.duration);
      const mode = pathMode(t, cfg);
      const pose = samplePath(t, cfg);
      const shake = handheld(t, mode, reduced);

      // Footsteps while moving — distance-based so pace tracks the path.
      if (!reduced && (mode === 'search' || mode === 'flee')) {
        const dist = Math.hypot(pose.x - lastPose.x, pose.z - lastPose.z);
        footAccum += dist;
        const stride = mode === 'flee' ? 0.52 : 0.78;
        while (footAccum >= stride) {
          audio.playFootstep(footSide);
          footSide *= -1;
          footAccum -= stride;
        }
      } else {
        footAccum = 0;
      }
      lastPose = pose;

      if (mode === 'freeze' || mode === 'stare' || mode === 'snap') {
        audio.setBreath(0.22);
      } else if (mode === 'startle') {
        if (!gaspPlayed) {
          audio.setBreath(0.95, true);
          gaspPlayed = true;
        }
      } else if (mode === 'flee') {
        audio.setBreath(0.85);
      } else {
        audio.setBreath(0.55 + Math.sin(t * 1.3) * 0.12);
      }

      applyPose(camera, pose, shake);

      // Arm while the look is still away from the window so the pan never pays first-draw.
      if (!creatureRevealed && t >= CREATURE_ARM_AT) {
        creature.setVisible(true);
      }

      const onWindow = isLookingAtWindow(pose);
      if (onWindow && !windowLooking) {
        windowVisits += 1;
        if (!creatureRevealed && windowVisits >= 2) {
          creature.setVisible(true);
          creatureRevealed = true;
        }
      }
      windowLooking = onWindow;
      creature.update(dt, camera);

      // Keep the listener at the camera, facing the look target so door knocks spatialize.
      const forward = {
        x: (pose.look?.x ?? pose.x) - camera.position.x,
        y: (pose.look?.y ?? pose.y) - camera.position.y,
        z: (pose.look?.z ?? pose.z) - camera.position.z,
      };
      const fl = Math.hypot(forward.x, forward.y, forward.z) || 1;
      forward.x /= fl; forward.y /= fl; forward.z /= fl;
      audio.setListener(camera.position, forward);

      if (!knockAPlayed && t >= cfg.knockA) {
        audio.playKnockSequence(DOOR, camera.position, 0, {
          count: cfg.knockACount,
          interval: cfg.knockAInterval,
        });
        knockAPlayed = true;
      }
      if (!knockBPlayed && t >= cfg.knockB) {
        audio.playKnockSequence(DOOR, camera.position);
        knockBPlayed = true;
      }

      if (!reduced) {
        const fovWobble = Math.sin(t * 0.65) * 0.25;
        camera.fov = baseFov - 1.5 + fovWobble + (mode === 'startle' ? 1.2 : 0);
        camera.updateProjectionMatrix();
      }

      tapeDirector.update(0.55, {}, dt, reduced);

      if (typeof window !== 'undefined') {
        window.__tapeDebug = {
          t: Number(t.toFixed(2)),
          mode,
          knockAPlayed,
          knockBPlayed,
          cam: {
            x: Number(camera.position.x.toFixed(2)),
            y: Number(camera.position.y.toFixed(2)),
            z: Number(camera.position.z.toFixed(2)),
          },
        };
      }

      if (tcEl) tcEl.textContent = formatTimecode(t);
      if (elapsed >= cfg.duration) finished = true;
    },
    dispose() {
      creature.root.removeFromParent();
      creature.dispose();
      audio.dispose();
      chrome.remove();
      inspector.remove();
      if (typeof window !== 'undefined') {
        delete window.__tapeBlackDragon;
        delete window.__tapeCamera;
        delete window.__tapeCreature;
        delete window.__tapeDebug;
      }
      experience?.classList.remove('tape-mode');
      experience?.removeAttribute('data-tape');
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      tapeDirector.dispose();
    },
  };
}
