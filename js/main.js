import * as THREE from 'three';
import { createCorridor } from './scene.js?v=cam-1';
import { createElevator } from './elevator.js';
import { createSceneDirector } from './scene-manager.js';
import { createStory, START_PROGRESS, DEAD_END_PROGRESS, corridorMinProgress } from './story.js?v=cascade-early-1';
import { createAudioDirector } from './audio.js?v=cam-1';
import { createPerformanceMonitor } from './performance.js';
import { createInteractionSystem } from './interaction.js?v=cam-1';
import { createLookControls } from './look.js';
import { createInventory } from './inventory.js';
import { createKeypad } from './keypad.js';
import { drawStuffedDragonPreview } from './props/stuffed-dragon.js';
import { drawVhsCCamcorderPreview } from './props/vhs-c-camcorder.js?v=cam-1';
import { drawVhsCCassettePreview } from './props/vhs-c-cassette.js?v=cam-1';
import {
  TAPE_LIBRARY,
  CAMCORDER_ITEM_ID,
  listCollectedTapes,
  isTapeItemId,
  debugTapeUrl,
  tapeInventoryMeta,
  camcorderInventoryMeta,
  getTapeById,
} from './tapes/library.js?v=cam-1';
import {
  createComposure, COMPOSURE_MAX, CIGARETTE_RESTORE, COMPOSURE_HITS,
  CIGARETTE_TOOLTIP, CIGARETTE_FLAVOR, cigaretteEffectLine, fillCopyWithEffect,
  CIGARETTE_LABEL, COMPOSURE_CONFIG, STEADY_ENCOUNTERS,
  composureStage,
} from './composure.js?v=steady-expand-1';
import { createSteadySystem } from './steady.js';
import { createCigaretteFx } from './cigarette-fx.js?v=cig-breath-1';
import { createCheckpointStore } from './checkpoint.js';
import { createOfficeStory, officeNarrative, OFFICE_METERS, OFFICE_START_Z, OFFICE_EXIT_PROGRESS } from './levels/office-story.js?v=chair-spook-3';
import { officeCameraPose } from './levels/office-route.js';
import {
  createRecordsStory, recordsNarrative, RECORDS_METERS, RECORDS_START_Z,
  RECORDS_DOOR_HOLD,
} from './levels/records-story.js?v=fob-reach-1';
import { recordsCameraPose } from './levels/records-route.js';
import { createNightStory, nightNarrative, NIGHT_METERS, NIGHT_START_Z, NIGHT_END_PROGRESS } from './levels/night-story.js';
import { createThresholdStory, thresholdNarrative, THRESHOLD_METERS, THRESHOLD_START_Z, THRESHOLD_END_PROGRESS } from './levels/threshold-story.js?v=steady-expand-1';
import { createUnseenStory, unseenNarrative, UNSEEN_METERS, UNSEEN_START_Z, UNSEEN_BARRIER_PROGRESS, UNSEEN_EXIT_PROGRESS } from './levels/unseen-story.js?v=steady-expand-1';
import { unseenCameraPose } from './levels/unseen-route.js';
import {
  createMemoryWhiteStory, createMemoryBlackStory,
  memoryHomeNarrative,
  MEMORY_STAGING_METERS, MEMORY_STAGING_START_Z, MEMORY_ROOM_METERS,
} from './levels/memory-home-story.js';
import { memoryHomeCameraPose } from './levels/memory-home-route.js';
import {
  createHospitalReverseStory,
  hospitalReverseNarrative,
  hospitalReverseMaxProgress,
  hospitalReverseMinProgress,
  HOSPITAL_REVERSE_METERS,
  HOSPITAL_REVERSE_START_Z,
} from './levels/hospital-reverse-story.js';
import { hospitalReverseCameraPose } from './levels/hospital-reverse-route.js';

/**
 * Behind. — Level 01 / 001.8: The Second Pass.
 * UP explores the corridor; DOWN retraces the journey and eventually carries
 * the visitor backward into an elevator that was behind them all along.
 */
const $ = id => document.getElementById(id);
const urlParams = new URLSearchParams(location.search);
const DEBUG_MODE = urlParams.get('debug') === '1';
/** Debug-only found-footage tapes. Requires ?debug=1&tape=<id>. */
const TAPE_ID = DEBUG_MODE ? urlParams.get('tape') : null;
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
  inspectAction: $('inspect-action'), inventory: $('inventory'),
  itemDetail: $('item-detail'), itemDetailClose: $('item-detail-close'),
  itemDetailCanvas: $('item-detail-canvas'), itemDetailTitle: $('item-detail-title'),
  itemDetailBody: $('item-detail-body'), itemDetailUse: $('item-detail-use'),
  itemDetailTapes: $('item-detail-tapes'), itemDetailTapeList: $('item-detail-tape-list'),
  itemDetailTapeEmpty: $('item-detail-tape-empty'), itemDetailTapeNote: $('item-detail-tape-note'),
  composure: $('composure'), composureFill: $('composure-fill'),
  experience: $('experience'),
  keypad: $('keypad'), keypadClose: $('keypad-close'),
  keypadDisplay: $('keypad-display'), keypadGrid: $('keypad-grid'),
  steady: $('steady'), steadyCue: $('steady-cue'),
  steadyPrompt: $('steady-prompt'), steadyHint: $('steady-hint'),
  steadyBar: $('steady-bar'), steadyMarker: $('steady-marker'),
  steadyZonePartial: $('steady-zone-partial'),
  steadyZonePerfect: $('steady-zone-perfect'),
  steadyLegend: $('steady-legend'),
  steadyTap: $('steady-tap'),
  gameOver: $('game-over'), gameOverRetry: $('game-over-retry'),
  gameOverRestart: $('game-over-restart'),
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
const memoryWhiteStory = createMemoryWhiteStory();
const memoryBlackStory = createMemoryBlackStory();
const hospitalReverseStory = createHospitalReverseStory();
const audio = createAudioDirector();
const composure = createComposure();
const composureHits = new Set();
const checkpoints = createCheckpointStore();
let steady = null;
let gameOverActive = false;
let gameOverBusy = false;
let reduced = reduceQuery.matches;
let quality = 'auto';
let started = false;
/** Active found-footage tape session (null during normal play). */
let tapeSession = null;
/** Checkpoint snapshot to restore after camcorder LCD playback ends. */
let camcorderResumeSnapshot = null;
let camcorderReturning = false;
let progress = START_PROGRESS;
let displayed = START_PROGRESS;
let ended = false;
let renderer, camera, scene, director, monitor, interaction, look, inventory, keypad;
let cigaretteFx = createCigaretteFx();
let memoryEnterTimer = 0;
let lastTime = performance.now();
let scrollTrigger = null;
let chapterId = 'corridor';
let transitioning = false;

const isMemoryChapter = (id = chapterId) => id === 'memory-white' || id === 'memory-black';
const isHospitalReverse = (id = chapterId) => id === 'hospital-reverse';
const memoryStoryFor = (id = chapterId) =>
  (id === 'memory-black' ? memoryBlackStory : memoryWhiteStory);
const memoryDragonId = (id = chapterId) =>
  (id === 'memory-black' ? 'memory-black-dragon' : 'memory-white-dragon');
const memoryItemId = (id = chapterId) =>
  (id === 'memory-black' ? 'stuffed-dragon-black' : 'stuffed-dragon-white');
const memoryItemLabel = (id = chapterId) =>
  (id === 'memory-black' ? 'BLACK DRAGON' : 'WHITE DRAGON');
const memoryPreviewColor = (id = chapterId) =>
  (id === 'memory-black' ? 0x0a0c0a : 0xf2f0ea);
// Own walk-key state so Up/W can keep moving while Left/Right look
// (browser key-repeat only fires the last key, which kills native scroll).
const walkKeys = { forward: false, back: false };
let devChapterUI = null;
// Chapter memory persists across scene disposal (proximity != confirmed observation).
const memory = {
  chaptersCompleted: [],
  lighterEncountered: false,
  keyFobEncountered: false,
  photographPassed: false,
  extraStepHeard: false,
  keyPassed: false,
};
const ORIGINAL_LOCATION_HTML = 'NORTH WING <span class="separator">/</span> LEVEL 13';

// Dialogue Revision 002: one-shot thoughts, never held by scroll position.
const BRIEF_DIALOGUE_SECONDS = 2.6;
let briefChapter = '';
let briefLine = '';
let briefRemaining = 0;
const briefSeen = new Set();

function resetBriefDialogue() {
  briefChapter = '';
  briefLine = '';
  briefRemaining = 0;
  briefSeen.clear();
}

function showBriefDialogue(chapter, candidate, dt = 0) {
  if (briefChapter !== chapter) {
    resetBriefDialogue();
    briefChapter = chapter;
  }
  if (candidate && !briefSeen.has(candidate)) {
    briefSeen.add(candidate);
    briefLine = candidate;
    briefRemaining = BRIEF_DIALOGUE_SECONDS;
  }
  const visible = briefRemaining > 0 ? briefLine : '';
  briefRemaining = Math.max(0, briefRemaining - Math.max(0, dt));
  return visible;
}

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
    // Once sealed in the rear cabin, block walking back into the hall.
    const max = story.state.enteredRearElevator ? 0.022 : 1;
    return { min: corridorMinProgress(story.state), max };
  }
  if (chapterId === 'unseen') {
    return { min: 0, max: UNSEEN_BARRIER_PROGRESS };
  }
  if (chapterId === 'records' && !recordsStory.state.doorUnlocked) {
    return { min: 0, max: RECORDS_DOOR_HOLD };
  }
  if (isHospitalReverse()) {
    return {
      min: hospitalReverseMinProgress(hospitalReverseStory.state),
      max: hospitalReverseMaxProgress(hospitalReverseStory.state),
    };
  }
  return { min: 0, max: 1 };
}

/** Active rail length for walk-speed / scroll-lead. Bedroom uses its own meters. */
function chapterMeters() {
  if (chapterId === 'corridor') return CORRIDOR_METERS;
  if (chapterId === 'office') return OFFICE_METERS;
  if (chapterId === 'records') return RECORDS_METERS;
  if (chapterId === 'night') return NIGHT_METERS;
  if (chapterId === 'threshold') return THRESHOLD_METERS;
  if (isMemoryChapter()) {
    return memoryStoryFor().state.phase === 'memory'
      ? MEMORY_ROOM_METERS
      : MEMORY_STAGING_METERS;
  }
  if (isHospitalReverse()) return HOSPITAL_REVERSE_METERS;
  return UNSEEN_METERS;
}

