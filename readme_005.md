# Behind. — Prototype 005.0: The Threshold

This build adds Level 05 to the existing four-level prototype. Source files are ES modules; run with VS Code Live Server or Netlify, not a file:// URL.

## New

- `js/levels/threshold.js`: freestanding door, familiar hallway, procedural organic walls, darker tears, ridges, house-key prop, progress-driven red lighting/fog; proper dispose.
- `js/levels/threshold-story.js`: one-way environmental milestone flags and sparse narration.

## Updated

- `js/main.js`: continue from Night Shift, single-renderer chapter transition, narrative routing and state reset.
- `js/audio.js`: understated progress-based ambience.
- `index.html`: updated screen-reader description.
- `docs/STORY_BIBLE.md`: Level 05 design notes.

Keep `assets/breathing-scared.m4a` from your local project (not included in the ZIP). The sound toggle starts OFF.

Scene checks and JS syntax tests run in development; real 3D visuals must be checked in browser, particularly free-standing door opening, lighting, and key visibility.
