/**
 * Limited left/right head look layered on top of the scroll camera.
 * Desktop: A/D, arrows, or right-drag.
 * Touch / pen: horizontal drag peeks; vertical drag keeps page scroll (walk).
 *
 * Pointer and keyboard look both hold after release so you can inspect
 * and keep walking while facing something beside the rail. Recenter by
 * looking back toward center with A/D (or reset on chapter transitions).
 */
const DEFAULT_MAX_YAW = 0.48; // ~27°
const KEY_RATE = 1.85;
const RETURN_RATE = 2.6;
const DRAG_SENS = 0.0032;
const AXIS_DEADZONE = 12; // px before committing to look vs scroll
const AXIS_RATIO = 1.2; // |dx| must beat |dy| by this factor to steal the gesture
const RECENTER_EPS = 0.03; // near-zero yaw counts as facing forward again

export function createLookControls({ canvas }) {
  const keys = { left: false, right: false };
  let yaw = 0;
  let maxYaw = DEFAULT_MAX_YAW;
  let enabled = true;
  // After look input, keep facing until the player looks back to center.
  let sticky = false;

  // Active look drag (right-mouse, or touch/pen after horizontal lock).
  let drag = null;
  // Undecided primary touch/pen stroke — waiting on axis lock.
  let stroke = null;

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.left = true;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.right = true;
  }

  function onKeyUp(event) {
    if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.left = false;
    if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.right = false;
  }

  function beginDrag(event) {
    drag = { pointerId: event.pointerId, lastX: event.clientX };
    sticky = true;
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
  }

  function endDrag(pointerId) {
    if (drag && (pointerId == null || drag.pointerId === pointerId)) drag = null;
    // sticky stays true — yaw holds for an inspect tap
  }

  function applyLookDelta(dx) {
    yaw = Math.max(-maxYaw, Math.min(maxYaw, yaw - dx * DRAG_SENS));
    sticky = true;
  }

  function onPointerDown(event) {
    if (!enabled) return;

    // Desktop: right-drag looks immediately.
    if (event.pointerType === 'mouse' && event.button === 2) {
      beginDrag(event);
      event.preventDefault();
      return;
    }

    // Touch / pen: wait for axis lock so vertical walks still scroll the page.
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      if (event.isPrimary === false) return;
      stroke = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        mode: 'pending', // pending | look | scroll
      };
    }
  }

  function onPointerMove(event) {
    if (!enabled) return;

    if (drag && event.pointerId === drag.pointerId) {
      const dx = event.clientX - drag.lastX;
      drag.lastX = event.clientX;
      applyLookDelta(dx);
      event.preventDefault();
      return;
    }

    if (!stroke || event.pointerId !== stroke.pointerId) return;

    if (stroke.mode === 'scroll') return;

    if (stroke.mode === 'look') {
      const dx = event.clientX - stroke.lastX;
      stroke.lastX = event.clientX;
      applyLookDelta(dx);
      event.preventDefault();
      return;
    }

    // pending → decide look vs scroll from the dominant axis
    const totalDx = event.clientX - stroke.startX;
    const totalDy = event.clientY - stroke.startY;
    const absX = Math.abs(totalDx);
    const absY = Math.abs(totalDy);
    if (absX < AXIS_DEADZONE && absY < AXIS_DEADZONE) return;

    if (absX > absY * AXIS_RATIO) {
      stroke.mode = 'look';
      beginDrag(event);
      applyLookDelta(totalDx);
      event.preventDefault();
    } else {
      // Vertical (or ambiguous) — leave the gesture to native scroll.
      stroke.mode = 'scroll';
    }
  }

  function onPointerUp(event) {
    if (stroke && stroke.pointerId === event.pointerId) stroke = null;
    endDrag(event.pointerId);
  }

  function onPointerCancel(event) {
    if (stroke && stroke.pointerId === event.pointerId) stroke = null;
    endDrag(event.pointerId);
  }

  function onContextMenu(event) {
    // Right-drag look; suppress the browser menu on the canvas.
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    get yaw() { return yaw; },
    get isDragging() { return Boolean(drag); },
    get isSticky() { return sticky; },
    setEnabled(value) {
      enabled = value;
      if (!value) {
        keys.left = keys.right = false;
        drag = null;
        stroke = null;
      }
    },
    reset() {
      yaw = 0;
      sticky = false;
      keys.left = keys.right = false;
      drag = null;
      stroke = null;
    },
    /** Kept for callers; walking no longer clears sticky look. */
    noteWalk(_progressDelta) {
      // Intentionally empty — scroll/walk must not snap facing back to center.
    },
    update(dt, reduced) {
      if (!enabled || reduced) {
        // Keep facing while inspect is open / look temporarily disabled.
        if (!sticky) yaw += (0 - yaw) * Math.min(1, dt * RETURN_RATE);
        return yaw;
      }
      let input = 0;
      if (keys.left) input += 1;
      if (keys.right) input -= 1;
      if (input !== 0) {
        sticky = true;
        yaw = Math.max(-maxYaw, Math.min(maxYaw, yaw + input * KEY_RATE * dt));
        // Looking back through center clears the hold so facing can rest forward.
        if (Math.abs(yaw) <= RECENTER_EPS) {
          yaw = 0;
          sticky = false;
        }
      } else if (!drag && !sticky) {
        yaw += (0 - yaw) * Math.min(1, dt * RETURN_RATE);
      }
      return yaw;
    },
    setMaxYaw(value = DEFAULT_MAX_YAW) {
      maxYaw = value;
      yaw = Math.max(-maxYaw, Math.min(maxYaw, yaw));
    },
    /** On-screen / virtual look buttons (mobile touch pad). */
    setKey(side, down) {
      if (side === 'left') keys.left = Boolean(down);
      else if (side === 'right') keys.right = Boolean(down);
      if (down) sticky = true;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    },
  };
}