function setProgress(requested) {
  const raw = clamp(requested);
  const { min, max } = progressBounds();
  const bounded = THREE.MathUtils.clamp(raw, min, max);
  const meters = chapterMeters();
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
  inventory = createInventory({
    onChange: items => renderInventory(items),
  });
  interaction = createInteractionSystem({
    camera,
    canvas: renderer.domElement,
    panel: el.inspect,
    titleEl: el.inspectTitle,
    bodyEl: el.inspectBody,
    closeEl: el.inspectClose,
    actionEl: el.inspectAction,
    inventory,
    onInspect: id => {
      audio.playInteract(id);
      if (id === 'office-lighter') {
        officeStory.state.lighterInspected = true;
        memory.lighterEncountered = true;
      } else if (id === 'office-key-fob') {
        officeStory.state.keyFobInspected = true;
        memory.keyFobEncountered = true;
      } else if (id === 'records-polaroid') {
        recordsStory.inspectPolaroid();
        memory.photographPassed = true;
        // Inspect does NOT damage composure — proximity beat already did.
      } else if (id === 'altered-door') {
        // Damage comes from noticing the environmental discrepancy, not inspect.
      } else if (id === 'memory-mugs' && isMemoryChapter()) {
        memoryStoryFor().markMugsInspected();
      } else if (id === 'memory-front-door' && chapterId === 'memory-white'
          && memoryWhiteStory.state.exitReady) {
        void exitMemoryChapter();
      } else if (id === 'memory-window' && chapterId === 'memory-black'
          && memoryBlackStory.state.exitReady) {
        void exitMemoryChapter();
      } else if (id === 'ward-end-button' && isHospitalReverse()) {
        const result = hospitalReverseStory.tryEndDoor();
        audio.playWardDoorFail();
        if (result.line) {
          hospitalReverseStory.state.caption = result.line;
          hospitalReverseStory.state.captionUntil = 2.4;
        }
      } else if (id === 'ward-side-button' && isHospitalReverse()) {
        const result = hospitalReverseStory.trySideDoor(progress);
        if (result.ok) {
          audio.playWardDoorOpen();
          bindChapterInteractables();
        } else {
          audio.playWardDoorButton();
        }
      }
    },
    onTake: (itemId, entryId) => {
      audio.playInteract(itemId);
      if (entryId === 'office-sticky-note') officeStory.state.stickyTaken = true;
      if (entryId === 'office-key-fob') {
        officeStory.takeKeyFob();
        memory.keyFobEncountered = true;
      }
      if (entryId === 'cigarette-hospital-reverse') {
        hospitalReverseStory.state.cigaretteTaken = true;
      }
      if (entryId === 'memory-white-dragon' || entryId === 'memory-black-dragon') {
        memoryStoryFor().takeDragon();
        // Soft recollection beat, then fade into the living room.
        window.clearTimeout(memoryEnterTimer);
        memoryEnterTimer = window.setTimeout(() => { void enterMemoryChapter(); }, 2100);
      }
    },
    onUse: (_itemId, targetId) => {
      if (targetId === 'locked-doorknob') {
        audio.playUnlock();
        director.get('corridor')?.openLockedDoor?.();
        return;
      }
      if (targetId === 'records-fob-reader') {
        recordsStory.unlockDoor();
        audio.playRecordsFobAccess();
        // Keep the fob; door swing is driven by story state in records.update.
      }
    },
    onKeypad: () => {
      interaction?.close();
      closeItemDetail();
      keypad?.open();
      audio.playInteract('office-keypad');
    },
  });
  keypad = createKeypad({
    root: el.keypad,
    displayEl: el.keypadDisplay,
    gridEl: el.keypadGrid,
    closeEl: el.keypadClose,
    getExpectedCode: () => officeStory.state.keypadCode,
    onDigit: () => audio.playInteract('keypad-digit'),
    onClear: () => audio.playInteract('keypad-clear'),
    onWrong: () => audio.playInteract('keypad-wrong'),
    onSuccess: () => {
      officeStory.unlockKeypad();
      inventory?.remove('sticky-note');
      closeItemDetail();
      audio.playUnlock();
    },
  });
  look = createLookControls({ canvas: renderer.domElement });
  steady = createSteadySystem({
    root: el.steady,
    cueEl: el.steadyCue,
    promptEl: el.steadyPrompt,
    hintEl: el.steadyHint,
    barEl: el.steadyBar,
    markerEl: el.steadyMarker,
    partialZoneEl: el.steadyZonePartial,
    perfectZoneEl: el.steadyZonePerfect,
    legendEl: el.steadyLegend,
    buttonEl: el.steadyTap,
    onResolve: onSteadyResolved,
    isBlocked: () => gameOverActive || transitioning || ended
      || interaction?.isOpen || keypad?.isOpen
      || el.itemDetail?.classList.contains('is-open'),
  });
  bindChapterInteractables();
  monitor = createPerformanceMonitor(renderer, resize, () => quality, el.perf);
  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (TAPE_ID) void bootDebugTape(TAPE_ID);
} catch (err) {
  console.error('[Behind.] Initialization failed:', err);
  el.fallback.hidden = false;
  el.fallback.textContent = `Unable to start the 3D experience. ${err.message || 'See console for details.'}`;
  el.begin.disabled = true;
}

/**
 * Start a scripted found-footage recording. Used by ?debug=1&tape= and by the
 * camcorder LCD. Suspends chapter gameplay for the duration of the tape.
 */
async function startTapeRecording(id, { fromCamcorder = false } = {}) {
  if (!renderer || !scene || !camera || !director || tapeSession || transitioning) return false;
  const known = id === 'office-01' || id === 'black-dragon-01';
  if (!known) {
    console.warn(`[Behind. TAPE] Unknown tape id "${id}". Use tape=office-01 or tape=black-dragon-01.`);
    return false;
  }
  transitioning = true;
  try {
    el.begin.disabled = true;
    el.intro?.classList.add('is-hidden');
    el.veil?.classList.add('is-active');
    look?.setEnabled?.(false);
    interaction?.close?.();
    interaction?.clear?.();
    closeItemDetail();
    steady?.cancel?.(true);
    keypad?.close?.();

    if (id === 'office-01') {
      const { createOffice } = await import('./levels/office.js?v=cam-2');
      const { startOfficeTape01 } = await import('./tapes/office-01.js?v=bd-warm-1');
      tapeSession = await startOfficeTape01({
        scene,
        camera,
        renderer,
        createOffice,
        director,
        createSceneDirector,
        audio,
        reduced,
      });
      chapterId = 'tape-office-01';
    } else {
      const { createMemoryBlack } = await import('./levels/memory-black.js?v=bd-tape-1');
      const { startBlackDragonTape01 } = await import('./tapes/black-dragon-01.js?v=bd-reveal-7');
      tapeSession = await startBlackDragonTape01({
        scene,
        camera,
        renderer,
        createMemoryBlack,
        director,
        createSceneDirector,
        reduced,
      });
      chapterId = 'tape-black-dragon-01';
    }

    director = null; // tape owns its own director; block normal chapter jumps from stomping
    started = true;
    el.experience?.classList.add('is-playing', 'tape-mode');
    el.topbar?.classList.add('active');
    noteFogBase();
    console.info(
      `[Behind. TAPE] Playing ${id}${fromCamcorder ? ' (camcorder)' : ''}. Normal gameplay is suspended.`,
    );
    return true;
  } catch (error) {
    console.error('[Behind. TAPE] Boot failed:', error);
    if (!fromCamcorder) {
      el.fallback.hidden = false;
      el.fallback.textContent = `Tape "${id}" could not start: ${error.message}`;
    }
    return false;
  } finally {
    transitioning = false;
    el.veil?.classList.remove('is-active');
  }
}

/** Debug-only URL boot: `?debug=1&tape=<id>`. */
async function bootDebugTape(id) {
  if (!DEBUG_MODE) return;
  await startTapeRecording(id, { fromCamcorder: false });
}

/**
 * Load a collected cassette into the camcorder and begin playback immediately.
 * Chapter progress is snapshotted and restored when the recording ends.
 */
async function playCamcorderTape(tape) {
  if (!tape?.recordingId || !director || tapeSession || transitioning || camcorderReturning) return;
  if (!inventory?.has(CAMCORDER_ITEM_ID)) return;
  camcorderResumeSnapshot = captureCheckpointSnapshot();
  const ok = await startTapeRecording(tape.recordingId, { fromCamcorder: true });
  if (!ok) {
    camcorderResumeSnapshot = null;
    if (el.itemDetailTapeNote) {
      el.itemDetailTapeNote.hidden = false;
      el.itemDetailTapeNote.textContent = 'Could not play this cassette.';
    }
  }
}

/** Rebuild the chapter world and restore the pre-playback snapshot. */
async function endCamcorderPlayback() {
  if (!camcorderResumeSnapshot || camcorderReturning) return;
  camcorderReturning = true;
  const snap = camcorderResumeSnapshot;
  camcorderResumeSnapshot = null;
  el.veil?.classList.add('is-active');
  try {
    tapeSession?.dispose?.();
    tapeSession = null;
    el.experience?.classList.remove('tape-mode');
    el.experience?.removeAttribute('data-tape');

    const target = snap.chapterId || 'corridor';
    director = createSceneDirector();
    if (target === 'corridor') {
      director.add('corridor', createCorridor(scene));
      director.add('elevator', createElevator(scene));
      el.location.innerHTML = ORIGINAL_LOCATION_HTML;
    } else if (target === 'office') {
      const { createOffice } = await import('./levels/office.js?v=cam-2');
      director.add('office', createOffice(scene, { keypadCode: snap.office?.keypadCode || officeStory.state.keypadCode }));
      el.location.textContent = 'EAST ANNEX / OFFICE FLOOR';
    } else if (target === 'records') {
      const { createRecords } = await import('./levels/records.js?v=notice-flat-1');
      director.add('records', createRecords(scene));
      el.location.textContent = 'EAST ANNEX / RECORDS';
    } else if (target === 'night') {
      const { createNightShift } = await import('./levels/night.js?v=exit-door-1');
      director.add('night', createNightShift(scene));
      el.location.textContent = 'SOUTH WING / NIGHT STAFF';
    } else if (target === 'threshold') {
      const { createThreshold } = await import('./levels/threshold.js?v=organic-pair-2');
      director.add('threshold', createThreshold(scene));
      el.location.textContent = 'SOUTH WING / THE THRESHOLD';
    } else if (target === 'unseen') {
      const { createUnseen } = await import('./levels/unseen.js?v=steady-expand-1');
      director.add('unseen', createUnseen(scene));
      el.location.textContent = 'SERVICE LEVEL / MAINTENANCE';
    } else if (target === 'memory-white') {
      const { createMemoryWhite } = await import('./levels/memory-white.js');
      director.add('memory-white', createMemoryWhite(scene));
    } else if (target === 'memory-black') {
      const { createMemoryBlack } = await import('./levels/memory-black.js');
      director.add('memory-black', createMemoryBlack(scene));
    } else if (target === 'hospital-reverse') {
      const { createHospitalReverse } = await import('./levels/hospital-reverse.js');
      director.add('hospital-reverse', createHospitalReverse(scene));
    } else {
      director.add('corridor', createCorridor(scene));
      director.add('elevator', createElevator(scene));
    }
    director.activate(target === 'corridor' ? 'corridor' : target);
    chapterId = target;

    el.inventory?.setAttribute('aria-hidden', 'false');
    el.composure?.classList.add('is-active');
    el.composure?.setAttribute('aria-hidden', 'false');
    el.bottom?.classList.add('active');
    look?.setEnabled?.(true);
    await restoreCheckpoint(snap);
    console.info('[Behind. CAM] Returned from tape to', target);
  } catch (error) {
    console.error('[Behind. CAM] Failed to restore chapter after tape:', error);
  } finally {
    camcorderReturning = false;
    el.veil?.classList.remove('is-active');
  }
}

