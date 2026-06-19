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

- **Phase:** Phase 1 — Gyro AR (in progress)
- **Last session ended:** 2026-06-19 — landed Phase 1 patch: ported
  `avatar-cam.js` logic into modules (`GyroTracker`, `CameraOverlay`,
  `GestureRecognizer`, `GyroMode`, `WebARKit`, `ModeRouter`), wrote first
  real vitest tests for `math.js` and `GyroTracker`, built
  `demo/01-basic-placement/` as the end-to-end smoke test.
- **Next action:** Test demo 01 on a real iPhone over HTTPS (vite dev
  server). When confirmed working, begin Phase 2: `src/modes/XRMode.js`
  for native WebXR on Android Chrome, plus a small refactor in
  `WebARKit.start()` to actually use it.

---

## The single most important rule

**`avatar-cam.js` (in the repo root) is the source of truth for Phase 1.**
Do not rewrite its logic — port it. The constants below are battle-tested
on real iOS hardware and must be preserved exactly:

- `GYRO_CAMERA_SMOOTHING = 0.18`
- `DRAG_SENS_X = DRAG_SENS_Y = 0.006`
- `ROTATE_GAIN = 1.0`
- `GYRO_OBJECT_Z = -14.5` (placeholder until Phase 5)

If you think you found a bug in `avatar-cam.js`, stop and ask Ehsan. You
almost certainly didn't.

---

## Architecture (see docs/ARCHITECTURE.md for the deep dive)

- **Dual-mode runtime:** `ModeRouter.detect()` picks `XRMode` if
  `navigator.xr.isSessionSupported('immersive-ar')` is true, else
  `GyroMode`. As of Phase 1, only `GyroMode` is implemented; the router
  falls back to it even when XR is supported.
- **Threading:** main thread for Three.js / sensors / gestures; worker
  for camera frame processing and visual tracking (Phase 3). Frames go
  main → worker as transferable `ImageBitmap`.
- **Sensor fusion:** complementary filter, not Kalman — simpler, fits
  browser budget. Arrives in Phase 4.
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
- File names: PascalCase for class files (`GyroTracker.js`),
  kebab-case otherwise.
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
  not `exact` — `exact` fails on devices without a back camera (iPad
  desk-mounted, etc.).
- The Three.js camera quaternion must be reset before applying device
  orientation; otherwise calibration drifts. `GyroMode._place()` does this.
- iPadOS 13+ reports `navigator.platform === 'MacIntel'`; combine with
  `navigator.maxTouchPoints > 1` to detect iPad. Handled in `isIOS()`.

See `docs/IOS_NOTES.md` for the running log.

---

## Build & Run

```
nvm use                 # respects .nvmrc (node 20)
npm install
npm run dev             # vite dev server with HTTPS — use ngrok/cloudflared for iOS device testing
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

1. Verify demo 01 on a real iPhone over HTTPS.
2. Phase 2 — `src/modes/XRMode.js` for native WebXR on Android Chrome.
   Update `WebARKit.start()` to dispatch to it.
3. Phase 3 — `src/tracking/VisualTracker.js` using jsfeat: FAST corners +
   pyramidal Lucas-Kanade. Wire into `GyroMode` via `setVisualTracker()`.
4. Phase 4 — `src/tracking/SensorFusion.js`: complementary filter
   combining gyro orientation and visual translation with outlier rejection.
5. Phase 5 — `src/tracking/PlaneDetector.js`: RANSAC homography for
   horizontal-plane fitting. This is where we cross from VIO into SLAM.
6. Phase 6 — Polish, profiling, `npm publish`.

---

## Session Log (last 5 only — trim older)

### 2026-06-19

- Landed Phase 1 patch.
- Wrote `utils/{platform,permissions,math}.js`, `tracking/GyroTracker.js`,
  `rendering/CameraOverlay.js`, `input/GestureRecognizer.js`,
  `modes/GyroMode.js`, `core/{WebARKit,ModeRouter}.js`, `index.js`.
- Wrote `demo/01-basic-placement/` as smoke test — blue cube + grid
  rendered against camera feed, tap to place, drag/two-finger rotate.
- Wrote first real tests: `tests/math.test.js` (10 cases) and
  `tests/GyroTracker.test.js` (3 cases). `npm test` now does something.
- `WebARKit.start()` still routes XR-capable devices to GyroMode because
  `XRMode` isn't built yet — explicitly noted in code.

### 2026-05-21

- Scaffolded the repo: `.gitignore`, `.editorconfig`, `.nvmrc`.
- Set up `package.json`, `vite.config.js` (HTTPS via
  `@vitejs/plugin-basic-ssl`, root → `demo/`), `tsconfig.json`.
- Wrote module stubs for all 20+ files in `src/`.
- Built `demo/` with three sub-demos and a landing index.
- Rewrote README roadmap so it honestly reflects "nothing implemented yet".
- Open thread: `avatar-cam.js` still needed before Phase 1 can begin.
