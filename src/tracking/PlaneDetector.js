/**
 * Accumulates tracked feature points across frames and fits horizontal
 * planes via RANSAC homography. Output drives the reticle so it snaps
 * to real surfaces (floor, table). Phase 0 stub — Phase 5.
 */
export class PlaneDetector {
  constructor() {
    this.planes = [];
  }

  ingestPoints(_points) {}

  getPlanes() {
    return this.planes;
  }
}
