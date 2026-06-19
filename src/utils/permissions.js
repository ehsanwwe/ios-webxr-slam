/**
 * Thrown when the user denies a required permission, so callers can
 * distinguish denial from generic errors.
 */
export class PermissionDeniedError extends Error {
  /**
   * @param {string} which  The permission that was denied.
   */
  constructor(which) {
    super(`Permission denied: ${which}`);
    this.name = 'PermissionDeniedError';
    this.which = which;
  }
}

/**
 * Request DeviceMotion and DeviceOrientation permissions.
 *
 * Must be called from inside a user-gesture handler on iOS 13+, otherwise
 * the prompt is silently rejected. No-op on platforms that don't gate the
 * APIs behind requestPermission.
 *
 * @returns {Promise<void>}
 * @throws {PermissionDeniedError}
 */
export async function requestSensorPermissions() {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    const r = await DeviceMotionEvent.requestPermission();
    if (r !== 'granted') throw new PermissionDeniedError('DeviceMotion');
  }
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    const r = await DeviceOrientationEvent.requestPermission();
    if (r !== 'granted') throw new PermissionDeniedError('DeviceOrientation');
  }
}
