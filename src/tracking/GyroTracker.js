import * as THREE from 'three';
import { deviceOrientationToQuat, quaternionAngle } from '../utils/math.js';
import { getScreenOrientationRad } from '../utils/platform.js';

/**
 * Reads DeviceOrientationEvent and exposes:
 *   - targetQuat: latest device pose, relative to the first sample after reset()
 *   - hasTarget:  whether at least one sample has been received
 *   - angularRate: most recent rotational speed in rad/s
 *
 * Calibration: the first sample after reset() defines "forward". This matches
 * the original avatar-cam.js behaviour where placement is the calibration anchor.
 */
export class GyroTracker {
  constructor() {
    this.targetQuat = new THREE.Quaternion();
    this.hasTarget = false;
    this.angularRate = 0;

    this._invInitial = null;
    this._lastSample = null;
    this._attached = false;
    this._enabled = false;
    this._scratchQNow = new THREE.Quaternion();
    this._scratchQRel = new THREE.Quaternion();

    this._onOrient = this._onOrient.bind(this);
  }

  attach() {
    if (this._attached) return;
    this._attached = true;
    window.addEventListener('deviceorientation', this._onOrient, { passive: true });
    window.addEventListener('deviceorientationabsolute', this._onOrient, { passive: true });
  }

  detach() {
    if (!this._attached) return;
    this._attached = false;
    window.removeEventListener('deviceorientation', this._onOrient);
    window.removeEventListener('deviceorientationabsolute', this._onOrient);
  }

  enable() { this._enabled = true; }
  disable() { this._enabled = false; }

  /** Drop calibration so the next sample defines the new "forward". */
  reset() {
    this._invInitial = null;
    this.hasTarget = false;
    this.targetQuat.identity();
    this.angularRate = 0;
    this._lastSample = null;
  }

  /**
   * Smoothly apply the latest target quaternion to a Three.js camera.
   *
   * @param {THREE.Camera} camera
   * @param {number} smoothing  SLERP factor 0..1. avatar-cam.js uses 0.18.
   */
  applyTo(camera, smoothing = 0.18) {
    if (!this.hasTarget) return;
    camera.quaternion.slerp(this.targetQuat, smoothing);
    camera.updateMatrixWorld(true);
  }

  _onOrient(e) {
    if (!this._enabled) return;
    if (e.alpha == null || e.beta == null || e.gamma == null) return;

    const orient = getScreenOrientationRad();
    const qNow = deviceOrientationToQuat(
      e.alpha, e.beta, e.gamma, orient, this._scratchQNow,
    );

    if (!this._invInitial) {
      this._invInitial = qNow.clone().invert();
    }
    this._scratchQRel.copy(qNow).multiply(this._invInitial);
    this.targetQuat.copy(this._scratchQRel);
    this.hasTarget = true;

    const tNow = performance.now();
    if (this._lastSample) {
      const dt = (tNow - this._lastSample.t) / 1000;
      if (dt > 0 && dt < 0.2) {
        this.angularRate = quaternionAngle(qNow, this._lastSample.q) / dt;
      }
    }
    this._lastSample = { q: qNow.clone(), t: tNow };
  }
}
