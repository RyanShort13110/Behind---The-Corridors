# Behind. — Prototype 003.2 / A Sound from Ahead

A shorter Level 02 while retaining the complete original Corridor (Level 01) and Records (Level 03) chapters.

## New Level 02 route

1. Explore the office and encounter the lighter, chair, telephone and glass meeting room as before.
2. The Records door at the far end remains locked. Scroll DOWN to retreat.
3. The phone stops, and the chair has been tucked away. Only on the return does the protagonist comment on it.
4. Near the mid-office desks, ONE subdued metal-latch sound comes from farther ahead, toward the meeting room. The event is also communicated through an on-screen caption with sound OFF.
5. The instruction changes to **SCROLL UP TO INVESTIGATE**. The player is free to keep retreating, but advancing again takes them toward an existing side passage beside the meeting room.
6. The camera turns gently to the right into the service passage and the Level 02 end card appears. Continue to Level 03.
7. Level 03 remains the same Records chapter: filing cabinets, changed drawer, face-down photograph, and optional backtracking.

## Updated files since Prototype 003.1

- `js/levels/office-story.js` — one-shot latch trigger, partial retreat, new dialogue and phase/exit thresholds
- `js/levels/office-route.js` — NEW reversible service-passage camera path
- `js/levels/office.js` — side entrance geometry, door and sign. One right-side workstation replaced; meeting room, displaced chair and lighter untouched
- `js/main.js` — one-shot audio event, branched office camera, end-card handling
- `js/audio.js` — low-level synthesized metal latch (respects sound OFF)
- `index.html` — updated nonvisual chapter description
- `docs/STORY_BIBLE.md` — story architecture reflects new office route

## Installing the changed TXT files

1. Back up the existing working project.
2. Copy the contents of each `.txt` file from the Changed TXT archive into its corresponding project path, without `.txt`.
3. Create `js/levels/office-route.js` from `office-route.js.txt` (NEW).
4. Hard refresh Live Server. The site ZIP is a full standalone deployable build (after adding your existing `assets/breathing-scared.m4a`).

## Technical and creative constraints

- No forced automatic reversal, jump scare or new monster.
- The latch cue can only happen ONCE per playthrough and never replays when crossing the threshold again.
- No additional external audio asset is needed; sound remains optional and OFF by default.
- Existing single renderer, scroll controls and 5.5 m/s cap retained; the new camera branch is physically within that cap.
- The older far door remains closed. The Records floor loads when continuing from the passage, preserving chapter disposal.
- Level 01's five-second breathing file and gain of 0.065 are unchanged.

## Validation

JavaScript syntax; scripted office story phases and reversals; branch-route velocity; geometry create/update/reset/dispose using a mock Three.js scene; archive integrity. **Camera composition and actual sound playback still require testing in your browser.** An attempted Chromium preview in this environment was blocked by its network policy.
