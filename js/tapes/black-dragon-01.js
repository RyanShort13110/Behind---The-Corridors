import { createBlackDragonTapeAudio } from './black-dragon-audio.js?v=bd-1';

/**
 * Debug-only found-footage prototype: Black Dragon apartment tape 01.
 * Scripted handheld pass through the existing black memory-home mesh.
 * Does not touch chapter progression, STEADY, inventory, or Office tapes.
 *
 * Timeline (~38s):
 *  0–22s   frantic search / escape through the dark apartment
 * 22–27s   first rapid polite knock → freeze → slow turn to door
 * 27–32s   face door → second knock → startle
 * 32–38s   sprint deeper into the apartment → hard cut
 */

/** Tunable tape knobs (also exposed live via __tapeBlackDragon). */
export const BLACK_DRAGON_01 = {
  duration: 38,
  knockA: 22.0,
  knockB: 27.55,
  knockCount: 7,
  /** ~4–5× faster than a polite ~0.28s knock spacing. */
  knockInterval: 0.062,
  knockLevel: 0.24,
  /** Multiply memory-home lights (lower = darker). */
  darkness: 0.38,
  fogDensity: 0.028,
  eyeHeight: 1.52,
};

const DOOR = { x: 0, y: 1.15, z: -11.28 };

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
  // Double back through living room, check TV wall / shelves.
  const p6 = { x: -0.9, y, z: -4.8, look: { x: -2.7, y: 1.2, z: -1.9 } };
  const p7 = { x: -0.2, y, z: -2.8, look: { x: 2.4, y: 1.35, z: -2.5 } };
  const p8 = { x: 0.55, y, z: -5.0, look: { x: 0.2, y: 1.35, z: -9.5 } };
  // Moving hall-ward when the first knock freezes them.
  const freeze = { x: 0.12, y, z: -7.05, look: { x: 1.1, y: 1.25, z: -5.2 } };
  const turned = { x: 0.08, y, z: -7.15, look: { ...doorAim } };
  const stare = { x: 0.05, y: y - 0.02, z: -7.35, look: { ...doorAim } };
  // Startle: stumble back into the room.
  const startle = { x: 0.25, y: y + 0.04, z: -6.55, look: { x: 0.15, y: 1.5, z: -11.0 } };
  // Sprint deeper into the living room (away from door / toward +Z couch side).
  const fleeA = { x: 0.6, y, z: -4.2, look: { x: 1.5, y: 1.3, z: -1.5 } };
  const fleeB = { x: 1.1, y: y + 0.05, z: -2.1, look: { x: 2.0, y: 1.2, z: 0.2 } };

  if (t < 3.2) return lerpPose(p0, p1, t / 3.2, clamp01);
  if (t < 6.0) return lerpPose(p1, p2, (t - 3.2) / 2.8, clamp01);
  if (t < 9.0) return lerpPose(p2, p3, (t - 6.0) / 3.0, clamp01);
  if (t < 11.5) return lerpPose(p3, p4, (t - 9.0) / 2.5, clamp01);
  if (t < 13.5) return lerpPose(p4, p5, (t - 11.5) / 2.0);
  if (t < 16.2) return lerpPose(p5, p6, (t - 13.5) / 2.7, clamp01);
  if (t < 18.8) return lerpPose(p6, p7, (t - 16.2) / 2.6, clamp01);
  if (t < 21.4) return lerpPose(p7, p8, (t - 18.8) / 2.6, clamp01);
  if (t < cfg.knockA) return lerpPose(p8, freeze, (t - 21.4) / Math.max(0.01, cfg.knockA - 21.4), clamp01);

  // Freeze on first knock, then slow turn to the door.
  if (t < cfg.knockA + 1.15) return { ...freeze };
  if (t < cfg.knockA + 3.4) {
    return lerpPose(freeze, turned, (t - (cfg.knockA + 1.15)) / 2.25);
  }
  if (t < cfg.knockB) return lerpPose(turned, stare, (t - (cfg.knockA + 3.4)) / Math.max(0.01, cfg.knockB - (cfg.knockA + 3.4)));

  // Brief hold on door, then startle after second knock lands.
  if (t < cfg.knockB + 0.55) return { ...stare };
  if (t < cfg.knockB + 1.35) return lerpPose(stare, startle, (t - (cfg.knockB + 0.55)) / 0.8);
  if (t < 33.2) return lerpPose(startle, fleeA, (t - (cfg.knockB + 1.35)) / Math.max(0.01, 33.2 - (cfg.knockB + 1.35)), clamp01);
  if (t < cfg.duration) return lerpPose(fleeA, fleeB, (t - 33.2) / Math.max(0.01, cfg.duration - 33.2), clamp01);
  return { ...fleeB };
}