function bindChapterInteractables() {
  interaction?.clear();
  if (!director || !scene) return;
  const modules = chapterId === 'corridor'
    ? [director.get('corridor'), director.get('elevator')]
    : [director.get(chapterId)];
  const corridor = director.get('corridor');
  const memStory = isMemoryChapter() ? memoryStoryFor() : null;
  const dragonId = memoryDragonId();
  const chapterCig = chapterCigaretteId();
  for (const module of modules) {
    for (const spec of module?.interactables || []) {
      // One cigarette per chapter — hide pack if already carried.
      if (chapterCig && spec.id === chapterCig && inventory?.has(chapterCig)) {
        if (spec.object) {
          spec.object.visible = false;
          spec.object.userData.taken = true;
        }
        continue;
      }
      // Camcorder / tapes stay gone once collected (checkpoints restore via inventory).
      if (spec.itemId === CAMCORDER_ITEM_ID && inventory?.has(CAMCORDER_ITEM_ID)) {
        if (spec.object) {
          spec.object.visible = false;
          spec.object.userData.taken = true;
        }
        continue;
      }
      if (spec.itemId && isTapeItemId(spec.itemId) && inventory?.has(spec.itemId)) {
        if (spec.object) {
          spec.object.visible = false;
          spec.object.userData.taken = true;
        }
        continue;
      }
      // Staging-only dragon; room props only while inside memory.
      if (isMemoryChapter() && memStory) {
        const inMem = memStory.state.phase === 'memory';
        if (spec.id === dragonId && inMem) continue;
        if (spec.id !== dragonId && !inMem) continue;
        if (spec.id === dragonId && memStory.state.dragonTaken) continue;
        // Black: front door never becomes an exit target.
        if (chapterId === 'memory-black' && spec.id === 'memory-front-door') {
          // Keep inspectable; exit is via window once ready.
        }
      }
      const entry = interaction.register({ ...spec, sceneRoot: scene });
      if (spec.id === 'locked-doorknob' && corridor?.isLockedDoorOpen?.()) {
        entry.unlocked = true;
      }
      if (spec.id === 'records-fob-reader' && recordsStory.state.doorUnlocked) {
        entry.unlocked = true;
      }
      if (spec.id === dragonId && memStory?.state.dragonTaken) {
        entry.taken = true;
      }
      // Exit unlock flags for door (white) / window (black).
      if (spec.id === 'memory-front-door' && chapterId === 'memory-white') {
        entry.unlocked = Boolean(memStory?.state.exitReady);
      }
      if (spec.id === 'memory-window' && chapterId === 'memory-black') {
        entry.unlocked = Boolean(memStory?.state.exitReady);
      }
      if (spec.id === 'memory-window' && chapterId === 'memory-white') {
        entry.unlocked = false;
      }
      if (spec.id === 'memory-front-door' && chapterId === 'memory-black') {
        entry.unlocked = false;
      }
      if (spec.id === 'ward-side-button' && isHospitalReverse()) {
        entry.unlocked = Boolean(hospitalReverseStory.state.sideDoorReady);
        if (hospitalReverseStory.state.sideDoorReady) {
          entry.body = 'The pad is lit. Press to open the side doors.';
        }
        if (hospitalReverseStory.state.escapePressed) {
          entry.taken = true;
        }
      }
    }
  }
}

async function enterMemoryChapter() {
  if (!isMemoryChapter() || memoryStoryFor().state.phase === 'memory') return;
  if (transitioning) return;
  transitioning = true;
  interaction?.close();
  closeItemDetail();
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 40 : 780));
  memoryStoryFor().enterMemory();
  look?.reset();
  look?.setMaxYaw(1.25); // wide enough to face the side window
  progress = displayed = 0;
  bindChapterInteractables();
  director.get(chapterId)?.syncPhase(memoryStoryFor().state);
  const pose = memoryHomeCameraPose(0, 'memory');
  camera.position.set(pose.x, 1.55, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, 0);
  window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
  scrollTrigger?.update();
  if (chapterId === 'memory-black') audio.enterMemoryBlack();
  else audio.enterMemoryWhite();
  renderer.render(scene, camera);
  transitioning = false;
  el.veil.classList.remove('is-active');
}

async function exitMemoryChapter() {
  if (!isMemoryChapter()) return;
  if (!memoryStoryFor().beginExit()) return;
  transitioning = true;
  interaction?.close();
  closeItemDetail();
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 40 : 780));
  memoryStoryFor().finishExit();
  look?.setMaxYaw();
  look?.reset();
  bindChapterInteractables();
  director.get(chapterId)?.syncPhase(memoryStoryFor().state);
  progress = displayed = 0.62;
  camera.position.set(0, 1.7, MEMORY_STAGING_START_Z - progress * MEMORY_STAGING_METERS);
  camera.rotation.set(0, 0, 0);
  window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
  scrollTrigger?.update();
  if (chapterId === 'memory-black') audio.exitMemoryBlack();
  else audio.exitMemoryWhite();
  renderer.render(scene, camera);
  transitioning = false;
  el.veil.classList.remove('is-active');
}

function drawBrassKeyPreview(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.55);
  ctx.rotate(-0.35);
  // Soft glow
  ctx.shadowColor = 'rgba(196,160,90,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#c4a05a';
  ctx.strokeStyle = '#8a6a32';
  ctx.lineWidth = 2;
  // Bow
  ctx.beginPath();
  ctx.arc(-48, 0, 22, 0, Math.PI * 2);
  ctx.arc(-48, 0, 11, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.stroke();
  // Shaft
  ctx.fillRect(-28, -5, 78, 10);
  ctx.strokeRect(-28, -5, 78, 10);
  // Bits
  ctx.fillRect(42, 5, 8, 16);
  ctx.fillRect(54, 5, 8, 22);
  ctx.restore();
}

