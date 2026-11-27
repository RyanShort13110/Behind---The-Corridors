# BEHIND. — Living Story Bible

**Status:** Working draft / synchronized with playable Chapters 01–07 (Corridor → Unseen), November 2026. Stairwells is Chapter 05 between Night Shift and Threshold. Records exit requires the Office key fob (consumed on use). Narrative direction updated November 2026 (grief of separation; outside-world motif; player discovery may precede protagonist recognition — private facts stay in `docs/writer-only/`).  
**Genre:** Interactive first-person psychological horror web film  
**Target:** Approximately 10 chapters, 45–60+ minutes in its eventual complete form  
**Creative rule:** *The building doesn't chase you. It waits for you to look away.*  
**Storytelling philosophy:** *Let the player discover the truth. Never explain something they are capable of understanding themselves.*

### Status labels (use throughout)

| Label | Meaning |
|---|---|
| **ESTABLISHED CANON** | Deliberate, accepted story decisions. Treat as locked unless consciously revised. |
| **IMPLEMENTED** | Mechanics, events, and dialogue verified in the current build. |
| **OPEN / PROVISIONAL** | Ideas or intentions not finalized; do not treat as lore. |

## The creative promise

**ESTABLISHED CANON**

The player may notice an emotional connection — and, later, pattern-level meaning — **before** the protagonist can put it into words. **The player is allowed to understand what is happening before the protagonist does.** Do not confirm a player's private theory through protagonist dialogue, cinematic reveals, explanatory subtitles, or forced recognition beats. Trust the audience; some will connect the pattern early, others much later — both outcomes are intentional.

The experience should never resolve every ambiguity for them. Early chapters are grounded in missing people, mundane belongings, and discrepancies that could almost be explained away. The building is not presented as a character with dialogue or a collection of supernatural puzzles.

The goal is not only fear. Leave the player with **profound absence and loss** — the devastation of a reality or relationship that felt completely real. Horror systems, creatures, impossible geometry, and environmental wrongness remain; the game must still frighten someone who never grasps any deeper explanation.

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

Ordinary story chapters have **no story combat encounters**, no free walking, and no automatic drain from time, ordinary movement, inspecting collectibles, solving puzzles, or re-crossing the same trigger. A **debug-only** turn-based combat prototype exists for systems testing (`?debug=1` → TEST COMBAT); it does not advance or rewrite story progress.

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

### STEADY (**IMPLEMENTED** major encounters)

Timed defensive reaction (X / tap) during major impossible events. Not combat. Results: Perfect / Partial / Missed → scaled damage from `STEADY_ENCOUNTERS`. First corridor cascade includes a brief non-blocking tutorial cue. Atmospheric oddities (phone ring, lights, photo proximity) do **not** open STEADY and deal 0 composure.

### Chapter damage budgets

**IMPLEMENTED (L01–L03 survival pass):**

| Chapter | Budget | Hits |
|---|---|---|
| 01 Corridor | ~22 | Breath 0 · Altered door noticed on return **4** (unavoidable, **not** inspect) · Cascade STEADY 18/9/4 |
| 02 Office | ~18 | Phone / silence **0** · Latch audio only (no QTE) · Empty-seat STEADY 18/9/4 at ~0.66 second approach |
| 03 Records | ~24 | Polaroid / drawers **0** · Dart STEADY 20/10/4 · Peek **4** unavoidable |
| 04 Night | 0 | Emotional lull — lamp / chair / hush never tax composure |
| 05 Stairwells | 0 | Descent / void / snap — atmospheric; no composure tax in current build |
| 06 Threshold | ~18 | Rupture STEADY 18/9/4 at ~0.605 (organic contraction); other provisional hits retired |
| 07 Unseen | ~22 | Blackout STEADY 22/11/4 at darkness (~0.43 retreat); other provisional hits retired |

**PROVISIONAL (L04–L07):** Prior budget numbers remain design targets; late-chapter damage application remains **gated off** (`enableLateChapterDamage: false`) until this pass expands.

### Checkpoints (**IMPLEMENTED** L01–L03)

Chapter-start snapshot + one safe mid-chapter snapshot before major STEADY threats. Restores composure, inventory (no cigarette duplication), story flags, and hit history. Retry never drops the player into an unavoidable death loop by design intent.

### Cigarettes (collectible)

**IMPLEMENTED:** Pack props in Corridor (left baseboard), Office (aisle chair), Records (receiving counter); also Night / Stairwells / Threshold / Unseen placements from earlier pass. Inventory label **CIGARETTES**. Temporary coping only.

