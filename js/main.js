import * as THREE from 'three';
import { createCorridor } from './scene.js';
import { createElevator } from './elevator.js';
import { createSceneDirector } from './scene-manager.js';
import { createStory, START_PROGRESS, DEAD_END_PROGRESS, corridorMinProgress } from './story.js';
import { createAudioDirector } from './audio.js';
import { createPerformanceMonitor } from './performance.js';
import { createInteractionSystem } from './interaction.js';
import { createLookControls } from './look.js';
import { createOfficeStory, officeNarrative, OFFICE_METERS, OFFICE_START_Z, OFFICE_EXIT_PROGRESS } from './levels/office-story.js';
import { officeCameraPose } from './levels/office-route.js';
import { createRecordsStory, recordsNarrative, RECORDS_METERS, RECORDS_START_Z, RECORDS_PHOTO_LOOK_START, RECORDS_PHOTO_LOOK_END } from './levels/records-story.js';
import { recordsCameraPose } from './levels/records-route.js';
import { createNightStory, nightNarrative, NIGHT_METERS, NIGHT_START_Z, NIGHT_END_PROGRESS } from './levels/night-story.js';
import { createThresholdStory, thresholdNarrative, THRESHOLD_METERS, THRESHOLD_START_Z, THRESHOLD_END_PROGRESS } from './levels/threshold-story.js';
import { createUnseenStory, unseenNarrative, UNSEEN_METERS, UNSEEN_START_Z, UNSEEN_BARRIER_PROGRESS, UNSEEN_EXIT_PROGRESS } from './levels/unseen-story.js';
import { unseenCameraPose } from './levels/unseen-route.js';

/**
 * Behind. — Level 01 / 001.8: The Second Pass.
 * UP explores the corridor; DOWN retraces the journey and eventually carries
 * the visitor backward into an elevator that was behind them all along.
 */
const $ = id => document.getElementById(id);
const DEBUG_MODE = new URLSearchParams(location.search).get('debug') === '1';
if (DEBUG_MODE) document.body.classList.add('debug-performance');
const el = {
  intro: $('intro'), begin: $('begin'), topbar: $('topbar'), bottom: $('bottom'),
  progress: $('progress-fill'), instruction: $('instruction'), narrative: $('narrative'),
  chapter: $('chapter'), line: $('line'), ending: $('ending'), restart: $('restart'),
  quality: $('quality'), motion: $('motion'), sound: $('sound'), fallback: $('fallback'),
  perf: $('perf'), retreatPrompt: $('unseen-retreat-prompt'),
  veil: $('chapter-veil'), location: $('location'),
  continue: $('continue'), endingEyebrow: $('ending-eyebrow'),
  endingTitle: $('ending-title'), endingCopy: $('ending-copy'),
  inspect: $('inspect'), inspectTitle: $('inspect-title'),
  inspectBody: $('inspect-body'), inspectClose: $('inspect-close'),
};

// Mapping 0 => camera inside the rear cabin, .09 => original corridor start,
// 1 => far dead end. Keeping native scroll allows keyboard/trackpad controls.
const CORRIDOR_METERS = 50;
const REAR_CABIN_CAMERA_Z = 6;
const MAX_WALK_SPEED = 5.5;
const SCROLL_LEAD_SECONDS = 0.35;
const MAX_SCROLL_LEAD = MAX_WALK_SPEED * SCROLL_LEAD_SECONDS / CORRIDOR_METERS;
const clamp = v => Math.max(0, Math.min(1, v));
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const story = createStory();
const officeStory = createOfficeStory();
const recordsStory = createRecordsStory();
const nightStory = createNightStory();
const thresholdStory = createThresholdStory();
const unseenStory = createUnseenStory();
const audio = createAudioDirector();
let reduced = reduceQuery.matches;
let quality = 'auto';
let started = false;
let progress = START_PROGRESS;
let displayed = START_PROGRESS;
let activeBeat = -1;
let ended = false;
let renderer, camera, scene, director, monitor, interaction, look;
let lastTime = performance.now();
let scrollTrigger = null;
let chapterId = 'corridor';
let transitioning = false;
let devChapterUI = null;
// Chapter memory persists across scene disposal (proximity != confirmed observation).
const memory = { chaptersCompleted: [], lighterEncountered: false, photographPassed: false, extraStepHeard: false, keyPassed: false };
const ORIGINAL_LOCATION_HTML = 'NORTH WING <span class="separator">/</span> LEVEL 13';

