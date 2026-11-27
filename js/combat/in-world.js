import * as THREE from 'three';
import { createCombatState } from './state.js';
import { createCombatUi } from './ui.js';
import { CROWBAR_ITEM_ID } from '../items/catalog.js';
import { BENT_COMBAT_CONFIG, BENT_ENCOUNTER_ID } from './encounters/the-bent.js';

/**
 * In-world combat session — keeps the active chapter scene and camera.
 * Story encounters and debug experiments share this path (no arena teleport).
 *
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {THREE.Camera} opts.camera
 * @param {object} opts.enemy  Visual with STATES / setState / update / reset
 * @param {object} [opts.config] Combat config (defaults to The Bent)
 * @param {object} [opts.loadout]
 * @param {boolean} [opts.reduced]
 * @param {boolean} [opts.showTutorial]
 * @param {boolean} [opts.storyMode]  Mandatory fight — no skip/exit to clear path
 * @param {string} [opts.eyebrow]
 * @param {(dt: number) => void} [opts.onFrame] Ambient chapter update while frozen
 * @param {(result: { snapshot: object }) => void | Promise<void>} opts.onVictory
 * @param {() => void | Promise<void>} opts.onRetry
 * @param {() => void | Promise<void>} [opts.onExit]
 */
export async function startInWorldCombat({
  scene,
  camera,
  enemy,
  config = BENT_COMBAT_CONFIG,
  loadout = null,
  reduced = false,
  showTutorial = true,
  storyMode = false,
  eyebrow = 'IN-WORLD COMBAT · DEBUG',
  onFrame,
  onVictory,
  onRetry,
  onExit,
} = {}) {
  const experience = document.getElementById('experience');
  experience?.classList.add('combat-mode', 'combat-mode--in-world');
  experience?.setAttribute('data-combat', BENT_ENCOUNTER_ID);
  if (storyMode) experience?.classList.add('combat-mode--story');

  document.getElementById('inventory')?.classList.remove('is-visible');
  document.getElementById('inventory')?.setAttribute('aria-hidden', 'true');
  document.getElementById('inspect')?.setAttribute('aria-hidden', 'true');
  document.getElementById('item-detail')?.setAttribute('aria-hidden', 'true');
  document.getElementById('steady')?.classList.remove('is-active');

  const initialLoadout = {
    composure: loadout?.composure ?? config.player.composureStart,
    cigarettes: loadout?.cigarettes ?? config.player.cigaretteCount ?? 0,
    equippedWeaponId: loadout && 'equippedWeaponId' in loadout
      ? loadout.equippedWeaponId
      : (config.player.startEquippedWeaponId
        || (config.player.startWithCrowbarEquipped ? CROWBAR_ITEM_ID : null)),
    cylinderLoaded: loadout?.cylinderLoaded ?? config.player.revolverCylinderLoaded ?? 0,
    ammoReserve: loadout?.ammoReserve ?? config.player.revolverAmmoReserve ?? 0,
    cylinderCapacity: loadout?.cylinderCapacity ?? config.player.revolverCylinderCapacity ?? 6,
  };

  let machine = createCombatState(config, initialLoadout);
  let busy = false;
  let disposed = false;
  let exitRequested = false;
  let continueResolver = null;
  let muzzleLight = null;
  let victoryPending = false;

  function sleep(ms) {
    const t = reduced ? Math.min(ms, 120) : ms;
    if (t <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, t));
  }

  function clearContinueWait() {
    if (continueResolver) {
      const resolve = continueResolver;
      continueResolver = null;
      resolve();
    }
    ui?.setContinuePrompt?.(false);
  }

  function waitForContinue() {
    clearContinueWait();
    ui.setContinuePrompt(true);
    ui.render(machine.snapshot());
    return new Promise((resolve) => {
      continueResolver = resolve;
    }).then(() => {
      ui.setContinuePrompt(false);
      continueResolver = null;
    });
  }

  function playFx(fx) {
    if (!fx || reduced) return;
    if (fx.ballistic || fx.damageType === 'ballistic') {
      if (!muzzleLight) {
        muzzleLight = new THREE.PointLight(0xd8c49a, 0, 10, 2);
        muzzleLight.position.copy(enemy.root.position);
        muzzleLight.position.y += 1.4;
        muzzleLight.position.z += 0.8;
        scene.add(muzzleLight);
      }
      muzzleLight.intensity = 1.6;
      window.setTimeout(() => {
        if (muzzleLight) muzzleLight.intensity = 0;
      }, 90);
    }
  }

  const ui = createCombatUi({
    eyebrow,
    exitLabel: storyMode ? '' : 'EXIT TEST',
    allowExit: !storyMode,
    showTutorial,
    onCommand: (cmd) => { void handleCommand(cmd); },
    onItemSelect: (itemId) => { void handleCommand('item', { itemId }); },
    onItemCancel: () => { ui.render(machine.snapshot()); },
    onRetry: () => { void handleRetry(); },
    onExit: () => { void handleExit(); },
    onContinue: () => { clearContinueWait(); },
  });
  ui.setVisible(true);

  // Enter combat idle (blocking stance).
  if (enemy.STATES?.idle) enemy.setState(enemy.STATES.idle);
  syncEnemyPoseToState(machine.snapshot());
  ui.render(machine.snapshot());

  const onKey = (event) => {
    if (disposed || exitRequested) return;
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;

    if (continueResolver) {
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        clearContinueWait();
        return;
      }
      if (event.code === 'Escape' && !storyMode) {
        event.preventDefault();
        void handleExit();
      }
      return;
    }

    if (ui.isTutorialOpen?.()) {
      if (event.code === 'Escape' || event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        ui.dismissTutorial?.();
      }
      return;
    }

    if (ui.isItemPickerOpen?.()) {
      if (event.code === 'Escape') {
        event.preventDefault();
        ui.setItemPicker(false);
        ui.render(machine.snapshot());
      }
      return;
    }

    if (busy || victoryPending) return;
    const map = {
      Digit1: 'attack', Numpad1: 'attack',
      Digit2: 'observe', Numpad2: 'observe',
      Digit3: 'guard', Numpad3: 'guard',
      Digit4: 'item', Numpad4: 'item',
      Escape: '__exit',
    };
    const action = map[event.code];
    if (!action) return;
    event.preventDefault();
    if (action === '__exit') {
      if (!storyMode) void handleExit();
      return;
    }
    void handleCommand(action);
  };
  window.addEventListener('keydown', onKey);

  const blockWheel = (event) => {
    if (!disposed) event.preventDefault();
  };
  window.addEventListener('wheel', blockWheel, { passive: false });

  function syncEnemyPoseToState(snap) {
    if (!snap || snap.isOver) return;
    if (snap.phase === 'player' && snap.telegraphActive) {
      if (enemy.state !== enemy.STATES.preparing) {
        enemy.setState(enemy.STATES.preparing);
      }
    } else if (snap.phase === 'player'
        && (enemy.state === enemy.STATES.preparing
          || enemy.state === enemy.STATES.attacking)) {
      enemy.setState(enemy.STATES.idle);
    }
  }

  async function handleCommand(cmd, opts = {}) {
    if (disposed || busy || exitRequested || victoryPending) return;
    const snap = machine.snapshot();
    if (!snap.canAct) return;

    if (cmd === 'item' && !opts.itemId) {
      ui.setItemPicker(true, snap);
      ui.render(snap);
      return;
    }

    busy = true;
    ui.setCommandsEnabled(false);
    const result = machine.playerAct(cmd, opts);
    ui.render(result.state);

    if (!result.ok) {
      busy = false;
      ui.render(machine.snapshot());
      return;
    }

    playFx(result.fx);

    if (cmd === 'attack') {
      enemy.setState(enemy.STATES.recoiling);
    } else if ((cmd === 'observe' || cmd === 'guard') && !result.state.telegraphActive) {
      enemy.setState(enemy.STATES.idle);
    }

    if (result.ended) {
      enemy.setState(enemy.STATES.defeated);
      await sleep(config.timing.endHoldMs);
      victoryPending = true;
      busy = false;
      const finalSnap = machine.snapshot();
      ui.render(finalSnap);
      disposeSession({ keepEnemy: true });
      await onVictory?.({ snapshot: finalSnap });
      return;
    }

    if (cmd === 'observe') {
      await waitForContinue();
      if (disposed || exitRequested) return;
    } else {
      await sleep(config.timing.resolveMs);
      if (disposed || exitRequested) return;
    }

    machine.beginEnemyPhase();
    enemy.setState(enemy.STATES.preparing);
    ui.render(machine.snapshot());
    await sleep(
      result.state.telegraphActive || machine.snapshot().nextAttack?.telegraph
        ? config.timing.enemyTelegraphMs
        : Math.min(280, config.timing.enemyTelegraphMs),
    );
    if (disposed || exitRequested) return;

    enemy.setState(enemy.STATES.attacking);
    const enemyResult = machine.enemyAct();
    ui.render(enemyResult.state);
    await sleep(config.timing.enemyAttackMs);
    if (disposed || exitRequested) return;

    if (enemyResult.ended) {
      busy = false;
      ui.render(machine.snapshot());
      return;
    }

    if (enemy.state === enemy.STATES.attacking || enemy.state === enemy.STATES.preparing) {
      enemy.setState(enemy.STATES.idle);
    }
    syncEnemyPoseToState(enemyResult.state);
    busy = false;
    ui.render(machine.snapshot());
  }

  async function handleRetry() {
    if (disposed || busy) return;
    busy = true;
    clearContinueWait();
    ui.setItemPicker?.(false);
    disposeSession({ keepEnemy: true });
    await onRetry?.();
  }

  async function handleExit() {
    if (disposed || exitRequested || storyMode) return;
    exitRequested = true;
    busy = true;
    clearContinueWait();
    disposeSession({ keepEnemy: true });
    await onExit?.();
  }

  function disposeSession({ keepEnemy = false } = {}) {
    if (disposed) return;
    disposed = true;
    clearContinueWait();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', blockWheel);
    if (muzzleLight) {
      scene.remove(muzzleLight);
      muzzleLight.dispose?.();
      muzzleLight = null;
    }
    ui.dispose();
    if (!keepEnemy) enemy.dispose?.();
    experience?.classList.remove('combat-mode', 'combat-mode--in-world', 'combat-mode--story');
    experience?.removeAttribute('data-combat');
  }

  return {
    id: BENT_ENCOUNTER_ID,
    mode: 'in-world',
    get active() { return !disposed; },
    get frozen() { return !disposed; },
    update(dt) {
      if (disposed) return;
      enemy.update(dt);
      onFrame?.(dt);
    },
    dispose() {
      exitRequested = true;
      disposeSession({ keepEnemy: true });
    },
  };
}
