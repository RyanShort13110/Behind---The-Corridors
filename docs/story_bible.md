# BEHIND. — Living Story Bible

**Status:** Working draft / synchronized with playable Levels 01–02, November 2026  
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

## Recurring objects

### Worn lighter

**ESTABLISHED CANON:** Recurring identifying scratch; connection to the protagonist remains unexplained.  
**IMPLEMENTED (L02):** Desk prop, inspect-only. Copy: “A cheap lighter. One deep scratch down the side.” Not collectible.  
**OPEN / PROVISIONAL:** Later recognition / ritual associations.

### Sticky note / service code

**IMPLEMENTED (L02):** Collectible. Body/tooltip show the live randomly generated four-digit code (`Four digits in blue ink: X X X X.`). No handwriting-to-protagonist link. Consumed from inventory on successful keypad unlock. Supports the service-passage exit puzzle.

### Orange key fob

**ESTABLISHED CANON (intent):** Plain orange plastic fob with a worn metal ring. Collectible without implying the protagonist worked here or owned it. Intended for unlocking a door in the following room (Records).  
**IMPLEMENTED (L02):** Takeable into inventory (`key-fob`). Inspect: “Orange plastic. The metal ring is worn.” Sets `memory.keyFobEncountered` / `keyFobInspected`. Inventory is **not** cleared on the Office → Records transition in the current `enterRecords` path.  
**OPEN / PROVISIONAL / gap:** Records currently has **no** fob use-target or locked door unlock. Pickup exists; door-unlocking behavior is **not** implemented yet. Do not document consumption or unlock state as live mechanics until wired.

### Brass key (Level 01)

**IMPLEMENTED:** Appears on return pass; takeable; unlocks the keyed door. Inspect: “A plain brass key. No label.” Consumed on successful use.

### House key

**OPEN / PROVISIONAL:** Faded/worn tag; belonging and access. Planned around Chapter 04 or 05. No inventory collection planned. Visible but uncollected in Threshold as currently designed.

### Face-down photograph

**ESTABLISHED CANON:** Hidden image must *stay hidden*.  
**IMPLEMENTED (L03 intent/build):** Present on the Records sorting surface; camera never reveals the reverse. Protagonist: “Leave it.” Proximity may set `photoPassed` without proving notice.

### White Stuffed Dragon

**OPEN / PROVISIONAL — PLANNED:** Not yet introduced. Solid white collectible.

- **Proposed symbolism (provisional, not confirmed canon):** Conscious memory, recollection, emotional familiarity.
- **Intended effect:** Trigger a fragment of memory in the protagonist.
- Ownership, discovery location, exact significance, and the memory content remain undecided.

### Black Stuffed Dragon

**OPEN / PROVISIONAL — PLANNED:** Not yet introduced. Solid black collectible.

- **Proposed symbolism (provisional, not confirmed canon):** Deliberately suppressed or avoided memory.
- **Intended effect:** Trigger an emotional or psychological response tied to something the protagonist does not want to remember.
- Ownership, discovery location, exact significance, and the associated memory remain undecided.

### Stuffed dragons — shared narrative direction

**OPEN / PROVISIONAL**

- Neither dragon inherently represents good or evil.
- Contrasting colors reflect different relationships with memory, not morality.
- Their memories may eventually connect, contrast, or contradict each other.
- Do not invent ownership, backstory, or concrete memory content until developed.
- Possible techniques (not canon): fragmented recollection, sudden unexplained emotion, memories that seem unrelated at first, subtle links between the two objects.

**Technical (IMPLEMENTED separately from narrative placement):** `js/props/stuffed-dragon.js` provides a reusable low-poly prop (white/black color variants), inventory preview drawing, and take SFX hooks. Inventory UI can render `stuffed-dragon*` previews. Dragons are **not** placed in any current playable level (preview placement was removed from Level 01).

Objects should appear ordinary until repetition gives them emotional weight.

---

## Chapter 01: The Corridor

**IMPLEMENTED** unless noted.

