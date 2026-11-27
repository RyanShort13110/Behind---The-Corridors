import * as THREE from 'three';
import { createCorridor } from './scene.js?v=bright-1';
import { createElevator } from './elevator.js';
import { createSceneDirector } from './scene-manager.js';
import { createStory, START_PROGRESS, DEAD_END_PROGRESS, corridorMinProgress } from './story.js?v=cascade-early-1';
import { createAudioDirector } from './audio.js?v=stairs-void-10';
import { createPerformanceMonitor } from './performance.js';
import { createInteractionSystem } from './interaction.js?v=cam-3';
import { createLookControls } from './look.js';
import { createInventory } from './inventory.js?v=wpn-2';
import { createInventoryMenu } from './inventory-menu.js?v=inv-clip-1';
import {
  resolveItemDef, itemStackKey,
  CROWBAR_ITEM_ID, MACHETE_ITEM_ID, REVOLVER_ITEM_ID, REVOLVER_AMMO_ITEM_ID,
  PERSISTENT_WEAPON_IDS,
} from './items/catalog.js?v=wpn-2';
import { createRevolverInventoryMeta } from './items/weapons.js?v=wpn-2';
import { createKeypad } from './keypad.js';
import { drawStuffedDragonPreview } from './props/stuffed-dragon.js';
import { drawVhsCCamcorderPreview } from './props/vhs-c-camcorder.js?v=cam-1';
import { drawVhsCCassettePreview } from './props/vhs-c-cassette.js?v=cam-1';
import {
  TAPE_LIBRARY,
  CAMCORDER_ITEM_ID,
  listDiscoveredTapes,
  isTapeItemId,
  tapeInventoryMeta,
  camcorderInventoryMeta,
  getTapeById,
} from './tapes/library.js?v=cam-9';
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
import { corridorCameraPose } from './levels/corridor-route.js?v=bay-2';
import {
  createRecordsStory, recordsNarrative, RECORDS_METERS, RECORDS_START_Z,
  RECORDS_DOOR_HOLD,
} from './levels/records-story.js?v=anom-1';
import { recordsCameraPose } from './levels/records-route.js';
import {
  createMaintenanceStory, maintenanceNarrative, MAINTENANCE_METERS, MAINTENANCE_START_Z,
} from './levels/maintenance-story.js?v=proc-7';
import { maintenanceCameraPose } from './levels/maintenance-route.js?v=proc-7';
import {
  createInterludeStory, interludeNarrative, INTERLUDE_METERS, INTERLUDE_START_Z,
} from './levels/interlude-story.js?v=ib-9';
import { interludeCameraPose } from './levels/interlude-route.js?v=ib-9';
import {
  createNightStory, nightNarrative, NIGHT_METERS, NIGHT_START_Z, NIGHT_END_PROGRESS,
  NIGHT_COMBAT_TRIGGER,
} from './levels/night-story.js?v=night-bent-1';
import {
  createThresholdStory, thresholdNarrative, THRESHOLD_METERS, THRESHOLD_START_Z,
  THRESHOLD_END_PROGRESS,
} from './levels/threshold-story.js?v=night-bent-1';
import { createUnseenStory, unseenNarrative, UNSEEN_METERS, UNSEEN_START_Z, UNSEEN_BARRIER_PROGRESS, UNSEEN_EXIT_PROGRESS } from './levels/unseen-story.js?v=dlg-003';
import { unseenCameraPose } from './levels/unseen-route.js';
import {
  createMemoryWhiteStory, createMemoryBlackStory,
  memoryHomeNarrative,
  MEMORY_STAGING_METERS, MEMORY_STAGING_START_Z, MEMORY_ROOM_METERS,
} from './levels/memory-home-story.js';
import { memoryHomeCameraPose } from './levels/memory-home-route.js';
import {
  createApartmentStory,
  apartmentNarrative,
  APARTMENT_METERS,
  APARTMENT_START_Z,
} from './levels/apartment-story.js?v=apt-7';
import { apartmentCameraPose } from './levels/apartment-route.js?v=apt-7';
import {
  createHospitalReverseStory,
  hospitalReverseNarrative,
  hospitalReverseMaxProgress,
  hospitalReverseMinProgress,
  HOSPITAL_REVERSE_METERS,
  HOSPITAL_REVERSE_START_Z,
} from './levels/hospital-reverse-story.js';
import { hospitalReverseCameraPose } from './levels/hospital-reverse-route.js';
import {
  createStairwellsStory,
  stairwellsNarrative,
} from './levels/stairwells-story.js?v=dlg-003';
import {
  stairwellsCameraPose,
  STAIRWELLS_METERS,
  STAIRWELLS_START,
  STAIRWELLS_MARKS,
  STAIRWELLS_WALK_SPEED,
} from './levels/stairwells-route.js?v=stairs-exit-1';
import {
  createOutsideDialogue,
  OUTSIDE_EVENTS,
} from './outside-dialogue.js?v=dlg-003';
import {
  readProcgenBootConfig,
  createProcgenSession,
  resolveProceduralEncounter,
} from './procgen/index.js?v=proc-6';

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
/** Debug-only ending prototype. Requires ?debug=1&ending=finale-prototype. */
const ENDING_ID = DEBUG_MODE ? urlParams.get('ending') : null;
/**
 * Threshold Bent encounter is story-mandatory.
 * Debug bypass: ?debug=1&nocombat=1 or DEV TOOLS → DISABLE NIGHT COMBAT.
 * ?debug=1&combat=1 still forces the encounter on after a bypass.
 */
const NIGHT_COMBAT_FORCE = DEBUG_MODE && urlParams.get('combat') === '1';
const NIGHT_COMBAT_OFF = DEBUG_MODE && urlParams.get('nocombat') === '1'
  && !NIGHT_COMBAT_FORCE;
if (DEBUG_MODE) document.body.classList.add('debug-performance');

/**
 * Experimental seeded procgen session.
 * Opt-in only: ?debug=1&procgen=1&seed=<n>. Inactive in normal play.
 * Seed persists across checkpoints and chapter transitions for this page run.
 */
const PROCGEN_BOOT = readProcgenBootConfig(urlParams, { debug: DEBUG_MODE });
const procgenSession = createProcgenSession({
  enabled: PROCGEN_BOOT.enabled,
  seed: PROCGEN_BOOT.seed ?? (Date.now() >>> 0),
  theme: PROCGEN_BOOT.theme ?? 'maintenance',
  encounterMode: PROCGEN_BOOT.encounterMode ?? null,
  encounterEnemy: PROCGEN_BOOT.encounterEnemy ?? null,
});
if (procgenSession.enabled) {
  console.info(
    `[Behind. PROCGEN] enabled · seed=${procgenSession.seed}`
    + ` · theme=${procgenSession.theme}`
    + (procgenSession.encounterMode
      ? ` · encounter=${procgenSession.encounterMode}`
      : ''),
  );
}
/**
 * Story chapter: Stairwells → The In-Between → Threshold.
 * Debug escape hatch: ?skipinterlude=1 or DEV TOOLS → SKIP INTERLUDE
 * (skips straight Stairwells → Threshold).
 * URL ?seed= locks the layout for the whole page run; otherwise each new
 * playthrough rolls a fresh seed and retries reuse the cached plan.
 */
const PROCGEN_URL_SEED = PROCGEN_BOOT.seed;
let interludeSkip = DEBUG_MODE && urlParams.get('skipinterlude') === '1';

function rollPlaythroughSeed() {
  if (PROCGEN_URL_SEED != null) {
    procgenSession.setSeed(PROCGEN_URL_SEED);
  } else {
    procgenSession.setSeed((Date.now() ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0);
  }
  void import('./levels/interlude.js?v=ib-9')
    .then(({ clearInterludePlanCache }) => clearInterludePlanCache())
    .catch(() => {});
}
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
const maintenanceStory = createMaintenanceStory();
const interludeStory = createInterludeStory();
const recordsStory = createRecordsStory();
const nightStory = createNightStory();
const thresholdStory = createThresholdStory();
const unseenStory = createUnseenStory();
const memoryWhiteStory = createMemoryWhiteStory();
const memoryBlackStory = createMemoryBlackStory();
const apartmentStory = createApartmentStory();
const hospitalReverseStory = createHospitalReverseStory();
const stairwellsStory = createStairwellsStory();
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
/** Debug-only ending prototype session (null during normal play). */
let endingSession = null;
/** Debug-only turn-based combat prototype (null during normal play). */
let combatSession = null;
/** Chapter id to restore when exiting the combat prototype. */
let combatResumeChapter = 'corridor';
let combatExiting = false;
/** Debug-only: when true, story Bent encounter is suppressed. */
let nightCombatDisabled = Boolean(NIGHT_COMBAT_OFF);
/** Progress frozen when in-world combat starts. */
let bentCombatFrozenProgress = null;
/** Base camera yaw at in-world combat start (look offset is applied on top). */
let bentCombatBaseYaw = 0;
/** Snapshot captured immediately before Bent combat (retry restore). */
let bentPreEncounterSnapshot = null;
/** Loadout frozen at Bent fight start for victory commit. */
let bentFightStartLoadout = null;
/** Show first-encounter tutorial once per page load for Bent fights. */
let bentTutorialPending = true;
/**
 * Procedural encounter mode override for In-Between.
 * Opt-in: ?encounter=forward|reverse|auto|none  (ambush=1 → reverse).
 * Interlude defaults to none (combat-free) without an override.
 */
let proceduralEncounterOverride = procgenSession.encounterMode;
/** Active resolved encounter for the current interlude build. */
let activeProceduralEncounter = null;
/** Pre-fight snapshot for procedural encounter defeat retry. */
let ambushPreEncounterSnapshot = null;
/** Loadout frozen at procedural fight start. */
let ambushFightStartLoadout = null;
/** Abort in-flight grab transition on chapter leave / restore. */
let ambushGrabAbort = null;
/** Checkpoint snapshot to restore after camcorder LCD playback ends. */
let camcorderResumeSnapshot = null;
let camcorderReturning = false;
/** Must be declared before init — tape/ending boot can call closeItemDetail(). */
let openDetailItemId = null;
let progress = START_PROGRESS;
let displayed = START_PROGRESS;
let ended = false;
let renderer, camera, scene, director, monitor, interaction, look, inventory, keypad;
/** Full-screen inventory menu (null until init). */
let inventoryMenu = null;
let cigaretteFx = createCigaretteFx();
let memoryEnterTimer = 0;
let lastTime = performance.now();
let scrollTrigger = null;
let chapterId = 'corridor';
let transitioning = false;

const isMemoryChapter = (id = chapterId) => id === 'memory-white' || id === 'memory-black';
const isApartment = (id = chapterId) => id === 'apartment';
const isHospitalReverse = (id = chapterId) => id === 'hospital-reverse';
const isStairwells = (id = chapterId) => id === 'stairwells';
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
  /** Cassette ids found in the world — stay on the camcorder after inventory consume. */
  discoveredTapes: [],
  /**
   * After a story memory exits: 'threshold' | 'end' | null.
   * null keeps the debug prototype return-to-staging behavior.
   */
  storyMemoryExitTo: null,
};

function discoverTape(tapeId) {
  if (!isTapeItemId(tapeId)) return;
  if (!Array.isArray(memory.discoveredTapes)) memory.discoveredTapes = [];
  if (!memory.discoveredTapes.includes(tapeId)) memory.discoveredTapes.push(tapeId);
}

function hasDiscoveredTape(tapeId) {
  return Boolean(isTapeItemId(tapeId) && memory.discoveredTapes?.includes(tapeId));
}
const ORIGINAL_LOCATION_HTML = 'NORTH WING <span class="separator">/</span> LEVEL 13';

// Dialogue Revision 002/003: one-shot thoughts, never held by scroll position.
const BRIEF_DIALOGUE_SECONDS = 2.6;
let briefChapter = '';
let briefLine = '';
let briefRemaining = 0;
const briefSeen = new Set();
const outsideDialogue = createOutsideDialogue();

function resetBriefDialogue() {
  briefChapter = '';
  briefLine = '';
  briefRemaining = 0;
  briefSeen.clear();
}

function resetOutsideDialogue() {
  outsideDialogue.reset();
  el.line?.classList.remove('is-outside');
  el.narrative?.classList.remove('is-outside-voice');
}

/**
 * Arm one-shot outside conversations after "Please wake up." (Stairwells).
 * Never before that beat. Safe quiet windows only — no STEADY / combat / end-card overlap.
 */
function maybeArmOutsideDialogue(chapter, progress, state) {
  if (!state || ended || combatSession || steady?.isActive) return;
  const p = progress;

  if (chapter === 'stairwells') {
    // Rain is reserved: wake sign only becomes readable near ~97%, with too
    // little remaining rail for a natural hold before the chapter ends.
    // Event text stays in OUTSIDE_EVENTS.rain for a later quiet window.
    return;
  }

  if (chapter === 'threshold') {
    // After the freestanding door, before organic / rupture.
    if (state.crossedDoor
        && state.direction === 'forward'
        && p >= 0.33 && p < 0.52
        && !state.ruptureArmed) {
      outsideDialogue.arm(OUTSIDE_EVENTS.dog);
    }
    // After rupture settles; before the densest red-hall stretch.
    if (state.ruptureArmed
        && state.direction === 'forward'
        && p >= 0.745 && p < 0.86
        && !state.nightmareCleared) {
      outsideDialogue.arm(OUTSIDE_EVENTS.quiet);
    }
    return;
  }

  if (chapter === 'unseen') {
    // Quiet after the threat stops — almost-called only.
    // "I'll come back tomorrow" stays defined but reserved for a future chapter.
    if (state.silence && p <= 0.192 && p > 0.135) {
      outsideDialogue.arm(OUTSIDE_EVENTS.almostCalled);
    }
  }
}

/**
 * @param {string} chapter
 * @param {string} candidate  Display text (empty = no new thought).
 * @param {number} dt
 * @param {string} [eventId]  Stable one-shot key; falls back to candidate text.
 */
