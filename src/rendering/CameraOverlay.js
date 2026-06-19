/**
 * Owns the rear-camera <video> element that backs the AR feed in non-WebXR
 * modes. The video sits at z-index 0; the WebGL canvas is overlaid on top at
 * z-index 10.
 */
export class CameraOverlay {
  constructor() {
    /** @type {HTMLVideoElement | null} */
    this.videoEl = null;
    /** @type {MediaStream | null} */
    this.stream = null;
  }

  /**
   * Position the THREE canvas so it overlays the video correctly.
   * Idempotent.
   *
   * @param {HTMLCanvasElement} canvas
   */
  layoutCanvas(canvas) {
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '10';
    canvas.style.touchAction = 'none';
  }

  /**
   * Start the rear-camera stream and return the <video> element. Idempotent —
   * a second call reuses the existing stream.
   *
   * @returns {Promise<HTMLVideoElement>}
   */
  async start() {
    const v = this._ensureVideoElement();
    if (this.stream) return v;

    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    v.srcObject = this.stream;
    try {
      await v.play();
    } catch {
      // some browsers reject play() promises silently — ignore
    }
    return v;
  }

  /** Stop all tracks and forget the stream. The <video> element stays attached. */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  getElement() {
    return this.videoEl;
  }

  _ensureVideoElement() {
    if (this.videoEl) return this.videoEl;
    const v = document.createElement('video');
    v.setAttribute('playsinline', 'true');
    v.setAttribute('webkit-playsinline', 'true');
    v.autoplay = true;
    v.muted = true;
    Object.assign(v.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: '0',
    });
    document.body.appendChild(v);
    this.videoEl = v;
    return v;
  }
}
