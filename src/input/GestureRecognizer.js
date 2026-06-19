import * as THREE from 'three';
import { normalizeRad } from '../utils/math.js';

const DRAG_SENS_X = 0.006;
const DRAG_SENS_Y = 0.006;
const ROTATE_GAIN = 1.0;
const TAP_MOVE_THRESHOLD_PX2 = 64; // (8 px)^2

/**
 * Pointer handling for the gyro AR mode:
 *   - single-finger drag → translate the target Object3D in its X/Z plane
 *   - two-finger drag    → yaw the target around Y
 *   - quick tap (no drag) → onTap(x, y) callback
 *
 * Sensitivities match avatar-cam.js exactly.
 */
export class GestureRecognizer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {number} [opts.dragSensX]
   * @param {number} [opts.dragSensY]
   * @param {number} [opts.rotateGain]
   * @param {(x:number,y:number)=>void} [opts.onTap]
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.dragSensX = opts.dragSensX ?? DRAG_SENS_X;
    this.dragSensY = opts.dragSensY ?? DRAG_SENS_Y;
    this.rotateGain = opts.rotateGain ?? ROTATE_GAIN;
    this.onTap = opts.onTap || null;

    /** @type {THREE.Object3D | null} */
    this.target = null;
    this.enabled = false;

    this._pointers = new Map();
    this._dragId = null;
    this._dragStart = { x: 0, y: 0 };
    this._posAtDragStart = new THREE.Vector3();

    this._twoFingerActive = false;
    this._twoFingerStartAngle = 0;
    this._twoFingerStartYaw = 0;

    this._tapCandidate = null;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onCancel = this._onCancel.bind(this);
  }

  /**
   * The Object3D that drag / rotate gestures should manipulate.
   * Set after placement.
   *
   * @param {THREE.Object3D | null} obj
   */
  setTarget(obj) {
    this.target = obj;
  }

  attach() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this._onDown, { passive: false });
    c.addEventListener('pointermove', this._onMove, { passive: false });
    c.addEventListener('pointerup', this._onUp, { passive: false });
    c.addEventListener('pointercancel', this._onCancel, { passive: false });
  }

  detach() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._onDown);
    c.removeEventListener('pointermove', this._onMove);
    c.removeEventListener('pointerup', this._onUp);
    c.removeEventListener('pointercancel', this._onCancel);
  }

  enable() { this.enabled = true; }

  disable() {
    this.enabled = false;
    this._pointers.clear();
    this._dragId = null;
    this._twoFingerActive = false;
    this._tapCandidate = null;
  }

  _onDown(e) {
    if (!this.enabled) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.canvas.setPointerCapture?.(e.pointerId);

    if (this._pointers.size === 2 && this.target) {
      this._twoFingerActive = true;
      const pts = [...this._pointers.values()];
      this._twoFingerStartAngle = Math.atan2(
        pts[1].y - pts[0].y,
        pts[1].x - pts[0].x,
      );
      this._twoFingerStartYaw = this.target.rotation.y;
      this._dragId = null;
      this._tapCandidate = null;
      return;
    }

    if (this.target) {
      this._dragId = e.pointerId;
      this._dragStart.x = e.clientX;
      this._dragStart.y = e.clientY;
      this._posAtDragStart.copy(this.target.position);
    }
    this._tapCandidate = { x: e.clientX, y: e.clientY, moved: false };
  }

  _onMove(e) {
    if (!this.enabled) return;
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._tapCandidate) {
      const dx = e.clientX - this._tapCandidate.x;
      const dy = e.clientY - this._tapCandidate.y;
      if (dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX2) {
        this._tapCandidate.moved = true;
      }
    }

    if (!this.target) return;

    if (this._pointers.size >= 2) {
      this._twoFingerActive = true;
      const pts = [...this._pointers.values()].slice(0, 2);
      const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const dYaw = normalizeRad(ang - this._twoFingerStartAngle);
      this.target.rotation.y = this._twoFingerStartYaw + dYaw * this.rotateGain;
      return;
    }

    if (this._dragId === e.pointerId) {
      const dx = e.clientX - this._dragStart.x;
      const dy = e.clientY - this._dragStart.y;
      this.target.position.x = this._posAtDragStart.x + dx * this.dragSensX;
      this.target.position.z = this._posAtDragStart.z + dy * this.dragSensY;
    }
  }

  _onUp(e) {
    if (!this.enabled) return;
    this._pointers.delete(e.pointerId);

    if (this._dragId === e.pointerId) this._dragId = null;
    if (this._pointers.size < 2) this._twoFingerActive = false;

    if (this._tapCandidate && !this._tapCandidate.moved && this.onTap) {
      this.onTap(this._tapCandidate.x, this._tapCandidate.y);
    }
    this._tapCandidate = null;
  }

  _onCancel(e) {
    this._pointers.delete(e.pointerId);
    this._dragId = null;
    this._twoFingerActive = false;
    this._tapCandidate = null;
  }
}
