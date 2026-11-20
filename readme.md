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
- **QUALITY / MOTION / SOUND** — bottom bar toggles

Headphones recommended when sound is on.

## Chapters (current build)

Ordinary play runs through **Levels 01–03**. Completing Records ends the build for now (later floors are still being revamped). Levels 04–06 remain reachable only via `?debug=1`.

| # | Chapter | Notes |
|---|---------|--------|
| 01 | The Corridor | First doubt; return-pass changes; rear elevator seal |
| 02 | The Office | Occupied absence; inventory puzzles; sticky-note keypad exit |
| 03 | The Records | Avoidance; face-down photograph; optional backtrack · **current playable end** |
| 04 | The Night Shift | Debug only while revamping |
| 05 | The Threshold | Debug only while revamping |
| 06 | The Unseen | Debug only while revamping |

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

Memory chapters share a scroll-rail living room (`js/levels/memory-home.js`). They are **not** in ordinary L01–L06 progression.

## Stack

- Vanilla ES modules
- [Three.js](https://threejs.org/) `0.180` (CDN import map)
- GSAP + ScrollTrigger (CDN)
- Web Audio API (synthesized beds / cues; no required downloads)

Main entry: [`js/main.js`](js/main.js).

## License / notes

Personal / portfolio project. Writer-only spoiler notes under `docs/writer-only/` are gitignored and must not be published.
