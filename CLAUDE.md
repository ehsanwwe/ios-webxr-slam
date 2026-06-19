# CLAUDE.md — Project Memory for AI Agents

This file is read by Claude Code at the start of every session.
Keep it under 500 lines. Move stale content to docs/ARCHITECTURE.md.

---

## Project: WebARKit

WebXR-equivalent AR engine for iOS Safari. See README.md for the public-facing
description.

- **Author:** Ehsan Moradi (ehsanwwe on GitHub)
- **License:** MIT
- **Repo:** <https://github.com/ehsanwwe/ios-webxr-slam>
- **Package name when published:** `webarkit`

---

## Current Status

- **Phase:** Phase 2 — Native WebXR delegate (in progress / mostly done)
- **Last session ended:** 2026-06-19 — landed Phase 2 patch: built
  `XRMode` (immersive-ar session, hit-test reticle, tap-to-place,
  transient-input drag with offset snapshot), wired `WebARKit.start()`
  to dispatch to XR when supported with a graceful fall back to Gyro on
  failure. First XRMode test scaffold landed.
- **Next action:** Test demo 01 on an Android Chrome device to confirm
  XRMode actually drives the session end-to-end. Then begin Phase 3:
  `src/tracking/VisualTracker.js` using jsfeat for FAST corners +
  pyramidal Lucas-Kanade optical flow. Wire into `GyroMode` via the
  existing `setVisualTracker()` hook.

---

## The single most important rule

**`avatar-cam.js` (in the repo root) is the source of truth for the iOS
gyro path.** Do not rewrite its logic — port it. The constants below are
battle-tested on real iOS hardware and must be preserved exactly:

- `GYRO_CAMERA_SMOOTHING = 0.18`
- `DRAG_SENS_X = DRAG_SENS_Y = 0.006`
- `ROTATE_GAIN = 1.0`
- `GYRO_OBJECT_Z = -14.5` (placeholder until Phase 5)

For the XR path, the WebXR API is the source of truth — no constants
ported, but the hit-test and drag-with-offset-snapshot patterns match
`avatar-cam.js`'s XR section conceptually.

If you think you found a bug in `avatar-cam.js`, stop and ask Ehsan. You
almost certainly didn't.

---

## Architecture (see docs/ARCHITECTURE.md for the deep dive)

- **Dual-mode runtime:** `ModeRouter.detect()` returns `'xr'` if
  `navigator.xr.isSessionSupported('immersive-ar')` resolves true, else
  `'gyro'`. `WebARKit.start()` dispatches accordingly. If XR start fails
  for any reason it transparently falls back to Gyro.
- **Threading:** main thread for Three.js / sensors / gestures; worker
  for camera frame processing and visual tracking (Phase 3). Frames go
  main → worker as transferable `ImageBitmap`.
- **Sensor fusion:** complementary filter, not Kalman — simpler, fits
  browser budget. Arrives in Phase 4 and only matters for the gyro path.
- **Visual tracker:** start with jsfeat (pure JS, ~150 KB) in Phase 3.
  WASM swap considered for Phase 5 or 6 only if performance demands it.
  We do **not** want to repeat AlvaAR's Emscripten dependency hell.

**Hard decisions made (do not re-litigate):**

- Three.js is a peer dependency, not bundled.
- Worker uses transferable `ImageBitmap`, not raw pixel arrays.
- Sensor fusion uses complementary filter, not Kalman.
- Single `main` branch — no feature branches once merged.
- TypeScript for types only — output is plain JS modules.
- Voice chat, loading UI, scene-specific assets are **app-level**, never
  in the library.

---

## Coding Conventions

- ES2022+ modules. No CommonJS.
- 2-space indentation, LF line endings, no trailing whitespace.
- JSDoc on public APIs and tricky internals only. No file-header banners.
- Errors thrown as actual `Error` subclasses, never plain strings
  (see `WebARKitError`, `PermissionDeniedError`).
- No emoji in source code (README / docs only).
- File names: PascalCase for class files (`GyroTracker.js`,
  `XRMode.js`), kebab-case otherwise.
- Named exports only — no default exports for classes.
- No commented-out alternative implementations.
  No `TODO: maybe later` — either add it or don't.

---

## Git Workflow

- Single `main` branch, no feature branches.
- Commit + push after every meaningful unit of work — never a giant
  end-of-session commit.
- Commit message style: human, mixed format (conventional + casual),
  lowercase OK, imperative mood mostly. No emoji except very rarely.
  No "Co-authored-by: Claude" footers. No "Generated with…" footers.

---

## Known Quirks & iOS Gotchas

- `DeviceOrientationEvent.requestPermission` and
  `DeviceMotionEvent.requestPermission` require a user-gesture handler
  on iOS 13+.
