# BEHIND. — Living Story Bible

**Status:** Working draft / Prototype 003.0, 24 October 2026  
**Genre:** Interactive first-person psychological horror web film  
**Target:** Approximately 10 chapters, 45–60+ minutes in its eventual complete form  
**Creative rule:** *The building doesn't chase you. It waits for you to look away.*

## The creative promise

The player may notice an emotional connection before the protagonist can put it into words. The experience should never resolve every ambiguity for them. Early chapters are grounded in missing people, mundane belongings, and discrepancies that could almost be explained away. The building is not presented as a character with dialogue or a collection of supernatural puzzles.

**No jumpscares or overt creatures in Chapters 01–03.** Avoid prophetic warnings, sinister computer messages, blood, sudden faces, or overexplained memory sequences. Let lighting, location, sound, and changed objects do the work.

## Story structure (provisional)

| Act | Chapters | Narrative function | Key restriction |
|---|---|---|---|
| I: The Arrival | 01–03 | Orientation, anxiety, first recognition | No overt monsters or jumpscares |
| II: The Familiar | 04–07 | Personal resonance, contradictory recollection | Never convert themes into literal puzzle answers |
| III: What Remains | 08–10 | Emotional consequences, difficult recognition, aftermath | No tidy explanatory twist or exposition dump |

The specific number of floors and chapter names can change if pacing requires it. Do not build to a chapter count at the expense of silence and natural discovery.

## Established recurring objects

1. **Worn metal lighter:** Identifiable scratch; begins as a believable personal belonging. It has associations with ritual, closeness, memory, and unfinished moments. FIRST VISIBLE in Chapter 02, uncollected. Do not explain ownership yet.
2. **House key:** Faded/worn tag; belonging and access. FIRST APPEARANCE PLANNED around Chapter 04 or 05. No inventory collection planned.
3. **Face-down photograph:** Hidden image must *stay hidden*. FIRST APPEARANCE PLANNED in Chapter 03. Use sparingly, never reveal the reverse side casually or in promotional art.

The objects should appear ordinary until repetition gives them emotional weight. They are not game objectives.

## Existing Chapter 01: The Corridor

- Setting: narrow office corridor, sealed elevator at far end, hidden elevator behind the initial start point.
- Mechanic: scroll up = forward, scroll down = backward, camera keeps facing toward the corridor.
- The initial far elevator refuses to open. Return reveals quiet changes and a newly open side door.
- Breath behind an office door plays only on first pass; silent on return.
- A hidden rear elevator opens after backtracking and closes in front of the retreating camera.
- Canonical implementation baseline: Prototype 001.8.
- Maximum forward/backward camera speed: 5.5 m/s; breathing gain: 0.065.

## Chapter 02: The Office — first playable construction pass

**Emotion:** Occupied absence, anxiety, recognition without explanation.  
**Entry:** After the Chapter 01 elevator has shut, the screen darkens for an ordinary elevator transition. Doors appear open on a wider office floor. No obvious teleport or impossible camera movement is shown.  
**Traversal:** Same scroll motion and fixed-forward camera through a central aisle; more open architecture around it.  
**Exit:** A side service passage beside the meeting room, discovered after a subtle latch sound on a *partial* retreat. The far Records door remains locked.

### Physical anchors

- Desks with unattended computers; some screens still glowing.
- Coffee cups and mundane, inconsistent desk arrangements.
- One handset ringing beyond a partition, then silent after the return begins.
- One chair initially pulled out, later tucked back under its desk.
- One scratched lighter on a desk. Its appearance is unmistakably mundane. It never moves or prompts collection.
- Glass-walled meeting room, empty and without an apparition.
- An ordinary Records door at the far end, which remains locked. A pre-existing, unremarkable service door beside the meeting room opens after a quiet metal latch releases.

### Order of discovery

