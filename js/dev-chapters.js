/**
 * Debug-only chapter picker. Dynamically imported only with ?debug=1.
 * Ordinary players never load or see this module.
 */
const OPTIONS = [
  ['corridor', '01 — The Corridor', '01'],
  ['office', '02 — The Office', '02'],
  ['records', '03 — The Records', '03'],
  ['night', '04 — The Night Shift', '04'],
  ['threshold', '05 — The Threshold', '05'],
  ['unseen', '06 — The Unseen', '06'],
  ['memory-white', 'DEV — White Memory', 'memory-white'],
  ['memory-black', 'DEV — Black Memory', 'memory-black'],
  ['hospital-reverse', 'DEV — The Ward', 'hospital-reverse'],
  ['stairwells', 'DEV — The Stairwells', 'stairwells'],
];

const MEMORY_CHAPTERS = new Set(['memory-white', 'memory-black']);
const WARD_CHAPTERS = new Set(['hospital-reverse']);
const STORAGE_KEY = 'behind.devPanelCollapsed';

export function mountDevChapters(jump, getCurrentChapter, composureApi = null, audioApi = null, getLocation = null, camcorderApi = null, finaleApi = null) {
  const panel = document.createElement('aside');
  panel.className = 'dev-chapters';
  panel.setAttribute('aria-label', 'Developer tools');
  panel.innerHTML = `
    <div class="dev-chapters__head">
      <div>
        <div class="dev-chapters__title">DEV TOOLS</div>
        <div class="dev-chapters__mini" id="dev-location-mini">LOCATION —</div>
      </div>
      <button type="button" class="dev-chapters__toggle" id="dev-panel-toggle" aria-expanded="true" aria-controls="dev-panel-body" title="Collapse or expand (Ctrl+Shift+D)">HIDE</button>
    </div>
    <div class="dev-chapters__body" id="dev-panel-body">
    <div class="dev-chapters__location">
      <div class="dev-chapters__row">
        <div class="dev-chapters__title">LOCATION TRACKER</div>
        <button type="button" id="dev-copy-location" title="Copy exact chapter position for a bug report">COPY</button>
      </div>
      <div class="dev-chapters__status" id="dev-location-readout">Position: —</div>
      <div class="dev-chapters__status" id="dev-location-coords">Camera: —</div>
      <div class="dev-chapters__status" id="dev-location-object">Object: —</div>
    </div>
    <div class="dev-chapters__title">CHAPTER JUMP</div>
    <div class="dev-chapters__row">
      <label class="sr-only" for="dev-chapter-choice">Chapter to load</label>
      <select id="dev-chapter-choice">
        ${OPTIONS.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}
      </select>
      <button id="dev-chapter-go" type="button">LOAD</button>
    </div>
    <div class="dev-chapters__checkpoint" id="dev-checkpoint-row" hidden>
      <label for="dev-checkpoint-choice">CHECKPOINT</label>
      <select id="dev-checkpoint-choice">
        <option value="start">START / PLASTIC SHEETING</option>
        <option value="approach">APPROACH / SEALED END</option>
        <option value="flicker">FLICKER / OVERHEAD LIGHTS</option>
        <option value="retreat">RETREAT / FIRST TAPS</option>
        <option value="cabinet">CABINET / PANEL OPENS</option>
        <option value="roar">ROAR / JUST BEFORE VOCALIZATION</option>
        <option value="shadow">SHADOW / DISTANT APPEARANCE</option>
        <option value="scratching">SCRATCHING / IN THE WALLS</option>
        <option value="blackout">BLACKOUT / ADVANCING DARKNESS</option>
        <option value="carton">CARDBOARD BOX / FLAPS OPEN</option>
        <option value="closing">SHADOW / CLOSING IN</option>
        <option value="silence">SILENCE / LIGHTS RETURN</option>
        <option value="exit">EXIT / FINAL CLICK + SIDE PASSAGE</option>
      </select>
    </div>
    <div class="dev-chapters__checkpoint" id="dev-memory-checkpoint-row" hidden>
      <label for="dev-memory-checkpoint-choice">MEMORY CHECKPOINT</label>
      <select id="dev-memory-checkpoint-choice">
        <option value="before">BEFORE / STAGING</option>
        <option value="enter">ARRIVAL / INSIDE MEMORY</option>
        <option value="mid">MID / LIVING ROOM</option>
        <option value="changed">DISCREPANCY / CHANGED DETAIL</option>
        <option value="hallway">HALLWAY / FRONT DOOR</option>
        <option value="exit">EXIT / READY TO LEAVE</option>
      </select>
    </div>
    <div class="dev-chapters__checkpoint" id="dev-records-checkpoint-row" hidden>
      <label for="dev-records-checkpoint-choice">RECORDS CHECKPOINT</label>
      <select id="dev-records-checkpoint-choice">
        <option value="start">START / WITH FOB</option>
        <option value="photo">PHOTO / SORTING STATION</option>
        <option value="locked">DOOR / LOCKED · NO FOB</option>
        <option value="fob">DOOR / LOCKED · WITH FOB</option>
        <option value="unlocked">DOOR / UNLOCKED</option>
      </select>
    </div>
    <div class="dev-chapters__checkpoint" id="dev-ward-checkpoint-row" hidden>
      <label for="dev-ward-checkpoint-choice">WARD CHECKPOINT</label>
      <select id="dev-ward-checkpoint-choice">
        <option value="start">START / WARD ENTRY</option>
        <option value="before-end">BEFORE END / SEALED DOORS</option>
        <option value="reverse">REVERSE / FORCED RETREAT</option>
        <option value="squeak">CREAK / DOOR ZONE</option>
        <option value="clank">FOOTSTEPS / POST-CREAK</option>
        <option value="before-crying">BEFORE CRYING / POST FOOTSTEPS</option>
        <option value="before-escape">BEFORE ESCAPE / SIDE DOOR</option>
        <option value="escape">ESCAPE / DOORS OPEN</option>
      </select>
    </div>
    <div class="dev-chapters__cry" id="dev-ward-cry-row" hidden>
      <div class="dev-chapters__title">CRY VOLUME</div>
      <div class="dev-chapters__row">
        <button type="button" data-cry-vol="0.45">QUIET</button>
        <button type="button" data-cry-vol="1">REF</button>
        <button type="button" data-cry-vol="1.35">LOUD</button>
      </div>
      <p class="dev-chapters__status" id="dev-cry-status" aria-live="polite">Cry: REF ×1.00</p>
    </div>
    <div class="dev-chapters__composure" id="dev-composure-row">
      <div class="dev-chapters__title">COMPOSURE</div>
      <div class="dev-chapters__row">
        <button type="button" data-comp-set="100">100</button>
        <button type="button" data-comp-set="50">50</button>
        <button type="button" data-comp-set="25">25</button>
        <button type="button" data-comp-set="10">10</button>
      </div>
      <div class="dev-chapters__row" style="margin-top:6px">
        <button type="button" data-comp-hit="10">HIT −10</button>
        <button type="button" data-comp-cig> +CIG</button>
        <button type="button" data-comp-steady>STEADY</button>
      </div>
      <div class="dev-chapters__row" style="margin-top:6px">
        <button type="button" data-comp-over>GAME OVER</button>
        <button type="button" data-comp-retry>RETRY CKPT</button>
      </div>
      <p class="dev-chapters__status" id="dev-composure-status" aria-live="polite">Composure: —</p>
    </div>
    <div class="dev-chapters__composure" id="dev-camcorder-row">
      <div class="dev-chapters__title">CAMCORDER</div>
      <div class="dev-chapters__row">
        <button type="button" data-cam-grant> +CAM</button>
        <button type="button" data-cam-tapes title="Grant debug-only tapes (not the in-world office cassette)"> +TAPES</button>
        <button type="button" data-cam-open>OPEN</button>
      </div>
      <p class="dev-chapters__status" id="dev-camcorder-status" aria-live="polite">Cam: —</p>
    </div>
    <div class="dev-chapters__composure" id="dev-finale-row">
      <div class="dev-chapters__title">FINALE</div>
      <div class="dev-chapters__row">
        <button type="button" data-finale-proto>PROTOTYPE</button>
      </div>
      <p class="dev-chapters__status" id="dev-finale-status" aria-live="polite">Ending: —</p>
    </div>
    <p class="dev-chapters__status" id="dev-chapter-status" aria-live="polite">Current: 01 — The Corridor</p>
    </div>
  `;
  document.body.appendChild(panel);
  const toggle = panel.querySelector('#dev-panel-toggle');
  const head = panel.querySelector('.dev-chapters__head');
  const setCollapsed = (collapsed) => {
    panel.classList.toggle('is-collapsed', collapsed);
    toggle.textContent = collapsed ? 'SHOW' : 'HIDE';
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    try { sessionStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (_) { /* private mode */ }
  };
  toggle.addEventListener('click', () => {
    setCollapsed(!panel.classList.contains('is-collapsed'));
  });

  // Drag from the header (not controls). Keeps the panel on-screen.
  {
    let drag = null;
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      const left = Math.max(0, Math.min(window.innerWidth - w, drag.originLeft + (event.clientX - drag.startX)));
      const top = Math.max(0, Math.min(window.innerHeight - h, drag.originTop + (event.clientY - drag.startY)));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = 'auto';
    };
    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      panel.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    head.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('button, select, input, a, label')) return;
      const rect = panel.getBoundingClientRect();
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft: rect.left,
        originTop: rect.top,
      };
      panel.classList.add('is-dragging');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      event.preventDefault();
    });
  }
  window.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey && event.shiftKey && (event.code === 'KeyD' || event.key === 'D' || event.key === 'd'))) {
      return;
    }
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    event.preventDefault();
    setCollapsed(!panel.classList.contains('is-collapsed'));
  });
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true);
  } catch (_) { /* ignore */ }

  const picker = panel.querySelector('#dev-chapter-choice');
  const go = panel.querySelector('#dev-chapter-go');
  const status = panel.querySelector('#dev-chapter-status');
  const miniLocation = panel.querySelector('#dev-location-mini');
  const locationReadout = panel.querySelector('#dev-location-readout');
  const locationCoords = panel.querySelector('#dev-location-coords');
  const locationObject = panel.querySelector('#dev-location-object');
  const copyLocation = panel.querySelector('#dev-copy-location');
  let locationReport = '';
  const checkpointRow = panel.querySelector('#dev-checkpoint-row');
  const checkpointPicker = panel.querySelector('#dev-checkpoint-choice');
  const memoryCheckpointRow = panel.querySelector('#dev-memory-checkpoint-row');
  const memoryCheckpointPicker = panel.querySelector('#dev-memory-checkpoint-choice');
  const recordsCheckpointRow = panel.querySelector('#dev-records-checkpoint-row');
  const recordsCheckpointPicker = panel.querySelector('#dev-records-checkpoint-choice');
  const wardCheckpointRow = panel.querySelector('#dev-ward-checkpoint-row');
  const wardCheckpointPicker = panel.querySelector('#dev-ward-checkpoint-choice');
  const wardCryRow = panel.querySelector('#dev-ward-cry-row');
  const cryStatus = panel.querySelector('#dev-cry-status');
  const updateCheckpointPicker = () => {
    checkpointRow.hidden = picker.value !== 'unseen';
    memoryCheckpointRow.hidden = !MEMORY_CHAPTERS.has(picker.value);
    recordsCheckpointRow.hidden = picker.value !== 'records';
    wardCheckpointRow.hidden = !WARD_CHAPTERS.has(picker.value);
    if (wardCryRow) wardCryRow.hidden = !WARD_CHAPTERS.has(picker.value);
  };
  picker.addEventListener('change', updateCheckpointPicker);
  let shown = '';
  let busy = false;
  let lastLocationUpdate = -Infinity;
  const LOCATION_UPDATE_MS = 200; // 5 Hz; rendering and movement remain untouched.

  function sync(chapter, force = false) {
    const now = performance.now();
    if (!force && shown === chapter && now - lastLocationUpdate < LOCATION_UPDATE_MS) return;
    const match = OPTIONS.find(([id]) => id === chapter);
    if (!match) return;
    lastLocationUpdate = now;

    // Developer-only telemetry: read actual rendered camera position, not scroll
    // input. This also distinguishes Chapter 01's outbound and return passes.
    const location = getLocation?.();
    if (location && Number.isFinite(location.progress)) {
      const p = Math.max(0, Math.min(1, location.progress));
      const percent = (p * 100).toFixed(2);
      const xyz = [location.x, location.y, location.z]
        .map(value => Number.isFinite(value) ? value.toFixed(2) : '—');
      const phase = location.phase || '';
      const objectId = location.objectId || 'none nearby';
      const mini = `${match[2]} · ${percent}%`;
      const summary = `Progress: ${percent}% (p=${p.toFixed(4)})${phase ? ` · ${phase}` : ''}`;
      const coords = `Camera XYZ: ${xyz.join(', ')}`;
      const object = `Nearest interactable: ${objectId}`;
      if (miniLocation.textContent !== mini) miniLocation.textContent = mini;
      if (locationReadout.textContent !== summary) locationReadout.textContent = summary;
      if (locationCoords.textContent !== coords) locationCoords.textContent = coords;
      if (locationObject.textContent !== object) locationObject.textContent = object;
      locationReport = [
        'Behind. — Bug location',
        `Chapter: ${match[1]} [${chapter}]`,
        summary,
        coords,
        object,
      ].join('\n');
    }

    if (shown === chapter && !force) return;
    shown = chapter;
    if (!busy || force) status.textContent = `Current: ${match[1]}`;
  }

  copyLocation.addEventListener('click', async () => {
    if (!locationReport) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(locationReport);
      } else {
        // Fallback for browsers without async clipboard access.
        const field = document.createElement('textarea');
        field.value = locationReport;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy not supported');
      }
      copyLocation.textContent = 'COPIED';
    } catch (error) {
      copyLocation.textContent = 'COPY FAILED';
      console.warn('[Behind. DEV] Could not copy location:', error);
    }
    window.setTimeout(() => { copyLocation.textContent = 'COPY'; }, 1500);
  });

  async function load() {
    if (busy) return;
    busy = true;
    picker.disabled = true;
    checkpointPicker.disabled = true;
    memoryCheckpointPicker.disabled = true;
    recordsCheckpointPicker.disabled = true;
    wardCheckpointPicker.disabled = true;
    go.disabled = true;
    status.textContent = 'Loading chapter…';
    try {
      const checkpoint = picker.value === 'unseen'
        ? checkpointPicker.value
        : MEMORY_CHAPTERS.has(picker.value)
          ? memoryCheckpointPicker.value
          : picker.value === 'records'
            ? recordsCheckpointPicker.value
            : WARD_CHAPTERS.has(picker.value)
              ? wardCheckpointPicker.value
              : 'start';
      const ok = await jump(picker.value, checkpoint);
      if (ok) {
        shown = ''; // Force status refresh even when restarting current chapter.
        const url = new URL(window.location.href);
        const choice = OPTIONS.find(([id]) => id === picker.value);
        url.searchParams.set('level', choice?.[2] ?? '01');
        if ((picker.value === 'unseen' || MEMORY_CHAPTERS.has(picker.value)
            || picker.value === 'records' || WARD_CHAPTERS.has(picker.value))
            && checkpoint !== 'start' && checkpoint !== 'before') {
          url.searchParams.set('checkpoint', checkpoint);
        } else {
          url.searchParams.delete('checkpoint');
        }
        window.history.replaceState(null, '', url);
        sync(getCurrentChapter(), true);
      } else {
        status.textContent = 'Chapter is temporarily unavailable.';
      }
    } catch (error) {
      status.textContent = 'Jump failed. Check console for details.';
      console.error('[Behind. DEV] Jump failed:', error);
    } finally {
      busy = false;
      picker.disabled = false;
      checkpointPicker.disabled = false;
      memoryCheckpointPicker.disabled = false;
      recordsCheckpointPicker.disabled = false;
      wardCheckpointPicker.disabled = false;
      go.disabled = false;
    }
  }

  go.addEventListener('click', load);

  const composureStatus = panel.querySelector('#dev-composure-status');
  const refreshComposure = () => {
    if (!composureApi || !composureStatus) return;
    composureStatus.textContent = `Composure: ${Math.round(composureApi.get())}`;
  };
  panel.querySelectorAll('[data-comp-set]').forEach(btn => {
    btn.addEventListener('click', () => {
      composureApi?.set(Number(btn.dataset.compSet));
      refreshComposure();
    });
  });
  panel.querySelector('[data-comp-hit]')?.addEventListener('click', () => {
    composureApi?.hit(10);
    refreshComposure();
  });
  panel.querySelector('[data-comp-cig]')?.addEventListener('click', () => {
    composureApi?.addCigarette?.();
    refreshComposure();
  });
  panel.querySelector('[data-comp-steady]')?.addEventListener('click', () => {
    composureApi?.testSteady?.();
  });
  panel.querySelector('[data-comp-over]')?.addEventListener('click', () => {
    composureApi?.forceGameOver?.();
  });
  panel.querySelector('[data-comp-retry]')?.addEventListener('click', () => {
    composureApi?.retryCheckpoint?.();
  });
  composureApi?.subscribe?.(refreshComposure);
  refreshComposure();

  const camStatus = panel.querySelector('#dev-camcorder-status');
  const refreshCam = () => {
    if (!camStatus) return;
    camStatus.textContent = camcorderApi?.status?.() || 'Cam: —';
  };
  panel.querySelector('[data-cam-grant]')?.addEventListener('click', () => {
    camcorderApi?.grantCamcorder?.();
    refreshCam();
  });
  panel.querySelector('[data-cam-tapes]')?.addEventListener('click', () => {
    camcorderApi?.grantAllTapes?.();
    refreshCam();
  });
  panel.querySelector('[data-cam-open]')?.addEventListener('click', () => {
    camcorderApi?.openCamcorder?.();
    refreshCam();
  });
  refreshCam();

  const finaleStatus = panel.querySelector('#dev-finale-status');
  panel.querySelector('[data-finale-proto]')?.addEventListener('click', () => {
    if (finaleStatus) finaleStatus.textContent = 'Ending: loading…';
    void Promise.resolve(finaleApi?.launchPrototype?.()).then((ok) => {
      if (finaleStatus) {
        finaleStatus.textContent = ok ? 'Ending: prototype' : 'Ending: failed';
      }
    });
  });

  const refreshCryVol = () => {
    if (!cryStatus) return;
    const v = audioApi?.getWardCryVolume?.() ?? 1;
    const label = v < 0.7 ? 'QUIET' : v > 1.15 ? 'LOUD' : 'REF';
    cryStatus.textContent = `Cry: ${label} ×${Number(v).toFixed(2)}`;
  };
  panel.querySelectorAll('[data-cry-vol]').forEach(btn => {
    btn.addEventListener('click', () => {
      audioApi?.setWardCryVolume?.(Number(btn.dataset.cryVol));
      refreshCryVol();
    });
  });
  refreshCryVol();

  const params = new URLSearchParams(window.location.search);
  const requested = params.get('level');
  const destination = OPTIONS.find(([id, , number]) =>
    requested?.toLowerCase() === id || requested === number ||
    requested === String(Number(number)));
  picker.value = destination?.[0] ?? getCurrentChapter();
  const checkpoint = params.get('checkpoint');
  if (Array.from(checkpointPicker.options).some(option => option.value === checkpoint)) {
    checkpointPicker.value = checkpoint;
  }
  if (Array.from(memoryCheckpointPicker.options).some(option => option.value === checkpoint)) {
    memoryCheckpointPicker.value = checkpoint;
  }
  if (Array.from(recordsCheckpointPicker.options).some(option => option.value === checkpoint)) {
    recordsCheckpointPicker.value = checkpoint;
  }
  if (Array.from(wardCheckpointPicker.options).some(option => option.value === checkpoint)) {
    wardCheckpointPicker.value = checkpoint;
  }
  updateCheckpointPicker();
  sync(getCurrentChapter());
  // Deep-link to a chapter; audio still requires the player's SOUND: ON click.
  if (destination) requestAnimationFrame(() => { void load(); });
  return { sync };
}
