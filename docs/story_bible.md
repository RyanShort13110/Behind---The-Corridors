# BEHIND. — Living Story Bible

**Status:** Working draft / synchronized with playable Levels 01–03, November 2026. Records exit requires the Office key fob.  
**Genre:** Interactive first-person psychological horror web film  
**Target:** Approximately 10 chapters, 45–60+ minutes in its eventual complete form  
**Creative rule:** *The building doesn't chase you. It waits for you to look away.*

### Status labels (use throughout)

| Label | Meaning |
|---|---|
| **ESTABLISHED CANON** | Deliberate, accepted story decisions. Treat as locked unless consciously revised. |
| **IMPLEMENTED** | Mechanics, events, and dialogue verified in the current build. |
| **OPEN / PROVISIONAL** | Ideas or intentions not finalized; do not treat as lore. |

## The creative promise

**ESTABLISHED CANON**

The player may notice an emotional connection before the protagonist can put it into words. The experience should never resolve every ambiguity for them. Early chapters are grounded in missing people, mundane belongings, and discrepancies that could almost be explained away. The building is not presented as a character with dialogue or a collection of supernatural puzzles.

**No jumpscares or overt creatures in Chapters 01–03.** Avoid prophetic warnings, sinister computer messages, blood, sudden faces, or overexplained memory sequences. Let lighting, location, sound, and changed objects do the work.

### Protagonist characterization (Levels 01–02)

**ESTABLISHED CANON**

- Ordinary human reactions to uncertainty first; rationalizing comes before panic.
- Gradual distrust of memory and observation, understated rather than theatrical.
- Spontaneous internal thought — not narration directed at the player.
- Does not narrate everything the player can already see.
- Background, occupation, and relationship to the building remain unknown.
- Silence is intentional storytelling, not missing content.

Gameplay instructions (scroll prompts, USE/TAKE cues) are separate from protagonist dialogue.

## Story structure (provisional)

**OPEN / PROVISIONAL**

| Act | Chapters | Narrative function | Key restriction |
|---|---|---|---|
| I: The Arrival | 01–03 | Orientation, anxiety, first recognition | No overt monsters or jumpscares |
| II: The Familiar | 04–07 | Personal resonance, contradictory recollection | Never convert themes into literal puzzle answers |
| III: What Remains | 08–10 | Emotional consequences, difficult recognition, aftermath | No tidy explanatory twist or exposition dump |

The specific number of floors and chapter names can change if pacing requires it. Do not build to a chapter count at the expense of silence and natural discovery.

## Composure (psychological survival)

**ESTABLISHED CANON**

Composure is a **survival resource**, not combat HP and not a purely atmospheric meter. Reaching zero is a definitive **gameplay failure** (game over). The story does **not** state whether the protagonist died, collapsed, or experienced something supernatural — only that they lost control.

There is no combat, no free walking, and no automatic drain from time, ordinary movement, inspecting collectibles, solving puzzles, or re-crossing the same trigger.

| Rule | Value |
|---|---|
| Maximum / start | 100 |
| Cigarette restore | **+40** (`COMPOSURE_CONFIG` / `CIGARETTE_RESTORE` in `js/composure.js`) |
| Supply | Exactly **one** cigarette per main-story chapter (pack visual → one consumable) |
| Persistence | Unused cigarettes and composure persist across chapter transitions |
| Use at full | Blocked; inventory copy explains temporary relief + restore amount |
| Zero composure | **Game over** — fade, restrained failure UI, checkpoint retry or chapter restart |

### Deterioration stages (**IMPLEMENTED**)

| Range | Stage | Presentation |
|---|---|---|
| 76–100 | Composed | Baseline breathing, visibility, audio, camera |
| 46–75 | Unsettled | Heavier breath mix, light vignette, mild bed filtering |
| 21–45 | Distressed | Stronger vignette, unease in bed, slight instability |
| 1–20 | Critical | Heavy vignette, irregular stress audio, subtle camera sway (honors reduced-motion) |
| 0 | Game over | Movement locked; failure screen |

