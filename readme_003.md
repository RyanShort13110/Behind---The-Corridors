# Behind. — Prototype 003.0 / The Records

This is the first playable development pass for **Level 03**, added after the polished Level 02 baseline (**Prototype 002.7**). Levels 01 and 02 are preserved.

## What to expect

1. Complete Level 01 and use **CONTINUE INTO THE OFFICE**.
2. Complete Level 02 as before (reach locked records door, return to entrance, advance again).
3. On the Level 02 end card, use the new **CONTINUE INTO THE RECORDS** button.
4. Level 03 is a quieter administrative floor: receiving counter, file cabinets, a sorting desk, storage shelves and an open passage.
5. A single drawer is open. If you pass it and choose to scroll back, it is shut. You do *not* have to backtrack to finish this chapter.
6. A photograph rests **face-down** on the sorting station. Its contents are not rendered or revealed. The line “Leave it.” is intentionally unexplained.
7. Continuing to the last doorway ends this prototype. Level 04 has not been created.

## Files changed / added

- `js/main.js`: chapter selection, Level 02 → 03 handoff, persistent state, reset and ending card support
- `js/audio.js`: quiet Records ambience and phone fade-out
- `js/levels/records.js` **NEW**: scene geometry, lights, materials and disposal
- `js/levels/records-story.js` **NEW**: dialogue and optional-backtrack state
- `index.html`: accessible nonvisual description updated
- `docs/STORY_BIBLE.md`: Level 03 outline promoted to first implementation
- `README.md`, `README_003.md`: release documentation

**No change** to `js/levels/office.js`, `office-story.js`, corridor/elevator geometry, visual CSS, or the original breathing file volume. Movement is still limited to **5.5 m/s**. Breathing gain remains **0.065**.

## Installing the changed TXT bundle

Back up your current project first. Extract the TXT bundle and copy the contents of each `.txt` file into the matching path without the `.txt` extension. Create `js/levels/records.js` and `js/levels/records-story.js` if needed. Then hard-refresh Live Server.

For the full Netlify ZIP, unzip/deploy from the folder containing `index.html`. Add your own `assets/breathing-scared.m4a`; this original user audio file is intentionally not redistributed.

## Testing / known limits

Syntax, story-state transitions (including Level 02 regression), and scene create/update/dispose tests were run. A live visual browser session was blocked by this environment, so **camera composition and final lighting have not been visually verified**. The `?debug=1` parameter continues to show performance diagnostics.

This chapter is only the first environment-and-narrative build, not a finished 45–60 minute game. Saving/checkpoints and the next floor remain future work.
