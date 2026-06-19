# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project aims for [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 1: Gyro AR (in progress)

- `src/utils/platform.js` — `isIOS()`, `getScreenOrientationRad()`,
  `hasGetUserMedia()`. Ports the iPadOS-13+ detection trick.
- `src/utils/permissions.js` — `requestSensorPermissions()` with a typed
  `PermissionDeniedError`. Must run inside a user-gesture handler on iOS.
- `src/utils/math.js` — `deviceOrientationToQuat()` (the Three.js
  DeviceOrientationControls-compatible conversion), `quaternionAngle()`,
  `normalizeRad()`. Logic preserved verbatim from the reference.
- `src/tracking/GyroTracker.js` — DeviceOrientation listener that exposes
  `targetQuat`, `hasTarget`, and `angularRate` (rad/s, for downstream
  visual-tracker gating in Phase 3). `applyTo(camera, smoothing=0.18)`
  reproduces the SLERP behaviour.
- `src/rendering/CameraOverlay.js` — `<video>` element + `getUserMedia`
  rear-camera stream with the `objectFit: cover` overlay at z-index 0.
- `src/input/GestureRecognizer.js` — single-finger drag (`DRAG_SENS = 0.006`),
  two-finger rotate (`ROTATE_GAIN = 1.0`), and tap detection with an
  8-pixel move threshold.
- `src/core/ModeRouter.js` — `ModeRouter.detect()` returns `'xr'` or
  `'gyro'` based on `navigator.xr.isSessionSupported('immersive-ar')`.
- `src/modes/GyroMode.js` — orchestrates the iOS path. Owns the render
  loop, applies gyro rotation to the camera each frame, and exposes a
  `setVisualTracker()` slot for Phase 3.
- `src/core/WebARKit.js` — top-level engine class. Public API:
  `new WebARKit({ renderer, camera, scene, canvas, sceneRoot })`,
  `.start()`, `.stop()`, `.onPlace()`, `.onBeforeRender()`.
- `src/index.js` — public exports.
- `demo/01-basic-placement/` — minimal smoke-test demo: tap to place a
  blue cube + grid in front of the camera, drag to move, two-finger
  rotate to yaw.
- `tests/math.test.js`, `tests/GyroTracker.test.js` — first real test
  files. Verify the math primitives and the GyroTracker state machine.

### Changed

- `CLAUDE.md` — current status moved from "Phase 0 in progress" to
  "Phase 1 in progress"; next-action updated to reflect that
  `avatar-cam.js` is already in the repo.

### Notes

- Phase 1 still needs an XR fallback path (Phase 2) — `WebARKit.start()`
  currently routes everything to `GyroMode` even when `immersive-ar` is
  supported. The detection logic is in place; only the `XRMode` class is
  missing.
- The placeholder placement (`z = -14.5`) is unchanged from the
  reference. Plane detection arrives in Phase 5.

## [0.0.0-alpha.0] — 2026-05-21

### Added

- Project skeleton: directory layout, vite + vitest tooling, HTTPS dev server.
- Module stubs for `src/core`, `src/tracking`, `src/modes`, `src/rendering`,
  `src/input`, `src/utils`, `src/workers`, `src/wasm`.
- Three demo placeholders wired through the `webarkit` alias.
- Public TypeScript definitions at `types/index.d.ts`.
- Docs scaffolding: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `docs/API.md`, `docs/IOS_NOTES.md`, `docs/BUILDING_WASM.md`.
