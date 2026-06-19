/**
 * Surface indicator shown to the user before placement. In Phase 1 this
 * is a fixed-distance placeholder at GYRO_OBJECT_Z = -14.5, matching the
 * reference. Phase 5 replaces it with a real hit-test against detected
 * planes.
 */
export class Reticle {
  constructor() {
    this.object3D = null;
  }

  setPose(_position, _normal) {}

  show() {}

  hide() {}
}
