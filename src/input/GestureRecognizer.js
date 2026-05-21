/**
 * Single-finger drag and two-finger rotate handler. Phase 0 stub —
 * Phase 1 ports attachGyroPointerHandlers() from avatar-cam.js with the
 * exact gain constants (DRAG_SENS_X = 0.006, DRAG_SENS_Y = 0.006,
 * ROTATE_GAIN = 1.0) and the gyroTwoFingerStartAngle / startYaw state.
 */
export class GestureRecognizer {
  constructor() {
    this.listeners = new Map();
  }

  attach(_element) {}

  detach() {}
}
