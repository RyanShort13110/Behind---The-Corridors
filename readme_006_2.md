BEHIND. — PROTOTYPE 006.2 / THE UNSEEN: WALL PANEL + CARTON
===========================================================

BUILT DIRECTLY ON PROTOTYPE 006.1
--------------------------------
1) THE ELECTRICAL PANEL IS ALIGNED
   - Removed the redundant static panel at the same location.
   - Made the animated door occupy exactly the twelfth right-wall panel
     position (world centre z=-56.5, y=1.62).
   - Matched the existing panel width/height, upper trim and latch side.
   - Removed the oversized protruding cabinet backing. The hinged door now
     sits flush with the rest of the service panel row when closed.
   - Preserved the original latch sound and slow additional creep outward.

2) NO REDUNDANT LATCH NARRATION
   - Removed the 'A latch snaps open. To the right.' on-screen line.
   - The panel moves and the metal latch remains audible; the player can
     notice the event without being told what they just watched.

3) THE TROLLEY CARTON OPENS
   - Replaced the trolley's solid brown block with an actual open-top
     cardboard carton, modeled with thin walls, base and FOUR hinged flaps.
   - It begins closed, then the two large flaps whip outward, followed by
     the two smaller flaps, during the BACKWARD journey.
   - A soft, papery crackle accompanies the action. There is no jump scare.
   - The trigger is at progress=0.345, placing the box ~6.7 meters ahead
     of the player when they look down the corridor while retreating.
   - This is a one-time, persistent event: reversing direction cannot
     close the flaps or replay its sound.
   - Motion-reduction instantly displays the finished open state.

DEV NAVIGATION
--------------
?debug=1                                  Chapter jump panel
?debug=1&level=06                         Entire Level 06
?debug=1&level=06&checkpoint=cabinet      Electrical panel already opening
?debug=1&level=06&checkpoint=carton       Cardboard carton flaps opening
?debug=1&level=06&checkpoint=blackout     Lights receding
?debug=1&level=06&checkpoint=silence      Sudden silence

All prior Level 06 checkpoint names remain supported. Loading a checkpoint
constructs the earlier environment state without replaying earlier cues.

WHAT WAS PRESERVED
------------------
- Levels 01–05, Chapter 05→06 transition, all previously existing routes.
- Level 06 forced retreat, 5.5m/s max speed, sound positioning, light
  progression, secret side exit, and final impossible click.
- ?debug=1 chapter selector, direct level links and all old checkpoints.
- Scene cleanup, audio ON/OFF, performance quality and reduced motion.

DEPLOYMENT
----------
Upload Behind_Prototype_006_2_Netlify.zip to Netlify Drop or unzip it and
serve index.html via VS Code Live Server. No compilation or npm install.

Behind_006_2_Complete_Source_TXT.zip contains full source files with their
original relative directory paths; remove only the extra .txt extension.

The previous user-supplied ZIP did not contain assets/breathing-scared.m4a.
Keep your original 5-second audio file at this path if you want the Level 01
breathing sound. Level 06 audio is synthesized and requires no extra files.

TESTING
-------
PASS: All JavaScript syntax checks; checkpoint state; persistent one-time
cabinet/carton events; triggering geometry distance in front of the camera;
reset, cutscene state, exit completion, no latch narration; unchanged
Levels 01–05 module bytes. Existing audio resource and chapter lifecycle
integration remain unchanged except for the single carton cue.

NOT VISUALLY VERIFIED: Browser navigation to localhost is blocked in the test
container, so the actual rendered door and carton animation should be
checked in a normal browser, with SOUND: ON for audio balance.