Debug (`?debug=1`): presets 100/50/25/10, hit, +cig, test STEADY, force game over, retry checkpoint, **TEST COMBAT**. Chapter jumps seed completed hit IDs.

**OPEN / PROVISIONAL:** Exact magnitudes and STEADY windows remain tunable after playtests. Writer-only backstory untouched.

### Inventory interface (**IMPLEMENTED** v0.3)

Full-screen inventory (`I`, on-screen **INVENTORY**, or touch control). Categories: WEAPONS · CONSUMABLES · EQUIPMENT · KEY ITEMS · MEMENTOS. Opens as a modal over exploration (movement / interact paused); blocked during STEADY, VHS playback, game-over, combat, and other modals. Shared item catalog in `js/items/catalog.js`. No inventory capacity limit yet.

### Weapons & equipment (**IMPLEMENTED** foundation)

| Item | Where | Notes |
|---|---|---|
| Rusted crowbar | Records (leaning on right filing cabinets) | Permanent melee · blunt · ~23 · stagger-ready tags |
| Worn machete | Reserved — Unseen (not placed yet) | Permanent melee · slash · ~29 · anti-organic tags |
| Old revolver | Debug only (not in story yet) | Ballistic · ~42 · 6-round cylinder + reserve |
| Revolver rounds | Debug only | Reserve ammunition; no chapter placement yet |
| Unarmed | — | Default ATTACK 18 when nothing equipped |

Equipping / unequipping is free in exploration (mid-combat switching deferred). Debug combat uses an **isolated** loadout and must not overwrite story inventory. Exit from arena debug combat restores via chapter jump (known limitation).

Combat commands remain ATTACK / OBSERVE / GUARD / ITEM. ITEM opens a selector (cigarettes; RELOAD when a firearm is equipped). Cancel costs no turn. OBSERVE Opening ~+18 for melee/unarmed; revolver uses a reduced +8 Opening bonus. Fire remains a reserved damage type for future use — the emergency flare was retired.

### Chapter 04 — THE BENT (mandatory story combat)

**IMPLEMENTED (Combat Relocation 005).** Late in Night Shift — after the lounge lamp/chair beat and cold hall (~62%) — **THE BENT** becomes noticeable (~82%) and blocks the rail at ~86%. The player must win the turn-based encounter to continue. Uses **real inventory and composure** (no free weapons or smokes). Pre-fight checkpoint enables RETRY without replaying the lounge. Victory leaves the hallway clear; reverse scroll never respawns the figure. Debug bypass: `?debug=1&nocombat=1` or DEV TOOLS → **DISABLE NIGHT COMBAT**. Jump: **JUMP TO BENT** / `?debug=1&level=night&combat=1`. Standalone arena **TEST COMBAT** remains available.

### Chapter 06 — The Threshold (combat-free)

Threshold is environmental horror only: freestanding door, organic corruption, rupture STEADY, outside dialogue, key, nightmare restoration. **No combat.** The Unseen stays a retreat sequence with no combat.

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
**IMPLEMENTED (L02→L03):** Takeable in the Office (`key-fob`). Inspect: “Orange plastic. The metal ring is worn.” Inventory is preserved into Records. Office cannot complete / leave for Records without taking the fob (softlock prevention). In Records, the fob unlocks a wall card reader at the far exit door and is **consumed on use**. No lore explains why it works.

### Brass key (Level 01)

**IMPLEMENTED:** Appears on return pass; takeable; unlocks the keyed door. Inspect: “A plain brass key. No label.” Consumed on successful use.

### House key

**OPEN / PROVISIONAL:** Faded/worn tag; belonging and access. Planned around mid Act II. No inventory collection planned. Visible but uncollected in Threshold (Chapter 06) as currently designed.

### Face-down photograph

**ESTABLISHED CANON:** Hidden image must *stay hidden*.  
**IMPLEMENTED (L03 intent/build):** Present on the Records sorting surface; camera never reveals the reverse. Protagonist: “Leave it.” Proximity may set `photoPassed` without proving notice.

### White Stuffed Dragon

**ESTABLISHED CANON:** Solid white plush. Associated with comforting, accessible recollection — not “good.” Collectible. Can open a memory environment.

**IMPLEMENTED (dev prototype only):** `?debug=1&level=memory-white` — staging pickup → warm afternoon living room on a scroll rail → subtle discrepancy → unfinished thought near the hallway → exit via front door. Not in ordinary L01–L07 progression.

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

**Technical:** `js/props/stuffed-dragon.js` reusable prop. Shared home modules: `memory-home.js`, `memory-home-story.js`, `memory-home-route.js`. Neither dragon appears in L01–L07 story progression yet.