**Setting / mechanic:** Narrow office corridor; sealed far elevator; hidden rear elevator behind the start. Scroll up = forward, scroll down = backward; camera stays facing the corridor. Max walk ~5.5 m/s. Breathing audio volume constant is `0.07` in code (older docs said 0.065).

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

## Chapter 03: The Records — first playable construction pass

**Emotion:** Avoidance, something unspoken, and the first brief moment in which the protagonist seems to know more than the player.  
**Entry:** A side service passage near the Office meeting room. The handoff uses a brief occlusion, NOT another elevator.  
**Architecture:** Lower ceiling, older cabinets with repeating file drawers, receiving counter, a quiet sorting station, box storage, and an already-open passage onward.  
**Motif:** The face-down photograph rests on the sorting surface around the middle of the level. The camera never turns to see its contents, and no front artwork is created or loaded. The protagonist thinks only: **“Leave it.”**  
**Environmental memory:** A right-side drawer is visibly ajar on the first pass. After the player passes it, it settles shut out of view. Backtracking may reveal the discrepancy, but is not required.  
**Exit:** A partially open doorway into another administrative space.

### Why Level 03 breaks the Level 01–02 return pattern

A third compulsory out-and-back journey would make backward movement feel like a formula rather than an unsettling choice. In this chapter, the player can leave by continuing forward, or return to investigate details. The architecture remembers either way.

### Narrative discipline

Do not explain why the protagonist says “Leave it.” Avoid showing a recognizable image, a name, a case number, blood, ghost silhouettes, or a diagnostic report that spells out what happened. Proximity to the photograph is recorded as `photoPassed`, not as proof it was noticed. The faded notices and index labels remain generic/unreadable.

### Verified gap vs L02 inventory

**OPEN / PROVISIONAL:** Key fob is intended to unlock a door here. **Not implemented** in Records yet (no interactable `requiresItem: 'key-fob'`). Document intent separately from build state.

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

## Chapter 04: The Night Shift — Prototype 004.1 / Act II begins

**Emotion:** The possibility of an unseen companion; unsettled recognition without proof.  
**Entry:** The Records' already-open doorway leads into an older, more domestic overnight-staff wing. No additional elevator.  
**Visual anchors:** Kitchenette and lone cup by the sink, break table, a worn lounge sofa, a lit floor lamp, and a passage of closed staff rooms. The final door is open rather than locked.

**Primary event:** Soft, muted footsteps begin around the lounge and seem to keep pace with the visitor. They follow movement but do not loop while the player is stationary; one extra step may sound shortly after the visitor stops. The footsteps fall silent permanently near the final doorway. Sound-off players receive the initial cue and the later silence cue in captions. Two corridor fixtures behind the camera dim and stay dim. Nothing human is ever shown.

**Dialogue:** “Footsteps. Behind me.” / “The footsteps have stopped.” The text never declares that a spirit is following the protagonist. The protagonist does not name a person or explain the cause.

**Pacing:** No mandatory backtrack. The player may retreat to inspect the extinguished fixtures, but can continue forward. Leave periods of silence before and after the event.

**Motifs:** Do not add the lighter or face-down photograph here; their repetition is stronger if it has breathing room. The house key remains available for Chapter 05.

**Production status:** First procedural implementation, not a narrative lock. No claims of a 45–60 minute playtime until real playtests establish it.

## Chapter 05: The Threshold — Prototype 005.0

