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
];

const MEMORY_CHAPTERS = new Set(['memory-white', 'memory-black']);

export function mountDevChapters(jump, getCurrentChapter) {
  const panel = document.createElement('aside');
  panel.className = 'dev-chapters';
  panel.setAttribute('aria-label', 'Developer chapter navigation');
  panel.innerHTML = `
    <div class="dev-chapters__title">DEV / CHAPTER JUMP</div>
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
    <p class="dev-chapters__status" aria-live="polite">Current: 01 — The Corridor</p>
  `;
  document.body.appendChild(panel);
  const picker = panel.querySelector('#dev-chapter-choice');
  const go = panel.querySelector('#dev-chapter-go');
  const status = panel.querySelector('.dev-chapters__status');
  const checkpointRow = panel.querySelector('#dev-checkpoint-row');
  const checkpointPicker = panel.querySelector('#dev-checkpoint-choice');
  const memoryCheckpointRow = panel.querySelector('#dev-memory-checkpoint-row');
  const memoryCheckpointPicker = panel.querySelector('#dev-memory-checkpoint-choice');
  const updateCheckpointPicker = () => {
    checkpointRow.hidden = picker.value !== 'unseen';
    memoryCheckpointRow.hidden = !MEMORY_CHAPTERS.has(picker.value);
  };
  picker.addEventListener('change', updateCheckpointPicker);
  let shown = '';
  let busy = false;

  function sync(chapter, force = false) {
    if (shown === chapter && !force) return;
    const match = OPTIONS.find(([id]) => id === chapter);
    if (!match) return;
    shown = chapter;
    if (!busy || force) status.textContent = `Current: ${match[1]}`;
  }

  async function load() {
    if (busy) return;
    busy = true;
    picker.disabled = true;
    checkpointPicker.disabled = true;
    memoryCheckpointPicker.disabled = true;
    go.disabled = true;
    status.textContent = 'Loading chapter…';
    try {
      const checkpoint = picker.value === 'unseen'
        ? checkpointPicker.value
        : MEMORY_CHAPTERS.has(picker.value)
          ? memoryCheckpointPicker.value
          : 'start';
      const ok = await jump(picker.value, checkpoint);
      if (ok) {
        shown = ''; // Force status refresh even when restarting current chapter.
        const url = new URL(window.location.href);
        const choice = OPTIONS.find(([id]) => id === picker.value);
        url.searchParams.set('level', choice?.[2] ?? '01');
        if ((picker.value === 'unseen' || MEMORY_CHAPTERS.has(picker.value))
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
      go.disabled = false;
    }
  }

  go.addEventListener('click', load);
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
  updateCheckpointPicker();
  sync(getCurrentChapter());
  // Deep-link to a chapter; audio still requires the player's SOUND: ON click.
  if (destination) requestAnimationFrame(() => { void load(); });
  return { sync };
}
