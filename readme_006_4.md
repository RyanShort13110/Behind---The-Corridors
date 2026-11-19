# Behind. — Prototype 006.4 / The Shape in the Distance

Built from the existing working Prototype 006.3. All six playable chapters retained. No Level 07 scene has been implemented yet.

## Level 06 additions

- A large, indistinct curtain of impossible darkness now materializes *after* the distorted roar on the retreat. No humanoid features, collision, jump cut, or face reveal. Its spatial position matches the direction of the established scraping/roar source and advances as the player continues backing up.
- The featureless mass grows larger, darker, and closer over the course of the retreat, retaining one-way event state if the user scrolls forward again.
- On the original SILENCE beat (progress 0.192), the shadow vanishes very quickly and extinguished overhead fixtures restore smoothly. No extra roar, jump scare, or camera jerk.
- The open maintenance side door, final click, checkpoint reset behavior and Level 06 ending remain unchanged. Level 07 (The Landing) is still in design, so the Level 06 ending card remains the current handoff.
- Shadow motion can be disabled with MOTION: REDUCED; the slowly approaching shape itself is still visible.

## Developer checkpoints

- `?debug=1&level=06&checkpoint=shadow` — just ahead of the shadow's appearance.
- `?debug=1&level=06&checkpoint=closing` — late retreat, shape close, before silence.
- `?debug=1&level=06&checkpoint=silence` — existing checkpoint for cutoff and returning lights.

All previous chapter/Level 06 checkpoints preserved. Breathing gain stays at 0.025. Audio remains opt-in.
