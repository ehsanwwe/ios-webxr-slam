import { EventEmitter } from './EventEmitter.js';

/**
 * Top-level WebARKit engine. Constructs and wires together the mode router,
 * tracker, renderer overlay and gesture layer. Phase 0 stub — implementation
 * lands in Phase 1 when the working sensor/camera code is ported over from
 * the reference avatar-cam.js.
 */
export class WebARKit extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.started = false;
  }

  async start() {
    throw new Error('WebARKit.start() is not implemented yet (Phase 0 stub).');
  }

  stop() {}

  dispose() {}

  getPose() {
    return null;
  }

  getReticle() {
    return null;
  }

  placeOnSurface(_object3D) {}

  enableDrag(_object3D) {}

  enableRotate(_object3D) {}
}
