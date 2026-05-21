/**
 * Decides whether to delegate to native WebXR (XRMode) or fall back to the
 * sensor + visual engine (GyroMode). Phase 0 stub — actual detection logic
 * (navigator.xr.isSessionSupported('immersive-ar') gated by APP_START_GESTURE)
 * is ported from avatar-cam.js in Phase 1.
 */
export class ModeRouter {
  static async detect() {
    return 'gyro';
  }
}