// Sparse forward thoughts — ordinary, then wrong, then the breathing.
// Fewer lines leave space for the corridor to do the work.
const beats = [
  { to: 0.40, ch: '01 — THE CORRIDOR', line: 'The building should be empty.' },
  { to: 0.74, ch: '01 — THE CORRIDOR', line: 'Further than you meant to go.' },
  { to: 1.01, ch: '01 — THE CORRIDOR', line: 'Breathing. Close.' },
];

// Return pass: only what changes. Thresholds descend with the backtrack.
const returnBeats = [
  { min: 0.55, line: 'The breathing stopped.' },
  { min: 0.20, line: 'That door was closed.' },
];

function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
function scrollYFor(p) { return (1 - p) * maxScroll(); }
function nativeProgress() { return clamp(1 - window.scrollY / Math.max(1, maxScroll())); }

function resize() {
  if (!renderer) return;
  const dpr = window.devicePixelRatio || 1;
  const baseRatio = quality === 'low' ? 1
    : quality === 'high' ? Math.min(dpr, 1.75)
    : Math.min(dpr, innerWidth < 800 ? 1.1 : 1.35);
  renderer.setPixelRatio(Math.max(0.65, baseRatio * (monitor?.scale ?? 1)));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

/**
 * Per-chapter walk bounds. min blocks scrolling into void behind the start;
 * max is used for hard barriers (e.g. The Unseen). New levels should plug in
 * here (or via a story helper like corridorMinProgress).
 */
function progressBounds() {
  if (chapterId === 'corridor') {
    return { min: corridorMinProgress(story.state), max: 1 };
  }
  if (chapterId === 'unseen') {
    return { min: 0, max: UNSEEN_BARRIER_PROGRESS };
  }
  return { min: 0, max: 1 };
}

function setProgress(requested) {
  const raw = clamp(requested);
  const { min, max } = progressBounds();
  const bounded = THREE.MathUtils.clamp(raw, min, max);
  const meters = chapterId === 'corridor' ? CORRIDOR_METERS
    : chapterId === 'office' ? OFFICE_METERS
    : chapterId === 'records' ? RECORDS_METERS
    : chapterId === 'night' ? NIGHT_METERS
      : chapterId === 'threshold' ? THRESHOLD_METERS : UNSEEN_METERS;
  const lead = MAX_WALK_SPEED * SCROLL_LEAD_SECONDS / meters;
  const limited = THREE.MathUtils.clamp(
    bounded,
    clamp(displayed - lead),
    clamp(displayed + lead)
  );
  const next = THREE.MathUtils.clamp(limited, min, max);
  progress = next;
  if (Math.abs(raw - next) > 0.0005) {
    // Discard excessive scroll momentum / void overscroll.
    window.scrollTo({ top: scrollYFor(next), behavior: 'instant' });
  }
}

try {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  $('viewport').appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, 1, 0.07, 65);
  camera.position.set(0, 1.7, REAR_CABIN_CAMERA_Z - START_PROGRESS * CORRIDOR_METERS);
  director = createSceneDirector();
  director.add('corridor', createCorridor(scene));
  director.add('elevator', createElevator(scene));
  director.activate('corridor');
  interaction = createInteractionSystem({
    camera,
    canvas: renderer.domElement,
    panel: el.inspect,
    titleEl: el.inspectTitle,
    bodyEl: el.inspectBody,
    closeEl: el.inspectClose,
    onInspect: id => audio.playInteract(id),
  });
  look = createLookControls({ canvas: renderer.domElement });
  bindCorridorInteractables();
  monitor = createPerformanceMonitor(renderer, resize, () => quality, el.perf);
  resize();
  window.addEventListener('resize', resize, { passive: true });
} catch (err) {
  console.error('[Behind.] Initialization failed:', err);
  el.fallback.hidden = false;
  el.fallback.textContent = `Unable to start the 3D experience. ${err.message || 'See console for details.'}`;
  el.begin.disabled = true;
}

function bindCorridorInteractables() {
  interaction?.clear();
  if (!director || !scene) return;
  const modules = [director.get('corridor'), director.get('elevator')];
  for (const module of modules) {
    for (const spec of module?.interactables || []) {
      interaction.register({ ...spec, sceneRoot: scene });
    }
  }
}

