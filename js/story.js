/**
 * Behind. / persistent level state. Scrolling is only position; state is truth.
 * A direction reversal before reaching the dead end does not activate a scare.
 */
export const START_PROGRESS = 0.09; // Reserve space to back into the rear elevator.
export const DEAD_END_PROGRESS = 0.965;

export function createStory() {
  const state = {
    hasBacktracked: false,
    reachedDeadEnd: false,
    rearElevatorUnlocked: false,
    enteredRearElevator: false,
    furthestProgress: START_PROGRESS,
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
    },
    reset() {
      state.hasBacktracked = false;
      state.reachedDeadEnd = false;
      state.rearElevatorUnlocked = false;
      state.enteredRearElevator = false;
      state.furthestProgress = START_PROGRESS;
    },
  };
}
