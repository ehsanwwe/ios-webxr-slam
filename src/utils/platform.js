/**
 * Best-effort iOS / iPadOS detection.
 * iPadOS 13+ reports navigator.platform === 'MacIntel'; combine with
 * maxTouchPoints to disambiguate from desktop macOS.
 *
 * @returns {boolean}
 */
export function isIOS() {
  const ua = navigator.userAgent || '';
  const iOSByUA = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13Plus =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSByUA || iPadOS13Plus;
}

/**
 * Screen orientation in radians, with a fallback to window.orientation
 * because some iOS versions return 0 from screen.orientation.angle.
 *
 * @returns {number}
 */
export function getScreenOrientationRad() {
  const angle =
    screen.orientation && typeof screen.orientation.angle === 'number'
      ? screen.orientation.angle
      : typeof window.orientation === 'number'
        ? window.orientation
        : 0;
  return ((angle || 0) * Math.PI) / 180;
}

/** Whether MediaDevices.getUserMedia is available at all. */
export function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
