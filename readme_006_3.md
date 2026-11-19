# Behind. — Prototype 006.3: The Unseen refinement

Based on Prototype 006.2. All six chapters and existing development tooling retained.

## Changes

- Large **BACK UP. / SCROLL DOWN ↓** overlay appears as soon as the dragging begins at the sealed end of Level 06; disappears permanently once retreat starts.
- A single **2.55-second synthesized distorted non-human roar** enters at approximately Level 06 progress 0.605 during retreat, after the cabinet opens, on top of the existing dragging. Spatialized through the same front-positioned HRTF sound source; modest rounded attack (not a jump scare).
- Two overhead fluorescent fixtures (indexes 8 and 6) intermittently flutter within view, in separated regions of the retreat, with irregular brief dips in both emitted light and visible diffusers. Flicker stops before the advancing blackout, and is disabled with reduced motion.
- Verified Level 06 camera longitudinal positioning in original 006.2: it already sets the world-space route Z correctly; no camera-route change was required.
- New developer checkpoints `flicker` and `roar`. The `roar` checkpoint intentionally begins **before** the sound event, so backing up triggers it naturally. Earlier checkpoints unchanged.
- Preserved chapter-jump deep links, state persistence, optional audio, asset lifecycle/disposal, performance controls, and breathing volume **0.025**.

## Useful test links

- `?debug=1&level=06&checkpoint=approach` — sealed end and BACK UP prompt.
- `?debug=1&level=06&checkpoint=flicker` — immediately before the earlier overhead flicker.
- `?debug=1&level=06&checkpoint=roar` — just ahead of the new roar threshold.
- `?debug=1&level=06&checkpoint=blackout` — existing progressive shutdown.
- `?debug=1&level=06&checkpoint=carton` — existing carton opening.

Sound remains opt-in (SOUND: ON). Run with VS Code Live Server or deploy the ZIP contents to Netlify. CDN access is required for Three.js and GSAP.
