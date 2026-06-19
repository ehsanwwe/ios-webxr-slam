import * as THREE from 'three';

/**
 * Native WebXR runtime mode. Handles the immersive-ar session lifecycle,
 * a hit-test driven reticle for placement, and transient-input hit testing
 * for dragging the placed scene root.
 *
 * The Three.js camera projection is handled automatically once
 * renderer.xr.setSession() is called — we just need to drive the render
 * loop via setAnimationLoop() and react to XR events.
 *
 * Two-finger rotate is intentionally deferred to a follow-up — WebXR's
 * multi-touch surface via screen-mode XRInputSources is non-trivial and
 * not required for Phase 2's "feature parity" bar (single-touch place +
 * drag is the parity target with hit-test).
 */
export class XRMode {
  /**
   * @param {object} ctx
   * @param {import('three').WebGLRenderer} ctx.renderer
   * @param {import('three').PerspectiveCamera} ctx.camera
   * @param {import('three').Scene} ctx.scene
   */
  constructor(ctx) {
    this.renderer = ctx.renderer;
    this.camera = ctx.camera;
    this.scene = ctx.scene;

    /** @type {import('three').Object3D | null} */
    this.sceneRoot = null;
    /** @type {XRSession | null} */
    this.session = null;
    /** @type {XRReferenceSpace | null} */
    this.refSpace = null;
    /** @type {XRReferenceSpace | null} */
    this.viewerSpace = null;
    /** @type {XRHitTestSource | null} */
    this.hitTestSource = null;

    /** @type {THREE.Mesh | null} */
    this.reticle = null;
    this.isPlaced = false;
    this.active = false;

    this._beforeRender = null;
    this._onPlace = null;

    /** @type {XRTransientInputHitTestSource | null} */
    this._dragHitTestSource = null;
    this._dragOffset = new THREE.Vector3();
    this._dragOffsetReady = false;
    this._dragFixedY = 0;
    this._lastT = 0;

    this._onAnimationFrame = this._onAnimationFrame.bind(this);
    this._onSelectStart = this._onSelectStart.bind(this);
    this._onSelectEnd = this._onSelectEnd.bind(this);
    this._onSelect = this._onSelect.bind(this);
    this._onSessionEnd = this._onSessionEnd.bind(this);
  }

  /** The container that will be placed and dragged. Set before start(). */
  setSceneRoot(root) { this.sceneRoot = root; }

  /** @param {(dt:number)=>void} cb */
  setBeforeRender(cb) { this._beforeRender = cb; }

  /** @param {()=>void} cb */
  setOnPlace(cb) { this._onPlace = cb; }

  async start() {
    if (this.active) return;
    if (!navigator.xr) throw new Error('WebXR not available');

    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local', 'hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    });
    this.session = session;
    this.active = true;

    this.renderer.xr.enabled = true;
    await this.renderer.xr.setSession(session);

    this.refSpace = await session.requestReferenceSpace('local');
    this.viewerSpace = await session.requestReferenceSpace('viewer');
    this.hitTestSource = await session.requestHitTestSource({
      space: this.viewerSpace,
    });

    this.reticle = this._buildReticle();
    this.scene.add(this.reticle);

    session.addEventListener('selectstart', this._onSelectStart);
    session.addEventListener('selectend', this._onSelectEnd);
    session.addEventListener('select', this._onSelect);
    session.addEventListener('end', this._onSessionEnd);

    this.renderer.setAnimationLoop(this._onAnimationFrame);
  }

  async stop() {
    try { await this.session?.end(); } catch { /* ignore */ }
  }

  _buildReticle() {
    const geometry = new THREE.RingGeometry(0.10, 0.13, 32)
      .rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const ring = new THREE.Mesh(geometry, material);
    ring.matrixAutoUpdate = false;
    ring.visible = false;
    return ring;
  }

  _onAnimationFrame(time, frame) {
    if (!this.active || !this.session || !frame) return;

    const dt = this._lastT ? (time - this._lastT) / 1000 : 0;
    this._lastT = time;

    if (this._beforeRender) this._beforeRender(dt);

    // Reticle hit-test while not placed.
    if (!this.isPlaced && this.hitTestSource && this.refSpace && this.reticle) {
      const results = frame.getHitTestResults(this.hitTestSource);
      if (results.length > 0) {
        const pose = results[0].getPose(this.refSpace);
        if (pose) {
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        this.reticle.visible = false;
      }
    } else if (this.reticle && this.reticle.visible) {
      this.reticle.visible = false;
    }

    // Transient-input drag for moving a placed scene root.
    if (this._dragHitTestSource && this.sceneRoot && this.refSpace) {
      const transient = frame.getHitTestResultsForTransientInput(
        this._dragHitTestSource,
      );
      if (transient.length > 0 && transient[0].results.length > 0) {
        const pose = transient[0].results[0].getPose(this.refSpace);
        if (pose) {
          const hx = pose.transform.position.x;
          const hz = pose.transform.position.z;
          if (!this._dragOffsetReady) {
            this._dragOffset.set(
              this.sceneRoot.position.x - hx,
              0,
              this.sceneRoot.position.z - hz,
            );
            this._dragOffsetReady = true;
          } else {
            this.sceneRoot.position.set(
              hx + this._dragOffset.x,
              this._dragFixedY,
              hz + this._dragOffset.z,
            );
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _onSelect() {
    if (this.isPlaced) return;
    if (!this.reticle || !this.reticle.visible || !this.sceneRoot) return;

    this.isPlaced = true;
    this.reticle.visible = false;

    if (!this.sceneRoot.parent) this.scene.add(this.sceneRoot);
    this.sceneRoot.position.setFromMatrixPosition(this.reticle.matrix);
    this.sceneRoot.rotation.set(0, 0, 0);

    if (this._onPlace) this._onPlace();
  }

  _onSelectStart() {
    if (!this.isPlaced || !this.sceneRoot || !this.session) return;
    this._dragFixedY = this.sceneRoot.position.y;
    this._dragOffsetReady = false;

    if (typeof this.session.requestHitTestSourceForTransientInput === 'function') {
      this.session.requestHitTestSourceForTransientInput({
        profile: 'generic-touchscreen',
      })
        .then((src) => { this._dragHitTestSource = src; })
        .catch(() => { /* device doesn't support transient hit-test */ });
    }
  }

  _onSelectEnd() {
    if (this._dragHitTestSource) {
      try { this._dragHitTestSource.cancel?.(); } catch { /* ignore */ }
      this._dragHitTestSource = null;
    }
    this._dragOffsetReady = false;
  }

  _onSessionEnd() {
    this.active = false;
    this.session = null;
    this.refSpace = null;
    this.viewerSpace = null;

    if (this.hitTestSource) {
      try { this.hitTestSource.cancel?.(); } catch { /* ignore */ }
      this.hitTestSource = null;
    }
    if (this._dragHitTestSource) {
      try { this._dragHitTestSource.cancel?.(); } catch { /* ignore */ }
      this._dragHitTestSource = null;
    }
    if (this.reticle && this.reticle.parent) {
      this.reticle.parent.remove(this.reticle);
    }

    this.renderer.setAnimationLoop(null);
  }
}