Objects should appear ordinary until repetition gives them emotional weight.

---

## Established emotional canon

**ESTABLISHED CANON**

- The story centers on **grief** — not as a solved mystery, but as lived absence.
- The dominant grief is **separation**: two people cut off from each other, each experiencing the other's absence. Longing, confusion, and unreliable memory matter as much as fear.
- Guilt and memory suppression remain secondary but interconnected themes.
- The protagonist may feel they have permanently lost a loved person and a shared life; **do not yet force that belief into explicit player-facing exposition**, and do not confirm or deny it in public copy.
- Memories may be incomplete, selective, or contradictory.
- Memory exploration is an integral storytelling mechanic (scroll-rail recollection spaces).
- White / black stuffed dragons, the remembered apartment, ordinary personal objects, and the contrast between comforting and painful recollection remain significant — do not reinterpret every object as a literal clue to a single off-screen explanation.
- The protagonist’s guilt does **not** establish actual responsibility for any off-screen tragedy.
- Psychological horror, creatures, unsettling geometry, and environmental storytelling remain valid even if a player never forms a deeper theory.

### Narrative restraint (formal writing principles)

1. Emotional significance comes from experience, not explanation.
2. Ordinary objects should remain believable.
3. Silence is intentional.
4. Memories may omit important context without being wholly fabricated.
5. Do not depict any absent person solely as a device for the protagonist’s suffering.
6. Avoid reducing grief to a puzzle that can be solved.
7. Never force explicit confession of relationship, accident, argument, or gift-giving in player-facing text.
8. **Player discovery may precede protagonist recognition.** Do not hand-hold, confirm, or make the protagonist voice the player's theory.
9. Prefer narrative ambiguity over tidy reveal. Never explain what the player is capable of understanding themselves.

**Writer-only spoiler backstory** (partner status, accident circumstances, dragons-as-gifts, and any private explanation of outside-world messages) is kept **out of this public bible**. Maintain it in a local, unpublished writer reference only (`docs/writer-only/` is gitignored). Do not put spoilers in a “private” file on a public remote.

---

## Outside-world intrusions

**ESTABLISHED CANON (presentation rules)**

Occasionally, short messages appear inside the game environment that feel out of place — ordinary text in ordinary materials, in locations where they do not quite belong. Separately, fragments of another person's speech may reach the player as **narrative dialogue** (same `#line` UI). Their language is compassionate and concerned: expressions of care, exhaustion, and hope — never threats, supernatural warnings, or instructions from the building. To the player they should remain ambiguous at first: easy to overlook, easy to rationalize, never explained by the protagonist.

### Two dialogue presentation styles (**IMPLEMENTED**)

| Source | Typography | Behavior |
|---|---|---|
| **Protagonist** (default) | Existing roman narrative text | Unchanged colors, size, placement; brief one-shots in early chapters as before |
| **Outside** | Same family / color / size / placement; **`font-style: italic`** on `#line` only | Timed one-shot conversations; slightly gentler fade; no speaker name, label, icon, portrait, or extra quotation marks |

Unspecified dialogue defaults to **protagonist**. Do not italicize `#chapter` or the whole `#narrative` container. Never identify the outside speaker in player-facing UI.

**Intended recognition (without confirmation):** By the time a player reaches **“Please wake up.”** (Stairwells), they may suddenly reconsider earlier notes. That suspicion is welcome. **Do not confirm it** — no protagonist dialogue about the messages, no cinematic revelation, no explanatory subtitle, no forced recognition beat. **No intelligible outside-world conversation dialogue before that environmental message.**

**Rules**

- **Every outside-world message / conversation must originate as a believable fragment of something someone might actually say to an unconscious loved one. The environmental placement (or dialogue timing) comes afterward.**
- Environmental notes appear in mundane, inappropriate locations (a desk sticky, a break-room board, institutional wall writing, etc.).
- Conversation fragments talk about ordinary life (weather, familiar animals, daily routines) before loneliness becomes harder to conceal.
- Emotional progression for the conversation pass: **ordinary → familiar → quietly lonely → painfully intimate → a promise to return.**
- Dialogue should become **more emotionally intimate without becoming more explanatory.**
- Compassionate / concerned tone only — no threats, riddles, or building-as-speaker voice.
- Meaning stays ambiguous in player-facing text; do not explicitly spell out a final explanation.
- Low frequency — each discovery should feel significant. Avoid excessive repetition as the motif continues.
- Later lines (when authorized) should grow **more emotionally personal**, not more overtly frightening.
- The protagonist does not deliver explanatory dialogue about them and does not answer them.
- Never required as puzzle clues or for progression; no composure / STEADY / stingers tied to them.
- Reinforce the grief / absence / fragile-connection narrative; do **not** replace it or the rest of the horror design.