function start() {
  if (started || !renderer || !director) return;
  started = true;
  el.intro.classList.add('is-hidden');
  el.topbar.classList.add('active');
  el.bottom.classList.add('active');
  // Start slightly above the document bottom; space below becomes the final
  // backward movement into the hidden rear elevator.
  progress = displayed = START_PROGRESS;
  window.scrollTo({ top: scrollYFor(START_PROGRESS), behavior: 'instant' });
  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    scrollTrigger = window.ScrollTrigger.create({
      trigger: '#scroll-space', start: 'top top', end: 'bottom bottom',
      onUpdate: self => setProgress(1 - self.progress),
    });
    window.ScrollTrigger.refresh();
  }
  console.info('[Behind.] 001.8 started · 5.5 m/s · sound 0.065 · return-pass narration');
}

function setEndCard(which) {
  if (which === 'corridor') {
    el.endingEyebrow.textContent = 'LEVEL 01 COMPLETE · THE CORRIDOR';
    el.endingTitle.innerHTML = 'IT WAS<br>BEHIND YOU.';
    el.endingCopy.textContent = 'The doors have closed in front of you.';
    el.continue.textContent = 'CONTINUE INTO THE OFFICE ↑';
    el.continue.hidden = false;
  } else if (which === 'office') {
    el.endingEyebrow.textContent = 'LEVEL 02 COMPLETE · THE OFFICE';
    el.endingTitle.innerHTML = 'A DIFFERENT<br>WAY THROUGH.';
    el.endingCopy.textContent = 'The service passage leads toward Records.';
    el.continue.textContent = 'CONTINUE INTO THE RECORDS ↑';
    el.continue.hidden = false;
  } else if (which === 'records') {
    el.endingEyebrow.textContent = 'LEVEL 03 COMPLETE · THE RECORDS';
    el.endingTitle.innerHTML = 'END OF<br>THE ROW.';
    el.endingCopy.textContent = 'The doorway ahead opens onto another wing.';
    el.continue.textContent = 'CONTINUE INTO THE NIGHT SHIFT ↑';
    el.continue.hidden = false;
  } else if (which === 'night') {
    el.endingEyebrow.textContent = 'LEVEL 04 COMPLETE · THE NIGHT SHIFT';
    el.endingTitle.innerHTML = 'ONE MORE<br>STEP.';
    el.endingCopy.textContent = 'The last door is open. There is somewhere else to go.';
    el.continue.textContent = 'CONTINUE INTO THE THRESHOLD ↑';
    el.continue.hidden = false;
  } else if (which === 'threshold') {
    el.endingEyebrow.textContent = 'LEVEL 05 COMPLETE · THE THRESHOLD';
    el.endingTitle.innerHTML = 'THE WALLS<br>ARE STILL.';
    el.endingCopy.textContent = 'The walls fall quiet. A maintenance passage waits ahead.';
    el.continue.textContent = 'CONTINUE INTO THE UNSEEN ↑';
    el.continue.hidden = false;
  } else {
    el.endingEyebrow.textContent = 'LEVEL 06 COMPLETE · THE UNSEEN';
    el.endingTitle.innerHTML = 'IT WAS<br>RIGHT THERE.';
    el.endingCopy.textContent = 'The access passage is silent. For now.';
    el.continue.hidden = true;
  }
}

function showEndCard(which) {
  ended = true;
  const id = which === 'corridor' ? '01' : which === 'office' ? '02' : which === 'records' ? '03' : which === 'night' ? '04' : which === 'threshold' ? '05' : '06';
  if (!memory.chaptersCompleted.includes(id)) memory.chaptersCompleted.push(id);
  setEndCard(which);
  el.ending.classList.add('is-visible');
  el.ending.setAttribute('aria-hidden', 'false');
}

function hideEndCard() {
  ended = false;
  el.ending.classList.remove('is-visible');
  el.ending.setAttribute('aria-hidden', 'true');
}

function reset() {
  // This is a whole-experience restart, not simply a position reset.
  // If we are in the office, reconstruct the original corridor modules.
  if (transitioning) return;
  if (chapterId !== 'corridor') {
    director?.dispose();
    director = createSceneDirector();
    director.add('corridor', createCorridor(scene));
    director.add('elevator', createElevator(scene));
    director.activate('corridor');
    chapterId = 'corridor';
    el.location.innerHTML = ORIGINAL_LOCATION_HTML;
  } else {
    director?.reset();
  }
  bindCorridorInteractables();
  look?.reset();
  story.reset();
  officeStory.reset();
  recordsStory.reset();
  nightStory.reset();
  thresholdStory.reset();
  unseenStory.reset();
  memory.chaptersCompleted.length = 0;
  memory.lighterEncountered = false;
  memory.photographPassed = false;
  memory.extraStepHeard = false;
  memory.keyPassed = false;
  audio.reset();
  hideEndCard();
  activeBeat = -1;
  progress = displayed = START_PROGRESS;
  camera.position.set(0, 1.7, REAR_CABIN_CAMERA_Z - START_PROGRESS * CORRIDOR_METERS);
  camera.rotation.set(0, 0, 0);
  window.scrollTo({ top: scrollYFor(START_PROGRESS), behavior: 'instant' });
  scrollTrigger?.update();
  monitor?.reset();
}