- `screen.orientation.angle` returns 0 on some iOS versions even when the
  device is rotated — fall back to `window.orientation`. Handled in
  `getScreenOrientationRad()`.
- `getUserMedia` rear camera: use `facingMode: { ideal: 'environment' }`
  not `exact` — `exact` fails on devices without a back camera.
- The Three.js camera quaternion must be reset before applying device
  orientation; otherwise calibration drifts. `GyroMode._place()` does this.
- iPadOS 13+ reports `navigator.platform === 'MacIntel'`; combine with
  `navigator.maxTouchPoints > 1` to detect iPad. Handled in `isIOS()`.

## Known Quirks & WebXR Gotchas

- `requestHitTestSourceForTransientInput` is async and may fail on
  devices that support `hit-test` for persistent input but not
  transient. Catch and degrade — don't propagate.
- `domOverlay` is requested as an **optional** feature so devices
  without it still get the session (they just lose HTML overlay UI).
- The first XR frame after `setSession()` may have no `frame` parameter
  in `setAnimationLoop` — guard with `if (!frame) return;`.
- Once `renderer.xr.setSession()` is called, Three.js drives the camera
  projection — don't touch `camera.matrix*` manually in XR mode.

See `docs/IOS_NOTES.md` for the running log.

---

## Build & Run

```
nvm use                 # respects .nvmrc (node 20)
npm install
npm run dev             # vite dev server with HTTPS — use ngrok/cloudflared for device testing
npm test                # vitest run
npm run typecheck       # tsc --noEmit against JSDoc-annotated JS
npm run build:wasm      # Phase 3+ — requires Emscripten SDK (deferred, may not happen)
```

---

## Files Not to Touch Without Strong Reason

- Anything ported verbatim from `avatar-cam.js` — those constants and
  math sequences are battle-tested on real iOS hardware.
- `src/index.js` — public API surface; breaking changes need a CHANGELOG
  entry.

---

## TODO Backlog (sorted by priority)

1. Verify demo 01 on an Android Chrome device — confirm XRMode session
   starts, reticle appears on a flat surface, tap places, drag moves.
2. Two-finger rotate in XRMode (deferred from Phase 2 — track 2 screen
   XRInputSources and compute the angle between their target rays).
3. Phase 3 — `src/tracking/VisualTracker.js` using jsfeat: FAST corners +
   pyramidal Lucas-Kanade. Wire into `GyroMode` via `setVisualTracker()`.
4. Phase 4 — `src/tracking/SensorFusion.js`: complementary filter
   combining gyro orientation and visual translation with outlier rejection.
5. Phase 5 — `src/tracking/PlaneDetector.js`: RANSAC homography for
   horizontal-plane fitting. This is where we cross from VIO into SLAM.
6. Phase 6 — Polish, profiling, `npm publish`.

---

## Session Log (last 5 only — trim older)

### 2026-06-19 (Phase 2)

- Built `src/modes/XRMode.js` from scratch using the standard WebXR
  patterns: `requiredFeatures: ['local', 'hit-test']`, ring reticle on
  the floor, `setAnimationLoop`-driven render loop.
- Single-finger drag uses `requestHitTestSourceForTransientInput()`
  with the offset-snapshot pattern: first hit captures
  `dragOffset = sceneRoot.position - hitPos`, subsequent hits set
  `sceneRoot.position = hitPos + dragOffset`. Y is locked to placement
  height.
- `WebARKit.start()` now dispatches to XR when `ModeRouter.detect()`
  says so, with a fall back to Gyro on any failure. Added a
  `_wire(mode)` helper to avoid duplicating the scene-root /
  before-render / on-place wiring.
- `tests/XRMode.test.js` covers state-only verification (constructor,
  setters, missing navigator.xr).
- Deferred: two-finger rotate in XRMode. Documented in
  `Known Quirks & WebXR Gotchas` and TODO backlog.

### 2026-06-19 (Phase 1)

- Landed Phase 1 patch.
- Wrote `utils/{platform,permissions,math}.js`, `tracking/GyroTracker.js`,
  `rendering/CameraOverlay.js`, `input/GestureRecognizer.js`,
  `modes/GyroMode.js`, `core/{WebARKit,ModeRouter}.js`, `index.js`.
- Wrote `demo/01-basic-placement/` as smoke test.
- Wrote first real tests: `tests/math.test.js` (10 cases) and
  `tests/GyroTracker.test.js` (3 cases).

### 2026-05-21

- Scaffolded the repo: `.gitignore`, `.editorconfig`, `.nvmrc`.
- Set up `package.json`, `vite.config.js`, `tsconfig.json`.
- Wrote module stubs for all 20+ files in `src/`.
- Built `demo/` with three sub-demos.
- Rewrote README roadmap to honestly reflect status.
