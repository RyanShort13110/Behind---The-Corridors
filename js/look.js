/**
 * Limited left/right head look layered on top of the scroll camera.
 * Desktop: A/D, arrows, or right-drag.
 * Touch / pen: horizontal drag peeks; vertical drag keeps page scroll (walk).
 *
 * Pointer and keyboard look both hold after release so you can inspect.
 * Walking releases the hold and recenters.
 */
const MAX_YAW = 0.48; // ~27°
const KEY_RATE = 1.85;
const RETURN_RATE = 2.6;
const DRAG_SENS = 0.0032;
const AXIS_DEADZONE = 12; // px before committing to look vs scroll
const AXIS_RATIO = 1.2; // |dx| must beat |dy| by this factor to steal the gesture
const WALK_RELEASE = 0.004; // progress delta that drops sticky look

export function createLookControls({ canvas }) {
  const keys = { left: false, right: false };
  let yaw = 0;
  let enabled = true;
  // After touch / pen / right-drag look, keep facing until walk or keys.
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
    yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw - dx * DRAG_SENS));
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
    /** Call when the player walks; releases held look so the camera recenters.
     *  Skip while look keys/drag are active so walk + turn work together. */
    noteWalk(progressDelta) {
      if (keys.left || keys.right || drag) return;
      if (Math.abs(progressDelta) >= WALK_RELEASE) sticky = false;
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
        yaw = Math.max(-MAX_YAW, Math.min(MAX_YAW, yaw + input * KEY_RATE * dt));
      } else if (!drag && !sticky) {
        yaw += (0 - yaw) * Math.min(1, dt * RETURN_RATE);
      }
      return yaw;
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
