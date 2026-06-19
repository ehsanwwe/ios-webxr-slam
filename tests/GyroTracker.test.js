import { describe, it, expect } from 'vitest';
import { GyroTracker } from '../src/tracking/GyroTracker.js';

describe('GyroTracker', () => {
  it('starts with no target and zero angular rate', () => {
    const t = new GyroTracker();
    expect(t.hasTarget).toBe(false);
    expect(t.angularRate).toBe(0);
  });

  it('reset() restores initial state', () => {
    const t = new GyroTracker();
    t.targetQuat.set(0.1, 0.2, 0.3, 0.9);
    t.hasTarget = true;
    t.angularRate = 1.5;
    t.reset();
    expect(t.hasTarget).toBe(false);
    expect(t.angularRate).toBe(0);
    expect(t.targetQuat.x).toBe(0);
    expect(t.targetQuat.w).toBe(1);
  });

  it('enable/disable flip the internal flag without errors', () => {
    const t = new GyroTracker();
    expect(() => t.enable()).not.toThrow();
    expect(() => t.disable()).not.toThrow();
  });
});
