/**
 * Fuses gyro orientation with visual translation into a single 6DOF pose.
 * Phase 0 stub — Phase 4 implements the complementary filter. The choice
 * of complementary over Kalman is intentional (see docs/ARCHITECTURE.md).
 */
export class SensorFusion {
  constructor() {
    this.pose = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  }

  update(_orientationQuat, _translationDelta) {}

  getPose() {
    return this.pose;
  }
}