function pathMode(t, cfg) {
  if (t < cfg.knockA) return 'search';
  if (t < cfg.knockA + 1.15) return 'freeze';
  if (t < cfg.knockB) return 'listen';
  if (t < cfg.knockB + 0.55) return 'stare';
  if (t < cfg.knockB + 1.35) return 'startle';
  return 'flee';
}

function handheld(t, mode, reduced) {
  if (reduced) return { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };
  const amp =
    mode === 'search' ? 1.15
      : mode === 'freeze' ? 0.18
        : mode === 'listen' ? 0.28
          : mode === 'stare' ? 0.22
            : mode === 'startle' ? 2.4
              : 2.2;
  const breath = Math.sin(t * 1.55);
  const tremor = Math.sin(t * 13.1) * 0.32 + Math.sin(t * 19.4) * 0.18;
  const sway = Math.sin(t * 2.15 + 0.4);
  return {
    x: (breath * 0.014 + tremor * 0.005 + sway * 0.01) * amp,
    y: (Math.sin(t * 2.35) * 0.012 + tremor * 0.004) * amp,
    z: Math.sin(t * 1.7 + 0.9) * 0.008 * amp,
    yaw: (breath * 0.01 + tremor * 0.007 + sway * 0.008) * amp,
    pitch: (Math.sin(t * 1.85) * 0.008 + tremor * 0.005) * amp,
    roll: (Math.sin(t * 1.25) * 0.014 + tremor * 0.008) * amp,
  };
}

function mountTapeChrome() {
  const overlay = document.createElement('div');
  overlay.className = 'tape-overlay tape-overlay--quiet';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <div class="tape-overlay__scanlines"></div>
    <div class="tape-overlay__vignette"></div>
    <div class="tape-overlay__hud">
      <span class="tape-overlay__rec">● REC</span>
      <span class="tape-overlay__label">TAPE / BLACK-DRAGON-01</span>
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
 */
export async function startBlackDragonTape01({
  scene,
  camera,
  renderer,
  createMemoryBlack,
  director,
  createSceneDirector,
  reduced = false,
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

  const audio = createBlackDragonTapeAudio({
    knockLevel: cfg.knockLevel,
    knockInterval: cfg.knockInterval,
    knockCount: cfg.knockCount,
  });
  void audio.unlock();
  audio.startBreath();

  const chrome = mountTapeChrome();
  const tcEl = chrome.querySelector('[data-tape-tc]');

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
  renderer.render(scene, camera);

  console.info('[Behind. TAPE] black-dragon-01 ready · memory-home black variant');
  console.info('[Behind. TAPE] Tune via __tapeBlackDragon.cfg / inspector sliders.');

  if (typeof window !== 'undefined') {
    window.__tapeBlackDragon = {
      cfg,
      audio,
      seek(t) {
        elapsed = Math.max(0, Number(t) || 0);
        finished = false;
        knockAPlayed = elapsed >= cfg.knockA;
        knockBPlayed = elapsed >= cfg.knockB;
        gaspPlayed = elapsed >= cfg.knockB + 0.55;
      },
      pause: () => { paused = true; },
      resume: () => { paused = false; void audio.unlock(); },
    };
    window.__tapeCamera = camera;
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

      if (mode === 'freeze' || mode === 'listen' || mode === 'stare') {
        audio.setBreath(0.25);
      } else if (mode === 'startle') {
        if (!gaspPlayed) {
          audio.setBreath(0.9, true);
          gaspPlayed = true;
        }
      } else if (mode === 'flee') {
        audio.setBreath(0.85);
      } else {
        audio.setBreath(0.55 + Math.sin(t * 1.3) * 0.12);
      }

      if (!knockAPlayed && t >= cfg.knockA) {
        audio.setListener(camera.position);
        audio.playKnockSequence(DOOR, camera.position);
        knockAPlayed = true;
      }
      if (!knockBPlayed && t >= cfg.knockB) {
        audio.setListener(camera.position);
        audio.playKnockSequence(DOOR, camera.position);
        knockBPlayed = true;
      }

      applyPose(camera, pose, shake);
      audio.setListener(camera.position);

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
      audio.dispose();
      chrome.remove();
      inspector.remove();
      if (typeof window !== 'undefined') {
        delete window.__tapeBlackDragon;
        delete window.__tapeCamera;
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
