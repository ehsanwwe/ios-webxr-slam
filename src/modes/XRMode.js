/**
 * Native WebXR delegate. Used on Android Chrome and any future iOS Safari
 * that ships immersive-ar. Phase 0 stub — Phase 2 ports the existing
 * onSelect / requestHitTestSource flow from avatar-cam.js verbatim.
 */
export class XRMode {
  constructor() {
    this.session = null;
  }

  async enter() {}

  async exit() {}
}
