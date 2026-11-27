/**
 * Pure turn-based combat state machine (v0.4).
 * No DOM / Three.js — safe to unit-test in Node.
 */

import { COMBAT_CONFIG, COMBAT_COMMANDS, COMBAT_ITEMS } from './config.js';
import { CROWBAR_ITEM_ID, REVOLVER_ITEM_ID } from '../items/catalog.js';
import {
  resolveAttackWeapon,
  reloadCylinder,
  REVOLVER_CYLINDER_CAPACITY,
} from '../items/weapons.js';

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

function defaultEquippedId(cfg, loadout) {
  if (loadout && 'equippedWeaponId' in loadout) return loadout.equippedWeaponId;
  if (cfg.player.startEquippedWeaponId) return cfg.player.startEquippedWeaponId;
  if (cfg.player.startWithCrowbarEquipped) return CROWBAR_ITEM_ID;
  return null;
}

/**
 * @param {typeof COMBAT_CONFIG} [config]
 * @param {object} [loadout] optional debug loadout override
 */
export function createCombatState(config = COMBAT_CONFIG, loadout = null) {
  const cfg = cloneConfig(config);
  const capacity = loadout?.cylinderCapacity
    ?? cfg.player.revolverCylinderCapacity
    ?? REVOLVER_CYLINDER_CAPACITY;

  const initialLoadout = {
    cigarettes: loadout?.cigarettes ?? cfg.player.cigaretteCount ?? 0,
    equippedWeaponId: defaultEquippedId(cfg, loadout),
    cylinderLoaded: loadout?.cylinderLoaded
      ?? cfg.player.revolverCylinderLoaded
      ?? capacity,
    ammoReserve: loadout?.ammoReserve
      ?? cfg.player.revolverAmmoReserve
      ?? 0,
    cylinderCapacity: capacity,
    composure: loadout?.composure ?? cfg.player.composureStart,
  };

  let turn = 1;
  let phase = PHASE.PLAYER;
  let composure = initialLoadout.composure;
  let presence = cfg.enemy.presenceStart;
  let cigarettes = initialLoadout.cigarettes;
  let equippedWeaponId = initialLoadout.equippedWeaponId;
  let cylinderLoaded = initialLoadout.cylinderLoaded;
  let ammoReserve = initialLoadout.ammoReserve;
  const cylinderCapacity = initialLoadout.cylinderCapacity;
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

  function openingBonusFor(weapon) {
    if (weapon?.openingBonusDamage != null) return weapon.openingBonusDamage;
    return cfg.player.openingBonusDamage;
  }

  function buildCombatItems() {
    const weapon = attackWeapon();
    const items = [
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
    ];
    if (weapon.usesAmmo) {
      const full = cylinderLoaded >= cylinderCapacity;
      const noReserve = ammoReserve <= 0;
      items.push({
        id: COMBAT_ITEMS.RELOAD,
        label: full ? 'RELOAD · FULL' : noReserve ? 'RELOAD · EMPTY' : 'RELOAD',
        qty: ammoReserve,
        disabled: full || noReserve,
        disabledReason: full ? 'cylinder-full' : noReserve ? 'no-ammo' : null,
      });
    }
    return items;
  }

  function snapshot() {
    const atk = nextAttack();
    const weapon = attackWeapon();
    const emptyCylinder = Boolean(weapon.usesAmmo && cylinderLoaded <= 0);
    return {
      turn,
      phase,
      composure,
      composureMax: cfg.player.composureMax,
      presence,
      presenceMax: cfg.enemy.presenceMax,
      cigarettes,
      equippedWeaponId,
      equippedWeaponLabel: weapon.label,
      attackDamage: weapon.baseDamage,
      attackDamageType: weapon.damageType,
      usesAmmo: Boolean(weapon.usesAmmo),
      cylinderLoaded,
      ammoReserve,
      cylinderCapacity,
      weaponEmpty: emptyCylinder,
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
      combatItems: buildCombatItems(),
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

    const weapon = attackWeapon();

    if (cmd === COMBAT_COMMANDS.ATTACK && weapon.usesAmmo && cylinderLoaded <= 0) {
      setLog('Cylinder empty. Reload.');
      return { ok: false, reason: 'empty-cylinder', state: snapshot() };
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
      } else if (itemId === COMBAT_ITEMS.RELOAD) {
        if (!weapon.usesAmmo) {
          return { ok: false, reason: 'unknown-item', state: snapshot() };
        }
        if (ammoReserve <= 0) {
          setLog('No reserve ammunition.');
          return { ok: false, reason: 'no-ammo', state: snapshot() };
        }
        if (cylinderLoaded >= cylinderCapacity) {
          setLog('Cylinder is already full.');
          return { ok: false, reason: 'cylinder-full', state: snapshot() };
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
      let dmg = weapon.baseDamage;
      let usedOpening = false;
      if (openingActive) {
        dmg += openingBonusFor(weapon);
        openingActive = false;
        usedOpening = true;
      }
      if (weapon.usesAmmo) {
        cylinderLoaded = Math.max(0, cylinderLoaded - 1);
      }
      presence = clamp(presence - dmg, 0, cfg.enemy.presenceMax);
      lastDamageType = weapon.damageType;
      const ammoNote = weapon.usesAmmo
        ? ` · ${cylinderLoaded}/${cylinderCapacity}`
        : '';
      detail = usedOpening
        ? `You strike the Opening with ${weapon.label.toLowerCase()} (−${dmg} Presence)${ammoNote}.`
        : weapon.id
          ? `You attack with the ${weapon.label.toLowerCase()} (−${dmg} Presence)${ammoNote}.`
          : `You attack (−${dmg} Presence).`;
      setLog(detail);
      fx = {
        type: 'attack',
        damageType: weapon.damageType,
        weaponId: weapon.id,
        ballistic: Boolean(weapon.usesAmmo),
      };
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
      } else if (itemId === COMBAT_ITEMS.RELOAD) {
        const result = reloadCylinder(cylinderLoaded, ammoReserve, cylinderCapacity);
        cylinderLoaded = result.loaded;
        ammoReserve = result.reserve;
        detail = result.transferred > 0
          ? `You reload (+${result.transferred}). ${cylinderLoaded}/${cylinderCapacity} · ${ammoReserve} reserve.`
          : 'Nothing to chamber.';
        setLog(detail);
        fx = { type: 'reload', transferred: result.transferred };
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
    composure = initialLoadout.composure;
    presence = cfg.enemy.presenceStart;
    cigarettes = initialLoadout.cigarettes;
    equippedWeaponId = initialLoadout.equippedWeaponId;
    cylinderLoaded = initialLoadout.cylinderLoaded;
    ammoReserve = initialLoadout.ammoReserve;
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

export { PHASE as COMBAT_PHASE, REVOLVER_ITEM_ID };
