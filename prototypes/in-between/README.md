# Behind. — The In-Between (standalone procedural hallway proof of concept)

This is an **isolated Three.js experiment**, also integrated into Behind. as a debug-only chapter.

## Run standalone

1. Open this folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. Scroll the mouse wheel or press **W/S** to move along the generated rail. **A/D** or dragging on the canvas changes your view. **R** generates another layout.
4. Change the seed and click **Load seed** to replay the exact same hallway. URLs preserve `?seed=12345`.

Three.js is loaded from its official distribution on jsDelivr, so an internet connection is required for the first-party library CDN.

## Run inside Behind. (integrated)

Behind. hosts this generator as the debug-only `interlude` chapter:

```
?debug=1&level=interlude&procgen=1&seed=48271
```

It uses Behind.'s existing scene, scroll rail, look controls, and `js/procgen/` RNG session. No standalone renderer loop is used in-game. Generation validates layouts and falls back to a known-good plan on failure. The chapter is **not** part of normal story progression.

## What this experiment does

- Builds the corridor shell, structural frames, lighting, pipes, lockers, shelves, storage objects and utility workbenches from a deterministic seed.
- Chooses 9–12 modular corridor sections with varying lengths and visual categories.
- Preserves a single straight, reversible, centerline camera route, with no random branches or inaccessible required items.
- Has a clear start and an end door; **does not integrate or alter any original chapter transitions**.
- Shows how a separate generated 'in-between' level could work between authored chapters.

## What it intentionally doesn't do yet

- No pickups, enemies, puzzles, cutscenes, or scripted story beats.
- No side branches or turns; the first integration should prove corridor junctions and camera continuity before adding turning routes.
- No production collision/occlusion validator beyond layout validation + fallback.
