# Behind. — The In-Between (standalone procedural hallway proof of concept)

This is an **isolated Three.js experiment**, also integrated into Behind. as story chapter **05B**.

## Run standalone

1. Open this folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. Scroll the mouse wheel or press **W/S** to move along the generated rail. **A/D** or dragging on the canvas changes your view. **R** generates another layout.
4. Change the seed and click **Load seed** to replay the exact same hallway. URLs preserve `?seed=12345`.

Three.js is loaded from its official distribution on jsDelivr, so an internet connection is required for the first-party library CDN.

## Run inside Behind. (integrated)

Story progression:

**Night Shift → Stairwells → The In-Between → Threshold → Unseen**

Direct jump / bookmark:

```
?debug=1&level=interlude&seed=48271
```

Hall length targets **90–140 m** (hard max 150). Plans are cached per playthrough seed so retries reproduce the same layout; a fresh seed is rolled on each new playthrough unless `?seed=` is set.

Debug skip (Stairwells → Threshold): `?skipinterlude=1` or DEV TOOLS → SKIP INTERLUDE.

## What this experiment does

- Builds the corridor shell, structural frames, lighting, pipes, lockers, shelves, storage objects and utility workbenches from a deterministic seed.
- Chooses modular corridor sections with varying lengths and visual categories.
- Preserves a single straight, reversible, centerline camera route.
- Has a clear start and an end door into The Threshold.

## What it intentionally doesn't do yet

- No pickups, enemies, puzzles, QTEs, cutscenes, or scripted horror beats.
- No side branches or turns.
- The environment stays quiet and almost completely ordinary for now.