function showBriefDialogue(chapter, candidate, dt = 0, eventId = null) {
  if (briefChapter !== chapter) {
    resetBriefDialogue();
    briefChapter = chapter;
  }
  const key = eventId || candidate;
  if (candidate && key && !briefSeen.has(key)) {
    briefSeen.add(key);
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
  // The Bent blocks the Night Shift rail until defeated (or debug-skipped).
  if (chapterId === 'night'
      && nightStory.state.bentEnabled
      && !nightStory.state.bentDefeated
      && !nightStory.state.bentSkipped) {
    return { min: 0, max: NIGHT_COMBAT_TRIGGER };
  }
  // Procedural forward/reverse encounters seal forward progress until resolved.
  if (chapterId === 'interlude' && interludeStory.state.encounterEnabled) {
    return { min: 0, max: interludeStory.forwardMax() };
  }
  return { min: 0, max: 1 };
}

/** Service Wing rail from the active module (modular procgen may vary length). */
function maintenanceRail() {
  return director?.get?.('maintenance')?.rail ?? null;
}

/** In-Between rail from the active generated module. */
function interludeRail() {
  return director?.get?.('interlude')?.rail ?? null;
}

/** Bind story progress markers to an assembled (or authored) Service Wing layout. */
function bindMaintenanceLayout(module) {
  if (module?.markers) maintenanceStory.setLayoutMarkers(module.markers);
  else maintenanceStory.clearLayoutMarkers();
}

function refreshActiveProceduralEncounter(chapterId = 'interlude') {
  activeProceduralEncounter = resolveProceduralEncounter({
    seed: procgenSession.seed,
    chapterId,
    modeOverride: proceduralEncounterOverride,
    enemyOverride: procgenSession.encounterEnemy,
  });
  return activeProceduralEncounter;
}

function interludeCreateOpts() {
  const encounter = refreshActiveProceduralEncounter('interlude');
  return {
    procgen: procgenSession,
    encounter,
    reduced,
  };
}

/** Bind In-Between section layout for HUD / progress (+ optional encounter). */
function bindInterludeLayout(module) {
  if (module?.plan) interludeStory.setLayout(module.plan);
  else interludeStory.clearLayout();
  const enc = module?.encounter || activeProceduralEncounter;
  if (enc && enc.mode && enc.mode !== 'none' && module?.plan) {
    interludeStory.armEncounter(enc, module.plan);
  } else {
    interludeStory.disarmEncounter();
  }
}

/** Active rail length for walk-speed / scroll-lead. Bedroom uses its own meters. */
function chapterMeters() {
  if (chapterId === 'corridor') return CORRIDOR_METERS;
  if (chapterId === 'office') return OFFICE_METERS;
  if (chapterId === 'maintenance') {
    return maintenanceRail()?.meters ?? MAINTENANCE_METERS;
  }
  if (chapterId === 'interlude') {
    return interludeRail()?.meters ?? INTERLUDE_METERS;
  }
  if (chapterId === 'records') return RECORDS_METERS;
  if (chapterId === 'night') return NIGHT_METERS;
  if (chapterId === 'threshold') return THRESHOLD_METERS;
  if (isMemoryChapter()) {
    return memoryStoryFor().state.phase === 'memory'
      ? MEMORY_ROOM_METERS
      : MEMORY_STAGING_METERS;
  }
  if (isApartment()) return APARTMENT_METERS;
  if (isHospitalReverse()) return HOSPITAL_REVERSE_METERS;
  if (isStairwells()) return STAIRWELLS_METERS;
  return UNSEEN_METERS;
}

function chapterWalkSpeed() {
  return isStairwells() ? STAIRWELLS_WALK_SPEED : MAX_WALK_SPEED;
}

function setProgress(requested) {
  const raw = clamp(requested);
  const { min, max } = progressBounds();
  const bounded = THREE.MathUtils.clamp(raw, min, max);
  const meters = chapterMeters();
  const lead = chapterWalkSpeed() * SCROLL_LEAD_SECONDS / meters;
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

/** Instant progress (combat retry / debug placement) — bypasses scroll lead. */
function forceProgress(p) {
  const next = clamp(p);
  progress = displayed = next;
  window.scrollTo({ top: scrollYFor(next), behavior: 'instant' });
  scrollTrigger?.update?.();
}

function syncNightCombatFlag() {
  // Story default: enabled. Debug may disable for unrelated chapter testing.
  nightStory.state.bentEnabled = !nightCombatDisabled;
}

function isNightCombatEnabled() {
  return !nightCombatDisabled;
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
    onChange: items => {
      renderInventory(items);
      inventoryMenu?.refresh?.();
    },
  });
  inventoryMenu = createInventoryMenu({
    getInventory: () => inventory,
    getStacks: () => inventoryStacks(inventory?.list() || []),
    canOpen: () => canOpenInventoryMenu(),
    drawPreview: drawInventoryMenuPreview,
    getTapeActions: (item) => (item?.id === CAMCORDER_ITEM_ID ? tapesOnCamcorder() : []),
    onLoadTape: (tape) => {
      inventoryMenu?.close?.();
      void playCamcorderTape(tape);
    },
    onUse: (itemId) => {
      useInventoryItem(itemId);
      inventoryMenu?.setComposureFull?.(composure.isFull);
      inventoryMenu?.refresh?.();
    },
    onEquip: (itemId) => {
      toggleEquipWeapon(itemId);
      inventoryMenu?.refresh?.();
    },
    onClose: () => {
      walkKeys.forward = walkKeys.back = false;
    },
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
      if (isTapeItemId(itemId)) discoverTape(itemId);
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
      if (entryId === 'apartment-white-dragon' || entryId === 'apartment-black-dragon') {
        apartmentStory.takeDragon();
        window.clearTimeout(memoryEnterTimer);
        memoryEnterTimer = window.setTimeout(() => { void enterMemoryFromApartment(); }, 2100);
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
        // Fob is consumed by the interaction system; door swing follows story state.
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
  if (ENDING_ID) void bootDebugEnding(ENDING_ID);
  else if (TAPE_ID) void bootDebugTape(TAPE_ID);
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
  const preferSoundOn = Boolean(audio?.enabled);
  try {
    el.begin.disabled = true;
    el.intro?.classList.add('is-hidden');
    el.veil?.classList.add('is-active');
    look?.setEnabled?.(false);
    interaction?.close?.();
    interaction?.clear?.();
    closeInventoryOverlays();
    steady?.cancel?.(true);
    keypad?.close?.();
    // Keep game SOUND state, but duck chapter ambience under the tape.
    audio?.setLevelBedMuted?.(true);

    if (id === 'office-01') {
      const { createOffice } = await import('./levels/office.js?v=note-size-2');
      const { startOfficeTape01 } = await import('./tapes/office-01.js?v=cam-9');
      tapeSession = await startOfficeTape01({
        scene,
        camera,
        renderer,
        createOffice,
        director,
        createSceneDirector,
        audio,
        reduced,
        initialSoundOn: preferSoundOn,
      });
      chapterId = 'tape-office-01';
    } else {
      const { createMemoryBlack } = await import('./levels/memory-black.js?v=bd-tape-1');
      const { startBlackDragonTape01 } = await import('./tapes/black-dragon-01.js?v=cam-7');
      tapeSession = await startBlackDragonTape01({
        scene,
        camera,
        renderer,
        createMemoryBlack,
        director,
        createSceneDirector,
        reduced,
        initialSoundOn: preferSoundOn,
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
    audio?.setLevelBedMuted?.(false);
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

/** Debug-only URL boot: `?debug=1&tape=<id>`. Office tape is in-world only. */
async function bootDebugTape(id) {
  if (!DEBUG_MODE) return;
  if (id === 'office-01') {
    console.info('[Behind. TAPE] office-01 plays from the in-world cassette — URL boot removed.');
    return;
  }
  await startTapeRecording(id, { fromCamcorder: false });
}

/** Debug-only URL boot: `?debug=1&ending=finale-prototype`. */
async function bootDebugEnding(id) {
  if (!DEBUG_MODE) return;
  await startEndingPrototype(id);
}

/**
 * Standalone ending prototype. Suspends normal chapter gameplay.
 * Staging / debug only — never part of the published chapter chain yet.
 */
/**
 * Debug-only turn-based combat prototype. Suspends chapter gameplay.
 * Launch via DEV TOOLS → TEST COMBAT (?debug=1).
 */
async function startCombatPrototypeSession() {
  if (!DEBUG_MODE || !renderer || !scene || !camera) return false;
  if (combatSession || tapeSession || endingSession || transitioning) return false;
  transitioning = true;
  try {
    // Same boot path as chapter jumps so exit can restore scroll/controls.
    if (!started) start();
    el.begin.disabled = true;
    el.intro?.classList.add('is-hidden');
    el.veil?.classList.add('is-active');
    look?.setEnabled?.(false);
    interaction?.close?.();
    interaction?.clear?.();
    closeInventoryOverlays();
    steady?.cancel?.(true);
    keypad?.close?.();
    hideGameOver();

    combatResumeChapter = (chapterId && DEV_CHAPTER_CONFIG[chapterId])
      ? chapterId
      : 'corridor';

    const { startCombatPrototype } = await import('./combat/index.js?v=wpn-2');
    combatSession = await startCombatPrototype({
      scene,
      camera,
      director,
      createSceneDirector,
      reduced,
      onExit: () => endCombatPrototype(),
    });
    director = null;
    started = true;
    chapterId = 'combat-prototype';
    el.experience?.classList.add('is-playing');
    console.info('[Behind. COMBAT] Prototype running. Normal gameplay is suspended.');
    return true;
  } catch (error) {
    console.error('[Behind. COMBAT] Boot failed:', error);
    combatSession = null;
    return false;
  } finally {
    transitioning = false;
    el.veil?.classList.remove('is-active');
  }
}

/** Leave combat and restore a chapter world. Does not keep combat outcomes. */
async function endCombatPrototype() {
  if (combatExiting) return;
  combatExiting = true;
  try {
    combatSession?.dispose?.();
    combatSession = null;
    look?.setEnabled?.(true);
    el.bottom?.classList.add('active');
    el.composure?.classList.add('is-active');
    el.composure?.setAttribute('aria-hidden', 'false');
    el.inventory?.setAttribute('aria-hidden', 'false');
    if (!director) director = createSceneDirector();
    const resume = (combatResumeChapter && DEV_CHAPTER_CONFIG[combatResumeChapter])
      ? combatResumeChapter
      : 'corridor';
    const ok = await debugJumpToChapter(resume, 'start');
    if (!ok) {
      console.warn('[Behind. COMBAT] Exit restore failed; falling back to corridor.');
      if (!director) director = createSceneDirector();
      await debugJumpToChapter('corridor', 'start');
    }
    console.info('[Behind. COMBAT] Exited prototype. Chapter gameplay restored.');
  } catch (error) {
    console.error('[Behind. COMBAT] Exit failed:', error);
  } finally {
    combatExiting = false;
  }
}

function setNightCombatEnabled(on) {
  if (!DEBUG_MODE) return false;
  nightCombatDisabled = !on;
  syncNightCombatFlag();
  if (nightCombatDisabled) {
    nightStory.state.bentNoticed = false;
    nightStory.state.bentCombatStarted = false;
    nightStory.state.bentSkipped = true;
  } else {
    nightStory.state.bentSkipped = false;
  }
  console.info(`[Behind. COMBAT] Night Shift encounter ${!nightCombatDisabled ? 'ENABLED' : 'disabled'}.`);
  return !nightCombatDisabled;
}

function restoreExplorationHudAfterCombat() {
  look?.setEnabled?.(true);
  el.bottom?.classList.add('active');
  el.composure?.classList.add('is-active');
  el.composure?.setAttribute('aria-hidden', 'false');
  el.inventory?.setAttribute('aria-hidden', 'false');
  el.narrative?.classList.add('active');
  renderInventory();
  syncComposureUi();
}

/**
 * Story (and debug) in-world Bent fight — keeps Night Shift scene + camera.
 * Uses real inventory / composure; commits results only on victory.
 */
async function startNightBentCombat({ debugArenaLoadout = false } = {}) {
  if (!nightStory.state.bentEnabled && !debugArenaLoadout) return false;
  if (!renderer || !scene || !camera || chapterId !== 'night') return false;
  if (combatSession || tapeSession || endingSession || transitioning) return false;
  if (steady?.isActive || outsideDialogue.isActive()) return false;
  if (nightStory.state.bentDefeated || nightStory.state.bentCombatStarted) return false;

  const module = director?.get?.('night');
  const bent = module?.bent;
  if (!bent) {
    console.warn('[Behind. COMBAT] Night Shift Bent mesh missing.');
    return false;
  }

  transitioning = true;
  bentCombatFrozenProgress = displayed;
  // Face the hallway; look.update returns absolute yaw, not a delta.
  look?.reset?.();
  bentCombatBaseYaw = camera?.rotation?.y ?? 0;
  nightStory.state.bentCombatStarted = true;
  interaction?.close?.();
  interaction?.clear?.();
  closeInventoryOverlays();
  closeItemDetail();
  inventoryMenu?.close?.();
  keypad?.close?.();

  // Exact pre-fight snapshot for defeat retry (inventory + composure + rail).
  bentPreEncounterSnapshot = captureCheckpointSnapshot();
  checkpoints.saveLatest(bentPreEncounterSnapshot);
  savedCheckpointKeys.add('night:night-pre-bent');

  try {
    const { startInWorldCombat } = await import('./combat/in-world.js?v=night-bent-1');
    const { BENT_COMBAT_CONFIG } = await import(
      './combat/encounters/the-bent.js?v=night-bent-1'
    );
    const {
      buildCombatLoadoutFromInventory,
      commitCombatResultToStory,
    } = await import('./combat/story-loadout.js?v=night-bent-1');

    const storyLoadout = debugArenaLoadout
      ? {
        composure: 100,
        cigarettes: 2,
        cigaretteIds: [],
        equippedWeaponId: inventory?.getEquippedWeaponId?.() || null,
        cylinderLoaded: 6,
        ammoReserve: 6,
        cylinderCapacity: 6,
      }
      : buildCombatLoadoutFromInventory(inventory, composure.value);

    bentFightStartLoadout = storyLoadout;

    const showTutorial = bentTutorialPending;
    bentTutorialPending = false;

    combatSession = await startInWorldCombat({
      scene,
      camera,
      enemy: bent,
      config: BENT_COMBAT_CONFIG,
      loadout: storyLoadout,
      reduced,
      showTutorial,
      storyMode: !debugArenaLoadout,
      eyebrow: debugArenaLoadout ? 'NIGHT SHIFT · THE BENT · DEBUG' : 'NIGHT SHIFT · THE BENT',
      onFrame: (dt) => {
        const p = bentCombatFrozenProgress ?? displayed;
        director?.update?.(p, nightStory.state, dt, reduced);
      },
      onVictory: async ({ snapshot: endSnap } = {}) => {
        combatSession = null;
        if (!debugArenaLoadout && endSnap && bentFightStartLoadout) {
          commitCombatResultToStory({
            inventory,
            composure,
            startLoadout: bentFightStartLoadout,
            endSnap,
          });
          renderInventory();
          syncComposureUi();
        }
        bentFightStartLoadout = null;
        bentPreEncounterSnapshot = null;
        nightStory.state.bentDefeated = true;
        nightStory.state.bentCombatStarted = false;
        bentCombatFrozenProgress = null;
        bent.setState(bent.BENT_STATES.defeated);
        restoreExplorationHudAfterCombat();
        bindChapterInteractables();
        console.info('[Behind. COMBAT] Bent defeated — Night Shift exploration resumed.');
      },
      onRetry: async () => {
        combatSession = null;
        bentFightStartLoadout = null;
        bentCombatFrozenProgress = null;
        nightStory.state.bentCombatStarted = false;
        nightStory.state.bentNoticed = false;
        nightStory.state.bentDefeated = false;
        const snap = bentPreEncounterSnapshot || checkpoints.latest;
        if (snap) {
          await restoreCheckpoint(snap);
        } else {
          const { BENT_RETRY_PROGRESS } = await import(
            './combat/encounters/the-bent.js?v=night-bent-1'
          );
          bent.reset(bent.home);
          bent.setState(bent.BENT_STATES.idle);
          forceProgress(BENT_RETRY_PROGRESS);
          restoreExplorationHudAfterCombat();
          bindChapterInteractables();
        }
        syncNightCombatFlag();
        console.info('[Behind. COMBAT] Bent retry — restored pre-encounter checkpoint.');
      },
      onExit: async () => {
        // Debug-only path clear (storyMode hides exit).
        combatSession = null;
        bentFightStartLoadout = null;
        bentPreEncounterSnapshot = null;
        nightStory.state.bentSkipped = true;
        nightStory.state.bentCombatStarted = false;
        bentCombatFrozenProgress = null;
        bent.setState(bent.BENT_STATES.hidden);
        restoreExplorationHudAfterCombat();
        bindChapterInteractables();
        console.info('[Behind. COMBAT] Bent test exited — path cleared for this run.');
      },
    });

    el.bottom?.classList.remove('active');
    el.inventory?.classList.remove('is-visible');
    el.inventory?.setAttribute('aria-hidden', 'true');
    console.info('[Behind. COMBAT] In-world Bent encounter started (Night Shift).');
    return true;
  } catch (error) {
    console.error('[Behind. COMBAT] In-world boot failed:', error);
    combatSession = null;
    nightStory.state.bentCombatStarted = false;
    bentCombatFrozenProgress = null;
    bentFightStartLoadout = null;
    restoreExplorationHudAfterCombat();
    return false;
  } finally {
    transitioning = false;
  }
}

function maybeStartNightBentCombat() {
  if (chapterId !== 'night' || combatSession || transitioning) return;
  if (gameOverActive || ended) return;
  const s = nightStory.state;
  if (!s.bentEnabled || s.bentDefeated || s.bentSkipped || s.bentCombatStarted) return;
  if (s.direction !== 'forward') return;
  // Float easing can asymptote just under the rail max (e.g. 0.859999 < 0.86).
  if (displayed + 1e-4 < NIGHT_COMBAT_TRIGGER) return;
  // Past the domestic lounge — cold hall must already be true for natural pacing.
  if (!s.coldHall) return;
  if (steady?.isActive) return;
  if (outsideDialogue.isActive()) return;
  if (inventoryMenu?.isOpen?.() || interaction?.isOpen || keypad?.isOpen) return;
  void startNightBentCombat();
}

/**
 * Procedural reverse-ambush: sealed end → reverse → behind cues → grab → in-world combat.
 * Reuses startInWorldCombat; optional style (URL ?ambush=1).
 */
async function startReverseAmbushCombat() {
  if (chapterId !== 'interlude') return false;
  if (!interludeStory.state.ambushEnabled) return false;
  if (!renderer || !scene || !camera) return false;
  if (combatSession || tapeSession || endingSession || transitioning) return false;
  if (steady?.isActive || outsideDialogue.isActive()) return false;
  if (interludeStory.state.ambushDefeated || interludeStory.state.ambushSkipped) return false;
  if (interludeStory.state.ambushCombatStarted || interludeStory.state.ambushGrab) return false;
  if (!interludeStory.shouldStartAmbushGrab()) return false;

  const module = director?.get?.('interlude');
  const placement = module?.ambushPlacement || interludeStory.ambush?.placement;
  if (!module || !placement) {
    console.warn('[Behind. COMBAT] Reverse ambush placement missing.');
    return false;
  }

  transitioning = true;
  bentCombatFrozenProgress = displayed;
  look?.reset?.();
  bentCombatBaseYaw = camera?.rotation?.y ?? 0;
  interaction?.close?.();
  interaction?.clear?.();
  closeInventoryOverlays();
  closeItemDetail();
  inventoryMenu?.close?.();
  keypad?.close?.();

  // Retry lands slightly forward of the grab so the player must reverse again.
  const snap = captureCheckpointSnapshot();
  snap.progress = placement.retryProgress;
  snap.displayed = placement.retryProgress;
  if (snap.interlude) {
    snap.interlude = {
      ...snap.interlude,
      ambushGrab: false,
      ambushCombatStarted: false,
    };
  }
  ambushPreEncounterSnapshot = snap;
  checkpoints.saveLatest(snap);
  savedCheckpointKeys.add('interlude:pre-reverse-ambush');

  if (!interludeStory.beginAmbushGrab()) {
    transitioning = false;
    bentCombatFrozenProgress = null;
    return false;
  }

  ambushGrabAbort?.abort?.();
  ambushGrabAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

  try {
    audio.cancelReverseAmbushSfx?.();
    const enemy = await module.ensureEncounterEnemy?.();
    if (!enemy) throw new Error('ambush enemy missing');

    const {
      playReverseAmbushGrabTransition,
      clearReverseAmbushVeil,
    } = await import('./combat/transitions/reverse-ambush.js?v=ra-3');
    const { startInWorldCombat } = await import('./combat/in-world.js?v=ra-3');
    const { BENT_COMBAT_CONFIG } = await import('./combat/encounters/the-bent.js?v=ra-3');
    const { REVERSE_AMBUSH_ENCOUNTER_ID } = await import(
      './combat/encounters/reverse-ambush.js?v=ra-3'
    );
    const {
      buildCombatLoadoutFromInventory,
      commitCombatResultToStory,
    } = await import('./combat/story-loadout.js?v=ra-3');

    await playReverseAmbushGrabTransition({
      scene,
      camera,
      reduced,
      durationMs: placement.grabDurationMs,
      fadeMs: placement.fadeMs,
      veil: el.veil,
      signal: ambushGrabAbort?.signal,
      onGrabPeak: () => audio.playReverseAmbushGrab?.(),
    });

    if (ambushGrabAbort?.signal?.aborted) {
      clearReverseAmbushVeil(el.veil);
      interludeStory.prepareEncounterRetry();
      return false;
    }

    module.revealAmbushEnemy?.();
    interludeStory.beginAmbushCombat();
    clearReverseAmbushVeil(el.veil);

    const storyLoadout = buildCombatLoadoutFromInventory(inventory, composure.value);
    ambushFightStartLoadout = storyLoadout;

    combatSession = await startInWorldCombat({
      scene,
      camera,
      enemy,
      config: BENT_COMBAT_CONFIG,
      loadout: storyLoadout,
      reduced,
      showTutorial: bentTutorialPending,
      storyMode: true,
      encounterId: REVERSE_AMBUSH_ENCOUNTER_ID,
      eyebrow: 'THE IN-BETWEEN · AMBUSH',
      onFrame: (dt) => {
        const p = bentCombatFrozenProgress ?? displayed;
        director?.update?.(p, interludeStory.state, dt, reduced);
      },
      onVictory: async ({ snapshot: endSnap } = {}) => {
        combatSession = null;
        if (endSnap && ambushFightStartLoadout) {
          commitCombatResultToStory({
            inventory,
            composure,
            startLoadout: ambushFightStartLoadout,
            endSnap,
          });
          renderInventory();
          syncComposureUi();
        }
        ambushFightStartLoadout = null;
        ambushPreEncounterSnapshot = null;
        interludeStory.markEncounterDefeated();
        bentCombatFrozenProgress = null;
        enemy.setState(enemy.BENT_STATES.defeated);
        // Dissolve needs director updates; force-hide if it stalls.
        window.setTimeout(() => {
          if (enemy.state === enemy.BENT_STATES.defeated) {
            module.hideEncounterEnemy?.();
          }
        }, 1800);
        restoreExplorationHudAfterCombat();
        bindChapterInteractables();
        console.info('[Behind. COMBAT] Reverse ambush cleared — In-Between open.');
      },
      onRetry: async () => {
        combatSession = null;
        ambushFightStartLoadout = null;
        bentCombatFrozenProgress = null;
        audio.cancelReverseAmbushSfx?.();
        clearReverseAmbushVeil(el.veil);
        module.hideEncounterEnemy?.();
        interludeStory.prepareEncounterRetry();
        const retrySnap = ambushPreEncounterSnapshot || checkpoints.latest;
        if (retrySnap) {
          await restoreCheckpoint(retrySnap);
        } else {
          forceProgress(placement.retryProgress);
          restoreExplorationHudAfterCombat();
          bindChapterInteractables();
        }
        console.info('[Behind. COMBAT] Reverse ambush retry — restored pre-grab checkpoint.');
      },
    });

    bentTutorialPending = false;
    el.bottom?.classList.remove('active');
    el.inventory?.classList.remove('is-visible');
    el.inventory?.setAttribute('aria-hidden', 'true');
    console.info('[Behind. COMBAT] Reverse ambush → in-world combat.');
    return true;
  } catch (error) {
    console.error('[Behind. COMBAT] Reverse ambush failed:', error);
    combatSession = null;
    bentCombatFrozenProgress = null;
    ambushFightStartLoadout = null;
    audio.cancelReverseAmbushSfx?.();
    interludeStory.prepareEncounterRetry();
    module?.hideEncounterEnemy?.();
    el.veil?.classList.remove('is-active', 'reverse-ambush-veil');
    restoreExplorationHudAfterCombat();
    return false;
  } finally {
    transitioning = false;
  }
}

function maybeStartReverseAmbushCombat() {
  if (chapterId !== 'interlude' || combatSession || transitioning) return;
  if (gameOverActive || ended) return;
  if (interludeStory.state.encounterMode !== 'reverse') return;
  if (!interludeStory.state.encounterEnabled) return;
  if (interludeStory.state.encounterDefeated || interludeStory.state.encounterSkipped) return;
  if (interludeStory.state.encounterCombatStarted || interludeStory.state.ambushGrab) return;
  if (!interludeStory.shouldStartAmbushGrab()) return;
  if (steady?.isActive) return;
  if (outsideDialogue.isActive()) return;
  if (inventoryMenu?.isOpen?.() || interaction?.isOpen || keypad?.isOpen) return;
  void startReverseAmbushCombat();
}

/**
 * Procedural forward-block: enemy ahead → approach → normal in-world combat.
 */
async function startForwardBlockCombat() {
  if (chapterId !== 'interlude') return false;
  if (interludeStory.state.encounterMode !== 'forward') return false;
  if (!interludeStory.state.encounterEnabled) return false;
  if (!renderer || !scene || !camera) return false;
  if (combatSession || tapeSession || endingSession || transitioning) return false;
  if (steady?.isActive || outsideDialogue.isActive()) return false;
  if (interludeStory.state.encounterDefeated || interludeStory.state.encounterSkipped) return false;
  if (interludeStory.state.encounterCombatStarted) return false;
  if (!interludeStory.shouldStartForwardCombat()) return false;

  const module = director?.get?.('interlude');
  const placement = module?.encounterPlacement || interludeStory.encounterPlacement;
  if (!module || !placement) {
    console.warn('[Behind. COMBAT] Forward encounter placement missing.');
    return false;
  }

  transitioning = true;
  bentCombatFrozenProgress = displayed;
  look?.reset?.();
  bentCombatBaseYaw = camera?.rotation?.y ?? 0;
  interaction?.close?.();
  interaction?.clear?.();
  closeInventoryOverlays();
  closeItemDetail();
  inventoryMenu?.close?.();
  keypad?.close?.();

  const snap = captureCheckpointSnapshot();
  snap.progress = placement.retryProgress;
  snap.displayed = placement.retryProgress;
  if (snap.interlude) {
    snap.interlude = {
      ...snap.interlude,
      encounterCombatStarted: false,
      encounterNoticed: false,
      ambushCombatStarted: false,
    };
  }
  ambushPreEncounterSnapshot = snap;
  checkpoints.saveLatest(snap);
  savedCheckpointKeys.add('interlude:pre-forward-block');

  if (!interludeStory.beginForwardCombat()) {
    transitioning = false;
    bentCombatFrozenProgress = null;
    return false;
  }

  try {
    const enemy = await module.ensureEncounterEnemy?.();
    if (!enemy) throw new Error('forward encounter enemy missing');
    module.revealEncounterEnemy?.('blocking');

    const { startInWorldCombat } = await import('./combat/in-world.js?v=ra-3');
    const { BENT_COMBAT_CONFIG } = await import('./combat/encounters/the-bent.js?v=ra-3');
    const { FORWARD_BLOCK_ENCOUNTER_ID } = await import(
      './combat/encounters/forward-block.js?v=ra-3'
    );
    const {
      buildCombatLoadoutFromInventory,
      commitCombatResultToStory,
    } = await import('./combat/story-loadout.js?v=ra-3');

    const storyLoadout = buildCombatLoadoutFromInventory(inventory, composure.value);
    ambushFightStartLoadout = storyLoadout;

    combatSession = await startInWorldCombat({
      scene,
      camera,
      enemy,
      config: BENT_COMBAT_CONFIG,
      loadout: storyLoadout,
      reduced,
      showTutorial: bentTutorialPending,
      storyMode: true,
      encounterId: FORWARD_BLOCK_ENCOUNTER_ID,
      eyebrow: 'THE IN-BETWEEN · FORWARD',
      onFrame: (dt) => {
        const p = bentCombatFrozenProgress ?? displayed;
        director?.update?.(p, interludeStory.state, dt, reduced);
      },
      onVictory: async ({ snapshot: endSnap } = {}) => {
        combatSession = null;
        if (endSnap && ambushFightStartLoadout) {
          commitCombatResultToStory({
            inventory,
            composure,
            startLoadout: ambushFightStartLoadout,
            endSnap,
          });
          renderInventory();
          syncComposureUi();
        }
        ambushFightStartLoadout = null;
        ambushPreEncounterSnapshot = null;
        interludeStory.markEncounterDefeated();
        bentCombatFrozenProgress = null;
        enemy.setState(enemy.BENT_STATES.defeated);
        window.setTimeout(() => {
          if (enemy.state === enemy.BENT_STATES.defeated) {
            module.hideEncounterEnemy?.();
          }
        }, 1800);
        restoreExplorationHudAfterCombat();
        bindChapterInteractables();
        console.info('[Behind. COMBAT] Forward encounter cleared — In-Between open.');
      },
      onRetry: async () => {
        combatSession = null;
        ambushFightStartLoadout = null;
        bentCombatFrozenProgress = null;
        module.hideEncounterEnemy?.();
        interludeStory.prepareEncounterRetry();
        const retrySnap = ambushPreEncounterSnapshot || checkpoints.latest;
        if (retrySnap) {
          await restoreCheckpoint(retrySnap);
        } else {
          forceProgress(placement.retryProgress);
          restoreExplorationHudAfterCombat();
          bindChapterInteractables();
        }
        console.info('[Behind. COMBAT] Forward encounter retry — restored pre-fight checkpoint.');
      },
    });

    bentTutorialPending = false;
    el.bottom?.classList.remove('active');
    el.inventory?.classList.remove('is-visible');
    el.inventory?.setAttribute('aria-hidden', 'true');
    console.info('[Behind. COMBAT] Forward block → in-world combat.');
    return true;
  } catch (error) {
    console.error('[Behind. COMBAT] Forward encounter failed:', error);
    combatSession = null;
    bentCombatFrozenProgress = null;
    ambushFightStartLoadout = null;
    interludeStory.prepareEncounterRetry();
    module?.hideEncounterEnemy?.();
    restoreExplorationHudAfterCombat();
    return false;
  } finally {
    transitioning = false;
  }
}

function maybeStartForwardBlockCombat() {
  if (chapterId !== 'interlude' || combatSession || transitioning) return;
  if (gameOverActive || ended) return;
  if (interludeStory.state.encounterMode !== 'forward') return;
  if (!interludeStory.state.encounterEnabled) return;
  if (interludeStory.state.encounterDefeated || interludeStory.state.encounterSkipped) return;
  if (interludeStory.state.encounterCombatStarted) return;
  if (!interludeStory.shouldStartForwardCombat()) return;
  if (steady?.isActive) return;
  if (outsideDialogue.isActive()) return;
  if (inventoryMenu?.isOpen?.() || interaction?.isOpen || keypad?.isOpen) return;
  void startForwardBlockCombat();
}

async function maybeRevealForwardEncounterEnemy() {
  if (chapterId !== 'interlude') return;
  if (interludeStory.state.encounterMode !== 'forward') return;
  if (!interludeStory.state.encounterNoticed) return;
  if (interludeStory.state.encounterDefeated || interludeStory.state.encounterCombatStarted) return;
  const module = director?.get?.('interlude');
  if (!module) return;
  await module.ensureEncounterEnemy?.();
  module.revealEncounterEnemy?.('blocking');
}

async function startEndingPrototype(id) {
  if (!renderer || !scene || !camera || tapeSession || endingSession || combatSession || transitioning) {
    return false;
  }
  if (!director) {
    console.warn('[Behind. FINALE] No active director to hand off from.');
    return false;
  }
  if (id !== 'finale-prototype') {
    console.warn(`[Behind. FINALE] Unknown ending id "${id}". Use ending=finale-prototype.`);
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
    closeInventoryOverlays();
    steady?.cancel?.(true);
    keypad?.close?.();

    const { startFinalePrototype } = await import('./finale/prototype.js?v=fin-7');
    endingSession = await startFinalePrototype({
      scene,
      camera,
      renderer,
      director,
      createSceneDirector,
      reduced,
    });
    director = null;
    started = true;
    chapterId = 'ending-finale-prototype';
    el.experience?.classList.add('is-playing');
    el.topbar?.classList.add('active');
    console.info('[Behind. FINALE] Prototype running. Normal gameplay is suspended.');
    return true;
  } catch (error) {
    console.error('[Behind. FINALE] Boot failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `Ending "${id}" could not start: ${error.message}`;
    return false;
  } finally {
    transitioning = false;
    el.veil?.classList.remove('is-active');
  }
}

/**
 * Load a collected cassette into the camcorder and begin playback immediately.
 * Chapter progress is snapshotted and restored when the recording ends.
 */
async function playCamcorderTape(tape) {
  if (!tape?.recordingId || !director || tapeSession || transitioning || camcorderReturning) return;
  if (!inventory?.has(CAMCORDER_ITEM_ID)) return;
  discoverTape(tape.id);
  // First viewing loads the loose cassette into the camcorder — leave the bar.
  const hadCassette = inventory.has(tape.id);
  if (hadCassette) {
    inventory.remove(tape.id);
    renderInventory();
  }
  camcorderResumeSnapshot = captureCheckpointSnapshot();
  const ok = await startTapeRecording(tape.recordingId, { fromCamcorder: true });
  if (!ok) {
    camcorderResumeSnapshot = null;
    if (hadCassette) {
      inventory.add(tape.id, tapeInventoryMeta(tape));
      renderInventory();
    }
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
    audio?.setLevelBedMuted?.(false);
    el.experience?.classList.remove('tape-mode');
    el.experience?.removeAttribute('data-tape');

    const target = snap.chapterId || 'corridor';
    director = createSceneDirector();
    if (target === 'corridor') {
      director.add('corridor', createCorridor(scene));
      director.add('elevator', createElevator(scene));
      el.location.innerHTML = ORIGINAL_LOCATION_HTML;
    } else if (target === 'office') {
      const { createOffice } = await import('./levels/office.js?v=note-size-2');
      director.add('office', createOffice(scene, { keypadCode: snap.office?.keypadCode || officeStory.state.keypadCode }));
      el.location.textContent = 'EAST ANNEX / OFFICE FLOOR';
    } else if (target === 'maintenance') {
      const { createMaintenance } = await import('./levels/maintenance.js?v=proc-7');
      const maintenanceModule = createMaintenance(scene, { procgen: procgenSession });
      director.add('maintenance', maintenanceModule);
      bindMaintenanceLayout(maintenanceModule);
      el.location.textContent = 'EAST ANNEX / SERVICE WING';
    } else if (target === 'interlude') {
      const { createInterlude } = await import('./levels/interlude.js?v=ib-9');
      const interludeModule = createInterlude(scene, interludeCreateOpts());
      director.add('interlude', interludeModule);
      bindInterludeLayout(interludeModule);
      el.location.textContent = 'SERVICE LEVEL / THE IN-BETWEEN';
    } else if (target === 'records') {
      const { createRecords } = await import('./levels/records.js?v=svc-1');
      director.add('records', createRecords(scene));
      el.location.textContent = 'EAST ANNEX / RECORDS';
    } else if (target === 'night') {
      const { createNightShift } = await import('./levels/night.js?v=night-bent-1');
      director.add('night', createNightShift(scene));
      el.location.textContent = 'SOUTH WING / NIGHT STAFF';
      look?.setMaxYaw(1.05); // face the kitchenette cork board from the rail
    } else if (target === 'stairwells') {
      const { createStairwells } = await import('./levels/stairwells.js?v=wake-4');
      director.add('stairwells', createStairwells(scene));
      el.location.innerHTML = 'THE STAIRWELLS <span class="separator">/</span> FLOOR 04';
      look?.setMaxYaw(1.45);
      camera.far = 720;
      camera.updateProjectionMatrix();
      camera.rotation.order = 'YXZ';
    } else if (target === 'threshold') {
      const { createThreshold } = await import('./levels/threshold.js?v=night-bent-1');
      director.add('threshold', createThreshold(scene));
      el.location.textContent = 'SOUTH WING / THE THRESHOLD';
      look?.setMaxYaw();
      camera.far = 65;
      camera.updateProjectionMatrix();
      camera.rotation.order = 'XYZ';
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
      if (spec.itemId && isTapeItemId(spec.itemId)
          && (inventory?.has(spec.itemId) || hasDiscoveredTape(spec.itemId))) {
        if (spec.object) {
          spec.object.visible = false;
          spec.object.userData.taken = true;
        }
        continue;
      }
      // Permanent weapons stay gone once collected.
      if ((spec.itemId === CROWBAR_ITEM_ID || spec.itemId === MACHETE_ITEM_ID
          || spec.itemId === REVOLVER_ITEM_ID)
          && inventory?.has(spec.itemId)) {
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
      if (isApartment() && (spec.id === 'apartment-white-dragon' || spec.id === 'apartment-black-dragon')) {
        if (apartmentStory.state.dragonTaken || inventory?.has(spec.itemId)) {
          if (spec.object) {
            spec.object.visible = false;
            spec.object.userData.taken = true;
          }
          continue;
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
  closeInventoryOverlays();
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
  closeInventoryOverlays();
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 40 : 780));
  memoryStoryFor().finishExit();
  look?.setMaxYaw();
  look?.reset();
  if (chapterId === 'memory-black') audio.exitMemoryBlack();
  else audio.exitMemoryWhite();

  // Story path: memory closes into the next chapter handoff (end card).
  const storyExit = memory.storyMemoryExitTo;
  memory.storyMemoryExitTo = null;
  if (storyExit === 'threshold' || storyExit === 'end') {
    director.get(chapterId)?.syncPhase(memoryStoryFor().state);
    bindChapterInteractables();
    renderer.render(scene, camera);
    transitioning = false;
    el.veil.classList.remove('is-active');
    showEndCard(storyExit === 'end' ? 'apartment-return' : 'apartment-first');
    return;
  }

  // Debug prototypes: return to the staging foyer.
  bindChapterInteractables();
  director.get(chapterId)?.syncPhase(memoryStoryFor().state);
  progress = displayed = 0.62;
  camera.position.set(0, 1.7, MEMORY_STAGING_START_Z - progress * MEMORY_STAGING_METERS);
  camera.rotation.set(0, 0, 0);
  window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
  scrollTrigger?.update();
  renderer.render(scene, camera);
  transitioning = false;
  el.veil.classList.remove('is-active');
}

/**
 * Apartment story visit → white/black remembered-home memory.
 * Skips the staging foyer; the dragon was already taken in the apartment.
 */
async function enterMemoryFromApartment() {
  if (!isApartment() || transitioning) return;
  const visit = apartmentStory.state.visit;
  if (visit !== 'first' && visit !== 'return') return;
  const target = visit === 'return' ? 'memory-black' : 'memory-white';
  transitioning = true;
  interaction?.close();
  closeInventoryOverlays();
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 40 : 820));
  let module = null;
  try {
    const mod = target === 'memory-black'
      ? await import('./levels/memory-black.js')
      : await import('./levels/memory-white.js');
    const create = target === 'memory-black' ? mod.createMemoryBlack : mod.createMemoryWhite;
    module = create(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    const memStory = memoryStoryFor(target);
    memStory.reset();
    memStory.takeDragon();
    memStory.enterMemory();
    director.add(target, module);
    director.activate(target);
    director.get(target)?.syncPhase(memStory.state);
    chapterId = target;
    apartmentStory.reset();
    memory.storyMemoryExitTo = visit === 'return' ? 'end' : 'threshold';
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    if (target === 'memory-black') audio.enterMemoryBlack();
    else audio.enterMemoryWhite();
    hideEndCard();
    el.location.textContent = target === 'memory-black'
      ? 'MEMORY / BLACK DRAGON'
      : 'MEMORY / WHITE DRAGON';
    look?.setMaxYaw(1.25);
    progress = displayed = 0;
    const pose = memoryHomeCameraPose(0, 'memory');
    camera.position.set(pose.x, 1.55, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    camera.far = 65;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'XYZ';
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    renderer.render(scene, camera);
    console.info(`[Behind.] Memory entered from apartment · ${target}`);
  } catch (error) {
    module?.dispose?.();
    console.error('[Behind.] Apartment → memory transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `Memory could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
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
  if (gameOverActive || gameOverBusy || transitioning || combatSession) return false;
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
  const equipped = inventory?.getEquippedWeaponId?.() || null;
  const kept = (inventory?.list() || []).filter(item =>
    String(item.id).startsWith('cigarette')
    || item.id === 'key-fob'
    || item.id === CAMCORDER_ITEM_ID
    || PERSISTENT_WEAPON_IDS.includes(item.id)
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
      cylinderLoaded: item.cylinderLoaded,
      cylinderCapacity: item.cylinderCapacity,
      ammoReserve: item.ammoReserve,
      qty: item.qty,
    });
  }
  if (equipped && inventory?.has(equipped)) inventory.equipWeapon(equipped);
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
      cylinderLoaded: item.cylinderLoaded ?? null,
      cylinderCapacity: item.cylinderCapacity ?? null,
      ammoReserve: item.ammoReserve ?? null,
      qty: item.qty ?? null,
    })),
    equippedWeaponId: inventory?.getEquippedWeaponId?.() || null,
    memory: {
      ...memory,
      chaptersCompleted: [...(memory.chaptersCompleted || [])],
      discoveredTapes: [...(memory.discoveredTapes || [])],
    },
    procgen: procgenSession.snapshot(),
    story: { ...story.state },
    office: { ...officeStory.state },
    maintenance: { ...maintenanceStory.state },
    interlude: { ...interludeStory.state },
    records: { ...recordsStory.state },
    hospital: { ...hospitalReverseStory.state },
    night: { ...nightStory.state },
    threshold: { ...thresholdStory.state },
    unseen: { ...unseenStory.state },
    stairwells: { ...stairwellsStory.state },
    apartment: { ...apartmentStory.state },
  };
}

function applyInventorySnapshot(items = [], equippedWeaponId = null) {
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
      cylinderLoaded: item.cylinderLoaded,
      cylinderCapacity: item.cylinderCapacity,
      ammoReserve: item.ammoReserve,
      qty: item.qty,
    });
  }
  if (equippedWeaponId && inventory?.has(equippedWeaponId)) {
    inventory.equipWeapon(equippedWeaponId);
  }
  renderInventory();
}

function saveChapterStartCheckpoint() {
  if (!['corridor', 'office', 'maintenance', 'interlude', 'records', 'hospital-reverse', 'stairwells', 'night', 'threshold', 'unseen', 'apartment'].includes(chapterId)) return;
  for (const key of [...savedCheckpointKeys]) {
    if (key.startsWith(`${chapterId}:`)) savedCheckpointKeys.delete(key);
  }
  checkpoints.saveChapterStart(captureCheckpointSnapshot());
}

const savedCheckpointKeys = new Set();

function saveSafeCheckpoint(reason = '') {
  if (!['corridor', 'office', 'maintenance', 'interlude', 'records', 'hospital-reverse', 'stairwells', 'night', 'threshold', 'unseen', 'apartment'].includes(chapterId)) return;
  if (gameOverActive || transitioning || steady?.isActive) return;
  if (reason && savedCheckpointKeys.has(`${chapterId}:${reason}`)) return;
  checkpoints.saveLatest(captureCheckpointSnapshot());
  if (reason) {
    savedCheckpointKeys.add(`${chapterId}:${reason}`);
    console.info(`[Behind.] Checkpoint · ${reason}`);
  }
}

function maybeAutoCheckpoint() {
  if (!['corridor', 'office', 'maintenance', 'interlude', 'records', 'hospital-reverse', 'stairwells', 'night', 'threshold', 'unseen', 'apartment'].includes(chapterId)) return;
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
  } else if (chapterId === 'stairwells'
      && progress >= (STAIRWELLS_MARKS.voidStart ?? 0.28) - 0.04
      && progress < (STAIRWELLS_MARKS.voidStart ?? 0.28)
      && !stairwellsStory.state.enteredVoid) {
    saveSafeCheckpoint('stairwells-pre-void');
  } else if (chapterId === 'stairwells'
      && stairwellsStory.state.snapped
      && !stairwellsStory.state.exitReady) {
    saveSafeCheckpoint('stairwells-after-snap');
  } else if (chapterId === 'threshold' && thresholdStory.state.reachedOrganic
      && !thresholdStory.state.ruptureArmed
      && !composureHits.has('threshold-rupture')) {
    saveSafeCheckpoint('threshold-pre-rupture');
  } else if (chapterId === 'night'
      && nightStory.state.coldHall
      && nightStory.state.lampOut
      && !nightStory.state.bentDefeated
      && !nightStory.state.bentCombatStarted
      && progress >= 0.78
      && progress < NIGHT_COMBAT_TRIGGER) {
    saveSafeCheckpoint('night-pre-bent');
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
  closeInventoryOverlays();
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
    } else if (target === 'maintenance') {
      Object.assign(maintenanceStory.state, snapshot.maintenance || {});
      director?.reset();
    } else if (target === 'interlude') {
      Object.assign(interludeStory.state, snapshot.interlude || {});
      ambushGrabAbort?.abort?.();
      audio.cancelReverseAmbushSfx?.();
      el.veil?.classList.remove('reverse-ambush-veil');
      const interludeMod = director?.get?.('interlude');
      const snapMode = snapshot.interlude?.encounterMode
        || (snapshot.interlude?.ambushEnabled ? 'reverse' : 'none');
      const snapEnemy = snapshot.interlude?.encounterEnemyId || 'bent';
      if (snapMode && snapMode !== 'none' && interludeMod?.plan) {
        interludeStory.armEncounter(
          { mode: snapMode, enemyId: snapEnemy },
          interludeMod.plan,
        );
        if (snapshot.interlude.encounterDefeated || snapshot.interlude.ambushDefeated) {
          interludeStory.markEncounterDefeated();
        } else {
          interludeStory.prepareEncounterRetry();
        }
        interludeMod.hideEncounterEnemy?.();
      } else {
        interludeStory.disarmEncounter();
      }
      director?.reset();
    } else if (target === 'records') {
      Object.assign(recordsStory.state, snapshot.records);
      director?.reset();
    } else if (target === 'hospital-reverse') {
      Object.assign(hospitalReverseStory.state, snapshot.hospital || {});
      director?.reset();
      cancelWardClankPeak();
      audio.cancelWardDelayedSfx?.();
    } else if (target === 'stairwells') {
      Object.assign(stairwellsStory.state, snapshot.stairwells || {});
      director?.reset();
      look?.setMaxYaw(1.45);
      camera.far = 720;
      camera.updateProjectionMatrix();
      camera.rotation.order = 'YXZ';
    } else if (target === 'night') {
      Object.assign(nightStory.state, snapshot.night || {});
      // Opt-in flag is session-scoped (URL / DEV TOOLS), not a story checkpoint.
      syncNightCombatFlag();
      director?.reset();
      look?.setMaxYaw(1.05);
      if (camera.far !== 65) {
        camera.far = 65;
        camera.updateProjectionMatrix();
      }
      camera.rotation.order = 'XYZ';
    } else if (target === 'threshold') {
      Object.assign(thresholdStory.state, snapshot.threshold || {});
      director?.reset();
      look?.setMaxYaw();
      if (camera.far !== 65) {
        camera.far = 65;
        camera.updateProjectionMatrix();
      }
      camera.rotation.order = 'XYZ';
    } else if (target === 'unseen') {
      Object.assign(unseenStory.state, snapshot.unseen || {});
      director?.reset();
    } else if (target === 'apartment') {
      Object.assign(apartmentStory.state, snapshot.apartment || {});
      director?.reset();
      director.get('apartment')?.setLightingMode?.(apartmentStory.state.lightingMode);
      director.get('apartment')?.setObjectState?.(apartmentStory.state.objects);
      look?.setMaxYaw(1.2);
    }
    composureHits.clear();
    for (const id of snapshot.composureHits || []) composureHits.add(id);
    applyInventorySnapshot(snapshot.inventory || [], snapshot.equippedWeaponId || null);
    inventoryMenu?.close?.();
    Object.assign(memory, snapshot.memory || {});
    if (Array.isArray(snapshot.memory?.chaptersCompleted)) {
      memory.chaptersCompleted = [...snapshot.memory.chaptersCompleted];
    }
    if (Array.isArray(snapshot.memory?.discoveredTapes)) {
      memory.discoveredTapes = [...snapshot.memory.discoveredTapes];
    } else if (!Array.isArray(memory.discoveredTapes)) {
      memory.discoveredTapes = [];
    }
    // Keep the run seed stable across checkpoint retries (older snaps: no-op).
    procgenSession.restore(snapshot.procgen);
    // Pre-feature saves: any cassette still carried counts as discovered.
    for (const item of inventory?.list() || []) {
      if (isTapeItemId(item.id)) discoverTape(item.id);
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
    resetOutsideDialogue();
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
  // Combat owns its own defeat / RETRY UI — never stack the chapter game-over.
  if (combatSession) return;
  if (gameOverActive || gameOverBusy) return;
  gameOverActive = true;
  gameOverBusy = true;
  steady?.cancel(true);
  interaction?.close();
  closeInventoryOverlays();
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
  resetOutsideDialogue();
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
  } else if (chapterId === 'maintenance') {
    maintenanceStory.reset();
    director?.reset();
    progress = displayed = 0;
  } else if (chapterId === 'interlude') {
    interludeStory.reset();
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

/** Close inventory + item chip panel during chapter handoffs. */
function closeInventoryOverlays() {
  closeItemDetail();
  inventoryMenu?.close?.();
}

function canOpenInventoryMenu() {
  if (!started || transitioning || ended || gameOverActive) return false;
  if (tapeSession || endingSession || combatSession) return false;
  if (steady?.isActive) return false;
  if (interaction?.isOpen || keypad?.isOpen) return false;
  if (el.ending?.classList.contains('is-visible')) return false;
  return true;
}

function toggleInventoryMenu() {
  if (inventoryMenu?.isOpen?.()) {
    inventoryMenu.close();
    return;
  }
  if (!canOpenInventoryMenu()) return;
  closeItemDetail();
  inventoryMenu?.open?.({ composureFull: composure.isFull });
}

function toggleEquipWeapon(itemId) {
  if (!inventory || !itemId) return;
  const def = resolveItemDef(itemId, inventory.get(itemId) || {});
  if (!def?.equipable) return;
  if (inventory.isEquipped(itemId)) inventory.equipWeapon(null);
  else inventory.equipWeapon(itemId);
  renderInventory();
}

function drawInventoryMenuPreview(canvas, item) {
  if (!canvas || !item) return;
  if (item.id === 'brass-key') drawBrassKeyPreview(canvas);
  else if (item.id === 'sticky-note') {
    drawStickyNotePreview(canvas, officeStory.state.keypadCode);
  } else if (item.id === 'key-fob') drawKeyFobPreview(canvas);
  else if (item.id === CAMCORDER_ITEM_ID) drawVhsCCamcorderPreview(canvas);
  else if (isTapeItemId(item.id)) {
    const tape = getTapeById(item.id);
    drawVhsCCassettePreview(
      canvas,
      tape ? `#${(tape.previewColor >>> 0).toString(16).padStart(6, '0')}` : '#1e2226',
    );
  } else if (item.id === 'stuffed-dragon-white'
      || String(item.id).startsWith('stuffed-dragon')) {
    drawStuffedDragonPreview(canvas, item.previewColor ?? 0xf2f0ea);
  } else if (String(item.id).startsWith('cigarette')) {
    drawCigarettePreview(canvas);
  } else if (item.id === CROWBAR_ITEM_ID) {
    drawCrowbarPreview(canvas);
  } else if (item.id === MACHETE_ITEM_ID) {
    drawMachetePreview(canvas);
  } else if (item.id === REVOLVER_ITEM_ID) {
    drawRevolverPreview(canvas);
  } else if (item.id === REVOLVER_AMMO_ITEM_ID) {
    drawRevolverAmmoPreview(canvas);
  } else {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** Lightweight 2D crowbar icon for inventory. */
function drawCrowbarPreview(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.18, h * 0.62);
  ctx.rotate(-0.55);
  ctx.fillStyle = '#3a3f42';
  ctx.fillRect(0, -5, w * 0.62, 10);
  ctx.fillStyle = '#5a5050';
  ctx.fillRect(w * 0.52, -14, 18, 28);
  ctx.fillStyle = '#2a2e30';
  ctx.fillRect(-8, -7, 14, 14);
  ctx.restore();
}

function drawMachetePreview(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.16, h * 0.58);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#2a241c';
  ctx.fillRect(0, -6, w * 0.22, 12);
  ctx.fillStyle = '#4a4030';
  ctx.fillRect(w * 0.14, -7, 10, 14);
  ctx.fillStyle = '#6a6e72';
  ctx.beginPath();
  ctx.moveTo(w * 0.22, -8);
  ctx.lineTo(w * 0.72, -4);
  ctx.lineTo(w * 0.72, 6);
  ctx.lineTo(w * 0.22, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9aa0a4';
  ctx.fillRect(w * 0.68, -5, 14, 8);
  ctx.restore();
}

function drawRevolverPreview(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#3a3834';
  ctx.fillRect(w * 0.22, h * 0.42, w * 0.42, 14);
  ctx.fillStyle = '#2a2824';
  ctx.beginPath();
  ctx.arc(w * 0.38, h * 0.48, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a4640';
  ctx.beginPath();
  ctx.arc(w * 0.38, h * 0.48, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e2a24';
  ctx.fillRect(w * 0.55, h * 0.38, w * 0.22, 10);
  ctx.fillStyle = '#1e1c18';
  ctx.fillRect(w * 0.18, h * 0.52, 18, 28);
}

function drawRevolverAmmoPreview(canvas) {
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;
  const cy = h * 0.48;
  for (let i = 0; i < 3; i += 1) {
    const x = cx - 28 + i * 28;
    ctx.fillStyle = '#8a7a48';
    ctx.fillRect(x - 5, cy - 22, 10, 36);
    ctx.fillStyle = '#c4b078';
    ctx.beginPath();
    ctx.arc(x, cy - 22, 6, 0, Math.PI * 2);
    ctx.fill();
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

function tapesOnCamcorder() {
  const ids = new Set(memory.discoveredTapes || []);
  for (const item of inventory?.list() || []) {
    if (isTapeItemId(item.id)) ids.add(item.id);
  }
  return listDiscoveredTapes(ids);
}

function populateCamcorderTapePanel() {
  if (!el.itemDetailTapes || !el.itemDetailTapeList) return;
  const collected = tapesOnCamcorder();
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
  return itemStackKey(item?.id, item);
}

function inventoryStacks(list) {
  const order = [];
  const map = new Map();
  for (const item of list) {
    const key = inventoryStackKey(item);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { key, items: [], representative: item });
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
  const total = list.length;
  const show = started && !ended && !tapeSession && !combatSession && !endingSession;
  // Single launcher replaces the old per-item chip stack.
  if (show) {
    const qty = total > 0
      ? `<span class="inventory__open-qty" aria-hidden="true">${total}</span>`
      : '';
    // Backpack — twin straps + front pocket (avoids the lock “shackle + body” read).
    const icon = '<svg class="inventory__open-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M8.2 9.2V6.4c0-1.2.9-2.2 2-2.2h0"/>'
      + '<path d="M15.8 9.2V6.4c0-1.2-.9-2.2-2-2.2h0"/>'
      + '<path d="M10.2 4.2h3.6"/>'
      + '<path d="M6.2 9.2h11.6v9.1c0 1.1-.9 2-2 2H8.2c-1.1 0-2-.9-2-2V9.2z"/>'
      + '<path d="M9 13.2h6v4.2H9z"/>'
      + '<path d="M11.2 15.3h1.6"/>'
      + '</svg>';
    el.inventory.innerHTML = `<button type="button" class="inventory__open" data-inventory-open aria-label="Open inventory${total ? `, ${total} items` : ''}">`
      + `${icon}${qty}</button>`;
  } else {
    el.inventory.innerHTML = '';
  }
  el.inventory.classList.toggle('is-visible', show);
  el.inventory.setAttribute('aria-hidden', String(!show));
  if (!show) {
    closeItemDetail();
    inventoryMenu?.close?.();
  } else {
    inventoryMenu?.setComposureFull?.(composure.isFull);
    inventoryMenu?.refresh?.();
  }
  // Keep stacks referenced for empty-state messaging inside the menu.
  void stacks;
}

function start() {
  if (started || !renderer || !director) return;
  started = true;
  rollPlaythroughSeed();
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
  renderInventory();
  console.info('[Behind.] 001.8 started · 5.5 m/s · sound 0.065 · return-pass narration');
}

function setEndCard(which) {
  if (which === 'corridor') {
    el.endingEyebrow.textContent = 'LEVEL 01 COMPLETE · THE CORRIDOR';
    el.endingTitle.innerHTML = 'NO ONE<br>ANSWERED.';
    el.endingCopy.textContent = 'The doors have closed in front of you.';
    el.continue.textContent = 'CONTINUE INTO THE OFFICE ↑';
    el.continue.hidden = false;
  } else if (which === 'interlude') {
    el.endingEyebrow.textContent = 'LEVEL 05B COMPLETE · THE IN-BETWEEN';
    el.endingTitle.innerHTML = 'STILL<br>ORDINARY.';
    el.endingCopy.textContent = 'The passage softens. Somewhere that almost feels like home.';
    el.continue.textContent = 'CONTINUE INTO THE APARTMENT ↑';
    el.continue.hidden = false;
  } else if (which === 'apartment-first') {
    el.endingEyebrow.textContent = 'THE APARTMENT · FIRST VISIT';
    el.endingTitle.innerHTML = 'INCOMPLETE<br>BUT WARM.';
    el.endingCopy.textContent = 'The white dragon stays with you. The rest of the building is still waiting.';
    el.continue.textContent = 'CONTINUE INTO THE THRESHOLD ↑';
    el.continue.hidden = false;
  } else if (which === 'apartment-return') {
    el.endingEyebrow.textContent = 'THE APARTMENT · RETURN';
    el.endingTitle.innerHTML = 'YOU CAME<br>BACK.';
    el.endingCopy.textContent = 'The black dragon remembers what you tried to leave.';
    el.continue.hidden = true;
  } else if (which === 'office') {
    el.endingEyebrow.textContent = 'LEVEL 02 COMPLETE · THE OFFICE';
    el.endingTitle.innerHTML = 'WHAT WAS<br>LEFT BEHIND.';
    el.endingCopy.textContent = 'The service passage leads into the maintenance wing.';
    el.continue.textContent = 'CONTINUE INTO THE SERVICE WING ↑';
    el.continue.hidden = false;
  } else if (which === 'maintenance') {
    el.endingEyebrow.textContent = 'SERVICE WING COMPLETE';
    el.endingTitle.innerHTML = 'STILL<br>WARM.';
    el.endingCopy.textContent = 'The corridor continues toward Records.';
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
    el.continue.textContent = 'CONTINUE INTO THE STAIRWELLS ↑';
    el.continue.hidden = false;
  } else if (which === 'stairwells') {
    el.endingEyebrow.textContent = 'LEVEL 05 COMPLETE · THE STAIRWELLS';
    el.endingTitle.innerHTML = 'YOU KEPT<br>GOING DOWN.';
    if (interludeSkip) {
      el.endingCopy.textContent = 'The stair door opens onto another corridor.';
      el.continue.textContent = 'CONTINUE INTO THE THRESHOLD ↑';
    } else {
      el.endingCopy.textContent = 'A quiet service passage waits below.';
      el.continue.textContent = 'CONTINUE INTO THE PASSAGE ↑';
    }
    el.continue.hidden = false;
  } else if (which === 'threshold') {
    el.endingEyebrow.textContent = 'LEVEL 06 COMPLETE · THE THRESHOLD';
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
    el.endingEyebrow.textContent = 'LEVEL 07 COMPLETE · THE UNSEEN';
    el.endingTitle.innerHTML = 'IT\'S STILL<br>THERE.';
    el.endingCopy.textContent = 'The access passage is silent. Something pulls you back.';
    el.continue.textContent = 'RETURN TO THE APARTMENT ↑';
    el.continue.hidden = false;
  }
}

function showEndCard(which) {
  ended = true;
  const id = which === 'corridor' ? '01'
    : which === 'office' ? '02'
      : which === 'maintenance' ? '02b'
        : which === 'records' ? '03'
          : which === 'night' ? '04'
            : which === 'stairwells' ? '05'
              : which === 'interlude' ? '05b'
                : which === 'apartment-first' ? 'apt-1'
                  : which === 'apartment-return' ? 'apt-2'
                : which === 'threshold' ? '06'
                  : which === 'hospital-reverse' ? 'ward'
                    : '07';
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
  closeInventoryOverlays();
  story.reset();
  officeStory.reset();
  maintenanceStory.reset();
  interludeStory.reset();
  interludeStory.clearLayout();
  interludeStory.disarmEncounter();
  activeProceduralEncounter = null;
  ambushGrabAbort?.abort?.();
  audio.cancelReverseAmbushSfx?.();
  ambushPreEncounterSnapshot = null;
  ambushFightStartLoadout = null;
  rollPlaythroughSeed();
  recordsStory.reset();
  nightStory.reset();
  stairwellsStory.reset();
  thresholdStory.reset();
  syncNightCombatFlag();
  bentTutorialPending = true;
  bentPreEncounterSnapshot = null;
  bentFightStartLoadout = null;
  unseenStory.reset();
  if (camera.far !== 65) {
    camera.far = 65;
    camera.updateProjectionMatrix();
  }
  if (camera.rotation.order !== 'XYZ') camera.rotation.order = 'XYZ';
  memory.chaptersCompleted.length = 0;
  memory.lighterEncountered = false;
  memory.keyFobEncountered = false;
  memory.photographPassed = false;
  memory.extraStepHeard = false;
  memory.keyPassed = false;
  memory.discoveredTapes = [];
  memory.storyMemoryExitTo = null;
  apartmentStory.reset();
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
  resetOutsideDialogue();
  progress = displayed = START_PROGRESS;
  camera.position.set(0, 1.7, REAR_CABIN_CAMERA_Z - START_PROGRESS * CORRIDOR_METERS);
  camera.rotation.set(0, 0, 0);
  window.scrollTo({ top: scrollYFor(START_PROGRESS), behavior: 'instant' });
  scrollTrigger?.update();
  monitor?.reset();
}

/** Corridor → The Office. */
async function enterOffice() {
  if (!ended || chapterId !== 'corridor' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  // All scene and camera reconfiguration happens during full occlusion.
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  try {
    const { createOffice } = await import('./levels/office.js?v=note-size-2');
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
 * Stairwells → The In-Between (story chapter 05B).
 * Seeded layout is cached for the playthrough so retries match.
 */
async function enterInterlude() {
  if (!ended || chapterId !== 'stairwells' || transitioning) return;
  if (interludeSkip) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    // Story path always uses the residential In-Between before the apartment.
    procgenSession.setTheme('residential');
    const { createInterlude, clearInterludePlanCache } = await import('./levels/interlude.js?v=ib-9');
    clearInterludePlanCache?.();
    module = createInterlude(scene, interludeCreateOpts());
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('interlude', module);
    director.activate('interlude');
    chapterId = 'interlude';
    stairwellsStory.reset();
    interludeStory.reset();
    bindInterludeLayout(module);
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterRecords();
    hideEndCard();
    el.location.textContent = 'SERVICE LEVEL / THE IN-BETWEEN';
    progress = displayed = 0;
    look?.setMaxYaw();
    camera.far = 65;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'XYZ';
    camera.position.set(0, 1.7, module.rail?.startZ ?? INTERLUDE_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info(
      `[Behind.] Level 05B entered · In-Between · theme=${procgenSession.theme}`
      + ` · seed=${procgenSession.seed}`
      + ` · ${module.rail?.meters?.toFixed?.(1) ?? '?'} m`
      + ` · encounter=${activeProceduralEncounter?.mode || 'none'}`
      + (activeProceduralEncounter?.enemyId
        ? ` · enemy=${activeProceduralEncounter.enemyId}`
        : ''),
    );
  } catch (error) {
    if (chapterId === 'stairwells') module?.dispose?.();
    console.error('[Behind.] In-Between transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The In-Between could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Office service passage → The Service Wing (maintenance).
 */
async function enterMaintenance() {
  if (!ended || chapterId !== 'office' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createMaintenance } = await import('./levels/maintenance.js?v=proc-7');
    module = createMaintenance(scene, { procgen: procgenSession });
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('maintenance', module);
    director.activate('maintenance');
    chapterId = 'maintenance';
    maintenanceStory.reset();
    bindMaintenanceLayout(module);
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterRecords(); // Quiet industrial bed until a dedicated bed exists.
    hideEndCard();
    el.location.textContent = 'EAST ANNEX / SERVICE WING';
    progress = displayed = 0;
    camera.position.set(0, 1.7, module.rail?.startZ ?? MAINTENANCE_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Service Wing entered · optional crowbar · no combat');
  } catch (error) {
    if (chapterId === 'office') module?.dispose?.();
    console.error('[Behind.] Service Wing transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Service Wing could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Service Wing → Records. Keep the frame covered while the previous floor
 * is unloaded; do not create a second renderer, canvas or scroll-controller.
 */
async function enterRecords() {
  if (!ended || chapterId !== 'maintenance' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createRecords } = await import('./levels/records.js?v=svc-1');
    module = createRecords(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
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
    if (chapterId === 'maintenance') module?.dispose?.();
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
    const { createNightShift } = await import('./levels/night.js?v=night-bent-1');
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
    syncNightCombatFlag();
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterNight();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / NIGHT STAFF';
    progress = displayed = 0;
    look?.setMaxYaw(1.05); // face the kitchenette cork board from the rail
    camera.position.set(0, 1.7, NIGHT_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 04 entered · Bent late-hall · 5.5 m/s cap');
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
 * Night Shift -> The Stairwells (Chapter 05).
 * Preserves the completed stair prototype: rail, void beat, snap, and exit.
 */
async function enterStairwells() {
  if (!ended || chapterId !== 'night' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createStairwells } = await import('./levels/stairwells.js?v=wake-4');
    module = createStairwells(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('stairwells', module);
    director.activate('stairwells');
    chapterId = 'stairwells';
    stairwellsStory.reset();
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterStairwells?.();
    hideEndCard();
    el.location.innerHTML = 'THE STAIRWELLS <span class="separator">/</span> FLOOR 04';
    progress = displayed = 0;
    look?.setMaxYaw(1.45);
    camera.far = 720;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'YXZ';
    const pose = stairwellsCameraPose(0);
    camera.position.set(pose.x, pose.y, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 05 entered · stairwells · 2.7 m/s descent');
  } catch (error) {
    if (chapterId === 'night') module?.dispose?.();
    console.error('[Behind.] Stairwells transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The Stairwells could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * In-Between → Apartment (first visit — white dragon memory).
 */
async function enterApartmentFirst() {
  if (!ended || chapterId !== 'interlude' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createApartment } = await import('./levels/apartment.js?v=apt-7');
    apartmentStory.reset({ visit: 'first', lightingMode: 'warm' });
    module = createApartment(scene, {
      lightingMode: apartmentStory.state.lightingMode,
      visit: 'first',
    });
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('apartment', module);
    director.activate('apartment');
    chapterId = 'apartment';
    interludeStory.reset();
    memory.storyMemoryExitTo = null;
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterMemoryWhite();
    hideEndCard();
    el.location.textContent = 'THE APARTMENT / FIRST VISIT';
    progress = displayed = 0;
    look?.setMaxYaw(1.2);
    camera.far = 65;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'XYZ';
    const pose = apartmentCameraPose(0);
    camera.position.set(pose.x, 1.65, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    module.setLightingMode?.(apartmentStory.state.lightingMode);
    module.setObjectState?.(apartmentStory.state.objects);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Apartment · first visit');
  } catch (error) {
    if (chapterId === 'interlude') module?.dispose?.();
    console.error('[Behind.] Apartment (first) transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The apartment could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Unseen → Apartment return (black dragon memory).
 */
async function enterApartmentReturn() {
  if (!ended || chapterId !== 'unseen' || transitioning) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createApartment } = await import('./levels/apartment.js?v=apt-7');
    apartmentStory.reset({ visit: 'return', lightingMode: 'night' });
    module = createApartment(scene, {
      lightingMode: apartmentStory.state.lightingMode,
      visit: 'return',
    });
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('apartment', module);
    director.activate('apartment');
    chapterId = 'apartment';
    unseenStory.reset();
    memory.storyMemoryExitTo = null;
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterMemoryBlack();
    hideEndCard();
    el.location.textContent = 'THE APARTMENT / RETURN';
    progress = displayed = 0;
    look?.setMaxYaw(1.2);
    camera.far = 65;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'XYZ';
    const pose = apartmentCameraPose(0);
    camera.position.set(pose.x, 1.65, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    module.setLightingMode?.(apartmentStory.state.lightingMode);
    module.setObjectState?.(apartmentStory.state.objects);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Apartment · return visit');
  } catch (error) {
    if (chapterId === 'unseen') module?.dispose?.();
    console.error('[Behind.] Apartment (return) transition failed:', error);
    el.fallback.hidden = false;
    el.fallback.textContent = `The apartment could not be loaded: ${error.message}`;
  } finally {
    transitioning = false;
    el.veil.classList.remove('is-active');
  }
}

/**
 * Apartment first visit (after white memory) or debug skip → Threshold (Chapter 06).
 * The occluding veil conceals chapter resource swaps; restore default camera
 * far/order before the red hall.
 */
async function enterThreshold() {
  if (!ended || transitioning) return;
  const fromSkip = chapterId === 'stairwells' && interludeSkip;
  const fromMemory = chapterId === 'memory-white';
  const fromApartment = chapterId === 'apartment' && apartmentStory.state.visit === 'first';
  if (!fromSkip && !fromMemory && !fromApartment) return;
  transitioning = true;
  el.veil.classList.add('is-active');
  await new Promise(resolve => setTimeout(resolve, reduced ? 25 : 720));
  let module = null;
  try {
    const { createThreshold } = await import('./levels/threshold.js?v=night-bent-1');
    module = createThreshold(scene);
    preserveCarryInventory();
    interaction?.clear();
    look?.reset();
    director.dispose();
    director = createSceneDirector();
    director.add('threshold', module);
    director.activate('threshold');
    chapterId = 'threshold';
    stairwellsStory.reset();
    interludeStory.reset();
    apartmentStory.reset();
    memoryWhiteStory.reset();
    thresholdStory.reset();
    memory.storyMemoryExitTo = null;
    syncNightCombatFlag();
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
    bindChapterInteractables();
    noteFogBase();
    syncComposureUi();
    audio.enterThreshold();
    hideEndCard();
    el.location.textContent = 'SOUTH WING / THE THRESHOLD';
    progress = displayed = 0;
    look?.setMaxYaw();
    camera.far = 65;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'XYZ';
    camera.position.set(0, 1.7, THRESHOLD_START_Z);
    camera.rotation.set(0, 0, 0);
    window.scrollTo({ top: scrollYFor(0), behavior: 'instant' });
    scrollTrigger?.update();
    lastTime = performance.now();
    saveChapterStartCheckpoint();
    renderer.render(scene, camera);
    console.info('[Behind.] Level 06 entered · 5.5 m/s max · procedural corruption');
  } catch (error) {
    module?.dispose?.();
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
    outsideDialogue.clearSession();
    el.line.classList.remove('is-outside');
    el.narrative.classList.remove('is-outside-voice');
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
    console.info('[Behind.] Level 07 entered · listen ahead / reverse to side exit');
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
  maintenance: { start: 0, z: MAINTENANCE_START_Z, location: 'EAST ANNEX / SERVICE WING' },
  records:   { start: 0, z: RECORDS_START_Z, location: 'EAST ANNEX / RECORDS' },
  night:     { start: 0, z: NIGHT_START_Z, location: 'SOUTH WING / NIGHT STAFF' },
  threshold: { start: 0, z: THRESHOLD_START_Z, location: 'SOUTH WING / THE THRESHOLD' },
  unseen:    { start: 0, z: UNSEEN_START_Z, location: 'SERVICE LEVEL / MAINTENANCE' },
  'memory-white': { start: 0, z: MEMORY_STAGING_START_Z, location: 'MEMORY / WHITE DRAGON (DEV)' },
  'memory-black': { start: 0, z: MEMORY_STAGING_START_Z, location: 'MEMORY / BLACK DRAGON (DEV)' },
  apartment: { start: 0, z: APARTMENT_START_Z, location: 'THE APARTMENT / DEBUG' },
  'hospital-reverse': { start: 0, z: HOSPITAL_REVERSE_START_Z, location: 'DEV / THE WARD' },
  interlude: { start: 0, z: INTERLUDE_START_Z, location: 'SERVICE LEVEL / THE IN-BETWEEN' },
  'stairwells': {
    start: 0,
    z: STAIRWELLS_START.z,
    location: 'THE STAIRWELLS <span class="separator">/</span> FLOOR 04',
  },
};

async function debugJumpToChapter(target, checkpoint = 'start') {
  if (!DEBUG_MODE || transitioning || !renderer || !DEV_CHAPTER_CONFIG[target]) return false;
  // Combat/ending prototypes dispose the chapter director; recreate an empty one.
  if (combatSession) {
    combatSession.dispose();
    combatSession = null;
  }
  if (!director) director = createSceneDirector();
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
    closeInventoryOverlays();
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
      const { createOffice } = await import('./levels/office.js?v=note-size-2');
      officeStory.reset();
      next.add('office', createOffice(scene, { keypadCode: officeStory.state.keypadCode }));
    } else if (target === 'maintenance') {
      const { createMaintenance } = await import('./levels/maintenance.js?v=proc-7');
      maintenanceStory.reset();
      const maintenanceModule = createMaintenance(scene, { procgen: procgenSession });
      next.add('maintenance', maintenanceModule);
      bindMaintenanceLayout(maintenanceModule);
    } else if (target === 'interlude') {
      const { createInterlude } = await import('./levels/interlude.js?v=ib-9');
      interludeStory.reset();
      const interludeModule = createInterlude(scene, interludeCreateOpts());
      next.add('interlude', interludeModule);
      bindInterludeLayout(interludeModule);
    } else if (target === 'records') {
      const { createRecords } = await import('./levels/records.js?v=svc-1');
      next.add('records', createRecords(scene));
    } else if (target === 'night') {
      const { createNightShift } = await import('./levels/night.js?v=night-bent-1');
      next.add('night', createNightShift(scene));
    } else if (target === 'threshold') {
      const { createThreshold } = await import('./levels/threshold.js?v=night-bent-1');
      next.add('threshold', createThreshold(scene));
    } else if (target === 'memory-white') {
      const { createMemoryWhite } = await import('./levels/memory-white.js');
      memoryWhiteStory.reset();
      next.add('memory-white', createMemoryWhite(scene));
    } else if (target === 'memory-black') {
      const { createMemoryBlack } = await import('./levels/memory-black.js');
      memoryBlackStory.reset();
      next.add('memory-black', createMemoryBlack(scene));
    } else if (target === 'apartment') {
      const { createApartment } = await import('./levels/apartment.js?v=apt-7');
      apartmentStory.reset({ visit: 'debug' });
      next.add('apartment', createApartment(scene, {
        lightingMode: apartmentStory.state.lightingMode,
        visit: 'debug',
      }));
    } else if (target === 'hospital-reverse') {
      const { createHospitalReverse } = await import('./levels/hospital-reverse.js?v=ward-gurney-side-1');
      hospitalReverseStory.reset();
      const wardMod = createHospitalReverse(scene);
      wardMod.setCamera?.(camera);
      next.add('hospital-reverse', wardMod);
    } else if (target === 'stairwells') {
      const { createStairwells } = await import('./levels/stairwells.js?v=wake-4');
      stairwellsStory.reset();
      next.add('stairwells', createStairwells(scene));
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
    if (target === 'night') look?.setMaxYaw(1.05); // kitchenette / cork board
    if (target !== 'stairwells' && camera.far !== 65) {
      camera.far = 65;
      camera.updateProjectionMatrix();
    }

    // Fresh chapter means no artificially unlocked doors, footsteps, or clues.
    // Office already rolled its keypad code before createOffice above.
    story.reset();
    if (target !== 'office') officeStory.reset();
    if (target !== 'maintenance') {
      maintenanceStory.reset();
      maintenanceStory.clearLayoutMarkers();
    }
    if (target !== 'interlude') {
      interludeStory.reset();
      interludeStory.clearLayout();
    }
    if (target !== 'records') recordsStory.reset();
    nightStory.reset();
    thresholdStory.reset();
    syncNightCombatFlag();
    unseenStory.reset();
    if (target !== 'memory-white') memoryWhiteStory.reset();
    if (target !== 'memory-black') memoryBlackStory.reset();
    if (target !== 'apartment') apartmentStory.reset();
    if (target !== 'hospital-reverse') hospitalReverseStory.reset();
    if (target !== 'stairwells') stairwellsStory.reset();
    memory.chaptersCompleted.length = 0;
    memory.lighterEncountered = false;
    memory.keyFobEncountered = false;
    memory.photographPassed = false;
    memory.extraStepHeard = false;
    memory.keyPassed = false;
    memory.storyMemoryExitTo = null;
    keypad?.close();
    cancelWardClankPeak();
    audio.cancelWardDelayedSfx?.();
    audio.reset();
    if (target === 'office') audio.enterOffice();
    else if (target === 'maintenance' || target === 'interlude' || target === 'records') {
      audio.enterRecords();
    }
    else if (target === 'night') audio.enterNight();
    else if (target === 'threshold') audio.enterThreshold();
    else if (target === 'unseen') audio.enterUnseen();
    else if (isMemoryChapter(target)) audio.enterMemoryStaging();
    else if (target === 'apartment') audio.enterMemoryWhite();
    else if (target === 'hospital-reverse') audio.enterHospitalReverse();
    else if (target === 'stairwells') audio.enterStairwells?.();

    hideEndCard();
    resetBriefDialogue();
    resetOutsideDialogue();
    el.location.innerHTML = DEV_CHAPTER_CONFIG[target].location;
    progress = displayed = target === 'unseen'
      ? unseenStory.seekCheckpoint(checkpoint) : DEV_CHAPTER_CONFIG[target].start;
    const maintenanceStartZ = target === 'maintenance'
      ? (director.get('maintenance')?.rail?.startZ ?? MAINTENANCE_START_Z)
      : DEV_CHAPTER_CONFIG[target].z;
    const interludeStartZ = target === 'interlude'
      ? (director.get('interlude')?.rail?.startZ ?? INTERLUDE_START_Z)
      : DEV_CHAPTER_CONFIG[target].z;
    const bootZ = target === 'maintenance' ? maintenanceStartZ
      : target === 'interlude' ? interludeStartZ
        : DEV_CHAPTER_CONFIG[target].z;
    camera.position.set(
      0,
      1.7,
      bootZ - (target === 'corridor' ? progress * CORRIDOR_METERS : 0),
    );
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
    if (target === 'stairwells') {
      const seek = stairwellsStory.seekCheckpoint(checkpoint, STAIRWELLS_MARKS);
      progress = displayed = seek.progress ?? 0;
      look?.setMaxYaw(1.45); // look left far enough to catch the void skyline
      // Far enough to catch the optional distant void skyline (−X).
      camera.far = 720;
      camera.updateProjectionMatrix();
      const pose = stairwellsCameraPose(progress);
      camera.rotation.order = 'YXZ';
      camera.position.set(pose.x, pose.y, pose.z);
      camera.rotation.set(pose.pitch, pose.yaw, 0);
    } else if (camera.rotation.order !== 'XYZ') {
      camera.rotation.order = 'XYZ';
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
    if (target === 'apartment') {
      look?.setMaxYaw(1.2); // kitchen bay + window
      const pose = apartmentCameraPose(progress);
      camera.position.set(pose.x, 1.65, pose.z);
      camera.rotation.set(pose.pitch, pose.yaw, 0);
      director.get('apartment')?.setLightingMode?.(apartmentStory.state.lightingMode);
      director.get('apartment')?.setObjectState?.(apartmentStory.state.objects);
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
        : target === 'maintenance' ? maintenanceStory.state
        : target === 'interlude' ? interludeStory.state
        : target === 'records' ? recordsStory.state : target === 'night' ? nightStory.state
          : target === 'threshold' ? thresholdStory.state
            : isMemoryChapter(target) ? memoryStoryFor(target).state
              : target === 'apartment' ? apartmentStory.state
              : target === 'hospital-reverse' ? hospitalReverseStory.state
                : target === 'stairwells' ? stairwellsStory.state
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
  if (chapterId === 'office') return enterMaintenance();
  if (chapterId === 'maintenance') return enterRecords();
  if (chapterId === 'records') return enterNightShift();
  if (chapterId === 'night') return enterStairwells();
  if (chapterId === 'stairwells') {
    return interludeSkip ? enterThreshold() : enterInterlude();
  }
  if (chapterId === 'interlude') return enterApartmentFirst();
  if (chapterId === 'memory-white') return enterThreshold();
  if (chapterId === 'apartment' && apartmentStory.state.visit === 'first') {
    return enterThreshold();
  }
  if (chapterId === 'threshold') return enterUnseen();
  if (chapterId === 'unseen') return enterApartmentReturn();
}

// Load the small developer UI ONLY when explicitly requested via ?debug=1.
// ?debug=1&level=05 also loads Level 05 (Stairwells) directly for bookmarked testing.
if (DEBUG_MODE) {
  import('./dev-chapters.js?v=ib-9').then(({ mountDevChapters }) => {
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
              : isMemoryChapter() ? memoryStoryFor().state.phase?.toUpperCase()
                : isApartment() ? (apartmentStory.state.zoneLabel || 'APARTMENT') : '',
    }), {
      grantWeapons() {
        if (!inventory) return;
        inventory.add(CROWBAR_ITEM_ID, {
          label: 'RUSTED CROWBAR',
          tooltip: 'Heavy iron. Flaking paint. Something someone left behind and never came back for.',
          previewColor: 0x3a3f42,
        });
        inventory.add(MACHETE_ITEM_ID, {
          label: 'WORN MACHETE',
          tooltip: 'A long blade with a taped grip. The edge is uneven but still mean.',
          previewColor: 0x6a6e72,
        });
        inventory.add(REVOLVER_ITEM_ID, createRevolverInventoryMeta({
          cylinderLoaded: 6,
          ammoReserve: 6,
        }));
        inventory.add(REVOLVER_AMMO_ITEM_ID, {
          label: 'REVOLVER ROUNDS',
          tooltip: 'Loose cartridges. Heavy for their size.',
          qty: 6,
          previewColor: 0x8a7a48,
        });
        if (!inventory.getEquippedWeaponId()) inventory.equipWeapon(CROWBAR_ITEM_ID);
        renderInventory();
        bindChapterInteractables();
      },
      grantCamcorder() {
        if (!inventory) return;
        inventory.add(CAMCORDER_ITEM_ID, camcorderInventoryMeta());
        renderInventory();
        bindChapterInteractables();
      },
      grantAllTapes() {
        if (!inventory) return;
        // Office cassette is findable in-world; only grant tapes still debug-only.
        for (const tape of TAPE_LIBRARY) {
          if (tape.id === 'tape-office-01') continue;
          inventory.add(tape.id, tapeInventoryMeta(tape));
          discoverTape(tape.id);
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
        const n = tapesOnCamcorder().length;
        return `Cam: ${cam} · tapes ${n}/${TAPE_LIBRARY.length}`;
      },
    }, {
      launchPrototype() {
        if (endingSession) return true;
        // Prefer a full reload so the prototype owns boot cleanly.
        const url = new URL(location.href);
        url.searchParams.set('debug', '1');
        url.searchParams.set('ending', 'finale-prototype');
        url.searchParams.delete('tape');
        location.href = url.toString();
        return true;
      },
    }, {
      launchPrototype() {
        if (combatSession) return true;
        return startCombatPrototypeSession();
      },
      getNightCombatEnabled: () => isNightCombatEnabled(),
      setNightCombatEnabled: (on) => setNightCombatEnabled(on),
      // Legacy aliases for older DEV panel builds.
      getThresholdCombatEnabled: () => isNightCombatEnabled(),
      setThresholdCombatEnabled: (on) => setNightCombatEnabled(on),
      async jumpToBentApproach() {
        nightCombatDisabled = false;
        syncNightCombatFlag();
        const ok = await debugJumpToChapter('night', 'start');
        if (!ok) return false;
        // Past lamp/cold hall, before Bent trigger.
        forceProgress(0.78);
        nightStory.state.absenceArmed = true;
        nightStory.state.lampOut = true;
        nightStory.state.lampDying = false;
        nightStory.state.coldHall = true;
        nightStory.state.hallDarkened = true;
        nightStory.state.warmth = 0.35;
        nightStory.state.bentSkipped = false;
        nightStory.state.bentDefeated = false;
        nightStory.state.bentCombatStarted = false;
        nightStory.state.bentNoticed = false;
        composureHits.add('night-first-step');
        composureHits.add('night-cadence');
        syncNightCombatFlag();
        return true;
      },
    }, {
      get enabled() { return procgenSession.enabled; },
      get seed() { return procgenSession.seed; },
      get theme() { return procgenSession.theme; },
      setTheme(next) {
        procgenSession.setTheme(next);
        void import('./levels/interlude.js?v=ib-9')
          .then(({ clearInterludePlanCache }) => clearInterludePlanCache())
          .catch(() => {});
        return procgenSession.theme;
      },
      get skipInterlude() { return interludeSkip; },
      setSkipInterlude(on) {
        interludeSkip = Boolean(on);
        return interludeSkip;
      },
      toggleSkipInterlude() {
        interludeSkip = !interludeSkip;
        return interludeSkip;
      },
      getStatus() {
        const skip = interludeSkip ? ' · story interlude SKIPPED' : '';
        const theme = ` · theme=${procgenSession.theme}`;
        const enc = activeProceduralEncounter || refreshActiveProceduralEncounter();
        const encounter = ` · encounter=${enc?.mode || 'none'}`
          + (enc?.enemyId ? `/${enc.enemyId}` : '');
        if (!procgenSession.enabled) {
          return `Procgen debug: off · seed=${procgenSession.seed}${theme}${encounter}${skip}`;
        }
        return `Procgen: ON · seed=${procgenSession.seed}${theme}${encounter}${skip}`;
      },
      get encounterMode() {
        return activeProceduralEncounter?.mode || proceduralEncounterOverride || 'none';
      },
      get encounterEnemy() {
        return activeProceduralEncounter?.enemyId || null;
      },
      setEncounterMode(mode) {
        proceduralEncounterOverride = mode;
        procgenSession.setEncounterMode?.(mode);
        refreshActiveProceduralEncounter();
        void import('./levels/interlude.js?v=ib-9')
          .then(({ clearInterludePlanCache }) => clearInterludePlanCache())
          .catch(() => {});
        return this.encounterMode;
      },
      get reverseAmbush() {
        return (activeProceduralEncounter?.mode || proceduralEncounterOverride) === 'reverse';
      },
      setReverseAmbush(on) {
        return this.setEncounterMode(on ? 'reverse' : 'none');
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
  if (event.target.closest('[data-inventory-open]')) {
    toggleInventoryMenu();
    return;
  }
  // Legacy chip path (if any remain)
  const btn = event.target.closest('[data-item-id]');
  if (!btn) return;
  const id = btn.dataset.itemId;
  const item = inventory?.get(id);
  if (item) openItemDetail({ id, ...item });
});
composure.subscribe((value) => {
  syncComposureUi(value);
  inventoryMenu?.setComposureFull?.(composure.isFull);
});
function onWalkKeyDown(event) {
  if (event.key === 'Escape') {
    if (tapeSession && camcorderResumeSnapshot) {
      event.preventDefault();
      void endCamcorderPlayback();
      return;
    }
    if (inventoryMenu?.isOpen?.()) {
      event.preventDefault();
      inventoryMenu.close();
      return;
    }
    closeItemDetail();
  }
  if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  // I toggles inventory (blocked during STEADY / tapes / combat / etc.)
  if (event.code === 'KeyI' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (started && !transitioning && !ended) {
      event.preventDefault();
      toggleInventoryMenu();
    }
    return;
  }
  if (!started || transitioning || ended) return;
  if (inventoryMenu?.isOpen?.()) return;
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
  const inMaintenance = chapterId === 'maintenance';
  const inInterlude = chapterId === 'interlude';
  const inRecords = chapterId === 'records';
  const inNight = chapterId === 'night';
  const inThreshold = chapterId === 'threshold';
  const inMemory = isMemoryChapter();
  const inApartment = isApartment();
  const inWard = isHospitalReverse();
  const inStairs = isStairwells();
  const state = inCorridor ? story.state
    : inOffice ? officeStory.state
      : inMaintenance ? maintenanceStory.state
        : inInterlude ? interludeStory.state
        : inRecords ? recordsStory.state
          : inNight ? nightStory.state
            : inThreshold ? thresholdStory.state
              : inMemory ? memoryStoryFor().state
                : inApartment ? apartmentStory.state
                : inWard ? hospitalReverseStory.state
                  : inStairs ? stairwellsStory.state : unseenStory.state;
  const narrative = inCorridor ? narrativeFor(p, state)
    : inOffice ? officeNarrative(p, state)
      : inMaintenance ? maintenanceNarrative(p, state)
        : inInterlude ? interludeNarrative(p, state)
        : inRecords ? recordsNarrative(p, state)
          : inNight ? nightNarrative(p, state)
            : inThreshold ? thresholdNarrative(p, state)
              : inMemory ? memoryHomeNarrative(p, state)
                : inApartment ? apartmentNarrative(p, state)
                : inWard ? hospitalReverseNarrative(p, state)
                  : inStairs ? stairwellsNarrative(p, state) : unseenNarrative(p, state);

  outsideDialogue.setReducedMotion(reduced);
  const dialogueBlocked = Boolean(combatSession || steady?.isActive);
  if (!dialogueBlocked) maybeArmOutsideDialogue(chapterId, p, state);
  // Pause outside timer during combat / STEADY so lines aren't burned unseen.
  const outside = dialogueBlocked ? null : outsideDialogue.tick(dt);

  const inUnseen = chapterId === 'unseen';
  const useBriefDialogue = inCorridor || inOffice || inMaintenance || inRecords || inNight
    || inStairs || inThreshold || inUnseen;

  let displayedLine;
  let dialogueSource = narrative.source === 'outside' ? 'outside' : 'protagonist';
  if (dialogueBlocked) {
    displayedLine = '';
    dialogueSource = 'protagonist';
  } else if (outside) {
    displayedLine = outside.line;
    dialogueSource = 'outside';
  } else if (useBriefDialogue) {
    displayedLine = showBriefDialogue(
      chapterId,
      narrative.line,
      dt,
      narrative.dialogueId || null,
    );
    dialogueSource = 'protagonist';
  } else {
    displayedLine = narrative.line;
    dialogueSource = 'protagonist';
  }

  if (narrative.chapter !== el.chapter.textContent) el.chapter.textContent = narrative.chapter;
  if (el.line.textContent !== displayedLine) el.line.textContent = displayedLine;
  el.line.classList.toggle('is-outside', dialogueSource === 'outside');
  el.narrative.classList.toggle('is-outside-voice', dialogueSource === 'outside');
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
  } else if ((inMaintenance || inRecords || inNight || inThreshold || inWard || chapterId === 'unseen')
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
  } else if (inInterlude) {
    if (state.completed && !ended) showEndCard('interlude');
    else if (p < 0.92 && ended) hideEndCard();
  } else if (inMaintenance) {
    if (state.completed && !ended) showEndCard('maintenance');
    else if (p < 0.92 && ended) hideEndCard();
  } else if (inRecords) {
    memory.photographPassed ||= state.photoPassed;
    if (state.completed && !ended) showEndCard('records');
    else if (p < 0.94 && ended) hideEndCard();
  } else if (inNight) {
    memory.extraStepHeard ||= state.absenceArmed || state.footstepHeard;
    if (state.completed && p >= NIGHT_END_PROGRESS && !ended
        && (state.bentDefeated || state.bentSkipped || !state.bentEnabled)) {
      showEndCard('night');
    } else if (p < NIGHT_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inThreshold) {
    memory.keyPassed ||= state.reachedKey;
    if (state.completed && p >= THRESHOLD_END_PROGRESS && !ended) showEndCard('threshold');
    else if (p < THRESHOLD_END_PROGRESS - 0.035 && ended) hideEndCard();
  } else if (inWard) {
    if (state.completed && !ended) showEndCard('hospital-reverse');
    else if (!state.completed && ended) hideEndCard();
  } else if (inStairs) {
    if (state.completed && !ended) showEndCard('stairwells');
    else if (p < (STAIRWELLS_MARKS.exitStart ?? 0.98) - 0.025 && ended) hideEndCard();
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

  // Debug ending prototype: owns corridor walk + scripted reveal.
  if (endingSession) {
    endingSession.update(dt);
    cigaretteFx?.update(dt);
    renderer.render(scene, camera);
    monitor?.update(dt, true, !document.hidden);
    return;
  }

  // Debug combat: arena teleports; in-world keeps Threshold camera + ambient.
  if (combatSession) {
    combatSession.update(dt);
    if (combatSession.mode === 'in-world') {
      // Limited look only — scroll / interact stay blocked.
      // Must ASSIGN base+yaw (look returns absolute offset). += spun the camera.
      look?.setEnabled(true);
      camera.rotation.y = bentCombatBaseYaw + (look?.update(dt, reduced) ?? 0);
      // Hold scroll pin so the rail cannot drift under the fight.
      if (bentCombatFrozenProgress != null) {
        window.scrollTo({
          top: scrollYFor(bentCombatFrozenProgress),
          behavior: 'instant',
        });
      }
    }
    cigaretteFx?.update(dt);
    renderer.render(scene, camera);
    monitor?.update(dt, true, !document.hidden);
    return;
  }

  if (started && !transitioning && !gameOverActive && !(ended && chapterId === 'office')) {
    const meters = chapterMeters();
    const walkSpeed = chapterWalkSpeed();
    const inventoryOpen = Boolean(inventoryMenu?.isOpen?.());
    if (inventoryOpen) {
      // Freeze rail travel while the full-screen inventory is open.
      walkKeys.forward = walkKeys.back = false;
      window.scrollTo({ top: scrollYFor(progress), behavior: 'instant' });
    } else {
      // Apply held walk keys before reading scroll so look keys can't cancel motion.
      const walkDir = (walkKeys.forward ? 1 : 0) + (walkKeys.back ? -1 : 0);
      if (walkDir !== 0 && !interaction?.isOpen && !keypad?.isOpen) {
        const keyStep = walkSpeed * dt / meters;
        const next = progress + walkDir * keyStep;
        window.scrollTo({ top: scrollYFor(THREE.MathUtils.clamp(next, 0, 1)), behavior: 'instant' });
      }
      setProgress(nativeProgress());
    }
    const previousDisplayed = displayed;
    const eased = (progress - displayed) * (reduced ? 1 : 1 - Math.exp(-dt * 5));
    const startZ = chapterId === 'corridor' ? REAR_CABIN_CAMERA_Z
      : chapterId === 'office' ? OFFICE_START_Z
        : chapterId === 'maintenance'
          ? (maintenanceRail()?.startZ ?? MAINTENANCE_START_Z)
        : chapterId === 'interlude'
          ? (interludeRail()?.startZ ?? INTERLUDE_START_Z)
        : chapterId === 'records' ? RECORDS_START_Z
          : chapterId === 'night' ? NIGHT_START_Z
            : chapterId === 'threshold' ? THRESHOLD_START_Z
              : isMemoryChapter() ? MEMORY_STAGING_START_Z
                : isApartment() ? APARTMENT_START_Z
                : isHospitalReverse() ? HOSPITAL_REVERSE_START_Z
                  : isStairwells() ? STAIRWELLS_START.z : UNSEEN_START_Z;
    const step = walkSpeed * dt / meters;
    displayed = clamp(displayed + THREE.MathUtils.clamp(eased, -step, step));
    const bounds = progressBounds();
    displayed = THREE.MathUtils.clamp(displayed, bounds.min, bounds.max);
    // Snap to rail ends so float asymptotes cannot softlock triggers (e.g. Bent @ 0.69).
    if (bounds.max < 1 && displayed > bounds.max - 1e-4) displayed = bounds.max;
    if (bounds.min > 0 && displayed < bounds.min + 1e-4) displayed = bounds.min;
    const p = displayed;
    if (chapterId === 'corridor') story.observe(previousDisplayed, p);
    else if (chapterId === 'maintenance') {
      maintenanceStory.observe(previousDisplayed, p, dt);
    } else if (chapterId === 'interlude') {
      interludeStory.observe(previousDisplayed, p, dt);
      if (interludeStory.state.encounterNoticed) {
        void maybeRevealForwardEncounterEnemy();
      }
      maybeStartForwardBlockCombat();
      maybeStartReverseAmbushCombat();
    } else if (chapterId === 'office') {
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
      maybeStartNightBentCombat();
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
    } else if (isApartment()) {
      apartmentStory.observe(previousDisplayed, p);
    } else if (isStairwells()) {
      stairwellsStory.observe(previousDisplayed, p, STAIRWELLS_MARKS);
      const s = stairwellsStory.state;
      let loc = 'THE STAIRWELLS';
      if (s.phase === 'void') loc += ' <span class="separator">/</span> ???';
      else if (s.phase === 'exit') loc += ' <span class="separator">/</span> EXIT';
      else {
        const floorLabel = String(s.currentFloor).padStart(2, '0');
        loc += ` <span class="separator">/</span> FLOOR ${floorLabel}`;
      }
      if (el.location.innerHTML !== loc) el.location.innerHTML = loc;
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
    // Stairwells need YXZ so pitch stays "look down" after 180° landing turns.
    // Other chapters keep the Three.js default XYZ.
    camera.rotation.order = isStairwells() ? 'YXZ' : 'XYZ';
    camera.rotation.set(
      reduced ? 0 : Math.sin(p * 6) * 0.009
        + (sway ? Math.sin(now * 0.0019) * 0.004 * sway : 0),
      reduced ? 0 : Math.sin(p * 5) * 0.012,
      sway && !reduced ? Math.sin(now * 0.0014) * 0.003 * sway : 0
    );
    if (chapterId === 'corridor') {
      const route = corridorCameraPose(
        p,
        Boolean(director.get('corridor')?.isLockedDoorOpen?.()),
      );
      camera.position.x += route.x;
      camera.position.z = route.z;
      camera.rotation.y += route.yaw;
    } else if (chapterId === 'maintenance') {
      const route = maintenanceCameraPose(p, maintenanceRail());
      camera.position.x = route.x;
      camera.position.z = route.z;
      camera.rotation.y = route.yaw ?? 0;
      camera.rotation.x = route.pitch ?? 0;
    } else if (chapterId === 'interlude') {
      const route = interludeCameraPose(p, interludeRail());
      camera.position.x = route.x;
      camera.position.z = route.z;
      camera.rotation.y = route.yaw ?? 0;
      camera.rotation.x = route.pitch ?? 0;
    } else if (chapterId === 'office') {
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
    } else if (isStairwells()) {
      const route = stairwellsCameraPose(p);
      const bob = reduced ? 0 : Math.sin(p * 65) * 0.01;
      const swayX = reduced ? 0 : Math.sin(p * 26) * 0.018;
      camera.position.set(route.x + swayX, route.y + bob, route.z);
      camera.rotation.set(
        route.pitch + (reduced ? 0 : Math.sin(p * 6) * 0.008),
        route.yaw + (reduced ? 0 : Math.sin(p * 5) * 0.01),
        sway && !reduced ? Math.sin(now * 0.0014) * 0.003 * sway : 0,
      );
    } else if (isMemoryChapter() && memoryStoryFor().state.phase === 'memory') {
      const route = memoryHomeCameraPose(p, 'memory');
      camera.position.set(route.x, 1.55, route.z);
      camera.rotation.set(route.pitch, route.yaw, 0);
    } else if (isApartment()) {
      const route = apartmentCameraPose(p);
      camera.position.set(route.x, 1.65, route.z);
      camera.rotation.set(route.pitch, route.yaw, 0);
    }

    const uiBlocking = interaction?.isOpen || keypad?.isOpen
      || el.itemDetail?.classList.contains('is-open')
      || Boolean(inventoryMenu?.isOpen?.());
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
        : chapterId === 'maintenance' ? maintenanceStory.state
        : chapterId === 'interlude' ? interludeStory.state
        : chapterId === 'records' ? recordsStory.state
          : chapterId === 'night' ? nightStory.state
            : chapterId === 'threshold' ? thresholdStory.state
              : chapterId === 'unseen' ? unseenStory.state
                : isMemoryChapter() ? memoryStoryFor().state
                  : isApartment() ? apartmentStory.state
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
    } else if (chapterId === 'maintenance') {
      director.update(p, maintenanceStory.state, dt, reduced);
      audio.updateRecords(p, maintenanceStory.state);
    } else if (chapterId === 'interlude') {
      director.update(p, interludeStory.state, dt, reduced);
      audio.updateRecords(p, interludeStory.state);
      audio.updateReverseAmbushApproach?.(interludeStory.state);
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
    } else if (isApartment()) {
      director.update(p, apartmentStory.state, dt, reduced);
      // Soft warm bed (same bed as white memory); apartment has no staging/memory phases.
      audio.updateMemoryWhite?.(p, { phase: 'memory', variant: 'white' });
    } else if (isHospitalReverse()) {
      director.update(p, hospitalReverseStory.state, dt, reduced);
      audio.updateHospitalReverse(p, hospitalReverseStory.state);
    } else if (isStairwells()) {
      director.update(p, stairwellsStory.state, dt, reduced);
      audio.updateStairwells?.(p, stairwellsStory.state);
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
  combatSession?.dispose?.();
  combatSession = null;
  endingSession?.dispose?.();
  tapeSession?.dispose?.();
  director?.dispose();
  renderer?.dispose();
}, { once: true });
