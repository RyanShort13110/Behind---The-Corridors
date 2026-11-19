BEHIND. — PROTOTYPE 006.1 / THE UNSEEN: THE RETREAT
=================================================

WHAT CHANGED FROM 006.0
-----------------------
Level 06 now responds to the player during the forced backward retreat:

  1. Initial dragging sound closes distance even as you retreat.
  2. Uneven taps begin inside the RIGHT-hand wall.
  3. A NEW electrical cabinet on the right audibly unlatches and swings open.
     The cabinet inches open farther later in the encounter.
  4. Scratching travels between right and left walls; a wall grille moves subtly.
  5. An overhead panel and loose cable vibrate with intermittent sound.
  6. Fluorescent bulbs lose their light sequentially FROM THE SEALED END.
     The final fixtures remain on, so you can navigate safely to the exit.
  7. The retreat opens the LEFT maintenance access as before.
  8. The scraping and wall noises cut abruptly to nearly absolute silence.
  9. One restrained metal click comes from close RIGHT, although the cabinet
     that opened is now far away. This impossible placement is intentional.

THE INTERACTION
---------------
Keep facing down the corridor. Scroll UP to explore; scroll DOWN to retreat.
Stop during the retreat: after a brief tail of scraping, the moving sound
subsides and a single tap may answer. Back away quickly: scratching becomes
more urgent. There is no monster, chase animation, or jump scare.

The scene's state is ONE-WAY. Scrubbing back up will not close the cabinet
or undo the tension. No collectible or puzzle item is required.

DEBUG LINKS — PRESERVED AND EXPANDED
------------------------------------
?debug=1                                Chapter chooser, levels 01–06
?debug=1&level=06                       Start of The Unseen
?debug=1&level=06&checkpoint=approach    Sealed end / dragging begins
?debug=1&level=06&checkpoint=retreat     First taps, prior to the cabinet
?debug=1&level=06&checkpoint=cabinet     Cabinet already open
?debug=1&level=06&checkpoint=scratching  Scratching in the walls
?debug=1&level=06&checkpoint=blackout    Creeping darkness
?debug=1&level=06&checkpoint=silence     Sudden stillness, prior to click
?debug=1&level=06&checkpoint=exit        Exit turn, prior to final click

The debug selector shows these choices only for Level 06. Each jump creates
fresh state and does not replay prior one-shot sound cues. Ordinary gameplay
never shows the developer panel. Old chapters remain unchanged.

IMPLEMENTATION / PERFORMANCE
----------------------------
- Full modular files, without changes to Level 01–05 scene or story modules.
- Cabinet and lamp geometry added only inside Level 06.
- Procedural audio samples are created ONCE when first required, only after
  SOUND: ON. One-shot playback nodes are disconnected after completion.
- True silence fades ongoing wall-cue and drag buses; the final click has
  its own small audio bus.
- Camera motion still honors 5.5 m/s cap, including sideways exit.
- Reduced Motion disables oscillating environment shakes; the important
  visual state changes (open cabinet and darkening) remain accessible.
- Audio stays off by default; text conveys key beats if audio is disabled.

INSTALLATION
------------
NETLIFY ZIP: Extract and publish the contents with index.html at its root.
SOURCE TXT ZIP: Every included file is complete, with its original relative
folder path and an extra .txt extension; remove .txt when copying into VS Code.

AUDIO ASSET NOTE
----------------
The supplied Prototype 005.5 archive and Prototype 006.0 did not contain the
original Level 01 recording at assets/breathing-scared.m4a. Keep your existing
recording at that path to hear breathing in The Corridor. All Level 06 sounds
are Web Audio synthesis: no new external audio files are required.

CHECKS PERFORMED
----------------
PASS: Full JavaScript parser checks.
PASS: Event ordering, one-way latches, darkness, responsive pauses, silence,
      final click, exit completion, checkpoints and reset.
PASS: Mock Web Audio integration with opt-in activation and no repeat per frame.
PASS: Maximum horizontal camera-route derivative <= 5.5 m/s.
PASS: No code changes to the first five levels' story and scene modules.

NOT VERIFIED: Rendered browser / headphone playthrough. This development
sandbox blocks Chromium navigation to local test pages. Please test lighting,
sound balance, and cabinet visibility using Live Server or Netlify.
