# Found-footage tape assets

Debug-only. Requires `?debug=1&tape=<id>`. Normal gameplay never loads these modules.

## Office-01 — The Waiting Thing

- URL: `?debug=1&tape=office-01`
- **Model:** `waiting-thing.glb` — lazy-loaded via `js/tapes/creature.js`
- **Image fallback:** `office-01-creature.png`
- Placement / shading: `OFFICE_01_CREATURE` in `js/tapes/creature.js`

## Black-Dragon-01 — Apartment knocking tape

- URL: `?debug=1&tape=black-dragon-01`
- Reuses `createMemoryBlack` / `js/levels/memory-home.js` (black variant). No extra GLB.
- Scripted path + synth knocks: `js/tapes/black-dragon-01.js`, `js/tapes/black-dragon-audio.js`
- Live knobs: `window.__tapeBlackDragon` / on-screen inspector
