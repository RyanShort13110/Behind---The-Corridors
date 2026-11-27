/**
 * Remembered-home memory stories — white (afternoon) and black (avoided night).
 * Shared rail progress; variant-specific one-shot beats. Dev-only; not in main progression.
 */

/** Staging foyer length (both variants). */
export const MEMORY_STAGING_METERS = 8;
export const MEMORY_STAGING_START_Z = 3.2;
/** Living-room rail length while phase === memory (straight center aisle). */
export const MEMORY_ROOM_METERS = 11;
export const MEMORY_ROOM_START_Z = -0.5;

/** Back-compat aliases used by older main.js imports. */
export const MEMORY_WHITE_METERS = MEMORY_STAGING_METERS;
export const MEMORY_WHITE_START_Z = MEMORY_STAGING_START_Z;
export const MEMORY_BED_METERS = MEMORY_ROOM_METERS;
export const MEMORY_BED_START_Z = MEMORY_ROOM_START_Z;

export function createMemoryHomeStory(variant = 'white') {
  const isBlack = variant === 'black';
  const state = {
    variant,
    phase: 'staging', // staging | memory | returned
    dragonTaken: false,
    introLine: 0, // white: 1 = "Oh...", 2 = done; black unused
    introElapsed: 0,
    // White discrepancy: remote snaps table → shelf after leaving camera view
    remoteSeen: false,
    remoteMoved: false,
    // Optional inspect latch
    mugsInspected: false,
    // White unfinished thought near hallway (timed display)
    unfinishedSaid: false,
    unfinishedElapsed: 0,
    // Black door encounter
    doorSoundPlayed: false,
    shouldveSaid: false,
    shouldveElapsed: 0,
    doorSoundElapsed: 0,
    exitReady: false,
    exiting: false,
    completed: false,
    furthestMemory: 0,
    // One-shot consume flags for audio/main
    _consumeDoorSound: false,
  };

  return {
    state,
    observeStaging(previous, current) {
      void previous;
      void current;
    },
    observeMemory(previous, current, dt = 0) {
      if (state.phase !== 'memory') return;
      state.furthestMemory = Math.max(state.furthestMemory, current);
      const step = Math.max(0, dt);
      // Apartment rail is longer; remap white coffee / hallway beats to landmarks.
      const apt = state.environment === 'apartment';

      if (!isBlack && state.introLine === 1) {
        state.introElapsed += step;
        if (state.introElapsed > 2.2) {
          state.introLine = 2;
          state.introElapsed = 0;
        }
      }

      // Coffee-table zone (table sits in front of the couch on the early rail).
      const coffeeLo = apt ? 0.24 : 0.18;
      const coffeeHi = apt ? 0.38 : 0.34;
      if (!isBlack && current >= coffeeLo && current <= coffeeHi) {
        state.remoteSeen = true;
      }
      // After leaving that zone, the remote is already on the shelf (one-way snap).
      const remoteMoveAt = apt ? 0.46 : 0.40;
      if (!isBlack && state.remoteSeen && current >= remoteMoveAt) {
        state.remoteMoved = true;
      }

      // White: unfinished line near hallway — once, then fades.
      const unfinishedAt = apt ? 0.72 : 0.78;
      if (!isBlack && !state.unfinishedSaid && current >= unfinishedAt) {
        state.unfinishedSaid = true;
        state.unfinishedElapsed = 0;
      }
      if (!isBlack && state.unfinishedSaid) state.unfinishedElapsed += step;

      // Black: keys + door once near the hallway end.
      if (isBlack && !state.doorSoundPlayed && current >= 0.86) {
        state.doorSoundPlayed = true;
        state._consumeDoorSound = true;
        state.doorSoundElapsed = 0;
      }
      if (isBlack && state.doorSoundPlayed && !state.shouldveSaid) {
        state.doorSoundElapsed += step;
        if (state.doorSoundElapsed > 2.8) {
          state.shouldveSaid = true;
          state.shouldveElapsed = 0;
        }
      }
      if (isBlack && state.shouldveSaid) state.shouldveElapsed += step;

      // Exit readiness
      if (!isBlack) {
        if (state.remoteMoved && state.unfinishedSaid && state.unfinishedElapsed > 2.5) {
          state.exitReady = true;
        }
      } else if (state.shouldveSaid && state.shouldveElapsed > 3.5 && current >= 0.9) {
        state.exitReady = true;
      }

      void previous;
    },
    takeDragon() {
      state.dragonTaken = true;
      if (!isBlack) {
        state.introLine = 1;
        state.introElapsed = 0;
      }
    },
    enterMemory() {
      state.phase = 'memory';
      state.furthestMemory = 0;
      if (!isBlack) state.introLine = Math.max(state.introLine, 1);
    },
    markMugsInspected() {
      state.mugsInspected = true;
    },
    consumeDoorSound() {
      if (!state._consumeDoorSound) return false;
      state._consumeDoorSound = false;
      return true;
    },
    beginExit() {
      if (!state.exitReady || state.exiting) return false;
      state.exiting = true;
      return true;
    },
    finishExit() {
      state.phase = 'returned';
      state.exiting = false;
      state.completed = true;
      state.introLine = 0;
    },
    seekCheckpoint(name = 'before') {
      this.reset();
      if (name === 'before' || name === 'start') return { phase: 'staging', progress: 0 };
      if (name === 'enter' || name === 'arrival') {
        state.dragonTaken = true;
        state.phase = 'memory';
        state.introLine = isBlack ? 0 : 2;
        return { phase: 'memory', progress: 0.04 };
      }
      if (name === 'mid' || name === 'explore') {
        state.dragonTaken = true;
        state.phase = 'memory';
        state.introLine = 2;
        return { phase: 'memory', progress: 0.36 };
      }
      if (name === 'changed' || name === 'discrepancy') {
        state.dragonTaken = true;
        state.phase = 'memory';
        state.introLine = 2;
        if (!isBlack) {
          state.remoteSeen = true;
          state.remoteMoved = true;
        }
        state.furthestMemory = 0.55;
        return { phase: 'memory', progress: 0.55 };
      }
      if (name === 'hallway' || name === 'door') {
        state.dragonTaken = true;
        state.phase = 'memory';
        state.introLine = 2;
        if (!isBlack) {
          state.remoteSeen = true;
          state.remoteMoved = true;
          state.unfinishedSaid = true;
          state.unfinishedElapsed = 0.5;
          state.exitReady = false;
        } else {
          state.doorSoundPlayed = true;
          state.shouldveSaid = true;
          state.shouldveElapsed = 0.5;
          state.exitReady = false;
        }
        state.furthestMemory = 0.9;
        return { phase: 'memory', progress: 0.88 };
      }
      if (name === 'exit') {
        state.dragonTaken = true;
        state.phase = 'memory';
        state.introLine = 2;
        if (!isBlack) {
          state.remoteSeen = true;
          state.remoteMoved = true;
          state.unfinishedSaid = true;
          state.unfinishedElapsed = 4;
        } else {
          state.doorSoundPlayed = true;
          state.shouldveSaid = true;
          state.shouldveElapsed = 4;
        }
        state.exitReady = true;
        state.furthestMemory = 0.96;
        return { phase: 'memory', progress: 0.94 };
      }
      return { phase: 'staging', progress: 0 };
    },
    reset() {
      state.phase = 'staging';
      state.dragonTaken = false;
      state.introLine = 0;
      state.introElapsed = 0;
      state.remoteSeen = false;
      state.remoteMoved = false;
      state.mugsInspected = false;
      state.unfinishedSaid = false;
      state.unfinishedElapsed = 0;
      state.doorSoundPlayed = false;
      state.shouldveSaid = false;
      state.shouldveElapsed = 0;
      state.doorSoundElapsed = 0;
      state.exitReady = false;
      state.exiting = false;
      state.completed = false;
      state.furthestMemory = 0;
      state._consumeDoorSound = false;
      state.environment = undefined;
    },
  };
}

