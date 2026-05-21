# Architecture

This document describes the runtime shape of WebARKit. The audience is a new
contributor who needs to make sense of the codebase quickly. For the public
API, see `docs/API.md`. For iOS-specific quirks discovered along the way, see
`docs/IOS_NOTES.md`.

## High-level shape

WebARKit is a Three.js-native AR engine with two runtime modes:

```
WebARKit.start()
   │
   ▼
ModeRouter.detect()
   │
   ├── navigator.xr exists && immersive-ar supported  →  XRMode (native WebXR)
   │
   └── otherwise (iOS Safari and friends)             →  GyroMode (custom engine)
```

`XRMode` is a thin delegate to the WebXR API: session start, hit-test source
setup, reticle from hit-test pose, `onSelect` to drop objects.

`GyroMode` is the substance of the project. It owns:

1. **CameraOverlay** — `getUserMedia` rear-camera stream composited behind the
   Three.js canvas.
2. **GyroTracker** — `DeviceOrientationEvent` → camera quaternion. The math
   is ported verbatim from the reference `avatar-cam.js`.
3. **VisualTracker** — bridges to a worker that runs WASM-backed FAST + LK
   optical flow on incoming frames. Outputs translation deltas.
4. **SensorFusion** — combines gyro rotation with visual translation into a
   stable 6DOF pose.
5. **PlaneDetector** — accumulates tracked points and fits planes via RANSAC
   homography. Output drives the reticle.
6. **GestureRecognizer** — tap / drag / two-finger rotate.

## Why this split

The single biggest risk on iOS is the sensor + camera setup. That code took
significant trial-and-error to get right and lives in `avatar-cam.js`. The
module structure exists to preserve that working code as-is while bolting on
the new SLAM layer (visual tracker, fusion, plane detection) cleanly above it.

## Threading model

- **Main thread:** Three.js render loop, UI, sensor listeners, gestures.
- **Worker thread:** owned by `VisualTracker`, runs the WASM CV module.
- **Frames:** main → worker via `postMessage` with transferable `ImageBitmap`.
  This avoids copying pixel buffers across the boundary and keeps GC pressure
  low.
- **Pose deltas:** worker → main via `postMessage` (small, no transfer).

Target budget: 60fps on iPhone 12+. The worker runs at ~15fps for vision —
sensor fusion interpolates rotation between visual updates.

## Data flow (Gyro mode)

```
DeviceOrientation events ──► GyroTracker ──► orientationQuat
                                                  │
ImageBitmap frames        ──► VisualTracker ──► translationDelta
                                                  │
                                                  ▼
                                             SensorFusion ──► 6DOF pose
                                                  │
                                                  ▼
                                             PoseSmoother ──► Three.js camera
                                                  │
                                                  ▼
                                             PlaneDetector ──► Reticle hit-test
```

## Key design decisions

| Decision | Rationale |
|---|---|
| Complementary filter, not Kalman | Simpler, fits the browser budget. Gyro gives rotation; vision gives slow position correction. EKF was considered and rejected as overkill. |
| Three.js as peer dep | Consumers already have a Three.js version. Bundling would explode the package size and risk version conflicts. |
| WASM via Emscripten | Pure JS FAST + LK is too slow on iOS for 60fps. WebGL-based optical flow was considered; rejected because main-thread GL conflicts with the render loop. |
| Worker owns WASM | Keeps the main thread free for rendering and sensor handling. |
| Transferable `ImageBitmap` | Zero-copy frame transfer; raw `Uint8ClampedArray` was measured at 4–6ms per frame just for copy overhead on iPhone 11. |
| Single `main` branch | Solo project. Linear history reads better. |

## Public API surface

See `docs/API.md` and `types/index.d.ts`.

Summary:

```js
const engine = new WebARKit({ scene, camera, renderer, preferredMode, onReady });
await engine.start();
engine.placeOnSurface(object3D);
engine.enableDrag(object3D);
engine.enableRotate(object3D);
engine.on('pose-updated', handler);
engine.on('surface-detected', handler);
engine.stop();
engine.dispose();
```

## Out of scope

- Voice / TTS integration.
- Asset loading helpers (GLB / FBX). Consumers use `THREE.GLTFLoader` directly.
- UI components (loading screens, status overlays).
- Persistent anchors / cloud sync.

These are application concerns, not engine concerns.
