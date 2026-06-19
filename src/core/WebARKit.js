import { ModeRouter } from './ModeRouter.js';
import { GyroMode } from '../modes/GyroMode.js';
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
 * WebARKit picks the right runtime mode (XR for Android Chrome, Gyro for
 * iOS Safari) and drives it. The XR delegate arrives in Phase 2 — for now
 * everything routes to GyroMode.
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
    /** @type {GyroMode | null} */
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
   * @returns {Promise<'xr' | 'gyro'>}  the mode that was started
   */
  async start() {
    if (!hasGetUserMedia()) {
      throw new WebARKitError(
        'navigator.mediaDevices.getUserMedia is not available',
      );
    }
    await requestSensorPermissions();

    this.modeName = await ModeRouter.detect();

    if (this.modeName === 'xr') {
      // Phase 2: XRMode not yet implemented. Fall back so demos still run.
      this.modeName = 'gyro';
    }

    this.mode = new GyroMode({
      renderer: this.cfg.renderer,
      camera: this.cfg.camera,
      scene: this.cfg.scene,
      canvas: this.cfg.canvas,
    });
    if (this.sceneRoot) this.mode.setSceneRoot(this.sceneRoot);
    if (this._onBeforeRender) this.mode.setBeforeRender(this._onBeforeRender);
    if (this._onPlace) this.mode.setOnPlace(this._onPlace);

    await this.mode.start();
    return this.modeName;
  }

  stop() {
    this.mode?.stop();
    this.mode = null;
  }

  isIOS() { return isIOS(); }
}
