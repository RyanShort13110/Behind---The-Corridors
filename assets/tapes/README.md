# Found-footage tape assets

## The Waiting Thing (Office-01)

- **Model (active):** `waiting-thing.glb` — loaded only when `?debug=1&tape=office-01` boots.
- **Image fallback:** `office-01-creature.png` — used if `OFFICE_01_CREATURE.mode` is `'image'`.

Placement / scale: `OFFICE_01_CREATURE` in `js/tapes/creature.js`
(`position`, `height` ≈ 3 m, `yaw`, `opacity`, `darkness`).

Normal gameplay never imports this folder’s GLB or `GLTFLoader`.
