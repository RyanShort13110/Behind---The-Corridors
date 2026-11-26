/**
 * Pure turn-based combat state machine (v0.3).
 * No DOM / Three.js — safe to unit-test in Node.
 */

import { COMBAT_CONFIG, COMBAT_COMMANDS, COMBAT_ITEMS } from './config.js';
import { CROWBAR_ITEM_ID, FLARE_ITEM_ID } from '../items/catalog.js';
import { getWeaponDef, resolveAttackWeapon } from '../items/weapons.js';

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

function cloneAttacks(attacks = {}) {
  const out = {};
  for (const [key, atk] of Object.entries(attacks)) {
    out[key] = { ...atk };
  }
  return out;
}

function cloneConfig(cfg = COMBAT_CONFIG) {
  return {
    player: { ...cfg.player },
    enemy: {
      ...cfg.enemy,
      pattern: [...(cfg.enemy.pattern || [])],
      attacks: cloneAttacks(cfg.enemy.attacks),
    },
    timing: { ...cfg.timing },
  };
}

function openingStartLog(cfg) {
  const firstId = cfg.enemy.pattern[0];
  const first = cfg.enemy.attacks[firstId];
  if (first?.telegraph) return first.telegraphLabel;
  return 'Something is waiting.';
}

/**
 * @param {typeof COMBAT_CONFIG} [config]
 * @param {object} [loadout] optional debug loadout override
 */
