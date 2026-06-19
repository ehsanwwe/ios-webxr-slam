import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { XRMode } from '../src/modes/XRMode.js';

function fakeCtx() {
  return {
    renderer: { xr: { enabled: false, setSession: async () => {} }, render: () => {}, setAnimationLoop: () => {} },
    camera: new THREE.PerspectiveCamera(),
    scene: new THREE.Scene(),
  };
}

describe('XRMode', () => {
  it('starts with no session, no reticle, not placed', () => {
    const m = new XRMode(fakeCtx());
    expect(m.session).toBeNull();
    expect(m.reticle).toBeNull();
    expect(m.isPlaced).toBe(false);
    expect(m.active).toBe(false);
  });

  it('setSceneRoot updates the reference', () => {
    const m = new XRMode(fakeCtx());
    const root = new THREE.Group();
    m.setSceneRoot(root);
    expect(m.sceneRoot).toBe(root);
  });

  it('setBeforeRender and setOnPlace store callbacks', () => {
    const m = new XRMode(fakeCtx());
    const before = () => {};
    const place = () => {};
    m.setBeforeRender(before);
    m.setOnPlace(place);
    expect(m._beforeRender).toBe(before);
    expect(m._onPlace).toBe(place);
  });

  it('throws on start() when navigator.xr is unavailable', async () => {
    const m = new XRMode(fakeCtx());
    const prev = globalThis.navigator;
    // simulate environment without WebXR
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { ...prev, xr: undefined },
    });
    try {
      await expect(m.start()).rejects.toThrow(/WebXR not available/);
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: prev,
      });
    }
  });
});
