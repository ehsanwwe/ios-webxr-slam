import { ModeRouter } from './ModeRouter.js';
import { GyroMode } from '../modes/GyroMode.js';
import { XRMode } from '../modes/XRMode.js';
import { hasGetUserMedia, isIOS } from '../utils/platform.js';
import { requestSensorPermissions } from '../utils/permissions.js';

/** Thrown for invalid configuration or unsupported environments. */
export class WebARKitError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'WebARKitError';
  }
}

/**
 * Top-level engine. The application supplies a Three.js renderer / scene /
 * camera plus a sceneRoot to be placed, then calls start() from inside a
 * user-gesture handler.
 *
 * WebARKit picks the right runtime mode (XR for Android Chrome / any
 * immersive-ar capable browser, Gyro for iOS Safari and other fallbacks)
 * and drives it. If XR start fails for any reason (permission, hardware,
 * temporary failure), it transparently falls back to Gyro mode.
 *
 * @example
 *   const kit = new WebARKit({ renderer, camera, scene, canvas, sceneRoot });
 *   document.querySelector('#start').addEventListener('click', () => kit.start());
 */
export class WebARKit {
  /**
   * @param {object} cfg
   * @param {import('three').WebGLRenderer} cfg.renderer
   * @param {import('three').PerspectiveCamera} cfg.camera
   * @param {import('three').Scene} cfg.scene
   * @param {HTMLCanvasElement} cfg.canvas
   * @param {import('three').Object3D} [cfg.sceneRoot]
   */
  constructor(cfg) {
    if (!cfg || !cfg.renderer || !cfg.camera || !cfg.scene || !cfg.canvas) {
      throw new WebARKitError(
        'WebARKit requires { renderer, camera, scene, canvas }',
      );
    }
    this.cfg = cfg;
    this.sceneRoot = cfg.sceneRoot || null;
    /** @type {GyroMode | XRMode | null} */
    this.mode = null;
    /** @type {'xr' | 'gyro' | null} */
    this.modeName = null;

    this._onPlace = null;
    this._onBeforeRender = null;
  }

  /** @param {import('three').Object3D | null} root */
  setSceneRoot(root) {
    this.sceneRoot = root;
    if (this.mode) this.mode.setSceneRoot(root);
  }

  /** @param {()=>void} cb */
  onPlace(cb) { this._onPlace = cb; }

  /** @param {(dt:number)=>void} cb */
  onBeforeRender(cb) { this._onBeforeRender = cb; }

  /**
   * Boot the engine. Must be called from inside a user-gesture handler on
   * iOS so the DeviceMotion / DeviceOrientation permission prompts succeed.
   *
   * @returns {Promise<'xr' | 'gyro'>}  the mode that was actually started
   */
  async start() {
    if (!hasGetUserMedia()) {
      throw new WebARKitError(
        'navigator.mediaDevices.getUserMedia is not available',
      );
    }

    // Permission prompts are no-ops on platforms that don't gate the APIs,
    // so we can request them unconditionally and the gesture context is
    // preserved for the XR session request that may follow.
    await requestSensorPermissions();

    const detected = await ModeRouter.detect();

    if (detected === 'xr') {
      try {
        const xr = new XRMode({
          renderer: this.cfg.renderer,
          camera: this.cfg.camera,
          scene: this.cfg.scene,
        });
        this._wire(xr);
        await xr.start();
        this.mode = xr;
        this.modeName = 'xr';
        return 'xr';
      } catch (err) {
        // XR start can fail for transient reasons (user dismissed prompt,
        // device temporarily unavailable). Fall back to Gyro so the demo
        // still runs instead of throwing all the way out.
        // eslint-disable-next-line no-console
        console.warn('[WebARKit] XR start failed, falling back to gyro:', err);
        this.mode = null;
      }
    }

    const gyro = new GyroMode({
      renderer: this.cfg.renderer,
      camera: this.cfg.camera,
      scene: this.cfg.scene,
      canvas: this.cfg.canvas,
    });
    this._wire(gyro);
    await gyro.start();
    this.mode = gyro;
    this.modeName = 'gyro';
    return 'gyro';
  }

  stop() {
    this.mode?.stop();
    this.mode = null;
  }

  isIOS() { return isIOS(); }

  _wire(mode) {
    if (this.sceneRoot) mode.setSceneRoot(this.sceneRoot);
    if (this._onBeforeRender) mode.setBeforeRender(this._onBeforeRender);
    if (this._onPlace) mode.setOnPlace(this._onPlace);
  }
}