function drawStickyNotePreview(canvas, code = '0000') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#d6c46a';
  ctx.fillRect(w * 0.22, h * 0.12, w * 0.56, h * 0.72);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(w * 0.22, h * 0.12, w * 0.56, h * 0.1);
  ctx.fillStyle = '#2a3234';
  ctx.font = `700 ${Math.round(h * 0.16)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(code).split('').join(' '), w * 0.5, h * 0.52);
}

function drawKeyFobPreview(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.46;
  const cy = h * 0.52;
  const r = Math.min(w, h) * 0.22;
  ctx.fillStyle = '#d45a28';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.28, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a9490';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx + r * 0.95, cy - r * 0.15, r * 0.28, 0, Math.PI * 2);
  ctx.stroke();
}

function syncComposureUi(value = composure.value) {
  const stage = composureStage(value);
  const stress = 1 - value / COMPOSURE_MAX;
  document.documentElement.style.setProperty('--stress', stress.toFixed(3));
  el.experience?.setAttribute('data-stage', stage.id);
  if (el.composureFill) el.composureFill.style.width = `${Math.round(value)}%`;
  el.composure?.classList.toggle('is-unsettled', stage.id === 'unsettled');
  el.composure?.classList.toggle('is-distressed', stage.id === 'distressed');
  el.composure?.classList.toggle('is-critical', stage.id === 'critical' || stage.id === 'empty');
  audio.setComposureStress?.(stress, stage.id);
  if (scene?.fog && typeof scene.fog.density === 'number' && scene.fog.userData?.baseDensity != null) {
    const fogMul = stage.id === 'critical' ? 0.72
      : stage.id === 'distressed' ? 0.48
        : stage.id === 'unsettled' ? 0.22 : 0;
    scene.fog.density = scene.fog.userData.baseDensity * (1 + stress * fogMul);
  }
}

function pulseComposureHit(amount = 0) {
  if (!el.composure) return;
  const severity = amount >= 20 ? 'major' : amount >= 10 ? 'moderate' : 'minor';
  el.composure.classList.remove('is-hit-minor', 'is-hit-moderate', 'is-hit-major');
  // Retrigger CSS animation.
  void el.composure.offsetWidth;
  el.composure.classList.add(`is-hit-${severity}`);
  window.clearTimeout(pulseComposureHit._t);
  pulseComposureHit._t = window.setTimeout(() => {
    el.composure?.classList.remove('is-hit-minor', 'is-hit-moderate', 'is-hit-major');
  }, severity === 'major' ? 780 : severity === 'moderate' ? 520 : 320);
  if (!reduced) audio.playComposureHit?.(severity);
}

/** Delayed peak clank — cancelled on chapter leave / checkpoint restore. */
function scheduleWardClankPeak() {
  window.clearTimeout(scheduleWardClankPeak._t);
  scheduleWardClankPeak._t = window.setTimeout(() => audio.playWardClank(), 1100);
}

function cancelWardClankPeak() {
  window.clearTimeout(scheduleWardClankPeak._t);
}

function noteFogBase() {
  if (scene?.fog && typeof scene.fog.density === 'number') {
    scene.fog.userData = scene.fog.userData || {};
    scene.fog.userData.baseDensity = scene.fog.density;
  }
}

function composureHitOnce(id, amount = COMPOSURE_HITS[id]) {
  if (gameOverActive || gameOverBusy) return;
  if (!id || composureHits.has(id)) return;
  if (amount == null || amount <= 0) {
    if (amount === 0) composureHits.add(id); // resolved clean — never re-tax
    return;
  }
  composureHits.add(id);
  composure.hit(amount);
  pulseComposureHit(amount);
  if (composure.isEmpty) void triggerGameOver();
}

function markComposureHit(id) {
  if (id) composureHits.add(id);
}

function beginSteadyEncounter(id) {
  if (gameOverActive || gameOverBusy || transitioning) return false;
  if (composureHits.has(id) || !STEADY_ENCOUNTERS[id]) return false;
  if (steady?.isActive) return false;
  return steady?.begin(id) ?? false;
}

function onSteadyResolved(payload) {
  if (!payload?.id || composureHits.has(payload.id)) return;
  composureHitOnce(payload.id, payload.damage);
  if (payload.id === 'ward-crying') {
    hospitalReverseStory.markCryingResolved(payload.result);
    hospitalReverseStory.state.lastDamageNote =
      `crying:${payload.result}:${payload.damage}`;
  }
}

/** Unavoidable L01–L03 hits. STEADY encounters are started separately. */
function syncChapterComposureHits() {
  if (gameOverActive || gameOverBusy) return;
  if (chapterId === 'corridor') {
    if (story.state.breathHeard) composureHitOnce('corridor-breath');
    if (story.state.alteredDoorNoticed) composureHitOnce('corridor-altered-door');
  } else if (chapterId === 'office') {
    if (officeStory.state.phoneUnanswered) composureHitOnce('office-phone-unanswered');
    if (officeStory.state.phoneSilence) composureHitOnce('office-phone-silence');
    if (COMPOSURE_CONFIG.enableOfficeSecondAnomaly
        && officeStory.state.secondApproachAnomaly) {
      composureHitOnce('office-second-anomaly');
    }
  } else if (chapterId === 'records') {
    if (recordsStory.state.polaroidLine >= 1) composureHitOnce('records-polaroid-proximity');
    if (recordsStory.state.drawersOpeningNoticed) composureHitOnce('records-drawers-open');
    if (recordsStory.state.shadowPeekDone) composureHitOnce('records-peek');
  } else if (isHospitalReverse()) {
    if (hospitalReverseStory.state.squeakDone) {
      composureHitOnce('ward-squeak', hospitalReverseStory.state.squeakDamage);
    }
    if (hospitalReverseStory.state.proximityHit) {
      composureHitOnce('ward-proximity', hospitalReverseStory.state.proximityDamage);
    }
  } else if (COMPOSURE_CONFIG.enableLateChapterDamage) {
    if (chapterId === 'night') {
      if (nightStory.state.absenceArmed || nightStory.state.footstepHeard) {
        composureHitOnce('night-first-step');
      }
      if (nightStory.state.lampOut || nightStory.state.cadenceRisen) {
        composureHitOnce('night-cadence');
      }
      if (nightStory.state.hush || nightStory.state.footstepsStopped) {
        composureHitOnce('night-stop');
      }
    } else if (chapterId === 'threshold') {
      if (thresholdStory.state.sawFirstDamage) composureHitOnce('threshold-first-damage');
      if (thresholdStory.state.reachedOrganic) composureHitOnce('threshold-organic');
      if (thresholdStory.state.reachedRedHall) composureHitOnce('threshold-red-hall');
      if (thresholdStory.state.nightmareCleared) composureHitOnce('threshold-restore');
    } else if (chapterId === 'unseen') {
      if (unseenStory.state.reachedBarrier) composureHitOnce('unseen-barrier');
      if (unseenStory.state.cabinetOpen) composureHitOnce('unseen-cabinet');
      if (unseenStory.state.roarHeard) composureHitOnce('unseen-roar-presence');
      if (unseenStory.state.darkness) composureHitOnce('unseen-blackout');
      if (unseenStory.state.finalClick) composureHitOnce('unseen-final-click');
    }
  }
}

function preserveCarryInventory() {
  const kept = (inventory?.list() || []).filter(item =>
    String(item.id).startsWith('cigarette')
    || item.id === 'key-fob'
    || item.id === CAMCORDER_ITEM_ID
    || isTapeItemId(item.id));
  inventory?.clear();
  for (const item of kept) {
    inventory.add(item.id, {
      label: item.label,
      tooltip: item.tooltip,
      consumable: Boolean(item.consumable),
      restoreAmount: item.restoreAmount ?? CIGARETTE_RESTORE,
      previewColor: item.previewColor,
      kind: item.kind,
      recordingId: item.recordingId,
    });
  }
  renderInventory();
}

function chapterCigaretteId(id = chapterId) {
  if (id === 'corridor') return 'cigarette-corridor';
  if (id === 'office') return 'cigarette-office';
  if (id === 'records') return 'cigarette-records';
  if (id === 'night') return 'cigarette-night';
  if (id === 'threshold') return 'cigarette-threshold';
  if (id === 'unseen') return 'cigarette-unseen';
  if (id === 'hospital-reverse') return 'cigarette-hospital-reverse';
  return null;
}

function seedCompletedComposureHits() {
  const mark = (flag, id) => { if (flag) markComposureHit(id); };
  if (chapterId === 'corridor') {
    mark(story.state.breathHeard, 'corridor-breath');
    mark(story.state.alteredDoorNoticed, 'corridor-altered-door');
    mark(story.state.hallCascadeArmed, 'corridor-cascade');
  } else if (chapterId === 'office') {
    mark(officeStory.state.phoneUnanswered, 'office-phone-unanswered');
    mark(officeStory.state.phoneSilence, 'office-phone-silence');
    mark(officeStory.state.emptySeatTriggered, 'office-empty-seat');
    mark(officeStory.state.secondApproachAnomaly, 'office-second-anomaly');
  } else if (chapterId === 'records') {
    mark(recordsStory.state.polaroidLine >= 1, 'records-polaroid-proximity');
    mark(recordsStory.state.drawersOpeningNoticed, 'records-drawers-open');
    mark(recordsStory.state.shadowDartDone || recordsStory.state.shadowDartPlay, 'records-dart');
    mark(recordsStory.state.shadowPeekDone, 'records-peek');
  } else if (isHospitalReverse()) {
    mark(hospitalReverseStory.state.squeakDone, 'ward-squeak');
    mark(hospitalReverseStory.state.clankDone, 'ward-clank');
    mark(hospitalReverseStory.state.cryingDone, 'ward-crying');
    mark(hospitalReverseStory.state.proximityHit || hospitalReverseStory.state.proximitySkipped, 'ward-proximity');
  } else if (chapterId === 'threshold') {
    mark(thresholdStory.state.ruptureArmed, 'threshold-rupture');
  } else if (chapterId === 'unseen') {
    mark(unseenStory.state.darkness, 'unseen-blackout');
  }
}

function captureCheckpointSnapshot() {
  return {
    chapterId,
    progress,
    displayed,
    composure: composure.value,
    composureHits: [...composureHits],
    inventory: (inventory?.list() || []).map(item => ({
      id: item.id,
      label: item.label,
      tooltip: item.tooltip,
      consumable: Boolean(item.consumable),
      restoreAmount: item.restoreAmount ?? null,
      previewColor: item.previewColor ?? null,
      kind: item.kind ?? null,
      recordingId: item.recordingId ?? null,
    })),
    memory: { ...memory, chaptersCompleted: [...(memory.chaptersCompleted || [])] },
    story: { ...story.state },
    office: { ...officeStory.state },
    records: { ...recordsStory.state },
    hospital: { ...hospitalReverseStory.state },
    threshold: { ...thresholdStory.state },
    unseen: { ...unseenStory.state },
  };
}

function applyInventorySnapshot(items = []) {
  inventory?.clear();
  for (const item of items) {
    inventory.add(item.id, {
      label: item.label,
      tooltip: item.tooltip,
      consumable: Boolean(item.consumable),
      restoreAmount: item.restoreAmount ?? CIGARETTE_RESTORE,
      previewColor: item.previewColor,
      kind: item.kind,
      recordingId: item.recordingId,
    });
  }
  renderInventory();
}

function saveChapterStartCheckpoint() {
  if (!['corridor', 'office', 'records', 'hospital-reverse', 'threshold', 'unseen'].includes(chapterId)) return;
  for (const key of [...savedCheckpointKeys]) {
    if (key.startsWith(`${chapterId}:`)) savedCheckpointKeys.delete(key);
  }
  checkpoints.saveChapterStart(captureCheckpointSnapshot());
}

const savedCheckpointKeys = new Set();

function saveSafeCheckpoint(reason = '') {
  if (!['corridor', 'office', 'records', 'hospital-reverse', 'threshold', 'unseen'].includes(chapterId)) return;
  if (gameOverActive || transitioning || steady?.isActive) return;
  if (reason && savedCheckpointKeys.has(`${chapterId}:${reason}`)) return;
  checkpoints.saveLatest(captureCheckpointSnapshot());
  if (reason) {
    savedCheckpointKeys.add(`${chapterId}:${reason}`);
    console.info(`[Behind.] Checkpoint · ${reason}`);
  }
}

function maybeAutoCheckpoint() {
  if (!['corridor', 'office', 'records', 'hospital-reverse', 'threshold', 'unseen'].includes(chapterId)) return;
  if (chapterId === 'corridor' && story.state.reachedDeadEnd
      && !composureHits.has('corridor-cascade')) {
    saveSafeCheckpoint('corridor-dead-end');
  } else if (chapterId === 'office' && officeStory.state.hasBacktracked
      && !officeStory.state.soundTriggered) {
    saveSafeCheckpoint('office-return');
  } else if (chapterId === 'office' && officeStory.state.secondApproachStarted
      && !officeStory.state.emptySeatTriggered
      && !composureHits.has('office-empty-seat')) {
    saveSafeCheckpoint('office-pre-empty-seat');
  } else if (chapterId === 'records' && recordsStory.state.drawersOpeningNoticed
      && !recordsStory.state.shadowDartPlay
      && !recordsStory.state.shadowDartDone
      && !composureHits.has('records-dart')) {
    saveSafeCheckpoint('records-pre-dart');
  } else if (chapterId === 'hospital-reverse' && hospitalReverseStory.state.endDoorTried
      && !hospitalReverseStory.state.clankTriggered) {
    saveSafeCheckpoint('ward-pre-reverse');
  } else if (chapterId === 'threshold' && thresholdStory.state.reachedOrganic
      && !thresholdStory.state.ruptureArmed
      && !composureHits.has('threshold-rupture')) {
    saveSafeCheckpoint('threshold-pre-rupture');
  } else if (chapterId === 'unseen' && unseenStory.state.ceilingRattle
      && !unseenStory.state.darkness
      && !composureHits.has('unseen-blackout')) {
    saveSafeCheckpoint('unseen-pre-blackout');
  }
}

async function restoreCheckpoint(snapshot, { asChapterRestart = false } = {}) {
  if (!snapshot || transitioning) return false;
  transitioning = true;
  gameOverBusy = true;
  steady?.cancel(true);
  hideGameOver();
  interaction?.close();
  closeItemDetail();
  keypad?.close();
  el.veil?.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 40 : 520));
  try {
    const target = snapshot.chapterId;
    if (target !== chapterId) {
      // Retry stays chapter-local for this pass.
      return false;
    }
    if (target === 'corridor') {
      Object.assign(story.state, snapshot.story);
      director?.reset();
    } else if (target === 'office') {
      Object.assign(officeStory.state, snapshot.office);
      director?.reset();
    } else if (target === 'records') {
      Object.assign(recordsStory.state, snapshot.records);
      director?.reset();
    } else if (target === 'hospital-reverse') {
      Object.assign(hospitalReverseStory.state, snapshot.hospital || {});
      director?.reset();
      cancelWardClankPeak();
      audio.cancelWardDelayedSfx?.();
    } else if (target === 'threshold') {
      Object.assign(thresholdStory.state, snapshot.threshold || {});
      director?.reset();
    } else if (target === 'unseen') {
      Object.assign(unseenStory.state, snapshot.unseen || {});
      director?.reset();
    }
    composureHits.clear();
    for (const id of snapshot.composureHits || []) composureHits.add(id);
    applyInventorySnapshot(snapshot.inventory || []);
    Object.assign(memory, snapshot.memory || {});
    if (Array.isArray(snapshot.memory?.chaptersCompleted)) {
      memory.chaptersCompleted = [...snapshot.memory.chaptersCompleted];
    }
    // Re-offer chapter cigarette only if it was not yet collected at this checkpoint.
    const cigId = chapterCigaretteId(target);
    const pack = director?.get(target)?.interactables?.find(spec => spec.id === cigId);
    if (pack?.object) {
      const held = inventory?.has(cigId);
      const takenFlag = target === 'hospital-reverse'
        ? Boolean(hospitalReverseStory.state.cigaretteTaken)
        : false;
      const collected = held || takenFlag;
      pack.object.visible = !collected;
      pack.object.userData.taken = collected;
    }
    bindChapterInteractables();
    progress = displayed = snapshot.progress ?? (target === 'corridor' ? START_PROGRESS : 0);
    if (asChapterRestart) {
      progress = displayed = target === 'corridor' ? START_PROGRESS : 0;
    }
    resetBriefDialogue();
    composure.set(Math.max(1, snapshot.composure ?? COMPOSURE_CONFIG.start));
    look?.reset();
    window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
    scrollTrigger?.update();
    noteFogBase();
    syncComposureUi();
    seedCompletedComposureHits();
    gameOverActive = false;
    ended = false;
    hideEndCard();
    renderer?.render(scene, camera);
    return true;
  } finally {
    el.veil?.classList.remove('is-active');
    transitioning = false;
    gameOverBusy = false;
  }
}

function hideGameOver() {
  el.gameOver?.classList.remove('is-active');
  el.gameOver?.setAttribute('aria-hidden', 'true');
}

async function triggerGameOver() {
  if (gameOverActive || gameOverBusy) return;
  gameOverActive = true;
  gameOverBusy = true;
  steady?.cancel(true);
  interaction?.close();
  closeItemDetail();
  keypad?.close();
  audio.fadeForGameOver?.();
  el.veil?.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve,
    reduced ? 60 : COMPOSURE_CONFIG.gameOverFadeMs));
  el.veil?.classList.remove('is-active');
  el.gameOver?.classList.add('is-active');
  el.gameOver?.setAttribute('aria-hidden', 'false');
  gameOverBusy = false;
}

async function retryLatestCheckpoint() {
  const snap = checkpoints.latest || checkpoints.chapterStart;
  if (!snap) {
    await restartCurrentChapterFromStart();
    return;
  }
  await restoreCheckpoint(snap);
}

async function restartCurrentChapterFromStart() {
  const snap = checkpoints.chapterStart;
  if (snap) {
    await restoreCheckpoint(snap, { asChapterRestart: true });
    return;
  }
  // Fallback: soft chapter rewind with current inventory cigarettes preserved.
  resetBriefDialogue();
  steady?.cancel(true);
  hideGameOver();
  gameOverActive = false;
  if (chapterId === 'corridor') {
    story.reset();
    director?.reset();
    progress = displayed = START_PROGRESS;
  } else if (chapterId === 'office') {
    officeStory.reset();
    director?.reset();
    progress = displayed = 0;
  } else if (chapterId === 'records') {
    recordsStory.reset();
    director?.reset();
    progress = displayed = 0;
  } else if (chapterId === 'hospital-reverse') {
    hospitalReverseStory.reset();
    director?.reset();
    progress = displayed = 0;
  }
  const prefix = chapterId === 'corridor' ? 'corridor-'
    : chapterId === 'office' ? 'office-'
      : chapterId === 'hospital-reverse' ? 'ward-'
        : 'records-';
  for (const id of [...composureHits]) {
    if (id.startsWith(prefix)) composureHits.delete(id);
  }
  const cigId = chapterCigaretteId();
  if (cigId && !inventory?.has(cigId)) {
    const pack = director?.get(chapterId)?.interactables?.find(spec => spec.id === cigId);
    if (pack?.object) {
      pack.object.visible = true;
      pack.object.userData.taken = false;
    }
  }
  bindChapterInteractables();
  composure.set(COMPOSURE_CONFIG.start);
  look?.reset();
  window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
  scrollTrigger?.update();
  noteFogBase();
  syncComposureUi();
  saveChapterStartCheckpoint();
}

let openDetailItemId = null;

function closeItemDetail() {
  if (!el.itemDetail) return;
  el.itemDetail.classList.remove('is-open');
  el.itemDetail.setAttribute('aria-hidden', 'true');
  openDetailItemId = null;
  clearCamcorderTapePanel();
  if (el.itemDetailUse) {
    el.itemDetailUse.hidden = true;
    el.itemDetailUse.disabled = false;
    el.itemDetailUse.dataset.itemId = '';
    el.itemDetailUse.textContent = 'USE';
  }
}

function clearCamcorderTapePanel() {
  if (el.itemDetailTapes) el.itemDetailTapes.hidden = true;
  if (el.itemDetailTapeList) el.itemDetailTapeList.replaceChildren();
  if (el.itemDetailTapeEmpty) el.itemDetailTapeEmpty.hidden = true;
  if (el.itemDetailTapeNote) {
    el.itemDetailTapeNote.hidden = true;
    el.itemDetailTapeNote.textContent = '';
  }
}

function populateCamcorderTapePanel() {
  if (!el.itemDetailTapes || !el.itemDetailTapeList) return;
  const collected = listCollectedTapes(inventory);
  el.itemDetailTapes.hidden = false;
  el.itemDetailTapeList.replaceChildren();
  if (el.itemDetailTapeNote) {
    el.itemDetailTapeNote.hidden = true;
    el.itemDetailTapeNote.textContent = '';
  }
  if (!collected.length) {
    if (el.itemDetailTapeEmpty) el.itemDetailTapeEmpty.hidden = false;
    return;
  }
  if (el.itemDetailTapeEmpty) el.itemDetailTapeEmpty.hidden = true;
  for (const tape of collected) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `LOAD · ${tape.label}`;
    btn.addEventListener('click', () => {
      if (el.itemDetailTapeNote) {
        el.itemDetailTapeNote.hidden = false;
        el.itemDetailTapeNote.textContent = 'Loading…';
      }
      void playCamcorderTape(tape);
    });
    li.appendChild(btn);
    el.itemDetailTapeList.appendChild(li);
  }
}

function openItemDetail(item) {
  if (!el.itemDetail || !item) return;
  // Same inventory button again closes the panel (same as Esc).
  if (openDetailItemId === item.id && el.itemDetail.classList.contains('is-open')) {
    closeItemDetail();
    return;
  }
  openDetailItemId = item.id;
  const stackCount = inventoryStackCountFor(item.id);
  const baseLabel = item.label || item.id;
  el.itemDetailTitle.textContent = stackCount > 1 ? `${baseLabel}  ×${stackCount}` : baseLabel;
  if (String(item.id).startsWith('cigarette')) {
    fillCopyWithEffect(
      el.itemDetailBody,
      CIGARETTE_FLAVOR,
      cigaretteEffectLine(item.restoreAmount ?? CIGARETTE_RESTORE),
    );
  } else {
    el.itemDetailBody.textContent = item.tooltip || 'An item you are carrying.';
  }
  clearCamcorderTapePanel();
  if (item.id === 'brass-key') drawBrassKeyPreview(el.itemDetailCanvas);
  else if (item.id === 'sticky-note') {
    drawStickyNotePreview(el.itemDetailCanvas, officeStory.state.keypadCode);
  } else if (item.id === 'key-fob') {
    drawKeyFobPreview(el.itemDetailCanvas);
  } else if (item.id === CAMCORDER_ITEM_ID) {
    drawVhsCCamcorderPreview(el.itemDetailCanvas);
    populateCamcorderTapePanel();
  } else if (isTapeItemId(item.id)) {
    const tape = getTapeById(item.id);
    drawVhsCCassettePreview(
      el.itemDetailCanvas,
      tape ? `#${(tape.previewColor >>> 0).toString(16).padStart(6, '0')}` : '#1e2226',
    );
  } else if (item.id === 'stuffed-dragon-white'
      || String(item.id).startsWith('stuffed-dragon')) {
    drawStuffedDragonPreview(el.itemDetailCanvas, item.previewColor ?? 0xf2f0ea);
  } else if (String(item.id).startsWith('cigarette')) {
    drawCigarettePreview(el.itemDetailCanvas);
  } else {
    const ctx = el.itemDetailCanvas?.getContext('2d');
    ctx?.clearRect(0, 0, el.itemDetailCanvas.width, el.itemDetailCanvas.height);
  }
  if (el.itemDetailUse) {
    const canUse = Boolean(item.consumable);
    const blockedFull = canUse && String(item.id).startsWith('cigarette') && composure.isFull;
    el.itemDetailUse.hidden = !canUse;
    el.itemDetailUse.dataset.itemId = canUse ? item.id : '';
    el.itemDetailUse.disabled = blockedFull;
    el.itemDetailUse.textContent = blockedFull
      ? 'ALREADY STEADY'
      : (stackCount > 1 ? 'USE ONE' : 'USE');
  }
  el.itemDetail.classList.add('is-open');
  el.itemDetail.setAttribute('aria-hidden', 'false');
}

