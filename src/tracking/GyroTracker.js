/**
 * Device-orientation driven rotation tracker.
 *
 * Phase 0 stub. Phase 1 will port the working logic from avatar-cam.js:
 * computeDeviceQuat (YXZ euler + -π/2 X rotation + screen-orient correction),
 * resetGyroCameraCalibration, onDeviceOrientation, the GYRO_CAMERA_SMOOTHING
 * SLERP step, and the calibration quaternions (_zee, _q0, _q1, _qDevice, _qRel).
 * Do not reinvent — copy.
 */
export class GyroTracker {
  constructor() {
    this.orientationQuaternion = null;
  }

  start() {}

  stop() {}

  recalibrate() {}
}