export function createMemoryWhiteStory() {
  return createMemoryHomeStory('white');
}

export function createMemoryBlackStory() {
  return createMemoryHomeStory('black');
}

export function memoryHomeNarrative(progress, state) {
  const isBlack = state.variant === 'black';
  const chapter = isBlack ? 'MEMORY — BLACK' : 'MEMORY — WHITE';

  if (state.phase === 'staging') {
    return {
      chapter,
      line: state.dragonTaken ? '' : (progress > 0.2 ? 'Something on the table.' : ''),
      instruction: state.dragonTaken
        ? ' '
        : 'SCROLL UP · CLICK TO INSPECT · A / D TO LOOK',
    };
  }
  if (state.phase === 'returned') {
    return {
      chapter,
      line: isBlack ? '' : 'Still here.',
      instruction: 'DEV PROTOTYPE · JUMP AWAY WHEN DONE',
    };
  }

  let line = '';
  if (!isBlack) {
    if (state.introLine === 1) line = 'Oh...';
    else if (state.unfinishedSaid && state.unfinishedElapsed < 3.2) line = 'We used to...';
  } else if (state.shouldveSaid && state.shouldveElapsed < 3.5) {
    line = 'I should\'ve just...';
  }
  void progress;

  const exitHint = isBlack
    ? 'SCROLL · A / D LOOK · INSPECT THE WINDOW TO LEAVE'
    : 'SCROLL · A / D LOOK · INSPECT THE DOOR WHEN YOU’RE READY';

  return {
    chapter,
    line,
    instruction: state.exitReady
      ? exitHint
      : isBlack
        ? 'SCROLL UP TO EXPLORE ↑ · A / D OR SWIPE TO LOOK'
        : 'TAKE YOUR TIME · SCROLL · A / D OR SWIPE TO LOOK',
  };
}

export const memoryWhiteNarrative = memoryHomeNarrative;
export const memoryBlackNarrative = memoryHomeNarrative;
