# Behind. — Prototype 004.1: THE NIGHT SHIFT

This is the first Act II construction pass and should be play-tested as a scene, not treated as a final narrative lock.

## What's new

- A fourth chapter, **The Night Shift**, reached from the Level 03 end screen.
- Wider communal lounge, kitchenette and sink, table, sofa, lamp, and a quieter staff wing leading to an open doorway.
- Subtle footsteps begin in the lounge and track the player’s movement; if the player stops, exactly one delayed extra step sounds, then silence until movement resumes. The footsteps permanently stop near the exit.
- Two overhead fixtures behind the player remain unlit afterward. No strobe or visible monster. The caption “The footsteps have stopped.” follows a brief silent beat near the final door.
- First Act II internal monologue, still withholding any explicit explanation.
- Records -> Night Shift transition through the same scene/renderer/camera lifecycle, with full disposal of the previous level.
- Story memory persists across chapter transitions; no checkpoint saving or personal-data storage yet.

## Locked prior behavior

All Level 01–03 scene geometry and events are retained. The full test build also includes the user's approved Level 03 caption timing change: **“Leave it.” only between progress 0.56 and 0.60**. The breathing audio remains `assets/breathing-scared.m4a` at gain 0.065 and movement remains capped at 5.5 m/s.

## Installation

Changed-TXT zip: remove `.txt` extensions when placing files into the project. Complete replacement files are provided for `js/main.js`, `js/audio.js`, `index.html`, and the two *new* modules `js/levels/night.js` and `js/levels/night-story.js`.

Full Netlify zip: deploy from the contained `index.html` at the ZIP root, and copy your existing `assets/breathing-scared.m4a` into `assets/`.

## Playtest targets

1. Complete 01 → 02 → 03 and use **CONTINUE INTO THE NIGHT SHIFT**.
2. Confirm staff furniture and the open end doorway appear before completing the chapter.
3. Approach the lounge and listen as soft footsteps follow movement (SOUND ON), or watch the first sound caption (SOUND OFF). Pause to hear one delayed extra step and no idle loop.
4. Continue toward the exit; the footsteps must fall silent near the doorway, with a delayed caption acknowledging the silence. Retry with continuous scrolling to ensure the chapter can finish without stopping.
5. Reverse after the footsteps have stopped; they must NOT resume. The light fixtures behind you should be dim, with no human figure.
6. Test Motion: Reduced, Sound: Off, page Restart, and repeated chapter handoffs.

The final visual framing, audio level, and performance on target laptop hardware remain to be verified in-browser.
