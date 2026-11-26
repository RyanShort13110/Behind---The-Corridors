/**
 * Combat HUD — restrained Behind. visual language (v0.2).
 */

const COMMANDS = [
  { id: 'attack', label: 'ATTACK', hint: '1', desc: 'Strike. Reduce its Presence. Consumes an Opening.' },
  { id: 'observe', label: 'OBSERVE', hint: '2', desc: 'Study it. Expose an Opening and learn what comes next.' },
  { id: 'guard', label: 'GUARD', hint: '3', desc: 'Brace. Soften the next hit.' },
  { id: 'item', label: 'ITEM', hint: '4', desc: 'Open combat items.' },
];

/**
 * @param {object} opts
 * @param {(cmd: string) => void} opts.onCommand
 * @param {(itemId: string) => void} [opts.onItemSelect]
 * @param {() => void} [opts.onItemCancel]
 * @param {() => void} opts.onRetry
 * @param {() => void} opts.onExit
 * @param {() => void} [opts.onContinue]
 */
export function createCombatUi({
  onCommand, onItemSelect, onItemCancel, onRetry, onExit, onContinue,
} = {}) {
  const root = document.createElement('div');
  root.id = 'combat-hud';
  root.className = 'combat-hud';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="combat-hud__top">
      <div class="combat-hud__identity">
        <p class="combat-hud__eyebrow">COMBAT PROTOTYPE · DEBUG</p>
        <p class="combat-hud__enemy-name" data-enemy-name>THE WAITING THING</p>
        <p class="combat-hud__flags" data-flags aria-live="polite"></p>
      </div>
      <button type="button" class="combat-hud__exit" data-exit title="Exit combat prototype">EXIT</button>
    </div>
    <div class="combat-hud__meters">
      <div class="combat-meter combat-meter--presence">
        <span class="combat-meter__label">PRESENCE</span>
        <div class="combat-meter__track"><div class="combat-meter__fill" data-presence-fill></div></div>
        <span class="combat-meter__value" data-presence-val>100</span>
      </div>
      <div class="combat-meter combat-meter--composure">
        <span class="combat-meter__label">COMPOSURE</span>
        <div class="combat-meter__track"><div class="combat-meter__fill" data-composure-fill></div></div>
        <span class="combat-meter__value" data-composure-val>100</span>
      </div>
    </div>
    <p class="combat-hud__log" data-log aria-live="polite">Something is waiting.</p>
    <button type="button" class="combat-hud__continue" data-continue hidden>CLICK TO CONTINUE</button>
    <p class="combat-hud__turn" data-turn>YOUR TURN</p>
    <div class="combat-hud__commands" data-commands role="group" aria-label="Combat commands">
      ${COMMANDS.map((c) => `
        <button type="button" class="combat-cmd" data-cmd="${c.id}" title="${c.desc}">
          <span class="combat-cmd__key">${c.hint}</span>
          <span class="combat-cmd__label">${c.label}</span>
        </button>
      `).join('')}
    </div>
    <p class="combat-hud__item-status" data-items>CIGARETTES — 2 · FLARE — 1</p>
    <p class="combat-hud__weapon" data-weapon>WEAPON · UNARMED</p>
    <div class="combat-hud__item-picker" data-item-picker hidden>
      <p class="combat-hud__item-picker-title">SELECT ITEM</p>
      <div class="combat-hud__item-picker-list" data-item-picker-list></div>
      <button type="button" class="combat-cmd" data-item-cancel>CANCEL</button>
    </div>
    <div class="combat-hud__end" data-end hidden>
      <p class="combat-hud__end-title" data-end-title></p>
      <p class="combat-hud__end-copy" data-end-copy></p>
      <div class="combat-hud__end-actions">
        <button type="button" class="combat-cmd combat-cmd--primary" data-retry>RETRY</button>
        <button type="button" class="combat-cmd" data-end-exit>EXIT</button>
      </div>
    </div>
  `;

  document.getElementById('experience')?.appendChild(root);

  const els = {
    enemyName: root.querySelector('[data-enemy-name]'),
    flags: root.querySelector('[data-flags]'),
    presenceFill: root.querySelector('[data-presence-fill]'),
    presenceVal: root.querySelector('[data-presence-val]'),
    composureFill: root.querySelector('[data-composure-fill]'),
    composureVal: root.querySelector('[data-composure-val]'),
    log: root.querySelector('[data-log]'),
    continueBtn: root.querySelector('[data-continue]'),
    turn: root.querySelector('[data-turn]'),
    commands: root.querySelector('[data-commands]'),
    items: root.querySelector('[data-items]'),
    weapon: root.querySelector('[data-weapon]'),
    itemPicker: root.querySelector('[data-item-picker]'),
    itemPickerList: root.querySelector('[data-item-picker-list]'),
    end: root.querySelector('[data-end]'),
    endTitle: root.querySelector('[data-end-title]'),
    endCopy: root.querySelector('[data-end-copy]'),
  };

  let continueArmed = false;
  let itemPickerOpen = false;

  function setVisible(on) {
    root.classList.toggle('is-active', on);
    root.setAttribute('aria-hidden', on ? 'false' : 'true');
  }

  function setCommandsEnabled(on) {
    root.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.disabled = !on;
    });
    els.commands?.classList.toggle('is-locked', !on);
  }

  /** Hold the log on screen until the player dismisses it (OBSERVE readout). */
  function setContinuePrompt(on) {
    continueArmed = Boolean(on);
    root.classList.toggle('is-awaiting-continue', continueArmed);
    if (els.continueBtn) {
      els.continueBtn.hidden = !continueArmed;
      els.continueBtn.disabled = !continueArmed;
    }
  }

  function flagLine(state) {
    const bits = [];
    if (state.openingActive) bits.push('OPENING');
    if (state.guardActive) bits.push('GUARD');
    if (state.telegraphActive && state.phase === 'player') bits.push('HEAVY INCOMING');
    return bits.length ? bits.join(' · ') : '';
  }

  function setItemPicker(on, state = null) {
    itemPickerOpen = Boolean(on);
    if (els.itemPicker) els.itemPicker.hidden = !itemPickerOpen;
    root.classList.toggle('is-item-picker', itemPickerOpen);
    if (!itemPickerOpen || !els.itemPickerList) {
      if (els.itemPickerList) els.itemPickerList.replaceChildren();
      return;
    }
    els.itemPickerList.replaceChildren();
    for (const item of state?.combatItems || []) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'combat-cmd';
      btn.dataset.combatItem = item.id;
      btn.disabled = Boolean(item.disabled);
      const qty = item.qty > 1 ? ` ×${item.qty}` : item.qty === 1 ? '' : ' ×0';
      let label = `${item.label}${qty}`;
      if (item.disabledReason === 'full-composure') label += ' · FULL';
      else if (item.disabledReason === 'no-items') label += ' · NONE';
      btn.textContent = label;
      els.itemPickerList.appendChild(btn);
    }
  }

  function render(state) {
    if (!state) return;
    if (els.enemyName) els.enemyName.textContent = state.enemyName;
    const pPct = Math.round((state.presence / state.presenceMax) * 100);
    const cPct = Math.round((state.composure / state.composureMax) * 100);
    if (els.presenceFill) els.presenceFill.style.width = `${pPct}%`;
    if (els.composureFill) els.composureFill.style.width = `${cPct}%`;
    if (els.presenceVal) els.presenceVal.textContent = String(Math.round(state.presence));
    if (els.composureVal) els.composureVal.textContent = String(Math.round(state.composure));
    if (els.log) els.log.textContent = state.lastLog;
    if (els.flags) els.flags.textContent = flagLine(state);

    if (els.items) {
      els.items.textContent = `CIGARETTES — ${state.cigarettes} · FLARE — ${state.flares ?? 0}`;
    }
    if (els.weapon) {
      const w = state.equippedWeaponLabel || 'UNARMED';
      els.weapon.textContent = `WEAPON · ${w} · ${state.attackDamage ?? 18}`;
    }

    const over = state.phase === 'victory' || state.phase === 'defeat';
    if (els.end) els.end.hidden = !over;
    if (over) {
      if (els.endTitle) {
        els.endTitle.textContent = state.phase === 'victory' ? 'IT RECEDED.' : 'YOU LOST HOLD.';
      }
      if (els.endCopy) {
        els.endCopy.textContent = state.phase === 'victory'
          ? 'Presence depleted. The prototype ends here.'
          : 'Composure depleted. The prototype ends here.';
      }
      setCommandsEnabled(false);
      if (els.turn) els.turn.textContent = state.phase === 'victory' ? 'VICTORY' : 'DEFEAT';
    } else {
      const enemyTurn = state.phase === 'enemy' || state.phase === 'resolving';
      if (els.turn) {
        if (continueArmed) {
          els.turn.textContent = `TURN ${state.turn} · OBSERVATION`;
        } else if (enemyTurn) {
          els.turn.textContent = `TURN ${state.turn} · IT ACTS`;
        } else if (state.telegraphActive) {
          els.turn.textContent = `TURN ${state.turn} · YOUR TURN · HEAVY INCOMING`;
        } else {
          els.turn.textContent = `TURN ${state.turn} · YOUR TURN`;
        }
      }
      setCommandsEnabled(state.canAct && !itemPickerOpen);
      const itemBtn = root.querySelector('[data-cmd="item"]');
      if (itemBtn) {
        const anyItem = (state.combatItems || []).some((i) => !i.disabled);
        itemBtn.disabled = !state.canAct || itemPickerOpen || !anyItem;
        itemBtn.title = 'Open combat items.';
      }
    }

    root.classList.toggle('is-critical', state.composure <= 21 && !over);
    root.classList.toggle('is-opening', Boolean(state.openingActive));
    root.classList.toggle('is-guard', Boolean(state.guardActive));
    root.classList.toggle('is-telegraph', Boolean(state.telegraphActive && state.phase === 'player'));
  }

  root.addEventListener('click', (event) => {
    if (continueArmed && event.target.closest('[data-continue], [data-log]')) {
      onContinue?.();
      return;
    }
    if (event.target.closest('[data-item-cancel]')) {
      setItemPicker(false);
      onItemCancel?.();
      return;
    }
    const pick = event.target.closest('[data-combat-item]');
    if (pick && !pick.disabled) {
      const id = pick.dataset.combatItem;
      setItemPicker(false);
      onItemSelect?.(id);
      return;
    }
    const cmdBtn = event.target.closest('[data-cmd]');
    if (cmdBtn && !cmdBtn.disabled) {
      onCommand?.(cmdBtn.dataset.cmd);
      return;
    }
    if (event.target.closest('[data-retry]')) {
      onRetry?.();
      return;
    }
    if (event.target.closest('[data-exit], [data-end-exit]')) {
      onExit?.();
    }
  });

  function dispose() {
    setContinuePrompt(false);
    setItemPicker(false);
    root.remove();
  }

  return {
    root,
    setVisible,
    render,
    setCommandsEnabled,
    setContinuePrompt,
    setItemPicker,
    isItemPickerOpen: () => itemPickerOpen,
    dispose,
  };
}
