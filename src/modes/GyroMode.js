import * as THREE from 'three';
import { CameraOverlay } from '../rendering/CameraOverlay.js';
import { GyroTracker } from '../tracking/GyroTracker.js';
import { GestureRecognizer } from '../input/GestureRecognizer.js';

const GYRO_SMOOTHING = 0.18;

/** Placeholder placement until Phase 5 plane detection arrives. */
const PLACEMENT_DEFAULT = { x: 0, y: -1.7, z: -14.5, rotX: 0.30 };

/**
 * iOS / non-WebXR runtime path.
 *
 * Owns the camera overlay, gyro tracker, gesture recognizer, and a small
 * render loop. A scene root passed in via setSceneRoot() is placed in front
 * of the camera on first tap and then dragged / rotated by user gestures.
 *
 * Phase 3 hooks a VisualTracker in via setVisualTracker() — when present,
 * its per-frame velocity is rotated into world space and added to the
 * camera position, giving translational tracking.
 */
export class GyroMode {
  /**
   * @param {object} ctx
   * @param {THREE.WebGLRenderer} ctx.renderer
   * @param {THREE.PerspectiveCamera} ctx.camera
   * @param {THREE.Scene} ctx.scene
   * @param {HTMLCanvasElement} ctx.canvas
   */
  constructor(ctx) {
    this.renderer = ctx.renderer;
    this.camera = ctx.camera;
    this.scene = ctx.scene;
    this.canvas = ctx.canvas;

    this.overlay = new CameraOverlay();
    this.gyro = new GyroTracker();
    this.gestures = new GestureRecognizer(this.canvas, {
      onTap: (x, y) => this._handleTap(x, y),
    });

    /** Phase 3 — set externally; must expose update() and reset(). */
    this.visual = null;

    /** @type {THREE.Object3D | null} */
    this.sceneRoot = null;
    this.isPlaced = false;
    this.active = false;

    this._clock = new THREE.Clock();
    this._localVel = new THREE.Vector3();
    this._beforeRender = null;
    this._onPlace = null;

    this._renderLoop = this._renderLoop.bind(this);
  }

  /** The container that will be placed/dragged. Set before start(). */
  setSceneRoot(root) {
    this.sceneRoot = root;
    this.gestures.setTarget(root);
  }

  /** @param {(dt:number)=>void} cb */
  setBeforeRender(cb) { this._beforeRender = cb; }

  /** @param {()=>void} cb */
  setOnPlace(cb) { this._onPlace = cb; }

  /**
   * Phase 3 hook — a VisualTracker instance with .update() returning
   * { vx, vy, vz } in camera-local frame, .reset(), and optionally
   * .setGyroRate(rad/s).
   */
  setVisualTracker(tracker) { this.visual = tracker; }

  async start() {
    if (this.active) return;
    this.active = true;

    await this.overlay.start();
    this.overlay.layoutCanvas(this.canvas);

    this.gyro.attach();
    this.gyro.enable();
    this.gyro.reset();

    this.gestures.attach();
    this.gestures.enable();

    this.camera.matrixAutoUpdate = true;
    this.camera.position.set(0, 0, 0);
    this.camera.quaternion.identity();
    this.camera.updateMatrixWorld(true);

    this._renderLoop();
  }

  stop() {
    this.active = false;
    this.gyro.disable();
    this.gyro.detach();
    this.gestures.disable();
    this.gestures.detach();
    this.overlay.stop();
  }

  _handleTap() {
    if (!this.isPlaced) this._place();
  }

  _place(opts = PLACEMENT_DEFAULT) {
    if (this.isPlaced || !this.sceneRoot) return;
    this.isPlaced = true;

    this.camera.position.set(0, 0, 0);
    this.camera.quaternion.identity();
    this.camera.updateMatrixWorld(true);
    this.gyro.reset();

    if (!this.sceneRoot.parent) this.scene.add(this.sceneRoot);
    this.sceneRoot.position.set(opts.x, opts.y, opts.z);
    this.sceneRoot.rotation.set(opts.rotX, 0, 0);

    if (this.visual?.reset) this.visual.reset();
    if (this._onPlace) this._onPlace();
  }

  _renderLoop() {
    if (!this.active) return;
    requestAnimationFrame(this._renderLoop);

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    const dt = this._clock.getDelta();
    if (this._beforeRender) this._beforeRender(dt);

    if (this.isPlaced) {
      this.gyro.applyTo(this.camera, GYRO_SMOOTHING);

      if (this.visual) {
        this.visual.setGyroRate?.(this.gyro.angularRate);
        const out = this.visual.update();
        if (out) {
          this._localVel
            .set(out.vx, out.vy, out.vz)
            .applyQuaternion(this.camera.quaternion);
          this.camera.position.add(this._localVel);
          this.camera.updateMatrixWorld(true);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