### STEADY (**IMPLEMENTED** L01–L03)

Timed defensive reaction (X / tap) during major encounters. Not combat. Results: Perfect / Partial / Missed → ~20% / ~50% / 100% of encounter damage (exact values per encounter in `STEADY_ENCOUNTERS`). First corridor cascade includes a brief non-blocking tutorial cue. Not every scare uses STEADY.

### Chapter damage budgets

**IMPLEMENTED (L01–L03 survival pass):**

| Chapter | Budget | Hits |
|---|---|---|
| 01 Corridor | 40 | Breath 10 (unavoidable) · Altered door noticed on return 12 (unavoidable, **not** inspect) · Cascade STEADY 18/9/4 |
| 02 Office | 45 | Phone 10 · Silence 12 · Latch STEADY 18/9/4 · Second anomaly **+5 reserved / disabled** until approved |
| 03 Records | 50 | Polaroid proximity 6 (not inspect panel) · Drawers 10 · Dart STEADY 20/10/4 · Peek 14 unavoidable |

**PROVISIONAL (L04–L06):** Prior budget numbers remain design targets; damage application is **gated off** (`enableLateChapterDamage: false`) until this pass expands.

### Checkpoints (**IMPLEMENTED** L01–L03)

Chapter-start snapshot + one safe mid-chapter snapshot before major STEADY threats. Restores composure, inventory (no cigarette duplication), story flags, and hit history. Retry never drops the player into an unavoidable death loop by design intent.

### Cigarettes (collectible)

**IMPLEMENTED:** Pack props in Corridor (left baseboard), Office (aisle chair), Records (receiving counter); also Night / Threshold / Unseen placements from earlier pass. Inventory label **CIGARETTES**. Temporary coping only.

Debug (`?debug=1`): presets 100/50/25/10, hit, +cig, test STEADY, force game over, retry checkpoint. Chapter jumps seed completed hit IDs.

**OPEN / PROVISIONAL:** Exact magnitudes and STEADY windows remain tunable after playtests. Writer-only backstory untouched.

---

## Recurring objects

### Worn lighter

**ESTABLISHED CANON:** Recurring identifying scratch; connection to the protagonist remains unexplained.  
**IMPLEMENTED (L02):** Desk prop, inspect-only. Copy: “A cheap lighter. One deep scratch down the side.” Not collectible.  
**OPEN / PROVISIONAL:** Later recognition / ritual associations.

### Sticky note / service code

**IMPLEMENTED (L02):** Collectible. Body/tooltip show the live randomly generated four-digit code (`Four digits in blue ink: X X X X.`). No handwriting-to-protagonist link. Consumed from inventory on successful keypad unlock. Supports the service-passage exit puzzle.

### Orange key fob

**ESTABLISHED CANON:** Plain orange plastic fob with a worn metal ring. Collectible without implying the protagonist worked here or owned it.  
**IMPLEMENTED (L02→L03):** Takeable in the Office (`key-fob`). Inspect: “Orange plastic. The metal ring is worn.” Inventory is preserved into Records. Office cannot complete / leave for Records without taking the fob (softlock prevention). In Records, the fob unlocks a wall card reader at the far exit door. The fob **remains in inventory** after use. No lore explains why it works.

### Brass key (Level 01)

**IMPLEMENTED:** Appears on return pass; takeable; unlocks the keyed door. Inspect: “A plain brass key. No label.” Consumed on successful use.

### House key

**OPEN / PROVISIONAL:** Faded/worn tag; belonging and access. Planned around Chapter 04 or 05. No inventory collection planned. Visible but uncollected in Threshold as currently designed.

### Face-down photograph

**ESTABLISHED CANON:** Hidden image must *stay hidden*.  
**IMPLEMENTED (L03 intent/build):** Present on the Records sorting surface; camera never reveals the reverse. Protagonist: “Leave it.” Proximity may set `photoPassed` without proving notice.

### White Stuffed Dragon

**ESTABLISHED CANON:** Solid white plush. Associated with comforting, accessible recollection — not “good.” Collectible. Can open a memory environment.