function drawCigarettePreview(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const x = w * 0.18;
  const y = h * 0.48;
  const len = w * 0.58;
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(x, y, len * 0.78, 7);
  ctx.fillStyle = '#b0895a';
  ctx.fillRect(x + len * 0.78, y - 0.5, len * 0.18, 8);
  ctx.fillStyle = '#3a3834';
  ctx.fillRect(x - 4, y + 0.5, 5, 6);
}

/** Stack key — cigarettes share one slot even with unique pickup ids. */
function inventoryStackKey(item) {
  if (String(item?.id || '').startsWith('cigarette')) return 'cigarette';
  return item?.id || '';
}

function inventoryStacks(list) {
  const order = [];
  const map = new Map();
  for (const item of list) {
    const key = inventoryStackKey(item);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { key, items: [] });
      order.push(key);
    }
    map.get(key).items.push(item);
  }
  return order.map(key => map.get(key));
}

function inventoryStackCountFor(itemId) {
  const list = inventory?.list() || [];
  const key = inventoryStackKey({ id: itemId });
  return list.filter(item => inventoryStackKey(item) === key).length;
}

function useInventoryItem(itemId) {
  const item = inventory?.get(itemId);
  if (!item?.consumable) return;
  if (String(itemId).startsWith('cigarette')) {
    if (composure.isFull) {
      fillCopyWithEffect(
        el.itemDetailBody,
        'Already steady. Save it for later.',
        cigaretteEffectLine(item.restoreAmount ?? CIGARETTE_RESTORE),
      );
      return;
    }
    inventory.remove(itemId);
    composure.restore(item.restoreAmount ?? CIGARETTE_RESTORE);
    if (el.composure) {
      el.composure.classList.remove('is-restoring');
      void el.composure.offsetWidth;
      el.composure.classList.add('is-restoring');
      window.clearTimeout(useInventoryItem._restoreT);
      useInventoryItem._restoreT = window.setTimeout(() => {
        el.composure?.classList.remove('is-restoring');
      }, 720);
    }
    syncComposureUi();
    audio.playCigaretteDraw?.();
    if (!reduced && camera && scene) {
      cigaretteFx?.play(camera, { delayMs: 460, scene });
    }
    closeItemDetail();
    renderInventory();
  }
}

function renderInventory(items) {
  if (!el.inventory) return;
  const list = items || inventory?.list() || [];
  const stacks = inventoryStacks(list);
  el.inventory.innerHTML = stacks.map(stack => {
    const item = stack.items[0];
    const count = stack.items.length;
    const label = item.label || item.id;
    const qty = count > 1
      ? `<span class="inventory__qty" aria-hidden="true">×${count}</span>`
      : '';
    const aria = count > 1 ? `${label}, ${count}` : label;
    return `<button type="button" class="inventory__item" data-item-id="${item.id}" aria-label="${aria}">`
      + `<span class="inventory__label">${label}</span>${qty}</button>`;
  }).join('');
  const show = list.length > 0 && started && !ended;
  el.inventory.classList.toggle('is-visible', show);
  el.inventory.setAttribute('aria-hidden', String(!show));
  if (!show) closeItemDetail();
}

function start() {
  if (started || !renderer || !director) return;
  started = true;
  el.intro.classList.add('is-hidden');
  el.topbar.classList.add('active');
  el.bottom.classList.add('active');
  el.experience?.classList.add('is-playing');
  el.composure?.classList.add('is-active');
  el.composure?.setAttribute('aria-hidden', 'false');
  saveChapterStartCheckpoint();
  noteFogBase();
  syncComposureUi();
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
    el.endingTitle.innerHTML = 'NO ONE<br>ANSWERED.';
    el.endingCopy.textContent = 'The doors have closed in front of you.';
    el.continue.textContent = 'CONTINUE INTO THE OFFICE ↑';
    el.continue.hidden = false;
  } else if (which === 'office') {
    el.endingEyebrow.textContent = 'LEVEL 02 COMPLETE · THE OFFICE';
    el.endingTitle.innerHTML = 'WHAT WAS<br>LEFT BEHIND.';
    el.endingCopy.textContent = 'The service passage leads toward Records.';
    el.continue.textContent = 'CONTINUE INTO THE RECORDS ↑';
    el.continue.hidden = false;
  } else if (which === 'records') {
    el.endingEyebrow.textContent = 'LEVEL 03 COMPLETE · THE RECORDS';
    el.endingTitle.innerHTML = 'SOME THINGS<br>STAY HIDDEN.';
    el.endingCopy.textContent = 'The doorway ahead opens onto another wing.';
    el.continue.textContent = 'CONTINUE INTO THE NIGHT SHIFT ↑';
    el.continue.hidden = false;
  } else if (which === 'night') {
    el.endingEyebrow.textContent = 'LEVEL 04 COMPLETE · THE NIGHT SHIFT';
    el.endingTitle.innerHTML = 'ALMOST<br>LIKE HOME.';
    el.endingCopy.textContent = 'The last door is open. There is somewhere else to go.';
    el.continue.textContent = 'CONTINUE INTO THE THRESHOLD ↑';
    el.continue.hidden = false;
  } else if (which === 'threshold') {
    el.endingEyebrow.textContent = 'LEVEL 05 COMPLETE · THE THRESHOLD';
    el.endingTitle.innerHTML = 'IT WON\'T<br>STAY BURIED.';
    el.endingCopy.textContent = 'The walls fall quiet. A maintenance passage waits ahead.';
    el.continue.textContent = 'CONTINUE INTO THE UNSEEN ↑';
    el.continue.hidden = false;
  } else if (which === 'hospital-reverse') {
    el.endingEyebrow.textContent = 'DEV PROTOTYPE · THE WARD';
    el.endingTitle.innerHTML = 'YOU DIDN\'T<br>TURN AROUND.';
    el.endingCopy.textContent = 'Reverse retreat under sound pressure. Prototype complete — not part of the main path.';
    el.continue.hidden = true;
  } else {
    el.endingEyebrow.textContent = 'LEVEL 06 COMPLETE · THE UNSEEN';
    el.endingTitle.innerHTML = 'IT\'S STILL<br>THERE.';
    el.endingCopy.textContent = 'The access passage is silent. For now.';
    el.continue.hidden = true;
  }
}