**IMPLEMENTED — environmental writing**

| Chapter | Placement | Text | Presentation |
|---|---|---|---|
| 02 — Office | Yellow sticky on the right wall near RECORDS | “I came back today.” | Handwritten wall note; no outline, inspect, sound, or composure effect; separate from the keypad-code sticky |
| 04 — Night Shift | Cork noticeboard in the kitchenette | “We're all here.” | Small handwritten paper note; no outline, inspect, sound, or composure effect |
| 05 — Stairwells | Floor 01 exit wall, left of the door (after void snap) | “Please wake up.” | Worn institutional signage / writing; hidden until snap; no camera beat, outline, or gameplay trigger |

**IMPLEMENTED — outside conversation dialogue (italic `#line`)**

| Event | Chapter | When (approx.) | Text | Status |
|---|---|---|---|---|
| 01 Ordinary | 05 Stairwells | After “Please wake up.” | “It rained again today. You would've hated the drive.” | **RESERVED** — insufficient rail after Floor 01 sign; keep text for a later quiet window |
| 02 Familiar | 06 Threshold | After door crossed; before rupture (~0.33–0.52) | “Oh, I almost forgot. I saw that dog again. The little one you like.” | **IMPLEMENTED** |
| 03 Quiet | 06 Threshold | After rupture settles (~0.745–0.86); postponed if debug Bent combat | “I don't really have anything new to tell you today. I just... wanted to be here.” | **IMPLEMENTED** |
| 04 Forgotten call | 07 Unseen | After silence / threat subsided | “I almost called you on the way home yesterday.” → “I guess I just forgot for a second.” | **IMPLEMENTED** |
| 05 Goodbye for now | (future) | Reserved quiet window | “Anyway. That's about all I've got for today.” → “I'll come back tomorrow.” | **RESERVED** — not auto-armed in Unseen |

Technical: `js/outside-dialogue.js` + `updateNarrative()` in `main.js`. One-shot; does not re-fire on reverse scroll; holds long enough to read; suppresses overlapping protagonist line while active; pauses during STEADY / combat.

**OPEN / PROVISIONAL (later beats — do not implement yet; not for Ch 01 or Ch 03)**

- “We need you.”
- **“I know you can't hear me, but...”** — reserved; especially significant
- **“Please come back to me.”** — reserved; especially important late emotional peak; do not spend early
- “I still tell you about my day.”
- A message that addresses the protagonist personally (no name invented yet; do not use a developer name as a placeholder)

Placement, timing, and presentation for reserved lines remain undecided. Everyday Foley under these conversations (chair, keys, cloth) is planned separately — **not** implemented with this dialogue pass. Chapters 01 and 03 remain restrained and free of outside conversation dialogue.

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

**PROTOTYPE / EXPERIMENTAL** — not confirmed final story placement; not in ordinary L01–L07 progression. Current polish models **warning → escalating threat → player response → consequence** with cinematic reverse pacing; not a finalized story chapter.

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

## Chapter completion cards — emotional through-line

**IMPLEMENTED (Dialogue Revision 002 follow-up, November 2026).** End-card headings are short thematic fragments, not recaps of each chapter's scare. Their meaning should deepen retrospectively as the protagonist's grief, avoidance, and unreliable recollection emerge; they must not disclose writer-only backstory.

| Chapter | End heading | Emotional reading |
|---|---|---|
| 01 — The Corridor | **NO ONE ANSWERED.** | Searching; no response |
| 02 — The Office | **WHAT WAS LEFT BEHIND.** | Ordinary belongings after an absence |
| 03 — The Records | **SOME THINGS STAY HIDDEN.** | The face-down photograph and chosen refusal |
| 04 — The Night Shift | **ALMOST LIKE HOME.** | An institution begins feeling domestic |
| 05 — The Stairwells | **YOU KEPT GOING DOWN.** | Compulsion to continue; architecture that will not let descent end cleanly |
| 06 — The Threshold | **IT WON'T STAY BURIED.** | Suppression bleeding into the architecture |
| 07 — The Unseen | **IT'S STILL THERE.** | A presence and a feeling that persist |

The Ward remains a development-only mechanics prototype; its heading is unchanged. End-card supporting text and continue controls are unchanged in this pass.

---

## Chapter 01: The Corridor

**IMPLEMENTED** unless noted.

