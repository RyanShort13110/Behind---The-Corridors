BEHIND. — PROTOTYPE 006.0 / LEVEL 06: THE UNSEEN
================================================

Based on the user's actual Prototype 005.5 Netlify archive. The original
five playable chapters and their scene/story modules remain intact.

NEW PLAYABLE CHAPTER
  06 — The Unseen: an ordinary maintenance hall after Level 05's grotesque
  corridor. Move forward to a sealed maintenance barrier. A positional,
  synthesized dragging/scraping sound approaches from the EMPTY passage ahead.
  Scroll DOWN while continuing to face ahead. An existing side access panel
  opens on the LEFT. Keep scrolling DOWN; the camera turns left and travels
  sideways through the exit. No creature, silhouette, jumpscare, or elevator.

  Sound is OFF by default. Press SOUND: ON for the full headphones experience.
  Captions and movement instructions remain available with sound disabled.

DEVELOPER TOOLS (permanent)
  ?debug=1                           Chapter selector, 01–06
  ?debug=1&level=06                  Level 06 at start
  ?debug=1&level=06&checkpoint=approach   Blocked-end encounter
  ?debug=1&level=06&checkpoint=retreat    Mid-hall retreat
  ?debug=1&level=06&checkpoint=exit       Just before the side turn

  The debug panel has a checkpoint selector when Chapter 06 is selected.
  Selecting a checkpoint creates appropriate fresh event state (no saves).
  Chapter jumps continue disposing and rebuilding scene modules. Normal
  movement speed is still capped at 5.5m/s (including the side-turn route).

FILES ADDED
  js/levels/unseen.js
  js/levels/unseen-story.js
  js/levels/unseen-route.js
  README_006.md

FILES MODIFIED
  js/main.js
  js/audio.js
  js/dev-chapters.js
  css/style.css
  index.html (accessible-story explanation only)
  docs/STORY_BIBLE.md (add Level 06 production entry)

QUICK INSTALL
  Netlify ZIP: deploy whole extracted ZIP contents, with index.html at root.
  Text-sources ZIP: copy complete files from their mirrored relative paths;
  remove the .txt extension. These are FULL files, not diff patches.

AUDIO NOTE
  The supplied 005.5 archive does NOT include the earlier
  assets/breathing-scared.m4a recording. Place your existing file there
  when publishing, if you want Chapter 01 breathing. Level 06's new sound
  is synthesized by Web Audio and needs NO new audio file.

QUALITY CHECKS
  JavaScript module syntax and automated Level 06 narrative/state/route
  tests passed, including side-exit completion, fresh reset, named developer
  checkpoints, and geometric 5.5m/s route compliance. Browser playthrough
  still needs local VS Code Live Server / Netlify verification. In the build
  environment here, Chromium blocked navigation to local URLs, so no browser
  render or headphones test is claimed.
