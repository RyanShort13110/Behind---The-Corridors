/**
 * Combat HUD — restrained Behind. visual language.
 */

const COMMANDS = [
  { id: 'confront', label: 'CONFRONT', hint: '1', desc: 'Resist. Reduce its Presence.' },
  { id: 'observe', label: 'OBSERVE', hint: '2', desc: 'Study it. Learn what comes next.' },
  { id: 'steady', label: 'STEADY', hint: '3', desc: 'Brace. Soften the next hit.' },
  { id: 'item', label: 'ITEM', hint: '4', desc: 'Cigarette. Restore composure.' },
];

/**
 * @param {object} opts
 * @param {(cmd: string) => void} opts.onCommand
 * @param {() => void} opts.onRetry
 * @param {() => void} opts.onExit
 */
export function createCombatUi({ onCommand, onRetry, onExit } = {}) {
  const root = document.createElement('div');
  root.id = 'combat-hud';
  root.className = 'combat-hud';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="combat-hud__top">
      <div class="combat-hud__identity">
        <p class="combat-hud__eyebrow">COMBAT PROTOTYPE · DEBUG</p>
        <p class="combat-hud__enemy-name" data-enemy-name>THE WAITING THING</p>
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
    <p class="combat-hud__turn" data-turn>YOUR TURN</p>
    <div class="combat-hud__commands" data-commands role="group" aria-label="Combat commands">
      ${COMMANDS.map((c) => `
        <button type="button" class="combat-cmd" data-cmd="${c.id}" title="${c.desc}">
          <span class="combat-cmd__key">${c.hint}</span>
          <span class="combat-cmd__label">${c.label}</span>
        </button>
      `).join('')}
    </div>
    <p class="combat-hud__item-status" data-items>CIGARETTES — 2</p>
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
    presenceFill: root.querySelector('[data-presence-fill]'),
    presenceVal: root.querySelector('[data-presence-val]'),
    composureFill: root.querySelector('[data-composure-fill]'),
    composureVal: root.querySelector('[data-composure-val]'),
    log: root.querySelector('[data-log]'),
    turn: root.querySelector('[data-turn]'),
    commands: root.querySelector('[data-commands]'),
    items: root.querySelector('[data-items]'),
    end: root.querySelector('[data-end]'),
    endTitle: root.querySelector('[data-end-title]'),
    endCopy: root.querySelector('[data-end-copy]'),
  };

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
    if (els.items) els.items.textContent = `CIGARETTES — ${state.cigarettes}`;

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
        els.turn.textContent = enemyTurn
          ? `TURN ${state.turn} · IT ACTS`
          : `TURN ${state.turn} · YOUR TURN`;
      }
      setCommandsEnabled(state.canAct);
      // Dim item when empty
      const itemBtn = root.querySelector('[data-cmd="item"]');
      if (itemBtn) itemBtn.disabled = !state.canAct || state.cigarettes <= 0;
    }

    root.classList.toggle('is-critical', state.composure <= 21 && !over);
    root.classList.toggle('is-observed', Boolean(state.observed || state.observeAdvantage));
    root.classList.toggle('is-steady', Boolean(state.steadyActive));
  }

  root.addEventListener('click', (event) => {
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
    root.remove();
  }

  return { root, setVisible, render, setCommandsEnabled, dispose };
}