**IMPLEMENTED (dev prototype only):** `?debug=1&level=memory-white` — staging pickup → warm afternoon living room on a scroll rail → subtle discrepancy → unfinished thought near the hallway → exit via front door. Not in ordinary L01–L06 progression.

**OPEN / PROVISIONAL:** Final Act II placement undecided.

### Black Stuffed Dragon

**ESTABLISHED CANON:** Solid black plush. Associated with avoided or painful recollection — not “evil.” Collectible. Opens a related memory of the **same home**.

**IMPLEMENTED (dev prototype only):** `?debug=1&level=memory-black` — same living-room geometry and rail at night / rain; quieter discrepancies; one-shot door-leave sound; unfinished “I should’ve just...”; front door remains inaccessible; exit via window after a short dwell. Not in ordinary progression.

### Stuffed dragons — shared narrative direction

**ESTABLISHED CANON**

- Neither dragon represents good versus evil.
- Contrasting colors reflect different relationships with memory, not morality.
- Both memories share recognizable architecture so recognition precedes difference.
- White memory may omit uncomfortable details without being entirely false.
- Black memory is not automatically objective truth.

**Technical:** `js/props/stuffed-dragon.js` reusable prop. Shared home modules: `memory-home.js`, `memory-home-story.js`, `memory-home-route.js`. Neither dragon appears in L01–L06 story progression yet.

Objects should appear ordinary until repetition gives them emotional weight.

---

## Established emotional canon

**ESTABLISHED CANON**

- The story centers on **grief**.
- Guilt and memory suppression are secondary but interconnected themes.
- The protagonist’s loss includes both a loved person and their former shared life.
- Memories may be incomplete, selective, or contradictory.
- Memory exploration is an integral storytelling mechanic (scroll-rail recollection spaces).
- The protagonist’s guilt does **not** establish actual responsibility for any off-screen tragedy.

### Narrative restraint (formal writing principles)

1. Emotional significance comes from experience, not explanation.
2. Ordinary objects should remain believable.
3. Silence is intentional.
4. Memories may omit important context without being wholly fabricated.
5. Do not depict any absent person solely as a device for the protagonist’s suffering.
6. Avoid reducing grief to a puzzle that can be solved.
7. Never force explicit confession of relationship, accident, argument, or gift-giving in player-facing text.

**Writer-only spoiler backstory** (partner, argument, accident, dragons-as-gifts) is kept **out of this public bible**. Maintain it in a local, unpublished writer reference only (`docs/writer-only/` is gitignored). Do not put spoilers in a “private” file on a public remote.

---

## Memory environments (system)

**ESTABLISHED CANON (design principle):** Collectibles can open recollection spaces that stay on the **same scroll-rail locomotion** as the rest of *Behind.* “Fully explorable” means meaningful inspection and revisiting along a guided path — not free walking. Memory is unreliable: subtle one-way discrepancies replace jumpscares. Exit is earned through discovery, not a timer.

**IMPLEMENTED (prototype — remembered living room):**

- Shared modules: `js/levels/memory-home.js`, `memory-home-story.js`, `memory-home-route.js` (thin `memory-white*` / `memory-black*` re-exports).
- Warm modest living room: couch, blanket, coffee table with two mugs, television, bookshelf, window light, hallway to a front door.
- **White:** afternoon; soft domestic bed; “Oh...”; optional mug inspect; remote snaps from table to bookshelf bottom shelf after leaving camera view; “We used to...” near hallway; exit via front door when ready.
- **Black:** night + rain; TV off; blanket folded; one mug displaced; same rail; keys/door leave sound once; “I should’ve just...” once; door stays closed; exit via window after dwell.
- Debug: `?debug=1&level=memory-white` or `memory-black` with checkpoints `before` / `enter` / `mid` / `changed` / `hallway` / `exit`.
- No free-walk. Inventory preserved inside the prototype chapter. Not wired into main progression.

**OPEN / PROVISIONAL:** Act II insertion point; whether staging exists in-fiction or only as a test harness.

---

## Hospital reverse prototype — The Ward

