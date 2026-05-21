/**
 * The iOS Safari path. Owns the camera overlay, gyro tracker, gesture
 * recognizer and (later) visual tracker. Phase 0 stub — Phase 1 ports
 * the working activateGyroMode() flow from avatar-cam.js.
 */
export class GyroMode {
  constructor() {
    this.active = false;
  }

  async enter() {}

  async exit() {}
}
