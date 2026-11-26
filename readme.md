# Behind.

An interactive psychological horror experience. You are alone in an empty office building at **2:17 AM**. Scroll forward through corridors; scroll back and notice what changed. Sound is optional and off by default.

**Live idea:** quiet dread through space, light, sound, and ordinary objects — not jumpscares or on-screen monsters.

## Play

Open `index.html` through a local static server (or your deployed host). A plain `file://` open may block ES modules.

```bash
# example
npx --yes serve .
# then visit the printed URL
```

Controls:

- **Scroll up** — advance along the rail
- **Scroll down** — retreat / return
- **A / D** (or swipe sideways) — look left / right
- **Click** — inspect objects; take items into inventory when allowed
- **I** / **INVENTORY** — full-screen inventory (Esc or I closes)
- **QUALITY / MOTION / SOUND** — bottom bar toggles

Headphones recommended when sound is on.

## Chapters (current build)

Ordinary play runs through **Levels 01–03** (and can continue into 04+). Records requires the Office key fob to unlock the far exit.

| # | Chapter | Notes |
|---|---------|--------|
| 01 | The Corridor | First doubt; return-pass changes; rear elevator seal |
| 02 | The Office | Occupied absence; sticky-note keypad; **key fob** required before leaving |
| 03 | The Records | Avoidance; face-down Polaroid; optional drawer discrepancy; **fob card-reader exit** |
| 04 | The Night Shift | Unseen companion suggestion; pace-following footsteps |
| 05 | The Threshold | Reality rupture; progressive corridor corruption |
| 06 | The Unseen | Proximity fear; forced retreat while facing an empty hall |

Narrative canon and dialogue live in [`docs/story_bible.md`](docs/story_bible.md).

## Dev tools

Append `?debug=1` for the chapter jump panel and performance HUD.

| Query | Purpose |
|-------|---------|
| `?debug=1` | Dev chapter UI |
| `?debug=1&level=01` … `06` | Jump to a main chapter |
| `?debug=1&level=memory-white` | Dev-only white dragon memory |
| `?debug=1&level=memory-black` | Dev-only black dragon memory |
| `&checkpoint=…` | Unseen / memory checkpoints when supported |

**TEST COMBAT** (debug panel): isolated arena prototype with crowbar / cigarettes / revolver ammo state. Does not consume story inventory. Exit restarts the prior chapter from its start.

**+WEAPONS**: grants crowbar, machete, revolver (6/6 + reserve), and spare rounds for inventory testing.

**ENABLE THRESHOLD COMBAT** / `?debug=1&level=threshold&combat=1`: experimental in-world fight vs **THE BENT** inside The Threshold (~69%). Keeps the chapter scene; not mandatory story content. **JUMP TO BENT** skips to the approach for faster testing.

Memory chapters share a scroll-rail living room (`js/levels/memory-home.js`). They are **not** in ordinary L01–L06 progression.

## Stack

- Vanilla ES modules
- [Three.js](https://threejs.org/) `0.180` (CDN import map)
- GSAP + ScrollTrigger (CDN)
- Web Audio API (synthesized beds / cues; no required downloads)

Main entry: [`js/main.js`](js/main.js).

## License / notes

Personal / portfolio project. Writer-only spoiler notes under `docs/writer-only/` are gitignored and must not be published.
