/**
 * Behind. / persistent level state. Scrolling is only position; state is truth.
 * A direction reversal before reaching the dead end does not activate a scare.
 */
export const START_PROGRESS = 0.09; // Reserve space to back into the rear elevator.
export const DEAD_END_PROGRESS = 0.965;

/**
 * Progress floor for Level 01. Until the return pass begins, the visitor cannot
 * scroll behind the starting mark into empty space. After backtracking, the
 * floor drops to 0 so they can enter the rear elevator.
 * Future chapters should expose the same kind of minProgress(state) helper.
 */
export function corridorMinProgress(state) {
  return state.hasBacktracked ? 0 : START_PROGRESS;
}

export function createStory() {
  const state = {
    hasBacktracked: false,
    reachedDeadEnd: false,
    rearElevatorUnlocked: false,
    enteredRearElevator: false,
    furthestProgress: START_PROGRESS,
    // Composure: first entry into the mid-corridor breathing zone.
    breathHeard: false,
    // Composure: ajar door discrepancy noticed on the return (not inspect).
    alteredDoorNoticed: false,
  };
  return {
    state,
    observe(previous, current) {
      state.furthestProgress = Math.max(state.furthestProgress, current);
      if (current >= DEAD_END_PROGRESS) state.reachedDeadEnd = true;
      // Ignore input jitter, and don't reveal the anomaly prematurely.
      if (state.reachedDeadEnd && current < previous - 0.0001) state.hasBacktracked = true;
      if (state.hasBacktracked && current < 0.20) state.rearElevatorUnlocked = true;
      if (state.rearElevatorUnlocked && current <= 0.037) state.enteredRearElevator = true;
      if (!state.breathHeard && !state.hasBacktracked
          && current >= 0.72 && previous < 0.72) {
        state.breathHeard = true;
      }
      // Environmental discrepancy — crossing the altered bay on the way back.
      if (!state.alteredDoorNoticed && state.hasBacktracked
          && previous > 0.42 && current <= 0.42) {
        state.alteredDoorNoticed = true;
      }
    },
    reset() {
      state.hasBacktracked = false;
      state.reachedDeadEnd = false;
      state.rearElevatorUnlocked = false;
      state.enteredRearElevator = false;
      state.furthestProgress = START_PROGRESS;
      state.breathHeard = false;
      state.alteredDoorNoticed = false;
    },
  };
}
