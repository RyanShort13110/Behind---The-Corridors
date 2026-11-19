BEHIND. / PROTOTYPE 006.6 — THE NIGHT SHIFT AUDIO PASS
=====================================================
Based strictly on the approved Prototype 006.5 six-chapter baseline.

LEVEL 04 / THE NIGHT SHIFT
* First unseen footstep now introduces an understated synthesized low drone
  and a filtered air / ventilation texture.
* The texture thickens as the existing footsteps accelerate, while remaining
  below the step sounds. It is not tied to individual footfalls or movement
  pauses; the existing delayed extra footstep still works as before.
* At the pre-existing footstepsStopped story event, the new layers AND the
  ordinary electrical hum drop to silence. No ambience restarts on backtrack.
* Audio still requires SOUND: ON. Neither new music nor asset downloads.

INTEGRATION
* The audio nodes are created lazily once per AudioContext.
* Enter/reset/disable/leave/close manage the new sound nodes.
* The original six chapter scene, route and story files remain byte-for-byte
  identical to Prototype 006.5, including the prior 005 Threshold audio and
  006 Unseen refinements. Breathing gain remains 0.025.
* All developer chapter tools and Level 06 checkpoints remain intact.

LOCAL TESTING
* Open ?debug=1&level=04, enable SOUND, and advance beyond 40% progress.
* Pause during the follow: the atmosphere should remain under the single
  extra footstep. Advance to ~87.5%: all tension ambience cuts away.
* Scroll backward: the footsteps and ambience must not restart.
* Jump chapters/restart/toggle SOUND to verify no orphan drone carries over.

Package includes a Netlify deployable ZIP and a path-preserving source ZIP
with text extensions. Browser/listening QA recommended for volume balance.
