/**
 * Composites the rear-camera video feed behind the Three.js canvas via
 * getUserMedia. Phase 0 stub — Phase 1 copies the working setup from
 * avatar-cam.js (facingMode: { exact: 'environment' }, autoplay attrs,
 * the video → canvas overlay layering).
 */
export class CameraOverlay {
  constructor() {
    this.stream = null;
    this.videoEl = null;
  }

  async attach(_container) {}

  detach() {}
}
