/**
 * Pure turn-based combat state machine.
 * No DOM / Three.js — safe to unit-test in Node.
 */

import { COMBAT_CONFIG, COMBAT_COMMANDS } from './config.js';

const PHASE = Object.freeze({
  PLAYER: 'player',
  RESOLVING: 'resolving',
  ENEMY: 'enemy',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
});

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function cloneConfig(cfg = COMBAT_CONFIG) {
  return {
    player: { ...cfg.player },
    enemy: {
      ...cfg.enemy,
      pattern: [...cfg.enemy.pattern],
      attacks: {
        probe: { ...cfg.enemy.attacks.probe },
        pressure: { ...cfg.enemy.attacks.pressure },
      },
    },
    timing: { ...cfg.timing },
  };
}

/**
 * @param {typeof COMBAT_CONFIG} [config]
 */
export function createCombatState(config = COMBAT_CONFIG) {
  const cfg = cloneConfig(config);
  let turn = 1;
  let phase = PHASE.PLAYER;
  let composure = cfg.player.composureStart;
  let presence = cfg.enemy.presenceStart;
  let cigarettes = cfg.player.cigaretteCount;
  let patternIndex = 0;
  /** Next enemy attack id (always known to the machine). */
  let nextAttackId = cfg.enemy.pattern[0];
  /** Player has observed the upcoming attack. */
  let observed = false;
  /** Next Confront deals bonus damage. */
  let observeAdvantage = false;
  /** Next enemy hit is mitigated. */
  let steadyActive = false;
  let lastLog = 'Something is waiting.';
  let lastPlayerAction = null;
  let lastEnemyAction = null;
  let inputLocked = false;

  function snapshot() {
    return {
      turn,
      phase,
      composure,
      composureMax: cfg.player.composureMax,
      presence,
      presenceMax: cfg.enemy.presenceMax,
      cigarettes,
      nextAttackId,
      nextAttack: cfg.enemy.attacks[nextAttackId],
      observed,
      observeAdvantage,
      steadyActive,
      lastLog,
      lastPlayerAction,
      lastEnemyAction,
      inputLocked,
      enemyName: cfg.enemy.name,
      canAct: phase === PHASE.PLAYER && !inputLocked,
      isOver: phase === PHASE.VICTORY || phase === PHASE.DEFEAT,
    };
  }

  function setLog(msg) {
    lastLog = msg;
  }

  function advancePattern() {
    patternIndex = (patternIndex + 1) % cfg.enemy.pattern.length;
    nextAttackId = cfg.enemy.pattern[patternIndex];
  }

  function checkEnd() {
    if (presence <= 0) {
      presence = 0;
      phase = PHASE.VICTORY;
      inputLocked = true;
      setLog('Its presence thins. Whatever it was, it is gone for now.');
      return true;
    }
    if (composure <= 0) {
      composure = 0;
      phase = PHASE.DEFEAT;
      inputLocked = true;
      setLog('Your composure collapses. You cannot hold the room.');
      return true;
    }
    return false;
  }

  /**
   * Attempt a player command. Returns result object or null if rejected.
   * @param {string} command
   */
  function playerAct(command) {
    if (phase !== PHASE.PLAYER || inputLocked) {
      return { ok: false, reason: 'locked', state: snapshot() };
    }
    const cmd = String(command || '').toLowerCase();
    if (!Object.values(COMBAT_COMMANDS).includes(cmd)) {
      return { ok: false, reason: 'unknown', state: snapshot() };
    }

    inputLocked = true;
    phase = PHASE.RESOLVING;
    lastPlayerAction = cmd;
    let detail = '';

    if (cmd === COMBAT_COMMANDS.CONFRONT) {
      let dmg = cfg.player.confrontDamage;
      let bonus = false;
      if (observeAdvantage) {
        dmg += cfg.player.observeBonusDamage;
        observeAdvantage = false;
        bonus = true;
      }
      presence = clamp(presence - dmg, 0, cfg.enemy.presenceMax);
      detail = bonus
        ? `You push back with what you learned (−${dmg} Presence).`
        : `You confront it (−${dmg} Presence).`;
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.OBSERVE) {
      observed = true;
      observeAdvantage = true;
      const atk = cfg.enemy.attacks[nextAttackId];
      if (atk.telegraph) {
        detail = atk.telegraphLabel;
      } else {
        detail = `You watch. Next: a probing lean (${atk.damage} composure if undefended).`;
      }
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.STEADY) {
      steadyActive = true;
      detail = 'You brace. The next hit will land softer.';
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.ITEM) {
      if (cigarettes <= 0) {
        inputLocked = false;
        phase = PHASE.PLAYER;
        lastPlayerAction = null;
        return { ok: false, reason: 'no-items', state: snapshot() };
      }
      cigarettes -= 1;
      const before = composure;
      composure = clamp(composure + cfg.player.cigaretteRestore, 0, cfg.player.composureMax);
      const gained = composure - before;
      detail = `You take a cigarette (+${gained} composure). ${cigarettes} left.`;
      setLog(detail);
    }

    if (checkEnd()) {
      return { ok: true, command: cmd, detail, ended: true, state: snapshot() };
    }

    return { ok: true, command: cmd, detail, ended: false, state: snapshot() };
  }

  /**
   * Run the enemy turn once after player resolution.
   * Returns attack result; phase becomes PLAYER (or end).
   */
  function enemyAct() {
    if (phase === PHASE.VICTORY || phase === PHASE.DEFEAT) {
      return { ok: false, reason: 'over', state: snapshot() };
    }
    if (phase !== PHASE.RESOLVING && phase !== PHASE.ENEMY) {
      return { ok: false, reason: 'wrong-phase', state: snapshot() };
    }

    phase = PHASE.ENEMY;
    const attackId = nextAttackId;
    const atk = cfg.enemy.attacks[attackId];
    let damage = atk.damage;
    let mitigated = false;
    if (steadyActive) {
      damage = Math.round(damage * (1 - cfg.player.steadyMitigation));
      steadyActive = false;
      mitigated = true;
    }
    composure = clamp(composure - damage, 0, cfg.player.composureMax);
    lastEnemyAction = {
      id: attackId,
      damage,
      mitigated,
      label: atk.label,
    };
    const mitNote = mitigated ? ' (steadied)' : '';
    setLog(`${atk.label} −${damage} composure${mitNote}.`);

    // Clear observation of the attack that just happened; reveal next if needed.
    observed = false;
    advancePattern();

    // Soft telegraph for the upcoming pressure attack even without Observe.
    const upcoming = cfg.enemy.attacks[nextAttackId];
    let telegraph = null;
    if (upcoming?.telegraph) {
      telegraph = upcoming.telegraphLabel;
    }

    if (checkEnd()) {
      return {
        ok: true,
        attack: lastEnemyAction,
        telegraph,
        ended: true,
        state: snapshot(),
      };
    }

    turn += 1;
    phase = PHASE.PLAYER;
    inputLocked = false;
    if (telegraph) {
      setLog(`${lastLog} ${telegraph}`);
    }

    return {
      ok: true,
      attack: lastEnemyAction,
      telegraph,
      ended: false,
      state: snapshot(),
    };
  }

  /** Unlock input after cinematic resolve delay (player action shown). */
  function beginEnemyPhase() {
    if (phase !== PHASE.RESOLVING) return snapshot();
    phase = PHASE.ENEMY;
    return snapshot();
  }

  function reset() {
    turn = 1;
    phase = PHASE.PLAYER;
    composure = cfg.player.composureStart;
    presence = cfg.enemy.presenceStart;
    cigarettes = cfg.player.cigaretteCount;
    patternIndex = 0;
    nextAttackId = cfg.enemy.pattern[0];
    observed = false;
    observeAdvantage = false;
    steadyActive = false;
    lastLog = 'Something is waiting.';
    lastPlayerAction = null;
    lastEnemyAction = null;
    inputLocked = false;
    return snapshot();
  }

  return {
    PHASE,
    get config() { return cfg; },
    snapshot,
    playerAct,
    enemyAct,
    beginEnemyPhase,
    reset,
    get phase() { return phase; },
    get composure() { return composure; },
    get presence() { return presence; },
  };
}

export { PHASE as COMBAT_PHASE };
