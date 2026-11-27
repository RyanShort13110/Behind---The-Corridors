/**
 * Full-screen survival-horror inventory menu.
 * Presentation only — ownership stays in createInventory().
 */

import { resolveItemDef, itemStackKey, REVOLVER_ITEM_ID } from './items/catalog.js?v=wpn-2';

/**
 * @param {object} opts
 * @param {() => object|null} opts.getInventory
 * @param {() => object[]} [opts.getStacks]
 * @param {(itemId: string) => void} [opts.onUse]
 * @param {(itemId: string) => void} [opts.onEquip]
 * @param {() => void} [opts.onClose]
 * @param {(canvas: HTMLCanvasElement, item: object, def: object) => void} opts.drawPreview
 * @param {(item: object) => object[]} [opts.getTapeActions]
 * @param {(tape: object) => void} [opts.onLoadTape]
 * @param {() => boolean} [opts.canOpen]
 */
export function createInventoryMenu({
  getInventory,
  getStacks,
  onUse,
  onEquip,
  onClose,
  drawPreview,
  getTapeActions,
  onLoadTape,
  canOpen = () => true,
} = {}) {
  const root = document.createElement('div');
  root.id = 'inventory-menu';
  root.className = 'inventory-menu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('aria-labelledby', 'inventory-menu-title');
  root.innerHTML = `
    <div class="inventory-menu__veil" data-inv-close tabindex="-1"></div>
    <div class="inventory-menu__panel">
      <header class="inventory-menu__header">
        <div class="inventory-menu__brand">
          <span class="inventory-menu__mark">BEHIND.</span>
          <h2 id="inventory-menu-title" class="inventory-menu__title">INVENTORY</h2>
        </div>
        <button type="button" class="inventory-menu__close" data-inv-close aria-label="Close inventory">CLOSE · ESC</button>
      </header>
      <div class="inventory-menu__body">
        <div class="inventory-menu__grid-wrap">
          <p class="inventory-menu__empty" data-inv-empty hidden>NOTHING CARRIED.</p>
          <div class="inventory-menu__grid" data-inv-grid role="listbox" aria-label="Carried items"></div>
        </div>
        <aside class="inventory-menu__detail" data-inv-detail aria-live="polite">
          <canvas class="inventory-menu__canvas" data-inv-canvas width="280" height="180" aria-hidden="true"></canvas>
          <p class="inventory-menu__category" data-inv-category></p>
          <h3 class="inventory-menu__name" data-inv-name></h3>
          <p class="inventory-menu__copy" data-inv-copy></p>
          <p class="inventory-menu__effect" data-inv-effect hidden></p>
          <div class="inventory-menu__tapes" data-inv-tapes hidden>
            <p class="inventory-menu__tapes-label">LCD · CASSETTES</p>
            <ul class="inventory-menu__tape-list" data-inv-tape-list></ul>
            <p class="inventory-menu__tape-empty" data-inv-tape-empty hidden>NO CASSETTE</p>
            <p class="inventory-menu__tape-note" data-inv-tape-note hidden></p>
          </div>
          <p class="inventory-menu__hint" data-inv-hint>SELECT AN ITEM</p>
          <div class="inventory-menu__actions" data-inv-actions></div>
        </aside>
      </div>
    </div>
  `;

  document.getElementById('experience')?.appendChild(root);

  const els = {
    empty: root.querySelector('[data-inv-empty]'),
    grid: root.querySelector('[data-inv-grid]'),
    canvas: root.querySelector('[data-inv-canvas]'),
    category: root.querySelector('[data-inv-category]'),
    name: root.querySelector('[data-inv-name]'),
    copy: root.querySelector('[data-inv-copy]'),
    effect: root.querySelector('[data-inv-effect]'),
    actions: root.querySelector('[data-inv-actions]'),
    hint: root.querySelector('[data-inv-hint]'),
    tapes: root.querySelector('[data-inv-tapes]'),
    tapeList: root.querySelector('[data-inv-tape-list]'),
    tapeEmpty: root.querySelector('[data-inv-tape-empty]'),
    tapeNote: root.querySelector('[data-inv-tape-note]'),
  };

  let open = false;
  /** @type {string|null} */
  let selectedKey = null;
  /** @type {HTMLElement|null} */
  let lastFocus = null;
  const flags = { composureFull: false };

  function isOpen() { return open; }

  function buildStacks() {
    if (getStacks) return getStacks();
    const inv = getInventory?.();
    const list = inv?.list?.() || [];
    const order = [];
    const map = new Map();
    for (const item of list) {
      const key = itemStackKey(item.id, item);
      if (!map.has(key)) {
        map.set(key, { key, items: [], representative: item });
        order.push(key);
      }
      map.get(key).items.push(item);
    }
    return order.map((key) => map.get(key));
  }

  function clearDetail() {
    if (els.category) els.category.textContent = '';
    if (els.name) els.name.textContent = '';
    if (els.copy) els.copy.textContent = '';
    if (els.effect) {
      els.effect.hidden = true;
      els.effect.textContent = '';
    }
    if (els.actions) els.actions.replaceChildren();
    if (els.hint) {
      els.hint.hidden = false;
      els.hint.textContent = 'SELECT AN ITEM';
    }
    if (els.tapes) els.tapes.hidden = true;
    if (els.tapeList) els.tapeList.replaceChildren();
    if (els.tapeEmpty) els.tapeEmpty.hidden = true;
    if (els.tapeNote) {
      els.tapeNote.hidden = true;
      els.tapeNote.textContent = '';
    }
    const ctx = els.canvas?.getContext('2d');
    if (ctx && els.canvas) ctx.clearRect(0, 0, els.canvas.width, els.canvas.height);
  }

  function showDetail(stack) {
    if (!stack) {
      clearDetail();
      return;
    }
    const item = stack.representative || stack.items[0];
    const inv = getInventory?.();
    const def = resolveItemDef(item.id, item);
    const count = stack.items.length;
    const equipped = inv?.isEquipped?.(item.id)
      || stack.items.some((i) => inv?.isEquipped?.(i.id));

    if (els.hint) els.hint.hidden = true;
    if (els.category) els.category.textContent = def.category || '';
    if (els.name) {
      els.name.textContent = count > 1 ? `${def.label}  ×${count}` : def.label;
    }
    if (els.copy) els.copy.textContent = def.description || '';
    if (els.effect) {
      const effectBits = [];
      if (def.effect) effectBits.push(def.effect);
      if (equipped) effectBits.push('EQUIPPED');
      if (item.id === REVOLVER_ITEM_ID) {
        const loaded = item.cylinderLoaded ?? 0;
        const cap = item.cylinderCapacity ?? 6;
        const reserve = item.ammoReserve ?? 0;
        if (!def.effect?.includes('loaded')) {
          effectBits.push(`${loaded}/${cap} loaded · ${reserve} reserve`);
        }
        if (loaded <= 0) effectBits.push('EMPTY · RELOAD');
      }
      els.effect.hidden = effectBits.length === 0;
      els.effect.textContent = effectBits.join(' · ');
    }

    drawPreview?.(els.canvas, item, def);

    if (els.tapes) {
      const isCam = item.id === 'vhs-c-camcorder';
      els.tapes.hidden = !isCam;
      if (isCam) {
        const tapes = getTapeActions?.(item) || [];
        els.tapeList.replaceChildren();
        if (!tapes.length) {
          if (els.tapeEmpty) els.tapeEmpty.hidden = false;
        } else {
          if (els.tapeEmpty) els.tapeEmpty.hidden = true;
          for (const tape of tapes) {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'inventory-menu__tape-btn';
            btn.textContent = `LOAD · ${tape.label}`;
            btn.addEventListener('click', () => onLoadTape?.(tape));
            li.appendChild(btn);
            els.tapeList.appendChild(li);
          }
        }
      }
    }

    if (els.actions) {
      els.actions.replaceChildren();
      const actions = def.actions || ['inspect'];
      for (const action of actions) {
        if (action === 'inspect') continue;
        if (action === 'use' && !(def.consumable || item.consumable)) continue;
        if (action === 'equip' && !def.equipable) continue;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inventory-menu__action';
        btn.dataset.invAction = action;
        btn.dataset.itemId = item.id;

        if (action === 'use') {
          const blocked = String(item.id).startsWith('cigarette') && flags.composureFull;
          btn.textContent = blocked ? 'ALREADY STEADY' : (count > 1 ? 'USE ONE' : 'USE');
          btn.disabled = Boolean(blocked);
        } else if (action === 'equip') {
          btn.textContent = equipped ? 'UNEQUIP' : 'EQUIP';
        } else {
          btn.textContent = String(action).toUpperCase();
        }
        els.actions.appendChild(btn);
      }
      // On phones the grid can push EQUIP below the fold — pull it into view.
      if (els.actions.childElementCount > 0 && open && window.matchMedia('(max-width: 720px)').matches) {
        requestAnimationFrame(() => {
          els.actions.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
      }
    }
  }

  function render() {
    const inv = getInventory?.();
    const stacks = buildStacks();
    const equippedId = inv?.getEquippedWeaponId?.() || null;

    if (els.empty) els.empty.hidden = stacks.length > 0;
    if (!els.grid) return;
    els.grid.replaceChildren();

    if (!stacks.length) {
      selectedKey = null;
      clearDetail();
      return;
    }

    if (!selectedKey || !stacks.some((s) => s.key === selectedKey)) {
      selectedKey = stacks[0].key;
    }

    for (const stack of stacks) {
      const item = stack.representative || stack.items[0];
      const def = resolveItemDef(item.id, item);
      const count = stack.items.length;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'inventory-menu__slot';
      btn.setAttribute('role', 'option');
      btn.dataset.stackKey = stack.key;
      btn.dataset.itemId = item.id;
      const selected = stack.key === selectedKey;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      const isEq = Boolean(equippedId && stack.items.some((i) => i.id === equippedId));
      btn.classList.toggle('is-equipped', isEq);
      const qty = count > 1 ? `<span class="inventory-menu__qty">×${count}</span>` : '';
      const eq = isEq ? '<span class="inventory-menu__eq">EQ</span>' : '';
      btn.innerHTML = `
        <canvas class="inventory-menu__thumb" width="72" height="48" aria-hidden="true"></canvas>
        <span class="inventory-menu__slot-cat">${def.category || ''}</span>
        <span class="inventory-menu__slot-label">${def.label}${qty}</span>
        ${eq}
      `;
      const thumb = btn.querySelector('canvas');
      if (thumb) drawPreview?.(thumb, item, def);
      btn.setAttribute('aria-label', count > 1 ? `${def.label}, ${count}` : def.label);
      els.grid.appendChild(btn);
    }

    showDetail(stacks.find((s) => s.key === selectedKey));
  }

  function openMenu(opts = {}) {
    if (open) return false;
    if (!canOpen()) return false;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    open = true;
    flags.composureFull = Boolean(opts.composureFull);
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('inventory-open');
    render();
    const first = els.grid?.querySelector('.inventory-menu__slot');
    (first || root.querySelector('.inventory-menu__close'))?.focus?.();
    return true;
  }

  function closeMenu() {
    if (!open) return;
    open = false;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('inventory-open');
    clearDetail();
    selectedKey = null;
    onClose?.();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }

  function toggle(opts) {
    if (open) {
      closeMenu();
      return false;
    }
    return openMenu(opts);
  }

  function selectByOffset(delta) {
    const stacks = buildStacks();
    if (!stacks.length) return;
    let idx = stacks.findIndex((s) => s.key === selectedKey);
    if (idx < 0) idx = 0;
    idx = (idx + delta + stacks.length) % stacks.length;
    selectedKey = stacks[idx].key;
    render();
    els.grid?.querySelector(`[data-stack-key="${selectedKey}"]`)?.focus?.();
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-inv-close]')) {
      closeMenu();
      return;
    }
    const slot = event.target.closest('[data-stack-key]');
    if (slot) {
      selectedKey = slot.dataset.stackKey;
      render();
      return;
    }
    const actionBtn = event.target.closest('[data-inv-action]');
    if (actionBtn && !actionBtn.disabled) {
      const action = actionBtn.dataset.invAction;
      const itemId = actionBtn.dataset.itemId;
      if (action === 'use') onUse?.(itemId);
      else if (action === 'equip') onEquip?.(itemId);
    }
  });

  function onKeyDown(event) {
    if (!open) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
      event.preventDefault();
      selectByOffset(1);
    } else if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
      event.preventDefault();
      selectByOffset(-1);
    }
  }
  window.addEventListener('keydown', onKeyDown);

  function dispose() {
    window.removeEventListener('keydown', onKeyDown);
    closeMenu();
    root.remove();
  }

  return {
    root,
    isOpen,
    open: openMenu,
    close: closeMenu,
    toggle,
    refresh: () => {
      if (!open) return;
      render();
    },
    setComposureFull(v) {
      flags.composureFull = Boolean(v);
      if (open) render();
    },
    dispose,
  };
}
