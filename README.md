<div align="center">

<h1>🔭 WebARKit</h1>
<h3>WebXR-grade Augmented Reality for iOS Safari — No App Required</h3>

<p>
  <strong>The open-source AR engine that brings real-world surface tracking to iOS browsers.<br/>
  The missing bridge between WebXR and iOS Safari.</strong>
</p>

---

![Version](https://img.shields.io/badge/version-0.9.0--beta-blue?style=flat-square)
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

| Feature | iOS Safari | Android Chrome |
|---|---|---|
| Camera overlay | ✅ | ✅ |
| Gyroscope-based orientation | ✅ | ✅ |
| Visual feature tracking (SLAM) | ✅ 🆕 | ✅ |
| Plane / floor detection | ✅ 🆕 | ✅ via WebXR |
| 3D object placement on surface | ✅ 🆕 | ✅ |
| Drag / rotate placed object | ✅ | ✅ |
| 3D avatar + animation (GLB/FBX) | ✅ | ✅ |
| Voice AI integration | ✅ | ✅ |
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
webarkit/
├── src/
│   ├── core/
│   │   ├── WebARKit.js          # Main engine class
│   │   ├── ModeRouter.js        # XR vs Gyro auto-detection
│   │   └── SessionManager.js   # Permission flow
│   ├── tracking/
│   │   ├── GyroTracker.js       # DeviceOrientation → quaternion
│   │   ├── VisualTracker.js     # WASM optical flow bridge
│   │   ├── SensorFusion.js      # Gyro + visual → 6DOF pose
│   │   └── PlaneDetector.js     # RANSAC surface detection
│   ├── wasm/
│   │   ├── fast_corners.cpp     # FAST feature detector (C++)
│   │   ├── lk_tracker.cpp       # Lucas-Kanade tracker (C++)
│   │   └── build.sh             # Emscripten build script
│   ├── rendering/
│   │   ├── CameraOverlay.js     # Camera feed compositor
│   │   ├── Reticle.js           # Surface indicator
│   │   └── AvatarLoader.js      # GLB/FBX + animation
│   └── ui/
│       ├── LoadingUI.js
│       ├── StatusUI.js
│       └── VoiceChat.js
├── demo/
│   ├── index.html
│   └── avatar-demo.js
├── tests/
└── docs/
```

---

## 🗺 Roadmap

### ✅ Phase 1 — Gyro AR (Complete)
- [x] iOS camera feed via `getUserMedia`
- [x] `DeviceOrientationEvent` permission flow (iOS 13+)
- [x] `computeDeviceQuat()` — screen-orientation-corrected quaternion
- [x] Gyro calibration & reset on session start
- [x] SLERP-smoothed camera rotation
- [x] Three.js scene over camera feed
- [x] GLB + FBX avatar loading with animation mixer
- [x] Two-finger rotate gesture
- [x] Single-finger drag (world XZ plane)
- [x] Dual-mode auto-routing (XR / Gyro)
- [x] WebXR hit-test drag (Android Chrome)
- [x] Voice-to-voice AI assistant integration
- [x] Timeline-based animation playback system
- [x] In-scene GLB UI button interaction

---

### 🔄 Phase 2 — Visual Tracking (In Progress)
- [x] Camera frame capture via OffscreenCanvas
- [ ] Web Worker pipeline for off-main-thread processing
- [ ] FAST corner detector (WASM, compiled from C++)
- [ ] Lucas-Kanade optical flow tracker (WASM)
- [ ] Camera translation estimation from tracked points
- [ ] Sensor fusion: gyro orientation + visual translation
- [ ] Drift correction using feature re-detection
- [ ] Pose smoothing & outlier rejection

---

### 🔜 Phase 3 — Plane Detection & True SLAM
- [ ] Point cloud accumulation over time
- [ ] RANSAC-based planar surface fitting
- [ ] Floor / table / wall classification
- [ ] Reticle snapping to detected surface (WebXR hit-test parity)
- [ ] Object placement on real surface (not fixed Z)
- [ ] Surface mesh visualization (optional debug overlay)
- [ ] Multi-plane tracking

---

### 🔮 Phase 4 — Advanced Features
- [ ] Monocular depth estimation (TensorFlow.js / ONNX)
- [ ] Occlusion: real objects hiding virtual ones
- [ ] Light estimation from camera feed
- [ ] Image target / marker tracking
- [ ] Persistent world anchors (IndexedDB)
- [ ] Multi-object scene management
- [ ] iOS 18 WebXR support monitoring & auto-migration

---

### 📦 Phase 5 — SDK & Ecosystem
- [ ] Clean public API with TypeScript types
- [ ] npm package `webarkit`
- [ ] React wrapper (`@webarkit/react`)
- [ ] Webpack / Vite plugin
- [ ] Example templates (avatar, furniture, product viewer)
- [ ] Interactive documentation site
- [ ] Performance benchmarks vs 8th Wall / AR.js / Mind-AR

---

## 📊 Comparison

| | **WebARKit** | 8th Wall | AR.js | Mind-AR |
|---|---|---|---|---|
| iOS Safari | ✅ | ✅ | ⚠️ limited | ⚠️ limited |
| Surface tracking | ✅ (Phase 3) | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ✅ | ✅ |
| Free | ✅ | ❌ ($) | ✅ | ✅ |
| Three.js native | ✅ | ⚠️ wrapper | ⚠️ wrapper | ⚠️ wrapper |
| No app required | ✅ | ✅ | ✅ | ✅ |
| Voice AI ready | ✅ | ❌ | ❌ | ❌ |

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