**Setting / mechanic:** Narrow office corridor; sealed far elevator; hidden rear elevator behind the start. Scroll up = forward, scroll down = backward; camera stays facing the corridor. Max walk ~5.5 m/s. Breathing audio volume constant is `0.07` in code (older docs said 0.065).

**Dialogue Revision 002 (IMPLEMENTED):** Only three brief one-shot thoughts remain (about 2.6 seconds each); backtracking never replays them.

| Moment | One-shot thought |
|---|---|
| Early forward passage | “Hello?” |
| Return past the altered doorway | “Wait — was that open before?” |
| Unexpected rear elevator | “Behind me?” |

The dead-end, return, and elevator movement instructions remain independent of dialogue. The breathing cue and physical door/elevator changes tell the other beats.

**Interact inspect copy (IMPLEMENTED)**

| Object | Text |
|---|---|
| Brass key | “A plain brass key. No label.” |
| Locked door | “Locked.” / unlocked: “Opens to nothingness.” |
| Unmarked changed door | “That door was shut. I’m sure of it.” |
| Far call panel | “The panel is dead.” |

**Events:** Breath only on first pass. Return reveals the ajar unmarked door and brass key. Rear elevator unlocks after backtrack; hallway door cascade + STEADY arm on approach (~0.11) before cabin entry; cabin then seals. End card after doors close. Exit sign is visual-only (not inspectable).

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
- Empty glass meeting room. On the second approach, one conference chair slides back from the table once (empty-seat STEADY); aisle chair stays static.
- Service door opens only after correct keypad entry.

**Outside-world intrusion (IMPLEMENTED):** A yellow handwritten sticky on the right-hand wall near the locked RECORDS doors reads **“I came back today.”** Not the keypad-code collectible. No outline, inspect panel, dialogue, sound, or composure effect.

### Dialogue Revision 002 (IMPLEMENTED)

Only one brief spoken reaction remains: **“Was that a latch?”** on the return sound cue. The ringing phone, unattended workstations, far door, and keypad discovery carry themselves without protagonist commentary. The latch sound remains part of the backtrack puzzle but no longer opens STEADY or deals composure damage.

Movement prompts, keypad guidance, and the **TAKE THE KEY FOB** reminder remain independent of subtitles. The latch reaction continues to convey the sound event to sound-off players.

**Object inspect copy (IMPLEMENTED):** lighter / sticky / fob / keypad as listed under Recurring objects. Keypad interaction remains UI-driven; door state follows `keypadUnlocked`.

**Emotional arc:** Rationalize vacancy → unanswered phone → forced retreat → auditory doubt → empty-seat disturbance on re-approach → pragmatic code entry without lore dump.

---

## Chapter 03: The Records

**Emotion:** Grief-adjacent avoidance and involuntary recognition — the first hint that discomfort may be personal, without naming why.  
**Entry:** A side service passage near the Office meeting room. Brief occlusion handoff, not another elevator.  
**Architecture:** Lower ceiling, older filing cabinets, receiving counter, quiet sorting station, box storage, locked far exit with an ordinary wall card reader.  
**Motif — face-down Polaroid:** Rests on the sorting surface mid-floor. Camera never reveals the front; no artwork, name, or Take. Discovery via A/D look; proximity triggers no composure damage and no ambient dialogue. Inspect-only panel: title **PHOTOGRAPH**, body **“No.”** A refusal without explanation. Do not connect the Polaroid to any off-screen person in player-facing text.  
**Environmental memory:** A right-side drawer is ajar on first approach; after the camera passes, it is closed. No close animation or sound. Optional backtrack may yield **“That was open.”** Not required for progression. Separately, drawers on the last filing cabinets toward the exit ease open ahead of the player mid-hall (quiet, no composure tax). Past the sorting station, a one-shot dark blot darts across the aisle (STEADY). Later, a head-only shadow peeks once (small unavoidable composure tax; skipped under reduced motion).  
**Environmental anomaly — Experiment 001 (IMPLEMENTED):** An unmarked binder sits among ordinary clutter on the receiving counter near the entrance. After the player has moved well past it (off-camera), the binder is gone. A dust-free rectangle remains on the counter. No dialogue, inspect, sound, composure, or required notice. Reverse scroll does not restore it; chapter restart does.  
**Other dialogue (Revision 002):** The optional one-shot **“That was open.”** plays if the player notices the altered drawer on return. Otherwise silence. The locked card reader still provides an instruction hint.  
**Exit (IMPLEMENTED):** Far door locked until the Office key fob is used on the card reader. Soft beep + latch + quiet hinge. The fob is consumed on successful use. Progress cannot complete the chapter while the door is locked. Unlock opens the path into Night Shift.  
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
- How much of the player's private pattern-recognition (if any) should ever be acknowledged in-fiction — and how late — without collapsing ambiguity?

