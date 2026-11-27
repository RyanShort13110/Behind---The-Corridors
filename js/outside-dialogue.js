/**
 * Outside-world conversation fragments — italic narrative lines from an
 * unidentified speaker. Not a separate UI; rides the existing #line.
 *
 * Default / unspecified dialogue elsewhere remains protagonist (roman).
 */

/** @typedef {{ id: string, lines: string[] }} OutsideEventDef */

export const OUTSIDE_EVENTS = Object.freeze({
  /** Reserved — Stairwells exit has too little rail after “Please wake up.” */
  rain: Object.freeze({
    id: 'outside-01-rain',
    lines: Object.freeze([
      "It rained again today. You would've hated the drive.",
    ]),
  }),
  dog: Object.freeze({
    id: 'outside-02-dog',
    lines: Object.freeze([
      'Oh, I almost forgot. I saw that dog again. The little one you like.',
    ]),
  }),
  quiet: Object.freeze({
    id: 'outside-03-quiet',
    lines: Object.freeze([
      "I don't really have anything new to tell you today. I just... wanted to be here.",
    ]),
  }),
  almostCalled: Object.freeze({
    id: 'outside-04-almost-called',
    lines: Object.freeze([
      'I almost called you on the way home yesterday.',
      'I guess I just forgot for a second.',
    ]),
  }),
  /** Reserved — keep for a future quiet chapter; not auto-armed in Unseen. */
  comeBackTomorrow: Object.freeze({
    id: 'outside-05-tomorrow',
    lines: Object.freeze([
      "Anyway. That's about all I've got for today.",
      "I'll come back tomorrow.",
    ]),
  }),
});

const GAP_SECONDS = 1.2;

function holdFor(text, reducedMotion = false) {
  const base = reducedMotion ? 4.2 : 5.6;
  const perChar = reducedMotion ? 0.04 : 0.055;
  const max = reducedMotion ? 9 : 12;
  return Math.min(max, Math.max(base, 3.0 + String(text).length * perChar));
}

/**
 * Lightweight one-shot conversation controller.
 * - No queue of stale events
 * - Timed display independent of staying inside a progress band
 * - Multi-line support with a short gap between sentences
 */
export function createOutsideDialogue() {
  /** @type {Set<string>} */
  const fired = new Set();
  /** @type {null | { id: string, parts: { text: string, hold: number }[], i: number, remaining: number, gap: number }} */
  let session = null;
  let reducedMotion = false;

  function setReducedMotion(on) {
    reducedMotion = Boolean(on);
  }

  function isActive() {
    return Boolean(session);
  }

  function hasFired(id) {
    return fired.has(id);
  }

  /**
   * Start an event if not already fired and nothing else is speaking.
   * @param {OutsideEventDef | { id: string, lines: string[] }} event
   */
  function arm(event) {
    if (!event?.id || !event.lines?.length) return false;
    if (fired.has(event.id) || session) return false;
    fired.add(event.id);
    const parts = event.lines.map((text) => ({
      text,
      hold: holdFor(text, reducedMotion),
    }));
    session = {
      id: event.id,
      parts,
      i: 0,
      remaining: parts[0].hold,
      gap: 0,
    };
    return true;
  }

  /**
   * @param {number} dt
   * @returns {null | { line: string, source: 'outside', bridging?: boolean }}
   */
  function tick(dt) {
    if (!session) return null;
    const step = Math.max(0, dt);

    if (session.gap > 0) {
      session.gap = Math.max(0, session.gap - step);
      // Brief silence between sentences — keep source so protagonist text stays suppressed.
      return { line: '', source: 'outside', bridging: true };
    }

    session.remaining -= step;
    if (session.remaining <= 0) {
      if (session.i < session.parts.length - 1) {
        session.i += 1;
        session.gap = GAP_SECONDS;
        session.remaining = session.parts[session.i].hold;
        return { line: '', source: 'outside', bridging: true };
      }
      session = null;
      return null;
    }

    return {
      line: session.parts[session.i].text,
      source: 'outside',
    };
  }

  /** Drop an in-progress conversation without un-firing (chapter leave). */
  function clearSession() {
    session = null;
  }

  /** Full clear — chapter jump, restart, or new run. */
  function reset() {
    fired.clear();
    session = null;
  }

  return {
    arm,
    tick,
    reset,
    clearSession,
    isActive,
    hasFired,
    setReducedMotion,
  };
}
