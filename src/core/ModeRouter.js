/**
 * Picks which runtime mode WebARKit should run in. Must be called from a
 * secure context (HTTPS) — navigator.xr.isSessionSupported() requires it.
 */
export class ModeRouter {
  /**
   * @returns {Promise<'xr' | 'gyro'>}
   */
  static async detect() {
    if (navigator.xr) {
      try {
        const ok = await navigator.xr.isSessionSupported('immersive-ar');
        if (ok) return 'xr';
      } catch {
        // fall through to gyro
      }
    }
    return 'gyro';
  }
}