async function enterOffice() {
  if (!ended || chapterId !== 'corridor' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  // All scene and camera reconfiguration happens during full occlusion.
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  try {
    const { createOffice } = await import('./levels/office.js');
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('office', createOffice(scene));
    director.activate('office');
    chapterId = 'office';
    officeStory.reset();
    audio.enterOffice();
    hideEndCard();
    el.location.textContent = 'EAST ANNEX / OFFICE FLOOR';
    progress = displayed = 0;
    camera.position.set(0, 1.7, OFFICE_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    activeBeat = -1;
    lastTime = performance.now();
    console.info('[Behind.] Level 02 entered · retained 5.5 m/s cap');
    // Render the new floor once before uncovering the viewport.
    renderer.render(scene, camera);
  } catch (error) {
    console.error('[Behind.] Office transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Office could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * The Office's far door leads directly into the Records. Keep the frame
 * covered while the previous floor is unloaded; do not create a second
 * renderer, canvas or scroll-controller.
 */
async function enterRecords() {
  if (!ended || chapterId !== 'office' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createRecords } = await import('./levels/records.js');
    module = createRecords(scene);
    // Build succeeds before discarding the polished office.
    director.dispose();
    director = createSceneDirector();
    director.add('records', module);
    director.activate('records');
    chapterId = 'records';
    recordsStory.reset();
    audio.enterRecords();
    hideEndCard();
    el.location.textContent = 'EAST ANNEX / RECORDS';
    progress = displayed = 0;
    camera.position.set(0, 1.7, RECORDS_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    activeBeat = -1;
    lastTime = performance.now();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 03 entered · 5.5 m/s cap · no forced return');
  } catch (error) {
    // If construction failed while the office was still present, discard only
    // the new module and keep the player's current chapter state available.
    if (chapterId === 'office') module?.dispose?.();
    console.error('[Behind.] Records transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Records could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Records -> Night Shift: one renderer, one camera, previous floor disposed
 * only after the new environment constructs successfully.
 */
async function enterNightShift() {
  if (!ended || chapterId !== 'records' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createNightShift } = await import('./levels/night.js');
    module = createNightShift(scene);
    director.dispose();
    director = createSceneDirector();
    director.add('night', module);
    director.activate('night');
    chapterId = 'night';
    nightStory.reset();
    audio.enterNight();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / NIGHT STAFF';
    progress = displayed = 0;
    camera.position.set(0, 1.7, NIGHT_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    activeBeat = -1;
    lastTime = performance.now();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 04 entered · no jump scares · 5.5 m/s cap');
  } catch (error) {
    if (chapterId === 'records') module?.dispose?.();
    console.error('[Behind.] Night Shift transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Night Shift could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Night Shift -> Threshold. The occluding veil conceals chapter resource swaps;
 * the freestanding door belongs to Level 05, not the previous scene.
 */
async function enterThreshold() {
  if (!ended || chapterId !== 'night' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createThreshold } = await import('./levels/threshold.js');
    module = createThreshold(scene);
    director.dispose();
    director = createSceneDirector();
    director.add('threshold', module);
    director.activate('threshold');
    chapterId = 'threshold';
    thresholdStory.reset();
    audio.enterThreshold();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / THE THRESHOLD';
    progress = displayed = 0;
    camera.position.set(0, 1.7, THRESHOLD_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    activeBeat = -1;
    lastTime = performance.now();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 05 entered · 5.5 m/s max · procedural corruption');
  } catch (error) {
    if (chapterId === 'night') module?.dispose?.();
    console.error('[Behind.] Threshold transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Threshold could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Threshold -> The Unseen. The previous organic world is disposed before
 * revealing an almost completely ordinary maintenance corridor.
 */
async function enterUnseen() {
  if (!ended || chapterId !== 'threshold' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createUnseen } = await import('./levels/unseen.js');
    module = createUnseen(scene);
    director.dispose();
    director = createSceneDirector();
    director.add('unseen', module);
    director.activate('unseen');
    chapterId = 'unseen';
    unseenStory.reset();
    audio.enterUnseen();
    hideEndCard();
    el.location.textContent = 'SERVICE LEVEL / MAINTENANCE';
    progress = displayed = 0;
    camera.position.set(0, 1.7, UNSEEN_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    activeBeat = -1;
    lastTime = performance.now();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 06 entered · listen ahead / reverse to side exit');
  } catch (error) {
    if (chapterId === 'threshold') module?.dispose?.();
    console.error('[Behind.] The Unseen transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Unseen could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Development-only chapter travel (activated by ?debug=1).
 * It NEVER runs for ordinary players, never writes a checkpoint, and does not
 * bypass the normal walk-speed limit once a chapter starts.
 *
 * Separate from continueChapter(): those transitions require legitimate
 * completion; this deliberately creates a FRESH chapter for testing.
 */
const DEV_CHAPTER_CONFIG = {
  corridor:  { start: START_PROGRESS, z: REAR_CABIN_CAMERA_Z, location: ORIGINAL_LOCATION_HTML },
  office:    { start: 0, z: OFFICE_START_Z, location: 'EAST ANNEX / OFFICE FLOOR' },
  records:   { start: 0, z: RECORDS_START_Z, location: 'EAST ANNEX / RECORDS' },
  night:     { start: 0, z: NIGHT_START_Z, location: 'SOUTH WING / NIGHT STAFF' },
  threshold: { start: 0, z: THRESHOLD_START_Z, location: 'SOUTH WING / THE THRESHOLD' },
  unseen:    { start: 0, z: UNSEEN_START_Z, location: 'SERVICE LEVEL / MAINTENANCE' },
};

async function debugJumpToChapter(target, checkpoint = 'start') {
  if (!DEBUG_MODE || transitioning || !renderer || !director || !DEV_CHAPTER_CONFIG[target]) return false;
  transitioning = true;
  const previousBackground = scene.background;
  const previousFog = scene.fog;
  let next = null;
  try {
    if (!started) start(); // Establish the same native scroll/ScrollTrigger inputs as normal play.
    // Instantly cover the old scene; avoid the 0.68-second production fade.
    el.veil.classList.add('dev-jump', 'is-active');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Construct the next floor before disposing the currently working one.
    // Only one world is actively rendered and retained after the swap.
    next = createSceneDirector();
    interaction?.clear();
    look?.reset();
    if (target === 'corridor') {
      next.add('corridor', createCorridor(scene));
      next.add('elevator', createElevator(scene));
    } else if (target === 'office') {
      const { createOffice } = await import('./levels/office.js');
      next.add('office', createOffice(scene));
    } else if (target === 'records') {
      const { createRecords } = await import('./levels/records.js');
      next.add('records', createRecords(scene));
    } else if (target === 'night') {
      const { createNightShift } = await import('./levels/night.js');
      next.add('night', createNightShift(scene));
    } else if (target === 'threshold') {
      const { createThreshold } = await import('./levels/threshold.js');
      next.add('threshold', createThreshold(scene));
    } else {
      const { createUnseen } = await import('./levels/unseen.js');
      next.add('unseen', createUnseen(scene));
    }
    next.activate(target);
    director.dispose();
    director = next;
    next = null; // Ownership was transferred to the active director.
    chapterId = target;
    if (target === 'corridor') bindCorridorInteractables();

    // Fresh chapter means no artificially unlocked doors, footsteps, or clues.
    story.reset();
    officeStory.reset();
    recordsStory.reset();
    nightStory.reset();
    thresholdStory.reset();
    unseenStory.reset();
    memory.chaptersCompleted.length = 0;
    memory.lighterEncountered = false;
    memory.photographPassed = false;
    memory.extraStepHeard = false;
    memory.keyPassed = false;
    audio.reset();
    if (target === 'office') audio.enterOffice();
    else if (target === 'records') audio.enterRecords();
    else if (target === 'night') audio.enterNight();
    else if (target === 'threshold') audio.enterThreshold();
    else if (target === 'unseen') audio.enterUnseen();

    hideEndCard();
    activeBeat = -1;
    el.location.innerHTML = DEV_CHAPTER_CONFIG[target].location;
    progress = displayed = target === 'unseen'
      ? unseenStory.seekCheckpoint(checkpoint) : DEV_CHAPTER_CONFIG[target].start;
    camera.position.set(0, 1.7, DEV_CHAPTER_CONFIG[target].z -
      (target === 'corridor' ? progress * CORRIDOR_METERS : 0));
    camera.rotation.set(0, 0, 0);
    if (target === 'unseen') {
      const pose = unseenCameraPose(progress, unseenStory.state);
      camera.position.set(pose.x, 1.7, pose.z);
      camera.rotation.set(pose.pitch, pose.yaw, 0);
    }
    window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    monitor?.reset();
    director.update(progress,
      target === 'corridor' ? story.state : target === 'office' ? officeStory.state
        : target === 'records' ? recordsStory.state : target === 'night' ? nightStory.state
          : target === 'threshold' ? thresholdStory.state : unseenStory.state, 0, true);
    updateNarrative(progress);
    renderer.render(scene, camera);
    console.info(`[Behind. DEV] Jumped to ${target}. Chapter state reset; normal controls retained.`);
    return true;
  } catch (error) {
    // If scene construction fails, preserve the previously active environment.
    next?.dispose();
    if (chapterId !== target || next) {
      scene.background = previousBackground;
      scene.fog = previousFog;
    }
    console.error('[Behind. DEV] Chapter jump failed:', error);
    throw error;
  } finally {
    transitioning = false;
    el.veil.classList.remove('dev-jump', 'is-active');
  }
}

function continueChapter() {
  if (chapterId === 'corridor') return enterOffice();
  if (chapterId === 'office') return enterRecords();
  if (chapterId === 'records') return enterNightShift();
  if (chapterId === 'night') return enterThreshold();
  if (chapterId === 'threshold') return enterUnseen();
}

// Load the small developer UI ONLY when explicitly requested via ?debug=1.
// ?debug=1&level=05 also loads Level 05 directly for bookmarked testing.
if (DEBUG_MODE) {
  import('./dev-chapters.js').then(({ mountDevChapters }) => {
    devChapterUI = mountDevChapters(debugJumpToChapter, () => chapterId);
  }).catch(error => console.warn('[Behind. DEV] Unable to mount chapter selector:', error));
}

el.begin.addEventListener('click', start);
el.restart.addEventListener('click', reset);
el.continue.addEventListener('click', continueChapter);
el.quality.addEventListener('click', () => {
  quality = quality === 'auto' ? 'low' : quality === 'low' ? 'high' : 'auto';
  el.quality.textContent = `QUALITY: ${quality.toUpperCase()}`;
  resize();
});
el.motion.textContent = `MOTION: ${reduced ? 'REDUCED' : 'ON'}`;
el.motion.addEventListener('click', () => {
  reduced = !reduced;
  el.motion.textContent = `MOTION: ${reduced ? 'REDUCED' : 'ON'}`;
});
el.sound.addEventListener('click', async () => {
  const enabled = await audio.toggle();
  el.sound.textContent = `SOUND: ${enabled ? 'ON' : 'OFF'}`;
  el.sound.setAttribute('aria-pressed', String(enabled));
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.suspend();
  else { lastTime = performance.now(); audio.resume(); }
});

function narrativeFor(p, state) {
  const beatIndex = beats.findIndex(item => p < item.to);
  const beat = beats[beatIndex];
  let chapter = beat.ch;
  let line = beat.line;
  let instruction = 'SCROLL UP TO CONTINUE ↑';

  // Dead-end prompt: the first elevator stays shut and teaches backtracking.
  if (state.reachedDeadEnd && p > 0.85) {
    chapter = '01 — DEAD END';
    line = 'Sealed. There’s nothing ahead.';
    instruction = 'SCROLL DOWN TO RETRACE YOUR STEPS ↓';
  } else if (state.rearElevatorUnlocked && p <= 0.16) {
    // Preserve the surprise elevator behind the original starting position.
    chapter = '01 — BEHIND YOU';
    if (p > START_PROGRESS) line = 'Something opens behind you.';
    else line = 'The doors close in front of you.';
    instruction = 'KEEP SCROLLING DOWN ↓';
  } else if (state.hasBacktracked) {
    chapter = '01 — THE RETURN';
    const returnBeat = returnBeats.find(item => p >= item.min);
    if (returnBeat) line = returnBeat.line;
    instruction = p < 0.32 ? 'KEEP SCROLLING DOWN ↓' : 'SCROLL DOWN TO RETURN ↓';
  }
  return { beatIndex, chapter, line, instruction };
}

function updateNarrative(p) {
  const inCorridor = chapterId === 'corridor';
  const inOffice = chapterId === 'office';
  const inRecords = chapterId === 'records';
  const inNight = chapterId === 'night';
  const inThreshold = chapterId === 'threshold';
  const state = inCorridor ? story.state
    : inOffice ? officeStory.state : inRecords ? recordsStory.state
      : inNight ? nightStory.state
        : inThreshold ? thresholdStory.state : unseenStory.state;
  const narrative = inCorridor ? narrativeFor(p, state)
    : inOffice ? officeNarrative(p, state)
      : inRecords ? recordsNarrative(p, state)
        : inNight ? nightNarrative(p, state)
          : inThreshold ? thresholdNarrative(p, state) : unseenNarrative(p, state);
  if (narrative.chapter !== el.chapter.textContent || (inCorridor && narrative.beatIndex !== activeBeat)) {
    activeBeat = narrative.beatIndex ?? -1;
    el.chapter.textContent = narrative.chapter;
  }
  if (el.line.textContent !== narrative.line) el.line.textContent = narrative.line;
  let instruction = narrative.instruction;
  if (inCorridor && interaction?.nearest && !interaction.isOpen && !ended) {
    instruction = 'CLICK TO INSPECT · A / D OR SWIPE TO LOOK';
  }
  if (el.instruction.textContent !== instruction) el.instruction.textContent = instruction;
  const show = inCorridor
    ? (p > 0.055 && p < 0.955) || (state.reachedDeadEnd && p > 0.955) || (state.rearElevatorUnlocked && p <= 0.055)
    : inOffice
      ? Boolean(narrative.line.trim()) && p > 0.045 && p < 0.994
      : Boolean(narrative.line.trim()) && p > 0.045 && p < 0.999;
  el.narrative.classList.toggle('active', show && !ended);
  // At the first sustained drag, cue the mandatory reverse control clearly.
  // The one-shot instruction vanishes once retreat begins; it cannot pop back
  // up when the user briefly scrolls forward again.
  const promptRetreat = chapterId === 'unseen' && state.reachedBarrier &&
    !state.retreatStarted && !ended;
  el.retreatPrompt.classList.toggle('is-visible', promptRetreat);
  el.retreatPrompt.setAttribute('aria-hidden', String(!promptRetreat));
  el.progress.style.width = `${Math.round(p * 100)}%`;

  if (inCorridor) {
    const doorsClosed = (director.get('elevator')?.closureProgress ?? 0) > 0.96;
    const complete = state.enteredRearElevator && p <= 0.008 && doorsClosed;
    if (complete && !ended) showEndCard('corridor');
    else if (p > 0.027 && ended) hideEndCard();
  } else if (inOffice) {
    memory.lighterEncountered ||= state.lighterPassed;
    if (state.completed && !ended) showEndCard('office');
    else if (p < OFFICE_EXIT_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inRecords) {
    memory.photographPassed ||= state.photoPassed;
    if (state.completed && !ended) showEndCard('records');
    else if (p < 0.94 && ended) hideEndCard();
  } else if (inNight) {
    memory.extraStepHeard ||= state.footstepHeard;
    if (state.completed && p >= NIGHT_END_PROGRESS && !ended) showEndCard('night');
    else if (p < NIGHT_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inThreshold) {
    memory.keyPassed ||= state.reachedKey;
    if (state.completed && p >= THRESHOLD_END_PROGRESS && !ended) showEndCard('threshold');
    else if (p < THRESHOLD_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else {
    if (state.completed && p <= UNSEEN_EXIT_PROGRESS && !ended) showEndCard('unseen');
    else if (p > 0.037 && ended) hideEndCard();
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!renderer) return;
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (document.hidden) return;

  if (started && !transitioning && !(ended && chapterId === 'office')) {
    setProgress(nativeProgress());
    const previousDisplayed = displayed;
    const eased = (progress - displayed) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
    const meters = chapterId === 'corridor' ? CORRIDOR_METERS
      : chapterId === 'office' ? OFFICE_METERS
        : chapterId === 'records' ? RECORDS_METERS
          : chapterId === 'night' ? NIGHT_METERS
            : chapterId === 'threshold' ? THRESHOLD_METERS : UNSEEN_METERS;
    const startZ = chapterId === 'corridor' ? REAR_CABIN_CAMERA_Z
      : chapterId === 'office' ? OFFICE_START_Z
        : chapterId === 'records' ? RECORDS_START_Z
          : chapterId === 'night' ? NIGHT_START_Z
            : chapterId === 'threshold' ? THRESHOLD_START_Z : UNSEEN_START_Z;
    // The camera arcs toward the photo briefly. Ease physical walking speed
    // through this bend so combined X/Z travel does not exceed 5.5 m/s.
    const viewingPhoto = chapterId === 'records' &&
      displayed >= RECORDS_PHOTO_LOOK_START - 0.01 &&
      displayed <= RECORDS_PHOTO_LOOK_END + 0.01;
    const step = (viewingPhoto ? 4.95 : MAX_WALK_SPEED) * dt / meters;
    displayed = clamp(displayed + THREE.MathUtils.clamp(eased, -step, step));
    const bounds = progressBounds();
    displayed = THREE.MathUtils.clamp(displayed, bounds.min, bounds.max);
    const p = displayed;
    if (chapterId === 'corridor') story.observe(previousDisplayed, p);
    else if (chapterId === 'office') {
      const previouslyTriggered = officeStory.state.soundTriggered;
      officeStory.observe(previousDisplayed, p, dt);
      // A one-shot mechanical latch, never replayed at this progress value.
      // Even with sound disabled, the on-screen description fires normally.
      if (!previouslyTriggered && officeStory.state.soundTriggered) {
        audio.playOfficeLatch();
      }
    } else if (chapterId === 'records') {
      recordsStory.observe(previousDisplayed, p);
    } else if (chapterId === 'night') {
      const previousStepCount = nightStory.state.footstepCount;
      nightStory.observe(previousDisplayed, p, dt);
      // A step event is emitted by story state ONLY when the player moves or
      // once after stopping. Nothing is queued past the near-exit silence.
      if (nightStory.state.footstepCount > previousStepCount) {
        audio.playNightStep(nightStory.state.followPace, nightStory.state.footstepReason);
      }
    } else if (chapterId === 'threshold') {
      thresholdStory.observe(previousDisplayed, p);
    } else {
      unseenStory.observe(previousDisplayed, p, dt);
    }

    // Always face down the corridor. During the return, positive Z motion
    // backs the camera through the rear elevator entrance without a turn.
    camera.position.z = startZ - p * meters;
    camera.position.x = reduced ? 0 : Math.sin(p * 26) * 0.025;
    camera.position.y = 1.7 + (reduced ? 0 : Math.sin(p * 65) * 0.012);
    camera.rotation.set(
      reduced ? 0 : Math.sin(p * 6) * 0.009,
      reduced ? 0 : Math.sin(p * 5) * 0.012,
      0
    );
    if (chapterId === 'office') {
      const route = officeCameraPose(p, officeStory.state.secondApproachStarted);
      camera.position.x += route.x;
      camera.position.z = route.z;
      camera.rotation.y += route.yaw;
    } else if (chapterId === 'records') {
      const route = recordsCameraPose(p);
      camera.position.x += route.x;
      camera.position.z = route.z;
      camera.rotation.y += route.yaw;
      camera.rotation.x += route.pitch;
    } else if (chapterId === 'unseen') {
      const route = unseenCameraPose(p, unseenStory.state);
      camera.position.x += route.x;
      camera.position.z = route.z;
      camera.rotation.y += route.yaw;
      camera.rotation.x += route.pitch;
    }

    const canInteract = chapterId === 'corridor' && !ended && !transitioning;
    look?.noteWalk(p - previousDisplayed);
    look?.setEnabled(canInteract && !interaction?.isOpen);
    camera.rotation.y += look?.update(dt, reduced) ?? 0;
    interaction?.update(dt, canInteract && !interaction?.isOpen);

    if (chapterId === 'corridor') {
      director.update(p, story.state, dt, reduced);
      const elev = director.get('elevator');
      audio.update(p, reduced, story.state, {
        openAmount: elev?.openAmount ?? 0,
        closureProgress: elev?.closureProgress ?? 0,
      });
    } else if (chapterId === 'office') {
      director.update(p, officeStory.state, dt, reduced);
      audio.updateOffice(p, officeStory.state);
    } else if (chapterId === 'records') {
      director.update(p, recordsStory.state, dt, reduced);
      audio.updateRecords(p, recordsStory.state);
    } else if (chapterId === 'night') {
      director.update(p, nightStory.state, dt, reduced);
      audio.updateNight(p, nightStory.state);
    } else if (chapterId === 'threshold') {
      director.update(p, thresholdStory.state, dt, reduced);
      audio.updateThreshold(p, thresholdStory.state);
    } else {
      director.update(p, unseenStory.state, dt, reduced);
      audio.updateUnseen(p, unseenStory.state, camera);
    }
    updateNarrative(p);
  }
  renderer.render(scene, camera);
  devChapterUI?.sync(chapterId);
  monitor?.update(dt, started, !document.hidden);
}
requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  scrollTrigger?.kill();
  audio.dispose();
  interaction?.dispose();
  look?.dispose();
  director?.dispose();
  renderer?.dispose();
}, { once: true });
