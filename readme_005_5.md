Behind. — Prototype 005.5: Developer Chapter Navigation
=======================================================

NEW: Development-only chapter selector (no UI change for normal visitors).

Install these COMPLETE files (rename .txt extension away):
  js/main.js.txt            -> js/main.js
  js/dev-chapters.js.txt    -> js/dev-chapters.js (NEW FILE)
  css/style.css.txt         -> css/style.css

To open the developer UI in VS Code Live Server / Netlify:
  http://your-site-url/?debug=1
Choose 01–05, press LOAD. This works from any chapter or even the intro.

Direct links / bookmarks:
  ?debug=1&level=01   The Corridor
  ?debug=1&level=02   The Office
  ?debug=1&level=03   The Records
  ?debug=1&level=04   The Night Shift
  ?debug=1&level=05   The Threshold

WHAT A DEBUG JUMP DOES:
- Uses the existing WebGL renderer and chapter scene modules.
- Disposes the previously active chapter, loads the destination fresh.
- Clears story triggers and encounter flags, so no events are pre-completed.
- Resets the camera and the native scroll position to that chapter's beginning.
- Retains the 5.5 m/s movement limit, quality, and motion options.
- Audio remains opt-in (press SOUND: ON to hear it).
- Does NOT save progress or insert fictional story events.

IMPORTANT: this is a developer convenience, NOT a secure access control.
If you don't want it accessible on a public Netlify build, remove the feature
for the final release or restrict access with deployment controls.

Only these three files differ from Prototype 005.4. All chapter scene files,
level audio, story dialogue and gameplay remain unchanged.

Testing: JS syntax, chapter selector state/navigation tests and file integrity
checks completed. Full browser playthrough still needs local verification.
