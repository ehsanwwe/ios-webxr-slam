/**
 * Tiny pub/sub used by the engine to surface lifecycle events
 * (mode-changed, surface-detected, pose-updated) to consumers without
 * pulling in a dependency.
 */
export class EventEmitter {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    let bucket = this._handlers.get(event);
    if (!bucket) {
      bucket = new Set();
      this._handlers.set(event, bucket);
    }
    bucket.add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const bucket = this._handlers.get(event);
    if (!bucket) return;
    for (const handler of bucket) {
      handler(payload);
    }
  }

  removeAllListeners() {
    this._handlers.clear();
  }
}
