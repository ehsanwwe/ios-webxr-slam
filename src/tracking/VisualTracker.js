/**
 * Main-thread bridge to the WASM-backed visual tracker running in
 * tracking.worker.js. Receives camera frames as ImageBitmap, ships them
 * over to the worker, and emits translation deltas back into SensorFusion.
 *
 * Phase 0 stub — implementation lands in Phase 3.
 */
export class VisualTracker {
  constructor() {
    this.worker = null;
  }

  start() {}

  stop() {}

  pushFrame(_imageBitmap) {}
}