## Chapter 04: The Night Shift — Prototype 004.2 / Act II begins

**Emotion:** Loneliness and absence in a place that once held ordinary overnight life — grief suggested, never explained.  
**Entry:** The Records' already-open doorway leads into an older, more domestic overnight-staff wing. No additional elevator.  
**Visual anchors:** Warm kitchenette (cups, tea towel), break table with a pushed-out empty chair, lounge sofa, floor lamp, jacket on the coat stand, closed staff rooms beyond. The final door is open rather than locked.

**Primary event (004.2):** No following footsteps (that cadence belongs to The Ward). Past the lounge, the floor lamp dies beside the empty chair; a soft settle marks that someone was just there. Early lighting is warm/domestic; the deeper hall cools and thins. Sound-off players still get lamp / chair / hush captions.

**Dialogue (Revision 002):** Two brief one-shot thoughts: **“This floor feels different.”** early and **“Much colder back here.”** in the later hall. The lamp, empty chair, and hush remain nonverbal. Never name a person, diagnose grief, or claim a haunting.

**Combat — THE BENT (IMPLEMENTED, Relocation 005):** Late cold hall (~82% notice / ~86% trigger). Real inventory/composure. Pre-bent checkpoint + combat RETRY. No victory fanfare; path clears in place. Lounge lamp/chair sequence stays combat-free.

**Pacing:** No mandatory backtrack, STEADY/QTEs, jumpscares, or chase. Forward path stays open. Atmospheric events deal **0** composure.

**Outside-world intrusion (IMPLEMENTED):** A small handwritten note on the kitchenette cork board reads **“We're all here.”** Easy to miss; no interaction outline, inspect panel, dialogue, sound, or composure effect.

**Motifs:** Do not add the lighter or face-down photograph here. The house key remains reserved for Threshold (Chapter 06).

**Production status:** Emotional redesign live on `staging` / `main` (004.2). Outside-world note added in the intrusion pass.

## Chapter 05: The Stairwells — playable / Act II

**IMPLEMENTED** unless noted.

**Emotion:** Compulsion to keep descending; ordinary institutional space that stops obeying expected landings.  
**Entry:** Night Shift's open final doorway into a concrete fire stair.  
**Architecture:** Four switchback floors (HUD Floors 04→01), mid-landing U-turns, then an anomalous straight flight into a vast dark room, a hard snap back onto the mid landing facing the last flight, and exit through the Floor 01 door into Threshold.  
**Movement:** Slower descent (~2.7 m/s). Camera rail and staircase geometry are locked for this pass — do not alter void, snap-back, or exit sequencing casually.  
**Outside-world intrusion (IMPLEMENTED):** On the Floor 01 exit wall (left of the door) **after** the void snap, worn institutional writing reads **“Please wake up.”** Hidden until the snap. No camera beat, outline, sound, or composure tax.  
**Dialogue Revision 003:** Two brief one-shot thoughts only — **“There should've been a landing.”** (early void) and **“I was still going down.”** (post-snap). No narration of the void room, repeating flights, or exit door. Protagonist never comments on “Please wake up.”  
**Narrative discipline:** No protagonist explanation of the sign or the void. Composure damage remains 0. End card: **YOU KEPT GOING DOWN.**

**OPEN / PROVISIONAL:** Optional hidden room off a reserved stair door; further intrusion placements.

## Chapter 06: The Threshold — Prototype 005.0 (renumbered)

**Emotion:** The first overt rupture in reality; unavoidable dread rather than shock.
**Entry:** Chapter 05's stair exit. At the new chapter start a freestanding, hinged door stands in the center of an otherwise ordinary hallway. It is not connected to the side walls.
**Progression:** The door opens gently as the viewer approaches. The corridor beyond seems similar at first. Then plaster appears to split and seams distort. Farther down, membrane-like wall geometry and tendon ridges absorb normal trim and fixtures. The final stretch is drenched in red light. At every stage the recognizable *office corridor architecture* remains visible.
**Recurring motif:** The house key is visible on a ledge embedded in the red-hall architecture. The worn tag's presence remains ambiguous. It is never collected or accompanied by a factual explanation.
**Audio:** Familiar hum degrades into a low filtered pulse; no stingers, scream, or chase cue. Visual and narrative beats remain legible with sound off.
**Movement:** Forward route is always open. Backtracking is optional and shows the comparatively normal space behind. Door stays open when crossed. No required return trip. Scroll movement remains at most 5.5m/s.
**Implementation:** Single Three.js scene, one reused cube for instanced architecture, procedural organic meshes, few non-shadow-casting lights. Three corruption curves change lighting/fog/audio by scroll progress. Scene disposable on future chapter transition.
**Narrative discipline:** Avoid diagnosing the building, revealing a person's identity, or asserting a memory. The protagonist is now disturbed by what they physically see, but the personal history remains hidden.

