# Finale prototype (debug only)

Access: `?debug=1&ending=finale-prototype`

Or Dev Tools → **FINALE → PROTOTYPE**.

## Flow

1. Short institutional corridor (Ch01-adjacent)
2. Scroll / WASD to the exit door
3. Click the door or press **E**
4. Scripted: door opens → doorway mask → walk out → slow turn → hold → fade to black

## Organism

- GLB: `assets/finale/behind_final_organism_v01.glb` (~173k tris, meters, entrance −Z)
- Loaded lazily only when this prototype boots
- Procedural motion on named parts (`BREATH_SHELL`, ribs, limbs, exit folds, buttresses)

## Debug panel (on-screen)

- **SKIP TO REVEAL** — jump near the turn
- **PAUSE / RESUME** — freeze camera timeline
- **HOLD SHOT** — jump to final framing
- **RESTART** — corridor again
- Breath intensity / speed, fog, reveal speed

## Files

- `prototype.js` — session, camera, ambience, fade, debug UI
- `corridor.js` — short hall + exit door
- `creature.js` — GLB load + procedural animation

Staging only. Not wired into the published chapter chain.
