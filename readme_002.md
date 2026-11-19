# Behind. — Prototype 002.2: The Office (Lighter Scratch + Return Timing)

This is a small fix release on top of 002.1. It modifies **three files only**:

- `js/levels/office.js` — The bright white slash beside the coffee mug was the lighter's scratch, drawn with a `MeshBasicMaterial` (unlit and therefore conspicuously white). The scratch is now shorter, thinner and lit by the scene; the body uses lower metalness so it reads as a lighter rather than a dark rectangular box. A thin lid seam helps its silhouette. No outline, glow, or collectible marker.
- `js/levels/office-story.js` — The line **“I should take another look.”** no longer appears halfway through the retreat, immediately after “I passed this desk already.” The return must now reach approximately the office entrance (~7.5% progress), before that line appears. The second-approach phase cannot start until players then move forward again past ~12% progress. Partial reversals near the desks do not count.
- `js/main.js` — The return-end narrative remains visible even at the very bottom of the page/scroll (progress 0), so the invitation to move forward doesn't vanish when players back all the way to the elevator.

## Installing the small update

Back up your `Behind/` project. Extract the **Changed TXT** zip, rename each `.js.txt` to `.js` and replace only the three matching JavaScript paths in your existing project. You do not need to change `index.html`, CSS, audio, the corridor, or the elevator. Hard-refresh Live Server to avoid stale modules.

For a separate deployment test, use the **Complete Netlify** zip. Supply your existing `assets/breathing-scared.m4a` yourself. That recording is not bundled. The previous 5.5 m/s speed cap and 0.065 breathing gain remain unchanged.

## Playtest checks

1. Complete the Level 01 corridor and enter Level 02. The office lighter now has a subtle scratch, rather than an unlit glowing-white stripe, beside the coffee cup on the right-hand counter.
2. Reach the locked records door and scroll **DOWN**. The phone stops. Around the middle of the return, “I passed this desk already.” appears.
3. Keep backing toward the original elevator. The next line does **not** appear mid-corridor; there is a deliberate silent gap.
4. At the office entrance, “I should take another look.” appears and the bottom instruction changes to **SCROLL UP TO LOOK AGAIN**. It stays visible if you scroll all the way to the bottom.
5. Scroll **UP** again. The second-pass dialogue starts after you leave the elevator area, and the changed chair / opened records door remain intact.

## Verification and limits

JavaScript syntax and scripted office state-transition tests passed for this patch; real-time browser visual framing remains a playtest item. No full browser visual run is claimed. Only these two reports have been changed; Level 03 and checkpoint saving remain future work.