**Dialogue Revision 003:** One brief thought — **“Don't touch the walls.”** when organic corruption is clear (~0.62–0.78). Removed “A door?” and “Keep moving.” Scroll instructions stay independent.

**STEADY — Threshold Rupture (IMPLEMENTED):** Around progress `0.605`, organic wall seams contract inward once with a deep groan and a brief light weaken; STEADY (`threshold-rupture`, 18/9/4) peaks with the contraction. No monster, sting, or new dialogue.

**Combat:** None in Threshold (relocated to Night Shift — Combat Relocation 005).

## Chapter 07: The Unseen — Prototype 006.0 / first playable pass (renumbered)

**Emotion:** Fear of proximity without visible evidence. A deliberately quiet, ordinary environment after Chapter 06's organic nightmare.

**Entry:** Level 06's final corridor hands off under the existing opaque veil to a service passage lined with pipes, metal access panels, low fluorescent fixtures, an abandoned janitor trolley, and translucent plastic sheeting at its entrance.

**The turn:** The forward path ends at a sealed maintenance barrier. From somewhere ahead comes a faint, spatially located dragging/scraping sound. Nothing is rendered as the source. The protagonist retreats *while still facing the empty corridor*. The sound's perceived distance changes over time and movement, unlike early companion-footstep experiments. Only tiny ambient visual reactions occur: overhead lamps lose some intensity, a cable and grate barely vibrate. Never add a monster, silhouette, stinger, or explicit diagnosis of the sound.

**The exit:** A left-side maintenance door, previously another ordinary access panel, opens once the retreat has begun. Near the door the camera turns left, then scrolling DOWN moves the player laterally through that doorway. The camera does not turn back to reveal or explain the presence. Completing the retreat ends Chapter 07; the continuation beyond it is not implemented yet.

**Dialogue Revision 003:** Brief one-shots only — **“The passage is blocked.”** (sound-off accessibility near the barrier), **“Something is coming this way.”** (presence apparent), **“It stopped.”** (after silence). No dialogue during the retreat scramble. Retreat / side-door instructions remain independent of the 2.6s thought timer.

**Mechanics:** Forward progress is capped at the solid barrier. Reaching it latches the encounter; returning the scrollbar does not reset the state. The side passage is inaccessible until that condition occurs. The side-turn camera route never exceeds the established 5.5 m/s movement cap. The scene is recyclable/disposable; audio sources are created lazily when needed and are muted on jump/reset.

**Debug testing:** `?debug=1&level=07` (or `level=unseen`) loads the chapter. Named checkpoints can recreate state for `approach`, `retreat`, and `exit`. These are development tools only; none of them save a gameplay checkpoint.

**Status:** First functional pass. Timing, spatial audio perceived over headphones, lighting balance, the left-side door's readability, and camera choreography should all receive an in-browser playtest before Chapter 07 is treated as creatively locked.

### Prototype 006.1 — Unseen Retreat Pass (2026-10-25) — historical note

Environmental horror operates in descending backward-scroll beats: first taps, a right-hand electrical cabinet opening, irregular scraping migrating between walls, ceiling vibration, an advancing blackout, near-absolute silence, and an impossible final click close to the protagonist. The presence is never shown. Player speed modulates scratching; stopping invites one small tap. All changes remain one-way after triggering, not reversible by scrubbing. Developer jump checkpoints preserve each staged state and never play historical sounds.

**STEADY — Unseen Blackout (IMPLEMENTED):** At darkness onset (~progress `0.43` on retreat), fixtures dim as the blackout advances; a low-frequency swell and STEADY (`unseen-blackout`, 22/11/4) fire at the peak. Retreat controls and side-door escape unchanged; presence stays unseen.

---

## Chapter restructuring review (planning only — not applied)

**OPEN / PROVISIONAL.** Existing chapters stay in the build until creative decisions land.