**PROTOTYPE / EXPERIMENTAL** — not confirmed final story placement; not in ordinary L01–L06 progression. Current polish models **warning → escalating threat → player response → consequence** with cinematic reverse pacing; not a finalized story chapter.

**Design question:** Can reverse-movement horror carry real gameplay stakes when the player must retreat into unseen space, using sound as the primary warning system?

**IMPLEMENTED (dev only):** `?debug=1&level=hospital-reverse`

- Modules: `hospital-reverse.js`, `hospital-reverse-story.js` (`WARD_BALANCE`), `hospital-reverse-route.js`
- Abandoned hospital ward hallway on the standard scroll rail (no free-walk, no combat, no visible monster)
- Forward pass is calm; far automatic doors fail via wall OPEN button → forced retreat
- **Encounter pacing (descending progress):** squeak (~0.84) → quiet gap → clank warn/peak (~0.58/0.50) → requires `clankDone` → crying (~0.40) → side escape (~z=-12.5 / progress ≈0.33). Crying STEADY only.
- Reverse audio encounters (composure 0–100; cigarette +40; one pack per chapter):
  1. **Door creak** — CC0 sample (`assets/door-creak.mp3`); stop promptly = 0 / hesitate = 4 / ignore = 12; never repeats. Left bay at z=-27.5 snaps open into the hall offscreen after the sound (no tween).
  2. **Fast footsteps** — after creak; unnaturally quick walking behind the player (atmospheric, 0 damage, no STEADY); marks `clankDone` so crying can start
  3. **Crying** — time + position buildup (min perceptual build); continues while still; STEADY at peak; side OPEN once cry is established
  4. **Proximity** — conditional near-contact only; skipped after clean escape / perfect+retreat; otherwise graded ≤16
- **Offscreen mutations:** reverse props become *eligible* by progress, but only *reveal* when outside the camera frustum (with look margin). One-way for the run; checkpoint restore can rewind state.
- **Physical escape:** OPEN → doors slide → scroll-up (forward) office-style branch into the right-wall passage (`hospitalReverseCameraPose`) → doors close → complete. Cry muffles during the route; ambience fades after seal. No free-walk / no 180° spin.
- Audio: cry volume multiplier applied once at the master bus; HRTF rear panner when available, stereo pan fallback; delayed Ward SFX cancelled on GO / checkpoint / chapter jump. Breathing baseline remains `0.07`.
- Dev: checkpoints `start` / `before-end` / `reverse` / `squeak` / `clank` / `before-crying` / `before-escape` / `escape`; cry QUIET/REF/LOUD; `window.__wardDebug`

**OPEN / PROVISIONAL:** Whether this becomes a signature mid-game chapter, a memory space, or remains a mechanics sandbox. Encounter damage and timing remain playtest knobs.

---

## Chapter 01: The Corridor

**IMPLEMENTED** unless noted.

**Setting / mechanic:** Narrow office corridor; sealed far elevator; hidden rear elevator behind the start. Scroll up = forward, scroll down = backward; camera stays facing the corridor. Max walk ~4.0 m/s. Breathing audio volume constant is `0.07` in code (older docs said 0.065).

**First pass dialogue**

| Beat | Line |
|---|---|
| Opening corridor | “Hello?” |
| Further in | “There has to be someone here.” |
| Breathing window (~0.74+, with audio) | “Wait. What was that?” |
| Sealed far elevator | “It’s not opening.” |

Instructional UI still teaches backtracking; control text is not protagonist dialogue.

**Return dialogue**

| Beat | Line |
|---|---|
| After reverse; breathing gone | “It’s gone quiet.” |
| Near the previously closed door | “Wait — was that open before?” |
| Rear elevator opens | “Behind me?” |
| Doors begin closing | “Wait—” |

**Interact inspect copy (IMPLEMENTED)**

| Object | Text |
|---|---|
| Brass key | “A plain brass key. No label.” |
| Locked door | “Locked.” / unlocked: “It opens. I can’t see inside.” |
| Unmarked changed door | “That door was shut. I’m sure of it.” |
| Door plaque | “13-B. No name.” |
| Exit sign | “Still lit. Doesn’t tell me much.” |
| Far call panel | “The panel is dead.” |

