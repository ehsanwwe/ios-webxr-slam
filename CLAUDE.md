# CLAUDE.md — Project Memory for AI Agents

This file is read by Claude Code at the start of every session.
Keep it under 500 lines. Move stale content to docs/ARCHITECTURE.md.

---

## Project: WebARKit

WebXR-grade AR engine for iOS Safari. See README.md for the public-facing description.

- **Author:** Ehsan Moradi (ehsanwwe on GitHub)
- **License:** MIT
- **Repo:** https://github.com/ehsanwwe/ios-webxr-slam
- **Package name when published:** `webarkit`

---

## Current Status

- **Phase:** Phase 0 — project skeleton (in progress)
- **Last session ended:** 2026-05-21 — scaffolded repo, set up vite/vitest, wrote module stubs, rewrote README roadmap
- **Next action:** finish docs scaffolding (CHANGELOG, ARCHITECTURE, IOS_NOTES, CONTRIBUTING), run smoke test (`npm install && npm run dev`), then wait for `avatar-cam.js` from Ehsan before starting Phase 1

---

## The single most important rule

**`avatar-cam.js` (provided by Ehsan) is the source of truth for Phase 1.** Do not rewrite its logic — port it. Functions to copy verbatim: `IS_IOS`, `requestSensorPermission`, `computeDeviceQuat`, `getScreenOrientRad`, `resetGyroCameraCalibration`, `onDeviceOrientation`, the camera overlay setup, the gesture handlers, the gyro→camera SLERP, the mode-routing flow. Constants to preserve: `GYRO_CAMERA_SMOOTHING = 0.18`, `DRAG_SENS_X = DRAG_SENS_Y = 0.006`, `ROTATE_GAIN = 1.0`, `GYRO_OBJECT_Z = -14.5` (placeholder until Phase 5).

If you think you found a bug in `avatar-cam.js`, stop and ask Ehsan. You almost certainly didn't.

---

## Architecture (see docs/ARCHITECTURE.md for the deep dive)

- **Dual-mode runtime:** `ModeRouter.detect()` picks `XRMode` if `navigator.xr.isSessionSupported('immersive-ar')` is true, else `GyroMode`.
- **Threading:** main thread for Three.js / sensors / gestures; worker for camera frame processing and WASM CV; frames go main→worker as transferable `ImageBitmap`.
- **Sensor fusion:** complementary filter (not Kalman — simpler, fits browser budget).
- **WASM CV:** FAST-9 corners + pyramidal Lucas-Kanade + RANSAC homography, compiled from C++ via Emscripten.

**Hard decisions made (do not re-litigate):**
- Three.js is a peer dependency, not bundled.
- Worker uses transferable `ImageBitmap`, not raw pixel arrays.
- Sensor fusion uses complementary filter, not Kalman.
- Single `main` branch (currently on `claude/fix-avatar-cam-BPM49` for this work) — no feature branches once merged.
- TypeScript for types only — output is plain JS modules.
- Voice chat, loading UI, scene-specific assets are **app-level**, never in the library.

---

## Coding Conventions

- ES2022+ modules. No CommonJS.
- 2-space indentation, LF line endings, no trailing whitespace (`.editorconfig` enforces).
- JSDoc on public APIs and tricky internals only. No file-header banners.
- Errors thrown as actual `Error` subclasses, never plain strings.
- No emoji in source code (README/docs only).
- File names: PascalCase for class files (`GyroTracker.js`), kebab-case otherwise.
- Named exports only — no default exports for classes.
- No commented-out alternative implementations. No `TODO: maybe later` — either add it or don't.

---

## Git Workflow

- Currently working on branch `claude/fix-avatar-cam-BPM49`.
- Long-term: single `main` branch, no feature branches.
- Commit + push after every meaningful unit of work — never a giant end-of-session commit.
- Commit message style: human, mixed format (conventional + casual), lowercase OK, imperative mood mostly. No emoji except very rarely. No "Co-authored-by: Claude" footers. No "Generated with…" footers.

---

## Known Quirks & iOS Gotchas

(Populate as discoveries land. Initial seeds from the master prompt:)

- `DeviceOrientationEvent.requestPermission` and `DeviceMotionEvent.requestPermission` require a user-gesture handler on iOS 13+.
- `screen.orientation.angle` returns 0 on some iOS versions even when the device is rotated — use `window.orientation` as fallback.
- `getUserMedia` rear camera needs `facingMode: { exact: 'environment' }`.
- The Three.js camera quaternion must be reset before applying device orientation each frame; otherwise calibration drifts.
- iPadOS 13+ reports `navigator.platform === 'MacIntel'`; combine with `navigator.maxTouchPoints > 1` to detect iPad.

See `docs/IOS_NOTES.md` for the running log.

---

## Build & Run

```bash
nvm use                 # respects .nvmrc (node 20)
npm install
npm run dev             # vite dev server with HTTPS — use ngrok/cloudflared for iOS device testing
npm test                # vitest run
npm run typecheck       # tsc --noEmit against JSDoc-annotated JS
npm run build:wasm      # Phase 3+ — requires Emscripten SDK
```

---

## Files Not to Touch Without Strong Reason

- `src/wasm/src/*.cpp` — changes require WASM rebuild.
- `src/index.js` — public API surface; breaking changes need a CHANGELOG entry.
- Anything ported verbatim from `avatar-cam.js` — those constants and math sequences are battle-tested on real iOS hardware.

---

## TODO Backlog (sorted by priority)

1. Receive `avatar-cam.js` from Ehsan and check it into the repo (or place it in a `reference/` folder if not part of the library).
2. Phase 1 — port the working logic into modules per the table in the master prompt.
3. Phase 2 — port the WebXR delegate.
4. Phase 3 onward as scheduled.

---

## Session Log (last 5 only — trim older)

### 2026-05-21
- Scaffolded the repo: `.gitignore`, `.editorconfig`, `.nvmrc`.
- Set up `package.json` (name `webarkit`, peer dep three), `vite.config.js` (HTTPS via `@vitejs/plugin-basic-ssl`, root → `demo/`), `tsconfig.json` (`allowJs` + `checkJs`, no emit).
- Wrote module stubs for all 20+ files in `src/`. Each is a class or function with a one-line JSDoc — no logic.
- Built `demo/` with three sub-demos (`01-basic-placement`, `02-avatar`, `03-furniture`) and a landing index.
- Rewrote README roadmap so it honestly reflects "nothing implemented yet" instead of marketing the previous prototype's status.
- Local git push is hitting a 403 from the local proxy; commits are landing locally and will need to be synced.
- Open thread: `avatar-cam.js` still needed before Phase 1 can begin.
