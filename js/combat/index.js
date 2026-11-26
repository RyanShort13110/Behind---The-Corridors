import * as THREE from 'three';
import { COMBAT_CONFIG } from './config.js';
import { createCombatState } from './state.js';
import { createCombatEnemy } from './enemy.js';
import { createCombatArena } from './arena.js';
import { createCombatUi } from './ui.js';

/**
 * Debug-only turn-based combat prototype.
 * Access: DEV TOOLS → TEST COMBAT (requires ?debug=1)
 *
 * Does not touch story composure, inventory, checkpoints, or chapter progress.
 */

export const COMBAT_PROTOTYPE_ID = 'combat-prototype';

function sleep(ms, reduced) {
  const t = reduced ? Math.min(ms, 120) : ms;
  if (t <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, t));
}

/**
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {THREE.Camera} opts.camera
 * @param {object} [opts.director] previous chapter director (disposed by caller or here)
 * @param {() => object} opts.createSceneDirector
 * @param {boolean} [opts.reduced]
 * @param {() => void | Promise<void>} opts.onExit restore normal gameplay
 */
export async function startCombatPrototype({
  scene,
  camera,
  director,
  createSceneDirector,
  reduced = false,
  onExit,
} = {}) {
  const experience = document.getElementById('experience');
  experience?.classList.add('is-playing', 'combat-mode');
  experience?.setAttribute('data-combat', COMBAT_PROTOTYPE_ID);

  document.getElementById('intro')?.classList.add('is-hidden');
  document.getElementById('topbar')?.classList.add('active');
  document.getElementById('bottom')?.classList.remove('active');
  document.getElementById('composure')?.classList.remove('is-active');
  document.getElementById('composure')?.setAttribute('aria-hidden', 'true');
  document.getElementById('inventory')?.classList.remove('is-visible');
  document.getElementById('inventory')?.setAttribute('aria-hidden', 'true');
  document.getElementById('narrative')?.classList.remove('active');
  document.getElementById('inspect')?.setAttribute('aria-hidden', 'true');
  document.getElementById('item-detail')?.setAttribute('aria-hidden', 'true');
  document.getElementById('keypad')?.classList.remove('is-open');
  document.getElementById('steady')?.classList.remove('is-active');
  document.getElementById('game-over')?.classList.remove('is-active');

  const location = document.getElementById('location');
  if (location) location.textContent = 'SERVICE LEVEL / COMBAT PROTOTYPE';

  // Clear chapter world; combat owns a private arena.
  director?.dispose?.();
  const localDirector = createSceneDirector?.() ?? null;

  const prevBg = scene.background?.clone?.() ?? scene.background;
  const prevFog = scene.fog;
  scene.background = new THREE.Color(0x070b0d);
  scene.fog = new THREE.FogExp2(0x070b0d, 0.07);

  const arena = createCombatArena();
  scene.add(arena.world);

  const enemy = createCombatEnemy({ reduced });
  enemy.root.position.copy(arena.enemyPosition);
  arena.world.add(enemy.root);

  const pose = arena.cameraPose;
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(pose.pitch, pose.yaw, 0);
  camera.up.set(0, 1, 0);
  camera.far = 40;
  camera.updateProjectionMatrix();

  let machine = createCombatState(COMBAT_CONFIG);
  let busy = false;
  let disposed = false;
  let exitRequested = false;

  const ui = createCombatUi({
    onCommand: (cmd) => { void handleCommand(cmd); },
    onRetry: () => { void handleRetry(); },
    onExit: () => { void handleExit(); },
  });
  ui.setVisible(true);
  ui.render(machine.snapshot());

  const onKey = (event) => {
    if (disposed || busy || exitRequested) return;
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const map = {
      Digit1: 'confront', Numpad1: 'confront',
      Digit2: 'observe', Numpad2: 'observe',
      Digit3: 'steady', Numpad3: 'steady',
      Digit4: 'item', Numpad4: 'item',
      Escape: '__exit',
    };
    const action = map[event.code];
    if (!action) return;
    event.preventDefault();
    if (action === '__exit') {
      void handleExit();
      return;
    }
    void handleCommand(action);
  };
  window.addEventListener('keydown', onKey);

  // Block scroll travel while the prototype owns the session.
  const blockWheel = (event) => {
    if (!disposed) event.preventDefault();
  };
  window.addEventListener('wheel', blockWheel, { passive: false });

  async function handleCommand(cmd) {
    if (disposed || busy || exitRequested) return;
    const snap = machine.snapshot();
    if (!snap.canAct) return;
    if (cmd === 'item' && snap.cigarettes <= 0) {
      ui.render({ ...snap, lastLog: 'No cigarettes left.' });
      return;
    }

    busy = true;
    ui.setCommandsEnabled(false);
    const result = machine.playerAct(cmd);
    ui.render(result.state);

    if (cmd === 'confront' && result.ok) {
      enemy.setState(enemy.STATES.recoiling);
    } else if (cmd === 'observe' && result.ok) {
      enemy.setState(enemy.STATES.preparing);
    } else if (cmd === 'steady' && result.ok) {
      // Player braces — enemy stays mostly idle
      enemy.setState(enemy.STATES.idle);
    }

    if (!result.ok) {
      busy = false;
      ui.render(machine.snapshot());
      return;
    }

    if (result.ended) {
      enemy.setState(enemy.STATES.defeated);
      await sleep(COMBAT_CONFIG.timing.endHoldMs, reduced);
      busy = false;
      ui.render(machine.snapshot());
      return;
    }

    await sleep(COMBAT_CONFIG.timing.resolveMs, reduced);
    if (disposed || exitRequested) return;

    // nextAttackId is still the attack about to fire
    const aboutTo = machine.snapshot().nextAttackId;
    const atk = COMBAT_CONFIG.enemy.attacks[aboutTo];
    if (atk?.telegraph) {
      enemy.setState(enemy.STATES.preparing);
      machine.beginEnemyPhase();
      ui.render({
        ...machine.snapshot(),
        lastLog: atk.telegraphLabel,
      });
      await sleep(COMBAT_CONFIG.timing.enemyTelegraphMs, reduced);
      if (disposed || exitRequested) return;
    } else {
      enemy.setState(enemy.STATES.preparing);
      await sleep(Math.min(280, COMBAT_CONFIG.timing.enemyTelegraphMs), reduced);
      if (disposed || exitRequested) return;
    }

    enemy.setState(enemy.STATES.attacking);
    const enemyResult = machine.enemyAct();
    ui.render(enemyResult.state);
    await sleep(COMBAT_CONFIG.timing.enemyAttackMs, reduced);
    if (disposed || exitRequested) return;

    if (enemyResult.ended) {
      if (enemyResult.state.phase === 'defeat') {
        // Stay in attacking-ish pose; player lost hold
        enemy.setState(enemy.STATES.idle);
      }
      busy = false;
      ui.render(machine.snapshot());
      return;
    }

    enemy.setState(enemy.STATES.idle);
    busy = false;
    ui.render(machine.snapshot());
  }

  async function handleRetry() {
    if (disposed || busy) return;
    busy = true;
    machine.reset();
    enemy.setState(enemy.STATES.idle);
    enemy.root.position.copy(arena.enemyPosition);
    enemy.root.rotation.set(0, 0, 0);
    enemy.root.scale.setScalar(1);
    ui.render(machine.snapshot());
    busy = false;
  }

  async function handleExit() {
    if (disposed || exitRequested) return;
    exitRequested = true;
    busy = true;
    disposeSession();
    await onExit?.();
  }

  function disposeSession() {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', blockWheel);
    ui.dispose();
    enemy.dispose();
    arena.dispose();
    scene.remove(arena.world);
    localDirector?.dispose?.();
    experience?.classList.remove('combat-mode');
    experience?.removeAttribute('data-combat');
    if (prevBg !== undefined) scene.background = prevBg;
    scene.fog = prevFog ?? null;
  }

  return {
    id: COMBAT_PROTOTYPE_ID,
    get active() { return !disposed; },
    update(dt) {
      if (disposed) return;
      enemy.update(dt);
    },
    dispose() {
      exitRequested = true;
      disposeSession();
    },
    /** Programmatic exit used by pagehide / chapter jumps. */
    async exit() {
      await handleExit();
    },
  };
}