**Events:** Breath only on first pass. Return reveals the ajar unmarked door and brass key. Rear elevator unlocks after backtrack; hallway door cascade begins on cabin entry while elevator doors are still open; cabin then seals. End card after doors close.

**Narrative intent:** Ordinary seeking → sensory doubt → memory friction at the door → involuntary reaction to the elevator behind them.

---

## Chapter 02: The Office

**Emotion (ESTABLISHED CANON):** Occupied absence; rationalizing emptiness; quiet doubt. No workplace recognition claims.

**Entry / traversal / exit (IMPLEMENTED):** Elevator veil into a wider aisle. Same scroll motion. Far Records door stays locked. Exit is the side service passage after retreat cue + keypad unlock with the sticky-note code.

### Physical anchors (IMPLEMENTED)

- Glowing monitors, cups, mundane desk clutter.
- Ringing phone, then silence after return begins.
- One chair permanently in the aisle (not a move/scare beat).
- Lighter (inspect), sticky note (take), key fob (take), wall keypad (second approach only).
- Empty glass meeting room.
- Service door opens only after correct keypad entry.

### Dialogue sequences (IMPLEMENTED)

**First approach**

| Beat | Line |
|---|---|
| Entering | *(silence)* |
| Occupied-looking desks | “It’s like everyone just left.” |
| Unattended belongings | “How long has this place been empty?” |
| Phone ringing | “Why isn’t anyone answering?” |
| Glass meeting room | *(silence)* |
| Far locked door | “Locked. Of course.” |

**Return**

| Beat | Line |
|---|---|
| Phone stops | “It stopped.” |
| Workstations | *(no extra lines; no invented moved objects)* |
| Latch cue (also sound-off accessibility) | “Was that a latch?” → “From up ahead.” |

**Investigation / second forward pass**

| Beat | Line |
|---|---|
| Start investigating | *(silence)* |
| Near service passage | “There’s a door beside the glass.” |
| Keypad | “A code.” |
| While locked | *(no repeating puzzle dialogue; UI carries “enter code”)* |
| After correct code | “Okay. Go.” |
| Entering passage / complete | *(silence)* |

**Object inspect copy (IMPLEMENTED):** lighter / sticky / fob / keypad as listed under Recurring objects. Keypad interaction remains UI-driven; door state follows `keypadUnlocked`.

**Emotional arc:** Rationalize vacancy → unanswered phone → forced retreat → auditory doubt → pragmatic code entry without lore dump.

---

## Chapter 03: The Records

**Emotion:** Grief-adjacent avoidance and involuntary recognition — the first hint that discomfort may be personal, without naming why.  
**Entry:** A side service passage near the Office meeting room. Brief occlusion handoff, not another elevator.  
**Architecture:** Lower ceiling, older filing cabinets, receiving counter, quiet sorting station, box storage, locked far exit with an ordinary wall card reader.  
**Motif — face-down Polaroid:** Rests on the sorting surface mid-floor. Camera never reveals the front; no artwork, name, or Take. Discovery via A/D look. Ambient one-shot on approach: **“A Polaroid?”** Inspect-only panel (same system as the Office lighter): title **PHOTOGRAPH**, body **“No. I won’t look. I can’t.”** Curiosity, then chosen refusal. Do not connect the Polaroid to any off-screen person in player-facing text.  
**Environmental memory:** A right-side drawer is ajar on first approach; after the camera passes, it is closed. No close animation or sound. Optional backtrack may yield **“That was open.”** Not required for progression. Separately, drawers on the last filing cabinets toward the exit ease open ahead of the player mid-hall (quiet, no dialogue, no sting). Past the sorting station, a one-shot dark blot darts across the aisle behind the last filing row (left → right, fast, no dialogue, no sting; skipped under reduced motion). Later, a head-only shadow peeks once from behind the second right-hand shelf stack and withdraws (no dialogue, no sting; skipped under reduced motion).  
**Other dialogue (one-shots):** Entering — silence. First cabinets — **“How far back does all this go?”** Approach locked exit — **“Another locked door.”** Unlock / exit — silence.  
**Exit (IMPLEMENTED):** Far door locked until the Office key fob is used on the card reader. Soft beep + latch + quiet hinge. Progress cannot complete the chapter while the door is locked. Unlock opens the path into Night Shift.  
**Audio direction:** Near-silence — faint sustained tones, sparse unresolved two-note fragments, long rests; low HVAC / thin ballast; rare distant metal settle. Duck music slightly at the Polaroid. No stings, whispers, footsteps, or crash references.

