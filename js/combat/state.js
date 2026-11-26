/**
 * Pure turn-based combat state machine (v0.2).
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

function openingStartLog(cfg) {
  const first = cfg.enemy.attacks[cfg.enemy.pattern[0]];
  if (first?.telegraph) return first.telegraphLabel;
  return 'Something is waiting.';
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
  /** Precise read from OBSERVE (cleared when that attack resolves). */
  let observed = false;
  /** Opening: next ATTACK deals bonus damage. Not consumed by ITEM/GUARD. */
  let openingActive = false;
  /** GUARD: strong mitigation on next hit. */
  let guardActive = false;
  /** Soft brace from OBSERVE on the immediate next hit. */
  let observeBrace = false;
  let lastLog = openingStartLog(cfg);
  let lastPlayerAction = null;
  let lastEnemyAction = null;
  let inputLocked = false;

  function nextAttack() {
    return cfg.enemy.attacks[nextAttackId];
  }

  function telegraphActive() {
    return Boolean(nextAttack()?.telegraph);
  }

  function snapshot() {
    const atk = nextAttack();
    return {
      turn,
      phase,
      composure,
      composureMax: cfg.player.composureMax,
      presence,
      presenceMax: cfg.enemy.presenceMax,
      cigarettes,
      nextAttackId,
      nextAttack: atk,
      observed,
      openingActive,
      /** @deprecated alias — UI/tests may still read observeAdvantage */
      observeAdvantage: openingActive,
      guardActive,
      /** @deprecated alias */
      steadyActive: guardActive,
      observeBrace,
      telegraphActive: telegraphActive(),
      telegraphLabel: atk?.telegraph ? atk.telegraphLabel : null,
      lastLog,
      lastPlayerAction,
      lastEnemyAction,
      inputLocked,
      enemyName: cfg.enemy.name,
      canAct: phase === PHASE.PLAYER && !inputLocked,
      itemBlockedReason: cigarettes <= 0
        ? 'no-items'
        : composure >= cfg.player.composureMax
          ? 'full-composure'
          : null,
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

  /** Player-turn log after an enemy hit: attack result + upcoming telegraph. */
  function composePlayerTurnLog(attackLine, telegraph) {
    if (telegraph) return `${attackLine} ${telegraph}`;
    return attackLine;
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
   * Attempt a player command.
   * Rejected actions (locked / no items / full composure) do not spend the turn.
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

    // Soft rejects — never lock input or advance phase.
    if (cmd === COMBAT_COMMANDS.ITEM) {
      if (cigarettes <= 0) {
        setLog('No cigarettes left.');
        return { ok: false, reason: 'no-items', state: snapshot() };
      }
      if (composure >= cfg.player.composureMax) {
        setLog('Already steady. Save it for later.');
        return { ok: false, reason: 'full-composure', state: snapshot() };
      }
    }

    inputLocked = true;
    phase = PHASE.RESOLVING;
    lastPlayerAction = cmd;
    let detail = '';

    if (cmd === COMBAT_COMMANDS.ATTACK) {
      let dmg = cfg.player.attackDamage;
      let usedOpening = false;
      if (openingActive) {
        dmg += cfg.player.openingBonusDamage;
        openingActive = false;
        usedOpening = true;
      }
      presence = clamp(presence - dmg, 0, cfg.enemy.presenceMax);
      detail = usedOpening
        ? `You strike the Opening (−${dmg} Presence).`
        : `You attack (−${dmg} Presence).`;
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.OBSERVE) {
      // Fresh Opening each Observe — no stacking beyond one.
      openingActive = true;
      observeBrace = true;
      observed = true;
      const atk = nextAttack();
      detail = atk.observeLabel
        ? `Opening exposed. ${atk.observeLabel}`
        : 'Opening exposed. You see what comes next.';
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.GUARD) {
      guardActive = true;
      // Opening is preserved.
      detail = 'You guard. The next hit will land softer.';
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.ITEM) {
      cigarettes -= 1;
      const before = composure;
      composure = clamp(composure + cfg.player.cigaretteRestore, 0, cfg.player.composureMax);
      const gained = composure - before;
      detail = `You take a cigarette (+${gained} composure). ${cigarettes} left.`;
      setLog(detail);
      // Opening is preserved.
    }

    if (checkEnd()) {
      return { ok: true, command: cmd, detail, ended: true, state: snapshot() };
    }

    return { ok: true, command: cmd, detail, ended: false, state: snapshot() };
  }

  /**
   * Run the enemy turn once after player resolution.
   * After resolving, if the *next* attack is telegraphed, that warning is part
   * of the player-turn log — before they choose their next command.
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
    let mitigationSource = null;

    if (guardActive) {
      damage = Math.round(damage * (1 - cfg.player.guardMitigation));
      guardActive = false;
      observeBrace = false; // spent the window
      mitigated = true;
      mitigationSource = 'guard';
    } else if (observeBrace) {
      damage = Math.round(damage * (1 - cfg.player.observeMitigation));
      observeBrace = false;
      mitigated = true;
      mitigationSource = 'observe';
    }

    composure = clamp(composure - damage, 0, cfg.player.composureMax);
    lastEnemyAction = {
      id: attackId,
      damage,
      mitigated,
      mitigationSource,
      label: atk.label,
    };

    let mitNote = '';
    if (mitigated && mitigationSource === 'guard') mitNote = ' (guarded)';
    else if (mitigated && mitigationSource === 'observe') mitNote = ' (watched)';
    const attackLine = `${atk.label} −${damage} composure${mitNote}.`;

    observed = false;
    advancePattern();

    const upcoming = nextAttack();
    const telegraph = upcoming?.telegraph ? upcoming.telegraphLabel : null;

    if (checkEnd()) {
      setLog(attackLine);
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
    setLog(composePlayerTurnLog(attackLine, telegraph));

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
    openingActive = false;
    guardActive = false;
    observeBrace = false;
    lastLog = openingStartLog(cfg);
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
