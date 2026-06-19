/**
 * Platform / capability detection. The IS_IOS check in Phase 1 must be
 * copied verbatim from avatar-cam.js (it includes the iPadOS 13+
 * MacIntel trick — desktop Safari spoofs the UA there).
 */

export function isIOS() {
  // Phase 0 placeholder. Phase 1 replaces this with the verbatim port.
  return false;
}

export async function hasImmersiveAR() {
  if (typeof navigator === 'undefined' || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}
