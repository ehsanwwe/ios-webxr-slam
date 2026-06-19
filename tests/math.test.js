import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  deviceOrientationToQuat,
  quaternionAngle,
  normalizeRad,
} from '../src/utils/math.js';

describe('normalizeRad', () => {
  it('leaves values inside (-PI, PI] alone', () => {
    expect(normalizeRad(0)).toBe(0);
    expect(normalizeRad(1)).toBe(1);
    expect(normalizeRad(-1)).toBe(-1);
  });

  it('wraps values above PI', () => {
    expect(normalizeRad((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('wraps values below -PI', () => {
    expect(normalizeRad((-3 * Math.PI) / 2)).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('quaternionAngle', () => {
  it('returns 0 for identical quaternions', () => {
    const q = new THREE.Quaternion(0, 0, 0, 1);
    expect(quaternionAngle(q, q)).toBeCloseTo(0, 5);
  });

  it('returns PI for opposite orientations', () => {
    const a = new THREE.Quaternion(0, 0, 0, 1);
    const b = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI,
    );
    expect(quaternionAngle(a, b)).toBeCloseTo(Math.PI, 5);
  });

  it('matches a known small rotation', () => {
    const a = new THREE.Quaternion(0, 0, 0, 1);
    const b = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      0.5,
    );
    expect(quaternionAngle(a, b)).toBeCloseTo(0.5, 5);
  });
});

describe('deviceOrientationToQuat', () => {
  it('produces a unit quaternion for zero input', () => {
    const q = deviceOrientationToQuat(0, 0, 0, 0);
    const norm = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    expect(norm).toBeCloseTo(1, 5);
  });

  it('is deterministic across calls', () => {
    const a = deviceOrientationToQuat(45, 30, 10, 0);
    const b = deviceOrientationToQuat(45, 30, 10, 0);
    expect(a.x).toBeCloseTo(b.x, 5);
    expect(a.y).toBeCloseTo(b.y, 5);
    expect(a.z).toBeCloseTo(b.z, 5);
    expect(a.w).toBeCloseTo(b.w, 5);
  });

  it('writes into the provided out quaternion when given', () => {
    const out = new THREE.Quaternion();
    const r = deviceOrientationToQuat(10, 20, 30, 0, out);
    expect(r).toBe(out);
  });
});