1. Doors open. The office lights and monitors are still on.
2. The protagonist notices ordinary signs of recent occupancy, no explanation.
3. A faint phone rings. The scratched lighter is visible on a desk.
4. The far Records door refuses to open. The player backs down the office aisle.
5. The telephone has stopped. The previously displaced chair is now tucked beneath its desk; the protagonist comments only on the return.
6. Around the mid-office lighter station, a quiet metallic latch clicks from farther ahead and to the right. Sound-off players receive a matching text cue. The player is *invited*, never forced, to scroll up and investigate.
7. Approaching the glass meeting room again, the camera follows a slight rightward turn into a pre-existing service passage. This bypasses the original locked door and connects to Level 03. No full-length return to the elevator and no third pass to the far end.

### Caption discipline

First approach: observational, no flashbacks.  
Return: uncertainty grounded in an audible change.  
Second approach: simple recognition of the objects still present or no longer as they were.  
No caption claiming the protagonist definitely worked there. The phrase “I know that mark” is reserved for a later chapter if it still feels earned.

### Emotional subtext

The protagonist is distressed by the possibility of remembering incorrectly. The player may infer more than the spoken text reveals. The lighter is left unexplained intentionally.

## Chapter 03: The Records — first playable construction pass

**Emotion:** Avoidance, something unspoken, and the first brief moment in which the protagonist seems to know more than the player.  
**Entry:** A side service passage near the Office meeting room. The handoff uses a brief occlusion, NOT another elevator.  
**Architecture:** Lower ceiling, older cabinets with repeating file drawers, receiving counter, a quiet sorting station, box storage, and an already-open passage onward.  
**Motif:** The face-down photograph rests on the sorting surface around the middle of the level. The camera never turns to see its contents, and no front artwork is created or loaded. The protagonist thinks only: **“Leave it.”**  
**Environmental memory:** A right-side drawer is visibly ajar on the first pass. After the player passes it, it settles shut out of view. Backtracking may reveal the discrepancy, but is not required.  
**Exit:** A partially open doorway into another administrative space. Prototype 003.0 ends here; Chapter 04 is not implemented.

### Why Level 03 breaks the Level 01–02 return pattern

A third compulsory out-and-back journey would make backward movement feel like a formula rather than an unsettling choice. In this chapter, the player can leave by continuing forward, or return to investigate details. The architecture remembers either way.

### Narrative discipline

Do not explain why the protagonist says “Leave it.” Avoid showing a recognizable image, a name, a case number, blood, ghost silhouettes, or a diagnostic report that spells out what happened. Proximity to the photograph is recorded as `photoPassed`, not as proof it was noticed. The faded notices and index labels remain generic/unreadable.

## Narrative invariants

- Time reads 02:17 AM unless the change becomes narratively meaningful and is agreed upon.
- Camera faces forward even during retreat; shifting architecture remains plausible.
- Story state is monotonic: once a narrative event happened, moving backward does not undo it.
- Chapter 01's far elevator remains sealed; Chapter 01's rear elevator closes before Chapter 02 starts.
- Lighter's scratch should remain recognizable across chapters. Photograph contents stay unseen.
- Use silence and stillness frequently. No generic industrial horror drone at full volume.
- Do not force a fast walkthrough for the sake of the target runtime. Future chapters need richer, slower interactions and navigable spaces.

## Current technical decisions

- One renderer and one camera persist across chapters.
- Scenes expose `update`, `reset`, and `dispose` and are rebuilt only when entered.
- Current director updates one loaded chapter's modules and disposes them on transition.
- No localStorage, checkpoint restore, or deep-link chapter selection in Prototype 002.0; add after chapter handoff is verified.
- Static office cubes share a box geometry and are instanced by material. The displaced chair and hinged side-service door have independent groups. The far Records doors stay shut.
- Three.js fog/background are reset by each chapter scene factory.
- Do not promise actual 45–60 minute length yet; this is the current long-form target.

## Open questions for later, deliberately unresolved

- Who used the lighter and why does it matter?
- What does the photograph depict? **Never answer by showing its contents.**
- Is the building distorting memory, or revealing how memory already works?
- Does the protagonist belong here, or is familiarity the most unsettling aspect of being lost?
- How should Chapter 03 end without another elevator repetition?

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
