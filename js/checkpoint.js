/**
 * Lightweight composure survival checkpoints.
 * Snapshots are plain JSON-serializable objects restored by main.js.
 */

export function createCheckpointStore() {
  let latest = null;
  let chapterStart = null;

  return {
    get latest() { return latest; },
    get chapterStart() { return chapterStart; },
    saveLatest(snapshot) {
      latest = clone(snapshot);
      return latest;
    },
    saveChapterStart(snapshot) {
      chapterStart = clone(snapshot);
      latest = chapterStart;
      return chapterStart;
    },
    clear() {
      latest = null;
      chapterStart = null;
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