**Emotion:** The first overt rupture in reality; unavoidable dread rather than shock.
**Entry:** Chapter 04's partially open final doorway. At the new chapter start a freestanding, hinged door stands in the center of an otherwise ordinary hallway. It is not connected to the side walls.
**Progression:** The door opens gently as the viewer approaches. The corridor beyond seems similar at first. Then plaster appears to split and seams distort. Farther down, membrane-like wall geometry and tendon ridges absorb normal trim and fixtures. The final stretch is drenched in red light. At every stage the recognizable *office corridor architecture* remains visible.
**Recurring motif:** The house key is visible on a ledge embedded in the red-hall architecture. The worn tag's presence remains ambiguous. It is never collected or accompanied by a factual explanation.
**Audio:** Familiar hum degrades into a low filtered pulse; no stingers, scream, or chase cue. Visual and narrative beats remain legible with sound off.
**Movement:** Forward route is always open. Backtracking is optional and shows the comparatively normal space behind. Door stays open when crossed. No required return trip. Scroll movement remains at most 5.5m/s.
**Implementation:** Single Three.js scene, one reused cube for instanced architecture, procedural organic meshes, few non-shadow-casting lights. Three corruption curves change lighting/fog/audio by scroll progress. Scene disposable on future chapter transition.
**Narrative discipline:** Avoid diagnosing the building, revealing a person's identity, or asserting a memory. The protagonist is now disturbed by what they physically see, but the personal history remains hidden.

## Chapter 06: The Unseen — Prototype 006.0 / first playable pass

**Emotion:** Fear of proximity without visible evidence. A deliberately quiet, ordinary environment after Chapter 05's organic nightmare.

**Entry:** Level 05's final corridor hands off under the existing opaque veil to a service passage lined with pipes, metal access panels, low fluorescent fixtures, an abandoned janitor trolley, and translucent plastic sheeting at its entrance.

**The turn:** The forward path ends at a sealed maintenance barrier. From somewhere ahead comes a faint, spatially located dragging/scraping sound. Nothing is rendered as the source. The protagonist retreats *while still facing the empty corridor*. The sound's perceived distance changes over time and movement, unlike Chapter 04's follower footsteps. Only tiny ambient visual reactions occur: overhead lamps lose some intensity, a cable and grate barely vibrate. Never add a monster, silhouette, stinger, or explicit diagnosis of the sound.

**The exit:** A left-side maintenance door, previously another ordinary access panel, opens once the retreat has begun. Near the door the camera turns left, then scrolling DOWN moves the player laterally through that doorway. The camera does not turn back to reveal or explain the presence. Completing the retreat ends Chapter 06; the continuation beyond it is not implemented yet.

**Narration:** Keep quiet during exploration. At the blocked end, describe an audible scrape in text, including when sound is disabled. Instruction explicitly invites backward movement. Once the player begins retreating, use silence and, briefly, “It is still moving.” At the side junction: “The maintenance door is open.”

**Mechanics:** Forward progress is capped at the solid barrier. Reaching it latches the encounter; returning the scrollbar does not reset the state. The side passage is inaccessible until that condition occurs. The side-turn camera route never exceeds the established 5.5 m/s movement cap. The scene is recyclable/disposable; audio sources are created lazily when needed and are muted on jump/reset.

**Debug testing:** `?debug=1&level=06` loads the fresh chapter. Named checkpoints can recreate state for `approach`, `retreat`, and `exit`, with URLs such as `?debug=1&level=06&checkpoint=retreat`. These are development tools only; none of them save a gameplay checkpoint.

**Status:** First functional pass. Timing, spatial audio perceived over headphones, lighting balance, the left-side door's readability, and camera choreography should all receive an in-browser playtest before Level 06 is treated as creatively locked.

### Prototype 006.1 — Level 06 Retreat Pass (2026-10-25)

Environmental horror operates in descending backward-scroll beats: first taps, a right-hand electrical cabinet opening, irregular scraping migrating between walls, ceiling vibration, an advancing blackout, near-absolute silence, and an impossible final click close to the protagonist. The presence is never shown. Player speed modulates scratching; stopping invites one small tap. All changes remain one-way after triggering, not reversible by scrubbing. Developer jump checkpoints preserve each staged state and never play historical sounds.

---

## Narrative revision history

| Date | Change |
|---|---|
| 2026-10 | Prototype 003.0 office / records construction notes; later Night / Threshold / Unseen passes. |
| 2026-11 | **Dialogue Revision 001** for Levels 01–02: sparse internal monologue; L02 keypad exit + collectibles; story bible synchronized to build. Chair move beat removed from canon. Key fob collectible documented; Records unlock still pending implementation. Stuffed dragons added as planned unresolved objects. |
