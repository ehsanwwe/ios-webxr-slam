/**
 * Convenience scene wrapper. Wires up the Three.js renderer, camera,
 * the user-supplied scene, and the camera overlay so the engine can
 * drive them as one unit.
 */
export class ARScene {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }

  setup(_scene, _camera, _renderer) {}

  render() {}
}
