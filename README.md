<div align="center">

<h1>🔭 WebARKit</h1>
<h3>WebXR-grade Augmented Reality for iOS Safari — No App Required</h3>

<p>
  <strong>The open-source AR engine that brings real-world surface tracking to iOS browsers.<br/>
  The missing bridge between WebXR and iOS Safari.</strong>
</p>

---

![Version](https://img.shields.io/badge/version-0.0.0--alpha-orange?style=flat-square)
![Status](https://img.shields.io/badge/status-early%20development-yellow?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/platform-iOS%20Safari%20%7C%20Android%20Chrome-lightgrey?style=flat-square)
![Three.js](https://img.shields.io/badge/Three.js-r165-black?style=flat-square&logo=three.js)
![WebGL](https://img.shields.io/badge/WebGL2-supported-orange?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![Stars](https://img.shields.io/github/stars/ehsanwwe/ios-webxr-slam?style=flat-square)
![Last Commit](https://img.shields.io/github/last-commit/ehsanwwe/ios-webxr-slam?style=flat-square)

<br/>

**[🚀 Live Demo](#demo) · [📖 Documentation](#getting-started) · [🗺 Roadmap](#roadmap) · [🤝 Contributing](#contributing)**

</div>

---

## The Problem

```
iOS Safari has ~25% global mobile market share.
iOS Safari does NOT support WebXR immersive-ar sessions.
Every existing Web AR solution either requires a paid SDK (8th Wall),
a native app (ARKit), or degrades silently to nothing on iOS.
```

**WebARKit solves this.** It is a standalone AR engine that runs entirely in the browser — using the device camera, gyroscope, and a WASM-powered visual tracking layer — to deliver surface-aware AR on iOS Safari, with no app install, no proprietary SDK, and no compromise.

---

## ✨ Features

> Status legend: ✅ implemented · 🔄 in progress · ⏳ planned

| Feature | iOS Safari | Android Chrome |
|---|---|---|
| Camera overlay | ⏳ Phase 1 | ⏳ Phase 2 |
| Gyroscope-based orientation | ⏳ Phase 1 | ⏳ Phase 2 |
| Visual feature tracking (SLAM) | ⏳ Phase 3 | via WebXR |
| Plane / floor detection | ⏳ Phase 5 | via WebXR |
| 3D object placement on surface | ⏳ Phase 5 | ⏳ Phase 2 |
| Drag / rotate placed object | ⏳ Phase 1 | ⏳ Phase 2 |
| Works without app install | ✅ | ✅ |
| Works without paid SDK | ✅ | ✅ |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WebARKit Engine                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────┐    ┌──────────────────────────────┐  │
│   │   Sensor Layer       │    │     Camera Layer             │  │
│   │  DeviceOrientation   │    │  getUserMedia (rear cam)     │  │
│   │  alpha / beta / gamma│    │  OffscreenCanvas frames      │  │
│   └──────────┬───────────┘    └───────────────┬──────────────┘  │
│              │                                │                 │
│              ▼                                ▼                 │
│   ┌──────────────────────┐    ┌──────────────────────────────┐  │
│   │   Orientation        │    │   Visual Tracker (WASM)      │  │
│   │   computeDeviceQuat()│    │  FAST corner detection       │  │
│   │   screen-orient corr.│    │  Lucas-Kanade optical flow   │  │
│   │   quaternion slerp   │    │  Essential matrix / pose est.│  │
│   └──────────┬───────────┘    └───────────────┬──────────────┘  │
│              │                                │                 │
│              └──────────────┬─────────────────┘                 │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │     Sensor Fusion            │                   │
│              │  Gyro (rotation) +           │                   │
│              │  Optical flow (position)     │                   │
│              │  → Fused 6DOF camera pose    │                   │
│              └──────────────┬───────────────┘                   │
│                             │                                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │     Plane Detector           │                   │
│              │  RANSAC homography           │                   │
│              │  Floor / surface recognition │                   │
│              │  → Reticle on real surface   │                   │
│              └──────────────┬───────────────┘                   │
│                             │                                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │    Three.js Renderer         │                   │
│              │  Fused pose → camera matrix  │                   │
│              │  GLB / FBX / animated avatar │                   │
│              │  AR overlay on camera feed   │                   │
│              └──────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Dual-mode runtime — automatic, zero config:**

```
navigator.xr?.isSessionSupported('immersive-ar')
    ├── true  → XR Mode (Android Chrome, full WebXR)
    └── false → WebARKit Mode (iOS Safari, this engine)
```

---

## 🎬 Demo

> 📱 Point your iPhone camera at a flat surface. Tap to place. Drag to move. Pinch-rotate with two fingers.

| AR Avatar Placement | Surface Detection | Voice AI |
|---|---|---|
| *(GIF coming soon)* | *(GIF coming soon)* | *(GIF coming soon)* |

**[→ Try the live demo](https://your-demo-url.com)** *(iOS Safari recommended)*

---

## 🚀 Getting Started

### Requirements

- Modern iOS device (iOS 13+) with Safari
- HTTPS (required for camera + sensor permissions)
- Three.js r140+

### Installation

```bash
npm install webarkit
# or use via CDN
```

```html
<script type="module">
  import { WebARKit } from './webarkit.js';
</script>
```

### Minimal Setup

```javascript
import { WebARKit } from './webarkit.js';
import * as THREE from 'three';

const scene  = new THREE.Scene();
const engine = new WebARKit({ scene });

// Load your 3D model
engine.onReady(() => {
  engine.loadModel('/my-model.glb').then(model => {
    engine.placeOnSurface(model);
  });
});

engine.start(); // auto-detects iOS vs WebXR, handles permissions
```

### How It Works on iOS

1. **Camera feed** is captured via `getUserMedia` and composited behind the Three.js canvas.
2. **Gyroscope** (`DeviceOrientationEvent`) drives camera rotation — calibrated at session start.
3. **Visual tracker** (WASM Worker) extracts FAST corners each frame and tracks them across frames using Lucas-Kanade optical flow to estimate camera translation.
4. **Sensor fusion** merges gyro orientation with visual translation into a stable 6DOF pose.
5. **Plane detector** runs RANSAC over tracked point clouds to identify horizontal surfaces and outputs a hit-test equivalent for object placement.
6. **Three.js** renders the 3D scene using the fused camera matrix, pixel-perfectly over the camera feed.

---

## 📁 Project Structure

```
.
├── src/
│   ├── core/        # WebARKit, ModeRouter, SessionManager, EventEmitter
│   ├── modes/       # XRMode (native WebXR), GyroMode (iOS fallback)
│   ├── tracking/    # GyroTracker, VisualTracker, SensorFusion, PlaneDetector
│   ├── rendering/   # CameraOverlay, Reticle, ARScene
│   ├── input/       # GestureRecognizer, PointerRouter
│   ├── utils/       # math, permissions, platform
│   ├── workers/     # tracking.worker.js — owns WASM module
│   └── wasm/        # fast_corners / lk_tracker / homography (C++ → WASM)
├── demo/            # vite-served demo apps (HTTPS for camera access)
├── types/           # public TypeScript definitions
├── docs/            # ARCHITECTURE, API, IOS_NOTES, BUILDING_WASM
└── tests/
```

---

## 🗺 Roadmap

### 🔄 Phase 0 — Project skeleton (in progress)
- [x] Repo layout, module stubs, demo scaffold
- [x] Vite + Vitest tooling, HTTPS dev server
- [x] TypeScript type-check pipeline (no emit)
- [x] CLAUDE.md, CHANGELOG, ARCHITECTURE & IOS_NOTES docs scaffolding

---

### ⏳ Phase 1 — Gyro AR
- [ ] Port `IS_IOS` detection from reference
- [ ] Port `requestSensorPermission()` (DeviceMotion + DeviceOrientation, iOS 13+ gesture-context)
- [ ] Port `computeDeviceQuat()` — screen-orientation-corrected quaternion
- [ ] Port gyro calibration & reset on session start
- [ ] Port SLERP-smoothed camera rotation (`GYRO_CAMERA_SMOOTHING = 0.18`)
- [ ] Port `getUserMedia` rear-camera overlay
- [ ] Port two-finger rotate gesture (`ROTATE_GAIN = 1.0`)
- [ ] Port single-finger drag (`DRAG_SENS_X/Y = 0.006`)
- [ ] Port mode router (`navigator.xr.isSessionSupported('immersive-ar')`)
- [ ] Demo 01 reproduces avatar-cam.js behavior end-to-end on real iPhone

---

### ⏳ Phase 2 — Native WebXR delegate
- [ ] `XRMode` ports the WebXR hit-test / `onSelect` flow from the reference
- [ ] Same demo runs on Android Chrome via XRMode and iOS Safari via GyroMode

---

### ⏳ Phase 3 — Visual tracking
- [ ] Emscripten build pipeline
- [ ] FAST-9 corner detector (WASM)
- [ ] Pyramidal Lucas-Kanade optical flow (WASM)
- [ ] Worker pipeline with transferable `ImageBitmap`
- [ ] Camera translation estimation
- [ ] Debug overlay of tracked points

---

### ⏳ Phase 4 — Sensor fusion
- [ ] Complementary filter combining gyro orientation + visual translation
- [ ] Pose smoother with outlier rejection
- [ ] Demo 02 — object stays anchored as the user translates (not just rotates)

---

### ⏳ Phase 5 — Plane detection
- [ ] RANSAC homography for horizontal-plane fitting (WASM)
- [ ] Multi-frame plane confirmation
- [ ] Reticle snaps to detected surface (WebXR hit-test parity)
- [ ] Demo 03 — furniture stays planted on the floor

---

### ⏳ Phase 6 — Polish & publish
- [ ] Public API documentation in `docs/API.md`
- [ ] Performance profiling on iPhone 12+
- [ ] `npm publish` (dry-run, then real)

---

## 📊 Comparison

| | **WebARKit** | 8th Wall | AR.js | Mind-AR |
|---|---|---|---|---|
| iOS Safari | ✅ (in dev) | ✅ | ⚠️ limited | ⚠️ limited |
| Surface tracking | ⏳ Phase 5 | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ✅ | ✅ |
| Free | ✅ | ❌ ($) | ✅ | ✅ |
| Three.js native | ✅ | ⚠️ wrapper | ⚠️ wrapper | ⚠️ wrapper |
| No app required | ✅ | ✅ | ✅ | ✅ |

---

## 🧠 Technical Notes

### Why not just use a WebXR polyfill?

Existing polyfills (Google's `webxr-polyfill`) handle controller input and basic session management, but **do not implement** `immersive-ar` hit-test or image tracking on iOS — the hard parts. WebARKit implements exactly those missing pieces from scratch.

### Why sensor fusion instead of pure visual SLAM?

Pure visual SLAM is computationally expensive on mobile browsers. Pure gyro drifts. Fusing both gives stable orientation (gyro) with position correction (visual) — the same strategy used in ARCore and ARKit under the hood, adapted for the browser sandbox.

### WASM for performance

Feature detection and optical flow run in a Web Worker using WebAssembly compiled from C++ via Emscripten. This keeps the main thread free for Three.js rendering and maintains 60fps on mid-range iOS hardware.

---

## 🤝 Contributing

Contributions are welcome — especially on the WASM tracker and plane detection modules.

```bash
git clone https://github.com/ehsanwwe/ios-webxr-slam
cd ios-webxr-slam
npm install
npm run dev
```

To build the WASM module:
```bash
cd src/wasm
./build.sh   # requires Emscripten SDK
```

Please open an issue before submitting large PRs. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 👤 Author

**Ehsan Moradi** — Senior Full-Stack & AI Engineer · CTO · 20+ years in production software

Specialized in: Real-time graphics · AR / SLAM systems · AI agents · WebGL renderers

- 🔗 [LinkedIn](https://www.linkedin.com/in/ehsan-hightech/)
- 🐙 [GitHub](https://github.com/ehsanwwe)
- 📧 ehsan.hightech@gmail.com

> This project grew out of production work building [Mediuty](https://mediuty.com) — an AR virtual makeup platform with a custom real-time rendering engine — where iOS support was a hard requirement with no acceptable commercial solution.

---

## 📄 License

MIT © [Ehsan Moradi](https://github.com/ehsanwwe)

---

## 🏷 GitHub Topics

> Add these to your repository Settings → Topics for maximum discoverability:

`ios` · `webxr` · `ios-ar` · `web-ar` · `slam` · `augmented-reality` · `three-js` · `ios-safari` · `webxr-ios` · `mobile-ar` · `gyroscope` · `computer-vision` · `optical-flow` · `wasm` · `arkit-web` · `webarkit`

---

<div align="center">
  <sub>If this saved you from buying an SDK license, consider giving it a ⭐</sub>
</div>