### Why Level 03 breaks the Level 01–02 return pattern

A third compulsory out-and-back journey would make backward movement feel like a formula rather than an unsettling choice. The player may continue forward after unlocking the exit, or optionally return to notice the drawer.

### Narrative discipline

Do not explain the Polaroid lines. Avoid recognizable images, names, case numbers, blood, ghost silhouettes, or reports that spell out what happened. Proximity is `photoPassed`, not proof of notice. Faded notices stay generic/unreadable. Writer-only partner backstory stays out of this bible.

## Narrative invariants

**ESTABLISHED CANON**

- Time reads 02:17 AM unless a change becomes narratively meaningful and is agreed upon.
- Camera faces forward even during retreat; shifting architecture remains plausible.
- Story state is monotonic: once a narrative event happened, moving backward does not undo it.
- Chapter 01's far elevator remains sealed; Chapter 01's rear elevator closes before Chapter 02 starts.
- Lighter's scratch should remain recognizable across chapters. Photograph contents stay unseen.
- Use silence and stillness frequently. No generic industrial horror drone at full volume.
- Do not force a fast walkthrough for the sake of the target runtime. Future chapters need richer, slower interactions and navigable spaces.
- The larger personal connection between the protagonist and the building remains unresolved. No new backstory, names, family ties, or supernatural explanations without deliberate canon revision.

## Current technical decisions

**IMPLEMENTED**

- One renderer and one camera persist across chapters.
- Scenes expose `update`, `reset`, and `dispose` and are rebuilt only when entered.
- Director updates one loaded chapter's modules and disposes them on transition.
- Debug chapter travel via `?debug=1` (and level/checkpoint query params where supported). Not a player-facing save system.
- Office: instanced static cubes; static aisle chair; hinged service door after keypad unlock; far Records doors stay shut in L02.
- Three.js fog/background reset per chapter factory.
- Do not promise actual 45–60 minute length yet; this is the current long-form target.

## Open questions for later, deliberately unresolved

- Who used the lighter and why does it matter?
- What does the photograph depict? **Never answer by showing its contents.**
- Is the building distorting memory, or revealing how memory already works?
- Does the protagonist belong here, or is familiarity the most unsettling aspect of being lost?
- When and how should the key fob unlock something in Records without confirming employment?
- What memories (if any) do the stuffed dragons unlock — and how do the two relate?

## Chapter 04: The Night Shift — Prototype 004.2 / Act II begins

**Emotion:** Loneliness and absence in a place that once held ordinary overnight life — grief suggested, never explained.  
**Entry:** The Records' already-open doorway leads into an older, more domestic overnight-staff wing. No additional elevator.  
**Visual anchors:** Warm kitchenette (cups, tea towel), break table with a pushed-out empty chair, lounge sofa, floor lamp, jacket on the coat stand, closed staff rooms beyond. The final door is open rather than locked.

**Primary event (004.2):** No following footsteps (that cadence belongs to The Ward). Past the lounge, the floor lamp dies beside the empty chair; a soft settle marks that someone was just there. Early lighting is warm/domestic; the deeper hall cools and thins. Sound-off players still get lamp / chair / hush captions.

**Dialogue (sparse):** “Someone left a cup by the sink.” / “They kept it almost like a living room.” / “The lamp is going out.” / “That chair is still warm.” / “Colder back here.” / “Just the exit light now.” Never name a person, diagnose grief, or claim a haunting.

