import * as THREE from 'three';

const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
// camera looks out the back of the device: rotate -PI/2 around X
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
const _scratch = new THREE.Quaternion();

/**
 * Build a Three.js quaternion from DeviceOrientation Euler angles, applying
 * the device-camera and screen-orientation corrections used by Three.js's own
 * DeviceOrientationControls. Logic is preserved verbatim from avatar-cam.js.
 *
 * @param {number} alphaDeg
 * @param {number} betaDeg
 * @param {number} gammaDeg
 * @param {number} screenOrientRad
 * @param {THREE.Quaternion} [out]
 * @returns {THREE.Quaternion}
 */
export function deviceOrientationToQuat(
  alphaDeg,
  betaDeg,
  gammaDeg,
  screenOrientRad,
  out,
) {
  const q = out || new THREE.Quaternion();
  const alpha = ((alphaDeg || 0) * Math.PI) / 180;
  const beta = ((betaDeg || 0) * Math.PI) / 180;
  const gamma = ((gammaDeg || 0) * Math.PI) / 180;

  _euler.set(beta, alpha, -gamma, 'YXZ');
  q.setFromEuler(_euler);
  q.multiply(_q1);
  q.multiply(_scratch.setFromAxisAngle(_zee, -screenOrientRad));
  return q;
}

/**
 * Angular distance between two unit quaternions, in radians.
 *
 * @param {THREE.Quaternion} a
 * @param {THREE.Quaternion} b
 * @returns {number}
 */
export function quaternionAngle(a, b) {
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  return 2 * Math.acos(Math.min(1, dot));
}

/**
 * Normalize an angle to the range (-PI, PI].
 *
 * @param {number} r
 * @returns {number}
 */
export function normalizeRad(r) {
  let n = r;
  while (n > Math.PI) n -= Math.PI * 2;
  while (n < -Math.PI) n += Math.PI * 2;
  return n;
}
