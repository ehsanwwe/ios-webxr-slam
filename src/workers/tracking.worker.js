/**
 * Owns the WASM CV module and processes incoming camera frames off the
 * main thread. Phase 0 stub.
 */

self.onmessage = (event) => {
  const { type } = event.data ?? {};
  if (type === 'ping') {
    self.postMessage({ type: 'pong' });
  }
};