**Pacing:** No mandatory backtrack, QTEs, jumpscares, or chase. Forward path stays open.

**Motifs:** Do not add the lighter or face-down photograph here. The house key remains available for Chapter 05.

**Production status:** First-pass emotional redesign on `staging` (004.2). Playtest before merging to `main`.

## Chapter 05: The Threshold — Prototype 005.0

**Emotion:** The first overt rupture in reality; unavoidable dread rather than shock.
**Entry:** Chapter 04's partially open final doorway. At the new chapter start a freestanding, hinged door stands in the center of an otherwise ordinary hallway. It is not connected to the side walls.
**Progression:** The door opens gently as the viewer approaches. The corridor beyond seems similar at first. Then plaster appears to split and seams distort. Farther down, membrane-like wall geometry and tendon ridges absorb normal trim and fixtures. The final stretch is drenched in red light. At every stage the recognizable *office corridor architecture* remains visible.
**Recurring motif:** The house key is visible on a ledge embedded in the red-hall architecture. The worn tag's presence remains ambiguous. It is never collected or accompanied by a factual explanation.
**Audio:** Familiar hum degrades into a low filtered pulse; no stingers, scream, or chase cue. Visual and narrative beats remain legible with sound off.
**Movement:** Forward route is always open. Backtracking is optional and shows the comparatively normal space behind. Door stays open when crossed. No required return trip. Scroll movement remains at most 4.0m/s.
**Implementation:** Single Three.js scene, one reused cube for instanced architecture, procedural organic meshes, few non-shadow-casting lights. Three corruption curves change lighting/fog/audio by scroll progress. Scene disposable on future chapter transition.
**Narrative discipline:** Avoid diagnosing the building, revealing a person's identity, or asserting a memory. The protagonist is now disturbed by what they physically see, but the personal history remains hidden.

## Chapter 06: The Unseen — Prototype 006.0 / first playable pass

**Emotion:** Fear of proximity without visible evidence. A deliberately quiet, ordinary environment after Chapter 05's organic nightmare.

**Entry:** Level 05's final corridor hands off under the existing opaque veil to a service passage lined with pipes, metal access panels, low fluorescent fixtures, an abandoned janitor trolley, and translucent plastic sheeting at its entrance.

**The turn:** The forward path ends at a sealed maintenance barrier. From somewhere ahead comes a faint, spatially located dragging/scraping sound. Nothing is rendered as the source. The protagonist retreats *while still facing the empty corridor*. The sound's perceived distance changes over time and movement, unlike Chapter 04's follower footsteps. Only tiny ambient visual reactions occur: overhead lamps lose some intensity, a cable and grate barely vibrate. Never add a monster, silhouette, stinger, or explicit diagnosis of the sound.

**The exit:** A left-side maintenance door, previously another ordinary access panel, opens once the retreat has begun. Near the door the camera turns left, then scrolling DOWN moves the player laterally through that doorway. The camera does not turn back to reveal or explain the presence. Completing the retreat ends Chapter 06; the continuation beyond it is not implemented yet.

**Narration:** Keep quiet during exploration. At the blocked end, describe an audible scrape in text, including when sound is disabled. Instruction explicitly invites backward movement. Once the player begins retreating, use silence and, briefly, “It is still moving.” At the side junction: “The maintenance door is open.”

**Mechanics:** Forward progress is capped at the solid barrier. Reaching it latches the encounter; returning the scrollbar does not reset the state. The side passage is inaccessible until that condition occurs. The side-turn camera route never exceeds the established 4.0 m/s movement cap. The scene is recyclable/disposable; audio sources are created lazily when needed and are muted on jump/reset.

**Debug testing:** `?debug=1&level=06` loads the fresh chapter. Named checkpoints can recreate state for `approach`, `retreat`, and `exit`, with URLs such as `?debug=1&level=06&checkpoint=retreat`. These are development tools only; none of them save a gameplay checkpoint.