export function createCombatState(config = COMBAT_CONFIG, loadout = null) {
  const cfg = cloneConfig(config);
  const initialLoadout = {
    cigarettes: loadout?.cigarettes ?? cfg.player.cigaretteCount ?? 0,
    flares: loadout?.flares ?? cfg.player.flareCount ?? 0,
    equippedWeaponId: loadout && 'equippedWeaponId' in loadout
      ? loadout.equippedWeaponId
      : (cfg.player.startWithCrowbarEquipped ? CROWBAR_ITEM_ID : null),
  };

  let turn = 1;
  let phase = PHASE.PLAYER;
  let composure = cfg.player.composureStart;
  let presence = cfg.enemy.presenceStart;
  let cigarettes = initialLoadout.cigarettes;
  let flares = initialLoadout.flares;
  let equippedWeaponId = initialLoadout.equippedWeaponId;
  let patternIndex = 0;
  let nextAttackId = cfg.enemy.pattern[0];
  let observed = false;
  let openingActive = false;
  let guardActive = false;
  let observeBrace = false;
  let lastLog = openingStartLog(cfg);
  let lastPlayerAction = null;
  let lastEnemyAction = null;
  let lastDamageType = null;
  let inputLocked = false;
  /** Consecutive ATTACKS since last OBSERVE (optional blind-assault escalation). */
  let attacksSinceObserve = 0;

  function nextAttack() {
    return cfg.enemy.attacks[nextAttackId];
  }

  function applyBlindAssaultEscalation() {
    const threshold = cfg.enemy.blindAssaultThreshold;
    const forceId = cfg.enemy.blindAssaultAttackId;
    if (!threshold || !forceId || !cfg.enemy.attacks[forceId]) return;
    if (attacksSinceObserve >= threshold) {
      nextAttackId = forceId;
    }
  }

  function telegraphActive() {
    return Boolean(nextAttack()?.telegraph);
  }

  function attackWeapon() {
    return resolveAttackWeapon(equippedWeaponId);
  }

  function snapshot() {
    const atk = nextAttack();
    const weapon = attackWeapon();
    return {
      turn,
      phase,
      composure,
      composureMax: cfg.player.composureMax,
      presence,
      presenceMax: cfg.enemy.presenceMax,
      cigarettes,
      flares,
      equippedWeaponId,
      equippedWeaponLabel: weapon.label,
      attackDamage: weapon.baseDamage,
      attackDamageType: weapon.damageType,
      nextAttackId,
      nextAttack: atk,
      observed,
      openingActive,
      observeAdvantage: openingActive,
      guardActive,
      steadyActive: guardActive,
      observeBrace,
      telegraphActive: telegraphActive(),
      telegraphLabel: atk?.telegraph ? atk.telegraphLabel : null,
      lastLog,
      lastPlayerAction,
      lastEnemyAction,
      lastDamageType,
      inputLocked,
      enemyName: cfg.enemy.name,
      canAct: phase === PHASE.PLAYER && !inputLocked,
      itemBlockedReason: null,
      combatItems: [
        {
          id: COMBAT_ITEMS.CIGARETTE,
          label: 'CIGARETTES',
          qty: cigarettes,
          disabled: cigarettes <= 0 || composure >= cfg.player.composureMax,
          disabledReason: cigarettes <= 0
            ? 'no-items'
            : composure >= cfg.player.composureMax
              ? 'full-composure'
              : null,
        },
        {
          id: COMBAT_ITEMS.FLARE,
          label: 'EMERGENCY FLARE',
          qty: flares,
          disabled: flares <= 0,
          disabledReason: flares <= 0 ? 'no-items' : null,
        },
      ],
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
   * @param {string} command
   * @param {{ itemId?: string }} [opts]
   */
  function playerAct(command, opts = {}) {
    if (phase !== PHASE.PLAYER || inputLocked) {
      return { ok: false, reason: 'locked', state: snapshot() };
    }
    const cmd = String(command || '').toLowerCase();
    if (!Object.values(COMBAT_COMMANDS).includes(cmd)) {
      return { ok: false, reason: 'unknown', state: snapshot() };
    }

    if (cmd === COMBAT_COMMANDS.ITEM) {
      const itemId = opts.itemId;
      if (!itemId) {
        return { ok: false, reason: 'need-select', state: snapshot() };
      }
      if (itemId === COMBAT_ITEMS.CIGARETTE || String(itemId).startsWith('cigarette')) {
        if (cigarettes <= 0) {
          setLog('No cigarettes left.');
          return { ok: false, reason: 'no-items', state: snapshot() };
        }
        if (composure >= cfg.player.composureMax) {
          setLog('Already steady. Save it for later.');
          return { ok: false, reason: 'full-composure', state: snapshot() };
        }
      } else if (itemId === COMBAT_ITEMS.FLARE || itemId === FLARE_ITEM_ID) {
        if (flares <= 0) {
          setLog('No flares left.');
          return { ok: false, reason: 'no-items', state: snapshot() };
        }
      } else {
        return { ok: false, reason: 'unknown-item', state: snapshot() };
      }
    }

    inputLocked = true;
    phase = PHASE.RESOLVING;
    lastPlayerAction = cmd;
    lastDamageType = null;
    let detail = '';
    let fx = null;

    if (cmd === COMBAT_COMMANDS.ATTACK) {
      attacksSinceObserve += 1;
      const weapon = attackWeapon();
      let dmg = weapon.baseDamage;
      let usedOpening = false;
      if (openingActive) {
        dmg += cfg.player.openingBonusDamage;
        openingActive = false;
        usedOpening = true;
      }
      presence = clamp(presence - dmg, 0, cfg.enemy.presenceMax);
      lastDamageType = weapon.damageType;
      detail = usedOpening
        ? `You strike the Opening with ${weapon.label.toLowerCase()} (−${dmg} Presence).`
        : weapon.id
          ? `You attack with the ${weapon.label.toLowerCase()} (−${dmg} Presence).`
          : `You attack (−${dmg} Presence).`;
      setLog(detail);
      fx = { type: 'attack', damageType: weapon.damageType, weaponId: weapon.id };
    } else if (cmd === COMBAT_COMMANDS.OBSERVE) {
      attacksSinceObserve = 0;
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
      detail = 'You guard. The next hit will land softer.';
      setLog(detail);
    } else if (cmd === COMBAT_COMMANDS.ITEM) {
      const itemId = opts.itemId;
      if (itemId === COMBAT_ITEMS.CIGARETTE || String(itemId).startsWith('cigarette')) {
        cigarettes -= 1;
        const before = composure;
        composure = clamp(composure + cfg.player.cigaretteRestore, 0, cfg.player.composureMax);
        const gained = composure - before;
        detail = `You take a cigarette (+${gained} composure). ${cigarettes} left.`;
        setLog(detail);
        fx = { type: 'cigarette' };
      } else {
        const flareDef = getWeaponDef(FLARE_ITEM_ID);
        const dmg = flareDef?.baseDamage ?? 31;
        flares -= 1;
        presence = clamp(presence - dmg, 0, cfg.enemy.presenceMax);
        lastDamageType = flareDef?.damageType || 'fire';
        detail = `You ignite the flare (−${dmg} Presence · fire). ${flares} left.`;
        setLog(detail);
        fx = { type: 'flare', damageType: 'fire' };
      }
    }

    if (checkEnd()) {
      return { ok: true, command: cmd, detail, ended: true, fx, state: snapshot() };
    }

    return { ok: true, command: cmd, detail, ended: false, fx, state: snapshot() };
  }

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
      observeBrace = false;
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

  function beginEnemyPhase() {
    if (phase !== PHASE.RESOLVING) return snapshot();
    applyBlindAssaultEscalation();
    phase = PHASE.ENEMY;
    return snapshot();
  }

  function reset() {
    turn = 1;
    phase = PHASE.PLAYER;
    composure = cfg.player.composureStart;
    presence = cfg.enemy.presenceStart;
    cigarettes = initialLoadout.cigarettes;
    flares = initialLoadout.flares;
    equippedWeaponId = initialLoadout.equippedWeaponId;
    patternIndex = 0;
    nextAttackId = cfg.enemy.pattern[0];
    observed = false;
    openingActive = false;
    guardActive = false;
    observeBrace = false;
    lastLog = openingStartLog(cfg);
    lastPlayerAction = null;
    lastEnemyAction = null;
    lastDamageType = null;
    inputLocked = false;
    attacksSinceObserve = 0;
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