function showEndCard(which) {
  ended = true;
  const id = which === 'corridor' ? '01' : which === 'office' ? '02' : which === 'records' ? '03' : which === 'night' ? '04' : which === 'threshold' ? '05' : which === 'hospital-reverse' ? 'ward' : '06';
  if (!memory.chaptersCompleted.includes(id)) memory.chaptersCompleted.push(id);
  setEndCard(which);
  el.ending.classList.add('is-visible');
  el.ending.setAttribute('aria-hidden', 'false');
  renderInventory();
}

function hideEndCard() {
  ended = false;
  el.ending.classList.remove('is-visible');
  el.ending.setAttribute('aria-hidden', 'true');
  renderInventory();
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
  bindChapterInteractables();
  look?.reset();
  inventory?.clear();
  renderInventory([]);
  closeItemDetail();
  story.reset();
  officeStory.reset();
  recordsStory.reset();
  nightStory.reset();
  thresholdStory.reset();
  unseenStory.reset();
  memory.chaptersCompleted.length = 0;
  memory.lighterEncountered = false;
  memory.keyFobEncountered = false;
  memory.photographPassed = false;
  memory.extraStepHeard = false;
  memory.keyPassed = false;
  keypad?.close();
  audio.reset();
  composure.reset();
  composureHits.clear();
  checkpoints.clear();
  savedCheckpointKeys.clear();
  steady?.cancel(true);
  hideGameOver();
  gameOverActive = false;
  gameOverBusy = false;
  noteFogBase();
  hideEndCard();
  resetBriefDialogue();
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
    const { createOffice } = await import('./levels/office.js?v=cam-2');
    interaction?.clear();
    look?.reset();
    preserveCarryInventory();
    director.dispose();
    director = createSceneDirector();
    officeStory.reset();
    director.add('office', createOffice(scene, { keypadCode: officeStory.state.keypadCode }));
    director.activate('office');
    chapterId = 'office';
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterOffice();
    hideEndCard();
    el.location.textContent = 'EAST ANNEX / OFFICE FLOOR';
    progress = displayed = 0;
    camera.position.set(0, 1.7, OFFICE_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
      lastTime = performance.now();
    saveChapterStartCheckpoint();
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
    const { createRecords } = await import('./levels/records.js?v=notice-flat-1');
    module = createRecords(scene);
    // Build succeeds before discarding the polished office.
    preserveCarryInventory();
    interaction?.clear();
    look?.reset(); // Clear sticky A/D look from Office so Records faces forward.
    director.dispose();
    director = createSceneDirector();
    director.add('records', module);
    director.activate('records');
    chapterId = 'records';
    recordsStory.reset();
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterRecords();
    hideEndCard();
    el.location.textContent = 'EAST ANNEX / RECORDS';
    progress = displayed = 0;
    camera.position.set(0, 1.7, RECORDS_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
      lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 03 entered · key-fob exit · no forced return');
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
    const { createNightShift } = await import('./levels/night.js?v=exit-door-1');
    module = createNightShift(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('night', module);
    director.activate('night');
    chapterId = 'night';
    nightStory.reset();
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterNight();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / NIGHT STAFF';
    progress = displayed = 0;
    camera.position.set(0, 1.7, NIGHT_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
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
    const { createThreshold } = await import('./levels/threshold.js?v=organic-pair-2');
    module = createThreshold(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('threshold', module);
    director.activate('threshold');
    chapterId = 'threshold';
    thresholdStory.reset();
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterThreshold();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / THE THRESHOLD';
    progress = displayed = 0;
    camera.position.set(0, 1.7, THRESHOLD_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
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
    const { createUnseen } = await import('./levels/unseen.js?v=steady-expand-1');
    module = createUnseen(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('unseen', module);
    director.activate('unseen');
    chapterId = 'unseen';
    unseenStory.reset();
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterUnseen();
    hideEndCard();
    el.location.textContent = 'SERVICE LEVEL / MAINTENANCE';
    progress = displayed = 0;
    camera.position.set(0, 1.7, UNSEEN_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
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
  'memory-white': { start: 0, z: MEMORY_STAGING_START_Z, location: 'MEMORY / WHITE DRAGON (DEV)' },
  'memory-black': { start: 0, z: MEMORY_STAGING_START_Z, location: 'MEMORY / BLACK DRAGON (DEV)' },
  'hospital-reverse': { start: 0, z: HOSPITAL_REVERSE_START_Z, location: 'DEV / THE WARD' },
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
    steady?.cancel(true);
    hideGameOver();
    gameOverActive = false;
    gameOverBusy = false;
    // Keep cigarettes across debug jumps so multi-chapter supply can be tested.
    preserveCarryInventory();
    composureHits.clear();
    if (target === 'corridor') {
      next.add('corridor', createCorridor(scene));
      next.add('elevator', createElevator(scene));
    } else if (target === 'office') {
      const { createOffice } = await import('./levels/office.js?v=cam-2');
      officeStory.reset();
      next.add('office', createOffice(scene, { keypadCode: officeStory.state.keypadCode }));
    } else if (target === 'records') {
      const { createRecords } = await import('./levels/records.js?v=notice-flat-1');
      next.add('records', createRecords(scene));
    } else if (target === 'night') {
      const { createNightShift } = await import('./levels/night.js?v=exit-door-1');
      next.add('night', createNightShift(scene));
    } else if (target === 'threshold') {
      const { createThreshold } = await import('./levels/threshold.js?v=organic-pair-2');
      next.add('threshold', createThreshold(scene));
    } else if (target === 'memory-white') {
      const { createMemoryWhite } = await import('./levels/memory-white.js');
      memoryWhiteStory.reset();
      next.add('memory-white', createMemoryWhite(scene));
    } else if (target === 'memory-black') {
      const { createMemoryBlack } = await import('./levels/memory-black.js');
      memoryBlackStory.reset();
      next.add('memory-black', createMemoryBlack(scene));
    } else if (target === 'hospital-reverse') {
      const { createHospitalReverse } = await import('./levels/hospital-reverse.js?v=ward-gurney-side-1');
      hospitalReverseStory.reset();
      const wardMod = createHospitalReverse(scene);
      wardMod.setCamera?.(camera);
      next.add('hospital-reverse', wardMod);
    } else {
      const { createUnseen } = await import('./levels/unseen.js?v=steady-expand-1');
      next.add('unseen', createUnseen(scene));
    }
    next.activate(target);
    director.dispose();
    director = next;
    next = null; // Ownership was transferred to the active director.
    chapterId = target;
    look?.setMaxYaw();

    // Fresh chapter means no artificially unlocked doors, footsteps, or clues.
    // Office already rolled its keypad code before createOffice above.
    story.reset();
    if (target !== 'office') officeStory.reset();
    if (target !== 'records') recordsStory.reset();
    nightStory.reset();
    thresholdStory.reset();
    unseenStory.reset();
    if (target !== 'memory-white') memoryWhiteStory.reset();
    if (target !== 'memory-black') memoryBlackStory.reset();
    if (target !== 'hospital-reverse') hospitalReverseStory.reset();
    memory.chaptersCompleted.length = 0;
    memory.lighterEncountered = false;
    memory.keyFobEncountered = false;
    memory.photographPassed = false;
    memory.extraStepHeard = false;
    memory.keyPassed = false;
    keypad?.close();
    cancelWardClankPeak();
    audio.cancelWardDelayedSfx?.();
    audio.reset();
    if (target === 'office') audio.enterOffice();
    else if (target === 'records') audio.enterRecords();
    else if (target === 'night') audio.enterNight();
    else if (target === 'threshold') audio.enterThreshold();
    else if (target === 'unseen') audio.enterUnseen();
    else if (isMemoryChapter(target)) audio.enterMemoryStaging();
    else if (target === 'hospital-reverse') audio.enterHospitalReverse();

    hideEndCard();
      resetBriefDialogue();
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
    if (target === 'hospital-reverse') {
      const seek = hospitalReverseStory.seekCheckpoint(checkpoint);
      progress = displayed = seek.progress ?? 0;
      look?.setMaxYaw(1.05); // enough yaw for the side OPEN button from the rail
      camera.position.set(0, 1.7, HOSPITAL_REVERSE_START_Z - progress * HOSPITAL_REVERSE_METERS);
      camera.rotation.set(0, 0, 0);
    }
    if (target === 'records') {
      const seek = recordsStory.seekCheckpoint(checkpoint);
      progress = displayed = seek.progress ?? 0;
      camera.position.set(0, 1.7, RECORDS_START_Z - progress * RECORDS_METERS);
      camera.rotation.set(0, 0, 0);
      if (seek.giveFob) {
        inventory?.add('key-fob', {
          label: 'KEY FOB',
          tooltip: 'Orange plastic. The metal ring is worn.',
          previewColor: 0xd45a28,
        });
        memory.keyFobEncountered = true;
        renderInventory();
      }
    }
    if (isMemoryChapter(target)) {
      const mem = memoryStoryFor(target);
      const seek = mem.seekCheckpoint(checkpoint);
      director.get(target)?.syncPhase(mem.state);
      progress = displayed = seek.progress ?? 0;
      if (seek.phase === 'memory') {
        look?.setMaxYaw(1.25); // wide enough to face the side window
        const pose = memoryHomeCameraPose(progress, 'memory');
        camera.position.set(pose.x, 1.55, pose.z);
        camera.rotation.set(pose.pitch, pose.yaw, 0);
        inventory?.add(memoryItemId(target), {
          label: memoryItemLabel(target),
          tooltip: target === 'memory-black'
            ? 'A black stuffed dragon.'
            : 'A white stuffed dragon.',
          previewColor: memoryPreviewColor(target),
        });
        renderInventory();
        if (target === 'memory-black') audio.enterMemoryBlack();
        else audio.enterMemoryWhite();
      } else {
        camera.position.set(0, 1.7, MEMORY_STAGING_START_Z - progress * MEMORY_STAGING_METERS);
      }
    }
    bindChapterInteractables();
    // Checkpointed flags are already true — mark hits so they never re-tax.
    seedCompletedComposureHits();
    noteFogBase();
    syncComposureUi();
    saveChapterStartCheckpoint();
    window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    monitor?.reset();
    director.update(progress,
      target === 'corridor' ? story.state : target === 'office' ? officeStory.state
        : target === 'records' ? recordsStory.state : target === 'night' ? nightStory.state
          : target === 'threshold' ? thresholdStory.state
            : isMemoryChapter(target) ? memoryStoryFor(target).state
              : target === 'hospital-reverse' ? hospitalReverseStory.state
                : unseenStory.state, 0, true);
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
    devChapterUI = mountDevChapters(debugJumpToChapter, () => chapterId, {
      get: () => composure.value,
      set: (v) => {
        composure.set(v);
        if (composure.isEmpty) void triggerGameOver();
      },
      hit: (n) => {
        composure.hit(n);
        pulseComposureHit(n);
        if (composure.isEmpty) void triggerGameOver();
      },
      restore: (n) => composure.restore(n),
      subscribe: (fn) => composure.subscribe(fn),
      addCigarette: () => {
        const id = `cigarette-debug-${Date.now()}`;
        inventory?.add(id, {
          label: CIGARETTE_LABEL,
          tooltip: CIGARETTE_TOOLTIP,
          consumable: true,
          restoreAmount: CIGARETTE_RESTORE,
          previewColor: 0x2a4a3a,
        });
        renderInventory();
      },
      testSteady: () => {
        composureHits.delete('corridor-cascade');
        steady?.cancel(true);
        steady?.begin('corridor-cascade', { forceTutorial: true });
      },
      forceGameOver: () => {
        composure.set(0);
        void triggerGameOver();
      },
      retryCheckpoint: () => { void retryLatestCheckpoint(); },
    }, audio, () => ({
      progress: displayed,
      x: camera?.position.x,
      y: camera?.position.y,
      z: camera?.position.z,
      objectId: interaction?.openId || interaction?.nearest?.id || null,
      phase: chapterId === 'corridor'
        ? (story.state.hasBacktracked ? 'RETURN' : 'OUTBOUND')
        : chapterId === 'office'
          ? (officeStory.state.secondApproachStarted ? 'SECOND APPROACH'
            : officeStory.state.hasBacktracked ? 'RETURN' : 'OUTBOUND')
          : chapterId === 'unseen'
            ? (unseenStory.state.retreatStarted ? 'RETREAT' : 'APPROACH')
            : isHospitalReverse()
              ? (hospitalReverseStory.state.reverseStarted ? 'RETREAT' : 'APPROACH')
              : isMemoryChapter() ? memoryStoryFor().state.phase?.toUpperCase() : '',
    }), {
      grantCamcorder() {
        if (!inventory) return;
        inventory.add(CAMCORDER_ITEM_ID, camcorderInventoryMeta());
        renderInventory();
        bindChapterInteractables();
      },
      grantAllTapes() {
        if (!inventory) return;
        for (const tape of TAPE_LIBRARY) {
          inventory.add(tape.id, tapeInventoryMeta(tape));
        }
        renderInventory();
        bindChapterInteractables();
      },
      openCamcorder() {
        if (!inventory?.has(CAMCORDER_ITEM_ID)) {
          inventory?.add(CAMCORDER_ITEM_ID, camcorderInventoryMeta());
          renderInventory();
        }
        const item = inventory?.get(CAMCORDER_ITEM_ID);
        if (item) openItemDetail({ id: CAMCORDER_ITEM_ID, ...item });
      },
      status() {
        const cam = inventory?.has(CAMCORDER_ITEM_ID) ? 'yes' : 'no';
        const n = listCollectedTapes(inventory).length;
        return `Cam: ${cam} · tapes ${n}/${TAPE_LIBRARY.length}`;
      },
    });
  }).catch(error => console.warn('[Behind. DEV] Unable to mount chapter selector:', error));
}

el.begin.addEventListener('click', start);
el.restart.addEventListener('click', reset);
el.continue.addEventListener('click', continueChapter);
el.gameOverRetry?.addEventListener('click', () => { void retryLatestCheckpoint(); });
el.gameOverRestart?.addEventListener('click', () => { void restartCurrentChapterFromStart(); });
el.itemDetailClose?.addEventListener('click', closeItemDetail);
el.itemDetailUse?.addEventListener('click', () => {
  const id = el.itemDetailUse?.dataset?.itemId;
  if (id) useInventoryItem(id);
});
el.inventory?.addEventListener('click', event => {
  const btn = event.target.closest('[data-item-id]');
  if (!btn) return;
  const id = btn.dataset.itemId;
  const item = inventory?.get(id);
  if (item) openItemDetail({ id, ...item });
});
composure.subscribe(syncComposureUi);
function onWalkKeyDown(event) {
  if (event.key === 'Escape') {
    if (tapeSession && camcorderResumeSnapshot) {
      event.preventDefault();
      void endCamcorderPlayback();
      return;
    }
    closeItemDetail();
  }
  if (!started || transitioning || ended) return;
  if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  if (event.code === 'ArrowUp' || event.code === 'KeyW') {
    walkKeys.forward = true;
    event.preventDefault();
  } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
    walkKeys.back = true;
    event.preventDefault();
  }
}

function onWalkKeyUp(event) {
  if (event.code === 'ArrowUp' || event.code === 'KeyW') walkKeys.forward = false;
  else if (event.code === 'ArrowDown' || event.code === 'KeyS') walkKeys.back = false;
}

window.addEventListener('keydown', onWalkKeyDown, { passive: false });
window.addEventListener('keyup', onWalkKeyUp);
window.addEventListener('blur', () => {
  walkKeys.forward = walkKeys.back = false;
});
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
  let chapter = '01 — THE CORRIDOR';
  let line = '';
  let instruction = 'SCROLL UP TO CONTINUE ↑';

  if (state.reachedDeadEnd && p > 0.85 && !state.hasBacktracked) {
    chapter = '01 — DEAD END';
    instruction = 'SCROLL DOWN TO RETRACE YOUR STEPS ↓';
  } else if (state.rearElevatorUnlocked && p <= 0.16) {
    chapter = '01 — BEHIND YOU';
    if (p > START_PROGRESS) line = 'Behind me?';
    instruction = 'KEEP SCROLLING DOWN ↓';
  } else if (state.hasBacktracked) {
    chapter = '01 — THE RETURN';
    if (state.alteredDoorNoticed && p <= 0.38 && p > 0.29) {
      line = 'Wait — was that open before?';
    }
    instruction = p < 0.32 ? 'KEEP SCROLLING DOWN ↓' : 'SCROLL DOWN TO RETURN ↓';
  } else if (p >= 0.115 && p < 0.40) {
    line = 'Hello?';
  }
  return { chapter, line, instruction };
}

function updateNarrative(p, dt = 0) {
  const inCorridor = chapterId === 'corridor';
  const inOffice = chapterId === 'office';
  const inRecords = chapterId === 'records';
  const inNight = chapterId === 'night';
  const inThreshold = chapterId === 'threshold';
  const inMemory = isMemoryChapter();
  const inWard = isHospitalReverse();
  const state = inCorridor ? story.state
    : inOffice ? officeStory.state : inRecords ? recordsStory.state
      : inNight ? nightStory.state
        : inThreshold ? thresholdStory.state
          : inMemory ? memoryStoryFor().state
            : inWard ? hospitalReverseStory.state : unseenStory.state;
  const narrative = inCorridor ? narrativeFor(p, state)
    : inOffice ? officeNarrative(p, state)
      : inRecords ? recordsNarrative(p, state)
        : inNight ? nightNarrative(p, state)
          : inThreshold ? thresholdNarrative(p, state)
            : inMemory ? memoryHomeNarrative(p, state)
              : inWard ? hospitalReverseNarrative(p, state) : unseenNarrative(p, state);
  const displayedLine = (inCorridor || inOffice || inRecords || inNight)
    ? showBriefDialogue(chapterId, narrative.line, dt)
    : narrative.line;
  if (narrative.chapter !== el.chapter.textContent) el.chapter.textContent = narrative.chapter;
  if (el.line.textContent !== displayedLine) el.line.textContent = displayedLine;
  let instruction = narrative.instruction;
  if (inCorridor && interaction?.nearest && !interaction.isOpen && !ended) {
    const near = interaction.nearest;
    if (near._usable) {
      const useLabel = interaction?.actionLabel?.(near) || `USE ${interaction?.requiredItemLabel?.(near) || 'ITEM'}`;
      instruction = `${useLabel} · CLICK TO INSPECT`;
    } else if (near.takeable && !near.taken) instruction = 'CLICK TO INSPECT · TAKE';
    else instruction = 'CLICK TO INSPECT · A / D OR SWIPE TO LOOK';
  } else if (inOffice && interaction?.nearest && !interaction.isOpen && !keypad?.isOpen && !ended) {
    const near = interaction.nearest;
    if (near.kind === 'keypad') instruction = 'CLICK TO ENTER CODE · A / D OR SWIPE TO LOOK';
    else if (near.takeable && !near.taken) instruction = 'CLICK TO INSPECT · TAKE';
    else instruction = 'CLICK TO INSPECT · A / D OR SWIPE TO LOOK';
  } else if ((inRecords || inNight || inThreshold || inWard || chapterId === 'unseen')
      && interaction?.nearest && !interaction.isOpen && !ended) {
    const near = interaction.nearest;
    if (near._usable) {
      const useLabel = interaction?.actionLabel?.(near)
        || `USE ${interaction?.requiredItemLabel?.(near) || 'ITEM'}`;
      instruction = `${useLabel} · CLICK TO INSPECT`;
    } else if (near.takeable && !near.taken) instruction = 'CLICK TO INSPECT · TAKE';
    else instruction = 'CLICK TO INSPECT · A / D OR SWIPE TO LOOK';
  } else if (inMemory && interaction?.nearest && !interaction.isOpen && !ended) {
    const near = interaction.nearest;
    if (near.takeable && !near.taken) instruction = 'CLICK TO INSPECT · TAKE';
    else instruction = narrative.instruction;
  }
  if (el.instruction.textContent !== instruction) el.instruction.textContent = instruction;
  const show = inCorridor
    ? Boolean(displayedLine.trim()) && ((p > 0.055 && p < 0.955) || (state.reachedDeadEnd && p > 0.955) || (state.rearElevatorUnlocked && p <= 0.055))
    : inMemory
      ? Boolean(displayedLine.trim())
      : inOffice
        ? Boolean(displayedLine.trim()) && p > 0.045 && p < 0.994
        : Boolean(displayedLine.trim()) && p > 0.045 && p < 0.999;
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
    memory.keyFobEncountered ||= state.keyFobInspected;
    if (state.completed && !ended) showEndCard('office');
    else if (p < OFFICE_EXIT_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inRecords) {
    memory.photographPassed ||= state.photoPassed;
    if (state.completed && !ended) showEndCard('records');
    else if (p < 0.94 && ended) hideEndCard();
  } else if (inNight) {
    memory.extraStepHeard ||= state.absenceArmed || state.footstepHeard;
    if (state.completed && p >= NIGHT_END_PROGRESS && !ended) showEndCard('night');
    else if (p < NIGHT_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inThreshold) {
    memory.keyPassed ||= state.reachedKey;
    if (state.completed && p >= THRESHOLD_END_PROGRESS && !ended) showEndCard('threshold');
    else if (p < THRESHOLD_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inWard) {
    if (state.completed && !ended) showEndCard('hospital-reverse');
    else if (!state.completed && ended) hideEndCard();
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

  // Found-footage tape: scripted camera only, no scroll gameplay.
  if (tapeSession) {
    tapeSession.update(dt);
    cigaretteFx?.update(dt);
    renderer.render(scene, camera);
    monitor?.update(dt, true, !document.hidden);
    // Camcorder loads autoplay; return to the chapter when the recording ends.
    if (camcorderResumeSnapshot && tapeSession.finished && !camcorderReturning) {
      void endCamcorderPlayback();
    }
    return;
  }

  if (started && !transitioning && !gameOverActive && !(ended && chapterId === 'office')) {
    const meters = chapterMeters();
    // Apply held walk keys before reading scroll so look keys can't cancel motion.
    const walkDir = (walkKeys.forward ? 1 : 0) + (walkKeys.back ? -1 : 0);
    if (walkDir !== 0 && !interaction?.isOpen && !keypad?.isOpen) {
      const keyStep = MAX_WALK_SPEED * dt / meters;
      const next = progress + walkDir * keyStep;
      window.scrollTo({ top: scrollYFor(THREE.MathUtils.clamp(next, 0, 1)), behavior: 'instant' });
    }
    setProgress(nativeProgress());
    const previousDisplayed = displayed;
    const eased = (progress - displayed) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
    const startZ = chapterId === 'corridor' ? REAR_CABIN_CAMERA_Z
      : chapterId === 'office' ? OFFICE_START_Z
        : chapterId === 'records' ? RECORDS_START_Z
          : chapterId === 'night' ? NIGHT_START_Z
            : chapterId === 'threshold' ? THRESHOLD_START_Z
              : isMemoryChapter() ? MEMORY_STAGING_START_Z
                : isHospitalReverse() ? HOSPITAL_REVERSE_START_Z : UNSEEN_START_Z;
    const step = MAX_WALK_SPEED * dt / meters;
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
      recordsStory.observe(previousDisplayed, p, dt);
    } else if (chapterId === 'night') {
      const wasLampDying = nightStory.state.lampDying;
      const wasLampOut = nightStory.state.lampOut;
      nightStory.observe(previousDisplayed, p, dt);
      // Absence beat SFX — no follower footsteps (Ward owns that cadence).
      if (!wasLampDying && nightStory.state.lampDying) {
        audio.playNightLampDying?.();
      }
      if (!wasLampOut && nightStory.state.lampOut) {
        audio.playNightChairSettle?.();
      }
    } else if (chapterId === 'threshold') {
      thresholdStory.observe(previousDisplayed, p);
      if (director.get('threshold')?.consumeRuptureStarted?.()) {
        audio.playThresholdRupture?.();
      }
    } else if (isMemoryChapter()) {
      const mem = memoryStoryFor();
      const wasExitReady = mem.state.exitReady;
      if (mem.state.phase === 'staging') {
        mem.observeStaging(previousDisplayed, p);
      } else if (mem.state.phase === 'memory') {
        mem.observeMemory(previousDisplayed, p, dt);
        if (mem.consumeDoorSound?.()) audio.playMemoryDoorLeave();
      }
      if (!wasExitReady && mem.state.exitReady) bindChapterInteractables();
    } else if (isHospitalReverse()) {
      const wasSideReady = hospitalReverseStory.state.sideDoorReady;
      const wasSqueak = hospitalReverseStory.state.squeakArmed;
      const wasClankWarn = hospitalReverseStory.state.clankWarning;
      const wasClank = hospitalReverseStory.state.clankTriggered;
      const wasProx = hospitalReverseStory.state.proximityHit;
      const wasCry = hospitalReverseStory.state.cryingStarted;
      const wasComplete = hospitalReverseStory.state.completed;
      hospitalReverseStory.observe(previousDisplayed, p, dt);
      if (!wasSqueak && hospitalReverseStory.state.squeakArmed) {
        audio.playWardSqueak();
      }
      if (!wasClankWarn && hospitalReverseStory.state.clankWarning) {
        audio.playWardClankWarn?.();
      }
      if (!wasClank && hospitalReverseStory.state.clankTriggered) {
        // Peak marker only — fast-walk footsteps already started on warn.
        scheduleWardClankPeak();
      }
      if (!wasProx && hospitalReverseStory.state.proximityHit) {
        audio.playWardProximity();
      }
      if (!wasSideReady && hospitalReverseStory.state.sideDoorReady) {
        bindChapterInteractables();
      }
      if (!wasComplete && hospitalReverseStory.state.completed) {
        audio.stopWardCry?.(0.6);
      }
      if (typeof window !== 'undefined') {
        const s = hospitalReverseStory.state;
        window.__wardDebug = {
          p: Number(p.toFixed(3)),
          composure: Math.round(composure.value),
          moving: s.movingIntentional,
          dir: s.direction,
          threat: s.activeThreat || '',
          threatI: s.activeThreat === 'crying' ? Number(s.cryingIntensity.toFixed(2))
            : s.activeThreat === 'squeak' ? Number(Math.min(1, s.squeakElapsed / 2).toFixed(2)) : 0,
          reverse: s.reverseStarted,
          squeak: s.squeakActive,
          squeakDone: s.squeakDone,
          squeakResult: s.squeakResult,
          squeakDmg: s.squeakDamage,
          creakDoor: s.creakDoorOpen,
          clankWarn: s.clankWarning,
          clank: s.clankTriggered,
          clankResult: s.clankResult,
          cry: s.cryingStarted,
          cryDone: s.cryingDone,
          cryI: Number(s.cryingIntensity.toFixed(2)),
          cryResult: s.cryingResult,
          cryMoved: s.cryingMovedDuringPeak,
          cryVol: audio.getWardCryVolume?.() ?? 1,
          prox: s.proximityHit,
          proxDmg: s.proximityDamage,
          proxSkip: s.proximitySkipped,
          sideReady: s.sideDoorReady,
          escape: s.escapePressed,
          escapeP: Number((s.escapeProgress || 0).toFixed(2)),
          doorClosing: s.sideDoorClosing,
          mut: {
            g: s.mutateGurney, w: s.mutateWheelchair, d: s.mutateDoorOpen,
            s: s.mutateSheetBed, warm: s.mutateWarmLight,
          },
          hrtf: Boolean(audio.wardCryUsesHrtf),
          cigTaken: s.cigaretteTaken,
          cigHeld: Boolean(inventory?.has('cigarette-hospital-reverse')),
          lastDmg: s.lastDamageNote,
          caption: s.caption,
        };
      }
    } else {
      unseenStory.observe(previousDisplayed, p, dt);
    }

    // Always face down the corridor / rail. During return, positive Z motion
    // backs the camera through the rear elevator entrance without a turn.
    const stage = composure.stage;
    const sway = reduced ? 0
      : stage.id === 'critical' ? 1
        : stage.id === 'distressed' ? 0.55
          : 0;
    camera.position.z = startZ - p * meters;
    camera.position.x = reduced ? 0 : Math.sin(p * 26) * 0.025
      + (sway ? Math.sin(now * 0.0017) * 0.008 * sway : 0);
    camera.position.y = 1.7 + (reduced ? 0 : Math.sin(p * 65) * 0.012)
      + (sway ? Math.sin(now * 0.0023) * 0.006 * sway : 0);
    camera.rotation.set(
      reduced ? 0 : Math.sin(p * 6) * 0.009
        + (sway ? Math.sin(now * 0.0019) * 0.004 * sway : 0),
      reduced ? 0 : Math.sin(p * 5) * 0.012,
      sway && !reduced ? Math.sin(now * 0.0014) * 0.003 * sway : 0
    );
    if (chapterId === 'office') {
      const route = officeCameraPose(
        p,
        officeStory.state.secondApproachStarted,
        officeStory.state.keypadUnlocked
      );
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
    } else if (isHospitalReverse()) {
      const route = hospitalReverseCameraPose(p, hospitalReverseStory.state);
      camera.position.x += route.x;
      camera.position.z = route.z;
      camera.rotation.y += route.yaw;
      camera.rotation.x += route.pitch;
    } else if (isMemoryChapter() && memoryStoryFor().state.phase === 'memory') {
      const route = memoryHomeCameraPose(p, 'memory');
      camera.position.set(route.x, 1.55, route.z);
      camera.rotation.set(route.pitch, route.yaw, 0);
    }

    const uiBlocking = interaction?.isOpen || keypad?.isOpen
      || el.itemDetail?.classList.contains('is-open');
    if (uiBlocking || document.hidden) steady?.pause();
    else steady?.resume();
    steady?.update(dt);

    const canInteract = !ended && !transitioning && !gameOverActive && !isMemoryChapter()
      ? true
      : isMemoryChapter() && !ended && !transitioning && !gameOverActive;
    look?.noteWalk(p - previousDisplayed);
    look?.setEnabled(canInteract && !uiBlocking && !steady?.isActive);
    camera.rotation.y += look?.update(dt, reduced) ?? 0;
    const interactStory = chapterId === 'corridor' ? story.state
      : chapterId === 'office' ? officeStory.state
        : chapterId === 'records' ? recordsStory.state
          : chapterId === 'night' ? nightStory.state
            : chapterId === 'threshold' ? thresholdStory.state
              : chapterId === 'unseen' ? unseenStory.state
                : isMemoryChapter() ? memoryStoryFor().state
                  : isHospitalReverse() ? hospitalReverseStory.state : null;
    interaction?.update(
      dt,
      canInteract && !uiBlocking && !steady?.isActive,
      interactStory
    );

    syncChapterComposureHits();
    maybeAutoCheckpoint();

    // STEADY encounters — one attempt each; never re-fire after resolve.
    if (chapterId === 'office' && officeStory.state.emptySeatSteadyReady) {
      beginSteadyEncounter('office-empty-seat');
    }
    // Arm STEADY only once the dart streak is actually on-screen.
    if (chapterId === 'records' && recordsStory.state.shadowDartSteadyReady) {
      beginSteadyEncounter('records-dart');
    }
    if (chapterId === 'threshold' && thresholdStory.state.ruptureSteadyReady) {
      beginSteadyEncounter('threshold-rupture');
    }
    if (chapterId === 'unseen' && unseenStory.state.blackoutSteadyReady
        && !composureHits.has('unseen-blackout')) {
      if (beginSteadyEncounter('unseen-blackout')) {
        audio.playUnseenBlackoutPeak?.();
        unseenStory.state.blackoutSteadyReady = false;
      } else {
        composureHitOnce('unseen-blackout');
        unseenStory.state.blackoutSteadyReady = false;
      }
    }
    if (isHospitalReverse()
        && hospitalReverseStory.state.clankDone
        && hospitalReverseStory.state.cryingSteadyReady
        && !composureHits.has('ward-crying')
        && !steady?.isActive) {
      if (!beginSteadyEncounter('ward-crying')) {
        hospitalReverseStory.markCryingResolved();
        composureHitOnce('ward-crying');
      }
    }

    if (chapterId === 'corridor') {
      director.update(p, story.state, dt, reduced);
      if (director.get('corridor')?.consumeHallCascadeStarted?.()) {
        audio.playHallDoorCascade();
        if (!beginSteadyEncounter('corridor-cascade')) {
          composureHitOnce('corridor-cascade');
        }
      }
      const elev = director.get('elevator');
      audio.update(p, reduced, story.state, {
        openAmount: elev?.openAmount ?? 0,
        closureProgress: elev?.closureProgress ?? 0,
      });
    } else if (chapterId === 'office') {
      director.update(p, officeStory.state, dt, reduced);
      // Consume AFTER update — scrape arms in the same frame the chair starts.
      if (director.get('office')?.consumeEmptySeatScrape?.()) {
        audio.playOfficeChairScrape?.();
      }
      audio.updateOffice(p, officeStory.state);
    } else if (chapterId === 'records') {
      director.update(p, recordsStory.state, dt, reduced);
      audio.updateRecords(p, recordsStory.state);
      if (typeof window !== 'undefined') {
        window.__behindFrame = {
          chapterId,
          p: Number(p.toFixed(3)),
          reduced: Boolean(reduced),
          dartPlay: Boolean(recordsStory.state.shadowDartPlay),
          dartDone: Boolean(recordsStory.state.shadowDartDone),
          drawersNoticed: Boolean(recordsStory.state.drawersOpeningNoticed),
          recordsDebug: window.__recordsDebug || null,
        };
      }
    } else if (chapterId === 'night') {
      director.update(p, nightStory.state, dt, reduced);
      audio.updateNight(p, nightStory.state);
    } else if (chapterId === 'threshold') {
      director.update(p, thresholdStory.state, dt, reduced);
      audio.updateThreshold(p, thresholdStory.state);
    } else if (isMemoryChapter()) {
      director.update(p, memoryStoryFor().state, dt, reduced);
      if (chapterId === 'memory-black') audio.updateMemoryBlack(p, memoryBlackStory.state);
      else audio.updateMemoryWhite(p, memoryWhiteStory.state);
    } else if (isHospitalReverse()) {
      director.update(p, hospitalReverseStory.state, dt, reduced);
      audio.updateHospitalReverse(p, hospitalReverseStory.state);
    } else {
      director.update(p, unseenStory.state, dt, reduced);
      audio.updateUnseen(p, unseenStory.state, camera);
    }
    updateNarrative(p, dt);
  }
  cigaretteFx?.update(dt);
  renderer.render(scene, camera);
  devChapterUI?.sync(chapterId);
  monitor?.update(dt, started, !document.hidden);
}
requestAnimationFrame(frame);

window.addEventListener('pagehide', () => {
  scrollTrigger?.kill();
  audio.dispose();
  cigaretteFx?.dispose();
  interaction?.dispose();
  look?.dispose();
  director?.dispose();
  renderer?.dispose();
}, { once: true });