**Status:** First functional pass. Timing, spatial audio perceived over headphones, lighting balance, the left-side door's readability, and camera choreography should all receive an in-browser playtest before Level 06 is treated as creatively locked.

### Prototype 006.1 — Level 06 Retreat Pass (2026-10-25)

Environmental horror operates in descending backward-scroll beats: first taps, a right-hand electrical cabinet opening, irregular scraping migrating between walls, ceiling vibration, an advancing blackout, near-absolute silence, and an impossible final click close to the protagonist. The presence is never shown. Player speed modulates scratching; stopping invites one small tap. All changes remain one-way after triggering, not reversible by scrubbing. Developer jump checkpoints preserve each staged state and never play historical sounds.

---

## Chapter restructuring review (planning only — not applied)

**OPEN / PROVISIONAL.** Existing chapters stay in the build until creative decisions land.

| Chapter | Narrative purpose | Unique mechanic | Emotional contribution | Provisional recommendation |
|---|---|---|---|---|
| 01 Corridor | Orientation; first sensory doubt; “behind you” reveal | Scroll corridor + return changes + rear elevator seal / hall cascade | Vulnerability, spatial dread | **Retain** as Act I opener; keep sparse dialogue. |
| 02 Office | Occupied absence; rationalizing emptiness; first inventory puzzles | Phone + keypad code exit; collectibles | Unease without recognition claims | **Retain**; may later feed Act II memory setup after Records. |
| 03 Records | Avoidance; photograph as unreadable personal pressure | Optional backtrack; “Leave it.” | Intimacy without disclosure | **Retain**; candidate beat *before* white-dragon memory (Act II). Fob unlock still missing. |
| 04 Night Shift | Unseen companion suggestion | Pace-following footsteps | Paranoia without proof | **Condense or redesign** if Act II memories carry companion themes; else keep as palate cleanser. |
| 05 Threshold | Overt reality rupture | Progressive corridor corruption; uncollected house key | Dread from visible wrongness | **Retain** late-game; ensure it doesn’t undercut quieter memory horror. |
| 06 Unseen | Proximity fear; forced retreat | Barrier + spatial scrape + side exit | Panic with empty evidence | **Retain / polish**; evaluate whether it should follow Threshold or a memory beat. |

Do not delete or reorder chapters in code based on this table alone.

---

## Narrative revision history

| Date | Change |
|---|---|
| 2026-10 | Prototype 003.0 office / records construction notes; later Night / Threshold / Unseen passes. |
| 2026-11 | **Dialogue Revision 001** for Levels 01–02; story bible sync; key fob collectible; stuffed dragons planned. |
| 2026-11 | **Memory Environments:** white-dragon bedroom prototype (dev-only); unreliable-memory principle; restructuring review table added. |
| 2026-11 | **Memory Level Narrative Overhaul:** shared remembered living room (white afternoon / black night); grief-centered emotional canon; writer-only spoilers kept out of public bible; rail locomotion preserved; black memory prototype built. |
| 2026-11 | **Records revision:** Polaroid two-beat dialogue; sparse near-silence score; key-fob card-reader exit; Office softlock prevention (fob required to leave). |
| 2026-11 | **Records polish:** Polaroid becomes inspect-only (refusal in panel); ambient “A Polaroid?” retained; exit door rebuilt as framed leaf; aisle drawers timed later. |
| 2026-11 | **Composure prototype:** Quiet composure meter (0–100); stress from uncanny beats; cigarettes (CONSUMABLE · COMPOSURE, restore 25) hidden in Corridor / Office / Records. No fail state — empty composure only thickens fog/vignette/audio. |
| 2026-11 | **Composure Survival Balance Pass:** Max/start 100; cigarette restore 40; one pack→one cig per chapter (all six mains); persist unused cigs; block use at full; chapter damage budgets + one-shot story flags; Overwhelmed soft retry; debug presets; no time/movement drain. |
| 2026-11 | **Psychological Survival System v2 (L01–L03):** Stages; STEADY (cascade/latch/dart); game over at 0; checkpoints; cig restore 40; L04–L06 damage gated; office +5 anomaly reserved/disabled. |