| Chapter | Narrative purpose | Unique mechanic | Emotional contribution | Provisional recommendation |
|---|---|---|---|---|
| 01 Corridor | Orientation; first sensory doubt; “behind you” reveal | Scroll corridor + return changes + rear elevator seal / hall cascade | Vulnerability, spatial dread | **Retain** as Act I opener; keep sparse dialogue. |
| 02 Office | Occupied absence; rationalizing emptiness; first inventory puzzles | Phone + keypad code exit; collectibles | Unease without recognition claims | **Retain**; may later feed Act II memory setup after Records. |
| 03 Records | Avoidance; photograph as unreadable personal pressure | Optional backtrack; “Leave it.” | Intimacy without disclosure | **Retain**; candidate beat *before* white-dragon memory (Act II). Fob unlock **now implemented** (consumed on use). |
| 04 Night Shift | Domestic lull → first fight | Lamp / empty chair; late-hall THE BENT | Soft grief then survival | **Retain**; first mandatory combat near exit (Relocation 005). |
| 05 Stairwells | Compulsion to descend; architectural impossibility | Switchbacks → void → snap → exit | Quiet wrongness before overt rupture | **Retain** between Night and Threshold (inserted 2026-11). |
| 06 Threshold | Overt reality rupture | Progressive corridor corruption; uncollected house key | Dread from visible wrongness | **Retain** late Act II; ensure it doesn’t undercut quieter memory horror. |
| 07 Unseen | Proximity fear; forced retreat | Barrier + spatial scrape + side exit | Panic with empty evidence | **Retain / polish**; evaluate whether it should follow Threshold or a memory beat. |

Historical note: an earlier draft of this table numbered Threshold as 05 and Unseen as 06 before Stairwells entered the main path. Do not delete or reorder chapters in code based on this table alone.

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
| 2026-11 | **Dialogue Revision 002:** L01–L04: 3 / 1 / 1 optional thought + photo inspect / 2. All subtitles are brief one-shots; puzzles and accessibility instructions remain independent. |
| 2026-11 | **Composure Survival Balance Pass:** Max/start 100; cigarette restore 40; one pack→one cig per chapter (all six mains); persist unused cigs; block use at full; chapter damage budgets + one-shot story flags; Overwhelmed soft retry; debug presets; no time/movement drain. |
| 2026-11 | **Psychological Survival System v2 (L01–L03):** Stages; STEADY (cascade/latch/dart); game over at 0; checkpoints; cig restore 40; L04–L06 damage gated; office +5 anomaly reserved/disabled. |
| 2026-11 | **STEADY expansion & composure rebalance:** Office empty-seat replaces latch QTE; Threshold rupture + Unseen blackout STEADY; atmospheric hits zeroed (phone/photo/drawers/breath/Night); altered-door & peek small taxes; latch remains audio-only. |
| 2026-11 | **Stairwells as Chapter 05:** Inserted between Night Shift and Threshold; Threshold→06, Unseen→07. Four-floor void descent retained. |
| 2026-11 | **Records exit polish:** Walk closer to end door; fob reader highlight; fob consumed on use. |
| 2026-11 | **Outside-world intrusions (first pass):** Public bible rules + Night Shift cork note (“We're all here.”) + Stairwells Floor 03 sign (“Please wake up.”); later lines reserved; writer-only explanation stays gitignored. |
| 2026-11 | **Outside-world — Office:** Sticky on the right wall near RECORDS (“I came back today.”); writing-origin rule added (spoken fragment first, placement second). |
| 2026-11 | **Narrative direction update (continuity):** Public bible reframes grief as separation/absence; formalizes player-discovery-before-protagonist; expands outside-world restraint and reserved later lines. Private revised backstory kept only in gitignored writer-only notes (superseded prior private outline marked there — not rewritten into historical public entries). |
| 2026-11 | **Outside conversation dialogue:** Italic `#line` source vs roman protagonist; five ordinary→intimate one-shot conversations in Stairwells / Threshold / Unseen after “Please wake up.”; reserved “I know you can't hear me…” / “Please come back to me.”; no voice/Foley in this pass. |
| 2026-11 | **Dialogue Revision 003 (L05–L07):** Brief one-shot protagonist thoughts for Stairwells / Threshold / Unseen; cut descriptive narration; rain + “come back tomorrow” outside lines reserved; STEADY/combat pause outside speech. |
| 2026-11 | **Combat Integration 004:** The Bent becomes mandatory story combat in Threshold (~69%); real inventory/composure sync; pre-fight checkpoint retry; debug nocombat bypass. |
| 2026-11 | **Combat Relocation 005:** Move THE BENT to late Night Shift (~86%); Threshold combat-free again; Night checkpoints + DEV jump; preserve camera yaw fix. |
| 2026-11 | **Environmental anomaly Experiment 001 (Records):** Unmarked binder vanishes off-camera after first pass; dust-free counter trace remains; optional to notice; no dialogue/systems. |
