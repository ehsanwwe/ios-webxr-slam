/**
 * Math helpers used across the engine. Quaternion / euler ops here are
 * thin wrappers around Three.js where possible; everything that touches
 * sensor data needs to match the reference avatar-cam.js exactly.
 */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
